export const ACCOUNT_REFRESH = {
    okMs: 60_000,
    minGapMs: 15_000,
    failBaseMs: 30_000,
    failMaxMs: 300_000,
    /** A ready value older than this is shown as not live. */
    staleAfterMs: 10 * 60_000,
    /** A read that has not answered by now counts as failed (the host call can hang; the chip must not stay on "loading"). */
    timeoutMs: 12_000,
};
/**
 * Value for `AccountClientMetadata.version`. DSH inlines its version only into
 * its own bundles (process.env.DSH_CLIENT_VERSION) and exposes no runtime API,
 * so a third-party plugin reports it as unknown rather than inventing one.
 */
export const ACCOUNT_CLIENT_VERSION = 'unknown';
const DECIMAL = /^-?\d+(\.\d+)?$/;
function walletRead(list) {
    if (!Array.isArray(list))
        return { status: 'failed' };
    const wallets = list
        .filter((w) => !!w && typeof w === 'object')
        .map(w => ({ currency: String(w.currency || '').toUpperCase(), amount: String(w.balance ?? '') }))
        .filter(w => DECIMAL.test(w.amount) && /^[A-Z]{3}$/.test(w.currency));
    // Entries present but none valid is a malformed reply, not an empty wallet.
    if (list.length > 0 && wallets.length === 0)
        return { status: 'failed' };
    return { status: 'ready', wallets };
}
/**
 * Interpret one Remote reply. `null` value means no account grant (signed out
 * or the account changed); `failed` is a Platform failure.
 * @throws when the Remote call itself failed (`ok: false`) or the shape is unknown.
 */
export function parseAccountBalance(result, now) {
    const reply = result;
    if (!reply || reply.ok !== true)
        throw new Error('account balance call failed');
    const value = reply.value;
    if (value === null || value === undefined)
        return { status: 'signed-out', source: 'host', toppedUp: { status: 'unknown' }, granted: { status: 'unknown' }, updatedAt: null };
    if (value.status === 'failed')
        throw new Error('account balance failed on the Platform');
    if (value.status !== 'ready')
        throw new Error('unknown account balance shape');
    return { status: 'ready', source: 'host', toppedUp: walletRead(value.value), granted: walletRead(value.bonusWallets), updatedAt: now };
}
export class AccountBalancePoller {
    options;
    generation = 0;
    timer = null;
    inFlight = null;
    last = null;
    failures = 0;
    lastRequestAt = -Infinity;
    stopped = false;
    cancelRequest = null;
    now;
    schedule;
    cancel;
    constructor(options) {
        this.options = options;
        this.now = options.now ?? (() => Date.now());
        this.schedule = options.schedule ?? ((callback, ms) => setTimeout(callback, ms));
        this.cancel = options.cancel ?? (handle => clearTimeout(handle));
    }
    start() {
        this.stopped = false;
        this.failures = 0;
        this.lastRequestAt = -Infinity;
        this.emit({ status: 'loading', source: 'host', toppedUp: { status: 'unknown' }, granted: { status: 'unknown' }, updatedAt: null });
        void this.refresh(true);
    }
    /** Request a read; coalesces with one in flight and respects the minimum gap unless forced. */
    refresh(force = false) {
        if (this.stopped)
            return Promise.resolve();
        if (this.inFlight)
            return this.inFlight;
        const wait = this.lastRequestAt + ACCOUNT_REFRESH.minGapMs - this.now();
        if (!force && wait > 0) {
            this.arm(wait);
            return Promise.resolve();
        }
        const generation = this.generation;
        this.lastRequestAt = this.now();
        this.clearTimer();
        let request;
        try {
            request = Promise.resolve(this.options.getBalance());
        }
        catch (error) {
            request = Promise.reject(error);
        }
        let timeout = null;
        let cancelRead;
        const deadline = new Promise((_, reject) => {
            timeout = this.schedule(() => reject(new Error('balance read timed out')), ACCOUNT_REFRESH.timeoutMs);
            cancelRead = () => { if (timeout !== null)
                this.cancel(timeout); reject(new Error('balance read cancelled')); };
        });
        this.cancelRequest = cancelRead;
        request = Promise.race([request, deadline]).finally(() => {
            if (timeout !== null)
                this.cancel(timeout);
            if (this.cancelRequest === cancelRead)
                this.cancelRequest = null;
        });
        const flight = request.then(result => {
            if (generation !== this.generation)
                return;
            // A fulfilled Remote call can still report failure. Parse before resetting
            // backoff, and handle parser failures together with transport failures.
            const snapshot = parseAccountBalance(result, this.now());
            this.failures = 0;
            this.emit(snapshot);
            this.arm(ACCOUNT_REFRESH.okMs);
        }).catch(() => {
            if (generation !== this.generation)
                return;
            this.failures++;
            // Keep the last good amounts for the same grant, marked as not live.
            this.emit(this.options.retainOnFailure !== false && this.last && this.last.updatedAt !== null ? { ...this.last, status: 'stale' } : emptyAccountBalance('error'));
            this.arm(Math.min(ACCOUNT_REFRESH.failMaxMs, ACCOUNT_REFRESH.failBaseMs * 2 ** (this.failures - 1)));
        }).finally(() => { if (this.inFlight === flight)
            this.inFlight = null; });
        this.inFlight = flight;
        return flight;
    }
    /** Access withdrawn or plugin unloaded: forget everything and ignore late replies. */
    stop() {
        this.stopped = true;
        this.generation++;
        this.clearTimer();
        this.cancelRequest?.();
        this.cancelRequest = null;
        this.inFlight = null;
        this.last = null;
        this.options.publish(null);
    }
    emit(snapshot) {
        this.last = snapshot;
        this.options.publish(snapshot);
    }
    arm(ms) {
        this.clearTimer();
        if (this.stopped)
            return;
        this.timer = this.schedule(() => {
            this.timer = null;
            if (this.options.isHidden?.()) {
                this.arm(ACCOUNT_REFRESH.okMs);
                return;
            }
            void this.refresh(true);
        }, ms);
    }
    clearTimer() {
        if (this.timer !== null)
            this.cancel(this.timer);
        this.timer = null;
    }
}
export function emptyAccountBalance(status) {
    return { status, source: 'host', toppedUp: { status: 'unknown' }, granted: { status: 'unknown' }, updatedAt: null };
}
/** Account notifications are an invalidation boundary, not an account identity to persist. */
export function watchAccountBalances(options, openStream) {
    const poller = new AccountBalancePoller({ ...options, retainOnFailure: Boolean(openStream) });
    if (!openStream) {
        poller.start();
        return poller;
    }
    const schedule = options.schedule ?? ((callback, ms) => setTimeout(callback, ms));
    const cancel = options.cancel ?? ((handle) => clearTimeout(handle));
    let stopped = false, generation = 0, ready = false;
    let stream = null;
    let timer = null;
    const clearTimer = () => { if (timer !== null)
        cancel(timer); timer = null; };
    const disposeStream = () => {
        const previous = stream;
        stream = null;
        try {
            if (previous)
                void Promise.resolve(previous.dispose()).catch(() => { });
        }
        catch { /* already disconnected */ }
    };
    const failed = (own) => {
        if (stopped || own !== generation)
            return;
        generation++;
        ready = false;
        clearTimer();
        disposeStream();
        poller.stop();
        options.publish(emptyAccountBalance('error'));
        timer = schedule(() => { timer = null; begin(); }, ACCOUNT_REFRESH.failBaseMs);
    };
    const begin = () => {
        const own = ++generation;
        ready = false;
        clearTimer();
        disposeStream();
        poller.stop();
        options.publish(emptyAccountBalance('loading'));
        timer = schedule(() => failed(own), ACCOUNT_REFRESH.timeoutMs);
        try {
            const current = openStream();
            stream = current;
            void (async () => {
                for await (const frame of current) {
                    if (stopped || own !== generation)
                        return;
                    clearTimer();
                    poller.stop();
                    ready = frame.value.status === 'credential-stored';
                    if (ready)
                        poller.start();
                    else
                        options.publish(emptyAccountBalance(frame.value.status === 'signed-out' ? 'signed-out' : 'error'));
                    frame.accept();
                }
                failed(own);
            })().catch(() => failed(own));
        }
        catch {
            failed(own);
        }
    };
    begin();
    return {
        refresh(force = false) {
            if (stopped)
                return Promise.resolve();
            if (ready)
                return poller.refresh(force);
            if (force && stream === null)
                begin();
            return Promise.resolve();
        },
        stop() {
            stopped = true;
            generation++;
            ready = false;
            clearTimer();
            disposeStream();
            poller.stop();
        },
    };
}
//# sourceMappingURL=account-balance.js.map
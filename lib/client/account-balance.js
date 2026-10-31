export const ACCOUNT_REFRESH = {
    okMs: 60_000,
    minGapMs: 15_000,
    failBaseMs: 30_000,
    failMaxMs: 300_000,
    /** A ready value older than this is shown as not live. */
    staleAfterMs: 5 * 60_000,
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
        const flight = request.then(result => {
            if (generation !== this.generation)
                return;
            this.failures = 0;
            this.emit(parseAccountBalance(result, this.now()));
            this.arm(ACCOUNT_REFRESH.okMs);
        }, () => {
            if (generation !== this.generation)
                return;
            this.failures++;
            // Keep the last good amounts for the same grant, marked as not live.
            this.emit(this.last && this.last.updatedAt !== null ? { ...this.last, status: 'stale' } : { status: 'error', source: 'host', toppedUp: { status: 'unknown' }, granted: { status: 'unknown' }, updatedAt: null });
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
//# sourceMappingURL=account-balance.js.map
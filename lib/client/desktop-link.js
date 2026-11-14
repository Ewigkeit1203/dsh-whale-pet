export const DESKTOP_LINK = {
    ports: [38917, 38918, 38919, 38920, 38921],
    app: 'dsh-whale-pet-desktop',
    version: 1,
    /** A push at least this often, so the companion knows DSH is still there. */
    beatMs: 2000,
    /** At most four pushes a second while she streams an answer. */
    minGapMs: 250,
    /** Looking for the companion: quickly at first, then less often while it is not running. */
    scanMs: [3000, 5000, 10000, 30000, 60000],
    helloTimeoutMs: 800,
    /** Longer answers are cut (the desktop bubble shows the end, the theatre will page). */
    textLimit: 60000,
};
/** getStatus() falls back to her idle line when there is no answer yet; only a real answer is sent. */
const answerOf = (status) => status.latestDialogue === status.speech ? '' : status.latestDialogue;
export function linkSnapshot(status) {
    return {
        v: 1,
        isReasoning: status.isReasoning,
        isStreaming: status.isStreaming,
        latestDialogue: answerOf(status).slice(0, DESKTOP_LINK.textLimit),
        reasoningText: status.reasoningText.slice(-DESKTOP_LINK.textLimit),
        quotaErrorKey: status.quotaErrorKey,
        hostBalance: status.hostBalance,
        balances: { known: status.balancesKnown, toppedUp: status.toppedUpBalance, granted: status.grantedBalance },
    };
}
const isLinkText = (value, limit = DESKTOP_LINK.textLimit) => typeof value === 'string' && value.length <= limit;
/** Checks a snapshot that arrived over the link; anything unexpected is dropped whole. */
export function readLinkSnapshot(value) {
    if (!value || typeof value !== 'object')
        return null;
    const s = value;
    if (s.v !== 1 || typeof s.isReasoning !== 'boolean' || typeof s.isStreaming !== 'boolean')
        return null;
    if (!isLinkText(s.latestDialogue) || !isLinkText(s.reasoningText))
        return null;
    if (s.quotaErrorKey !== null && !isLinkText(s.quotaErrorKey, 2000))
        return null;
    const b = s.balances;
    if (!b || typeof b.known !== 'boolean' || !isLinkText(b.toppedUp, 200) || !isLinkText(b.granted, 200))
        return null;
    const h = s.hostBalance;
    if (h !== null && (!h || typeof h !== 'object' || h.source !== 'host' || !['loading', 'ready', 'stale', 'signed-out', 'error'].includes(h.status)))
        return null;
    return s;
}
/** Desktop: repeat what DSH's page told its state machine, in the order the page does it. */
export function applyLinkSnapshot(machine, value) {
    const s = readLinkSnapshot(value);
    if (!s)
        return false;
    const now = machine.getStatus();
    if (s.reasoningText) {
        if (s.reasoningText !== now.reasoningText)
            machine.setReasoningText(s.reasoningText);
    }
    else if (now.reasoningText)
        machine.clearReasoningText();
    if (s.latestDialogue !== answerOf(now))
        machine.setLatestDialogue(s.latestDialogue);
    if (s.quotaErrorKey !== now.quotaErrorKey)
        machine.setQuotaError(s.quotaErrorKey);
    if (s.hostBalance) {
        if (JSON.stringify(s.hostBalance) !== JSON.stringify(now.hostBalance))
            machine.setHostBalance(s.hostBalance);
    }
    else if (s.balances.known && (s.balances.toppedUp !== now.toppedUpBalance || s.balances.granted !== now.grantedBalance))
        machine.setBalances(s.balances.toppedUp, s.balances.granted);
    if (s.isStreaming) {
        machine.setStreaming(true);
        machine.setReasoning(false);
    }
    else {
        machine.setStreaming(false);
        machine.setReasoning(s.isReasoning);
    }
    return true;
}
/** Desktop: DSH went away mid-answer; she stops thinking and talking (she keeps the last balance). */
export function linkLost(machine) {
    machine.setStreaming(false);
    machine.setReasoning(false);
}
let desktopLinkCurrent = { status: 'searching' };
/** The latest link state, for the settings panel (the link may start before the panel mounts). */
export function desktopLinkState() { return desktopLinkCurrent; }
/**
 * DSH: find the companion and keep it up to date. Returns a stop function.
 * While it is not running this costs one failed local request per port every few seconds.
 */
export function startDesktopLink(machine, deps = {}) {
    const d = {
        fetch: deps.fetch ?? ((...args) => fetch(...args)),
        setTimeout: deps.setTimeout ?? ((fn, ms) => setTimeout(fn, ms)),
        clearTimeout: deps.clearTimeout ?? (timer => clearTimeout(timer)),
        now: deps.now ?? (() => Date.now()),
        onState: deps.onState,
    };
    let port = null;
    let timer = null;
    let dueAt = Infinity;
    let busy = false, again = false, stopped = false;
    let lastSent = 0, lastBody = '', misses = 0;
    const set = (state) => {
        if (JSON.stringify(state) === JSON.stringify(desktopLinkCurrent))
            return;
        desktopLinkCurrent = state;
        d.onState?.(state);
    };
    const schedule = (ms) => {
        if (stopped)
            return;
        const at = d.now() + ms;
        if (timer !== null && at >= dueAt)
            return;
        if (timer !== null)
            d.clearTimeout(timer);
        dueAt = at;
        timer = d.setTimeout(() => { timer = null; dueAt = Infinity; void tick(); }, ms);
    };
    const url = (p, path) => `http://127.0.0.1:${p}${path}`;
    const find = async () => {
        let error = '';
        for (const p of DESKTOP_LINK.ports) {
            try {
                const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(DESKTOP_LINK.helloTimeoutMs) : undefined;
                const response = await d.fetch(url(p, '/hello'), { signal });
                const hello = response.ok ? await response.json() : null;
                if (hello && hello.app === DESKTOP_LINK.app && hello.v === DESKTOP_LINK.version)
                    return p;
                error = response.ok ? 'not the companion' : `HTTP ${response.status}`;
            }
            catch (e) {
                error = e instanceof Error ? e.message : String(e);
            }
        }
        set({ status: 'searching', error });
        return null;
    };
    const tick = async () => {
        if (stopped)
            return;
        if (busy) {
            again = true;
            return;
        }
        busy = true;
        try {
            if (port === null) {
                port = await find();
                if (port === null) {
                    schedule(DESKTOP_LINK.scanMs[Math.min(misses++, DESKTOP_LINK.scanMs.length - 1)]);
                    return;
                }
                misses = 0;
                lastBody = '';
            }
            const body = JSON.stringify(linkSnapshot(machine.getStatus()));
            try {
                const response = await d.fetch(url(port, '/push'), { method: 'POST', headers: { 'content-type': 'application/json' }, body });
                if (!response.ok)
                    throw new Error(`HTTP ${response.status}`);
                lastBody = body;
                lastSent = d.now();
                set({ status: 'connected', port });
                schedule(DESKTOP_LINK.beatMs);
            }
            catch (e) {
                // Gone (or restarted on another port): look again at once, then back off.
                port = null;
                misses = 0;
                set({ status: 'searching', error: e instanceof Error ? e.message : String(e) });
                schedule(0);
            }
        }
        finally {
            busy = false;
            if (again && !stopped) {
                again = false;
                schedule(0);
            }
        }
    };
    const unsubscribe = machine.subscribe(() => {
        if (port === null)
            return;
        if (JSON.stringify(linkSnapshot(machine.getStatus())) === lastBody)
            return;
        schedule(Math.max(0, DESKTOP_LINK.minGapMs - (d.now() - lastSent)));
    });
    schedule(0);
    return () => {
        stopped = true;
        if (timer !== null)
            d.clearTimeout(timer);
        unsubscribe();
    };
}
//# sourceMappingURL=desktop-link.js.map
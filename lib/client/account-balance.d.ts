/**
 * Balance from DSH's own account service, the same call the built-in
 * "Account & balance" settings card makes:
 *   ctx.remote.account.getBalance(client) → { ok, value: AccountDetails['balance'] | null }
 * (deepseek-harness: packages/client/ui-settings-account, packages/api/account-controller).
 *
 * The host injects the token and Platform headers; this plugin never sees
 * credentials, never calls the Platform itself and keeps no account identity.
 * The DOM reader in index.ts remains only as a fallback for hosts without
 * this service.
 *
 * Refresh policy: once on access, then every 60s on success, on returning to
 * the window and after an answer finishes (min 15s apart, coalesced), with
 * exponential back-off on failure up to 5 minutes. A generation counter drops
 * replies that arrive after stop() (access withdrawn, plugin unloaded).
 */
import type { BalanceSnapshot } from './types.js';
export declare const ACCOUNT_REFRESH: {
    readonly okMs: 60000;
    readonly minGapMs: 15000;
    readonly failBaseMs: 30000;
    readonly failMaxMs: 300000;
    /** A ready value older than this is shown as not live. */
    readonly staleAfterMs: number;
};
/**
 * Value for `AccountClientMetadata.version`. DSH inlines its version only into
 * its own bundles (process.env.DSH_CLIENT_VERSION) and exposes no runtime API,
 * so a third-party plugin reports it as unknown rather than inventing one.
 */
export declare const ACCOUNT_CLIENT_VERSION = "unknown";
/**
 * Interpret one Remote reply. `null` value means no account grant (signed out
 * or the account changed); `failed` is a Platform failure.
 * @throws when the Remote call itself failed (`ok: false`) or the shape is unknown.
 */
export declare function parseAccountBalance(result: unknown, now: number): BalanceSnapshot;
export interface AccountBalanceOptions {
    getBalance: () => Promise<unknown>;
    publish: (snapshot: BalanceSnapshot | null) => void;
    now?: () => number;
    schedule?: (callback: () => void, ms: number) => unknown;
    cancel?: (handle: unknown) => void;
    /** Skip timer-driven reads while the window is hidden. */
    isHidden?: () => boolean;
}
export declare class AccountBalancePoller {
    private readonly options;
    private generation;
    private timer;
    private inFlight;
    private last;
    private failures;
    private lastRequestAt;
    private stopped;
    private readonly now;
    private readonly schedule;
    private readonly cancel;
    constructor(options: AccountBalanceOptions);
    start(): void;
    /** Request a read; coalesces with one in flight and respects the minimum gap unless forced. */
    refresh(force?: boolean): Promise<void>;
    /** Access withdrawn or plugin unloaded: forget everything and ignore late replies. */
    stop(): void;
    private emit;
    private arm;
    private clearTimer;
}
//# sourceMappingURL=account-balance.d.ts.map
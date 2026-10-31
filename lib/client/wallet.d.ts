/**
 * Balance presentation model (frontend F05).
 *
 * Today the only source is a DOM snapshot of the DSH account settings page
 * (see docs/handover/BALANCE_INTEGRATION.md). This module turns whatever the
 * state machine holds into an honest view model: unknown stays unknown (shown
 * as —), a snapshot that is no longer being refreshed is marked stale, and
 * the low-balance / bowls estimate only runs on fresh, comparable CNY data.
 *
 * When Codex lands the host `BalanceSnapshot` adapter, map its statuses onto
 * `WalletStatus` here; the views do not need to change.
 */
export type WalletStatus = 'unavailable' | 'live' | 'stale';
export interface WalletInput {
    known: boolean;
    toppedUp: string;
    granted: string;
    /** Last time the source re-read the account page (ms), even if unchanged. */
    checkedAt: number | null;
    now: number;
    ricePrice: number;
}
export interface WalletView {
    status: WalletStatus;
    /** Display strings; null means not read (render as —). */
    toppedUp: string | null;
    granted: string | null;
    checkedAt: number | null;
    /** Whole bowls left; only for fresh, same-currency CNY data. */
    bowls: number | null;
    low: boolean;
}
/** The DOM source refreshes every 2s while the account page is mounted. */
export declare const WALLET_FRESH_MS = 10000;
export declare const WALLET_LOW_CNY = 2;
export declare function walletAmount(value: string): {
    display: string;
    currency: string;
    amount: number;
} | null;
export declare function walletView(input: WalletInput): WalletView;
//# sourceMappingURL=wallet.d.ts.map
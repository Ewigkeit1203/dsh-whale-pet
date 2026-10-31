/**
 * Balance presentation model (frontend F05).
 *
 * Sources, in order of preference:
 *  1. host: DSH's account service via account-balance.ts (works without opening settings);
 *  2. dom:  a snapshot of the DSH account settings card while it is mounted.
 * Unknown stays unknown (rendered as —), old data is marked stale, and the
 * bowls / low-balance estimate only runs on fresh, CNY-only data. Currencies
 * are never added together.
 */
import type { BalanceSnapshot } from './types.js';
export type WalletStatus = 'unavailable' | 'loading' | 'live' | 'stale' | 'signed-out' | 'error';
export interface WalletInput {
    host: BalanceSnapshot | null;
    /** DOM fallback fields from the state machine. */
    known: boolean;
    toppedUp: string;
    granted: string;
    checkedAt: number | null;
    now: number;
    ricePrice: number;
}
export interface WalletView {
    status: WalletStatus;
    source: 'host' | 'dom' | 'none';
    /** Display strings; null means not read (render as —). */
    toppedUp: string | null;
    granted: string | null;
    /** Granted balance was read and there is none (DSH hides the row in this case). */
    grantedNone: boolean;
    checkedAt: number | null;
    /** Whole bowls left; only for fresh CNY data. */
    bowls: number | null;
    low: boolean;
}
/** The DOM source refreshes every 2s while the account page is mounted. */
export declare const WALLET_FRESH_MS = 10000;
export declare const HOST_FRESH_MS: number;
export declare const WALLET_LOW_CNY = 2;
/** Two decimals, rounded down, grouped; exact on decimal strings (matches DSH's formatter). */
export declare function formatWalletAmount(amount: string, currency: string): string;
export declare function walletAmount(value: string): {
    display: string;
    currency: string;
    amount: number;
} | null;
export declare function walletView(input: WalletInput): WalletView;
//# sourceMappingURL=wallet.d.ts.map
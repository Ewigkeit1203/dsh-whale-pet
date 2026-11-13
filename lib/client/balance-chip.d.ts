/**
 * Balance chip above her head (PM v0.9 P0-1): five honest states, what the head shows, and the two
 * balance reminders. Pure logic; PetOverlay renders it.
 */
import type { WalletView } from './wallet.js';
/** loading: shimmer, no digits · ok: amounts · signed-out · failed: "—" with a warning dot · stale: grey digits with a clock. */
export type BalanceChipState = 'loading' | 'ok' | 'signed-out' | 'failed' | 'stale';
export declare function balanceChipState(wallet: Pick<WalletView, 'status' | 'toppedUp' | 'granted'>): BalanceChipState;
export type HeadChips = 'both' | 'tier' | 'balance' | 'none';
export declare function headChipsShown(choice: HeadChips): {
    tier: boolean;
    balance: boolean;
};
/** Only a code from a host turn-error row is an out-of-credit failure. Never pass answer prose here. */
export declare function isQuotaError(code: unknown): boolean;
export declare const LOW_BALANCE_DAY_KEY = "dsh-whale-pet.lowBalanceDay";
/** Local calendar day, e.g. 2026-11-12. */
export declare function balanceDay(now: number): string;
/** The low-balance line is said after an answer, at most once per local day. `lastDay` is what was stored last time. */
export declare function lowBalanceDue(low: boolean, lastDay: string | null, now: number): boolean;
//# sourceMappingURL=balance-chip.d.ts.map
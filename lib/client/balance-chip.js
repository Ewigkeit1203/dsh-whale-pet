export function balanceChipState(wallet) {
    if (wallet.status === 'loading' || wallet.status === 'signed-out')
        return wallet.status;
    // Amounts are only ever shown when something was actually read: never an empty frame, never ¥0.00.
    const read = Boolean(wallet.toppedUp || wallet.granted);
    if (wallet.status === 'live' && read)
        return 'ok';
    if (wallet.status === 'stale' && read)
        return 'stale';
    return 'failed';
}
export function headChipsShown(choice) {
    return { tier: choice === 'both' || choice === 'tier', balance: choice === 'both' || choice === 'balance' };
}
/** Only a code from a host turn-error row is an out-of-credit failure. Never pass answer prose here. */
export function isQuotaError(code) {
    return typeof code === 'string' && /^(ACCOUNT_QUOTA|QUOTA|INSUFFICIENT_BALANCE|INSUFFICIENT_QUOTA)$/i.test(code.trim());
}
export const LOW_BALANCE_DAY_KEY = 'dsh-whale-pet.lowBalanceDay';
/** Local calendar day, e.g. 2026-11-12. */
export function balanceDay(now) {
    const d = new Date(now);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** The low-balance line is said after an answer, at most once per local day. `lastDay` is what was stored last time. */
export function lowBalanceDue(low, lastDay, now) {
    return low && lastDay !== balanceDay(now);
}
//# sourceMappingURL=balance-chip.js.map
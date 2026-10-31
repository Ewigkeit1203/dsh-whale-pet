/** The DOM source refreshes every 2s while the account page is mounted. */
export const WALLET_FRESH_MS = 10_000;
export const HOST_FRESH_MS = 5 * 60_000;
export const WALLET_LOW_CNY = 2;
const SYMBOLS = { CNY: '¥', USD: '$' };
/** Two decimals, rounded down, grouped; exact on decimal strings (matches DSH's formatter). */
export function formatWalletAmount(amount, currency) {
    const symbol = SYMBOLS[currency] ?? currency + ' ';
    const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(amount.trim());
    if (!match)
        return amount;
    const [, sign, whole, fraction = ''] = match;
    const cents = (fraction + '00').slice(0, 2);
    const zero = /^0+$/.test(whole) && /^0*$/.test(fraction);
    if (zero)
        return `${symbol}0.00`;
    if (/^0+$/.test(whole) && cents === '00')
        return sign ? `-${symbol}0.01` : `<${symbol}0.01`;
    const grouped = Number(whole).toLocaleString('en-US');
    return `${sign}${symbol}${grouped}.${cents}`;
}
export function walletAmount(value) {
    const text = (value || '').replace(/\s+/g, ' ').trim();
    const match = text.replace(/,/g, '').match(/(-?\d+(?:\.\d+)?)/);
    if (!text || !match)
        return null;
    const symbol = text.match(/[¥￥$€£]/)?.[0]?.replace('￥', '¥') ?? (/CNY|RMB|元/i.test(text) ? '¥' : /USD/i.test(text) ? '$' : '');
    return { display: text.replace('￥', '¥'), currency: symbol === '¥' ? 'CNY' : symbol === '$' ? 'USD' : symbol, amount: Number(match[1]) };
}
function readDisplay(read, positiveOnly) {
    if (read.status !== 'ready')
        return { text: null, none: false };
    const wallets = positiveOnly ? read.wallets.filter(w => Number(w.amount) > 0) : read.wallets;
    if (wallets.length === 0)
        return { text: null, none: positiveOnly };
    return { text: wallets.map(w => formatWalletAmount(w.amount, w.currency)).join(' + '), none: false };
}
function cnyTotal(reads) {
    let total = 0;
    for (const read of reads) {
        if (read.status !== 'ready')
            return null;
        for (const w of read.wallets) {
            if (w.currency !== 'CNY')
                return null;
            total += Number(w.amount);
        }
    }
    return Number.isFinite(total) ? total : null;
}
export function walletView(input) {
    const host = input.host;
    // Host wins whenever it is present: signed-out must clear any old DOM snapshot.
    // A host failure with no amounts yet still lets an open settings card supply them.
    if (host && !(host.status === 'error' && input.known)) {
        if (host.status === 'loading' || host.status === 'error' || host.status === 'signed-out') {
            return { status: host.status, source: 'host', toppedUp: null, granted: null, grantedNone: false, checkedAt: null, bowls: null, low: false };
        }
        const fresh = host.status === 'ready' && host.updatedAt !== null && input.now - host.updatedAt <= HOST_FRESH_MS;
        const toppedUp = readDisplay(host.toppedUp, false);
        // DSH lists only positive bonus wallets; none left means no granted balance.
        const granted = readDisplay(host.granted, true);
        const total = fresh && host.toppedUp.status === 'ready' && host.toppedUp.wallets.length > 0 ? cnyTotal([host.toppedUp, host.granted]) : null;
        return {
            status: toppedUp.text || granted.text || granted.none ? (fresh ? 'live' : 'stale') : 'error',
            source: 'host', toppedUp: toppedUp.text, granted: granted.text, grantedNone: granted.none, checkedAt: host.updatedAt,
            bowls: total !== null && input.ricePrice > 0 ? Math.max(0, Math.floor(total / input.ricePrice)) : null,
            low: total !== null && total < WALLET_LOW_CNY,
        };
    }
    if (!input.known)
        return { status: 'unavailable', source: 'none', toppedUp: null, granted: null, grantedNone: false, checkedAt: null, bowls: null, low: false };
    const toppedUp = walletAmount(input.toppedUp);
    const granted = walletAmount(input.granted);
    const fresh = input.checkedAt !== null && input.now - input.checkedAt <= WALLET_FRESH_MS;
    const comparable = fresh && toppedUp && granted && toppedUp.currency === 'CNY' && granted.currency === 'CNY';
    const total = comparable ? toppedUp.amount + granted.amount : null;
    return {
        status: toppedUp || granted ? (fresh ? 'live' : 'stale') : 'unavailable',
        source: toppedUp || granted ? 'dom' : 'none',
        toppedUp: toppedUp?.display ?? null,
        granted: granted?.display ?? null,
        grantedNone: false,
        checkedAt: input.checkedAt,
        bowls: total !== null && input.ricePrice > 0 ? Math.max(0, Math.floor(total / input.ricePrice)) : null,
        low: total !== null && total < WALLET_LOW_CNY,
    };
}
//# sourceMappingURL=wallet.js.map
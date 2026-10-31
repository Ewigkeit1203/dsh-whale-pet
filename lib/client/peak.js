export const PEAK_WINDOWS = [[9, 12], [14, 18]];
const BEIJING_OFFSET_MS = 8 * 3600 * 1000;
/** Statutory days off for 2026 (国办发明电〔2025〕7号). Weekend dates are listed for completeness. */
export const CN_HOLIDAYS = Object.fromEntries([
    '2026-01-01', '2026-01-02', '2026-01-03',
    '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
    '2026-04-04', '2026-04-05', '2026-04-06',
    '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
    '2026-06-19', '2026-06-20', '2026-06-21',
    '2026-09-25', '2026-09-26', '2026-09-27',
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07',
].map(day => [day, true]));
export const HOLIDAY_YEARS = [2026];
function beijing(ms) {
    const d = new Date(ms + BEIJING_OFFSET_MS);
    const key = d.toISOString().slice(0, 10);
    return { year: d.getUTCFullYear(), dow: d.getUTCDay(), hour: d.getUTCHours(), key };
}
export function tierAt(ms) {
    const b = beijing(ms);
    if (b.dow === 0 || b.dow === 6)
        return { tier: 'valley', reason: 'weekend' };
    if (CN_HOLIDAYS[b.key])
        return { tier: 'valley', reason: 'holiday' };
    for (const [start, end] of PEAK_WINDOWS)
        if (b.hour >= start && b.hour < end)
            return { tier: 'peak', reason: 'peak-hours' };
    return { tier: 'valley', reason: 'off-hours' };
}
/** Scan Beijing hour boundaries (0, 9, 12, 14, 18) for the next change; the longest holiday is nine days. */
export function nextTierChange(ms) {
    const current = tierAt(ms).tier;
    const dayStart = Math.floor((ms + BEIJING_OFFSET_MS) / 86_400_000) * 86_400_000 - BEIJING_OFFSET_MS;
    for (let day = 0; day <= 14; day++) {
        for (const hour of [0, 9, 12, 14, 18]) {
            const candidate = dayStart + day * 86_400_000 + hour * 3_600_000;
            if (candidate <= ms)
                continue;
            if (tierAt(candidate).tier !== current)
                return candidate;
        }
    }
    return null;
}
export function tariffAt(ms) {
    const { tier, reason } = tierAt(ms);
    return { tier, reason, nextChange: nextTierChange(ms), holidayDataMissing: !HOLIDAY_YEARS.includes(beijing(ms).year) };
}
//# sourceMappingURL=peak.js.map
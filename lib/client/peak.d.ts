/**
 * DeepSeek API peak / off-peak ("梁文峰时间 / 梁文谷时间") schedule.
 *
 * Official rule (api-docs.deepseek.com/zh-cn/quick_start/pricing, footnote 2):
 *   Beijing time, Monday–Friday excluding Chinese statutory holidays,
 *   09:00–12:00 and 14:00–18:00 are peak. All other time, including weekends
 *   and statutory holidays, is off-peak at half the peak price.
 *
 * Weekend make-up working days (调休上班) are still weekends, so off-peak.
 * Only days off that fall on weekdays need listing. The holiday table is the
 * State Council's annual notice; extend CN_HOLIDAYS each November once the
 * next year's schedule is published. Years not in HOLIDAY_YEARS are computed
 * by weekday and hour only and flagged with `holidayDataMissing`.
 *
 * China has no daylight saving time, so Beijing time is always UTC+8.
 */
export type Tier = 'peak' | 'valley';
export type TierReason = 'peak-hours' | 'off-hours' | 'weekend' | 'holiday';
export declare const PEAK_WINDOWS: readonly (readonly [number, number])[];
/** Statutory days off for 2026 (国办发明电〔2025〕7号). Weekend dates are listed for completeness. */
export declare const CN_HOLIDAYS: Readonly<Record<string, true>>;
export declare const HOLIDAY_YEARS: readonly number[];
export interface TariffNow {
    tier: Tier;
    reason: TierReason;
    /** Next moment (epoch ms) the tier changes, or null if none within two weeks. */
    nextChange: number | null;
    /** The holiday table does not cover this year; weekday holidays may be shown as peak. */
    holidayDataMissing: boolean;
}
export declare function tierAt(ms: number): {
    tier: Tier;
    reason: TierReason;
};
/** Scan Beijing hour boundaries (0, 9, 12, 14, 18) for the next change; the longest holiday is nine days. */
export declare function nextTierChange(ms: number): number | null;
export declare function tariffAt(ms: number): TariffNow;
//# sourceMappingURL=peak.d.ts.map
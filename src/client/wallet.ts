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
export type WalletStatus = 'unavailable' | 'live' | 'stale'

export interface WalletInput {
  known: boolean
  toppedUp: string
  granted: string
  /** Last time the source re-read the account page (ms), even if unchanged. */
  checkedAt: number | null
  now: number
  ricePrice: number
}

export interface WalletView {
  status: WalletStatus
  /** Display strings; null means not read (render as —). */
  toppedUp: string | null
  granted: string | null
  checkedAt: number | null
  /** Whole bowls left; only for fresh, same-currency CNY data. */
  bowls: number | null
  low: boolean
}

/** The DOM source refreshes every 2s while the account page is mounted. */
export const WALLET_FRESH_MS = 10_000
export const WALLET_LOW_CNY = 2

export function walletAmount(value: string): { display: string; currency: string; amount: number } | null {
  const text = (value || '').replace(/\s+/g, ' ').trim()
  const match = text.replace(/,/g, '').match(/(-?\d+(?:\.\d+)?)/)
  if (!text || !match) return null
  const symbol = text.match(/[¥￥$€£]/)?.[0]?.replace('￥', '¥') ?? (/CNY|RMB|元/i.test(text) ? '¥' : /USD/i.test(text) ? '$' : '')
  return { display: text.replace('￥', '¥'), currency: symbol, amount: Number(match[1]) }
}

export function walletView(input: WalletInput): WalletView {
  if (!input.known) return { status: 'unavailable', toppedUp: null, granted: null, checkedAt: null, bowls: null, low: false }
  const toppedUp = walletAmount(input.toppedUp)
  const granted = walletAmount(input.granted)
  const fresh = input.checkedAt !== null && input.now - input.checkedAt <= WALLET_FRESH_MS
  const comparable = fresh && toppedUp && granted && toppedUp.currency === '¥' && granted.currency === '¥'
  const total = comparable ? toppedUp.amount + granted.amount : null
  return {
    status: toppedUp || granted ? (fresh ? 'live' : 'stale') : 'unavailable',
    toppedUp: toppedUp?.display ?? null,
    granted: granted?.display ?? null,
    checkedAt: input.checkedAt,
    bowls: total !== null && input.ricePrice > 0 ? Math.max(0, Math.floor(total / input.ricePrice)) : null,
    low: total !== null && total < WALLET_LOW_CNY,
  }
}

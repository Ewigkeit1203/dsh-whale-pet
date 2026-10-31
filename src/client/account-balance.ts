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
import type { BalanceSnapshot, WalletRead } from './types.js'

export const ACCOUNT_REFRESH = {
  okMs: 60_000,
  minGapMs: 15_000,
  failBaseMs: 30_000,
  failMaxMs: 300_000,
  /** A ready value older than this is shown as not live. */
  staleAfterMs: 5 * 60_000,
} as const

/**
 * Value for `AccountClientMetadata.version`. DSH inlines its version only into
 * its own bundles (process.env.DSH_CLIENT_VERSION) and exposes no runtime API,
 * so a third-party plugin reports it as unknown rather than inventing one.
 */
export const ACCOUNT_CLIENT_VERSION = 'unknown'

const DECIMAL = /^-?\d+(\.\d+)?$/

function walletRead(list: unknown): WalletRead {
  if (!Array.isArray(list)) return { status: 'failed' }
  const wallets = list
    .filter((w): w is { currency: unknown; balance: unknown } => !!w && typeof w === 'object')
    .map(w => ({ currency: String(w.currency || '').toUpperCase(), amount: String(w.balance ?? '') }))
    .filter(w => DECIMAL.test(w.amount) && /^[A-Z]{3}$/.test(w.currency))
  // Entries present but none valid is a malformed reply, not an empty wallet.
  if (list.length > 0 && wallets.length === 0) return { status: 'failed' }
  return { status: 'ready', wallets }
}

/**
 * Interpret one Remote reply. `null` value means no account grant (signed out
 * or the account changed); `failed` is a Platform failure.
 * @throws when the Remote call itself failed (`ok: false`) or the shape is unknown.
 */
export function parseAccountBalance(result: unknown, now: number): BalanceSnapshot {
  const reply = result as { ok?: unknown; value?: unknown } | null
  if (!reply || reply.ok !== true) throw new Error('account balance call failed')
  const value = reply.value as { status?: unknown; value?: unknown; bonusWallets?: unknown } | null
  if (value === null || value === undefined) return { status: 'signed-out', source: 'host', toppedUp: { status: 'unknown' }, granted: { status: 'unknown' }, updatedAt: null }
  if (value.status === 'failed') throw new Error('account balance failed on the Platform')
  if (value.status !== 'ready') throw new Error('unknown account balance shape')
  return { status: 'ready', source: 'host', toppedUp: walletRead(value.value), granted: walletRead(value.bonusWallets), updatedAt: now }
}

export interface AccountBalanceOptions {
  getBalance: () => Promise<unknown>
  publish: (snapshot: BalanceSnapshot | null) => void
  now?: () => number
  schedule?: (callback: () => void, ms: number) => unknown
  cancel?: (handle: unknown) => void
  /** Skip timer-driven reads while the window is hidden. */
  isHidden?: () => boolean
}

export class AccountBalancePoller {
  private generation = 0
  private timer: unknown = null
  private inFlight: Promise<void> | null = null
  private last: BalanceSnapshot | null = null
  private failures = 0
  private lastRequestAt = -Infinity
  private stopped = false
  private readonly now: () => number
  private readonly schedule: (callback: () => void, ms: number) => unknown
  private readonly cancel: (handle: unknown) => void

  constructor(private readonly options: AccountBalanceOptions) {
    this.now = options.now ?? (() => Date.now())
    this.schedule = options.schedule ?? ((callback, ms) => setTimeout(callback, ms))
    this.cancel = options.cancel ?? (handle => clearTimeout(handle as ReturnType<typeof setTimeout>))
  }

  public start(): void {
    this.stopped = false
    this.emit({ status: 'loading', source: 'host', toppedUp: { status: 'unknown' }, granted: { status: 'unknown' }, updatedAt: null })
    void this.refresh(true)
  }

  /** Request a read; coalesces with one in flight and respects the minimum gap unless forced. */
  public refresh(force = false): Promise<void> {
    if (this.stopped) return Promise.resolve()
    if (this.inFlight) return this.inFlight
    const wait = this.lastRequestAt + ACCOUNT_REFRESH.minGapMs - this.now()
    if (!force && wait > 0) { this.arm(wait); return Promise.resolve() }
    const generation = this.generation
    this.lastRequestAt = this.now()
    this.clearTimer()
    let request: Promise<unknown>
    try { request = Promise.resolve(this.options.getBalance()) } catch (error) { request = Promise.reject(error) }
    const flight = request.then(result => {
      if (generation !== this.generation) return
      this.failures = 0
      this.emit(parseAccountBalance(result, this.now()))
      this.arm(ACCOUNT_REFRESH.okMs)
    }, () => {
      if (generation !== this.generation) return
      this.failures++
      // Keep the last good amounts for the same grant, marked as not live.
      this.emit(this.last && this.last.updatedAt !== null ? { ...this.last, status: 'stale' } : { status: 'error', source: 'host', toppedUp: { status: 'unknown' }, granted: { status: 'unknown' }, updatedAt: null })
      this.arm(Math.min(ACCOUNT_REFRESH.failMaxMs, ACCOUNT_REFRESH.failBaseMs * 2 ** (this.failures - 1)))
    }).finally(() => { if (this.inFlight === flight) this.inFlight = null })
    this.inFlight = flight
    return flight
  }

  /** Access withdrawn or plugin unloaded: forget everything and ignore late replies. */
  public stop(): void {
    this.stopped = true
    this.generation++
    this.clearTimer()
    this.inFlight = null
    this.last = null
    this.options.publish(null)
  }

  private emit(snapshot: BalanceSnapshot): void {
    this.last = snapshot
    this.options.publish(snapshot)
  }

  private arm(ms: number): void {
    this.clearTimer()
    if (this.stopped) return
    this.timer = this.schedule(() => {
      this.timer = null
      if (this.options.isHidden?.()) { this.arm(ACCOUNT_REFRESH.okMs); return }
      void this.refresh(true)
    }, ms)
  }

  private clearTimer(): void {
    if (this.timer !== null) this.cancel(this.timer)
    this.timer = null
  }
}

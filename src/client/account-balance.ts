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
  staleAfterMs: 10 * 60_000,
  /** A read that has not answered by now counts as failed (the host call can hang; the chip must not stay on "loading"). */
  timeoutMs: 12_000,
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
  /** Older hosts without account notifications cannot safely retain an earlier account's amounts. */
  retainOnFailure?: boolean
}

export class AccountBalancePoller {
  private generation = 0
  private timer: unknown = null
  private inFlight: Promise<void> | null = null
  private last: BalanceSnapshot | null = null
  private failures = 0
  private lastRequestAt = -Infinity
  private stopped = false
  private cancelRequest: (() => void) | null = null
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
    this.failures = 0
    this.lastRequestAt = -Infinity
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
    let timeout: unknown = null
    let cancelRead: () => void
    const deadline = new Promise((_, reject) => {
      timeout = this.schedule(() => reject(new Error('balance read timed out')), ACCOUNT_REFRESH.timeoutMs)
      cancelRead = () => { if (timeout !== null) this.cancel(timeout); reject(new Error('balance read cancelled')) }
    })
    this.cancelRequest = cancelRead!
    request = Promise.race([request, deadline]).finally(() => {
      if (timeout !== null) this.cancel(timeout)
      if (this.cancelRequest === cancelRead) this.cancelRequest = null
    })
    const flight = request.then(result => {
      if (generation !== this.generation) return
      // A fulfilled Remote call can still report failure. Parse before resetting
      // backoff, and handle parser failures together with transport failures.
      const snapshot = parseAccountBalance(result, this.now())
      this.failures = 0
      this.emit(snapshot)
      this.arm(ACCOUNT_REFRESH.okMs)
    }).catch(() => {
      if (generation !== this.generation) return
      this.failures++
      // Keep the last good amounts for the same grant, marked as not live.
      this.emit(this.options.retainOnFailure !== false && this.last && this.last.updatedAt !== null ? { ...this.last, status: 'stale' } : emptyAccountBalance('error'))
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
    this.cancelRequest?.()
    this.cancelRequest = null
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

export function emptyAccountBalance(status: 'loading' | 'signed-out' | 'error'): BalanceSnapshot {
  return { status, source: 'host', toppedUp: { status: 'unknown' }, granted: { status: 'unknown' }, updatedAt: null }
}

export interface AccountBalanceStream extends AsyncIterable<{ value: { status: string }; accept(): void }> {
  dispose(): void | Promise<void>
}

/** Account notifications are an invalidation boundary, not an account identity to persist. */
export function watchAccountBalances(options: AccountBalanceOptions, openStream?: () => AccountBalanceStream): { refresh(force?: boolean): Promise<void>; stop(): void } {
  const poller = new AccountBalancePoller({ ...options, retainOnFailure: Boolean(openStream) })
  if (!openStream) { poller.start(); return poller }
  const schedule = options.schedule ?? ((callback: () => void, ms: number) => setTimeout(callback, ms))
  const cancel = options.cancel ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>))
  let stopped = false, generation = 0, ready = false
  let stream: AccountBalanceStream | null = null
  let timer: unknown = null
  const clearTimer = () => { if (timer !== null) cancel(timer); timer = null }
  const disposeStream = () => {
    const previous = stream; stream = null
    try { if (previous) void Promise.resolve(previous.dispose()).catch(() => {}) } catch { /* already disconnected */ }
  }
  const failed = (own: number) => {
    if (stopped || own !== generation) return
    generation++; ready = false; clearTimer(); disposeStream(); poller.stop()
    options.publish(emptyAccountBalance('error'))
    timer = schedule(() => { timer = null; begin() }, ACCOUNT_REFRESH.failBaseMs)
  }
  const begin = () => {
    const own = ++generation
    ready = false; clearTimer(); disposeStream(); poller.stop()
    options.publish(emptyAccountBalance('loading'))
    timer = schedule(() => failed(own), ACCOUNT_REFRESH.timeoutMs)
    try {
      const current = openStream()
      stream = current
      void (async () => {
        for await (const frame of current) {
          if (stopped || own !== generation) return
          clearTimer(); poller.stop()
          ready = frame.value.status === 'credential-stored'
          if (ready) poller.start()
          else options.publish(emptyAccountBalance(frame.value.status === 'signed-out' ? 'signed-out' : 'error'))
          frame.accept()
        }
        failed(own)
      })().catch(() => failed(own))
    } catch { failed(own) }
  }
  begin()
  return {
    refresh(force = false) {
      if (stopped) return Promise.resolve()
      if (ready) return poller.refresh(force)
      if (force && stream === null) begin()
      return Promise.resolve()
    },
    stop() {
      stopped = true; generation++; ready = false; clearTimer(); disposeStream(); poller.stop()
    },
  }
}

/**
 * The link between 大肥鱼 in DSH and the desktop companion (desktop/, roadmap step 2).
 *
 * DSH's page cannot open a desktop window or listen on a port, so the companion (Node) listens on
 * 127.0.0.1 and the page is the client: it finds the companion on one of a few fixed ports and posts
 * what her state machine was told (thinking, answering, the latest answer, the balance). The desktop
 * feeds the same calls into its own state machine, so she reacts exactly as she does in DSH.
 * Nothing here can run code or touch files on either side: the only message is a status snapshot.
 */
import type { BalanceSnapshot, PetStatusInfo, WalletRead } from './types.js'
import type { ComposerResult } from './dsh-composer.js'
import { readConversationContext, readConversationLogSnapshot, type ConversationContext, type ConversationLog } from './conversation-log.js'

export const DESKTOP_LINK = {
  ports: [38917, 38918, 38919, 38920, 38921],
  app: 'dsh-whale-pet-desktop',
  version: 1,
  /** A push at least this often, so the companion knows DSH is still there. */
  beatMs: 2000,
  /** At most four pushes a second while she streams an answer. */
  minGapMs: 250,
  /** Looking for the companion: quickly at first, then less often while it is not running. */
  scanMs: [3000, 5000, 10000, 30000, 60000],
  helloTimeoutMs: 800,
  /** A push (and reading its answer) that takes longer than this means the companion is stuck: let go. */
  pushTimeoutMs: 5000,
  /** GET /commands is held open by the companion for up to 20 s; give up a little later. */
  commandWaitMs: 25000,
  /** The longest question the desktop theatre may hand to DSH. */
  commandTextLimit: 20000,
  /** Longer answers are cut (the desktop bubble shows the end, the theatre will page). */
  textLimit: 60000,
} as const

export interface LinkSnapshot {
  v: 1
  isReasoning: boolean
  isStreaming: boolean
  latestDialogue: string
  reasoningText: string
  quotaErrorKey: string | null
  hostBalance: BalanceSnapshot | null
  balances: { known: boolean; toppedUp: string; granted: string }
  /** Page instance and active conversation only; history is requested separately, never on every heartbeat. */
  conversation?: ConversationContext
}

/** getStatus() falls back to her idle line when there is no answer yet; only a real answer is sent. */
const answerOf = (status: PetStatusInfo): string => status.latestDialogue === status.speech ? '' : status.latestDialogue

export function linkSnapshot(status: PetStatusInfo, conversation?: ConversationContext): LinkSnapshot {
  return {
    v: 1,
    isReasoning: status.isReasoning,
    isStreaming: status.isStreaming,
    latestDialogue: answerOf(status).slice(0, DESKTOP_LINK.textLimit),
    reasoningText: status.reasoningText.slice(-DESKTOP_LINK.textLimit),
    quotaErrorKey: status.quotaErrorKey,
    hostBalance: status.hostBalance,
    balances: { known: status.balancesKnown, toppedUp: status.toppedUpBalance, granted: status.grantedBalance },
    ...(conversation ? { conversation } : {}),
  }
}

/** The calls DSH's page makes on her state machine, and the desktop repeats. */
export interface LinkDriver {
  getStatus(): PetStatusInfo
  setReasoning(on: boolean): void
  setStreaming(on: boolean): void
  setLatestDialogue(text: string): void
  setReasoningText(text: string): void
  clearReasoningText(): void
  setQuotaError(key: string | null): void
  setHostBalance(snapshot: BalanceSnapshot | null): void
  setBalances(toppedUp: string, granted: string): void
  clearBalances(): void
}

const isLinkText = (value: unknown, limit: number = DESKTOP_LINK.textLimit): value is string => typeof value === 'string' && value.length <= limit

function isLinkWallet(value: unknown): value is WalletRead {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const read = value as Record<string, any>
  if (read.status === 'unknown' || read.status === 'failed') return true
  return read.status === 'ready' && Array.isArray(read.wallets) && read.wallets.length <= 64 && read.wallets.every((wallet: any) =>
    wallet && typeof wallet === 'object' && typeof wallet.currency === 'string' && /^[A-Z]{3}$/.test(wallet.currency) &&
    isLinkText(wallet.amount, 200) && /^-?\d+(\.\d+)?$/.test(wallet.amount))
}

/** Compare only transported fields; poses, menus and other local state must not serialize large answers. */
function sameLinkSnapshot(a: LinkSnapshot | null, b: LinkSnapshot): boolean {
  return a !== null && a.isReasoning === b.isReasoning && a.isStreaming === b.isStreaming &&
    a.latestDialogue === b.latestDialogue && a.reasoningText === b.reasoningText && a.quotaErrorKey === b.quotaErrorKey &&
    a.hostBalance === b.hostBalance && a.balances.known === b.balances.known && a.balances.toppedUp === b.balances.toppedUp &&
    a.balances.granted === b.balances.granted && a.conversation?.source === b.conversation?.source && a.conversation?.session === b.conversation?.session
}

/** Checks a snapshot that arrived over the link; anything unexpected is dropped whole. */
export function readLinkSnapshot(value: unknown): LinkSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const s = value as Record<string, any>
  if (s.v !== 1 || typeof s.isReasoning !== 'boolean' || typeof s.isStreaming !== 'boolean') return null
  if (!isLinkText(s.latestDialogue) || !isLinkText(s.reasoningText)) return null
  if (s.quotaErrorKey !== null && !isLinkText(s.quotaErrorKey, 2000)) return null
  const b = s.balances
  if (!b || typeof b.known !== 'boolean' || !isLinkText(b.toppedUp, 200) || !isLinkText(b.granted, 200)) return null
  const h = s.hostBalance
  if (h !== null && (!h || typeof h !== 'object' || h.source !== 'host' || !['loading', 'ready', 'stale', 'signed-out', 'error'].includes(h.status) ||
    !isLinkWallet(h.toppedUp) || !isLinkWallet(h.granted) || (h.updatedAt !== null && (typeof h.updatedAt !== 'number' || !Number.isFinite(h.updatedAt) || h.updatedAt < 0 || h.updatedAt > 8.64e15)))) return null
  if (s.conversation !== undefined && !readConversationContext(s.conversation)) return null
  return s as LinkSnapshot
}

/** Desktop: repeat what DSH's page told its state machine, in the order the page does it. */
export function applyLinkSnapshot(machine: LinkDriver, value: unknown): boolean {
  const s = readLinkSnapshot(value)
  if (!s) return false
  const now = machine.getStatus()
  if (s.reasoningText) { if (s.reasoningText !== now.reasoningText) machine.setReasoningText(s.reasoningText) }
  else if (now.reasoningText) machine.clearReasoningText()
  if (s.latestDialogue !== answerOf(now)) machine.setLatestDialogue(s.latestDialogue)
  if (s.quotaErrorKey !== now.quotaErrorKey) machine.setQuotaError(s.quotaErrorKey)
  // Unknown is an account reset, not "keep the last account's amounts". Clear the legacy source too,
  // then apply the host snapshot (including null) so a sign-out or revoked access reaches the desktop.
  if (!s.balances.known && (now.balancesKnown || (now.hostBalance !== null && s.hostBalance === null))) machine.clearBalances()
  if (JSON.stringify(s.hostBalance) !== JSON.stringify(machine.getStatus().hostBalance)) machine.setHostBalance(s.hostBalance)
  if (s.balances.known && (!now.balancesKnown || s.balances.toppedUp !== now.toppedUpBalance || s.balances.granted !== now.grantedBalance)) machine.setBalances(s.balances.toppedUp, s.balances.granted)
  if (s.isStreaming) { machine.setStreaming(true); machine.setReasoning(false) }
  else { machine.setStreaming(false); machine.setReasoning(s.isReasoning) }
  return true
}

/** Desktop: DSH went away mid-answer; she stops thinking and talking (she keeps the last balance). */
export function linkLost(machine: Pick<LinkDriver, 'setStreaming' | 'setReasoning'>): void {
  machine.setStreaming(false)
  machine.setReasoning(false)
}

export type DesktopLinkState =
  | { status: 'searching'; error?: string }
  /** shown: her companion window is on screen, so she is there and not in DSH (roadmap step 4). */
  | { status: 'connected'; port: number; shown: boolean }

/**
 * What the companion says about itself with every answer (/push, /commands): whether her window is on
 * screen, a revision that only grows (answers can arrive out of order), and quitting on a normal exit.
 * An older companion says nothing: then she counts as not shown and stays in DSH, as before.
 */
export interface DesktopPresence { shown: boolean; rev: number; quitting?: boolean }
export function readDesktopPresence(value: unknown): DesktopPresence | null {
  const d = value && typeof value === 'object' ? (value as Record<string, unknown>).desktop : undefined
  if (!d || typeof d !== 'object') return null
  const p = d as Record<string, unknown>
  if (typeof p.shown !== 'boolean' || typeof p.rev !== 'number' || !Number.isSafeInteger(p.rev) || p.rev < 0) return null
  if (p.quitting !== undefined && typeof p.quitting !== 'boolean') return null
  // Quitting means she is no longer on the desktop; anything else is contradictory and dropped.
  if (p.quitting === true && p.shown) return null
  return { shown: p.shown, rev: p.rev, quitting: p.quitting === true || undefined }
}

/** Only these can be asked of the companion from DSH: show her window, or open her theatre there. */
export type DesktopRequest = 'show' | 'theatre'
let desktopRequester: ((action: DesktopRequest) => Promise<boolean>) | null = null
let desktopRecheck: (() => void) | null = null

/** Fixed application link. The desktop companion only accepts the show action. */
export function launchDesktopFromDsh(): void {
  window.location.href = 'dsh-whale-pet://show'
  recheckDesktopLink()
}

export function recheckDesktopLink(): void {
  desktopRecheck?.()
}
/** DSH: ask the running companion to show her (false when none is connected or it refused). */
export function requestDesktop(action: DesktopRequest): Promise<boolean> {
  return desktopRequester ? desktopRequester(action) : Promise.resolve(false)
}

let desktopLinkCurrent: DesktopLinkState = { status: 'searching' }
/** The latest link state, for the settings panel (the link may start before the panel mounts). */
export function desktopLinkState(): DesktopLinkState { return desktopLinkCurrent }

/** A question typed in the desktop theatre, to be sent through DSH's own composer. */
export interface LinkCommand { type: 'send'; id: string; text: string }

/** Checks a command from the companion; anything else is ignored. */
export function readLinkCommand(value: unknown): LinkCommand | null {
  if (!value || typeof value !== 'object') return null
  const c = value as Record<string, unknown>
  if (c.type !== 'send' || typeof c.id !== 'string' || !c.id || c.id.length > 64) return null
  if (typeof c.text !== 'string' || !c.text.trim() || c.text.length > DESKTOP_LINK.commandTextLimit) return null
  return { type: 'send', id: c.id, text: c.text }
}

/** A read-only command is deliberately separate from questions sent through DSH's composer. */
export function readHistoryCommand(value: unknown): { type: 'history'; id: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const command = value as Record<string, unknown>
  return command.type === 'history' && typeof command.id === 'string' && command.id.length > 0 && command.id.length <= 64
    ? { type: 'history', id: command.id } : null
}

interface LinkDeps {
  fetch: typeof fetch
  setTimeout: (fn: () => void, ms: number) => unknown
  clearTimeout: (timer: any) => void
  now: () => number
  onState?: (state: DesktopLinkState) => void
  /** Tests only: a shorter push timeout. */
  pushTimeoutMs?: number
  /** DSH: send a question from the desktop theatre and report how it went. */
  onCommand?: (command: LinkCommand, done: (result: ComposerResult) => void) => void
  getConversation?: () => ConversationContext
  readHistory?: () => ConversationLog
  /** Identity changes bypass the heartbeat/min-gap delay, including an empty conversation. */
  subscribeConversation?: (changed: () => void) => () => void
}

/**
 * DSH: find the companion and keep it up to date. Returns a stop function.
 * While it is not running this costs one failed local request per port every few seconds.
 */
export function startDesktopLink(machine: Pick<LinkDriver, 'getStatus'> & { subscribe(listener: () => void): () => void }, deps: Partial<LinkDeps> = {}): () => void {
  const d: LinkDeps = {
    fetch: deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args)),
    setTimeout: deps.setTimeout ?? ((fn, ms) => setTimeout(fn, ms)),
    clearTimeout: deps.clearTimeout ?? (timer => clearTimeout(timer)),
    now: deps.now ?? (() => Date.now()),
    onState: deps.onState,
    onCommand: deps.onCommand,
    pushTimeoutMs: deps.pushTimeoutMs,
    getConversation: deps.getConversation,
    readHistory: deps.readHistory,
  }
  const snapshot = () => linkSnapshot(machine.getStatus(), d.getConversation?.())
  let port: number | null = null
  let timer: unknown = null
  let dueAt = Infinity
  let busy = false, again = false, stopped = false
  let lastSent = 0, misses = 0
  let observedSnapshot: LinkSnapshot | null = null
  /** The companion's window, as last told (newest revision wins); reset for every new connection. */
  let shown = false, rev = -1, generation = 0
  const set = (state: DesktopLinkState) => {
    if (JSON.stringify(state) === JSON.stringify(desktopLinkCurrent)) return
    desktopLinkCurrent = state
    d.onState?.(state)
  }
  const schedule = (ms: number) => {
    if (stopped) return
    const at = d.now() + ms
    if (timer !== null && at >= dueAt) return
    if (timer !== null) d.clearTimeout(timer)
    dueAt = at
    timer = d.setTimeout(() => { timer = null; dueAt = Infinity; void tick() }, ms)
  }
  const url = (p: number, path: string) => `http://127.0.0.1:${p}${path}`
  /** An answer belongs to the connection it was asked on; anything from an older one is ignored whole. */
  const current = (at: number, from: number) => !stopped && port === at && generation === from
  /** Ends the current connection: a new one starts from scratch, and its waiting /commands is cancelled. */
  const drop = () => {
    port = null; shown = false; rev = -1; generation++
    if (pollAbort) { pollAbort.abort(); pollAbort = null }
  }
  /**
   * What the companion said about her window. A newer revision moves her; an older one is ignored (the
   * answer itself may still carry valid commands); quitting ends the connection at once, so she is back in
   * DSH now rather than after the next push fails. Returns whether the connection is still the same one.
   */
  const heard = (body: unknown, at: number, from: number): boolean => {
    if (!current(at, from)) return false
    const presence = readDesktopPresence(body)
    if (!presence || presence.rev < rev || (presence.rev === rev && presence.shown !== shown)) return true
    rev = presence.rev
    if (presence.quitting) {
      drop()
      set({ status: 'searching', error: 'companion quit' })
      schedule(DESKTOP_LINK.scanMs[0])
      return false
    }
    shown = presence.shown
    set({ status: 'connected', port: at, shown })
    return true
  }
  const find = async (): Promise<number | null> => {
    let error = ''
    for (const p of DESKTOP_LINK.ports) {
      if (stopped) return null
      try {
        const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(DESKTOP_LINK.helloTimeoutMs) : undefined
        const response = await d.fetch(url(p, '/hello'), { signal })
        const hello = response.ok ? await response.json() : null
        if (hello && hello.app === DESKTOP_LINK.app && hello.v === DESKTOP_LINK.version) return p
        error = response.ok ? 'not the companion' : `HTTP ${response.status}`
      } catch (e) {
        error = e instanceof Error ? e.message : String(e)
      }
    }
    if (!stopped) set({ status: 'searching', error })
    return null
  }
  const tick = async () => {
    if (stopped) return
    if (busy) { again = true; return }
    busy = true
    try {
      if (port === null) {
        const found = await find()
        if (stopped) return
        if (found === null) {
          schedule(DESKTOP_LINK.scanMs[Math.min(misses++, DESKTOP_LINK.scanMs.length - 1)])
          return
        }
        drop()
        port = found
        misses = 0
      }
      observedSnapshot = snapshot()
      const body = JSON.stringify(observedSnapshot)
      const at = port, from = generation
      try {
        const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(d.pushTimeoutMs ?? DESKTOP_LINK.pushTimeoutMs) : undefined
        const response = await d.fetch(url(at, '/push'), { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        let answer: unknown = null
        try { answer = typeof response.json === 'function' ? await response.json() : null } catch (e) {
          // An empty or odd answer just carries no presence; a timeout while reading it is a failed push.
          if (signal?.aborted) throw e
        }
        if (!current(at, from)) return
        lastSent = d.now()
        set({ status: 'connected', port: at, shown })
        if (!heard(answer, at, from)) return
        schedule(DESKTOP_LINK.beatMs)
        listen()
      } catch (e) {
        // Gone (or restarted on another port): look again at once, then back off.
        if (!current(at, from)) return
        drop()
        misses = 0
        set({ status: 'searching', error: e instanceof Error ? e.message : String(e) })
        schedule(0)
      }
    } finally {
      busy = false
      if (again && !stopped) { again = false; schedule(0) }
    }
  }
  // Questions from the desktop theatre (and news about her window): one request waits at the companion
  // while connected. Each connection has its own; a new connection never waits for an old one to end.
  let pollFor = -1
  let pollAbort: AbortController | null = null
  const listen = () => {
    if (stopped || port === null || (!d.onCommand && !d.readHistory) || pollFor === generation) return
    pollFor = generation
    const at = port, from = generation
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    pollAbort = controller
    void (async () => {
      let pause = 0
      try {
        const timeout = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(DESKTOP_LINK.commandWaitMs) : undefined
        const signal = controller && timeout && typeof (AbortSignal as any).any === 'function' ? (AbortSignal as any).any([controller.signal, timeout]) as AbortSignal : controller?.signal ?? timeout
        const response = await d.fetch(url(at, '/commands'), { signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = await response.json()
        if (!heard(body, at, from)) return
        for (const raw of Array.isArray(body?.commands) ? body.commands : []) {
          if (!current(at, from)) return
          const history = readHistoryCommand(raw)
          if (history) {
            if (!d.readHistory) continue
            let log: ConversationLog | null = null
            try { log = readConversationLogSnapshot(d.readHistory()) } catch { /* A page disappearing is unavailable, not old history. */ }
            if (!log) {
              const context = readConversationContext(d.getConversation?.())
              if (!context) continue
              log = { context, status: 'unavailable', entries: [], truncated: false }
            }
            if (!current(at, from)) return
            const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(DESKTOP_LINK.pushTimeoutMs) : undefined
            void d.fetch(url(at, '/history'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: history.id, log }), signal }).catch(() => {})
            continue
          }
          const command = readLinkCommand(raw)
          if (!command || !d.onCommand) continue
          d.onCommand!(command, result => {
            void d.fetch(url(at, '/ack'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: command.id, result }) }).catch(() => {})
          })
        }
      } catch (e) {
        // The companion answers within 20 s; a failure or a timeout means it is gone or stuck. Let go of it,
        // so she comes back in DSH, and look for it again (a push that hangs can no longer hide her forever).
        if (current(at, from)) {
          drop()
          misses = 0
          set({ status: 'searching', error: e instanceof Error ? e.message : String(e) })
          schedule(0)
        }
        pause = DESKTOP_LINK.beatMs
      } finally {
        if (pollFor === from) { pollFor = -1; if (pollAbort === controller) pollAbort = null }
        if (current(at, from)) { if (pause) d.setTimeout(listen, pause); else listen() }
      }
    })()
  }
  const ownRequester = async (action: DesktopRequest): Promise<boolean> => {
    const at = port, from = generation
    if (at === null || stopped) return false
    try {
      const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(d.pushTimeoutMs ?? DESKTOP_LINK.pushTimeoutMs) : undefined
      const response = await d.fetch(url(at, '/request'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }), signal })
      if (!response.ok) return false
      const answer = await response.json()
      return heard(answer, at, from) && answer?.ok === true
    } catch { return false }
  }
  desktopRequester = ownRequester
  const ownRecheck = () => schedule(0)
  desktopRecheck = ownRecheck
  const unsubscribe = machine.subscribe(() => {
    if (port === null) return
    const next = snapshot()
    if (sameLinkSnapshot(observedSnapshot, next)) return
    observedSnapshot = next
    schedule(Math.max(0, DESKTOP_LINK.minGapMs - (d.now() - lastSent)))
  })
  const unsubscribeConversation = deps.subscribeConversation?.(() => { if (port !== null) schedule(0) })
  schedule(0)
  return () => {
    if (stopped) return
    stopped = true
    if (desktopRequester === ownRequester) desktopRequester = null
    if (desktopRecheck === ownRecheck) desktopRecheck = null
    if (pollAbort) pollAbort.abort()
    if (timer !== null) d.clearTimeout(timer)
    unsubscribe()
    unsubscribeConversation?.()
  }
}

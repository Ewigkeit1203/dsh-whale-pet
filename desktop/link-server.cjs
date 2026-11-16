/**
 * The companion's end of the DSH link (roadmap step 2): a tiny HTTP server on 127.0.0.1 that DSH's page
 * posts her status to. See src/client/desktop-link.ts for the page's end.
 *
 * Safety: loopback only; only DSH's page origin; only the Host names of this machine (no DNS rebinding);
 * four fixed routes; a size cap; the body is handed to her page as data and never executed or stored.
 *
 * The other direction (a question asked in the desktop theatre): DSH's page keeps one GET /commands open;
 * enqueue() answers it at once, the page sends the text through DSH's own composer and reports the outcome
 * with POST /ack. The only command is "send this text"; questions older than 15 s are dropped, not sent late.
 *
 * Only one of her (roadmap step 4): every answer carries `desktop: { shown, rev }`, whether her window is on
 * screen. DSH's page hides her own copy while it is. A change answers the waiting GET /commands at once, so
 * DSH hears it within a moment; rev only grows, so an older answer arriving late is ignored. On a normal
 * exit the waiting request is answered with `quitting: true` and she comes back in DSH right away.
 * POST /request lets DSH ask for one of two fixed things: show her window, or open her theatre.
 */
const http = require('node:http')

const LINK = {
  ports: [38917, 38918, 38919, 38920, 38921],
  app: 'dsh-whale-pet-desktop',
  version: 1,
  origins: ['dsh-app://app'],
  maxBody: 512 * 1024,
  /** No push for this long: DSH is gone (it pushes at least every 2 s). */
  silenceMs: 6000,
  /** How long GET /commands is held open when there is nothing to send. */
  pollMs: 20000,
  /** A question DSH did not pick up within this time is reported as failed instead of sent late. */
  commandTtlMs: 15000,
  maxText: 20000,
  historyBody: 256 * 1024,
  historyPending: 8,
}
const RESULTS = new Set(['sent', 'no-composer', 'no-button', 'failed'])
const REQUESTS = new Set(['show', 'theatre'])

/**
 * @param {{ onSnapshot(snapshot: unknown): void, onState(state: { connected: boolean, port: number | null, rejected: string | null }): void, onAck?(id: string, result: string): void, onHistory?(id: string, log: unknown): void, onRequest?(action: 'show' | 'theatre'): boolean | void, ports?: number[], origins?: string[], now?: () => number, pollMs?: number }} options
 */
function createLinkServer(options) {
  const ports = options.ports || LINK.ports
  const origins = new Set(options.origins || LINK.origins)
  const now = options.now || Date.now
  const state = { started: false, connected: false, port: null, rejected: null }
  let lastPush = 0
  /** Her window, as DSH should know it. Not shown until the window really is. */
  const presence = { shown: false, rev: 0, quitting: false }
  const desktop = () => presence.quitting ? { shown: false, rev: presence.rev, quitting: true } : { shown: presence.shown, rev: presence.rev }
  let server = null
  let watch = null
  /** @type {({ type: 'send', id: string, text: string, at: number } | { type: 'history', id: string, at: number })[]} */
  let queue = []
  const historyPending = new Map()
  /** @type {null | { respond(commands: object[]): void }} */
  let waiter = null
  /** The companion is quitting (call as early as possible, e.g. before-quit): DSH is told at once. */
  function leaving() {
    if (!presence.quitting) { presence.quitting = true; presence.rev++ }
    wake()
  }
  /** Answers the waiting GET /commands now (with nothing to send), so DSH hears a change at once. */
  function wake() { if (waiter) { const current = waiter; waiter = null; current.respond([]) } }
  const pollMs = options.pollMs || LINK.pollMs
  const ack = (id, result) => { if (options.onAck) options.onAck(id, result) }
  const historyResult = (id, log) => {
    if (!historyPending.delete(id)) return
    queue = queue.filter(command => command.type !== 'history' || command.id !== id)
    if (options.onHistory) options.onHistory(id, log)
  }
  const failed = command => { if (command.type === 'history') historyResult(command.id, null); else ack(command.id, 'failed') }
  /** Drops questions nobody picked up in time (reported as failed), then hands the rest to a waiting DSH. */
  function flush() {
    const fresh = []
    for (const command of queue) { if (now() - command.at > LINK.commandTtlMs) failed(command); else fresh.push(command) }
    queue = fresh
    for (const [id, at] of historyPending) if (now() - at > LINK.commandTtlMs) historyResult(id, null)
    if (!waiter || !queue.length) return
    const commands = queue.map(command => command.type === 'history' ? { type: 'history', id: command.id } : { type: 'send', id: command.id, text: command.text })
    queue = []
    const current = waiter
    waiter = null
    current.respond(commands)
  }

  const report = () => options.onState({ ...state })
  const setConnected = connected => { if (state.connected !== connected) { state.connected = connected; report() } }

  function handle(request, response) {
    const origin = request.headers.origin
    const host = String(request.headers.host || '')
    const hostOk = host === `127.0.0.1:${state.port}` || host === `localhost:${state.port}`
    if (!hostOk || typeof origin !== 'string' || !origins.has(origin)) {
      // Remembered (not the body) so the tray can say why DSH did not connect.
      const why = !hostOk ? `host ${host || '(none)'}` : `origin ${origin === undefined ? '(none)' : origin}`
      if (state.rejected !== why) { state.rejected = why; report() }
      response.writeHead(403, { 'content-type': 'text/plain' })
      response.end('forbidden')
      return
    }
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      // Chrome's Private Network Access preflight: a page asking to reach the loopback address.
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Max-Age': '600',
    }
    const json = (status, body) => { response.writeHead(status, { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' }); response.end(JSON.stringify(body)) }
    const path = (request.url || '').split('?')[0]
    if (request.method === 'OPTIONS') { response.writeHead(204, cors); response.end(); return }
    if (request.method === 'GET' && path === '/hello') { json(200, { app: LINK.app, v: LINK.version, desktop: desktop() }); return }
    if (request.method === 'GET' && path === '/commands') {
      if (waiter) waiter.respond([])
      let done = false
      const timer = setTimeout(() => entry.respond([]), pollMs)
      const entry = { respond(commands) { if (done) return; done = true; clearTimeout(timer); if (waiter === entry) waiter = null; json(200, { commands, desktop: desktop() }) } }
      request.on('close', () => { if (!done) { done = true; clearTimeout(timer); if (waiter === entry) waiter = null } })
      waiter = entry
      flush()
      return
    }
    if (request.method === 'POST' && path === '/ack') {
      let body = ''
      request.on('data', chunk => { body += chunk; if (body.length > 1024) request.destroy() })
      request.on('end', () => {
        let message
        try { message = JSON.parse(body) } catch { json(400, { ok: false }); return }
        if (!message || typeof message.id !== 'string' || message.id.length > 64 || !RESULTS.has(message.result)) { json(400, { ok: false }); return }
        ack(message.id, message.result)
        json(200, { ok: true })
      })
      return
    }
    if (request.method === 'POST' && path === '/history') {
      let size = 0, refused = false
      const chunks = []
      request.on('data', chunk => {
        size += chunk.length
        if (size > LINK.historyBody) {
          if (!refused) { refused = true; json(413, { ok: false }) }
          request.destroy(); return
        }
        chunks.push(chunk)
      })
      request.on('end', () => {
        if (refused) return
        let value
        try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { json(400, { ok: false }); return }
        if (!value || typeof value.id !== 'string' || !value.id || value.id.length > 64 || !value.log || typeof value.log !== 'object' || Array.isArray(value.log)) { json(400, { ok: false }); return }
        const at = historyPending.get(value.id)
        if (at === undefined || presence.quitting || now() - at > LINK.commandTtlMs) {
          historyResult(value.id, null)
          json(409, { ok: false }); return
        }
        // Renderer validates the full bounded log contract and matches the current source/session before use.
        historyResult(value.id, value.log)
        json(200, { ok: true })
      })
      return
    }
    if (request.method === 'POST' && path === '/request') {
      let size = 0, refused = false
      const chunks = []
      request.on('data', chunk => {
        size += chunk.length
        if (size > 256) { if (!refused) { refused = true; json(413, { ok: false }) } request.destroy(); return }
        chunks.push(chunk)
      })
      request.on('end', () => {
        if (refused) return
        let message
        try { message = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { json(400, { ok: false, desktop: desktop() }); return }
        const action = message && typeof message === 'object' && !Array.isArray(message) ? message.action : undefined
        if (typeof action !== 'string' || !REQUESTS.has(action)) { json(400, { ok: false, desktop: desktop() }); return }
        // Checked again now the body is in: a request that finished arriving during shutdown does nothing.
        if (presence.quitting) { json(409, { ok: false, desktop: desktop() }); return }
        let accepted = false
        try { accepted = options.onRequest ? options.onRequest(action) !== false : false } catch { accepted = false }
        json(accepted ? 200 : 409, { ok: accepted, desktop: desktop() })
      })
      return
    }
    if (request.method === 'POST' && path === '/push') {
      let size = 0
      const chunks = []
      let refused = false
      request.on('data', chunk => {
        size += chunk.length
        if (size > LINK.maxBody) { refused = true; json(413, { ok: false }); request.destroy(); return }
        chunks.push(chunk)
      })
      request.on('end', () => {
        if (refused) return
        let snapshot
        try { snapshot = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { json(400, { ok: false }); return }
        lastPush = now()
        setConnected(true)
        options.onSnapshot(snapshot)
        json(200, { ok: true, desktop: desktop() })
      })
      return
    }
    json(404, { ok: false })
  }

  function listenOn(index) {
    return new Promise(resolve => {
      if (index >= ports.length) { resolve(null); return }
      const candidate = http.createServer(handle)
      candidate.once('error', () => { candidate.close(); resolve(listenOn(index + 1)) })
      candidate.listen(ports[index], '127.0.0.1', () => resolve({ server: candidate, port: ports[index] }))
    })
  }

  return {
    state,
    /** Her window was shown or hidden (call with what the window really is); DSH is told at once. */
    setShown(shown) {
      shown = Boolean(shown)
      if (presence.quitting || presence.shown === shown) return
      presence.shown = shown
      presence.rev++
      wake()
    },
    /** A question typed in the desktop theatre, for DSH to send. False when DSH is not connected. */
    enqueue(id, text) {
      if (!state.connected || typeof id !== 'string' || !id || id.length > 64 || typeof text !== 'string' || !text.trim() || text.length > LINK.maxText) return false
      queue.push({ type: 'send', id, text, at: now() })
      flush()
      return true
    },
    /** Read-only: read the currently loaded conversation, only when the user opens the log. */
    enqueueHistory(id) {
      if (!state.connected || presence.quitting || typeof id !== 'string' || !id || id.length > 64 || historyPending.has(id) || historyPending.size >= LINK.historyPending) return false
      historyPending.set(id, now())
      queue.push({ type: 'history', id, at: now() })
      flush()
      return true
    },
    async start() {
      const found = await listenOn(0)
      state.started = true
      if (!found) { report(); return null }
      server = found.server
      state.port = found.port
      watch = setInterval(() => {
        if (state.connected && now() - lastPush > LINK.silenceMs) {
          setConnected(false)
          for (const id of historyPending.keys()) historyResult(id, null)
        }
        flush()
      }, 1000)
      if (watch.unref) watch.unref()
      report()
      return found.port
    },
    leaving,
    close() {
      // One last answer to DSH: she is leaving the desktop, so DSH shows her again without waiting.
      leaving()
      for (const command of queue) failed(command)
      queue = []
      for (const id of historyPending.keys()) historyResult(id, null)
      if (watch) clearInterval(watch)
      if (server) server.close()
      server = null
    },
  }
}

module.exports = { createLinkServer, LINK }

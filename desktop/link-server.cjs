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
}
const RESULTS = new Set(['sent', 'no-composer', 'no-button', 'failed'])

/**
 * @param {{ onSnapshot(snapshot: unknown): void, onState(state: { connected: boolean, port: number | null, rejected: string | null }): void, onAck?(id: string, result: string): void, ports?: number[], origins?: string[], now?: () => number, pollMs?: number }} options
 */
function createLinkServer(options) {
  const ports = options.ports || LINK.ports
  const origins = new Set(options.origins || LINK.origins)
  const now = options.now || Date.now
  const state = { started: false, connected: false, port: null, rejected: null }
  let lastPush = 0
  let server = null
  let watch = null
  /** @type {{ id: string, text: string, at: number }[]} */
  let queue = []
  /** @type {null | { respond(commands: object[]): void }} */
  let waiter = null
  const pollMs = options.pollMs || LINK.pollMs
  const ack = (id, result) => { if (options.onAck) options.onAck(id, result) }
  /** Drops questions nobody picked up in time (reported as failed), then hands the rest to a waiting DSH. */
  function flush() {
    const fresh = []
    for (const command of queue) { if (now() - command.at > LINK.commandTtlMs) ack(command.id, 'failed'); else fresh.push(command) }
    queue = fresh
    if (!waiter || !queue.length) return
    const commands = queue.map(command => ({ type: 'send', id: command.id, text: command.text }))
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
    if (request.method === 'GET' && path === '/hello') { json(200, { app: LINK.app, v: LINK.version }); return }
    if (request.method === 'GET' && path === '/commands') {
      if (waiter) waiter.respond([])
      let done = false
      const timer = setTimeout(() => entry.respond([]), pollMs)
      const entry = { respond(commands) { if (done) return; done = true; clearTimeout(timer); if (waiter === entry) waiter = null; json(200, { commands }) } }
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
        json(200, { ok: true })
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
    /** A question typed in the desktop theatre, for DSH to send. False when DSH is not connected. */
    enqueue(id, text) {
      if (!state.connected || typeof id !== 'string' || !id || id.length > 64 || typeof text !== 'string' || !text.trim() || text.length > LINK.maxText) return false
      queue.push({ id, text, at: now() })
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
        if (state.connected && now() - lastPush > LINK.silenceMs) setConnected(false)
        flush()
      }, 1000)
      if (watch.unref) watch.unref()
      report()
      return found.port
    },
    close() {
      if (waiter) waiter.respond([])
      for (const command of queue) ack(command.id, 'failed')
      queue = []
      if (watch) clearInterval(watch)
      if (server) server.close()
      server = null
    },
  }
}

module.exports = { createLinkServer, LINK }

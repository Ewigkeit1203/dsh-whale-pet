/**
 * The companion's end of the DSH link (roadmap step 2): a tiny HTTP server on 127.0.0.1 that DSH's page
 * posts her status to. See src/client/desktop-link.ts for the page's end.
 *
 * Safety: loopback only; only DSH's page origin; only the Host names of this machine (no DNS rebinding);
 * two fixed routes; a size cap; the body is handed to her page as data and never executed or stored.
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
}

/**
 * @param {{ onSnapshot(snapshot: unknown): void, onState(state: { connected: boolean, port: number | null, rejected: string | null }): void, ports?: number[], origins?: string[], now?: () => number }} options
 */
function createLinkServer(options) {
  const ports = options.ports || LINK.ports
  const origins = new Set(options.origins || LINK.origins)
  const now = options.now || Date.now
  const state = { started: false, connected: false, port: null, rejected: null }
  let lastPush = 0
  let server = null
  let watch = null

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
    async start() {
      const found = await listenOn(0)
      state.started = true
      if (!found) { report(); return null }
      server = found.server
      state.port = found.port
      watch = setInterval(() => { if (state.connected && now() - lastPush > LINK.silenceMs) setConnected(false) }, 1000)
      if (watch.unref) watch.unref()
      report()
      return found.port
    },
    close() {
      if (watch) clearInterval(watch)
      if (server) server.close()
      server = null
    },
  }
}

module.exports = { createLinkServer, LINK }

import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createRequire } from 'node:module'
import { PetStateMachine } from '../lib/client/state-machine.js'
import { applyLinkSnapshot, linkLost, linkSnapshot, readLinkSnapshot, startDesktopLink, DESKTOP_LINK } from '../lib/client/desktop-link.js'

const require = createRequire(import.meta.url)
const { createLinkServer } = require('../desktop/link-server.cjs')

const host = { status: 'ready', source: 'host', toppedUp: { status: 'ready', wallets: [{ currency: 'CNY', amount: '12.30' }] }, granted: { status: 'ready', wallets: [{ currency: 'CNY', amount: '5.00' }] }, updatedAt: 1 } as const

test('DSH link: the desktop state machine follows what DSH saw, in the same order', t => {
  const dsh = new PetStateMachine(), desk = new PetStateMachine()
  t.after(() => { dsh.dispose(); desk.dispose() })
  assert.equal(linkSnapshot(dsh.getStatus()).latestDialogue, '', 'her idle line is not an answer')
  dsh.setReasoningText('想一想'); dsh.setStreaming(false); dsh.setReasoning(true); dsh.setHostBalance(host as any)
  assert.ok(applyLinkSnapshot(desk, JSON.parse(JSON.stringify(linkSnapshot(dsh.getStatus())))))
  assert.equal(desk.getStatus().state, 'REASONING'); assert.equal(desk.getStatus().reasoningText, '想一想')
  assert.deepEqual(desk.getStatus().hostBalance, host)
  dsh.setStreaming(true); dsh.setReasoning(false); dsh.setLatestDialogue('答案')
  applyLinkSnapshot(desk, linkSnapshot(dsh.getStatus()))
  assert.equal(desk.getStatus().state, dsh.getStatus().state); assert.equal(desk.getStatus().isStreaming, true); assert.equal(desk.getStatus().latestDialogue, '答案')
  dsh.setStreaming(false); dsh.setReasoning(false)
  applyLinkSnapshot(desk, linkSnapshot(dsh.getStatus()))
  assert.equal(desk.getStatus().state, dsh.getStatus().state, 'finishing an answer leads to the same state (eating) on both')
  // DSH gone mid-thought: she stops thinking.
  dsh.setReasoning(true); applyLinkSnapshot(desk, linkSnapshot(dsh.getStatus())); linkLost(desk)
  assert.equal(desk.getStatus().isReasoning, false)
})

test('DSH link: malformed or oversized snapshots are dropped whole', t => {
  const desk = new PetStateMachine(); t.after(() => desk.dispose())
  const good = linkSnapshot(desk.getStatus())
  for (const bad of [null, 'x', { ...good, v: 2 }, { ...good, isStreaming: 'yes' }, { ...good, latestDialogue: 'x'.repeat(DESKTOP_LINK.textLimit + 1) },
    { ...good, balances: null }, { ...good, hostBalance: { status: 'ready', source: 'elsewhere' } }, { ...good, quotaErrorKey: 7 }]) {
    assert.equal(readLinkSnapshot(bad), null, JSON.stringify(bad)?.slice(0, 80))
    assert.equal(applyLinkSnapshot(desk, bad), false)
  }
  assert.ok(readLinkSnapshot(good))
})

test('DSH link: the page finds the companion, pushes changes (throttled) and a heartbeat, and searches again when it goes away', async t => {
  const dsh = new PetStateMachine(); t.after(() => dsh.dispose())
  let clock = 0
  const timers: { at: number; fn: () => void; id: number }[] = []
  let ids = 0
  const calls: string[] = []
  let alive = true
  const fetch = async (url: string, init?: any) => {
    calls.push((init?.method ?? 'GET') + ' ' + url.replace('http://127.0.0.1:', ''))
    const port = Number(url.split(':')[2].split('/')[0])
    if (!alive || port !== 38918) throw new TypeError('Failed to fetch')
    if (url.endsWith('/hello')) return { ok: true, status: 200, json: async () => ({ app: DESKTOP_LINK.app, v: 1 }) }
    return { ok: true, status: 200, json: async () => ({ ok: true }) }
  }
  const states: any[] = []
  const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }
  const advance = async (ms: number) => {
    const until = clock + ms
    for (;;) {
      timers.sort((a, b) => a.at - b.at)
      const next = timers[0]
      if (!next || next.at > until) break
      timers.shift(); clock = next.at; next.fn(); await flush()
    }
    clock = until
  }
  const stop = startDesktopLink(dsh, {
    fetch: fetch as any, now: () => clock, onState: s => states.push(s),
    setTimeout: (fn, ms) => { const id = ++ids; timers.push({ at: clock + ms, fn, id }); return id },
    clearTimeout: id => { const i = timers.findIndex(x => x.id === id); if (i >= 0) timers.splice(i, 1) },
  })
  t.after(stop)
  await advance(0)
  assert.deepEqual(calls, ['GET 38917/hello', 'GET 38918/hello', 'POST 38918/push'])
  assert.deepEqual(states.at(-1), { status: 'connected', port: 38918 })
  calls.length = 0
  dsh.setReasoning(true); dsh.setReasoningText('a'); dsh.setReasoningText('ab')
  await advance(100); assert.deepEqual(calls, [], 'throttled: within 250 ms of the last push')
  await advance(200); assert.deepEqual(calls, ['POST 38918/push'], 'one push for the burst')
  calls.length = 0
  await advance(DESKTOP_LINK.beatMs); assert.deepEqual(calls, ['POST 38918/push'], 'heartbeat while nothing changes')
  alive = false; calls.length = 0
  await advance(DESKTOP_LINK.beatMs)
  assert.equal(states.at(-1).status, 'searching')
  await advance(DESKTOP_LINK.scanMs[0]); assert.ok(calls.includes('GET 38917/hello'), 'looks again')
  const before = calls.length; await advance(DESKTOP_LINK.scanMs[1] - 100); assert.equal(calls.length, before, 'and backs off while it is not running (next look 5 s after the last)')
  await advance(100); assert.ok(calls.length > before)
})

function request(port: number, options: { method?: string; path: string; origin?: string | null; host?: string; body?: string; headers?: Record<string, string> }): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = { ...(options.headers ?? {}) }
    if (options.origin !== null) headers.origin = options.origin ?? 'dsh-app://app'
    if (options.host) headers.host = options.host
    const req = http.request({ host: '127.0.0.1', port, method: options.method ?? 'GET', path: options.path, headers }, res => {
      let body = ''; res.on('data', c => body += c); res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body }))
    })
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

test('Desktop link server: loopback only, DSH origin only, preflight for the private network, and a connected flag that lapses', async t => {
  let clock = 1000
  const snapshots: unknown[] = [], states: any[] = []
  const ports = [47211, 47212]
  const blocker = http.createServer(); await new Promise<void>(r => blocker.listen(ports[0], '127.0.0.1', () => r()))
  const server = createLinkServer({ ports, now: () => clock, onSnapshot: (s: unknown) => snapshots.push(s), onState: (s: any) => states.push(s) })
  t.after(() => { server.close(); blocker.close() })
  assert.equal(server.state.started, false)
  assert.equal(await server.start(), ports[1], 'a busy port is skipped')
  assert.equal(server.state.started, true)
  const port = ports[1]

  const hello = await request(port, { path: '/hello' })
  assert.equal(hello.status, 200); assert.deepEqual(JSON.parse(hello.body), { app: 'dsh-whale-pet-desktop', v: 1 })
  assert.equal(hello.headers['access-control-allow-origin'], 'dsh-app://app')
  const preflight = await request(port, { method: 'OPTIONS', path: '/push', headers: { 'access-control-request-method': 'POST', 'access-control-request-private-network': 'true' } })
  assert.equal(preflight.status, 204); assert.equal(preflight.headers['access-control-allow-private-network'], 'true')

  for (const [label, options] of [['another site', { origin: 'https://evil.example' }], ['no origin', { origin: null }], ['rebound host name', { host: `evil.example:${port}` }]] as const) {
    const res = await request(port, { method: 'POST', path: '/push', body: '{}', ...options })
    assert.equal(res.status, 403, label)
  }
  assert.equal(snapshots.length, 0); assert.match(states.at(-1).rejected, /host evil\.example/)

  const push = await request(port, { method: 'POST', path: '/push', body: JSON.stringify({ v: 1 }), headers: { 'content-type': 'application/json' } })
  assert.equal(push.status, 200); assert.deepEqual(snapshots, [{ v: 1 }]); assert.equal(states.at(-1).connected, true)
  assert.equal((await request(port, { method: 'POST', path: '/push', body: 'x'.repeat(600 * 1024) }).catch(() => ({ status: 413 }))).status, 413)
  assert.equal((await request(port, { method: 'POST', path: '/push', body: 'not json' })).status, 400)
  assert.equal((await request(port, { path: '/anything' })).status, 404)

  clock += 7000
  await new Promise(r => setTimeout(r, 1100))
  assert.equal(states.at(-1).connected, false, 'no push for 6 s: DSH is gone')
})

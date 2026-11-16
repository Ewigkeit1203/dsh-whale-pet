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

test('DSH link: changing accounts clears both balance sources on the desktop and accepts the new account', t => {
  for (const source of ['host', 'legacy', 'both']) {
    const dsh = new PetStateMachine(), desk = new PetStateMachine()
    t.after(() => { dsh.dispose(); desk.dispose() })
    if (source !== 'host') dsh.setBalances('12.30', '5.00')
    if (source !== 'legacy') dsh.setHostBalance(host as any)
    applyLinkSnapshot(desk, linkSnapshot(dsh.getStatus()))
    dsh.clearBalances()
    applyLinkSnapshot(desk, linkSnapshot(dsh.getStatus()))
    assert.equal(desk.getStatus().hostBalance, null)
    assert.equal(desk.getStatus().balancesKnown, false)
    assert.equal(desk.getStatus().toppedUpBalance, '')
    assert.equal(desk.getStatus().grantedBalance, '')
    // The next account may have the same amounts: known must still become true again.
    dsh.setBalances('12.30', '5.00')
    applyLinkSnapshot(desk, linkSnapshot(dsh.getStatus()))
    assert.equal(desk.getStatus().balancesKnown, true)
    assert.equal(desk.getStatus().toppedUpBalance, '12.30')
  }
})

test('DSH link: withdrawn host access clears its snapshot while a legacy balance remains available', t => {
  const dsh = new PetStateMachine(), desk = new PetStateMachine()
  t.after(() => { dsh.dispose(); desk.dispose() })
  dsh.setHostBalance(host as any)
  applyLinkSnapshot(desk, linkSnapshot(dsh.getStatus()))
  dsh.setHostBalance(null); dsh.setBalances('2.00', '0.00')
  applyLinkSnapshot(desk, linkSnapshot(dsh.getStatus()))
  assert.equal(desk.getStatus().hostBalance, null)
  assert.equal(desk.getStatus().balancesKnown, true)
  assert.equal(desk.getStatus().toppedUpBalance, '2.00')
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
  assert.deepEqual(states.at(-1), { status: 'connected', port: 38918, shown: false }, 'a companion that says nothing about her window: she stays in DSH')
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
  assert.equal(hello.status, 200); assert.deepEqual(JSON.parse(hello.body), { app: 'dsh-whale-pet-desktop', v: 1, desktop: { shown: false, rev: 0 } })
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

test('Desktop link server: a question waits for DSH, is handed over at once, acknowledged, and dropped when too old', async t => {
  let clock = 1000
  const acks: [string, string][] = []
  const server = createLinkServer({ ports: [47221], now: () => clock, pollMs: 400, onSnapshot() {}, onState() {}, onAck: (id: string, result: string) => acks.push([id, result]) })
  t.after(() => server.close())
  const port = await server.start()
  assert.equal(server.enqueue('q1', '在吗'), false, 'not connected yet: nothing to send it')
  await request(port, { method: 'POST', path: '/push', body: '{"v":1}' })
  // DSH is waiting: the question goes out immediately.
  const waiting = request(port, { path: '/commands' })
  await new Promise(r => setTimeout(r, 50))
  assert.equal(server.enqueue('q1', '在吗'), true)
  assert.deepEqual(JSON.parse((await waiting).body), { commands: [{ type: 'send', id: 'q1', text: '在吗' }], desktop: { shown: false, rev: 0 } })
  // Nothing to send: the wait ends empty after pollMs.
  assert.deepEqual(JSON.parse((await request(port, { path: '/commands' })).body), { commands: [], desktop: { shown: false, rev: 0 } })
  // DSH reports the outcome.
  assert.equal((await request(port, { method: 'POST', path: '/ack', body: JSON.stringify({ id: 'q1', result: 'sent' }) })).status, 200)
  assert.equal((await request(port, { method: 'POST', path: '/ack', body: JSON.stringify({ id: 'q1', result: 'rm -rf' }) })).status, 400, 'only known outcomes')
  assert.deepEqual(acks, [['q1', 'sent']])
  // Only DSH may pick questions up.
  assert.equal((await request(port, { path: '/commands', origin: 'https://evil.example' })).status, 403)
  // Not picked up in 15 s: reported failed, never sent late.
  assert.equal(server.enqueue('q2', '晚到的问题'), true)
  clock += 16000
  assert.deepEqual(JSON.parse((await request(port, { path: '/commands' })).body), { commands: [], desktop: { shown: false, rev: 0 } })
  assert.deepEqual(acks.at(-1), ['q2', 'failed'])
  assert.equal(server.enqueue('q3', 'x'.repeat(20001)), false, 'too long')
})

test('DSH link: questions from the desktop are sent through DSH\'s composer and acknowledged', async t => {
  const { readLinkCommand } = await import('../lib/client/desktop-link.js')
  assert.deepEqual(readLinkCommand({ type: 'send', id: 'a', text: 'hi' }), { type: 'send', id: 'a', text: 'hi' })
  for (const bad of [null, { type: 'run', id: 'a', text: 'x' }, { type: 'send', id: '', text: 'x' }, { type: 'send', id: 'a', text: '   ' }, { type: 'send', id: 'a', text: 'x'.repeat(20001) }]) assert.equal(readLinkCommand(bad), null)
  const dsh = new PetStateMachine(); t.after(() => dsh.dispose())
  const posted: string[] = []
  let served = false
  const fetch = async (url: string, init?: any) => {
    const path = url.split(/:\d+/)[1]
    if (path === '/hello') return { ok: true, status: 200, json: async () => ({ app: DESKTOP_LINK.app, v: 1 }) }
    if (path === '/push') return { ok: true, status: 200, json: async () => ({ ok: true }) }
    if (path === '/ack') { posted.push(init.body); return { ok: true, status: 200, json: async () => ({ ok: true }) } }
    if (path === '/commands') {
      if (served) return new Promise(() => {}) // keeps waiting, like the companion
      served = true
      return { ok: true, status: 200, json: async () => ({ commands: [{ type: 'send', id: 'q9', text: '今天吃什么' }, { type: 'exec', id: 'x', text: 'calc' }] }) }
    }
    throw new TypeError('unexpected ' + url)
  }
  const asked: string[] = []
  const stop = startDesktopLink(dsh, { fetch: fetch as any, onCommand: (command, done) => { asked.push(command.text); done('sent') } })
  t.after(stop)
  for (let i = 0; i < 50 && !posted.length; i++) await new Promise(r => setTimeout(r, 10))
  assert.deepEqual(asked, ['今天吃什么'], 'only the send command, once')
  assert.deepEqual(posted.map(b => JSON.parse(b)), [{ id: 'q9', result: 'sent' }])
})

test('Only one of her: the companion tells DSH at once when her window shows or hides, and when it quits', async t => {
  const requests: string[] = []
  const server = createLinkServer({ ports: [47231], pollMs: 5000, onSnapshot() {}, onState() {}, onRequest: (action: string) => requests.push(action) })
  let closed = false
  t.after(() => { if (!closed) server.close() })
  const port = await server.start()
  const push = async () => JSON.parse((await request(port, { method: 'POST', path: '/push', body: '{"v":1}' })).body)
  assert.deepEqual(await push(), { ok: true, desktop: { shown: false, rev: 0 } }, 'not on screen until the window really is')
  // DSH is waiting for commands: showing her window answers it at once.
  const waiting = request(port, { path: '/commands' })
  await new Promise(r => setTimeout(r, 50))
  server.setShown(true)
  assert.deepEqual(JSON.parse((await waiting).body), { commands: [], desktop: { shown: true, rev: 1 } })
  server.setShown(true)
  assert.deepEqual((await push()).desktop, { shown: true, rev: 1 }, 'the same state again is not a change')
  // DSH may ask for exactly two things.
  assert.deepEqual(JSON.parse((await request(port, { method: 'POST', path: '/request', body: '{"action":"show"}' })).body), { ok: true, desktop: { shown: true, rev: 1 } })
  assert.equal((await request(port, { method: 'POST', path: '/request', body: '{"action":"theatre"}' })).status, 200)
  for (const body of ['{"action":"quit"}', '{"action":"exec","cmd":"calc"}', 'nope']) assert.equal((await request(port, { method: 'POST', path: '/request', body })).status, 400, body)
  assert.equal((await request(port, { method: 'POST', path: '/request', body: '{"action":"show"}', origin: 'https://evil.example' })).status, 403)
  assert.deepEqual(requests, ['show', 'theatre'])
  // A normal exit: the waiting request hears "quitting" before the server goes away.
  const last = request(port, { path: '/commands' })
  await new Promise(r => setTimeout(r, 50))
  server.close(); closed = true
  assert.deepEqual(JSON.parse((await last).body), { commands: [], desktop: { shown: false, rev: 2, quitting: true } })
})

test('Only one of her: the page follows the newest presence, ignores late answers, and lets go at once on quit', async t => {
  const { readDesktopPresence, desktopLinkState } = await import('../lib/client/desktop-link.js')
  assert.equal(readDesktopPresence({ ok: true }), null)
  assert.equal(readDesktopPresence({ desktop: { shown: 'yes', rev: 1 } }), null)
  assert.deepEqual(readDesktopPresence({ desktop: { shown: true, rev: 3 } }), { shown: true, rev: 3, quitting: undefined })
  const dsh = new PetStateMachine(); t.after(() => dsh.dispose())
  let presence: any = { shown: false, rev: 0 }
  let release: ((body: any) => void) | null = null
  let hellos = 0
  const fetch = async (url: string) => {
    const path = url.split(/:\d+/)[1]
    if (path === '/hello') { hellos++; return { ok: true, status: 200, json: async () => ({ app: DESKTOP_LINK.app, v: 1 }) } }
    if (path === '/push') { const answer = { ok: true, desktop: presence }; return { ok: true, status: 200, json: async () => answer } }
    if (path === '/commands') return new Promise(resolve => { release = body => resolve({ ok: true, status: 200, json: async () => body }) })
    throw new TypeError('unexpected ' + url)
  }
  const stop = startDesktopLink(dsh, { fetch: fetch as any, onCommand: () => {} })
  t.after(stop)
  const until = async (check: () => boolean) => { for (let i = 0; i < 100 && !check(); i++) await new Promise(r => setTimeout(r, 5)) }
  await until(() => release !== null)
  assert.deepEqual(desktopLinkState(), { status: 'connected', port: 38917, shown: false })
  // Her window shows: the waiting request returns with the news.
  release!({ commands: [], desktop: { shown: true, rev: 1 } }); release = null
  await until(() => (desktopLinkState() as any).shown === true)
  assert.deepEqual(desktopLinkState(), { status: 'connected', port: 38917, shown: true })
  // A late, older answer (rev 0) changes nothing.
  await until(() => release !== null)
  release!({ commands: [], desktop: { shown: false, rev: 0 } }); release = null
  await new Promise(r => setTimeout(r, 30))
  assert.equal((desktopLinkState() as any).shown, true, 'older news is ignored')
  // Quit: DSH lets go at once and looks for the companion again later.
  await until(() => release !== null)
  release!({ commands: [], desktop: { shown: false, rev: 2, quitting: true } }); release = null
  await until(() => (desktopLinkState() as any).status === 'searching')
  assert.equal(desktopLinkState().status, 'searching')
  assert.equal(hellos, 1, 'not hammering a companion that is shutting down')
})

test('Desktop link server: /request accepts exactly two plain actions and never lets a handler error escape', async t => {
  let mode: 'ok' | 'refuse' | 'throw' = 'ok'
  const seen: string[] = []
  const server = createLinkServer({ ports: [47241], onSnapshot() {}, onState() {}, onRequest: (action: string) => { seen.push(action); if (mode === 'throw') throw new Error('boom'); return mode === 'ok' } })
  t.after(() => server.close())
  const port = await server.start()
  const ask = (body: string, extra: any = {}) => request(port, { method: 'POST', path: '/request', body, ...extra })
  for (const body of ['null', '[]', '["show"]', '"show"', '{}', '{"action":["show"]}', '{"action":"Show"}', 'not json', '{"action":"show"'])
    assert.equal((await ask(body)).status, 400, body)
  assert.equal((await ask('{"action":"show","pad":"' + '鱼'.repeat(90) + '"}').catch(() => ({ status: 413 }))).status, 413, 'the size cap counts bytes, not characters')
  assert.equal((await ask('{"action":"show"}', { host: `evil.example:${port}` })).status, 403)
  assert.deepEqual(seen, [], 'nothing reached the handler')
  mode = 'refuse'; assert.equal((await ask('{"action":"show"}')).status, 409, 'no window: refused, not pretended')
  mode = 'throw'; assert.equal((await ask('{"action":"theatre"}')).status, 409, 'a throwing handler is a refusal')
  mode = 'ok'; assert.equal((await ask('{"action":"theatre"}')).status, 200)
  server.leaving()
  assert.equal((await ask('{"action":"show"}')).status, 409, 'nothing is done while quitting')
  assert.deepEqual(JSON.parse((await request(port, { method: 'POST', path: '/push', body: '{"v":1}' })).body).desktop, { shown: false, rev: 1, quitting: true })
  assert.deepEqual(seen, ['show', 'theatre', 'theatre'])
})

test('Only one of her: a quitting answer ends the connection — its commands are not sent — and a new connection polls at once', async t => {
  const dsh = new PetStateMachine(); t.after(() => dsh.dispose())
  const polls: number[] = [], asked: string[] = []
  let gen = 0
  let release: ((body: any) => void) | null = null
  const fetch = async (url: string, init?: any) => {
    const path = url.split(/:\d+/)[1]
    if (path === '/hello') { gen++; return { ok: true, status: 200, json: async () => ({ app: DESKTOP_LINK.app, v: 1 }) } }
    if (path === '/push') return { ok: true, status: 200, json: async () => ({ ok: true, desktop: { shown: true, rev: 0 } }) }
    if (path === '/ack') return { ok: true, status: 200, json: async () => ({ ok: true }) }
    if (path === '/commands') {
      polls.push(gen)
      // The first connection's poll is answered by the test; later ones of that connection would hang forever.
      return new Promise((resolve, reject) => {
        init?.signal?.addEventListener?.('abort', () => reject(new Error('aborted')))
        release = body => resolve({ ok: true, status: 200, json: async () => body })
      })
    }
    throw new TypeError('unexpected ' + url)
  }
  const timers: Array<() => void> = []
  const stop = startDesktopLink(dsh, { fetch: fetch as any, onCommand: (c, done) => { asked.push(c.text); done('sent') },
    setTimeout: ((fn: () => void, ms: number) => { if (ms === 0) Promise.resolve().then(fn); else timers.push(fn); return 1 }) as any, clearTimeout: () => {} })
  t.after(stop)
  const until = async (check: () => boolean) => { for (let i = 0; i < 100 && !check(); i++) await new Promise(r => setTimeout(r, 5)) }
  await until(() => release !== null)
  // Stale presence (rev 0 again, different state) with a valid command: the command still runs once.
  release!({ commands: [{ type: 'send', id: 'a', text: '一' }], desktop: { shown: false, rev: 0 } }); release = null
  await until(() => asked.length === 1)
  assert.deepEqual(asked, ['一'])
  await until(() => release !== null)
  release!({ commands: [{ type: 'send', id: 'b', text: '退出时的问题' }], desktop: { shown: false, rev: 1, quitting: true } }); release = null
  await new Promise(r => setTimeout(r, 30))
  assert.deepEqual(asked, ['一'], 'nothing from a quitting answer is sent')
  assert.equal(polls.length, 2)
  // The companion comes back: the rescan (3 s timer) runs, and the new connection polls right away.
  timers.splice(0).forEach(fn => fn())
  await until(() => polls.length === 3)
  assert.deepEqual(polls, [1, 1, 2], 'a new connection polls at once')
})

test('Only one of her: a companion that stops answering cannot keep her hidden — a failed long poll lets go at once, a hung push times out, and a new connection works', async t => {
  const dsh = new PetStateMachine(); t.after(() => dsh.dispose())
  let stuck = false, polls = 0
  let failPoll: ((e: Error) => void) | null = null
  const hang = (signal?: AbortSignal) => new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject(signal.reason ?? new Error('aborted'))))
  const fetch = async (url: string, init?: any) => {
    const path = url.split(/:\d+/)[1]
    if (path === '/hello') return { ok: true, status: 200, json: async () => ({ app: DESKTOP_LINK.app, v: 1 }) }
    if (path === '/push') { if (stuck) return hang(init?.signal); return { ok: true, status: 200, json: async () => ({ ok: true, desktop: { shown: true, rev: 1 } }) } }
    if (path === '/commands') { polls++; if (polls === 1) return new Promise((_r, reject) => { failPoll = reject }); return hang(init?.signal) }
    throw new TypeError('unexpected ' + url)
  }
  const states: any[] = []
  const stop = startDesktopLink(dsh, { fetch: fetch as any, onCommand: () => {}, pushTimeoutMs: 1500, onState: s => states.push(s) })
  t.after(stop)
  const { desktopLinkState } = await import('../lib/client/desktop-link.js')
  const until = async (check: () => boolean) => { for (let i = 0; i < 800 && !check(); i++) await new Promise(r => setTimeout(r, 5)) }
  await until(() => failPoll !== null && (desktopLinkState() as any).shown === true)
  assert.deepEqual(desktopLinkState(), { status: 'connected', port: 38917, shown: true }, 'she is on the desktop')
  // The companion freezes: pushes hang, and the long poll times out.
  stuck = true
  dsh.setReasoning(true) // a change, so a push goes out (and hangs)
  await new Promise(r => setTimeout(r, 100))
  const failedAt = Date.now()
  failPoll!(new Error('The operation timed out.'))
  await until(() => desktopLinkState().status === 'searching')
  assert.equal(desktopLinkState().status, 'searching', 'she is back in DSH at once')
  assert.ok(Date.now() - failedAt < 1000, 'from the failed poll, not from waiting out the push')
  // It recovers: the hung push times out, and the next connection pushes and polls again.
  stuck = false
  await until(() => polls >= 2 && (desktopLinkState() as any).shown === true)
  assert.ok(polls >= 2, 'polls on the new connection')
  assert.deepEqual(desktopLinkState(), { status: 'connected', port: 38917, shown: true })
})

test('Only one of her: a push whose answer never finishes arriving counts as failed, not as connected', async t => {
  const dsh = new PetStateMachine(); t.after(() => dsh.dispose())
  const fetch = async (url: string, init?: any) => {
    const path = url.split(/:\d+/)[1]
    if (path === '/hello') return { ok: true, status: 200, json: async () => ({ app: DESKTOP_LINK.app, v: 1 }) }
    // Headers arrive, the body never does (until the push times out).
    if (path === '/push') return { ok: true, status: 200, json: () => new Promise((_r, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason))) }
    throw new TypeError('unexpected ' + url)
  }
  const states: any[] = []
  const stop = startDesktopLink(dsh, { fetch: fetch as any, pushTimeoutMs: 50, onState: s => states.push(s) })
  t.after(stop)
  await new Promise(r => setTimeout(r, 300))
  assert.ok(!states.some(s => s.status === 'connected'), 'never connected on a half answer')
  assert.equal(states.at(-1)?.status, 'searching')
})

test('Conversation history link: heartbeats carry identity only; a read command reads once without sending a question', async t => {
  const dsh = new PetStateMachine(); t.after(() => dsh.dispose())
  let reads = 0, release: ((body: any) => void) | null = null
  const pushes: any[] = [], histories: any[] = [], questions: string[] = []
  let context = { source: 'page-a', session: 'session-a' }
  const fetch = async (url: string, init?: any) => {
    const path = url.split(/:\d+/)[1]
    if (path === '/hello') return { ok: true, status: 200, json: async () => ({ app: DESKTOP_LINK.app, v: 1 }) }
    if (path === '/push') { pushes.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ ok: true }) } }
    if (path === '/history') { histories.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ ok: true }) } }
    if (path === '/commands') return new Promise((resolve, reject) => {
      release = body => resolve({ ok: true, json: async () => body })
      init?.signal?.addEventListener('abort', () => reject(new Error('cancelled')))
    })
    throw Error('unexpected ' + path)
  }
  const stop = startDesktopLink(dsh, { fetch: fetch as any, getConversation: () => context,
    readHistory: () => { reads++; return { context, status: 'ready', entries: [{ role: 'user', text: 'Loaded in B' }], truncated: false } },
    onCommand: command => questions.push(command.text) })
  t.after(stop)
  const until = async (check: () => boolean) => { for (let i = 0; i < 100 && !check(); i++) await new Promise(r => setTimeout(r, 5)) }
  await until(() => release !== null)
  assert.equal(reads, 0); assert.deepEqual(pushes[0].conversation, context); assert.equal('entries' in pushes[0], false)
  // A request that was queued while A was visible must identify B when the user has switched to B.
  context = { ...context, session: 'session-b' }
  release!({ commands: [{ type: 'history', id: 'h1' }, { type: 'history', id: '' }, { type: 'exec', id: 'e1' }] })
  await until(() => histories.length === 1)
  assert.equal(reads, 1); assert.deepEqual(questions, [])
  assert.deepEqual(histories[0], { id: 'h1', log: { context, status: 'ready', entries: [{ role: 'user', text: 'Loaded in B' }], truncated: false } })
})

test('Conversation history server: only pending reads get a single reply; size, expiry and concurrency are bounded', async t => {
  let clock = 1000
  const results: Array<[string, unknown]> = []
  const server = createLinkServer({ ports: [47251], now: () => clock, pollMs: 30, onSnapshot() {}, onState() {}, onHistory: (id: string, log: unknown) => results.push([id, log]) })
  t.after(() => server.close())
  const port = await server.start()
  assert.equal(server.enqueueHistory('offline'), false)
  await request(port, { method: 'POST', path: '/push', body: '{"v":1}' })
  assert.equal(server.enqueueHistory('h1'), true)
  assert.deepEqual(JSON.parse((await request(port, { path: '/commands' })).body).commands, [{ type: 'history', id: 'h1' }])
  const log = { context: { source: 'page-a', session: 'a' }, status: 'ready', entries: [], truncated: false }
  const reply = (id: string) => request(port, { method: 'POST', path: '/history', body: JSON.stringify({ id, log }) })
  assert.equal((await reply('never-requested')).status, 409)
  assert.equal((await reply('h1')).status, 200)
  assert.deepEqual(results, [['h1', log]])
  assert.equal((await reply('h1')).status, 409, 'duplicate replies cannot display twice')
  assert.equal((await request(port, { method: 'POST', path: '/history', body: JSON.stringify({ id: 'h1', log }), origin: 'https://evil.example' })).status, 403)
  assert.equal((await request(port, { method: 'POST', path: '/history', body: 'x'.repeat(256 * 1024 + 1) }).catch(() => ({ status: 413 }))).status, 413)
  assert.equal(server.enqueueHistory('expired'), true)
  clock += 15001
  assert.equal((await reply('expired')).status, 409)
  assert.deepEqual(results.at(-1), ['expired', null])
  for (let i = 0; i < 8; i++) assert.equal(server.enqueueHistory('pending-' + i), true)
  assert.equal(server.enqueueHistory('overflow'), false)
  assert.equal(server.enqueueHistory('pending-0'), false)
  server.close()
  assert.equal(results.filter(([id]) => id.startsWith('pending-')).length, 8)
})

test('Conversation history link: switching an empty conversation pushes its new identity without waiting for a heartbeat', async t => {
  const dsh = new PetStateMachine(); t.after(() => dsh.dispose())
  let session: string | null = 'a', changed: (() => void) | null = null, unsubscribed = false
  const identities: Array<string | null> = []
  const fetch = async (url: string, init?: any) => {
    if (url.endsWith('/hello')) return { ok: true, json: async () => ({ app: DESKTOP_LINK.app, v: 1 }) }
    if (url.endsWith('/push')) { identities.push(JSON.parse(init.body).conversation.session); return { ok: true, json: async () => ({ ok: true }) } }
    throw Error('unexpected request')
  }
  const stop = startDesktopLink(dsh, { fetch: fetch as any, getConversation: () => ({ source: 'page-a', session }),
    subscribeConversation: listener => { changed = listener; return () => { unsubscribed = true; changed = null } } })
  t.after(stop)
  const until = async (check: () => boolean) => { for (let i = 0; i < 100 && !check(); i++) await new Promise(r => setTimeout(r, 5)) }
  await until(() => identities.length === 1)
  // No state-machine field changes: both conversations are empty. Only their identity changes.
  session = 'b'; changed!()
  await until(() => identities.length === 2)
  assert.deepEqual(identities, ['a', 'b'])
  session = null; changed!()
  await until(() => identities.length === 3)
  assert.deepEqual(identities, ['a', 'b', null])
  stop(); assert.equal(unsubscribed, true)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { boundConversationLog, loadedConversationLog, readConversationLogSnapshot, currentConversationContext } from '../lib/client/conversation-log.js'

const context = { source: 'page-a', session: 'session-a' }

test('Conversation history: only bounded, data-only replies with a valid conversation are accepted', () => {
  const good = { context, status: 'ready', entries: [{ role: 'assistant', text: 'Hello\n```cpp\nint n = 1;\n```' }], truncated: false }
  assert.deepEqual(readConversationLogSnapshot(good), good)
  for (const bad of [null, [], { ...good, context: { source: '', session: 'a' } }, { ...good, context: { ...context, session: null } },
    { ...good, status: 'unavailable' }, { ...good, truncated: 'yes' }, { ...good, entries: [{ role: 'system', text: 'secret' }] },
    { ...good, entries: [{ role: 'assistant', text: 'x'.repeat(4001) }] }, { ...good, entries: Array.from({ length: 41 }, () => ({ role: 'user', text: 'a' })) },
    { ...good, entries: Array.from({ length: 7 }, () => ({ role: 'user', text: 'x'.repeat(4000) })) }]) assert.equal(readConversationLogSnapshot(bad), null)
  assert.deepEqual(readConversationLogSnapshot({ ...good, context: { ...context, session: null }, status: 'unavailable', entries: [] })?.entries, [])
  const clean = readConversationLogSnapshot({ ...good, credential: 'must not cross the boundary', entries: [{ role: 'user', text: 'ok', token: 'secret' }] })!
  assert.equal('credential' in clean, false)
  assert.deepEqual(clean.entries, [{ role: 'user', text: 'ok' }])
})

test('Conversation history: keeps the newest records in order with per-entry and total budgets', () => {
  const many = Array.from({ length: 45 }, (_, i) => ({ role: 'user' as const, text: String(i) }))
  const bounded = boundConversationLog(context, many)
  assert.equal(bounded.entries.length, 40); assert.equal(bounded.entries[0].text, '5'); assert.equal(bounded.entries.at(-1)!.text, '44')
  assert.equal(bounded.truncated, true)
  const large = boundConversationLog(context, Array.from({ length: 12 }, (_, i) => ({ role: 'assistant' as const, text: `${i}:` + 'x'.repeat(6000) })))
  assert.equal(large.entries.reduce((sum, entry) => sum + entry.text.length, 0), 24000)
  assert.ok(large.entries.every(entry => entry.text.length <= 4000)); assert.equal(large.truncated, true)
  const emoji = boundConversationLog(context, [{ role: 'assistant', text: 'a'.repeat(3999) + '🐳' }])
  assert.equal(emoji.entries[0].text.length, 3999); assert.equal(emoji.truncated, true)
  assert.equal(boundConversationLog({ ...context, session: null }, many).status, 'unavailable')
})

test('Conversation history: reads only the active session and excludes the companion DOM', () => {
  function node(role: string, text: string, own = false): any {
    return { getAttribute: () => role, closest: () => own ? {} : null, contains: () => false,
      cloneNode: () => ({ textContent: text, querySelectorAll: () => [] }) }
  }
  let clones = 0
  const messages = Array.from({ length: 200 }, (_, i) => {
    const value = node('user-prompt', `active ${i}`), clone = value.cloneNode
    value.cloneNode = () => { clones++; return clone() }
    return value
  })
  messages.push(node('assistant-step', 'must exclude the companion', true))
  const active: any = { getAttribute: () => 'session-a', querySelectorAll: () => messages }
  const root: any = { querySelector: () => active, querySelectorAll() { throw Error('Must not scan other conversations') } }
  const log = loadedConversationLog('page-a', root)
  assert.deepEqual(log.context, context)
  assert.equal(log.entries.length, 40); assert.equal(log.entries[0].text, 'active 160'); assert.equal(clones, 41)
  assert.equal(log.truncated, true)
  const missing: any = { querySelector: () => null }
  assert.deepEqual(currentConversationContext('page-a', missing), { source: 'page-a', session: null })
  assert.deepEqual(loadedConversationLog('page-a', missing), { context: { source: 'page-a', session: null }, status: 'unavailable', entries: [], truncated: false })
})

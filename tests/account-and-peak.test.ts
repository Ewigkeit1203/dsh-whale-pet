import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tariffAt, tierAt, nextTierChange } from '../lib/client/peak.js'
import { AccountBalancePoller, parseAccountBalance, ACCOUNT_REFRESH } from '../lib/client/account-balance.js'
import { walletView, formatWalletAmount } from '../lib/client/wallet.js'

// Beijing is UTC+8 all year.
const bj = (iso: string) => Date.parse(iso + '+08:00')

test('peak / off-peak follows the official rule: weekday 9–12 and 14–18 Beijing time', () => {
  assert.deepEqual(tierAt(bj('2026-11-02T10:00:00')), { tier: 'peak', reason: 'peak-hours' })
  assert.equal(tierAt(bj('2026-11-02T09:00:00')).tier, 'peak', '09:00 starts peak')
  assert.equal(tierAt(bj('2026-11-02T08:59:59')).tier, 'valley')
  assert.equal(tierAt(bj('2026-11-02T12:00:00')).tier, 'valley', 'lunch break is off-peak')
  assert.equal(tierAt(bj('2026-11-02T14:00:00')).tier, 'peak')
  assert.equal(tierAt(bj('2026-11-02T18:00:00')).tier, 'valley', '18:00 ends peak')
  assert.equal(nextTierChange(bj('2026-11-02T10:00:00')), bj('2026-11-02T12:00:00'))
  assert.equal(nextTierChange(bj('2026-11-02T12:30:00')), bj('2026-11-02T14:00:00'))
})

test('weekends, make-up working weekends and public holidays are off-peak all day', () => {
  assert.deepEqual(tierAt(bj('2026-10-31T10:00:00')), { tier: 'valley', reason: 'weekend' })
  assert.equal(nextTierChange(bj('2026-10-31T10:00:00')), bj('2026-11-02T09:00:00'), 'next peak is Monday 09:00')
  assert.equal(tierAt(bj('2026-10-10T10:00:00')).tier, 'valley', '调休上班 Saturday is still off-peak')
  assert.deepEqual(tierAt(bj('2026-10-05T10:00:00')), { tier: 'valley', reason: 'holiday' })
  assert.equal(nextTierChange(bj('2026-10-05T10:00:00')), bj('2026-10-08T09:00:00'), 'National Day holiday ends on the 7th')
  assert.equal(tierAt(bj('2026-02-18T10:00:00')).reason, 'holiday', 'Spring Festival')
})

test('years without a holiday table are flagged instead of silently trusted', () => {
  assert.equal(tariffAt(bj('2026-11-02T10:00:00')).holidayDataMissing, false)
  assert.equal(tariffAt(bj('2027-01-04T10:00:00')).holidayDataMissing, true)
})

test('host account reply: ready, signed out, Platform failure and malformed wallets', () => {
  const ready = parseAccountBalance({ ok: true, value: { status: 'ready', value: [{ currency: 'CNY', balance: '12.345' }], bonusWallets: [{ currency: 'CNY', balance: '0' }] } }, 5)
  assert.equal(ready.status, 'ready')
  assert.deepEqual(ready.toppedUp, { status: 'ready', wallets: [{ currency: 'CNY', amount: '12.345' }] })
  assert.equal(ready.updatedAt, 5)
  assert.equal(parseAccountBalance({ ok: true, value: null }, 5).status, 'signed-out')
  assert.throws(() => parseAccountBalance({ ok: true, value: { status: 'failed' } }, 5))
  assert.throws(() => parseAccountBalance({ ok: false }, 5))
  const bad = parseAccountBalance({ ok: true, value: { status: 'ready', value: [{ currency: 'CNY', balance: 'NaN' }], bonusWallets: [] } }, 5)
  assert.deepEqual(bad.toppedUp, { status: 'failed' }, 'a malformed wallet is a failure, not an empty wallet')
})

test('host balance view: exact formatting, DSH bonus semantics, no cross-currency sums', () => {
  const host = (toppedUp: any, granted: any, updatedAt = 1000) => ({ status: 'ready' as const, source: 'host' as const, toppedUp, granted, updatedAt })
  const base = { known: false, toppedUp: '', granted: '', checkedAt: null, now: 2000, ricePrice: 1 }
  const v = walletView({ ...base, host: host({ status: 'ready', wallets: [{ currency: 'CNY', amount: '1.999' }] }, { status: 'ready', wallets: [{ currency: 'CNY', amount: '0' }] }) })
  assert.equal(v.toppedUp, '¥1.99', 'rounded down like DSH')
  assert.equal(v.grantedNone, true, 'zero bonus is shown as none, matching the DSH card')
  assert.equal(v.status, 'live'); assert.equal(v.bowls, 1); assert.equal(v.low, true)
  const mixed = walletView({ ...base, host: host({ status: 'ready', wallets: [{ currency: 'CNY', amount: '5' }, { currency: 'USD', amount: '2' }] }, { status: 'ready', wallets: [] }) })
  assert.equal(mixed.toppedUp, '¥5.00 + $2.00'); assert.equal(mixed.bowls, null); assert.equal(mixed.low, false)
  const old = walletView({ ...base, now: 1000 + ACCOUNT_REFRESH.staleAfterMs + 1, host: host({ status: 'ready', wallets: [{ currency: 'CNY', amount: '1' }] }, { status: 'ready', wallets: [] }) })
  assert.equal(old.status, 'stale'); assert.equal(old.low, false)
  const signedOut = walletView({ ...base, known: true, toppedUp: '¥9.00', host: { status: 'signed-out', source: 'host', toppedUp: { status: 'unknown' }, granted: { status: 'unknown' }, updatedAt: null } })
  assert.equal(signedOut.toppedUp, null, 'signing out clears even an old page snapshot')
  const failedHost = walletView({ ...base, known: true, toppedUp: '¥9.00', granted: '¥1.00', checkedAt: 1990, host: { status: 'error', source: 'host', toppedUp: { status: 'unknown' }, granted: { status: 'unknown' }, updatedAt: null } })
  assert.equal(failedHost.source, 'dom', 'a host failure still lets the open settings card supply values')
  assert.equal(formatWalletAmount('1234567.5', 'CNY'), '¥1,234,567.50')
  assert.equal(formatWalletAmount('0.004', 'CNY'), '<¥0.01')
  assert.equal(formatWalletAmount('0', 'USD'), '$0.00')
})

function harness(replies: Array<() => Promise<unknown>>) {
  let now = 0
  const timers: { at: number; fn: () => void; id: number }[] = []
  let id = 0
  const published: any[] = []
  let calls = 0
  const poller = new AccountBalancePoller({
    getBalance: () => { const reply = replies[Math.min(calls, replies.length - 1)]; calls++; return reply() },
    publish: s => published.push(s),
    now: () => now,
    schedule: (fn, ms) => { timers.push({ at: now + ms, fn, id: ++id }); return id },
    cancel: handle => { const i = timers.findIndex(t => t.id === handle); if (i >= 0) timers.splice(i, 1) },
  })
  const advance = async (ms: number) => {
    now += ms
    for (;;) { const due = timers.filter(t => t.at <= now).sort((a, b) => a.at - b.at)[0]; if (!due) break; timers.splice(timers.indexOf(due), 1); due.fn(); await new Promise(r => setImmediate(r)) }
    await new Promise(r => setImmediate(r))
  }
  return { poller, published, advance, calls: () => calls, timers }
}
const okReply = (amount: string) => () => Promise.resolve({ ok: true, value: { status: 'ready', value: [{ currency: 'CNY', balance: amount }], bonusWallets: [] } })

test('poller: reads on access without opening settings, refreshes every minute, coalesces bursts', async () => {
  const h = harness([okReply('10'), okReply('9')])
  h.poller.start()
  await h.advance(0)
  assert.equal(h.published[0].status, 'loading')
  assert.equal(h.published.at(-1).status, 'ready')
  void h.poller.refresh(); void h.poller.refresh()
  assert.equal(h.calls(), 1, 'refreshes within 15s are deferred, not fired')
  await h.advance(ACCOUNT_REFRESH.okMs)
  assert.equal(h.calls(), 2)
  assert.equal(h.published.at(-1).toppedUp.wallets[0].amount, '9')
})

test('poller: failures keep the last amounts as stale and back off; stop drops late replies', async () => {
  let resolveLate: (v: unknown) => void = () => {}
  const h = harness([okReply('10'), () => Promise.reject(new Error('net')), () => new Promise(r => { resolveLate = r })])
  h.poller.start(); await h.advance(0)
  await h.advance(ACCOUNT_REFRESH.okMs)
  assert.equal(h.published.at(-1).status, 'stale')
  assert.equal(h.published.at(-1).toppedUp.wallets[0].amount, '10')
  assert.equal(h.timers[0].at - ACCOUNT_REFRESH.okMs, ACCOUNT_REFRESH.failBaseMs, 'first retry after 30s')
  await h.advance(ACCOUNT_REFRESH.failBaseMs)
  h.poller.stop()
  assert.equal(h.published.at(-1), null, 'withdrawing access clears the balance at once')
  resolveLate({ ok: true, value: { status: 'ready', value: [{ currency: 'CNY', balance: '999' }], bonusWallets: [] } })
  await h.advance(0)
  assert.equal(h.published.at(-1), null, 'a reply from the old grant is ignored')
  assert.equal(h.timers.length, 0, 'no timers survive stop()')
})

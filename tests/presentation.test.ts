import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { POSE_META, spriteGeometry, STAGE_ASPECT } from '../lib/client/poses.js'
import { walletView, walletAmount } from '../lib/client/wallet.js'
import { FEATURES, effectiveForm } from '../lib/client/features.js'
import { HIT_AREAS } from '../lib/client/hitareas.js'

const pngSize = (name: string) => { const b = readFileSync(new URL(`../assets/${name}.png`, import.meta.url)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } }

test('F03: pose metadata matches the real artwork and every pose has a hit area', () => {
  for (const [pose, meta] of Object.entries(POSE_META)) {
    const { w, h } = pngSize(pose)
    assert.ok(Math.abs(meta.aspect - w / h) < 0.001, `${pose} aspect`)
    assert.ok(HIT_AREAS[pose], `${pose} hit area`)
  }
})

test('F03: calibrated head sizes stay within 5% of Maid and every maiden pose fits the shared stage', () => {
  // Head heights (headdress top to chin) measured on a 1000px-tall canvas; eye spacing used as a cross-check.
  const measured: Record<string, number> = { Maid: 165, sajiao: 164, Answering: 172, baifan: 170, getit: 170, Think1: 162, Think2: 168, Think3: 167, Dizzy: 173 }
  for (const [pose, head] of Object.entries(measured)) {
    const ratio = (head * POSE_META[pose].scale) / 165
    assert.ok(Math.abs(ratio - 1) <= 0.05, `${pose} head ratio ${ratio.toFixed(3)}`)
  }
  for (const pose of Object.keys(POSE_META)) {
    const g = spriteGeometry(pose, 800, 1)
    assert.ok(g.imageWidth <= g.stageWidth * 1.01, `${pose} fits the stage width`)
    assert.ok(g.imageHeight <= g.stageHeight * 1.04, `${pose} keeps its head on stage`)
  }
})

test('F03: switching pose or the five size steps never changes the stage anchor', () => {
  for (const scale of [0.5, 0.75, 1, 1.15, 1.3]) {
    const stages = Object.keys(POSE_META).map(pose => spriteGeometry(pose, 900, scale))
    assert.ok(stages.every(g => g.stageWidth === stages[0].stageWidth && g.stageHeight === stages[0].stageHeight))
    for (const g of stages) assert.ok(Math.abs(g.imageLeft + g.imageWidth / 2 - g.stageWidth / 2) <= 1, 'centred on the same axis')
  }
  assert.equal(spriteGeometry('Maid', 800, 1).stageWidth, Math.round(480 * STAGE_ASPECT))
  assert.equal(spriteGeometry('Maid', 500, 1).stageHeight, 300, 'never more than 60% of the window')
})

test('F04: chibi switching is paused but a stored chibi preference renders maiden', () => {
  assert.equal(FEATURES.chibiForm, false)
  assert.equal(effectiveForm('chibi'), 'maiden')
  assert.equal(effectiveForm('maiden'), 'maiden')
  assert.ok(readFileSync(new URL('../assets/DaFeiYu.png', import.meta.url)).length > 500, 'asset retained')
})

test('F05: unknown is never shown as zero, stale is labelled, low balance needs fresh comparable CNY', () => {
  const base = { known: true, toppedUp: '¥1.20', granted: '¥0.30', checkedAt: 1000, now: 2000, ricePrice: 0.5 }
  assert.deepEqual(walletView({ ...base, known: false }), { status: 'unavailable', toppedUp: null, granted: null, checkedAt: null, bowls: null, low: false })
  const live = walletView(base)
  assert.equal(live.status, 'live'); assert.equal(live.low, true); assert.equal(live.bowls, 3)
  const stale = walletView({ ...base, now: 1000 + 60_000 })
  assert.equal(stale.status, 'stale'); assert.equal(stale.low, false, 'stale data cannot trigger the low-balance line'); assert.equal(stale.bowls, null)
  const missing = walletView({ ...base, granted: '' })
  assert.equal(missing.granted, null, 'missing stays —'); assert.equal(missing.toppedUp, '¥1.20'); assert.equal(missing.low, false)
  const usd = walletView({ ...base, toppedUp: '$1.00', granted: '$0.10' })
  assert.equal(usd.low, false); assert.equal(usd.bowls, null, 'credit per bowl has no currency, so USD is not estimated')
  const mixed = walletView({ ...base, granted: '$0.10' })
  assert.equal(mixed.bowls, null, 'currencies are never added together')
  assert.equal(walletView({ ...base, toppedUp: 'abc', granted: '—' }).status, 'unavailable')
  assert.equal(walletAmount('￥1,200.50')?.amount, 1200.5)
  assert.equal(walletAmount('¥0.00')?.amount, 0)
})

test('F05: plugin class names cannot be picked up by the DOM balance reader', () => {
  const css = ['PetOverlay.module.css', 'galgame.css', 'LivingPuppet.module.css'].map(f => readFileSync(new URL(`../src/client/${f}`, import.meta.url), 'utf8')).join('\n')
  const classes = new Set(Array.from(css.matchAll(/\.([A-Za-z][\w-]*)/g), m => m[1]))
  for (const name of classes) {
    assert.ok(!/amount/i.test(name), `${name} contains "amount"`)
    assert.ok(!(/balance/i.test(name) && /row/i.test(name)), `${name} looks like a balance row`)
  }
})

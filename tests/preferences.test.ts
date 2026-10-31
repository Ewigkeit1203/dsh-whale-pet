import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readPreferences, savePreferences, PREFERENCES_KEY } from '../lib/client/preferences.js'

test('preferences survive reload, reject malformed values and tolerate unavailable storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let value: string | null = null
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem(key: string) { assert.equal(key, PREFERENCES_KEY); return value },
    setItem(key: string, data: string) { assert.equal(key, PREFERENCES_KEY); value = data },
  } })
  try {
    const p = readPreferences()
    assert.equal(p.muted, true, 'audio is opt-in')
    assert.equal(p.typewriter, true)
    savePreferences({ ...p, language: 'en', theme: 'dark', quiet: true, x: 123, y: 234 })
    assert.equal(readPreferences().language, 'en')
    assert.equal(readPreferences().theme, 'dark')
    assert.equal(readPreferences().quiet, true)
    assert.equal(readPreferences().x, 123)
    value = '{"theme":"hacker","language":"bad","scale":900,"opacity":0,"wandering":"false"}'
    const safe = readPreferences()
    assert.equal(safe.theme, 'light')
    assert.equal(safe.language, 'zh')
    assert.equal(safe.scale, 1.3)
    assert.equal(safe.opacity, 0.35)
    assert.equal(safe.wandering, true)
    value = 'corrupt'
    assert.equal(readPreferences().language, 'zh')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('blocked') } })
    assert.doesNotThrow(() => savePreferences(p))
    assert.equal(readPreferences().theme, 'light')
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

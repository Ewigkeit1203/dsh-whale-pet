import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PetAudio, dialogueBlocks, parseBalance } from '../lib/client/experience.js'

test('code blocks preserve exact code and language, including an unfinished streaming fence', () => {
  const blocks = dialogueBlocks('First\n```python\nprint("<script>")\n```\nLast')
  assert.equal(blocks[1].kind, 'code')
  assert.equal(blocks[1].language, 'python')
  assert.equal(blocks[1].text, 'print("<script>")')
  assert.equal(blocks[2].text, '\nLast')
  assert.equal(dialogueBlocks('```js\nlet x = 1')[0].text, 'let x = 1')
})
test('balance parser distinguishes unavailable values from zero', () => {
  assert.equal(parseBalance('unavailable'), null)
  assert.equal(parseBalance('¥0.00'), 0)
  assert.equal(parseBalance('￥1,200.50'), 1200.5)
})
test('audio waits for gesture, mutes immediately and disposes the context', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
  let context: any
  let starts = 0
  let contexts = 0
  class FakeContext {
    state = 'running'; currentTime = 1; destination = {}
    constructor() { contexts++; context = this }
    resume() { this.state = 'running'; return Promise.resolve() }
    suspend() { this.state = 'suspended'; return Promise.resolve() }
    close() { this.state = 'closed'; return Promise.resolve() }
    createOscillator() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {}, start() { starts++ }, stop() {} } }
    createBiquadFilter() { return { frequency: { setValueAtTime() {} }, Q: { setValueAtTime() {} }, connect() {}, disconnect() {} } }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} } }
  }
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: FakeContext })
  try {
    const audio = new PetAudio()
    audio.play('ding')
    assert.equal(contexts, 0)
    audio.unlock(); audio.play('ding')
    assert.equal(starts, 2)
    audio.play('blip'); audio.play('blip')
    assert.equal(starts, 3, 'blips must be rate limited')
    audio.silence(); audio.play('rice')
    assert.equal(starts, 3)
    assert.equal(context.state, 'suspended')
    audio.dispose()
    assert.equal(context.state, 'closed')
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'AudioContext', descriptor)
    else Reflect.deleteProperty(globalThis, 'AudioContext')
  }
})

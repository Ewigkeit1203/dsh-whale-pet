import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PetVoice, appendedSpeech, speakableText, tokenize, VOICE_TUNING } from '../lib/client/voice.js'

function fakeAudio() {
  const log = { contexts: 0, starts: [] as number[], closed: false, suspended: 0, buses: 0 }
  class Param { value = 1; setValueAtTime(v: number) { this.value = v } exponentialRampToValueAtTime() {} linearRampToValueAtTime(v: number) { this.value = v } cancelScheduledValues() {} }
  class FakeContext {
    state = 'running'; currentTime = 10; destination = {}
    constructor() { log.contexts++ }
    resume() { this.state = 'running'; return Promise.resolve() }
    suspend() { this.state = 'suspended'; log.suspended++; return Promise.resolve() }
    close() { this.state = 'closed'; log.closed = true; return Promise.resolve() }
    createDynamicsCompressor() { return { threshold: new Param(), ratio: new Param(), connect() {} } }
    createOscillator() { return { type: '', frequency: new Param(), connect() {}, disconnect() {}, start(at: number) { log.starts.push(at) }, stop() {}, onended: null } }
    createBiquadFilter() { return { type: '', frequency: new Param(), Q: new Param(), connect() {}, disconnect() {} } }
    createGain() { log.buses++; return { gain: new Param(), connect() {}, disconnect() {} } }
  }
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: FakeContext })
  return { log, restore() { if (descriptor) Object.defineProperty(globalThis, 'AudioContext', descriptor); else Reflect.deleteProperty(globalThis, 'AudioContext') } }
}

test('voice: nothing is created before a gesture; speech is capped so a stall never leaves a backlog', () => {
  const { log, restore } = fakeAudio()
  try {
    const voice = new PetVoice()
    assert.equal(voice.speak('你好'), 0)
    assert.equal(log.contexts, 0, 'no AudioContext until unlock()')
    voice.unlock()
    const first = voice.speak('今天的天气真不错我们一起去散步吧然后再回来写代码好不好呀'.repeat(3))
    const maxSyllables = Math.ceil(VOICE_TUNING.maxAhead / (VOICE_TUNING.step * 0.92)) + 1
    assert.ok(first > 0 && first <= maxSyllables, `scheduled ${first} syllables, cap ${maxSyllables}`)
    assert.equal(voice.speak('还有更多文字'), 0, 'look-ahead is full: extra text is dropped, not queued')
    const latest = Math.max(...log.starts)
    assert.ok(latest - 10 <= VOICE_TUNING.maxAhead + 0.2, 'nothing scheduled beyond the look-ahead')
  } finally { restore() }
})

test('voice: cut, mute and dispose stop sound immediately and do not replay later', () => {
  const { log, restore } = fakeAudio()
  try {
    const voice = new PetVoice()
    voice.unlock()
    voice.speak('第一句话')
    const before = log.starts.length
    voice.silence()
    assert.equal(log.suspended, 1)
    assert.equal(voice.speak('后台时的文字'), 0, 'suspended context schedules nothing')
    assert.equal(log.starts.length, before)
    voice.unlock()
    assert.ok(voice.speak('回来') > 0, 'speech resumes from now, without the missed text')
    voice.setVolume(0)
    assert.equal(voice.speak('音量为零'), 0)
    voice.dispose()
    assert.equal(log.closed, true)
  } finally { restore() }
})

test('voice: code, inline code and links are not voiced; only appended prose of the same message is', () => {
  assert.equal(speakableText('看这里```js\nconst a = 1\n```好了').replace(/\s/g, ''), '看这里好了')
  assert.equal(speakableText('运行 `npm test` 吧').replace(/\s/g, ''), '运行吧')
  assert.equal(appendedSpeech('', '整段已经完成的回答'), '', 'loading a finished answer is silent')
  assert.equal(appendedSpeech('旧会话', '新会话的内容'), '', 'a different message is silent')
  assert.equal(appendedSpeech('你好', '你好，世界'), '，世界')
  assert.equal(appendedSpeech('代码：```py\nprint(', '代码：```py\nprint(1)\n```之后'), '之后', 'text inside an open fence is skipped')
})

test('voice: punctuation adds rests, latin words are compressed, sentence ends fall', () => {
  const tokens = tokenize('你好，世界。Hello wonderful')
  const syllables = tokens.filter(t => t.kind === 'syllable')
  assert.equal(syllables.length, 4 + 2 + 3)
  assert.ok(tokens.some(t => t.kind === 'rest' && t.seconds === VOICE_TUNING.commaRest))
  assert.ok(tokens.some(t => t.kind === 'rest' && t.seconds === VOICE_TUNING.stopRest))
  assert.equal((syllables[3] as any).last, true, 'the syllable before 。 is marked as a sentence end')
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SCENES, PAINTED_SCENES, sceneMeta, sceneSvg, sceneUrl, shuffleScene, isSceneId, timeOfDayScene } from '../lib/client/scenes.js'
import { BgmPlayer, BGM_TRACKS, BGM_TUNING, bgmGain, cycleBgmTrack, isBgmTrack } from '../lib/client/bgm.js'
import { checkMedia, saveMedia, loadMedia, deleteMedia } from '../lib/client/media-store.js'
import { readPreferences, PREFERENCES_KEY } from '../lib/client/preferences.js'

test('scenes: every painted background is a deterministic, well-formed SVG', () => {
  for (const id of PAINTED_SCENES) {
    const svg = sceneSvg(id)
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${id} is an SVG document`)
    assert.ok(!/NaN|undefined|Infinity/.test(svg), `${id} has no broken numbers`)
    assert.ok(svg.length < 120_000, `${id} stays small (${svg.length} bytes)`)
    assert.equal(sceneSvg(id), svg, `${id} paints the same picture every time`)
    assert.match(sceneUrl(id, null), /^data:image\/svg\+xml/)
  }
  assert.equal(sceneSvg('none'), '')
  assert.equal(sceneUrl('none', null), '', 'transparent scene shows DSH, not a picture')
  assert.equal(sceneUrl('custom', 'blob:x'), 'blob:x')
  assert.equal(sceneUrl('custom', null), '')
  assert.equal(sceneMeta('bogus').id, 'study', 'unknown ids fall back to the study')
  assert.ok(SCENES.every(scene => scene.zh && scene.en && scene.base), 'every scene is labelled in both languages and has a base colour')
  assert.ok(isSceneId('cafe') && isSceneId('auto') && !isSceneId('hacker'))
  assert.deepEqual([0, 5, 6, 12, 15, 16, 18, 19, 23].map(timeOfDayScene), ['study', 'study', 'cafe', 'cafe', 'cafe', 'seaside', 'seaside', 'study', 'study'])
})

test('scenes: shuffle always changes the scene, never picks transparent, and offers custom only when stored', () => {
  for (let i = 0; i < 40; i++) {
    const r = i / 40
    const pick = shuffleScene('study', false, () => r)
    assert.notEqual(pick, 'study'); assert.notEqual(pick, 'none'); assert.notEqual(pick, 'custom')
  }
  const picks = new Set(Array.from({ length: 50 }, (_, i) => shuffleScene('lab', true, () => i / 50)))
  assert.ok(picks.has('custom'), 'a stored picture joins the rotation')
  assert.ok(!picks.has('lab'))
})

// A minimal Web Audio stand-in that records what the player schedules.
function fakeAudio() {
  const log = { contexts: 0, oscStarts: [] as number[], closed: 0, suspended: 0, resumed: 0, fadeTargets: [] as number[] }
  class Param {
    value = 1
    setValueAtTime(v: number) { this.value = v; return this }
    linearRampToValueAtTime(v: number) { this.value = v; return this }
    exponentialRampToValueAtTime(v: number) { this.value = v; return this }
    setTargetAtTime(v: number) { this.value = v; return this }
    cancelScheduledValues() { return this }
  }
  const node = () => ({ connect() {}, disconnect() {} })
  class FakeContext {
    state = 'running'; currentTime = 5; sampleRate = 8000; destination = {}
    constructor() { log.contexts++ }
    resume() { this.state = 'running'; log.resumed++; return Promise.resolve() }
    suspend() { this.state = 'suspended'; log.suspended++; return Promise.resolve() }
    close() { this.state = 'closed'; log.closed++; return Promise.resolve() }
    createGain() { return { ...node(), gain: new Param() } }
    createDynamicsCompressor() { return { ...node(), threshold: new Param(), ratio: new Param() } }
    createBiquadFilter() { return { ...node(), type: '', frequency: new Param(), Q: new Param() } }
    createConvolver() { return { ...node(), buffer: null } }
    createOscillator() { return { ...node(), type: '', frequency: new Param(), detune: new Param(), onended: null, start(at: number) { log.oscStarts.push(at) }, stop() {} } }
    createBufferSource() { return { ...node(), buffer: null, loop: false, onended: null, start() {}, stop() {} } }
    createBuffer(channels: number, length: number) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { getChannelData: (c: number) => data[c] } }
    decodeAudioData(bytes: ArrayBuffer) { return bytes.byteLength > 4 ? Promise.resolve({ duration: 1 }) : Promise.reject(new Error('bad file')) }
  }
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: FakeContext })
  return { log, restore() { if (descriptor) Object.defineProperty(globalThis, 'AudioContext', descriptor); else Reflect.deleteProperty(globalThis, 'AudioContext') } }
}

test('bgm: nothing is created until play(); notes are queued only inside the look-ahead window', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
  const { log, restore } = fakeAudio()
  try {
    const player = new BgmPlayer()
    player.setVolume(0.5)
    assert.equal(log.contexts, 0, 'no AudioContext before play')
    assert.equal(await player.play('daily', 0.5), true)
    assert.equal(player.playing, true); assert.equal(player.track, 'daily')
    assert.ok(log.oscStarts.length > 0, 'the first notes are scheduled')
    assert.ok(Math.max(...log.oscStarts) <= 5 + BGM_TUNING.lookAhead + 0.2, 'nothing beyond the look-ahead')
    const before = log.oscStarts.length
    player.tick()
    assert.equal(log.oscStarts.length, before, 'time has not moved: no duplicate notes')
    player.fadeOut()
    assert.equal(player.playing, false)
    const afterFade = log.oscStarts.length
    t.mock.timers.tick(2000)
    player.tick()
    assert.equal(log.oscStarts.length, afterFade, 'no notes after fading out')
    assert.equal(log.suspended, 1, 'the device is suspended once the fade completes')
    player.dispose()
    assert.equal(log.closed, 1, 'dispose closes the context')
  } finally { restore() }
})

test('bgm: switching tracks crossfades in place; page hide closes immediately; bad custom files are refused', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
  const { log, restore } = fakeAudio()
  try {
    const player = new BgmPlayer()
    await player.play('calm', 0.4)
    await player.play('night', 0.4)
    assert.equal(player.track, 'night')
    assert.equal(log.contexts, 1, 'one context for the whole session')
    assert.equal(await player.play('custom'), false, 'no custom file stored yet')
    player.setCustom(new ArrayBuffer(2))
    assert.equal(await player.play('custom'), false, 'undecodable files are refused')
    assert.equal(player.hasCustom, false, 'a broken file is forgotten')
    player.setCustom(new ArrayBuffer(64))
    assert.equal(await player.play('custom'), true)
    player.stopNow()
    assert.equal(log.closed, 1)
    assert.equal(player.playing, false)
  } finally { restore() }
})

test('bgm: helpers keep volume, track cycling and validation safe', () => {
  assert.equal(bgmGain(0), 0); assert.equal(bgmGain(-3), 0); assert.equal(bgmGain(Number.NaN), 0)
  assert.ok(bgmGain(0.25) < bgmGain(0.5) && bgmGain(0.5) < bgmGain(1), 'volume curve rises monotonically')
  assert.equal(bgmGain(9), bgmGain(1))
  assert.equal(cycleBgmTrack('night', 1, false), 'daily', 'custom is skipped without a file')
  assert.equal(cycleBgmTrack('night', 1, true), 'custom')
  assert.equal(cycleBgmTrack('daily', -1, false), 'night')
  assert.ok(isBgmTrack('calm') && !isBgmTrack('rock'))
  assert.ok(BGM_TRACKS.every(track => track.zh && track.en), 'track names are bilingual')
})

test('media store: rejects wrong types and sizes; resolves quietly without IndexedDB', async () => {
  assert.deepEqual(checkMedia('scene', { type: 'image/png', size: 1000 }), { ok: true })
  assert.deepEqual(checkMedia('scene', { type: 'image/svg+xml', size: 1000 }), { ok: false, reason: 'type' }, 'SVG uploads are refused (scripts)')
  assert.deepEqual(checkMedia('scene', { type: 'image/jpeg', size: 16 * 1024 * 1024 }), { ok: false, reason: 'size' })
  assert.deepEqual(checkMedia('bgm', { type: 'audio/mpeg', size: 5_000_000 }), { ok: true })
  assert.deepEqual(checkMedia('bgm', { type: 'video/mp4', size: 5_000 }), { ok: false, reason: 'type' })
  assert.deepEqual(checkMedia('bgm', { type: 'audio/ogg', size: 0 }), { ok: false, reason: 'size' })
  assert.equal(await saveMedia('scene', new Blob(['x'], { type: 'image/png' })), false, 'no IndexedDB in Node: save reports false')
  assert.equal(await loadMedia('scene'), null)
  assert.equal(await deleteMedia('bgm'), false)
})

test('preferences: theatre background and music settings persist and are validated', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let value: string | null = null
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => key === PREFERENCES_KEY ? value : null, setItem() {} } })
  try {
    const defaults = readPreferences()
    assert.equal(defaults.scene, 'auto', 'backgrounds follow the time of day by default'); assert.equal(defaults.bgmOn, false, 'music is opt-in'); assert.equal(defaults.bgmTrack, 'daily'); assert.equal(defaults.bgmVolume, 0.45); assert.equal(defaults.sceneShuffle, false)
    value = JSON.stringify({ scene: 'cafe', bgmOn: true, bgmTrack: 'night', bgmVolume: 0.8, sceneShuffle: true })
    const saved = readPreferences()
    assert.equal(saved.scene, 'cafe'); assert.equal(saved.bgmOn, true); assert.equal(saved.bgmTrack, 'night'); assert.equal(saved.bgmVolume, 0.8); assert.equal(saved.sceneShuffle, true)
    value = JSON.stringify({ scene: 'hacker', bgmOn: 'yes', bgmTrack: 'rock', bgmVolume: 7 })
    const safe = readPreferences()
    assert.equal(safe.scene, 'auto'); assert.equal(safe.bgmOn, false); assert.equal(safe.bgmTrack, 'daily'); assert.equal(safe.bgmVolume, 1)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

test('emotion: each page picks an expression and a mood mark; code never sets the mood', async () => {
  const { detectEmotion, emoteFor, EMOTION_POSE } = await import('../lib/client/emotion.js')
  assert.equal(detectEmotion('搞定啦！测试全部通过了。'), 'proud')
  assert.equal(detectEmotion('诶？！竟然是这样'), 'surprised')
  assert.equal(detectEmotion('抱歉，是我搞错了。'), 'shy')
  assert.equal(detectEmotion('又报错了，构建失败……'), 'frustrated')
  assert.equal(detectEmotion('谢谢主人，太好了～'), 'happy')
  assert.equal(detectEmotion('其实很简单，交给我吧。'), 'smug')
  assert.equal(detectEmotion('快速排序是一种分治算法。'), 'neutral')
  assert.equal(detectEmotion('看这里：```js\nthrow new Error("failed")\n```'), 'neutral', 'errors inside code do not upset her')
  assert.equal(detectEmotion('Whoa, really?! I did not expect that.'), 'surprised')
  assert.equal(EMOTION_POSE.frustrated, 'angry')
  assert.equal(emoteFor('surprised', '真的吗？'), 'question')
  assert.equal(emoteFor('surprised', '哇！'), 'exclaim')
  assert.equal(emoteFor('neutral'), null)
})

test('live rig: weights keep the face still, bend hair, plant the feet; blinks are short and spaced', async () => {
  const { liveWeights, hairness, blinkAmount, nextBlinkDelay } = await import('../lib/client/live-rig.js')
  const { POSE_RIG, poseRig } = await import('../lib/client/rig.js')
  const { POSE_META } = await import('../lib/client/poses.js')
  for (const pose of Object.keys(POSE_META).filter(name => name !== 'DaFeiYu')) assert.ok(POSE_RIG[pose], `${pose} has rig anchors`)
  const rig = poseRig('Maid')
  const cols = 10, rows = 20
  const data = liveWeights(rig, cols, rows, (u) => u < 0.2 ? 1 : 0)
  const at = (x: number, y: number) => data.subarray((y * (cols + 1) + x) * 6, (y * (cols + 1) + x) * 6 + 6)
  const [, , head0, hair0] = at(5, 1)
  assert.equal(head0, 1, 'the head turns as one piece'); assert.equal(hair0, 0)
  const [, , , hairLeft] = at(1, 12)
  assert.equal(hairLeft, 1, 'hair found by colour sways')
  const [, , headFeet, , , skirtFeet] = at(5, rows)
  assert.equal(headFeet, 0); assert.ok(skirtFeet < 0.05, 'feet stay planted')
  assert.ok(hairness(140, 160, 210, 255) > 0.5, 'light blue-lavender hair')
  assert.equal(hairness(50, 55, 95, 255), 0, 'navy dress is not hair')
  assert.equal(hairness(245, 245, 250, 255), 0, 'white apron is not hair')
  assert.equal(hairness(250, 220, 210, 255), 0, 'skin is not hair')
  assert.equal(blinkAmount(-1), 0); assert.equal(blinkAmount(60), 1); assert.equal(blinkAmount(200), 0)
  assert.ok(blinkAmount(30) > 0 && blinkAmount(30) < 1)
  for (let i = 0; i < 50; i++) { const d = nextBlinkDelay(); assert.ok(d >= 180 && d <= 6000) }
  for (const [pose, data] of Object.entries(POSE_RIG)) for (const [x, y, w, h] of data.eyes) {
    assert.ok(x > data.face[0] - 0.02 && x < data.face[2] + 0.02 && w < 0.1 && h < 0.04, `${pose} eye lies on the face`)
    void y
  }
})

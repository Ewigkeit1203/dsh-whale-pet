import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { findLive2DModel, planLive2DImport, isDaFeiYuDisplayInfo, live2dTextureSize, normaliseLive2DPath, live2dFilesFromDrop, LIVE2D_CREDIT } from '../lib/client/live2d-package.js'
import { live2dLookFor, LIVE2D_LOOKS } from '../lib/client/live2d-look.js'
import { live2dPoseMeta, LIVE2D_POSE_META, POSE_META, spriteGeometry } from '../lib/client/poses.js'
import { readPreferences, defaultPreferences } from '../lib/client/preferences.js'

// The folder as VTube Studio / the author ships it (see the model's 使用须知).
const folder = [
  'DeepSeek/大肥鱼.model3.json', 'DeepSeek/大肥鱼.moc3', 'DeepSeek/大肥鱼.physics3.json', 'DeepSeek/大肥鱼.cdi3.json',
  'DeepSeek/大肥鱼.vtube.json', 'DeepSeek/大肥鱼.png', 'DeepSeek/items_pinned_to_model.json',
  ...[0, 1, 2, 3, 4].map(i => `DeepSeek/大肥鱼.4096/texture_0${i}.png`),
  'DeepSeek/Exp3/钢盆.exp3.json', 'DeepSeek/Exp3/加载.exp3.json', 'DeepSeek/Exp3/圈圈眼.exp3.json', 'DeepSeek/Exp3/＞＜.exp3.json',
  'DeepSeek/Animation/IDLE.motion3.json', 'DeepSeek/Animation/脱捕.motion3.json',
  ...['默认手切举手', '举手切默认手', '竖手指切出来动画', '竖手指切回默认', '狗尾草切换出来', '狗尾草切回默认手'].map(name => `DeepSeek/Animation/${name}.motion3.json`),
  'psd/大肥鱼公皮分享拆分.psd',
]
const modelJson = {
  FileReferences: {
    Moc: '大肥鱼.moc3',
    Textures: [0, 1, 2, 3, 4].map(i => `大肥鱼.4096/texture_0${i}.png`),
    Physics: '大肥鱼.physics3.json',
    DisplayInfo: '大肥鱼.cdi3.json',
  },
}

test('Live2D import: finds the model, keeps only what the companion needs', () => {
  assert.equal(findLive2DModel(folder), 'DeepSeek/大肥鱼.model3.json')
  assert.equal(normaliseLive2DPath('.\\DeepSeek\\Exp3\\钢盆.exp3.json'), 'DeepSeek/Exp3/钢盆.exp3.json')
  const plan = planLive2DImport(folder, 'DeepSeek/大肥鱼.model3.json', modelJson)
  assert.deepEqual(plan.missing, [])
  assert.equal(plan.root, 'DeepSeek/')
  assert.equal(plan.modelPath, '大肥鱼.model3.json')
  assert.equal(plan.idleMotion, 'Animation/IDLE.motion3.json')
  assert.equal(Object.keys(plan.motions).length, 7, 'the six hand-gesture animations and the author idle (脱捕)')
  assert.equal(plan.motions['脱捕'], 'Animation/脱捕.motion3.json')
  assert.equal(plan.motions['默认手切举手'], 'Animation/默认手切举手.motion3.json')
  assert.deepEqual(Object.values(plan.expressions).sort(), ['加载', '圈圈眼', '钢盆', '＞＜'].sort())
  for (const kept of ['大肥鱼.moc3', '大肥鱼.physics3.json', '大肥鱼.cdi3.json', '大肥鱼.4096/texture_03.png']) assert.ok(plan.keep.includes(kept), kept)
  // VTube Studio settings, the thumbnail, other motions and the PSD are not stored.
  for (const skipped of ['大肥鱼.vtube.json', '大肥鱼.png', 'items_pinned_to_model.json']) assert.ok(!plan.keep.includes(skipped), skipped)
  assert.ok(!plan.keep.some(path => path.endsWith('.psd')))
})

test('Live2D import: an incomplete folder is reported, not half-imported', () => {
  const plan = planLive2DImport(folder.filter(path => !path.endsWith('texture_02.png')), 'DeepSeek/大肥鱼.model3.json', modelJson)
  assert.deepEqual(plan.missing, ['大肥鱼.4096/texture_02.png'])
  assert.deepEqual(planLive2DImport(['a/x.model3.json'], 'a/x.model3.json', {}).missing, ['(moc)', '(textures)'])
  assert.equal(findLive2DModel(['readme.txt', 'a.psd']), null)
})

test('Live2D import: only the 大肥鱼 model is accepted', () => {
  // Trimmed to the identifying switch names of the real cdi3.json; no model data is committed.
  const real = JSON.parse(readFileSync(new URL('./fixtures/dafeiyu.cdi3.json', import.meta.url), 'utf8'))
  assert.equal(isDaFeiYuDisplayInfo(real), true)
  assert.equal(isDaFeiYuDisplayInfo({ Parameters: [{ Id: 'ParamAngleX', Name: 'AngleX' }] }), false)
  assert.equal(isDaFeiYuDisplayInfo(null), false)
})

test('Live2D import: 4096 textures are scaled to 2048, smaller ones are kept', () => {
  assert.deepEqual(live2dTextureSize(4096, 4096), { width: 2048, height: 2048 })
  assert.deepEqual(live2dTextureSize(4096, 2048), { width: 2048, height: 1024 })
  assert.deepEqual(live2dTextureSize(1024, 1024), { width: 1024, height: 1024 })
})

test('Live2D looks: every pose the overlay can show has a look built from the model\'s own switches', () => {
  const poses = ['Maid', 'Answering', 'baifan', 'getit', 'Think1', 'Think2', 'Think3', 'Think4', 'Think5', 'sajiao', 'Dizzy', 'smug', 'shy', 'angry', 'surprised', 'proud', 'happy']
  const switches = new Set(['钢盆', '加载', '圈圈眼', '屑屑眼', '爱心眼', '脸红', '黑脸', '＞＜', '竖食指开', '流冷汗', '单片眼镜', '黑框眼镜'])
  for (const pose of poses) {
    assert.ok(LIVE2D_LOOKS[pose], pose)
    for (const name of LIVE2D_LOOKS[pose].toggles ?? []) assert.ok(switches.has(name), `${pose}: ${name}`)
  }
  assert.deepEqual(live2dLookFor('baifan').toggles, ['钢盆'])
  assert.deepEqual(live2dLookFor('Dizzy').toggles, ['圈圈眼'])
  assert.equal(live2dLookFor('Answering').chew, undefined, 'never chews while answering')
  assert.deepEqual(live2dLookFor('unknown-pose'), LIVE2D_LOOKS.Maid)
  assert.ok((live2dLookFor('Maid', { sleepy: true }).eyeOpen ?? 1) < 0.6)
  assert.equal(live2dLookFor('Answering', { sleepy: true }).eyeOpen, undefined, 'sleepiness only applies while idle')
})

test('Live2D geometry: the model gets its own framing and stays out of the illustration table', () => {
  assert.equal('Live2D' in POSE_META, false)
  assert.equal(live2dPoseMeta(null).aspect, LIVE2D_POSE_META.aspect)
  assert.equal(live2dPoseMeta(0.6).aspect, 0.6)
  assert.equal(live2dPoseMeta(9).aspect, LIVE2D_POSE_META.aspect, 'nonsense aspects are ignored')
  const g = spriteGeometry('Live2D', 800, 1, live2dPoseMeta(0.5773))
  assert.ok(g.imageWidth <= g.stageWidth, 'fits the shared stage width')
  assert.equal(g.imageHeight, g.stageHeight)
})

test('Live2D preference: on by default, stored like the others', () => {
  assert.equal(defaultPreferences().live2d, true)
  const store = new Map<string, string>()
  ;(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) }
  store.set('dsh-whale-pet.preferences.v1', JSON.stringify({ live2d: false }))
  assert.equal(readPreferences().live2d, false)
  store.set('dsh-whale-pet.preferences.v1', JSON.stringify({ live2d: 'yes' }))
  assert.equal(readPreferences().live2d, true)
  delete (globalThis as { localStorage?: unknown }).localStorage
})

test('Live2D bundle: runtime is lazy, Core cannot register with a host AMD loader, and no model ships', () => {
  const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(bundle, /function __dshLoadCubismCore\(\) \{\n  var define = void 0, module = void 0, exports = void 0;/)
  assert.match(bundle, /function __dshLoadLive2DRuntime\(\)/)
  // Only called from the loader, never at module evaluation.
  const calls = bundle.match(/__dshLoadCubismCore\(\)/g) ?? []
  assert.ok(calls.length >= 2)
  assert.ok(!/\.moc3['"]?\s*:\s*['"]data:/.test(bundle), 'no embedded model')
  assert.ok(!bundle.includes('texture_00.png'), 'no model textures')
  assert.ok(!/fetch\(['"]https?:/.test(bundle.slice(bundle.indexOf('function __dshLoadLive2DRuntime'), bundle.indexOf('function __dshLoadLive2DRuntime') + 600000)), 'runtime fetches nothing remote')
  assert.match(LIVE2D_CREDIT.art, /神宫凉子/)
})


test('Live2D motion: eyes reach the pointer first, the head follows, the body follows the head', async () => {
  const {Live2DDriver} = await import('../lib/client/live2d-motion.js')
  // Same seed with and without a pointer: the difference is the reaction to the pointer alone.
  const driver = new Live2DDriver(7), control = new Live2DDriver(7)
  const look = live2dLookFor('Answering', {state:'ANSWERING'})
  let d = driver.update({dt: 0.1, motion: 1, look, pointer: {x: 1, y: 0, still: 0}, talking: 0})
  let c = control.update({dt: 0.1, motion: 1, look, pointer: null, talking: 0})
  d = driver.update({dt: 0.05, motion: 1, look, pointer: {x: 1, y: 0, still: 0}, talking: 0})
  c = control.update({dt: 0.05, motion: 1, look, pointer: null, talking: 0})
  // After 150 ms the eyes are most of the way there, the head is not.
  const gaze = look.gaze ?? 1
  const eyeShare = (d.ParamEyeBallX - c.ParamEyeBallX) / (0.9 * gaze), headShare = (d.AngleX - c.AngleX) / (13 * gaze)
  assert.ok(eyeShare > 0.7, `eyes ${eyeShare}`)
  assert.ok(headShare < 0.5 && headShare > 0.1, `head ${headShare}`)
  for (let i = 0; i < 40; i++) d = driver.update({dt: 0.05, motion: 1, look, pointer: {x: 1, y: 0, still: 0.1}, talking: 0})
  assert.ok(d.AngleX > 6, 'head turned towards the pointer')
  assert.ok(d.PositionX > 2 && d.PositionX < d.AngleX, 'body follows part of the turn')
  // Thinking looks away from the pointer.
  const thinking = new Live2DDriver(7)
  for (let i = 0; i < 40; i++) d = thinking.update({dt: 0.05, motion: 1, look: live2dLookFor('Think2'), pointer: {x: -1, y: 0, still: 0}, talking: 0})
  assert.ok(d.AngleX > 0, 'Think2 keeps its own head turn')
})

test('Live2D motion: idle events rest 6–15 s, never repeat back to back, and only run while idle', async () => {
  const {Live2DDriver, LIVE2D_REST} = await import('../lib/client/live2d-motion.js')
  const driver = new Live2DDriver(42)
  const idle = live2dLookFor('Maid', {state:'IDLE'})
  const runs: {name: string; start: number; end: number}[] = []
  let current = ''
  for (let t = 0; t < 600; t += 0.05) {
    // Someone is at the desk (pointer moved a second ago): small events only, no performances.
    const d = driver.update({dt: 0.05, motion: 1, look: idle, pointer: {x: 0, y: 0, still: 1}, talking: 0})
    assert.equal(d.performance, '')
    if (d.event !== current) {
      if (current) runs[runs.length - 1].end = t
      if (d.event) runs.push({name: d.event, start: t, end: t})
      current = d.event
    }
    for (const key of ['AngleX', 'AngleY', 'AngleZ', 'PositionX', 'PositionY', 'PositionZ', 'LeanInput'] as const) assert.ok(Math.abs(d[key]) <= 30, key)
    assert.ok(d.ParamBreath >= 0 && d.ParamBreath <= 1)
  }
  assert.ok(runs.length >= 25, `${runs.length} events in 10 minutes`)
  assert.ok(new Set(runs.map(r => r.name)).size >= 6, 'varied')
  for (let i = 1; i < runs.length; i++) {
    assert.notEqual(runs[i].name, runs[i - 1].name)
    const rest = runs[i].start - runs[i - 1].end
    assert.ok(rest >= LIVE2D_REST[0] - 0.1 && rest <= LIVE2D_REST[1] + 0.1, `rest ${rest}`)
  }
  for (const run of runs.slice(0, -1)) assert.ok(run.end - run.start >= 2 && run.end - run.start <= 5.1, `${run.name} ${run.end - run.start}`)
  const busy = new Live2DDriver(42)
  for (let t = 0; t < 120; t += 0.05) assert.equal(busy.update({dt: 0.05, motion: 1, look: live2dLookFor('Answering', {state:'ANSWERING'}), pointer: null, talking: 1}).event, '')
})

test('Live2D motion: after a quiet while she performs on her own, and stops when the pointer moves', async () => {
  const {Live2DDriver, LIVE2D_PERFORMANCE_AFTER, LIVE2D_PERFORMANCES} = await import('../lib/client/live2d-motion.js')
  const driver = new Live2DDriver(5)
  const idle = live2dLookFor('Maid', {state:'IDLE'})
  const seen: string[] = []
  let first = -1, gesture = false, lively = false
  for (let t = 0; t < 900; t += 0.05) {
    const d = driver.update({dt: 0.05, motion: 1, look: idle, pointer: null, talking: 0})
    assert.ok(d.performanceWeight >= 0 && d.performanceWeight <= 1)
    if (d.performance && seen[seen.length - 1] !== d.performance) { seen.push(d.performance); if (first < 0) first = t }
    if (d.gesture) gesture = true
    if (d.performance) lively ||= d.lively
    for (const key of ['AngleX', 'AngleY', 'AngleZ', 'PositionX', 'PositionY', 'PositionZ', 'LeanInput'] as const) assert.ok(Math.abs(d[key]) <= 30)
    assert.ok(d.mouth >= 0 && d.mouth <= 1)
  }
  assert.ok(first >= LIVE2D_PERFORMANCE_AFTER - 0.1 && first < LIVE2D_PERFORMANCE_AFTER + 15, `first at ${first}`)
  assert.ok(seen.length >= 8, `${seen.length} performances in 15 minutes`)
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1])
  assert.ok(new Set(seen).size >= 4)
  assert.ok(gesture, 'some performances use the hand gestures (foxtail, chest)')
  assert.ok(lively, 'performances ask for the lively frame rate')
  assert.equal(LIVE2D_PERFORMANCES.length, 9)
  assert.ok(!seen.includes('author'), 'the author idle only plays when the model has it')
  const withAuthor = new Live2DDriver(5)
  withAuthor.setAuthorIdle(13.15)
  const names = new Set<string>()
  for (let i = 0; i < 24000; i++) { const d = withAuthor.update({dt: 0.05, motion: 1, look: idle, pointer: null, talking: 0}); if (d.performance) names.add(d.performance); if (d.performance === 'author') assert.ok(d.performanceTime <= 13.15 + 0.05) }
  assert.ok(names.has('author'), 'the author idle animation is among the performances')
  // Moving the pointer interrupts her; she fades out of it.
  const watched = new Live2DDriver(5)
  let t = 0
  while (!watched.update({dt: 0.05, motion: 1, look: idle, pointer: null, talking: 0}).performance) t += 0.05
  let d = watched.update({dt: 0.05, motion: 1, look: idle, pointer: {x: 0.5, y: 0, still: 0}, talking: 0})
  assert.equal(d.gesture, null, 'gesture released at once')
  for (let i = 0; i < 40; i++) d = watched.update({dt: 0.05, motion: 1, look: idle, pointer: {x: 0.5, y: 0, still: 0.1}, talking: 0})
  assert.equal(d.performance, '')
  // Busy or reduced motion: never.
  const busy = new Live2DDriver(5)
  for (let i = 0; i < 2400; i++) assert.equal(busy.update({dt: 0.05, motion: 0, look: idle, pointer: null, talking: 0}).performance, '')
})

test('Live2D motion: a tail touch dodges away from the hand', async () => {
  const {Live2DDriver} = await import('../lib/client/live2d-motion.js')
  const run = (side: number) => {
    const driver = new Live2DDriver(9), control = new Live2DDriver(9)
    driver.pulse('dodge', side)
    let peak = 0
    for (let i = 0; i < 20; i++) {
      const d = driver.update({dt: 0.05, motion: 1, look: {}, pointer: null, talking: 0})
      const c = control.update({dt: 0.05, motion: 1, look: {}, pointer: null, talking: 0})
      if (Math.abs(d.PositionX - c.PositionX) > Math.abs(peak)) peak = d.PositionX - c.PositionX
      assert.ok(d.lively)
    }
    return peak
  }
  const fromRight = run(1), fromLeft = run(-1)
  assert.ok(Math.abs(fromRight) > 6 && Math.sign(fromRight) === -Math.sign(fromLeft), `${fromRight} ${fromLeft}`)
})

test('Touch: strokes over the head pat, over the tail tease; pokes and tail touches escalate', async () => {
  const {StrokeDetector, PokeCounter, TailPatience, illustrationRegion, STROKE_RULES} = await import('../lib/client/touch.js')
  const strokes = new StrokeDetector()
  const rub = (region: 'head' | 'tail' | 'body', start: number, moves: number) => {
    const found: string[] = []
    for (let i = 0; i <= moves; i++) { const r = strokes.feed(100 + (i % 2 ? 30 : 0), region, start + i * 80); if (r) found.push(r) }
    return found
  }
  assert.deepEqual(rub('head', 0, STROKE_RULES.pat.turns), ['pat'])
  assert.deepEqual(rub('head', 1000, 8), [], 'cooling down')
  assert.deepEqual(rub('tail', 2000, STROKE_RULES.tail.turns), ['tail'], 'the tail reacts sooner')
  assert.deepEqual(rub('body', 9000, 12), [], 'the rest of her is not a stroke')
  // A pause restarts the count.
  const slow = new StrokeDetector()
  for (let i = 0; i < 10; i++) assert.equal(slow.feed(100 + (i % 2 ? 30 : 0), 'head', i * 900), null)

  const pokes = new PokeCounter()
  const moods = [0, 100, 200, 300, 400, 500].map(t => pokes.tap(t))
  assert.equal(moods[0].first, true)
  assert.deepEqual(moods.map(m => m.mood), ['', '', 'curious', '', '', 'angry'])
  assert.equal(pokes.tap(1000).mood, '', 'still frustrated')
  const tail = new TailPatience()
  assert.deepEqual([0, 5000, 9000].map(t => tail.touch(t)), ['shy', 'shy', 'angry'])
  assert.equal(tail.touch(60000), 'shy')
  const rect = {left: 0, top: 0, width: 100, height: 200}
  assert.equal(illustrationRegion(50, 30, rect), 'head')
  assert.equal(illustrationRegion(50, 150, rect), 'body')
  assert.equal(illustrationRegion(150, 30, rect), null)
})

test('Carried: she counterbalances with her head, struggles with her paws up then hangs limp, and lands softly', async () => {
  const {Dangle, DANGLE} = await import('../lib/client/touch.js')
  const dangle = new Dangle()
  let angle = 0
  for (let i = 0; i < 30; i++) angle = dangle.update(1 / 60, 800, true)
  assert.ok(angle > 5, `trails the hand moving right: ${angle}`)
  for (let i = 0; i < 120; i++) angle = dangle.update(1 / 60, 100000, true)
  assert.ok(angle <= DANGLE.max * 1.3, 'bounded even when flung')
  let crossed = false
  for (let i = 0; i < 600; i++) { const a = dangle.update(1 / 60, 0, false); if (a < 0) crossed = true }
  assert.ok(crossed, 'swings past the middle after release')
  assert.ok(dangle.settled, 'and comes to rest')

  const {Live2DDriver} = await import('../lib/client/live2d-motion.js')
  const held = live2dLookFor('surprised', {state: 'IDLE', held: true})
  assert.equal(held.held, true)
  assert.equal(held.gaze, 0)
  const driver = new Live2DDriver(4), control = new Live2DDriver(4)
  const zs: number[] = []
  let d = driver.update({dt: 0.05, motion: 1, look: held, pointer: null, talking: 0})
  for (let i = 0; i < 60; i++) {
    d = driver.update({dt: 0.05, motion: 1, look: held, pointer: null, talking: 0})
    const c = control.update({dt: 0.05, motion: 1, look: {idle: true}, pointer: null, talking: 0})
    if (i > 40) zs.push(d.PositionZ - c.PositionZ)
    assert.ok(d.lively, 'drawn at the lively rate while carried')
    assert.equal(d.event, ''); assert.equal(d.performance, '')
  }
  assert.ok(Math.max(...zs) - Math.min(...zs) < 1, 'no added kicking oscillator')
  assert.ok(d.armLift < 0.3, 'after struggling for 2.5 s she gives up and the arms hang (3 s held here)')
  driver.setDangle(20)
  for (let i = 0; i < 20; i++) d = driver.update({dt: 0.05, motion: 1, look: held, pointer: null, talking: 0})
  assert.ok(d.AngleZ < 0 && d.PositionX < 0, 'head stays upright against the swing, the body trails it')
  driver.setDangle(0)
  let low = 0
  for (let i = 0; i < 12; i++) { d = driver.update({dt: 0.05, motion: 1, look: {idle: true}, pointer: null, talking: 0}); low = Math.min(low, d.PositionY) }
  assert.ok(low < -2, 'lands with a squash')
})

test('Carry timeline: collar pivot, stretch on grab, struggle, ease-in drop and squash on landing', async () => {
  const {CARRY, carryShape, carryLift, carryStruggle} = await import('../lib/client/touch.js')
  const {Live2DDriver} = await import('../lib/client/live2d-motion.js')
  assert.ok(CARRY.pivotY > 0.08 && CARRY.pivotY < 0.25, 'hangs from the collar, not the belly')
  const grab = carryShape(CARRY.stretchTime / 2, null, 400)
  assert.ok(grab.sy > 1.04 && grab.sx < 0.96, 'stretches when grabbed')
  assert.deepEqual(carryShape(1, null, 400), {sx: 1, sy: 1, dy: 0}, 'springs back')
  assert.ok(carryLift(0, 40, 0.05) > carryLift(0, 40, 0.15) && carryLift(0, 40, 0.15) > 0, 'falls with gravity')
  assert.equal(carryLift(0, 40, CARRY.fallTime), 0, 'and lands')
  const squash = carryShape(0, CARRY.fallTime + CARRY.squashTime / 2, 400)
  assert.ok(squash.sy < 0.95 && squash.sx > 1.04 && squash.dy > 8, 'squashes on landing, feet kept on the ground')
  assert.equal(carryStruggle(0.1), 0); assert.equal(carryStruggle(3), 0)
  assert.ok(Math.max(...Array.from({length: 40}, (_, i) => Math.abs(carryStruggle(0.5 + i * 0.05)))) > 1.5, 'struggles a little on her own')
  const driver = new Live2DDriver(2)
  let d = driver.update({dt: 0.05, motion: 1, look: {held: true}, pointer: null, talking: 0})
  for (let i = 0; i < 20; i++) d = driver.update({dt: 0.05, motion: 1, look: {held: true}, pointer: null, talking: 0})
  assert.ok(d.armLift > 0.9, 'paws up while struggling')
})

test('Live2D motion: wandering swims across without forward marching; reduced motion stays almost still', async () => {
  const {Live2DDriver} = await import('../lib/client/live2d-motion.js')
  const walk = live2dLookFor('Maid', {state:'WANDERING'})
  const driver = new Live2DDriver(3)
  const xs: number[] = [], zs: number[] = []
  for (let t = 0; t < 6; t += 1 / 30) { const d = driver.update({dt: 1 / 30, motion: 1, look: walk, pointer: null, talking: 0}); if (t > 2) { xs.push(d.PositionX); zs.push(d.PositionZ) } }
  assert.ok(Math.max(...xs) - Math.min(...xs) < 6, 'no marching sway')
  // Travelling: feet off the ground, head and body turned into the direction in proportion to speed, arms a little out.
  const swim = (travel: number) => { const d = new Live2DDriver(3), c = new Live2DDriver(3); let r: any, b: any; for (let i = 0; i < 60; i++) { r = d.update({dt: 1 / 30, motion: 1, look: walk, pointer: null, talking: 0, travel}); b = c.update({dt: 1 / 30, motion: 1, look: walk, pointer: null, talking: 0}) } return {d, r, turn: r.AngleX - b.AngleX, body: r.PositionX - b.PositionX} }
  const right = swim(1), left = swim(-1), slow = swim(0.3)
  assert.ok(right.r.float > 0.95 && right.r.moving, 'feet off the ground while she travels')
  assert.ok(right.turn > 7 && right.body > 6 && left.turn < -7 && left.body < -6, `turns into the direction (${right.turn}, ${left.turn})`)
  assert.ok(slow.turn > 1 && slow.turn < right.turn * 0.5, 'in proportion to her speed')
  assert.ok(right.r.swimTilt > 6 && left.r.swimTilt < -6 && Math.abs(slow.r.swimTilt) < 3.5, `leans her whole figure into it (${right.r.swimTilt})`)
  assert.ok(right.r.arms.lf === 0 && right.r.arms.rf === 0, 'arms hang')
  // Arriving: the float ends and she lands with a knee bend that is over within a second.
  const idle = live2dLookFor('Maid', {state:'IDLE'})
  let bend = 0, r: any
  for (let i = 0; i < 36; i++) { r = right.d.update({dt: 1 / 30, motion: 1, look: idle, pointer: null, talking: 0}); bend = Math.max(bend, r.touchdown) }
  assert.ok(bend > 0.9 && r.touchdown === 0 && r.float < 0.02, `soft landing (${bend})`)
  const calm = new Live2DDriver(3).update({dt: 0.1, motion: 0, look: walk, pointer: null, talking: 0, travel: 1})
  assert.ok(calm.float === 0 && calm.touchdown === 0 && calm.swimTilt === 0, 'reduced motion: no float')
  assert.ok(Math.max(...zs) - Math.min(...zs) < 1.5, 'no added front-facing stepping')
  const still = new Live2DDriver(3)
  for (let t = 0; t < 60; t += 0.05) {
    const d = still.update({dt: 0.05, motion: 0, look: live2dLookFor('Maid', {state:'IDLE'}), pointer: {x: 1, y: 1, still: 0}, talking: 1})
    assert.equal(d.event, '')
    assert.ok(Math.abs(d.AngleX) < 0.01 && Math.abs(d.PositionX) < 0.01 && d.ParamEyeBallX === 0, 'no gaze, sway or events')
  }
})

test('Live2D motion: touch pulses fire once per look and cool down', async () => {
  const {Live2DDriver, LIVE2D_PULSE_COOLDOWN} = await import('../lib/client/live2d-motion.js')
  const driver = new Live2DDriver(1)
  const look = live2dLookFor('surprised')
  assert.equal(look.pulse, 'startle')
  assert.equal(live2dLookFor('sajiao').pulse, 'pat')
  assert.equal(live2dLookFor('angry').pulse, 'huff')
  assert.equal(driver.pulse('startle'), true)
  assert.equal(driver.pulse('startle'), false, 'cooling down')
  let peak = 0
  for (let t = 0; t < LIVE2D_PULSE_COOLDOWN + 0.1; t += 0.05) peak = Math.max(peak, driver.update({dt: 0.05, motion: 1, look, pointer: null, talking: 0}).PositionY)
  assert.ok(peak > 3, 'she jumps a little')
  assert.equal(driver.pulse('startle'), true)
})

test('Live2D gestures: enter holds its last frame, a change exits first, curves are sampled like Cubism', async () => {
  const {Live2DGesturePlayer, sampleMotionCurve, parseMotionClip, LIVE2D_GESTURE_FILES} = await import('../lib/client/live2d-motion.js')
  // linear 0→1 over 1 s, then bezier back to 0 by 2 s, then stepped to 0.5 at 3 s.
  const segments = [0, 0, 0, 1, 1, 1, 1.33, 1, 1.66, 0, 2, 0, 2, 3, 0.5]
  assert.equal(sampleMotionCurve(segments, -1), 0)
  assert.ok(Math.abs(sampleMotionCurve(segments, 0.5) - 0.5) < 1e-9)
  assert.ok(Math.abs(sampleMotionCurve(segments, 1.5) - 0.5) < 0.02)
  assert.equal(sampleMotionCurve(segments, 2.5), 0)
  assert.equal(sampleMotionCurve(segments, 9), 0.5)
  assert.equal(parseMotionClip({Meta: {Duration: 1}, Curves: [{Target: 'PartOpacity', Id: 'x', Segments: [0, 1]}]}), null)
  assert.equal(LIVE2D_GESTURE_FILES.length, 6)

  const player = new Live2DGesturePlayer((_g, part) => part === 'enter' ? 1 : 1.2)
  assert.equal(player.update(0.1), null)
  player.want('chest')
  let frame = player.update(0.5)
  assert.deepEqual([frame?.gesture, frame?.part], ['chest', 'enter'])
  for (let i = 0; i < 10; i++) frame = player.update(0.1)
  assert.deepEqual([frame?.part, frame?.time, player.phase], ['enter', 1, 'hold'])
  player.want('point')
  frame = player.update(0.1)
  assert.deepEqual([frame?.gesture, frame?.part], ['chest', 'exit'], 'chest leaves before point enters')
  for (let i = 0; i < 12; i++) frame = player.update(0.1)
  frame = player.update(0.1)
  assert.deepEqual([frame?.gesture, frame?.part], ['point', 'enter'])
  // Interrupted while entering: the exit starts from the matching point.
  player.want(null)
  frame = player.update(0)
  assert.ok(frame!.part === 'exit' && frame!.time > 0.9, `exit from ${frame!.time}`)
  assert.equal(live2dLookFor('getit').gesture, 'point')
  assert.ok(live2dLookFor('getit').toggles?.includes('竖食指开'), 'toggle fallback for older imports')
})

test('Live2D desktop sizes fit short and narrow windows with a matching image/collision box', async () => {
  const {live2dWidgetGeometry} = await import('../lib/client/poses.js')
  for (const [width,height] of [[1280,800],[600,480],[320,600]]) {
    for (const scale of [.6,1.2,2,2.6]) {
      const g = live2dWidgetGeometry(width,height,scale,.5773)
      assert.ok(g.stageHeight <= height - 95)
      assert.ok(g.stageWidth <= width - 31)
      assert.equal(g.imageHeight,g.stageHeight)
      assert.ok(g.imageWidth <= g.stageWidth)
    }
  }
  assert.ok(live2dWidgetGeometry(1280,1000,1.4,null).stageHeight > live2dWidgetGeometry(1280,1000,1,null).stageHeight)
})


test('Live2D saved model upgrade hint checks both motion metadata and stored files', async()=>{
  const {live2dNeedsReimport}=await import('../lib/client/live2d-package.js')
  const {LIVE2D_MOTION_FILES}=await import('../lib/client/live2d-motion.js')
  const files:Record<string,Blob>={};const motions:Record<string,string>={}
  assert.equal(live2dNeedsReimport(null),false)
  assert.equal(live2dNeedsReimport({files}),true)
  for(const name of LIVE2D_MOTION_FILES){motions[name]=name+'.motion3.json';files[motions[name]]=new Blob(['{}'])}
  assert.equal(live2dNeedsReimport({files,motions}),false)
  delete files[motions[LIVE2D_MOTION_FILES[0]]]
  assert.equal(live2dNeedsReimport({files,motions}),true)
})

test('Live2D decoded bitmap cache closes native images after expiry and decodes anew', async t=>{
  const {live2dSourceFor}=await import('../lib/client/live2d-package.js')
  t.mock.timers.enable({apis:['setTimeout']})
  let decoded=0,closed=0
  const original=Object.getOwnPropertyDescriptor(globalThis,'createImageBitmap')
  Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,value:async()=>{decoded++;return {close(){closed++}}}})
  try{
    const source=live2dSourceFor({modelPath:'m',files:{img:new Blob(['image'])},expressions:{},name:'test',bytes:5,savedAt:0})
    const first=await source.image('img')
    assert.equal(await source.image('img'),first);assert.equal(decoded,1)
    t.mock.timers.tick(30000);await Promise.resolve();await Promise.resolve()
    assert.equal(closed,1)
    assert.notEqual(await source.image('img'),first);assert.equal(decoded,2)
    t.mock.timers.tick(30000);await Promise.resolve();await Promise.resolve();assert.equal(closed,2)
  }finally{if(original)Object.defineProperty(globalThis,'createImageBitmap',original);else Reflect.deleteProperty(globalThis,'createImageBitmap')}
})


test('Live2D clock simulates actual elapsed time at 60/120/144 Hz without growing physics debt', async () => {
  const {Live2DFrameClock} = await import('../lib/client/live2d-motion.js')
  for (const hz of [60, 120, 144]) for (const fps of [15, 30, 60]) {
    const clock = new Live2DFrameClock(); clock.reset(0)
    let total = 0, count = 0, last = 0
    for (let i = 1; i <= hz * 300; i++) {
      const now = i * 1000 / hz, dt = clock.tick(now, fps)
      if (dt !== null) {total += dt; count++; last = now}
    }
    assert.ok(Math.abs(total - last / 1000) < 1e-7, `${hz} Hz / ${fps} fps: simulation ${total} vs wall ${last/1000}`)
    assert.ok(Math.abs(count - 300 * fps) <= 1, `${hz} Hz / ${fps} fps: ${count} frames`)
  }
  const clock = new Live2DFrameClock(); clock.reset(0)
  let total = 0, last = 0
  for (let i = 1; i <= 144 * 180; i++) {
    const now = i * 1000 / 144, fps = i < 144 * 45 ? 30 : i < 144 * 58 ? 60 : 30
    const dt = clock.tick(now, fps)
    if (dt !== null) {total += dt; last = now}
  }
  assert.ok(Math.abs(total - last / 1000) < 1e-7, 'changing the rate does not duplicate time')
  clock.reset(600000)
  assert.ok(clock.tick(600034, 30)! < 0.035, 'resuming does not simulate hidden time')
  assert.equal(clock.tick(610000, 30), 0.1, 'a long stall is bounded')
})

test('Live2D indexed sampling preserves boundaries, reverse seeking and all segment types', async () => {
  const {sampleMotionCurve} = await import('../lib/client/live2d-motion.js')
  const curve = [0, 0, 0, 1, 2, 1, 1.3, 2, 1.7, 0, 2, 0, 2, 3, 5, 3, 4, 9]
  for (let n = 0; n < 50; n++) {
    for (const t of [5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0, -1]) {
      const value = sampleMotionCurve(curve, t)
      if (t <= 1) assert.equal(value, Math.max(0, t) * 2)
      else if (t === 1.5) assert.ok(Math.abs(value - 1) < 0.0001)
      else if (t <= 3) assert.equal(value, 0)
      else assert.equal(value, 9)
    }
  }
  assert.equal(sampleMotionCurve([0, 7], 100), 7)
  const long = [0, 0]
  for (let i = 1; i <= 1000; i++) long.push(0, i, i * 2)
  for (const t of [999.5, 0.5, 500.25, 1000, 1001]) assert.equal(sampleMotionCurve(long, t), Math.min(t, 1000) * 2)
})

test('Carrying bends arms and follows the hand without pumping the hips, then settles', async () => {
  const {Live2DDriver} = await import('../lib/client/live2d-motion.js')
  const driven = new Live2DDriver(1), control = new Live2DDriver(1)
  const input = {dt: 1/60, motion: 1, look: {held: true}, pointer: null, talking: 0}
  const ys: number[] = [], xs: number[] = []
  for (let i = 0; i < 180; i++) {
    const d = driven.update(input)
    if (i > 90) {ys.push(d.PositionY); xs.push(d.AngleX)}
    control.update(input)
  }
  assert.ok(Math.max(...ys) - Math.min(...ys) < 1.5, 'hips no longer bounce to animate the arms')
  assert.ok(Math.max(...xs) - Math.min(...xs) > 1, 'head remains expressive')
  driven.setDangle(0, {x: 800, y: -800})
  let moved, still
  for (let i = 0; i < 60; i++) {moved = driven.update(input); still = control.update(input)}
  assert.ok(moved!.PositionX < still!.PositionX - 0.8)
  assert.ok(Math.abs(moved!.PositionY - still!.PositionY) < 0.01)
  assert.ok(moved!.AngleY < still!.AngleY - 2)
  driven.setDangle(0)
  for (let i = 0; i < 360; i++) {
    moved = driven.update({...input, look: {held: false}})
    still = control.update({...input, look: {held: false}})
  }
  for (const key of ['AngleX', 'AngleY', 'PositionX', 'PositionY', 'PositionZ'] as const) assert.ok(Math.abs(moved![key] - still![key]) < 0.001, key)
})


test('Chest boundary reaction covers up, interrupts idle performances and releases the arms', async () => {
  const {Live2DDriver} = await import('../lib/client/live2d-motion.js')
  const driver = new Live2DDriver(5)
  const guarded = live2dLookFor('shy', {state:'IDLE', guardChest:true})
  assert.equal(guarded.guardChest,true);assert.equal(guarded.idle,false);assert.equal(guarded.gesture,undefined)
  let d
  for(let i=0;i<120;i++) d=driver.update({dt:1/60,motion:1,look:guarded,pointer:null,talking:0})
  assert.ok(d!.armCover>0.99)
  assert.equal(d!.event,'');assert.equal(d!.performance,'')
  for(let i=0;i<240;i++) d=driver.update({dt:1/60,motion:1,look:{idle:true},pointer:null,talking:0})
  assert.ok(d!.armCover<0.001)
})

test('Live2D chat: she listens while the user types, thinks, talks in phrases and rounds the answer off', async () => {
  const {Live2DDriver, LIVE2D_CHAT} = await import('../lib/client/live2d-motion.js')
  const idle = live2dLookFor('Maid', {state: 'IDLE'})
  const run = (driver: any, seconds: number, input: any, each?: (d: any, t: number) => void) => {
    let d: any
    for (let i = 0; i < seconds * 20; i++) { d = driver.update({dt: 0.05, motion: 1, pointer: null, talking: 0, ...(typeof input === 'function' ? input(i * 0.05) : input)}); each?.(d, i * 0.05) }
    return d
  }
  // Listening: looks at the input box (down and to the left here), leans in, ignores the pointer, nods once at a pause.
  const listener = new Live2DDriver(11), control = new Live2DDriver(11)
  const l = run(listener, 2, {look: idle, typing: {x: -0.8, y: -0.9, since: 0.1}, pointer: {x: 1, y: 1, still: 0}})
  const c = run(control, 2, {look: idle})
  assert.ok(l.ParamEyeBallX < -0.4 && l.ParamEyeBallY < -0.4, 'eyes on the input box, not the pointer')
  assert.ok(l.LeanInput - c.LeanInput > 5 && l.AngleX < c.AngleX - 5, 'leans in and turns towards it')
  assert.equal(l.event, '', 'no idle event while listening')
  let dip = 0
  run(listener, 1.6, (t: number) => ({look: idle, typing: {x: -0.8, y: -0.9, since: 0.1 + t}}), d => { dip = Math.min(dip, d.AngleY - l.AngleY) })
  assert.ok(dip < -2.5, `nods at a typing pause (${dip})`)
  const after = run(listener, 6, {look: idle, typing: {x: -0.8, y: -0.9, since: LIVE2D_CHAT.listenFor + 1}})
  assert.ok(Math.abs(after.LeanInput) < 1.5, 'stops listening after the typing ends')
  // Not while answering, and not with reduced motion.
  const answering = live2dLookFor('Answering', {state: 'ANSWERING'})
  const busy = new Live2DDriver(11), busyControl = new Live2DDriver(11)
  assert.equal(run(busy, 2, {look: answering, typing: {x: -1, y: -1, since: 0}}).LeanInput, run(busyControl, 2, {look: answering}).LeanInput)
  const calm = new Live2DDriver(11), calmControl = new Live2DDriver(11)
  assert.deepEqual(run(calm, 2, {look: idle, motion: 0, typing: {x: -1, y: -1, since: 0}}), run(calmControl, 2, {look: idle, motion: 0}))

  // Thinking: perks up at once, then spends time on both sides.
  const thinker = new Live2DDriver(3), still = new Live2DDriver(3)
  const think = live2dLookFor('Think3', {state: 'REASONING'}), plain = live2dLookFor('Think3')
  let rise = 0, left = 0, right = 0
  const base: number[] = []
  run(still, 30, {look: plain}, d => { base.push(d.PositionX) })
  let n = 0
  run(thinker, 30, {look: think}, (d, t) => { if (t < 0.6) rise = Math.max(rise, d.PositionY); const dx = d.PositionX - base[n++]; if (dx > 2) right++; if (dx < -2) left++ })
  assert.ok(rise > 2, 'perks up when thinking starts')
  assert.ok(left > 40 && right > 40, `changes sides while thinking (${left}/${right})`)

  // Speaking: several beats in 20 s, then a wrap-up nod and smile; a short blip earns none.
  const speaker = new Live2DDriver(5)
  let beats = 0, low = false
  run(speaker, 20, {look: answering, talking: 1}, d => { const down = d.AngleY < -5.4; if (down && !low) beats++; low = down })
  assert.ok(beats >= 3 && beats <= 14, `phrase beats (${beats})`)
  let smile = 0, lively = false
  run(speaker, 1.5, {look: idle}, d => { smile = Math.max(smile, d.smile); lively ||= d.lively })
  assert.ok(smile > 0.4 && lively, 'rounds the answer off')
  const blip = new Live2DDriver(5)
  run(blip, 0.5, {look: answering, talking: 1})
  let blipSmile = 0
  run(blip, 1.5, {look: idle}, d => { blipSmile = Math.max(blipSmile, d.smile) })
  assert.ok(blipSmile < 0.3, 'no wrap-up after a blip')
  const quiet = new Live2DDriver(5)
  run(quiet, 5, {look: answering, talking: 1, motion: 0})
  assert.equal(run(quiet, 0.2, {look: idle, motion: 0}).lively, false, 'reduced motion: no wrap-up')
})

test('Live2D idle life: time-of-day performances, no repeats within two, and drowsiness that wakes with a start', async () => {
  const {Live2DDriver, LIVE2D_PERFORMANCES, LIVE2D_DROWSY, LIVE2D_IDLE_EVENTS, performanceBias} = await import('../lib/client/live2d-motion.js')
  const idle = live2dLookFor('Maid', {state: 'IDLE'})
  for (const name of ['window', 'hair', 'skirt']) assert.ok(LIVE2D_IDLE_EVENTS.some((e: any) => e.name === name), name)
  assert.ok(performanceBias('nod-off', 2) > performanceBias('hum', 2) && performanceBias('window-gaze', 15) > 1 && performanceBias('doze', undefined) === 1)
  const play = (hour: number | undefined, seed: number) => {
    const driver = new Live2DDriver(seed), seen: string[] = []
    let last = ''
    for (let i = 0; i < 3600 * 10; i++) { const d = driver.update({dt: 0.1, motion: 1, look: idle, pointer: null, talking: 0, hour}); if (d.performance && d.performance !== last) seen.push(d.performance); last = d.performance }
    return seen
  }
  const day = play(undefined, 5)
  assert.ok(day.length >= 30, `performances in an hour (${day.length})`)
  for (let i = 2; i < day.length; i++) assert.ok(day[i] !== day[i - 1] && day[i] !== day[i - 2], `no repeat within two (${day.slice(i - 2, i + 1)})`)
  assert.equal(new Set(day).size, LIVE2D_PERFORMANCES.length, 'every performance comes up')
  const sleepy = (list: string[]) => list.filter(n => n === 'doze' || n === 'nod-off' || n === 'yawn').length / list.length
  assert.ok(sleepy(play(2, 5)) > sleepy(play(20, 5)) + 0.1, 'more sleepy pieces at night')

  // Drowsy after minutes alone, sooner at night; the pointer wakes her at once.
  const eyes = (hour: number, seconds: number) => {
    const driver = new Live2DDriver(8), control = new Live2DDriver(8)
    let d: any, c: any
    for (let i = 0; i < seconds * 10; i++) { d = driver.update({dt: 0.1, motion: 1, look: idle, pointer: null, talking: 0, hour}); c = control.update({dt: 0.1, motion: 1, look: idle, pointer: {x: 0, y: 0, still: 0}, talking: 0, hour}) }
    return {driver, d}
  }
  const night = eyes(2, LIVE2D_DROWSY.night + LIVE2D_DROWSY.over + 20), noon = eyes(12, LIVE2D_DROWSY.night + LIVE2D_DROWSY.over + 20)
  assert.ok(night.d.eyeOpen < noon.d.eyeOpen - 0.3 || night.d.performance, `drowsy at night (${night.d.eyeOpen} / ${noon.d.eyeOpen})`)
  let woke = false, d: any
  for (let i = 0; i < 20; i++) { d = night.driver.update({dt: 0.1, motion: 1, look: idle, pointer: {x: 0.5, y: 0, still: 0}, talking: 0, hour: 2}); woke ||= d.lively && d.brow > 0.3 }
  assert.ok(woke && d.eyeOpen > -0.1, 'wakes with a start and opens her eyes')
  const calm = new Live2DDriver(8)
  for (let i = 0; i < 4000; i++) d = calm.update({dt: 0.1, motion: 0, look: idle, pointer: null, talking: 0, hour: 2})
  assert.equal(d.eyeOpen, 0, 'reduced motion: not drowsy')
})

test('Live2D arms: no hand on the hip, a stretch that leads with the forearms, a wave, and nothing while something else owns the arms', async () => {
  const {Live2DDriver, LIVE2D_PERFORMANCES, LIVE2D_IDLE_EVENTS} = await import('../lib/client/live2d-motion.js')
  // The hand-on-hip pose was removed (the hand swings round from behind her): no idle event moves the arms.
  for (const e of LIVE2D_IDLE_EVENTS as any[]) for (const u of [0.25, 0.5, 0.75]) for (const side of [1, -1]) {
    const o = e.at(side, u)
    assert.ok(!o.lu && !o.lf && !o.ru && !o.rf, `${e.name}: idle events leave the arms alone`)
  }
  // Poses come from the definitions themselves: sample every piece through its whole length.
  for (const def of LIVE2D_PERFORMANCES as any[]) for (const side of [1, -1]) {
    let upperSeen = false
    for (let t = 0; t <= def.duration; t += 0.05) {
      const o = def.at(t, side).o
      for (const [upper, fore] of [[o.lu ?? 0, o.lf ?? 0], [o.ru ?? 0, o.rf ?? 0]]) {
        assert.ok(upper >= -0.001 && upper <= 1 && fore >= -1 && fore <= 0.5001, `${def.name}: arm inputs in the rendered range (${upper}, ${fore})`)
        // The forearm leads: the upper arm never lifts while the forearm is still (nearly) at rest.
        if (upper > 0.05) { upperSeen = true; assert.ok(Math.abs(fore) > 0.2, `${def.name} t=${t.toFixed(2)}: forearm first (${upper}, ${fore})`) }
      }
    }
    if (def.name === 'yawn' || def.name === 'wave') assert.ok(upperSeen, `${def.name} raises an arm`)
    const end = def.at(def.duration, side).o
    for (const key of ['lu', 'lf', 'lw', 'ru', 'rf', 'rw']) assert.ok(Math.abs(end[key] ?? 0) < 0.02, `${def.name} ends with the arms at rest`)
  }
  // Thinking: the arms stay down (no hand on the hip); a gesture, carrying or reduced motion keeps the arms out of it too.
  const run = (look: any, seconds: number, motion = 1) => { const d = new Live2DDriver(6); let r: any; for (let i = 0; i < seconds * 20; i++) r = d.update({dt: 0.05, motion, look, pointer: null, talking: 0}); return r }
  const think = live2dLookFor('Think2', {state: 'REASONING'})
  const t = run(think, 8)
  assert.ok(Math.abs(t.arms.lf) + Math.abs(t.arms.rf) + Math.abs(t.arms.lu) + Math.abs(t.arms.ru) < 0.01, 'thinking: arms at rest')
  for (const look of [{...think, gesture: 'point'}, {...think, held: true}, {...think, guardChest: true}]) { const r = run(look, 8); assert.ok(Math.abs(r.arms.lf) + Math.abs(r.arms.rf) < 0.01, 'arms left to their owner') }
  const calm = run(think, 8, 0)
  assert.equal(calm.arms.lf, 0); assert.equal(calm.arms.rf, 0)
})

test('Live2D smoothness: the head eases in from rest, settles with a small overshoot, and the arms never overshoot', async () => {
  const {Live2DDriver} = await import('../lib/client/live2d-motion.js')
  // A head turn the look asks for: compare with a driver that keeps looking ahead (same seed, same sways).
  const turned = new Live2DDriver(12), ahead = new Live2DDriver(12)
  const base = {}, look = {angle: {x: 20}}
  for (let i = 0; i < 40; i++) { turned.update({dt: 1 / 60, motion: 1, look: base, pointer: null, talking: 0}); ahead.update({dt: 1 / 60, motion: 1, look: base, pointer: null, talking: 0}) }
  const path: number[] = []
  for (let i = 0; i < 180; i++) path.push(turned.update({dt: 1 / 60, motion: 1, look, pointer: null, talking: 0}).AngleX - ahead.update({dt: 1 / 60, motion: 1, look: base, pointer: null, talking: 0}).AngleX)
  const speed = path.map((p, i) => i ? p - path[i - 1] : p)
  const fastest = speed.indexOf(Math.max(...speed))
  assert.ok(speed[0] < Math.max(...speed) * 0.35, 'starts from rest, not at full speed')
  assert.ok(fastest >= 4 && fastest <= 20, `eases in (${fastest})`)
  const peak = Math.max(...path)
  assert.ok(peak > 20.05 && peak < 21.2, `settles with a small overshoot (${peak})`)
  assert.ok(Math.abs(path[179] - 20) < 0.15, 'and comes to rest on the target')
  // The same answer on long frames (15 fps in the background).
  const slow = new Live2DDriver(12), slowAhead = new Live2DDriver(12)
  let s = 0
  for (let i = 0; i < 45; i++) s = slow.update({dt: 1 / 15, motion: 1, look, pointer: null, talking: 0}).AngleX - slowAhead.update({dt: 1 / 15, motion: 1, look: base, pointer: null, talking: 0}).AngleX
  assert.ok(Math.abs(s - 20) < 0.3, `stable at 15 fps (${s})`)
  // Arms: a forearm move to -0.5 and back never goes past the pose, and the driver asks for smooth frames only while the arm travels.
  const d: any = new Live2DDriver(12), idle = live2dLookFor('Maid', {state: 'IDLE'})
  for (let i = 0; i < 120; i++) d.update({dt: 1 / 60, motion: 1, look: idle, pointer: null, talking: 0})
  const plateau = (u: number) => { const e = Math.min(1, u / 0.22, (1 - u) / 0.22); return e <= 0 ? 0 : Math.sin(Math.PI * e / 2) ** 2 }
  const probe = {name: 'probe', duration: [5, 5], at: (_s: number, u: number) => ({lf: -0.5 * plateau(u)})}
  d.event = {def: probe, side: 1, start: d.time, duration: 5}; d.nextPerformanceAt = 1e9
  let low = 0, idleMoving = 0
  for (let i = 0; i < 330; i++) { const r = d.update({dt: 1 / 60, motion: 1, look: idle, pointer: null, talking: 0}); low = Math.min(low, r.arms.lf); if (r.moving) idleMoving++ }
  assert.ok(low < -0.47 && low >= -0.5001, `reaches the pose without overshoot (${low})`)
  assert.equal(idleMoving, 0, 'idling alone stays at the ambient frame rate')
  const thinker: any = new Live2DDriver(12), think = live2dLookFor('Think2', {state: 'REASONING'})
  let movingFrames = 0
  for (let i = 0; i < 600; i++) if (thinker.update({dt: 1 / 60, motion: 1, look: think, pointer: null, talking: 0}).moving) movingFrames++
  assert.ok(movingFrames > 30 && movingFrames < 360, `in conversation, smooth frames only while something travels (${movingFrames}/600)`)
})

test('Edge peeking replaces props and idle performances without changing the conversational state',()=>{
 for(const state of ['IDLE','REASONING','ANSWERING','EATING'] as const){
  const look=live2dLookFor('baifan',{state,edgePeek:true,guardChest:true})
  assert.equal(look.edgePeek,true);assert.equal(look.walk,false);assert.equal(look.idle,false)
  assert.equal(look.gesture,undefined);assert.equal(look.guardChest,undefined);assert.equal(look.toggles,undefined)
 }
 assert.equal(live2dLookFor('Maid',{state:'IDLE'}).edgePeek,undefined)
})

test('Live2D folder drop reads every browser batch with relative paths, supports plain files and propagates read errors',async()=>{
  const files=Array.from({length:151},(_,i)=>new File(['{}'],'file-'+i+'.json'))
  const entries=files.map((file,i)=>({isFile:true,isDirectory:false,fullPath:'/DeepSeek/Sub/'+file.name,file(ok:any){ok(file)}}))
  let batch=0
  const directory={isDirectory:true,isFile:false,fullPath:'/DeepSeek',createReader(){return {readEntries(ok:any){ok(batch++===0?entries.slice(0,100):batch===2?entries.slice(100):[])}}}}
  const result=await live2dFilesFromDrop({items:[{webkitGetAsEntry:()=>directory}]} as any)
  assert.equal(result.length,151);assert.equal(result[150].webkitRelativePath,'DeepSeek/Sub/file-150.json')
  assert.equal(batch,3,'Chromium folders are returned in batches, not one read')
  assert.deepEqual(await live2dFilesFromDrop({items:[],files:[files[0]]} as any),[files[0]])
  const bad={isDirectory:true,createReader(){return {readEntries(_ok:any,fail:any){fail(new Error('access denied'))}}}}
  await assert.rejects(live2dFilesFromDrop({items:[{webkitGetAsEntry:()=>bad}]} as any),/access denied/)
})

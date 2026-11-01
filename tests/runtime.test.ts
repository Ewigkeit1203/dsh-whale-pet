import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { PetStateMachine } from '../lib/client/state-machine.js'

// Exercise the real browser artifact as well as the TypeScript compiler output.
function loadBundle(storage?: { getItem(key: string): string | null; setItem(key: string, value: string): void }, frames?: Array<() => void>) {
  let plugin: any
  let hookIndex = 0
  const hooks: any[] = []
  const viewEffects: any[] = []
  const React = {
    createElement: (type: any, props: any, ...children: any[]) => ({ type, props: props || {}, children }),
    Fragment: 'fragment',
    useState(initial: any) {
      const index = hookIndex++
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial
      return [hooks[index], (value: any) => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value }]
    },
    useRef(value: any) { const index = hookIndex++; if (!(index in hooks)) hooks[index] = { current: value }; return hooks[index] },
    useMemo: (fn: any) => fn(),
    useCallback: (fn: any) => fn,
    useEffect(callback: any) { viewEffects.push(callback) },
  }
  const listeners = new Map<string, Set<any>>()
  const listen = (name: string, callback: any) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(callback) }
  const unlisten = (name: string, callback: any) => listeners.get(name)?.delete(callback)
  class FakeElement { closest(selector: string) { return selector.includes('data-chat-node-key') ? this : null } }
  const context: any = {
    requestAnimationFrame: frames ? (callback: () => void) => frames.push(callback) : undefined,
    Element: FakeElement,
    console, setTimeout, clearTimeout, setInterval, clearInterval, localStorage: storage,
    window: { addEventListener: listen, removeEventListener: unlisten, innerWidth: 1280, innerHeight: 800, __ModuleLoader__: {
      load(module: any) { plugin = module.factory(() => React) },
    } },
    document: { hidden: false, hasFocus: () => true, addEventListener: listen, removeEventListener: unlisten, getElementById: () => ({}), querySelector: () => null, querySelectorAll: () => [] },
  }
  const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
    .replace('const DialogueContent =', 'globalThis.BundleAudio = PetVoice; const DialogueContent =')
    .replace('const MAIDEN_PATH =', 'globalThis.BundleStateMachine = PetStateMachine; const MAIDEN_PATH =')
  vm.runInNewContext(bundle, context)
  let overlay: any
  const effects: any[] = []
  const mount = () => {
    plugin.apply({ slots: {
      inject(_name: string, callback: any) { callback() },
      register(_config: any, render: any) { overlay = render() },
    }, effect(callback: any) { effects.push(callback) } })
    return overlay.props.stateMachine
  }
  return { FakeElement, dispatch(name: string, event: any) { for(const callback of listeners.get(name) || [])callback(event) }, StateMachine: context.BundleStateMachine, Audio: context.BundleAudio, viewEffects, mount,
    render() { hookIndex = 0; viewEffects.length = 0; return overlay.type(overlay.props) }, effects }
}

for (const [label, make] of [
  ['compiled source', () => PetStateMachine],
  ['browser bundle', () => loadBundle().StateMachine],
] as const) {
  test(`${label}: delayed walk completion cannot interrupt streaming or reasoning`, t => {
    const StateMachine = make()
    const sm = new StateMachine()
    t.after(() => sm.dispose())
    sm.setWandering(true)
    sm.setStreaming(true)
    sm.finishWanderingWithEating()
    sm.triggerPostOutputEating()
    assert.equal(sm.getStatus().state, 'ANSWERING')
    assert.equal(sm.getStatus().pose, 'answering')
    sm.setStreaming(false)
    sm.setReasoning(true)
    sm.finishWanderingWithEating()
    assert.equal(sm.getStatus().state, 'REASONING')
    assert.match(sm.getStatus().pose, /^think[1-5]$/)
  })

  test(`${label}: stale idle debounce cannot overwrite a resumed busy state`, t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
    const StateMachine = make()
    const sm = new StateMachine()
    t.after(() => sm.dispose())
    sm.setReasoning(true)
    sm.setReasoning(false)
    sm.setReasoning(true)
    t.mock.timers.tick(400)
    assert.equal(sm.getStatus().state, 'REASONING')
  })

  test(`${label}: unloading mid-blink clears all animation callbacks`, t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
    const StateMachine = make()
    const sm = new StateMachine()
    sm.performBlinkCycle(() => assert.fail('blink callback survived dispose'))
    sm.dispose()
    t.mock.timers.tick(100000)
  })

  test(`${label}: waking lonely sajiao immediately notifies the UI`, t => {
    const StateMachine = make()
    const sm = new StateMachine()
    t.after(() => sm.dispose())
    let pose = ''
    sm.subscribe((status: any) => { pose = status.pose })
    sm.triggerInactivitySajiao()
    assert.equal(pose, 'sajiao')
    sm.resetActivity()
    assert.equal(pose, 'default')
  })

  test(`${label}: repeated host inspections do not postpone lonely behavior forever`, t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
    const StateMachine = make()
    const sm = new StateMachine()
    t.after(() => sm.dispose())
    for (let i = 0; i < 61; i++) {
      sm.setStreaming(false)
      sm.setReasoning(false)
      t.mock.timers.tick(1000)
    }
    assert.equal(sm.getStatus().pose, 'sajiao')
  })
}

const walk = (node: any): any[] => !node || typeof node !== 'object' ? [] : [node, ...(node.children || []).flat(Infinity).flatMap(walk)]

test('browser bundle: widget marks its subtree and keeps the full portrait on screen', t => {
  const runtime = loadBundle()
  const sm = runtime.mount()
  t.after(() => sm.dispose())
  const widget = runtime.render()
  assert.equal(widget.props['data-whale-pet'], 'widget')
  assert.ok(Number.parseFloat(widget.props.style.top) <= 800 - 480)
  const puppetNode = walk(widget).find(node => node.props.imgSrc)
  const puppet = puppetNode.type(puppetNode.props)
  assert.match(puppet.props.style.transform, /perspective/)
  assert.equal(puppet.children[0].props.style, undefined, 'breathing and parallax use different transform layers')
})

test('browser bundle: Chinese IME Enter does not send or clear the draft', t => {
  const runtime = loadBundle()
  const sm = runtime.mount()
  t.after(() => sm.dispose())
  sm.setGalGameMode(true)
  const theatre = runtime.render()
  const input = walk(theatre).find(node => node.props.className === 'galgameInput')
  assert.ok(input)
  input.props.onKeyDown({ key: 'Enter', keyCode: 229, nativeEvent: { isComposing: true },
    preventDefault() { assert.fail('IME confirmation was treated as Send') } })
  assert.equal(sm.getStatus().isReasoning, false)
})

test('browser bundle: settings switch language and theme on pet roots only', t => {
  const runtime = loadBundle()
  const sm = runtime.mount()
  t.after(() => sm.dispose())
  let tree = runtime.render()
  const settings = walk(tree).find(node => node.type === 'button' && node.children.includes('设置'))
  assert.ok(settings)
  settings.props.onClick()
  tree = runtime.render()
  const english = walk(tree).find(node => node.type === 'button' && node.children.includes('English'))
  assert.ok(english)
  english.props.onClick()
  tree = runtime.render()
  assert.equal(tree.props.lang, 'en')
  const dark = walk(tree).find(node => node.props['aria-label'] === 'Dark theme')
  assert.ok(dark)
  dark.props.onClick()
  tree = runtime.render()
  assert.equal(tree.props['data-pet-theme'], 'dark')
  assert.ok(walk(tree).some(node => node.children.includes('Companionship')))
})

test('browser bundle: snapped range resizes only the sprite and leaves controls unscaled', t => {
  const runtime = loadBundle()
  const sm = runtime.mount()
  t.after(() => sm.dispose())
  let tree = runtime.render()
  walk(tree).find(node => node.type === 'button' && node.children.includes('设置')).props.onClick()
  tree = runtime.render()
  const steps = walk(tree).find(node => node.props.className === 'petSizeSlider')
  const slider = walk(steps).find(node => node.type === 'input')
  assert.equal(slider.props.step, '1')
  assert.equal(slider.props.max, '4')
  assert.equal(slider.props['aria-valuetext'], '100%')
  const before = walk(tree).find(node => String(node.props.className).startsWith('petSpriteSize')).props.style
  slider.props.onChange({ target: { value: '0' } })
  tree = runtime.render()
  const sprite = walk(tree).find(node => String(node.props.className).startsWith('petSpriteSize'))
  assert.equal(Number.parseFloat(sprite.props.style.height), Number.parseFloat(before.height) / 2)
  assert.equal(sprite.props.style.zoom, undefined, 'no CSS zoom: the hit area and collision box are the drawn box')
  const drawer = walk(tree).find(node => node.props.className === 'settingsDrawer')
  assert.equal(drawer.props.style.position, 'fixed')
  assert.equal(drawer.props.style.width, 340, 'controls keep their size')
  assert.equal(walk(tree).find(node => node.props['aria-valuetext'] === '50%').props.value, 0)
  const puppet = walk(tree).find(node => node.props.imgSrc)
  assert.equal(puppet.props.box.height, Number.parseFloat(sprite.props.style.height), 'Maid fills the stage height at scale 1')
})

test('browser bundle: Hide restores the theatre, Log uses loaded messages and mute is available', t => {
  const runtime = loadBundle()
  const sm = runtime.mount()
  t.after(() => sm.dispose())
  sm.setGalGameMode(true)
  let tree = runtime.render()
  walk(tree).find(node => node.children.includes('隐藏界面，欣赏立绘')).props.onClick()
  tree = runtime.render()
  assert.equal(walk(tree).some(node => node.props.className === 'galgameTheatreBox'), false)
  walk(tree).find(node => node.props.className === 'petRestore').props.onClick()
  tree = runtime.render()
  assert.ok(walk(tree).some(node => node.props.className === 'galgameTheatreBox'))
  assert.ok(walk(tree).some(node => node.children.includes('开启人物音效')))
  walk(tree).find(node => node.children.includes('回顾')).props.onClick()
  tree = runtime.render()
  assert.ok(walk(tree).some(node => node.props.className === 'petLog'))
})

test('browser bundle: voice follows newly streamed prose only, and is silent while muted', t => {
  const runtime = loadBundle()
  const sm = runtime.mount()
  t.after(() => sm.dispose())
  const spoken: string[] = []
  let cuts = 0
  runtime.Audio.prototype.speak = function (text: string) { spoken.push(text); return 1 }
  runtime.Audio.prototype.cut = function () { cuts++ }
  const voiceEffect = () => runtime.viewEffects.find(callback => String(callback).includes('appendedSpeech'))
  runtime.render(); t.after(runtime.viewEffects.find(fn => String(fn).includes('stateMachine.subscribe'))())
  sm.setStreaming(true)
  sm.setLatestDialogue('你好')
  runtime.render(); voiceEffect()()
  sm.setLatestDialogue('你好，世界')
  runtime.render(); voiceEffect()()
  assert.deepEqual(spoken, [], 'muted by default')
  let tree = runtime.render()
  walk(tree).find(node => node.children.includes('设置')).props.onClick()
  tree = runtime.render()
  const label = walk(tree).find(node => node.type === 'label' && walk(node).some(child => child.children?.includes('人物音效')))
  walk(label).find(node => node.type === 'input').props.onChange({ target: { checked: true } })
  runtime.render(); voiceEffect()()
  sm.setLatestDialogue('你好，世界。今天\n```js\nlet secret = 1')
  runtime.render(); voiceEffect()()
  assert.equal(spoken.length, 1)
  assert.match(spoken[0], /今天/)
  assert.doesNotMatch(spoken[0], /secret/, 'code is not voiced')
  sm.setStreaming(false)
  runtime.render()
  runtime.viewEffects.find(callback => String(callback).includes('!status.isStreaming && !revealDrivesVoice'))()
  assert.ok(cuts >= 1, 'stream end cuts the voice immediately')
})

test('browser bundle: reading fade recovers on pet hover, Alt alone controls click-through', t => {
 const runtime=loadBundle(); const sm=runtime.mount();t.after(()=>sm.dispose())
 runtime.render()
 const reading=runtime.viewEffects.find(fn=>String(fn).includes('const reading'))
 const cleanup=reading();t.after(cleanup)
 runtime.dispatch('pointermove',{type:'pointermove',target:new runtime.FakeElement()})
 let tree=runtime.render();assert.equal(tree.props['data-dimmed'],true)
 tree.props.onMouseEnter()
 tree=runtime.render();assert.equal(tree.props['data-dimmed'],false)
 const shortcuts=runtime.viewEffects.find(fn=>String(fn).includes('const down'))
 const remove=shortcuts();t.after(remove)
 runtime.dispatch('keydown',{key:'Alt',altKey:false})
 tree=runtime.render();assert.equal(tree.props['data-ghost'],true)
 runtime.dispatch('keyup',{key:'Alt'})
 tree=runtime.render();assert.equal(tree.props['data-ghost'],false)
})

test('browser bundle: settings and pet move as one group at the viewport edges (F02)', t => {
  const runtime = loadBundle(); const sm = runtime.mount(); t.after(() => sm.dispose())
  let tree = runtime.render()
  walk(tree).find(node => node.children.includes('设置')).props.onClick()
  for (const [x, y] of [[5000, 5000], [-5000, -5000], [5000, -5000], [-5000, 5000], [640, 400]]) {
    tree = runtime.render()
    walk(tree).find(node => node.props.imgSrc).props.onMouseDown({ button: 0, clientX: 600, clientY: 400 })
    runtime.render()
    const remove = runtime.viewEffects.find(fn => String(fn).includes('const cancelDrag'))()
    runtime.dispatch('mousemove', { clientX: x, clientY: y })
    runtime.dispatch('mousemove', { clientX: x + 40, clientY: y + 40 })
    tree = runtime.render()
    const pet = tree.props.style, drawer = walk(tree).find(node => node.props.className === 'settingsDrawer')
    assert.equal(drawer.props['data-mode'], 'tethered')
    const petLeft = Number.parseFloat(pet.left), petRight = petLeft + Number.parseFloat(pet.width)
    const panelLeft = drawer.props.style.left, panelRight = panelLeft + drawer.props.style.width
    assert.ok(panelRight <= petLeft - 12 || panelLeft >= petRight + 12, `panel ${panelLeft}-${panelRight} clear of pet ${petLeft}-${petRight}`)
    assert.ok(panelLeft >= 16 && panelRight <= 1280 - 16 && petLeft >= 16 && petRight <= 1280 - 16)
    runtime.dispatch('mouseup', { clientX: x + 40, clientY: y + 40 })
    remove()
  }
})

test('browser bundle: an old chibi preference renders the maiden portrait and no form switch is offered (F04)', t => {
  const store = new Map([['dsh-whale-pet.preferences.v1', JSON.stringify({ form: 'chibi', onboardingDone: true })]])
  const runtime = loadBundle({ getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) })
  const sm = runtime.mount(); t.after(() => sm.dispose())
  runtime.render()
  runtime.viewEffects.find(fn => String(fn).includes('effectiveForm'))()
  t.after(runtime.viewEffects.find(fn => String(fn).includes('stateMachine.subscribe'))())
  let tree = runtime.render()
  assert.equal(sm.getStatus().form, 'maiden')
  assert.equal(walk(tree).find(node => node.props.imgSrc).props.poseName, 'Maid')
  sm.setForm('chibi')
  tree = runtime.render()
  assert.equal(walk(tree).find(node => node.props.imgSrc).props.poseName, 'Maid', 'even a forced chibi state renders maiden while paused')
  walk(tree).find(node => node.children.includes('设置')).props.onClick()
  tree = runtime.render()
  const labels = walk(tree).flatMap(node => node.children.filter((child: any) => typeof child === 'string'))
  assert.ok(!labels.some((text: string) => /Q版|角色形态|Chibi/i.test(text)), 'no chibi entry in toolbar or settings')
  assert.ok(labels.includes('进入剧场模式'), 'theatre entry kept in the footer')
})

test('browser bundle: unread balance is shown as — with honest guidance, never as ¥0.00 (F05)', t => {
  const runtime = loadBundle(); const sm = runtime.mount(); t.after(() => sm.dispose())
  let tree = runtime.render()
  t.after(runtime.viewEffects.find(fn => String(fn).includes('stateMachine.subscribe'))())
  walk(tree).find(node => node.children.includes('设置')).props.onClick()
  tree = runtime.render()
  const card = walk(tree).find(node => node.props.className === 'petWalletCard')
  assert.equal(card.props['data-status'], 'unavailable')
  const text = walk(card).flatMap(node => node.children.filter((child: any) => typeof child === 'string')).join('')
  assert.ok(text.includes('—'))
  assert.ok(!text.includes('¥0.00'))
  assert.ok(text.includes('打开 DSH 账户设置'))
  sm.setBalances('¥5.00', '¥1.00')
  tree = runtime.render()
  assert.equal(walk(tree).find(node => node.props.className === 'petWalletCard').props['data-status'], 'live')
})

test('browser bundle: font size is continuously adjustable with a live numeric label', t=>{
 const runtime=loadBundle();const sm=runtime.mount();t.after(()=>sm.dispose());let tree=runtime.render()
 walk(tree).find(node=>node.children.includes('设置')).props.onClick();tree=runtime.render()
 const slider=walk(tree).find(node=>node.props.id==='pet-font')
 assert.equal(slider.props.type,'range');assert.equal(slider.props.step,'0.1')
 slider.props.onChange({target:{value:'18.6'}});tree=runtime.render()
 assert.ok(walk(tree).some(node=>node.type==='output' && node.children.includes(18.6)))
})
test('browser bundle: shaking uses the new Dizzy asset and returns to the normal portrait',t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const runtime=loadBundle();const sm=runtime.mount();t.after(()=>sm.dispose());let tree=runtime.render()
 walk(tree).find(node=>node.props.imgSrc).props.onMouseDown({button:0,clientX:900,clientY:400});runtime.render()
 const remove=runtime.viewEffects.find(fn=>String(fn).includes('const cancelDrag'))();t.after(remove)
 for(const x of [1200,700,1200,700])runtime.dispatch('mousemove',{clientX:x,clientY:400})
 runtime.dispatch('mouseup',{clientX:700,clientY:400});tree=runtime.render()
 assert.equal(walk(tree).find(node=>node.props.imgSrc).props.poseName,'Dizzy')
 t.mock.timers.tick(2500);tree=runtime.render()
 assert.equal(walk(tree).find(node=>node.props.imgSrc).props.poseName,'Maid')
})

const texts = (node: any) => walk(node).flatMap((n: any) => n.children.filter((c: any) => typeof c === 'string')).join('')

test('browser bundle: chatter uses the chosen name instead of 你 / 主人', t => {
  const store = new Map([['dsh-whale-pet.preferences.v1', JSON.stringify({ onboardingDone: true, userName: '小明', peakNotice: false })]])
  const runtime = loadBundle({ getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) })
  const sm = runtime.mount(); t.after(() => sm.dispose())
  runtime.render(); t.after(runtime.viewEffects.find(fn => String(fn).includes('stateMachine.subscribe'))())
  sm.triggerInactivitySajiao()
  const tree = runtime.render()
  const bubble = walk(tree).find((n: any) => n.props.className === 'speechBubble')
  assert.ok(bubble, 'lonely line shows a bubble')
  assert.match(texts(bubble), /小明/)
  assert.doesNotMatch(texts(bubble), /主人/)
})

test('browser bundle: announces 梁文峰 / 梁文谷 time and shows the period chip', t => {
  const runtime = loadBundle(); const sm = runtime.mount(); t.after(() => sm.dispose())
  runtime.render()
  runtime.viewEffects.find(fn => String(fn).includes('previousTierRef.current = tierNow'))()
  const tree = runtime.render()
  const bubble = walk(tree).find((n: any) => n.props.className === 'speechBubble')
  assert.match(texts(bubble), /现在是梁文(峰|谷)时间！/)
  const chip = walk(tree).find((n: any) => n.props.className === 'petTierChip')
  assert.ok(['peak', 'valley'].includes(chip.props['data-tier']))
})


test('hotfix: only composer text clicks enter theatre; controls and nested icons keep native actions', t => {
  const runtime = loadBundle(); const sm = runtime.mount(); t.after(() => sm.dispose())
  const cleanup = runtime.effects.find(fn => String(fn).includes('const isComposerElement'))()
  t.after(cleanup)
  const card = new runtime.FakeElement()
  const editor = new runtime.FakeElement()
  editor.closest = () => card
  const target = (kind: string) => {
    const node = new runtime.FakeElement()
    node.closest = (selector: string) => {
      if (selector === '[data-whale-pet]') return kind === 'pet' ? node : null
      if (selector.startsWith('button,')) return ['file', 'permission', 'model', 'svg', 'send'].includes(kind) ? node : null
      if (selector.startsWith('[data-composer-input]')) return ['editor', 'editor-child'].includes(kind) ? editor : null
      return null
    }
    return node
  }
  for (const kind of ['file', 'permission', 'model', 'svg', 'send', 'card', 'pet', 'unrelated']) {
    runtime.dispatch('click', { isTrusted: true, target: target(kind), preventDefault() { assert.fail('native action intercepted') } })
    assert.equal(sm.getStatus().isGalGameMode, false, kind)
    runtime.dispatch('focusin', { target: target(kind) })
    assert.equal(sm.getStatus().isInputFocused, false, kind + ' focus')
  }
  for (const kind of ['editor', 'editor-child']) {
    runtime.dispatch('click', { isTrusted: true, target: target(kind) })
    assert.equal(sm.getStatus().isGalGameMode, true, kind)
    sm.setGalGameMode(false)
  }
  runtime.dispatch('click', { isTrusted: false, target: target('editor') })
  assert.equal(sm.getStatus().isGalGameMode, false, 'synthetic clicks do not enter')
  sm.setAutoGalGameOnChat(false)
  runtime.dispatch('click', { isTrusted: true, target: target('editor') })
  assert.equal(sm.getStatus().isGalGameMode, false, 'auto entry preference respected')
})

test('hotfix: leaving theatre mounts a distinct widget root at its saved position', t => {
  const runtime = loadBundle(); const sm = runtime.mount(); t.after(() => sm.dispose())
  const widget = runtime.render()
  const unsubscribe = runtime.viewEffects.find(fn => String(fn).includes('stateMachine.subscribe'))()
  t.after(unsubscribe)
  sm.setGalGameMode(true)
  const theatre = runtime.render()
  assert.notEqual(theatre.props.key, widget.props.key, 'centred theatre nodes cannot be reconciled into the positioned widget')
  assert.equal(widget.props.key, 'widget')
  sm.setGalGameMode(false)
  const restored = runtime.render()
  assert.equal(restored.props.key, 'widget')
  assert.equal(restored.props.style.left, widget.props.style.left)
  assert.equal(restored.props.style.top, widget.props.style.top)
})


test('wandering: frame-batched status reaches walking mode before a visible position change', t => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
  const frames: Array<() => void> = []
  const runtime = loadBundle(undefined, frames); const sm = runtime.mount(); t.after(() => sm.dispose())
  const before = runtime.render()
  const unsubscribe = runtime.viewEffects.find(fn => String(fn).includes('stateMachine.subscribe'))(); t.after(unsubscribe)
  const cleanup = runtime.viewEffects.find(fn => String(fn).includes('wanderDestination'))(); t.after(cleanup)
  t.mock.timers.tick(14000)
  assert.equal(sm.getStatus().state, 'WANDERING')
  assert.equal(runtime.render().props.style.left, before.props.style.left, 'wait for the frame-batched walking render')
  while (frames.length) frames.shift()!()
  const walking = runtime.render()
  assert.equal(walking.props['data-wandering'], true)
  runtime.viewEffects.find(fn => String(fn).includes("status.state !== 'WANDERING'"))()
  const moved = runtime.render()
  assert.ok(Math.abs(parseFloat(moved.props.style.left) - parseFloat(before.props.style.left)) >= 100, 'walk really changes screen position')
  assert.equal(moved.props.style.top, before.props.style.top, 'no jump to the bottom of the window')
  t.mock.timers.tick(3300)
  assert.equal(sm.getStatus().state, 'EATING', 'rest only after the slow walk finishes')
})

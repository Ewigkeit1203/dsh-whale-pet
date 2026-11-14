import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { PetStateMachine } from '../lib/client/state-machine.js'

// Exercise the real browser artifact as well as the TypeScript compiler output.
function loadBundle(storage?: { getItem(key: string): string | null; setItem(key: string, value: string): void }, frames?: Array<() => void>, random?: () => number) {
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
  const vmMath = Object.create(Math)
  if (random) vmMath.random = random
  const context: any = {
    Math: vmMath,
    requestAnimationFrame: frames ? (callback: () => void) => frames.push(callback) : undefined,
    Element: FakeElement,
    console, setTimeout, clearTimeout, setInterval, clearInterval, localStorage: storage, Event,
    window: { addEventListener: listen, removeEventListener: unlisten, innerWidth: 1280, innerHeight: 800, __ModuleLoader__: {
      load(module: any) { plugin = module.factory(() => React) },
    } },
    document: { title: 'DSH', documentElement: {lang:'zh'}, hidden: false, hasFocus: () => true, addEventListener: listen, removeEventListener: unlisten, getElementById: () => ({}), querySelector: () => null, querySelectorAll: () => [] },
  }
  context.window.dispatchEvent = (event: Event) => { for (const callback of listeners.get(event.type) || []) callback(event) }
  const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
    .replace('const DialogueContent =', 'globalThis.BundleAudio = PetVoice; const DialogueContent =')
    .replace('const MAID_DATA_URI =', 'globalThis.BundleStateMachine = PetStateMachine; const MAID_DATA_URI =')
  vm.runInNewContext(bundle, context)
  let overlay: any
  const effects: any[] = []
  const mount = (extra: Record<string, unknown> = {}) => {
    const ctx = { ...extra, slots: {
      inject(_name: string, callback: any) { callback() },
      register(_config: any, render: any) { overlay = render() },
    }, effect(callback: any) { effects.push(callback) } }
    // Like DSH's Cordis context: reading any property it was not told about throws. (inject is a Context method.)
    plugin.apply(new Proxy(ctx, { get(target: any, prop) {
      if (typeof prop === 'symbol' || prop in target) return target[prop]
      if (prop === 'inject') return undefined
      throw new Error(`cannot get property "${String(prop)}" without inject`)
    } }))
    return overlay.props.stateMachine
  }
  return { context, FakeElement, dispatch(name: string, event: any) { for(const callback of listeners.get(name) || [])callback(event) }, StateMachine: context.BundleStateMachine, Audio: context.BundleAudio, viewEffects, mount,
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

  test(`${label}: an idle companion does not wake the UI, and nothing fires after unload`, t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
    const StateMachine = make()
    const sm = new StateMachine()
    let notified = 0
    sm.subscribe(() => { notified++ })
    notified = 0
    // No mouth, blink or gaze ticks any more: until the 60 s lonely prompt nothing is pushed to the UI.
    t.mock.timers.tick(50000)
    assert.equal(notified, 0, 'idle state machine notified the UI')
    sm.setStreaming(true)
    const whileStreaming = notified
    t.mock.timers.tick(5000)
    assert.ok(notified - whileStreaming <= 2, 'streaming does not tick the UI on a timer')
    sm.dispose()
    const atDispose = notified
    t.mock.timers.tick(200000)
    assert.equal(notified, atDispose, 'a timer survived dispose')
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
  const puppet = walk(puppetNode.type(puppetNode.props)).find(n=>String(n.props.className).split(' ').includes('puppetRoot'))
  assert.equal(puppet.props.style.transform, undefined, 'the portrait does not follow the pointer')
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

test('browser bundle: movement never fades her; Alt still controls click-through', t => {
 const runtime=loadBundle(); const sm=runtime.mount();t.after(()=>sm.dispose())
 runtime.render()
 const visibility=runtime.viewEffects.find(fn=>String(fn).includes('const visibility'))
 const cleanup=visibility();t.after(cleanup)
 let tree=runtime.render();const opacity=walk(tree).find(node=>node.props.imgSrc).props.opacity
 for(let i=0;i<100;i++)runtime.dispatch('pointermove',{type:'pointermove',target:new runtime.FakeElement()})
 runtime.dispatch('wheel',{type:'wheel',target:new runtime.FakeElement()})
 tree=runtime.render();assert.equal(walk(tree).find(node=>node.props.imgSrc).props.opacity,opacity)
 assert.equal(tree.props['data-dimmed'],undefined)
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
 // Too dizzy to go and peek: a short notice instead.
 walk(tree).find(n=>String(n.props.className).split(' ').includes('petEdgePeek')).props.onClick();tree=runtime.render()
 assert.equal(tree.props['data-docked'],false,'cannot peek while dizzy')
 assert.ok(walk(tree).some(n=>n.props.className==='petToast'&&String(n.children).includes('晕')),'tells why')
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



for(const random of [0,.5,.999]) test('wandering: random wait, frame scheduling and optional rest @'+random,t=>{
 t.mock.timers.enable({apis:['setInterval','setTimeout']})
 const frames: Array<()=>void>=[]
 const runtime=loadBundle(undefined,frames,()=>random);const sm=runtime.mount();t.after(()=>sm.dispose())
 const before=runtime.render()
 const unsub=runtime.viewEffects.find(fn=>String(fn).includes('stateMachine.subscribe'))();t.after(unsub)
 const cleanup=runtime.viewEffects.find(fn=>String(fn).includes('wanderDestination'))();t.after(cleanup)
 const wait=8000+12000*random
 t.mock.timers.tick(wait-1);assert.equal(sm.getStatus().state,'IDLE')
 t.mock.timers.tick(1);assert.equal(sm.getStatus().state,'WANDERING')
 assert.equal(runtime.render().props.style.left,before.props.style.left,'walking style must be committed first')
 while(frames.length)frames.shift()!()
 const walking=runtime.render();assert.equal(walking.props['data-wandering'],true)
 runtime.viewEffects.find(fn=>String(fn).includes("status.state !== 'WANDERING'"))()
 const moved=runtime.render()
 assert.ok(Math.hypot(parseFloat(moved.props.style.left)-parseFloat(before.props.style.left),parseFloat(moved.props.style.top)-parseFloat(before.props.style.top))>=80)
 t.mock.timers.tick(3300)
 assert.equal(sm.getStatus().state,random<.25?'EATING':'IDLE')
 cleanup();const after=sm.getStatus().state;t.mock.timers.tick(30000);assert.notEqual(sm.getStatus().state,'WANDERING','cleanup cancels future strolls')
})

test('wandering pauses while settings are open and never starts a pending walk after cleanup',t=>{
 t.mock.timers.enable({apis:['setInterval','setTimeout']})
 const runtime=loadBundle(undefined,undefined,()=>0);const sm=runtime.mount();t.after(()=>sm.dispose())
 let tree=runtime.render();walk(tree).find(node=>node.children.includes('设置')).props.onClick();runtime.render()
 const paused=runtime.viewEffects.find(fn=>String(fn).includes('wanderDestination'));paused()
 t.mock.timers.tick(25000);assert.notEqual(sm.getStatus().state,'WANDERING')
})

for(const [label,make] of [['compiled',()=>PetStateMachine],['bundle',()=>loadBundle().StateMachine]] as const) {
 test(label+': interrupted stroll completion cannot replace an active answer or reasoning',t=>{
  const SM=make();const sm=new SM();t.after(()=>sm.dispose())
  sm.setWandering(true);sm.setStreaming(true);sm.finishWandering(true)
  assert.equal(sm.getStatus().state,'ANSWERING')
  sm.setStreaming(false);sm.setReasoning(true);sm.finishWandering(false)
  assert.equal(sm.getStatus().state,'REASONING')
 })
}

test('browser bundle: theatre scene, music and settings panels open from the HUD and Escape closes them first', t => {
  const runtime = loadBundle()
  const sm = runtime.mount()
  t.after(() => sm.dispose())
  sm.setGalGameMode(true)
  let tree = runtime.render()
  const backdrop = walk(tree).find(node => node.props['data-whale-pet'] === 'backdrop')
  assert.ok(['study', 'cafe', 'seaside'].includes(backdrop.props['data-scene']), 'the default follows the time of day')
  assert.equal(backdrop.props['data-immersive'], true)
  assert.equal(walk(tree).filter(node => node.props.className === 'sceneLayer').length, 2, 'two layers for the crossfade')
  const chips = walk(tree).filter(node => node.type === 'button' && node.props.className?.startsWith?.('theatreChip'))
  assert.equal(chips.length, 3, 'music, background and settings chips')
  chips[1].props.onClick()
  tree = runtime.render()
  const cards = walk(tree).filter(node => node.props.className === 'theatreSceneCard')
  assert.match(cards[0].props.title, /^跟随时间 · /, 'time-of-day card comes first and names the current scene')
  assert.deepEqual(cards.slice(1).map(card => card.props.title), ['和室书房·夜', '科技机房', '午后咖啡厅', '海边黄昏', '透明（显示 DSH）', '我的背景'])
  assert.equal(cards[0].props['aria-checked'], true)
  cards.find(card => card.props.title === '午后咖啡厅').props.onClick()
  tree = runtime.render()
  assert.equal(walk(tree).find(node => node.props['data-whale-pet'] === 'backdrop').props['data-scene'], 'cafe')
  // Escape closes the open panel before it would leave the theatre.
  for (const effect of runtime.viewEffects.filter(fn => String(fn).includes("'keydown'"))) effect()
  runtime.dispatch('keydown', { key: 'Escape', target: null, preventDefault() {} })
  tree = runtime.render()
  assert.equal(walk(tree).some(node => node.props.className === 'theatrePanel'), false, 'panel closed')
  assert.equal(sm.getStatus().isGalGameMode, true, 'still in the theatre')
  walk(tree).filter(node => node.type === 'button' && node.props.className?.startsWith?.('theatreChip'))[0].props.onClick()
  tree = runtime.render()
  assert.ok(walk(tree).some(node => node.props.className === 'theatreTrackList'), 'music panel lists the tracks')
  assert.deepEqual(walk(tree).filter(node => node.props.className === 'theatreTrack').length, 3, 'three built-in tracks without a stored file')
})

test('browser bundle: immersive background click continues the dialogue; transparent background still exits', t => {
  const runtime = loadBundle()
  const sm = runtime.mount()
  t.after(() => sm.dispose())
  sm.setGalGameMode(true)
  let tree = runtime.render()
  walk(tree).find(node => node.props['data-whale-pet'] === 'backdrop').props.onClick()
  assert.equal(sm.getStatus().isGalGameMode, true, 'a painted scene keeps the theatre open')
  tree = runtime.render()
  walk(tree).filter(node => node.type === 'button' && node.props.className?.startsWith?.('theatreChip'))[1].props.onClick()
  tree = runtime.render()
  walk(tree).find(node => node.props.title === '透明（显示 DSH）').props.onClick()
  tree = runtime.render()
  const backdrop = walk(tree).find(node => node.props['data-whale-pet'] === 'backdrop')
  assert.equal(backdrop.props['data-immersive'], false)
  backdrop.props.onClick() // first click closes the open panel
  tree = runtime.render()
  walk(tree).find(node => node.props['data-whale-pet'] === 'backdrop').props.onClick()
  assert.equal(sm.getStatus().isGalGameMode, false, 'the transparent scene keeps click-outside-to-exit')
})

test('browser bundle: Skip toggles and theatre settings write preferences', t => {
  const runtime = loadBundle()
  const sm = runtime.mount()
  t.after(() => sm.dispose())
  sm.setGalGameMode(true)
  let tree = runtime.render()
  const skip = walk(tree).find(node => node.type === 'button' && node.children.includes('快进'))
  assert.equal(skip.props['aria-pressed'], false)
  skip.props.onClick()
  tree = runtime.render()
  assert.equal(walk(tree).find(node => node.type === 'button' && node.children.includes('快进')).props['aria-pressed'], true)
  assert.ok(walk(tree).some(node => node.props.className === 'galgameSkipBadge'))
  walk(tree).find(node => node.props['aria-label'] === '剧场设置').props.onClick()
  tree = runtime.render()
  walk(tree).find(node => node.props.role === 'radio' && node.children.includes('快')).props.onClick()
  tree = runtime.render()
  assert.equal(walk(tree).find(node => node.props.role === 'radio' && node.children.includes('快')).props['aria-checked'], true)
})

test('browser bundle: poking her quickly makes her puzzled, then frustrated; a pat shows the proud face', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const runtime = loadBundle(undefined, undefined, () => 0)
  const sm = runtime.mount(); t.after(() => sm.dispose())
  let tree = runtime.render()
  const click = () => {
    walk(tree).find(node => node.props.imgSrc).props.onMouseDown({ button: 0, clientX: 900, clientY: 400 })
    runtime.render()
    const remove = runtime.viewEffects.find(fn => String(fn).includes('const cancelDrag'))()
    runtime.dispatch('mouseup', { clientX: 900, clientY: 400 })
    remove()
    tree = runtime.render()
  }
  click()
  assert.ok(walk(tree).some(node => node.props.className === 'settingsDrawer'), 'a single click still opens Settings')
  click(); click()
  assert.equal(walk(tree).some(node => node.props.className === 'settingsDrawer'), false, 'quick pokes keep Settings closed')
  assert.equal(walk(tree).find(node => node.props.imgSrc).props.poseName, 'surprised')
  assert.equal(walk(tree).find(node => node.props.imgSrc).props.emote, 'question')
  click(); click(); click()
  const puppet = walk(tree).find(node => node.props.imgSrc)
  assert.equal(puppet.props.poseName, 'angry', 'the sixth poke within 2.5 s: frustrated')
  assert.equal(puppet.props.emote, 'anger')
  assert.ok(walk(tree).some(node => node.children?.some?.((child: any) => typeof child === 'string' && child.includes('别戳啦'))))
  t.mock.timers.tick(3500); tree = runtime.render()
  assert.equal(walk(tree).find(node => node.props.imgSrc).props.poseName, 'Maid', 'she calms down')
})


test('browser bundle: separate model size sliders save values without resizing illustrations', t => {
  t.mock.timers.enable({apis:['setTimeout']})
  const store = new Map<string,string>()
  const runtime = loadBundle({getItem:key=>store.get(key)??null,setItem:(key,value)=>{store.set(key,value)}})
  const sm = runtime.mount(); t.after(()=>sm.dispose())
  let tree = runtime.render()
  walk(tree).find(node=>node.type==='button' && node.children.includes('设置')).props.onClick()
  tree = runtime.render()
  const before = walk(tree).find(node=>String(node.props.className).startsWith('petSpriteSize')).props.style.height
  const desktop = walk(tree).find(node=>node.type==='input' && node.props['aria-label']==='桌宠模型大小')
  const theatre = walk(tree).find(node=>node.type==='input' && node.props['aria-label']==='剧场模型大小')
  assert.ok(desktop && theatre)
  desktop.props.onChange({target:{value:'1.65'}})
  tree = runtime.render()
  walk(tree).find(node=>node.type==='input' && node.props['aria-label']==='剧场模型大小').props.onChange({target:{value:'1.4'}})
  tree = runtime.render()
  assert.equal(walk(tree).find(node=>String(node.props.className).startsWith('petSpriteSize')).props.style.height,before)
  const stopSaving = runtime.viewEffects.find(fn => String(fn).includes('savePreferences'))()
  t.after(stopSaving)
  t.mock.timers.tick(300)
  const p = JSON.parse([...store.values()][0])
  assert.equal(p.live2dWidgetScale,1.65); assert.equal(p.live2dTheatreScale,1.4)
})


test('browser bundle: chest clicks ask the player to stop, do not open settings, and do not fire after a drag', t => {
  t.mock.timers.enable({apis:['setTimeout']})
  const runtime=loadBundle(), sm=runtime.mount();t.after(()=>sm.dispose())
  let tree=runtime.render()
  const begin=()=>{walk(tree).find(n=>n.props.imgSrc).props.onMouseDown({button:0,clientX:900,clientY:400},'chest');runtime.render();return runtime.viewEffects.find(fn=>String(fn).includes('const cancelDrag'))()}
  let remove=begin()
  runtime.dispatch('mouseup',{clientX:900,clientY:400});remove();tree=runtime.render()
  assert.ok(!walk(tree).some(n=>n.props.className==='settingsDrawer'))
  assert.equal(walk(tree).find(n=>n.props.imgSrc).props.poseName,'shy')
  assert.ok(walk(tree).some(n=>n.children?.some?.((c:any)=>typeof c==='string'&&c.includes('请不要碰这里'))))
  t.mock.timers.tick(3300);tree=runtime.render()
  assert.equal(walk(tree).find(n=>n.props.imgSrc).props.poseName,'Maid')
  remove=begin();runtime.dispatch('mousemove',{clientX:940,clientY:400});runtime.render()
  runtime.dispatch('mouseup',{clientX:940,clientY:400});remove();tree=runtime.render()
  assert.ok(!walk(tree).some(n=>n.children?.some?.((c:any)=>typeof c==='string'&&c.includes('请不要碰这里'))),'a chest-origin drag is not a chest click')
})

test('browser bundle: rapid opposite drags start at the visible position and reject the previous queued frame', t => {
  t.mock.timers.enable({apis:['setTimeout']})
  const frames:Array<()=>void>=[], runtime=loadBundle(undefined,frames), sm=runtime.mount();t.after(()=>sm.dispose())
  let tree=runtime.render()
  const begin=(left:number)=>{
    walk(tree).find(n=>n.props.imgSrc).props.onMouseDown({button:0,clientX:600,clientY:400,currentTarget:{closest:()=>({getBoundingClientRect:()=>({left,top:150})})}})
    tree=runtime.render();return runtime.viewEffects.find(fn=>String(fn).includes('const cancelDrag'))()
  }
  let remove=begin(450)
  runtime.dispatch('mousemove',{clientX:700,clientY:400})
  const oldFrame=frames.pop()!
  runtime.dispatch('mouseup',{clientX:700,clientY:400});remove();tree=runtime.render()
  remove=begin(400)
  assert.equal(tree.props.style.left,'400px','interrupt CSS settling at the visible location')
  runtime.dispatch('mousemove',{clientX:560,clientY:400})
  tree=runtime.render();const attached=tree.props.style.left
  runtime.dispatch('mousemove',{clientX:520,clientY:400})
  const freshFrame=frames.pop()!
  oldFrame();tree=runtime.render()
  assert.equal(tree.props.style.left,attached,'old drag cannot steal the new frame')
  freshFrame();tree=runtime.render()
  assert.equal(Number.parseFloat(tree.props.style.left),400-80)
  runtime.dispatch('mouseup',{clientX:520,clientY:400});remove()
})


test('browser bundle: click jitter never moves or lifts the companion, including repeated body clicks',t=>{
  t.mock.timers.enable({apis:['setTimeout']})
  const frames:Array<()=>void>=[],runtime=loadBundle(undefined,frames),sm=runtime.mount();t.after(()=>sm.dispose())
  let tree=runtime.render(),before={...tree.props.style}
  for(let n=0;n<5;n++){
    const puppet=walk(tree).find(node=>node.props.imgSrc)
    puppet.props.onMouseDown({button:0,clientX:600,clientY:400},'chest')
    tree=runtime.render();const cleanup=runtime.viewEffects.find(fn=>String(fn).includes('const cancelDrag'))()
    for(const x of [603,596,607,602])runtime.dispatch('mousemove',{clientX:x,clientY:402})
    tree=runtime.render();assert.equal(walk(tree).find(node=>node.props.imgSrc).props.held,null)
    assert.equal(frames.length,0,'sub-threshold jitter queues no position update')
    runtime.dispatch('mouseup',{clientX:602,clientY:402});cleanup();tree=runtime.render()
    assert.equal(tree.props.style.left,before.left);assert.equal(tree.props.style.top,before.top)
  }
})

test('browser bundle: a real drag keeps its original pointer offset instead of moving the collar under a belly click',t=>{
  t.mock.timers.enable({apis:['setTimeout']})
  const runtime=loadBundle(),sm=runtime.mount();t.after(()=>sm.dispose())
  let tree=runtime.render()
  walk(tree).find(n=>n.props.imgSrc).props.onMouseDown({button:0,clientX:600,clientY:450,currentTarget:{closest:()=>({getBoundingClientRect:()=>({left:400,top:150})})}})
  tree=runtime.render();const cleanup=runtime.viewEffects.find(fn=>String(fn).includes('const cancelDrag'))()
  runtime.dispatch('mousemove',{clientX:620,clientY:450});tree=runtime.render()
  assert.equal(tree.props.style.left,'420px');assert.equal(tree.props.style.top,'150px')
  assert.ok(walk(tree).find(n=>n.props.imgSrc).props.held)
  runtime.dispatch('mouseup',{clientX:620,clientY:450});cleanup()
})

test('browser bundle: crown peek docks her, suppresses chatter and restores the saved spot',t=>{
 const runtime=loadBundle();const sm=runtime.mount();t.after(()=>sm.dispose());let tree=runtime.render()
 const origin={...tree.props.style};const peek=()=>walk(tree).find(n=>String(n.props.className).split(' ').includes('petEdgePeek'))
 assert.equal(peek().props['aria-pressed'],false)
 sm.setWandering(true);peek().props.onClick();tree=runtime.render()
 assert.equal(tree.props['data-docked'],true);assert.notEqual(sm.getStatus().state,'WANDERING')
 assert.equal(peek().props['aria-pressed'],true);assert.equal(tree.props['data-peek-edge'],'right')
 assert.equal(walk(tree).find(n=>n.props.imgSrc).props.onTouch,undefined)
 assert.ok(!walk(tree).some(n=>n.props.className==='speechBubble'))
 peek().props.onClick();tree=runtime.render();assert.equal(tree.props['data-docked'],false);assert.deepEqual({...tree.props.style},origin)
})
test('browser bundle: peeking shows only a small settings / come-back menu; settings open where she is and the return position is kept',t=>{
 const storage={getItem:()=>JSON.stringify({peakNotice:false,onboardingDone:true}),setItem(){}}
 const runtime=loadBundle(storage);const sm=runtime.mount();t.after(()=>sm.dispose());let tree=runtime.render();const origin={...tree.props.style}
 const peek=()=>walk(tree).find(n=>String(n.props.className).split(' ').includes('petEdgePeek'))
 const bar=()=>walk(tree).find(n=>n.props.className==='petPeekBar')
 assert.ok(peek());assert.equal(bar(),undefined,'the full hover menu while she is out');peek().props.onClick();tree=runtime.render()
 assert.ok(!walk(tree).some(n=>n.props.className==='toolbar'),'no full menu while peeking')
 assert.deepEqual(bar().children.flat(9).filter((n:any)=>n&&n.type==='button').map((n:any)=>n.props.className),['petPeekBtn petPeekSettings','petPeekBtn petEdgePeek'])
 assert.ok(walk(bar()).some(n=>n.type==='kbd'&&n.children.includes('Alt+P')),'the shortcut is shown')
 const docked={...tree.props.style}
 walk(tree).find(n=>n.children.includes('设置')).props.onClick();tree=runtime.render()
 assert.equal(tree.props['data-docked'],true,'she stays at the edge');assert.deepEqual({...tree.props.style},docked,'and does not move')
 const panel=walk(tree).find(n=>n.props.className==='settingsDrawer');assert.ok(panel);assert.equal(panel.props['data-side'],'left','settings open to her left')
 assert.ok(bar(),'the small menu stays while settings are open')
 walk(tree).find(n=>n.children.includes('设置')).props.onClick();tree=runtime.render();assert.equal(tree.props['data-docked'],true)
 peek().props.onClick();tree=runtime.render();assert.deepEqual({...tree.props.style},origin)
 assert.ok(walk(tree).some(n=>n.props.className==='toolbar'),'back with her: the full menu returns');assert.equal(bar(),undefined)
})

test('browser bundle: custom peek shortcut toggles only once, displays beside the button and always peeks from the right',t=>{
 const storage={getItem:()=>JSON.stringify({peekShortcut:'Ctrl+Shift+K',x:900,y:100,wandering:false}),setItem(){}}
 const runtime=loadBundle(storage);const sm=runtime.mount();t.after(()=>sm.dispose());let tree=runtime.render()
 assert.ok(walk(tree).some(n=>n.type==='kbd' && n.children.includes('Ctrl+Shift+K')))
 const install=()=>{const effect=runtime.viewEffects.find(fn=>String(fn).includes('const down'));return effect()}
 let clean=install()
 runtime.dispatch('keydown',{key:'p',altKey:true,preventDefault(){}});tree=runtime.render();assert.equal(tree.props['data-docked'],false)
 runtime.dispatch('keydown',{key:'K',ctrlKey:true,shiftKey:true,preventDefault(){}});clean();tree=runtime.render()
 assert.equal(tree.props['data-docked'],true);assert.equal(tree.props['data-peek-edge'],'right')
 const selected=tree.props['data-peek-edge'];tree=runtime.render();assert.equal(tree.props['data-peek-edge'],selected)
 clean=install();runtime.dispatch('keydown',{key:'K',ctrlKey:true,shiftKey:true,repeat:true,preventDefault(){}});tree=runtime.render();assert.equal(tree.props['data-docked'],true)
 runtime.dispatch('keydown',{key:'K',ctrlKey:true,shiftKey:true,preventDefault(){}});clean();tree=runtime.render();assert.equal(tree.props['data-docked'],false)
})
test('browser bundle: settings expose a shortcut recorder without retired bottom/automatic choices, with a labelled full-size settings action',t=>{
 const runtime=loadBundle();const sm=runtime.mount();t.after(()=>sm.dispose());let tree=runtime.render()
 const button=walk(tree).find(n=>n.props.className==='toolBtn petSettingsButton');assert.ok(button.children.includes('设置'));button.props.onClick();tree=runtime.render()
 const key=()=>walk(tree).find(n=>n.props.id==='pet-peek-shortcut')
 assert.ok(!walk(tree).some(n=>n.props.id==='pet-peek-edge'),'retired edge selector is removed')
 const event={key:'J',altKey:true,preventDefault(){},stopPropagation(){}}
 key().props.onKeyDown(event);tree=runtime.render();assert.equal(key().props.value,'Alt+J')
 key().props.onKeyDown({...event,key:'T'});tree=runtime.render();assert.equal(key().props.value,'Alt+J','existing shortcut cannot be stolen')
 key().props.onKeyDown({...event,key:'Backspace'});tree=runtime.render();assert.equal(key().props.value,'未设置')
})
test('browser bundle: the peeking picture appears only after she has walked to the edge as herself, and leaves at once',async t=>{
 const runtime=loadBundle();const sm=runtime.mount();t.after(()=>sm.dispose());let tree=runtime.render()
 const pose=()=>walk(tree).find(n=>n.props.imgSrc).props.poseName
 const peek=()=>walk(tree).find(n=>String(n.props.className).split(' ').includes('petEdgePeek'))
 assert.ok(walk(tree).find(n=>n.props.className==='toolbar').children.flat(9).some((n:any)=>n&&n.props&&String(n.props.className).includes('petEdgePeek')),'peek sits in the hover menu')
 peek().props.onClick();tree=runtime.render()
 assert.equal(tree.props['data-docked'],true);assert.notEqual(pose(),'peek','still herself while walking');assert.equal(tree.props['data-peek-swap'],undefined)
 // Effects are run by hand in this harness.
 const effect=runtime.viewEffects.filter((fn:any)=>String(fn).includes('setPeekArrived(true)')).pop();effect()
 await new Promise(r=>setTimeout(r,800));tree=runtime.render()
 assert.equal(pose(),'peek','turns into the peeking picture at the edge');assert.equal(tree.props['data-peek-swap'],true);assert.equal(tree.props['data-peek-lean'],undefined,'the picture is not tilted')
 peek().props.onClick();tree=runtime.render();assert.notEqual(pose(),'peek','herself again as soon as she comes back')
})

test('browser bundle: repeated tail strokes use tail feedback, while actual pokes still use the poke warning',t=>{
 const runtime=loadBundle();runtime.context.setTimeout=()=>1;runtime.context.clearTimeout=()=>{}
 let now=Date.now();runtime.context.Date=class extends Date{static now(){return now}}
 const sm=runtime.mount();t.after(()=>sm.dispose());let tree=runtime.render()
 const touch=walk(tree).find(n=>n.props.imgSrc).props.onTouch
 for(let i=0;i<3;i++){now+=3500;touch({kind:'tail'});tree=runtime.render()}
 const text=()=>walk(tree).flatMap(n=>n.children).filter(v=>typeof v==='string').join(' ')
 assert.match(text(),/尾巴很敏感/);assert.doesNotMatch(text(),/别戳啦/)
 assert.equal(walk(tree).find(n=>n.props.imgSrc).props.poseName,'shy','tail strokes never trigger poke anger')
 sm.setGalGameMode(true);runtime.render()
 // The theatre reports actual pokes, while the desktop handles them through its drag handler.
 for(let i=0;i<6;i++){now+=100;touch({kind:'poke'})}
 sm.setGalGameMode(false);tree=runtime.render();assert.match(text(),/别戳啦/)
})

test('browser bundle: a pending answer reminder is cancelled when turned off, including its title mark',t=>{
 const store=new Map([['dsh-whale-pet.preferences.v1',JSON.stringify({onboardingDone:true,answerNotice:'line'})]])
 const r=loadBundle({getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)})
 r.context.setTimeout=()=>1;r.context.clearTimeout=()=>{}
 const sm=r.mount();t.after(()=>sm.dispose());r.render()
 t.after(r.viewEffects.find(fn=>String(fn).includes('stateMachine.subscribe'))())
 r.viewEffects.find(fn=>String(fn).includes('const visibility'))()
 sm.setStreaming(true);r.render();r.viewEffects.find(fn=>String(fn).includes('finishedStream.current'))()
 r.context.document.hidden=true;r.context.document.hasFocus=()=>false;r.dispatch('blur',{});r.render()
 sm.setLatestDialogue('All done');sm.setStreaming(false);r.render();r.viewEffects.find(fn=>String(fn).includes('finishedStream.current'))()
 assert.match(r.context.document.title,/已回答/)
 let tree=r.render();walk(tree).find(n=>n.children.includes('设置')).props.onClick();tree=r.render()
 walk(tree).find(n=>n.type==='button'&&n.children.includes('关')).props.onClick();r.render()
 r.viewEffects.find(fn=>String(fn).includes('answerNotice.current.cancel()'))()
 assert.equal(r.context.document.title,'DSH')
 r.context.document.hidden=false;r.context.document.hasFocus=()=>true;r.dispatch('focus',{});r.render()
 r.viewEffects.find(fn=>String(fn).includes('answerNotice.current.back('))()
 tree=r.render();assert.notEqual(walk(tree).find(n=>n.props.imgSrc).props.emote,'heart')
})

test('browser bundle: corrupted discovery dates cannot crash the real settings renderer',t=>{
 const r=loadBundle({getItem:k=>k==='dsh-whale-pet.discoveries.v1'?'{"pat":1e100,"tail":8640000000000001,"carry":1000}':null,setItem(){}})
 const sm=r.mount();t.after(()=>sm.dispose());let tree=r.render()
 walk(tree).find(n=>n.children.includes('设置')).props.onClick()
 assert.doesNotThrow(()=>{tree=r.render()})
 const times=walk(tree).filter(n=>n.type==='time')
 assert.equal(times.length,1);assert.equal(times[0].props.dateTime,'1970-01-01T00:00:01.000Z')
})

test('browser bundle: prose mentioning insufficient_balance never triggers a quota reaction; a host error does once',t=>{
 const r=loadBundle();r.context.setTimeout=()=>1;r.context.clearTimeout=()=>{}
 const sm=r.mount();t.after(()=>sm.dispose());r.render();t.after(r.viewEffects.find(fn=>String(fn).includes('stateMachine.subscribe'))())
 let refreshes=0;r.context.window.dispatchEvent=()=>{refreshes++;return true}
 sm.setStreaming(true);r.render();r.viewEffects.find(fn=>String(fn).includes('finishedStream.current'))()
 sm.setLatestDialogue('如果接口提示 insufficient_balance，请检查充值状态。这是示例说明。')
 sm.setStreaming(false);r.render();r.viewEffects.find(fn=>String(fn).includes('finishedStream.current'))()
 r.viewEffects.find(fn=>String(fn).includes('seenQuotaError.current'))()
 let tree=r.render();assert.equal(refreshes,0);assert.notEqual(walk(tree).find(n=>n.props.imgSrc).props.poseName,'shy')
 sm.setQuotaError('host-turn-1');r.render();r.viewEffects.find(fn=>String(fn).includes('seenQuotaError.current'))()
 tree=r.render();assert.equal(refreshes,1);assert.equal(walk(tree).find(n=>n.props.imgSrc).props.poseName,'shy')
 r.viewEffects.find(fn=>String(fn).includes('seenQuotaError.current'))();assert.equal(refreshes,1)
})

test('host adapter: terminal quota rows affect only an observed current turn, never old history or answer text',t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']})
 const r=loadBundle(),sm=r.mount();t.after(()=>sm.dispose())
 let mutate:any,running=false,error=true,code='ACCOUNT_QUOTA',session='one',old=false
 r.context.MutationObserver=class{constructor(fn:any){mutate=fn}observe(){}disconnect(){}}
 r.context.Node={DOCUMENT_POSITION_FOLLOWING:4}
 const prompt={},failure={closest:()=>null,compareDocumentPosition:()=>old?4:2,querySelector:()=>({textContent:code}),getAttribute:()=> 'error-1'}
 r.context.document.querySelector=(selector:string)=>selector==='[data-chat-running]'?(running?{hasAttribute:()=>false}:null):selector==='[data-conversation-session]'?{getAttribute:()=>session}:null
 r.context.document.querySelectorAll=(selector:string)=>selector==='[data-chat-flow-kind="user-prompt"]'?[prompt]:selector==='[data-chat-flow-kind="turn-error"]'&&error?[failure]:[]
 const clean=r.effects.find(fn=>String(fn).includes('const inspectDomState'))();t.after(clean)
 assert.equal(sm.getStatus().quotaErrorKey,null,'opening old failed history is not a new failure')
 const update=()=>{mutate([{target:{parentElement:null}}]);t.mock.timers.tick(101)}
 running=true;update();running=false;error=true;update();assert.ok(sm.getStatus().quotaErrorKey)
 running=true;update();assert.equal(sm.getStatus().quotaErrorKey,null)
 running=false;old=true;update();assert.equal(sm.getStatus().quotaErrorKey,null,'old turn excluded')
 old=false;code='AUTH';update();assert.equal(sm.getStatus().quotaErrorKey,null,'other failures excluded')
 code='ACCOUNT_QUOTA';update();assert.ok(sm.getStatus().quotaErrorKey)
 session='two';update();assert.equal(sm.getStatus().quotaErrorKey,null,'changing session clears the event')
})

test('host adapter: account stream changes clear both balance sources and suppress stale DOM fallback',async t=>{
 const r=loadBundle();r.context.setTimeout=()=>1;r.context.clearTimeout=()=>{}
 let receive:any,disposeGrant:any,watchCalls=0,calls=0
 const stream={ [Symbol.asyncIterator](){return {next:()=>new Promise(resolve=>{receive=resolve})}},dispose(){receive?.({done:true})} }
 const remote={account:{watch(){watchCalls++},getBalance:async()=>++calls===1?{ok:true,value:{status:'ready',value:[{currency:'CNY',balance:'10'}],bonusWallets:[]}}:{ok:true,value:{status:'failed'}}},
   $stream(options:any){options.open(new AbortController().signal);return stream}}
 const sm=r.mount({inject(_names:unknown,fn:any){fn({remote,remoteAccess:{whenAccess(_name:unknown,start:any){disposeGrant=start()}}})}})
 t.after(()=>{disposeGrant();sm.dispose()})
 assert.equal(watchCalls,1)
 const emit=async(status:string)=>{receive({done:false,value:{value:{status},accept(){}}});await new Promise(resolve=>setImmediate(resolve))}
 await emit('credential-stored');assert.equal(sm.getStatus().hostBalance?.status,'ready')
 sm.setBalances('¥10.00','¥1.00')
 await emit('credential-stored')
 assert.equal(sm.getStatus().hostBalance?.status,'error');assert.equal(sm.getStatus().balancesKnown,false)
 r.context.MutationObserver=class{observe(){}disconnect(){}}
 r.context.document.querySelectorAll=(selector:string)=>selector.includes('balanceCard')?[{closest:()=>null,firstElementChild:{textContent:'充值余额'},querySelector:()=>({textContent:'¥10.00'})}]:[]
 const clean=r.effects.find(fn=>String(fn).includes('const inspectDomState'))();t.after(clean)
 assert.equal(sm.getStatus().balancesKnown,false,'old mounted account card is not re-read after host identity invalidation')
 await emit('signed-out');assert.equal(sm.getStatus().hostBalance?.status,'signed-out')
})

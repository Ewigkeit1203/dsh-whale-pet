import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { PetStateMachine } from '../lib/client/state-machine.js'

// Exercise the real browser artifact as well as the TypeScript compiler output.
function loadBundle() {
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
  const context: any = {
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    window: { innerWidth: 1280, innerHeight: 800, __ModuleLoader__: {
      load(module: any) { plugin = module.factory(() => React) },
    } },
    document: { getElementById: () => ({}), querySelector: () => null, querySelectorAll: () => [] },
  }
  const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
    .replace('const DialogueContent =', 'globalThis.BundleAudio = PetAudio; const DialogueContent =')
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
  return { StateMachine: context.BundleStateMachine, Audio: context.BundleAudio, viewEffects, mount,
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
  assert.ok(walk(tree).some(node => node.children.includes('Character')))
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
  slider.props.onChange({ target: { value: '0' } })
  tree = runtime.render()
  const sprite = walk(tree).find(node => String(node.props.className).startsWith('petSpriteSize'))
  assert.equal(sprite.props.style.zoom, 0.5)
  const drawer = walk(tree).find(node => node.props.className === 'settingsDrawer')
  assert.equal(drawer.props.style.position, 'fixed')
  assert.equal(drawer.props.style.zoom, undefined)
  assert.equal(walk(tree).find(node => String(node.props.className).includes('characterWrapper')).props.style?.zoom, undefined)
  assert.equal(walk(tree).find(node => node.props['aria-valuetext'] === '50%').props.value, 0)
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

test('browser bundle: character voice repeats during streaming and stops with effect cleanup', t => {
  t.mock.timers.enable({ apis: ['setInterval'] })
  const runtime = loadBundle()
  const sm = runtime.mount()
  t.after(() => sm.dispose())
  sm.setStreaming(true)
  let sounds = 0
  runtime.Audio.prototype.play = () => { sounds++ }
  let tree = runtime.render()
  walk(tree).find(node => node.children.includes('设置')).props.onClick()
  tree = runtime.render()
  const label = walk(tree).find(node => node.type === 'label' && node.children.includes('人物音效'))
  walk(label).find(node => node.type === 'input').props.onChange()
  runtime.render()
  const effect = runtime.viewEffects.find(callback => String(callback).includes('syllable'))
  assert.ok(effect)
  const stop = effect()
  t.mock.timers.tick(735)
  assert.equal(sounds, 5, 'speech plays throughout output, with short breathing spaces')
  stop()
  t.mock.timers.tick(1000)
  assert.equal(sounds, 5, 'stream completion or mute cleanup cancels the voice loop')
})

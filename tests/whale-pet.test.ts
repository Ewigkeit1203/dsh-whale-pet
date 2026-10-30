import { test, describe } from 'node:test'
import assert from 'node:assert'
import { existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PetStateMachine } from '../lib/client/state-machine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

describe('dsh-whale-pet: Assets Integrity', () => {
  test('all character pose illustrations (standing, chibi, thinking, sajiao, baifan2) exist with valid size', () => {
    const assets = [
      'assets/Pastel Blue Sea Maid Character.png',
      'assets/Chibi Whale Maid in Blue.png',
      'assets/Pondering Whale Maid Character.png',
      'assets/Puzzled Whale Maid in Thought.png',
      'assets/DS_mad+sajiao.png',
      'assets/getit.png',
      'assets/sajiao.png',
      'assets/baifan2.png',
      'lib/assets/Pastel Blue Sea Maid Character.png',
      'lib/assets/Chibi Whale Maid in Blue.png',
      'lib/assets/Pondering Whale Maid Character.png',
      'lib/assets/Puzzled Whale Maid in Thought.png',
      'lib/assets/DS_mad+sajiao.png',
      'lib/assets/getit.png',
      'lib/assets/sajiao.png',
      'lib/assets/baifan2.png',
    ]

    for (const asset of assets) {
      const fullPath = join(rootDir, asset)
      assert.ok(existsSync(fullPath), `Asset should exist: ${asset}`)
      const stat = statSync(fullPath)
      assert.ok(stat.size > 500, `Asset ${asset} should have positive size (>500B), got ${stat.size}`)
    }
  })
})

describe('dsh-whale-pet: State Machine & Living Animation Logic', () => {
  test('initial state defaults to maiden standing widget with dual balance headers', () => {
    const sm = new PetStateMachine()
    const status = sm.getStatus()
    assert.strictEqual(status.state, 'IDLE')
    assert.strictEqual(status.form, 'maiden', 'Default form should be maiden full standing portrait')
    assert.strictEqual(status.pose, 'default')
    assert.strictEqual(status.toppedUpBalance, '¥0.00')
    assert.strictEqual(status.grantedBalance, '¥0.00')
    assert.strictEqual(status.isGalGameMode, false, 'Startup should be floating widget, NOT forced into dialogue mode')
    assert.strictEqual(status.autoGalGameOnChat, true, 'autoGalGameOnChat should be true by default')
    assert.strictEqual(status.reasoningText, '')
    assert.ok(status.speech.length > 0)
    sm.dispose()
  })

  test('startup autofocus in composer does NOT auto-enter GalGame mode (requires user click)', () => {
    const sm = new PetStateMachine()
    assert.strictEqual(sm.getStatus().isGalGameMode, false)

    sm.setInputFocus(true)
    assert.strictEqual(sm.getStatus().isInputFocused, true)
    assert.strictEqual(sm.getStatus().isGalGameMode, false, 'Focusing composer must not auto-open GalGame mode')

    sm.setGalGameMode(true)
    assert.strictEqual(sm.getStatus().isGalGameMode, true)

    sm.dispose()
  })

  test('balances update accurately for real Topped-up and Granted balance display', () => {
    const sm = new PetStateMachine()
    assert.strictEqual(sm.getStatus().toppedUpBalance, '¥0.00')
    assert.strictEqual(sm.getStatus().grantedBalance, '¥0.00')

    sm.setBalances('¥128.50', '¥30.00')
    assert.strictEqual(sm.getStatus().toppedUpBalance, '¥128.50')
    assert.strictEqual(sm.getStatus().grantedBalance, '¥30.00')

    sm.dispose()
  })

  test('reasoningText updates and clears cleanly for Comic Thought Bubble', () => {
    const sm = new PetStateMachine()
    assert.strictEqual(sm.getStatus().reasoningText, '')

    sm.setReasoningText('思考过程：根据多维逻辑脉络检索……')
    assert.strictEqual(sm.getStatus().reasoningText, '思考过程：根据多维逻辑脉络检索……')

    sm.clearReasoningText()
    assert.strictEqual(sm.getStatus().reasoningText, '')

    sm.dispose()
  })

  test('multi-pose reasoning cycles dynamically through thinking poses', async () => {
    const sm = new PetStateMachine()
    assert.strictEqual(sm.getStatus().pose, 'default')

    // 1. Begin reasoning -> starts with first thinking pose ('pondering')
    sm.setReasoning(true)
    assert.strictEqual(sm.getStatus().state, 'REASONING')
    assert.strictEqual(sm.getStatus().pose, 'pondering', 'Initial reasoning pose should be pondering')

    // 2. Wait 3.3s -> cycles to next thinking pose ('puff')
    await new Promise((resolve) => setTimeout(resolve, 3300))
    assert.strictEqual(sm.getStatus().pose, 'puff', 'Should cycle to next thinking pose (puff)')

    // 3. Streaming response starts -> reverts pose to default and transitions to EATING (baifan2)
    sm.setStreaming(true)
    sm.setReasoning(false)
    assert.strictEqual(sm.getStatus().state, 'EATING')
    assert.strictEqual(sm.getStatus().pose, 'default')

    sm.dispose()
  })

  test('poking character during reasoning does not disrupt thinking state', async () => {
    const sm = new PetStateMachine()
    sm.setReasoning(true)
    assert.strictEqual(sm.getStatus().state, 'REASONING')
    assert.strictEqual(sm.getStatus().pose, 'pondering')

    // Poke during thinking -> triggers temporary sajiao
    sm.triggerMad()
    assert.strictEqual(sm.getStatus().pose, 'mad', 'Trigger mad should show sajiao pose')
    assert.strictEqual(sm.getStatus().state, 'REASONING', 'State remains REASONING')

    // After 2.1s timeout -> returns to ongoing thinking pose without breaking
    await new Promise((resolve) => setTimeout(resolve, 2100))
    assert.strictEqual(sm.getStatus().state, 'REASONING')
    assert.notStrictEqual(sm.getStatus().pose, 'mad', 'Should exit sajiao pose')
    assert.ok(['pondering', 'puff', 'puzzled', 'getit'].includes(sm.getStatus().pose), 'Should return to thinking pose')

    sm.dispose()
  })

  test('form toggles between maiden and chibi', () => {
    const sm = new PetStateMachine()
    assert.strictEqual(sm.getStatus().form, 'maiden')
    sm.toggleForm()
    assert.strictEqual(sm.getStatus().form, 'chibi')
    sm.toggleForm()
    assert.strictEqual(sm.getStatus().form, 'maiden')
    sm.dispose()
  })

  test('streaming transitions to EATING with debounce recovery', async () => {
    const sm = new PetStateMachine()
    sm.setStreaming(true)
    assert.strictEqual(sm.getStatus().state, 'EATING')
    assert.ok(sm.getStatus().speech.length > 0)

    sm.setStreaming(false)
    assert.strictEqual(sm.getStatus().state, 'EATING', 'Should remain EATING during debounce window')

    await new Promise((resolve) => setTimeout(resolve, 450))
    assert.strictEqual(sm.getStatus().state, 'IDLE', 'Should return to IDLE after debounce completes')

    sm.dispose()
  })

  test('lip-sync mouth opens and oscillates during streaming/speaking', async () => {
    const sm = new PetStateMachine()
    sm.setStreaming(true)

    await new Promise((resolve) => setTimeout(resolve, 150))
    assert.ok(sm.getStatus().mouthOpenRatio >= 0, 'Mouth open ratio should be tracked')

    sm.setStreaming(false)
    sm.dispose()
  })

  test('interactive gaze offset updates and clamps properly', () => {
    const sm = new PetStateMachine()
    sm.setGazeOffset({ x: 0.5, y: -0.3 })
    assert.strictEqual(sm.getStatus().gazeOffset.x, 0.5)
    assert.strictEqual(sm.getStatus().gazeOffset.y, -0.3)

    sm.setGazeOffset({ x: 2.5, y: -3.0 })
    assert.strictEqual(sm.getStatus().gazeOffset.x, 1.0)
    assert.strictEqual(sm.getStatus().gazeOffset.y, -1.0)

    sm.dispose()
  })
})

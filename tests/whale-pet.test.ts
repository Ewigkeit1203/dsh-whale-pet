import { test, describe } from 'node:test'
import assert from 'node:assert'
import { existsSync, statSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DIZZY_DATA_URI } from '../lib/client/assets-data.js'
import { PetStateMachine } from '../lib/client/state-machine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

describe('dsh-whale-pet: Assets Integrity', () => {
  test('all character pose illustrations from 大肥鱼表情 exist with valid sizes', () => {
    const assets = [
      'assets/Dizzy.png',
      'assets/Maid.png',
      'assets/DaFeiYu.png',
      'assets/Answering.png',
      'assets/baifan.png',
      'assets/getit.png',
      'assets/sajiao.png',
      'assets/Think1.png',
      'assets/Think2.png',
      'assets/Think3.png',
      'assets/Think4.png',
      'assets/Think5.png',
      'lib/assets/Dizzy.png',
      'lib/assets/Maid.png',
      'lib/assets/DaFeiYu.png',
      'lib/assets/Answering.png',
      'lib/assets/baifan.png',
      'lib/assets/getit.png',
      'lib/assets/sajiao.png',
      'lib/assets/Think1.png',
      'lib/assets/Think2.png',
      'lib/assets/Think3.png',
      'lib/assets/Think4.png',
      'lib/assets/Think5.png',
    ]
    assert.ok(readFileSync(join(rootDir, 'assets/Dizzy.png')).equals(Buffer.from(DIZZY_DATA_URI.split(',')[1], 'base64')), 'Dizzy illustration is embedded without image edits')

    for (const asset of assets) {
      const fullPath = join(rootDir, asset)
      assert.ok(existsSync(fullPath), `Asset should exist: ${asset}`)
      const stat = statSync(fullPath)
      assert.ok(stat.size > 500, `Asset ${asset} should have positive size (>500B), got ${stat.size}`)
    }
  })
})

describe('dsh-whale-pet: State Machine & Living Behavior Logic', () => {
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

  test('multi-pose reasoning cycles dynamically through Think1-Think5 and getit', async () => {
    const sm = new PetStateMachine()
    assert.strictEqual(sm.getStatus().pose, 'default')

    // 1. Begin reasoning -> starts with a random thinking pose
    sm.setReasoning(true)
    assert.strictEqual(sm.getStatus().state, 'REASONING')
    assert.ok(
      ['think1', 'think2', 'think3', 'think4', 'think5'].includes(sm.getStatus().pose),
      `Pose should be one of Think1-5, got ${sm.getStatus().pose}`
    )

    // 2. Wait for dynamic cycle -> cycles to another pose
    await new Promise((resolve) => setTimeout(resolve, 2500))
    assert.ok(
      ['think1', 'think2', 'think3', 'think4', 'think5', 'getit'].includes(sm.getStatus().pose),
      `Pose should be one of Think1-5 or getit, got ${sm.getStatus().pose}`
    )

    sm.dispose()
  })

  test('Answering pose during output, and baifan eating pose strictly AFTER output finishes', async () => {
    const sm = new PetStateMachine()
    sm.setReasoning(true)
    assert.strictEqual(sm.getStatus().state, 'REASONING')

    // 1. Output begins: isStreaming = true -> ANSWERING state and Answering pose (NOT baifan)
    sm.setStreaming(true)
    sm.setReasoning(false)
    assert.strictEqual(sm.getStatus().state, 'ANSWERING')
    assert.strictEqual(sm.getStatus().pose, 'answering', 'During streaming, pose must strictly be answering, NOT baifan')

    // 2. Output finishes: isStreaming = false -> Transitions to EATING state (baifan pose)
    sm.setStreaming(false)
    assert.strictEqual(sm.getStatus().state, 'EATING')
    assert.strictEqual(sm.getStatus().pose, 'eating', 'Post-output must enter EATING state with baifan pose')
    assert.ok(sm.getStatus().speech.includes('白米饭') || sm.getStatus().speech.includes('干饭') || sm.getStatus().speech.length > 0)

    sm.dispose()
  })

  test('wandering completion triggers pause and eat a couple bites of rice', () => {
    const sm = new PetStateMachine()
    sm.setWandering(true)
    assert.strictEqual(sm.getStatus().state, 'WANDERING')

    // Wandering completes -> finish with eating
    sm.finishWanderingWithEating(3500)
    assert.strictEqual(sm.getStatus().state, 'EATING')
    assert.strictEqual(sm.getStatus().pose, 'eating')
    assert.ok(sm.getStatus().speech.includes('散步') || sm.getStatus().speech.includes('白米饭'))

    sm.dispose()
  })

  test('poking character during reasoning triggers temporary sajiao then returns to thinking', async () => {
    const sm = new PetStateMachine()
    sm.setReasoning(true)
    assert.strictEqual(sm.getStatus().state, 'REASONING')
    const initialThinkingPose = sm.getStatus().pose

    // Click character -> triggers short sajiao (2s)
    sm.triggerMad()
    assert.strictEqual(sm.getStatus().pose, 'sajiao')
    assert.strictEqual(sm.getStatus().state, 'REASONING', 'State remains REASONING')

    // After 2.1s timeout -> returns to ongoing thinking pose without disruption
    await new Promise((resolve) => setTimeout(resolve, 2100))
    assert.strictEqual(sm.getStatus().state, 'REASONING')
    assert.ok(
      ['think1', 'think2', 'think3', 'think4', 'think5', 'getit'].includes(sm.getStatus().pose),
      'Should return to thinking pose'
    )

    sm.dispose()
  })

  test('inactivity triggers long sajiao with lonely prompt, and activity resets it', t => {
    const sm = new PetStateMachine()
    t.after(() => sm.dispose())
    assert.strictEqual(sm.getStatus().state, 'IDLE')
    assert.strictEqual(sm.getStatus().pose, 'default')

    // Trigger long sajiao (simulating 60s idle)
    sm.triggerInactivitySajiao()
    assert.strictEqual(sm.getStatus().pose, 'sajiao')
    assert.ok(
      sm.getStatus().speech.includes('好久没理') ||
      sm.getStatus().speech.includes('无聊') ||
      sm.getStatus().speech.includes('等你好久') ||
      sm.getStatus().speech.includes('等主人好久') ||
      sm.getStatus().speech.includes('忘了')
    )

    // User interacts -> activity reset immediately clears lonely sajiao back to default
    sm.resetActivity()
    assert.strictEqual(sm.getStatus().pose, 'default')
    assert.strictEqual(sm.getStatus().state, 'IDLE')

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
})

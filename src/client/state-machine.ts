import type { PetState, PetForm, PetPose, PetStatusInfo, GazeOffset } from './types.js'

export interface StateMachineListener {
  (status: PetStatusInfo): void
}

const DIALOGUES: Record<PetState, string[]> = {
  IDLE: [
    '今天又是元气满满的一天，呼呼~',
    '待机中……好想吃热腾腾的白米饭呀~',
    '有什么任务尽管交给我大肥鱼吧！',
    '咕噜噜……在深海里吐泡泡~',
  ],
  PEEKING: [
    '在写什么呢？让我看看让我看看~',
    '探头！这次要问什么问题呀？',
    '认真盯——正在倾听主人说话！',
  ],
  REASONING: [
    '唔……让我想想看，深海知识库检索中……',
    '手指抵住下巴——正在认真梳理逻辑链条！',
    '咕噜噜……正在组织最有条理的回答哦~',
    '思路灵光一闪……好像快要想通了！',
  ],
  ANSWERING: [
    '回答生成中！大肥鱼正在全力输出~',
    '找到了找到了！这就把答案告诉你！',
    '呼呼~这次的思路非常顺畅哦！',
    '认真回答中——请主人过目！',
  ],
  EATING: [
    '呼~终于输出完毕！大铁盆开动，大口吃白米饭！',
    '吧唧吧唧，白米饭真是太香啦~',
    '干饭鱼！补充体力中~',
    '吨吨吨！一大碗热腾腾的白米饭下肚超满足！',
    '散步累了，停下来吃两口热腾腾的白米饭补充能量~',
  ],
  WANDERING: [
    '游啊游，在网页边缘散步中~',
    '巡逻一圈，看页面整不整齐！',
  ],
}

const SAJIAO_CLICK_DIALOGUES = [
  '哼！不许随便戳大肥鱼，大肥鱼也是有脾气的！',
  '（鼓起腮帮子）主人坏心眼，就知道逗我玩~',
  '撒娇中……必须补偿一碗热腾腾的白米饭才能哄好！',
  '气鼓鼓！再戳我就要把你的消息吞进肚子里啦！',
]

const SAJIAO_LONELY_DIALOGUES = [
  '主人……好久没理大肥鱼了，陪陪我嘛~',
  '（扯衣角）大肥鱼一个人待机好无聊，主人来跟我说说话呀~',
  '戳戳主人！大肥鱼在这里等你好久啦，快来看看我~',
  '呼呼……主人是不是把我忘了？大肥鱼在旁边画圈圈中……',
]

export class PetStateMachine {
  private state: PetState = 'IDLE'
  private form: PetForm = 'maiden'
  private pose: PetPose = 'default'
  private isInputFocused = false
  private isReasoning = false
  private isStreaming = false
  private isWandering = false
  private isEatingPostOutput = false
  private isEatingWandering = false
  private isLongSajiao = false
  private isGalGameMode = false
  private autoGalGameOnChat = true
  private speech = ''
  private latestDialogue = ''
  private reasoningText = ''
  private toppedUpBalance = '¥0.00'
  private grantedBalance = '¥0.00'
  private mouthOpenRatio = 0
  private blinkRatio = 0
  private gazeOffset: GazeOffset = { x: 0, y: 0 }

  private speechTimer: ReturnType<typeof setTimeout> | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private animationTimer: ReturnType<typeof setInterval> | null = null
  private blinkTimer: ReturnType<typeof setTimeout> | null = null
  private thinkingCycleTimer: ReturnType<typeof setTimeout> | null = null
  private madTimer: ReturnType<typeof setTimeout> | null = null
  private eatingTimer: ReturnType<typeof setTimeout> | null = null
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null
  private listeners = new Set<StateMachineListener>()

  private lastThinkingPose: PetPose = 'think1'
  private readonly thinkingPool: PetPose[] = ['think1', 'think2', 'think3', 'think4', 'think5']
  private readonly INACTIVITY_DELAY = 60000 // 60s of complete idle triggers lonely sajiao

  constructor() {
    this.speech = this.getRandomDialogue('IDLE')
    this.startLivingAnimationLoops()
    this.scheduleInactivityCheck()
  }

  public getStatus(): PetStatusInfo {
    return {
      state: this.state,
      form: this.form,
      pose: this.pose,
      speech: this.speech,
      reasoningText: this.reasoningText,
      toppedUpBalance: this.toppedUpBalance,
      grantedBalance: this.grantedBalance,
      isReasoning: this.isReasoning,
      isStreaming: this.isStreaming,
      isInputFocused: this.isInputFocused,
      isGalGameMode: this.isGalGameMode,
      autoGalGameOnChat: this.autoGalGameOnChat,
      mouthOpenRatio: this.mouthOpenRatio,
      blinkRatio: this.blinkRatio,
      gazeOffset: { ...this.gazeOffset },
      latestDialogue: this.latestDialogue || this.speech,
    }
  }

  public subscribe(listener: StateMachineListener): () => void {
    this.listeners.add(listener)
    listener(this.getStatus())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    const status = this.getStatus()
    for (const listener of this.listeners) {
      try {
        listener(status)
      } catch (err) {
        console.error('[dsh-whale-pet] Listener error:', err)
      }
    }
  }

  private getRandomDialogue(state: PetState): string {
    const list = DIALOGUES[state]
    return list[Math.floor(Math.random() * list.length)]
  }

  private startLivingAnimationLoops(): void {
    let mouthPhase = 0
    this.animationTimer = setInterval(() => {
      if (this.isStreaming || this.state === 'ANSWERING' || this.state === 'EATING') {
        mouthPhase += 0.35
        const raw = (Math.sin(mouthPhase) + 1) / 2
        this.mouthOpenRatio = Math.min(1, Math.max(0, raw * 0.9))
        this.notify()
      } else if (this.mouthOpenRatio > 0) {
        this.mouthOpenRatio = Math.max(0, this.mouthOpenRatio - 0.15)
        this.notify()
      }
    }, 60)

    const scheduleNextBlink = () => {
      const delay = 3200 + Math.random() * 2400
      this.blinkTimer = setTimeout(() => {
        this.performBlinkCycle(() => {
          if (Math.random() < 0.25) {
            setTimeout(() => {
              this.performBlinkCycle(scheduleNextBlink)
            }, 100)
          } else {
            scheduleNextBlink()
          }
        })
      }, delay)
    }
    scheduleNextBlink()
  }

  private performBlinkCycle(onComplete: () => void): void {
    if (this.isReasoning) {
      this.blinkRatio = 0.5
      this.notify()
      setTimeout(onComplete, 400)
      return
    }

    this.blinkRatio = 1.0
    this.notify()

    setTimeout(() => {
      this.blinkRatio = 0.0
      this.notify()
      setTimeout(onComplete, 120)
    }, 90)
  }

  public resetActivity(): void {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer)
      this.inactivityTimer = null
    }

    if (this.isLongSajiao && (this.pose === 'sajiao' || this.pose === 'mad')) {
      this.isLongSajiao = false
      if (this.madTimer !== null) {
        clearTimeout(this.madTimer)
        this.madTimer = null
      }
      this.pose = 'default'
      this.recomputeState()
    }

    this.scheduleInactivityCheck()
  }

  private scheduleInactivityCheck(): void {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer)
    }
    this.inactivityTimer = setTimeout(() => {
      this.triggerInactivitySajiao()
    }, this.INACTIVITY_DELAY)
  }

  private triggerInactivitySajiao(): void {
    if (this.state !== 'IDLE' || this.isGalGameMode || this.isReasoning || this.isStreaming) {
      this.scheduleInactivityCheck()
      return
    }

    this.isLongSajiao = true
    this.pose = 'sajiao'
    this.speech = SAJIAO_LONELY_DIALOGUES[Math.floor(Math.random() * SAJIAO_LONELY_DIALOGUES.length)]
    this.notify()

    this.madTimer = setTimeout(() => {
      this.madTimer = null
      this.isLongSajiao = false
      if (this.pose === 'sajiao' || this.pose === 'mad') {
        this.pose = 'default'
        this.speech = this.getRandomDialogue('IDLE')
        this.notify()
      }
      this.scheduleInactivityCheck()
    }, 9000)
  }

  public setBalances(toppedUp: string, granted: string): void {
    if (this.toppedUpBalance === toppedUp && this.grantedBalance === granted) return
    this.toppedUpBalance = toppedUp
    this.grantedBalance = granted
    this.notify()
  }

  public setInputFocus(focused: boolean): void {
    this.resetActivity()
    if (this.isInputFocused === focused) return
    this.isInputFocused = focused

    if (focused) {
      this.gazeOffset.y = 0.65
    } else {
      this.gazeOffset.y = 0
    }

    this.recomputeState()
  }

  public setReasoning(reasoning: boolean): void {
    this.resetActivity()
    if (this.isReasoning === reasoning) return
    this.isReasoning = reasoning

    if (this.thinkingCycleTimer !== null) {
      clearTimeout(this.thinkingCycleTimer)
      this.thinkingCycleTimer = null
    }

    if (reasoning) {
      this.lastThinkingPose = this.thinkingPool[Math.floor(Math.random() * this.thinkingPool.length)]
      this.pose = this.lastThinkingPose
      this.speech = this.getRandomDialogue('REASONING')
      const randomDuration = 2000 + Math.floor(Math.random() * 1800)
      this.thinkingCycleTimer = setTimeout(() => {
        this.scheduleNextThinkingPose()
      }, randomDuration)
    } else {
      if (['think1', 'think2', 'think3', 'think4', 'think5', 'getit'].includes(this.pose)) {
        this.pose = 'default'
      }
    }

    this.recomputeState()
  }

  private scheduleNextThinkingPose(): void {
    if (!this.isReasoning) return

    const candidates = this.thinkingPool.filter((p) => p !== this.pose)
    let nextPose: PetPose
    // 20% chance to briefly splice getit.png into thinking
    if (Math.random() < 0.2) {
      nextPose = 'getit'
    } else {
      nextPose = candidates[Math.floor(Math.random() * candidates.length)]
    }

    this.lastThinkingPose = nextPose
    if (this.pose !== 'sajiao' && this.pose !== 'mad') {
      this.pose = nextPose
      this.notify()
    }

    // Random non-fixed duration between 2000ms and 3800ms
    const randomDuration = 2000 + Math.floor(Math.random() * 1800)
    this.thinkingCycleTimer = setTimeout(() => {
      this.scheduleNextThinkingPose()
    }, randomDuration)
  }

  public setReasoningText(text: string): void {
    if (this.reasoningText === text) return
    this.reasoningText = text
    this.notify()
  }

  public clearReasoningText(): void {
    if (this.reasoningText === '') return
    this.reasoningText = ''
    this.notify()
  }

  public setStreaming(streaming: boolean): void {
    this.resetActivity()
    if (this.isStreaming === streaming) return
    const wasStreaming = this.isStreaming
    this.isStreaming = streaming

    if (streaming) {
      if (this.thinkingCycleTimer !== null) {
        clearTimeout(this.thinkingCycleTimer)
        this.thinkingCycleTimer = null
      }
      if (this.eatingTimer !== null) {
        clearTimeout(this.eatingTimer)
        this.eatingTimer = null
      }
      this.isEatingPostOutput = false
      this.isEatingWandering = false
      this.pose = 'answering' // Answering.png during response output!
    } else if (wasStreaming && !streaming) {
      // Content output finished! Play baifan.png for 4.5 seconds
      this.triggerPostOutputEating(4500)
    }

    this.recomputeState()
  }

  public triggerPostOutputEating(durationMs: number = 4500): void {
    if (this.eatingTimer !== null) {
      clearTimeout(this.eatingTimer)
    }
    this.isEatingPostOutput = true
    this.pose = 'eating'
    this.speech = this.getRandomDialogue('EATING')
    this.recomputeState()

    this.eatingTimer = setTimeout(() => {
      this.eatingTimer = null
      this.isEatingPostOutput = false
      if (this.pose === 'eating') {
        this.pose = 'default'
      }
      this.recomputeState()
    }, durationMs)
  }

  public finishWanderingWithEating(durationMs: number = 3500): void {
    this.isWandering = false
    this.isEatingWandering = true
    this.pose = 'eating'
    this.speech = '散步累了，停下来吃两口热腾腾的白米饭补充能量~'
    this.recomputeState()

    if (this.eatingTimer !== null) {
      clearTimeout(this.eatingTimer)
    }
    this.eatingTimer = setTimeout(() => {
      this.eatingTimer = null
      this.isEatingWandering = false
      if (this.pose === 'eating') {
        this.pose = 'default'
      }
      this.recomputeState()
    }, durationMs)
  }

  public triggerMad(): void {
    this.triggerSajiao(false)
  }

  public triggerSajiao(isLong: boolean = false): void {
    this.resetActivity()
    if (this.madTimer !== null) {
      clearTimeout(this.madTimer)
    }
    this.isLongSajiao = isLong
    this.pose = 'sajiao'
    this.speech = isLong
      ? SAJIAO_LONELY_DIALOGUES[Math.floor(Math.random() * SAJIAO_LONELY_DIALOGUES.length)]
      : SAJIAO_CLICK_DIALOGUES[Math.floor(Math.random() * SAJIAO_CLICK_DIALOGUES.length)]
    this.notify()

    const duration = isLong ? 9000 : 2000
    this.madTimer = setTimeout(() => {
      this.madTimer = null
      this.isLongSajiao = false
      if (this.pose === 'sajiao' || this.pose === 'mad') {
        if (this.isReasoning) {
          this.pose = this.lastThinkingPose || 'think1'
        } else if (this.isStreaming) {
          this.pose = 'answering'
        } else if (this.isEatingPostOutput || this.isEatingWandering) {
          this.pose = 'eating'
        } else {
          this.pose = 'default'
        }
        this.speech = this.getRandomDialogue(this.state)
        this.notify()
      }
    }, duration)
  }

  public setPose(pose: PetPose): void {
    this.pose = pose
    this.notify()
  }

  public setLatestDialogue(text: string): void {
    if (this.latestDialogue === text) return
    this.latestDialogue = text
    this.notify()
  }

  public setGazeOffset(offset: GazeOffset): void {
    const clampedX = Math.max(-1, Math.min(1, offset.x))
    const clampedY = Math.max(-1, Math.min(1, offset.y))
    if (Math.abs(this.gazeOffset.x - clampedX) < 0.02 && Math.abs(this.gazeOffset.y - clampedY) < 0.02) {
      return
    }
    this.gazeOffset = { x: clampedX, y: clampedY }
    this.notify()
  }

  public setAutoGalGameOnChat(enabled: boolean): void {
    this.autoGalGameOnChat = enabled
    this.notify()
  }

  public toggleAutoGalGameOnChat(): void {
    this.setAutoGalGameOnChat(!this.autoGalGameOnChat)
  }

  public setForm(form: PetForm): void {
    this.resetActivity()
    if (this.form === form) return
    this.form = form
    this.notify()
  }

  public toggleForm(): void {
    this.setForm(this.form === 'chibi' ? 'maiden' : 'chibi')
  }

  public setGalGameMode(enabled: boolean): void {
    this.resetActivity()
    if (this.isGalGameMode === enabled) return
    this.isGalGameMode = enabled
    this.notify()
  }

  public toggleGalGameMode(): void {
    this.setGalGameMode(!this.isGalGameMode)
  }

  public setWandering(wandering: boolean): void {
    if (this.isStreaming || this.isReasoning || this.isInputFocused || this.isGalGameMode) return
    if (wandering && this.state === 'IDLE') {
      this.isWandering = true
      this.state = 'WANDERING'
      this.speech = this.getRandomDialogue('WANDERING')
      this.notify()
    } else if (!wandering && this.state === 'WANDERING') {
      this.finishWanderingWithEating(3500)
    }
  }

  private recomputeState(): void {
    let nextState: PetState = 'IDLE'

    if (this.isStreaming) {
      nextState = 'ANSWERING'
    } else if (this.isEatingPostOutput || this.isEatingWandering) {
      nextState = 'EATING'
    } else if (this.isReasoning) {
      nextState = 'REASONING'
    } else if (this.isInputFocused) {
      nextState = 'PEEKING'
    } else if (this.isWandering) {
      nextState = 'WANDERING'
    } else {
      nextState = 'IDLE'
    }

    if (nextState === this.state) return

    if ((this.state === 'ANSWERING' || this.state === 'EATING' || this.state === 'REASONING') &&
        nextState !== 'ANSWERING' && nextState !== 'EATING' && nextState !== 'REASONING') {
      if (this.debounceTimer !== null) clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null
        this.commitState(nextState)
      }, 350)
      return
    }

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    this.commitState(nextState)
  }

  private commitState(nextState: PetState): void {
    this.state = nextState
    if (this.pose !== 'sajiao' && this.pose !== 'mad') {
      this.speech = this.getRandomDialogue(nextState)
    }
    this.notify()

    if (this.speechTimer !== null) clearTimeout(this.speechTimer)
    this.speechTimer = setTimeout(() => {
      if (this.pose !== 'sajiao' && this.pose !== 'mad') {
        this.speech = this.getRandomDialogue(this.state)
        this.notify()
      }
    }, 7000)
  }

  public dispose(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (this.speechTimer !== null) {
      clearTimeout(this.speechTimer)
      this.speechTimer = null
    }
    if (this.animationTimer !== null) {
      clearInterval(this.animationTimer)
      this.animationTimer = null
    }
    if (this.blinkTimer !== null) {
      clearTimeout(this.blinkTimer)
      this.blinkTimer = null
    }
    if (this.thinkingCycleTimer !== null) {
      clearTimeout(this.thinkingCycleTimer)
      this.thinkingCycleTimer = null
    }
    if (this.madTimer !== null) {
      clearTimeout(this.madTimer)
      this.madTimer = null
    }
    if (this.eatingTimer !== null) {
      clearTimeout(this.eatingTimer)
      this.eatingTimer = null
    }
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer)
      this.inactivityTimer = null
    }
    this.listeners.clear()
  }
}

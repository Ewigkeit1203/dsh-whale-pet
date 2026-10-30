import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import type { PetStateMachine } from './state-machine.js'
import type { PetStatusInfo, PetPosition } from './types.js'
import { LivingPuppet } from './LivingPuppet.js'
import {
  MAIDEN_DATA_URI,
  CHIBI_DATA_URI,
  PONDERING_DATA_URI,
  PUZZLED_DATA_URI,
  PUFF_DATA_URI,
  GETIT_DATA_URI,
  SAJIAO_DATA_URI,
  BAIFAN_DATA_URI,
} from './assets-data.js'
import styles from './PetOverlay.module.css'

export interface PetOverlayProps {
  stateMachine: PetStateMachine
}

/**
 * Splits dialogue text into complete-sentence pages that comfortably fill the GalGame dialogue box.
 * Ensures complete sentences without abrupt mid-sentence cutoffs.
 */
function paginateDialogue(text: string, targetLength: number = 180): string[] {
  const trimmed = text.trim()
  if (!trimmed) return ['……']
  if (trimmed.length <= targetLength) return [trimmed]

  const pages: string[] = []
  let remaining = trimmed

  while (remaining.length > 0) {
    if (remaining.length <= targetLength) {
      pages.push(remaining)
      break
    }

    const searchSlice = remaining.slice(0, Math.min(remaining.length, Math.round(targetLength * 1.25)))
    const sentenceMatch = searchSlice.match(/([。！？\n!?]+)(?=[^。！？\n!?]*$)/)
    let cutIndex = -1

    if (sentenceMatch && sentenceMatch.index !== undefined && sentenceMatch.index >= Math.round(targetLength * 0.45)) {
      cutIndex = sentenceMatch.index + sentenceMatch[1].length
    } else {
      const commaMatch = searchSlice.match(/([，；,;]+)(?=[^，；,;]*$)/)
      if (commaMatch && commaMatch.index !== undefined && commaMatch.index >= Math.round(targetLength * 0.5)) {
        cutIndex = commaMatch.index + commaMatch[1].length
      } else {
        cutIndex = targetLength
      }
    }

    const page = remaining.slice(0, cutIndex).trim()
    if (page) pages.push(page)
    remaining = remaining.slice(cutIndex).trim()
  }

  return pages.length > 0 ? pages : [trimmed]
}

export function PetOverlay({ stateMachine }: PetOverlayProps) {
  const [status, setStatus] = useState<PetStatusInfo>(() => stateMachine.getStatus())
  const [position, setPosition] = useState<PetPosition>({
    x: window.innerWidth - 220,
    y: window.innerHeight - 260,
    side: 'right',
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isBouncing, setIsBouncing] = useState(false)
  const [wanderingEnabled, setWanderingEnabled] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isThoughtBubbleVisible, setIsThoughtBubbleVisible] = useState(true)

  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ startX: number; startY: number; petX: number; petY: number; startTime: number } | null>(null)
  const wanderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textScrollRef = useRef<HTMLDivElement>(null)
  const thoughtScrollRef = useRef<HTMLDivElement>(null)
  const lastDialogueRef = useRef('')

  // Subscribe to state machine
  useEffect(() => {
    return stateMachine.subscribe((newStatus) => {
      setStatus(newStatus)
    })
  }, [stateMachine])

  // Sync GalGame mode class to document.body
  useEffect(() => {
    if (status.isGalGameMode) {
      document.body.classList.add('dsh-galgame-mode')
    } else {
      document.body.classList.remove('dsh-galgame-mode')
    }
    return () => {
      document.body.classList.remove('dsh-galgame-mode')
    }
  }, [status.isGalGameMode])

  // Paginate reply text for Visual Novel paragraph progression
  // 目标字数与剧场框尺寸匹配：框加大后尽量放满每一段
  const dialoguePages = useMemo(() => {
    return paginateDialogue(status.latestDialogue || status.speech, 260)
  }, [status.latestDialogue, status.speech])

  // Reset pagination when a new response starts
  useEffect(() => {
    const cur = status.latestDialogue || status.speech
    if (cur !== lastDialogueRef.current) {
      if (!lastDialogueRef.current || !cur.startsWith(lastDialogueRef.current.slice(0, 30))) {
        setCurrentPageIndex(0)
      }
      lastDialogueRef.current = cur
    }
  }, [status.latestDialogue, status.speech])

  // Re-open thought bubble when new reasoning begins
  useEffect(() => {
    if (status.isReasoning) {
      setIsThoughtBubbleVisible(true)
    }
  }, [status.isReasoning])

  // Auto-scroll thought bubble as CoT streams in
  useEffect(() => {
    if (thoughtScrollRef.current) {
      thoughtScrollRef.current.scrollTop = thoughtScrollRef.current.scrollHeight
    }
  }, [status.reasoningText])

  // Auto-scroll dialogue box when streaming
  useEffect(() => {
    if (status.isGalGameMode && textScrollRef.current) {
      textScrollRef.current.scrollTop = textScrollRef.current.scrollHeight
    }
  }, [currentPageIndex, status.latestDialogue, status.isGalGameMode])

  // Menu hover persistence logic
  const handleMouseEnterPet = useCallback(() => {
    if (menuTimerRef.current) {
      clearTimeout(menuTimerRef.current)
      menuTimerRef.current = null
    }
    setIsMenuOpen(true)
  }, [])

  const handleMouseLeavePet = useCallback(() => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current)
    menuTimerRef.current = setTimeout(() => {
      setIsMenuOpen(false)
    }, 750)
  }, [])

  // Mouse gaze tracking listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (status.isInputFocused) return
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const nx = (e.clientX - centerX) / (window.innerWidth / 2)
      const ny = (e.clientY - centerY) / (window.innerHeight / 2)
      stateMachine.setGazeOffset({ x: nx, y: ny })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [status.isInputFocused, stateMachine])

  // Wandering Logic (Pauses on dragging)
  useEffect(() => {
    if (!wanderingEnabled || status.isGalGameMode) {
      if (wanderTimerRef.current !== null) {
        clearInterval(wanderTimerRef.current)
        wanderTimerRef.current = null
      }
      return
    }

    const interval = setInterval(() => {
      if (isDraggingRef.current) return

      const curStatus = stateMachine.getStatus()
      if (curStatus.state !== 'IDLE' && curStatus.state !== 'WANDERING') return

      stateMachine.setWandering(true)

      const margin = 40
      const width = status.form === 'maiden' ? 280 : 170
      const height = status.form === 'maiden' ? 420 : 220
      const maxX = Math.max(margin, window.innerWidth - width - margin)
      const minX = Math.max(margin, window.innerWidth - 420)
      const targetX = Math.floor(minX + Math.random() * (maxX - minX))
      const targetY = Math.max(margin, window.innerHeight - height - margin)

      setPosition((prev) => ({
        x: targetX,
        y: targetY,
        side: targetX < window.innerWidth / 2 ? 'left' : 'right',
      }))

      setTimeout(() => {
        stateMachine.setWandering(false)
      }, 3300)
    }, 14000)

    wanderTimerRef.current = interval
    return () => {
      clearInterval(interval)
      wanderTimerRef.current = null
    }
  }, [wanderingEnabled, status.form, status.isGalGameMode, stateMachine])

  // Dragging and click handlers for floating widget (Double-click shrunk state completely removed)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (status.isGalGameMode) return
    isDraggingRef.current = true
    setIsDragging(true)
    stateMachine.setWandering(false)

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      petX: position.x,
      petY: position.y,
      startTime: Date.now(),
    }
  }, [position, status.isGalGameMode, stateMachine])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return
      const dx = e.clientX - dragStartRef.current.startX
      const dy = e.clientY - dragStartRef.current.startY
      const newX = Math.max(10, Math.min(window.innerWidth - 180, dragStartRef.current.petX + dx))
      const newY = Math.max(10, Math.min(window.innerHeight - 200, dragStartRef.current.petY + dy))
      setPosition({
        x: newX,
        y: newY,
        side: newX < window.innerWidth / 2 ? 'left' : 'right',
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      isDraggingRef.current = false
      setIsDragging(false)
      if (dragStartRef.current) {
        const dist = Math.hypot(e.clientX - dragStartRef.current.startX, e.clientY - dragStartRef.current.startY)
        const duration = Date.now() - dragStartRef.current.startTime
        if (dist < 6 && duration < 380) {
          // Direct single-click: Q-bounce + Mad/Sajiao reaction + Slide out Settings
          setIsBouncing(true)
          setTimeout(() => setIsBouncing(false), 480)
          stateMachine.triggerMad()
          setIsSettingsOpen((prev) => !prev)
        }
      }
      dragStartRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, stateMachine])

  // Advance GalGame text page on clicking dialogue text
  const handleAdvancePage = () => {
    if (currentPageIndex < dialoguePages.length - 1) {
      setCurrentPageIndex((prev) => prev + 1)
    } else if (dialoguePages.length > 1) {
      setCurrentPageIndex(0)
    }
  }

  // Send message via native DSH composer
  const handleSendMessage = () => {
    const text = inputValue.trim()
    if (!text) return

    stateMachine.setLatestDialogue(`「${text}」—— 正在为你调用深海算力，请稍候……`)
    stateMachine.clearReasoningText()
    stateMachine.setReasoning(true)
    setCurrentPageIndex(0)
    setIsThoughtBubbleVisible(true)
    setInputValue('')

    const composerEl = (
      document.querySelector('[data-composer-input]') ||
      document.querySelector('[data-composer-card] [contenteditable="true"]') ||
      document.querySelector('[data-composer-card] [role="textbox"]') ||
      document.querySelector('[data-composer-seat] [contenteditable="true"]') ||
      document.querySelector('[data-composer-seat] textarea') ||
      document.querySelector('textarea')
    ) as HTMLElement | null

    if (!composerEl) {
      console.warn('[dsh-whale-pet] Could not locate DSH composer element')
      return
    }

    const seat = (document.querySelector('[data-composer-seat]') || document.querySelector('[data-composer-card]')) as HTMLElement | null
    if (seat) {
      seat.style.pointerEvents = 'auto'
    }

    if (composerEl instanceof HTMLTextAreaElement || composerEl instanceof HTMLInputElement) {
      composerEl.focus()
      composerEl.value = text
      composerEl.dispatchEvent(new Event('input', { bubbles: true }))
      composerEl.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      composerEl.focus()
      const sel = window.getSelection()
      if (sel) {
        const range = document.createRange()
        range.selectNodeContents(composerEl)
        range.collapse(false)
        sel.removeAllRanges()
        sel.addRange(range)
      }

      let inserted = false
      try {
        inserted = document.execCommand('insertText', false, text)
      } catch {
        inserted = false
      }

      if (!inserted) {
        try {
          const inputEvent = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text,
          })
          composerEl.dispatchEvent(inputEvent)
        } catch {
          // ignore
        }
        composerEl.textContent = text
        composerEl.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }

    setTimeout(() => {
      const card = document.querySelector('[data-composer-card]') || document.querySelector('[data-composer-seat]')
      let sendBtn: HTMLElement | null = null

      if (card) {
        const buttons = Array.from(card.querySelectorAll('button'))
        sendBtn = (
          buttons.find((b) => {
            const aria = b.getAttribute('aria-label') || b.textContent || ''
            return /send|发送|steer|queue/i.test(aria) && !b.disabled
          }) ||
          (buttons.length > 0 ? (buttons[buttons.length - 1] as HTMLElement) : null)
        )
      }

      if (sendBtn && !sendBtn.hasAttribute('disabled')) {
        sendBtn.click()
      } else {
        composerEl.focus()
        const enterEv = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        })
        composerEl.dispatchEvent(enterEv)
      }
    }, 80)
  }

  // Dynamic Image Selection
  // 正式输出或干饭动作时切换为大口吃白饭插画（baifan2.png）
  const resolveCharacterImage = (): string => {
    if (status.state === 'EATING' || status.pose === 'eating') {
      return BAIFAN_DATA_URI
    }
    if (status.form === 'chibi') {
      return CHIBI_DATA_URI
    }
    if (status.pose === 'mad') {
      return SAJIAO_DATA_URI
    }
    if (status.state === 'REASONING') {
      if (status.pose === 'puzzled') return PUZZLED_DATA_URI
      if (status.pose === 'puff') return PUFF_DATA_URI
      if (status.pose === 'getit') return GETIT_DATA_URI
      return PONDERING_DATA_URI
    }
    return MAIDEN_DATA_URI
  }

  const isMaiden = status.form === 'maiden'
  const currentImgSrc = resolveCharacterImage()
  const displayDialogue = dialoguePages[currentPageIndex] || dialoguePages[0] || ''

  const stateClass =
    status.state === 'PEEKING'
      ? styles.statePeeking
      : status.state === 'REASONING'
      ? styles.stateReasoning
      : status.state === 'EATING'
      ? styles.stateEating
      : status.state === 'WANDERING'
      ? styles.stateWandering
      : styles.stateIdle

  // -------------------------------------------------------------
  // GalGame Mode: Screen Centered Stage & Comic Thought Bubble
  // -------------------------------------------------------------
  if (status.isGalGameMode) {
    const showThoughtBubble = isThoughtBubbleVisible && (status.isReasoning || Boolean(status.reasoningText))

    return (
      <>
        {/* Full-screen Backdrop: Clicking anywhere on blank space exits GalGame mode */}
        <div
          className="galgameBackdrop"
          onClick={() => stateMachine.setGalGameMode(false)}
          title="点击空白区域退出对话模式"
        />

        {/* Comic Thought Bubble: Placed beside the character's head */}
        {showThoughtBubble && (
          <div className="comicThoughtBubble">
            <div className="thoughtBubbleHeader">
              <div className="thoughtBubbleTitleGroup">
                <span>💭</span>
                <span>深度思考过程</span>
                {status.isReasoning && <span className="thoughtLivePill">推理中...</span>}
              </div>
              <button
                className="thoughtCloseBtn"
                onClick={() => setIsThoughtBubbleVisible(false)}
                title="隐藏思考气泡"
              >
                ✕
              </button>
            </div>

            <div className="thoughtBubbleContent" ref={thoughtScrollRef}>
              {status.reasoningText || '思考中……正在检索深海知识库，梳理多维逻辑脉络……'}
            </div>

            {/* Comic trailing bubbles leading to character head */}
            <div className="comicTrailNode trail1" />
            <div className="comicTrailNode trail2" />
            <div className="comicTrailNode trail3" />
          </div>
        )}

        {/* Character Stage: Centered on screen */}
        <div className={`galgameCharacterCentered ${isMaiden ? 'galgameCharacterMaiden' : 'galgameCharacterChibi'}`}>
          <LivingPuppet
            imgSrc={currentImgSrc}
            isMaiden={isMaiden}
            isGalGameMode={true}
            mouthOpenRatio={status.mouthOpenRatio}
            gazeOffset={status.gazeOffset}
            state={status.state}
          />
        </div>

        {/* Spacious Visual Novel Dialogue Box (Z-Index 999999, Direct Reply, Click to Advance) */}
        <div className="galgameTheatreBox">
          {/* Header Bar: Clean & Minimal (Only NameTag and Exit button) */}
          <div className="galgameHeaderBar">
            <div className="galgameNameTag">
              <span>🐟</span>
              <span>大肥鱼</span>
            </div>

            <div className="galgameTopControls">
              {dialoguePages.length > 1 && (
                <span className="galgamePageBadge">
                  第 {currentPageIndex + 1} / {dialoguePages.length} 段
                </span>
              )}
              <button
                className="galgameCloseBtn"
                onClick={() => stateMachine.setGalGameMode(false)}
                title="退出对话模式 (或点击空白处退出)"
              >
                ✕ 退出
              </button>
            </div>
          </div>

          {/* Dialogue Text Area: Direct character response, click to switch to next paragraph */}
          <div
            className="galgameTextBody"
            ref={textScrollRef}
            onClick={handleAdvancePage}
            title={dialoguePages.length > 1 ? '点击切换下一段话' : undefined}
          >
            <span className="galgameQuotes">「</span>
            <span>{displayDialogue}</span>
            {status.isStreaming && <span className="galgameCursor" />}
            <span className="galgameQuotes">」</span>
          </div>

          {/* GalGame Click to Continue Indicator */}
          {dialoguePages.length > 1 && (
            <div className="galgamePagePrompt" onClick={handleAdvancePage}>
              {currentPageIndex < dialoguePages.length - 1 ? (
                <>
                  <span>▼ 点击下一段</span>
                  <span>({currentPageIndex + 1}/{dialoguePages.length})</span>
                </>
              ) : (
                <>
                  <span>● 点击回开头</span>
                  <span>({dialoguePages.length}/{dialoguePages.length})</span>
                </>
              )}
            </div>
          )}

          {/* Integrated Composer Box */}
          <div className="galgameComposerArea">
            <input
              type="text"
              className="galgameInput"
              placeholder="输入你的问题，与大肥鱼对话…… (Enter 发送)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
            <button className="galgameSendBtn" onClick={handleSendMessage}>
              发送
            </button>
          </div>
        </div>
      </>
    )
  }

  // -------------------------------------------------------------
  // Widget Mode: Floating Desktop Pet at Viewport Edge
  // -------------------------------------------------------------
  return (
    <div
      className={`${styles.overlayContainer} ${
        isDragging ? styles.dragging : status.state === 'WANDERING' ? styles.wandering : ''
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseEnter={handleMouseEnterPet}
      onMouseLeave={handleMouseLeavePet}
    >
      <div className={`${styles.characterWrapper} ${stateClass} ${isBouncing ? styles.qBounce : ''}`}>
        {/* Floating Action Toolbar */}
        <div
          className={`${styles.toolbar} ${isMenuOpen ? styles.toolbarVisible : ''}`}
          onMouseEnter={handleMouseEnterPet}
          onMouseLeave={handleMouseLeavePet}
        >
          {/* Balance display directly on top of the toolbar */}
          <div className={styles.balanceHeaderBar} title="当前账户实时余额">
            <span className={styles.balanceTag}>充值:</span>
            <span className={styles.balanceVal}>{status.toppedUpBalance || '¥0.00'}</span>
            <span className={styles.balanceDivider}>|</span>
            <span className={styles.balanceTag}>赠金:</span>
            <span className={styles.balanceVal}>{status.grantedBalance || '¥0.00'}</span>
          </div>

          <div className={styles.toolbarButtons}>
            <button
              className={styles.toolBtn}
              onClick={() => stateMachine.toggleForm()}
              title="切换少女立绘 / Q版形态"
            >
              {isMaiden ? '切换Q版' : '切换立绘'}
            </button>
            <button
              className={styles.toolBtn}
              onClick={() => stateMachine.setGalGameMode(true)}
              title="切换进入对话模式"
            >
              对话模式
            </button>
            <button
              className={styles.toolBtn}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              title="展开更多设置面板"
            >
              设置
            </button>
          </div>
        </div>

        {/* Slide-out Settings Drawer on Pet Click / Settings Toggle */}
        {isSettingsOpen && (
          <div
            className={`${styles.settingsDrawer} ${
              position.x > (typeof window !== 'undefined' ? window.innerWidth - 320 : 800)
                ? styles.settingsDrawerLeft
                : styles.settingsDrawerRight
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <span>🐟 大肥鱼设置</span>
              <button
                className={styles.drawerCloseBtn}
                onClick={() => setIsSettingsOpen(false)}
                title="关闭设置"
              >
                ✕
              </button>
            </div>

            {/* Character Form */}
            <div className={styles.drawerItem}>
              <span className={styles.drawerLabel}>角色形态</span>
              <div className={styles.drawerBtnGroup}>
                <button
                  className={`${styles.drawerBtn} ${status.form === 'chibi' ? styles.drawerBtnActive : ''}`}
                  onClick={() => stateMachine.setForm('chibi')}
                >
                  迷你Q版
                </button>
                <button
                  className={`${styles.drawerBtn} ${status.form === 'maiden' ? styles.drawerBtnActive : ''}`}
                  onClick={() => stateMachine.setForm('maiden')}
                >
                  少女立绘
                </button>
              </div>
            </div>

            {/* Launch Dialogue Theatre */}
            <div className={styles.drawerItem}>
              <button
                className={styles.drawerFullBtn}
                onClick={() => {
                  setIsSettingsOpen(false)
                  stateMachine.setGalGameMode(true)
                }}
              >
                展开剧场对话模式
              </button>
            </div>

            {/* Auto Open on Chat */}
            <div className={styles.drawerItem}>
              <button
                className={`${styles.drawerFullBtn} ${status.autoGalGameOnChat ? styles.drawerBtnActive : ''}`}
                onClick={() => stateMachine.toggleAutoGalGameOnChat()}
              >
                {status.autoGalGameOnChat ? '点击输入框自动展开: 开' : '点击输入框自动展开: 关'}
              </button>
            </div>

            {/* Wandering Stroll */}
            <div className={styles.drawerItem}>
              <button
                className={`${styles.drawerFullBtn} ${wanderingEnabled ? styles.drawerBtnActive : ''}`}
                onClick={() => setWanderingEnabled(!wanderingEnabled)}
              >
                {wanderingEnabled ? '闲置随机散步: 开' : '闲置随机散步: 关'}
              </button>
            </div>
          </div>
        )}

        {/* Speech Dialogue Bubble */}
        {status.speech && !isSettingsOpen && (
          <div className={styles.speechBubble}>
            {status.speech}
          </div>
        )}

        {/* Thinking Bubbles during Reasoning */}
        {status.state === 'REASONING' && (
          <div className={styles.bubbleContainer}>
            <div className={`${styles.bubble} ${styles.bubble1}`} />
            <div className={`${styles.bubble} ${styles.bubble2}`} />
            <div className={`${styles.bubble} ${styles.bubble3}`} />
          </div>
        )}

        {/* Living Puppet (Double click switch to chibi removed) */}
        <LivingPuppet
          imgSrc={currentImgSrc}
          isMaiden={isMaiden}
          isGalGameMode={false}
          mouthOpenRatio={status.mouthOpenRatio}
          gazeOffset={status.gazeOffset}
          state={status.state}
          onMouseDown={handleMouseDown}
        />
      </div>
    </div>
  )
}

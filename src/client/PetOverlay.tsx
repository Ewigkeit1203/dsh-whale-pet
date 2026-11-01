import { SettingsPanel } from './SettingsPanel.js'
import { TheatreView } from './TheatreView.js'
import { paginateText, revealDelay, diagnosticReport } from './usability.js'
import { dialogueBlocks, readConversationLog, type HistoryEntry } from './experience.js'
import { readPreferences, savePreferences, quietPreset, defaultPreferences, type Preferences } from './preferences.js'
import { FEATURES, effectiveForm } from './features.js'
import { POSE_META, spriteGeometry } from './poses.js'
import { LAYOUT, layoutGroup, clampPet, wanderDestination, placeGroupX, groupFits, type PanelSide } from './layout.js'
import { walletView } from './wallet.js'
import { PetVoice, appendedSpeech, speakableText } from './voice.js'
import { tariffAt, type Tier } from './peak.js'
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import type { PetStateMachine } from './state-machine.js'
import type { PetStatusInfo } from './types.js'
import { LivingPuppet } from './LivingPuppet.js'
import {
  MAID_DATA_URI,
  CHIBI_DATA_URI,
  ANSWERING_DATA_URI,
  BAIFAN_DATA_URI,
  GETIT_DATA_URI,
  SAJIAO_DATA_URI,
  THINK1_DATA_URI,
  THINK2_DATA_URI,
  THINK3_DATA_URI,
  THINK4_DATA_URI,
  THINK5_DATA_URI,
  DIZZY_DATA_URI,
} from './assets-data.js'

export interface PetOverlayProps {
  stateMachine: PetStateMachine
}

/** Measured pagination; code blocks stay whole so they can scroll inside their card. */
function paginateDialogue(text: string, width: number, height: number, font: number): string[] {
  const blocks = dialogueBlocks(text)
  let measure: ((text: string) => number) | undefined
  if (typeof document.createElement === 'function') {
    const context = document.createElement('canvas').getContext('2d')
    if (context) { context.font = font + 'px "Microsoft YaHei", "PingFang SC", sans-serif'; measure = value => context.measureText(value).width }
  }
  return blocks.flatMap(block => block.kind === 'code' ? ['```' + (block.language || '') + '\n' + block.text + '\n```'] : paginateText(block.text, width, height, font, measure))
}

const COMPOSER_SELECTOR = '[data-composer-card], [data-composer-seat]'
const DOCK_PEEK = 0.52

/** Browser frame scheduler with a synchronous fallback (tests, very old hosts). */
const nextFrame = (callback: () => void): void => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => callback())
  else callback()
}

/**
 * Fields the views actually draw. Blink is not drawn, mouth only matters as
 * "talking or not" and gaze is quantised, so animation ticks and every pointer
 * move no longer re-render the whole overlay.
 */
function statusRenderKey(s: PetStatusInfo): string {
  return [s.state, s.form, s.pose, s.speech, s.reasoningText.length, s.reasoningText.slice(-24), s.latestDialogue.length, s.latestDialogue.slice(-24),
    s.isReasoning, s.isStreaming, s.isInputFocused, s.isGalGameMode, s.autoGalGameOnChat, s.mouthOpenRatio > 0.15,
    s.balancesKnown, s.toppedUpBalance, s.grantedBalance,
    s.hostBalance?.status, s.hostBalance?.updatedAt, s.hostBalance ? JSON.stringify([s.hostBalance.toppedUp, s.hostBalance.granted]) : ''].join('\u0001')
}

const dockIcon = (d: string) => <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>

export function PetOverlay({ stateMachine }: PetOverlayProps) {
  const [preferences, setPreferences] = useState(readPreferences)
  const t = (zh: string, en: string) => preferences.language === 'en' ? en : zh
  const update = (patch: Partial<Preferences>) => setPreferences(prev => ({ ...prev, ...patch }))
  const [status, setStatus] = useState<PetStatusInfo>(() => stateMachine.getStatus())
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const initialStage = spriteGeometry('Maid', window.innerHeight, preferences.scale)
  const [position, setPosition] = useState(() => clampPet(
    preferences.x ?? window.innerWidth - initialStage.stageWidth - 24,
    preferences.y ?? window.innerHeight - initialStage.stageHeight - 30,
    initialStage.stageWidth, initialStage.stageHeight, window.innerWidth, window.innerHeight))
  const [composerTop, setComposerTop] = useState<number | undefined>(undefined)
  const [panelHeight, setPanelHeight] = useState(0)
  const [uiHidden, setUiHidden] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [revealed, setRevealed] = useState(0)
  const [toast, setToast] = useState('')
  const [affection, setAffection] = useState<'pat' | 'dizzy' | 'float' | ''>('')
  const [clock, setClock] = useState(() => Date.now())
  const voiceRef = useRef<PetVoice | null>(null)
  if (!voiceRef.current) voiceRef.current = new PetVoice()
  const previousPose = useRef('')
  const revealIdentity = useRef({ page: -1, text: '' })
  const startedAt = useRef(0)
  const lunchDay = useRef('')
  const headPat = useRef({ x: 0, direction: 0, turns: 0, time: 0, cooldown: 0 })
  const [pageBox, setPageBox] = useState({ width: 760, height: 140 })
  const [doctor, setDoctor] = useState('')
  const [ghost, setGhost] = useState(false)
  const [petHidden, setPetHidden] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [bubbleHidden, setBubbleHidden] = useState(false)
  const wheelTime = useRef(0)
  const [dimmed, setDimmed] = useState(false)
  const [foreground, setForeground] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)
  const previousStream = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isBouncing, setIsBouncing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isThoughtBubbleVisible, setIsThoughtBubbleVisible] = useState(true)
  const [tierAnnounce, setTierAnnounce] = useState<{ tier: Tier; until: number } | null>(null)
  const [panelFlipping, setPanelFlipping] = useState(false)

  const sideRef = useRef<PanelSide | undefined>(undefined)
  const statusKeyRef = useRef('')
  const statusFrameRef = useRef<PetStatusInfo | null>(null)
  const dragFrameRef = useRef<{ x: number; y: number } | null>(null)
  const previousTierRef = useRef<Tier | null>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ startX: number; startY: number; petX: number; petY: number; startTime: number; maxDistance: number; distance: number; lastX: number; lastY: number; lastMove: number; vx: number; vy: number } | null>(null)
  const wanderPositionRef = useRef(position)
  wanderPositionRef.current = position
  const [wanderRequest, setWanderRequest] = useState(0)
  const pendingWanderRef = useRef<{ x: number; y: number } | null>(null)
  const wanderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const delayedTimers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textScrollRef = useRef<HTMLDivElement>(null)
  const thoughtScrollRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const followThoughtRef = useRef(true)
  const followTextRef = useRef(true)
  const lastDialogueRef = useRef('')
  const spokenStreamRef = useRef('')
  const spokenRevealRef = useRef(0)
  /** Latest geometry for event handlers registered once per drag. */
  const constrainRef = useRef<(x: number, y: number) => { x: number; y: number }>((x, y) => ({ x, y }))

  useEffect(() => () => {
    delayedTimers.current.forEach(timer => clearTimeout(timer))
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current)
  }, [])
  const later = (callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      delayedTimers.current.delete(timer)
      callback()
    }, delay)
    delayedTimers.current.add(timer)
    return timer
  }

  // Chibi form is paused: render maiden even if an older preference stored chibi.
  useEffect(() => {
    stateMachine.setForm(effectiveForm(preferences.form))
    stateMachine.setAutoGalGameOnChat(preferences.autoGalGame)
  }, [stateMachine])
  useEffect(() => {
    const timer = setTimeout(() => savePreferences({ ...preferences, form: FEATURES.chibiForm ? status.form : preferences.form, autoGalGame: status.autoGalGameOnChat, x: position.x, y: position.y }), 250)
    return () => clearTimeout(timer)
  }, [preferences, status.form, status.autoGalGameOnChat, position])

  const petName = preferences.petName.trim() || '大肥鱼'
  const userName = preferences.userName.trim() || '你'
  /** Lines address the user as 主人 and call her 大肥鱼; both follow the names set in Settings. */
  const address = (text: string) => text.replaceAll('主人', userName).replaceAll('大肥鱼', petName)
  const companionSpeech = preferences.language === 'zh' ? status.speech :
    status.pose === 'sajiao' ? 'Hey, stay with me a little longer!' :
    ({ IDLE: 'I’m right here with you.', PEEKING: 'I’m listening. What’s on your mind?', REASONING: 'Let me think this through…', ANSWERING: 'Putting the answer together for you…', EATING: 'Time for a little rice break!', WANDERING: 'Taking a little stroll…' }[status.state])
  const phaseLabel = ({ IDLE: t('待机', 'Ready'), PEEKING: t('倾听中', 'Listening'), REASONING: t('思考中', 'Thinking'), ANSWERING: t('回答中', 'Answering'), EATING: t('休息中', 'Resting'), WANDERING: t('散步中', 'Strolling') }[status.state])

  // ---- Geometry -------------------------------------------------------------
  const renderForm = FEATURES.chibiForm ? status.form : 'maiden'
  const isMaiden = renderForm === 'maiden'
  const resolveCharacter = (): [string, string] => {
    if (!isMaiden) return [CHIBI_DATA_URI, 'DaFeiYu']
    if (affection === 'pat') return [SAJIAO_DATA_URI, 'sajiao']
    if (affection === 'dizzy' && !status.isStreaming) return [DIZZY_DATA_URI, 'Dizzy']
    if (status.pose === 'sajiao' || status.pose === 'mad') return [SAJIAO_DATA_URI, 'sajiao']
    if (status.isStreaming) return [ANSWERING_DATA_URI, 'Answering']
    if (status.pose === 'eating' || status.state === 'EATING') return [BAIFAN_DATA_URI, 'baifan']
    if (status.pose === 'answering' || status.state === 'ANSWERING') return [ANSWERING_DATA_URI, 'Answering']
    if (status.pose === 'getit') return [GETIT_DATA_URI, 'getit']
    if (status.pose === 'think1') return [THINK1_DATA_URI, 'Think1']
    if (status.pose === 'think2') return [THINK2_DATA_URI, 'Think2']
    if (status.pose === 'think3') return [THINK3_DATA_URI, 'Think3']
    if (status.pose === 'think4') return [THINK4_DATA_URI, 'Think4']
    if (status.pose === 'think5') return [THINK5_DATA_URI, 'Think5']
    if (status.state === 'REASONING') return [THINK1_DATA_URI, 'Think1']
    return [MAID_DATA_URI, 'Maid']
  }
  const [currentImgSrc, hitPose] = resolveCharacter()
  const geometry = spriteGeometry(hitPose, viewport.height, preferences.scale)
  const stageW = geometry.stageWidth
  const stageH = geometry.stageHeight
  const docked = preferences.docked
  const petBox = docked
    ? { x: viewport.width - stageW - 12, y: Math.round(viewport.height - stageH * DOCK_PEEK) }
    : position
  const group = isSettingsOpen ? layoutGroup({
    viewportWidth: viewport.width, viewportHeight: viewport.height, composerTop,
    pet: { x: petBox.x, y: petBox.y, width: stageW, height: stageH },
    panelHeight, previousSide: sideRef.current, petPinned: docked,
  }) : null
  const petPos = group && group.mode === 'tethered' ? group.pet : petBox
  const imageTop = stageH - geometry.imageHeight

  constrainRef.current = (x: number, y: number) => {
    const free = clampPet(x, y, stageW, stageH, viewport.width, viewport.height)
    if (!isSettingsOpen || !groupFits(viewport.width, viewport.height, stageW, composerTop)) return free
    const placed = placeGroupX(free.x, stageW, viewport.width, sideRef.current)
    sideRef.current = placed.side
    return { x: placed.x, y: free.y }
  }

  // A side switch slides the panel across instead of teleporting it.
  const lastPanelSide = useRef<PanelSide | undefined>(undefined)
  useEffect(() => {
    if (!group) { lastPanelSide.current = undefined; return }
    if (lastPanelSide.current && lastPanelSide.current !== group.side) { setPanelFlipping(true); later(() => setPanelFlipping(false), 260) }
    lastPanelSide.current = group.side
  }, [group?.side, isSettingsOpen])
  // Keep hysteresis and commit group adjustments so closing the panel does not jump.
  useEffect(() => {
    if (!group) return
    sideRef.current = group.side
    if (group.mode === 'tethered' && !docked && !isDraggingRef.current && (group.pet.x !== position.x || group.pet.y !== position.y)) setPosition(group.pet)
  }, [group?.side, group?.mode, group?.pet.x, group?.pet.y, docked])

  useEffect(() => {
    const resize = () => {
      setViewport(previous => previous.width === window.innerWidth && previous.height === window.innerHeight ? previous : { width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  // Size steps and window changes keep the full portrait on screen.
  useEffect(() => {
    setPosition(previous => {
      const next = clampPet(previous.x, previous.y, stageW, stageH, viewport.width, viewport.height)
      return next.x === previous.x && next.y === previous.y ? previous : next
    })
  }, [stageW, stageH, viewport.width, viewport.height])

  // Settings: composer avoidance, outside click, Escape, panel measurement.
  useEffect(() => {
    if (!isSettingsOpen) return
    const place = () => {
      const top = document.querySelector(COMPOSER_SELECTOR)?.getBoundingClientRect().top
      setComposerTop(top !== undefined && Number.isFinite(top) && top > 0 ? Math.round(top) : undefined)
      const panel = panelRef.current
      if (panel) {
        const header = panel.querySelector('.petPanelHeader') as HTMLElement | null
        const body = panel.querySelector('.petSettingsBody') as HTMLElement | null
        const footer = panel.querySelector('.petSettingsFooter') as HTMLElement | null
        const natural = (header?.offsetHeight || 0) + (body?.scrollHeight || 0) + (footer?.offsetHeight || 0) + 2
        setPanelHeight(previous => Math.abs(previous - natural) < 2 ? previous : natural)
      }
    }
    place()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null
    const body = panelRef.current?.querySelector('.petSettingsBody')
    if (body) observer?.observe(body)
    panelRef.current?.addEventListener('toggle', place, true)
    window.addEventListener('resize', place)
    const dismiss = (event: PointerEvent) => { if (event.target instanceof Element && !event.target.closest('[data-whale-pet]')) setIsSettingsOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.isComposing) setIsSettingsOpen(false) }
    window.addEventListener('pointerdown', dismiss, true)
    window.addEventListener('keydown', escape)
    return () => {
      observer?.disconnect()
      panelRef.current?.removeEventListener('toggle', place, true)
      window.removeEventListener('resize', place); window.removeEventListener('pointerdown', dismiss, true); window.removeEventListener('keydown', escape)
    }
  }, [isSettingsOpen, preferences.language, preferences.fontSize])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'Alt') setGhost(true)
      if (event.isComposing || !event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key.toLowerCase() === 'w') { event.preventDefault(); setPetHidden(hidden => !hidden) }
      if (event.key.toLowerCase() === 't') { event.preventDefault(); stateMachine.toggleGalGameMode() }
    }
    const up = (event: KeyboardEvent) => { if (event.key === 'Alt') setGhost(false) }
    const reset = () => setGhost(false)
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', reset)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', reset) }
  }, [stateMachine])

  // At most one render per frame, and only when something drawn changed.
  // Gaze is applied as CSS variables outside React (see LivingPuppet).
  useEffect(() => {
    let gaze = stateMachine.getStatus().gazeOffset
    let gazeQueued = false
    const writeGaze = () => {
      gazeQueued = false
      document.querySelectorAll?.('[data-whale-pet="widget"], [data-whale-pet="stage"]').forEach(node => {
        const el = node as HTMLElement
        el.style.setProperty('--gaze-x', gaze.x.toFixed(3))
        el.style.setProperty('--gaze-y', gaze.y.toFixed(3))
      })
    }
    const unsubscribe = stateMachine.subscribe(next => {
      if (next.gazeOffset.x !== gaze.x || next.gazeOffset.y !== gaze.y) {
        gaze = next.gazeOffset
        if (!gazeQueued) { gazeQueued = true; nextFrame(writeGaze) }
      }
      const key = statusRenderKey(next)
      if (key === statusKeyRef.current) return
      statusKeyRef.current = key
      const pending = statusFrameRef.current
      statusFrameRef.current = next
      if (pending) return
      nextFrame(() => {
        const latest = statusFrameRef.current
        statusFrameRef.current = null
        if (latest) setStatus(latest)
      })
    })
    return unsubscribe
  }, [stateMachine])

  useEffect(() => {
    if (!status.isGalGameMode) { setUiHidden(false); setLogOpen(false) }
  }, [status.isGalGameMode])

  useEffect(() => {
    const measure = () => {
      const box = textScrollRef.current
      if (box) setPageBox(previous => previous.width === box.clientWidth - 52 && previous.height === box.clientHeight - 12 ? previous : { width: box.clientWidth - 52, height: box.clientHeight - 12 })
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (textScrollRef.current) observer?.observe(textScrollRef.current)
    window.addEventListener('resize', measure)
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure) }
  }, [status.isGalGameMode, preferences.fontSize, preferences.reading, expanded, uiHidden])
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const motion = () => setReduceMotion(media?.matches ?? false)
    const visibility = () => { const active = !document.hidden && document.hasFocus(); setForeground(active); stateMachine.setPaused(!active); if (!active) voiceRef.current?.silence() }
    motion(); visibility()
    media?.addEventListener('change', motion)
    window.addEventListener('focus', visibility); window.addEventListener('blur', visibility); document.addEventListener('visibilitychange', visibility)
    let timer: ReturnType<typeof setTimeout> | undefined
    const reading = (event: Event) => {
      if (!(event.target instanceof Element) || event.target.closest('[data-whale-pet]')) return
      if (event.type === 'wheel' || event.target.closest('[data-chat-node-key], [data-composer-card], [data-composer-seat]')) {
        setDimmed(true); if (timer) clearTimeout(timer); timer = setTimeout(() => setDimmed(false), 1200)
      } else setDimmed(false)
    }
    window.addEventListener('pointermove', reading, { passive: true }); window.addEventListener('wheel', reading, { passive: true })
    return () => { if (timer) clearTimeout(timer); stateMachine.setPaused(false); media?.removeEventListener('change', motion); window.removeEventListener('focus', visibility); window.removeEventListener('blur', visibility); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pointermove', reading); window.removeEventListener('wheel', reading) }
  }, [stateMachine])
  useEffect(() => {
    if (previousStream.current && !status.isStreaming && !status.isReasoning && !foreground && preferences.notifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const notification = new Notification(petName, { body: t('回答完成啦，回来看看吧。', 'Your answer is ready.'), tag: 'whale-finished' })
      notification.onclick = () => { window.focus(); notification.close() }
    }
    previousStream.current = status.isStreaming
  }, [status.isStreaming, status.isReasoning, foreground, preferences.notifications])

  useEffect(() => {
    if (status.isGalGameMode) document.body.classList.add('dsh-galgame-mode')
    else document.body.classList.remove('dsh-galgame-mode')
    return () => { document.body.classList.remove('dsh-galgame-mode') }
  }, [status.isGalGameMode])

  // ---- Theatre reading ------------------------------------------------------
  // Without an answer yet the theatre shows her own line, with the user's chosen names.
  const dialogueSource = status.latestDialogue && status.latestDialogue !== status.speech ? status.latestDialogue : preferences.language === 'zh' ? address(companionSpeech) : companionSpeech
  const dialoguePages = useMemo(() => paginateDialogue(dialogueSource, pageBox.width, pageBox.height, preferences.fontSize),
    [dialogueSource, pageBox, preferences.fontSize])

  useEffect(() => {
    const cur = status.latestDialogue || status.speech
    if (cur !== lastDialogueRef.current) {
      if (!lastDialogueRef.current || !cur.startsWith(lastDialogueRef.current.slice(0, 30))) { setCurrentPageIndex(0); followTextRef.current = true }
      lastDialogueRef.current = cur
    }
  }, [status.latestDialogue, status.speech])

  useEffect(() => {
    if (!status.isGalGameMode) return
    const close = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || target?.closest('input, textarea, select, button, summary, [contenteditable="true"]')) return
      if (event.key !== 'Escape' && event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && !['l', 'a', 'h', 'm'].includes(event.key.toLowerCase())) return
      if (event.key !== 'Escape') {
        if (target?.closest('[role="button"], [role="log"]')) return
        event.preventDefault()
        if (event.key === 'ArrowLeft') setCurrentPageIndex(i => Math.max(0, i - 1))
        else if (event.key.toLowerCase() === 'a') update({ autoAdvance: !preferences.autoAdvance })
        else if (event.key.toLowerCase() === 'l') { setHistory(readConversationLog()); setLogOpen(true) }
        else if (event.key.toLowerCase() === 'm') toggleMute()
        else if (event.key.toLowerCase() === 'h') setUiHidden(value => !value)
        else handleAdvancePage()
        return
      }
      const more = document.querySelector('[data-whale-pet] details[open]')
      if (more) { more.removeAttribute('open'); return }
      if (uiHidden) setUiHidden(false); else if (logOpen) setLogOpen(false); else stateMachine.setGalGameMode(false)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [status.isGalGameMode, stateMachine, uiHidden, logOpen, revealed, currentPageIndex, dialoguePages, preferences.autoAdvance, preferences.reading, preferences.muted])

  useEffect(() => {
    if (status.isReasoning) { followThoughtRef.current = true; setIsThoughtBubbleVisible(true) }
  }, [status.isReasoning])
  useEffect(() => {
    if (thoughtScrollRef.current && followThoughtRef.current) thoughtScrollRef.current.scrollTop = thoughtScrollRef.current.scrollHeight
  }, [status.reasoningText])
  // Pages start at the top; full reading follows new text only while the reader is at the bottom.
  useEffect(() => {
    const box = textScrollRef.current
    if (!status.isGalGameMode || !box) return
    if (preferences.reading === 'pages') box.scrollTop = 0
    else if (followTextRef.current) box.scrollTop = box.scrollHeight
  }, [currentPageIndex, status.latestDialogue, status.isGalGameMode, preferences.reading])

  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden) setClock(Date.now()) }, 1000)
    return () => { clearInterval(timer); voiceRef.current?.dispose() }
  }, [])

  // ---- Voice ----------------------------------------------------------------
  const voiceAllowed = !preferences.muted && !preferences.quiet && preferences.volume > 0 && foreground && !uiHidden && !logOpen
  useEffect(() => { voiceRef.current?.setVolume(preferences.volume) }, [preferences.volume])
  useEffect(() => {
    if (preferences.muted || preferences.quiet) voiceRef.current?.silence()
    else if (!voiceAllowed) voiceRef.current?.cut()
  }, [voiceAllowed, preferences.muted, preferences.quiet])
  useEffect(() => {
    const pose = status.pose
    if (pose !== previousPose.current && voiceAllowed) {
      if (pose === 'getit') voiceRef.current?.cue('eureka')
      if (pose === 'sajiao') voiceRef.current?.cue('jelly')
      if (pose === 'eating') voiceRef.current?.cue('rice')
      if (/^think/.test(pose) && !/^think/.test(previousPose.current)) voiceRef.current?.cue('think')
    }
    previousPose.current = pose
  }, [status.pose, voiceAllowed])
  // 梁文峰 / 梁文谷: announce once on load and at every switch.
  const tierNow = tariffAt(clock).tier
  useEffect(() => {
    const previous = previousTierRef.current
    previousTierRef.current = tierNow
    if (previous === tierNow || !preferences.peakNotice || preferences.quiet) return
    setTierAnnounce({ tier: tierNow, until: Date.now() + 9000 })
    if (previous !== null && voiceAllowed) voiceRef.current?.cue('tap')
  }, [tierNow, preferences.peakNotice, preferences.quiet])
  useEffect(() => {
    if (status.isReasoning || status.isStreaming) { if (!startedAt.current) startedAt.current = Date.now() }
    else startedAt.current = 0
  }, [status.isReasoning, status.isStreaming])
  useEffect(() => {
    const now = new Date(clock)
    const day = now.toLocaleDateString()
    if (preferences.reminders && !preferences.quiet && now.getHours() === 12 && lunchDay.current !== day && status.state === 'IDLE') {
      lunchDay.current = day
      stateMachine.triggerPostOutputEating(4500)
    }
  }, [clock, preferences.reminders, preferences.quiet, status.state, stateMachine])

  // ---- Hover dock -----------------------------------------------------------
  const handleMouseEnterPet = useCallback(() => {
    if (menuTimerRef.current) { clearTimeout(menuTimerRef.current); menuTimerRef.current = null }
    setDimmed(false)
    setIsMenuOpen(true)
  }, [])
  const handleMouseLeavePet = useCallback(() => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current)
    menuTimerRef.current = later(() => setIsMenuOpen(false), 750)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (status.isInputFocused || isDraggingRef.current) return
      stateMachine.setGazeOffset({ x: (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2), y: (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2) })
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [status.isInputFocused, stateMachine])

  // Wandering pauses while dragging, hovering, docked, in the theatre or with settings open.
  useEffect(() => {
    if (petHidden || !preferences.wandering || status.isGalGameMode || reduceMotion || !foreground || docked || isSettingsOpen) {
      pendingWanderRef.current = null
      if (wanderTimerRef.current !== null) { clearInterval(wanderTimerRef.current); wanderTimerRef.current = null }
      return
    }
    const interval = setInterval(() => {
      if (isDraggingRef.current || isMenuOpen) return
      const current = stateMachine.getStatus()
      if (current.state !== 'IDLE' && current.state !== 'WANDERING') return
      const from = wanderPositionRef.current
      const target = wanderDestination(from.x, from.y, stageW, stageH, window.innerWidth, window.innerHeight)
      if (!target) return
      pendingWanderRef.current = target
      stateMachine.setWandering(true)
      setWanderRequest(request => request + 1)
    }, 14000)
    wanderTimerRef.current = interval
    return () => { clearInterval(interval); wanderTimerRef.current = null }
  }, [preferences.wandering, status.isGalGameMode, isMenuOpen, isSettingsOpen, stateMachine, reduceMotion, foreground, docked, petHidden, stageW, stageH])

  // Move only after the WANDERING render installs its slow position transition.
  // The model subscription is frame-batched; moving in the interval used the idle transition.
  useEffect(() => {
    if (status.state !== 'WANDERING' || !pendingWanderRef.current) return
    const target = pendingWanderRef.current
    pendingWanderRef.current = null
    setPosition(target)
    later(() => stateMachine.finishWanderingWithEating(3500), 3300)
  }, [status.state, wanderRequest, stateMachine])

  // ---- Drag, click, inertia --------------------------------------------------
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (status.isGalGameMode || e.button !== 0) return
    // Do not take focus from the host composer (and do not arm the keyboard focus ring) on a mouse press.
    e.preventDefault?.()
    stateMachine.resetActivity()
    isDraggingRef.current = true
    setIsDragging(true)
    stateMachine.setWandering(false)
    dragStartRef.current = { startX: e.clientX, startY: e.clientY, petX: petPos.x, petY: petPos.y, startTime: Date.now(), maxDistance: 0, distance: 0, lastX: e.clientX, lastY: e.clientY, lastMove: Date.now(), vx: 0, vy: 0 }
  }, [petPos.x, petPos.y, status.isGalGameMode, stateMachine])

  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragStartRef.current
      if (!drag) return
      const moveElapsed = Math.max(16, Date.now() - drag.lastMove)
      drag.vx = (e.clientX - drag.lastX) / moveElapsed
      drag.vy = (e.clientY - drag.lastY) / moveElapsed
      drag.lastMove = Date.now()
      drag.distance += Math.hypot(e.clientX - drag.lastX, e.clientY - drag.lastY)
      drag.lastX = e.clientX; drag.lastY = e.clientY
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      drag.maxDistance = Math.max(drag.maxDistance, Math.hypot(dx, dy))
      if (preferences.docked) return
      // Coalesce to one position update per frame; fast drags fire far more events than frames.
      const pending = dragFrameRef.current
      dragFrameRef.current = { x: drag.petX + dx, y: drag.petY + dy }
      if (pending) return
      nextFrame(() => {
        const target = dragFrameRef.current
        dragFrameRef.current = null
        if (target && isDraggingRef.current) setPosition(constrainRef.current(target.x, target.y))
      })
    }
    const handleMouseUp = (e: MouseEvent) => {
      const drag0 = dragStartRef.current
      if (drag0 && drag0.maxDistance >= 6 && !preferences.docked) setPosition(constrainRef.current(drag0.petX + e.clientX - drag0.startX, drag0.petY + e.clientY - drag0.startY))
      dragFrameRef.current = null
      isDraggingRef.current = false
      setIsDragging(false)
      const drag = dragStartRef.current
      if (drag) {
        const dist = Math.max(drag.maxDistance, Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY))
        const duration = Date.now() - drag.startTime
        if (dist >= 6 && !preferences.docked) {
          const dizzy = drag.distance > 900 && duration < 2500
          if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && Date.now() - drag.lastMove < 100) {
            const vx = Math.max(-30, Math.min(30, drag.vx * 70))
            const vy = Math.max(-20, Math.min(20, drag.vy * 70))
            setPosition(previous => constrainRef.current(previous.x + vx, previous.y + vy))
          }
          setAffection(dizzy ? 'dizzy' : 'float')
          later(() => setAffection(''), dizzy ? 2400 : 800)
        }
        if (dist < 6 && duration < 380) {
          setIsBouncing(true)
          later(() => setIsBouncing(false), 480)
          stateMachine.triggerMad()
          setIsSettingsOpen(previous => !previous)
        }
      }
      dragStartRef.current = null
    }
    const cancelDrag = () => { isDraggingRef.current = false; setIsDragging(false); dragStartRef.current = null }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('blur', cancelDrag)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('blur', cancelDrag)
    }
  }, [isDragging, stateMachine, preferences.docked])

  // ---- Theatre handlers -----------------------------------------------------
  const handleAdvancePage = () => {
    if (isRevealing) { setRevealed(Array.from(displayDialogue).length); voiceRef.current?.cut(); return }
    if (preferences.reading !== 'pages') return
    if (currentPageIndex < dialoguePages.length - 1) setCurrentPageIndex(prev => prev + 1)
    else if (dialoguePages.length > 1) setCurrentPageIndex(0)
  }

  // Send via the native DSH composer, keeping the draft whenever that fails.
  const handleSendMessage = () => {
    const text = inputValue.trim()
    if (!text) return
    unlockAudio()
    const composerEl = (
      document.querySelector('[data-composer-input]') ||
      document.querySelector('[data-composer-card] [contenteditable="true"]') ||
      document.querySelector('[data-composer-card] [role="textbox"]') ||
      document.querySelector('[data-composer-seat] [contenteditable="true"]') ||
      document.querySelector('[data-composer-seat] textarea') ||
      document.querySelector('textarea')
    ) as HTMLElement | null
    if (!composerEl) {
      stateMachine.setLatestDialogue(t('未找到 DSH 输入框，请先打开一个对话。你的草稿已保留。', 'Open a DSH conversation first. Your draft has been kept.'))
      return
    }
    if (composerEl instanceof HTMLTextAreaElement || composerEl instanceof HTMLInputElement) {
      composerEl.focus()
      const proto = composerEl instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(composerEl, text)
      composerEl.dispatchEvent(new Event('input', { bubbles: true }))
      composerEl.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      composerEl.focus()
      const sel = window.getSelection()
      if (sel) { const range = document.createRange(); range.selectNodeContents(composerEl); sel.removeAllRanges(); sel.addRange(range) }
      let inserted = false
      try { inserted = document.execCommand('insertText', false, text) } catch { inserted = false }
      if (!inserted) {
        try { composerEl.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text })) } catch { /* ignore */ }
        composerEl.textContent = text
        composerEl.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
    later(() => {
      const card = document.querySelector('[data-composer-card]') || document.querySelector('[data-composer-seat]')
      const sendBtn = card ? Array.from(card.querySelectorAll('button')).find(b => /send|发送|steer|queue/i.test(b.getAttribute('aria-label') || b.textContent || '') && !b.disabled && b.getAttribute('aria-disabled') !== 'true') || null : null
      if (sendBtn && !sendBtn.hasAttribute('disabled')) { sendBtn.click(); setInputValue('') }
      else stateMachine.setLatestDialogue(t('暂时无法发送，请检查 DSH 输入框与发送按钮。你的草稿已保留。', 'Unable to send. Check the DSH composer; your draft has been kept.'))
    }, 80)
  }

  const displayDialogue = preferences.reading === 'scroll' ? dialogueSource : dialoguePages[currentPageIndex] || dialoguePages[0] || ''
  const characters = useMemo(() => Array.from(displayDialogue), [displayDialogue])
  const canReveal = preferences.typewriter && preferences.speed !== 'instant' && !reduceMotion && status.latestDialogue.length <= 600 && !/```|\|.*\|/.test(displayDialogue)
  const isRevealing = canReveal && preferences.reading === 'pages' && revealed < characters.length
  const visibleText = isRevealing ? characters.slice(0, revealed).join('') : displayDialogue
  const revealDrivesVoice = status.isGalGameMode && isRevealing && foreground && !uiHidden && !logOpen
  useEffect(() => {
    const previous = revealIdentity.current
    if (previous.page !== currentPageIndex || !displayDialogue.startsWith(previous.text)) { setRevealed(0); spokenRevealRef.current = 0 }
    revealIdentity.current = { page: currentPageIndex, text: displayDialogue }
  }, [currentPageIndex, displayDialogue])
  useEffect(() => {
    if (!canReveal || revealed >= characters.length || !foreground || !status.isGalGameMode || uiHidden || logOpen || !preferences.typewriter || preferences.reading !== 'pages') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setRevealed(characters.length); return }
    const timer = setTimeout(() => setRevealed(count => Math.min(count + 1, characters.length)), revealDelay(characters[Math.max(0, revealed - 1)] || '', preferences.speed))
    return () => clearTimeout(timer)
  }, [status.isGalGameMode, uiHidden, logOpen, preferences.typewriter, preferences.reading, characters.length, revealed, canReveal, foreground, preferences.speed])
  useEffect(() => {
    if (!preferences.autoAdvance || preferences.reading !== 'pages' || !status.isGalGameMode || status.isStreaming || isRevealing || uiHidden || logOpen || currentPageIndex >= dialoguePages.length - 1) return
    const timer = setTimeout(() => setCurrentPageIndex(i => Math.min(i + 1, dialoguePages.length - 1)), Math.min(4000, Math.max(2000, characters.length * 15)))
    return () => clearTimeout(timer)
  }, [preferences.autoAdvance, preferences.reading, status.isGalGameMode, status.isStreaming, isRevealing, uiHidden, logOpen, currentPageIndex, dialoguePages, characters.length])

  // One scheduler, two sources: the theatre's letter-by-letter reveal when it
  // is running, otherwise newly streamed text. Skips and bulk text are not voiced.
  useEffect(() => {
    const previous = spokenRevealRef.current
    spokenRevealRef.current = revealed
    if (!revealDrivesVoice || !voiceAllowed || revealed <= previous) return
    if (revealed - previous > 3) { voiceRef.current?.cut(); return }
    voiceRef.current?.speak(speakableText(characters.slice(previous, revealed).join('')))
  }, [revealed, revealDrivesVoice, voiceAllowed])
  useEffect(() => {
    const previous = spokenStreamRef.current
    spokenStreamRef.current = status.latestDialogue
    if (!status.isStreaming || !voiceAllowed || revealDrivesVoice) return
    const speech = appendedSpeech(previous, status.latestDialogue)
    if (speech) voiceRef.current?.speak(speech)
  }, [status.latestDialogue, status.isStreaming, voiceAllowed, revealDrivesVoice])
  useEffect(() => {
    if (!status.isStreaming && !revealDrivesVoice) voiceRef.current?.cut()
  }, [status.isStreaming, revealDrivesVoice])

  const copyCode = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setToast(t('已复制', 'Copied')) }
    catch { setToast(t('复制失败，请选中文字手动复制', 'Copy failed. Select the text and copy it manually.')) }
    later(() => setToast(''), 2500)
  }
  const unlockAudio = () => { if (!preferences.muted && !preferences.quiet) voiceRef.current?.unlock() }
  const toggleMute = () => { if (preferences.muted) voiceRef.current?.unlock(); else voiceRef.current?.silence(); update({ muted: !preferences.muted }) }
  const codeText = dialogueBlocks(status.latestDialogue).filter(block => block.kind === 'code').map(block => block.text).join('\n\n')
  const nativeSpeed = useMemo(() => {
    const value = document.querySelector('[data-tokens-per-second]')?.getAttribute('data-tokens-per-second')
    return value && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null
  }, [clock])
  const elapsed = startedAt.current ? Math.max(0, (clock - startedAt.current) / 1000).toFixed(1) : null
  const tariff = tariffAt(clock)
  const localeTag = preferences.language === 'en' ? 'en-GB' : 'zh-CN'
  const clockLabel = (ms: number | null) => {
    if (ms === null) return ''
    const d = new Date(ms)
    const time = d.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit', hour12: false })
    return d.toDateString() === new Date(clock).toDateString() ? time : d.toLocaleDateString(localeTag, { weekday: 'short' }) + ' ' + time
  }
  const tierShort = tariff.tier === 'peak' ? t('峰', 'Peak') : t('谷', 'Off-peak')
  const tierName = tariff.tier === 'peak' ? t('梁文峰时间', 'Liang Wenfeng time') : t('梁文谷时间', 'Liang Wengu time')
  const tierUntil = tariff.nextChange !== null ? t(`至 ${clockLabel(tariff.nextChange)}`, `until ${clockLabel(tariff.nextChange)}`) : ''
  const tierRule = t('北京时间工作日 9:00–12:00、14:00–18:00 为高峰；其余时间及周末、法定节假日为空闲（半价）。', 'Peak: Beijing time, weekdays 09:00–12:00 and 14:00–18:00. Other hours, weekends and Chinese public holidays are off-peak at half price.')
  const tierLine = (tier: Tier) => tier === 'peak'
    ? t('现在是梁文峰时间！API 高峰价，省着点用哦～', 'It’s Liang Wenfeng time! Peak API pricing — go easy.')
    : t('现在是梁文谷时间！空闲时段半价，放开用吧～', 'It’s Liang Wengu time! Off-peak, half price.')
  const tierAnnouncing = preferences.peakNotice && !preferences.quiet && tierAnnounce !== null && tierAnnounce.until > clock
  const wallet = walletView({ host: status.hostBalance ?? null, known: status.balancesKnown, toppedUp: status.toppedUpBalance, granted: status.grantedBalance, checkedAt: stateMachine.getStatus().balancesCheckedAt ?? null, now: clock, ricePrice: preferences.ricePrice })
  const hour = new Date(clock).getHours()
  const contextualSpeech = affection === 'pat' ? t('嘿嘿……最喜欢主人摸摸头啦～', 'Hehe… I love head pats!')
    : affection === 'dizzy' ? t('头好晕……深海漩涡出现啦！', 'Whoa… a deep-sea whirlpool!')
    : tierAnnouncing ? tierLine(tierAnnounce!.tier)
    : preferences.reminders && status.state === 'IDLE' && hour >= 1 && hour < 5 ? t('呼啊……夜深啦，主人记得休息，我陪着你。', 'It’s late… remember to rest. I’m right here.')
    : preferences.reminders && status.state === 'EATING' && hour === 12 ? t('午饭时间到！主人也要按时吃饭哦～', 'Lunch time! Remember to have something to eat.')
    : wallet.low && status.state === 'IDLE' ? t('深海算力快见底啦，记得看看余额哦。', 'Credit is getting low. Check your balance.')
    : companionSpeech

  const patHead = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.buttons || isDraggingRef.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const headTop = rect.top + imageTop + geometry.imageHeight * 0.03
    const headBottom = rect.top + imageTop + geometry.imageHeight * 0.3
    if (event.clientX < rect.left + rect.width * 0.25 || event.clientX > rect.left + rect.width * 0.75 || event.clientY < headTop || event.clientY > headBottom) return
    const sample = headPat.current, now = Date.now(), dx = event.clientX - sample.x
    if (now < sample.cooldown || Math.abs(dx) < 8) return
    if (now - sample.time > 700) sample.turns = 0
    const direction = Math.sign(dx)
    if (direction !== sample.direction) sample.turns++
    sample.x = event.clientX; sample.direction = direction; sample.time = now
    if (sample.turns >= 5) {
      sample.turns = 0; sample.cooldown = now + 4000
      setAffection('pat'); stateMachine.resetActivity()
      if (voiceAllowed) voiceRef.current?.cue('jelly')
      later(() => setAffection(''), 2000)
    }
  }

  const lang = preferences.language === 'zh' ? 'zh-CN' : 'en'
  const openTheatre = () => { setIsSettingsOpen(false); stateMachine.setGalGameMode(true) }

  const settingsProps = () => ({
    p: { ...preferences, autoGalGame: status.autoGalGameOnChat }, wallet, detached: group?.mode === 'detached',
    tier: { tier: tariff.tier, name: tierName, until: tierUntil, rule: tierRule, holidayDataMissing: tariff.holidayDataMissing },
    update: (patch: Partial<Preferences>) => { update(patch); if (patch.autoGalGame !== undefined) stateMachine.setAutoGalGameOnChat(patch.autoGalGame) },
    toggleMute,
    quiet: () => setPreferences(previous => quietPreset(previous)),
    reset: () => {
      setPreferences({ ...defaultPreferences(), onboardingDone: true })
      stateMachine.setForm('maiden'); stateMachine.setAutoGalGameOnChat(true)
      const fresh = spriteGeometry('Maid', viewport.height, 1)
      setPosition(clampPet(viewport.width - fresh.stageWidth - 24, viewport.height - fresh.stageHeight - 30, fresh.stageWidth, fresh.stageHeight, viewport.width, viewport.height))
    },
    doctor: () => setDoctor(diagnosticReport()),
    notify: async () => {
      if (preferences.notifications) { update({ notifications: false }); return }
      if (typeof Notification === 'undefined') { setToast(t('当前环境不支持系统通知', 'Notifications are not available')); return }
      const permission = await Notification.requestPermission()
      update({ notifications: permission === 'granted' })
      if (permission !== 'granted') setToast(t('未获得通知权限，已保持关闭', 'Permission not granted; notifications remain off'))
    },
    close: () => setIsSettingsOpen(false),
    openTheatre,
  })
  // The panel does not depend on the pet's position, so a drag never rebuilds it.
  const settingsPanel = useMemo(() => isSettingsOpen ? SettingsPanel(settingsProps()) : null,
    [isSettingsOpen, preferences, status.autoGalGameOnChat, JSON.stringify(wallet), tariff.tier, tierUntil, tariff.holidayDataMissing, group?.mode, viewport.width, viewport.height])

  // ---- Theatre ----------------------------------------------------------------
  if (status.isGalGameMode) {
    return TheatreView({
      t, p: preferences, status, lang, petName,
      puppet: { imgSrc: currentImgSrc, poseName: hitPose, poseScale: (POSE_META[hitPose] ?? POSE_META.Maid).scale, isMaiden },
      tier: preferences.peakNotice ? { tier: tariff.tier, label: tierName, until: tierUntil } : null,
      phase: status.isStreaming || status.isReasoning ? phaseLabel + (elapsed !== null ? ' · ' + elapsed + 's' : '') + (nativeSpeed !== null ? ' · ' + nativeSpeed.toFixed(1) + ' tokens/s' : '') : null,
      uiHidden, expanded, logOpen, history,
      showThoughts: isThoughtBubbleVisible && (status.isReasoning || Boolean(status.reasoningText)),
      visibleText, isRevealing, pageIndex: currentPageIndex, pageCount: dialoguePages.length,
      inputValue, toast, textRef: textScrollRef, thoughtRef: thoughtScrollRef,
      on: {
        exit: () => stateMachine.setGalGameMode(false),
        backdrop: () => uiHidden ? setUiHidden(false) : stateMachine.setGalGameMode(false),
        unlock: unlockAudio,
        hideUi: setUiHidden,
        toggleExpanded: () => setExpanded(value => !value),
        openLog: () => { setHistory(readConversationLog()); setLogOpen(true) },
        closeLog: () => setLogOpen(false),
        toggleAuto: () => update({ autoAdvance: !preferences.autoAdvance }),
        toggleMute,
        toggleReading: () => update({ reading: preferences.reading === 'pages' ? 'scroll' : 'pages' }),
        toggleTheme: () => update({ theme: preferences.theme === 'light' ? 'dark' : 'light' }),
        toggleLanguage: () => update({ language: preferences.language === 'zh' ? 'en' : 'zh' }),
        hideThoughts: () => setIsThoughtBubbleVisible(false),
        thoughtScroll: node => { followThoughtRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 36 },
        textScroll: node => { followTextRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 36 },
        advance: handleAdvancePage,
        previous: () => setCurrentPageIndex(i => Math.max(0, i - 1)),
        wheel: event => {
          if (preferences.reading !== 'pages' || (event.target as Element).closest('pre') || Math.abs(event.deltaY) < 15 || Date.now() - wheelTime.current < 400) return
          event.preventDefault(); wheelTime.current = Date.now()
          if (event.deltaY > 0) handleAdvancePage(); else setCurrentPageIndex(index => Math.max(0, index - 1))
        },
        skipReveal: () => { setRevealed(characters.length); voiceRef.current?.cut() },
        input: setInputValue,
        send: handleSendMessage,
        copy: text => void copyCode(text),
      },
    })
  }

  // ---- Desktop widget ---------------------------------------------------------
  const crownAlign = petPos.x + stageW / 2 < 200 ? 'start' : petPos.x + stageW / 2 > viewport.width - 200 ? 'end' : 'center'
  const bubbleSide = petPos.x + stageW / 2 < viewport.width / 2 ? 'right' : 'left'
  const showDock = isMenuOpen && !isSettingsOpen && !isDragging
  const walletHasValues = Boolean(wallet.toppedUp || wallet.granted)
  const showWalletChip = !isSettingsOpen && !isDragging && (walletHasValues || showDock)
  const showTierChip = preferences.peakNotice && !isSettingsOpen && !isDragging
  const walletStatusText = ({
    unavailable: t('余额 —', 'Balance —'), loading: t('余额读取中…', 'Reading balance…'), 'signed-out': t('未登录 DeepSeek', 'Not signed in'),
    error: t('余额读取失败', 'Balance unavailable'), live: '', stale: '',
  } as Record<string, string>)[wallet.status]
  const walletTitle = wallet.status === 'unavailable' ? t('余额未读取：打开 DSH 账户设置以读取', 'Balance not read: open DSH account settings')
    : wallet.status === 'signed-out' ? t('登录 DeepSeek 账号后可显示余额', 'Sign in to DeepSeek to show the balance')
    : wallet.status === 'loading' ? t('正在向 DSH 账户服务读取余额', 'Reading the balance from the DSH account service')
    : wallet.status === 'error' ? t('暂时读不到余额，稍后会自动重试', 'The balance could not be read; retrying automatically')
    : wallet.status === 'stale' ? t('余额不是实时数据，点击查看详情', 'Balance is not live. Click for details')
    : wallet.source === 'host' ? t('余额来自 DSH 账户服务，每分钟更新', 'Balance from the DSH account service, updated every minute') : t('余额读取自 DSH 账户设置页', 'Balance read from DSH account settings')
  const puppetOpacity = ghost && !isSettingsOpen ? Math.min(0.25, preferences.opacity) : dimmed && !isSettingsOpen ? Math.min(0.4, preferences.opacity) : preferences.opacity

  return (
    <div
      key="widget"
      data-ghost={ghost && !isSettingsOpen} data-hidden={petHidden}
      data-paused={!foreground || reduceMotion} data-dimmed={dimmed && !isSettingsOpen} data-docked={docked}
      data-dragging={isDragging || undefined} data-settling={affection === 'float' || affection === 'dizzy' || undefined}
      data-wandering={status.state === 'WANDERING' || undefined}
      data-whale-pet="widget" data-pet-theme={preferences.theme} lang={lang}
      className="petWidget"
      style={{ left: `${petPos.x}px`, top: `${petPos.y}px`, width: `${stageW}px`, height: `${stageH}px` }}
      onPointerDown={unlockAudio}
      onMouseEnter={handleMouseEnterPet}
      onMouseLeave={handleMouseLeavePet}
    >
      {doctor && <aside data-whale-pet="doctor" data-pet-theme={preferences.theme} className="petLog" role="dialog" aria-label="Doctor">
        <header><strong>Doctor</strong><button type="button" onClick={() => setDoctor('')}>{t('关闭', 'Close')}</button></header>
        <p className="petLogNote">{t('仅含选择器和匹配数量，不含聊天内容；空闲时生成标记可能缺失。', 'Selectors and counts only; no chat content. Generation markers can be absent while idle.')}</p>
        <pre>{doctor}</pre>
        <button type="button" onClick={() => void copyCode(doctor)}>{t('复制诊断信息', 'Copy diagnostics')}</button>
      </aside>}
      {!preferences.onboardingDone && !isSettingsOpen && <aside className="petOnboarding" aria-label={t('认识大肥鱼', 'Meet 大肥鱼')}>
        <strong>{t('认识一下大肥鱼', 'Meet 大肥鱼')}</strong>
        <ul>
          <li>{t('在头顶来回移动鼠标，试试摸头。', 'Move the pointer back and forth over her head for a head pat.')}</li>
          <li>{t('点一下角色打开设置；点击聊天输入框进入剧场。', 'Click her to open settings; click the composer to enter the theatre.')}</li>
          <li>{t('按住角色拖动，带她换个位置。', 'Drag her to a new spot.')}</li>
        </ul>
        <button type="button" className="petPrimary" onClick={() => update({ onboardingDone: true })}>{t('知道了', 'Got it')}</button>
      </aside>}
      {toast && <div className="petToast" role="status">{toast}</div>}

      <div className={'characterWrapper state-' + status.state.toLowerCase()}>
        <div className="petCrown" data-align={crownAlign} style={{ bottom: `${stageH - imageTop + 6}px` }}>
          <div className="toolbar" data-visible={showDock} data-settings-open={isSettingsOpen} onMouseEnter={handleMouseEnterPet} onMouseLeave={handleMouseLeavePet} role="toolbar" aria-label={t('大肥鱼快捷操作', '大肥鱼 actions')}>
            <button type="button" className="toolBtn toolBtnPrimary" onClick={openTheatre} title={t('进入剧场模式（Alt+T）', 'Open theatre (Alt+T)')}>{dockIcon('M2.5 4.5h11v7h-11zM5.5 13.5h5')}{t('剧场', 'Theatre')}</button>
            <button type="button" className="toolBtn" aria-expanded={isSettingsOpen} onClick={() => setIsSettingsOpen(!isSettingsOpen)} title={t('打开设置', 'Open settings')}>{dockIcon('M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4')}{t('设置', 'Settings')}</button>
            <span className="toolDivider" aria-hidden="true" />
            <button type="button" className="toolBtn toolIcon" aria-pressed={preferences.quiet} onClick={() => setPreferences(previous => quietPreset(previous))} aria-label={preferences.quiet ? t('结束安静模式', 'End quiet mode') : t('安静模式', 'Quiet mode')} title={preferences.quiet ? t('结束安静模式', 'End quiet mode') : t('安静模式：暂停闲聊、音效和游荡', 'Quiet mode: pause chatter, sounds and wandering')}>{dockIcon('M12.5 9.5A5 5 0 016.5 3.5a5 5 0 106 6z')}</button>
            <button type="button" className="toolBtn toolIcon" aria-pressed={docked} onClick={() => update({ docked: !docked })} aria-label={t('贴边探头', 'Peek from the edge')} title={docked ? t('离开边缘', 'Leave the edge') : t('贴边探头', 'Peek from the edge')}>{dockIcon('M13.5 2.5v11M3 8h7M7 5l3 3-3 3')}</button>
            {codeText && <button type="button" className="toolBtn toolIcon" onClick={() => void copyCode(codeText)} aria-label={t('复制代码', 'Copy code')} title={t('复制最近回答中的代码', 'Copy code from the latest answer')}>{dockIcon('M5.5 5.5h8v8h-8zM10.5 5.5v-3h-8v8h3')}</button>}
          </div>
          {(showTierChip || showWalletChip) && <div className="petCrownRow">
            {showTierChip && <button type="button" className="petTierChip" data-tier={tariff.tier} title={tierName + '\n' + tierRule} aria-label={`${tierName} ${tierUntil}`} onClick={() => setTierAnnounce({ tier: tariff.tier, until: Date.now() + 9000 })}>
              <i aria-hidden="true" /><span>{tierShort}</span>{tierUntil && <span className="petTierUntil">{tierUntil}</span>}
            </button>}
            {showWalletChip && <button type="button" className="petWalletChip" data-status={wallet.status} data-low={wallet.low || undefined} title={walletTitle} onClick={() => setIsSettingsOpen(true)} aria-label={walletTitle}>
              {!walletHasValues ? <span>{walletStatusText}</span> : <>
                <span>{wallet.toppedUp ?? '—'}</span>
                {!wallet.grantedNone && <><span className="petWalletSep" aria-hidden="true">·</span><span>{t('赠', 'Bonus')} {wallet.granted ?? '—'}</span></>}
                {wallet.status === 'stale' && <span className="petWalletStale">{t('非实时', 'not live')}</span>}
              </>}
            </button>}
          </div>}
        </div>

        {!preferences.quiet && (!bubbleHidden || tierAnnouncing) && (status.speech || tierAnnouncing) && !isSettingsOpen && (
          <div style={{ fontSize: Math.max(12, preferences.fontSize - 3), top: `${imageTop + Math.round(geometry.imageHeight * 0.1)}px` }} className="speechBubble" data-side={bubbleSide}
            onClick={() => stateMachine.setGalGameMode(true)} role="button" tabIndex={0} title={t('点击进入剧场', 'Click to open the theatre')}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); stateMachine.setGalGameMode(true) } }}>
            <button type="button" className="petBubbleClose" aria-label={t('隐藏闲聊气泡', 'Hide chatter bubble')} onClick={event => { event.stopPropagation(); setBubbleHidden(true) }}>×</button>
            {preferences.language === 'zh' ? address(contextualSpeech) : contextualSpeech}
          </div>
        )}

        {status.state === 'REASONING' && <div className="bubbleContainer" style={{ top: `${imageTop}px` }} aria-hidden="true"><i className="bubble bubble1" /><i className="bubble bubble2" /><i className="bubble bubble3" /></div>}
        {affection === 'pat' && <div className="petHearts" style={{ top: `${imageTop}px` }} aria-hidden="true">♡ ♡ ♡</div>}

        <div
          data-sleepy={preferences.reminders && hour >= 1 && hour < 5 && status.state === 'IDLE'}
          onMouseMove={patHead}
          className={'petSpriteSize' + (isBouncing ? ' qBounce' : '') + (affection ? ' petReaction-' + affection : '')}
          style={{ width: `${stageW}px`, height: `${stageH}px` }}
          tabIndex={0}
          role="button"
          aria-label={t(`${petName}：按 Enter 打开设置`, `${petName}: press Enter for settings`)}
          aria-expanded={isSettingsOpen}
          onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setIsSettingsOpen(open => !open) } }}
        >
          <LivingPuppet
            poseName={hitPose}
            imgSrc={currentImgSrc}
            isMaiden={isMaiden}
            isGalGameMode={false}
            mouthOpenRatio={status.mouthOpenRatio}
            state={status.state}
            box={{ width: geometry.imageWidth, height: geometry.imageHeight, left: geometry.imageLeft }}
            opacity={puppetOpacity}
            onMouseDown={handleMouseDown}
          />
        </div>
      </div>

      {isSettingsOpen && group && (
        <div
          ref={panelRef}
          className="settingsDrawer"
          data-mode={group.mode}
          data-side={group.side}
          data-flipping={panelFlipping || undefined}
          role="dialog"
          aria-labelledby="pet-settings-title"
          style={{ position: 'fixed', left: group.panel.x, top: group.panel.y, width: group.panel.width, maxHeight: group.panel.maxHeight }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          {settingsPanel}
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { DialogueContent } from './DialogueContent.js'
import { LivingPuppet } from './LivingPuppet.js'
import type { Preferences } from './preferences.js'
import type { PetStatusInfo } from './types.js'
import type { HistoryEntry } from './experience.js'
import type { Emote } from './emotion.js'

export type TheatrePanel = 'scene' | 'music' | 'settings' | null

/** Two stacked background layers; the inactive one receives the next picture, then they swap (crossfade). */
export interface SceneLayers { a: string; b: string; front: 'a' | 'b' }

export interface TheatreSceneCard { id: string; label: string; thumb: string; active: boolean; kind: 'painted' | 'none' | 'custom' | 'auto' }
export interface TheatreTrack { id: string; label: string; mood: string }

export interface TheatreViewProps {
  t: (zh: string, en: string) => string
  p: Preferences
  status: PetStatusInfo
  lang: string
  petName: string
  puppet: { imgSrc: string; poseName: string; poseScale: number; isMaiden: boolean; live?: boolean; motion?: number; emote?: Emote; emoteKey?: number }
  phase: string | null
  tier: { tier: 'peak' | 'valley'; label: string; until: string } | null
  uiHidden: boolean
  expanded: boolean
  logOpen: boolean
  history: HistoryEntry[]
  showThoughts: boolean
  visibleText: string
  isRevealing: boolean
  pageIndex: number
  pageCount: number
  inputValue: string
  toast: string
  textRef: React.RefObject<HTMLDivElement | null>
  thoughtRef: React.RefObject<HTMLDivElement | null>
  scene: { id: string; label: string; base: string; glow: string; ambient: string; immersive: boolean; layers: SceneLayers }
  sceneCards: TheatreSceneCard[]
  customSceneName: string | null
  panel: TheatrePanel
  skipping: boolean
  bgm: { on: boolean; playing: boolean; track: string; volume: number; customName: string | null; tracks: TheatreTrack[] }
  on: {
    exit: () => void
    backdrop: () => void
    dismiss: () => void
    unlock: () => void
    hideUi: (hidden: boolean) => void
    toggleExpanded: () => void
    openLog: () => void
    closeLog: () => void
    toggleAuto: () => void
    toggleMute: () => void
    toggleReading: () => void
    toggleTheme: () => void
    toggleLanguage: () => void
    hideThoughts: () => void
    thoughtScroll: (node: HTMLDivElement) => void
    textScroll: (node: HTMLDivElement) => void
    advance: () => void
    previous: () => void
    wheel: (event: React.WheelEvent) => void
    skipReveal: () => void
    toggleSkip: () => void
    input: (value: string) => void
    send: () => void
    copy: (text: string) => void
    panel: (panel: TheatrePanel) => void
    pickScene: (id: string) => void
    shuffleScene: () => void
    toggleShuffle: () => void
    uploadScene: (file: File) => void
    removeScene: () => void
    bgmToggle: () => void
    bgmPick: (id: string) => void
    bgmStep: (direction: 1 | -1) => void
    bgmVolume: (volume: number) => void
    uploadBgm: (file: File) => void
    removeBgm: () => void
    setSpeed: (speed: Preferences['speed']) => void
    setFontSize: (size: number) => void
    toggleTypewriter: () => void
    toggleLive: () => void
  }
}

const icon = (d: string) => <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
const solid = (d: string, size = 14) => <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"><path d={d} /></svg>

const ICONS = {
  log: 'M3 4h10M3 8h10M3 12h6',
  auto: 'M5 3.5v9l7-4.5z',
  skip: 'M2.5 3.5L8 8l-5.5 4.5zM8 3.5L13.5 8 8 12.5z',
  hide: 'M2 8s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4zM3 13L13 3',
  close: 'M4 4l8 8M12 4l-8 8',
  more: 'M3.5 8h.01M8 8h.01M12.5 8h.01',
  music: 'M6 12V3.6l7-1.4v8.4M6 12a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM13 10.6a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0z',
  image: 'M2.5 3.5h11v9h-11zM2.5 10.5l3-3 3 3 2-2 3 3M10.5 6.2h.01',
  sliders: 'M2.5 4.5h7M12.5 4.5h1M2.5 8h1M6.5 8h7M2.5 11.5h5M10.5 11.5h3M11 3v3M5 6.5v3M9 10v3',
  shuffle: 'M2.5 4.5h2.4l6.2 7h2.4M2.5 11.5h2.4l1.9-2.1M9.2 6.6l1.9-2.1h2.4M11.6 2.6l1.9 1.9-1.9 1.9M11.6 9.6l1.9 1.9-1.9 1.9',
  plus: 'M8 3.5v9M3.5 8h9',
  trash: 'M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.6 8h4.8l.6-8',
  check: 'M3.5 8.5l3 3 6-7',
  volume: 'M2.5 6.2h2.6L8.5 3.5v9L5.1 9.8H2.5zM11 5.8a3 3 0 0 1 0 4.4M12.8 4a5.5 5.5 0 0 1 0 8',
  mute: 'M2.5 6.2h2.6L8.5 3.5v9L5.1 9.8H2.5zM11 6.2l3.2 3.6M14.2 6.2L11 9.8',
}
const PLAY = 'M5 3.2v9.6l7.6-4.8z'
const PAUSE = 'M4.6 3.2h2.4v9.6H4.6zM9 3.2h2.4v9.6H9z'
const PREV = 'M3.6 3.4h1.6v9.2H3.6zM12.6 3.4L6 8l6.6 4.6z'
const NEXT = 'M10.8 3.4h1.6v9.2h-1.6zM3.4 3.4L10 8l-6.6 4.6z'

/**
 * Text being revealed: settled text renders normally and the newest few
 * characters fade in one by one, as in Yuzusoft visual novels. Markup in the
 * tail (bold, inline code, line breaks) falls back to plain rendering.
 */
function revealText(v: TheatreViewProps) {
  const chars = Array.from(v.visibleText)
  const tailLength = v.isRevealing ? Math.min(6, chars.length) : 0
  const tail = chars.slice(chars.length - tailLength)
  if (!tailLength || tail.some(c => c === '*' || c === '`' || c === '\n' || c === '#')) return <DialogueContent text={v.visibleText} copy={v.on.copy} copyLabel={v.t('复制', 'Copy')} />
  const start = chars.length - tailLength
  return <>
    <DialogueContent text={chars.slice(0, start).join('')} copy={v.on.copy} copyLabel={v.t('复制', 'Copy')} />
    {tail.map((c, i) => <span key={start + i} className="vnChar">{c}</span>)}
  </>
}

/** A file picker styled as a button; the value is cleared so the same file can be chosen again. */
function filePicker(accept: string, label: string, onFile: (file: File) => void) {
  return <label className="theatreUpload">
    <input type="file" accept={accept} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onFile(file) }} />
    {icon(ICONS.plus)}{label}
  </label>
}

function themeSwitch(checked: boolean, label: string, onToggle: () => void, hint?: string) {
  return <button type="button" role="switch" aria-checked={checked} className="theatreToggle" onClick={onToggle}>
    <span className="theatreToggleText">{label}{hint && <small>{hint}</small>}</span>
    <span className="theatreSwitch" aria-hidden="true"><i /></span>
  </button>
}

function eqBars(playing: boolean) {
  return <span className="theatreEq" data-playing={playing} aria-hidden="true"><i /><i /><i /><i /></span>
}

function scenePanel(v: TheatreViewProps) {
  const { t, on } = v
  return <section className="theatrePanel" role="dialog" aria-label={t('背景', 'Background')}>
    <header className="theatrePanelHead">
      <strong>{t('背景', 'Background')}</strong>
      <button type="button" className="theatreGhostBtn" onClick={on.shuffleScene} title={t('随机换一张', 'Random background')}>{icon(ICONS.shuffle)}{t('随机', 'Shuffle')}</button>
    </header>
    <div className="theatreSceneGrid" role="radiogroup" aria-label={t('选择背景', 'Choose a background')}>
      {v.sceneCards.map(card => <button
        key={card.id} type="button" role="radio" aria-checked={card.active} data-kind={card.kind}
        className="theatreSceneCard" onClick={() => on.pickScene(card.id)}
        style={card.thumb ? { backgroundImage: `url("${card.thumb}")` } as React.CSSProperties : undefined}
        title={card.label}
      >
        {card.kind === 'custom' && !card.thumb && <span className="theatreSceneEmpty">{icon(ICONS.plus)}</span>}
        {card.kind === 'auto' && <span className="theatreSceneClock" aria-hidden="true">{icon('M8 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM8 5v3.2l2.2 1.4')}</span>}
        <span className="theatreSceneLabel">{card.label}</span>
        {card.active && <span className="theatreSceneCheck">{icon(ICONS.check)}</span>}
      </button>)}
    </div>
    {themeSwitch(v.p.sceneShuffle, t('每次进入剧场随机换背景', 'New random background on every visit'), on.toggleShuffle)}
    <div className="theatreFileRow">
      {filePicker('image/png,image/jpeg,image/webp,image/gif,image/avif', v.customSceneName ? t('更换我的背景', 'Replace my picture') : t('上传我的背景', 'Upload my picture'), on.uploadScene)}
      {v.customSceneName && <button type="button" className="theatreGhostBtn" onClick={on.removeScene} title={v.customSceneName}>{icon(ICONS.trash)}{t('移除', 'Remove')}</button>}
    </div>
    <p className="theatreFootnote">{t('图片只保存在本机浏览器（IndexedDB），不会上传。建议 16:9、小于 15 MB。', 'Pictures stay in this browser (IndexedDB) and are never uploaded. 16:9 under 15 MB works best.')}</p>
  </section>
}

function musicPanel(v: TheatreViewProps) {
  const { t, on, bgm } = v
  const current = bgm.tracks.find(track => track.id === bgm.track) ?? bgm.tracks[0]
  const percent = Math.round(bgm.volume * 100)
  return <section className="theatrePanel" role="dialog" aria-label={t('背景音乐', 'Background music')}>
    <header className="theatrePanelHead">
      <strong>{t('背景音乐', 'Background music')}</strong>
      <button type="button" role="switch" aria-checked={bgm.on} className="theatreSwitchOnly" onClick={on.bgmToggle} aria-label={bgm.on ? t('关闭背景音乐', 'Turn music off') : t('开启背景音乐', 'Turn music on')}><span className="theatreSwitch" aria-hidden="true"><i /></span></button>
    </header>
    <div className="theatreNowPlaying" data-playing={bgm.playing}>
      <div className="theatreDisc" aria-hidden="true">{solid('M6 12V3.6l7-1.4v8.4M6 12a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM13 10.6a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0z', 18)}</div>
      <div className="theatreTrackInfo">
        <strong>{current?.label}</strong>
        <small>{bgm.playing ? t('正在播放', 'Now playing') + ' · ' + current?.mood : bgm.on ? t('准备播放…', 'Starting…') : t('已暂停', 'Paused')}</small>
      </div>
      {eqBars(bgm.playing)}
    </div>
    <div className="theatreTransport">
      <button type="button" className="theatreRound" onClick={() => on.bgmStep(-1)} aria-label={t('上一首', 'Previous track')}>{solid(PREV)}</button>
      <button type="button" className="theatreRound theatrePlay" onClick={on.bgmToggle} aria-label={bgm.on ? t('暂停', 'Pause') : t('播放', 'Play')}>{solid(bgm.on ? PAUSE : PLAY, 16)}</button>
      <button type="button" className="theatreRound" onClick={() => on.bgmStep(1)} aria-label={t('下一首', 'Next track')}>{solid(NEXT)}</button>
    </div>
    <div className="theatreTrackList" role="radiogroup" aria-label={t('曲目', 'Tracks')}>
      {bgm.tracks.map((track, index) => <button key={track.id} type="button" role="radio" aria-checked={track.id === bgm.track} className="theatreTrack" onClick={() => on.bgmPick(track.id)}>
        <span className="theatreTrackIndex">{track.id === bgm.track && bgm.playing ? eqBars(true) : String(index + 1).padStart(2, '0')}</span>
        <span className="theatreTrackName">{track.label}<small>{track.mood}</small></span>
      </button>)}
    </div>
    <label className="theatreVolume">
      <button type="button" className="theatreIconBtn" onClick={() => on.bgmVolume(bgm.volume > 0 ? 0 : 0.45)} aria-label={bgm.volume > 0 ? t('静音', 'Mute music') : t('恢复音量', 'Unmute music')}>{icon(bgm.volume > 0 ? ICONS.volume : ICONS.mute)}</button>
      <input
        type="range" className="theatreRange" min="0" max="100" step="1" value={percent}
        aria-label={t('音乐音量', 'Music volume')} aria-valuetext={percent + '%'}
        style={{ '--fill': percent + '%' } as React.CSSProperties}
        onChange={e => on.bgmVolume(Number(e.target.value) / 100)}
      />
      <span className="theatreValue">{percent}%</span>
    </label>
    <div className="theatreFileRow">
      {filePicker('audio/*', bgm.customName ? t('更换我的音乐', 'Replace my music') : t('添加本地音乐', 'Add my music'), on.uploadBgm)}
      {bgm.customName && <button type="button" className="theatreGhostBtn" onClick={on.removeBgm} title={bgm.customName}>{icon(ICONS.trash)}{t('移除', 'Remove')}</button>}
    </div>
    <p className="theatreFootnote">{t('内置曲目由插件实时演奏，无缝循环；本地音乐只保存在本机浏览器。离开剧场时音乐会自动淡出。', 'Built-in tracks are performed live by the plugin and loop seamlessly; your own music stays in this browser. Music fades out when you leave the theatre.')}</p>
  </section>
}

function settingsPanel(v: TheatreViewProps) {
  const { t, on, p } = v
  const speeds: Array<[Preferences['speed'], string]> = [['slow', t('慢', 'Slow')], ['medium', t('中', 'Normal')], ['fast', t('快', 'Fast')], ['instant', t('瞬间', 'Instant')]]
  const fontPercent = Math.round(((p.fontSize - 14) / 10) * 100)
  return <section className="theatrePanel theatrePanelNarrow" role="dialog" aria-label={t('剧场设置', 'Theatre settings')}>
    <header className="theatrePanelHead"><strong>{t('剧场设置', 'Theatre settings')}</strong></header>
    <div className="theatreField">
      <span>{t('文字速度', 'Text speed')}</span>
      <div className="theatreSegments" role="radiogroup" aria-label={t('文字速度', 'Text speed')}>
        {speeds.map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={p.speed === value} onClick={() => on.setSpeed(value)}>{label}</button>)}
      </div>
    </div>
    <label className="theatreField">
      <span>{t('字号', 'Text size')} <b>{p.fontSize}px</b></span>
      <input type="range" className="theatreRange" min="14" max="24" step="1" value={p.fontSize}
        aria-label={t('字号', 'Text size')} style={{ '--fill': fontPercent + '%' } as React.CSSProperties}
        onChange={e => on.setFontSize(Number(e.target.value))} />
    </label>
    {themeSwitch(p.typewriter, t('打字机效果', 'Typewriter text'), on.toggleTypewriter)}
    {themeSwitch(p.autoAdvance, t('读完自动翻页', 'Auto-advance pages'), on.toggleAuto, 'A')}
    {themeSwitch(!p.muted, t('人物音效', 'Character sounds'), on.toggleMute, 'M')}
    {themeSwitch(p.liveMotion, t('动态立绘（Live2D 风格）', 'Live portrait (Live2D-style)'), on.toggleLive)}
    <p className="theatreFootnote">{t('快捷键：Enter / 空格 继续 · 按住 Ctrl 快进 · H 隐藏界面 · L 回顾 · Esc 关闭', 'Keys: Enter / Space next · hold Ctrl to skip · H hide · L log · Esc close')}</p>
  </section>
}

/** Visual-novel theatre: scene, stage, thought bubble, dialogue box, HUD and log. Plain render function. */
export function TheatreView(v: TheatreViewProps) {
  const { t, p, status, on } = v
  const common = { 'data-pet-theme': p.theme, lang: v.lang }
  const textStyle = { '--pet-text-size': p.fontSize + 'px' } as React.CSSProperties
  const sceneStyle = { '--scene-base': v.scene.base, '--scene-glow': v.scene.glow } as React.CSSProperties
  const closeMenus = (event: React.PointerEvent<HTMLElement>) => {
    on.unlock()
    if (v.panel) on.dismiss()
    if (!(event.target as Element).closest('details')) event.currentTarget.querySelector('details[open]')?.removeAttribute('open')
  }
  const layer = (url: string, front: boolean, name: string) => <div
    key={name} className="sceneLayer" data-front={front}
    style={url ? { backgroundImage: `url("${url}")` } as React.CSSProperties : undefined}
  />
  const currentTrack = v.bgm.tracks.find(track => track.id === v.bgm.track)
  // Distinct roots prevent React from reusing the centred backdrop as the widget.
  return <React.Fragment key="theatre">
    <div {...common} data-whale-pet="backdrop" data-immersive={v.scene.immersive} data-scene={v.scene.id}
      className="galgameBackdrop" style={sceneStyle} onClick={on.backdrop} onPointerDown={on.unlock}
      title={v.scene.immersive ? undefined : t('点击空白处退出剧场', 'Click the background to exit')}>
      {v.scene.immersive && <>
        {layer(v.scene.layers.a, v.scene.layers.front === 'a', 'a')}
        {layer(v.scene.layers.b, v.scene.layers.front === 'b', 'b')}
        <div className="sceneAmbient" data-ambient={v.scene.ambient} aria-hidden="true" />
        <div className="sceneShade" aria-hidden="true" />
      </>}
    </div>

    {!v.uiHidden && v.showThoughts && <div {...common} data-whale-pet="thought" data-expanded={v.expanded} className="comicThoughtBubble" role="complementary" aria-label={t('思考过程', 'Thoughts')}>
      <div className="thoughtBubbleHeader">
        <div className="thoughtBubbleTitleGroup"><span className="thoughtDot" aria-hidden="true" />{t('思考过程', 'Thoughts')}{status.isReasoning && <span className="thoughtLivePill">{t('推理中', 'Thinking')}</span>}</div>
        <button type="button" className="petIconButton" onClick={on.hideThoughts} aria-label={t('隐藏思考气泡', 'Hide thoughts')}>{icon(ICONS.close)}</button>
      </div>
      <div className="thoughtBubbleContent" style={textStyle} ref={v.thoughtRef} tabIndex={0} onScroll={e => on.thoughtScroll(e.currentTarget)}>
        {status.reasoningText || t('正在整理思路……', 'Thinking things through…')}
      </div>
    </div>}

    <div {...common} data-whale-pet="stage" data-expanded={v.expanded} data-theatre-hidden={v.uiHidden} data-immersive={v.scene.immersive} style={sceneStyle} className={'galgameCharacterCentered ' + (v.puppet.isMaiden ? 'galgameCharacterMaiden' : 'galgameCharacterChibi')}>
      <LivingPuppet poseName={v.puppet.poseName} poseScale={v.puppet.poseScale} imgSrc={v.puppet.imgSrc} isMaiden={v.puppet.isMaiden} isGalGameMode={true} mouthOpenRatio={status.mouthOpenRatio} state={status.state} live={v.puppet.live} motion={v.puppet.motion} emote={v.puppet.emote} emoteKey={v.puppet.emoteKey} />
    </div>

    {!v.uiHidden && <div {...common} data-whale-pet="hud" className="theatreHud" onPointerDown={on.unlock}>
      <button type="button" className="theatreChip" aria-pressed={v.panel === 'music'} aria-expanded={v.panel === 'music'} onClick={() => on.panel(v.panel === 'music' ? null : 'music')} title={t('背景音乐', 'Background music')}>
        {eqBars(v.bgm.playing)}<span className="theatreChipText">{v.bgm.playing && currentTrack ? currentTrack.label : t('音乐', 'Music')}</span>
      </button>
      <button type="button" className="theatreChip" aria-pressed={v.panel === 'scene'} aria-expanded={v.panel === 'scene'} onClick={() => on.panel(v.panel === 'scene' ? null : 'scene')} title={t('切换背景', 'Change background')}>
        {icon(ICONS.image)}<span className="theatreChipText">{v.scene.label}</span>
      </button>
      <button type="button" className="theatreChip theatreChipIcon" aria-pressed={v.panel === 'settings'} aria-expanded={v.panel === 'settings'} onClick={() => on.panel(v.panel === 'settings' ? null : 'settings')} aria-label={t('剧场设置', 'Theatre settings')} title={t('剧场设置', 'Theatre settings')}>
        {icon(ICONS.sliders)}
      </button>
      {v.panel === 'scene' && scenePanel(v)}
      {v.panel === 'music' && musicPanel(v)}
      {v.panel === 'settings' && settingsPanel(v)}
    </div>}

    {!v.uiHidden && <div {...common} data-whale-pet="dialogue" data-expanded={v.expanded} className="galgameTheatreBox" onPointerDownCapture={closeMenus} role="dialog" aria-label={t('剧场模式', 'Theatre')}>
      <span className="galgameNameTag">{v.petName}</span>
      <div className="galgameHeaderBar">
        <div className="galgameIdentity">
          {v.tier && <span className="petTierTag" data-tier={v.tier.tier} title={v.tier.until}>{v.tier.label}</span>}
          {v.phase && <span className="petPhase" role="status">{v.phase}</span>}
        </div>
        {v.skipping && <span className="galgameSkipBadge" role="status">{icon(ICONS.skip)}{t('快进中', 'Skipping')}</span>}
      </div>

      <div
        className="galgameTextBody"
        data-reading={p.reading}
        style={textStyle}
        ref={v.textRef}
        onWheel={on.wheel}
        onScroll={e => on.textScroll(e.currentTarget)}
        onPointerDown={on.unlock}
        onClick={on.advance}
        role="log" aria-live="polite" aria-atomic="false"
        tabIndex={0}
        onKeyDown={e => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on.advance() } }}
        title={v.pageCount > 1 ? t('点击继续', 'Click to continue') : undefined}
      >
        <span className="galgameQuotes">「</span>
        {revealText(v)}
        {status.isStreaming && <span className="galgameCursor" aria-hidden="true" />}
        <span className="galgameQuotes">」</span>
        {!v.isRevealing && !status.isStreaming && v.visibleText && <span className="vnWait" data-last={p.reading !== 'pages' || v.pageIndex >= v.pageCount - 1} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 21.5C11.2 18 10.8 15.5 11 13.2 8.5 13.6 5.2 12.6 2.5 9.5 5.5 10 8 9.2 9.8 7.4c1-1 1.7-.8 2.2.2.5-1 1.2-1.2 2.2-.2 1.8 1.8 4.3 2.6 7.3 2.1-2.7 3.1-6 4.1-8.5 3.7.2 2.3-.2 4.8-1 8.3z" /></svg>
        </span>}
      </div>

      <div className="petReadingNav">
        {p.reading === 'pages' && v.pageCount > 1 && <>
          <button type="button" disabled={v.pageIndex === 0} onClick={on.previous} aria-label={t('上一段', 'Previous page')}>{icon('M10 3.5L5.5 8l4.5 4.5')}{t('上一段', 'Previous')}</button>
          <span className="petSinglePage" aria-label={t(`第 ${v.pageIndex + 1} 段，共 ${v.pageCount} 段`, `Page ${v.pageIndex + 1} of ${v.pageCount}`)}>{v.pageIndex + 1} / {v.pageCount}</span>
        </>}
        <span className="petNavSpacer" />
        {v.isRevealing && <button type="button" className="petSkipReveal" onClick={on.skipReveal}>{t('显示整段', 'Show page')}</button>}
      </div>

      <div className="galgameSystemBar">
        <div className="galgameComposerArea">
          <input
            type="text"
            className="galgameInput"
            aria-label={t('发送给大肥鱼的消息', 'Message to send')}
            placeholder={t('随时插话…（Enter 发送）', 'Say something… (Enter to send)')}
            value={v.inputValue}
            onChange={e => on.input(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); on.send() } }}
          />
          <button type="button" className="galgameSendBtn" onClick={on.send} disabled={!v.inputValue.trim()}>{t('发送', 'Send')}</button>
        </div>
        <nav className="galgameTopControls" aria-label={t('剧场控制', 'Theatre controls')}>
          <button type="button" className="galgameCloseBtn" title={t('查看已加载的问答（L）', 'Review loaded messages (L)')} onClick={on.openLog}>{icon(ICONS.log)}{t('回顾', 'Log')}</button>
          <button type="button" className="galgameCloseBtn" title={t('读完后自动显示下一段（A）', 'Next page automatically (A)')} aria-pressed={p.autoAdvance} onClick={on.toggleAuto}>{icon(ICONS.auto)}{t('自动', 'Auto')}</button>
          <button type="button" className="galgameCloseBtn" title={t('快进到最后一段（按住 Ctrl 也可以）', 'Skip to the last page (or hold Ctrl)')} aria-pressed={v.skipping} onClick={on.toggleSkip}>{icon(ICONS.skip)}{t('快进', 'Skip')}</button>
          <button type="button" className="galgameCloseBtn" title={t('隐藏界面，欣赏立绘（H）', 'Hide interface (H)')} onClick={() => on.hideUi(true)}>{icon(ICONS.hide)}{t('隐藏', 'Hide')}</button>
          <button type="button" className="galgameCloseBtn" aria-pressed={v.expanded} title={v.expanded ? t('回到标准剧场', 'Back to standard') : t('大屏阅读', 'Expanded reading')} onClick={on.toggleExpanded}>{icon(v.expanded ? 'M6 3H3v3M10 3h3v3M6 13H3v-3M10 13h3v-3' : 'M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3')}{v.expanded ? t('标准', 'Standard') : t('大屏', 'Expand')}</button>
          <details className="petTheatreMore">
            <summary aria-label={t('更多选项', 'More options')} title={t('更多选项', 'More options')}>{icon(ICONS.more)}</summary>
            <div className="petMorePanel" role="menu" onClick={e => { if ((e.target as Element).closest('button')) e.currentTarget.closest('details')?.removeAttribute('open') }}>
              <button type="button" role="menuitem" onClick={() => on.hideUi(true)}><span aria-hidden="true">◉</span>{t('隐藏界面，欣赏立绘', 'Hide interface')}<kbd>H</kbd></button>
              <button type="button" role="menuitem" onClick={on.toggleMute}><span aria-hidden="true">♫</span>{p.muted ? t('开启人物音效', 'Enable character sounds') : t('关闭人物音效', 'Mute character sounds')}<kbd>M</kbd></button>
              <button type="button" role="menuitem" onClick={on.toggleReading}><span aria-hidden="true">▤</span>{p.reading === 'pages' ? t('切换为完整阅读', 'Read full response') : t('切换为分页阅读', 'Read in pages')}</button>
              <hr />
              <button type="button" role="menuitem" onClick={on.toggleTheme}><span aria-hidden="true">{p.theme === 'light' ? '☾' : '☀'}</span>{p.theme === 'light' ? t('深色主题', 'Dark theme') : t('浅色主题', 'Light theme')}</button>
              <button type="button" role="menuitem" onClick={on.toggleLanguage}><span aria-hidden="true">◎</span>{p.language === 'zh' ? 'English' : '中文'}</button>
            </div>
          </details>
          <button type="button" className="galgameCloseBtn galgameExit" onClick={on.exit} title={t('退出剧场（Esc）', 'Exit theatre (Esc)')}>{icon(ICONS.close)}{t('退出', 'Exit')}</button>
        </nav>
      </div>
    </div>}

    {v.uiHidden && <button type="button" {...common} data-whale-pet="restore" className="petRestore" onClick={() => on.hideUi(false)}>{t('点击恢复对话', 'Click to restore dialogue')}</button>}

    {v.logOpen && !v.uiHidden && <aside {...common} data-whale-pet="log" className="petLog" role="dialog" aria-label={t('历史回顾', 'Conversation log')}>
      <header><strong>{t('历史回顾', 'Conversation log')}</strong><button type="button" onClick={on.closeLog}>{t('关闭', 'Close')}</button></header>
      <p className="petLogNote">{t('显示当前页面已加载的问答，切换会话后重新打开即可更新。', 'Showing messages loaded on this page. Reopen after switching conversations.')}</p>
      {v.history.length ? v.history.map((entry, index) => <article key={index} data-role={entry.role}>
        <div className="petLogMeta"><strong>{entry.role === 'user' ? t('你', 'You') : v.petName}</strong><button type="button" onClick={() => on.copy(entry.text)}>{t('复制', 'Copy')}</button></div>
        <DialogueContent text={entry.text} copy={on.copy} copyLabel={t('复制', 'Copy')} />
      </article>) : <p>{t('当前页面暂无已加载记录。', 'No loaded messages on this page.')}</p>}
    </aside>}

    {v.toast && <div data-whale-pet="toast" data-pet-theme={p.theme} className="petToast" role="status">{v.toast}</div>}
  </React.Fragment>
}

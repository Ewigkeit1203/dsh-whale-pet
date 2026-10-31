import React from 'react'
import { DialogueContent } from './DialogueContent.js'
import { LivingPuppet } from './LivingPuppet.js'
import type { Preferences } from './preferences.js'
import type { PetStatusInfo } from './types.js'
import type { HistoryEntry } from './experience.js'

export interface TheatreViewProps {
  t: (zh: string, en: string) => string
  p: Preferences
  status: PetStatusInfo
  lang: string
  petName: string
  puppet: { imgSrc: string; poseName: string; poseScale: number; isMaiden: boolean }
  phase: string | null
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
  on: {
    exit: () => void
    backdrop: () => void
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
    input: (value: string) => void
    send: () => void
    copy: (text: string) => void
  }
}

const icon = (d: string) => <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>

/** Visual-novel theatre: stage, thought bubble, dialogue box, log. Plain render function. */
export function TheatreView(v: TheatreViewProps) {
  const { t, p, status, on } = v
  const common = { 'data-pet-theme': p.theme, lang: v.lang }
  const textStyle = { '--pet-text-size': p.fontSize + 'px' } as React.CSSProperties
  const closeMenus = (event: React.PointerEvent<HTMLElement>) => {
    on.unlock()
    if (!(event.target as Element).closest('details')) event.currentTarget.querySelector('details[open]')?.removeAttribute('open')
  }
  return <>
    <div {...common} data-whale-pet="backdrop" className="galgameBackdrop" onClick={on.backdrop} onPointerDown={on.unlock} title={t('点击空白处退出剧场', 'Click the background to exit')} />

    {!v.uiHidden && v.showThoughts && <div {...common} data-whale-pet="thought" data-expanded={v.expanded} className="comicThoughtBubble" role="complementary" aria-label={t('思考过程', 'Thoughts')}>
      <div className="thoughtBubbleHeader">
        <div className="thoughtBubbleTitleGroup"><span className="thoughtDot" aria-hidden="true" />{t('思考过程', 'Thoughts')}{status.isReasoning && <span className="thoughtLivePill">{t('推理中', 'Thinking')}</span>}</div>
        <button type="button" className="petIconButton" onClick={on.hideThoughts} aria-label={t('隐藏思考气泡', 'Hide thoughts')}>{icon('M4 4l8 8M12 4l-8 8')}</button>
      </div>
      <div className="thoughtBubbleContent" style={textStyle} ref={v.thoughtRef} tabIndex={0} onScroll={e => on.thoughtScroll(e.currentTarget)}>
        {status.reasoningText || t('正在整理思路……', 'Thinking things through…')}
      </div>
    </div>}

    <div {...common} data-whale-pet="stage" data-expanded={v.expanded} data-theatre-hidden={v.uiHidden} className={'galgameCharacterCentered ' + (v.puppet.isMaiden ? 'galgameCharacterMaiden' : 'galgameCharacterChibi')}>
      <LivingPuppet poseName={v.puppet.poseName} poseScale={v.puppet.poseScale} imgSrc={v.puppet.imgSrc} isMaiden={v.puppet.isMaiden} isGalGameMode={true} mouthOpenRatio={status.mouthOpenRatio} gazeOffset={status.gazeOffset} state={status.state} />
    </div>

    {!v.uiHidden && <div {...common} data-whale-pet="dialogue" data-expanded={v.expanded} className="galgameTheatreBox" onPointerDownCapture={closeMenus} role="dialog" aria-label={t('剧场模式', 'Theatre')}>
      <div className="galgameHeaderBar">
        <div className="galgameIdentity">
          <span className="galgameNameTag">{v.petName}</span>
          {v.phase && <span className="petPhase" role="status">{v.phase}</span>}
        </div>
        <div className="galgameTopControls">
          <button type="button" className="galgameCloseBtn" title={t('查看已加载的问答（L）', 'Review loaded messages (L)')} onClick={on.openLog}>{icon('M3 4h10M3 8h10M3 12h6')}{t('回顾', 'Log')}</button>
          <button type="button" className="galgameCloseBtn" title={t('读完后自动显示下一段（A）', 'Next page automatically (A)')} aria-pressed={p.autoAdvance} onClick={on.toggleAuto}>{icon('M5 3.5v9l7-4.5z')}{t('自动', 'Auto')}</button>
          <button type="button" className="galgameCloseBtn" aria-pressed={v.expanded} title={v.expanded ? t('回到标准剧场', 'Back to standard') : t('大屏阅读', 'Expanded reading')} onClick={on.toggleExpanded}>{icon(v.expanded ? 'M6 3H3v3M10 3h3v3M6 13H3v-3M10 13h3v-3' : 'M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3')}{v.expanded ? t('标准', 'Standard') : t('大屏', 'Expand')}</button>
          <details className="petTheatreMore">
            <summary aria-label={t('更多选项', 'More options')} title={t('更多选项', 'More options')}>{icon('M3.5 8h.01M8 8h.01M12.5 8h.01')}</summary>
            <div className="petMorePanel" role="menu" onClick={e => { if ((e.target as Element).closest('button')) e.currentTarget.closest('details')?.removeAttribute('open') }}>
              <button type="button" role="menuitem" onClick={() => on.hideUi(true)}><span aria-hidden="true">◉</span>{t('隐藏界面，欣赏立绘', 'Hide interface')}<kbd>H</kbd></button>
              <button type="button" role="menuitem" onClick={on.toggleMute}><span aria-hidden="true">♫</span>{p.muted ? t('开启人物音效', 'Enable character sounds') : t('关闭人物音效', 'Mute character sounds')}<kbd>M</kbd></button>
              <button type="button" role="menuitem" onClick={on.toggleReading}><span aria-hidden="true">▤</span>{p.reading === 'pages' ? t('切换为完整阅读', 'Read full response') : t('切换为分页阅读', 'Read in pages')}</button>
              <hr />
              <button type="button" role="menuitem" onClick={on.toggleTheme}><span aria-hidden="true">{p.theme === 'light' ? '☾' : '☀'}</span>{p.theme === 'light' ? t('深色主题', 'Dark theme') : t('浅色主题', 'Light theme')}</button>
              <button type="button" role="menuitem" onClick={on.toggleLanguage}><span aria-hidden="true">◎</span>{p.language === 'zh' ? 'English' : '中文'}</button>
            </div>
          </details>
          <button type="button" className="galgameCloseBtn galgameExit" onClick={on.exit} title={t('退出剧场（Esc）', 'Exit theatre (Esc)')}>{icon('M4 4l8 8M12 4l-8 8')}{t('退出', 'Exit')}</button>
        </div>
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
        <DialogueContent text={v.visibleText} copy={on.copy} copyLabel={t('复制', 'Copy')} />
        {status.isStreaming && <span className="galgameCursor" aria-hidden="true" />}
        <span className="galgameQuotes">」</span>
      </div>

      <div className="petReadingNav">
        {p.reading === 'pages' && v.pageCount > 1 && <>
          <button type="button" disabled={v.pageIndex === 0} onClick={on.previous} aria-label={t('上一段', 'Previous page')}>{icon('M10 3.5L5.5 8l4.5 4.5')}{t('上一段', 'Previous')}</button>
          <span className="petSinglePage" aria-label={t(`第 ${v.pageIndex + 1} 段，共 ${v.pageCount} 段`, `Page ${v.pageIndex + 1} of ${v.pageCount}`)}>{v.pageIndex + 1} / {v.pageCount}</span>
        </>}
        <span className="petNavSpacer" />
        {v.isRevealing
          ? <button type="button" className="petSkipReveal" onClick={on.skipReveal}>{t('显示整段', 'Show page')}</button>
          : p.reading === 'pages' && v.pageIndex < v.pageCount - 1 && <span className="petNextTriangle" aria-hidden="true">▼</span>}
      </div>

      <div className="galgameComposerArea">
        <input
          type="text"
          className="galgameInput"
          aria-label={t('发送给大肥鱼的消息', 'Message to send')}
          placeholder={t('输入你的问题，Enter 发送', 'Type a message, Enter to send')}
          value={v.inputValue}
          onChange={e => on.input(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); on.send() } }}
        />
        <button type="button" className="galgameSendBtn" onClick={on.send} disabled={!v.inputValue.trim()}>{t('发送', 'Send')}</button>
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
  </>
}

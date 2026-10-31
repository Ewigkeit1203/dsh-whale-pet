import React from 'react'
import type { Preferences } from './preferences.js'
import type { WalletView } from './wallet.js'

export interface SettingsPanelProps {
  p: Preferences
  wallet: WalletView
  tier: { tier: 'peak' | 'valley'; name: string; until: string; rule: string; holidayDataMissing: boolean }
  detached: boolean
  update: (p: Partial<Preferences>) => void
  toggleMute: () => void
  quiet: () => void
  reset: () => void
  doctor: () => void
  notify: () => void
  close: () => void
  openTheatre: () => void
}

const SIZE_STEPS = [0.5, 0.75, 1, 1.15, 1.3]
const SIZE_NAMES = ['XS', 'S', 'M', 'L', 'XL']

/** Plain render function (no hooks): header, scrollable body, fixed footer. */
export function SettingsPanel({ p, wallet, tier, detached, update, toggleMute, quiet, reset, doctor, notify, close, openTheatre }: SettingsPanelProps) {
  const t = (zh: string, en: string) => p.language === 'en' ? en : zh
  const selected = SIZE_STEPS.reduce((best, v) => Math.abs(v - p.scale) < Math.abs(best - p.scale) ? v : best)
  const sizeIndex = SIZE_STEPS.indexOf(selected)
  const time = (ms: number | null) => ms === null ? '' : new Date(ms).toLocaleTimeString(p.language === 'en' ? 'en-GB' : 'zh-CN', { hour: '2-digit', minute: '2-digit' })
  const walletBadge = ({
    live: t('已更新', 'Up to date'), stale: t('非实时', 'Not live'), loading: t('读取中', 'Reading'),
    'signed-out': t('未登录', 'Signed out'), error: t('读取失败', 'Failed'), unavailable: t('未读取', 'Not read'),
  } as Record<string, string>)[wallet.status]
  const walletNote = wallet.status === 'unavailable'
    ? t('当前 DSH 没有提供账户服务；打开 DSH 账户设置后可从页面读取。', 'This DSH build offers no account service; open DSH account settings to read it from the page.')
    : wallet.status === 'loading' ? t('正在通过 DSH 账户服务读取……', 'Reading through the DSH account service…')
    : wallet.status === 'signed-out' ? t('登录 DeepSeek 账号后显示余额。仅使用 API Key 时 DSH 不提供余额。', 'Sign in to a DeepSeek account to see the balance. DSH provides none for API-key-only use.')
    : wallet.status === 'error' ? t('暂时读不到余额，会自动重试。', 'The balance could not be read; retrying automatically.')
    : wallet.status === 'stale' ? t(`上次读取 ${time(wallet.checkedAt)}，之后可能已变化。`, `Last read at ${time(wallet.checkedAt)}; it may have changed.`)
    : wallet.source === 'host' ? t(`来自 DSH 账户服务 · ${time(wallet.checkedAt)} 更新`, `From the DSH account service · updated ${time(wallet.checkedAt)}`)
    : t('读取自 DSH 账户设置页。', 'Read from the DSH account settings page.')
  const toggle = (checked: boolean, onChange: (checked: boolean) => void, label: string, options: { disabled?: boolean; hint?: string } = {}) =>
    <label className="petToggle" data-disabled={options.disabled || undefined}>
      <span className="petToggleText">{label}{options.hint && <small>{options.hint}</small>}</span>
      <input type="checkbox" role="switch" checked={checked} disabled={options.disabled} onChange={e => onChange(e.target.checked)} />
    </label>
  return <>
    <header className="petPanelHeader">
      <h2 id="pet-settings-title">{t('大肥鱼设置', '大肥鱼 Settings')}</h2>
      {detached && <span className="petPanelMode" title={t('窗口较窄，设置以独立面板显示，角色暂停游荡', 'Window is narrow: settings open as a separate panel and wandering is paused')}>{t('独立面板', 'Separate panel')}</span>}
      <button type="button" className="petIconButton" onClick={close} aria-label={t('关闭设置', 'Close settings')} title={t('关闭（Esc）', 'Close (Esc)')}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
    </header>

    <div className="petSettingsBody">
      <section className="petWalletCard" data-status={wallet.status} data-low={wallet.low || undefined} aria-label={t('账户余额', 'Account balance')}>
        <div className="petWalletHead"><span>{t('账户余额', 'Account balance')}</span><span className="petWalletBadge">{walletBadge}</span></div>
        <dl className="petWalletFigures">
          <div><dt>{t('充值', 'Topped up')}</dt><dd>{wallet.toppedUp ?? '—'}</dd></div>
          <div><dt>{t('赠金', 'Granted')}</dt><dd>{wallet.grantedNone ? t('无', 'None') : wallet.granted ?? '—'}</dd></div>
        </dl>
        <p className="petWalletNote">{walletNote}{wallet.bowls !== null && <> {t(`约可吃 ${wallet.bowls} 碗饭。`, `About ${wallet.bowls} bowls left.`)}</>}</p>
      </section>

      <section className="petTierCard" data-tier={tier.tier} aria-label={t('API 计费时段', 'API pricing period')}>
        <div className="petTierHead"><i aria-hidden="true" /><strong>{tier.name}</strong><span>{tier.tier === 'peak' ? t('高峰价', 'Peak price') : t('半价', 'Half price')}</span></div>
        <p>{tier.until && <>{tier.until}{t('（本机时间）。', ' (your local time). ')}</>}{tier.rule}</p>
        {tier.holidayDataMissing && <p className="petTierWarn">{t('今年的法定节假日表尚未更新，节假日可能被误判为高峰。', 'This year’s public-holiday table is not updated yet; a holiday may show as peak.')}</p>}
      </section>

      <details className="petSettingsGroup" open>
        <summary>{t('外观', 'Appearance')}</summary>
        <div className="petGroupBody">
          <div className="petField"><span className="petFieldLabel">{t('主题', 'Theme')}</span>
            <div className="petSegmented" role="group" aria-label={t('主题', 'Theme')}>{(['light', 'dark'] as const).map(theme => <button type="button" key={theme} aria-pressed={p.theme === theme} aria-label={theme === 'light' ? t('浅色主题', 'Light theme') : t('深色主题', 'Dark theme')} onClick={() => update({ theme })}>{theme === 'light' ? t('浅色', 'Light') : t('深色', 'Dark')}</button>)}</div>
          </div>
          <div className="petField"><span className="petFieldLabel">{t('界面语言', 'Language')}</span>
            <div className="petSegmented" role="group" aria-label={t('界面语言', 'Interface language')}>{(['zh', 'en'] as const).map(language => <button type="button" key={language} aria-pressed={p.language === language} onClick={() => update({ language })}>{language === 'zh' ? '中文' : 'English'}</button>)}</div>
          </div>
          <div className="petField petFieldStack"><label className="petFieldLabel" id="pet-scale-label">{t('大小', 'Size')}<span className="petValue">{SIZE_NAMES[sizeIndex]}</span></label>
            <div className="petSizeSlider">
              <input type="range" min="0" max="4" step="1" value={sizeIndex} aria-labelledby="pet-scale-label" aria-valuetext={Math.round(selected * 100) + '%'} onChange={e => update({ scale: SIZE_STEPS[Number(e.target.value)] })} />
              <div className="petSizeDots">{SIZE_STEPS.map((v, i) => <button key={v} className={i === 2 ? 'default' : ''} type="button" title={SIZE_NAMES[i]} aria-label={t('大小 ', 'Size ') + SIZE_NAMES[i]} aria-pressed={v === selected} onClick={() => update({ scale: v })}><i /></button>)}</div>
            </div>
          </div>
          <div className="petField petFieldStack"><label className="petFieldLabel" htmlFor="pet-opacity">{t('透明度', 'Opacity')}<span className="petValue">{Math.round(p.opacity * 100)}%</span></label>
            <input id="pet-opacity" type="range" min="0.35" max="1" step="0.05" value={p.opacity} onChange={e => update({ opacity: Number(e.target.value) })} />
          </div>
          <div className="petField petFieldStack"><label className="petFieldLabel" htmlFor="pet-font">{t('文字大小', 'Text size')}<output className="petValue" htmlFor="pet-font">{p.fontSize}px</output></label>
            <input id="pet-font" type="range" min="14" max="24" step="0.1" value={p.fontSize} aria-valuetext={p.fontSize + 'px'} onChange={e => update({ fontSize: Number(e.target.value) })} />
          </div>
          {toggle(p.docked, docked => update({ docked }), t('贴边探头', 'Peek from the edge'), { hint: t('只露出上半身', 'Only the upper half shows') })}
        </div>
      </details>

      <details className="petSettingsGroup">
        <summary>{t('声音', 'Sound')}</summary>
        <div className="petGroupBody">
          {toggle(!p.muted, () => toggleMute(), t('人物音效', 'Character sounds'), { disabled: p.quiet, hint: p.quiet ? t('安静模式中', 'Paused by quiet mode') : t('输出文字时轻声说话', 'Soft speech while text appears') })}
          <div className="petField petFieldStack"><label className="petFieldLabel" htmlFor="pet-volume">{t('音量', 'Volume')}<span className="petValue">{Math.round(p.volume * 100)}%</span></label>
            <input id="pet-volume" type="range" min="0" max="1" step="0.05" value={p.volume} disabled={p.muted || p.quiet} onChange={e => update({ volume: Number(e.target.value) })} />
          </div>
        </div>
      </details>

      <details className="petSettingsGroup">
        <summary>{t('陪伴行为', 'Companionship')}</summary>
        <div className="petGroupBody">
          <button type="button" className="petWide" aria-pressed={p.quiet} onClick={quiet}>
            <strong>{p.quiet ? t('结束安静模式', 'End quiet mode') : t('安静模式', 'Quiet mode')}</strong>
            <small>{p.quiet ? t('恢复之前的音效与游荡设置', 'Restore previous sound and wandering') : t('暂停闲聊、音效和游荡', 'Pause chatter, sounds and wandering')}</small>
          </button>
          {toggle(p.wandering, wandering => update({ wandering }), t('闲置时散步', 'Wander when idle'), { disabled: p.quiet })}
          {toggle(p.reminders, reminders => update({ reminders }), t('午饭和熬夜提醒', 'Lunch & late-night reminders'))}
          {toggle(p.peakNotice, peakNotice => update({ peakNotice }), t('峰谷时段播报', 'Peak / off-peak announcements'), { hint: t('切换到梁文峰 / 梁文谷时间时告诉你', 'Tell you when API pricing switches') })}
          <div className="petField"><label className="petFieldLabel" htmlFor="pet-user">{t('怎么称呼你', 'Your name')}</label><input id="pet-user" value={p.userName} maxLength={24} onChange={e => update({ userName: e.target.value })} /></div>
          <div className="petField"><label className="petFieldLabel" htmlFor="pet-name">{t('她的昵称', 'Her nickname')}</label><input id="pet-name" value={p.petName} maxLength={24} onChange={e => update({ petName: e.target.value })} /></div>
          <div className="petField"><label className="petFieldLabel" htmlFor="pet-rice">{t('每碗饭额度', 'Credit per bowl')}</label><input id="pet-rice" type="number" min="0.01" max="100" step="0.1" value={p.ricePrice} onChange={e => { const n = Number(e.target.value); if (n >= .01 && n <= 100) update({ ricePrice: n }) }} /></div>
        </div>
      </details>

      <details className="petSettingsGroup">
        <summary>{t('剧场阅读', 'Theatre reading')}</summary>
        <div className="petGroupBody">
          {toggle(p.typewriter, typewriter => update({ typewriter }), t('逐字显示短篇叙述', 'Reveal short text gradually'))}
          <div className="petField petFieldStack"><span className="petFieldLabel" id="pet-speed-label">{t('文字速度', 'Text speed')}</span>
            <div id="pet-speed" className="petSegmented" role="group" aria-labelledby="pet-speed-label">{(['slow', 'medium', 'fast', 'instant'] as const).map((v, i) => <button type="button" key={v} aria-pressed={p.speed === v} onClick={() => update({ speed: v })}>{t(['慢', '中', '快', '瞬间'][i], ['Slow', 'Mid', 'Fast', 'Instant'][i])}</button>)}</div>
          </div>
          {toggle(p.autoAdvance, autoAdvance => update({ autoAdvance }), t('读完后自动显示下一段', 'Show the next page automatically'))}
          {toggle(p.autoGalGame, autoGalGame => update({ autoGalGame }), t('点击输入框进入剧场', 'Enter theatre on composer click'))}
        </div>
      </details>

      <details className="petSettingsGroup">
        <summary>{t('高级', 'Advanced')}</summary>
        <div className="petGroupBody">
          <button type="button" className="petWide" aria-pressed={p.notifications} onClick={notify}>
            <strong>{p.notifications ? t('关闭完成通知', 'Disable completion notifications') : t('后台完成通知', 'Background completion notifications')}</strong>
            <small>{p.notifications ? t('已开启', 'On') : t('开启时会请求系统授权', 'Asks for system permission when enabled')}</small>
          </button>
          <button type="button" className="petWide" onClick={doctor}><strong>{t('兼容性检查 Doctor', 'Compatibility Doctor')}</strong><small>{t('只统计选择器匹配数，不含聊天内容', 'Selector counts only, no chat content')}</small></button>
          <button type="button" className="petWide" onClick={reset}><strong>{t('恢复默认设置', 'Restore defaults')}</strong></button>
        </div>
      </details>
    </div>

    <footer className="petSettingsFooter">
      <p className="petUnofficial">{t('非官方社区插件', 'Unofficial community plugin')}</p>
      <button type="button" className="petPrimary" onClick={openTheatre}>{t('进入剧场模式', 'Open theatre')}</button>
    </footer>
  </>
}

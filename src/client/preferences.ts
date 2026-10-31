export interface Preferences {
  userName: string
  petName: string
  fontSize: number
  speed: 'slow' | 'medium' | 'fast' | 'instant'
  docked: boolean
  onboardingDone: boolean
  notifications: boolean
  ricePrice: number
  quietBackup?: { wandering: boolean; muted: boolean }
  language: 'zh' | 'en'
  theme: 'light' | 'dark'
  wandering: boolean
  quiet: boolean
  muted: boolean
  volume: number
  typewriter: boolean
  reminders: boolean
  /** Announce DeepSeek API peak / off-peak switches (梁文峰 / 梁文谷时间). */
  peakNotice: boolean
  scale: number
  opacity: number
  reading: 'pages' | 'scroll'
  autoAdvance: boolean
  form: 'maiden' | 'chibi'
  autoGalGame: boolean
  x?: number
  y?: number
}
export const PREFERENCES_KEY = 'dsh-whale-pet.preferences.v1'
export function defaultPreferences(): Preferences {
  const defaults: Preferences = { userName: '你', petName: '大肥鱼', fontSize: 17, speed: 'medium', docked: false, onboardingDone: false, notifications: false, ricePrice: 1, language: 'zh', theme: 'light', wandering: true, quiet: false, muted: true, volume: 0.2, typewriter: true, reminders: true, peakNotice: true, scale: 1, opacity: 1, reading: 'pages', autoAdvance: false, form: 'maiden', autoGalGame: true }
  return defaults
}
export function readPreferences(): Preferences {
  const defaults = defaultPreferences()
  try {
    const p = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}')
    if (!p || typeof p !== 'object') return defaults
    for (const key of ['wandering', 'quiet', 'autoAdvance', 'autoGalGame', 'muted', 'typewriter', 'reminders', 'peakNotice', 'docked', 'onboardingDone', 'notifications'] as const) if (typeof p[key] === 'boolean') defaults[key] = p[key]
    for (const key of ['userName', 'petName'] as const) if (typeof p[key] === 'string' && p[key].trim()) defaults[key] = p[key].trim().slice(0, 24)
    if (['slow', 'medium', 'fast', 'instant'].includes(p.speed)) defaults.speed = p.speed
    if (Number.isFinite(p.fontSize)) defaults.fontSize = Math.min(24, Math.max(14, p.fontSize))
    if (Number.isFinite(p.ricePrice)) defaults.ricePrice = Math.min(100, Math.max(0.01, p.ricePrice))
    if (p.quietBackup && typeof p.quietBackup.wandering === 'boolean' && typeof p.quietBackup.muted === 'boolean') defaults.quietBackup = p.quietBackup
    if (p.language === 'en') defaults.language = 'en'
    if (p.theme === 'dark') defaults.theme = 'dark'
    if (p.reading === 'scroll') defaults.reading = 'scroll'
    if (p.form === 'chibi') defaults.form = 'chibi'
    if (typeof p.scale === 'number' && Number.isFinite(p.scale)) defaults.scale = Math.min(1.3, Math.max(0.5, p.scale))
    if (typeof p.opacity === 'number' && Number.isFinite(p.opacity)) defaults.opacity = Math.min(1, Math.max(0.35, p.opacity))
    if (typeof p.volume === 'number' && Number.isFinite(p.volume)) defaults.volume = Math.min(1, Math.max(0, p.volume))
    if (Number.isFinite(p.x)) defaults.x = p.x
    if (Number.isFinite(p.y)) defaults.y = p.y
  } catch { /* Storage may be disabled by the host. */ }
  return defaults
}
export function savePreferences(preferences: Preferences): void {
  try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)) } catch { /* Keep working in memory. */ }
}

export function quietPreset(p: Preferences): Preferences {
  return p.quiet ? { ...p, quiet: false, wandering: p.quietBackup?.wandering ?? true, muted: p.quietBackup?.muted ?? true, quietBackup: undefined } : { ...p, quiet: true, wandering: false, muted: true, quietBackup: { wandering: p.wandering, muted: p.muted } }
}

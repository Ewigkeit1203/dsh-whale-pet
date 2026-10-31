export interface Preferences {
  language: 'zh' | 'en'
  theme: 'light' | 'dark'
  wandering: boolean
  quiet: boolean
  muted: boolean
  volume: number
  typewriter: boolean
  reminders: boolean
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
export function readPreferences(): Preferences {
  const defaults: Preferences = { language: 'zh', theme: 'light', wandering: true, quiet: false, muted: true, volume: 0.2, typewriter: true, reminders: true, scale: 1, opacity: 1, reading: 'pages', autoAdvance: false, form: 'maiden', autoGalGame: true }
  try {
    const p = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}')
    if (!p || typeof p !== 'object') return defaults
    for (const key of ['wandering', 'quiet', 'autoAdvance', 'autoGalGame', 'muted', 'typewriter', 'reminders'] as const) if (typeof p[key] === 'boolean') defaults[key] = p[key]
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

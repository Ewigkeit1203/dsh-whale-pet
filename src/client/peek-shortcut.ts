/** A deliberate modified letter; never steal text editing or the existing Alt+W/T actions. */
export interface PeekKey { key: string; altKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean; isComposing?: boolean; repeat?: boolean }
export function normalisePeekShortcut(value: unknown): string | null {
  if (value === '') return ''
  if (typeof value !== 'string') return null
  const parts = value.split('+'), key = parts.pop()?.toUpperCase()
  if (!key || !/^[A-Z0-9]$/.test(key) || !parts.length || new Set(parts).size !== parts.length || parts.some(p => !['Alt','Ctrl','Shift','Meta'].includes(p))) return null
  const alt = parts.includes('Alt'), ctrl = parts.includes('Ctrl'), meta = parts.includes('Meta'), shift = parts.includes('Shift')
  if (!(alt || (ctrl || meta) && shift) || (alt && !ctrl && !meta && !shift && ['W','T','F'].includes(key))) return null
  return [ctrl && 'Ctrl', alt && 'Alt', shift && 'Shift', meta && 'Meta', key].filter(Boolean).join('+')
}
export function peekShortcutFromEvent(event: PeekKey): string | null {
  if (event.isComposing || event.repeat) return null
  return normalisePeekShortcut([event.ctrlKey && 'Ctrl', event.altKey && 'Alt', event.shiftKey && 'Shift', event.metaKey && 'Meta', event.key.toUpperCase()].filter(Boolean).join('+'))
}
export function matchesPeekShortcut(event: PeekKey, shortcut: string): boolean { return Boolean(shortcut) && peekShortcutFromEvent(event) === shortcut }

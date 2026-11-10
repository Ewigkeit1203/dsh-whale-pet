export function revealDelay(character: string, speed: 'slow' | 'medium' | 'fast' | 'instant'): number {
  if (speed === 'instant') return 0
  const base = speed === 'slow' ? 70 : speed === 'fast' ? 22 : 42
  return /[。！？.!?]/.test(character) ? base * 7 : /[，,；;：:]/.test(character) ? base * 3 : /[…]/.test(character) ? base * 10 : base
}
export function diagnosticReport(): string {
  const selectors = { messages: '[data-chat-flow-kind]', generation: '[data-chat-running]', composer: '[data-composer-input], [data-composer-card], [data-composer-seat]', balances: '[class*="balanceCard"] [class*="amount"]' }
  return JSON.stringify({ plugin: 'dsh-whale-pet', checked: new Date().toISOString(), checks: Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, { selector, matches: document.querySelectorAll(selector).length }])), note: 'Counts only. No message text, URL, account ID or credentials. Generation and balance may be absent while idle or closed.' }, null, 2)
}
/**
 * Wrap by measured line width rather than total characters, preserving all prose.
 * Widths are summed per character (one measurement per distinct character), so a
 * long streamed answer costs linear time instead of re-measuring every line prefix.
 */
export function paginateText(text: string, width: number, height: number, font: number, charWidth?: (character: string) => number): string[] {
  const maxLines = Math.max(1, Math.floor(Math.max(28, height - 12) / (font * 1.75)))
  const limit = Math.max(font * 4, width)
  const measure = charWidth ?? ((c: string) => (/[\u0000-\u00ff]/.test(c) ? .58 : 1) * font)
  const pages: string[] = []
  let page = '', lineWidth = 0, lineEmpty = true, lines = 1
  for (const character of Array.from(text.replace(/\n{3,}/g, '\n\n'))) {
    const w = character === '\n' ? 0 : measure(character)
    if (character === '\n' || (!lineEmpty && lineWidth + w > limit)) {
      if (lines >= maxLines) { if (page.trim()) pages.push(page.trim()); page = ''; lines = 1 }
      else lines++
      lineWidth = 0; lineEmpty = true
    }
    page += character
    if (character !== '\n') { lineWidth += w; lineEmpty = false }
  }
  if (page.trim()) pages.push(page.trim())
  return pages.length ? pages : ['……']
}

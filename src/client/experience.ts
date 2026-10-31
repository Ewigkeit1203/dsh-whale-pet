/** Native synthesis only. No context or sound is created until a user gesture. */
export class PetAudio {
  private context: AudioContext | null = null
  private lastBlip = 0
  private active = 0
  public unlock(): void {
    try {
      if (!this.context || this.context.state === 'closed') this.context = new AudioContext()
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {})
    } catch { /* Audio may be unavailable in the host. */ }
  }
  public play(kind: 'blip' | 'ding' | 'jelly' | 'rice', volume = 0.2): void {
    const ctx = this.context
    if (!ctx || ctx.state !== 'running' || this.active > 6) return
    if (kind === 'blip' && ctx.currentTime - this.lastBlip < 0.065) return
    if (kind === 'blip') this.lastBlip = ctx.currentTime
    const notes = kind === 'ding' ? [1047, 1568] : kind === 'rice' ? [523, 659, 784] : kind === 'jelly' ? [520] : [240 + Math.random() * 65]
    notes.forEach((frequency, i) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = ctx.currentTime + i * 0.065
      const duration = kind === 'blip' ? 0.07 : kind === 'jelly' ? 0.2 : 0.3
      oscillator.type = kind === 'blip' ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(frequency, start)
      if (kind === 'jelly') oscillator.frequency.exponentialRampToValueAtTime(180, start + duration)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, Math.min(1, Math.max(0, volume)) * (kind === 'blip' ? 0.12 : 0.22)), start + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(kind === 'blip' ? 1100 : 3000, start)
      filter.Q.setValueAtTime(0.5, start)
      oscillator.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
      this.active++
      oscillator.onended = () => { this.active = Math.max(0, this.active - 1); oscillator.disconnect(); filter.disconnect(); gain.disconnect() }
      oscillator.start(start); oscillator.stop(start + duration + 0.01)
    })
  }
  public silence(): void { if (this.context?.state === 'running') void this.context.suspend().catch(() => {}) }
  public dispose(): void { if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {}); this.context = null }
}
export interface DialogueBlock { kind: 'text' | 'code'; text: string; language?: string }
export function dialogueBlocks(text: string): DialogueBlock[] {
  const blocks: DialogueBlock[] = []
  const pattern = /```([^\n`]*)\n([\s\S]*?)(?:```|$)/g
  let offset = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index! > offset) blocks.push({ kind: 'text', text: text.slice(offset, match.index) })
    blocks.push({ kind: 'code', language: match[1].trim(), text: match[2].replace(/\n$/, '') })
    offset = match.index! + match[0].length
  }
  if (offset < text.length) blocks.push({ kind: 'text', text: text.slice(offset) })
  return blocks
}
export interface HistoryEntry { role: 'user' | 'assistant'; text: string }
export function readConversationLog(): HistoryEntry[] {
  const nodes = Array.from(document.querySelectorAll('[data-chat-flow-kind="user-prompt"], [data-chat-flow-kind="assistant-step"]'))
  return nodes.filter(node => !nodes.some(other => other !== node && other.contains(node))).slice(-80).map(node => {
    return { role: node.getAttribute('data-chat-flow-kind') === 'user-prompt' ? 'user' as const : 'assistant' as const, text: messageText(node).slice(0, 20000) }
  }).filter(entry => entry.text)
}
export function parseBalance(value: string): number | null {
  const match = value.replace(/,/g, '').match(/(?:¥|￥)?\s*(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}
/** Preserve code and block boundaries while excluding reasoning and controls. */
export function messageText(container: Element): string {
  const clone = container.cloneNode(true) as Element
  clone.querySelectorAll('[data-variant="think"], [data-turn-process-inline], details.think, [class*="reasoning"], [class*="thought"], .summary, [class*="thinkBody"], button, [data-whale-pet]').forEach(el => el.remove())
  clone.querySelectorAll('strong, b').forEach(node => { if (!node.closest('pre')) node.replaceWith(document.createTextNode('**' + (node.textContent || '') + '**')) })
  clone.querySelectorAll('h1,h2,h3,h4').forEach(node => node.prepend(document.createTextNode('### ')))
  clone.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code')
    const language = code?.className.match(/language-([\w+-]+)/)?.[1] || ''
    pre.replaceWith(document.createTextNode('\n```' + language + '\n' + (code?.textContent || pre.textContent || '') + '\n```\n'))
  })
  clone.querySelectorAll('li').forEach(node => { node.prepend(document.createTextNode('• ')); node.append(document.createTextNode('\n')) })
  clone.querySelectorAll('p, h1, h2, h3, h4, blockquote, br').forEach(node => node.append(document.createTextNode('\n')))
  const markdown = Array.from(clone.querySelectorAll('[class*="markdown"], [data-markdown-variant]')).filter(node => !node.parentElement?.closest('[class*="markdown"], [data-markdown-variant]'))
  return (markdown.length ? markdown.map(node => node.textContent || '').join('\n') : clone.textContent || '').trim()
}

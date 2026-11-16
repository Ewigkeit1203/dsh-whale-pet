/** Text helpers shared by the views. Audio lives in voice.ts. */
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
export function readConversationLog(root: ParentNode = document, limit = 80, textLimit = 20000): HistoryEntry[] {
  const nodes = Array.from(root.querySelectorAll('[data-chat-flow-kind="user-prompt"], [data-chat-flow-kind="assistant-step"]'))
    .filter(node => !node.closest('[data-whale-pet]'))
  const selected = new Set(nodes)
  // Walk the short ancestor chain, instead of comparing every message against the entire conversation.
  return nodes.filter(node => {
    for (let parent = node.parentElement; parent; parent = parent.parentElement) if (selected.has(parent)) return false
    return true
  }).slice(-limit).map(node => {
    return { role: node.getAttribute('data-chat-flow-kind') === 'user-prompt' ? 'user' as const : 'assistant' as const, text: messageText(node).slice(0, textLimit) }
  }).filter(entry => entry.text)
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

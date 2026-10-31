export function pageCapacity(width: number, height: number, fontSize: number): number {
  return Math.max(24, Math.floor(Math.min(width, fontSize * 40) / fontSize) * Math.max(1, Math.floor(height / (fontSize * 1.75))) - 14)
}
export function revealDelay(character: string, speed: 'slow' | 'medium' | 'fast' | 'instant'): number {
  if (speed === 'instant') return 0
  const base = speed === 'slow' ? 70 : speed === 'fast' ? 22 : 42
  return /[。！？.!?]/.test(character) ? base * 7 : /[，,；;：:]/.test(character) ? base * 3 : /[…]/.test(character) ? base * 10 : base
}
export function diagnosticReport(): string {
  const selectors = { messages: '[data-chat-flow-kind]', generation: '[data-chat-running]', composer: '[data-composer-input], [data-composer-card], [data-composer-seat]', balances: '[class*="balanceCard"] [class*="amount"]' }
  return JSON.stringify({ plugin: 'dsh-whale-pet', checked: new Date().toISOString(), checks: Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, { selector, matches: document.querySelectorAll(selector).length }])), note: 'Counts only. No message text, URL, account ID or credentials. Generation and balance may be absent while idle or closed.' }, null, 2)
}
/** Wrap by measured line width rather than total characters, preserving all prose. */
export function paginateText(text: string, width: number, height: number, font: number, measure?: (text: string) => number): string[] {
 const maxLines = Math.max(1, Math.floor(Math.max(28,height-12)/(font*1.75)))
 const limit = Math.max(font*4,width)
 const size = measure ?? ((s:string) => Array.from(s).reduce((n,c)=>n+(/[\u0000-\u00ff]/.test(c)?.58:1)*font,0))
 const pages: string[]=[]
 let page='',line='',lines=1
 for(const character of Array.from(text.replace(/\n{3,}/g,'\n\n'))) {
   const wraps = character==='\n' || (line.length>0 && size(line+character)>limit)
   if(wraps) {
     if(lines>=maxLines) { if(page.trim())pages.push(page.trim());page='';lines=1 }
     else lines++
     line=''
   }
   page+=character
   if(character!=='\n')line+=character
 }
 if(page.trim())pages.push(page.trim())
 return pages.length?pages:['……']
}

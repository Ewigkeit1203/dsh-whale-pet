import React from 'react'
import { dialogueBlocks } from './experience.js'
export function DialogueContent({ text, copy, copyLabel }: { text: string; copy: (text: string) => void; copyLabel: string }) {
  const inline = (line: string) => line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2,-2)}</strong> : part.startsWith('`') && part.endsWith('`') ? <code className="petInlineCode" key={i}>{part.slice(1,-1)}</code> : <React.Fragment key={i}>{part}</React.Fragment>)
  return <>{dialogueBlocks(text).map((block, i) => block.kind === 'code' ? <section className="petCodeCard" key={i}>
    <header><span>{block.language || 'Code'}</span><button type="button" onClick={e => { e.stopPropagation(); copy(block.text) }}>{copyLabel}</button></header>
    <pre tabIndex={0} onClick={e => e.stopPropagation()}><code>{block.text}</code></pre>
  </section> : <span key={i}>{block.text.split('\n').map((line, j) => /^#{1,4} /.test(line) ? <strong className="petHeading" key={j}>{inline(line.replace(/^#{1,4} /,''))}{'\n'}</strong> : <React.Fragment key={j}>{inline(line)}{j < block.text.split('\n').length - 1 ? '\n' : ''}</React.Fragment>)}</span>)}</>
}

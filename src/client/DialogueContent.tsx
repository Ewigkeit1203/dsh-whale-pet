import React from 'react'
import { dialogueBlocks } from './experience.js'
export function DialogueContent({ text, copy, copyLabel }: { text: string; copy: (text: string) => void; copyLabel: string }) {
  return <>{dialogueBlocks(text).map((block, i) => block.kind === 'code' ? <section className="petCodeCard" key={i}>
    <header><span>{block.language || 'Code'}</span><button type="button" onClick={e => { e.stopPropagation(); copy(block.text) }}>{copyLabel}</button></header>
    <pre tabIndex={0} onClick={e => e.stopPropagation()}><code>{block.text}</code></pre>
  </section> : <span key={i}>{block.text.split('\n').map((line, j) => /^\s*(?:[-*+] |\d+\. )/.test(line) ? <span className="petListLine" key={j}>{line}{'\n'}</span> : <React.Fragment key={j}>{line}{j < block.text.split('\n').length - 1 ? '\n' : ''}</React.Fragment>)}</span>)}</>
}

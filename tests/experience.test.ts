import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dialogueBlocks, readConversationLog } from '../lib/client/experience.js'

test('code blocks preserve exact code and language, including an unfinished streaming fence', () => {
  const blocks = dialogueBlocks('First\n```python\nprint("<script>")\n```\nLast')
  assert.equal(blocks[1].kind, 'code')
  assert.equal(blocks[1].language, 'python')
  assert.equal(blocks[1].text, 'print("<script>")')
  assert.equal(blocks[2].text, '\nLast')
  assert.equal(dialogueBlocks('```js\nlet x = 1')[0].text, 'let x = 1')
})

test('conversation log: long histories avoid pairwise containment scans and still exclude nested and own messages', () => {
  const root = { parentElement: null }
  let clones = 0
  function message(text: string, parent: any = root, own = false): any {
    return { parentElement: parent, closest: () => own ? {} : null, getAttribute: () => 'user-prompt',
      contains() { throw Error('A pairwise history scan must not run') },
      cloneNode() { clones++; return { textContent: text, querySelectorAll: () => [] } } }
  }
  const nodes = Array.from({ length: 3000 }, (_, i) => message('message ' + i))
  nodes.push(message('nested duplicate', nodes.at(-1)), message('companion DOM', root, true))
  const entries = readConversationLog({ querySelectorAll: () => nodes } as any, 40, 4000)
  assert.equal(entries.length, 40); assert.equal(clones, 40)
  assert.equal(entries[0].text, 'message 2960'); assert.equal(entries.at(-1)!.text, 'message 2999')
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dialogueBlocks } from '../lib/client/experience.js'

test('code blocks preserve exact code and language, including an unfinished streaming fence', () => {
  const blocks = dialogueBlocks('First\n```python\nprint("<script>")\n```\nLast')
  assert.equal(blocks[1].kind, 'code')
  assert.equal(blocks[1].language, 'python')
  assert.equal(blocks[1].text, 'print("<script>")')
  assert.equal(blocks[2].text, '\nLast')
  assert.equal(dialogueBlocks('```js\nlet x = 1')[0].text, 'let x = 1')
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pageCapacity, revealDelay } from '../lib/client/usability.js'
import { defaultPreferences, quietPreset } from '../lib/client/preferences.js'
test('quiet mode restores exact previous audio and wandering choices', () => {
 const before={...defaultPreferences(),muted:false,wandering:false}
 const quiet=quietPreset(before)
 assert.equal(quiet.muted,true);assert.equal(quiet.wandering,false);assert.equal(quiet.quiet,true)
 const restored=quietPreset(quiet)
 assert.equal(restored.muted,false);assert.equal(restored.wandering,false);assert.equal(restored.quiet,false)
})
test('large type and short screens reduce page capacity',()=>{
 assert.ok(pageCapacity(720,180,24)<pageCapacity(720,180,14))
 assert.ok(pageCapacity(720,90,17)<pageCapacity(720,180,17))
})
test('punctuation adds pauses and instant mode skips reveal waits',()=>{
 assert.ok(revealDelay('。','medium')>revealDelay('，','medium'))
 assert.ok(revealDelay('，','medium')>revealDelay('字','medium'))
 assert.equal(revealDelay('…','instant'),0)
})

test('measured pagination respects explicit lines and preserves non-whitespace content', async()=>{
 const {paginateText}=await import('../lib/client/usability.js')
 const text='第一行说明。\n第二行说明。\n第三行说明。\n第四行说明。\n第五行说明。'
 const pages=paginateText(text,800,75,17)
 assert.ok(pages.length>=3)
 assert.equal(pages.join('').replace(/\s/g,''),text.replace(/\s/g,''))
 assert.ok(pages.every(page=>page.split('\n').length<=2))
})

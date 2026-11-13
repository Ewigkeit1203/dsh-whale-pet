import {test} from 'node:test'
import assert from 'node:assert/strict'
import {AnswerNotice,WELCOME_BACK_LINES,markTitle} from '../lib/client/answer-notice.js'
import {readPreferences,PREFERENCES_KEY} from '../lib/client/preferences.js'

test('Answer notice: greets once after an answer finished unseen; watching only earns a nod; off stays silent',()=>{
  const notice=new AnswerNotice(()=>.5)
  assert.equal(notice.back(),false,'nothing to greet for')
  assert.equal(notice.finish(true,'line'),'nod');assert.equal(notice.back(),false,'watched answers never get a line')
  assert.equal(notice.finish(false,'line'),'wait');assert.equal(notice.waiting,true)
  assert.equal(notice.back(),true);assert.equal(notice.back(),false,'once per answer')
  assert.equal(notice.finish(false,'motion'),'wait');assert.equal(notice.back(),true)
  assert.equal(notice.finish(false,'off'),'none');assert.equal(notice.back(),false)
  notice.finish(false,'line');assert.equal(notice.back('off'),false,'turning reminders off discards an already pending greeting')
  notice.finish(false,'line');notice.cancel();assert.equal(notice.back(),false,'preference change and teardown cancel pending reminders')
})

test('Answer notice: ten greetings repeat no line more than twice and never twice in a row',()=>{
  assert.ok(WELCOME_BACK_LINES.length>=5)
  for(const seed of [0,.3,.7,.999]){
    let r=seed;const notice=new AnswerNotice(()=>(r=(r*9301+.49297)%1))
    const picks=Array.from({length:10},()=>notice.nextLine()),counts=new Map<number,number>()
    picks.forEach((p,i)=>{counts.set(p,(counts.get(p)??0)+1);if(i)assert.notEqual(p,picks[i-1])})
    assert.ok(Math.max(...counts.values())<=2,`at most twice (${picks})`)
  }
  for(const [zh,en] of WELCOME_BACK_LINES){assert.ok(zh.length<=24&&en.length<=48,'short lines');assert.ok(!en.includes('{name}'))}
})

test('Answer notice: the title mark is added once and removed cleanly',()=>{
  const marked=markTitle('DSH · 会话',true)
  assert.equal(marked,'🐟 已回答 · DSH · 会话');assert.equal(markTitle(marked,true),marked,'never doubled')
  assert.equal(markTitle(markTitle('DSH',true,true),true),'🐟 已回答 · DSH','switching language replaces the mark')
  assert.equal(markTitle(marked,false),'DSH · 会话');assert.equal(markTitle('DSH',false),'DSH')
})

test('Answer notice preference: motion + line by default, malformed values fall back',()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage')
  let value='{}'
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>key===PREFERENCES_KEY?value:null,setItem(){}}})
  try{
    assert.equal(readPreferences().answerNotice,'line')
    value='{"answerNotice":"motion"}';assert.equal(readPreferences().answerNotice,'motion')
    value='{"answerNotice":"loud"}';assert.equal(readPreferences().answerNotice,'line')
  }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete (globalThis as any).localStorage}
})

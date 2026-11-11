import {test} from 'node:test'
import assert from 'node:assert/strict'
import {normalisePeekShortcut,peekShortcutFromEvent,matchesPeekShortcut} from '../lib/client/peek-shortcut.js'
import {rightPeekPosition} from '../lib/client/layout.js'
import {defaultPreferences,readPreferences,savePreferences} from '../lib/client/preferences.js'
test('Peek shortcuts require an intentional combination, preserve existing keys and reject repeats or IME',()=>{
 assert.equal(normalisePeekShortcut('Alt+p'),'Alt+P')
 assert.equal(normalisePeekShortcut('Shift+Ctrl+k'),'Ctrl+Shift+K')
 for(const bad of ['P','Ctrl+C','Alt+W','Alt+T','Alt+F','Alt+Alt+P','Alt+ArrowLeft',123])assert.equal(normalisePeekShortcut(bad),null)
 assert.equal(normalisePeekShortcut(''),'')
 assert.ok(matchesPeekShortcut({key:'p',altKey:true},'Alt+P'))
 for(const e of [{key:'p',altKey:true,shiftKey:true},{key:'p',altKey:true,repeat:true},{key:'p',altKey:true,isComposing:true}])assert.equal(matchesPeekShortcut(e,'Alt+P'),false)
 assert.equal(peekShortcutFromEvent({key:'Alt',altKey:true}),null)
})
test('Right edge position retains composer and control avoidance',()=>{
 const pos=rightPeekPosition(600,300,500,1280,800,{composer:{left:300,right:1270,top:600,bottom:790}})
 assert.ok(pos.x<1280 && pos.x+150>1100)
 assert.ok(pos.y+180<=600-16,'avoid the composer and bottom-right controls')
})
test('Peek preferences survive reload and ignore retired edge choices and reject malformed shortcuts',()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let value='{}'
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>value,setItem:(_:string,v:string)=>{value=v}}})
 try{
  assert.equal(readPreferences().peekShortcut,'Alt+P')
  savePreferences({...defaultPreferences(),peekShortcut:'Ctrl+Shift+K'})
  assert.equal(readPreferences().peekShortcut,'Ctrl+Shift+K')
  value=JSON.stringify({peekShortcut:'Alt+T',peekEdge:'left'});assert.equal(readPreferences().peekShortcut,'Alt+P');assert.equal('peekEdge' in readPreferences(),false)
  for(const oldEdge of ['bottom','auto','right']){value=JSON.stringify({peekEdge:oldEdge});assert.equal('peekEdge' in readPreferences(),false)}
  value=JSON.stringify({peekShortcut:''});assert.equal(readPreferences().peekShortcut,'')
 }finally{if(old)Object.defineProperty(globalThis,'localStorage',old);else Reflect.deleteProperty(globalThis,'localStorage')}
})

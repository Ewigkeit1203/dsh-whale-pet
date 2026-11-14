import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'

const read=(name:string)=>readFileSync(new URL('../desktop/'+name,import.meta.url),'utf8')

/** A page with just enough DOM for desktop/shell.js and desktop/mount.js. */
function page(options:{react?:boolean,bundle?:boolean,register?:boolean,storage?:Record<string,string>}={}){
  const listeners=new Map<string,Function[]>(),sent:any[]=[],rendered:any[]=[],notes:string[]=[]
  const listen=(type:string,fn:Function)=>listeners.set(type,[...(listeners.get(type)??[]),fn])
  const html={dataset:{} as Record<string,string>},body={appendChild(node:any){notes.push(node.textContent)}},root={id:'root'}
  let under:any=body
  const React={createElement:(type:any,props:any)=>({type,props})}
  const frames:Function[]=[]
  const window:any={addEventListener:listen,requestAnimationFrame:(fn:Function)=>frames.push(fn),dispatchEvent(event:any){for(const fn of listeners.get(event.type)??[])fn(event)},
    whaleDesktop:{setInteractive:(v:boolean)=>sent.push(['interactive',v]),setFocus:(v:boolean)=>sent.push(['focus',v]),onCommand:(fn:Function)=>listen('command',fn)}}
  if(options.react!==false)window.__WhaleDesktopReact={React,createRoot:(node:any)=>({render:(element:any)=>rendered.push([node,element])})}
  const docEvents:string[]=[]
  const document:any={documentElement:html,body,getElementById:(id:string)=>id==='whale-desktop-root'?root:null,createElement:()=>({}),elementFromPoint:()=>under,addEventListener:listen,
    hasFocus:()=>false,hidden:false,dispatchEvent(event:any){docEvents.push(event.type)}}
  const store:Record<string,string>={...(options.storage??{})}
  const localStorage={getItem:(k:string)=>k in store?store[k]:null,setItem:(k:string,v:string)=>{store[k]=String(v)}}
  const context:any={window,document,localStorage,Event:class{type:string;constructor(type:string){this.type=type}},console}
  vm.createContext(context)
  vm.runInContext(read('shell.js'),context)
  const applied:any[]=[]
  if(options.bundle!==false)window.__ModuleLoader__.load({id:'dsh-whale-pet',factory(require:any){assert.equal(require('react'),React);assert.throws(()=>require('fs'));return{apply(ctx:any){applied.push(ctx);ctx.effect(()=>()=>{});ctx.inject(['remote'],()=>{throw Error('no DSH services on the desktop')});if(options.register!==false)ctx.slots.inject('shell.overlay',()=>ctx.slots.register({id:'dsh-whale-pet'},()=>'pet'))}}}})
  vm.runInContext(read('mount.js'),context)
  const fire=(type:string,event:any={})=>{for(const fn of listeners.get(type)??[])fn(event);if(type==='mousemove')for(const fn of frames.splice(0))fn()}
  return{window,document,docEvents,store,frames,listeners,html,root,body,sent,rendered,notes,applied,fire,point(element:any){under=element}}
}

test('Desktop companion: the shell lends React to the bundle and mounts what it registers in shell.overlay',()=>{
  const p=page()
  assert.equal(p.applied.length,1);assert.equal(p.html.dataset.whaleDesktop,'true')
  assert.equal(p.rendered.length,1);assert.equal(p.rendered[0][0],p.root)
  assert.equal(p.rendered[0][1].type(),'pet','the overlay component renders what the plugin registered')
  assert.deepEqual(p.notes,[])
  // Another module asking for the loader is ignored.
  p.window.__ModuleLoader__.load({id:'something-else',factory(){throw Error('must not run')}})
})

test('Desktop companion: says what is missing instead of showing an empty window',()=>{
  for(const [options,word] of [[{react:false},'react.js'],[{bundle:false},'client.js'],[{register:false},'shell.overlay']] as const){
    const p=page(options)
    assert.equal(p.rendered.length,0);assert.equal(p.notes.length,1);assert.ok(p.notes[0].includes(word),p.notes[0])
    assert.deepEqual(p.sent.at(-1),['interactive',true],'the note itself can be read and clicked')
  }
})

test('Desktop companion: the window is click-through except on her, holds the mouse through a drag, and takes focus only for typing',()=>{
  const p=page(),her={closest:()=>null},field={closest:(selector:string)=>selector.includes('input')?field:null}
  p.fire('mousemove',{clientX:5,clientY:5});assert.deepEqual(p.sent,[],'empty desktop: nothing to change')
  p.point(her);p.fire('mousemove',{clientX:5,clientY:5});assert.deepEqual(p.sent,[['interactive',true]])
  p.fire('mousemove',{clientX:6,clientY:6});assert.equal(p.sent.length,1,'no repeated messages')
  // Drag: the pointer may leave her hull while she is carried.
  p.fire('pointerdown',{target:her});p.point(p.body);p.fire('mousemove',{clientX:300,clientY:300});assert.equal(p.sent.length,1,'still hers while pressed')
  p.fire('pointerup',{clientX:300,clientY:300});assert.deepEqual(p.sent.at(-1),['interactive',false])
  p.point(p.root);p.fire('mousemove',{clientX:1,clientY:1});assert.deepEqual(p.sent.at(-1),['interactive',false],'her full-screen root does not count')
  // Focus only when a field is clicked, and it is given back on the next click elsewhere.
  p.point(field);p.fire('mousemove',{clientX:1,clientY:1});p.fire('pointerdown',{target:field});assert.deepEqual(p.sent.at(-1),['focus',true])
  p.fire('pointerup',{clientX:1,clientY:1});p.fire('pointerdown',{target:her});assert.deepEqual(p.sent.at(-1),['focus',false])
  // Tray → settings.
  let opened=0;p.window.addEventListener('dsh-whale-pet:open-settings',()=>opened++);p.fire('command','settings');assert.equal(opened,1)
})

test('Desktop companion: the main process keeps the window transparent, on top, click-through and sandboxed',()=>{
  const main=read('main.cjs'),preload=read('preload.cjs'),html=read('index.html')
  for(const needle of ['transparent: true','frame: false','skipTaskbar: true','setAlwaysOnTop(true','setIgnoreMouseEvents(true, { forward: true })','contextIsolation: true','nodeIntegration: false','sandbox: true','requestSingleInstanceLock','setWindowOpenHandler'])assert.ok(main.includes(needle),needle)
  assert.ok(!/nodeIntegration:\s*true|webSecurity:\s*false/.test(main))
  assert.deepEqual([...preload.matchAll(/^\s+(\w+): /gm)].map(m=>m[1]),['setInteractive','setFocus','onCommand','onLink'],'the bridge exposes nothing else')
  assert.ok(html.indexOf('vendor/react.js')<html.indexOf('shell.js')&&html.indexOf('shell.js')<html.indexOf('../lib/client.js')&&html.indexOf('../lib/client.js')<html.indexOf('mount.js'),'load order')
  assert.ok(/background:\s*transparent/.test(html))
})

test('Desktop companion: she counts as "in front" while her window is shown, and every frame stops while it is hidden',()=>{
  const p=page()
  assert.equal(p.document.hasFocus(),true,'never focused, yet not in the background: no frozen animations, no 15 fps')
  assert.equal(p.document.hidden,false);assert.equal(p.document.visibilityState,'visible')
  p.fire('command','hidden')
  assert.equal(p.document.hasFocus(),false);assert.equal(p.document.hidden,true);assert.equal(p.document.visibilityState,'hidden')
  assert.deepEqual(p.docEvents,['visibilitychange'])
  p.fire('command','hidden');assert.equal(p.docEvents.length,1,'no repeated events')
  p.fire('command','shown');assert.equal(p.document.hidden,false);assert.deepEqual(p.docEvents,['visibilitychange','visibilitychange'])
})

test('Desktop companion: power saving is on by default, but a choice the user made is kept',()=>{
  const key='dsh-whale-pet.preferences.v1'
  assert.equal(JSON.parse(page().store[key]).powerSave,true)
  const kept=page({storage:{[key]:JSON.stringify({powerSave:false,petName:'小鲸'})}})
  assert.deepEqual(JSON.parse(kept.store[key]),{powerSave:false,petName:'小鲸'})
  const filled=page({storage:{[key]:JSON.stringify({petName:'小鲸'})}})
  assert.deepEqual(JSON.parse(filled.store[key]),{petName:'小鲸',powerSave:true})
})

test('Desktop companion: a burst of mouse moves costs one hit test per frame',()=>{
  const p=page(),her={closest:()=>null}
  let tests=0;const original=p.document.elementFromPoint;p.document.elementFromPoint=(...a:any[])=>{tests++;return original(...a)}
  const move=p.listeners.get('mousemove')![0]
  p.point(her);for(let i=0;i<50;i++)move({clientX:i,clientY:i})
  assert.equal(p.frames.length,1);assert.equal(tests,0)
  p.frames.splice(0)[0]();assert.equal(tests,1);assert.deepEqual(p.sent,[['interactive',true]])
})

test('Desktop companion: no background blur over the transparent window; diagnostics in the tray',()=>{
  const html=read('index.html'),main=read('main.cjs')
  assert.ok(/html\[data-whale-desktop\][^{]*\{[^}]*backdrop-filter:\s*none !important/.test(html))
  assert.ok(main.includes("openDevTools({ mode: 'detach' })")&&main.includes("chrome://gpu"))
  assert.ok(main.includes("'shown'")&&main.includes("'hidden'"),'the page is told when she is shown or hidden')
  // Load and first show can come in either order: the page is told the intent, not isVisible() at that moment.
  const loaded=main.slice(main.indexOf("'did-finish-load'"),main.indexOf("'did-finish-load'")+300)
  assert.match(loaded,/wanted \? 'shown' : 'hidden'/);assert.ok(!loaded.includes('isVisible'))
  // A system quit (Windows shutdown, log-off) must close the window, not hide it.
  assert.match(main,/app\.on\('before-quit', \(\) => \{ quitting = true \}\)/)
})

test('Desktop companion: the click-to-run package carries exactly the runtime files, never a model or the dev launchers',()=>{
  const script=readFileSync(new URL('../scripts/package-desktop.mjs',import.meta.url),'utf8')
  const list=script.slice(script.indexOf('const files = ['),script.indexOf(']',script.indexOf('const files = ['))+1)
  const files=[...list.matchAll(/'([^']+)'/g)].map(m=>m[1])
  assert.deepEqual(files.sort(),['desktop/index.html','desktop/link-server.cjs','desktop/main.cjs','desktop/mount.js','desktop/preload.cjs','desktop/shell.js','desktop/vendor/react.js','lib/client.js'])
  assert.ok(!/launch\.cjs|\.vbs|moc3|model3/.test(list))
  assert.match(script,/main: 'desktop\/main\.cjs'/)
  // The release attaches it as a separate download and checks it holds no model.
  const release=readFileSync(new URL('../.github/workflows/release.yml',import.meta.url),'utf8')
  assert.ok(release.includes('pnpm run package:desktop')&&release.includes('dsh-whale-pet-desktop-$tag-win-x64.zip')&&release.includes("'*.moc3'"))
})

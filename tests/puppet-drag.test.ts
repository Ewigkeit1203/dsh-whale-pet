import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {CarryController} from '../lib/client/carry.js'

test('Carry view re-grabs within one render batch without jumping or adding RAF/listeners',()=>{
  let now=0,next=0,ref:any
  const frames=new Map<number,(t:number)=>void>(),listeners=new Map<string,(e:any)=>void>()
  let effects:Array<()=>any>=[]
  const scope={CarryController,React:{},performance:{now:()=>now},
    useRef(value:any){return ref??=( {current:value} )},useEffect(callback:()=>any){effects.push(callback)},
    window:{addEventListener(name:string,callback:any){assert.ok(!listeners.has(name));listeners.set(name,callback)},removeEventListener(name:string){listeners.delete(name)}},
    requestAnimationFrame(callback:(t:number)=>void){const id=++next;frames.set(id,callback);return id},cancelAnimationFrame(id:number){frames.delete(id)}}
  const code=readFileSync(new URL('../lib/client/LivingPuppet.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'')
  const hook=vm.runInNewContext(code+'\n;useDangle',scope)
  const style:any={},root={current:{style,dataset:{},parentElement:{getBoundingClientRect:()=>({left:10,top:20,width:300,height:600})},getBoundingClientRect(){throw new Error('must use the unrotated parent')}}}
  const poses:number[][]=[]
  const stage={current:{setDangle(){},setCarryPose(s:number,l:number){poses.push([s,l])}}}
  const render=(held:{x:number;y:number}|null,motion=1)=>{effects=[];hook(root,held,motion,stage,undefined,true);effects[0]();return effects[1]()}
  const tick=()=>{now+=1000/60;const[id,callback]=frames.entries().next().value!;frames.delete(id);callback(now)}
  const point=(x:number,y:number)=>{
    const [ox,oy]=style.transformOrigin.split(' ').map(parseFloat),[tx,ty]=style.translate.split(' ').map(parseFloat)
    const a=parseFloat(style.rotate||'0')*Math.PI/180,[sx,sy]=(style.scale||'1 1').split(' ').map(Number)
    return {x:ox+Math.cos(a)*sx*(x-ox)-Math.sin(a)*sy*(y-oy)+tx,y:oy+Math.sin(a)*sx*(x-ox)+Math.cos(a)*sy*(y-oy)+ty}
  }
  render({x:120,y:100})
  for(let i=0;i<15;i++){listeners.get('pointermove')!({clientX:120+i*12,clientY:100});tick()}
  const before=point(400,700)
  // React may batch release(null) and the next grab into just this new object; she keeps hanging
  // from her collar (CARRY.pivotY) and the rebase keeps every visible point where it was.
  render({x:250,y:150})
  const after=point(400,700)
  assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<0.1,'visible model remains continuous')
  assert.equal(frames.size,1);assert.equal(listeners.size,1)
  const cleanup=render(null)
  for(let i=0;i<1000&&frames.size;i++)tick()
  assert.equal(frames.size,0);assert.equal(listeners.size,0)
  assert.equal(style.rotate,'');assert.equal(style.translate,'');assert.equal(style.transformOrigin,'');assert.equal(style.scale,'')
  assert.ok(poses.some(([s])=>s>.8),'suspension envelope reaches the model')
  assert.ok(poses.some(([,l])=>l>.9),'touchdown envelope reaches the model')
  assert.deepEqual(poses[poses.length-1],[0,0],'model pose clears on settling')
  cleanup()
  const grab={x:120,y:100}
  render(grab);assert.equal(frames.size,1)
  render(grab,0);assert.equal(frames.size,0);assert.equal(listeners.size,0,'reduced motion stops immediately')
  const unmount=render({x:150,y:100});assert.equal(frames.size,1)
  unmount();assert.equal(frames.size,0);assert.equal(listeners.size,0,'unmount leaves no carry loop')
})

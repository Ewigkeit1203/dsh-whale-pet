import {PeekArmOrder, PeekElbow, PEEK_ELBOW, peekOrderWeight} from '../lib/client/peek-arm-order.js'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import * as motion from '../lib/client/live2d-motion.js'
import {LegPoseLayer} from '../lib/client/live2d-legs.js'

function runtimeModule(path: string, context: Record<string, unknown>) {
  const text = readFileSync(new URL(path, import.meta.url), 'utf8').replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
  const code = ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText.replace(/^export /gm, '').replace(/^export \{\};?$/gm, '')
  return vm.runInNewContext(code + '\n;({createLive2DStage: typeof createLive2DStage === "function" ? createLive2DStage : null, acquireLive2DStage: typeof acquireLive2DStage === "function" ? acquireLive2DStage : null})', {LegPoseLayer, PeekArmOrder, PeekElbow, PEEK_ELBOW, peekOrderWeight, ...context})
}

test('Cubism startup does not register a new wasm log callback; repeated stages share startup', async () => {
  let starts = 0
  const listeners = new Set()
  const target = {addEventListener: (_: string, f: unknown) => listeners.add(f), removeEventListener: (_: string, f: unknown) => listeners.delete(f)}
  const scope: any = {
    console, setTimeout, clearTimeout, performance, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    window: target, document: {...target, hidden: false},
    Live2DCubismCore: {Version: {csmGetVersion: () => 1}},
    CubismFramework: {startUp(...args: unknown[]) { starts++; assert.equal(args.length, 0, 'Core fixed callback table must not be touched') }, initialize() {}},
    CubismShader_WebGL: class {}, CubismUserModel: class {}, CubismMatrix44: class {}, SHADER_SOURCES: {}, ...motion,
  }
  const module = runtimeModule('../live2d/runtime.ts', scope)
  const canvas = {...target, getContext: () => ({getExtension: () => null}), clientWidth: 200, clientHeight: 400}
  for (let i=0; i<3; i++) {
    const stage = module.createLive2DStage(canvas, {modelPath:'test.model3.json', read: async () => null})
    await assert.rejects(stage.ready, /model-json/, 'startup reaches the model read, not a wasm callback error')
    stage.dispose()
  }
  assert.equal(starts, 1)
  assert.equal(listeners.size, 0, 'pointer listeners are removed when stages dispose')
})

test('Live2D leases reuse one canvas across mode switches and release it after the grace period', async () => {
  let creates=0, disposed=0, detached=0, active=false
  const timers = new Map<number, () => void>(); let timerId=0
  const canvas = {remove() {detached++}}
  const stage = {ready: Promise.resolve({aspect:.6}), isFailed:()=>false, setActive(v: boolean) {active=v}, dispose() {disposed++}, onHull:null, onFail:null}
  const scope: any = {console, document: {createElement:()=>canvas}, Live2DCubismCore:{Version:{csmGetVersion:()=>1}},
    __dshLoadCubismCore() {throw new Error('Core already started')}, __dshLoadLive2DRuntime:()=>({createLive2DStage() {creates++;return stage}}),
    setTimeout(f:()=>void) {const id=++timerId;timers.set(id,f);return id}, clearTimeout(id:number) {timers.delete(id)},
  }
  const module = runtimeModule('../src/client/live2d-loader.ts', scope)
  const source = {modelPath:'model.model3.json'}
  const first = await module.acquireLive2DStage(source)
  first.release(); assert.equal(active,false); assert.equal(detached,1, "released canvases leave the old view immediately")
  const second = await module.acquireLive2DStage(source)
  assert.equal(second.canvas,first.canvas); assert.equal(second.stage,first.stage)
  assert.equal(creates,1); assert.equal(active,true); assert.equal(timers.size,0)
  second.release(); second.release()
  assert.equal(timers.size,1,'release is idempotent')
  for(const f of timers.values()) f()
  await Promise.resolve()
  assert.equal(disposed,1)
  const third = await module.acquireLive2DStage(source)
  assert.equal(creates,2,'expired models are rebuilt')
  third.release()
})


test('Live2D cache rebuilds a lost graphics context rather than reviving it', async () => {
  let creates=0, disposed=0
  const stages:any[]=[]
  const timers=new Map<number,()=>void>(); let next=0
  const module=runtimeModule('../src/client/live2d-loader.ts', {console,
    document:{createElement:()=>({remove(){}})}, Live2DCubismCore:{Version:{csmGetVersion:()=>1}},
    __dshLoadCubismCore(){}, __dshLoadLive2DRuntime:()=>({createLive2DStage(){
      creates++; const stage={failed:false,ready:Promise.resolve({aspect:.6}),isFailed(){return this.failed},setActive(){},dispose(){disposed++},onHull:null,onFail:null};stages.push(stage);return stage
    }}), setTimeout(f:()=>void){const id=++next;timers.set(id,f);return id},clearTimeout(id:number){timers.delete(id)},
  })
  const source={modelPath:'test'}
  const first=await module.acquireLive2DStage(source);first.release()
  stages[0].failed=true // Context may be lost even while detached; there is no mounted UI callback.
  const second=await module.acquireLive2DStage(source)
  assert.equal(creates,2);assert.notEqual(first.stage,second.stage)
  assert.equal(disposed,1,'broken GPU resources are released')
  second.release()
  for(const f of timers.values())f()
  await Promise.resolve()
})

test('Live2D stages stop requesting frames while hidden or cached and resume exactly once', async () => {
  let next=0; const frames=new Map<number,(t:number)=>void>()
  const events=new Map<string,()=>void>()
  const target={addEventListener(name:string,f:()=>void){events.set(name,f)},removeEventListener(name:string){events.delete(name)}}
  const core={update(){},getDrawableCount:()=>0,getPartParentPartIndices:()=>[],getPartIndex:()=>-1}
  const renderer={setClippingMaskBufferSize(){},startUp(){},setIsPremultipliedAlpha(){},bindTexture(){},loadShaders(){}}
  class Model{_model=core;loadModel(){};createRenderer(){};getRenderer(){return renderer};release(){}}
  class Setting{getModelFileName(){return 'test.moc3'};getPhysicsFileName(){return ''};getEyeBlinkParameterCount(){return 0};getTextureCount(){return 0}}
  const doc={...target,hidden:false}
  const module=runtimeModule('../live2d/runtime.ts', {console,performance,...motion,
    setTimeout,clearTimeout,window:target,document:doc,
    requestAnimationFrame(f:(t:number)=>void){const id=++next;frames.set(id,f);return id},cancelAnimationFrame(id:number){frames.delete(id)},
    Live2DCubismCore:{Version:{csmGetVersion:()=>1}},
    CubismFramework:{startUp(){},initialize(){},getIdManager:()=>({getId:(s:string)=>s})},
    CubismShader_WebGL:class{},CubismUserModel:Model,CubismModelSettingJson:Setting,CubismMatrix44:class{},SHADER_SOURCES:{},
  })
  const stage=module.createLive2DStage({...target,clientWidth:200,clientHeight:400,getContext:()=>({getExtension:()=>null})},
    {modelPath:'test.model3.json',read:async()=>new ArrayBuffer(8),expressions:{}})
  await stage.ready
  assert.equal(frames.size,1)
  stage.setActive(false);assert.equal(frames.size,0,'no empty callbacks while cached')
  stage.setActive(true);stage.setActive(true);assert.equal(frames.size,1,'resume does not duplicate loops')
  doc.hidden=true;events.get('visibilitychange')!();assert.equal(frames.size,0)
  doc.hidden=false;events.get('visibilitychange')!();assert.equal(frames.size,1)
  stage.dispose();assert.equal(frames.size,0)
})


test('Runtime keeps three minutes of quiet desktop performances at the ambient budget; carrying can still accelerate', async () => {
  let now = 0, next = 0, draws = 0, simulated = 0, performances = 0
  const frames = new Map<number, (t:number)=>void>()
  const target = {addEventListener(){}, removeEventListener(){}}
  const parameterIds: string[] = [], values = new Map<number,number>()
  const value = (id:string) => values.get(parameterIds.indexOf(id)) ?? 0
  const core = {update(){}, getDrawableCount:()=>0, getPartParentPartIndices:()=>[], getPartIndex:()=>-1, getDrawableIndex:()=>-1,
    getParameterIndex(id:string){if(!parameterIds.includes(id))parameterIds.push(id);return parameterIds.indexOf(id)},
    getParameterCount:()=>100, getParameterDefaultValue:()=>0, getParameterMinimumValue:()=>-1, getParameterMaximumValue:()=>1,
    setParameterValueByIndex(index:number,v:number,w=1){values.set(index,(values.get(index)??0)*(1-w)+v*w)},
    multiplyParameterValueByIndex(){}, loadParameters(){values.clear()}, saveParameters(){}}
  const renderer = {setClippingMaskBufferSize(){}, startUp(){}, setIsPremultipliedAlpha(){}, bindTexture(){}, loadShaders(){},
    setMvpMatrix(){}, setRenderState(target:unknown){assert.equal(target,null)}, drawModel(){draws++}}
  class Model {
    _model = core
    _motionManager = {updateMotion(_core:unknown, dt:number){simulated += dt}}
    loadModel(){}; createRenderer(){}; getRenderer(){return renderer}; release(){}
  }
  class Driver extends motion.Live2DDriver {
    constructor(){super(5)}
    update(input:motion.Live2DDriveInput){const d = super.update(input); if(d.performance) performances++; return d}
  }
  class Setting {getModelFileName(){return 'test.moc3'}; getPhysicsFileName(){return ''}; getEyeBlinkParameterCount(){return 0}; getTextureCount(){return 0}}
  const module = runtimeModule('../live2d/runtime.ts', {console, ...motion, Live2DDriver:Driver, performance:{now:()=>now},
    setTimeout, clearTimeout, window:target, document:{...target, hidden:false, hasFocus:()=>true},
    requestAnimationFrame(f:(t:number)=>void){const id=++next;frames.set(id,f);return id}, cancelAnimationFrame(id:number){frames.delete(id)},
    Live2DCubismCore:{Version:{csmGetVersion:()=>1}}, CubismFramework:{startUp(){}, initialize(){}, getIdManager:()=>({getId:(s:string)=>s})},
    CubismShader_WebGL:class{}, CubismUserModel:Model, CubismModelSettingJson:Setting,
    CubismMatrix44:class {getArray(){return new Float32Array(16)}}, SHADER_SOURCES:{},
  })
  const stage = module.createLive2DStage({...target, clientWidth:200, clientHeight:400,
    getContext:()=>({getExtension:()=>null, viewport(){}, clearColor(){}, clear(){}})},
    {modelPath:'test.model3.json', read:async()=>new ArrayBuffer(8), expressions:{}})
  await stage.ready
  stage.setLook({idle:true})
  const advance = (seconds:number) => {
    const start = now
    for(let i=1;i<=144*seconds;i++) {
      now = start + i*1000/144
      const [id, callback] = frames.entries().next().value!
      frames.delete(id); callback(now)
      assert.equal(frames.size,1,'exactly one scheduled loop throughout playback')
    }
  }
  for(let minute=0;minute<3;minute++) {
    const before = draws; advance(60)
    assert.ok(Math.abs(draws-before-1800)<=1, `minute ${minute+1}: ${draws-before} desktop frames`)
  }
  assert.ok(performances>100,'long idle performances really ran')
  assert.ok(Math.abs(simulated-180)<0.04,`physics advanced ${simulated} s`)
  const before = draws
  stage.setLook({held:true}); advance(2)
  assert.ok(draws-before>=118 && draws-before<=120,'short carrying animation still gets 60 fps')
  assert.ok(value('Param62')>0.3 && value('Param36')>0.3,'both paws up while she struggles')
  assert.ok(value('Param60')>0.5 && value('Param41')>0.5,'both forearms use the calibrated short outward route')
  assert.ok(Math.abs(value('PositionY'))<1,'no hip pumping to move the arms')
  stage.setLook({guardChest:true}); advance(2)
  assert.ok(value('Movement2')>0.99 && value('Param56')>0.99,'native covering hand is enabled')
  assert.ok(Math.abs(value('Param36'))<0.01 && Math.abs(value('Param41'))<0.01 && Math.abs(value('Param42'))<0.01,'the other arm is left alone')
  stage.setLook({}); advance(3)
  assert.equal(value('Movement2'),0,'no stale covering switch after the reaction')
  stage.setLook({edgePeek:true});advance(3)
  assert.ok(Math.abs(value('Param62')-PEEK_ELBOW.upper)<.01 && Math.abs(value('Param60')-PEEK_ELBOW.forearm)<.01,'upper arm nearly straight, bend only at the elbow')
  assert.ok(Math.abs(value('Param36'))<.01 && Math.abs(value('Param41'))<.01,'other arm stays at rest')
  assert.equal(value('LHand'),0,'fingers remain native rather than hidden by forced parameters')
  stage.setLook({idle:true});advance(3)
  assert.ok(Math.abs(value('Param60'))<.01 && Math.abs(value('Param41'))<.01,'return clears only the temporary native arm targets')
  stage.dispose(); assert.equal(frames.size,0)
})


test('Hit regions respect covering hands and cache bounds only until the next model frame', async () => {
  let now=0, raf:((t:number)=>void)|null=null, reads=0
  const target={addEventListener(){},removeEventListener(){}}
  const opacity=[1,1,1],orders=new Int32Array([2,3,1])
  const vertices=[0,1,2].map(()=>new Proxy([-1,-1,1,-1,0,1],{get(array,key){if(typeof key==='string'&&/^\d+$/.test(key))reads++;return Reflect.get(array,key)}}))
  const core={update(){},loadParameters(){},saveParameters(){},getDrawableCount:()=>3,
    getPartParentPartIndices:()=>[-1,-1,-1],getPartIndex:(id:string)=>['Part88','Part127','Part136'].indexOf(id),getDrawableParentPartIndex:(d:number)=>d,
    getDrawableDynamicFlagIsVisible:()=>true,getDrawableOpacity:(d:number)=>opacity[d],getDrawableBlendMode:()=>0,
    getDrawableVertices:(d:number)=>vertices[d],getDrawableVertexUvs:()=>[0,0,1,0,.5,1],getDrawableVertexIndices:()=>[0,1,2],getDrawableTextureIndex:()=>0,
    getDrawableMasks:()=>[[],[],[]],getDrawableMaskCounts:()=>[0,0,0],getRenderOrders:()=>orders,getParameterIndex:()=>-1,getParameterCount:()=>0}
  const renderer={setClippingMaskBufferSize(){},startUp(){},setIsPremultipliedAlpha(){},loadShaders(){},setMvpMatrix(){},setRenderState(){},drawModel(){}}
  class Model {_model=core;_motionManager={updateMotion(){}};loadModel(){};createRenderer(){};getRenderer(){return renderer};release(){}}
  class Setting {getModelFileName(){return 'm'};getPhysicsFileName(){return ''};getEyeBlinkParameterCount(){return 0};getTextureCount(){return 0}}
  const module=runtimeModule('../live2d/runtime.ts',{console,...motion,performance:{now:()=>now},setTimeout,clearTimeout,window:target,document:{...target,hidden:false,hasFocus:()=>true},
    requestAnimationFrame(f:(t:number)=>void){raf=f;return 1},cancelAnimationFrame(){raf=null},
    Live2DCubismCore:{Version:{csmGetVersion:()=>1}},CubismFramework:{startUp(){},initialize(){},getIdManager:()=>({getId:(s:string)=>s})},
    CubismShader_WebGL:class{},CubismUserModel:Model,CubismModelSettingJson:Setting,CubismMatrix44:class{getArray(){return new Float32Array(16)}},SHADER_SOURCES:{}})
  const stage=module.createLive2DStage({...target,clientWidth:200,clientHeight:200,getBoundingClientRect:()=>({left:0,top:0,width:200,height:200}),
    getContext:()=>({getExtension:()=>null,viewport(){},clearColor(){},clear(){}})}, {modelPath:'m',read:async()=>new ArrayBuffer(1),expressions:{}})
  await stage.ready
  now=34;raf!(now)
  assert.equal(stage.regionAt(100,100),'body','an opaque hand covers the chest')
  opacity[1]=0
  assert.equal(stage.regionAt(100,100),'chest','only the visible chest can be touched')
  const before=reads
  assert.equal(stage.regionAt(900,100),null)
  const bounded=reads
  assert.equal(stage.regionAt(900,100),null)
  assert.equal(reads,bounded,'second hover in the same frame reuses bounds')
  assert.ok(bounded>=before)
  now=68;raf!(now);stage.regionAt(900,100)
  assert.ok(reads>bounded,'a new model frame invalidates cached geometry')
  opacity[1]=1;orders[0]=5
  assert.equal(stage.regionAt(100,100),'chest','changed draw order invalidates hit priority')
  stage.dispose();assert.equal(raf,null)
})


test('Runtime poses leg meshes, updates their masks and plants soles while the body absorbs landing',async()=>{
  let now=0,raf:((t:number)=>void)|null=null,projection:number[]=[]
  const target={addEventListener(){},removeEventListener(){}}
  const vertices=[new Float32Array([-.1,0,-.1,-.58,-.1,-.9,-.1,-1]),new Float32Array([.1,0,.1,-.58,.1,-.9,.1,-1]),new Float32Array([-.3,1,.3,1,.3,0])]
  const baseline=vertices.map(v=>v.slice()),flags=new Uint8Array(3)
  const core={update(){flags.fill(1)},loadParameters(){},saveParameters(){},getDrawableCount:()=>3,
    getPartParentPartIndices:()=>[-1,-1,-1],getPartIndex:(id:string)=>['Part18','Part30','Part85'].indexOf(id),getDrawableParentPartIndex:(d:number)=>d,
    getDrawableDynamicFlagIsVisible:()=>true,getDrawableOpacity:()=>1,getDrawableVertices:(d:number)=>vertices[d],getDrawableMasks:()=>[[],[],[]],getDrawableMaskCounts:()=>[0,0,0],
    getParameterIndex:()=>-1,getParameterCount:()=>0,getModel:()=>({drawables:{dynamicFlags:flags}})}
  const renderer={setClippingMaskBufferSize(){},startUp(){},setIsPremultipliedAlpha(){},loadShaders(){},
    setMvpMatrix(m:any){projection=Array.from(m.getArray())},setRenderState(){},drawModel(){}}
  class Model {_model=core;_motionManager={updateMotion(){}};loadModel(){};createRenderer(){};getRenderer(){return renderer};release(){}}
  class Setting {getModelFileName(){return 'm'};getPhysicsFileName(){return ''};getEyeBlinkParameterCount(){return 0};getTextureCount(){return 0}}
  const module=runtimeModule('../live2d/runtime.ts',{console,...motion,performance:{now:()=>now},setTimeout,clearTimeout,window:target,document:{...target,hidden:false,hasFocus:()=>true},
    requestAnimationFrame(f:(t:number)=>void){raf=f;return 1},cancelAnimationFrame(){raf=null},
    Live2DCubismCore:{Version:{csmGetVersion:()=>1}},CubismFramework:{startUp(){},initialize(){},getIdManager:()=>({getId:(s:string)=>s})},
    CubismShader_WebGL:class{},CubismUserModel:Model,CubismModelSettingJson:Setting,CubismMatrix44:class{a=new Float32Array(16);getArray(){return this.a}},SHADER_SOURCES:{}})
  const stage=module.createLive2DStage({...target,clientWidth:300,clientHeight:600,
    getContext:()=>({getExtension:()=>null,viewport(){},clearColor(){},clear(){}})}, {modelPath:'m',read:async()=>new ArrayBuffer(1),expressions:{}})
  await stage.ready
  const frame=()=>{now+=34;raf!(now)}
  frame();const floor=vertices[0][7]*projection[5]+projection[13]
  stage.setCarryPose(1,0);frame()
  assert.ok(vertices[0][2]>baseline[0][2]&&vertices[1][2]<baseline[1][2],'knees narrow')
  assert.ok((flags[0]&32)&&(flags[1]&32),'leg clipping masks are marked dirty after Core updates')
  stage.setCarryPose(0,1);frame()
  for(const v of vertices.slice(0,2))assert.ok(Math.abs(v[7]*projection[5]+projection[13]-floor)<1e-6,'sole stays on the same ground line')
  assert.ok(vertices[2][1]*projection[5]+projection[13]<1,'body moves down into the cushion')
  stage.setCarryPose(0,0);frame()
  vertices.forEach((v,i)=>assert.deepEqual(v,baseline[i]))
  frame();assert.equal(flags[0]&32,0,'idle adds no mask refresh work')
  stage.setCarryPose(1,0);frame()
  stage.setActive(false);stage.setActive(true);frame()
  vertices.forEach((v,i)=>assert.deepEqual(v,baseline[i],'cached stages clear old leg poses on reuse'))
  stage.setCarryPose(1,0);frame();stage.dispose()
  vertices.forEach((v,i)=>assert.deepEqual(v,baseline[i],'disposing restores Core-owned geometry'))
})

test('Frame budget: heavy physics in the background does not leave her stuck at a low rate; power saving caps the rate', async () => {
  let now = 0, next = 0, draws = 0, spent = 0, focused = false
  const frames = new Map<number, (t:number)=>void>()
  const listeners: Record<string, (() => void)[]> = {}
  const target = {addEventListener(type:string, f:()=>void){(listeners[type] ??= []).push(f)}, removeEventListener(){}}
  const parameterIds: string[] = []
  const core = {update(){}, getDrawableCount:()=>0, getPartParentPartIndices:()=>[], getPartIndex:()=>-1, getDrawableIndex:()=>-1,
    getParameterIndex(id:string){if(!parameterIds.includes(id))parameterIds.push(id);return parameterIds.indexOf(id)},
    getParameterCount:()=>100, getParameterDefaultValue:()=>0, getParameterMinimumValue:()=>-1, getParameterMaximumValue:()=>1,
    setParameterValueByIndex(){}, multiplyParameterValueByIndex(){}, loadParameters(){}, saveParameters(){}}
  const renderer = {setClippingMaskBufferSize(){}, startUp(){}, setIsPremultipliedAlpha(){}, bindTexture(){}, loadShaders(){},
    setMvpMatrix(){}, setRenderState(){}, drawModel(){draws++; spent += 2}}
  class Model {
    _model = core
    // A heavy model: 8 ms of physics per 60 Hz step, so a 15 fps frame costs four steps.
    _motionManager = {updateMotion(_core:unknown, dt:number){spent += dt * 60 * 8}}
    loadModel(){}; createRenderer(){}; getRenderer(){return renderer}; release(){}
  }
  class Setting {getModelFileName(){return 'test.moc3'}; getPhysicsFileName(){return ''}; getEyeBlinkParameterCount(){return 0}; getTextureCount(){return 0}}
  const module = runtimeModule('../live2d/runtime.ts', {console, ...motion, performance:{now:()=>now + spent},
    setTimeout, clearTimeout, window:target, document:{...target, hidden:false, hasFocus:()=>focused},
    requestAnimationFrame(f:(t:number)=>void){const id=++next;frames.set(id,f);return id}, cancelAnimationFrame(id:number){frames.delete(id)},
    Live2DCubismCore:{Version:{csmGetVersion:()=>1}}, CubismFramework:{startUp(){}, initialize(){}, getIdManager:()=>({getId:(s:string)=>s})},
    CubismShader_WebGL:class{}, CubismUserModel:Model, CubismModelSettingJson:Setting,
    CubismMatrix44:class {getArray(){return new Float32Array(16)}}, SHADER_SOURCES:{},
  })
  const stage = module.createLive2DStage({...target, clientWidth:200, clientHeight:400,
    getContext:()=>({getExtension:()=>null, viewport(){}, clearColor(){}, clear(){}})},
    {modelPath:'test.model3.json', read:async()=>new ArrayBuffer(8), expressions:{}})
  await stage.ready
  stage.setLook({})
  const advance = (seconds:number) => {
    const start = now, before = draws
    for(let i=1;i<=144*seconds;i++) { now = start + i*1000/144; const [id, callback] = frames.entries().next().value!; frames.delete(id); callback(now) }
    return (draws - before) / seconds
  }
  // Away in another app for a while: background rate.
  const away = advance(30)
  assert.ok(away <= 15.5, `background ${away} fps`)
  // Back in DSH: the ambient 30 fps again within a few seconds, not stuck at the background rate.
  focused = true; for (const f of listeners.focus ?? []) f()
  advance(3)
  const back = advance(10)
  assert.ok(back >= 29, `after returning ${back} fps`)
  // Power saving: idle 20 fps, never above 30, background 10.
  stage.setPowerSave(true)
  const saving = advance(10)
  assert.ok(saving <= 20.5 && saving >= 18, `power saving idle ${saving} fps`)
  focused = false
  const savingAway = advance(10)
  assert.ok(savingAway <= 10.5, `power saving background ${savingAway} fps`)
})

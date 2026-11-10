import {test} from 'node:test'
import assert from 'node:assert/strict'
import {CarryController,type CarryPose} from '../lib/client/carry.js'
import {CARRY} from '../lib/client/touch.js'
import {Live2DDriver,carryArmPose} from '../lib/client/live2d-motion.js'

const world=(pose:CarryPose,rect:{left:number;top:number},point:{x:number;y:number})=>{
  const a=pose.angle*Math.PI/180,x=(point.x-pose.pivotX)*pose.sx,y=(point.y-pose.pivotY)*pose.sy
  return {x:rect.left+pose.pivotX+Math.cos(a)*x-Math.sin(a)*y+pose.x,y:rect.top+pose.pivotY+Math.sin(a)*x+Math.cos(a)*y+pose.y}
}

test('Carrying lifts from the existing location without snapping the body down to a pointer',()=>{
  const controller=new CarryController(),width=320,height=600,pointer={x:700,y:200}
  const rect={left:540,top:100,width,height}
  controller.grab(0,rect,{...pointer,from:{x:rect.left,y:rect.top}})
  const phases=new Set<string>(),shadow:number[]=[]
  for(let i=1;i<=180;i++){const p=controller.tick(i*1000/60);phases.add(p.phase);shadow.push(p.shadowOpacity)}
  assert.ok(phases.has('grab')&&phases.has('struggle')&&phases.has('hang'))
  const p=controller.pose,collar=world(p,rect,{x:width/2,y:height*CARRY.pivotY})
  assert.ok(collar.y<rect.top+height*CARRY.pivotY-40,'collar moves up from its existing location, never down toward a belly click')
  assert.ok(p.lift>=40&&p.lift<=56,'feet visibly clear the baseline')
  assert.ok(p.shadowOpacity<0.1&&p.shadowScale<0.7,'ground cue fades and shrinks')
  const releaseLift=p.lift
  controller.release(3000)
  const falling={...controller.tick(3090)};assert.equal(falling.phase,'fall');assert.ok(Math.abs(falling.lift-releaseLift*0.75)<1e-8)
  const landed={...controller.tick(3290)};assert.equal(landed.phase,'land');assert.ok(landed.sy<0.94&&landed.sx>1.05)
  for(let now=3310;now<15000&&controller.active;now+=1000/60)controller.tick(now)
  assert.equal(controller.active,false);assert.equal(controller.pose.phase,'idle');assert.equal(controller.pose.lift,0)
})

test('Moving right leaves the feet trailing left around the fixed collar',()=>{
  const c=new CarryController(),width=320,height=600
  const rect={left:1000,top:100,width,height}
  c.grab(0,rect,{x:1300,y:100})
  for(let i=1;i<=60;i++){const now=i*1000/60;c.move(1300+i*10,100,now);c.tick(now)}
  assert.ok(c.pose.angle>0&&c.pose.angle<=25,'CSS clockwise makes the feet trail left')
  const collar=world(c.pose,rect,{x:width/2,y:height*CARRY.pivotY}),feet=world(c.pose,rect,{x:width/2,y:height})
  assert.ok(feet.x<collar.x)

})

test('Re-grabbing during a rotated/scaled drop preserves every visible point',()=>{
  const c=new CarryController(),old={left:300,top:200,width:320,height:600}
  c.grab(0,old,{x:460,y:290})
  for(let i=1;i<=9;i++){const now=i*1000/60;c.move(460+i*12,290,now);c.tick(now)}
  c.release(150);c.tick(180)
  const before={...c.pose},next={left:600,top:100,width:320,height:600}
  c.grab(180,next,{x:760,y:190,from:{x:old.left,y:old.top}})
  for(const point of [{x:0,y:0},{x:160,y:90},{x:320,y:600}]){
    const a=world(before,old,point),b=world(c.pose,next,point)
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-9)
  }
  assert.equal(c.pose.pivotX,160);assert.equal(c.pose.pivotY,90,'the local pivot remains on the collar')
  c.stop();assert.equal(c.active,false)
})

test('Arms take the short mirrored outward arc and retrace it on the way down',()=>{
  const raised=Array.from({length:101},(_,i)=>carryArmPose(i/100,0))
  let prev=raised[0]
  for(let i=0;i<=80;i++){
    const p=raised[i]
    for(const key of ['leftUpper','leftForearm','rightUpper','rightForearm']as const){assert.ok(p[key]>=0&&p[key]<=1);assert.ok(p[key]>=prev[key]-1e-9)}
    prev=p
  }
  for(let i=100;i>=0;i--)assert.deepEqual(carryArmPose(i/100,0),raised[i])
  assert.deepEqual(raised[0],{leftUpper:0,leftForearm:0,rightUpper:0,rightForearm:0})
  const d=new Live2DDriver(2)
  let peak=0
  for(let i=0;i<600;i++)peak=d.update({dt:1/60,motion:1,look:{held:true},pointer:null,talking:0}).armLift
  assert.ok(peak<0.001,'arms relax after a long hold')
  for(let i=0;i<120;i++){const v=d.update({dt:1/60,motion:1,look:{},pointer:null,talking:0}).armLift;assert.ok(v<=peak+1e-9,'release must not raise limp arms again');peak=v}
})


test('A new grab restarts the inner struggle even if no released frame reached the renderer',()=>{
  const driver=new Live2DDriver(4)
  let d
  for(let i=0;i<480;i++)d=driver.update({dt:1/60,motion:1,look:{held:true,heldKey:1},pointer:null,talking:0})
  assert.ok(d!.armLift<0.001)
  for(let i=0;i<60;i++)d=driver.update({dt:1/60,motion:1,look:{held:true,heldKey:2},pointer:null,talking:0})
  assert.ok(d!.armLift>0.99,'new pickup starts a fresh short struggle')
})


test('Live2D touchdown drives local knee cushioning without whole-image squash or foot translation',()=>{
  const c=new CarryController();c.setLegMode(true)
  c.grab(0,{left:300,top:100,width:320,height:600},{x:450,y:350})
  for(let i=1;i<=120;i++)c.tick(i*1000/60)
  assert.ok(c.pose.suspended>.99)
  c.release(2000);c.tick(2290)
  assert.equal(c.pose.phase,'land');assert.ok(c.pose.landing>.99);assert.equal(c.pose.angle,0,'the feet stop swinging once they touch down')
  assert.equal(c.pose.sx,1);assert.equal(c.pose.sy,1);assert.equal(c.pose.y,0)
  c.stop();assert.equal(c.pose.suspended,0);assert.equal(c.pose.landing,0)
})


test('Local leg landing does not stack the old whole-body jump on top',()=>{
  const driver=new Live2DDriver(8),control=new Live2DDriver(8)
  const input={dt:1/60,motion:1,look:{held:true},pointer:null,talking:0}
  for(let i=0;i<120;i++){driver.update({...input,landingHandled:true});control.update({...input,landingHandled:true})}
  for(let i=0;i<60;i++){
    const a=driver.update({...input,look:{},landingHandled:true})
    const b=control.update({...input,look:{},landingHandled:false})
    if(i===15)assert.ok(a.PositionY>b.PositionY+2,'legacy squash pulse is suppressed when knees own the landing')
  }
})

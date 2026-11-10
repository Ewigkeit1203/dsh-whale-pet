import {test} from 'node:test'
import assert from 'node:assert/strict'
import {LegPoseLayer,LEG_POSE} from '../lib/client/live2d-legs.js'

function rig(){
  const left=new Float32Array([-.1,1,-.1,LEG_POSE.hip,-.1,LEG_POSE.knee,-.1,LEG_POSE.ankle,-.1,0])
  const right=new Float32Array([.1,1,.1,LEG_POSE.hip,.1,LEG_POSE.knee,.1,LEG_POSE.ankle,.1,0])
  let changes=0
  const layer=new LegPoseLayer([{index:0,side:-1,vertices:left},{index:1,side:1,vertices:right}],()=>changes++)
  return{left,right,layer,changes:()=>changes}
}

test('Suspended legs bring the knees inward while the shins and feet separate slightly',()=>{
  const {left,right,layer}=rig();assert.equal(layer.apply(1,0),0)
  assert.ok(left[4]>-.1&&right[4]<.1,'knees draw together')
  assert.ok(left[6]<-.1&&right[6]>.1,'lower legs open outward')
  assert.ok(left[7]>LEG_POSE.ankle&&right[7]>LEG_POSE.ankle,'relaxed lower legs lift slightly')
  assert.equal(left[2],new Float32Array([-.1])[0],'hip attachment stays fixed')
})

test('Landing lowers the body while both soles remain planted, without a wide split',()=>{
  const {left,right,layer}=rig(),drop=layer.apply(0,1)
  assert.ok(drop>0)
  assert.ok(Math.abs(left[9]-drop)<1e-7&&Math.abs(right[9]-drop)<1e-7,'global body drop is cancelled at the soles')
  assert.equal(left[8],new Float32Array([-.1])[0]);assert.equal(right[8],new Float32Array([.1])[0])
  assert.ok(left[4]>-.1&&right[4]>.1,'both knees bend toward the same side rather than splaying')
  assert.ok(right[4]-left[4]<.2,'knee separation does not increase')
  assert.equal(left[3],new Float32Array([LEG_POSE.hip])[0],'upper attachment follows the global body drop')
})

test('Leg offsets restore exactly, do not accumulate and do no idle mesh work',()=>{
  const {left,right,layer,changes}=rig(),l=left.slice(),r=right.slice()
  layer.apply(1,0);const posed=left.slice();layer.apply(1,0);assert.deepEqual(left,posed)
  for(let i=0;i<500;i++){layer.restore();layer.apply(i%2,1-i%2)}
  layer.restore();assert.deepEqual(left,l);assert.deepEqual(right,r)
  layer.apply(0,0);const count=changes()
  for(let i=0;i<100;i++)layer.apply(0,0)
  assert.equal(changes(),count,'no per-frame mask rebuilds while idle')
  const empty=new LegPoseLayer([]);assert.equal(empty.apply(1,1),0)
})

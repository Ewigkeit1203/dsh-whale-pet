import {test} from 'node:test'
import assert from 'node:assert/strict'
import {PeekArmOrder, PeekElbow, PEEK_ELBOW, peekOrderWeight} from '../lib/client/peek-arm-order.js'
test('Native forearms and hands keep their internal order in front of the shirt; return restores the author ordering',()=>{
 const layer=new PeekArmOrder(6,[1,2]),orders=new Int32Array([2,0,1,3,5,4]),original=orders.slice()
 for(let i=0;i<100;i++){
  layer.apply(orders,1);assert.ok(orders[1]<orders[2] && orders[1]>orders[4]);assert.deepEqual([...orders].sort(),[0,1,2,3,4,5])
  layer.restore();assert.deepEqual(orders,original)
 }
 layer.apply(orders,0);assert.deepEqual(orders,original)
})

test('The reaching arm comes in front of hair and torso in one piece; the resting upper arm sits under its own sleeve', () => {
  const parts = ['Part81', 'Part127', 'Part128', 'Part129', 'Part130', 'Part131', 'Part89', 'Part94', 'Part68', 'Part93', 'Hair']
  const parents = [-1, 0, 1, 1, 2, 3, 0, 6, 6, 6, 0]
  const meshes = ['ArtMesh659', 'ArtMesh626', 'LeftForearm', 'RightForearm', 'LeftHand', 'RightHand', 'LeftSleeve', 'RightSleeve', 'ArtMesh495', 'Shirt', 'Hair']
  const meshParts = [3, 2, 3, 2, 5, 4, 7, 8, 9, 6, 10]
  const layer = PeekArmOrder.forModel({count: meshes.length, partParents: parents,
    partIndex: id => parts.indexOf(id), drawableIndex: id => meshes.indexOf(id), drawablePart: i => meshParts[i]})
  const orders = new Int32Array([1, 0, 3, 2, 4, 5, 6, 7, 9, 8, 10]), original = orders.slice()
  for (let i = 0; i < 100; i++) {
    layer.apply(orders, 1)
    // Reaching arm (screen-left): the upper arm, its sleeve and shoulder ruffle over its top end, then the
    // forearms and hands over its lower end ("E2"); all of it in front of the hair.
    assert.ok(orders[0] > orders[10], 'upper arm in front of the hair')
    assert.ok(orders[0] < orders[6] && orders[6] < orders[8], 'upper arm, then sleeve and ruffle over its top')
    for (const d of [2, 3, 4, 5]) assert.ok(orders[d] > orders[8], 'forearms and hands over the upper arm and its sleeve')
    // Resting arm: its upper arm right under its own sleeve, which keeps the author's place under the hair.
    assert.ok(orders[1] === orders[7] - 1 && orders[7] < orders[10], 'resting upper arm just under its sleeve')
    assert.deepEqual([...orders].sort((a,b) => a-b), Array.from({length:11}, (_,i) => i))
    layer.restore(); assert.deepEqual(orders, original)
  }
  layer.apply(orders, 1); layer.apply(orders, 0); assert.deepEqual(orders, original)
})

test('Peek elbow: the reaching forearm sits on the upper arm\'s lower end and is put back exactly before she leaves', () => {
  const parts = ['Part128', 'Part129', 'Fore'], parents = [-1, -1, 0]
  const meshes = ['ArtMesh659', 'Forearm', 'Hand', 'OtherArm', 'Body']
  const meshParts = [0, 2, 2, 1, -1]
  const verts = meshes.map((_, i) => new Float32Array([i, i + .5, i + 1, i + 1.5]))
  const original = verts.map(v => v.slice()), changed = new Set<number>()
  const elbow = PeekElbow.forModel({count: meshes.length, partParents: parents, partIndex: id => parts.indexOf(id),
    drawableIndex: id => meshes.indexOf(id), drawablePart: i => meshParts[i], vertices: i => verts[i]}, i => changed.add(i))
  assert.ok(elbow.available)
  elbow.apply(1)
  assert.deepEqual([...changed].sort(), [1, 2], 'only the reaching forearm and hand move, never the upper arm')
  assert.ok(Math.abs(verts[1][0] - original[1][0] - PEEK_ELBOW.x) < 1e-6 && Math.abs(verts[1][1] - original[1][1] - PEEK_ELBOW.y) < 1e-6, 'onto the upper arm\'s lower end')
  assert.deepEqual({ x: PEEK_ELBOW.x, y: PEEK_ELBOW.y }, { x: 0.0304, y: -0.025 }, 'the offset chosen with the owner (E2), measured on the model')
  for (const i of [0, 3, 4]) assert.deepEqual(verts[i], original[i])
  // Core rewrites vertices on update; restore() runs first so the offset never accumulates.
  for (let k = 0; k < 50; k++) { elbow.apply(.5); elbow.restore() }
  for (const i of [1, 2]) assert.deepEqual(verts[i], original[i], 'restored exactly')
  elbow.apply(0); for (const i of [1, 2]) assert.deepEqual(verts[i], original[i], 'weight 0 leaves the author mesh alone')
  assert.equal(PeekElbow.forModel({count: 1, partParents: [], partIndex: () => -1, drawableIndex: () => { throw new Error('not asked') }, drawablePart: () => -1, vertices: () => new Float32Array()}).available, false)
})

test('Coming back from the edge, the author\'s draw order returns at once (no hand popping from in front of the skirt to behind it)', () => {
  assert.equal(peekOrderWeight(true, 0.4), 0.4, 'going out: follows the arm')
  for (const w of [1, 0.6, 0.2, 0.02]) assert.equal(peekOrderWeight(false, w), 0, 'coming back: author order while the arm still eases home')
  const layer = new PeekArmOrder(6, [1, 2]), orders = new Int32Array([2, 0, 1, 3, 5, 4]), original = orders.slice()
  layer.apply(orders, peekOrderWeight(true, 1)); assert.notDeepEqual(orders, original)
  layer.apply(orders, peekOrderWeight(false, 0.9)); assert.deepEqual(orders, original)
})

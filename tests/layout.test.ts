import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LAYOUT, layoutGroup, placeGroupX, panelFloor, groupFits, type GroupInput } from '../lib/client/layout.js'
import { spriteGeometry } from '../lib/client/poses.js'

type Rect = { left: number; top: number; right: number; bottom: number }
const overlap = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

function check(name: string, input: GroupInput) {
  const out = layoutGroup(input)
  const vw = input.viewportWidth, vh = input.viewportHeight
  const pet = { left: out.pet.x, top: out.pet.y, right: out.pet.x + input.pet.width, bottom: out.pet.y + input.pet.height }
  const panelBottom = out.panel.y + Math.min(out.panel.maxHeight, Math.max(input.panelHeight, LAYOUT.minPanelHeight))
  const panel = { left: out.panel.x, top: out.panel.y, right: out.panel.x + out.panel.width, bottom: panelBottom }
  // Panel header and close button are always on screen; the body scrolls within maxHeight.
  assert.ok(panel.left >= LAYOUT.margin - 0.5 && panel.right <= vw - LAYOUT.margin + 0.5, `${name}: panel x inside viewport`)
  assert.ok(panel.top >= LAYOUT.margin && out.panel.y + out.panel.maxHeight <= vh - LAYOUT.margin + 0.5, `${name}: panel y inside viewport`)
  if (out.mode === 'tethered') {
    assert.ok(!overlap(pet, panel), `${name}: panel must not cover the pet`)
    const gap = out.side === 'left' ? pet.left - panel.right : panel.left - pet.right
    assert.ok(gap >= 12 && gap <= 20, `${name}: gap ${gap} within 12–20px`)
    assert.ok(pet.left >= LAYOUT.margin && pet.right <= vw - LAYOUT.margin, `${name}: pet on screen`)
    assert.ok(pet.top >= 0 && pet.bottom <= vh, `${name}: pet on screen vertically`)
  }
  return out
}

const sizes = [[1280, 720], [1920, 1080], [1024, 640], [1366, 768]]
for (const [vw, vh] of sizes) for (const scale of [0.5, 0.75, 1, 1.15, 1.3]) {
  test(`group stays separated at every edge and corner: ${vw}x${vh} @${scale}`, () => {
    const g = spriteGeometry('Maid', vh, scale)
    const w = g.stageWidth, h = g.stageHeight
    const spots: Record<string, [number, number]> = {
      'top-left': [-500, -500], 'top-right': [vw + 500, -500], 'bottom-left': [-500, vh + 500], 'bottom-right': [vw + 500, vh + 500],
      left: [-500, vh / 2], right: [vw + 500, vh / 2], top: [vw / 2, -500], bottom: [vw / 2, vh + 500], centre: [vw / 2 - w / 2, vh / 2 - h / 2],
    }
    for (const [name, [x, y]] of Object.entries(spots)) {
      for (const composerTop of [undefined, vh - 120]) {
        const out = check(`${name} composer=${composerTop}`, { viewportWidth: vw, viewportHeight: vh, composerTop, pet: { x, y, width: w, height: h }, panelHeight: 640 })
        assert.equal(out.mode, 'tethered', `${vw}x${vh} has room for the group`)
      }
    }
  })
}

test('narrow window switches to an explicit detached panel instead of overlapping silently', () => {
  const g = spriteGeometry('Maid', 700, 1)
  const out = check('narrow', { viewportWidth: 560, viewportHeight: 700, pet: { x: 200, y: 200, width: g.stageWidth, height: g.stageHeight }, panelHeight: 600 })
  assert.equal(out.mode, 'detached')
  assert.ok(out.panel.maxHeight >= 160)
})

test('short window above a tall composer also detaches but keeps the header reachable', () => {
  const out = check('short', { viewportWidth: 1280, viewportHeight: 420, composerTop: 200, pet: { x: 900, y: 120, width: 180, height: 280 }, panelHeight: 600 })
  assert.equal(panelFloor(420, 200), 420 - LAYOUT.margin, 'too little room above the composer: use the screen floor')
  assert.ok(out.panel.y >= LAYOUT.margin)
})

test('side choice has hysteresis: dragging across the middle never flips every frame', () => {
  const vw = 1280, width = 307
  let side = placeGroupX(900, width, vw, undefined).side
  assert.equal(side, 'left')
  const sides: string[] = []
  for (let x = 900; x >= 16; x -= 7) { const placed = placeGroupX(x, width, vw, side as any); side = placed.side; sides.push(side) }
  const flips = sides.filter((value, i) => i && value !== sides[i - 1]).length
  assert.equal(flips, 1, 'exactly one switch when the left side runs out of room')
})

test('dragging into a dead zone moves the pet to the closest spot where the group fits', () => {
  const vw = 900, width = 307
  assert.ok(groupFits(vw, 720, width))
  const placed = placeGroupX(250, width, vw, 'left')
  assert.ok(placed.fits)
  const [panelLeft, panelRight] = placed.side === 'left' ? [placed.x - 16 - 340, placed.x - 16] : [placed.x + width + 16, placed.x + width + 16 + 340]
  assert.ok(panelLeft >= 16 && panelRight <= vw - 16)
})

test('a docked (pinned) pet is never moved; the panel goes to the free side or detaches', () => {
  const g = spriteGeometry('Maid', 800, 1)
  const pet = { x: 1280 - g.stageWidth - 12, y: 800 - g.stageHeight * 0.52, width: g.stageWidth, height: g.stageHeight }
  const out = layoutGroup({ viewportWidth: 1280, viewportHeight: 800, pet, panelHeight: 600, petPinned: true })
  assert.equal(out.mode, 'tethered')
  assert.equal(out.side, 'left')
  assert.equal(out.pet.x, pet.x)
  assert.equal(out.pet.y, pet.y)
})

test('long English panels and large text only grow the scroll body, never push the header off screen', () => {
  for (const panelHeight of [300, 900, 4000]) check('tall content ' + panelHeight, { viewportWidth: 1280, viewportHeight: 720, composerTop: 600, pet: { x: 1000, y: 200, width: 307, height: 432 }, panelHeight })
})



test('wandering samples the full usable viewport, has visible travel and bounded random waits', async () => {
 const {wanderDestination,clampPet,nextWanderDelay}=await import('../lib/client/layout.js')
 for(const [vw,vh,w,h] of [[1280,800,340,480],[1920,1080,440,600],[600,500,280,300]]) {
  const from=clampPet(vw/2,vh/2,w,h,vw,vh)
  for(const rx of [0,.5,1]) for(const ry of [0,.5,1]) {
   const target=wanderDestination(from.x,from.y,w,h,vw,vh,rx,ry)!
   assert.deepEqual(clampPet(target.x,target.y,w,h,vw,vh),target)
   assert.ok(Math.hypot(target.x-from.x,target.y-from.y)>=80)
  }
  const low=wanderDestination(vw-w-16,vh-h-16,w,h,vw,vh,0,0)!
  const high=wanderDestination(16,90,w,h,vw,vh,1,1)!
  assert.ok(high.x>low.x && high.y>low.y,'all corners are reachable')
 }
 assert.equal(wanderDestination(16,16,400,300,420,320,0,0),null)
 assert.equal(nextWanderDelay(0),8000);assert.equal(nextWanderDelay(1),20000)
 assert.ok(nextWanderDelay(.2)!==nextWanderDelay(.8))
})

test('settings keep a readable bounded height through window/fullscreen changes and content changes',()=>{
 for(const [width,height,composerTop] of [[1280,820,422],[1920,1080,560],[1024,640,400]]) {
  for(const content of [0,300,900,4000]) {
   const out=layoutGroup({viewportWidth:width,viewportHeight:height,composerTop,pet:{x:width-360,y:height-500,width:307,height:480},panelHeight:content})
   assert.equal(out.panel.height,Math.min(640,height-32))
   assert.ok(out.panel.y>=16 && out.panel.y+out.panel.height<=height-16)
   assert.equal(out.panel.maxHeight,out.panel.height)
  }
 }
 const detached=layoutGroup({viewportWidth:500,viewportHeight:1080,pet:{x:16,y:400,width:307,height:480},panelHeight:2000})
 assert.equal(detached.mode,'detached');assert.ok(detached.panel.y>100,'independent sheet is vertically centred')
})

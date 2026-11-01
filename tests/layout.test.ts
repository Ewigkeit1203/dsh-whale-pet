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


test('wandering destinations have visible travel, remain in bounds and handle tiny viewports', async () => {
  const { wanderDestination, clampPet } = await import('../lib/client/layout.js')
  for (const [vw, vh, w, h] of [[1280,800,340,480], [1920,1080,440,600], [600,500,280,300]]) {
    for (const x of [16, vw / 2, vw - w - 16]) for (const random of [0,0.5,1]) {
      const from = clampPet(x,100,w,h,vw,vh)
      const to = wanderDestination(from.x,from.y,w,h,vw,vh,random)!
      assert.ok(Math.abs(to.x-from.x) >= Math.min(100,(vw-w-32)/2))
      assert.deepEqual(clampPet(to.x,to.y,w,h,vw,vh),to)
      assert.equal(to.y,from.y)
    }
  }
  assert.equal(wanderDestination(16,90,400,300,420,500,0),null)
})

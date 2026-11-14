interface PeekArmModel {
  count: number
  partParents: ArrayLike<number>
  partIndex(id: string): number
  drawableIndex(id: string): number
  drawablePart(index: number): number
}

/** An upper arm and the meshes that must stay over its top end, in draw order (upper arm first). */
export interface PeekArmLift { drawable: number; under: readonly number[] }
/** How a lift is placed: just under its sleeve (in place), or with its sleeve in front of the hair (reaching arm). */
export type PeekLiftMode = 'inPlace' | 'front'

/**
 * Draw order while she peeks. The reaching arm (screen-left, Param62/60) crosses her body, so all of it goes
 * in front of her hair and torso: the upper arm, then its puff sleeve and shoulder ruffle over the upper arm's
 * top end (so no seam shows), then the forearm and hand over the upper arm's lower end. With PeekElbow placing
 * the forearm's top end on the upper arm's lower end, the arm reads as one piece bent at the elbow (chosen
 * with the owner from rendered options, "E2"). Left at the author's order the hair and bodice cover the upper
 * arm and the arm looks broken above the elbow. The resting arm only moves its upper arm up to sit just under
 * its own sleeve.
 */
export class PeekArmOrder {
  private readonly arm: Uint8Array
  private readonly lifted: Uint8Array
  private readonly original: Int32Array
  private readonly byOrder: Int32Array
  private target: Int32Array | null = null

  static forModel(model: PeekArmModel): PeekArmOrder {
    const roots = ['Part128', 'Part129'].map(id => model.partIndex(id)).filter(i => i >= 0)
    if (!roots.length) return new PeekArmOrder(model.count, [])
    const inside = (d: number, parts: number[]) => {
      for (let p = model.drawablePart(d), guard = 0; p >= 0 && guard < 64; p = model.partParents[p], guard++) if (parts.includes(p)) return true
      return false
    }
    const meshes = (ids: string[]) => ids.map(id => model.drawableIndex(id)).filter(d => d >= 0)
    // Per side: upper arm, its puff sleeve part (大臂袖子) and the shoulder ruffle over the sleeve top (肩膀花边).
    // The long frill straps (ArtMesh541/700) stay behind the hair: in front they read as a white stripe.
    const sides: { upper: string; sleeve: string; frills: string[]; mode: PeekLiftMode }[] = [
      { upper: 'ArtMesh659', sleeve: 'Part94', frills: ['ArtMesh495', 'ArtMesh494', 'ArtMesh478'], mode: 'front' },
      { upper: 'ArtMesh626', sleeve: 'Part68', frills: [], mode: 'inPlace' },
    ]
    const lifts: PeekArmLift[] = [], modes: PeekLiftMode[] = []
    for (const side of sides) {
      const drawable = model.drawableIndex(side.upper), sleeve = model.partIndex(side.sleeve)
      if (drawable < 0) continue
      const under: number[] = []
      if (sleeve >= 0) for (let d = 0; d < model.count; d++) if (inside(d, [sleeve])) under.push(d)
      under.push(...meshes(side.frills))
      lifts.push({ drawable, under }); modes.push(side.mode)
    }
    const shoulders = lifts.map(l => l.drawable)
    const foreground: number[] = []
    for (let d = 0; d < model.count; d++) if (!shoulders.includes(d) && inside(d, roots)) foreground.push(d)
    return new PeekArmOrder(model.count, foreground, lifts, modes)
  }

  constructor(count: number, indices: readonly number[], private readonly lifts: readonly PeekArmLift[] = [], private readonly modes: readonly PeekLiftMode[] = []) {
    this.arm = new Uint8Array(count)
    this.lifted = new Uint8Array(count)
    this.original = new Int32Array(count)
    this.byOrder = new Int32Array(count)
    for (const i of indices) this.arm[i] = 1
    // Without a sleeve to sit under, an upper arm simply keeps the author's place.
    lifts.forEach((lift, i) => {
      if (!lift.under.length) return
      this.lifted[lift.drawable] = 1
      if ((modes[i] ?? 'inPlace') === 'front') for (const d of lift.under) this.lifted[d] = 1
    })
  }

  restore(): void {
    if (this.target) { this.target.set(this.original); this.target = null }
  }

  apply(orders: Int32Array, weight: number): void {
    this.restore()
    if (weight < .01 || orders.length !== this.arm.length) return
    this.original.set(orders)
    this.target = orders
    for (let i = 0; i < orders.length; i++) this.byOrder[orders[i]] = i
    // In place: right before the first-drawn mesh of its sleeve.
    const anchors = new Map<number, number[]>()
    const front: number[] = []
    this.lifts.forEach((lift, i) => {
      if (!this.lifted[lift.drawable]) return
      if ((this.modes[i] ?? 'inPlace') === 'front') {
        // Upper arm first, then sleeve and frills in their own order.
        front.push(lift.drawable, ...[...lift.under].sort((a, b) => orders[a] - orders[b]))
        return
      }
      let first = lift.under[0]
      for (const d of lift.under) if (orders[d] < orders[first]) first = d
      anchors.set(first, [...(anchors.get(first) ?? []), lift.drawable])
    })
    let next = 0
    for (let i = 0; i < orders.length; i++) {
      const d = this.byOrder[i]
      if (this.arm[d] || this.lifted[d]) continue
      for (const up of anchors.get(d) ?? []) orders[up] = next++
      orders[d] = next++
    }
    for (const d of front) orders[d] = next++
    for (let i = 0; i < orders.length; i++) { const d = this.byOrder[i]; if (this.arm[d]) orders[d] = next++ }
  }
}

/**
 * How much of the peek draw order to use this frame. Going out it follows the arm (as soon as the arm moves).
 * Coming back it is dropped at once: the author's order hides the returning arm behind her hair and the hand
 * behind her skirt all the way down (rendered on the model at every step), while keeping the peek order until
 * the arm had landed left the hand in front of the skirt and then snapped it behind (seen by the owner).
 */
export function peekOrderWeight(peeking: boolean, weight: number): number {
  return peeking ? weight : 0
}

/** A mesh moved by PeekElbow (model units, y up). */
export interface PeekElbowMesh { index: number; vertices: Float32Array }

/**
 * While she peeks, the reaching forearm and hand are moved as one piece so the forearm's top end sits on
 * the upper arm's lower end (the rig leaves it sticking out above and outside the elbow). Measured on the
 * model's meshes at forearm -0.24, upper arm 0.06: upper arm (ArtMesh659) lower end centred at
 * (-0.161, 0.233), forearm sleeve (ArtMesh684) top end at (-0.192, 0.270); x moves it onto the upper arm's
 * end, y stops 0.012 short of the full -0.037 so the forearm overlaps the end a little and no seam can show.
 * Same contract as the leg layer: restore() before Core updates, apply() after; a weight of 0 leaves the
 * author's meshes untouched.
 */
export const PEEK_ELBOW = { upper: 0.06, forearm: -0.24, x: 0.0304, y: -0.025 } as const

export class PeekElbow {
  private readonly base: Float32Array[]
  private dirty = false

  constructor(private readonly meshes: readonly PeekElbowMesh[], private readonly markChanged: (index: number) => void = () => {}) {
    this.base = meshes.map(m => new Float32Array(m.vertices.length))
  }

  get available(): boolean { return this.meshes.length > 0 }

  /** Puts the author's vertices back (before Core updates, and always before she leaves the edge). */
  restore(): void {
    if (!this.dirty) return
    this.meshes.forEach((m, i) => { m.vertices.set(this.base[i]); this.markChanged(m.index) })
    this.dirty = false
  }

  apply(weight: number): void {
    this.restore()
    const w = Math.max(0, Math.min(1, weight))
    if (w < 0.001) return
    const dx = PEEK_ELBOW.x * w, dy = PEEK_ELBOW.y * w
    this.meshes.forEach((m, i) => {
      const v = m.vertices
      this.base[i].set(v)
      for (let k = 0; k < v.length; k += 2) { v[k] += dx; v[k + 1] += dy }
      this.markChanged(m.index)
    })
    this.dirty = true
  }

  /** The reaching arm's forearm and hand: every mesh under the arm part that holds the upper arm, except it. */
  static forModel(model: { count: number; partParents: ArrayLike<number>; partIndex(id: string): number; drawableIndex(id: string): number; drawablePart(index: number): number; vertices(index: number): Float32Array }, markChanged?: (index: number) => void): PeekElbow {
    const roots = ['Part128', 'Part129'].map(id => model.partIndex(id)).filter(i => i >= 0)
    if (!roots.length) return new PeekElbow([], markChanged)
    const upper = model.drawableIndex('ArtMesh659')
    const rootOf = (d: number) => { for (let p = model.drawablePart(d), g = 0; p >= 0 && g < 64; p = model.partParents[p], g++) if (roots.includes(p)) return p; return -1 }
    const arm = upper >= 0 ? rootOf(upper) : -1
    const meshes: PeekElbowMesh[] = []
    if (arm >= 0) for (let d = 0; d < model.count; d++) if (d !== upper && rootOf(d) === arm) meshes.push({ index: d, vertices: model.vertices(d) })
    return new PeekElbow(meshes, markChanged)
  }
}

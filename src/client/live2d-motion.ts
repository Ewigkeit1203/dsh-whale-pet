/**
 * How 大肥鱼 moves when there is no camera.
 *
 * The model was rigged for VTube Studio face tracking. Its physics reads a few
 * "semantic" inputs (AngleX/Y/Z, PositionX/Y/Z, LeanInput, ParamBreath) and
 * turns them into head, body, hips, legs, arms, hair and skirt. Parameters such
 * as ParamAngleX, ParamBodyAngleX, HipAngle*, LEGAngleZ2, LArm or ShockL are
 * physics outputs: anything written to them is overwritten by the physics in
 * the same frame. So this module only produces those inputs, and the runtime
 * writes them before the physics runs (see live2d/runtime.ts).
 *
 * Three layers, all in the inputs' own units (degrees, -30..30):
 * - attention: eyes reach the pointer first (~90 ms), the head follows
 *   (~300 ms), the body follows the head (~650 ms) with part of its turn;
 * - occasional idle events (shift weight, lean in, stretch, glance …) with a
 *   smooth start and end, rests of 6–15 s and no event twice in a row;
 * - after a while idle with nobody watching, longer performances like an
 *   idle animation (playing with the foxtail, dozing off, humming …), which
 *   stop as soon as the pointer moves;
 * - short pulses for touch reactions (startle, nod, huff, pat, dodge).
 * Breathing, a very small base sway and a gentle gliding sway are added on top.
 *
 * Pure and deterministic for a given seed, so it is tested in Node.
 */
import type { Live2DLook, Live2DPulse } from './live2d-types.js'
import { CARRY } from './touch.js'

export type { Live2DPulse }

/** Values written to the model each frame (semantic physics inputs plus eyes). */
export interface Live2DDrive {
  AngleX: number; AngleY: number; AngleZ: number
  PositionX: number; PositionY: number; PositionZ: number
  LeanInput: number
  ParamBreath: number
  ParamEyeBallX: number; ParamEyeBallY: number
  /** Additive face offsets for the runtime to combine with the look. */
  smile: number
  brow: number
  /** Added to the eye-open multiplier (negative squints). */
  eyeOpen: number
  /** Mouth opening the performance wants (yawning, humming), 0..1. */
  mouth: number
  /** Hand gesture a performance holds (the look's own gesture wins). */
  gesture: Live2DGesture | null
  /** Chest-cover weight (0..1); the runtime puts her left hand to her chest with the rig's animation inputs. */
  armCover: number
  /** Carried: how far the paws are up (0..1); they flap while she struggles and drop once she gives up. */
  armLift: number
  /** True while something quick is moving (pulse or performance): worth a higher frame rate. */
  lively: boolean
  /** Name of the idle event in progress, for tests and debugging. */
  event: string
  /** Name of the performance in progress ('author' is the model's own tracking-lost animation). */
  performance: string
  /** Seconds into the performance and how strongly it shows (0..1), for clips the runtime samples. */
  performanceTime: number
  performanceWeight: number
}

export interface Live2DDriveInput {
  dt: number
  /** A local leg pose owns touchdown; avoid adding the legacy whole-body landing pulse. */
  landingHandled?: boolean
  /** 1 = full motion, 0 = reduced motion. */
  motion: number
  look: Live2DLook
  /** Pointer relative to her face, -1..1 (y up), and seconds since it last moved; null when there is none. */
  pointer: { x: number; y: number; still: number } | null
  /** 0..1 while text is being spoken. */
  talking: number
}

export const LIVE2D_TAU = { eye: 0.09, head: 0.3, body: 0.65 }
/** Share of the head turn that the body (PositionX/Z) follows. */
export const LIVE2D_BODY_FOLLOW = 0.45
export const LIVE2D_REST = [6, 15] as const
/** Seconds held before she stops struggling and lets her arms hang (PetOverlay turns flustered at 2.5 s too). */
export const LIVE2D_GIVE_UP_AFTER = CARRY.struggleUntil
/** Seconds of quiet idling before the first performance, and the gap between performances. */
export const LIVE2D_PERFORMANCE_AFTER = 45
export const LIVE2D_PERFORMANCE_GAP = [40, 80] as const

type Offsets = Partial<Record<'ax' | 'ay' | 'az' | 'px' | 'py' | 'pz' | 'lean' | 'breath' | 'ex' | 'ey' | 'smile' | 'brow' | 'eyeOpen' | 'gaze' | 'mouth', number>>

interface IdleEventDef {
  name: string
  duration: readonly [number, number]
  /** Offsets at full strength for a side (+1 / -1); the envelope fades them in and out. */
  at(side: number, u: number): Offsets
}

const sin2 = (u: number) => { const s = Math.sin(Math.PI * Math.max(0, Math.min(1, u))); return s * s }
/** Rise, hold, fall: for poses that should settle before returning. */
const plateau = (u: number, edge = 0.28) => u < edge ? sin2(u / edge / 2) : u > 1 - edge ? sin2((1 - u) / edge / 2) : 1

export const LIVE2D_IDLE_EVENTS: readonly IdleEventDef[] = [
  // 换脚调整重心: weight onto one hip, the head balances the other way.
  { name: 'shift', duration: [3, 4.5], at: (s, u) => { const e = plateau(u); return { px: 8 * s * e, pz: 6 * s * e, az: -3 * s * e, ax: -2 * s * e } } },
  // 轻微前倾: curious lean towards the screen.
  { name: 'lean', duration: [2.6, 3.8], at: (_s, u) => { const e = plateau(u); return { lean: 9 * e, ay: -4 * e, py: -2 * e, ey: -0.15 * e } } },
  // 舒展上身: a small stretch with a deeper breath.
  { name: 'stretch', duration: [3.4, 4.6], at: (s, u) => { const e = sin2(u); return { py: 7 * e, lean: -6 * e, ay: 6 * e, az: 2 * s * e, breath: 0.35 * e, eyeOpen: -0.25 * e, smile: 0.25 * e } } },
  // 张望: eyes go first (the head filter is slower), then the head, then back.
  { name: 'glance', duration: [2.2, 3.2], at: (s, u) => { const e = plateau(u, 0.22); return { ex: 0.75 * s * e, ey: 0.15 * e, ax: 11 * s * e, az: 2 * s * e, gaze: e } } },
  // 歪头: tilt with a hint of a smile.
  { name: 'tilt', duration: [2.2, 3], at: (s, u) => { const e = plateau(u); return { az: 9 * s * e, ax: 3 * s * e, smile: 0.25 * e } } },
  // 放松回落: shoulders drop on an out-breath.
  { name: 'relax', duration: [2.6, 3.6], at: (_s, u) => { const e = sin2(u); return { py: -5 * e, ay: -3 * e, breath: -0.2 * e, eyeOpen: -0.15 * e } } },
  // 轻轻侧身: turn the body, the head stays towards the viewer.
  { name: 'sway', duration: [3.2, 4.6], at: (s, u) => { const e = plateau(u); return { px: 10 * s * e, pz: -3 * s * e, ax: -4 * s * e, ex: -0.2 * s * e } } },
  // 深呼吸.
  { name: 'breath', duration: [3.8, 5], at: (_s, u) => { const e = sin2(u); return { breath: 0.45 * e, py: 3 * e, ay: 2 * e } } },
]

/** 0 outside [a, b] seconds, eased in and out over `edge` seconds. */
const span = (t: number, a: number, b: number, edge = 0.6) => t <= a || t >= b ? 0 : Math.min(1, sin2(Math.min(t - a, b - t) / edge / 2))
const wave = (t: number, period: number, phase = 0) => Math.sin(Math.PI * 2 * t / period + phase)

interface PerformanceDef {
  name: string
  duration: number
  /** Offsets at `t` seconds into the performance, plus the gesture to hold. */
  at(t: number, side: number): { o: Offsets; gesture?: Live2DGesture }
}

export const LIVE2D_PERFORMANCES: readonly PerformanceDef[] = [
  // 摆弄狗尾草: takes out the foxtail and sways her head with it.
  { name: 'foxtail', duration: 10.5, at: t => {
    const w = span(t, 0.4, 10, 1)
    return { gesture: t < 8.4 ? 'grass' : undefined, o: { ex: -0.45 * w, ey: 0.25 * w, az: 9 * wave(t, 3.2) * w, ax: (-6 + 5 * wave(t, 3.2, 1)) * w, px: 6 * wave(t, 3.2) * w, pz: 3 * wave(t, 3.2, 0.5) * w, smile: 0.5 * w, mouth: 0.08 * w } }
  } },
  // 东张西望: one side, the other side, up, then back with a smile.
  { name: 'look-around', duration: 8.4, at: (t, s) => {
    const a = span(t, 0.3, 2.8, 0.45), b = span(t, 3.1, 5.6, 0.45), c = span(t, 5.9, 7.6, 0.45), d = span(t, 6.6, 8.4, 0.6)
    return { o: { ex: 0.85 * s * (a - b), ax: 17 * s * (a - b), az: 5 * s * (a - b), px: 8 * s * (a - b), pz: 4 * s * (a - b), ey: 0.5 * c, ay: 7 * c, smile: 0.5 * d, gaze: Math.max(a, b, c) } }
  } },
  // 打瞌睡: eyelids sink, the head drops, she jerks awake, then smiles sheepishly.
  { name: 'doze', duration: 11.5, at: (t, s) => {
    const sink = t < 8 ? Math.min(1, Math.max(0, (t - 0.5) / 5.5)) * span(t, 0, 8.4, 0.4) : 0
    const wake = t >= 8 && t < 9.4 ? kick((t - 8) / 1.4) : 0
    const after = span(t, 9, 11.5, 0.8)
    return { o: { eyeOpen: -0.85 * sink + 0.25 * wake, ay: -14 * sink * sink + 9 * wake, az: 8 * s * sink - 4 * s * after, px: 4 * s * sink, py: -4 * sink + 6 * wake, lean: 5 * sink, brow: wake, smile: 0.5 * after, gaze: Math.max(sink, wake) } }
  } },
  // 伸懒腰打哈欠, then a little shake of the head.
  { name: 'yawn', duration: 8.5, at: t => {
    const up = span(t, 0.3, 4.6, 1.2), yawn = span(t, 0.9, 3.9, 0.7), shake = span(t, 4.8, 6.6, 0.3), after = span(t, 6, 8.5, 0.6)
    return { o: { py: 12 * up, lean: -10 * up, ay: 12 * up, breath: 0.4 * up, eyeOpen: -0.85 * yawn, mouth: 0.85 * yawn, az: 6 * wave(t, 0.55) * shake, smile: 0.35 * after, gaze: up } }
  } },
  // 哼歌摇摆: eyes closed, swaying to a tune.
  { name: 'hum', duration: 10, at: t => {
    const w = span(t, 0.5, 9.5, 1.2)
    return { o: { px: 10 * wave(t, 2.2) * w, pz: 5 * wave(t, 2.2, 0.4) * w, az: 8 * wave(t, 2.2, 0.6) * w, ay: 3 * wave(t, 1.1) * w, smile: 0.75 * w, eyeOpen: -0.5 * w, mouth: (0.08 + 0.08 * wave(t, 0.55)) * w, gaze: w } }
  } },
  // 抚胸微笑: hand on her chest, looks down, then up at you with a smile.
  { name: 'chest', duration: 8.5, at: (t, s) => {
    const down = span(t, 0.3, 3.8, 0.7), up = span(t, 3.4, 8.2, 0.8)
    return { gesture: t < 6.8 ? 'chest' : undefined, o: { ey: -0.45 * down, ay: -8 * down + 3 * up, az: 6 * s * up, px: 3 * s * up, smile: 0.3 * down + 0.8 * up, eyeOpen: -0.2 * down, gaze: down } }
  } },
]

interface PulseDef { duration: number; at(side: number, u: number): Offsets }
/** attack in the first `a` of the pulse, then exponential settle. */
const kick = (u: number, a = 0.14) => u < a ? sin2(u / a / 2) : Math.exp(-(u - a) * 5) * (1 - u)

export const LIVE2D_PULSES: Record<Live2DPulse, PulseDef> = {
  startle: { duration: 1.1, at: (_s, u) => { const e = kick(u); return { py: 6 * e, ay: 7 * e, lean: -5 * e, brow: e, eyeOpen: 0.2 * e } } },
  nod: { duration: 0.9, at: (_s, u) => { const e = Math.pow(Math.sin(Math.PI * 2 * u), 2) * (1 - u * 0.4); return { ay: -6 * e, py: -1 * e } } },
  huff: { duration: 1.8, at: (s, u) => { const e = plateau(u, 0.18); return { ax: 13 * s * e, az: -5 * s * e, lean: -3 * e, ex: -0.5 * s * e, gaze: e } } },
  pat: { duration: 1.6, at: (s, u) => { const e = plateau(u, 0.3); return { ay: -6 * e, az: 6 * s * e, py: -2 * e, smile: 0.6 * e, eyeOpen: -0.4 * e, gaze: e } } },
  // Put down after being carried: a small squash on landing.
  land: { duration: 0.9, at: (_s, u) => { const e = kick(u, 0.12); return { py: -7 * e, lean: 4 * e, ay: -4 * e, eyeOpen: -0.3 * e } } },
  // Tail touched: the body jumps away from the hand, she looks back at it over her shoulder.
  dodge: { duration: 2, at: (s, u) => { const e = u < 0.1 ? sin2(u / 0.2) : plateau(u, 0.35); return { px: -12 * s * e, pz: -7 * s * e, lean: -6 * e, py: 2 * e, ax: 10 * s * e, az: -4 * s * e, ex: 0.7 * s * e, brow: 0.6 * e, gaze: e } } },
}
/** Same pulse again within this time is ignored (repeated pokes would otherwise jitter). */
export const LIVE2D_PULSE_COOLDOWN = 1.6

/** Small deterministic generator (mulberry32). */
export function live2dRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (v: number, lo: number, hi: number) => v < lo ? lo : v > hi ? hi : v
const follow = (current: number, target: number, tau: number, dt: number) => current + (target - current) * (1 - Math.exp(-dt / tau))
const add = (into: Required<Offsets>, from: Offsets, weight: number) => { for (const key in from) into[key as keyof Offsets] += (from[key as keyof Offsets] ?? 0) * weight }
const zero = (): Required<Offsets> => ({ ax: 0, ay: 0, az: 0, px: 0, py: 0, pz: 0, lean: 0, breath: 0, ex: 0, ey: 0, smile: 0, brow: 0, eyeOpen: 0, gaze: 0, mouth: 0 })

export class Live2DDriver {
  private time = 0
  private random: () => number
  private eye = { x: 0, y: 0 }
  private head = { x: 0, y: 0, z: 0 }
  private body = { x: 0, y: 0, z: 0, lean: 0 }
  private walk = 0
  private idle = 0
  private wobble = 0
  private talk = 0
  private event: { def: IdleEventDef; side: number; start: number; duration: number } | null = null
  private nextEventAt: number
  private lastEvent = ''
  private pulses: { kind: Live2DPulse; def: PulseDef; side: number; start: number }[] = []
  private pulseAt: Partial<Record<Live2DPulse, number>> = {}
  /** Seconds of quiet idling (idle, full motion, nobody moving the pointer). */
  private quiet = 0
  private nextPerformanceAt = LIVE2D_PERFORMANCE_AFTER
  private lastPerformance = ''
  private performance: { def: PerformanceDef; side: number; start: number; stopped: number | null } | null = null
  private performanceWeight = 0
  private authorIdle: PerformanceDef | null = null
  /** Picked up: how long, and the overlay's swing angle. */
  private wasHeld = false
  private heldKey: number | undefined
  private dangle = 0
  private hand = { x: 0, y: 0 }
  private carryHand = { x: 0, y: 0 }
  private carryWeight = 0
  private heldFor = 0
  private armLift = 0
  private coverWeight = 0

  constructor(seed = Date.now()) {
    this.random = live2dRandom(seed)
    this.nextEventAt = 3 + this.random() * 4
  }

  /** Starts a touch reaction (side: where the touch came from, +1 right / -1 left); ignored while the same one is cooling down. */
  pulse(kind: Live2DPulse, side?: number): boolean {
    const def = LIVE2D_PULSES[kind]
    if (!def) return false
    const last = this.pulseAt[kind]
    if (last !== undefined && this.time - last < LIVE2D_PULSE_COOLDOWN) return false
    this.pulseAt[kind] = this.time
    this.pulses.push({ kind, def, side: side ? Math.sign(side) : this.random() < 0.5 ? -1 : 1, start: this.time })
    // Being touched ends a performance and counts as attention.
    this.stopPerformance()
    this.quiet = 0
    return true
  }

  /** Swing angle while she is carried (degrees); the canvas itself is rotated by the overlay. */
  setDangle(angle: number, velocity?: { x: number; y: number }): void {
    this.dangle = Number.isFinite(angle) ? clamp(angle, -30, 30) : 0
    this.hand.x = Number.isFinite(velocity?.x) ? clamp(velocity!.x / 900, -1, 1) : 0
    this.hand.y = Number.isFinite(velocity?.y) ? clamp(velocity!.y / 900, -1, 1) : 0
  }

  /** The model's own "tracking lost" idle animation (脱捕), sampled by the runtime; 0 removes it. */
  setAuthorIdle(duration: number): void {
    this.authorIdle = duration > 0 ? { name: 'author', duration, at: () => ({ o: { gaze: 1 } }) } : null
  }

  private stopPerformance(): void {
    if (this.performance && this.performance.stopped === null) this.performance.stopped = this.time
  }

  update({ dt, motion, look, pointer, talking, landingHandled = false }: Live2DDriveInput): Live2DDrive {
    dt = clamp(dt, 0, 0.1)
    this.time += dt
    const t = this.time
    const m = clamp(motion, 0, 1)
    this.walk = follow(this.walk, look.walk ? 1 : 0, 0.25, dt)
    this.idle = follow(this.idle, look.idle && !look.walk ? 1 : 0, 0.5, dt)
    this.wobble = follow(this.wobble, (look.wobble ?? 0) * m, 0.35, dt)
    this.talk = follow(this.talk, clamp(talking, 0, 1), 0.2, dt)

    // ---- carried ---------------------------------------------------------------
    const held = Boolean(look.held) && m > 0
    const pickedUp = held && (!this.wasHeld || look.heldKey !== this.heldKey)
    if (pickedUp) this.heldFor = 0
    this.heldKey = held ? look.heldKey : undefined
    if (pickedUp || look.guardChest) { this.stopPerformance(); this.event = null }
    if (!held && this.wasHeld && !landingHandled) this.pulse('land')
    this.wasHeld = held
    // Picked up: paws up and flapping at once; held a while, she gives up and the arms hang (the physics sways them).
    this.heldFor = held ? this.heldFor + dt : 0
    this.armLift = follow(this.armLift, held && this.heldFor <= LIVE2D_GIVE_UP_AFTER ? 1 : 0, held && this.heldFor <= LIVE2D_GIVE_UP_AFTER ? 0.18 : 0.35, dt)
    const carry = zero(), pulses0 = zero()
    this.carryWeight = follow(this.carryWeight, held ? 1 : 0, held ? 0.18 : 0.24, dt)
    this.coverWeight = follow(this.coverWeight, look.guardChest ? 1 : 0, 0.18, dt)
    this.carryHand.x = follow(this.carryHand.x, held ? this.hand.x : 0, 0.14, dt)
    this.carryHand.y = follow(this.carryHand.y, held ? this.hand.y : 0, 0.18, dt)
    if (this.carryWeight > 0.001) {
      // Keep the lower body quiet: no kicks or large vertical hip/arm-physics drive.
      // Bent arms are controlled separately through the model's animation rig.
      const hx = this.carryHand.x, hy = this.carryHand.y
      add(carry, { lean: -2 - hy * 2, ey: -0.35, gaze: 1 }, this.carryWeight)
      add(pulses0, {
        az: -this.dangle * 0.55 + Math.sin(t * 2.7),
        ax: -hx * 5 + Math.sin(t * 2.1) * 1.5,
        ay: hy * 3,
        px: -this.dangle * 0.16 - hx * 1.2,
      }, this.carryWeight)
    }

    // ---- performances after a while of quiet idling ---------------------------
    const watched = pointer !== null && pointer.still < 4
    const quiet = this.idle > 0.9 && m >= 0.5 && !watched && !held && !look.guardChest
    this.quiet = quiet ? this.quiet + dt : 0
    if (!quiet || (pointer !== null && pointer.still < 0.5)) this.stopPerformance()
    if (!this.performance && !this.event && quiet && this.quiet >= this.nextPerformanceAt) {
      const choices = LIVE2D_PERFORMANCES.filter(def => def.name !== this.lastPerformance)
      // The author's own idle animation comes up often (about one in three) when the model has it.
      const def = this.authorIdle && this.lastPerformance !== 'author' && this.random() < 0.35 ? this.authorIdle : choices[Math.floor(this.random() * choices.length)]
      this.lastPerformance = def.name
      this.performance = { def, side: this.random() < 0.5 ? -1 : 1, start: t, stopped: null }
    }
    const perf = zero()
    let perfGesture: Live2DGesture | null = null
    if (this.performance) {
      const p = this.performance
      if (p.stopped === null && t - p.start >= p.def.duration) p.stopped = t
      this.performanceWeight = follow(this.performanceWeight, p.stopped === null ? 1 : 0, 0.35, dt)
      const frame = p.def.at(Math.min(t, p.stopped ?? t) - p.start, p.side)
      add(perf, frame.o, this.performanceWeight * m)
      if (p.stopped === null) perfGesture = frame.gesture ?? null
      if (p.stopped !== null && this.performanceWeight < 0.01) {
        this.performance = null
        this.performanceWeight = 0
        this.nextPerformanceAt = this.quiet + LIVE2D_PERFORMANCE_GAP[0] + this.random() * (LIVE2D_PERFORMANCE_GAP[1] - LIVE2D_PERFORMANCE_GAP[0])
        this.nextEventAt = Math.max(this.nextEventAt, t + LIVE2D_REST[0])
      }
    }
    if (!quiet && !this.performance) this.nextPerformanceAt = LIVE2D_PERFORMANCE_AFTER

    // ---- idle events (only while idle with full motion) -------------------
    const events = zero()
    if (this.performance) {
      // A performance is the idle motion for now.
      this.nextEventAt = Math.max(this.nextEventAt, t + LIVE2D_REST[0] * 0.5)
    } else if (this.event) {
      const u = (t - this.event.start) / this.event.duration
      if (u >= 1) {
        this.event = null
        this.nextEventAt = t + LIVE2D_REST[0] + this.random() * (LIVE2D_REST[1] - LIVE2D_REST[0])
      } else add(events, this.event.def.at(this.event.side, u), this.idle * m)
    } else if (this.idle < 0.6 || m < 0.5 || held || look.guardChest) {
      // Busy or reduced motion: do not save up events for later.
      this.nextEventAt = Math.max(this.nextEventAt, t + LIVE2D_REST[0] * 0.5)
    } else if (t >= this.nextEventAt) {
      const choices = LIVE2D_IDLE_EVENTS.filter(def => def.name !== this.lastEvent)
      const def = choices[Math.floor(this.random() * choices.length)]
      this.lastEvent = def.name
      this.event = { def, side: this.random() < 0.5 ? -1 : 1, start: t, duration: def.duration[0] + this.random() * (def.duration[1] - def.duration[0]) }
    }

    // ---- pulses ---------------------------------------------------------------
    add(events, perf, 1)
    add(events, carry, 1)
    const pulses = pulses0
    this.pulses = this.pulses.filter(p => {
      const u = (t - p.start) / p.def.duration
      if (u >= 1) return false
      add(pulses, p.def.at(p.side, u), Math.max(m, 0.35))
      return true
    })

    // ---- attention ------------------------------------------------------------
    // Watch a moving pointer; after a few still seconds she drifts back to her own business.
    const still = pointer ? pointer.still : Infinity
    const attention = still < 3 ? 1 : Math.max(0.3, 1 - (still - 3) / 4)
    const gaze = pointer ? clamp((look.gaze ?? 1) * attention * (1 - clamp(events.gaze + pulses.gaze, 0, 1)), 0, 1) * m : 0
    const px = pointer ? clamp(pointer.x, -1, 1) * gaze : 0
    const py = pointer ? clamp(pointer.y, -1, 1) * gaze : 0

    const eyeTarget = { x: (look.eyes?.x ?? 0) + px * 0.9 + events.ex, y: (look.eyes?.y ?? 0) + py * 0.8 + events.ey }
    this.eye.x = follow(this.eye.x, clamp(eyeTarget.x, -1, 1), LIVE2D_TAU.eye, dt)
    this.eye.y = follow(this.eye.y, clamp(eyeTarget.y, -1, 1), LIVE2D_TAU.eye, dt)
    this.head.x = follow(this.head.x, (look.angle?.x ?? 0) + px * 13 + events.ax, LIVE2D_TAU.head, dt)
    this.head.y = follow(this.head.y, (look.angle?.y ?? 0) + py * 9 + events.ay, LIVE2D_TAU.head, dt)
    this.head.z = follow(this.head.z, (look.angle?.z ?? 0) - px * 2.5 + events.az, LIVE2D_TAU.head, dt)
    // The body turns with part of the head turn (VTube Studio couples them 1:1; that is too much without a person behind it).
    this.body.x = follow(this.body.x, (look.body?.x ?? 0) + this.head.x * LIVE2D_BODY_FOLLOW + events.px, LIVE2D_TAU.body, dt)
    this.body.z = follow(this.body.z, (look.body?.z ?? 0) + this.head.z * 0.3 + events.pz, LIVE2D_TAU.body, dt)
    this.body.y = follow(this.body.y, events.py, LIVE2D_TAU.body, dt)
    this.body.lean = follow(this.body.lean, events.lean, LIVE2D_TAU.body, dt)

    // ---- oscillators: breathing, base sway, gait, speech, dizziness ----------
    const breath = 0.45 + 0.3 * Math.sin(t * 1.45) * Math.max(0.35, m)
    // A front-facing 2D rig cannot convincingly walk sideways. Let screen travel
    // carry the motion, with only a small lateral sway and no marching/bobbing.
    const glide = Math.sin(t * 2.1) * this.walk * m
    const speech = this.talk * m * Math.sin(t * 3.1) * Math.abs(Math.sin(t * 1.3))
    const w = this.wobble

    const drive: Live2DDrive = {
      AngleX: this.head.x + pulses.ax + (Math.sin(t * 0.53) * 1.8 + Math.sin(t * 0.17 + 2) * 1.2) * m + Math.sin(t * 7.3) * w,
      AngleY: this.head.y + pulses.ay + Math.sin(t * 0.71 + 1) * 1.1 * m + speech * 2.4 + Math.cos(t * 5.1) * w * 0.6,
      AngleZ: this.head.z + pulses.az + Math.sin(t * 0.41 + 2) * 1.4 * m - glide * 0.6 + Math.sin(t * 6.1 + 1) * w,
      PositionX: this.body.x + pulses.px + Math.sin(t * 0.37 + 0.5) * 1.6 * m + glide * 1.4,
      PositionY: this.body.y + pulses.py + (breath - 0.45) * 2.5,
      PositionZ: this.body.z + pulses.pz + Math.sin(t * 0.29 + 1.3) * 1.2 * m,
      LeanInput: this.body.lean + pulses.lean,
      ParamBreath: clamp(breath + events.breath, 0, 1),
      ParamEyeBallX: clamp(this.eye.x + pulses.ex, -1, 1),
      ParamEyeBallY: clamp(this.eye.y + pulses.ey, -1, 1),
      smile: events.smile + pulses.smile,
      brow: events.brow + pulses.brow,
      eyeOpen: events.eyeOpen + pulses.eyeOpen,
      mouth: clamp(events.mouth, 0, 1),
      gesture: perfGesture,
      armCover: this.coverWeight,
      armLift: this.armLift * m,
      lively: this.pulses.length > 0 || this.performance !== null || held,
      event: this.event?.def.name ?? '',
      performance: this.performance?.def.name ?? '',
      performanceTime: this.performance ? Math.min(t, this.performance.stopped ?? t) - this.performance.start : 0,
      performanceWeight: this.performance ? this.performanceWeight * m : 0,
    }
    for (const key of ['AngleX', 'AngleY', 'AngleZ', 'PositionX', 'PositionY', 'PositionZ', 'LeanInput'] as const) drive[key] = clamp(drive[key], -30, 30)
    return drive
  }
}

// ---------------------------------------------------------------------------
// Native gestures (the author's VTube Studio hotkey animations)
// ---------------------------------------------------------------------------

/** Enter / exit animations shipped with the model, by gesture. */
export const LIVE2D_GESTURES = {
  chest: { enter: '默认手切举手', exit: '举手切默认手', fallback: '' },
  point: { enter: '竖手指切出来动画', exit: '竖手指切回默认', fallback: '竖食指开' },
  grass: { enter: '狗尾草切换出来', exit: '狗尾草切回默认手', fallback: '' },
} as const
export type Live2DGesture = keyof typeof LIVE2D_GESTURES

/** File names (without .motion3.json) the importer keeps. */
export const LIVE2D_GESTURE_FILES: readonly string[] = Object.values(LIVE2D_GESTURES).flatMap(g => [g.enter, g.exit])
/** The author's idle animation for when VTube Studio loses tracking (大肥鱼.vtube.json IdleAnimationWhenTrackingLost). */
export const LIVE2D_AUTHOR_IDLE = '脱捕'
/** Animation files (without .motion3.json) the importer keeps besides IDLE. */
export const LIVE2D_MOTION_FILES: readonly string[] = [...LIVE2D_GESTURE_FILES, LIVE2D_AUTHOR_IDLE]

export interface MotionCurve { id: string; segments: readonly number[] }
export interface MotionClip { duration: number; curves: MotionCurve[] }

/** Parameter curves of a motion3.json (other targets such as part opacity are ignored). */
export function parseMotionClip(json: unknown): MotionClip | null {
  const data = json as { Meta?: { Duration?: number }; Curves?: { Target?: string; Id?: string; Segments?: number[] }[] } | null
  if (!data || !Array.isArray(data.Curves)) return null
  const curves = data.Curves
    .filter(c => c && c.Target === 'Parameter' && typeof c.Id === 'string' && Array.isArray(c.Segments) && c.Segments.length >= 2)
    .map(c => ({ id: c.Id as string, segments: c.Segments as number[] }))
  const duration = Number(data.Meta?.Duration)
  return curves.length && duration > 0 ? { duration, curves } : null
}

function bezierAt(p0: number, p1: number, p2: number, p3: number, s: number): number {
  const r = 1 - s
  return r * r * r * p0 + 3 * r * r * s * p1 + 3 * r * s * s * p2 + s * s * s * p3
}

/** Pacing and simulation have separate clocks: scheduling remainder is never simulated twice. */
export class Live2DFrameClock {
  private paceAt = 0
  private drawnAt = 0
  reset(now: number): void { this.paceAt = this.drawnAt = now }
  tick(now: number, fps: number): number | null {
    const interval = 1000 / fps, since = now - this.paceAt
    if (since < interval - 1.5) return null
    const dt = Math.min(0.1, Math.max(0.001, (now - this.drawnAt) / 1000))
    this.drawnAt = now
    this.paceAt = since < interval * 2 ? this.paceAt + interval : now
    return dt
  }
}

const curveOffsets = new WeakMap<readonly number[], number[]>()
/** Value of a motion3 curve at time t (linear, bezier, stepped and inverse stepped segments). */
export function sampleMotionCurve(segments: readonly number[], t: number): number {
  if (t <= segments[0]) return segments[1]
  // Index once per immutable imported curve. Weak keys let model disposal free it.
  let offsets = curveOffsets.get(segments)
  if (!offsets) {
    offsets = []
    for (let i = 2; i < segments.length;) { offsets.push(i); i += segments[i] === 1 ? 7 : 3 }
    curveOffsets.set(segments, offsets)
  }
  let lo = 0, hi = offsets.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1, i = offsets[mid]
    if (segments[i + (segments[i] === 1 ? 5 : 1)] < t) lo = mid + 1
    else hi = mid
  }
  if (lo === offsets.length) return segments[segments.length - 1]
  const i = offsets[lo], type = segments[i]
  const x0 = segments[i - 2], y0 = segments[i - 1]
  if (type === 1) {
    const c1x = segments[i + 1], c1y = segments[i + 2], c2x = segments[i + 3], c2y = segments[i + 4]
    const x1 = segments[i + 5], y1 = segments[i + 6]
    if (t === x1) return y1
    let low = 0, high = 1
    for (let k = 0; k < 18; k++) { const mid = (low + high) / 2; if (bezierAt(x0, c1x, c2x, x1, mid) < t) low = mid; else high = mid }
    return bezierAt(y0, c1y, c2y, y1, (low + high) / 2)
  }
  const x1 = segments[i + 1], y1 = segments[i + 2]
  if (type === 0) return x1 === x0 ? y1 : y0 + (y1 - y0) * (t - x0) / (x1 - x0)
  return type === 2 ? y0 : y1
}

/**
 * One gesture at a time: enter plays once and holds its last frame; a change
 * plays the current gesture's exit (from the matching point if it was still
 * entering) before the next one enters.
 */
export class Live2DGesturePlayer {
  current: Live2DGesture | null = null
  phase: 'none' | 'enter' | 'hold' | 'exit' = 'none'
  time = 0
  private wanted: Live2DGesture | null = null

  constructor(private durations: (gesture: Live2DGesture, part: 'enter' | 'exit') => number) {}

  want(gesture: Live2DGesture | null): void { this.wanted = gesture }

  /** Advances and returns which clip to sample and at what time, or null when the arms are at rest. */
  update(dt: number): { gesture: Live2DGesture; part: 'enter' | 'exit'; time: number } | null {
    const wanted = this.wanted
    if (this.phase === 'none' && wanted) { this.current = wanted; this.phase = 'enter'; this.time = 0 }
    if (this.current && wanted !== this.current && (this.phase === 'enter' || this.phase === 'hold')) {
      const enter = this.durations(this.current, 'enter'), exit = this.durations(this.current, 'exit')
      const progress = this.phase === 'hold' ? 1 : Math.min(1, this.time / enter)
      this.phase = 'exit'
      this.time = (1 - progress) * exit
    }
    if (!this.current) return null
    this.time += dt
    if (this.phase === 'enter') {
      const enter = this.durations(this.current, 'enter')
      if (this.time >= enter) { this.phase = 'hold'; this.time = enter }
      return { gesture: this.current, part: 'enter', time: this.time }
    }
    if (this.phase === 'hold') return { gesture: this.current, part: 'enter', time: this.durations(this.current, 'enter') }
    const exit = this.durations(this.current, 'exit')
    if (this.time >= exit) {
      const done = this.current
      this.current = null; this.phase = 'none'; this.time = 0
      // The next gesture (if any) starts on the following frame.
      return { gesture: done, part: 'exit', time: exit }
    }
    return { gesture: this.current, part: 'exit', time: this.time }
  }
}

/** Calibrated on this model: increasing these mirrored forearm channels takes
 * screen-left clockwise / screen-right counterclockwise, without circling inward.
 * The negative route can reach a similar end pose after almost a full wrong-way turn.
 */
export function carryArmPose(progress: number, time: number) {
  const ease = (u: number) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v) }
  const fore = ease(progress / 0.45), upper = ease((progress - 0.35) / 0.65)
  const flutter = ease((progress - 0.85) / 0.15)
  const flap = (phase: number) => Math.sin(time * 8.5 + phase) * 0.025 * flutter
  return {
    leftUpper: 0.36 * upper + flap(0), leftForearm: 0.58 * fore + flap(0.8),
    rightUpper: 0.36 * upper + flap(2.1), rightForearm: 0.58 * fore + flap(2.9),
  }
}

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
 * - short pulses for touch reactions (startle, nod, huff, pat, dodge);
 * - conversation body language: she listens while the user types (looks at the
 *   input box, leans in, nods at pauses), thinks while the model reasons (looks
 *   aside, changes sides, hums), talks in phrases while it answers (a beat at
 *   the end of each phrase, weight from one side to the other) and rounds the
 *   answer off with a nod and a smile.
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
  /** Arm pose from idle events, performances and thinking (rig animation inputs, 0 = at rest); zero while a gesture, carry or chest cover owns the arms. */
  arms: { lu: number; lf: number; lw: number; ru: number; rf: number; rw: number }
  /** Carried: how far the paws are up (0..1); they flap while she struggles and drop once she gives up. */
  armLift: number
  /** True while something quick is moving (pulse or performance): worth a higher frame rate. */
  lively: boolean
  /** Wandering: she swims across instead of walking. `float` 0..1 lifts her feet off the ground (legs together, hanging); `touchdown` 0..1 is the knee bend as she lands. */
  float: number
  touchdown: number
  /** Whole-figure lean into the travel direction in degrees (positive: head towards screen right), and a slow bob -1..1. */
  swimTilt: number
  swimBob: number
  /** In conversation, an arm is in transit or she just nodded: smoother frames if this machine draws cheaply. */
  moving: boolean
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
  /** While wandering: how fast she is travelling across the screen, -1 (left) .. 1 (right). */
  travel?: number
  /** Local hour 0–23: which performances suit the time of day, and how soon she gets drowsy. */
  hour?: number
  /** The user is typing in the host: where the input box is relative to her face (-1..1, y up) and seconds since the last keystroke. */
  typing?: { x: number; y: number; since: number } | null
}

export const LIVE2D_TAU = { eye: 0.09, head: 0.3, body: 0.65 }
/**
 * Head, body and arms follow their targets as damped springs [angular frequency rad/s, damping ratio]:
 * a spring starts from rest and eases in (a one-pole filter starts at full speed, which reads as a
 * puppet being jerked), and with damping below 1 it settles with a small overshoot. The arms are
 * critically damped so they never overshoot into a pose that was not checked on the model.
 */
export const LIVE2D_SPRING = { head: [7, 0.8], body: [3.8, 0.85], arm: [9, 1] } as const
type Axis = Record<string, number>
/** One spring step (semi-implicit, sub-stepped so it stays stable on long frames). */
function springTo(pos: Axis, vel: Axis, key: string, target: number, [omega, zeta]: readonly [number, number], dt: number): number {
  const steps = Math.max(1, Math.ceil(dt * omega / 0.25)), h = dt / steps
  let p = pos[key], v = vel[key]
  for (let i = 0; i < steps; i++) { v += (omega * omega * (target - p) - 2 * zeta * omega * v) * h; p += v * h }
  pos[key] = p; vel[key] = v
  return p
}
/** Share of the head turn that the body (PositionX/Z) follows. */
export const LIVE2D_BODY_FOLLOW = 0.45
export const LIVE2D_REST = [6, 15] as const
/** Seconds held before she stops struggling and lets her arms hang (PetOverlay turns flustered at 2.5 s too). */
export const LIVE2D_GIVE_UP_AFTER = CARRY.struggleUntil
/** Seconds of quiet idling before the first performance, and the gap between performances. */
export const LIVE2D_PERFORMANCE_AFTER = 45
export const LIVE2D_PERFORMANCE_GAP = [40, 80] as const
/** Wandering: lean of the whole figure at full speed (degrees), lift and bob as fractions of her height, and the screen speed (CSS px/s) that counts as full speed. */
export const LIVE2D_SWIM = { tilt: 8, lift: 0.014, bob: 0.005, speed: 220 }
/** Conversation: how long after the last keystroke she keeps listening, the typing pause that earns a nod,
 * the length of a spoken phrase, how long she stays on one side while thinking, and what counts as a long answer. */
export const LIVE2D_CHAT = { listenFor: 2.5, nodAfter: 0.8, phrase: [1.3, 3.5] as const, thinkSide: [4, 7] as const, minAnswer: 1.5, longAnswer: 20 }

type Offsets = Partial<Record<'ax' | 'ay' | 'az' | 'px' | 'py' | 'pz' | 'lean' | 'breath' | 'ex' | 'ey' | 'smile' | 'brow' | 'eyeOpen' | 'gaze' | 'mouth' | 'lu' | 'lf' | 'lw' | 'ru' | 'rf' | 'rw', number>>

/**
 * Arm poses use the rig's animation inputs (not the LArm/RArm physics outputs):
 * upper arm Z (Param62 / Param36), forearm Z (Param60 / Param41), wrist Z (Param61 / Param42),
 * as lu/lf/lw and ru/rf/rw. Rendered on the model (both arms mirror each other):
 * - forearm -0.5, upper 0: hand on the hip (removed: users found it odd, the hand swings round from behind);
 *   forearm -1: forearm out to the side, palm up;
 * - upper 0.6, forearm -1: hand raised beside the head (waving with the wrist);
 * - forearm +0.5, upper 0 → 1: arms out to the side, up, then hands on top of the head (a stretch);
 * - forearm +1 with the upper arm down hides the hand behind her back: never pass through it.
 * Raise the forearm before the upper arm and lower them in the reverse order.
 */
const arm = (side: number, upper: number, fore: number, wrist = 0): Offsets => side > 0 ? { lu: upper, lf: fore, lw: wrist } : { ru: upper, rf: fore, rw: wrist }

interface IdleEventDef {
  name: string
  duration: readonly [number, number]
  /** Offsets at full strength for a side (+1 / -1); the envelope fades them in and out. */
  at(side: number, u: number): Offsets
}

const sin2 = (u: number) => { const s = Math.sin(Math.PI * Math.max(0, Math.min(1, u))); return s * s }
/** One smooth bump over 0..1, nothing outside. */
const bump = (u: number) => u <= 0 || u >= 1 ? 0 : sin2(u)
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
  // 看窗外: a longer look away and up, the body half turned with it.
  { name: 'window', duration: [4, 5], at: (s, u) => { const e = plateau(u, 0.2); return { ex: 0.8 * s * e, ey: 0.35 * e, ax: 16 * s * e, ay: 5 * e, az: 3 * s * e, px: 7 * s * e, eyeOpen: -0.1 * e, gaze: e } } },
  // 甩甩头发: a quick shake so the hair physics swings, eyes half closed.
  { name: 'hair', duration: [2.4, 3.2], at: (s, u) => { const e = sin2(u); return { az: 7 * Math.sin(u * Math.PI * 4) * e, ax: 4 * s * e, smile: 0.2 * e, eyeOpen: -0.3 * e } } },
  // 低头看裙摆: looks down and turns her hips a little each way so the skirt swings.
  { name: 'skirt', duration: [3.6, 4.8], at: (_s, u) => { const e = plateau(u), turn = Math.sin(u * Math.PI * 3); return { ey: -0.6 * e, ay: -9 * e, lean: 4 * e, px: 7 * turn * e, pz: 4 * Math.sin(u * Math.PI * 3 + 1) * e, smile: 0.2 * e, gaze: e } } },
]

/** 0 outside [a, b] seconds, eased in and out over `edge` seconds, 1 in between. */
const span = (t: number, a: number, b: number, edge = 0.6) => t <= a || t >= b ? 0 : sin2(Math.min(0.5, Math.min(t - a, b - t) / edge / 2))
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
    // Arms out to the side, up and onto her head: forearms lead on the way up and follow on the way down.
    const fore = 0.5 * span(t, 0.3, 4.9, 0.8), upper = span(t, 0.9, 4.2, 1)
    return { o: { py: 12 * up, lean: -10 * up, ay: 12 * up, breath: 0.4 * up, eyeOpen: -0.85 * yawn, mouth: 0.85 * yawn, az: 6 * wave(t, 0.55) * shake, smile: 0.35 * after, gaze: up, lu: upper, ru: upper, lf: fore, rf: fore } }
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
  // 挥手: looks at you and waves, in case you forgot she is there.
  { name: 'wave', duration: 6.5, at: (t, s) => {
    const fore = span(t, 0.4, 6.1, 0.6), upper = span(t, 0.9, 5.5, 0.6)
    return { o: { ...arm(s, 0.6 * upper, -fore, 0.8 * wave(t, 0.42) * upper), az: 5 * s * upper, px: 3 * s * upper, smile: 0.6 * upper, brow: 0.3 * upper, eyeOpen: 0.08 * upper } }
  } },
  // 看窗外发呆: turns away for a long look, sighs, then comes back with a small smile.
  { name: 'window-gaze', duration: 14, at: (t, s) => {
    const away = span(t, 0.4, 11, 1), sigh = span(t, 6, 9.5, 1), back = span(t, 11, 14, 0.8)
    return { o: { ex: 0.85 * s * away, ey: 0.3 * away, ax: 18 * s * away, ay: 6 * away - 5 * sigh, az: 4 * s * away, px: 9 * s * away, pz: 3 * s * away, py: -4 * sigh, breath: 0.4 * sigh, eyeOpen: -0.15 * away - 0.2 * sigh, smile: 0.45 * back, gaze: Math.max(away, back) } }
  } },
  // 困得直点头: nods off three times, each a little deeper, then shakes herself awake.
  { name: 'nod-off', duration: 16, at: (t, s) => {
    const dip = (a: number, depth: number) => { const u = (t - a) / 3.6; return u <= 0 || u >= 1 ? 0 : (u < 0.8 ? u / 0.8 : (1 - u) / 0.2) * depth }
    const sink = Math.max(dip(0.6, 0.6), dip(4.2, 0.8), dip(7.8, 1)), shake = span(t, 11.6, 13.4, 0.3), after = span(t, 12.6, 16, 0.8)
    return { o: { eyeOpen: -0.9 * sink, ay: -15 * sink, az: 7 * s * sink + 6 * wave(t, 0.5) * shake, px: 4 * s * sink, py: -4 * sink, lean: 5 * sink, brow: 0.6 * shake, smile: 0.4 * after, gaze: Math.max(sink, shake) } }
  } },
]

/** How likely a performance is at an hour of the day (1 = as usual): sleepy ones at night, gazing in the afternoon, humming in the evening. */
export function performanceBias(name: string, hour: number | undefined): number {
  if (hour === undefined) return 1
  const night = hour >= 23 || hour < 6
  if (night) return name === 'doze' || name === 'nod-off' ? 3 : name === 'yawn' ? 2 : name === 'hum' || name === 'look-around' ? 0.4 : 1
  if (hour < 10) return name === 'yawn' ? 2.5 : name === 'nod-off' ? 0.4 : 1
  if (hour >= 13 && hour < 17) return name === 'window-gaze' ? 2 : name === 'doze' ? 1.5 : 1
  if (hour >= 19) return name === 'hum' || name === 'foxtail' ? 2 : 1
  return 1
}
/** Quiet seconds before she starts to get drowsy (by day, at night) and how long the eyelids take to sink. */
export const LIVE2D_DROWSY = { day: 480, night: 180, over: 120 }

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
  // The user just sent a message: she straightens up, brows raised.
  perk: { duration: 0.8, at: (_s, u) => { const e = kick(u); return { py: 4 * e, ay: 5 * e, lean: -3 * e, brow: 0.7 * e, eyeOpen: 0.15 * e } } },
  // The answer is finished: a nod, then a smile with the head a little to one side.
  wrap: { duration: 1.6, at: (s, u) => { const n = bump(u / 0.45), e = plateau(u, 0.3); return { ay: -6 * n + 2 * e, py: -3 * n, az: 4 * s * e, smile: 0.55 * e, eyeOpen: -0.25 * e } } },
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
const zero = (): Required<Offsets> => ({ ax: 0, ay: 0, az: 0, px: 0, py: 0, pz: 0, lean: 0, breath: 0, ex: 0, ey: 0, smile: 0, brow: 0, eyeOpen: 0, gaze: 0, mouth: 0, lu: 0, lf: 0, lw: 0, ru: 0, rf: 0, rw: 0 })

export class Live2DDriver {
  private time = 0
  private random: () => number
  private eye = { x: 0, y: 0 }
  private head = { x: 0, y: 0, z: 0 }
  private body = { x: 0, y: 0, z: 0, lean: 0 }
  private headV = { x: 0, y: 0, z: 0 }
  private bodyV = { x: 0, y: 0, z: 0, lean: 0 }
  private armP = { lu: 0, lf: 0, lw: 0, ru: 0, rf: 0, rw: 0 }
  private armV = { lu: 0, lf: 0, lw: 0, ru: 0, rf: 0, rw: 0 }
  private walk = 0
  private idle = 0
  private wobble = 0
  private talk = 0
  private event: { def: IdleEventDef; side: number; start: number; duration: number } | null = null
  private nextEventAt: number
  private lastEvent = ''
  private pulses: { kind: Live2DPulse; def: PulseDef; side: number; start: number; gain: number }[] = []
  private pulseAt: Partial<Record<Live2DPulse, number>> = {}
  /** Seconds of quiet idling (idle, full motion, nobody moving the pointer). */
  private quiet = 0
  private nextPerformanceAt = LIVE2D_PERFORMANCE_AFTER
  private lastPerformance = ''
  private earlierPerformance = ''
  private drowsy = 0
  private wasDrowsy = false
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
  /** Conversation: listening, thinking and speaking weights and their small clocks. */
  private listen = 0
  private listenAt = { x: 0, y: 0 }
  private typedSince = Infinity
  private listenNodAt = -9
  private think = 0
  private wasThinking = false
  private thinkSide = 1
  private thinkLean = 0
  private thinkNextAt = 0
  private thinkHumAt = -9
  private thinkFor = 0
  private armFree = 1
  private travel = 0
  private wasWalking = false
  private landAt = -9
  private spokenFor = 0
  private phraseEndAt = 0
  private beatAt = -9
  private beatKind = 0
  private speakSide = 1
  private speakLean = 0

  constructor(seed = Date.now()) {
    this.random = live2dRandom(seed)
    this.nextEventAt = 3 + this.random() * 4
  }

  /** Starts a touch reaction (side: where the touch came from, +1 right / -1 left); ignored while the same one is cooling down. */
  pulse(kind: Live2DPulse, side?: number, gain = 1): boolean {
    const def = LIVE2D_PULSES[kind]
    if (!def) return false
    const last = this.pulseAt[kind]
    if (last !== undefined && this.time - last < LIVE2D_PULSE_COOLDOWN) return false
    this.pulseAt[kind] = this.time
    this.pulses.push({ kind, def, side: side ? Math.sign(side) : this.random() < 0.5 ? -1 : 1, start: this.time, gain })
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

  update({ dt, motion, look, pointer, talking, typing = null, hour, travel = 0, landingHandled = false }: Live2DDriveInput): Live2DDrive {
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
    if (pickedUp || look.guardChest || look.edgePeek) { this.stopPerformance(); this.event = null }
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

    // ---- conversation: listening, thinking, speaking, rounding off -------------
    const chat = zero()
    const busy = held || Boolean(look.guardChest)
    // Listening: the user is typing while she has nothing else to do.
    const listening = typing !== null && typing.since < LIVE2D_CHAT.listenFor && Boolean(look.idle) && !busy && m >= 0.5
    if (listening) {
      this.listenAt.x = clamp(typing.x, -1, 1); this.listenAt.y = clamp(typing.y, -1, 1)
      // A pause in the typing earns one nod.
      if (typing.since >= LIVE2D_CHAT.nodAfter && this.typedSince < LIVE2D_CHAT.nodAfter) this.listenNodAt = t
      this.typedSince = typing.since
      this.stopPerformance(); this.event = null
    } else this.typedSince = Infinity
    this.listen = follow(this.listen, listening ? 1 : 0, 0.35, dt)
    if (this.listen > 0.005) {
      const lx = this.listenAt.x, ly = this.listenAt.y, nod = bump((t - this.listenNodAt) / 0.6)
      add(chat, { ex: lx * 0.8, ey: ly * 0.7, ax: lx * 11, ay: ly * 7 - 2, az: -lx * 3, lean: 7, py: -1.5, brow: 0.15, smile: 0.15, gaze: 1 }, this.listen)
      // Nods bypass the slow head filter (like touch pulses), or they would be smoothed away.
      add(pulses0, { ay: -5 * nod, py: -nod }, this.listen)
    }
    // Thinking: perk up when the message is sent, then look aside, change sides now and then, hum to herself.
    const thinking = Boolean(look.thinking) && !busy
    if (thinking && !this.wasThinking && m >= 0.5) { this.pulse('perk', 1); this.thinkNextAt = t + 1.5 }
    this.wasThinking = thinking
    this.think = follow(this.think, thinking ? 1 : 0, 0.6, dt)
    this.thinkFor = thinking ? this.thinkFor + dt : 0
    if (this.think > 0.005) {
      if (thinking && t >= this.thinkNextAt) {
        this.thinkSide = -this.thinkSide
        this.thinkNextAt = t + LIVE2D_CHAT.thinkSide[0] + this.random() * (LIVE2D_CHAT.thinkSide[1] - LIVE2D_CHAT.thinkSide[0])
        this.thinkHumAt = t + 1.4 + this.random() * 1.2
      }
      this.thinkLean = follow(this.thinkLean, this.thinkSide, 0.9, dt)
      const side = this.thinkLean, hum = bump((t - this.thinkHumAt) / 0.7)
      add(chat, { ex: 0.3 * side, ax: 5 * side, az: 4 * side, px: 3 * side + 2 * wave(t, 5.2), pz: 2 * side, eyeOpen: -0.08 }, this.think * m)
      add(pulses0, { ay: -4 * hum, py: -hum }, this.think * m)
    }
    // Speaking: phrases of a few seconds; each ends on a beat (a nod, or a tilt) and the weight changes side.
    const speaking = talking > 0.5
    if (speaking) {
      if (this.spokenFor === 0) this.phraseEndAt = t + LIVE2D_CHAT.phrase[0] + this.random() * (LIVE2D_CHAT.phrase[1] - LIVE2D_CHAT.phrase[0])
      this.spokenFor += dt
      if (t >= this.phraseEndAt) {
        this.beatAt = t; this.beatKind = this.random() < 0.6 ? 0 : 1; this.speakSide = -this.speakSide
        this.phraseEndAt = t + LIVE2D_CHAT.phrase[0] + this.random() * (LIVE2D_CHAT.phrase[1] - LIVE2D_CHAT.phrase[0])
      }
    } else {
      // The answer is over: round it off (more for a long one). Reduced motion stays quiet.
      if (this.spokenFor >= LIVE2D_CHAT.minAnswer && !busy && m >= 0.5) this.pulse('wrap', this.speakSide, this.spokenFor >= LIVE2D_CHAT.longAnswer ? 1.4 : 1)
      this.spokenFor = 0
    }
    this.speakLean = follow(this.speakLean, speaking ? this.speakSide : 0, 0.8, dt)
    if (this.talk > 0.005) {
      const beat = bump((t - this.beatAt) / 0.55), side = this.speakLean
      add(pulses0, this.beatKind === 0 ? { ay: -4.5 * beat, py: -1.2 * beat } : { az: 3.5 * this.speakSide * beat, ay: -1.5 * beat, brow: 0.3 * beat }, this.talk * m)
      add(chat, { px: 3 * side, pz: 1.5 * side, az: -1.2 * side }, this.talk * m)
    }

    // ---- wandering: she swims across (a front-facing rig cannot walk sideways) ---
    // Feet off the ground, her whole figure leaning into the direction of travel in proportion to her speed
    // (head first, feet trailing), head and body turned the same way; hair, skirt and tail trail through the
    // physics. Then a soft landing. Arm poses with the forearm out read as a T-pose here, so the arms hang.
    const walking = Boolean(look.walk) && m > 0
    if (!walking && this.wasWalking) this.landAt = t
    this.wasWalking = walking
    this.travel = follow(this.travel, walking ? clamp(travel, -1, 1) : 0, 0.18, dt)
    const float = this.walk * m, touchdown = bump((t - this.landAt) / 0.55) * m
    if (float > 0.005 || touchdown > 0) {
      const tr = this.travel * float
      add(chat, { ax: 18 * tr, az: 4 * tr, px: 12 * tr, pz: 4 * tr, ex: 0.55 * tr, py: 5 * float - 5 * touchdown, lean: 3 * float + 4 * touchdown, ay: 2 * float - 4 * touchdown, smile: 0.2 * float }, 1)
    }

    // ---- performances after a while of quiet idling ---------------------------
    const watched = pointer !== null && pointer.still < 4
    const quiet = this.idle > 0.9 && m >= 0.5 && !watched && !held && !look.guardChest && !listening
    this.quiet = quiet ? this.quiet + dt : 0
    if (!quiet || (pointer !== null && pointer.still < 0.5)) this.stopPerformance()
    if (!this.performance && !this.event && quiet && this.quiet >= this.nextPerformanceAt) {
      // Not one of the last two, and weighted by the time of day.
      const choices = LIVE2D_PERFORMANCES.filter(def => def.name !== this.lastPerformance && def.name !== this.earlierPerformance)
      const weights = choices.map(def => performanceBias(def.name, hour))
      const pick = () => { let r = this.random() * weights.reduce((a, b) => a + b, 0); for (let i = 0; i < choices.length; i++) { r -= weights[i]; if (r < 0) return choices[i] } return choices[choices.length - 1] }
      // The author's own idle animation comes up often (about one in three) when the model has it.
      const def = this.authorIdle && this.lastPerformance !== 'author' && this.random() < 0.35 ? this.authorIdle : pick()
      this.earlierPerformance = this.lastPerformance
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
    // Left alone for minutes (sooner at night) her eyelids sink and her head droops; any attention wakes her with a start.
    const sleepyAfter = hour !== undefined && (hour >= 23 || hour < 6) ? LIVE2D_DROWSY.night : LIVE2D_DROWSY.day
    const drowsyTarget = quiet ? clamp((this.quiet - sleepyAfter) / LIVE2D_DROWSY.over, 0, 1) : 0
    if (this.wasDrowsy && !quiet && !busy && m >= 0.5) this.pulse('perk', 1)
    this.wasDrowsy = drowsyTarget > 0.5
    this.drowsy = follow(this.drowsy, drowsyTarget, drowsyTarget ? 1.5 : 0.25, dt)
    if (this.drowsy > 0.005) add(perf, { eyeOpen: -0.5 * this.drowsy, ay: -5 * this.drowsy, az: 2 * this.drowsy, py: -2 * this.drowsy, breath: -0.1 * this.drowsy }, m)

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
    } else if (this.idle < 0.6 || m < 0.5 || held || look.guardChest || listening) {
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
    add(events, chat, 1)
    const pulses = pulses0
    this.pulses = this.pulses.filter(p => {
      const u = (t - p.start) / p.def.duration
      if (u >= 1) return false
      add(pulses, p.def.at(p.side, u), Math.max(m, 0.35) * p.gain)
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
    const S = LIVE2D_SPRING
    springTo(this.head, this.headV, 'x', (look.angle?.x ?? 0) + px * 13 + events.ax, S.head, dt)
    springTo(this.head, this.headV, 'y', (look.angle?.y ?? 0) + py * 9 + events.ay, S.head, dt)
    springTo(this.head, this.headV, 'z', (look.angle?.z ?? 0) - px * 2.5 + events.az, S.head, dt)
    // The body turns with part of the head turn (VTube Studio couples them 1:1; that is too much without a person behind it).
    springTo(this.body, this.bodyV, 'x', (look.body?.x ?? 0) + this.head.x * LIVE2D_BODY_FOLLOW + events.px, S.body, dt)
    springTo(this.body, this.bodyV, 'z', (look.body?.z ?? 0) + this.head.z * 0.3 + events.pz, S.body, dt)
    springTo(this.body, this.bodyV, 'y', events.py, S.body, dt)
    springTo(this.body, this.bodyV, 'lean', events.lean, S.body, dt)
    // Arms: the same easing, without overshoot.
    let armSpeed = 0
    for (const key of ['lu', 'lf', 'lw', 'ru', 'rf', 'rw'] as const) { springTo(this.armP, this.armV, key, events[key], S.arm, dt); armSpeed = Math.max(armSpeed, Math.abs(this.armV[key])) }
    const nodded = t - Math.max(this.beatAt, this.listenNodAt, this.thinkHumAt) < 0.7 && t >= this.thinkHumAt

    // ---- oscillators: breathing, base sway, gait, speech, dizziness ----------
    const breath = 0.45 + 0.3 * Math.sin(t * 1.45) * Math.max(0.35, m)
    const speech = this.talk * m * Math.sin(t * 3.1) * Math.abs(Math.sin(t * 1.3))
    const w = this.wobble

    // A native gesture, being carried or covering her chest owns the arms.
    this.armFree = follow(this.armFree, look.gesture || perfGesture || held || look.guardChest || this.armLift > 0.02 ? 0 : 1, 0.2, dt)
    const free = this.armFree * m
    const drive: Live2DDrive = {
      AngleX: this.head.x + pulses.ax + (Math.sin(t * 0.53) * 1.8 + Math.sin(t * 0.17 + 2) * 1.2) * m + Math.sin(t * 7.3) * w,
      AngleY: this.head.y + pulses.ay + Math.sin(t * 0.71 + 1) * 1.1 * m + speech * 1.2 + Math.cos(t * 5.1) * w * 0.6,
      AngleZ: this.head.z + pulses.az + Math.sin(t * 0.41 + 2) * 1.4 * m + Math.sin(t * 6.1 + 1) * w,
      PositionX: this.body.x + pulses.px + Math.sin(t * 0.37 + 0.5) * 1.6 * m,
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
      arms: { lu: this.armP.lu * free, lf: this.armP.lf * free, lw: this.armP.lw * free, ru: this.armP.ru * free, rf: this.armP.rf * free, rw: this.armP.rw * free },
      armLift: this.armLift * m,
      lively: this.pulses.length > 0 || this.performance !== null || held,
      float, touchdown, swimTilt: LIVE2D_SWIM.tilt * this.travel * float, swimBob: Math.sin(t * 2.6) * float,
      // Not while idling alone: the ambient budget stays at the base frame rate.
      moving: m > 0 && (!look.idle || this.listen > 0.05) && (armSpeed > 0.12 || nodded || float > 0.05 || touchdown > 0),
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

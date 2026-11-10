/**
 * Touch gestures on the companion, shared by the desktop widget and the theatre.
 *
 * - Stroking: moving the pointer back and forth over her head is a head pat;
 *   over her tail (Live2D model only) it makes her shy and she dodges.
 * - Poking: quick clicks in a row make her puzzled (3) and then frustrated (6).
 * - Touching her tail again and again annoys her.
 * - Dragging her picks her up: she dangles from the grab point (Dangle).
 *
 * Pure (time is passed in), so it is tested in Node.
 */

import type { Live2DRegion } from './live2d-types.js'

export type TouchRegion = Live2DRegion
/** Ignore click jitter; only intentional movement starts a drag. CSS pixels. */
export const DRAG_THRESHOLD = 10

export type Stroke = 'pat' | 'tail'

/** Direction changes needed, and the cooldown after a stroke is recognised (ms). */
export const STROKE_RULES: Record<Stroke, { turns: number; cooldown: number }> = {
  pat: { turns: 5, cooldown: 4000 },
  // The tail is sensitive: a couple of strokes are enough.
  tail: { turns: 3, cooldown: 3000 },
}
/** A pause longer than this starts the count again (ms). */
export const STROKE_PAUSE = 700
/** Smaller movements are jitter (px). */
export const STROKE_STEP = 8

export class StrokeDetector {
  private x = 0
  private direction = 0
  private turns = 0
  private time = 0
  private region: TouchRegion | null = null
  private cooldown: Partial<Record<Stroke, number>> = {}

  /** Feeds one pointer position over her; returns a stroke when one is recognised. */
  feed(x: number, region: TouchRegion | null, now: number): Stroke | null {
    const stroke: Stroke | null = region === 'head' ? 'pat' : region === 'tail' ? 'tail' : null
    if (region !== this.region) { this.region = region; this.turns = 0; this.direction = 0; this.x = x; this.time = now; return null }
    if (!stroke || now < (this.cooldown[stroke] ?? 0)) return null
    // A pause (no movement at all) restarts the count; slow, small strokes still add up.
    if (now - this.time > STROKE_PAUSE) { this.turns = 0; this.direction = 0; this.x = x }
    this.time = now
    const dx = x - this.x
    if (Math.abs(dx) < STROKE_STEP) return null
    const direction = Math.sign(dx)
    if (direction !== this.direction) this.turns++
    this.x = x; this.direction = direction
    if (this.turns < STROKE_RULES[stroke].turns) return null
    this.turns = 0
    this.cooldown[stroke] = now + STROKE_RULES[stroke].cooldown
    return stroke
  }
}

export const POKE_WINDOW = 2500
export const POKE_COOLDOWN = 4000

export type PokeResult = { first: boolean; mood: '' | 'curious' | 'angry' }

/** Quick clicks in a row: the first one is an ordinary click; 3 puzzle her, 6 frustrate her. */
export class PokeCounter {
  private times: number[] = []
  private cooldown = 0

  tap(now: number): PokeResult {
    this.times = this.times.filter(time => now - time < POKE_WINDOW).concat(now)
    const first = this.times.length === 1 && now >= this.cooldown
    if (now < this.cooldown) return { first, mood: '' }
    if (this.times.length >= 6) { this.times = []; this.cooldown = now + POKE_COOLDOWN; return { first, mood: 'angry' } }
    return { first, mood: this.times.length === 3 ? 'curious' : '' }
  }
}

/** Touching the tail: shy the first times; the third time within 20 s she gets cross. */
export const TAIL_PATIENCE = { count: 3, window: 20000 }

export class TailPatience {
  private times: number[] = []

  touch(now: number): 'shy' | 'angry' {
    this.times = this.times.filter(time => now - time < TAIL_PATIENCE.window).concat(now)
    if (this.times.length < TAIL_PATIENCE.count) return 'shy'
    this.times = []
    return 'angry'
  }
}

/** Head region of an illustration: the middle half of the picture, 3–30% from the top. */
export function illustrationRegion(x: number, y: number, rect: { left: number; top: number; width: number; height: number }): TouchRegion | null {
  const u = (x - rect.left) / rect.width, v = (y - rect.top) / rect.height
  if (u < 0 || u > 1 || v < 0 || v > 1) return null
  return u >= 0.25 && u <= 0.75 && v >= 0.03 && v <= 0.3 ? 'head' : 'body'
}

/**
 * Picked up by the pointer: she hangs from the grab point and swings behind the
 * hand like a pendulum, then settles after she is put down. Angle in degrees,
 * positive = clockwise (her feet trail to the left when the hand moves right).
 */
export const DANGLE = { perSpeed: 0.03, max: 22, stiffness: 50, dampingHeld: 4.5, dampingFree: 3.2, handTau: 0.08 }

/**
 * The carry, as a timeline (PM spec, Gemini 4 Argon): grab → struggle → hang → drop and land.
 * Times in seconds, lengths as a share of her box height unless noted.
 */
export const CARRY = {
  /** She hangs from the back of her collar, whatever spot was grabbed. */
  pivotY: 0.15, maxAngle: 25,
  /** Smoothly attach an arbitrary initial grab to the collar. */
  attachTime: 0.12,
  /** Lifted off the ground: share of her height, clamped in px. */
  lift: 0.07, liftMin: 24, liftMax: 56,
  /** Grab: a quick vertical stretch that springs back. */
  stretchTime: 0.2, stretch: 0.06,
  /** Struggle: small swings of her own until she gives up. */
  struggleFrom: 0.2, struggleUntil: 2.5, struggleDeg: 3,
  /** Drop: falls with gravity (ease-in), then a squash on touchdown. */
  fallTime: 0.18, squashTime: 0.22, squashX: 0.06, squashY: 0.07, squashDrop: 8,
}

/** Squash and stretch for the carry timeline: scale and extra drop (px) at a moment. */
export function carryShape(sinceGrab: number, sinceRelease: number | null, height: number): { sx: number; sy: number; dy: number } {
  if (sinceRelease !== null) {
    const t = sinceRelease - CARRY.fallTime
    if (t < 0 || t > CARRY.squashTime) return { sx: 1, sy: 1, dy: 0 }
    const e = Math.sin(Math.PI * t / CARRY.squashTime)
    // Scaled about the collar, so move down to keep her feet on the ground.
    const sy = 1 - CARRY.squashY * e
    return { sx: 1 + CARRY.squashX * e, sy, dy: CARRY.squashDrop * e + height * (1 - CARRY.pivotY) * (1 - sy) }
  }
  if (sinceGrab > CARRY.stretchTime) return { sx: 1, sy: 1, dy: 0 }
  const e = Math.sin(Math.PI * sinceGrab / CARRY.stretchTime)
  return { sx: 1 - CARRY.stretch * e, sy: 1 + CARRY.stretch * e, dy: 0 }
}

/** Lift height while held (eased by the caller), or during the fall after release (ease-in). */
export function carryLift(target: number, liftAtRelease: number, sinceRelease: number | null): number {
  if (sinceRelease === null) return target
  const u = Math.min(1, sinceRelease / CARRY.fallTime)
  return liftAtRelease * (1 - u * u)
}

/** Her own struggling sway while held (degrees), fading in and out. */
export function carryStruggle(sinceGrab: number): number {
  if (sinceGrab < CARRY.struggleFrom || sinceGrab > CARRY.struggleUntil) return 0
  const fade = Math.min(1, (sinceGrab - CARRY.struggleFrom) / 0.3, (CARRY.struggleUntil - sinceGrab) / 0.4)
  return CARRY.struggleDeg * fade * (Math.sin(sinceGrab * 7.3) * 0.7 + Math.sin(sinceGrab * 12.1) * 0.3)
}

export class Dangle {
  angle = 0
  velocity = 0
  private hand = 0

  /** Re-grabbing preserves the visible angle but removes stale hand/momentum input. */
  grab(): void { this.hand = 0; this.velocity *= 0.3 }

  /** dt in seconds, handVx in px/s. */
  update(dt: number, handVx: number, held: boolean): number {
    dt = Math.min(0.05, Math.max(0, dt))
    this.hand += ((held ? handVx : 0) - this.hand) * (1 - Math.exp(-dt / DANGLE.handTau))
    const target = held ? Math.max(-DANGLE.max, Math.min(DANGLE.max, this.hand * DANGLE.perSpeed)) : 0
    this.velocity += (DANGLE.stiffness * (target - this.angle) - (held ? DANGLE.dampingHeld : DANGLE.dampingFree) * this.velocity) * dt
    this.angle += this.velocity * dt
    return this.angle
  }

  get settled(): boolean { return Math.abs(this.angle) < 0.05 && Math.abs(this.velocity) < 0.05 }
}

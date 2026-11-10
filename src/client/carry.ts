import { CARRY, Dangle, carryLift, carryShape, carryStruggle } from './touch.js'

export interface CarryGrab {
  x: number
  y: number
  /** Distinguishes consecutive grabs even when React batches away the release render. */
  key?: number
  /** Unrotated widget position immediately before attaching it to the pointer. */
  from?: { x: number; y: number }
}
export type CarryPhase = 'idle' | 'grab' | 'struggle' | 'hang' | 'fall' | 'land' | 'settle'
export interface CarryPose {
  phase: CarryPhase
  angle: number
  x: number
  y: number
  sx: number
  sy: number
  pivotX: number
  pivotY: number
  lift: number
  vx: number
  vy: number
  suspended: number
  landing: number
  shadowOpacity: number
  shadowScale: number
}

/** Change a fixed local pivot while preserving the entire rotate/scale/translate image. */
export function carryPivotTranslation(pose: CarryPose, x: number, y: number) {
  const a = pose.angle * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a)
  const dx = pose.pivotX - x, dy = pose.pivotY - y
  return {
    x: pose.x + dx - (cos * pose.sx * dx - sin * pose.sy * dy),
    y: pose.y + dy - (sin * pose.sx * dx + cos * pose.sy * dy),
  }
}

/** One bounded local simulation; no timers, React state, DOM reads or allocations per pointer move. */
export class CarryController {
  readonly pose: CarryPose = { phase: 'idle', angle: 0, x: 0, y: 0, sx: 1, sy: 1, pivotX: 0, pivotY: 0, lift: 0, vx: 0, vy: 0, suspended: 0, landing: 0, shadowOpacity: 0, shadowScale: 1 }
  private readonly pendulum = new Dangle()
  private held = false
  private legMode = false
  private releaseSuspended = 0
  private height = 0
  private liftTarget = 0
  private grabbedAt = 0
  private releasedAt = 0
  private last = 0
  private offset = { x: 0, y: 0 }
  private startShape = { sx: 1, sy: 1, dy: 0 }
  private shape = { sx: 1, sy: 1, dy: 0 }
  private releaseLift = 0
  private hand = { x: 0, y: 0, at: 0, vx: 0, vy: 0 }

  get active(): boolean { return this.pose.phase !== 'idle' }
  get isHeld(): boolean { return this.held }
  setLegMode(enabled: boolean): void { this.legMode = enabled }

  grab(now: number, rect: { left: number; top: number; width: number; height: number }, grab: CarryGrab): void {
    const p = this.pose
    const pivotX = rect.width / 2, pivotY = rect.height * CARRY.pivotY
    const translation = carryPivotTranslation(p, pivotX, pivotY)
    const from = grab.from ?? { x: rect.left, y: rect.top }
    p.x = translation.x + from.x - rect.left
    p.y = translation.y + from.y - rect.top
    p.pivotX = pivotX; p.pivotY = pivotY
    this.offset.x = p.x
    this.offset.y = p.y + p.lift - this.shape.dy
    this.startShape = { ...this.shape }
    this.height = rect.height
    this.liftTarget = Math.max(CARRY.liftMin, Math.min(CARRY.liftMax, rect.height * CARRY.lift))
    this.held = true
    this.grabbedAt = this.last = now
    this.hand.x = grab.x; this.hand.y = grab.y; this.hand.at = now; this.hand.vx = this.hand.vy = 0
    this.pendulum.angle = p.angle // keep the visible struggle angle when re-grabbed
    this.pendulum.grab()
    p.phase = 'grab'
  }

  move(x: number, y: number, now: number): void {
    if (!this.held) return
    const dt = Math.max(8, now - this.hand.at)
    this.hand.vx = Math.max(-3000, Math.min(3000, (x - this.hand.x) / dt * 1000))
    this.hand.vy = Math.max(-3000, Math.min(3000, (y - this.hand.y) / dt * 1000))
    this.hand.x = x; this.hand.y = y; this.hand.at = now
  }

  release(now: number): void {
    if (!this.held) return
    this.held = false
    this.releasedAt = now
    this.pendulum.angle = this.pose.angle
    this.releaseLift = this.pose.lift
    this.releaseSuspended = this.pose.suspended
    this.startShape = { ...this.shape }
    this.pose.phase = 'fall'
  }

  stop(): void {
    this.held = false
    this.pendulum.angle = this.pendulum.velocity = 0
    this.offset.x = this.offset.y = 0
    this.shape = { sx: 1, sy: 1, dy: 0 }
    Object.assign(this.pose, { phase: 'idle', angle: 0, x: 0, y: 0, sx: 1, sy: 1, pivotX: 0, pivotY: 0, lift: 0, vx: 0, vy: 0, suspended: 0, landing: 0, shadowOpacity: 0, shadowScale: 1 })
  }

  tick(now: number): CarryPose {
    const p = this.pose
    if (!this.active) return p
    const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000))
    this.last = now
    const age = Math.max(0, (now - this.grabbedAt) / 1000)
    const released = this.held ? null : Math.max(0, (now - this.releasedAt) / 1000)
    const vx = this.held && now - this.hand.at < 100 ? this.hand.vx : 0
    p.vx = vx; p.vy = this.held && now - this.hand.at < 100 ? this.hand.vy : 0
    const fall = released === null ? 0 : Math.min(1, released / CARRY.fallTime)
    const upright = 1 - fall * fall * (3 - 2 * fall)
    p.angle = Math.max(-CARRY.maxAngle, Math.min(CARRY.maxAngle, (this.pendulum.update(dt, vx, this.held) + (this.held ? carryStruggle(age) : 0)) * upright))
    if (fall >= 1) this.pendulum.angle = this.pendulum.velocity = 0
    p.lift = released === null ? p.lift + (this.liftTarget - p.lift) * (1 - Math.exp(-dt / 0.08)) : carryLift(0, this.releaseLift, released)
    p.suspended = released === null ? p.suspended + (1 - p.suspended) * (1 - Math.exp(-dt / 0.12))
      : this.releaseSuspended * Math.max(0, 1 - Math.min(1, released / CARRY.fallTime) ** 2)
    const contact = released === null ? -1 : (released - CARRY.fallTime) / CARRY.squashTime
    p.landing = contact >= 0 && contact <= 1 ? Math.sin(Math.PI * contact) : 0
    // Live2D legs absorb the landing locally, with planted feet; illustrations retain the soft squash.
    const shape = this.legMode && released !== null ? { sx: 1, sy: 1, dy: 0 } : carryShape(age, released, this.height)
    const blend = Math.min(1, released === null ? age / CARRY.attachTime : released / CARRY.fallTime)
    this.shape = {
      sx: this.startShape.sx * (1 - blend) + shape.sx * blend,
      sy: this.startShape.sy * (1 - blend) + shape.sy * blend,
      dy: this.startShape.dy * (1 - blend) + shape.dy * blend,
    }
    const settle = Math.exp(-dt / (this.held ? 0.08 : 0.16))
    this.offset.x *= settle; this.offset.y *= settle
    p.x = this.offset.x; p.y = this.offset.y - p.lift + this.shape.dy
    p.sx = this.shape.sx; p.sy = this.shape.sy
    p.phase = released === null ? age < CARRY.stretchTime ? 'grab' : age < CARRY.struggleUntil ? 'struggle' : 'hang'
      : released < CARRY.fallTime ? 'fall' : released < CARRY.fallTime + CARRY.squashTime ? 'land' : 'settle'
    p.shadowOpacity = 0.2 * (1 - 0.65 * p.lift / Math.max(1, this.liftTarget))
    p.shadowScale = 1 - 0.4 * p.lift / Math.max(1, this.liftTarget)
    if (!this.held && p.phase === 'settle' && this.pendulum.settled && Math.hypot(this.offset.x, this.offset.y) < 0.2) this.stop()
    return p
  }
}

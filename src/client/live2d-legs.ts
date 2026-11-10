/** Small, reversible pose offsets on the existing leg meshes; no model assets or extra renderer. */
export interface LegMesh {
  index: number
  /** -1 screen-left, +1 screen-right. */
  side: -1 | 1
  vertices: Float32Array
}

export const LEG_POSE = {
  hip: 0.92, knee: 0.42, ankle: 0.10,
  kneeIn: 0.025, footOut: 0.008, kneeLift: 0.015, footLift: 0.025,
  landingDrop: 0.055, landingKneeSide: 0.025, landingKneeIn: 0.006,
} as const

export class LegPoseLayer {
  private readonly meshes: { mesh: LegMesh; base: Float32Array; weights: Float32Array }[] = []
  private dirty = false
  private restored = false
  private span = 0

  constructor(meshes: readonly LegMesh[], private readonly markChanged: (index: number) => void = () => {}) {
    let min = Infinity, max = -Infinity
    for (const {vertices} of meshes) for (let i = 1; i < vertices.length; i += 2) { min = Math.min(min, vertices[i]); max = Math.max(max, vertices[i]) }
    if (!Number.isFinite(min) || max - min < 0.001) return
    this.span = max - min
    const hip = min + this.span * LEG_POSE.hip, knee = min + this.span * LEG_POSE.knee, ankle = min + this.span * LEG_POSE.ankle
    const ease = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u*u*(3-2*u) }
    for (const mesh of meshes) {
      const weights = new Float32Array(mesh.vertices.length)
      for (let i = 0; i < weights.length; i += 2) {
        const y = mesh.vertices[i + 1]
        if (y >= hip) continue
        if (y >= knee) weights[i] = ease((hip - y) / (hip - knee))
        else { const t = ease((knee - y) / (knee - ankle)); weights[i] = 1 - t; weights[i + 1] = t }
      }
      this.meshes.push({mesh, base: new Float32Array(mesh.vertices.length), weights})
    }
  }

  get available(): boolean { return this.meshes.length > 0 }

  /** Restore before Core updates; its output must never become the next pose's input. */
  restore(): void {
    if (!this.dirty) return
    for (const {mesh,base} of this.meshes) mesh.vertices.set(base)
    this.dirty = false
    this.restored = true
  }

  /** Call after Core updates. Return a global body drop, with the feet compensated locally. */
  apply(suspended: number, landing: number): number {
    // Also safe for isolated previews calling apply twice without a Core update.
    this.restore()
    const held = Math.max(0, Math.min(1, suspended)), land = Math.max(0, Math.min(1, landing))
    if (!this.meshes.length) return 0
    if (held < 0.0001 && land < 0.0001) {
      if (this.restored) for (const {mesh} of this.meshes) this.markChanged(mesh.index)
      this.restored = false
      return 0
    }
    const drop = this.span * LEG_POSE.landingDrop * land
    const kneeY = this.span * LEG_POSE.kneeLift * held + drop * 0.55
    const ankleY = this.span * LEG_POSE.footLift * held + drop
    for (const {mesh,base,weights} of this.meshes) {
      const kneeX = this.span * (-mesh.side * LEG_POSE.kneeIn * held + (LEG_POSE.landingKneeSide - mesh.side * LEG_POSE.landingKneeIn) * land)
      const ankleX = this.span * mesh.side * LEG_POSE.footOut * held
      base.set(mesh.vertices)
      for (let i = 0; i < base.length; i += 2) {
        const k = weights[i], a = weights[i + 1]
        mesh.vertices[i] = base[i] + k * kneeX + a * ankleX
        mesh.vertices[i + 1] = base[i + 1] + k * kneeY + a * ankleY
      }
      this.markChanged(mesh.index)
    }
    this.dirty = true
    this.restored = false
    return drop
  }
}

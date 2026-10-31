/**
 * Display calibration for the character artwork.
 *
 * Source PNGs have different canvas sizes, aspect ratios and transparent
 * margins. Rendering every canvas at the same CSS height made some poses
 * (notably sajiao) look smaller, and the old `max-width: 280px` shrank the
 * wider canvases further. Each pose now renders inside one shared stage box,
 * anchored at the feet (bottom centre), with a per-pose `scale` chosen so the
 * head (headdress top to chin, cross-checked with eye spacing) matches Maid
 * within roughly 3%. The artwork itself is never edited or cropped.
 *
 * `aspect` is the canvas width / height. Re-measure after replacing artwork
 * (see scripts/generate-hitareas.py for the alpha-envelope helper).
 */
export interface PoseMeta { aspect: number; scale: number }

export const POSE_META: Record<string, PoseMeta> = {
  Maid: { aspect: 937 / 1679, scale: 1 },
  sajiao: { aspect: 1070 / 1774, scale: 1 },
  Answering: { aspect: 637 / 1024, scale: 0.97 },
  baifan: { aspect: 1632 / 2624, scale: 0.985 },
  getit: { aspect: 1092 / 1764, scale: 0.97 },
  Think1: { aspect: 1440 / 2912, scale: 1.01 },
  Think2: { aspect: 937 / 1678, scale: 0.99 },
  Think3: { aspect: 937 / 1678, scale: 0.96 },
  Think4: { aspect: 1632 / 2624, scale: 1.03 },
  Think5: { aspect: 1632 / 2624, scale: 1.03 },
  Dizzy: { aspect: 1024 / 1536, scale: 0.96 },
  DaFeiYu: { aspect: 1, scale: 0.46 },
}

/** Stage width relative to its height; wide enough for every maiden pose at its calibrated scale. */
export const STAGE_ASPECT = 0.64

/** Base character height before the user's size step: up to 480px, never more than 60% of the viewport. */
export function baseSpriteHeight(viewportHeight: number): number {
  return Math.round(Math.max(220, Math.min(480, viewportHeight * 0.6)))
}

export interface SpriteGeometry {
  /** Shared stage box (layout, collision and hit-test container). */
  stageWidth: number
  stageHeight: number
  /** Rendered image box inside the stage, anchored bottom-centre. */
  imageWidth: number
  imageHeight: number
  imageLeft: number
}

export function spriteGeometry(pose: string, viewportHeight: number, userScale: number): SpriteGeometry {
  const meta = POSE_META[pose] ?? POSE_META.Maid
  const stageHeight = Math.round(baseSpriteHeight(viewportHeight) * userScale)
  const stageWidth = Math.round(stageHeight * STAGE_ASPECT)
  const imageHeight = Math.round(stageHeight * meta.scale)
  const imageWidth = Math.round(imageHeight * meta.aspect)
  return { stageWidth, stageHeight, imageWidth, imageHeight, imageLeft: Math.round((stageWidth - imageWidth) / 2) }
}

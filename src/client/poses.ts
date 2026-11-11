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
/** `content`: opaque width as a fraction of the canvas when the artwork has wide transparent side margins. */
export interface PoseMeta { aspect: number; scale: number; content?: number }

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
  // v0.6.0 expressions (same 1024×1536 framing; head measured against Maid).
  smug: { aspect: 1024 / 1536, scale: 1.03, content: 0.764 },
  shy: { aspect: 1024 / 1536, scale: 0.98, content: 0.811 },
  angry: { aspect: 1024 / 1536, scale: 1.03, content: 0.754 },
  surprised: { aspect: 1024 / 1536, scale: 1.03, content: 0.818 },
  proud: { aspect: 1024 / 1536, scale: 1.03, content: 0.789 },
  happy: { aspect: 1024 / 1536, scale: 1.03, content: 0.766 },
  DaFeiYu: { aspect: 1, scale: 0.46 },
  // v0.7.0: picked up (arms up, feet dangling; head measured against Maid) and peeking from the right edge
  // (cropped so the right side of the picture is the edge she holds; a close-up, so a small scale).
  carry: { aspect: 752 / 1448, scale: 0.97 },
  peek: { aspect: 419 / 758, scale: 0.46 },
}

/**
 * The imported Live2D model is not an illustration, so it is kept out of POSE_META.
 * `aspect` is the runtime's framing of 大肥鱼 (replaced by the measured value once it loads);
 * `scale` matches her head size to Maid's.
 */
export const LIVE2D_POSE_META: PoseMeta = { aspect: 0.5773, scale: 1 }

/** Pose metadata for the Live2D model with its measured aspect. */
export function live2dPoseMeta(aspect: number | null): PoseMeta {
  return { ...LIVE2D_POSE_META, aspect: aspect && aspect > 0.2 && aspect < 2 ? aspect : LIVE2D_POSE_META.aspect }
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

export function spriteGeometry(pose: string, viewportHeight: number, userScale: number, override?: PoseMeta): SpriteGeometry {
  const meta = override ?? POSE_META[pose] ?? POSE_META.Maid
  const stageHeight = Math.round(baseSpriteHeight(viewportHeight) * userScale)
  const stageWidth = Math.round(stageHeight * STAGE_ASPECT)
  const imageHeight = Math.round(stageHeight * meta.scale)
  const imageWidth = Math.round(imageHeight * meta.aspect)
  return { stageWidth, stageHeight, imageWidth, imageHeight, imageLeft: Math.round((stageWidth - imageWidth) / 2) }
}

/** Fit the full desktop model inside the viewport; illustration sizing is unchanged. */
export function live2dWidgetGeometry(width: number, height: number, scale: number, aspect: number | null): SpriteGeometry {
  const safeScale = Math.min(scale, Math.max(0.1, height - 96) / baseSpriteHeight(height), Math.max(0.1, width - 32) / (baseSpriteHeight(height) * STAGE_ASPECT))
  return spriteGeometry('Live2D', height, safeScale, live2dPoseMeta(aspect))
}

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
export interface PoseMeta {
    aspect: number;
    scale: number;
}
export declare const POSE_META: Record<string, PoseMeta>;
/** Stage width relative to its height; wide enough for every maiden pose at its calibrated scale. */
export declare const STAGE_ASPECT = 0.64;
/** Base character height before the user's size step: up to 480px, never more than 60% of the viewport. */
export declare function baseSpriteHeight(viewportHeight: number): number;
export interface SpriteGeometry {
    /** Shared stage box (layout, collision and hit-test container). */
    stageWidth: number;
    stageHeight: number;
    /** Rendered image box inside the stage, anchored bottom-centre. */
    imageWidth: number;
    imageHeight: number;
    imageLeft: number;
}
export declare function spriteGeometry(pose: string, viewportHeight: number, userScale: number): SpriteGeometry;
//# sourceMappingURL=poses.d.ts.map
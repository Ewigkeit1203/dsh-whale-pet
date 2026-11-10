export const POSE_META = {
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
};
/**
 * The imported Live2D model is not an illustration, so it is kept out of POSE_META.
 * `aspect` is the runtime's framing of 大肥鱼 (replaced by the measured value once it loads);
 * `scale` matches her head size to Maid's.
 */
export const LIVE2D_POSE_META = { aspect: 0.5773, scale: 1 };
/** Pose metadata for the Live2D model with its measured aspect. */
export function live2dPoseMeta(aspect) {
    return { ...LIVE2D_POSE_META, aspect: aspect && aspect > 0.2 && aspect < 2 ? aspect : LIVE2D_POSE_META.aspect };
}
/** Stage width relative to its height; wide enough for every maiden pose at its calibrated scale. */
export const STAGE_ASPECT = 0.64;
/** Base character height before the user's size step: up to 480px, never more than 60% of the viewport. */
export function baseSpriteHeight(viewportHeight) {
    return Math.round(Math.max(220, Math.min(480, viewportHeight * 0.6)));
}
export function spriteGeometry(pose, viewportHeight, userScale, override) {
    const meta = override ?? POSE_META[pose] ?? POSE_META.Maid;
    const stageHeight = Math.round(baseSpriteHeight(viewportHeight) * userScale);
    const stageWidth = Math.round(stageHeight * STAGE_ASPECT);
    const imageHeight = Math.round(stageHeight * meta.scale);
    const imageWidth = Math.round(imageHeight * meta.aspect);
    return { stageWidth, stageHeight, imageWidth, imageHeight, imageLeft: Math.round((stageWidth - imageWidth) / 2) };
}
/** Fit the full desktop model inside the viewport; illustration sizing is unchanged. */
export function live2dWidgetGeometry(width, height, scale, aspect) {
    const safeScale = Math.min(scale, Math.max(0.1, height - 96) / baseSpriteHeight(height), Math.max(0.1, width - 32) / (baseSpriteHeight(height) * STAGE_ASPECT));
    return spriteGeometry('Live2D', height, safeScale, live2dPoseMeta(aspect));
}
//# sourceMappingURL=poses.js.map
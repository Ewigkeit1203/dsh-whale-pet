/**
 * Anchors measured on each artwork, one entry per pose (mood-mark placement and the cloth sway).
 *
 * All values are fractions of the source image (x of width, y of height):
 *  - face: the visible skin of the face [left, top, right, chin];
 *  - top / bottom: the first and last opaque rows (headdress to shoes).
 *
 * Measured from the alpha and skin masks. Re-measure after replacing artwork.
 */
export interface RigPose {
    face: [number, number, number, number];
    top: number;
    bottom: number;
}
export declare const POSE_RIG: Record<string, RigPose>;
/** Rig for a pose, falling back to Maid's proportions for unknown artwork. */
export declare function poseRig(pose: string): RigPose;
//# sourceMappingURL=rig.d.ts.map
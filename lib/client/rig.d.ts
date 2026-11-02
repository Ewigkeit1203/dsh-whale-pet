/**
 * Rig anchors for the live (Live2D-style) portrait, one entry per artwork.
 *
 * All values are fractions of the source image (x of width, y of height):
 *  - face: the visible skin of the face [left, top, right, chin];
 *  - top / bottom: the first and last opaque rows (headdress to shoes);
 *  - eyes: open eyes only, as [centre x, centre y, width, height]. Poses whose
 *    eyes are closed, hidden or stylised (><, spirals) have none and never blink.
 *
 * Faces and extents were measured from the alpha and skin masks; eyes were
 * calibrated by hand on a pixel grid. Re-measure after replacing artwork.
 */
export interface RigPose {
    face: [number, number, number, number];
    top: number;
    bottom: number;
    eyes: Array<[number, number, number, number]>;
}
export declare const POSE_RIG: Record<string, RigPose>;
/** Rig for a pose, falling back to Maid's proportions for unknown artwork. */
export declare function poseRig(pose: string): RigPose;
//# sourceMappingURL=rig.d.ts.map
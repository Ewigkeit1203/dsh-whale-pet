/**
 * Live2D looks for each companion pose.
 *
 * The rest of the plugin already decides which illustration to show (thinking,
 * rice, dizzy, the v0.6.0 expressions …). With the Live2D model imported, the
 * same pose name is turned into a look: the model's own toggles (Exp3 files
 * such as 加载, 钢盆 and 圈圈眼) plus head, eye and mouth targets, because
 * the model was rigged for VTube Studio face tracking and has no camera here.
 * How those targets become motion (gaze, idle events, gait, touch pulses,
 * native gestures) is live2d-motion.ts.
 */
import type { PetState } from './types.js';
import type { Live2DLook } from './live2d-types.js';
export declare const LIVE2D_LOOKS: Record<string, Live2DLook>;
export interface Live2DLookContext {
    /** Late at night while idle: heavy eyelids. */
    sleepy?: boolean;
    state?: PetState;
    /** Being carried by the pointer. */
    held?: boolean;
    heldKey?: number;
    guardChest?: boolean;
    edgePeek?: boolean;
}
/** Look for a pose name from PetOverlay's resolveCharacter(); unknown poses stay neutral. */
export declare function live2dLookFor(pose: string, context?: Live2DLookContext): Live2DLook;
//# sourceMappingURL=live2d-look.d.ts.map
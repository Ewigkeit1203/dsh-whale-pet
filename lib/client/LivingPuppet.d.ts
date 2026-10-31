import React from 'react';
import type { PetState, GazeOffset } from './types.js';
export interface LivingPuppetProps {
    imgSrc: string;
    isMaiden: boolean;
    isGalGameMode: boolean;
    mouthOpenRatio: number;
    /** Unused: gaze is applied through CSS variables. Kept optional for compatibility. */
    gazeOffset?: GazeOffset;
    state: PetState;
    poseName?: string;
    opacity?: number;
    /** Explicit image box from poses.ts (desktop widget). The theatre sizes via CSS variables instead. */
    box?: {
        width: number;
        height: number;
        left: number;
    };
    /** Calibrated head-size factor, consumed by theatre CSS as --pose-scale. */
    poseScale?: number;
    onMouseDown?: (e: React.MouseEvent) => void;
}
/**
 * Two transform layers: the root carries gaze parallax, the canvas carries
 * breathing/talking. The image itself is sized, never transformed, so the
 * clip-path hit area always matches what is drawn.
 */
export declare function LivingPuppet({ imgSrc, isMaiden, isGalGameMode, mouthOpenRatio, state, onMouseDown, opacity, poseName, box, poseScale }: LivingPuppetProps): React.JSX.Element;
//# sourceMappingURL=LivingPuppet.d.ts.map
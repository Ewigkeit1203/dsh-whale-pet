import React from 'react';
import type { PetState, GazeOffset } from './types.js';
export interface LivingPuppetProps {
    imgSrc: string;
    isMaiden: boolean;
    isGalGameMode: boolean;
    mouthOpenRatio: number;
    gazeOffset: GazeOffset;
    state: PetState;
    poseName?: string;
    opacity?: number;
    onMouseDown?: (e: React.MouseEvent) => void;
}
export declare function LivingPuppet({ imgSrc, isMaiden, isGalGameMode, mouthOpenRatio, gazeOffset, state, onMouseDown, opacity, poseName, }: LivingPuppetProps): React.JSX.Element;
//# sourceMappingURL=LivingPuppet.d.ts.map
import { type Stroke, type TouchRegion } from './touch.js';
import { type CarryGrab } from './carry.js';
import React from 'react';
import type { Live2DLook, Live2DSource } from './live2d-types.js';
import type { PetState } from './types.js';
import type { Emote } from './emotion.js';
export interface LivingPuppetProps {
    imgSrc: string;
    isMaiden: boolean;
    isGalGameMode: boolean;
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
    /** Swaying clothes through WebGL; the <img> stays for hit testing and as the fallback. */
    live?: boolean;
    /** 0 keeps the clothes still (reduced motion). */
    motion?: number;
    /** Mood mark above her head; a new key replays its animation. */
    emote?: Emote;
    emoteKey?: number;
    onMouseDown?: (e: React.MouseEvent, region?: TouchRegion | null) => void;
    /** Pointer attachment plus the previous widget position, for a smooth collar pickup. */
    held?: CarryGrab | null;
    /** Strokes over her head or tail, and (in the theatre) clicks on her. side: +1 when the hand is to her right on screen. */
    onTouch?: (touch: PuppetTouch) => void;
    /** Imported Live2D model; the illustration shows until the model's first frame, and again if it fails. */
    live2d?: Live2DBinding;
}
export interface PuppetTouch {
    kind: Stroke | 'poke' | 'chest';
    side: number;
}
export interface Live2DBinding {
    /** Theatre zoom; widget size is handled by its collision-aware geometry. */
    scale?: number;
    source: Live2DSource;
    look: Live2DLook;
    /** Width / height of the framed model, used for the box the next time (reported once ready). */
    onReady?: (aspect: number) => void;
    onFail?: (reason: string) => void;
}
export declare function LivingPuppet({ imgSrc, isMaiden, isGalGameMode, state, onMouseDown, onTouch, held, opacity, poseName, box, poseScale, live, motion, emote, emoteKey, live2d }: LivingPuppetProps): React.JSX.Element;
//# sourceMappingURL=LivingPuppet.d.ts.map
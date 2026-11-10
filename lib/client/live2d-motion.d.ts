/**
 * How 大肥鱼 moves when there is no camera.
 *
 * The model was rigged for VTube Studio face tracking. Its physics reads a few
 * "semantic" inputs (AngleX/Y/Z, PositionX/Y/Z, LeanInput, ParamBreath) and
 * turns them into head, body, hips, legs, arms, hair and skirt. Parameters such
 * as ParamAngleX, ParamBodyAngleX, HipAngle*, LEGAngleZ2, LArm or ShockL are
 * physics outputs: anything written to them is overwritten by the physics in
 * the same frame. So this module only produces those inputs, and the runtime
 * writes them before the physics runs (see live2d/runtime.ts).
 *
 * Three layers, all in the inputs' own units (degrees, -30..30):
 * - attention: eyes reach the pointer first (~90 ms), the head follows
 *   (~300 ms), the body follows the head (~650 ms) with part of its turn;
 * - occasional idle events (shift weight, lean in, stretch, glance …) with a
 *   smooth start and end, rests of 6–15 s and no event twice in a row;
 * - after a while idle with nobody watching, longer performances like an
 *   idle animation (playing with the foxtail, dozing off, humming …), which
 *   stop as soon as the pointer moves;
 * - short pulses for touch reactions (startle, nod, huff, pat, dodge).
 * Breathing, a very small base sway and a gentle gliding sway are added on top.
 *
 * Pure and deterministic for a given seed, so it is tested in Node.
 */
import type { Live2DLook, Live2DPulse } from './live2d-types.js';
export type { Live2DPulse };
/** Values written to the model each frame (semantic physics inputs plus eyes). */
export interface Live2DDrive {
    AngleX: number;
    AngleY: number;
    AngleZ: number;
    PositionX: number;
    PositionY: number;
    PositionZ: number;
    LeanInput: number;
    ParamBreath: number;
    ParamEyeBallX: number;
    ParamEyeBallY: number;
    /** Additive face offsets for the runtime to combine with the look. */
    smile: number;
    brow: number;
    /** Added to the eye-open multiplier (negative squints). */
    eyeOpen: number;
    /** Mouth opening the performance wants (yawning, humming), 0..1. */
    mouth: number;
    /** Hand gesture a performance holds (the look's own gesture wins). */
    gesture: Live2DGesture | null;
    /** Chest-cover weight (0..1); the runtime puts her left hand to her chest with the rig's animation inputs. */
    armCover: number;
    /** Carried: how far the paws are up (0..1); they flap while she struggles and drop once she gives up. */
    armLift: number;
    /** True while something quick is moving (pulse or performance): worth a higher frame rate. */
    lively: boolean;
    /** Name of the idle event in progress, for tests and debugging. */
    event: string;
    /** Name of the performance in progress ('author' is the model's own tracking-lost animation). */
    performance: string;
    /** Seconds into the performance and how strongly it shows (0..1), for clips the runtime samples. */
    performanceTime: number;
    performanceWeight: number;
}
export interface Live2DDriveInput {
    dt: number;
    /** A local leg pose owns touchdown; avoid adding the legacy whole-body landing pulse. */
    landingHandled?: boolean;
    /** 1 = full motion, 0 = reduced motion. */
    motion: number;
    look: Live2DLook;
    /** Pointer relative to her face, -1..1 (y up), and seconds since it last moved; null when there is none. */
    pointer: {
        x: number;
        y: number;
        still: number;
    } | null;
    /** 0..1 while text is being spoken. */
    talking: number;
}
export declare const LIVE2D_TAU: {
    eye: number;
    head: number;
    body: number;
};
/** Share of the head turn that the body (PositionX/Z) follows. */
export declare const LIVE2D_BODY_FOLLOW = 0.45;
export declare const LIVE2D_REST: readonly [6, 15];
/** Seconds held before she stops struggling and lets her arms hang (PetOverlay turns flustered at 2.5 s too). */
export declare const LIVE2D_GIVE_UP_AFTER: number;
/** Seconds of quiet idling before the first performance, and the gap between performances. */
export declare const LIVE2D_PERFORMANCE_AFTER = 45;
export declare const LIVE2D_PERFORMANCE_GAP: readonly [40, 80];
type Offsets = Partial<Record<'ax' | 'ay' | 'az' | 'px' | 'py' | 'pz' | 'lean' | 'breath' | 'ex' | 'ey' | 'smile' | 'brow' | 'eyeOpen' | 'gaze' | 'mouth', number>>;
interface IdleEventDef {
    name: string;
    duration: readonly [number, number];
    /** Offsets at full strength for a side (+1 / -1); the envelope fades them in and out. */
    at(side: number, u: number): Offsets;
}
export declare const LIVE2D_IDLE_EVENTS: readonly IdleEventDef[];
interface PerformanceDef {
    name: string;
    duration: number;
    /** Offsets at `t` seconds into the performance, plus the gesture to hold. */
    at(t: number, side: number): {
        o: Offsets;
        gesture?: Live2DGesture;
    };
}
export declare const LIVE2D_PERFORMANCES: readonly PerformanceDef[];
interface PulseDef {
    duration: number;
    at(side: number, u: number): Offsets;
}
export declare const LIVE2D_PULSES: Record<Live2DPulse, PulseDef>;
/** Same pulse again within this time is ignored (repeated pokes would otherwise jitter). */
export declare const LIVE2D_PULSE_COOLDOWN = 1.6;
/** Small deterministic generator (mulberry32). */
export declare function live2dRandom(seed: number): () => number;
export declare class Live2DDriver {
    private time;
    private random;
    private eye;
    private head;
    private body;
    private walk;
    private idle;
    private wobble;
    private talk;
    private event;
    private nextEventAt;
    private lastEvent;
    private pulses;
    private pulseAt;
    /** Seconds of quiet idling (idle, full motion, nobody moving the pointer). */
    private quiet;
    private nextPerformanceAt;
    private lastPerformance;
    private performance;
    private performanceWeight;
    private authorIdle;
    /** Picked up: how long, and the overlay's swing angle. */
    private wasHeld;
    private heldKey;
    private dangle;
    private hand;
    private carryHand;
    private carryWeight;
    private heldFor;
    private armLift;
    private coverWeight;
    constructor(seed?: number);
    /** Starts a touch reaction (side: where the touch came from, +1 right / -1 left); ignored while the same one is cooling down. */
    pulse(kind: Live2DPulse, side?: number): boolean;
    /** Swing angle while she is carried (degrees); the canvas itself is rotated by the overlay. */
    setDangle(angle: number, velocity?: {
        x: number;
        y: number;
    }): void;
    /** The model's own "tracking lost" idle animation (脱捕), sampled by the runtime; 0 removes it. */
    setAuthorIdle(duration: number): void;
    private stopPerformance;
    update({ dt, motion, look, pointer, talking, landingHandled }: Live2DDriveInput): Live2DDrive;
}
/** Enter / exit animations shipped with the model, by gesture. */
export declare const LIVE2D_GESTURES: {
    readonly chest: {
        readonly enter: "默认手切举手";
        readonly exit: "举手切默认手";
        readonly fallback: "";
    };
    readonly point: {
        readonly enter: "竖手指切出来动画";
        readonly exit: "竖手指切回默认";
        readonly fallback: "竖食指开";
    };
    readonly grass: {
        readonly enter: "狗尾草切换出来";
        readonly exit: "狗尾草切回默认手";
        readonly fallback: "";
    };
};
export type Live2DGesture = keyof typeof LIVE2D_GESTURES;
/** File names (without .motion3.json) the importer keeps. */
export declare const LIVE2D_GESTURE_FILES: readonly string[];
/** The author's idle animation for when VTube Studio loses tracking (大肥鱼.vtube.json IdleAnimationWhenTrackingLost). */
export declare const LIVE2D_AUTHOR_IDLE = "\u8131\u6355";
/** Animation files (without .motion3.json) the importer keeps besides IDLE. */
export declare const LIVE2D_MOTION_FILES: readonly string[];
export interface MotionCurve {
    id: string;
    segments: readonly number[];
}
export interface MotionClip {
    duration: number;
    curves: MotionCurve[];
}
/** Parameter curves of a motion3.json (other targets such as part opacity are ignored). */
export declare function parseMotionClip(json: unknown): MotionClip | null;
/** Pacing and simulation have separate clocks: scheduling remainder is never simulated twice. */
export declare class Live2DFrameClock {
    private paceAt;
    private drawnAt;
    reset(now: number): void;
    tick(now: number, fps: number): number | null;
}
/** Value of a motion3 curve at time t (linear, bezier, stepped and inverse stepped segments). */
export declare function sampleMotionCurve(segments: readonly number[], t: number): number;
/**
 * One gesture at a time: enter plays once and holds its last frame; a change
 * plays the current gesture's exit (from the matching point if it was still
 * entering) before the next one enters.
 */
export declare class Live2DGesturePlayer {
    private durations;
    current: Live2DGesture | null;
    phase: 'none' | 'enter' | 'hold' | 'exit';
    time: number;
    private wanted;
    constructor(durations: (gesture: Live2DGesture, part: 'enter' | 'exit') => number);
    want(gesture: Live2DGesture | null): void;
    /** Advances and returns which clip to sample and at what time, or null when the arms are at rest. */
    update(dt: number): {
        gesture: Live2DGesture;
        part: 'enter' | 'exit';
        time: number;
    } | null;
}
/** Calibrated on this model: increasing these mirrored forearm channels takes
 * screen-left clockwise / screen-right counterclockwise, without circling inward.
 * The negative route can reach a similar end pose after almost a full wrong-way turn.
 */
export declare function carryArmPose(progress: number, time: number): {
    leftUpper: number;
    leftForearm: number;
    rightUpper: number;
    rightForearm: number;
};
//# sourceMappingURL=live2d-motion.d.ts.map
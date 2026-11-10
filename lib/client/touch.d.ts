/**
 * Touch gestures on the companion, shared by the desktop widget and the theatre.
 *
 * - Stroking: moving the pointer back and forth over her head is a head pat;
 *   over her tail (Live2D model only) it makes her shy and she dodges.
 * - Poking: quick clicks in a row make her puzzled (3) and then frustrated (6).
 * - Touching her tail again and again annoys her.
 * - Dragging her picks her up: she dangles from the grab point (Dangle).
 *
 * Pure (time is passed in), so it is tested in Node.
 */
import type { Live2DRegion } from './live2d-types.js';
export type TouchRegion = Live2DRegion;
/** Ignore click jitter; only intentional movement starts a drag. CSS pixels. */
export declare const DRAG_THRESHOLD = 10;
export type Stroke = 'pat' | 'tail';
/** Direction changes needed, and the cooldown after a stroke is recognised (ms). */
export declare const STROKE_RULES: Record<Stroke, {
    turns: number;
    cooldown: number;
}>;
/** A pause longer than this starts the count again (ms). */
export declare const STROKE_PAUSE = 700;
/** Smaller movements are jitter (px). */
export declare const STROKE_STEP = 8;
export declare class StrokeDetector {
    private x;
    private direction;
    private turns;
    private time;
    private region;
    private cooldown;
    /** Feeds one pointer position over her; returns a stroke when one is recognised. */
    feed(x: number, region: TouchRegion | null, now: number): Stroke | null;
}
export declare const POKE_WINDOW = 2500;
export declare const POKE_COOLDOWN = 4000;
export type PokeResult = {
    first: boolean;
    mood: '' | 'curious' | 'angry';
};
/** Quick clicks in a row: the first one is an ordinary click; 3 puzzle her, 6 frustrate her. */
export declare class PokeCounter {
    private times;
    private cooldown;
    tap(now: number): PokeResult;
}
/** Touching the tail: shy the first times; the third time within 20 s she gets cross. */
export declare const TAIL_PATIENCE: {
    count: number;
    window: number;
};
export declare class TailPatience {
    private times;
    touch(now: number): 'shy' | 'angry';
}
/** Head region of an illustration: the middle half of the picture, 3–30% from the top. */
export declare function illustrationRegion(x: number, y: number, rect: {
    left: number;
    top: number;
    width: number;
    height: number;
}): TouchRegion | null;
/**
 * Picked up by the pointer: she hangs from the grab point and swings behind the
 * hand like a pendulum, then settles after she is put down. Angle in degrees,
 * positive = clockwise (her feet trail to the left when the hand moves right).
 */
export declare const DANGLE: {
    perSpeed: number;
    max: number;
    stiffness: number;
    dampingHeld: number;
    dampingFree: number;
    handTau: number;
};
/**
 * The carry, as a timeline (PM spec, Gemini 4 Argon): grab → struggle → hang → drop and land.
 * Times in seconds, lengths as a share of her box height unless noted.
 */
export declare const CARRY: {
    /** She hangs from the back of her collar, whatever spot was grabbed. */
    pivotY: number;
    maxAngle: number;
    /** Smoothly attach an arbitrary initial grab to the collar. */
    attachTime: number;
    /** Lifted off the ground: share of her height, clamped in px. */
    lift: number;
    liftMin: number;
    liftMax: number;
    /** Grab: a quick vertical stretch that springs back. */
    stretchTime: number;
    stretch: number;
    /** Struggle: small swings of her own until she gives up. */
    struggleFrom: number;
    struggleUntil: number;
    struggleDeg: number;
    /** Drop: falls with gravity (ease-in), then a squash on touchdown. */
    fallTime: number;
    squashTime: number;
    squashX: number;
    squashY: number;
    squashDrop: number;
};
/** Squash and stretch for the carry timeline: scale and extra drop (px) at a moment. */
export declare function carryShape(sinceGrab: number, sinceRelease: number | null, height: number): {
    sx: number;
    sy: number;
    dy: number;
};
/** Lift height while held (eased by the caller), or during the fall after release (ease-in). */
export declare function carryLift(target: number, liftAtRelease: number, sinceRelease: number | null): number;
/** Her own struggling sway while held (degrees), fading in and out. */
export declare function carryStruggle(sinceGrab: number): number;
export declare class Dangle {
    angle: number;
    velocity: number;
    private hand;
    /** Re-grabbing preserves the visible angle but removes stale hand/momentum input. */
    grab(): void;
    /** dt in seconds, handVx in px/s. */
    update(dt: number, handVx: number, held: boolean): number;
    get settled(): boolean;
}
//# sourceMappingURL=touch.d.ts.map
/** Contract between the companion UI and the Live2D runtime (live2d/runtime.ts). */
/** Files of one imported model, keyed by their path relative to the model3.json. */
export interface Live2DSource {
    modelPath: string;
    read(path: string): Promise<ArrayBuffer | null>;
    image(path: string): Promise<ImageBitmap | null>;
    /** Exp3 files (path → toggle name) that are not referenced by the model3.json. */
    expressions: Record<string, string>;
    /** Motion that loops while idle (path), if any. */
    idleMotion?: string;
    /** Gesture and idle animations (file name without .motion3.json → path); absent in older imports. */
    motions?: Record<string, string>;
}
/** Short touch reactions (live2d-motion.ts). */
export type Live2DPulse = 'startle' | 'nod' | 'huff' | 'pat' | 'dodge' | 'land' | 'perk' | 'wrap';
/** Parts of her that react to touch. */
export type Live2DRegion = 'head' | 'tail' | 'chest' | 'body';
/** What she is doing; every field is a target that the runtime eases towards. */
export interface Live2DLook {
    /** Exp3 toggle names to switch on (钢盆, 加载 …); all others fade out. */
    toggles?: readonly string[];
    /** Head angle offsets in degrees (x: turn, y: nod, z: tilt). */
    angle?: {
        x?: number;
        y?: number;
        z?: number;
    };
    body?: {
        x?: number;
        z?: number;
    };
    /** Eyeball direction, -1..1. */
    eyes?: {
        x?: number;
        y?: number;
    };
    /** Eye openness multiplier (1 = as blinking allows, 0.4 = sleepy, 1.15 = wide). */
    eyeOpen?: number;
    smile?: number;
    mouthForm?: number;
    cheek?: number;
    shock?: number;
    /** Dizzy head wobble amplitude in degrees. */
    wobble?: number;
    /** Resting mouth opening 0..1 (surprise); speech opens it further. */
    mouth?: number;
    /** Chewing (rice break). */
    chew?: boolean;
    walk?: boolean;
    idle?: boolean;
    /** How much she follows the pointer, 0..1 (default 1; lower while thinking). */
    gaze?: number;
    /** Played once when this look starts (touch reactions). */
    pulse?: Live2DPulse;
    /** Picked up by the pointer: bend both arms and counterbalance with the head. */
    held?: boolean;
    /** New pickup identity; optional for callers that only hold/release once. */
    heldKey?: number;
    /** A chest touch: cover up and ask the player to stop. */
    guardChest?: boolean;
    /** Right-side peek: a native arm reaches from her waist beyond the window edge. */
    edgePeek?: boolean;
    /** The model is reasoning: she looks aside, shifts sides and hums to herself (live2d-motion.ts). */
    thinking?: boolean;
    /** Native hand gesture held while this look lasts; its fallback toggle is used for older imports. */
    gesture?: 'chest' | 'point' | 'grass';
}
export interface Live2DReady {
    /** Width / height of the framed character. */
    aspect: number;
}
export interface Live2DStage {
    ready: Promise<Live2DReady>;
    isFailed(): boolean;
    getHull(): string;
    setActive(active: boolean): void;
    /** Starts a touch reaction now (also triggered by a look's `pulse`); side +1 / -1 is where the touch came from. */
    pulse(kind: Live2DPulse, side?: number): void;
    /** Overlay swing in degrees plus optional hand velocity in CSS pixels/second, for body counterbalance. */
    setDangle(angle: number, velocity?: {
        x: number;
        y: number;
    }): void;
    /** Normalised carry leg pose and touchdown envelope, driven by the existing carry timeline. */
    setCarryPose(suspended: number, landing: number): void;
    /** Which part of her is under a point in client coordinates, or null for empty space. */
    regionAt(clientX: number, clientY: number): Live2DRegion | null;
    setLook(look: Live2DLook): void;
    /** 0 = quiet, 1 = talking (the runtime animates the syllables). */
    setMouth(open: number): void;
    /** 1 = full motion, 0 = reduced motion (still breathes very little, no wobble). */
    setMotion(scale: number): void;
    /** Frames per second (default 30; 15 while the window is in the background). */
    setFrameRate(fps: number): void;
    /** Power saving: never above 30 fps, 20 while idle and 10 in the background. */
    setPowerSave(on: boolean): void;
    /** CSS clip-path matching her current outline, or null until measured. */
    onHull: ((clipPath: string) => void) | null;
    onFail: ((reason: string) => void) | null;
    resize(): void;
    dispose(): void;
}
//# sourceMappingURL=live2d-types.d.ts.map
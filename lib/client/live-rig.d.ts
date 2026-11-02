/**
 * Live portrait (Live2D-style motion) for the flat character artwork.
 *
 * True Live2D needs artwork separated into dozens of layers and rigged in
 * Cubism. The plugin ships single PNG/WebP illustrations, so this renders each
 * one as a dense WebGL mesh and deforms it every frame:
 *  - breathing lifts the shoulders and head and widens the chest slightly;
 *  - the head tilts and leans toward the pointer around the neck, with a
 *    slow idle sway;
 *  - hair and the whale tail sway as a travelling wave (stronger at the tips);
 *  - the skirt swings a little, feet stay planted;
 *  - open eyes blink (the eye is squeezed onto the lower lid in the fragment
 *    shader and the lid is filled with sampled skin colour);
 *  - talking adds a light nod; expression changes crossfade.
 *
 * Hair is found from colour (blue-lavender, light enough not to be the navy
 * dress), weights are blurred so the mesh bends like cloth instead of tearing.
 * Everything degrades safely: no WebGL, a lost context or reduced motion keep
 * the normal <img> (the caller keeps it in the DOM for hit testing anyway).
 */
import { type RigPose } from './rig.js';
/** Canvas margin around the image (fraction of its size) so swaying hair is never clipped. */
export declare const LIVE_PAD = 0.05;
export interface LiveInput {
    gazeX: number;
    gazeY: number;
    talking: boolean;
    /** 0 = still (reduced motion), 1 = normal. */
    motion: number;
}
/** Per-pixel hair likelihood from colour: light blue-lavender, not the navy dress, white apron or skin. */
export declare function hairness(r: number, g: number, b: number, a: number): number;
/**
 * Per-vertex deformation weights [head, hair, chest, skirt] for a pose.
 * `sample(u, v)` returns hairness at image coordinates (0..1).
 */
export declare function liveWeights(rig: RigPose, cols: number, rows: number, sample: (u: number, v: number) => number): Float32Array;
/** Random wait before the next blink (ms): mostly 2.5–6 s, sometimes a quick double blink. */
export declare function nextBlinkDelay(random?: () => number): number;
/** Lid closure (0 open … 1 shut) during a 150 ms blink. */
export declare function blinkAmount(elapsedMs: number): number;
export declare class LiveRig {
    private readonly canvas;
    private readonly gl;
    private readonly program;
    private readonly indexBuffer;
    private readonly indexCount;
    private readonly loc;
    private readonly aUV;
    private readonly aW;
    private current;
    private previous;
    private fadeStart;
    private wanted;
    private frame;
    private running;
    private lost;
    private epoch;
    private blinkAt;
    private blinkStart;
    private cache;
    private pixelHeight;
    input: LiveInput;
    /** Called once per frame before drawing, e.g. to read the pointer gaze. */
    beforeFrame: (() => void) | null;
    onReady: (() => void) | null;
    onFail: (() => void) | null;
    private static support;
    static supported(): boolean;
    private static probe;
    static create(canvas: HTMLCanvasElement): LiveRig | null;
    private constructor();
    private handleLost;
    private load;
    /** Shows a pose; the previous one crossfades out over 160 ms. */
    setPose(src: string, pose: string): void;
    private buildSkin;
    private releaseSkin;
    /** Matches the backing store to the displayed size (the CSS height drives the layout). */
    resizeCanvas(): void;
    start(): void;
    stop(): void;
    private drawSkin;
    private draw;
    dispose(): void;
}
//# sourceMappingURL=live-rig.d.ts.map
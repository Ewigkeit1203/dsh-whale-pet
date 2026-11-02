/**
 * Swaying clothes for the flat character artwork (WebGL).
 *
 * Each illustration is drawn as a dense WebGL mesh and only the lower half
 * moves: the skirt and hem swing gently, and hair and the whale tail below
 * the waist sway as a slow travelling wave. The face, head and upper body are
 * never deformed (no blinking or pointer tracking); breathing stays the CSS
 * animation that scales the whole picture. A future Live2D model can replace
 * this layer.
 *
 * Hair is found from colour (blue-lavender, light enough not to be the navy
 * dress); weights are blurred so the mesh bends like cloth instead of tearing.
 * Everything degrades safely: no WebGL, a lost context or reduced motion keep
 * the normal <img> (the caller keeps it in the DOM for hit testing anyway).
 */
import { type RigPose } from './rig.js';
/** Canvas margin around the image (fraction of its size) so swaying hair is never clipped. */
export declare const LIVE_PAD = 0.05;
export interface LiveInput {
    /** 0 = still (reduced motion), 1 = normal. */
    motion: number;
}
/** Per-pixel hair likelihood from colour: light blue-lavender, not the navy dress, white apron or skin. */
export declare function hairness(r: number, g: number, b: number, a: number): number;
/**
 * Per-vertex deformation weights [hair, skirt] for a pose; only the lower half moves.
 * `sample(u, v)` returns hairness at image coordinates (0..1).
 */
export declare function liveWeights(rig: RigPose, cols: number, rows: number, sample: (u: number, v: number) => number): Float32Array;
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
    private cache;
    private pixelHeight;
    input: LiveInput;
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
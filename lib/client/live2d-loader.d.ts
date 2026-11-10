/**
 * Lazy loader for the Live2D runtime (see live2d/runtime.ts).
 *
 * build.js embeds Cubism Core and the bundled runtime as two functions that
 * are only called here, the first time an imported model is shown. Cubism
 * Core instantiates its embedded WebAssembly asynchronously and the framework
 * reads Core's enums while it is evaluated, so Core must answer first.
 * Nothing is fetched from the network.
 */
import type { Live2DLook, Live2DSource, Live2DStage } from './live2d-types.js';
export type { Live2DLook, Live2DSource, Live2DStage };
/** True when this build carries Cubism Core and the runtime. */
export declare function live2dBundled(): boolean;
export declare function loadLive2DRuntime(): Promise<{
    createLive2DStage(canvas: HTMLCanvasElement, source: Live2DSource): Live2DStage;
} | null>;
/** A cached model can be reused only while its graphics context is healthy. */
interface Live2DLease {
    canvas: HTMLCanvasElement;
    stage: Live2DStage;
    release(): void;
}
export declare function acquireLive2DStage(source: Live2DSource): Promise<Live2DLease>;
//# sourceMappingURL=live2d-loader.d.ts.map
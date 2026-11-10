export interface CarryGrab {
    x: number;
    y: number;
    /** Distinguishes consecutive grabs even when React batches away the release render. */
    key?: number;
    /** Unrotated widget position immediately before attaching it to the pointer. */
    from?: {
        x: number;
        y: number;
    };
}
export type CarryPhase = 'idle' | 'grab' | 'struggle' | 'hang' | 'fall' | 'land' | 'settle';
export interface CarryPose {
    phase: CarryPhase;
    angle: number;
    x: number;
    y: number;
    sx: number;
    sy: number;
    pivotX: number;
    pivotY: number;
    lift: number;
    vx: number;
    vy: number;
    suspended: number;
    landing: number;
    shadowOpacity: number;
    shadowScale: number;
}
/** Change a fixed local pivot while preserving the entire rotate/scale/translate image. */
export declare function carryPivotTranslation(pose: CarryPose, x: number, y: number): {
    x: number;
    y: number;
};
/** One bounded local simulation; no timers, React state, DOM reads or allocations per pointer move. */
export declare class CarryController {
    readonly pose: CarryPose;
    private readonly pendulum;
    private held;
    private legMode;
    private releaseSuspended;
    private height;
    private liftTarget;
    private grabbedAt;
    private releasedAt;
    private last;
    private offset;
    private startShape;
    private shape;
    private releaseLift;
    private hand;
    get active(): boolean;
    get isHeld(): boolean;
    setLegMode(enabled: boolean): void;
    grab(now: number, rect: {
        left: number;
        top: number;
        width: number;
        height: number;
    }, grab: CarryGrab): void;
    move(x: number, y: number, now: number): void;
    release(now: number): void;
    stop(): void;
    tick(now: number): CarryPose;
}
//# sourceMappingURL=carry.d.ts.map
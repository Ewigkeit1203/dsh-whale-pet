/** Small, reversible pose offsets on the existing leg meshes; no model assets or extra renderer. */
export interface LegMesh {
    index: number;
    /** -1 screen-left, +1 screen-right. */
    side: -1 | 1;
    vertices: Float32Array;
}
export declare const LEG_POSE: {
    readonly hip: 0.92;
    readonly knee: 0.42;
    readonly ankle: 0.1;
    readonly kneeIn: 0.025;
    readonly footOut: 0.008;
    readonly kneeLift: 0.015;
    readonly footLift: 0.025;
    readonly landingDrop: 0.055;
    readonly landingKneeSide: 0.025;
    readonly landingKneeIn: 0.006;
};
export declare class LegPoseLayer {
    private readonly markChanged;
    private readonly meshes;
    private dirty;
    private restored;
    private span;
    constructor(meshes: readonly LegMesh[], markChanged?: (index: number) => void);
    get available(): boolean;
    /** Restore before Core updates; its output must never become the next pose's input. */
    restore(): void;
    /** Call after Core updates. Return a global body drop, with the feet compensated locally. */
    apply(suspended: number, landing: number): number;
}
//# sourceMappingURL=live2d-legs.d.ts.map
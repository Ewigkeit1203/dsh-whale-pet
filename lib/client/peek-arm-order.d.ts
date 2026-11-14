interface PeekArmModel {
    count: number;
    partParents: ArrayLike<number>;
    partIndex(id: string): number;
    drawableIndex(id: string): number;
    drawablePart(index: number): number;
}
/** An upper arm and the meshes that must stay over its top end, in draw order (upper arm first). */
export interface PeekArmLift {
    drawable: number;
    under: readonly number[];
}
/** How a lift is placed: just under its sleeve (in place), or with its sleeve in front of the hair (reaching arm). */
export type PeekLiftMode = 'inPlace' | 'front';
/**
 * Draw order while she peeks. The reaching arm (screen-left, Param62/60) crosses her body, so all of it goes
 * in front of her hair and torso: the upper arm, then its puff sleeve and shoulder ruffle over the upper arm's
 * top end (so no seam shows), then the forearm and hand over the upper arm's lower end. With PeekElbow placing
 * the forearm's top end on the upper arm's lower end, the arm reads as one piece bent at the elbow (chosen
 * with the owner from rendered options, "E2"). Left at the author's order the hair and bodice cover the upper
 * arm and the arm looks broken above the elbow. The resting arm only moves its upper arm up to sit just under
 * its own sleeve.
 */
export declare class PeekArmOrder {
    private readonly lifts;
    private readonly modes;
    private readonly arm;
    private readonly lifted;
    private readonly original;
    private readonly byOrder;
    private target;
    static forModel(model: PeekArmModel): PeekArmOrder;
    constructor(count: number, indices: readonly number[], lifts?: readonly PeekArmLift[], modes?: readonly PeekLiftMode[]);
    restore(): void;
    apply(orders: Int32Array, weight: number): void;
}
/**
 * How much of the peek draw order to use this frame. Going out it follows the arm (as soon as the arm moves).
 * Coming back it is dropped at once: the author's order hides the returning arm behind her hair and the hand
 * behind her skirt all the way down (rendered on the model at every step), while keeping the peek order until
 * the arm had landed left the hand in front of the skirt and then snapped it behind (seen by the owner).
 */
export declare function peekOrderWeight(peeking: boolean, weight: number): number;
/** A mesh moved by PeekElbow (model units, y up). */
export interface PeekElbowMesh {
    index: number;
    vertices: Float32Array;
}
/**
 * While she peeks, the reaching forearm and hand are moved as one piece so the forearm's top end sits on
 * the upper arm's lower end (the rig leaves it sticking out above and outside the elbow). Measured on the
 * model's meshes at forearm -0.24, upper arm 0.06: upper arm (ArtMesh659) lower end centred at
 * (-0.161, 0.233), forearm sleeve (ArtMesh684) top end at (-0.192, 0.270); x moves it onto the upper arm's
 * end, y stops 0.012 short of the full -0.037 so the forearm overlaps the end a little and no seam can show.
 * Same contract as the leg layer: restore() before Core updates, apply() after; a weight of 0 leaves the
 * author's meshes untouched.
 */
export declare const PEEK_ELBOW: {
    readonly upper: 0.06;
    readonly forearm: -0.24;
    readonly x: 0.0304;
    readonly y: -0.025;
};
export declare class PeekElbow {
    private readonly meshes;
    private readonly markChanged;
    private readonly base;
    private dirty;
    constructor(meshes: readonly PeekElbowMesh[], markChanged?: (index: number) => void);
    get available(): boolean;
    /** Puts the author's vertices back (before Core updates, and always before she leaves the edge). */
    restore(): void;
    apply(weight: number): void;
    /** The reaching arm's forearm and hand: every mesh under the arm part that holds the upper arm, except it. */
    static forModel(model: {
        count: number;
        partParents: ArrayLike<number>;
        partIndex(id: string): number;
        drawableIndex(id: string): number;
        drawablePart(index: number): number;
        vertices(index: number): Float32Array;
    }, markChanged?: (index: number) => void): PeekElbow;
}
export {};
//# sourceMappingURL=peek-arm-order.d.ts.map
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
 * in front of her hair and torso. Forearm and hand first, then the upper arm over the forearm's top end (with
 * PeekElbow tucking the forearm in, no block sticks out at the elbow), then its puff sleeve and shoulder
 * ruffle over the upper arm's top end (so no seam shows). Left at the author's order the hair and bodice cover
 * the upper arm and the arm looks broken above the elbow. The resting arm only moves its upper arm up to sit
 * just under its own sleeve.
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
/** A mesh moved by PeekElbow (model units, y up). */
export interface PeekElbowMesh {
    index: number;
    vertices: Float32Array;
}
/**
 * While she peeks, the reaching forearm and hand are moved a little up and towards the body so the
 * forearm's top end tucks in under the upper arm (the rig's elbow otherwise sticks out as a block).
 * Same contract as the leg layer: restore() before Core updates, apply() after; a weight of 0 leaves the
 * author's meshes untouched. Measured on the model: (+0.015, +0.025) at forearm -0.24, upper arm 0.06.
 */
export declare const PEEK_ELBOW: {
    readonly upper: 0.06;
    readonly forearm: -0.24;
    readonly x: 0.015;
    readonly y: 0.025;
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
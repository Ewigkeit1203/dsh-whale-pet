/**
 * Pet + settings panel group layout (frontend F02).
 *
 * The previous implementation clamped the pet and the panel independently,
 * so at a viewport edge the panel stopped while the pet kept moving behind
 * it. Here the pair is treated as one group:
 *
 *  - tethered: the panel sits beside the pet with a fixed gap. If the pet is
 *    too close to an edge, the panel switches sides (only when the current
 *    side no longer fits, so it never flickers) and, if neither side fits at
 *    the current spot, the pet is moved to the nearest spot where the whole
 *    group fits.
 *  - detached: the window is too small for the group. The panel becomes an
 *    independent, fully readable sheet and the pet keeps its own place.
 *
 * All values are CSS pixels. Pure functions only: no DOM access.
 */
export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}
export type PanelSide = 'left' | 'right';
export declare const LAYOUT: {
    readonly margin: 16;
    readonly gap: 16;
    readonly panelWidth: 340;
    readonly minPanelHeight: 260;
    /** Room needed above the composer before the panel prefers to stay above it. */
    readonly comfortablePanelHeight: 600;
    readonly petTop: 90;
    readonly composerGap: 12;
};
export interface GroupInput {
    viewportWidth: number;
    viewportHeight: number;
    /** Top of the host composer, if any. The panel never extends below it. */
    composerTop?: number;
    /** Current pet stage box. */
    pet: Box;
    /** Legacy input accepted for callers; content now scrolls in a stable panel. */
    panelHeight?: number;
    /** Side used in the previous frame (hysteresis). */
    previousSide?: PanelSide;
    /** The pet cannot be moved (docked to the edge). */
    petPinned?: boolean;
}
export interface GroupLayout {
    mode: 'tethered' | 'detached';
    side: PanelSide;
    pet: {
        x: number;
        y: number;
    };
    panel: {
        x: number;
        y: number;
        width: number;
        maxHeight: number;
        height: number;
    };
}
/** Lowest y the panel may reach. */
export declare function panelFloor(viewportHeight: number, composerTop?: number): number;
export declare function panelWidthFor(viewportWidth: number): number;
/** Allowed pet x-range for a given side so that the whole group is on screen. */
export declare function petRangeForSide(side: PanelSide, viewportWidth: number, petWidth: number, panelWidth: number): [number, number];
export declare function groupFits(viewportWidth: number, viewportHeight: number, petWidth: number, composerTop?: number): boolean;
/** Viewport clamp for the pet on its own (settings closed or detached). */
export declare function clampPet(x: number, y: number, petWidth: number, petHeight: number, viewportWidth: number, viewportHeight: number): {
    x: number;
    y: number;
};
/**
 * Choose a side and pet x so that the group fits.
 * Keeps `previousSide` while it still fits; otherwise switches; otherwise
 * moves the pet to the closest valid position.
 */
export declare function placeGroupX(x: number, petWidth: number, viewportWidth: number, previousSide: PanelSide | undefined, pinned?: boolean): {
    side: PanelSide;
    x: number;
    fits: boolean;
};
export declare function layoutGroup(input: GroupInput): GroupLayout;
/** Idle wait is bounded but independently sampled for every stroll. */
export declare function nextWanderDelay(random?: number): number;
/** Sample the entire usable host viewport. Avoid almost-stationary destinations. */
export declare function wanderDestination(x: number, y: number, width: number, height: number, vw: number, vh: number, randomX?: number, randomY?: number): {
    x: number;
    y: number;
} | null;
//# sourceMappingURL=layout.d.ts.map
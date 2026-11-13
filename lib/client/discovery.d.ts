/**
 * What the user has found out she can do (PM v0.9 P0-4): the first-run guide and the interaction gallery.
 * Kept on this device only (its own storage key, so restoring default settings does not forget it).
 */
export type InteractionId = 'pat' | 'tail' | 'poke' | 'angry' | 'carry' | 'dizzy' | 'peek' | 'theatre' | 'code' | 'meal';
export interface InteractionInfo {
    id: InteractionId;
    /** [中文, English] */
    name: readonly [string, string];
    /** Shown while undiscovered: a nudge, not the answer. */
    hint: readonly [string, string];
    /** Shown once discovered: how to do it again. */
    how: readonly [string, string];
}
export declare const INTERACTIONS: readonly InteractionInfo[];
/** The three first-run steps, in order. */
export declare const GUIDE_STEPS: readonly InteractionId[];
export type Discoveries = Partial<Record<InteractionId, number>>;
export declare const DISCOVERIES_KEY = "dsh-whale-pet.discoveries.v1";
/** Storage can contain finite numbers outside Date's valid range. */
export declare function discoveryDate(value: unknown): Date | null;
export declare function readDiscoveries(): Discoveries;
export declare function saveDiscoveries(found: Discoveries): void;
/** Records the first time only: the same object comes back when it was already known. */
export declare function discover(found: Discoveries, id: InteractionId, now: number): Discoveries;
export declare function discoveryCount(found: Discoveries): number;
/** Index of the guide step to show next given the steps done in this run of the guide; GUIDE_STEPS.length when finished. */
export declare function guideStep(done: readonly InteractionId[]): number;
//# sourceMappingURL=discovery.d.ts.map
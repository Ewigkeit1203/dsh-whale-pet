/**
 * Theatre backgrounds (Background Switcher).
 *
 * The repository ships no background artwork and the bundle already inlines the
 * character PNGs, so the built-in scenes are painted in code as layered SVG
 * illustrations. They are drawn slightly out of focus, like a camera focused on
 * the character, which keeps the centre calm behind her. Users can add their
 * own picture (stored in IndexedDB by media-store.ts) as the "custom" scene.
 *
 * Everything here is deterministic: the same scene id always paints the same
 * picture, so a crossfade never changes the scene under the reader.
 */
export type SceneId = 'none' | 'study' | 'lab' | 'cafe' | 'seaside' | 'custom';
export interface SceneMeta {
    id: SceneId;
    zh: string;
    en: string;
    /** Base colour behind the picture while it decodes, so a switch never flashes white. */
    base: string;
    /** Soft light used for the floor glow and ambient particles. */
    glow: string;
    /** Ambient particle style drawn by CSS. */
    ambient: 'dust' | 'data' | 'motes' | 'sparkle' | 'none';
}
export declare const SCENES: readonly SceneMeta[];
/** Painted scenes that the shuffle may pick (never transparent, custom only when present). */
export declare const PAINTED_SCENES: readonly SceneId[];
export declare function sceneMeta(id: string): SceneMeta;
export declare function isSceneId(value: unknown): value is SceneId;
/** Picks a different scene than `current`; `random` is injectable for tests. */
export declare function shuffleScene(current: string, hasCustom: boolean, random?: () => number): SceneId;
/** SVG markup of a painted scene, or '' for transparent / custom scenes. */
export declare function sceneSvg(id: SceneId): string;
/** A CSS-ready URL for a painted scene; custom pictures pass their own object URL. */
export declare function sceneUrl(id: SceneId, customUrl: string | null): string;
//# sourceMappingURL=scenes.d.ts.map
/**
 * Importing the DeepSeek-chan (大肥鱼) Live2D model.
 *
 * The model's terms forbid redistributing its files, so the plugin never
 * ships them: each user downloads the model from the author (神宫凉子) and
 * picks its folder in Settings. Only the files the companion needs are kept,
 * in this device's IndexedDB (see media-store.ts). Textures larger than
 * LIVE2D_TEXTURE_LIMIT are scaled down once on import, which keeps GPU memory
 * near 80 MB instead of over 300 MB for the 4096 px originals.
 *
 * The runtime is not a general model viewer: the import checks that the
 * folder really is 大肥鱼 (by the switches in its display info), because the
 * looks in live2d-look.ts are written for this model.
 */
import type { Live2DSource } from './live2d-types.js';
export declare const LIVE2D_TEXTURE_LIMIT = 2048;
/** Display info parameter names that identify 大肥鱼 (cdi3.json). */
export declare const LIVE2D_SIGNATURE: string[];
export declare const LIVE2D_CREDIT: {
    model: string;
    art: string;
    rigging: string;
    /** The author's Bilibili page, where the model is published. */
    page: string;
};
export interface Live2DRecord {
    /** Path of the model3.json, relative to the stored files. */
    modelPath: string;
    files: Record<string, Blob>;
    expressions: Record<string, string>;
    idleMotion?: string;
    /** Gesture and idle animations (name → path); missing in older imports, which fall back to toggles. */
    motions?: Record<string, string>;
    name: string;
    bytes: number;
    savedAt: number;
}
export type Live2DImportError = 'no-model' | 'incomplete' | 'not-dafeiyu' | 'bad-json' | 'storage' | 'image';
export interface Live2DPlan {
    /** Folder of the model3.json inside the picked folder ('' or ending in '/'). */
    root: string;
    modelPath: string;
    /** Paths (relative to root) that must be stored. */
    keep: string[];
    textures: string[];
    displayInfo?: string;
    expressions: Record<string, string>;
    idleMotion?: string;
    motions: Record<string, string>;
    missing: string[];
}
/** Forward slashes, no leading './' or '/'. */
export declare function normaliseLive2DPath(path: string): string;
/** The model3.json closest to the top of the picked folder. */
export declare function findLive2DModel(paths: readonly string[]): string | null;
interface ModelJson {
    FileReferences?: {
        Moc?: string;
        Textures?: string[];
        Physics?: string;
        DisplayInfo?: string;
        Pose?: string;
        Expressions?: {
            Name?: string;
            File?: string;
        }[];
        Motions?: Record<string, {
            File?: string;
        }[]>;
    };
}
/** Decides which files to keep from the picked folder, given the parsed model3.json. */
export declare function planLive2DImport(paths: readonly string[], modelPath: string, model: ModelJson): Live2DPlan;
/** True when the display info names the switches this companion relies on. */
export declare function isDaFeiYuDisplayInfo(displayInfo: unknown): boolean;
/** Size after scaling down to the texture limit (aspect kept). */
export declare function live2dTextureSize(width: number, height: number, limit?: number): {
    width: number;
    height: number;
};
export type Live2DImportResult = {
    ok: true;
    record: Live2DRecord;
} | {
    ok: false;
    error: Live2DImportError;
    detail?: string;
};
/** Builds a record from the files of a picked folder (webkitdirectory) or a multi-file pick. */
export declare function importLive2DFiles(files: readonly File[], onProgress?: (done: number, total: number) => void): Promise<Live2DImportResult>;
/** Runtime view of a stored record. Decoded files are shared between mounts (widget ↔ theatre) for a while. */
export declare function live2dSourceFor(record: Live2DRecord): Live2DSource;
/** Old saved records remain usable, but cannot play motions that were not imported. */
export declare function live2dNeedsReimport(record: Pick<Live2DRecord, 'files' | 'motions'> | null): boolean;
export {};
//# sourceMappingURL=live2d-package.d.ts.map
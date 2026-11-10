/**
 * Local storage for the user's own theatre background and music (IndexedDB).
 *
 * Small preferences (scene id, volume, track) live in localStorage with the
 * other preferences; pictures and audio are too large for that, so they are
 * kept as Blobs in one IndexedDB object store. Everything stays on this
 * device. Every call resolves (never throws): storage can be disabled by the
 * host, by a private window or by quota, and the theatre keeps working.
 */
export type MediaSlot = 'scene' | 'bgm';
export interface StoredMedia {
    blob: Blob;
    name: string;
    type: string;
    size: number;
    savedAt: number;
}
export declare const MEDIA_DB = "dsh-whale-pet";
export declare const MEDIA_STORE = "media";
export declare const MEDIA_LIMITS: Record<MediaSlot, {
    bytes: number;
    accept: RegExp;
}>;
export type MediaCheck = {
    ok: true;
} | {
    ok: false;
    reason: 'type' | 'size';
};
export declare function checkMedia(slot: MediaSlot, file: {
    type: string;
    size: number;
}): MediaCheck;
/** Saves a picture or audio file; resolves false when it is rejected or storage is unavailable. */
export declare function saveMedia(slot: MediaSlot, file: Blob & {
    name?: string;
}): Promise<boolean>;
export declare function loadMedia(slot: MediaSlot): Promise<StoredMedia | null>;
export declare function deleteMedia(slot: MediaSlot): Promise<boolean>;
/** Key of the imported Live2D model in the same object store; one model at a time. */
export declare const LIVE2D_MEDIA_KEY = "live2d";
export interface StoredLive2D {
    modelPath: string;
    files: Record<string, Blob>;
    expressions: Record<string, string>;
    idleMotion?: string;
    motions?: Record<string, string>;
    name: string;
    bytes: number;
    savedAt: number;
}
export declare function saveLive2DModel(record: StoredLive2D): Promise<boolean>;
export declare function loadLive2DModel(): Promise<StoredLive2D | null>;
export declare function deleteLive2DModel(): Promise<boolean>;
//# sourceMappingURL=media-store.d.ts.map
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
//# sourceMappingURL=media-store.d.ts.map
/**
 * Local storage for the user's own theatre background and music (IndexedDB).
 *
 * Small preferences (scene id, volume, track) live in localStorage with the
 * other preferences; pictures and audio are too large for that, so they are
 * kept as Blobs in one IndexedDB object store. Everything stays on this
 * device. Every call resolves (never throws): storage can be disabled by the
 * host, by a private window or by quota, and the theatre keeps working.
 */
export const MEDIA_DB = 'dsh-whale-pet';
export const MEDIA_STORE = 'media';
export const MEDIA_LIMITS = {
    scene: { bytes: 15 * 1024 * 1024, accept: /^image\/(png|jpe?g|webp|gif|avif|bmp)$/i },
    bgm: { bytes: 40 * 1024 * 1024, accept: /^audio\//i },
};
export function checkMedia(slot, file) {
    const limit = MEDIA_LIMITS[slot];
    if (!limit.accept.test(file.type || ''))
        return { ok: false, reason: 'type' };
    if (!(file.size > 0) || file.size > limit.bytes)
        return { ok: false, reason: 'size' };
    return { ok: true };
}
let mediaDbPromise = null;
function openMediaDb() {
    if (mediaDbPromise)
        return mediaDbPromise;
    mediaDbPromise = new Promise(resolve => {
        try {
            const factory = globalThis.indexedDB;
            if (!factory) {
                resolve(null);
                return;
            }
            const request = factory.open(MEDIA_DB, 1);
            request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(MEDIA_STORE))
                request.result.createObjectStore(MEDIA_STORE); };
            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => { db.close(); mediaDbPromise = null; };
                resolve(db);
            };
            request.onerror = () => resolve(null);
            request.onblocked = () => resolve(null);
        }
        catch {
            resolve(null);
        }
    });
    // A failed open may succeed later (e.g. after the user frees space).
    void mediaDbPromise.then(db => { if (!db)
        mediaDbPromise = null; });
    return mediaDbPromise;
}
function mediaRequest(mode, run) {
    return openMediaDb().then(db => new Promise(resolve => {
        if (!db) {
            resolve(null);
            return;
        }
        try {
            const transaction = db.transaction(MEDIA_STORE, mode);
            const request = run(transaction.objectStore(MEDIA_STORE));
            let value = null;
            request.onsuccess = () => { value = (request.result ?? null); };
            transaction.oncomplete = () => resolve(mode === 'readonly' ? value : true);
            transaction.onerror = () => resolve(null);
            transaction.onabort = () => resolve(null);
        }
        catch {
            resolve(null);
        }
    }));
}
/** Saves a picture or audio file; resolves false when it is rejected or storage is unavailable. */
export async function saveMedia(slot, file) {
    if (!checkMedia(slot, file).ok)
        return false;
    const record = { blob: file, name: (file.name || slot).slice(0, 120), type: file.type, size: file.size, savedAt: Date.now() };
    return (await mediaRequest('readwrite', store => store.put(record, slot))) === true;
}
export async function loadMedia(slot) {
    const record = await mediaRequest('readonly', store => store.get(slot));
    return record && typeof record === 'object' && record.blob instanceof Blob ? record : null;
}
export async function deleteMedia(slot) {
    return (await mediaRequest('readwrite', store => store.delete(slot))) === true;
}
// ---- Imported Live2D model (live2d-package.ts) --------------------------------
/** Key of the imported Live2D model in the same object store; one model at a time. */
export const LIVE2D_MEDIA_KEY = 'live2d';
export async function saveLive2DModel(record) {
    return (await mediaRequest('readwrite', store => store.put(record, LIVE2D_MEDIA_KEY))) === true;
}
export async function loadLive2DModel() {
    const record = await mediaRequest('readonly', store => store.get(LIVE2D_MEDIA_KEY));
    if (!record || typeof record !== 'object' || typeof record.modelPath !== 'string' || !record.files || !(record.files[record.modelPath] instanceof Blob))
        return null;
    return record;
}
export async function deleteLive2DModel() {
    return (await mediaRequest('readwrite', store => store.delete(LIVE2D_MEDIA_KEY))) === true;
}
//# sourceMappingURL=media-store.js.map
/**
 * Local storage for the user's own theatre background and music (IndexedDB).
 *
 * Small preferences (scene id, volume, track) live in localStorage with the
 * other preferences; pictures and audio are too large for that, so they are
 * kept as Blobs in one IndexedDB object store. Everything stays on this
 * device. Every call resolves (never throws): storage can be disabled by the
 * host, by a private window or by quota, and the theatre keeps working.
 */

export type MediaSlot = 'scene' | 'bgm'

export interface StoredMedia {
  blob: Blob
  name: string
  type: string
  size: number
  savedAt: number
}

export const MEDIA_DB = 'dsh-whale-pet'
export const MEDIA_STORE = 'media'
export const MEDIA_LIMITS: Record<MediaSlot, { bytes: number; accept: RegExp }> = {
  scene: { bytes: 15 * 1024 * 1024, accept: /^image\/(png|jpe?g|webp|gif|avif|bmp)$/i },
  bgm: { bytes: 40 * 1024 * 1024, accept: /^audio\//i },
}

export type MediaCheck = { ok: true } | { ok: false; reason: 'type' | 'size' }

export function checkMedia(slot: MediaSlot, file: { type: string; size: number }): MediaCheck {
  const limit = MEDIA_LIMITS[slot]
  if (!limit.accept.test(file.type || '')) return { ok: false, reason: 'type' }
  if (!(file.size > 0) || file.size > limit.bytes) return { ok: false, reason: 'size' }
  return { ok: true }
}

let mediaDbPromise: Promise<IDBDatabase | null> | null = null

function openMediaDb(): Promise<IDBDatabase | null> {
  if (mediaDbPromise) return mediaDbPromise
  mediaDbPromise = new Promise<IDBDatabase | null>(resolve => {
    try {
      const factory: IDBFactory | undefined = (globalThis as { indexedDB?: IDBFactory }).indexedDB
      if (!factory) { resolve(null); return }
      const request = factory.open(MEDIA_DB, 1)
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(MEDIA_STORE)) request.result.createObjectStore(MEDIA_STORE) }
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => { db.close(); mediaDbPromise = null }
        resolve(db)
      }
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch { resolve(null) }
  })
  // A failed open may succeed later (e.g. after the user frees space).
  void mediaDbPromise.then(db => { if (!db) mediaDbPromise = null })
  return mediaDbPromise
}

function mediaRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T | null> {
  return openMediaDb().then(db => new Promise<T | null>(resolve => {
    if (!db) { resolve(null); return }
    try {
      const transaction = db.transaction(MEDIA_STORE, mode)
      const request = run(transaction.objectStore(MEDIA_STORE))
      let value: T | null = null
      request.onsuccess = () => { value = (request.result ?? null) as T | null }
      transaction.oncomplete = () => resolve(mode === 'readonly' ? value : (true as unknown as T))
      transaction.onerror = () => resolve(null)
      transaction.onabort = () => resolve(null)
    } catch { resolve(null) }
  }))
}

/** Saves a picture or audio file; resolves false when it is rejected or storage is unavailable. */
export async function saveMedia(slot: MediaSlot, file: Blob & { name?: string }): Promise<boolean> {
  if (!checkMedia(slot, file).ok) return false
  const record: StoredMedia = { blob: file, name: (file.name || slot).slice(0, 120), type: file.type, size: file.size, savedAt: Date.now() }
  return (await mediaRequest<boolean>('readwrite', store => store.put(record, slot))) === true
}

export async function loadMedia(slot: MediaSlot): Promise<StoredMedia | null> {
  const record = await mediaRequest<StoredMedia>('readonly', store => store.get(slot))
  return record && typeof record === 'object' && record.blob instanceof Blob ? record : null
}

export async function deleteMedia(slot: MediaSlot): Promise<boolean> {
  return (await mediaRequest<boolean>('readwrite', store => store.delete(slot))) === true
}

// ---- Imported Live2D model (live2d-package.ts) --------------------------------

/** Key of the imported Live2D model in the same object store; one model at a time. */
export const LIVE2D_MEDIA_KEY = 'live2d'

export interface StoredLive2D {
  modelPath: string
  files: Record<string, Blob>
  expressions: Record<string, string>
  idleMotion?: string
  motions?: Record<string, string>
  name: string
  bytes: number
  savedAt: number
}

export async function saveLive2DModel(record: StoredLive2D): Promise<boolean> {
  return (await mediaRequest<boolean>('readwrite', store => store.put(record, LIVE2D_MEDIA_KEY))) === true
}

export async function loadLive2DModel(): Promise<StoredLive2D | null> {
  const record = await mediaRequest<StoredLive2D>('readonly', store => store.get(LIVE2D_MEDIA_KEY))
  if (!record || typeof record !== 'object' || typeof record.modelPath !== 'string' || !record.files || !(record.files[record.modelPath] instanceof Blob)) return null
  return record
}

export async function deleteLive2DModel(): Promise<boolean> {
  return (await mediaRequest<boolean>('readwrite', store => store.delete(LIVE2D_MEDIA_KEY))) === true
}

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
import type { Live2DSource } from './live2d-types.js'
import { LIVE2D_MOTION_FILES } from './live2d-motion.js'

export const LIVE2D_TEXTURE_LIMIT = 2048
/** Display info parameter names that identify 大肥鱼 (cdi3.json). */
export const LIVE2D_SIGNATURE = ['加载', '大钢盆', '圈圈眼']
export const LIVE2D_CREDIT = {
  model: 'DeepSeek-chan（大肥鱼）',
  art: '神宫凉子',
  rigging: '霓虹猫_NeonNeko',
  /** The author's Bilibili page, where the model is published. */
  page: 'https://space.bilibili.com/13737731',
}

export interface Live2DRecord {
  /** Path of the model3.json, relative to the stored files. */
  modelPath: string
  files: Record<string, Blob>
  expressions: Record<string, string>
  idleMotion?: string
  /** Gesture and idle animations (name → path); missing in older imports, which fall back to toggles. */
  motions?: Record<string, string>
  name: string
  bytes: number
  savedAt: number
}

export type Live2DImportError = 'no-model' | 'incomplete' | 'not-dafeiyu' | 'bad-json' | 'storage' | 'image'

export interface Live2DPlan {
  /** Folder of the model3.json inside the picked folder ('' or ending in '/'). */
  root: string
  modelPath: string
  /** Paths (relative to root) that must be stored. */
  keep: string[]
  textures: string[]
  displayInfo?: string
  expressions: Record<string, string>
  idleMotion?: string
  motions: Record<string, string>
  missing: string[]
}

/** Forward slashes, no leading './' or '/'. */
export function normaliseLive2DPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^(\.\/|\/)+/, '')
}

function live2dDir(path: string): string {
  const slash = path.lastIndexOf('/')
  return slash < 0 ? '' : path.slice(0, slash + 1)
}

/** The model3.json closest to the top of the picked folder. */
export function findLive2DModel(paths: readonly string[]): string | null {
  const models = paths.map(normaliseLive2DPath).filter(path => /\.model3\.json$/i.test(path))
  models.sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
  return models[0] ?? null
}

interface ModelJson {
  FileReferences?: {
    Moc?: string
    Textures?: string[]
    Physics?: string
    DisplayInfo?: string
    Pose?: string
    Expressions?: { Name?: string; File?: string }[]
    Motions?: Record<string, { File?: string }[]>
  }
}

/** Decides which files to keep from the picked folder, given the parsed model3.json. */
export function planLive2DImport(paths: readonly string[], modelPath: string, model: ModelJson): Live2DPlan {
  const all = new Set(paths.map(normaliseLive2DPath))
  const root = live2dDir(normaliseLive2DPath(modelPath))
  const local = (file: string) => normaliseLive2DPath(file)
  const refs = model.FileReferences ?? {}
  const keep = new Set<string>([local(modelPath).slice(root.length)])
  const missing: string[] = []
  const need = (file: string | undefined, required: boolean) => {
    if (!file) { if (required) missing.push('(moc)'); return }
    const path = local(file)
    if (all.has(root + path)) keep.add(path)
    else if (required) missing.push(path)
  }
  need(refs.Moc, true)
  const textures = (refs.Textures ?? []).map(local)
  if (!textures.length) missing.push('(textures)')
  textures.forEach(texture => need(texture, true))
  need(refs.Physics, false)
  need(refs.DisplayInfo, false)
  need(refs.Pose, false)

  // VTube Studio keeps hotkey expressions and animations next to the model without listing them.
  const expressions: Record<string, string> = {}
  const motions: Record<string, string> = {}
  const wantedMotions = new Set(LIVE2D_MOTION_FILES)
  let idleMotion: string | undefined
  for (const full of all) {
    if (!full.startsWith(root)) continue
    const path = full.slice(root.length)
    const name = path.split('/').pop() ?? ''
    if (/\.exp3\.json$/i.test(name)) { keep.add(path); expressions[path] = name.replace(/\.exp3\.json$/i, '') }
    else if (/^idle\.motion3\.json$/i.test(name) && !idleMotion) { keep.add(path); idleMotion = path }
    else if (/\.motion3\.json$/i.test(name)) {
      // The hand gestures and the author's idle animation (脱捕); a few KB each.
      const base = name.replace(/\.motion3\.json$/i, '')
      if (wantedMotions.has(base) && !motions[base]) { keep.add(path); motions[base] = path }
    }
  }
  const displayInfo = refs.DisplayInfo && keep.has(local(refs.DisplayInfo)) ? local(refs.DisplayInfo) : undefined
  return { root, modelPath: local(modelPath).slice(root.length), keep: [...keep], textures, displayInfo, expressions, idleMotion, motions, missing }
}

/** True when the display info names the switches this companion relies on. */
export function isDaFeiYuDisplayInfo(displayInfo: unknown): boolean {
  const parameters = (displayInfo as { Parameters?: { Name?: string }[] } | null)?.Parameters
  if (!Array.isArray(parameters)) return false
  const names = parameters.map(p => String(p?.Name ?? '')).join('\n')
  return LIVE2D_SIGNATURE.every(word => names.includes(word))
}

/** Size after scaling down to the texture limit (aspect kept). */
export function live2dTextureSize(width: number, height: number, limit = LIVE2D_TEXTURE_LIMIT): { width: number; height: number } {
  const scale = Math.min(1, limit / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

async function readLive2DJson(file: Blob): Promise<unknown> {
  return JSON.parse((await file.text()).replace(/^﻿/, ''))
}

async function shrinkLive2DTexture(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const size = live2dTextureSize(bitmap.width, bitmap.height)
  if (size.width === bitmap.width && size.height === bitmap.height) { bitmap.close(); return file }
  bitmap.close()
  const scaled = await createImageBitmap(file, { resizeWidth: size.width, resizeHeight: size.height, resizeQuality: 'high', premultiplyAlpha: 'none' })
  let blob: Blob | null = null
  if (typeof OffscreenCanvas === 'function') {
    const canvas = new OffscreenCanvas(size.width, size.height)
    canvas.getContext('2d')!.drawImage(scaled, 0, 0)
    blob = await canvas.convertToBlob({ type: 'image/png' })
  } else {
    const canvas = document.createElement('canvas')
    canvas.width = size.width; canvas.height = size.height
    canvas.getContext('2d')!.drawImage(scaled, 0, 0)
    blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  }
  scaled.close()
  if (!blob) throw new Error('image')
  return blob
}

export type Live2DImportResult = { ok: true; record: Live2DRecord } | { ok: false; error: Live2DImportError; detail?: string }

/** Builds a record from the files of a picked folder (webkitdirectory) or a multi-file pick. */
export async function importLive2DFiles(files: readonly File[], onProgress?: (done: number, total: number) => void): Promise<Live2DImportResult> {
  const byPath = new Map<string, File>()
  for (const file of files) byPath.set(normaliseLive2DPath((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name), file)
  const modelPath = findLive2DModel([...byPath.keys()])
  if (!modelPath) return { ok: false, error: 'no-model' }
  let model: ModelJson
  try { model = await readLive2DJson(byPath.get(modelPath)!) as ModelJson } catch { return { ok: false, error: 'bad-json' } }
  const plan = planLive2DImport([...byPath.keys()], modelPath, model)
  if (plan.missing.length) return { ok: false, error: 'incomplete', detail: plan.missing.join(', ') }
  if (!plan.displayInfo) return { ok: false, error: 'not-dafeiyu' }
  try { if (!isDaFeiYuDisplayInfo(await readLive2DJson(byPath.get(plan.root + plan.displayInfo)!))) return { ok: false, error: 'not-dafeiyu' } } catch { return { ok: false, error: 'not-dafeiyu' } }

  const stored: Record<string, Blob> = {}
  let bytes = 0, done = 0
  const textures = new Set(plan.textures)
  onProgress?.(0, plan.keep.length)
  for (const path of plan.keep) {
    const file = byPath.get(plan.root + path)!
    let blob: Blob = file
    if (textures.has(path)) {
      try { blob = await shrinkLive2DTexture(file) } catch { return { ok: false, error: 'image', detail: path } }
    }
    stored[path] = blob
    bytes += blob.size
    onProgress?.(++done, plan.keep.length)
  }
  const name = plan.modelPath.split('/').pop()!.replace(/\.model3\.json$/i, '')
  return { ok: true, record: { modelPath: plan.modelPath, files: stored, expressions: plan.expressions, idleMotion: plan.idleMotion, motions: plan.motions, name, bytes, savedAt: Date.now() } }
}

/** Runtime view of a stored record. Decoded files are shared between mounts (widget ↔ theatre) for a while. */
export function live2dSourceFor(record: Live2DRecord): Live2DSource {
  const buffers = new Map<string, Promise<ArrayBuffer | null>>()
  const images = new Map<string, Promise<ImageBitmap | null>>()
  let release: ReturnType<typeof setTimeout> | null = null
  const touch = () => {
    if (release) clearTimeout(release)
    // Keep decoded data around briefly so switching to the theatre does not decode again.
    release = setTimeout(() => {
      buffers.clear()
      // Decoded ImageBitmaps own native memory; dropping JS references alone need not release it promptly.
      for (const image of images.values()) void image.then(bitmap => bitmap?.close())
      images.clear()
      release = null
    }, 30000)
  }
  return {
    modelPath: record.modelPath,
    expressions: record.expressions,
    idleMotion: record.idleMotion,
    motions: record.motions,
    read(path) {
      touch()
      if (!buffers.has(path)) {
        const blob = record.files[path]
        buffers.set(path, blob ? blob.arrayBuffer().then(buffer => buffer, () => null) : Promise.resolve(null))
      }
      // Copies: Cubism keeps no reference, but callers must never share a detached buffer.
      return buffers.get(path)!.then(buffer => buffer ? buffer.slice(0) : null)
    },
    image(path) {
      touch()
      if (!images.has(path)) {
        const blob = record.files[path]
        images.set(path, blob ? createImageBitmap(blob, { premultiplyAlpha: 'premultiply', colorSpaceConversion: 'none' }).catch(() => null) : Promise.resolve(null))
      }
      return images.get(path)!
    },
  }
}

/** Old saved records remain usable, but cannot play motions that were not imported. */
export function live2dNeedsReimport(record: Pick<Live2DRecord, 'files' | 'motions'> | null): boolean {
  return Boolean(record && LIVE2D_MOTION_FILES.some(name => !record.motions?.[name] || !record.files[record.motions[name]]))
}

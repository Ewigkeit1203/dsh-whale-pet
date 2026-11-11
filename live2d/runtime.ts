/**
 * Live2D runtime for 大肥鱼 (bundled by build.js with esbuild into lib/client.js).
 *
 * Uses the official Live2D Cubism Web Framework (vendor/live2d/CubismWebFramework,
 * Live2D Open Software License) on top of Cubism Core (vendor/live2d/Core,
 * Live2D Proprietary Software License). The model itself is never bundled:
 * the user imports the DeepSeek-chan (大肥鱼) model they downloaded from the
 * author, and this runtime reads it from the files the plugin stored locally.
 *
 * The model was made for VTube Studio, where face tracking moves the head.
 * Here there is no camera, so the tracking inputs (AngleX/Y/Z, PositionX/Y/Z,
 * LeanInput, ParamBreath) are synthesised by live2d-motion.ts from the
 * companion's state (a "look") and written before the model's own physics,
 * which turns them into head, body, hips, legs and hair. The model's blink,
 * idle loop and hand-gesture animations run alongside. Expression toggles (钢盆, 加载, 圈圈眼 …) come from the
 * model's Exp3 files and are blended in and out.
 */
import { PeekArmOrder, PeekElbow, PEEK_ELBOW } from '../src/client/peek-arm-order'
import { CubismFramework } from '../vendor/live2d/CubismWebFramework/src/live2dcubismframework'
import { CubismUserModel } from '../vendor/live2d/CubismWebFramework/src/model/cubismusermodel'
import { CubismModelSettingJson } from '../vendor/live2d/CubismWebFramework/src/cubismmodelsettingjson'
import { CubismEyeBlink } from '../vendor/live2d/CubismWebFramework/src/effect/cubismeyeblink'
import { CubismMatrix44 } from '../vendor/live2d/CubismWebFramework/src/math/cubismmatrix44'
import { CubismShader_WebGL } from '../vendor/live2d/CubismWebFramework/src/rendering/cubismshader_webgl'
import type { ACubismMotion } from '../vendor/live2d/CubismWebFramework/src/motion/acubismmotion'
import type { CubismModel } from '../vendor/live2d/CubismWebFramework/src/model/cubismmodel'
import { LIVE2D_SWIM, Live2DDriver, carryArmPose, Live2DFrameClock, Live2DGesturePlayer, LIVE2D_AUTHOR_IDLE, LIVE2D_GESTURES, parseMotionClip, sampleMotionCurve, type Live2DGesture } from '../src/client/live2d-motion'
import { SHADER_SOURCES } from './shaders'
import { LegPoseLayer, type LegMesh } from '../src/client/live2d-legs'
import type { Live2DLook, Live2DReady, Live2DRegion, Live2DSource, Live2DStage } from '../src/client/live2d-types'

export type { Live2DLook, Live2DReady, Live2DSource, Live2DStage }



// ---------------------------------------------------------------------------
// One-time setup
// ---------------------------------------------------------------------------

let frameworkStart: Promise<string | null> | null = null

/** Cubism Core instantiates its embedded WebAssembly asynchronously; wait until it answers. */
function coreAnswers(core: unknown): boolean {
  try { return Number((core as { Version: { csmGetVersion(): number } }).Version.csmGetVersion()) > 0 } catch { return false }
}

function ensureFramework(): Promise<string | null> {
  if (frameworkStart) return frameworkStart
  frameworkStart = (async () => {
    try {
      // The client's loader (src/client/live2d-loader.ts) starts Cubism Core before evaluating this bundle.
      const scope = globalThis as { Live2DCubismCore?: unknown }
      if (!scope.Live2DCubismCore) return 'core-missing'
      for (let waited = 0; !coreAnswers(scope.Live2DCubismCore); waited += 25) {
        if (waited > 8000) return 'core-timeout'
        await new Promise(resolve => setTimeout(resolve, 25))
      }
      // Shaders are embedded; the framework would otherwise fetch them from a folder.
      const shaderProto = CubismShader_WebGL.prototype as unknown as { loadShader(url: string): Promise<string> }
      shaderProto.loadShader = async (url: string) => SHADER_SOURCES[url.split('/').pop() ?? ''] ?? ''
      // Core 6 has a fixed callback table. Registering a JS logger can exhaust it,
      // especially after plugin reloads. Keep the Core's existing/default logger.
      CubismFramework.startUp()
      CubismFramework.initialize()
      return null
    } catch (error) {
      console.warn('[dsh-whale-pet][live2d] Cubism Core failed to start', error)
      return 'core-failed'
    }
  })()
  // A transient failure (e.g. timeout) may succeed on a later mount.
  void frameworkStart.then(problem => { if (problem && problem !== 'core-missing') frameworkStart = null })
  return frameworkStart
}


// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

interface ExpressionParam { index: number; value: number; blend: 'Add' | 'Multiply' | 'Overwrite' }
interface Toggle { params: ExpressionParam[]; weight: number }
interface GestureClip { duration: number; curves: { index: number; segments: readonly number[] }[] }

const EASE = 7 // per second
const TOGGLE_EASE = 6

function approach(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt))
}

class WhaleModel extends CubismUserModel {
  toggles = new Map<string, Toggle>()
  idle: ACubismMotion | null = null
  index = new Map<string, number>()

  get core(): CubismModel { return this._model }

  param(id: string): number {
    const cached = this.index.get(id)
    if (cached !== undefined) return cached
    const index = this._model.getParameterIndex(CubismFramework.getIdManager().getId(id))
    // getParameterIndex creates "virtual" parameters for unknown ids; keep only real ones.
    const real = index >= 0 && index < this._model.getParameterCount() ? index : -1
    this.index.set(id, real)
    return real
  }

  set(id: string, value: number, weight = 1): void {
    const i = this.param(id)
    if (i >= 0) this._model.setParameterValueByIndex(i, value, weight)
  }

  /** Value between the parameter's minimum (-1) and maximum (+1) around its default (0). */
  setNormalised(id: string, amount: number): void {
    const i = this.param(id)
    if (i < 0) return
    const model = this._model
    const base = model.getParameterDefaultValue(i)
    const span = amount >= 0 ? model.getParameterMaximumValue(i) - base : base - model.getParameterMinimumValue(i)
    model.setParameterValueByIndex(i, base + amount * span)
  }

  get eyeBlink() { return this._eyeBlink }
  set eyeBlink(value) { this._eyeBlink = value }
  get physics() { return this._physics }
  get motions() { return this._motionManager }
}

async function readJson(source: Live2DSource, path: string): Promise<{ buffer: ArrayBuffer; json: unknown } | null> {
  const buffer = await source.read(path)
  if (!buffer) return null
  try { return { buffer, json: JSON.parse(new TextDecoder().decode(buffer).replace(/^﻿/, '')) } } catch { return null }
}

function dirname(path: string): string {
  const slash = path.lastIndexOf('/')
  return slash < 0 ? '' : path.slice(0, slash + 1)
}

// ---------------------------------------------------------------------------
// Stage
// ---------------------------------------------------------------------------

export function createLive2DStage(canvas: HTMLCanvasElement, source: Live2DSource): Live2DStage {
  let disposed = false
  let failed = false
  let raf = 0
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null
  let model: WhaleModel | null = null
  const textures: WebGLTexture[] = []
  let look: Live2DLook = {}
  let mouthTarget = 0
  let motionScale = 1
  let frameRate = 30
  let powerSave = false
  let active = true
  let drawCost = 0
  let legs: LegPoseLayer | null = null
  let peekArms: PeekArmOrder | null = null
  let peekElbow: PeekElbow | null = null
  const carryPose = { suspended: 0, landing: 0 }
  // Wandering: feet off the ground and the landing, from the driver; and how fast the canvas itself is travelling.
  const swim = { float: 0, touchdown: 0, tilt: 0, bob: 0, x: NaN }
  /** Something quick is moving (gesture in/out, touch reaction, carrying): draw at the lively rate. */
  let lively = false
  let moving = false
  const LIVELY_FPS = 60
  // Touch regions: drawables under the model's 尾巴 and 头 parts (cdi3 names), and the last projection.
  let drawableRegion: Live2DRegion[] = []
  // Hover may arrive several times per rendered frame; reuse mesh bounds/order.
  let hitOrder: number[] = []
  let hitOrders = new Int32Array(0)
  let hitBoxes = new Float32Array(0)
  let hitBoxFrame = new Uint32Array(0)
  let modelFrame = 1
  const view = { sx: 1, sy: 1, tx: 0, ty: 0 }
  // Small copies of the textures' alpha, so a touch on a transparent part of a mesh does not count.
  const ALPHA_SIZE = 256
  const alphaMaps: (Uint8Array | null)[] = []
  // Pointer relative to her face; `at` is when it last moved, 0 when there is no pointer to watch.
  const pointer = { x: 0, y: 0, at: 0 }
  const driver = new Live2DDriver()
  const gestures = new Map<Live2DGesture, { enter: GestureClip; exit: GestureClip }>()
  let authorIdle: GestureClip | null = null
  const gesturePlayer = new Live2DGesturePlayer((gesture, part) => gestures.get(gesture)?.[part].duration ?? 1)
  let pointerRect: DOMRect | null = null
  let pointerRectAt = 0
  const frameClock = new Live2DFrameClock()
  let elapsed = 0
  let hullDue = 0.4
  let hullKey = ''
  let hullTargetKey = ''
  let hullMeasured = false
  let currentHull = ''
  const smooth: Record<string, number> = {}
  const bounds = { cx: 0, cy: 0, width: 1, height: 1 }
  const mvp = new CubismMatrix44()

  const stage: Live2DStage = {
    ready: null as unknown as Promise<Live2DReady>,
    isFailed() { return failed || disposed },
    getHull() { return currentHull },
    setActive(value) {
      active = value
      if (value) resumeFrames()
      else { cancelAnimationFrame(raf); raf = 0; peekElbow?.restore(); peekArms?.restore(); restPointer(); carryPose.suspended = 0; carryPose.landing = 0; driver.setDangle(0) }
    },
    pulse(kind, side) { driver.pulse(kind, side) },
    setDangle(angle, velocity) { driver.setDangle(angle, velocity) },
    setCarryPose(suspended, landing) {
      carryPose.suspended = Number.isFinite(suspended) ? Math.max(0, Math.min(1, suspended)) : 0
      carryPose.landing = Number.isFinite(landing) ? Math.max(0, Math.min(1, landing)) : 0
    },
    regionAt,
    setLook(next) {
      next = next || {}
      if (next.pulse && next.pulse !== look.pulse) driver.pulse(next.pulse)
      look = next
    },
    setMouth(open) { mouthTarget = Math.max(0, Math.min(1, open || 0)) },
    setMotion(scale) { motionScale = Math.max(0, Math.min(1, scale)) },
    setFrameRate(fps) { frameRate = Math.max(5, Math.min(60, fps || 30)) },
    setPowerSave(on) { powerSave = Boolean(on) },
    onHull: null,
    onFail: null,
    resize,
    dispose,
  }

  function fail(reason: string): never {
    failed = true
    stage.onFail?.(reason)
    throw new Error(reason)
  }

  function resize(): void {
    // Layout size, not getBoundingClientRect(): CSS bounces must not reallocate the drawing buffer.
    const ratio = Math.min(1.5, globalThis.devicePixelRatio || 1, 1200 / Math.max(1, canvas.clientWidth, canvas.clientHeight))
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio)), height = Math.max(1, Math.round(canvas.clientHeight * ratio))
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
  }

  async function load(): Promise<Live2DReady> {
    const coreProblem = await ensureFramework()
    if (coreProblem) fail(coreProblem)
    gl = (canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false }) as WebGL2RenderingContext | null)
      ?? (canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false }) as WebGLRenderingContext | null)
    if (!gl) fail('no-webgl')
    canvas.addEventListener('webglcontextlost', onContextLost)

    const settingFile = await source.read(source.modelPath)
    if (!settingFile) fail('model-json')
    const setting = new CubismModelSettingJson(settingFile, settingFile.byteLength)
    const home = dirname(source.modelPath)
    const moc = await source.read(home + setting.getModelFileName())
    if (!moc) fail('moc')
    if (disposed) return { aspect: 1 }

    const whale = new WhaleModel()
    whale.loadModel(moc, false)
    if (!whale.core) fail('moc-version')
    model = whale

    const physicsName = setting.getPhysicsFileName()
    if (physicsName) {
      const physics = await source.read(home + physicsName)
      if (physics) whale.loadPhysics(physics, physics.byteLength)
    }

    for (const [path, name] of Object.entries(source.expressions)) {
      const exp = await readJson(source, path)
      const params = (exp?.json as { Parameters?: { Id?: string; Value?: number; Blend?: string }[] } | undefined)?.Parameters
      if (!Array.isArray(params)) continue
      const list: ExpressionParam[] = []
      for (const p of params) {
        if (typeof p.Id !== 'string' || typeof p.Value !== 'number') continue
        const index = whale.param(p.Id)
        if (index < 0) continue
        list.push({ index, value: p.Value, blend: p.Blend === 'Multiply' ? 'Multiply' : p.Blend === 'Overwrite' ? 'Overwrite' : 'Add' })
      }
      whale.toggles.set(name, { params: list, weight: 0 })
    }

    const idleIds = new Set<string>()
    if (source.idleMotion) {
      const idle = await readJson(source, source.idleMotion)
      if (idle) {
        const motion = whale.loadMotion(idle.buffer, idle.buffer.byteLength, 'IDLE')
        if (motion) { motion.setEffectIds([], []); motion.setLoop(true); motion.setFadeInTime(0.5); motion.setFadeOutTime(0.5); whale.idle = motion }
        for (const curve of parseMotionClip(idle.json)?.curves ?? []) idleIds.add(curve.id)
      }
    }

    // Hand gestures: sampled directly so the enter animation can hold its last frame.
    const clip = async (name: string, keepIdleCurves = false): Promise<GestureClip | null> => {
      const path = source.motions?.[name]
      const data = path ? parseMotionClip((await readJson(source, path))?.json) : null
      if (!data) return null
      // Curves the idle loop also animates (glints, sparkles) are left to the idle loop.
      const curves = data.curves.filter(c => keepIdleCurves || !idleIds.has(c.id)).map(c => ({ index: whale.param(c.id), segments: c.segments })).filter(c => c.index >= 0)
      return curves.length ? { duration: data.duration, curves } : null
    }
    for (const [name, files] of Object.entries(LIVE2D_GESTURES) as [Live2DGesture, typeof LIVE2D_GESTURES[Live2DGesture]][]) {
      const enter = await clip(files.enter), exit = await clip(files.exit)
      if (enter && exit) gestures.set(name, { enter, exit })
    }
    // The author's whole idle performance (head, body, eyes, foxtail …) replaces everything while it plays.
    authorIdle = await clip(LIVE2D_AUTHOR_IDLE, true)
    if (authorIdle) driver.setAuthorIdle(authorIdle.duration)

    if (setting.getEyeBlinkParameterCount() > 0) whale.eyeBlink = CubismEyeBlink.create(setting)

    // Frame the visible character from its rest pose (drawable vertices in model units).
    whale.core.update()
    measureBounds(whale.core)
    findTouchParts(whale.core)
    legs = createLegLayer(whale.core)
    peekArms = createPeekArmOrder(whale.core)
    peekElbow = createPeekElbow(whale.core)

    const glContext = gl as WebGLRenderingContext
    const textureCount = setting.getTextureCount()
    for (let i = 0; i < textureCount; i++) {
      const file = setting.getTextureFileName(i)
      if (!file) continue
      const bitmap = await source.image(home + file)
      if (!bitmap) fail('texture')
      if (disposed) return { aspect: 1 }
      const texture = glContext.createTexture()!
      glContext.bindTexture(glContext.TEXTURE_2D, texture)
      glContext.pixelStorei(glContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
      glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, bitmap)
      glContext.generateMipmap(glContext.TEXTURE_2D)
      glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.LINEAR_MIPMAP_LINEAR)
      glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MAG_FILTER, glContext.LINEAR)
      glContext.pixelStorei(glContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0)
      textures[i] = texture
      alphaMaps[i] = alphaMap(bitmap)
    }

    resize()
    // One mask texture holds 36 clipping contexts; 大肥鱼 has about 50 (her tail alone stacks five masks).
    whale.createRenderer(canvas.width, canvas.height, Math.max(1, Math.ceil(countClippingContexts(whale.core) / 32)))
    const renderer = whale.getRenderer()
    renderer.setClippingMaskBufferSize(1024) // before startUp: it rebuilds the clipping manager
    renderer.startUp(glContext)
    renderer.setIsPremultipliedAlpha(true)
    textures.forEach((texture, i) => renderer.bindTexture(i, texture))
    renderer.loadShaders()

    resumeFrames()
    return { aspect: bounds.width / bounds.height }
  }

  function countClippingContexts(core: CubismModel): number {
    const contexts = new Set<string>()
    for (let d = 0; d < core.getDrawableCount(); d++) {
      const masks = core.getDrawableMasks()[d], count = core.getDrawableMaskCounts()[d]
      if (count > 0) contexts.add(Array.from(masks.slice(0, count)).sort((a, b) => a - b).join(','))
    }
    return contexts.size
  }

  function measureBounds(core: CubismModel): void {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (let d = 0; d < core.getDrawableCount(); d++) {
      if (!core.getDrawableDynamicFlagIsVisible(d) || core.getDrawableOpacity(d) < 0.02) continue
      const vertices = core.getDrawableVertices(d)
      for (let v = 0; v < vertices.length; v += 2) {
        const x = vertices[v], y = vertices[v + 1]
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    if (!Number.isFinite(minX)) { minX = -1; maxX = 1; minY = -1; maxY = 1 }
    // Room for swaying hair and tail, and toggles such as the steel bowl.
    const padX = (maxX - minX) * 0.06, padTop = (maxY - minY) * 0.025
    bounds.width = maxX - minX + padX * 2
    bounds.height = maxY - minY + padTop
    bounds.cx = (minX + maxX) / 2
    bounds.cy = minY + bounds.height / 2
  }

  function alphaMap(bitmap: ImageBitmap): Uint8Array | null {
    try {
      const surface = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(ALPHA_SIZE, ALPHA_SIZE) : Object.assign(document.createElement('canvas'), { width: ALPHA_SIZE, height: ALPHA_SIZE })
      const context = surface.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
      if (!context) return null
      context.drawImage(bitmap, 0, 0, ALPHA_SIZE, ALPHA_SIZE)
      const rgba = context.getImageData(0, 0, ALPHA_SIZE, ALPHA_SIZE).data
      const alpha = new Uint8Array(ALPHA_SIZE * ALPHA_SIZE)
      for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3]
      return alpha
    } catch { return null }
  }

  /** Drawables whose part (or an ancestor part) is the tail or the head. */
  function findTouchParts(core: CubismModel): void {
    const parents = core.getPartParentPartIndices()
    const idOf = (name: string) => core.getPartIndex(CubismFramework.getIdManager().getId(name))
    const tail = idOf('Part136'), head = idOf('Part99')
    const chest = ['Part88', 'Part86', 'Part85'].map(idOf).filter(id => id >= 0)
    const under = (part: number, target: number) => { for (let p = part, guard = 0; p >= 0 && guard < 64; p = parents[p], guard++) if (p === target) return true; return false }
    drawableRegion = []
    const count = core.getDrawableCount()
    hitOrder = Array.from({ length: count }, (_, i) => i)
    hitOrders = new Int32Array(count).fill(-1)
    hitBoxes = new Float32Array(count * 4)
    hitBoxFrame = new Uint32Array(count)
    for (let d = 0; d < core.getDrawableCount(); d++) {
      const part = core.getDrawableParentPartIndex(d)
      drawableRegion[d] = tail >= 0 && under(part, tail) ? 'tail' : head >= 0 && under(part, head) ? 'head' : chest.some(id => under(part, id)) ? 'chest' : 'body'
    }
  }

  function regionAt(clientX: number, clientY: number): Live2DRegion | null {
    const core = model?.core
    if (!core) return null
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    // Client point → clip space → model units (inverse of the matrix in frame()).
    const x = (((clientX - rect.left) / rect.width) * 2 - 1 - view.tx) / view.sx
    const y = ((1 - ((clientY - rect.top) / rect.height) * 2) - view.ty) / view.sy
    // The visible mesh on top at this point decides (the tail behind her legs does not count).
    const covers = (d: number) => {
      if (!core.getDrawableDynamicFlagIsVisible(d) || core.getDrawableOpacity(d) < 0.1 || core.getDrawableBlendMode(d) !== 0) return false
      const v = core.getDrawableVertices(d), uv = core.getDrawableVertexUvs(d), idx = core.getDrawableVertexIndices(d)
      const box = d * 4
      if (hitBoxFrame[d] !== modelFrame) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
        for (let i = 0; i < v.length; i += 2) { const px = v[i], py = v[i + 1]; if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py }
        hitBoxes[box] = minX; hitBoxes[box + 1] = maxX; hitBoxes[box + 2] = minY; hitBoxes[box + 3] = maxY
        hitBoxFrame[d] = modelFrame
      }
      if (x < hitBoxes[box] || x > hitBoxes[box + 1] || y < hitBoxes[box + 2] || y > hitBoxes[box + 3]) return false
      const alpha = alphaMaps[core.getDrawableTextureIndex(d)]
      for (let i = 0; i + 2 < idx.length; i += 3) {
        const a = idx[i] * 2, b = idx[i + 1] * 2, c = idx[i + 2] * 2
        // Barycentric coordinates of the point in this triangle.
        const det = (v[b + 1] - v[c + 1]) * (v[a] - v[c]) + (v[c] - v[b]) * (v[a + 1] - v[c + 1])
        if (!det) continue
        const l1 = ((v[b + 1] - v[c + 1]) * (x - v[c]) + (v[c] - v[b]) * (y - v[c + 1])) / det
        const l2 = ((v[c + 1] - v[a + 1]) * (x - v[c]) + (v[a] - v[c]) * (y - v[c + 1])) / det
        const l3 = 1 - l1 - l2
        if (l1 < 0 || l2 < 0 || l3 < 0) continue
        if (!alpha) return true
        // Texture v runs bottom-up (the vertex shader flips it).
        const u = l1 * uv[a] + l2 * uv[b] + l3 * uv[c], w = 1 - (l1 * uv[a + 1] + l2 * uv[b + 1] + l3 * uv[c + 1])
        const px = Math.min(ALPHA_SIZE - 1, Math.max(0, Math.floor(u * ALPHA_SIZE))), py = Math.min(ALPHA_SIZE - 1, Math.max(0, Math.floor(w * ALPHA_SIZE)))
        if (alpha[py * ALPHA_SIZE + px] > 48) return true
      }
      return false
    }
    const orders = core.getRenderOrders()
    let reordered = false
    for (let d = 0; d < hitOrder.length; d++) if (hitOrders[d] !== orders[d]) { hitOrders[d] = orders[d]; reordered = true }
    if (reordered) hitOrder.sort((a, b) => hitOrders[b] - hitOrders[a])
    for (const d of hitOrder) if (covers(d)) return drawableRegion[d] ?? 'body'
    return null
  }

  function createPeekElbow(core: CubismModel): PeekElbow {
    const ids = CubismFramework.getIdManager()
    return PeekElbow.forModel({
      count: core.getDrawableCount(),
      partParents: core.getPartParentPartIndices(),
      partIndex: id => core.getPartIndex(ids.getId(id)),
      drawableIndex: id => core.getDrawableIndex(ids.getId(id)),
      drawablePart: index => core.getDrawableParentPartIndex(index),
      vertices: index => core.getDrawableVertices(index),
    }, index => { core.getModel().drawables.dynamicFlags[index] |= 0x20 })
  }

  function createPeekArmOrder(core: CubismModel): PeekArmOrder {
    const ids = CubismFramework.getIdManager()
    return PeekArmOrder.forModel({
      count: core.getDrawableCount(),
      partParents: core.getPartParentPartIndices(),
      partIndex: id => core.getPartIndex(ids.getId(id)),
      drawableIndex: id => core.getDrawableIndex(ids.getId(id)),
      drawablePart: index => core.getDrawableParentPartIndex(index),
    })
  }

  function createLegLayer(core: CubismModel): LegPoseLayer {
    const parents = core.getPartParentPartIndices()
    const left = core.getPartIndex(CubismFramework.getIdManager().getId('Part18'))
    const right = core.getPartIndex(CubismFramework.getIdManager().getId('Part30'))
    const under = (part: number, target: number) => { for (let p = part, guard = 0; p >= 0 && guard < 64; p = parents[p], guard++) if (p === target) return true; return false }
    const meshes: LegMesh[] = []
    for (let d = 0; d < core.getDrawableCount(); d++) {
      const part = core.getDrawableParentPartIndex(d)
      const side = left >= 0 && under(part, left) ? -1 : right >= 0 && under(part, right) ? 1 : 0
      if (side) meshes.push({ index: d, side, vertices: core.getDrawableVertices(d) })
    }
    return new LegPoseLayer(meshes, index => {
      // Cubism Core's VertexPositionsDidChange bit; clipping masks must follow the posed legs too.
      core.getModel().drawables.dynamicFlags[index] |= 0x20
    })
  }

  function onContextLost(event: Event): void {
    event.preventDefault()
    cancelAnimationFrame(raf)
    if (!disposed && !failed) { failed = true; stage.onFail?.('context-lost') }
  }

  function eased(key: string, target: number, dt: number, rate = EASE): number {
    const value = approach(smooth[key] ?? target, target, rate, dt)
    smooth[key] = value
    return value
  }

  function trackPointer(event: PointerEvent): void {
    if (!active || !motionScale || document.hidden || event.pointerType === 'touch') return
    const now = performance.now()
    if (!pointerRect || now - pointerRectAt > 100) { pointerRect = canvas.getBoundingClientRect(); pointerRectAt = now }
    const rect = pointerRect
    pointer.x = Math.max(-1, Math.min(1, (event.clientX - rect.left - rect.width * 0.5) / Math.max(160, rect.width)))
    pointer.y = Math.max(-1, Math.min(1, (rect.top + rect.height * 0.22 - event.clientY) / Math.max(180, rect.height * 0.65)))
    pointer.at = now
  }
  function restPointer(): void { pointer.x = 0; pointer.y = 0; pointer.at = 0 }
  // Local hour for time-of-day idling, read once a minute.
  let hour = new Date().getHours(), hourAt = 0
  function hourNow(now: number): number { if (now - hourAt > 60000) { hour = new Date().getHours(); hourAt = now } return hour }
  // The user typing in the host (a text box that is not ours to touch): only when and where, never what.
  const typing = { x: 0, y: 0, at: 0 }
  function trackTyping(event: Event): void {
    if (!active || !motionScale || document.hidden) return
    const target = event.target as HTMLElement | null
    if (!target || !(target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    const now = performance.now()
    if (now - typing.at > 500) {
      const box = target.getBoundingClientRect(), rect = canvas.getBoundingClientRect()
      typing.x = Math.max(-1, Math.min(1, (box.left + box.width * 0.5 - rect.left - rect.width * 0.5) / Math.max(160, rect.width)))
      typing.y = Math.max(-1, Math.min(1, (rect.top + rect.height * 0.22 - box.top - box.height * 0.5) / Math.max(180, rect.height * 0.65)))
    }
    typing.at = now
  }
  function resumeFrames(): void {
    if (disposed || failed || !active || !model || !gl || document.hidden || raf) return
    frameClock.reset(performance.now())
    raf = requestAnimationFrame(frame)
  }
  function visibilityChanged(): void {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; restPointer() }
    else resumeFrames()
  }
  document.addEventListener('visibilitychange', visibilityChanged)
  window.addEventListener('pointermove', trackPointer, { passive: true })
  document.addEventListener('input', trackTyping, { capture: true, passive: true })
  window.addEventListener('blur', restPointer)
  // Back in DSH: measure again from scratch instead of inheriting background-frame costs.
  const refocused = () => { drawCost = 0 }
  window.addEventListener('focus', refocused)
  document.addEventListener('pointerleave', restPointer)

  function applyLook(whale: WhaleModel, dt: number, now: number): void {
    const m = motionScale
    // Semantic inputs only: the physics derives ParamAngle*, ParamBodyAngle*, hips, legs and arms from them.
    let travel = 0
    if (look.walk && m) {
      const x = canvas.getBoundingClientRect().left
      if (!Number.isNaN(swim.x) && dt > 0) travel = Math.max(-1, Math.min(1, (x - swim.x) / dt / LIVE2D_SWIM.speed))
      swim.x = x
    } else swim.x = NaN
    const drive = driver.update({
      travel,
      dt, motion: m, look, talking: mouthTarget, landingHandled: legs?.available ?? false,
      pointer: pointer.at ? { x: pointer.x, y: pointer.y, still: (now - pointer.at) / 1000 } : null,
      hour: hourNow(now),
      typing: typing.at && now - typing.at < 4000 ? { x: typing.x, y: typing.y, since: (now - typing.at) / 1000 } : null,
    })
    whale.set('AngleX', drive.AngleX)
    whale.set('AngleY', drive.AngleY)
    whale.set('AngleZ', drive.AngleZ)
    whale.set('PositionX', drive.PositionX)
    whale.set('PositionY', drive.PositionY)
    whale.set('PositionZ', drive.PositionZ)
    whale.set('LeanInput', drive.LeanInput)
    whale.set('ParamBreath', drive.ParamBreath)
    whale.set('ParamEyeBallX', drive.ParamEyeBallX)
    whale.set('ParamEyeBallY', drive.ParamEyeBallY)
    whale.setNormalised('EyeSmile', Math.max(-1, Math.min(1, eased('smile', look.smile ?? 0, dt) + drive.smile)))
    whale.setNormalised('ParamMouthForm', eased('form', look.mouthForm ?? 0, dt))
    whale.setNormalised('CheeckPuff', eased('cheek', look.cheek ?? 0, dt))
    // ShockL/R are physics outputs of the brows: surprise raises the brows.
    const brow = Math.max(-1, Math.min(1, eased('shock', look.shock ?? 0, dt, 10) * 0.8 + drive.brow))
    whale.setNormalised('ParamBrowLY', brow)
    whale.setNormalised('ParamBrowRY', brow)
    whale.setNormalised('BrowInnerUp', Math.max(0, brow) * 0.6)

    const chew = look.chew ? (0.5 + 0.5 * Math.sin(elapsed * 11)) * 0.55 : 0
    // Speaking: syllable-like flaps with an uneven rhythm while text appears.
    const speech = mouthTarget * (0.2 + 0.6 * Math.abs(Math.sin(elapsed * 8.7 + Math.sin(elapsed * 2.3) * 1.6)))
    const mouth = eased('mouth', Math.max(speech, chew, look.mouth ?? 0, drive.mouth), dt, 18)
    whale.setNormalised('ParamMouthOpenY', mouth)
    whale.setNormalised('ParamA', mouth * 0.7)

    const eyeOpen = Math.max(0, eased('eyeOpen', look.eyeOpen ?? 1, dt, 6) + drive.eyeOpen)
    if (Math.abs(eyeOpen - 1) > 0.002) {
      for (const eye of ['ParamEyeLOpen', 'ParamEyeROpen']) {
        const i = whale.param(eye)
        if (i >= 0) whale.core.multiplyParameterValueByIndex(i, eyeOpen)
      }
    }

    if (authorIdle && drive.performance === 'author' && drive.performanceWeight > 0.001) {
      const time = Math.min(drive.performanceTime, authorIdle.duration)
      for (const curve of authorIdle.curves) whale.core.setParameterValueByIndex(curve.index, sampleMotionCurve(curve.segments, time), drive.performanceWeight)
    }

    // Native hand gestures replace their toggle fallback (older imports keep the toggle).
    const gesture = look.gesture && gestures.has(look.gesture) ? look.gesture : null
    gesturePlayer.want(look.held || look.guardChest || look.edgePeek ? null : gesture ?? (drive.gesture && gestures.has(drive.gesture) ? drive.gesture : null))
    const playing = gesturePlayer.update(dt)
    // Long ambient performances keep the desktop's 30 fps budget. Only short
    // reactions, carrying and gesture transitions request extra frames.
    moving = drive.moving
    swim.float = drive.float; swim.touchdown = drive.touchdown; swim.tilt = drive.swimTilt; swim.bob = drive.swimBob
    lively = (drive.lively && (!drive.performance || Boolean(look.held))) || gesturePlayer.phase === 'enter' || gesturePlayer.phase === 'exit'
    if (playing) {
      const clip = gestures.get(playing.gesture)?.[playing.part]
      if (clip) for (const curve of clip.curves) whale.core.setParameterValueByIndex(curve.index, sampleMotionCurve(curve.segments, playing.time))
    }
    const replaced: string = gesture ? LIVE2D_GESTURES[gesture].fallback : ''
    const wanted = new Set((look.toggles ?? []).filter(name => name !== replaced))
    for (const [name, toggle] of whale.toggles) {
      toggle.weight = approach(toggle.weight, wanted.has(name) ? 1 : 0, TOGGLE_EASE, dt)
      if (toggle.weight < 0.002) { toggle.weight = wanted.has(name) ? toggle.weight : 0; if (!toggle.weight) continue }
      for (const p of toggle.params) {
        const core = whale.core
        if (p.blend === 'Add') core.addParameterValueByIndex(p.index, p.value, toggle.weight)
        else if (p.blend === 'Multiply') core.multiplyParameterValueByIndex(p.index, p.value, toggle.weight)
        else core.setParameterValueByIndex(p.index, p.value, toggle.weight)
      }
    }
    applyCarryArms(whale, drive.armLift, elapsed)
    // Idle and conversation arm poses, unless a native gesture, the carry paws or the chest cover has the arms.
    if (gesturePlayer.phase === 'none' && drive.armLift < 0.001 && drive.armCover < 0.001) {
      const a = drive.arms
      if (a.lu || a.lf || a.lw) { whale.set('Param62', a.lu); whale.set('Param60', a.lf); whale.set('Param61', a.lw) }
      if (a.ru || a.rf || a.rw) { whale.set('Param36', a.ru); whale.set('Param41', a.rf); whale.set('Param42', a.rw) }
    }
    applyChestCover(whale, drive.armCover)
    // Native rig poses only: hands remain attached to their authored wrists and forearms.
    // Leaving the edge, the arm comes back first (faster than it went out), so she is back in the author's
    // pose before she reaches her spot; the elbow tuck and draw order follow this same weight.
    const peek = eased('edgePeek', look.edgePeek ? 1 : 0, dt, look.edgePeek ? 7 : 14)
    if (peek > 0.001) {
      for (const id of ['Movement1', 'Movement2', 'Movement3']) whale.set(id, 0, peek)
      // A connected native forearm reaches diagonally from her waist beyond the right edge.
      // The hand stays on its authored wrist and leaves the viewport naturally; no palm masking.
      // Upper arm nearly straight, a bend only at the elbow (rendered and chosen with the user; a negative
      // upper arm bends the sleeve itself, which this rig was not authored for).
      whale.set('Param62', PEEK_ELBOW.upper, peek); whale.set('Param60', PEEK_ELBOW.forearm, peek)
      whale.set('Param36', 0, peek); whale.set('Param41', 0, peek)
      whale.set('Param61', 0, peek); whale.set('Param42', 0, peek)
    }
  }

  /**
   * Chest touch: her left hand goes to her chest, using the end pose of the author's own
   * hand-on-chest animation (rig-authored inputs, not the LArm/RArm physics outputs).
   * The other arm is left alone; carrying uses its own calibrated, mirrored path.
   */
  function applyChestCover(whale: WhaleModel, cover: number): void {
    if (cover < 0.001) return
    whale.set('Movement2', 1, cover)
    whale.set('Param56', 1, cover)
    whale.set('Param59', 0.476, cover)
    whale.set('Param62', 0.034, cover)
    whale.set('Param60', 0.86, cover)
    whale.set('Param61', 0, cover)
  }

  /** Same calibrated path in both directions; never turn the hands through the torso. */
  function applyCarryArms(whale: WhaleModel, lift: number, time: number): void {
    if (lift < 0.001) return
    const pose = carryArmPose(lift, time)
    // A previous hand prop/gesture must not mask the normal arms during pickup.
    for (const id of ['Movement1', 'Movement2', 'Movement3']) whale.set(id, 0, Math.min(1, lift * 5))
    whale.set('Param62', pose.leftUpper)
    whale.set('Param60', pose.leftForearm)
    whale.set('Param36', pose.rightUpper)
    whale.set('Param41', pose.rightForearm)
  }

  function frame(now: number): void {
    raf = 0
    if (disposed || failed || !active || !model || !gl || document.hidden) return
    raf = requestAnimationFrame(frame)
    // 大肥鱼 is a heavy model (≈700 meshes, large physics): cap the rate, and lower it while DSH is in the background.
    // Quick motions (hands, touch reactions, being carried) get up to 60 fps; slow idling stays at the ambient rate.
    // While the pointer moves (her eyes follow it) she is also drawn smoothly, if frames are cheap on this machine.
    const watched = pointer.at > 0 && now - pointer.at < 1200 && drawCost < 5
    const background = typeof document !== 'undefined' && typeof document.hasFocus === 'function' && !document.hasFocus()
    const budgetFps = Math.min(lively || watched || (moving && drawCost < 4) ? Math.max(frameRate, LIVELY_FPS) : frameRate, Math.max(15, 1000 / Math.max(1, drawCost * 2)))
    const fps = powerSave
      ? Math.min(background ? 10 : lively || watched ? 30 : 20, budgetFps)
      : background ? Math.min(15, budgetFps) : budgetFps
    // Even pacing on any refresh rate (60, 120, 144 Hz): keep the average interval, not "at least one interval".
    const dt = frameClock.tick(now, fps)
    if (dt === null) return
    elapsed += dt
    const frameStart = performance.now()
    const whale = model
    const core = whale.core

    core.loadParameters()
    const motions = whale.motions
    if (whale.idle && motions.isFinished()) motions.startMotionPriority(whale.idle, false, 1)
    motions.updateMotion(core, dt)
    core.saveParameters()
    whale.eyeBlink?.updateParameters(core, dt)
    applyLook(whale, dt, now)
    whale.physics?.evaluate(core, dt)
    legs?.restore()
    peekElbow?.restore()
    peekArms?.restore()
    core.update()
    if (core.getRenderOrders) peekArms?.apply(core.getRenderOrders(), smooth.edgePeek ?? 0)
    peekElbow?.apply(smooth.edgePeek ?? 0)
    const bodyDrop = legs?.apply(Math.max(carryPose.suspended * motionScale, swim.float), Math.max(carryPose.landing * motionScale, swim.touchdown)) ?? 0
    modelFrame = (modelFrame + 1) >>> 0

    resize()
    const context = gl
    context.viewport(0, 0, canvas.width, canvas.height)
    context.clearColor(0, 0, 0, 0)
    context.clear(context.COLOR_BUFFER_BIT)
    // Keep her proportions: fit the framed bounds into the canvas, feet on the bottom edge.
    const canvasAspect = canvas.width / canvas.height, modelAspect = bounds.width / bounds.height
    let sx: number, sy: number
    if (canvasAspect > modelAspect) { sy = 2 / bounds.height; sx = sy / canvasAspect }
    else { sx = 2 / bounds.width; sy = sx * canvasAspect }
    const bottom = bounds.cy - bounds.height / 2
    const matrix = mvp.getArray()
    matrix.fill(0)
    matrix[0] = sx; matrix[5] = sy; matrix[10] = 1; matrix[15] = 1
    matrix[12] = -bounds.cx * sx
    matrix[13] = -1 - bottom * sy - bodyDrop * sy
    view.sx = sx; view.sy = sy; view.tx = matrix[12]; view.ty = matrix[13]
    if (swim.float > 0.001) {
      // Swimming across: lift her off the ground a little and lean the whole figure about her waist (drawing only;
      // touch regions keep the upright view, which is close enough for the few seconds she travels).
      const a = -swim.tilt * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a)
      const px = bounds.cx, py = bottom + bounds.height * 0.55
      const rise = bounds.height * (LIVE2D_SWIM.lift * swim.float + LIVE2D_SWIM.bob * swim.bob)
      matrix[0] = sx * cos; matrix[4] = -sx * sin; matrix[12] += sx * (px - cos * px + sin * py)
      matrix[1] = sy * sin; matrix[5] = sy * cos; matrix[13] += sy * (py - sin * px - cos * py + rise)
    }
    const renderer = whale.getRenderer()
    renderer.setMvpMatrix(mvp)
    // This canvas/context belongs exclusively to this stage; draw to its default framebuffer.
    renderer.setRenderState(null, [0, 0, canvas.width, canvas.height])
    renderer.drawModel()

    hullDue -= dt
    const key = (look.toggles ?? []).join('|')
    if (key !== hullTargetKey) { hullTargetKey = key; hullDue = 0.35 }
    if (stage.onHull && hullDue <= 0 && (hullKey !== key || !hullMeasured)) { hullKey = key; hullMeasured = true; measureHull(context) }
    // Cost per 60 Hz step: physics catches up in fixed steps, so a slow frame (15 fps in the background) costs
    // several steps' worth. Measured raw, that cost kept the budget at its 15 fps floor even after she was
    // looked at again (slower frames → more steps per frame → "slower" frames): the stutter after a long idle.
    drawCost = drawCost * 0.9 + (performance.now() - frameStart) / Math.max(1, dt * 60) * 0.1
  }

  /** Coarse outline from the rendered alpha, as a clip-path polygon (like hitareas.ts). */
  function measureHull(context: WebGLRenderingContext | WebGL2RenderingContext): void {
    const width = canvas.width, height = canvas.height
    if (width < 8 || height < 8) return
    const pixels = new Uint8Array(width * height * 4)
    context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, pixels)
    const rows = 40
    const left: number[] = [], right: number[] = []
    for (let r = 0; r < rows; r++) {
      const y0 = Math.floor((r / rows) * height), y1 = Math.floor(((r + 1) / rows) * height)
      let min = width, max = -1
      for (let y = y0; y < y1; y += 2) {
        const row = (height - 1 - y) * width * 4 // readPixels is bottom-up
        for (let x = 0; x < width; x += 2) if (pixels[row + x * 4 + 3] > 24) { if (x < min) min = x; if (x > max) max = x }
      }
      left.push(max < 0 ? -1 : min / width)
      right.push(max < 0 ? -1 : max / width)
    }
    const first = left.findIndex(v => v >= 0)
    let last = -1
    for (let r = rows - 1; r >= 0; r--) if (left[r] >= 0) { last = r; break }
    if (first < 0) return
    const pad = 0.025
    const pct = (v: number) => (Math.max(0, Math.min(1, v)) * 100).toFixed(1) + '%'
    const points: string[] = []
    for (let r = first; r <= last; r++) if (left[r] >= 0) {
      points.push(`${pct(left[r] - pad)} ${pct(r / rows - (r === first ? 0.01 : 0))}`, `${pct(left[r] - pad)} ${pct((r + 1) / rows)}`)
    }
    for (let r = last; r >= first; r--) if (right[r] >= 0) {
      points.push(`${pct(right[r] + pad)} ${pct((r + 1) / rows)}`, `${pct(right[r] + pad)} ${pct(r / rows - (r === first ? 0.01 : 0))}`)
    }
    currentHull = `polygon(${points.join(', ')})`
    stage.onHull?.(currentHull)
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', trackPointer)
    document.removeEventListener('input', trackTyping, { capture: true })
    window.removeEventListener('blur', restPointer)
    window.removeEventListener('focus', refocused)
    document.removeEventListener('pointerleave', restPointer)
    document.removeEventListener('visibilitychange', visibilityChanged)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    try {
      legs?.restore(); legs = null
      peekElbow?.restore(); peekElbow = null
      peekArms?.restore(); peekArms = null
      if (model) { model.release(); model = null }
      if (gl) { for (const texture of textures) gl.deleteTexture(texture); (gl.getExtension('WEBGL_lose_context') as { loseContext(): void } | null)?.loseContext() }
    } catch { /* already gone */ }
    gl = null
  }

  stage.ready = load().catch(error => {
    if (!failed && !disposed) { failed = true; stage.onFail?.(String((error as Error)?.message || error)) }
    throw error
  })
  stage.ready.catch(() => { /* reported through onFail */ })
  return stage
}

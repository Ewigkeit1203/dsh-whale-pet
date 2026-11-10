/**
 * Lazy loader for the Live2D runtime (see live2d/runtime.ts).
 *
 * build.js embeds Cubism Core and the bundled runtime as two functions that
 * are only called here, the first time an imported model is shown. Cubism
 * Core instantiates its embedded WebAssembly asynchronously and the framework
 * reads Core's enums while it is evaluated, so Core must answer first.
 * Nothing is fetched from the network.
 */
import type { Live2DLook, Live2DSource, Live2DStage } from './live2d-types.js'

declare const __dshLoadCubismCore: (() => unknown) | undefined
declare const __dshLoadLive2DRuntime: (() => { createLive2DStage(canvas: HTMLCanvasElement, source: Live2DSource): Live2DStage }) | undefined

export type { Live2DLook, Live2DSource, Live2DStage }

let live2dRuntime: Promise<{ createLive2DStage(canvas: HTMLCanvasElement, source: Live2DSource): Live2DStage } | null> | null = null

/** True when this build carries Cubism Core and the runtime. */
export function live2dBundled(): boolean {
  return typeof __dshLoadCubismCore === 'function' && typeof __dshLoadLive2DRuntime === 'function'
}

function cubismAnswers(core: unknown): boolean {
  try { return Number((core as { Version: { csmGetVersion(): number } }).Version.csmGetVersion()) > 0 } catch { return false }
}

export function loadLive2DRuntime(): Promise<{ createLive2DStage(canvas: HTMLCanvasElement, source: Live2DSource): Live2DStage } | null> {
  if (live2dRuntime) return live2dRuntime
  live2dRuntime = (async () => {
    if (!live2dBundled()) return null
    try {
      const scope = globalThis as { Live2DCubismCore?: unknown }
      if (!scope.Live2DCubismCore) scope.Live2DCubismCore = __dshLoadCubismCore!()
      for (let waited = 0; !cubismAnswers(scope.Live2DCubismCore); waited += 25) {
        if (waited > 10000) return null
        await new Promise(resolve => setTimeout(resolve, 25))
      }
      return __dshLoadLive2DRuntime!()
    } catch (error) {
      console.warn('[dsh-whale-pet][live2d] runtime failed to load', error)
      return null
    }
  })()
  // Let a later attempt retry after a transient failure.
  void live2dRuntime.then(runtime => { if (!runtime) live2dRuntime = null })
  return live2dRuntime
}


/** A cached model can be reused only while its graphics context is healthy. */
interface Live2DLease { canvas: HTMLCanvasElement; stage: Live2DStage; release(): void }
interface Live2DCacheEntry {
  task: Promise<{canvas: HTMLCanvasElement; stage: Live2DStage}>
  users: number
  retired: boolean
  timer?: ReturnType<typeof setTimeout>
}
const live2dStages = new WeakMap<Live2DSource, Live2DCacheEntry>()
function retireLive2DStage(source: Live2DSource, entry: Live2DCacheEntry): void {
  if (entry.retired) return
  entry.retired = true
  if (entry.timer) clearTimeout(entry.timer)
  if (live2dStages.get(source) === entry) live2dStages.delete(source)
  void entry.task.then(view => { view.stage.dispose(); view.canvas.remove() }, () => {})
}
export async function acquireLive2DStage(source: Live2DSource): Promise<Live2DLease> {
  let entry = live2dStages.get(source)
  if (entry) {
    const cached = await entry.task.catch(() => null)
    if (!cached || cached.stage.isFailed()) {
      retireLive2DStage(source, entry)
      // Another consumer may already have replaced the failed entry.
      return acquireLive2DStage(source)
    }
    if (entry.retired) return acquireLive2DStage(source)
  } else {
    const task = loadLive2DRuntime().then(runtime => {
      if (!runtime) throw new Error('core-missing')
      const canvas = document.createElement('canvas')
      return { canvas, stage: runtime.createLive2DStage(canvas, source) }
    })
    entry = { task, users: 0, retired: false }
    live2dStages.set(source, entry)
    const own = entry
    void task.then(view => view.stage.ready.catch(() => retireLive2DStage(source, own)), () => retireLive2DStage(source, own))
  }
  const own = entry
  if (own.timer) clearTimeout(own.timer)
  own.users++
  let view: Awaited<typeof own.task>
  try { view = await own.task } catch (error) { own.users--; throw error }
  view.stage.setActive(true)
  let released = false
  return { ...view, release() {
    if (released) return
    released = true
    if (--own.users > 0 || own.retired) return
    view.stage.setActive(false)
    view.canvas.remove()
    view.stage.onHull = null; view.stage.onFail = null
    if (view.stage.isFailed()) retireLive2DStage(source, own)
    else own.timer = setTimeout(() => retireLive2DStage(source, own), 30000)
  } }
}

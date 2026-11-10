let live2dRuntime = null;
/** True when this build carries Cubism Core and the runtime. */
export function live2dBundled() {
    return typeof __dshLoadCubismCore === 'function' && typeof __dshLoadLive2DRuntime === 'function';
}
function cubismAnswers(core) {
    try {
        return Number(core.Version.csmGetVersion()) > 0;
    }
    catch {
        return false;
    }
}
export function loadLive2DRuntime() {
    if (live2dRuntime)
        return live2dRuntime;
    live2dRuntime = (async () => {
        if (!live2dBundled())
            return null;
        try {
            const scope = globalThis;
            if (!scope.Live2DCubismCore)
                scope.Live2DCubismCore = __dshLoadCubismCore();
            for (let waited = 0; !cubismAnswers(scope.Live2DCubismCore); waited += 25) {
                if (waited > 10000)
                    return null;
                await new Promise(resolve => setTimeout(resolve, 25));
            }
            return __dshLoadLive2DRuntime();
        }
        catch (error) {
            console.warn('[dsh-whale-pet][live2d] runtime failed to load', error);
            return null;
        }
    })();
    // Let a later attempt retry after a transient failure.
    void live2dRuntime.then(runtime => { if (!runtime)
        live2dRuntime = null; });
    return live2dRuntime;
}
const live2dStages = new WeakMap();
function retireLive2DStage(source, entry) {
    if (entry.retired)
        return;
    entry.retired = true;
    if (entry.timer)
        clearTimeout(entry.timer);
    if (live2dStages.get(source) === entry)
        live2dStages.delete(source);
    void entry.task.then(view => { view.stage.dispose(); view.canvas.remove(); }, () => { });
}
export async function acquireLive2DStage(source) {
    let entry = live2dStages.get(source);
    if (entry) {
        const cached = await entry.task.catch(() => null);
        if (!cached || cached.stage.isFailed()) {
            retireLive2DStage(source, entry);
            // Another consumer may already have replaced the failed entry.
            return acquireLive2DStage(source);
        }
        if (entry.retired)
            return acquireLive2DStage(source);
    }
    else {
        const task = loadLive2DRuntime().then(runtime => {
            if (!runtime)
                throw new Error('core-missing');
            const canvas = document.createElement('canvas');
            return { canvas, stage: runtime.createLive2DStage(canvas, source) };
        });
        entry = { task, users: 0, retired: false };
        live2dStages.set(source, entry);
        const own = entry;
        void task.then(view => view.stage.ready.catch(() => retireLive2DStage(source, own)), () => retireLive2DStage(source, own));
    }
    const own = entry;
    if (own.timer)
        clearTimeout(own.timer);
    own.users++;
    let view;
    try {
        view = await own.task;
    }
    catch (error) {
        own.users--;
        throw error;
    }
    view.stage.setActive(true);
    let released = false;
    return { ...view, release() {
            if (released)
                return;
            released = true;
            if (--own.users > 0 || own.retired)
                return;
            view.stage.setActive(false);
            view.canvas.remove();
            view.stage.onHull = null;
            view.stage.onFail = null;
            if (view.stage.isFailed())
                retireLive2DStage(source, own);
            else
                own.timer = setTimeout(() => retireLive2DStage(source, own), 30000);
        } };
}
//# sourceMappingURL=live2d-loader.js.map
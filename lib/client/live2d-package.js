import { LIVE2D_MOTION_FILES } from './live2d-motion.js';
export const LIVE2D_TEXTURE_LIMIT = 2048;
/** Display info parameter names that identify 大肥鱼 (cdi3.json). */
export const LIVE2D_SIGNATURE = ['加载', '大钢盆', '圈圈眼'];
export const LIVE2D_CREDIT = {
    model: 'DeepSeek-chan（大肥鱼）',
    art: '神宫凉子',
    rigging: '霓虹猫_NeonNeko',
    /** The author's Bilibili page. */
    page: 'https://space.bilibili.com/13737731',
    /** Where the model is obtained (the link the owner put in the README). */
    get: 'https://gf.bilibili.com/item/detail/1109618072?noTitleBar=1&from=mall-up_itemDetail&msource=cps_comments_13737731_cont-1-117527753588880&track_id=__BGMT__',
};
/** Forward slashes, no leading './' or '/'. */
export function normaliseLive2DPath(path) {
    return path.replace(/\\/g, '/').replace(/^(\.\/|\/)+/, '');
}
function live2dDir(path) {
    const slash = path.lastIndexOf('/');
    return slash < 0 ? '' : path.slice(0, slash + 1);
}
/** The model3.json closest to the top of the picked folder. */
export function findLive2DModel(paths) {
    const models = paths.map(normaliseLive2DPath).filter(path => /\.model3\.json$/i.test(path));
    models.sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
    return models[0] ?? null;
}
/** Decides which files to keep from the picked folder, given the parsed model3.json. */
export function planLive2DImport(paths, modelPath, model) {
    const all = new Set(paths.map(normaliseLive2DPath));
    const root = live2dDir(normaliseLive2DPath(modelPath));
    const local = (file) => normaliseLive2DPath(file);
    const refs = model.FileReferences ?? {};
    const keep = new Set([local(modelPath).slice(root.length)]);
    const missing = [];
    const need = (file, required) => {
        if (!file) {
            if (required)
                missing.push('(moc)');
            return;
        }
        const path = local(file);
        if (all.has(root + path))
            keep.add(path);
        else if (required)
            missing.push(path);
    };
    need(refs.Moc, true);
    const textures = (refs.Textures ?? []).map(local);
    if (!textures.length)
        missing.push('(textures)');
    textures.forEach(texture => need(texture, true));
    need(refs.Physics, false);
    need(refs.DisplayInfo, false);
    need(refs.Pose, false);
    // VTube Studio keeps hotkey expressions and animations next to the model without listing them.
    const expressions = {};
    const motions = {};
    const wantedMotions = new Set(LIVE2D_MOTION_FILES);
    let idleMotion;
    for (const full of all) {
        if (!full.startsWith(root))
            continue;
        const path = full.slice(root.length);
        const name = path.split('/').pop() ?? '';
        if (/\.exp3\.json$/i.test(name)) {
            keep.add(path);
            expressions[path] = name.replace(/\.exp3\.json$/i, '');
        }
        else if (/^idle\.motion3\.json$/i.test(name) && !idleMotion) {
            keep.add(path);
            idleMotion = path;
        }
        else if (/\.motion3\.json$/i.test(name)) {
            // The hand gestures and the author's idle animation (脱捕); a few KB each.
            const base = name.replace(/\.motion3\.json$/i, '');
            if (wantedMotions.has(base) && !motions[base]) {
                keep.add(path);
                motions[base] = path;
            }
        }
    }
    const displayInfo = refs.DisplayInfo && keep.has(local(refs.DisplayInfo)) ? local(refs.DisplayInfo) : undefined;
    return { root, modelPath: local(modelPath).slice(root.length), keep: [...keep], textures, displayInfo, expressions, idleMotion, motions, missing };
}
/** True when the display info names the switches this companion relies on. */
export function isDaFeiYuDisplayInfo(displayInfo) {
    const parameters = displayInfo?.Parameters;
    if (!Array.isArray(parameters))
        return false;
    const names = parameters.map(p => String(p?.Name ?? '')).join('\n');
    return LIVE2D_SIGNATURE.every(word => names.includes(word));
}
/** Size after scaling down to the texture limit (aspect kept). */
export function live2dTextureSize(width, height, limit = LIVE2D_TEXTURE_LIMIT) {
    const scale = Math.min(1, limit / Math.max(width, height));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
async function readLive2DJson(file) {
    return JSON.parse((await file.text()).replace(/^﻿/, ''));
}
async function shrinkLive2DTexture(file) {
    const bitmap = await createImageBitmap(file);
    const size = live2dTextureSize(bitmap.width, bitmap.height);
    if (size.width === bitmap.width && size.height === bitmap.height) {
        bitmap.close();
        return file;
    }
    bitmap.close();
    const scaled = await createImageBitmap(file, { resizeWidth: size.width, resizeHeight: size.height, resizeQuality: 'high', premultiplyAlpha: 'none' });
    let blob = null;
    if (typeof OffscreenCanvas === 'function') {
        const canvas = new OffscreenCanvas(size.width, size.height);
        canvas.getContext('2d').drawImage(scaled, 0, 0);
        blob = await canvas.convertToBlob({ type: 'image/png' });
    }
    else {
        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        canvas.getContext('2d').drawImage(scaled, 0, 0);
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    }
    scaled.close();
    if (!blob)
        throw new Error('image');
    return blob;
}
/**
 * Files of a folder dropped onto the import card, with their path inside the folder (as a folder pick gives).
 * Plain dropped files are returned as they are.
 */
export async function live2dFilesFromDrop(data) {
    const roots = [];
    for (const item of Array.from(data.items ?? [])) {
        const entry = item.webkitGetAsEntry?.();
        if (entry)
            roots.push(entry);
    }
    if (!roots.length)
        return Array.from(data.files ?? []);
    const files = [];
    const walk = async (entry) => {
        if (entry.isFile) {
            const file = await new Promise((ok, fail) => entry.file(ok, fail));
            try {
                Object.defineProperty(file, 'webkitRelativePath', { value: entry.fullPath.replace(/^\//, ''), configurable: true });
            }
            catch { /* the file name alone still works for a flat folder */ }
            files.push(file);
        }
        else if (entry.isDirectory) {
            const reader = entry.createReader();
            // readEntries returns the folder in batches; an empty batch ends it.
            for (;;) {
                const batch = await new Promise((ok, fail) => reader.readEntries(ok, fail));
                if (!batch.length)
                    break;
                for (const child of batch)
                    await walk(child);
            }
        }
    };
    for (const root of roots)
        await walk(root);
    return files;
}
/** Builds a record from the files of a picked folder (webkitdirectory) or a multi-file pick. */
export async function importLive2DFiles(files, onProgress) {
    const byPath = new Map();
    for (const file of files)
        byPath.set(normaliseLive2DPath(file.webkitRelativePath || file.name), file);
    const modelPath = findLive2DModel([...byPath.keys()]);
    if (!modelPath)
        return { ok: false, error: 'no-model' };
    let model;
    try {
        model = await readLive2DJson(byPath.get(modelPath));
    }
    catch {
        return { ok: false, error: 'bad-json' };
    }
    const plan = planLive2DImport([...byPath.keys()], modelPath, model);
    if (plan.missing.length)
        return { ok: false, error: 'incomplete', detail: plan.missing.join(', ') };
    if (!plan.displayInfo)
        return { ok: false, error: 'not-dafeiyu' };
    try {
        if (!isDaFeiYuDisplayInfo(await readLive2DJson(byPath.get(plan.root + plan.displayInfo))))
            return { ok: false, error: 'not-dafeiyu' };
    }
    catch {
        return { ok: false, error: 'not-dafeiyu' };
    }
    const stored = {};
    let bytes = 0, done = 0;
    const textures = new Set(plan.textures);
    onProgress?.(0, plan.keep.length);
    for (const path of plan.keep) {
        const file = byPath.get(plan.root + path);
        let blob = file;
        if (textures.has(path)) {
            try {
                blob = await shrinkLive2DTexture(file);
            }
            catch {
                return { ok: false, error: 'image', detail: path };
            }
        }
        stored[path] = blob;
        bytes += blob.size;
        onProgress?.(++done, plan.keep.length);
    }
    const name = plan.modelPath.split('/').pop().replace(/\.model3\.json$/i, '');
    return { ok: true, record: { modelPath: plan.modelPath, files: stored, expressions: plan.expressions, idleMotion: plan.idleMotion, motions: plan.motions, name, bytes, savedAt: Date.now() } };
}
/** Runtime view of a stored record. Decoded files are shared between mounts (widget ↔ theatre) for a while. */
export function live2dSourceFor(record) {
    const buffers = new Map();
    const images = new Map();
    let release = null;
    const touch = () => {
        if (release)
            clearTimeout(release);
        // Keep decoded data around briefly so switching to the theatre does not decode again.
        release = setTimeout(() => {
            buffers.clear();
            // Decoded ImageBitmaps own native memory; dropping JS references alone need not release it promptly.
            for (const image of images.values())
                void image.then(bitmap => bitmap?.close());
            images.clear();
            release = null;
        }, 30000);
    };
    return {
        modelPath: record.modelPath,
        expressions: record.expressions,
        idleMotion: record.idleMotion,
        motions: record.motions,
        read(path) {
            touch();
            if (!buffers.has(path)) {
                const blob = record.files[path];
                buffers.set(path, blob ? blob.arrayBuffer().then(buffer => buffer, () => null) : Promise.resolve(null));
            }
            // Copies: Cubism keeps no reference, but callers must never share a detached buffer.
            return buffers.get(path).then(buffer => buffer ? buffer.slice(0) : null);
        },
        image(path) {
            touch();
            if (!images.has(path)) {
                const blob = record.files[path];
                images.set(path, blob ? createImageBitmap(blob, { premultiplyAlpha: 'premultiply', colorSpaceConversion: 'none' }).catch(() => null) : Promise.resolve(null));
            }
            return images.get(path);
        },
    };
}
/** Old saved records remain usable, but cannot play motions that were not imported. */
export function live2dNeedsReimport(record) {
    return Boolean(record && LIVE2D_MOTION_FILES.some(name => !record.motions?.[name] || !record.files[record.motions[name]]));
}
//# sourceMappingURL=live2d-package.js.map
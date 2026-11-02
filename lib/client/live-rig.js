/**
 * Live portrait (Live2D-style motion) for the flat character artwork.
 *
 * True Live2D needs artwork separated into dozens of layers and rigged in
 * Cubism. The plugin ships single PNG/WebP illustrations, so this renders each
 * one as a dense WebGL mesh and deforms it every frame:
 *  - breathing lifts the shoulders and head and widens the chest slightly;
 *  - the head tilts and leans toward the pointer around the neck, with a
 *    slow idle sway;
 *  - hair and the whale tail sway as a travelling wave (stronger at the tips);
 *  - the skirt swings a little, feet stay planted;
 *  - open eyes blink (the eye is squeezed onto the lower lid in the fragment
 *    shader and the lid is filled with sampled skin colour);
 *  - talking adds a light nod; expression changes crossfade.
 *
 * Hair is found from colour (blue-lavender, light enough not to be the navy
 * dress), weights are blurred so the mesh bends like cloth instead of tearing.
 * Everything degrades safely: no WebGL, a lost context or reduced motion keep
 * the normal <img> (the caller keeps it in the DOM for hit testing anyway).
 */
import { poseRig } from './rig.js';
/** Canvas margin around the image (fraction of its size) so swaying hair is never clipped. */
export const LIVE_PAD = 0.05;
const LIVE_COLS = 56;
const LIVE_ROWS = 120;
const LIVE_SAMPLE_W = 112;
const LIVE_MAX_TEXTURE = 2048;
const LIVE_VERTEX = `
attribute vec2 aUV;
attribute vec4 aW;
uniform float uT;
uniform vec2 uGaze;
uniform float uTalk;
uniform float uMotion;
uniform vec4 uRig;
uniform float uAspect;
uniform float uPad;
varying vec2 vUV;
void main() {
  vec2 p = aUV;
  float head = aW.x, hair = aW.y, chest = aW.z, skirt = aW.w;
  float cx = uRig.x, chin = uRig.y, top = uRig.z, bottom = uRig.w;
  float waist = top + 0.42 * (bottom - top);
  float m = uMotion;
  // Breathing (3.6 s): everything above the waist rises, most at the shoulders.
  float breath = sin(uT * 1.745);
  float lift = clamp((waist - aUV.y) / max(0.001, waist - top), 0.0, 1.0);
  p.y -= 0.0034 * m * breath * lift;
  p.x += (aUV.x - cx) * 0.012 * m * breath * chest;
  // Head: lean toward the pointer plus a slow idle sway, around the neck.
  float angle = (uGaze.x * 0.055 + sin(uT * 0.63) * 0.02 + sin(uT * 0.29 + 1.3) * 0.012) * m * head;
  vec2 pivot = vec2(cx, chin + 0.03);
  vec2 d = p - pivot;
  d.x *= uAspect;
  float c = cos(angle), s = sin(angle);
  d = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
  d.x /= uAspect;
  p = pivot + d;
  p.x += head * uGaze.x * 0.007 * m;
  p.y += head * (uGaze.y * 0.004 - uTalk * 0.0028 * abs(sin(uT * 9.0))) * m;
  // Hair and tail: a travelling wave that grows toward the tips.
  float tips = smoothstep(chin - 0.05, bottom, aUV.y);
  p.x += hair * tips * m * (0.011 * sin(uT * 1.25 - aUV.y * 7.0 + aUV.x * 2.0) + 0.004 * sin(uT * 2.7 - aUV.y * 13.0));
  p.y += hair * tips * m * 0.002 * sin(uT * 1.9 - aUV.y * 9.0);
  // Skirt swing.
  p.x += skirt * (1.0 - hair) * m * 0.005 * sin(uT * 0.95 - aUV.y * 4.0);
  vUV = aUV;
  vec2 q = (p + vec2(uPad)) / (1.0 + 2.0 * uPad);
  gl_Position = vec4(q.x * 2.0 - 1.0, 1.0 - q.y * 2.0, 0.0, 1.0);
}`;
const LIVE_FRAGMENT = `
precision mediump float;
uniform sampler2D uTex;
uniform float uAlpha;
uniform float uBlink;
uniform vec4 uEye0;
uniform vec4 uEye1;
uniform vec3 uSkin0;
uniform vec3 uSkin1;
varying vec2 vUV;
const float LID = 0.55;
vec4 blinkEye(vec4 color, vec2 uv, vec4 eye, vec3 skin) {
  if (eye.z <= 0.0 || uBlink <= 0.001) return color;
  vec2 q = (uv - eye.xy) / eye.zw;
  float edge = smoothstep(1.05, 0.7, abs(q.x));
  if (edge <= 0.0 || q.y < -1.25 || q.y > LID) return color;
  float k = uBlink * 0.94;
  float lidTop = -1.0 + k * (LID + 1.0);
  vec4 result;
  if (q.y < lidTop) {
    // Closed lid: skin colour, faded at the top so bangs over the eye stay soft.
    float fade = smoothstep(-1.25, -0.95, q.y);
    result = mix(color, vec4(skin * color.a, color.a), fade);
  } else {
    float src = -1.0 + (q.y - lidTop) / max(0.001, LID - lidTop) * (LID + 1.0);
    result = texture2D(uTex, eye.xy + vec2(q.x, src) * eye.zw);
  }
  return mix(color, result, edge);
}
void main() {
  vec4 color = texture2D(uTex, vUV);
  color = blinkEye(color, vUV, uEye0, uSkin0);
  color = blinkEye(color, vUV, uEye1, uSkin1);
  gl_FragColor = color * uAlpha;
}`;
function liveCompile(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader)
        return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
const liveSmooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Per-pixel hair likelihood from colour: light blue-lavender, not the navy dress, white apron or skin. */
export function hairness(r, g, b, a) {
    if (a < 100)
        return 0;
    const lum = (r + g + b) / 3;
    if (lum < 92 || lum > 215)
        return 0;
    if (b - r < 14)
        return 0;
    return Math.min(1, (b - r - 14) / 22) * Math.min(1, (lum - 92) / 20);
}
/**
 * Per-vertex deformation weights [head, hair, chest, skirt] for a pose.
 * `sample(u, v)` returns hairness at image coordinates (0..1).
 */
export function liveWeights(rig, cols, rows, sample) {
    const [fx0, fy0, fx1, chin] = rig.face;
    const cx = (fx0 + fx1) / 2;
    const top = rig.top, bottom = rig.bottom;
    const waist = top + 0.42 * (bottom - top);
    const hem = top + 0.86 * (bottom - top);
    const data = new Float32Array((cols + 1) * (rows + 1) * 6);
    let i = 0;
    for (let y = 0; y <= rows; y++) {
        for (let x = 0; x <= cols; x++) {
            const u = x / cols, v = y / rows;
            const insideFace = u > fx0 && u < fx1 && v > fy0 && v < chin;
            const hair = insideFace ? 0 : sample(u, v);
            // The head and the hair hanging from it turn together; the hair's share fades further down.
            const head = Math.max(1 - liveSmooth(chin - 0.005, chin + 0.05, v), hair * (1 - liveSmooth(chin, chin + 0.28, v)) * 0.85);
            const chest = liveSmooth(chin, chin + 0.04, v) * (1 - liveSmooth(waist - 0.06, waist + 0.04, v)) * (1 - liveSmooth(0.16, 0.3, Math.abs(u - cx)));
            const skirt = liveSmooth(waist, hem, v) * (1 - liveSmooth(hem, bottom - 0.015, v));
            data[i++] = u;
            data[i++] = v;
            data[i++] = head;
            data[i++] = hair;
            data[i++] = chest;
            data[i++] = skirt;
        }
    }
    return data;
}
/** Separable blur of a scalar grid, used to soften the hair mask before it drives the mesh. */
function liveBlur(values, w, h, passes) {
    // Typed as plain Float32Array so the ping-pong swap type-checks.
    let src = values, dst = new Float32Array(values.length);
    for (let pass = 0; pass < passes; pass++) {
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const l = src[y * w + Math.max(0, x - 1)], r = src[y * w + Math.min(w - 1, x + 1)];
                dst[y * w + x] = (l + 2 * src[y * w + x] + r) / 4;
            }
        ;
        [src, dst] = [dst, src];
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const t = src[Math.max(0, y - 1) * w + x], b = src[Math.min(h - 1, y + 1) * w + x];
                dst[y * w + x] = (t + 2 * src[y * w + x] + b) / 4;
            }
        ;
        [src, dst] = [dst, src];
    }
    return src;
}
/** Random wait before the next blink (ms): mostly 2.5–6 s, sometimes a quick double blink. */
export function nextBlinkDelay(random = Math.random) {
    return random() < 0.12 ? 180 + random() * 120 : 2500 + random() * 3500;
}
/** Lid closure (0 open … 1 shut) during a 150 ms blink. */
export function blinkAmount(elapsedMs) {
    if (elapsedMs <= 0 || elapsedMs >= 150)
        return 0;
    if (elapsedMs < 55)
        return elapsedMs / 55;
    if (elapsedMs < 75)
        return 1;
    return 1 - (elapsedMs - 75) / 75;
}
export class LiveRig {
    canvas;
    gl;
    program;
    indexBuffer;
    indexCount;
    loc = {};
    aUV;
    aW;
    current = null;
    previous = null;
    fadeStart = 0;
    wanted = '';
    frame = 0;
    running = false;
    lost = false;
    epoch = performance.now();
    blinkAt = performance.now() + 1800;
    blinkStart = -1;
    cache = new Map();
    pixelHeight = 0;
    input = { gazeX: 0, gazeY: 0, talking: false, motion: 1 };
    /** Called once per frame before drawing, e.g. to read the pointer gaze. */
    beforeFrame = null;
    onReady = null;
    onFail = null;
    static support = null;
    static supported() {
        if (LiveRig.support !== null)
            return LiveRig.support;
        LiveRig.support = LiveRig.probe();
        return LiveRig.support;
    }
    static probe() {
        try {
            if (typeof document === 'undefined' || typeof document.createElement !== 'function')
                return false;
            const probe = document.createElement('canvas');
            return Boolean(probe.getContext('webgl', { failIfMajorPerformanceCaveat: true }));
        }
        catch {
            return false;
        }
    }
    static create(canvas) {
        try {
            const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: false });
            return gl ? new LiveRig(canvas, gl) : null;
        }
        catch {
            return null;
        }
    }
    constructor(canvas, gl) {
        this.canvas = canvas;
        this.gl = gl;
        const vs = liveCompile(gl, gl.VERTEX_SHADER, LIVE_VERTEX);
        const fs = liveCompile(gl, gl.FRAGMENT_SHADER, LIVE_FRAGMENT);
        const program = gl.createProgram();
        if (!vs || !fs || !program)
            throw new Error('live rig: shader setup failed');
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
            throw new Error('live rig: link failed');
        this.program = program;
        gl.useProgram(program);
        for (const name of ['uT', 'uGaze', 'uTalk', 'uMotion', 'uRig', 'uAspect', 'uPad', 'uTex', 'uAlpha', 'uBlink', 'uEye0', 'uEye1', 'uSkin0', 'uSkin1'])
            this.loc[name] = gl.getUniformLocation(program, name);
        this.aUV = gl.getAttribLocation(program, 'aUV');
        this.aW = gl.getAttribLocation(program, 'aW');
        // One shared index buffer: two triangles per grid cell.
        const indices = new Uint16Array(LIVE_COLS * LIVE_ROWS * 6);
        let k = 0;
        for (let y = 0; y < LIVE_ROWS; y++)
            for (let x = 0; x < LIVE_COLS; x++) {
                const a = y * (LIVE_COLS + 1) + x, b = a + 1, c = a + LIVE_COLS + 1, d = c + 1;
                indices[k++] = a;
                indices[k++] = c;
                indices[k++] = b;
                indices[k++] = b;
                indices[k++] = c;
                indices[k++] = d;
            }
        const indexBuffer = gl.createBuffer();
        if (!indexBuffer)
            throw new Error('live rig: buffer failed');
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        this.indexBuffer = indexBuffer;
        this.indexCount = indices.length;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1i(this.loc.uTex, 0);
        gl.uniform1f(this.loc.uPad, LIVE_PAD);
        canvas.addEventListener('webglcontextlost', this.handleLost);
    }
    handleLost = (event) => {
        event.preventDefault();
        this.lost = true;
        this.stop();
        this.onFail?.();
    };
    load(src) {
        let promise = this.cache.get(src);
        if (!promise) {
            promise = new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error('image failed'));
                image.src = src;
            });
            this.cache.set(src, promise);
            if (this.cache.size > 24)
                this.cache.delete(this.cache.keys().next().value);
        }
        return promise;
    }
    /** Shows a pose; the previous one crossfades out over 160 ms. */
    setPose(src, pose) {
        const key = src + '\u0001' + pose;
        if (this.wanted === key || this.lost)
            return;
        this.wanted = key;
        void this.load(src).then(image => {
            if (this.wanted !== key || this.lost)
                return;
            const skin = this.buildSkin(image, pose);
            if (!skin) {
                this.onFail?.();
                return;
            }
            if (this.previous)
                this.releaseSkin(this.previous);
            this.previous = this.current;
            this.current = skin;
            this.fadeStart = performance.now();
            this.resizeCanvas();
            this.draw(performance.now());
            this.onReady?.();
        }).catch(() => this.onFail?.());
    }
    buildSkin(image, pose) {
        const gl = this.gl;
        const rig = poseRig(pose);
        const W = image.naturalWidth, H = image.naturalHeight;
        if (!W || !H)
            return null;
        // Texture at roughly display resolution (high-quality downscale; WebGL1 has no NPOT mipmaps).
        const cssHeight = Math.max(200, this.canvas.getBoundingClientRect().height || 600);
        const dpr = Math.min(2, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
        const texH = Math.min(LIVE_MAX_TEXTURE, H, Math.round(cssHeight / (1 + 2 * LIVE_PAD) * dpr * 1.15));
        const texW = Math.max(1, Math.round(texH * W / H));
        const scratch = document.createElement('canvas');
        scratch.width = texW;
        scratch.height = texH;
        const ctx = scratch.getContext('2d');
        if (!ctx)
            return null;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, texW, texH);
        // Hair mask from a small copy, blurred so the mesh bends smoothly.
        const sw = LIVE_SAMPLE_W, sh = Math.round(LIVE_SAMPLE_W * H / W);
        const small = document.createElement('canvas');
        small.width = sw;
        small.height = sh;
        const sctx = small.getContext('2d', { willReadFrequently: true });
        if (!sctx)
            return null;
        sctx.drawImage(image, 0, 0, sw, sh);
        const pixels = sctx.getImageData(0, 0, sw, sh).data;
        const mask = new Float32Array(sw * sh);
        for (let i = 0; i < sw * sh; i++)
            mask[i] = hairness(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2], pixels[i * 4 + 3]);
        const soft = liveBlur(mask, sw, sh, 3);
        const sample = (u, v) => soft[Math.min(sh - 1, Math.floor(v * sh)) * sw + Math.min(sw - 1, Math.floor(u * sw))];
        const vertices = liveWeights(rig, LIVE_COLS, LIVE_ROWS, sample);
        // Eyelid colour: average skin just below each eye.
        const eyes = new Float32Array(8), skins = new Float32Array(6);
        rig.eyes.slice(0, 2).forEach(([ex, ey, ew, eh], index) => {
            eyes.set([ex, ey, ew / 2, eh / 2], index * 4);
            const px = sctx.getImageData(Math.max(0, Math.round((ex - ew * 0.2) * sw)), Math.min(sh - 1, Math.round((ey + eh * 0.95) * sh)), Math.max(1, Math.round(ew * 0.4 * sw)), 1).data;
            let r = 0, g = 0, b = 0, n = 0;
            for (let i = 0; i < px.length; i += 4)
                if (px[i + 3] > 200) {
                    r += px[i];
                    g += px[i + 1];
                    b += px[i + 2];
                    n++;
                }
            skins.set(n ? [r / n / 255, g / n / 255, b / n / 255] : [0.98, 0.9, 0.88], index * 3);
        });
        const texture = gl.createTexture();
        const buffer = gl.createBuffer();
        if (!texture || !buffer)
            return null;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scratch);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        return { texture, buffer, indexCount: this.indexCount, rig, aspect: W / H, eyes, skins, eyeCount: Math.min(2, rig.eyes.length), width: W, height: H };
    }
    releaseSkin(skin) {
        this.gl.deleteTexture(skin.texture);
        this.gl.deleteBuffer(skin.buffer);
    }
    /** Matches the backing store to the displayed size (the CSS height drives the layout). */
    resizeCanvas() {
        const skin = this.current;
        if (!skin)
            return;
        const dpr = Math.min(2, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
        const cssHeight = this.canvas.getBoundingClientRect().height || 0;
        const height = Math.max(64, Math.min(4096, Math.round((cssHeight || 600) * dpr)));
        const width = Math.max(32, Math.round(height * skin.aspect));
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        this.pixelHeight = height;
    }
    start() {
        if (this.running || this.lost)
            return;
        this.running = true;
        const loop = (now) => {
            if (!this.running)
                return;
            this.draw(now);
            this.frame = requestAnimationFrame(loop);
        };
        this.frame = requestAnimationFrame(loop);
    }
    stop() {
        this.running = false;
        if (this.frame)
            cancelAnimationFrame(this.frame);
        this.frame = 0;
    }
    drawSkin(skin, alpha, blink) {
        const gl = this.gl;
        const [fx0, , fx1, chin] = skin.rig.face;
        gl.bindTexture(gl.TEXTURE_2D, skin.texture);
        gl.bindBuffer(gl.ARRAY_BUFFER, skin.buffer);
        gl.enableVertexAttribArray(this.aUV);
        gl.vertexAttribPointer(this.aUV, 2, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(this.aW);
        gl.vertexAttribPointer(this.aW, 4, gl.FLOAT, false, 24, 8);
        gl.uniform4f(this.loc.uRig, (fx0 + fx1) / 2, chin, skin.rig.top, skin.rig.bottom);
        gl.uniform1f(this.loc.uAspect, skin.aspect);
        gl.uniform1f(this.loc.uAlpha, alpha);
        gl.uniform1f(this.loc.uBlink, skin.eyeCount ? blink : 0);
        gl.uniform4fv(this.loc.uEye0, skin.eyes.subarray(0, 4));
        gl.uniform4fv(this.loc.uEye1, skin.eyes.subarray(4, 8));
        gl.uniform3fv(this.loc.uSkin0, skin.skins.subarray(0, 3));
        gl.uniform3fv(this.loc.uSkin1, skin.skins.subarray(3, 6));
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, skin.indexCount, gl.UNSIGNED_SHORT, 0);
    }
    draw(now) {
        const skin = this.current;
        if (!skin || this.lost)
            return;
        if (typeof document !== 'undefined' && document.hidden)
            return;
        if (this.canvas.height !== this.pixelHeight || !this.pixelHeight)
            this.resizeCanvas();
        const gl = this.gl;
        const t = (now - this.epoch) / 1000;
        this.beforeFrame?.();
        const motion = Math.min(1, Math.max(0, this.input.motion));
        // Blink scheduler (skipped entirely when motion is off).
        let blink = 0;
        if (motion > 0) {
            if (this.blinkStart < 0 && now >= this.blinkAt)
                this.blinkStart = now;
            if (this.blinkStart >= 0) {
                blink = blinkAmount(now - this.blinkStart);
                if (now - this.blinkStart >= 150) {
                    this.blinkStart = -1;
                    this.blinkAt = now + nextBlinkDelay();
                }
            }
        }
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.uniform1f(this.loc.uT, t);
        gl.uniform2f(this.loc.uGaze, Math.max(-1, Math.min(1, this.input.gazeX)), Math.max(-1, Math.min(1, this.input.gazeY)));
        gl.uniform1f(this.loc.uTalk, this.input.talking ? 1 : 0);
        gl.uniform1f(this.loc.uMotion, motion);
        // The new pose is drawn solid and the old one fades out on top, so she never turns translucent.
        this.drawSkin(skin, 1, blink);
        if (this.previous) {
            const fade = Math.min(1, (now - this.fadeStart) / 160);
            if (fade < 1)
                this.drawSkin(this.previous, 1 - fade, blink);
            else {
                this.releaseSkin(this.previous);
                this.previous = null;
            }
        }
    }
    dispose() {
        this.stop();
        this.canvas.removeEventListener('webglcontextlost', this.handleLost);
        if (this.current)
            this.releaseSkin(this.current);
        if (this.previous)
            this.releaseSkin(this.previous);
        this.current = this.previous = null;
        this.cache.clear();
        try {
            this.gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
        catch { /* already gone */ }
    }
}
//# sourceMappingURL=live-rig.js.map
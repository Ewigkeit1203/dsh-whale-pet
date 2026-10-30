/**
 * Build script for dsh-whale-pet.
 * Compiles TypeScript source to lib/ and bundles the client artifact
 * matching DSH Client Module specifications.
 * Inlines character PNGs as base64 Data URIs to eliminate 404s in DSH Desktop & Web.
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))

console.log('[build] 1. Syncing latest desktop character files...')
const desktopDirs = [
  'C:/Users/etern/OneDrive/Desktop',
  'C:/Users/etern/Desktop',
]

const srcAssetsDir = join(__dirname, 'assets')
mkdirSync(srcAssetsDir, { recursive: true })

// Helper to remove white backgrounds from RGB PNGs via perimeter flood fill
function ensureTransparentPNG(srcFile, dstFile) {
  const buf = readFileSync(srcFile)
  let pos = 8
  const idats = []
  let w = 0, h = 0, colorType = 0
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    if (type === 'IHDR') {
      w = buf.readUInt32BE(pos + 8)
      h = buf.readUInt32BE(pos + 12)
      colorType = buf[pos + 8 + 9]
    } else if (type === 'IDAT') {
      idats.push(buf.slice(pos + 8, pos + 8 + len))
    }
    pos += 8 + len + 4
  }

  if (colorType === 6 || colorType === 3) {
    cpSync(srcFile, dstFile)
    return
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idats))
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 1
  const rowLen = 1 + w * bpp
  const raw = Buffer.alloc(w * h * bpp)

  let prevRow = null
  for (let y = 0; y < h; y++) {
    const filter = decompressed[y * rowLen]
    const srcRow = decompressed.slice(y * rowLen + 1, (y + 1) * rowLen)
    const dstRow = raw.slice(y * w * bpp, (y + 1) * w * bpp)

    for (let x = 0; x < w * bpp; x++) {
      const a = x >= bpp ? dstRow[x - bpp] : 0
      const b = prevRow ? prevRow[x] : 0
      const c = (x >= bpp && prevRow) ? prevRow[x - bpp] : 0
      let val = srcRow[x]
      if (filter === 0) {}
      else if (filter === 1) { val = (val + a) & 0xff }
      else if (filter === 2) { val = (val + b) & 0xff }
      else if (filter === 3) { val = (val + Math.floor((a + b) / 2)) & 0xff }
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
        val = (val + pr) & 0xff
      }
      dstRow[x] = val
    }
    prevRow = dstRow
  }

  const rgba = Buffer.alloc(w * h * 4)
  const visited = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = raw[i * bpp]
    rgba[i * 4 + 1] = raw[i * bpp + 1]
    rgba[i * 4 + 2] = raw[i * bpp + 2]
    rgba[i * 4 + 3] = bpp === 4 ? raw[i * bpp + 3] : 255
  }

  const queue = []
  for (let x = 0; x < w; x++) { queue.push(x, 0); queue.push(x, h - 1); }
  for (let y = 0; y < h; y++) { queue.push(0, y); queue.push(w - 1, y); }

  let head = 0
  while (head < queue.length) {
    const x = queue[head++]
    const y = queue[head++]
    const idx = y * w + x
    if (visited[idx]) continue
    visited[idx] = 1

    const r = rgba[idx * 4]
    const g = rgba[idx * 4 + 1]
    const b = rgba[idx * 4 + 2]

    const isBg = (r > 238 && g > 238 && b > 238) || (r > 225 && g > 225 && b > 225 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15)
    if (isBg) {
      rgba[idx * 4 + 3] = 0
      if (x > 0 && !visited[idx - 1]) queue.push(x - 1, y)
      if (x < w - 1 && !visited[idx + 1]) queue.push(x + 1, y)
      if (y > 0 && !visited[idx - w]) queue.push(x, y - 1)
      if (y < h - 1 && !visited[idx + w]) queue.push(x, y + 1)
    }
  }

  // Edge feathering
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x
      if (rgba[idx * 4 + 3] === 255) {
        const hasTrans = (rgba[(idx - 1) * 4 + 3] === 0 || rgba[(idx + 1) * 4 + 3] === 0 || rgba[(idx - w) * 4 + 3] === 0 || rgba[(idx + w) * 4 + 3] === 0)
        if (hasTrans) {
          const br = (rgba[idx * 4] + rgba[idx * 4 + 1] + rgba[idx * 4 + 2]) / 3
          if (br > 220) {
            rgba[idx * 4 + 3] = Math.max(0, Math.min(255, Math.round((255 - br) * 4)))
          }
        }
      }
    }
  }

  const outRowLen = 1 + w * 4
  const filtered = Buffer.alloc(h * outRowLen)
  for (let y = 0; y < h; y++) {
    filtered[y * outRowLen] = 0
    rgba.copy(filtered, y * outRowLen + 1, y * w * 4, (y + 1) * w * 4)
  }
  const deflated = zlib.deflateSync(filtered, { level: 9 })

  function makeChunk(type, data) {
    const len = data.length
    const b = Buffer.alloc(8 + len + 4)
    b.writeUInt32BE(len, 0)
    b.write(type, 4, 4, 'ascii')
    data.copy(b, 8)
    let c = 0xffffffff
    const table = []
    for (let n = 0; n < 256; n++) {
      let v = n
      for (let k = 0; k < 8; k++) v = ((v & 1) ? (0xedb88320 ^ (v >>> 1)) : (v >>> 1))
      table[n] = v
    }
    for (let i = 4; i < 8 + len; i++) c = table[(c ^ b[i]) & 0xff] ^ (c >>> 8)
    b.writeInt32BE((c ^ 0xffffffff) | 0, 8 + len)
    return b
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const outBuf = Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflated),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
  writeFileSync(dstFile, outBuf)
}

for (const desk of desktopDirs) {
  // 1. Maiden standing
  const maidenSrc = join(desk, 'Pastel Blue Sea Maid Character.png')
  if (existsSync(maidenSrc)) {
    cpSync(maidenSrc, join(srcAssetsDir, 'Pastel Blue Sea Maid Character.png'))
    cpSync(maidenSrc, join(srcAssetsDir, 'DeepSeek.png'))
    cpSync(maidenSrc, join(srcAssetsDir, 'whale-maid-standing.png'))
  }
  // 2. Chibi
  const chibiSrc = join(desk, 'Chibi Whale Maid in Blue.png')
  if (existsSync(chibiSrc)) {
    cpSync(chibiSrc, join(srcAssetsDir, 'Chibi Whale Maid in Blue.png'))
    cpSync(chibiSrc, join(srcAssetsDir, 'MiniDeepSeek.png'))
    cpSync(chibiSrc, join(srcAssetsDir, 'whale-maid-chibi.png'))
    cpSync(chibiSrc, join(srcAssetsDir, '641.png'))
  }
  // 3. Pondering (thinking pose)
  const ponderingSrc = join(desk, 'Pondering Whale Maid Character.png')
  if (existsSync(ponderingSrc)) {
    ensureTransparentPNG(ponderingSrc, join(srcAssetsDir, 'Pondering Whale Maid Character.png'))
  }
  // 4. Puzzled (hard thinking pose)
  const puzzledSrc = join(desk, 'Puzzled Whale Maid in Thought.png')
  if (existsSync(puzzledSrc)) {
    ensureTransparentPNG(puzzledSrc, join(srcAssetsDir, 'Puzzled Whale Maid in Thought.png'))
  }
  // 5. Puff cheeks (thinking pose 3 / DS_mad+sajiao.png)
  const puffSrc = join(desk, 'DS_mad+sajiao.png')
  if (existsSync(puffSrc)) {
    cpSync(puffSrc, join(srcAssetsDir, 'DS_mad+sajiao.png'))
  }
  // 6. Getit (thinking pose 4 / getit.png)
  const getitSrc = join(desk, 'getit.png')
  if (existsSync(getitSrc)) {
    cpSync(getitSrc, join(srcAssetsDir, 'getit.png'))
  }
  // 7. Sajiao (pouting / winking sajiao.png)
  const sajiaoSrc = join(desk, 'sajiao.png')
  if (existsSync(sajiaoSrc)) {
    cpSync(sajiaoSrc, join(srcAssetsDir, 'sajiao.png'))
  }
  // 8. Baifan2 (eating rice with sparkles baifan2.png)
  const baifanSrc = join(desk, 'baifan2.png')
  if (existsSync(baifanSrc)) {
    cpSync(baifanSrc, join(srcAssetsDir, 'baifan2.png'))
  }
}

console.log('[build] 2. Generating src/client/assets-data.ts with base64 Data URIs...')
const maidenB64 = readFileSync(join(srcAssetsDir, 'Pastel Blue Sea Maid Character.png')).toString('base64')
const chibiB64 = readFileSync(join(srcAssetsDir, 'Chibi Whale Maid in Blue.png')).toString('base64')
const ponderingB64 = readFileSync(join(srcAssetsDir, 'Pondering Whale Maid Character.png')).toString('base64')
const puzzledB64 = readFileSync(join(srcAssetsDir, 'Puzzled Whale Maid in Thought.png')).toString('base64')
const puffB64 = readFileSync(join(srcAssetsDir, 'DS_mad+sajiao.png')).toString('base64')
const getitB64 = readFileSync(join(srcAssetsDir, 'getit.png')).toString('base64')
const sajiaoB64 = readFileSync(join(srcAssetsDir, 'sajiao.png')).toString('base64')
const baifanB64 = readFileSync(join(srcAssetsDir, 'baifan2.png')).toString('base64')
const riceBowlB64 = readFileSync(join(srcAssetsDir, 'rice-bowl.svg')).toString('base64')

const maidenDataUri = `data:image/png;base64,${maidenB64}`
const chibiDataUri = `data:image/png;base64,${chibiB64}`
const ponderingDataUri = `data:image/png;base64,${ponderingB64}`
const puzzledDataUri = `data:image/png;base64,${puzzledB64}`
const puffDataUri = `data:image/png;base64,${puffB64}`
const getitDataUri = `data:image/png;base64,${getitB64}`
const sajiaoDataUri = `data:image/png;base64,${sajiaoB64}`
const baifanDataUri = `data:image/png;base64,${baifanB64}`
const riceBowlDataUri = `data:image/svg+xml;base64,${riceBowlB64}`

const assetsDataTs = `/**
 * Embedded character image Data URIs for dsh-whale-pet.
 * Generated by build.js from assets/ (high-fidelity poses + baifan2 + thinking poses).
 * Eliminates 404 network errors in DSH desktop & web environments.
 */
export const MAIDEN_DATA_URI = ${JSON.stringify(maidenDataUri)}
export const CHIBI_DATA_URI = ${JSON.stringify(chibiDataUri)}
export const PONDERING_DATA_URI = ${JSON.stringify(ponderingDataUri)}
export const PUZZLED_DATA_URI = ${JSON.stringify(puzzledDataUri)}
export const PUFF_DATA_URI = ${JSON.stringify(puffDataUri)}
export const GETIT_DATA_URI = ${JSON.stringify(getitDataUri)}
export const SAJIAO_DATA_URI = ${JSON.stringify(sajiaoDataUri)}
export const MAD_DATA_URI = ${JSON.stringify(sajiaoDataUri)}
export const BAIFAN_DATA_URI = ${JSON.stringify(baifanDataUri)}
export const RICE_BOWL_DATA_URI = ${JSON.stringify(riceBowlDataUri)}
`
writeFileSync(join(__dirname, 'src', 'client', 'assets-data.ts'), assetsDataTs, 'utf-8')

console.log('[build] 3. Running TypeScript compiler...')
const tscCmd = process.platform === 'win32'
  ? (existsSync(join(__dirname, 'node_modules', '.bin', 'tsc.cmd'))
      ? `"${join(__dirname, 'node_modules', '.bin', 'tsc.cmd')}"`
      : 'npx tsc')
  : 'npx tsc'
execSync(`${tscCmd}`, { stdio: 'inherit', cwd: __dirname, shell: true })

console.log('[build] 4. Ensuring lib/assets directory...')
const libAssetsDir = join(__dirname, 'lib', 'assets')
mkdirSync(libAssetsDir, { recursive: true })
cpSync(srcAssetsDir, libAssetsDir, { recursive: true })

console.log('[build] 5. Bundling lib/client.js for DSH browser module loader...')
const petOverlayCss = readFileSync(join(__dirname, 'src', 'client', 'PetOverlay.module.css'), 'utf-8')
const galgameCss = readFileSync(join(__dirname, 'src', 'client', 'galgame.css'), 'utf-8')
const puppetCss = readFileSync(join(__dirname, 'src', 'client', 'LivingPuppet.module.css'), 'utf-8')
const fullCss = `${petOverlayCss}\n${galgameCss}\n${puppetCss}`

const clientBundleSource = `/**
 * dsh-whale-pet browser client bundle.
 * Self-contained Cordis Web UI client plugin.
 */
(function() {
  if (typeof window === 'undefined' || !window.__ModuleLoader__) {
    return;
  }

  window.__ModuleLoader__.load({
    id: 'dsh-whale-pet',
    factory: function(require) {
      const React = require('react');
      const h = React.createElement;
      const useState = React.useState;
      const useEffect = React.useEffect;
      const useRef = React.useRef;
      const useCallback = React.useCallback;
      const useMemo = React.useMemo;

      // Inject styles into document head on materialization
      let styleEl = document.getElementById('dsh-whale-pet-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dsh-whale-pet-styles';
        styleEl.textContent = ${JSON.stringify(fullCss)};
        document.head.appendChild(styleEl);
      }

      const DIALOGUES = {
        IDLE: [
          '今天又是元气满满的一天，呼呼~',
          '待机中……好想吃热腾腾的白米饭呀~',
          '有什么任务尽管交给我大肥鱼吧！',
          '咕噜噜……在深海里吐泡泡~',
        ],
        PEEKING: [
          '在写什么呢？让我看看让我看看~',
          '探头！这次要问什么问题呀？',
          '认真盯——正在倾听主人说话！',
        ],
        REASONING: [
          '唔……让我想想看，深海知识库检索中……',
          '手指抵住下巴——正在认真梳理逻辑链条！',
          '咕噜噜……正在组织最有条理的回答哦~',
        ],
        EATING: [
          '掏出大铁盆！大口大口吃白米饭！',
          '吧唧吧唧，白米饭真是太香啦~',
          '干饭鱼！吃饱了才有力气推理~',
          '吨吨吨！再来一盆！',
        ],
        WANDERING: [
          '游啊游，在网页边缘散步中~',
          '巡逻一圈，看页面整不整齐！',
        ],
      };

      const PUZZLED_DIALOGUES = [
        '呜……这个推理有点烧脑，头顶要冒小混乱云啦！',
        '努力挠头中……等等我，马上就解开这个谜题了！',
        '逻辑风暴超频运转中，呼呼，主人再给我几秒钟！',
      ];

      const MAD_DIALOGUES = [
        '哼！不许随便戳大肥鱼，大肥鱼也是有脾气的！',
        '（鼓起腮帮子）主人坏心眼，就知道逗我玩~',
        '撒娇中……必须补偿一碗热腾腾的白米饭才能哄好！',
        '气鼓鼓！再戳我就要把你的消息吞进肚子里啦！',
      ];

      function paginateDialogue(text, targetLength) {
        targetLength = targetLength || 180;
        const trimmed = (text || '').trim();
        if (!trimmed) return ['……'];
        if (trimmed.length <= targetLength) return [trimmed];

        const pages = [];
        let remaining = trimmed;

        while (remaining.length > 0) {
          if (remaining.length <= targetLength) {
            pages.push(remaining);
            break;
          }

          const searchSlice = remaining.slice(0, Math.min(remaining.length, Math.round(targetLength * 1.25)));
          const sentenceMatch = searchSlice.match(/([。！？\\n!?]+)(?=[^。！？\\n!?]*$)/);
          let cutIndex = -1;

          if (sentenceMatch && sentenceMatch.index !== undefined && sentenceMatch.index >= Math.round(targetLength * 0.45)) {
            cutIndex = sentenceMatch.index + sentenceMatch[1].length;
          } else {
            const commaMatch = searchSlice.match(/([，；,;]+)(?=[^，；,;]*$)/);
            if (commaMatch && commaMatch.index !== undefined && commaMatch.index >= Math.round(targetLength * 0.5)) {
              cutIndex = commaMatch.index + commaMatch[1].length;
            } else {
              cutIndex = targetLength;
            }
          }

          const page = remaining.slice(0, cutIndex).trim();
          if (page) pages.push(page);
          remaining = remaining.slice(cutIndex).trim();
        }

        return pages.length > 0 ? pages : [trimmed];
      }

      class PetStateMachine {
        constructor() {
          this.state = 'IDLE';
          this.form = 'maiden'; // Default full maiden standing portrait
          this.pose = 'default';
          this.isInputFocused = false;
          this.isReasoning = false;
          this.isStreaming = false;
          this.isGalGameMode = false;
          this.autoGalGameOnChat = true;
          this.speech = this.getRandomDialogue('IDLE');
          this.latestDialogue = '';
          this.reasoningText = '';
          this.toppedUpBalance = '¥0.00';
          this.grantedBalance = '¥0.00';
          this.mouthOpenRatio = 0;
          this.blinkRatio = 0;
          this.gazeOffset = { x: 0, y: 0 };

          this.speechTimer = null;
          this.debounceTimer = null;
          this.animationTimer = null;
          this.blinkTimer = null;
          this.reasoningCycleTimer = null;
          this.madTimer = null;
          this.listeners = new Set();

          this.thinkingPoseIndex = 0;
          this.thinkingPoses = ['pondering', 'puff', 'puzzled', 'getit'];

          this.startLivingAnimationLoops();
        }

        getStatus() {
          return {
            state: this.state,
            form: this.form,
            pose: this.pose,
            speech: this.speech,
            reasoningText: this.reasoningText,
            toppedUpBalance: this.toppedUpBalance,
            grantedBalance: this.grantedBalance,
            isReasoning: this.isReasoning,
            isStreaming: this.isStreaming,
            isInputFocused: this.isInputFocused,
            isGalGameMode: this.isGalGameMode,
            autoGalGameOnChat: this.autoGalGameOnChat,
            mouthOpenRatio: this.mouthOpenRatio,
            blinkRatio: this.blinkRatio,
            gazeOffset: { ...this.gazeOffset },
            latestDialogue: this.latestDialogue || this.speech,
          };
        }

        subscribe(listener) {
          this.listeners.add(listener);
          listener(this.getStatus());
          return () => { this.listeners.delete(listener); };
        }

        notify() {
          const status = this.getStatus();
          for (const l of this.listeners) {
            try { l(status); } catch (e) { console.error(e); }
          }
        }

        getRandomDialogue(state) {
          const list = DIALOGUES[state] || DIALOGUES.IDLE;
          return list[Math.floor(Math.random() * list.length)];
        }

        startLivingAnimationLoops() {
          let mouthPhase = 0;
          this.animationTimer = setInterval(() => {
            if (this.isStreaming || this.state === 'EATING') {
              mouthPhase += 0.35;
              const raw = (Math.sin(mouthPhase) + 1) / 2;
              this.mouthOpenRatio = Math.min(1, Math.max(0, raw * 0.9));
              this.notify();
            } else if (this.mouthOpenRatio > 0) {
              this.mouthOpenRatio = Math.max(0, this.mouthOpenRatio - 0.15);
              this.notify();
            }
          }, 60);

          const scheduleNextBlink = () => {
            const delay = 3200 + Math.random() * 2400;
            this.blinkTimer = setTimeout(() => {
              this.performBlinkCycle(() => {
                if (Math.random() < 0.25) {
                  setTimeout(() => {
                    this.performBlinkCycle(scheduleNextBlink);
                  }, 100);
                } else {
                  scheduleNextBlink();
                }
              });
            }, delay);
          };
          scheduleNextBlink();
        }

        performBlinkCycle(onComplete) {
          if (this.isReasoning) {
            this.blinkRatio = 0.5;
            this.notify();
            setTimeout(onComplete, 400);
            return;
          }
          this.blinkRatio = 1.0;
          this.notify();
          setTimeout(() => {
            this.blinkRatio = 0.0;
            this.notify();
            setTimeout(onComplete, 120);
          }, 90);
        }

        setBalances(toppedUp, granted) {
          if (this.toppedUpBalance === toppedUp && this.grantedBalance === granted) return;
          this.toppedUpBalance = toppedUp;
          this.grantedBalance = granted;
          this.notify();
        }

        setInputFocus(focused) {
          if (this.isInputFocused === focused) return;
          this.isInputFocused = focused;
          if (focused) {
            this.gazeOffset.y = 0.65;
          } else {
            this.gazeOffset.y = 0;
          }
          this.recomputeState();
        }

        setReasoning(reasoning) {
          if (this.isReasoning === reasoning) return;
          this.isReasoning = reasoning;

          if (this.reasoningCycleTimer !== null) {
            clearInterval(this.reasoningCycleTimer);
            this.reasoningCycleTimer = null;
          }

          if (reasoning) {
            this.thinkingPoseIndex = 0;
            this.pose = this.thinkingPoses[0];
            this.speech = this.getRandomDialogue('REASONING');

            this.reasoningCycleTimer = setInterval(() => {
              if (this.isReasoning && this.pose !== 'mad') {
                this.thinkingPoseIndex = (this.thinkingPoseIndex + 1) % this.thinkingPoses.length;
                this.pose = this.thinkingPoses[this.thinkingPoseIndex];
                this.notify();
              }
            }, 3200);
          } else {
            if (['pondering', 'puff', 'puzzled', 'getit'].includes(this.pose)) {
              this.pose = 'default';
            }
          }

          this.recomputeState();
        }

        setReasoningText(text) {
          if (this.reasoningText === text) return;
          this.reasoningText = text;
          this.notify();
        }

        clearReasoningText() {
          if (this.reasoningText === '') return;
          this.reasoningText = '';
          this.notify();
        }

        setStreaming(streaming) {
          if (this.isStreaming === streaming) return;
          this.isStreaming = streaming;

          if (streaming) {
            if (this.reasoningCycleTimer !== null) {
              clearInterval(this.reasoningCycleTimer);
              this.reasoningCycleTimer = null;
            }
            this.pose = 'default';
          }

          this.recomputeState();
        }

        triggerMad() {
          if (this.madTimer !== null) {
            clearTimeout(this.madTimer);
          }
          this.pose = 'mad';
          this.speech = MAD_DIALOGUES[Math.floor(Math.random() * MAD_DIALOGUES.length)];
          this.notify();

          this.madTimer = setTimeout(() => {
            this.madTimer = null;
            if (this.pose === 'mad') {
              if (this.isReasoning) {
                this.pose = this.thinkingPoses[this.thinkingPoseIndex];
              } else {
                this.pose = 'default';
              }
              this.speech = this.getRandomDialogue(this.state);
              this.notify();
            }
          }, 2000);
        }

        setPose(pose) {
          this.pose = pose;
          this.notify();
        }

        setLatestDialogue(text) {
          if (this.latestDialogue === text) return;
          this.latestDialogue = text;
          this.notify();
        }

        setGazeOffset(offset) {
          const clampedX = Math.max(-1, Math.min(1, offset.x));
          const clampedY = Math.max(-1, Math.min(1, offset.y));
          this.gazeOffset = { x: clampedX, y: clampedY };
          this.notify();
        }

        setAutoGalGameOnChat(enabled) {
          this.autoGalGameOnChat = enabled;
          this.notify();
        }

        toggleAutoGalGameOnChat() {
          this.setAutoGalGameOnChat(!this.autoGalGameOnChat);
        }

        setForm(form) {
          if (this.form === form) return;
          this.form = form;
          this.notify();
        }

        toggleForm() {
          this.setForm(this.form === 'chibi' ? 'maiden' : 'chibi');
        }

        setGalGameMode(enabled) {
          if (this.isGalGameMode === enabled) return;
          this.isGalGameMode = enabled;
          this.notify();
        }

        toggleGalGameMode() {
          this.setGalGameMode(!this.isGalGameMode);
        }

        setWandering(wandering) {
          if (this.state === 'EATING' || this.state === 'REASONING' || this.isInputFocused || this.isGalGameMode) return;
          if (wandering && this.state === 'IDLE') {
            this.state = 'WANDERING';
            this.speech = this.getRandomDialogue('WANDERING');
            this.notify();
          } else if (!wandering && this.state === 'WANDERING') {
            this.state = 'IDLE';
            this.speech = this.getRandomDialogue('IDLE');
            this.notify();
          }
        }

        recomputeState() {
          let nextState = 'IDLE';
          if (this.isStreaming) {
            nextState = 'EATING';
          } else if (this.isReasoning) {
            nextState = 'REASONING';
          } else if (this.isInputFocused) {
            nextState = 'PEEKING';
          } else {
            nextState = 'IDLE';
          }

          if (nextState === this.state) return;

          if ((this.state === 'EATING' || this.state === 'REASONING') && nextState !== 'EATING' && nextState !== 'REASONING') {
            if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
              this.debounceTimer = null;
              this.commitState(nextState);
            }, 350);
            return;
          }

          if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
          }
          this.commitState(nextState);
        }

        commitState(nextState) {
          this.state = nextState;
          if (this.pose !== 'mad') {
            this.speech = this.getRandomDialogue(nextState);
          }
          this.notify();

          if (this.speechTimer !== null) clearTimeout(this.speechTimer);
          this.speechTimer = setTimeout(() => {
            if (this.pose !== 'mad') {
              this.speech = this.getRandomDialogue(this.state);
              this.notify();
            }
          }, 7000);
        }

        dispose() {
          if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
          if (this.speechTimer !== null) clearTimeout(this.speechTimer);
          if (this.animationTimer !== null) clearInterval(this.animationTimer);
          if (this.blinkTimer !== null) clearTimeout(this.blinkTimer);
          if (this.reasoningCycleTimer !== null) clearInterval(this.reasoningCycleTimer);
          if (this.madTimer !== null) clearTimeout(this.madTimer);
          this.listeners.clear();
        }
      }

      // Self-contained embedded Base64 Data URIs
      const MAIDEN_PATH = ${JSON.stringify(maidenDataUri)};
      const CHIBI_PATH = ${JSON.stringify(chibiDataUri)};
      const PONDERING_PATH = ${JSON.stringify(ponderingDataUri)};
      const PUZZLED_PATH = ${JSON.stringify(puzzledDataUri)};
      const PUFF_PATH = ${JSON.stringify(puffDataUri)};
      const GETIT_PATH = ${JSON.stringify(getitDataUri)};
      const SAJIAO_PATH = ${JSON.stringify(sajiaoDataUri)};
      const BAIFAN_PATH = ${JSON.stringify(baifanDataUri)};
      const RICE_BOWL_PATH = ${JSON.stringify(riceBowlDataUri)};

      function LivingPuppet(props) {
        const rotY = props.gazeOffset.x * 5.0;
        const rotX = -props.gazeOffset.y * 3.5;
        const transX = props.gazeOffset.x * 6.0;
        const transY = props.gazeOffset.y * 4.0;

        const puppetStyle = props.isGalGameMode
          ? { transform: 'perspective(900px) rotateY(' + (rotY * 0.7) + 'deg) rotateX(' + (rotX * 0.5) + 'deg) translate(' + (transX * 0.6) + 'px, ' + (transY * 0.5) + 'px)' }
          : { transform: 'perspective(700px) rotateY(' + rotY + 'deg) rotateX(' + rotX + 'deg) translate(' + transX + 'px, ' + transY + 'px)' };

        const isMaiden = props.isMaiden;
        const isTalking = props.mouthOpenRatio > 0.15 || props.state === 'EATING';

        const imgClass = isMaiden
          ? (props.isGalGameMode ? 'standingGalGame' : 'standingBase')
          : (props.isGalGameMode ? 'chibiGalGame' : 'chibiBase');

        return h('div', {
          className: 'puppetRoot ' + (props.isGalGameMode ? 'puppetGalGame' : ''),
          onMouseDown: props.onMouseDown,
        },
          h('div', { className: 'puppetCanvas ' + (isTalking ? 'canvasTalking' : ''), style: puppetStyle },
            h('img', {
              src: props.imgSrc,
              alt: 'DeepSeek Whale Maid',
              className: 'characterBase ' + imgClass,
              draggable: false,
            }),
            isTalking && h('div', { className: 'talkingIndicator' },
              h('div', { className: 'talkingWave' })
            )
          )
        );
      }

      function PetOverlay(props) {
        const stateMachine = props.stateMachine;
        const [status, setStatus] = useState(() => stateMachine.getStatus());
        const [position, setPosition] = useState({
          x: typeof window !== 'undefined' ? window.innerWidth - 220 : 800,
          y: typeof window !== 'undefined' ? window.innerHeight - 260 : 500,
          side: 'right',
        });
        const [isDragging, setIsDragging] = useState(false);
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const [isSettingsOpen, setIsSettingsOpen] = useState(false);
        const [isBouncing, setIsBouncing] = useState(false);
        const [wanderingEnabled, setWanderingEnabled] = useState(true);
        const [inputValue, setInputValue] = useState('');
        const [currentPageIndex, setCurrentPageIndex] = useState(0);
        const [isThoughtBubbleVisible, setIsThoughtBubbleVisible] = useState(true);

        const isDraggingRef = useRef(false);
        const dragStartRef = useRef(null);
        const wanderTimerRef = useRef(null);
        const menuTimerRef = useRef(null);
        const textScrollRef = useRef(null);
        const thoughtScrollRef = useRef(null);
        const lastDialogueRef = useRef('');

        useEffect(() => {
          return stateMachine.subscribe(newStatus => setStatus(newStatus));
        }, [stateMachine]);

        useEffect(() => {
          if (status.isGalGameMode) {
            document.body.classList.add('dsh-galgame-mode');
          } else {
            document.body.classList.remove('dsh-galgame-mode');
          }
          return () => {
            document.body.classList.remove('dsh-galgame-mode');
          };
        }, [status.isGalGameMode]);

        // Paginate reply text for Visual Novel paragraph progression
        // 目标字数与加大后的剧场框匹配：尽量放满每一段
        const dialoguePages = useMemo(() => {
          return paginateDialogue(status.latestDialogue || status.speech, 260);
        }, [status.latestDialogue, status.speech]);

        useEffect(() => {
          const cur = status.latestDialogue || status.speech;
          if (cur !== lastDialogueRef.current) {
            if (!lastDialogueRef.current || !cur.startsWith(lastDialogueRef.current.slice(0, 30))) {
              setCurrentPageIndex(0);
            }
            lastDialogueRef.current = cur;
          }
        }, [status.latestDialogue, status.speech]);

        useEffect(() => {
          if (status.isReasoning) {
            setIsThoughtBubbleVisible(true);
          }
        }, [status.isReasoning]);

        useEffect(() => {
          if (thoughtScrollRef.current) {
            thoughtScrollRef.current.scrollTop = thoughtScrollRef.current.scrollHeight;
          }
        }, [status.reasoningText]);

        useEffect(() => {
          if (status.isGalGameMode && textScrollRef.current) {
            textScrollRef.current.scrollTop = textScrollRef.current.scrollHeight;
          }
        }, [currentPageIndex, status.latestDialogue, status.isGalGameMode]);

        const handleMouseEnterPet = useCallback(() => {
          if (menuTimerRef.current) {
            clearTimeout(menuTimerRef.current);
            menuTimerRef.current = null;
          }
          setIsMenuOpen(true);
        }, []);

        const handleMouseLeavePet = useCallback(() => {
          if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
          menuTimerRef.current = setTimeout(() => {
            setIsMenuOpen(false);
          }, 750);
        }, []);

        useEffect(() => {
          const handleMouseMove = (e) => {
            if (status.isInputFocused) return;
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const nx = (e.clientX - centerX) / (window.innerWidth / 2);
            const ny = (e.clientY - centerY) / (window.innerHeight / 2);
            stateMachine.setGazeOffset({ x: nx, y: ny });
          };
          window.addEventListener('mousemove', handleMouseMove, { passive: true });
          return () => window.removeEventListener('mousemove', handleMouseMove);
        }, [status.isInputFocused, stateMachine]);

        useEffect(() => {
          if (!wanderingEnabled || status.isGalGameMode) {
            if (wanderTimerRef.current !== null) {
              clearInterval(wanderTimerRef.current);
              wanderTimerRef.current = null;
            }
            return;
          }

          const interval = setInterval(() => {
            if (isDraggingRef.current) return;
            const curStatus = stateMachine.getStatus();
            if (curStatus.state !== 'IDLE' && curStatus.state !== 'WANDERING') return;

            stateMachine.setWandering(true);
            const margin = 40;
            const width = status.form === 'maiden' ? 280 : 170;
            const height = status.form === 'maiden' ? 420 : 220;
            const maxX = Math.max(margin, window.innerWidth - width - margin);
            const minX = Math.max(margin, window.innerWidth - 420);
            const targetX = Math.floor(minX + Math.random() * (maxX - minX));
            const targetY = Math.max(margin, window.innerHeight - height - margin);

            setPosition({
              x: targetX,
              y: targetY,
              side: targetX < window.innerWidth / 2 ? 'left' : 'right',
            });

            setTimeout(() => {
              stateMachine.setWandering(false);
            }, 3300);
          }, 14000);

          wanderTimerRef.current = interval;
          return () => {
            clearInterval(interval);
            wanderTimerRef.current = null;
          };
        }, [wanderingEnabled, status.form, status.isGalGameMode]);

        const handleMouseDown = useCallback((e) => {
          if (status.isGalGameMode) return;
          isDraggingRef.current = true;
          setIsDragging(true);
          stateMachine.setWandering(false);

          dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            petX: position.x,
            petY: position.y,
            startTime: Date.now(),
          };
        }, [position, status.isGalGameMode, stateMachine]);

        useEffect(() => {
          if (!isDragging) return;
          const onMove = (e) => {
            if (!dragStartRef.current) return;
            const dx = e.clientX - dragStartRef.current.startX;
            const dy = e.clientY - dragStartRef.current.startY;
            const newX = Math.max(10, Math.min(window.innerWidth - 180, dragStartRef.current.petX + dx));
            const newY = Math.max(10, Math.min(window.innerHeight - 200, dragStartRef.current.petY + dy));
            setPosition({
              x: newX,
              y: newY,
              side: newX < window.innerWidth / 2 ? 'left' : 'right',
            });
          };
          const onUp = (e) => {
            isDraggingRef.current = false;
            setIsDragging(false);
            if (dragStartRef.current && e) {
              const dist = Math.hypot(e.clientX - dragStartRef.current.startX, e.clientY - dragStartRef.current.startY);
              const duration = Date.now() - dragStartRef.current.startTime;
              if (dist < 6 && duration < 380) {
                setIsBouncing(true);
                setTimeout(() => setIsBouncing(false), 480);
                stateMachine.triggerMad();
                setIsSettingsOpen(prev => !prev);
              }
            }
            dragStartRef.current = null;
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
          return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
        }, [isDragging]);

        const handleAdvancePage = () => {
          if (currentPageIndex < dialoguePages.length - 1) {
            setCurrentPageIndex(prev => prev + 1);
          } else if (dialoguePages.length > 1) {
            setCurrentPageIndex(0);
          }
        };

        const handleSendMessage = () => {
          const text = inputValue.trim();
          if (!text) return;

          stateMachine.setLatestDialogue('「' + text + '」—— 正在为你调用深海算力，请稍候……');
          stateMachine.clearReasoningText();
          stateMachine.setReasoning(true);
          setCurrentPageIndex(0);
          setIsThoughtBubbleVisible(true);
          setInputValue('');

          const composerEl = document.querySelector('[data-composer-input]') ||
                             document.querySelector('[data-composer-card] [contenteditable="true"]') ||
                             document.querySelector('[data-composer-card] [role="textbox"]') ||
                             document.querySelector('[data-composer-seat] [contenteditable="true"]') ||
                             document.querySelector('[data-composer-seat] textarea') ||
                             document.querySelector('textarea');
          if (!composerEl) {
            console.warn('[dsh-whale-pet] Could not locate DSH composer element');
            return;
          }

          const seat = document.querySelector('[data-composer-seat]') || document.querySelector('[data-composer-card]');
          if (seat) {
            seat.style.pointerEvents = 'auto';
          }

          if (composerEl instanceof HTMLTextAreaElement || composerEl instanceof HTMLInputElement) {
            composerEl.focus();
            composerEl.value = text;
            composerEl.dispatchEvent(new Event('input', { bubbles: true }));
            composerEl.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            composerEl.focus();
            const sel = window.getSelection();
            if (sel) {
              const range = document.createRange();
              range.selectNodeContents(composerEl);
              range.collapse(false);
              sel.removeAllRanges();
              sel.addRange(range);
            }
            let inserted = false;
            try {
              inserted = document.execCommand('insertText', false, text);
            } catch (e) {
              inserted = false;
            }
            if (!inserted) {
              try {
                const inputEvent = new InputEvent('beforeinput', {
                  bubbles: true,
                  cancelable: true,
                  inputType: 'insertText',
                  data: text,
                });
                composerEl.dispatchEvent(inputEvent);
              } catch (e) {}
              composerEl.textContent = text;
              composerEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }

          setTimeout(() => {
            const card = document.querySelector('[data-composer-card]') || document.querySelector('[data-composer-seat]');
            let sendBtn = null;
            if (card) {
              const buttons = Array.from(card.querySelectorAll('button'));
              sendBtn = buttons.find(b => {
                const aria = b.getAttribute('aria-label') || b.textContent || '';
                return /send|发送|steer|queue/i.test(aria) && !b.disabled;
              }) || (buttons.length > 0 ? buttons[buttons.length - 1] : null);
            }

            if (sendBtn && !sendBtn.hasAttribute('disabled')) {
              sendBtn.click();
            } else {
              composerEl.focus();
              const enterEv = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true,
              });
              composerEl.dispatchEvent(enterEv);
            }
          }, 80);
        };

        // 正式输出或干饭动作时切换为大口吃白饭插画（baifan2.png）
        const resolveCharacterImage = () => {
          if (status.state === 'EATING' || status.pose === 'eating') return BAIFAN_PATH;
          if (status.form === 'chibi') return CHIBI_PATH;
          if (status.pose === 'mad') return SAJIAO_PATH;
          if (status.state === 'REASONING') {
            if (status.pose === 'puzzled') return PUZZLED_PATH;
            if (status.pose === 'puff') return PUFF_PATH;
            if (status.pose === 'getit') return GETIT_PATH;
            return PONDERING_PATH;
          }
          return MAIDEN_PATH;
        };

        const isMaiden = status.form === 'maiden';
        const currentImgSrc = resolveCharacterImage();
        const displayDialogue = dialoguePages[currentPageIndex] || dialoguePages[0] || '';

        const stateClass =
          status.state === 'PEEKING' ? 'statePeeking' :
          status.state === 'REASONING' ? 'stateReasoning' :
          status.state === 'EATING' ? 'stateEating' :
          status.state === 'WANDERING' ? 'stateWandering' : 'stateIdle';

        // -------------------------------------------------------------
        // GalGame Mode: Center Stage, Comic Thought Bubble & Reply Box
        // -------------------------------------------------------------
        if (status.isGalGameMode) {
          const showThoughtBubble = isThoughtBubbleVisible && (status.isReasoning || Boolean(status.reasoningText));

          return h(React.Fragment, null,
            // Backdrop
            h('div', {
              className: 'galgameBackdrop',
              onClick: () => stateMachine.setGalGameMode(false),
              title: '点击空白区域退出对话模式',
            }),

            // Comic Thought Bubble (Beside Head)
            showThoughtBubble && h('div', { className: 'comicThoughtBubble' },
              h('div', { className: 'thoughtBubbleHeader' },
                h('div', { className: 'thoughtBubbleTitleGroup' },
                  h('span', null, '💭'),
                  h('span', null, '深度思考过程'),
                  status.isReasoning && h('span', { className: 'thoughtLivePill' }, '推理中...')
                ),
                h('button', {
                  className: 'thoughtCloseBtn',
                  onClick: () => setIsThoughtBubbleVisible(false),
                  title: '隐藏思考气泡',
                }, '✕')
              ),
              h('div', { className: 'thoughtBubbleContent', ref: thoughtScrollRef },
                status.reasoningText || '思考中……正在检索深海知识库，梳理多维逻辑脉络……'
              ),
              h('div', { className: 'comicTrailNode trail1' }),
              h('div', { className: 'comicTrailNode trail2' }),
              h('div', { className: 'comicTrailNode trail3' })
            ),

            // Character Centered Stage
            h('div', {
              className: 'galgameCharacterCentered ' + (isMaiden ? 'galgameCharacterMaiden' : 'galgameCharacterChibi')
            },
              h(LivingPuppet, {
                imgSrc: currentImgSrc,
                isMaiden: isMaiden,
                isGalGameMode: true,
                mouthOpenRatio: status.mouthOpenRatio,
                gazeOffset: status.gazeOffset,
                state: status.state,
              })
            ),

            // Dialogue Box
            h('div', { className: 'galgameTheatreBox' },
              // Header: Only NameTag and Exit button
              h('div', { className: 'galgameHeaderBar' },
                h('div', { className: 'galgameNameTag' },
                  h('span', null, '🐟'),
                  h('span', null, '大肥鱼')
                ),
                h('div', { className: 'galgameTopControls' },
                  dialoguePages.length > 1 && h('span', { className: 'galgamePageBadge' },
                    '第 ' + (currentPageIndex + 1) + ' / ' + dialoguePages.length + ' 段'
                  ),
                  h('button', {
                    className: 'galgameCloseBtn',
                    onClick: () => stateMachine.setGalGameMode(false),
                    title: '退出对话模式 (或点击空白处退出)',
                  }, '✕ 退出')
                )
              ),

              // Dialogue Text Body (Click to advance)
              h('div', {
                className: 'galgameTextBody',
                ref: textScrollRef,
                onClick: handleAdvancePage,
                title: dialoguePages.length > 1 ? '点击切换下一段话' : undefined,
              },
                h('span', { className: 'galgameQuotes' }, '「'),
                h('span', null, displayDialogue),
                status.isStreaming && h('span', { className: 'galgameCursor' }),
                h('span', { className: 'galgameQuotes' }, '」')
              ),

              // Click to Continue Prompt
              dialoguePages.length > 1 && h('div', {
                className: 'galgamePagePrompt',
                onClick: handleAdvancePage,
              },
                currentPageIndex < dialoguePages.length - 1
                  ? [h('span', { key: 'arr' }, '▼ 点击下一段'), h('span', { key: 'num' }, ' (' + (currentPageIndex + 1) + '/' + dialoguePages.length + ')')]
                  : [h('span', { key: 'arr' }, '● 点击回开头'), h('span', { key: 'num' }, ' (' + dialoguePages.length + '/' + dialoguePages.length + ')')]
              ),

              // Composer Area
              h('div', { className: 'galgameComposerArea' },
                h('input', {
                  type: 'text',
                  className: 'galgameInput',
                  placeholder: '输入你的问题，与大肥鱼对话…… (Enter 发送)',
                  value: inputValue,
                  onChange: (e) => setInputValue(e.target.value),
                  onKeyDown: (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  },
                }),
                h('button', {
                  className: 'galgameSendBtn',
                  onClick: handleSendMessage,
                }, '发送')
              )
            )
          );
        }

        // -------------------------------------------------------------
        // Widget Mode: Corner Pet with Toolbar & Settings Drawer
        // -------------------------------------------------------------
        const containerClasses = [
          'overlayContainer',
          isDragging ? 'dragging' : (status.state === 'WANDERING' ? 'wandering' : '')
        ].filter(Boolean).join(' ');

        return h('div', {
          className: containerClasses,
          style: {
            left: position.x + 'px',
            top: position.y + 'px',
          },
          onMouseEnter: handleMouseEnterPet,
          onMouseLeave: handleMouseLeavePet,
        },
          h('div', {
            className: ['characterWrapper', stateClass, isBouncing ? 'qBounce' : ''].filter(Boolean).join(' ')
          },
            // Toolbar with real balance displayed on top
            h('div', {
              className: 'toolbar ' + (isMenuOpen ? 'toolbarVisible' : ''),
              onMouseEnter: handleMouseEnterPet,
              onMouseLeave: handleMouseLeavePet,
            },
              h('div', { className: 'balanceHeaderBar', title: '当前账户实时余额' },
                h('span', { className: 'balanceTag' }, '充值:'),
                h('span', { className: 'balanceVal' }, status.toppedUpBalance || '¥0.00'),
                h('span', { className: 'balanceDivider' }, '|'),
                h('span', { className: 'balanceTag' }, '赠金:'),
                h('span', { className: 'balanceVal' }, status.grantedBalance || '¥0.00')
              ),
              h('div', { className: 'toolbarButtons' },
                h('button', {
                  className: 'toolBtn',
                  onClick: () => stateMachine.toggleForm(),
                  title: '切换形态',
                }, isMaiden ? '切换Q版' : '切换立绘'),
                h('button', {
                  className: 'toolBtn',
                  onClick: () => stateMachine.setGalGameMode(true),
                  title: '切换进入对话模式',
                }, '对话模式'),
                h('button', {
                  className: 'toolBtn',
                  onClick: () => setIsSettingsOpen(!isSettingsOpen),
                  title: '展开更多设置面板',
                }, '设置')
              )
            ),

            // Settings Drawer
            isSettingsOpen && h('div', {
              className: 'settingsDrawer ' + (
                position.x > (typeof window !== 'undefined' ? window.innerWidth - 320 : 800)
                  ? 'settingsDrawerLeft'
                  : 'settingsDrawerRight'
              ),
              onClick: (e) => e.stopPropagation(),
            },
              h('div', { className: 'drawerHeader' },
                h('span', null, '🐟 大肥鱼设置'),
                h('button', {
                  className: 'drawerCloseBtn',
                  onClick: () => setIsSettingsOpen(false),
                  title: '关闭设置',
                }, '✕')
              ),
              h('div', { className: 'drawerItem' },
                h('span', { className: 'drawerLabel' }, '角色形态'),
                h('div', { className: 'drawerBtnGroup' },
                  h('button', {
                    className: 'drawerBtn ' + (status.form === 'chibi' ? 'drawerBtnActive' : ''),
                    onClick: () => stateMachine.setForm('chibi'),
                  }, '迷你Q版'),
                  h('button', {
                    className: 'drawerBtn ' + (status.form === 'maiden' ? 'drawerBtnActive' : ''),
                    onClick: () => stateMachine.setForm('maiden'),
                  }, '少女立绘')
                )
              ),
              h('div', { className: 'drawerItem' },
                h('button', {
                  className: 'drawerFullBtn',
                  onClick: () => {
                    setIsSettingsOpen(false);
                    stateMachine.setGalGameMode(true);
                  },
                }, '展开剧场对话模式')
              ),
              h('div', { className: 'drawerItem' },
                h('button', {
                  className: 'drawerFullBtn ' + (status.autoGalGameOnChat ? 'drawerBtnActive' : ''),
                  onClick: () => stateMachine.toggleAutoGalGameOnChat(),
                }, status.autoGalGameOnChat ? '点击输入框自动展开: 开' : '点击输入框自动展开: 关')
              ),
              h('div', { className: 'drawerItem' },
                h('button', {
                  className: 'drawerFullBtn ' + (wanderingEnabled ? 'drawerBtnActive' : ''),
                  onClick: () => setWanderingEnabled(!wanderingEnabled),
                }, wanderingEnabled ? '闲置随机散步: 开' : '闲置随机散步: 关')
              )
            ),

            status.speech && !isSettingsOpen && h('div', { className: 'speechBubble' }, status.speech),

            status.state === 'REASONING' && h('div', { className: 'bubbleContainer' },
              h('div', { className: 'bubble bubble1' }),
              h('div', { className: 'bubble bubble2' }),
              h('div', { className: 'bubble bubble3' })
            ),

            h(LivingPuppet, {
              imgSrc: currentImgSrc,
              isMaiden: isMaiden,
              isGalGameMode: false,
              mouthOpenRatio: status.mouthOpenRatio,
              gazeOffset: status.gazeOffset,
              state: status.state,
              onMouseDown: handleMouseDown,
            })
          )
        );
      }

      return {
        inject: ['slots'],
        apply(ctx) {
          const stateMachine = new PetStateMachine();
          const loadTime = Date.now();

          ctx.slots.inject('shell.overlay', () => {
            return ctx.slots.register(
              { name: 'shell.overlay', id: 'dsh-whale-pet' },
              () => h(PetOverlay, { stateMachine })
            );
          });

          ctx.effect(() => {
            const isComposer = (el) => {
              if (!el || !el.getAttribute) return false;
              return el.tagName === 'TEXTAREA' ||
                     el.hasAttribute('data-composer-input') ||
                     el.isContentEditable ||
                     (el.closest && el.closest('[data-composer-seat]') !== null);
            };

            const onFocusIn = (e) => { if (isComposer(e.target)) stateMachine.setInputFocus(true); };
            const onFocusOut = (e) => { if (isComposer(e.target)) stateMachine.setInputFocus(false); };
            const onInput = (e) => { if (isComposer(e.target)) stateMachine.setInputFocus(true); };

            const onComposerClick = (e) => {
              if (Date.now() - loadTime < 1800) return;
              if (!stateMachine.getStatus().autoGalGameOnChat) return;
              const target = e.target;
              if (!target) return;
              if (
                (target.closest && (
                  target.closest('[data-composer-card]') ||
                  target.closest('[data-composer-seat]') ||
                  target.closest('[data-composer-input]') ||
                  target.closest('[data-slot="conversation.composer.bar"]')
                )) ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
              ) {
                if (!stateMachine.getStatus().isGalGameMode) {
                  stateMachine.setGalGameMode(true);
                }
              }
            };

            window.addEventListener('focusin', onFocusIn, true);
            window.addEventListener('focusout', onFocusOut, true);
            window.addEventListener('input', onInput, true);
            window.addEventListener('click', onComposerClick, true);

            return () => {
              window.removeEventListener('focusin', onFocusIn, true);
              window.removeEventListener('focusout', onFocusOut, true);
              window.removeEventListener('input', onInput, true);
              window.removeEventListener('click', onComposerClick, true);
            };
          });

          ctx.effect(() => {
            let lastSessionId;
            let wasRunning = false;

            function extractResponseText(container) {
              if (!container) return '';
              const mdElements = Array.from(
                container.querySelectorAll('[class*="markdown"], [data-markdown-variant]')
              ).filter(el => !el.closest('[data-variant="think"]') && !el.closest('[data-turn-process-inline]'));

              if (mdElements.length > 0) {
                const text = mdElements.map(el => el.textContent || '').join('\\n').trim();
                if (text) return text;
              }

              const clone = container.cloneNode(true);
              const thinkElements = clone.querySelectorAll(
                '[data-variant="think"], [data-turn-process-inline], details.think, [class*="reasoning"], [class*="thought"], .summary, .thinkBody'
              );
              thinkElements.forEach(el => el.remove());
              return (clone.textContent || '').trim();
            }

            function extractReasoningText() {
              const thinkNodes = Array.from(
                document.querySelectorAll('[data-variant="think"], details.think, [class*="reasoning"], [class*="thinkBody"]')
              );
              if (thinkNodes.length === 0) return '';
              const lastNode = thinkNodes[thinkNodes.length - 1];

              try {
                const fiberKey = Object.keys(lastNode).find(
                  k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
                );
                if (fiberKey) {
                  let curr = lastNode[fiberKey];
                  for (let i = 0; i < 8 && curr; i++) {
                    if (curr.memoizedProps && typeof curr.memoizedProps.text === 'string') {
                      return curr.memoizedProps.text.trim();
                    }
                    if (curr.memoizedProps && typeof curr.memoizedProps.content === 'string') {
                      return curr.memoizedProps.content.trim();
                    }
                    if (curr.memoizedProps && typeof curr.memoizedProps.reasoning === 'string') {
                      return curr.memoizedProps.reasoning.trim();
                    }
                    curr = curr.return || curr.child;
                  }
                }
              } catch (e) {}

              const bodyEl = lastNode.querySelector('.thinkBody, [class*="body"], [class*="content"]');
              if (bodyEl && bodyEl.textContent) {
                return bodyEl.textContent.trim();
              }
              return (lastNode.textContent || '').trim();
            }

            function queryAccountBalances() {
              let toppedUp = '';
              let granted = '';

              const rows = Array.from(
                document.querySelectorAll('[class*="balanceCard"] [class*="row"], [class*="balance"] [class*="row"]')
              );
              for (const row of rows) {
                const text = row.textContent || '';
                const amountEl = row.querySelector('[class*="amount"]');
                const amount = amountEl ? (amountEl.textContent || '').trim() : '';
                if (amount) {
                  if (/充值|topped-up|balance/i.test(text) && !/赠金|granted|bonus/i.test(text)) {
                    toppedUp = amount;
                  } else if (/赠金|granted|bonus/i.test(text)) {
                    granted = amount;
                  }
                }
              }

              if (!toppedUp && !granted) {
                const amountEls = Array.from(document.querySelectorAll('[class*="amount"]'));
                if (amountEls.length >= 2) {
                  toppedUp = (amountEls[0].textContent || '').trim();
                  granted = (amountEls[1].textContent || '').trim();
                } else if (amountEls.length === 1) {
                  toppedUp = (amountEls[0].textContent || '').trim();
                }
              }

              if (toppedUp || granted) {
                return {
                  toppedUp: toppedUp || '¥0.00',
                  granted: granted || '¥0.00',
                };
              }
              return null;
            }

            function findLatestAssistantNode() {
              const assistantSeats = Array.from(document.querySelectorAll('[data-chat-flow-kind="assistant-step"]'));
              if (assistantSeats.length > 0) {
                return assistantSeats[assistantSeats.length - 1];
              }
              const candidateNodes = Array.from(
                document.querySelectorAll('[data-chat-node-key]:not([data-chat-flow-kind="user-prompt"])')
              );
              if (candidateNodes.length > 0) {
                return candidateNodes[candidateNodes.length - 1];
              }
              const mdRoots = Array.from(
                document.querySelectorAll('div[class*="AssistantMarkdown_root"], div[class*="AssistantMarkdown"]')
              );
              if (mdRoots.length > 0) {
                return mdRoots[mdRoots.length - 1];
              }
              return null;
            }

            const inspectState = () => {
              const sessionEl = document.querySelector('[data-conversation-session]');
              const sessionId = sessionEl ? sessionEl.getAttribute('data-conversation-session') : null;
              if (lastSessionId !== undefined && sessionId !== lastSessionId) {
                stateMachine.clearReasoningText();
              }
              lastSessionId = sessionId;

              const runningEl = document.querySelector('[data-chat-running]');
              const isRunning = runningEl !== null && !runningEl.hasAttribute('data-holding');

              if (isRunning && !wasRunning) {
                stateMachine.clearReasoningText();
              }
              wasRunning = isRunning;

              const balances = queryAccountBalances();
              if (balances) {
                stateMachine.setBalances(balances.toppedUp, balances.granted);
              }

              const reasoningContent = extractReasoningText();
              if (reasoningContent) {
                stateMachine.setReasoningText(reasoningContent);
              }

              const latestAssistantNode = findLatestAssistantNode();

              if (isRunning) {
                let cleanResponse = '';
                if (latestAssistantNode) {
                  cleanResponse = extractResponseText(latestAssistantNode);
                }

                if (cleanResponse) {
                  stateMachine.setStreaming(true);
                  stateMachine.setReasoning(false);
                  stateMachine.setLatestDialogue(cleanResponse);
                } else {
                  stateMachine.setStreaming(false);
                  stateMachine.setReasoning(true);
                }
              } else {
                stateMachine.setStreaming(false);
                stateMachine.setReasoning(false);

                if (latestAssistantNode) {
                  const cleanResponse = extractResponseText(latestAssistantNode);
                  if (cleanResponse) {
                    stateMachine.setLatestDialogue(cleanResponse);
                  }
                }
              }
            };

            const observer = new MutationObserver(inspectState);
            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['data-streaming', 'data-chat-running', 'data-holding'],
            });

            const interval = setInterval(inspectState, 200);

            return () => {
              observer.disconnect();
              clearInterval(interval);
              stateMachine.dispose();
              if (styleEl && styleEl.parentNode) {
                styleEl.parentNode.removeChild(styleEl);
              }
            };
          });
        },
      };
    },
  });
})();
`

const libClientPath = join(__dirname, 'lib', 'client.js')
writeFileSync(libClientPath, clientBundleSource, 'utf-8')
console.log(`[build] Successfully generated ${libClientPath}`)

/**
 * Theatre background music (Audio Manager).
 *
 * The built-in tracks are performed live with Web Audio (no samples, no
 * licensing questions, nothing added to the bundle) by a small look-ahead
 * sequencer, so they loop seamlessly by construction. A user-supplied file is
 * decoded once and looped sample-accurately with an AudioBufferSourceNode.
 *
 * Signal path: track session (instruments → dry + reverb) → session gain
 * (used for crossfades) → master gain (user volume) → fade gain (start/stop
 * fades) → compressor → speakers.
 *
 * Lifetime rules
 *  - Nothing is created until play() runs inside a user gesture.
 *  - fadeOut() ramps to silence, then stops every voice and suspends the
 *    context: no background "ghost" audio and no timers left running.
 *  - stopNow() (page hide / unload) and dispose() stop immediately and close
 *    the context, releasing the audio device and decoded buffers.
 */

export type BgmTrackId = 'daily' | 'calm' | 'night' | 'custom'

export interface BgmTrackMeta { id: BgmTrackId; zh: string; en: string; moodZh: string; moodEn: string }

export const BGM_TRACKS: readonly BgmTrackMeta[] = [
  { id: 'daily', zh: '日常轻快', en: 'Everyday Breeze', moodZh: 'F 大调 · 104 BPM', moodEn: 'F major · 104 BPM' },
  { id: 'calm', zh: '宁静闲聊', en: 'Quiet Chat', moodZh: 'C 大调 · 80 BPM', moodEn: 'C major · 80 BPM' },
  { id: 'night', zh: '深夜治愈', en: 'Late-night Comfort', moodZh: 'Lo-fi · 70 BPM', moodEn: 'Lo-fi · 70 BPM' },
  { id: 'custom', zh: '我的音乐', en: 'My music', moodZh: '本地文件 · 无缝循环', moodEn: 'Local file · seamless loop' },
]

export const BGM_TUNING = {
  /** Scheduler wake-up interval (ms) and how far ahead notes are queued (s). */
  tickMs: 50,
  lookAhead: 0.3,
  fadeIn: 1.2,
  fadeOut: 0.8,
  crossfade: 0.7,
}

export function isBgmTrack(value: unknown): value is BgmTrackId {
  return typeof value === 'string' && BGM_TRACKS.some(track => track.id === value)
}

/** Perceptual volume curve: the slider feels even, low values stay usable. */
export function bgmGain(volume: number): number {
  const v = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0))
  return v * v * 1.4
}

/** Next or previous track, skipping "custom" when no file is stored. */
export function cycleBgmTrack(current: BgmTrackId, direction: 1 | -1, hasCustom: boolean): BgmTrackId {
  const list = BGM_TRACKS.map(track => track.id).filter(id => id !== 'custom' || hasCustom)
  const index = Math.max(0, list.indexOf(current))
  return list[(index + direction + list.length) % list.length]
}

const bgmMidiHz = (note: number) => 440 * Math.pow(2, (note - 69) / 12)

// ---------------------------------------------------------------------------
// Scores. Steps are 16th notes; a bar has 16 steps.
// ---------------------------------------------------------------------------

type MelodyNote = [step: number, note: number, length: number]

interface BgmScore {
  bpm: number
  swing: number
  bars: number
  /** Melody bars; the melody loops over `melodyCycle` bars (rests fill the gap). */
  melodyCycle: number
  chords: number[][]
  bass: number[]
  melody: MelodyNote[][]
  play: (session: BgmSession, bar: number, step: number, time: number, step16: number) => void
}

const DAILY_MELODY: MelodyNote[][] = [
  [[0, 69, 2], [2, 72, 2], [4, 74, 4], [10, 72, 2], [12, 74, 2], [14, 77, 2]],
  [[0, 76, 6], [6, 74, 2], [8, 72, 4], [12, 67, 4]],
  [[0, 72, 2], [2, 76, 2], [4, 79, 4], [10, 76, 2], [12, 74, 2], [14, 72, 2]],
  [[0, 74, 8], [10, 69, 2], [12, 72, 4]],
  [[0, 70, 2], [2, 74, 2], [4, 77, 4], [10, 74, 2], [12, 77, 2], [14, 79, 2]],
  [[0, 79, 4], [4, 77, 2], [6, 76, 2], [8, 74, 2], [10, 72, 2], [12, 70, 4]],
  [[0, 69, 4], [4, 72, 2], [6, 76, 6], [12, 77, 4]],
  [[0, 75, 4], [4, 72, 4], [8, 69, 8]],
]

const CALM_MELODY: MelodyNote[][] = [
  [[4, 72, 4], [8, 76, 8]],
  [[0, 74, 8], [10, 71, 6]],
  [[4, 69, 4], [8, 72, 8]],
  [[0, 71, 12]],
  [[4, 76, 4], [8, 79, 8]],
  [[0, 76, 6], [8, 72, 8]],
  [[4, 74, 4], [8, 77, 4], [12, 76, 4]],
  [[0, 74, 16]],
]

const NIGHT_MELODY: MelodyNote[][] = [
  [[4, 76, 4], [8, 77, 2], [10, 76, 2], [12, 74, 4]],
  [[0, 72, 6], [8, 71, 8]],
  [[2, 67, 2], [4, 71, 4], [8, 74, 8]],
  [[0, 73, 6], [8, 70, 4], [12, 69, 4]],
  [[4, 76, 4], [8, 77, 2], [10, 79, 2], [12, 81, 4]],
  [[0, 79, 6], [8, 77, 4], [12, 76, 4]],
  [[4, 74, 4], [8, 71, 8]],
  [[0, 73, 8], [8, 69, 8]],
]

function bgmMelodyAt(score: BgmScore, bar: number, step: number): MelodyNote | undefined {
  const cycleBar = bar % score.melodyCycle
  if (cycleBar >= score.melody.length) return undefined
  return score.melody[cycleBar].find(note => note[0] === step)
}

const BGM_SCORES: Record<Exclude<BgmTrackId, 'custom'>, BgmScore> = {
  // 王道进行 (IV–V–iii–vi) in F, bright electric piano, light groove.
  daily: {
    bpm: 104, swing: 0.08, bars: 8, melodyCycle: 16,
    chords: [[62, 65, 69, 72], [64, 67, 70, 72], [64, 67, 69, 72], [62, 65, 69, 72], [62, 65, 67, 70], [64, 67, 70, 72], [64, 65, 69, 72], [63, 65, 69, 72]],
    bass: [46, 48, 45, 50, 43, 48, 41, 41],
    melody: DAILY_MELODY,
    play(s, bar, step, time, sd) {
      const score = BGM_SCORES.daily, chord = score.chords[bar % 8], root = score.bass[bar % 8]
      const cycle = Math.floor(bar / 8) % 2
      if (step === 0) s.keys(chord, time, sd * 3.5, 0.55)
      if (step === 6) s.keys(chord, time, sd * 2, 0.4)
      if (step === 10) s.keys(chord, time, sd * 4, 0.48)
      if (step === 14 && bar % 2 === 1) s.keys(chord, time, sd * 1.5, 0.3)
      if (step === 0) s.bass(root, time, sd * 5.5, 0.85)
      if (step === 6) s.bass(root, time, sd * 1.6, 0.55)
      if (step === 8) s.bass(root + 7, time, sd * 3.5, 0.7)
      if (step === 14) s.bass(root + 12, time, sd * 1.6, 0.5)
      if (step === 0 || step === 8 || (step === 7 && bar % 4 === 3)) s.kick(time, step === 7 ? 0.45 : 0.75)
      if (step === 4 || step === 12) s.snap(time, 0.5)
      if (step % 2 === 0) s.hat(time, step % 4 === 0 ? 0.32 : 0.22, step === 14 && bar % 4 === 3)
      else if (step === 15) s.hat(time, 0.12, false)
      const note = bgmMelodyAt(score, bar, step)
      if (note) cycle === 0 ? s.bell(note[1], time, sd * note[2], 0.5) : s.pluck(note[1] - 12, time, sd * note[2], 0.42)
    },
  },
  // Gentle descending progression in C, pad and arpeggio, shaker only.
  calm: {
    bpm: 80, swing: 0.1, bars: 8, melodyCycle: 16,
    chords: [[60, 64, 65, 69], [59, 62, 64, 67], [57, 60, 62, 65], [59, 62, 65, 67], [60, 64, 67, 71], [60, 64, 67, 69], [57, 60, 64, 65], [59, 64, 65, 69]],
    bass: [41, 40, 38, 43, 48, 45, 38, 43],
    melody: CALM_MELODY,
    play(s, bar, step, time, sd) {
      const score = BGM_SCORES.calm, chord = score.chords[bar % 8], root = score.bass[bar % 8]
      if (step === 0) { s.pad(chord, time, sd * 16, 0.5); s.bass(root, time, sd * 14, 0.42) }
      if (step === 8 && bar % 2 === 1) s.bass(root + 7, time, sd * 7, 0.3)
      if (step % 2 === 0) {
        const order = [0, 1, 2, 3, 2, 1, 2, 3]
        s.pluck(chord[order[step / 2]] + 12, time, sd * 3, step === 0 ? 0.52 : 0.4)
      }
      if (step % 2 === 0) s.shaker(time, step % 4 === 0 ? 0.16 : 0.24)
      const note = bgmMelodyAt(score, bar, step)
      if (note && Math.floor(bar / 8) % 2 === 1) s.bell(note[1], time, sd * note[2], 0.36)
    },
  },
  // ii–V–I–VI lo-fi in C with swing, crackle and a soft low-pass.
  night: {
    bpm: 70, swing: 0.22, bars: 8, melodyCycle: 16,
    chords: [[60, 64, 65, 69], [59, 64, 65, 69], [59, 62, 64, 67], [58, 61, 64, 67], [60, 64, 65, 69], [59, 64, 65, 69], [59, 62, 64, 67], [58, 61, 64, 67]],
    bass: [38, 43, 36, 45, 38, 43, 40, 45],
    melody: NIGHT_MELODY,
    play(s, bar, step, time, sd) {
      const score = BGM_SCORES.night, chord = score.chords[bar % 8], root = score.bass[bar % 8]
      if (step === 0) s.keys(chord, time, sd * 12, 0.5, 0.018)
      if (step === 14 && bar % 2 === 1) s.keys(score.chords[(bar + 1) % 8], time, sd * 2, 0.3, 0.012)
      if (step === 0) s.bass(root, time, sd * 7, 0.85)
      if (step === 10) s.bass(root, time, sd * 4, 0.6)
      if (step === 0 || step === 10 || (step === 6 && bar % 2 === 0)) s.kick(time, step === 0 ? 0.7 : 0.5)
      if (step === 4 || step === 12) s.snap(time, 0.42)
      if (step % 2 === 0) s.hat(time, step % 4 === 0 ? 0.2 : 0.14, false)
      const note = bgmMelodyAt(score, bar, step)
      if (note) s.bell(note[1], time, sd * note[2], 0.34)
    },
  },
}

// ---------------------------------------------------------------------------
// A playing track: its instruments, gain and scheduler state.
// ---------------------------------------------------------------------------

class BgmSession {
  readonly gain: GainNode
  readonly dry: GainNode
  readonly wet: GainNode
  private readonly input: AudioNode
  private readonly nodes: AudioNode[] = []
  private readonly live = new Set<AudioScheduledSourceNode>()
  private seed = 1
  stepIndex = 0
  nextTime = 0

  constructor(readonly ctx: AudioContext, output: AudioNode, readonly noise: AudioBuffer, impulse: AudioBuffer | null, lowpass: number) {
    this.gain = ctx.createGain()
    this.gain.gain.value = 0
    this.gain.connect(output)
    let tail: AudioNode = this.gain
    if (lowpass > 0) {
      const tone = ctx.createBiquadFilter()
      tone.type = 'lowpass'; tone.frequency.value = lowpass; tone.Q.value = 0.4
      tone.connect(this.gain); tail = tone; this.nodes.push(tone)
    }
    this.dry = ctx.createGain(); this.dry.gain.value = 0.82; this.dry.connect(tail)
    this.wet = ctx.createGain(); this.wet.gain.value = 0.32
    if (impulse && typeof ctx.createConvolver === 'function') {
      const reverb = ctx.createConvolver()
      reverb.buffer = impulse
      this.wet.connect(reverb); reverb.connect(tail); this.nodes.push(reverb)
    } else this.wet.connect(tail)
    const bus = ctx.createGain(); bus.gain.value = 1
    bus.connect(this.dry); bus.connect(this.wet)
    this.input = bus
    this.nodes.push(this.dry, this.wet, bus)
  }

  private random(): number {
    this.seed = (this.seed * 16807) % 2147483647
    return this.seed / 2147483647
  }

  private track(source: AudioScheduledSourceNode, stopAt: number) {
    this.live.add(source)
    source.onended = () => { this.live.delete(source); try { source.disconnect() } catch { /* already gone */ } }
    source.stop(stopAt)
  }

  private envelope(time: number, peak: number, attack: number, hold: number, release: number): GainNode {
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + attack)
    g.gain.setValueAtTime(Math.max(0.0002, peak), time + attack + hold)
    g.gain.exponentialRampToValueAtTime(0.0001, time + attack + hold + release)
    return g
  }

  private human(velocity: number): number { return velocity * (0.9 + this.random() * 0.2) }

  /** Electric piano: a sine pair with a short FM "tine" at the attack. */
  keys(chord: number[], time: number, length: number, velocity: number, strum = 0.008) {
    chord.forEach((note, i) => {
      const t = time + i * strum, f = bgmMidiHz(note), v = this.human(velocity) * 0.13
      const carrier = this.ctx.createOscillator(); carrier.type = 'sine'; carrier.frequency.value = f
      const octave = this.ctx.createOscillator(); octave.type = 'sine'; octave.frequency.value = f * 2
      const mod = this.ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = f * 7
      const modGain = this.ctx.createGain()
      modGain.gain.setValueAtTime(f * 1.4, t); modGain.gain.exponentialRampToValueAtTime(1, t + 0.18)
      mod.connect(modGain); modGain.connect(carrier.frequency)
      const octaveGain = this.ctx.createGain(); octaveGain.gain.value = 0.3
      const env = this.envelope(t, v, 0.006, Math.max(0.05, length * 0.35), Math.max(0.4, length * 0.9 + 0.5))
      const tone = this.ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 3400
      carrier.connect(env); octave.connect(octaveGain); octaveGain.connect(env); env.connect(tone); tone.connect(this.input)
      const end = t + length * 1.25 + 1
      for (const osc of [carrier, octave, mod]) { osc.start(t); this.track(osc, end) }
    })
  }

  /** Warm pad: detuned triangle and saw through a soft low-pass. */
  pad(chord: number[], time: number, length: number, velocity: number) {
    for (const note of chord) {
      const f = bgmMidiHz(note)
      const env = this.ctx.createGain()
      const peak = velocity * 0.07
      env.gain.setValueAtTime(0.0001, time)
      env.gain.linearRampToValueAtTime(peak, time + 0.9)
      env.gain.setValueAtTime(peak, time + Math.max(1, length - 0.6))
      env.gain.linearRampToValueAtTime(0.0001, time + length + 1.2)
      const tone = this.ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2200; tone.Q.value = 0.3
      env.connect(tone); tone.connect(this.input)
      for (const [type, cents, level] of [['triangle', -6, 1], ['sawtooth', 7, 0.4]] as Array<[OscillatorType, number, number]>) {
        const osc = this.ctx.createOscillator(); osc.type = type; osc.frequency.value = f; osc.detune.value = cents
        const g = this.ctx.createGain(); g.gain.value = level
        osc.connect(g); g.connect(env); osc.start(time); this.track(osc, time + length + 1.4)
      }
    }
  }

  bass(note: number, time: number, length: number, velocity: number) {
    const f = bgmMidiHz(note), v = this.human(velocity) * 0.1
    const osc = this.ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f
    const sub = this.ctx.createOscillator(); sub.type = 'triangle'; sub.frequency.value = f
    const subGain = this.ctx.createGain(); subGain.gain.value = 0.5
    const env = this.envelope(time, v, 0.012, Math.max(0.04, length * 0.6), Math.max(0.12, length * 0.5))
    const tone = this.ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 900
    osc.connect(env); sub.connect(subGain); subGain.connect(env); env.connect(tone); tone.connect(this.dry)
    for (const o of [osc, sub]) { o.start(time); this.track(o, time + length + 0.3) }
  }

  pluck(note: number, time: number, length: number, velocity: number) {
    const f = bgmMidiHz(note), v = this.human(velocity) * 0.13
    const osc = this.ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = f
    const env = this.envelope(time, v, 0.004, 0.02, Math.min(1.2, 0.25 + length * 0.6))
    const tone = this.ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.setValueAtTime(3800, time); tone.frequency.exponentialRampToValueAtTime(900, time + 0.4)
    osc.connect(env); env.connect(tone); tone.connect(this.input)
    osc.start(time); this.track(osc, time + Math.min(1.4, 0.4 + length * 0.7))
  }

  /** Music-box bell for melodies: FM ratio 3.5 with a long, quiet tail. */
  bell(note: number, time: number, length: number, velocity: number) {
    const f = bgmMidiHz(note), v = this.human(velocity) * 0.11
    const carrier = this.ctx.createOscillator(); carrier.type = 'sine'; carrier.frequency.value = f
    const mod = this.ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = f * 3.5
    const modGain = this.ctx.createGain(); modGain.gain.setValueAtTime(f * 0.9, time); modGain.gain.exponentialRampToValueAtTime(f * 0.05, time + 0.6)
    mod.connect(modGain); modGain.connect(carrier.frequency)
    const env = this.envelope(time, v, 0.004, Math.max(0.05, length * 0.4), Math.max(0.6, length + 0.8))
    carrier.connect(env); env.connect(this.input)
    const end = time + length * 1.4 + 1.2
    for (const o of [carrier, mod]) { o.start(time); this.track(o, end) }
  }

  kick(time: number, velocity: number) {
    const osc = this.ctx.createOscillator(); osc.type = 'sine'
    osc.frequency.setValueAtTime(115, time); osc.frequency.exponentialRampToValueAtTime(44, time + 0.14)
    const env = this.envelope(time, this.human(velocity) * 0.2, 0.003, 0.02, 0.22)
    osc.connect(env); env.connect(this.dry); osc.start(time); this.track(osc, time + 0.35)
  }

  private noiseHit(time: number, velocity: number, type: BiquadFilterType, frequency: number, q: number, decay: number, send: AudioNode) {
    const src = this.ctx.createBufferSource(); src.buffer = this.noise
    const filter = this.ctx.createBiquadFilter(); filter.type = type; filter.frequency.value = frequency; filter.Q.value = q
    const env = this.envelope(time, this.human(velocity), 0.002, 0.004, decay)
    src.connect(filter); filter.connect(env); env.connect(send)
    src.start(time, this.random() * 0.5); this.track(src, time + decay + 0.05)
  }

  hat(time: number, velocity: number, open: boolean) { this.noiseHit(time, velocity * 0.22, 'highpass', 7200, 0.7, open ? 0.22 : 0.045, this.dry) }
  shaker(time: number, velocity: number) { this.noiseHit(time, velocity * 0.26, 'bandpass', 5200, 1.2, 0.07, this.dry) }
  snap(time: number, velocity: number) {
    this.noiseHit(time, velocity * 0.24, 'bandpass', 1900, 0.9, 0.12, this.input)
    const body = this.ctx.createOscillator(); body.type = 'triangle'; body.frequency.setValueAtTime(220, time); body.frequency.exponentialRampToValueAtTime(140, time + 0.06)
    const env = this.envelope(time, this.human(velocity) * 0.05, 0.002, 0.005, 0.08)
    body.connect(env); env.connect(this.dry); body.start(time); this.track(body, time + 0.12)
  }

  /** A looping source (vinyl crackle or the user's file). */
  loop(buffer: AudioBuffer, time: number, level: number, dryOnly = true) {
    const src = this.ctx.createBufferSource(); src.buffer = buffer; src.loop = true
    const g = this.ctx.createGain(); g.gain.value = level
    src.connect(g); g.connect(dryOnly ? this.dry : this.input)
    src.start(time)
    this.live.add(src)
  }

  /** Stops every voice at `time` (silence is already reached by then) and frees the graph. */
  end(time: number) {
    for (const source of this.live) { try { source.stop(time) } catch { /* not started or already stopped */ } }
    this.live.clear()
    const release = () => { for (const node of [...this.nodes, this.gain]) { try { node.disconnect() } catch { /* gone */ } } }
    const delay = Math.max(0, (time - this.ctx.currentTime) * 1000) + 60
    setTimeout(release, delay)
  }
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

type AudioContextCtor = new () => AudioContext

export class BgmPlayer {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private fade: GainNode | null = null
  private noise: AudioBuffer | null = null
  private crackle: AudioBuffer | null = null
  private impulse: AudioBuffer | null = null
  private session: BgmSession | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private suspendTimer: ReturnType<typeof setTimeout> | null = null
  private customBuffer: AudioBuffer | null = null
  private customBytes: ArrayBuffer | null = null
  private volume = 0.45
  private currentTrack: BgmTrackId | null = null
  private generation = 0
  private starting = false

  get playing(): boolean { return this.currentTrack !== null }
  get track(): BgmTrackId | null { return this.currentTrack }
  get hasCustom(): boolean { return this.customBuffer !== null || this.customBytes !== null }

  private ensure(): AudioContext | null {
    if (this.ctx && this.ctx.state !== 'closed') return this.ctx
    const Ctor = ((globalThis as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor }).AudioContext
      ?? (globalThis as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext)
    if (!Ctor) return null
    try {
      const ctx = new Ctor()
      const compressor = ctx.createDynamicsCompressor()
      compressor.threshold.value = -16; compressor.ratio.value = 4
      compressor.connect(ctx.destination)
      this.fade = ctx.createGain(); this.fade.gain.value = 0; this.fade.connect(compressor)
      this.master = ctx.createGain(); this.master.gain.value = bgmGain(this.volume); this.master.connect(this.fade)
      this.noise = this.makeNoise(ctx, 1, false)
      this.crackle = this.makeNoise(ctx, 4, true)
      this.impulse = this.makeImpulse(ctx)
      this.ctx = ctx
      return ctx
    } catch { return null }
  }

  private makeNoise(ctx: AudioContext, seconds: number, crackle: boolean): AudioBuffer {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let seed = crackle ? 7 : 3, brown = 0
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let i = 0; i < length; i++) {
      if (!crackle) { data[i] = rand() * 2 - 1; continue }
      brown = (brown + (rand() * 2 - 1) * 0.02) * 0.995
      data[i] = brown * 0.6 + (rand() < 0.0007 ? (rand() * 2 - 1) * 0.9 : 0)
    }
    return buffer
  }

  private makeImpulse(ctx: AudioContext): AudioBuffer | null {
    try {
      const length = Math.floor(ctx.sampleRate * 2.4)
      const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
      let seed = 17
      const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel)
        for (let i = 0; i < length; i++) data[i] = (rand() * 2 - 1) * Math.pow(1 - i / length, 3.2)
      }
      return buffer
    } catch { return null }
  }

  /** Stores the user's file; it is decoded lazily on first play. */
  setCustom(bytes: ArrayBuffer | null): void {
    this.customBytes = bytes
    this.customBuffer = null
    if (!bytes && this.currentTrack === 'custom') this.fadeOut()
  }

  private async decodeCustom(ctx: AudioContext): Promise<AudioBuffer | null> {
    if (this.customBuffer) return this.customBuffer
    if (!this.customBytes) return null
    try {
      // decodeAudioData detaches its input, so decode a copy and keep the original.
      this.customBuffer = await ctx.decodeAudioData(this.customBytes.slice(0))
      return this.customBuffer
    } catch { this.customBytes = null; return null }
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0))
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(bgmGain(this.volume), this.ctx.currentTime, 0.08)
  }

  /**
   * Starts (or switches to) a track with a fade. Must first be called from a
   * user gesture. Resolves false when audio is unavailable or the custom file
   * cannot be decoded.
   */
  async play(track: BgmTrackId, volume = this.volume): Promise<boolean> {
    const ctx = this.ensure()
    if (!ctx || !this.master || !this.fade || !this.noise) return false
    this.volume = Math.min(1, Math.max(0, volume))
    if (this.suspendTimer) { clearTimeout(this.suspendTimer); this.suspendTimer = null }
    const generation = ++this.generation
    if (ctx.state === 'suspended') {
      // Without a recent gesture the browser keeps this pending until unlock() resumes again.
      this.starting = true
      try { await ctx.resume() } catch { /* stays suspended */ } finally { this.starting = false }
    }
    if (generation !== this.generation) return false
    let custom: AudioBuffer | null = null
    if (track === 'custom') {
      custom = await this.decodeCustom(ctx)
      if (generation !== this.generation) return false
      if (!custom) return false
    }
    const now = ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setTargetAtTime(bgmGain(this.volume), now, 0.05)
    // Fade gain: from wherever it is now up to 1.
    this.fade.gain.cancelScheduledValues(now)
    this.fade.gain.setValueAtTime(Math.max(0.0001, this.fade.gain.value), now)
    this.fade.gain.linearRampToValueAtTime(1, now + (this.currentTrack ? 0.2 : BGM_TUNING.fadeIn))
    if (this.currentTrack === track && this.session) return true
    // Crossfade sessions so a track switch never cuts hard.
    const previous = this.session
    if (previous) {
      previous.gain.gain.cancelScheduledValues(now)
      previous.gain.gain.setValueAtTime(previous.gain.gain.value, now)
      previous.gain.gain.linearRampToValueAtTime(0, now + BGM_TUNING.crossfade)
      previous.end(now + BGM_TUNING.crossfade + 0.05)
    }
    const session = new BgmSession(ctx, this.master, this.noise, this.impulse, track === 'night' ? 2300 : 0)
    session.gain.gain.setValueAtTime(0, now)
    session.gain.gain.linearRampToValueAtTime(1, now + (previous ? BGM_TUNING.crossfade : 0.05))
    session.nextTime = now + 0.08
    this.session = session
    this.currentTrack = track
    if (custom) session.loop(custom, now + 0.05, 1)
    else {
      if (track === 'night' && this.crackle) session.loop(this.crackle, now + 0.05, 0.55)
      this.startScheduler()
    }
    if (track === 'custom') this.stopScheduler()
    return true
  }

  private startScheduler() {
    if (this.timer) return
    this.tick()
    this.timer = setInterval(() => this.tick(), BGM_TUNING.tickMs)
  }

  private stopScheduler() {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
  }

  /** Queues every 16th note that falls inside the look-ahead window. */
  tick(): void {
    const ctx = this.ctx, session = this.session, track = this.currentTrack
    if (!ctx || !session || !track || track === 'custom' || ctx.state !== 'running') return
    const score = BGM_SCORES[track]
    const sd = 60 / score.bpm / 4
    // After a stall (throttled timer), resume from now instead of bursting.
    if (session.nextTime < ctx.currentTime - 0.1) session.nextTime = ctx.currentTime + 0.05
    let guard = 0
    while (session.nextTime < ctx.currentTime + BGM_TUNING.lookAhead && guard++ < 64) {
      const step = session.stepIndex % 16
      const bar = Math.floor(session.stepIndex / 16) % (score.bars * score.melodyCycle)
      const swing = step % 4 === 2 ? score.swing * sd : 0
      score.play(session, bar, step, session.nextTime + swing, sd)
      session.stepIndex++
      session.nextTime += sd
    }
  }

  /** Fades to silence, stops every voice and suspends the audio device. */
  fadeOut(seconds = BGM_TUNING.fadeOut): void {
    const ctx = this.ctx
    this.generation++
    if (!ctx || !this.fade) { this.currentTrack = null; return }
    const now = ctx.currentTime
    this.fade.gain.cancelScheduledValues(now)
    this.fade.gain.setValueAtTime(Math.max(0.0001, this.fade.gain.value), now)
    this.fade.gain.linearRampToValueAtTime(0, now + seconds)
    const session = this.session
    this.session = null
    this.currentTrack = null
    this.stopScheduler()
    session?.end(now + seconds + 0.05)
    if (this.suspendTimer) clearTimeout(this.suspendTimer)
    this.suspendTimer = setTimeout(() => {
      this.suspendTimer = null
      if (!this.currentTrack && this.ctx && this.ctx.state === 'running') void this.ctx.suspend().catch(() => undefined)
    }, seconds * 1000 + 120)
  }

  /** Called on user gestures: lets a context the browser started suspended begin playing. */
  unlock(): void {
    if ((this.currentTrack || this.starting) && this.ctx && this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined)
  }

  /** Immediate stop for page hide / unload: closes the context. */
  stopNow(): void {
    this.generation++
    this.stopScheduler()
    if (this.suspendTimer) { clearTimeout(this.suspendTimer); this.suspendTimer = null }
    this.session = null
    this.currentTrack = null
    const ctx = this.ctx
    this.ctx = null; this.master = null; this.fade = null; this.noise = null; this.crackle = null; this.impulse = null
    this.customBuffer = null
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => undefined)
  }

  dispose(): void {
    this.stopNow()
    this.customBytes = null
  }
}

export const VOICE_TUNING = {
    /** Seconds between syllables. */
    step: 0.074,
    /** Extra pause after a comma-like mark / a sentence end / a newline. */
    commaRest: 0.13,
    stopRest: 0.3,
    lineRest: 0.2,
    /** Small breath after this many syllables in a row. */
    phrase: 6,
    breath: 0.09,
    /** Never schedule more than this far into the future. */
    maxAhead: 0.55,
    /** Base pitch (Hz) of the speaking voice. */
    basePitch: 294,
    /** A chunk longer than this is treated as bulk text. */
    bulkChars: 160,
};
const PENTATONIC = [0, 2, 4, 7, 9, 12];
/** Visible prose only: drop fenced code (including an unfinished fence) and inline code. */
export function speakableText(text) {
    return text
        .replace(/```[\s\S]*?(```|$)/g, ' ')
        .replace(/`[^`\n]*`/g, ' ')
        .replace(/https?:\/\/\S+/g, ' ');
}
/**
 * Appended prose between two snapshots of a streaming message.
 * Returns '' for a new or rewritten message, so switching conversations or
 * loading a finished answer never produces a burst of sound.
 */
export function appendedSpeech(previous, next) {
    if (!previous || !next.startsWith(previous) || next.length <= previous.length)
        return '';
    const fencesBefore = (previous.match(/```/g) || []).length;
    const delta = next.slice(previous.length);
    // Inside an open code fence: only speak what follows its closing fence.
    const prose = fencesBefore % 2 === 1 ? (delta.includes('```') ? delta.slice(delta.indexOf('```') + 3) : '') : delta;
    return speakableText(prose);
}
export function tokenize(text) {
    const tokens = [];
    let run = 0;
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        if (/[。！？.!?…]/.test(c)) {
            markLast(tokens);
            tokens.push({ kind: 'rest', seconds: VOICE_TUNING.stopRest });
            run = 0;
            continue;
        }
        if (/[，、,;；:：]/.test(c)) {
            tokens.push({ kind: 'rest', seconds: VOICE_TUNING.commaRest });
            run = 0;
            continue;
        }
        if (c === '\n') {
            tokens.push({ kind: 'rest', seconds: VOICE_TUNING.lineRest });
            run = 0;
            continue;
        }
        if (/\s/.test(c))
            continue;
        if (/[぀-ヿ㐀-鿿가-힯]/.test(c)) {
            tokens.push({ kind: 'syllable', code: c.codePointAt(0) || 0, last: false });
        }
        else if (/[A-Za-z0-9]/.test(c)) {
            // Latin words and numbers: roughly one blip per three letters, at least one per word.
            let word = c;
            while (i + 1 < chars.length && /[A-Za-z0-9'’-]/.test(chars[i + 1]))
                word += chars[++i];
            const count = Math.max(1, Math.min(3, Math.round(word.length / 3)));
            for (let k = 0; k < count; k++)
                tokens.push({ kind: 'syllable', code: word.charCodeAt(Math.min(word.length - 1, k * 3)), last: false });
        }
        else
            continue;
        if (++run % VOICE_TUNING.phrase === 0)
            tokens.push({ kind: 'rest', seconds: VOICE_TUNING.breath });
    }
    return tokens;
}
function markLast(tokens) {
    for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i];
        if (token.kind === 'syllable') {
            token.last = true;
            return;
        }
        if (token.seconds >= VOICE_TUNING.commaRest)
            return;
    }
}
export class PetVoice {
    context = null;
    bus = null;
    output = null;
    cursor = 0;
    volume = 0.2;
    /** Create or resume the context. Call from a user gesture only. */
    unlock() {
        try {
            if (!this.context || this.context.state === 'closed') {
                this.context = new AudioContext();
                const compressor = this.context.createDynamicsCompressor?.();
                if (compressor) {
                    compressor.threshold.setValueAtTime(-26, 0);
                    compressor.ratio.setValueAtTime(5, 0);
                    compressor.connect(this.context.destination);
                    this.output = compressor;
                }
                else
                    this.output = this.context.destination;
                this.bus = null;
            }
            if (this.context.state === 'suspended')
                void this.context.resume().catch(() => { });
        }
        catch { /* Audio may be unavailable in the host. */ }
    }
    setVolume(volume) { this.volume = Math.max(0, Math.min(1, volume)); }
    ready() {
        const ctx = this.context;
        if (!ctx || ctx.state !== 'running' || this.volume <= 0 || !this.output)
            return null;
        if (!this.bus) {
            this.bus = ctx.createGain();
            this.bus.gain.setValueAtTime(1, ctx.currentTime);
            this.bus.connect(this.output);
        }
        return ctx;
    }
    /** Speak newly visible prose. Returns how many syllables were scheduled. */
    speak(text) {
        const ctx = this.ready();
        if (!ctx || !text)
            return 0;
        let source = text;
        if (Array.from(source).length > VOICE_TUNING.bulkChars)
            source = Array.from(source).slice(-12).join('');
        const now = ctx.currentTime;
        if (this.cursor < now + 0.01)
            this.cursor = now + 0.01;
        let scheduled = 0;
        for (const token of tokenize(source)) {
            if (this.cursor - now > VOICE_TUNING.maxAhead)
                break;
            if (token.kind === 'rest') {
                if (scheduled)
                    this.cursor += token.seconds;
                continue;
            }
            this.blip(ctx, this.cursor, token.code, token.last);
            this.cursor += VOICE_TUNING.step * (0.92 + ((token.code * 7) % 17) / 100);
            scheduled++;
        }
        return scheduled;
    }
    blip(ctx, at, code, last) {
        const degree = PENTATONIC[code % PENTATONIC.length];
        const pitch = VOICE_TUNING.basePitch * Math.pow(2, (degree - (last ? 5 : 0)) / 12);
        const duration = last ? 0.11 : 0.058;
        const peak = this.volume * 0.16;
        this.tone(ctx, at, [
            { type: 'triangle', from: pitch, to: pitch * (last ? 0.84 : 0.95), gain: peak },
            { type: 'sine', from: pitch * 2, to: pitch * 1.9, gain: peak * 0.28 },
        ], duration, 1650);
    }
    tone(ctx, at, partials, duration, cutoff) {
        const bus = this.bus;
        if (!bus)
            return;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff, at);
        filter.Q.setValueAtTime(0.7, at);
        filter.connect(bus);
        let pending = partials.length;
        for (const partial of partials) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = partial.type;
            osc.frequency.setValueAtTime(partial.from, at);
            osc.frequency.exponentialRampToValueAtTime(Math.max(40, partial.to), at + duration);
            gain.gain.setValueAtTime(0.0001, at);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, partial.gain), at + 0.006);
            gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
            osc.connect(gain);
            gain.connect(filter);
            osc.onended = () => { osc.disconnect(); gain.disconnect(); if (--pending === 0)
                filter.disconnect(); };
            osc.start(at);
            osc.stop(at + duration + 0.02);
        }
    }
    /** Short expressive sounds. Lighter than speech for think/tap, brighter for eureka. */
    cue(kind) {
        const ctx = this.ready();
        if (!ctx)
            return;
        const at = Math.max(ctx.currentTime + 0.01, kind === 'tap' ? 0 : this.cursor);
        const v = this.volume;
        if (kind === 'think')
            this.tone(ctx, at, [{ type: 'sine', from: 247, to: 220, gain: v * 0.07 }], 0.22, 900);
        if (kind === 'tap')
            this.tone(ctx, at, [{ type: 'sine', from: 660, to: 520, gain: v * 0.09 }], 0.06, 2400);
        if (kind === 'jelly')
            this.tone(ctx, at, [{ type: 'sine', from: 520, to: 300, gain: v * 0.14 }, { type: 'triangle', from: 780, to: 450, gain: v * 0.04 }], 0.22, 2000);
        if (kind === 'eureka')
            [784, 1175].forEach((f, i) => this.tone(ctx, at + i * 0.08, [{ type: 'sine', from: f, to: f, gain: v * 0.12 }, { type: 'sine', from: f * 2, to: f * 2, gain: v * 0.02 }], 0.32, 4200));
        if (kind === 'rice')
            [523, 659, 784].forEach((f, i) => this.tone(ctx, at + i * 0.07, [{ type: 'triangle', from: f, to: f * 0.99, gain: v * 0.1 }], 0.24, 2600));
    }
    /** Silence everything scheduled so far without closing the context. */
    cut() {
        const ctx = this.context;
        const bus = this.bus;
        this.bus = null;
        if (ctx)
            this.cursor = ctx.currentTime;
        if (!ctx || !bus)
            return;
        try {
            bus.gain.cancelScheduledValues(ctx.currentTime);
            bus.gain.setValueAtTime(bus.gain.value || 1, ctx.currentTime);
            bus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.03);
            setTimeout(() => { try {
                bus.disconnect();
            }
            catch { /* already gone */ } }, 80);
        }
        catch {
            try {
                bus.disconnect();
            }
            catch { /* already gone */ }
        }
    }
    /** Mute, background or blur: stop now and do not replay a backlog later. */
    silence() {
        this.cut();
        if (this.context?.state === 'running')
            void this.context.suspend().catch(() => { });
    }
    dispose() {
        this.cut();
        if (this.context && this.context.state !== 'closed')
            void this.context.close().catch(() => { });
        this.context = null;
        this.output = null;
    }
}
//# sourceMappingURL=voice.js.map
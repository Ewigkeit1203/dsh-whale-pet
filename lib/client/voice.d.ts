/**
 * Character voice (frontend F07). Native Web Audio only, no samples.
 *
 * Retro-RPG style "speech blips", written from scratch: each syllable of
 * text that actually appears on screen produces one short, soft mid-range
 * blip whose pitch follows the character (so the same words sound the same),
 * with short breaths between phrases and a falling note at sentence ends.
 *
 * Scheduling rules
 *  - Syllables are scheduled on the AudioContext clock, never by setInterval.
 *  - The look-ahead is capped (MAX_AHEAD_S). Text that arrives faster than the
 *    voice can speak is dropped, so the voice stops shortly after text stops
 *    (network stall, stop generation) and never "catches up" afterwards.
 *  - Code blocks are never voiced; bulk text (a skip, a pasted log) only
 *    produces a short tail.
 *  - cut() silences everything already scheduled within ~30ms.
 */
export type VoiceCue = 'think' | 'tap' | 'eureka' | 'jelly' | 'rice';
export declare const VOICE_TUNING: {
    /** Seconds between syllables. */
    step: number;
    /** Extra pause after a comma-like mark / a sentence end / a newline. */
    commaRest: number;
    stopRest: number;
    lineRest: number;
    /** Small breath after this many syllables in a row. */
    phrase: number;
    breath: number;
    /** Never schedule more than this far into the future. */
    maxAhead: number;
    /** Base pitch (Hz) of the speaking voice. */
    basePitch: number;
    /** A chunk longer than this is treated as bulk text. */
    bulkChars: number;
};
type Token = {
    kind: 'syllable';
    code: number;
    last: boolean;
} | {
    kind: 'rest';
    seconds: number;
};
/** Visible prose only: drop fenced code (including an unfinished fence) and inline code. */
export declare function speakableText(text: string): string;
/**
 * Appended prose between two snapshots of a streaming message.
 * Returns '' for a new or rewritten message, so switching conversations or
 * loading a finished answer never produces a burst of sound.
 */
export declare function appendedSpeech(previous: string, next: string): string;
export declare function tokenize(text: string): Token[];
export declare class PetVoice {
    private context;
    private bus;
    private output;
    private cursor;
    private volume;
    /** Create or resume the context. Call from a user gesture only. */
    unlock(): void;
    setVolume(volume: number): void;
    private ready;
    /** Speak newly visible prose. Returns how many syllables were scheduled. */
    speak(text: string): number;
    private blip;
    private tone;
    /** Short expressive sounds. Lighter than speech for think/tap, brighter for eureka. */
    cue(kind: VoiceCue): void;
    /** Silence everything scheduled so far without closing the context. */
    cut(): void;
    /** Mute, background or blur: stop now and do not replay a backlog later. */
    silence(): void;
    dispose(): void;
}
export {};
//# sourceMappingURL=voice.d.ts.map
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
export type BgmTrackId = 'daily' | 'calm' | 'night' | 'custom';
export interface BgmTrackMeta {
    id: BgmTrackId;
    zh: string;
    en: string;
    moodZh: string;
    moodEn: string;
}
export declare const BGM_TRACKS: readonly BgmTrackMeta[];
export declare const BGM_TUNING: {
    /** Scheduler wake-up interval (ms) and how far ahead notes are queued (s). */
    tickMs: number;
    lookAhead: number;
    fadeIn: number;
    fadeOut: number;
    crossfade: number;
};
export declare function isBgmTrack(value: unknown): value is BgmTrackId;
/** Perceptual volume curve: the slider feels even, low values stay usable. */
export declare function bgmGain(volume: number): number;
/** Next or previous track, skipping "custom" when no file is stored. */
export declare function cycleBgmTrack(current: BgmTrackId, direction: 1 | -1, hasCustom: boolean): BgmTrackId;
export declare class BgmPlayer {
    private ctx;
    private master;
    private fade;
    private noise;
    private crackle;
    private impulse;
    private session;
    private timer;
    private suspendTimer;
    private customBuffer;
    private customBytes;
    private volume;
    private currentTrack;
    private generation;
    private starting;
    get playing(): boolean;
    get track(): BgmTrackId | null;
    get hasCustom(): boolean;
    private ensure;
    private makeNoise;
    private makeImpulse;
    /** Stores the user's file; it is decoded lazily on first play. */
    setCustom(bytes: ArrayBuffer | null): void;
    private decodeCustom;
    setVolume(volume: number): void;
    /**
     * Starts (or switches to) a track with a fade. Must first be called from a
     * user gesture. Resolves false when audio is unavailable or the custom file
     * cannot be decoded.
     */
    play(track: BgmTrackId, volume?: number): Promise<boolean>;
    private startScheduler;
    private stopScheduler;
    /** Queues every 16th note that falls inside the look-ahead window. */
    tick(): void;
    /** Fades to silence, stops every voice and suspends the audio device. */
    fadeOut(seconds?: number): void;
    /** Called on user gestures: lets a context the browser started suspended begin playing. */
    unlock(): void;
    /** Immediate stop for page hide / unload: closes the context. */
    stopNow(): void;
    dispose(): void;
}
//# sourceMappingURL=bgm.d.ts.map
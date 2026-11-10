import { type SceneId } from './scenes.js';
import { type BgmTrackId } from './bgm.js';
export interface Preferences {
    userName: string;
    petName: string;
    fontSize: number;
    speed: 'slow' | 'medium' | 'fast' | 'instant';
    docked: boolean;
    onboardingDone: boolean;
    notifications: boolean;
    ricePrice: number;
    quietBackup?: {
        wandering: boolean;
        muted: boolean;
    };
    language: 'zh' | 'en';
    theme: 'light' | 'dark';
    wandering: boolean;
    quiet: boolean;
    muted: boolean;
    volume: number;
    typewriter: boolean;
    reminders: boolean;
    /** Announce DeepSeek API peak / off-peak switches (梁文峰 / 梁文谷时间). */
    peakNotice: boolean;
    scale: number;
    opacity: number;
    reading: 'pages' | 'scroll';
    autoAdvance: boolean;
    form: 'maiden' | 'chibi';
    autoGalGame: boolean;
    /** Theatre background (see scenes.ts); 'none' shows DSH through a soft blur. */
    scene: SceneId;
    /** Pick a different background each time the theatre opens. */
    sceneShuffle: boolean;
    /** Background music plays while the theatre is open (bgm.ts). */
    bgmOn: boolean;
    bgmTrack: BgmTrackId;
    bgmVolume: number;
    /** Swaying skirt, hair ends and tail (WebGL); the face is never deformed. */
    liveMotion: boolean;
    /** Use the imported Live2D model instead of the illustrations (no effect until one is imported). */
    live2d: boolean;
    live2dWidgetScale: number;
    live2dTheatreScale: number;
    x?: number;
    y?: number;
}
export declare const PREFERENCES_KEY = "dsh-whale-pet.preferences.v1";
export declare function defaultPreferences(): Preferences;
export declare function readPreferences(): Preferences;
export declare function savePreferences(preferences: Preferences): void;
export declare function quietPreset(p: Preferences): Preferences;
//# sourceMappingURL=preferences.d.ts.map
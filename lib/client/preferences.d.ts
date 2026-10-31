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
    x?: number;
    y?: number;
}
export declare const PREFERENCES_KEY = "dsh-whale-pet.preferences.v1";
export declare function defaultPreferences(): Preferences;
export declare function readPreferences(): Preferences;
export declare function savePreferences(preferences: Preferences): void;
export declare function quietPreset(p: Preferences): Preferences;
//# sourceMappingURL=preferences.d.ts.map
export interface Preferences {
    language: 'zh' | 'en';
    theme: 'light' | 'dark';
    wandering: boolean;
    quiet: boolean;
    muted: boolean;
    volume: number;
    typewriter: boolean;
    reminders: boolean;
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
export declare function readPreferences(): Preferences;
export declare function savePreferences(preferences: Preferences): void;
//# sourceMappingURL=preferences.d.ts.map
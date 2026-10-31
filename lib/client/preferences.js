export const PREFERENCES_KEY = 'dsh-whale-pet.preferences.v1';
export function defaultPreferences() {
    const defaults = { userName: '你', petName: '大肥鱼', fontSize: 17, speed: 'medium', docked: false, onboardingDone: false, notifications: false, ricePrice: 1, language: 'zh', theme: 'light', wandering: true, quiet: false, muted: true, volume: 0.2, typewriter: true, reminders: true, scale: 1, opacity: 1, reading: 'pages', autoAdvance: false, form: 'maiden', autoGalGame: true };
    return defaults;
}
export function readPreferences() {
    const defaults = defaultPreferences();
    try {
        const p = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}');
        if (!p || typeof p !== 'object')
            return defaults;
        for (const key of ['wandering', 'quiet', 'autoAdvance', 'autoGalGame', 'muted', 'typewriter', 'reminders', 'docked', 'onboardingDone', 'notifications'])
            if (typeof p[key] === 'boolean')
                defaults[key] = p[key];
        for (const key of ['userName', 'petName'])
            if (typeof p[key] === 'string' && p[key].trim())
                defaults[key] = p[key].trim().slice(0, 24);
        if (['slow', 'medium', 'fast', 'instant'].includes(p.speed))
            defaults.speed = p.speed;
        if (Number.isFinite(p.fontSize))
            defaults.fontSize = Math.min(24, Math.max(14, p.fontSize));
        if (Number.isFinite(p.ricePrice))
            defaults.ricePrice = Math.min(100, Math.max(0.01, p.ricePrice));
        if (p.quietBackup && typeof p.quietBackup.wandering === 'boolean' && typeof p.quietBackup.muted === 'boolean')
            defaults.quietBackup = p.quietBackup;
        if (p.language === 'en')
            defaults.language = 'en';
        if (p.theme === 'dark')
            defaults.theme = 'dark';
        if (p.reading === 'scroll')
            defaults.reading = 'scroll';
        if (p.form === 'chibi')
            defaults.form = 'chibi';
        if (typeof p.scale === 'number' && Number.isFinite(p.scale))
            defaults.scale = Math.min(1.3, Math.max(0.5, p.scale));
        if (typeof p.opacity === 'number' && Number.isFinite(p.opacity))
            defaults.opacity = Math.min(1, Math.max(0.35, p.opacity));
        if (typeof p.volume === 'number' && Number.isFinite(p.volume))
            defaults.volume = Math.min(1, Math.max(0, p.volume));
        if (Number.isFinite(p.x))
            defaults.x = p.x;
        if (Number.isFinite(p.y))
            defaults.y = p.y;
    }
    catch { /* Storage may be disabled by the host. */ }
    return defaults;
}
export function savePreferences(preferences) {
    try {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    }
    catch { /* Keep working in memory. */ }
}
export function quietPreset(p) {
    return p.quiet ? { ...p, quiet: false, wandering: p.quietBackup?.wandering ?? true, muted: p.quietBackup?.muted ?? true, quietBackup: undefined } : { ...p, quiet: true, wandering: false, muted: true, quietBackup: { wandering: p.wandering, muted: p.muted } };
}
//# sourceMappingURL=preferences.js.map
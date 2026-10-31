import React from 'react';
import type { Preferences } from './preferences.js';
export declare function SettingsPanel({ p, update, toggleMute, quiet, reset, doctor, notify }: {
    p: Preferences;
    update: (p: Partial<Preferences>) => void;
    toggleMute: () => void;
    quiet: () => void;
    reset: () => void;
    doctor: () => void;
    notify: () => void;
}): React.JSX.Element;
//# sourceMappingURL=SettingsPanel.d.ts.map
import React from 'react';
import type { Preferences } from './preferences.js';
import type { WalletView } from './wallet.js';
export interface SettingsPanelProps {
    p: Preferences;
    wallet: WalletView;
    detached: boolean;
    update: (p: Partial<Preferences>) => void;
    toggleMute: () => void;
    quiet: () => void;
    reset: () => void;
    doctor: () => void;
    notify: () => void;
    close: () => void;
    openTheatre: () => void;
}
/** Plain render function (no hooks): header, scrollable body, fixed footer. */
export declare function SettingsPanel({ p, wallet, detached, update, toggleMute, quiet, reset, doctor, notify, close, openTheatre }: SettingsPanelProps): React.JSX.Element;
//# sourceMappingURL=SettingsPanel.d.ts.map
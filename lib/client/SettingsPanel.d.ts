import type { Preferences } from './preferences.js';
import type { WalletView } from './wallet.js';
import { type Discoveries } from './discovery.js';
/** What Settings shows about the imported Live2D model. */
export interface Live2DSettings {
    /** This build carries Cubism Core and the runtime. */
    bundled: boolean;
    state: 'checking' | 'none' | 'importing' | 'ready' | 'failed';
    name?: string;
    bytes?: number;
    progress?: [number, number];
    /** Why the last import or load failed (already phrased for the user). */
    message?: string;
    /** The model is what she is drawn with right now. */
    active: boolean;
    needsReimport?: boolean;
}
export interface SettingsPanelProps {
    p: Preferences;
    wallet: WalletView;
    tier: {
        tier: 'peak' | 'valley';
        name: string;
        until: string;
        rule: string;
        holidayDataMissing: boolean;
    };
    detached: boolean;
    update: (p: Partial<Preferences>) => void;
    toggleMute: () => void;
    quiet: () => void;
    reset: () => void;
    doctor: () => void;
    notify: () => void;
    close: () => void;
    openTheatre: () => void;
    live2d: Live2DSettings;
    importLive2D: (files: File[]) => void;
    /** Interactions found so far (id → first time), and a way to see the first-run guide again. */
    discoveries: Discoveries;
    replayGuide: () => void;
    removeLive2D: () => void;
    onSizeStart?: () => void;
}
/** Plain render function (no hooks): header, scrollable body, fixed footer. */
export declare function SettingsPanel({ p, wallet, tier, detached, update, toggleMute, quiet, reset, doctor, notify, close, openTheatre, live2d, importLive2D, removeLive2D, onSizeStart, discoveries, replayGuide }: SettingsPanelProps): import("react").JSX.Element;
//# sourceMappingURL=SettingsPanel.d.ts.map
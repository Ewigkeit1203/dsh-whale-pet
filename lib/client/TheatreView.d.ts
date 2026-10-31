import React from 'react';
import type { Preferences } from './preferences.js';
import type { PetStatusInfo } from './types.js';
import type { HistoryEntry } from './experience.js';
export interface TheatreViewProps {
    t: (zh: string, en: string) => string;
    p: Preferences;
    status: PetStatusInfo;
    lang: string;
    petName: string;
    puppet: {
        imgSrc: string;
        poseName: string;
        poseScale: number;
        isMaiden: boolean;
    };
    phase: string | null;
    tier: {
        tier: 'peak' | 'valley';
        label: string;
        until: string;
    } | null;
    uiHidden: boolean;
    expanded: boolean;
    logOpen: boolean;
    history: HistoryEntry[];
    showThoughts: boolean;
    visibleText: string;
    isRevealing: boolean;
    pageIndex: number;
    pageCount: number;
    inputValue: string;
    toast: string;
    textRef: React.RefObject<HTMLDivElement | null>;
    thoughtRef: React.RefObject<HTMLDivElement | null>;
    on: {
        exit: () => void;
        backdrop: () => void;
        unlock: () => void;
        hideUi: (hidden: boolean) => void;
        toggleExpanded: () => void;
        openLog: () => void;
        closeLog: () => void;
        toggleAuto: () => void;
        toggleMute: () => void;
        toggleReading: () => void;
        toggleTheme: () => void;
        toggleLanguage: () => void;
        hideThoughts: () => void;
        thoughtScroll: (node: HTMLDivElement) => void;
        textScroll: (node: HTMLDivElement) => void;
        advance: () => void;
        previous: () => void;
        wheel: (event: React.WheelEvent) => void;
        skipReveal: () => void;
        input: (value: string) => void;
        send: () => void;
        copy: (text: string) => void;
    };
}
/** Visual-novel theatre: stage, thought bubble, dialogue box, log. Plain render function. */
export declare function TheatreView(v: TheatreViewProps): React.JSX.Element;
//# sourceMappingURL=TheatreView.d.ts.map
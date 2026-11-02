import React from 'react';
import type { Preferences } from './preferences.js';
import type { PetStatusInfo } from './types.js';
import type { HistoryEntry } from './experience.js';
export type TheatrePanel = 'scene' | 'music' | 'settings' | null;
/** Two stacked background layers; the inactive one receives the next picture, then they swap (crossfade). */
export interface SceneLayers {
    a: string;
    b: string;
    front: 'a' | 'b';
}
export interface TheatreSceneCard {
    id: string;
    label: string;
    thumb: string;
    active: boolean;
    kind: 'painted' | 'none' | 'custom';
}
export interface TheatreTrack {
    id: string;
    label: string;
    mood: string;
}
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
    scene: {
        id: string;
        label: string;
        base: string;
        glow: string;
        ambient: string;
        immersive: boolean;
        layers: SceneLayers;
    };
    sceneCards: TheatreSceneCard[];
    customSceneName: string | null;
    panel: TheatrePanel;
    skipping: boolean;
    bgm: {
        on: boolean;
        playing: boolean;
        track: string;
        volume: number;
        customName: string | null;
        tracks: TheatreTrack[];
    };
    on: {
        exit: () => void;
        backdrop: () => void;
        dismiss: () => void;
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
        toggleSkip: () => void;
        input: (value: string) => void;
        send: () => void;
        copy: (text: string) => void;
        panel: (panel: TheatrePanel) => void;
        pickScene: (id: string) => void;
        shuffleScene: () => void;
        toggleShuffle: () => void;
        uploadScene: (file: File) => void;
        removeScene: () => void;
        bgmToggle: () => void;
        bgmPick: (id: string) => void;
        bgmStep: (direction: 1 | -1) => void;
        bgmVolume: (volume: number) => void;
        uploadBgm: (file: File) => void;
        removeBgm: () => void;
        setSpeed: (speed: Preferences['speed']) => void;
        setFontSize: (size: number) => void;
        toggleTypewriter: () => void;
    };
}
/** Visual-novel theatre: scene, stage, thought bubble, dialogue box, HUD and log. Plain render function. */
export declare function TheatreView(v: TheatreViewProps): React.JSX.Element;
//# sourceMappingURL=TheatreView.d.ts.map
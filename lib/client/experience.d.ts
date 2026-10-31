/** Native synthesis only. No context or sound is created until a user gesture. */
export declare class PetAudio {
    private context;
    private lastBlip;
    private active;
    unlock(): void;
    play(kind: 'blip' | 'ding' | 'jelly' | 'rice', volume?: number): void;
    silence(): void;
    dispose(): void;
}
export interface DialogueBlock {
    kind: 'text' | 'code';
    text: string;
    language?: string;
}
export declare function dialogueBlocks(text: string): DialogueBlock[];
export interface HistoryEntry {
    role: 'user' | 'assistant';
    text: string;
}
export declare function readConversationLog(): HistoryEntry[];
export declare function parseBalance(value: string): number | null;
/** Preserve code and block boundaries while excluding reasoning and controls. */
export declare function messageText(container: Element): string;
//# sourceMappingURL=experience.d.ts.map
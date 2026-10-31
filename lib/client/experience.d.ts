/** Text helpers shared by the views. Audio lives in voice.ts. */
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
import { type HistoryEntry } from './experience.js';
/** A bounded, on-demand view of messages already loaded in the active DSH conversation. */
export declare const CONVERSATION_LOG_LIMITS: {
    readonly entries: 40;
    readonly entryText: 4000;
    readonly totalText: 24000;
    readonly source: 128;
    readonly session: 512;
};
export interface ConversationContext {
    source: string;
    session: string | null;
}
export interface ConversationLog {
    context: ConversationContext;
    status: 'ready' | 'unavailable';
    entries: HistoryEntry[];
    truncated: boolean;
}
export declare function readConversationContext(value: unknown): ConversationContext | null;
/** Return a fresh data-only object; oversized, malformed and contradictory results are rejected whole. */
export declare function readConversationLogSnapshot(value: unknown): ConversationLog | null;
export declare function boundConversationLog(context: ConversationContext, sourceEntries: readonly HistoryEntry[]): ConversationLog;
export declare function createConversationSource(): string;
export declare function currentConversationContext(source: string, root?: ParentNode): ConversationContext;
/** Called only for a history request, never while serializing a streaming update or a heartbeat. */
export declare function loadedConversationLog(source: string, root?: ParentNode): ConversationLog;
//# sourceMappingURL=conversation-log.d.ts.map
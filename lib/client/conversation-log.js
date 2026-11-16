import { readConversationLog } from './experience.js';
/** A bounded, on-demand view of messages already loaded in the active DSH conversation. */
export const CONVERSATION_LOG_LIMITS = { entries: 40, entryText: 4000, totalText: 24000, source: 128, session: 512 };
export function readConversationContext(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const c = value;
    if (typeof c.source !== 'string' || !c.source || c.source.length > CONVERSATION_LOG_LIMITS.source)
        return null;
    if (c.session !== null && (typeof c.session !== 'string' || !c.session || c.session.length > CONVERSATION_LOG_LIMITS.session))
        return null;
    return { source: c.source, session: c.session };
}
/** Return a fresh data-only object; oversized, malformed and contradictory results are rejected whole. */
export function readConversationLogSnapshot(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const log = value, context = readConversationContext(log.context);
    if (!context || (log.status !== 'ready' && log.status !== 'unavailable') || typeof log.truncated !== 'boolean')
        return null;
    if (!Array.isArray(log.entries) || log.entries.length > CONVERSATION_LOG_LIMITS.entries)
        return null;
    if (log.status === 'ready' && context.session === null)
        return null;
    if (log.status === 'unavailable' && (log.entries.length || log.truncated))
        return null;
    let total = 0;
    const entries = [];
    for (const raw of log.entries) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
            return null;
        if ((raw.role !== 'user' && raw.role !== 'assistant') || typeof raw.text !== 'string' || !raw.text.trim() || raw.text.length > CONVERSATION_LOG_LIMITS.entryText)
            return null;
        total += raw.text.length;
        if (total > CONVERSATION_LOG_LIMITS.totalText)
            return null;
        entries.push({ role: raw.role, text: raw.text });
    }
    return { context, status: log.status, entries, truncated: log.truncated };
}
/** Do not leave half an emoji at a truncation boundary. */
function logTextPrefix(text, size) {
    const part = text.slice(0, size);
    return /[\uD800-\uDBFF]$/.test(part) ? part.slice(0, -1) : part;
}
export function boundConversationLog(context, sourceEntries) {
    if (context.session === null)
        return { context, status: 'unavailable', entries: [], truncated: false };
    const entries = [];
    let budget = CONVERSATION_LOG_LIMITS.totalText;
    let truncated = sourceEntries.length > CONVERSATION_LOG_LIMITS.entries;
    for (let i = sourceEntries.length - 1; i >= 0; i--) {
        if (entries.length === CONVERSATION_LOG_LIMITS.entries || budget === 0) {
            truncated = true;
            break;
        }
        const entry = sourceEntries[i];
        const text = logTextPrefix(entry.text, Math.min(budget, CONVERSATION_LOG_LIMITS.entryText));
        if (text.length < entry.text.length)
            truncated = true;
        if (text.trim()) {
            entries.push({ role: entry.role, text });
            budget -= text.length;
        }
    }
    entries.reverse();
    return { context, status: 'ready', entries, truncated };
}
export function createConversationSource() {
    return typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
export function currentConversationContext(source, root = document) {
    const session = root.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? null;
    return { source, session: session && session.length <= CONVERSATION_LOG_LIMITS.session ? session : null };
}
/** Called only for a history request, never while serializing a streaming update or a heartbeat. */
export function loadedConversationLog(source, root = document) {
    const context = currentConversationContext(source, root);
    const marker = root.querySelector('[data-conversation-session]');
    if (!context.session || !marker)
        return { context, status: 'unavailable', entries: [], truncated: false };
    // Some DSH layouts put the identity on a header beside the messages. Use the nearest shared
    // ancestor with messages, but never combine different conversation markers or leave the supplied root.
    let container = marker;
    const messageSelector = '[data-chat-flow-kind="user-prompt"], [data-chat-flow-kind="assistant-step"]';
    while (container && !container.querySelectorAll(messageSelector).length) {
        if (container === root) {
            container = null;
            break;
        }
        container = container.parentElement;
    }
    if (!container)
        return { context, status: 'ready', entries: [], truncated: false };
    const markers = [container, ...Array.from(container.querySelectorAll('[data-conversation-session]'))];
    if (markers.some(node => {
        const session = node.getAttribute('data-conversation-session');
        return session !== null && session !== context.session;
    }))
        return { context, status: 'unavailable', entries: [], truncated: false };
    // One extra entry/character makes truncation observable while bounding the expensive DOM clones.
    const entries = readConversationLog(container, CONVERSATION_LOG_LIMITS.entries + 1, CONVERSATION_LOG_LIMITS.entryText + 1);
    return boundConversationLog(context, entries);
}
//# sourceMappingURL=conversation-log.js.map
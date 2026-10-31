export function viewportPanel(viewportWidth, viewportHeight, x, y, composerTop) {
    const bottom = Math.max(120, Math.min(viewportHeight - 16, composerTop === undefined ? viewportHeight - 16 : composerTop - 16));
    const height = Math.max(96, Math.min(560, bottom - 16));
    return { x: Math.max(16, Math.min(viewportWidth - 356, x > viewportWidth / 2 ? x - 356 : x + 170)), y: Math.max(16, Math.min(y, bottom - height)), height };
}
export function pageCapacity(width, height, fontSize) {
    return Math.max(24, Math.floor(Math.min(width, fontSize * 40) / fontSize) * Math.max(1, Math.floor(height / (fontSize * 1.75))) - 14);
}
export function revealDelay(character, speed) {
    if (speed === 'instant')
        return 0;
    const base = speed === 'slow' ? 70 : speed === 'fast' ? 22 : 42;
    return /[。！？.!?]/.test(character) ? base * 7 : /[，,；;：:]/.test(character) ? base * 3 : /[…]/.test(character) ? base * 10 : base;
}
export function diagnosticReport() {
    const selectors = { messages: '[data-chat-flow-kind]', generation: '[data-chat-running]', composer: '[data-composer-input], [data-composer-card], [data-composer-seat]', balances: '[class*="balanceCard"] [class*="amount"]' };
    return JSON.stringify({ plugin: 'dsh-whale-pet', checked: new Date().toISOString(), checks: Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, { selector, matches: document.querySelectorAll(selector).length }])), note: 'Counts only. No message text, URL, account ID or credentials. Generation and balance may be absent while idle or closed.' }, null, 2);
}
/** Wrap by measured line width rather than total characters, preserving all prose. */
export function paginateText(text, width, height, font, measure) {
    const maxLines = Math.max(1, Math.floor(Math.max(28, height - 12) / (font * 1.75)));
    const limit = Math.max(font * 4, width);
    const size = measure ?? ((s) => Array.from(s).reduce((n, c) => n + (/[\u0000-\u00ff]/.test(c) ? .58 : 1) * font, 0));
    const pages = [];
    let page = '', line = '', lines = 1;
    for (const character of Array.from(text.replace(/\n{3,}/g, '\n\n'))) {
        const wraps = character === '\n' || (line.length > 0 && size(line + character) > limit);
        if (wraps) {
            if (lines >= maxLines) {
                if (page.trim())
                    pages.push(page.trim());
                page = '';
                lines = 1;
            }
            else
                lines++;
            line = '';
        }
        page += character;
        if (character !== '\n')
            line += character;
    }
    if (page.trim())
        pages.push(page.trim());
    return pages.length ? pages : ['……'];
}
//# sourceMappingURL=usability.js.map
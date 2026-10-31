export function dialogueBlocks(text) {
    const blocks = [];
    const pattern = /```([^\n`]*)\n([\s\S]*?)(?:```|$)/g;
    let offset = 0;
    for (const match of text.matchAll(pattern)) {
        if (match.index > offset)
            blocks.push({ kind: 'text', text: text.slice(offset, match.index) });
        blocks.push({ kind: 'code', language: match[1].trim(), text: match[2].replace(/\n$/, '') });
        offset = match.index + match[0].length;
    }
    if (offset < text.length)
        blocks.push({ kind: 'text', text: text.slice(offset) });
    return blocks;
}
export function readConversationLog() {
    const nodes = Array.from(document.querySelectorAll('[data-chat-flow-kind="user-prompt"], [data-chat-flow-kind="assistant-step"]'));
    return nodes.filter(node => !nodes.some(other => other !== node && other.contains(node))).slice(-80).map(node => {
        return { role: node.getAttribute('data-chat-flow-kind') === 'user-prompt' ? 'user' : 'assistant', text: messageText(node).slice(0, 20000) };
    }).filter(entry => entry.text);
}
export function parseBalance(value) {
    const match = value.replace(/,/g, '').match(/(?:¥|￥)?\s*(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : null;
}
/** Preserve code and block boundaries while excluding reasoning and controls. */
export function messageText(container) {
    const clone = container.cloneNode(true);
    clone.querySelectorAll('[data-variant="think"], [data-turn-process-inline], details.think, [class*="reasoning"], [class*="thought"], .summary, [class*="thinkBody"], button, [data-whale-pet]').forEach(el => el.remove());
    clone.querySelectorAll('strong, b').forEach(node => { if (!node.closest('pre'))
        node.replaceWith(document.createTextNode('**' + (node.textContent || '') + '**')); });
    clone.querySelectorAll('h1,h2,h3,h4').forEach(node => node.prepend(document.createTextNode('### ')));
    clone.querySelectorAll('pre').forEach(pre => {
        const code = pre.querySelector('code');
        const language = code?.className.match(/language-([\w+-]+)/)?.[1] || '';
        pre.replaceWith(document.createTextNode('\n```' + language + '\n' + (code?.textContent || pre.textContent || '') + '\n```\n'));
    });
    clone.querySelectorAll('li').forEach(node => { node.prepend(document.createTextNode('• ')); node.append(document.createTextNode('\n')); });
    clone.querySelectorAll('p, h1, h2, h3, h4, blockquote, br').forEach(node => node.append(document.createTextNode('\n')));
    const markdown = Array.from(clone.querySelectorAll('[class*="markdown"], [data-markdown-variant]')).filter(node => !node.parentElement?.closest('[class*="markdown"], [data-markdown-variant]'));
    return (markdown.length ? markdown.map(node => node.textContent || '').join('\n') : clone.textContent || '').trim();
}
//# sourceMappingURL=experience.js.map
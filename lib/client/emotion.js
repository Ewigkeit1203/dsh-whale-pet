/**
 * Expressions for lines of dialogue (v0.6.0).
 *
 * Visual novels change the sprite's expression line by line. The theatre does
 * the same for the page being read: a small keyword score (Chinese and
 * English) picks one of the expression artworks and a mood mark drawn above
 * her head. Code is ignored, and anything unclear stays neutral so the normal
 * state poses (thinking, answering, rice) keep showing.
 */
// Earlier rules win ties: surprise and frustration read more strongly than praise.
const EMOTION_RULES = [
    { emotion: 'surprised', pattern: /竟然|居然|没想到|原来如此|哇|诶[？?！!]|欸|咦|什么[？?！!]|真的吗|whoa|wow|surpris|unexpected|really\?|no way/gi },
    { emotion: 'surprised', pattern: /[？?][！!]|[！!][？?]/g, weight: 2 },
    { emotion: 'frustrated', pattern: /报错|错误|失败|崩溃|异常|不行|糟糕|可恶|气死|卡住|超时|bug|error|failed|failure|exception|crash|traceback|timeout|broken/gi },
    { emotion: 'shy', pattern: /抱歉|对不起|不好意思|害羞|脸红|羞|我错了|搞错了|sorry|apolog|embarrass|my mistake|my bad/gi },
    { emotion: 'happy', pattern: /太好了|开心|高兴|恭喜|哈哈|嘿嘿|好耶|喜欢|谢谢|感谢|辛苦了|棒|glad|great|happy|congrat|thank|awesome|nice|love|yay|😊|🎉|❤/gi },
    { emotion: 'proud', pattern: /完成|搞定|成功|解决了|修好了|没问题|大功告成|通过了|done|solved|success|fixed|works now|all set|passed/gi },
    { emotion: 'smug', pattern: /其实|当然|很简单|简单|小菜一碟|轻松|显然|不出所料|交给我|看我的|of course|simply|easy|actually|obviously|leave it to me|piece of cake/gi },
];
/** Prose only: fenced and inline code never sets her mood. */
function proseOf(text) {
    return text.replace(/```[\s\S]*?(```|$)/g, ' ').replace(/`[^`\n]*`/g, ' ');
}
export function detectEmotion(text) {
    const prose = proseOf(text || '');
    if (!prose.trim())
        return 'neutral';
    const scores = new Map();
    for (const rule of EMOTION_RULES) {
        const hits = prose.match(rule.pattern)?.length ?? 0;
        if (hits)
            scores.set(rule.emotion, (scores.get(rule.emotion) ?? 0) + hits * (rule.weight ?? 1));
    }
    let best = 'neutral', bestScore = 0;
    for (const rule of EMOTION_RULES) {
        const score = scores.get(rule.emotion) ?? 0;
        if (score > bestScore) {
            best = rule.emotion;
            bestScore = score;
        }
    }
    return best;
}
/** Artwork for each expression (see poses.ts). */
export const EMOTION_POSE = {
    happy: 'happy', proud: 'proud', smug: 'smug', shy: 'shy', surprised: 'surprised', frustrated: 'angry',
};
/** Mood mark above her head; a surprise phrased as a question gets “?”. */
export function emoteFor(emotion, text = '') {
    switch (emotion) {
        case 'happy': return 'heart';
        case 'proud': return 'sparkle';
        case 'smug': return 'note';
        case 'shy': return 'sweat';
        case 'frustrated': return 'anger';
        case 'surprised': return /[！!]/.test(text) || !/[？?]/.test(text) ? 'exclaim' : 'question';
        default: return null;
    }
}
//# sourceMappingURL=emotion.js.map
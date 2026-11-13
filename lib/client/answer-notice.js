/** [中文, English]; `{name}` is how she addresses the user. The first is the PM's reference line. */
export const WELCOME_BACK_LINES = [
    ['{name}回来啦～回答已经写好了哦。', 'Welcome back~ your answer is ready.'],
    ['欢迎回来～刚才的问题，我答好啦。', 'There you are~ I finished the answer.'],
    ['回来得正好，答案已经在等{name}了。', 'Good timing. The answer is waiting for you.'],
    ['嘿嘿，趁{name}不在，我把回答写完了。', 'Hehe, I finished it while you were away.'],
    ['回答好啦～{name}慢慢看，我在旁边陪着。', 'All done~ take your time, I’m right here.'],
    ['等{name}好一会儿了，快来看看回答吧。', 'I’ve been waiting~ come have a look.'],
];
const MARK_ZH = '🐟 已回答 · ', MARK_EN = '🐟 Answered · ';
/** The window title with or without the fish mark (never doubled; removes either language's mark). */
export function markTitle(title, on, english = false) {
    const bare = title.startsWith(MARK_ZH) ? title.slice(MARK_ZH.length) : title.startsWith(MARK_EN) ? title.slice(MARK_EN.length) : title;
    return on ? (english ? MARK_EN : MARK_ZH) + bare : bare;
}
export class AnswerNotice {
    random;
    pending = false;
    bag = [];
    last = -1;
    constructor(random = Math.random) {
        this.random = random;
    }
    /** An answer has been finished and not seen yet. */
    get waiting() { return this.pending; }
    /** The answer just finished. 'nod': the user is watching; 'wait': greet them when they return; 'none': reminders are off. */
    finish(foreground, mode) {
        if (mode === 'off') {
            this.pending = false;
            return 'none';
        }
        if (foreground)
            return 'nod';
        this.pending = true;
        return 'wait';
    }
    /** The user is back in DSH: true once per unseen answer. */
    back(mode = 'line') {
        const greet = this.pending;
        this.pending = false;
        return greet && mode !== 'off';
    }
    cancel() { this.pending = false; }
    /** Index of the next greeting: every line is used once before any repeats, never the same twice in a row. */
    nextLine() {
        if (!this.bag.length) {
            this.bag = WELCOME_BACK_LINES.map((_, i) => i);
            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = Math.floor(this.random() * (i + 1));
                [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
            }
            if (this.bag[this.bag.length - 1] === this.last)
                this.bag.unshift(this.bag.pop());
        }
        this.last = this.bag.pop();
        return this.last;
    }
}
//# sourceMappingURL=answer-notice.js.map
/**
 * Answer-finished reminder (PM v0.9 P0-2).
 *
 * The answer ended while DSH was not in front: the window title gets a small fish mark, and the moment the
 * user comes back she greets them once ("you're back, it's ready"). If they were watching she only nods:
 * a line then would interrupt the reading. Pure logic; PetOverlay owns the DOM and the reaction.
 */
export type AnswerNoticeMode = 'motion' | 'line' | 'off';
/** [中文, English]; `{name}` is how she addresses the user. The first is the PM's reference line. */
export declare const WELCOME_BACK_LINES: readonly (readonly [string, string])[];
/** The window title with or without the fish mark (never doubled; removes either language's mark). */
export declare function markTitle(title: string, on: boolean, english?: boolean): string;
export declare class AnswerNotice {
    private readonly random;
    private pending;
    private bag;
    private last;
    constructor(random?: () => number);
    /** An answer has been finished and not seen yet. */
    get waiting(): boolean;
    /** The answer just finished. 'nod': the user is watching; 'wait': greet them when they return; 'none': reminders are off. */
    finish(foreground: boolean, mode: AnswerNoticeMode): 'nod' | 'wait' | 'none';
    /** The user is back in DSH: true once per unseen answer. */
    back(mode?: AnswerNoticeMode): boolean;
    cancel(): void;
    /** Index of the next greeting: every line is used once before any repeats, never the same twice in a row. */
    nextLine(): number;
}
//# sourceMappingURL=answer-notice.d.ts.map
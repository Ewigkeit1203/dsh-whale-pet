/**
 * Sends a message through DSH's own chat composer: the theatre's input in DSH, and questions asked from the
 * desktop companion (which reach DSH's page over the link). One path, so both behave exactly alike.
 * The text is put into the composer and DSH's send button is clicked; nothing else on the page is touched.
 */
export type ComposerResult = 'sent' | 'no-composer' | 'no-button';
/** Waits, then runs; the overlay passes its own timer so pending sends are dropped when it unmounts. */
export type ComposerWait = (callback: () => void, ms: number) => void;
/**
 * Fills DSH's composer with `text` and clicks its send button. `done` is called synchronously when there is
 * no composer, otherwise once the send button was (or could not be) clicked.
 */
export declare function submitToDshComposer(text: string, done: (result: ComposerResult) => void, wait?: ComposerWait): void;
//# sourceMappingURL=dsh-composer.d.ts.map
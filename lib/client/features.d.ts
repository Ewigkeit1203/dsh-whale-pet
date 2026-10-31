/**
 * Internal capability switches. These are product decisions, not user settings.
 * Restoring a feature should only require flipping its flag here.
 */
export declare const FEATURES: {
    /**
     * Chibi (Q 版) form switching is paused by the product owner (2026-10-31).
     * DaFeiYu.png, its Base64 export and hit area stay in the bundle so the
     * form can return without asset work.
     */
    readonly chibiForm: false;
};
/** The form that is actually rendered. A stored `chibi` preference is kept but rendered as maiden while paused. */
export declare function effectiveForm(form: 'maiden' | 'chibi'): 'maiden' | 'chibi';
//# sourceMappingURL=features.d.ts.map
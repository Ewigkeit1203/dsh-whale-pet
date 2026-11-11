/** A deliberate modified letter; never steal text editing or the existing Alt+W/T actions. */
export interface PeekKey {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
    isComposing?: boolean;
    repeat?: boolean;
}
export declare function normalisePeekShortcut(value: unknown): string | null;
export declare function peekShortcutFromEvent(event: PeekKey): string | null;
export declare function matchesPeekShortcut(event: PeekKey, shortcut: string): boolean;
//# sourceMappingURL=peek-shortcut.d.ts.map
export declare function revealDelay(character: string, speed: 'slow' | 'medium' | 'fast' | 'instant'): number;
export declare function diagnosticReport(): string;
/**
 * Wrap by measured line width rather than total characters, preserving all prose.
 * Widths are summed per character (one measurement per distinct character), so a
 * long streamed answer costs linear time instead of re-measuring every line prefix.
 */
export declare function paginateText(text: string, width: number, height: number, font: number, charWidth?: (character: string) => number): string[];
//# sourceMappingURL=usability.d.ts.map
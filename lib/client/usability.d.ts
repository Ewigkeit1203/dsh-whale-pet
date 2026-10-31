export declare function viewportPanel(viewportWidth: number, viewportHeight: number, x: number, y: number, composerTop?: number): {
    x: number;
    y: number;
    height: number;
};
export declare function pageCapacity(width: number, height: number, fontSize: number): number;
export declare function revealDelay(character: string, speed: 'slow' | 'medium' | 'fast' | 'instant'): number;
export declare function diagnosticReport(): string;
/** Wrap by measured line width rather than total characters, preserving all prose. */
export declare function paginateText(text: string, width: number, height: number, font: number, measure?: (text: string) => number): string[];
//# sourceMappingURL=usability.d.ts.map
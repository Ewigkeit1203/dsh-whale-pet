/**
 * Type definitions for DeepSeek Whale Pet plugin (dsh-whale-pet).
 */
export type PetState = 'IDLE' | 'PEEKING' | 'REASONING' | 'EATING' | 'WANDERING';
export type PetForm = 'chibi' | 'maiden';
export type PetPose = 'default' | 'pondering' | 'puzzled' | 'puff' | 'getit' | 'mad' | 'eating';
export interface PetPosition {
    x: number;
    y: number;
    side: 'left' | 'right';
}
export interface GazeOffset {
    x: number;
    y: number;
}
export interface PetStatusInfo {
    state: PetState;
    form: PetForm;
    pose: PetPose;
    speech: string;
    reasoningText: string;
    toppedUpBalance: string;
    grantedBalance: string;
    isReasoning: boolean;
    isStreaming: boolean;
    isInputFocused: boolean;
    isGalGameMode: boolean;
    autoGalGameOnChat: boolean;
    mouthOpenRatio: number;
    blinkRatio: number;
    gazeOffset: GazeOffset;
    latestDialogue: string;
}
//# sourceMappingURL=types.d.ts.map
import type { PetForm, PetPose, PetStatusInfo, GazeOffset } from './types.js';
export interface StateMachineListener {
    (status: PetStatusInfo): void;
}
export declare class PetStateMachine {
    private state;
    private form;
    private pose;
    private isInputFocused;
    private isReasoning;
    private isStreaming;
    private isGalGameMode;
    private autoGalGameOnChat;
    private speech;
    private latestDialogue;
    private reasoningText;
    private toppedUpBalance;
    private grantedBalance;
    private mouthOpenRatio;
    private blinkRatio;
    private gazeOffset;
    private speechTimer;
    private debounceTimer;
    private animationTimer;
    private blinkTimer;
    private reasoningCycleTimer;
    private madTimer;
    private listeners;
    private thinkingPoseIndex;
    private readonly thinkingPoses;
    constructor();
    getStatus(): PetStatusInfo;
    subscribe(listener: StateMachineListener): () => void;
    private notify;
    private getRandomDialogue;
    private startLivingAnimationLoops;
    private performBlinkCycle;
    setBalances(toppedUp: string, granted: string): void;
    setInputFocus(focused: boolean): void;
    setReasoning(reasoning: boolean): void;
    setReasoningText(text: string): void;
    clearReasoningText(): void;
    setStreaming(streaming: boolean): void;
    triggerMad(): void;
    setPose(pose: PetPose): void;
    setLatestDialogue(text: string): void;
    setGazeOffset(offset: GazeOffset): void;
    setAutoGalGameOnChat(enabled: boolean): void;
    toggleAutoGalGameOnChat(): void;
    setForm(form: PetForm): void;
    toggleForm(): void;
    setGalGameMode(enabled: boolean): void;
    toggleGalGameMode(): void;
    setWandering(wandering: boolean): void;
    private recomputeState;
    private commitState;
    dispose(): void;
}
//# sourceMappingURL=state-machine.d.ts.map
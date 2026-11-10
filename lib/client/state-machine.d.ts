import type { PetForm, PetStatusInfo, BalanceSnapshot } from './types.js';
export interface StateMachineListener {
    (status: PetStatusInfo): void;
}
export declare class PetStateMachine {
    private disposed;
    private state;
    private form;
    private pose;
    private isInputFocused;
    private isReasoning;
    private isStreaming;
    private isWandering;
    private isEatingPostOutput;
    private isEatingWandering;
    private isLongSajiao;
    private isGalGameMode;
    private autoGalGameOnChat;
    private speech;
    private latestDialogue;
    private reasoningText;
    private balancesKnown;
    private toppedUpBalance;
    private grantedBalance;
    /** Last time a balance source reported, even when values were unchanged (UI freshness only). */
    private balancesCheckedAt;
    private hostBalance;
    private speechTimer;
    private debounceTimer;
    private thinkingCycleTimer;
    private madTimer;
    private eatingTimer;
    private inactivityTimer;
    private listeners;
    private lastThinkingPose;
    private readonly thinkingPool;
    private readonly INACTIVITY_DELAY;
    constructor();
    getStatus(): PetStatusInfo;
    subscribe(listener: StateMachineListener): () => void;
    private notify;
    private getRandomDialogue;
    resetActivity(): void;
    private scheduleInactivityCheck;
    private triggerInactivitySajiao;
    setBalances(toppedUp: string, granted: string): void;
    /** Host account balance (see account-balance.ts). null clears it, e.g. when account access is withdrawn. */
    setHostBalance(snapshot: BalanceSnapshot | null): void;
    setInputFocus(focused: boolean): void;
    setReasoning(reasoning: boolean): void;
    private scheduleNextThinkingPose;
    setReasoningText(text: string): void;
    clearReasoningText(): void;
    setStreaming(streaming: boolean): void;
    private cancelEatingAndWandering;
    triggerPostOutputEating(durationMs?: number): void;
    /** End a stroll independently of the optional eating reaction. Busy model states keep priority. */
    finishWandering(eat?: boolean): void;
    finishWanderingWithEating(durationMs?: number): void;
    triggerSajiao(isLong?: boolean): void;
    setLatestDialogue(text: string): void;
    setAutoGalGameOnChat(enabled: boolean): void;
    setForm(form: PetForm): void;
    setGalGameMode(enabled: boolean): void;
    toggleGalGameMode(): void;
    setWandering(wandering: boolean): void;
    private recomputeState;
    private commitState;
    dispose(): void;
}
//# sourceMappingURL=state-machine.d.ts.map
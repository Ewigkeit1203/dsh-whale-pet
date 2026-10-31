/**
 * Type definitions for DeepSeek Whale Pet plugin (dsh-whale-pet).
 */
export type PetState = 'IDLE' | 'PEEKING' | 'REASONING' | 'ANSWERING' | 'EATING' | 'WANDERING';
export type PetForm = 'chibi' | 'maiden';
export type PetPose = 'default' | 'answering' | 'eating' | 'sajiao' | 'getit' | 'think1' | 'think2' | 'think3' | 'think4' | 'think5' | 'mad';
export interface PetPosition {
    x: number;
    y: number;
    side: 'left' | 'right';
}
export interface GazeOffset {
    x: number;
    y: number;
}
/** One balance field. Amounts are decimal strings exactly as the host returned them. */
export type WalletRead = {
    status: 'unknown';
} | {
    status: 'ready';
    wallets: readonly {
        currency: string;
        amount: string;
    }[];
} | {
    status: 'failed';
};
/**
 * Balance read through DSH's own account service (`remote.account.getBalance`).
 * Account identity and credentials never leave the host; this carries amounts only.
 */
export interface BalanceSnapshot {
    status: 'loading' | 'ready' | 'stale' | 'signed-out' | 'error';
    source: 'host';
    toppedUp: WalletRead;
    granted: WalletRead;
    /** Last successful read (epoch ms), not the render time. */
    updatedAt: number | null;
}
export interface PetStatusInfo {
    state: PetState;
    form: PetForm;
    pose: PetPose;
    speech: string;
    reasoningText: string;
    balancesKnown: boolean;
    toppedUpBalance: string;
    grantedBalance: string;
    balancesCheckedAt: number | null;
    hostBalance: BalanceSnapshot | null;
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
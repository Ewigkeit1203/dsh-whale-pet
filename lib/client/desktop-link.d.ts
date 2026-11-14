/**
 * The link between 大肥鱼 in DSH and the desktop companion (desktop/, roadmap step 2).
 *
 * DSH's page cannot open a desktop window or listen on a port, so the companion (Node) listens on
 * 127.0.0.1 and the page is the client: it finds the companion on one of a few fixed ports and posts
 * what her state machine was told (thinking, answering, the latest answer, the balance). The desktop
 * feeds the same calls into its own state machine, so she reacts exactly as she does in DSH.
 * Nothing here can run code or touch files on either side: the only message is a status snapshot.
 */
import type { BalanceSnapshot, PetStatusInfo } from './types.js';
export declare const DESKTOP_LINK: {
    readonly ports: readonly [38917, 38918, 38919, 38920, 38921];
    readonly app: "dsh-whale-pet-desktop";
    readonly version: 1;
    /** A push at least this often, so the companion knows DSH is still there. */
    readonly beatMs: 2000;
    /** At most four pushes a second while she streams an answer. */
    readonly minGapMs: 250;
    /** Looking for the companion: quickly at first, then less often while it is not running. */
    readonly scanMs: readonly [3000, 5000, 10000, 30000, 60000];
    readonly helloTimeoutMs: 800;
    /** Longer answers are cut (the desktop bubble shows the end, the theatre will page). */
    readonly textLimit: 60000;
};
export interface LinkSnapshot {
    v: 1;
    isReasoning: boolean;
    isStreaming: boolean;
    latestDialogue: string;
    reasoningText: string;
    quotaErrorKey: string | null;
    hostBalance: BalanceSnapshot | null;
    balances: {
        known: boolean;
        toppedUp: string;
        granted: string;
    };
}
export declare function linkSnapshot(status: PetStatusInfo): LinkSnapshot;
/** The calls DSH's page makes on her state machine, and the desktop repeats. */
export interface LinkDriver {
    getStatus(): PetStatusInfo;
    setReasoning(on: boolean): void;
    setStreaming(on: boolean): void;
    setLatestDialogue(text: string): void;
    setReasoningText(text: string): void;
    clearReasoningText(): void;
    setQuotaError(key: string | null): void;
    setHostBalance(snapshot: BalanceSnapshot | null): void;
    setBalances(toppedUp: string, granted: string): void;
}
/** Checks a snapshot that arrived over the link; anything unexpected is dropped whole. */
export declare function readLinkSnapshot(value: unknown): LinkSnapshot | null;
/** Desktop: repeat what DSH's page told its state machine, in the order the page does it. */
export declare function applyLinkSnapshot(machine: LinkDriver, value: unknown): boolean;
/** Desktop: DSH went away mid-answer; she stops thinking and talking (she keeps the last balance). */
export declare function linkLost(machine: Pick<LinkDriver, 'setStreaming' | 'setReasoning'>): void;
export type DesktopLinkState = {
    status: 'searching';
    error?: string;
} | {
    status: 'connected';
    port: number;
};
/** The latest link state, for the settings panel (the link may start before the panel mounts). */
export declare function desktopLinkState(): DesktopLinkState;
interface LinkDeps {
    fetch: typeof fetch;
    setTimeout: (fn: () => void, ms: number) => unknown;
    clearTimeout: (timer: any) => void;
    now: () => number;
    onState?: (state: DesktopLinkState) => void;
}
/**
 * DSH: find the companion and keep it up to date. Returns a stop function.
 * While it is not running this costs one failed local request per port every few seconds.
 */
export declare function startDesktopLink(machine: Pick<LinkDriver, 'getStatus'> & {
    subscribe(listener: () => void): () => void;
}, deps?: Partial<LinkDeps>): () => void;
export {};
//# sourceMappingURL=desktop-link.d.ts.map
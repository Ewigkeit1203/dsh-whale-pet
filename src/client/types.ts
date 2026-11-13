/**
 * Type definitions for DeepSeek Whale Pet plugin (dsh-whale-pet).
 */

export type PetState = 'IDLE' | 'PEEKING' | 'REASONING' | 'ANSWERING' | 'EATING' | 'WANDERING'

export type PetForm = 'chibi' | 'maiden'

export type PetPose =
  | 'default'
  | 'answering'
  | 'eating'
  | 'sajiao'
  | 'getit'
  | 'think1'
  | 'think2'
  | 'think3'
  | 'think4'
  | 'think5'

/** One balance field. Amounts are decimal strings exactly as the host returned them. */
export type WalletRead =
  | { status: 'unknown' }
  | { status: 'ready'; wallets: readonly { currency: string; amount: string }[] }
  | { status: 'failed' }

/**
 * Balance read through DSH's own account service (`remote.account.getBalance`).
 * Account identity and credentials never leave the host; this carries amounts only.
 */
export interface BalanceSnapshot {
  status: 'loading' | 'ready' | 'stale' | 'signed-out' | 'error'
  source: 'host'
  toppedUp: WalletRead
  granted: WalletRead
  /** Last successful read (epoch ms), not the render time. */
  updatedAt: number | null
}

export interface PetStatusInfo {
  state: PetState
  form: PetForm
  pose: PetPose
  speech: string
  reasoningText: string // Chain-of-Thought reasoning content
  balancesKnown: boolean
  toppedUpBalance: string // Topped-up balance (充值余额)
  grantedBalance: string  // Granted balance (赠金余额)
  balancesCheckedAt: number | null // Last source read, for stale labelling; not a render time
  hostBalance: BalanceSnapshot | null // Host account service; null when unavailable or access was withdrawn
  quotaErrorKey: string | null // Explicit host turn-error, never inferred from assistant prose
  isReasoning: boolean
  isStreaming: boolean
  isInputFocused: boolean
  isGalGameMode: boolean
  autoGalGameOnChat: boolean
  latestDialogue: string
}

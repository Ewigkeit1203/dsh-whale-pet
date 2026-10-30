/**
 * Type definitions for DeepSeek Whale Pet plugin (dsh-whale-pet).
 */

export type PetState = 'IDLE' | 'PEEKING' | 'REASONING' | 'EATING' | 'WANDERING'

export type PetForm = 'chibi' | 'maiden'

export type PetPose = 'default' | 'pondering' | 'puzzled' | 'puff' | 'getit' | 'mad' | 'eating'

export interface PetPosition {
  x: number
  y: number
  side: 'left' | 'right'
}

export interface GazeOffset {
  x: number // -1.0 (left) to 1.0 (right)
  y: number // -1.0 (up) to 1.0 (down)
}

export interface PetStatusInfo {
  state: PetState
  form: PetForm
  pose: PetPose
  speech: string
  reasoningText: string // Chain-of-Thought reasoning content
  toppedUpBalance: string // Topped-up balance (充值余额)
  grantedBalance: string  // Granted balance (赠金余额)
  isReasoning: boolean
  isStreaming: boolean
  isInputFocused: boolean
  isGalGameMode: boolean
  autoGalGameOnChat: boolean
  mouthOpenRatio: number // 0.0 (closed) to 1.0 (open)
  blinkRatio: number     // 0.0 (open) to 1.0 (closed)
  gazeOffset: GazeOffset
  latestDialogue: string
}

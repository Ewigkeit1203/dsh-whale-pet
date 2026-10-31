import { HIT_AREAS } from './hitareas.js'
import React from 'react'
import type { PetState, GazeOffset } from './types.js'

export interface LivingPuppetProps {
  imgSrc: string
  isMaiden: boolean
  isGalGameMode: boolean
  mouthOpenRatio: number
  gazeOffset: GazeOffset
  state: PetState
  poseName?: string
  opacity?: number
  /** Explicit image box from poses.ts (desktop widget). The theatre sizes via CSS variables instead. */
  box?: { width: number; height: number; left: number }
  /** Calibrated head-size factor, consumed by theatre CSS as --pose-scale. */
  poseScale?: number
  onMouseDown?: (e: React.MouseEvent) => void
}

/**
 * Two transform layers: the root carries gaze parallax, the canvas carries
 * breathing/talking. The image itself is sized, never transformed, so the
 * clip-path hit area always matches what is drawn.
 */
export function LivingPuppet({ imgSrc, isMaiden, isGalGameMode, mouthOpenRatio, gazeOffset, state, onMouseDown, opacity = 1, poseName = 'Maid', box, poseScale = 1 }: LivingPuppetProps) {
  const strength = isGalGameMode ? 0.6 : 1
  const rotY = gazeOffset.x * 4.5 * strength
  const rotX = -gazeOffset.y * 3 * strength
  const shiftX = gazeOffset.x * 5 * strength
  const shiftY = gazeOffset.y * 3 * strength
  const isTalking = mouthOpenRatio > 0.15 || state === 'ANSWERING'
  const imageStyle: React.CSSProperties = {
    clipPath: HIT_AREAS[poseName],
    pointerEvents: isGalGameMode ? 'none' : undefined,
    ...(box ? { width: box.width + 'px', height: box.height + 'px', left: box.left + 'px' } : {}),
  }
  return (
    <div
      className={'puppetRoot' + (isGalGameMode ? ' puppetGalGame' : '')}
      onMouseDown={onMouseDown}
      style={{ transform: `perspective(${isGalGameMode ? 900 : 700}px) rotateY(${rotY}deg) rotateX(${rotX}deg) translate(${shiftX}px, ${shiftY}px)`, opacity, '--pose-scale': poseScale } as React.CSSProperties}
    >
      <div className={'puppetCanvas' + (isTalking ? ' canvasTalking' : '')} data-state={state}>
        <img
          src={imgSrc}
          style={imageStyle}
          alt=""
          aria-hidden="true"
          data-pose={poseName}
          className={'characterBase ' + (isMaiden ? (isGalGameMode ? 'standingGalGame' : 'standingBase') : (isGalGameMode ? 'chibiGalGame' : 'chibiBase'))}
          draggable={false}
        />
      </div>
    </div>
  )
}

import React from 'react'
import type { PetState, GazeOffset } from './types.js'
import styles from './LivingPuppet.module.css'

export interface LivingPuppetProps {
  imgSrc: string
  isMaiden: boolean
  isGalGameMode: boolean
  mouthOpenRatio: number
  gazeOffset: GazeOffset
  state: PetState
  onMouseDown?: (e: React.MouseEvent) => void
}

export function LivingPuppet({
  imgSrc,
  isMaiden,
  isGalGameMode,
  mouthOpenRatio,
  gazeOffset,
  state,
  onMouseDown,
}: LivingPuppetProps) {
  // 3D Parallax Tilt based on Gaze: Smooth head tracking with perspective
  const rotY = gazeOffset.x * 5.0
  const rotX = -gazeOffset.y * 3.5
  const transX = gazeOffset.x * 6.0
  const transY = gazeOffset.y * 4.0

  const puppetStyle: React.CSSProperties = isGalGameMode
    ? {
        transform: `perspective(900px) rotateY(${rotY * 0.7}deg) rotateX(${rotX * 0.5}deg) translate(${transX * 0.6}px, ${transY * 0.5}px)`,
      }
    : {
        transform: `perspective(700px) rotateY(${rotY}deg) rotateX(${rotX}deg) translate(${transX}px, ${transY}px)`,
      }

  const isTalking = mouthOpenRatio > 0.15 || state === 'EATING'

  return (
    <div
      className={`${styles.puppetRoot} ${isGalGameMode ? styles.puppetGalGame : ''}`}
      onMouseDown={onMouseDown}
    >
      <div
        className={`${styles.puppetCanvas} ${isTalking ? styles.canvasTalking : ''}`}
        style={puppetStyle}
      >
        {/* Base Character Illustration with High Precision 2.5D Shading */}
        <img
          src={imgSrc}
          alt="DeepSeek Whale Maid"
          className={`${styles.characterBase} ${
            isMaiden
              ? isGalGameMode
                ? styles.standingGalGame
                : styles.standingBase
              : isGalGameMode
              ? styles.chibiGalGame
              : styles.chibiBase
          }`}
          draggable={false}
        />

        {/* Dynamic Subtle Speech Sparkle when speaking (No Emoji) */}
        {isTalking && (
          <div className={styles.talkingIndicator}>
            <div className={styles.talkingWave} />
          </div>
        )}
      </div>
    </div>
  )
}

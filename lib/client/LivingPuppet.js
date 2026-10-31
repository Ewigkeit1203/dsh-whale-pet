import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from './LivingPuppet.module.css';
export function LivingPuppet({ imgSrc, isMaiden, isGalGameMode, mouthOpenRatio, gazeOffset, state, onMouseDown, opacity = 1, }) {
    // 3D Parallax Tilt based on Gaze: Smooth head tracking with perspective
    const rotY = gazeOffset.x * 5.0;
    const rotX = -gazeOffset.y * 3.5;
    const transX = gazeOffset.x * 6.0;
    const transY = gazeOffset.y * 4.0;
    const puppetStyle = isGalGameMode
        ? {
            transform: `perspective(900px) rotateY(${rotY * 0.7}deg) rotateX(${rotX * 0.5}deg) translate(${transX * 0.6}px, ${transY * 0.5}px)`,
        }
        : {
            transform: `perspective(700px) rotateY(${rotY}deg) rotateX(${rotX}deg) translate(${transX}px, ${transY}px)`,
        };
    const isTalking = mouthOpenRatio > 0.15 || state === 'EATING' || state === 'ANSWERING';
    return (_jsx("div", { className: `${styles.puppetRoot} ${isGalGameMode ? styles.puppetGalGame : ''}`, onMouseDown: onMouseDown, style: { ...puppetStyle, opacity }, children: _jsxs("div", { className: `${styles.puppetCanvas} ${isTalking ? styles.canvasTalking : ''}`, children: [_jsx("img", { src: imgSrc, alt: "DeepSeek Whale Maid", className: `${styles.characterBase} ${isMaiden
                        ? isGalGameMode
                            ? styles.standingGalGame
                            : styles.standingBase
                        : isGalGameMode
                            ? styles.chibiGalGame
                            : styles.chibiBase}`, draggable: false }), isTalking && (_jsx("div", { className: styles.talkingIndicator, children: _jsx("div", { className: styles.talkingWave }) }))] }) }));
}
//# sourceMappingURL=LivingPuppet.js.map
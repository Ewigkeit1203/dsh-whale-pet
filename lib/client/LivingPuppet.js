import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HIT_AREAS } from './hitareas.js';
import { POSE_META } from './poses.js';
import { poseRig } from './rig.js';
import { LiveRig, LIVE_PAD } from './live-rig.js';
import { useEffect, useRef } from 'react';
/** WebGL layer that mirrors the image box (plus a margin for the swaying hem). */
function LiveCanvas({ src, pose, motion, box }) {
    const ref = useRef(null);
    const rigRef = useRef(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas)
            return;
        const rig = LiveRig.create(canvas);
        if (!rig) {
            canvas.dataset.state = 'failed';
            return;
        }
        rigRef.current = rig;
        rig.onReady = () => { canvas.dataset.state = 'ready'; };
        rig.onFail = () => { canvas.dataset.state = 'failed'; };
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => rig.resizeCanvas()) : null;
        observer?.observe(canvas);
        rig.start();
        return () => { observer?.disconnect(); rig.dispose(); rigRef.current = null; };
    }, []);
    useEffect(() => { rigRef.current?.setPose(src, pose); }, [src, pose]);
    useEffect(() => { if (rigRef.current)
        rigRef.current.input.motion = motion; }, [motion]);
    const style = box ? {
        width: box.width * (1 + 2 * LIVE_PAD) + 'px', height: box.height * (1 + 2 * LIVE_PAD) + 'px',
        left: box.left - box.width * LIVE_PAD + 'px', bottom: -box.height * LIVE_PAD + 'px',
    } : undefined;
    return _jsx("canvas", { ref: ref, className: 'liveCanvas' + (box ? '' : ' liveCanvasStage'), style: style, "aria-hidden": "true" });
}
const EMOTE_GLYPHS = {
    heart: 'M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.5 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.5 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z',
    sparkle: 'M12 2.5l1.9 6.6 6.6 1.9-6.6 1.9L12 19.5l-1.9-6.6L3.5 11l6.6-1.9zM19.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8zM5 1.5l.6 1.7 1.7.6-1.7.6L5 6.1l-.6-1.7-1.7-.6 1.7-.6z',
    note: 'M9 18.5a3 3 0 1 1-2-2.8V4.5l11-2.5v12.2a3 3 0 1 1-2-2.8V6.6l-7 1.6z',
    sweat: 'M12 2.5c3.3 5.2 6 8.7 6 12a6 6 0 0 1-12 0c0-3.3 2.7-6.8 6-12z',
    exclaim: 'M10 2.5h4l-.8 12.5h-2.4zM12 17.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z',
    question: 'M7.5 7.5a4.5 4.5 0 1 1 6.9 3.8c-1.3.9-2.1 1.7-2.1 3.4v.8h-3v-1c0-2.4 1.2-3.6 2.6-4.6.9-.6 1.3-1.2 1.3-2.2a1.7 1.7 0 0 0-3.4 0zM10.8 17.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
    anger: 'M9.5 3.5c0 3 1 5 3 6M14.5 3.5c0 3-1 5-3 6M3.5 9.5c3 0 5 1 6 3M3.5 14.5c3 0 5-1 6-3M20.5 9.5c-3 0-5 1-6 3M20.5 14.5c-3 0-5-1-6-3M9.5 20.5c0-3 1-5 3-6M14.5 20.5c0-3-1-5-3-6',
};
/**
 * Two layers: the root positions the portrait, the canvas carries
 * breathing/talking. The image itself is sized, never transformed, so the
 * clip-path hit area always matches what is drawn. With swaying clothes on,
 * the WebGL copy draws the picture once it is ready (it breathes with the canvas).
 * The portrait does not follow the pointer.
 */
export function LivingPuppet({ imgSrc, isMaiden, isGalGameMode, mouthOpenRatio, state, onMouseDown, opacity = 1, poseName = 'Maid', box, poseScale = 1, live = false, motion = 1, emote = null, emoteKey = 0 }) {
    const isTalking = mouthOpenRatio > 0.15 || state === 'ANSWERING';
    const imageStyle = {
        clipPath: HIT_AREAS[poseName],
        pointerEvents: isGalGameMode ? 'none' : undefined,
        ...(box ? { width: box.width + 'px', height: box.height + 'px', left: box.left + 'px' } : {}),
    };
    const rig = poseRig(poseName);
    const aspect = (POSE_META[poseName] ?? POSE_META.Maid).aspect;
    const boxStyle = box ? { width: box.width + 'px', height: box.height + 'px', left: box.left + 'px' } : {};
    return (_jsx("div", { className: 'puppetRoot' + (isGalGameMode ? ' puppetGalGame' : '') + (live ? ' puppetLive' : ''), onMouseDown: onMouseDown, style: { opacity, '--pose-scale': poseScale, '--pose-aspect': aspect }, children: _jsxs("div", { className: 'puppetCanvas' + (isTalking ? ' canvasTalking' : ''), "data-state": state, children: [_jsx("img", { src: imgSrc, style: imageStyle, alt: "", "aria-hidden": "true", "data-pose": poseName, className: 'characterBase ' + (isMaiden ? (isGalGameMode ? 'standingGalGame' : 'standingBase') : (isGalGameMode ? 'chibiGalGame' : 'chibiBase')), draggable: false }), live && isMaiden && _jsx(LiveCanvas, { src: imgSrc, pose: poseName, motion: motion, box: box }), emote && _jsx("div", { className: 'puppetBox' + (box ? '' : ' puppetBoxStage'), style: boxStyle, "aria-hidden": "true", children: _jsx("span", { className: "puppetEmote", "data-emote": emote, style: { left: Math.min(92, rig.face[2] * 100 + 1) + '%', top: Math.max(0, rig.face[1] * 100 - 7) + '%' }, children: _jsx("svg", { viewBox: "0 0 24 24", width: "100%", height: "100%", children: _jsx("path", { d: EMOTE_GLYPHS[emote] }) }) }, emoteKey) })] }) }));
}
//# sourceMappingURL=LivingPuppet.js.map
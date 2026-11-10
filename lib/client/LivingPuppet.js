import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { HIT_AREAS } from './hitareas.js';
import { POSE_META, LIVE2D_POSE_META } from './poses.js';
import { poseRig } from './rig.js';
import { LiveRig, LIVE_PAD } from './live-rig.js';
import { acquireLive2DStage } from './live2d-loader.js';
import { StrokeDetector, illustrationRegion } from './touch.js';
import { CarryController } from './carry.js';
import React, { useEffect, useRef, useState } from 'react';
/**
 * Live2D layer. Mounted per view (widget or theatre); the decoded model files
 * are shared through the source, so switching views reloads quickly.
 */
function Live2DLayer({ binding, talking, motion, style, stage, touchable, onState, stageRef }) {
    const ref = useRef(null);
    const bindingRef = useRef(binding);
    bindingRef.current = binding;
    const talkingRef = useRef(talking);
    talkingRef.current = talking;
    const motionRef = useRef(motion);
    motionRef.current = motion;
    const [hull, setHull] = useState('');
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const host = ref.current;
        if (!host)
            return;
        let cancelled = false;
        let release;
        setReady(false);
        setHull('');
        void acquireLive2DStage(binding.source).then(lease => {
            if (cancelled) {
                lease.release();
                return;
            }
            release = lease.release;
            const { canvas, stage: live } = lease;
            canvas.className = 'live2dSurface';
            host.appendChild(canvas);
            stageRef.current = live;
            setHull(live.getHull());
            live.setLook(bindingRef.current.look);
            live.setMotion(motionRef.current);
            live.setMouth(talkingRef.current ? 1 : 0);
            // The theatre is watched closely; the desktop companion is ambient (quick motions still get 60, see runtime.ts).
            live.setFrameRate(stage ? 60 : 30);
            live.onHull = clip => { if (!cancelled)
                setHull(clip); };
            live.onFail = reason => { if (!cancelled) {
                setReady(false);
                bindingRef.current.onFail?.(reason);
            } };
            live.ready.then(info => { if (!cancelled) {
                setReady(true);
                live.resize();
                bindingRef.current.onReady?.(info.aspect);
            } }, error => { if (!cancelled) {
                setReady(false);
                bindingRef.current.onFail?.(String(error?.message || 'model-load'));
            } });
        }).catch(error => { if (!cancelled)
            bindingRef.current.onFail?.(String(error?.message || 'core-missing')); });
        return () => { cancelled = true; release?.(); stageRef.current = null; };
    }, [binding.source]);
    useEffect(() => { stageRef.current?.setLook(binding.look); }, [binding.look]);
    useEffect(() => { stageRef.current?.setMouth(talking ? 1 : 0); }, [talking]);
    useEffect(() => { stageRef.current?.setMotion(motion); }, [motion]);
    useEffect(() => { onState({ ready, hull }); }, [ready, hull]);
    return _jsxs(_Fragment, { children: [_jsx("div", { ref: ref, className: 'live2dCanvas' + (stage ? ' standingGalGame' : ''), "data-state": ready ? 'ready' : 'loading', style: style, "aria-hidden": "true" }), ready && (!stage || touchable) && _jsx("div", { className: 'characterBase live2dHit' + (stage ? ' standingGalGame puppetTouchable' : ''), style: { ...style, clipPath: hull || undefined }, "aria-hidden": "true" })] });
}
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
/**
 * A thin DOM adapter for CarryController: fixed collar, lift, struggle and landing.
 * One temporary RAF/listener while moving; no per-frame React state.
 */
function useDangle(root, held, motion, stage, shadow, legMode = false) {
    const ctl = useRef({ controller: new CarryController(), grab: null, raf: 0, onMove: null });
    const paint = () => {
        const el = root.current, c = ctl.current, p = c.controller.pose;
        if (!el)
            return;
        if (!c.controller.active) {
            el.style.rotate = '';
            el.style.translate = '';
            el.style.scale = '';
            el.style.transformOrigin = '';
            delete el.dataset.carryPhase;
        }
        else {
            el.style.transformOrigin = `${p.pivotX}px ${p.pivotY}px`;
            el.style.rotate = `${p.angle.toFixed(3)}deg`;
            el.style.translate = `${p.x.toFixed(3)}px ${p.y.toFixed(3)}px`;
            el.style.scale = `${p.sx.toFixed(5)} ${p.sy.toFixed(5)}`;
            el.dataset.carryPhase = p.phase;
        }
        const ground = shadow?.current;
        if (ground) {
            ground.style.opacity = String(p.shadowOpacity);
            ground.style.transform = `translateX(-50%) scale(${p.shadowScale})`;
        }
    };
    (React.useLayoutEffect ?? useEffect)(() => {
        const el = root.current, c = ctl.current;
        if (!el)
            return;
        c.controller.setLegMode(legMode);
        const stopLoop = () => {
            if (c.raf)
                cancelAnimationFrame(c.raf);
            if (c.onMove)
                window.removeEventListener('pointermove', c.onMove);
            c.raf = 0;
            c.onMove = null;
        };
        if (motion <= 0) {
            stopLoop();
            c.controller.stop();
            c.grab = null;
            paint();
            stage.current?.setDangle(0);
            stage.current?.setCarryPose(0, 0);
            return;
        }
        if (held && (held !== c.grab || !c.controller.isHeld)) {
            c.controller.grab(performance.now(), (el.parentElement ?? el).getBoundingClientRect(), held);
            c.grab = held;
            paint();
        }
        else if (!held) {
            c.controller.release(performance.now());
            c.grab = null;
        }
        if (!c.controller.active || c.raf)
            return;
        c.onMove = event => c.controller.move(event.clientX, event.clientY, performance.now());
        window.addEventListener('pointermove', c.onMove, { passive: true });
        const step = (now) => {
            c.raf = 0;
            const p = c.controller.tick(now);
            paint();
            stage.current?.setDangle(p.angle, { x: p.vx, y: p.vy });
            stage.current?.setCarryPose(p.suspended, p.landing);
            if (!c.controller.active) {
                stopLoop();
                return;
            }
            c.raf = requestAnimationFrame(step);
        };
        c.raf = requestAnimationFrame(step);
    }, [held, motion, legMode]);
    useEffect(() => () => {
        const c = ctl.current;
        if (c.raf)
            cancelAnimationFrame(c.raf);
        if (c.onMove)
            window.removeEventListener('pointermove', c.onMove);
        c.raf = 0;
        c.onMove = null;
        c.controller.stop();
        stage.current?.setDangle(0);
        stage.current?.setCarryPose(0, 0);
    }, []);
}
export function LivingPuppet({ imgSrc, isMaiden, isGalGameMode, state, onMouseDown, onTouch, held, opacity = 1, poseName = 'Maid', box, poseScale = 1, live = false, motion = 1, emote = null, emoteKey = 0, live2d }) {
    const isTalking = state === 'ANSWERING';
    const [model, setModel] = useState({ ready: false, hull: '' });
    const showModel = Boolean(live2d && isMaiden && model.ready);
    const stageRef = useRef(null);
    const rootRef = useRef(null);
    const shadowRef = useRef(null);
    useDangle(rootRef, held, motion, stageRef, shadowRef, showModel);
    const strokes = useRef(null);
    const touchable = Boolean(onTouch);
    // Where on her the pointer is: the model knows its head and tail; an illustration only its head.
    const regionAt = (event) => {
        const target = event.target.closest?.('.characterBase');
        if (!target)
            return null;
        if (showModel && stageRef.current)
            return stageRef.current.regionAt(event.clientX, event.clientY);
        return illustrationRegion(event.clientX, event.clientY, target.getBoundingClientRect());
    };
    const sideOf = (event) => {
        const rect = event.currentTarget.querySelector('.characterBase')?.getBoundingClientRect();
        return rect && event.clientX < rect.left + rect.width / 2 ? -1 : 1;
    };
    const onMouseMove = (event) => {
        if (!onTouch || event.buttons)
            return;
        const stroke = (strokes.current ??= new StrokeDetector()).feed(event.clientX, regionAt(event), Date.now());
        if (!stroke)
            return;
        const side = sideOf(event);
        if (stroke === 'tail')
            stageRef.current?.pulse('dodge', side);
        onTouch({ kind: stroke, side });
    };
    // In the theatre a click on her is a poke (the dialogue box and the backdrop still advance).
    const onClick = isGalGameMode && onTouch ? (event) => {
        if (!event.target.closest?.('.characterBase'))
            return;
        event.stopPropagation();
        onTouch({ kind: showModel && regionAt(event) === 'chest' ? 'chest' : 'poke', side: sideOf(event) });
    } : undefined;
    const imageStyle = {
        clipPath: HIT_AREAS[poseName],
        visibility: live2d ? 'hidden' : undefined,
        ...(box ? { width: box.width + 'px', height: box.height + 'px', left: box.left + 'px' } : {}),
    };
    const rigPose = showModel ? 'Live2D' : poseName;
    const rig = poseRig(rigPose);
    const aspect = showModel ? LIVE2D_POSE_META.aspect : (POSE_META[poseName] ?? POSE_META.Maid).aspect;
    const boxStyle = box ? { width: box.width + 'px', height: box.height + 'px', left: box.left + 'px' } : {};
    return (_jsxs(_Fragment, { children: [_jsx("div", { ref: shadowRef, className: "carryGroundShadow", "aria-hidden": "true" }), _jsx("div", { ref: rootRef, className: 'puppetRoot' + (isGalGameMode ? ' puppetGalGame' : '') + (live ? ' puppetLive' : ''), onMouseDown: onMouseDown ? event => onMouseDown(event, showModel ? regionAt(event) : null) : undefined, onMouseMove: touchable ? onMouseMove : undefined, onClick: onClick, style: { opacity, '--pose-scale': showModel ? LIVE2D_POSE_META.scale * (live2d?.scale ?? 1) : poseScale, '--pose-aspect': aspect }, children: _jsxs("div", { className: 'puppetCanvas' + (isTalking ? ' canvasTalking' : '') + (showModel ? ' puppetCanvasLive2D' : ''), "data-state": state, children: [live2d && isMaiden && _jsx(Live2DLayer, { binding: live2d, talking: isTalking, motion: motion, stage: isGalGameMode, touchable: touchable, onState: setModel, stageRef: stageRef, style: box ? { width: box.width + 'px', height: box.height + 'px', left: box.left + 'px' } : { width: `calc(var(--stage-h) * var(--pose-scale, 1) * ${aspect})`, bottom: `calc(var(--stage-h) * ${1 - (live2d?.scale ?? 1)})` } }), !showModel && _jsx("img", { src: imgSrc, style: imageStyle, alt: "", "aria-hidden": "true", "data-pose": poseName, className: 'characterBase ' + (isMaiden ? (isGalGameMode ? 'standingGalGame' : 'standingBase') : (isGalGameMode ? 'chibiGalGame' : 'chibiBase')) + (isGalGameMode && touchable ? ' puppetTouchable' : ''), draggable: false }), live && isMaiden && !live2d && _jsx(LiveCanvas, { src: imgSrc, pose: poseName, motion: motion, box: box }), emote && _jsx("div", { className: 'puppetBox' + (box ? '' : ' puppetBoxStage'), style: boxStyle, "aria-hidden": "true", children: _jsx("span", { className: "puppetEmote", "data-emote": emote, style: { left: Math.min(92, rig.face[2] * 100 + 1) + '%', top: Math.max(0, rig.face[1] * 100 - 7) + '%' }, children: _jsx("svg", { viewBox: "0 0 24 24", width: "100%", height: "100%", children: _jsx("path", { d: EMOTE_GLYPHS[emote] }) }) }, emoteKey) })] }) })] }));
}
//# sourceMappingURL=LivingPuppet.js.map
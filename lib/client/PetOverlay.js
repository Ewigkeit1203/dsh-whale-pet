import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { matchesPeekShortcut } from './peek-shortcut.js';
import { SettingsPanel } from './SettingsPanel.js';
import { TheatreView } from './TheatreView.js';
import { paginateText, revealDelay, diagnosticReport } from './usability.js';
import { dialogueBlocks, readConversationLog } from './experience.js';
import { readPreferences, savePreferences, quietPreset, defaultPreferences } from './preferences.js';
import { FEATURES, effectiveForm } from './features.js';
import { POSE_META, spriteGeometry, live2dWidgetGeometry } from './poses.js';
import { layoutGroup, layoutResizedGroup, clampPet, rightPeekPosition, peekArtPosition, wanderDestination, nextWanderDelay, placeGroupX, groupFits } from './layout.js';
import { walletView } from './wallet.js';
import { balanceChipState, headChipsShown, lowBalanceDue, balanceDay, LOW_BALANCE_DAY_KEY } from './balance-chip.js';
import { GUIDE_STEPS, readDiscoveries, saveDiscoveries, discover, guideStep } from './discovery.js';
import { AnswerNotice, WELCOME_BACK_LINES, markTitle } from './answer-notice.js';
import { PetVoice, appendedSpeech, speakableText } from './voice.js';
import { tariffAt } from './peak.js';
import { SCENES, sceneMeta, sceneSvg, sceneUrl, shuffleScene, timeOfDayScene } from './scenes.js';
import { BgmPlayer, BGM_TRACKS, cycleBgmTrack } from './bgm.js';
import { checkMedia, saveMedia, loadMedia, deleteMedia, saveLive2DModel, loadLive2DModel, deleteLive2DModel } from './media-store.js';
import { importLive2DFiles, live2dSourceFor, live2dNeedsReimport } from './live2d-package.js';
import { live2dLookFor } from './live2d-look.js';
import { live2dBundled } from './live2d-loader.js';
import { PokeCounter, TailPatience, DRAG_THRESHOLD } from './touch.js';
import { detectEmotion, EMOTION_POSE, emoteFor } from './emotion.js';
import { LiveRig } from './live-rig.js';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { LivingPuppet } from './LivingPuppet.js';
import { MAID_DATA_URI, CHIBI_DATA_URI, ANSWERING_DATA_URI, BAIFAN_DATA_URI, GETIT_DATA_URI, SAJIAO_DATA_URI, THINK1_DATA_URI, THINK2_DATA_URI, THINK3_DATA_URI, THINK4_DATA_URI, THINK5_DATA_URI, DIZZY_DATA_URI, SMUG_DATA_URI, SHY_DATA_URI, ANGRY_DATA_URI, SURPRISED_DATA_URI, PROUD_DATA_URI, HAPPY_DATA_URI, CARRY_DATA_URI, PEEK_DATA_URI, } from './assets-data.js';
/** One shared measuring context and a per-font cache of character widths. */
let dialogueMeasure = null;
function dialogueCharWidth(font) {
    if (!dialogueMeasure) {
        const context = typeof document.createElement === 'function' ? document.createElement('canvas').getContext('2d') : null;
        dialogueMeasure = { context, font: 0, widths: new Map() };
    }
    const cache = dialogueMeasure;
    if (!cache.context)
        return undefined;
    if (cache.font !== font) {
        cache.font = font;
        cache.widths.clear();
        cache.context.font = font + 'px "Microsoft YaHei", "PingFang SC", sans-serif';
    }
    return character => {
        let width = cache.widths.get(character);
        if (width === undefined) {
            width = cache.context.measureText(character).width;
            cache.widths.set(character, width);
        }
        return width;
    };
}
/** Measured pagination; code blocks stay whole so they can scroll inside their card. */
function paginateDialogue(text, width, height, font) {
    const charWidth = dialogueCharWidth(font);
    return dialogueBlocks(text).flatMap(block => block.kind === 'code' ? ['```' + (block.language || '') + '\n' + block.text + '\n```'] : paginateText(block.text, width, height, font, charWidth));
}
/** Artwork for reactions and per-page expressions. */
const EXPRESSION_SRC = {
    smug: SMUG_DATA_URI, shy: SHY_DATA_URI, angry: ANGRY_DATA_URI, surprised: SURPRISED_DATA_URI,
    proud: PROUD_DATA_URI, happy: HAPPY_DATA_URI, sajiao: SAJIAO_DATA_URI, getit: GETIT_DATA_URI,
};
const COMPOSER_SELECTOR = '[data-composer-card], [data-composer-seat]';
/** The widget's slide to the edge (CSS .7s): the picture turns into the peeking one when she arrives. */
const PEEK_WALK_MS = 720;
/** Browser frame scheduler with a synchronous fallback (tests, very old hosts). */
const nextFrame = (callback) => {
    if (typeof requestAnimationFrame === 'function')
        requestAnimationFrame(() => callback());
    else
        callback();
};
/** Fields the views actually draw; a status update that changes none of them does not re-render. */
function statusRenderKey(s) {
    return [s.state, s.form, s.pose, s.speech, s.reasoningText.length, s.reasoningText.slice(-24), s.latestDialogue.length, s.latestDialogue.slice(-24),
        s.isReasoning, s.isStreaming, s.isInputFocused, s.isGalGameMode, s.autoGalGameOnChat,
        s.balancesKnown, s.toppedUpBalance, s.grantedBalance, s.quotaErrorKey,
        s.hostBalance?.status, s.hostBalance?.updatedAt, s.hostBalance ? JSON.stringify([s.hostBalance.toppedUp, s.hostBalance.granted]) : ''].join('\u0001');
}
const dockIcon = (d) => _jsx("svg", { viewBox: "0 0 16 16", width: "14", height: "14", "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: d }) });
export function PetOverlay({ stateMachine }) {
    const [preferences, setPreferences] = useState(readPreferences);
    const t = (zh, en) => preferences.language === 'en' ? en : zh;
    const update = (patch) => setPreferences(prev => ({ ...prev, ...patch }));
    const [status, setStatus] = useState(() => stateMachine.getStatus());
    const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
    const initialStage = spriteGeometry('Maid', window.innerHeight, preferences.scale);
    const [position, setPosition] = useState(() => clampPet(preferences.x ?? window.innerWidth - initialStage.stageWidth - 24, preferences.y ?? window.innerHeight - initialStage.stageHeight - 30, initialStage.stageWidth, initialStage.stageHeight, window.innerWidth, window.innerHeight));
    const [composerTop, setComposerTop] = useState(undefined);
    // While she peeks from the right: keep the visible head and forearm clear of the composer.
    const [peekComposer, setPeekComposer] = useState(undefined);
    const [uiHidden, setUiHidden] = useState(false);
    const [logOpen, setLogOpen] = useState(false);
    const [history, setHistory] = useState([]);
    const [revealed, setRevealed] = useState(0);
    const [toast, setToast] = useState('');
    const [affection, setAffection] = useState('');
    // v0.6.0 expressions: short reactions (pat, answer finished, announcements, idle glances)
    // and the theatre's per-page expression with its mood mark.
    const [reaction, setReaction] = useState(null);
    const [pageEmotion, setPageEmotion] = useState({ emotion: 'neutral', emote: null, key: 0 });
    const [liveSupported] = useState(() => LiveRig.supported());
    const emoteSeq = useRef(0);
    // Touch (touch.ts): poke her quickly and she gets puzzled, then frustrated; her tail is sensitive.
    const pokes = useRef(new PokeCounter());
    const chestTouchAt = useRef(-Infinity);
    const tailPatience = useRef(new TailPatience());
    const [poke, setPoke] = useState('');
    const [clock, setClock] = useState(() => Date.now());
    const voiceRef = useRef(null);
    if (!voiceRef.current)
        voiceRef.current = new PetVoice();
    const previousPose = useRef('');
    const revealIdentity = useRef({ page: -1, text: '' });
    const startedAt = useRef(0);
    const lunchDay = useRef('');
    const [pageBox, setPageBox] = useState({ width: 760, height: 140 });
    const [doctor, setDoctor] = useState('');
    const [ghost, setGhost] = useState(false);
    const [petHidden, setPetHidden] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [bubbleHidden, setBubbleHidden] = useState(false);
    const wheelTime = useRef(0);
    const [foreground, setForeground] = useState(true);
    const [reduceMotion, setReduceMotion] = useState(false);
    const previousStream = useRef(false);
    const [isDragging, setIsDragging] = useState(false);
    // Picked up (a drag that really moves): where she was grabbed, and whether she has been held a while.
    const [held, setHeld] = useState(null);
    const [heldLong, setHeldLong] = useState(false);
    const [landed, setLanded] = useState(false);
    const liftedAt = useRef(0);
    const carrySequence = useRef(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [sizeAnchor, setSizeAnchor] = useState(null);
    const currentSizeLayout = useRef(null);
    const [isBouncing, setIsBouncing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [isThoughtBubbleVisible, setIsThoughtBubbleVisible] = useState(true);
    const [tierAnnounce, setTierAnnounce] = useState(null);
    const [panelFlipping, setPanelFlipping] = useState(false);
    const [theatrePanel, setTheatrePanel] = useState(null);
    const [skipping, setSkipping] = useState(false);
    const sideRef = useRef(undefined);
    const statusKeyRef = useRef('');
    const statusFrameRef = useRef(null);
    const dragFrameRef = useRef(null);
    const previousTierRef = useRef(null);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef(null);
    const wanderPositionRef = useRef(position);
    wanderPositionRef.current = position;
    const [wanderRequest, setWanderRequest] = useState(0);
    const pendingWanderRef = useRef(null);
    const wanderFinishRef = useRef(null);
    const wanderTimerRef = useRef(null);
    const delayedTimers = useRef(new Set());
    const menuTimerRef = useRef(null);
    const textScrollRef = useRef(null);
    const thoughtScrollRef = useRef(null);
    const panelRef = useRef(null);
    const followThoughtRef = useRef(true);
    const followTextRef = useRef(true);
    const lastDialogueRef = useRef('');
    const spokenStreamRef = useRef('');
    const spokenRevealRef = useRef(0);
    /** Latest geometry for event handlers registered once per drag. */
    const constrainRef = useRef((x, y) => ({ x, y }));
    useEffect(() => () => {
        delayedTimers.current.forEach(timer => clearTimeout(timer));
        if (menuTimerRef.current)
            clearTimeout(menuTimerRef.current);
    }, []);
    const later = (callback, delay) => {
        const timer = setTimeout(() => {
            delayedTimers.current.delete(timer);
            callback();
        }, delay);
        delayedTimers.current.add(timer);
        return timer;
    };
    // Chibi form is paused: render maiden even if an older preference stored chibi.
    useEffect(() => {
        stateMachine.setForm(effectiveForm(preferences.form));
        stateMachine.setAutoGalGameOnChat(preferences.autoGalGame);
    }, [stateMachine]);
    useEffect(() => {
        const timer = setTimeout(() => savePreferences({ ...preferences, form: FEATURES.chibiForm ? status.form : preferences.form, autoGalGame: status.autoGalGameOnChat, x: position.x, y: position.y }), 250);
        return () => clearTimeout(timer);
    }, [preferences, status.form, status.autoGalGameOnChat, position]);
    const petName = preferences.petName.trim() || '大肥鱼';
    const userName = preferences.userName.trim() || '你';
    /** Lines address the user as 主人 and call her 大肥鱼; both follow the names set in Settings. */
    const address = (text) => text.replaceAll('主人', userName).replaceAll('大肥鱼', petName);
    const companionSpeech = preferences.language === 'zh' ? status.speech :
        status.pose === 'sajiao' ? 'Hey, stay with me a little longer!' :
            ({ IDLE: 'I’m right here with you.', PEEKING: 'I’m listening. What’s on your mind?', REASONING: 'Let me think this through…', ANSWERING: 'Putting the answer together for you…', EATING: 'Time for a little rice break!', WANDERING: 'Taking a little stroll…' }[status.state]);
    const phaseLabel = ({ IDLE: t('待机', 'Ready'), PEEKING: t('倾听中', 'Listening'), REASONING: t('思考中', 'Thinking'), ANSWERING: t('回答中', 'Answering'), EATING: t('休息中', 'Resting'), WANDERING: t('散步中', 'Strolling') }[status.state]);
    // ---- Live2D model (imported by the user, kept in IndexedDB) -----------------
    const [live2dRecord, setLive2dRecord] = useState(null);
    const [live2dState, setLive2dState] = useState({ state: 'checking' });
    const [live2dAspect, setLive2dAspect] = useState(null);
    const [live2dFailure, setLive2dFailure] = useState(null);
    const [live2dIncluded] = useState(() => live2dBundled());
    const live2dSource = useMemo(() => live2dRecord ? live2dSourceFor(live2dRecord) : null, [live2dRecord]);
    useEffect(() => {
        let alive = true;
        if (!live2dIncluded) {
            setLive2dState({ state: 'none' });
            return;
        }
        void loadLive2DModel().then(record => {
            if (!alive)
                return;
            setLive2dRecord(record);
            setLive2dState(record ? { state: 'ready', name: record.name, bytes: record.bytes } : { state: 'none' });
        });
        return () => { alive = false; };
    }, []);
    // ---- Geometry -------------------------------------------------------------
    const renderForm = FEATURES.chibiForm ? status.form : 'maiden';
    const isMaiden = renderForm === 'maiden';
    const live2dOn = Boolean(preferences.live2d && live2dSource && !live2dFailure && isMaiden && live2dIncluded);
    // Peeking and being carried have their own pictures; the Live2D model plays those itself.
    // The picture walks to the right edge as herself first and only becomes the peeking picture once she
    // reaches it (peekArrived); coming back she is herself again straight away.
    const peekWanted = preferences.docked && !isSettingsOpen && isMaiden && !live2dOn;
    const [peekArrived, setPeekArrived] = useState(false);
    useEffect(() => {
        if (!peekWanted) {
            setPeekArrived(false);
            return;
        }
        const timer = setTimeout(() => setPeekArrived(true), PEEK_WALK_MS);
        return () => clearTimeout(timer);
    }, [peekWanted]);
    const peekArt = peekWanted && peekArrived;
    const resolveCharacter = () => {
        if (!isMaiden)
            return [CHIBI_DATA_URI, 'DaFeiYu'];
        if (peekArt)
            return [PEEK_DATA_URI, 'peek'];
        if (affection === 'dizzy' && !status.isStreaming)
            return [DIZZY_DATA_URI, 'Dizzy'];
        const busy = status.isStreaming || status.isReasoning;
        // Carried: startled, then flustered. Thinking and answering keep their own pose.
        // (The Live2D model keeps reading the expression poses: startled, then flustered.)
        if (held && !busy)
            return !live2dOn ? [CARRY_DATA_URI, 'carry'] : heldLong ? [EXPRESSION_SRC.shy, 'shy'] : [EXPRESSION_SRC.surprised, 'surprised'];
        if (reaction && (!busy || affection === 'pat' || affection === 'tail') && EXPRESSION_SRC[reaction.pose])
            return [EXPRESSION_SRC[reaction.pose], reaction.pose];
        if (affection === 'pat')
            return [SAJIAO_DATA_URI, 'sajiao'];
        if (status.isGalGameMode && !busy && pageEmotion.emotion !== 'neutral') {
            const pose = EMOTION_POSE[pageEmotion.emotion];
            return [EXPRESSION_SRC[pose], pose];
        }
        if (status.pose === 'sajiao')
            return [SAJIAO_DATA_URI, 'sajiao'];
        if (status.isStreaming)
            return [ANSWERING_DATA_URI, 'Answering'];
        if (status.pose === 'eating' || status.state === 'EATING')
            return [BAIFAN_DATA_URI, 'baifan'];
        if (status.pose === 'answering' || status.state === 'ANSWERING')
            return [ANSWERING_DATA_URI, 'Answering'];
        if (status.pose === 'getit')
            return [GETIT_DATA_URI, 'getit'];
        if (status.pose === 'think1')
            return [THINK1_DATA_URI, 'Think1'];
        if (status.pose === 'think2')
            return [THINK2_DATA_URI, 'Think2'];
        if (status.pose === 'think3')
            return [THINK3_DATA_URI, 'Think3'];
        if (status.pose === 'think4')
            return [THINK4_DATA_URI, 'Think4'];
        if (status.pose === 'think5')
            return [THINK5_DATA_URI, 'Think5'];
        if (status.state === 'REASONING')
            return [THINK1_DATA_URI, 'Think1'];
        return [MAID_DATA_URI, 'Maid'];
    };
    const [currentImgSrc, hitPose] = resolveCharacter();
    // Once the model has framed itself, the box follows its proportions (the illustration shows while it loads).
    const geometry = live2dOn ? live2dWidgetGeometry(viewport.width, viewport.height, preferences.scale * preferences.live2dWidgetScale, live2dAspect) : spriteGeometry(hitPose, viewport.height, preferences.scale);
    const live2dSleepy = preferences.reminders && new Date(clock).getHours() >= 1 && new Date(clock).getHours() < 5 && status.state === 'IDLE';
    const live2dLook = useMemo(() => live2dLookFor(hitPose, { sleepy: live2dSleepy, state: status.state, held: Boolean(held), heldKey: held?.key, guardChest: poke === 'chest', edgePeek: preferences.docked && !isSettingsOpen && !status.isGalGameMode }), [hitPose, live2dSleepy, status.state, held, poke, preferences.docked, isSettingsOpen, status.isGalGameMode]);
    const live2dBinding = useMemo(() => live2dOn && live2dSource ? {
        source: live2dSource,
        scale: status.isGalGameMode ? preferences.live2dTheatreScale : 1,
        look: live2dLook,
        powerSave: preferences.powerSave,
        onReady: aspect => setLive2dAspect(aspect),
        onFail: reason => {
            setLive2dFailure(reason);
            setLive2dState(previous => ({ ...previous, state: 'failed', message: live2dFailureText(reason) }));
        },
    } : undefined, [live2dOn, live2dSource, live2dLook, status.isGalGameMode, preferences.live2dTheatreScale, preferences.powerSave]);
    const stageW = geometry.stageWidth;
    const stageH = geometry.stageHeight;
    // Keep the free position intact, including while opening settings.
    const docked = preferences.docked && !isSettingsOpen;
    const petBox = docked
        ? peekArt
            ? peekArtPosition(position.y, { width: stageW, height: stageH }, geometry, viewport.width, viewport.height, { composer: peekComposer })
            : peekWanted
                // On her way: her usual picture, walking until her side touches the right edge.
                ? { x: Math.round(viewport.width - geometry.imageLeft - geometry.imageWidth), y: position.y }
                : rightPeekPosition(position.y, stageW, geometry.imageHeight, viewport.width, viewport.height, { composer: peekComposer })
        : position;
    const groupInput = {
        viewportWidth: viewport.width, viewportHeight: viewport.height, composerTop,
        pet: { x: petBox.x, y: petBox.y, width: stageW, height: stageH },
        previousSide: sideRef.current, petPinned: docked,
    };
    const group = isSettingsOpen ? sizeAnchor
        ? layoutResizedGroup(groupInput, sizeAnchor.layout, sizeAnchor.bottom)
        : layoutGroup(groupInput) : null;
    const petPos = group ? group.pet : petBox;
    currentSizeLayout.current = group ? { layout: group, bottom: petPos.y + stageH } : null;
    useEffect(() => { setSizeAnchor(null); }, [isSettingsOpen, viewport.width, viewport.height, composerTop, docked]);
    const imageTop = stageH - geometry.imageHeight;
    constrainRef.current = (x, y) => {
        const free = clampPet(x, y, stageW, stageH, viewport.width, viewport.height);
        if (!isSettingsOpen || !groupFits(viewport.width, viewport.height, stageW, composerTop))
            return free;
        const placed = placeGroupX(free.x, stageW, viewport.width, sideRef.current);
        sideRef.current = placed.side;
        return { x: placed.x, y: free.y };
    };
    const togglePeek = useCallback(() => {
        if (status.isGalGameMode || isDraggingRef.current)
            return;
        // Shaken dizzy, she cannot go anywhere until it wears off (coming back is always allowed).
        if (affection === 'dizzy' && !preferences.docked) {
            flash(t('大肥鱼现在晕了，没法动呢……', '大肥鱼 is too dizzy to move right now…'));
            return;
        }
        if (!preferences.docked)
            found('peek');
        stateMachine.setWandering(false);
        pendingWanderRef.current = null;
        if (wanderFinishRef.current) {
            clearTimeout(wanderFinishRef.current);
            wanderFinishRef.current = null;
        }
        setIsMenuOpen(false);
        setIsSettingsOpen(false);
        setGhost(false);
        setPreferences(previous => ({ ...previous, docked: !previous.docked }));
    }, [status.isGalGameMode, stateMachine, affection, preferences.docked, preferences.language]);
    // A side switch slides the panel across instead of teleporting it.
    const lastPanelSide = useRef(undefined);
    useEffect(() => {
        if (!group) {
            lastPanelSide.current = undefined;
            return;
        }
        if (lastPanelSide.current && lastPanelSide.current !== group.side) {
            setPanelFlipping(true);
            later(() => setPanelFlipping(false), 260);
        }
        lastPanelSide.current = group.side;
    }, [group?.side, isSettingsOpen]);
    // Keep hysteresis and commit group adjustments so closing the panel does not jump.
    useEffect(() => {
        if (!group)
            return;
        sideRef.current = group.side;
        if (!preferences.docked && !isDraggingRef.current && (group.pet.x !== position.x || group.pet.y !== position.y))
            setPosition(group.pet);
    }, [group?.side, group?.mode, group?.pet.x, group?.pet.y, docked, preferences.docked]);
    useEffect(() => {
        const resize = () => {
            setViewport(previous => previous.width === window.innerWidth && previous.height === window.innerHeight ? previous : { width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);
    // Size steps and window changes keep the full portrait on screen.
    useEffect(() => {
        setPosition(previous => {
            const next = clampPet(previous.x, previous.y, stageW, stageH, viewport.width, viewport.height);
            return next.x === previous.x && next.y === previous.y ? previous : next;
        });
    }, [stageW, stageH, viewport.width, viewport.height]);
    useEffect(() => {
        if (!docked) {
            setPeekComposer(undefined);
            return;
        }
        let frame;
        const measure = () => {
            const box = document.querySelector(COMPOSER_SELECTOR)?.getBoundingClientRect();
            const next = box && box.width > 0 && box.height > 0 ? { left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top), bottom: Math.round(box.bottom) } : undefined;
            setPeekComposer(previous => previous && next && previous.left === next.left && previous.right === next.right && previous.top === next.top && previous.bottom === next.bottom ? previous : next);
        };
        const later = () => { if (frame)
            clearTimeout(frame); frame = setTimeout(measure, 60); };
        measure();
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(later) : null;
        const composer = document.querySelector(COMPOSER_SELECTOR);
        if (composer)
            observer?.observe(composer);
        // The host may swap the composer (new session, conversation): check again now and then, cheaply.
        const timer = setInterval(later, 3000);
        window.addEventListener('resize', later);
        return () => { if (frame)
            clearTimeout(frame); observer?.disconnect(); clearInterval(timer); window.removeEventListener('resize', later); };
    }, [docked]);
    // Settings: composer avoidance, outside click, Escape, panel measurement.
    useEffect(() => {
        if (!isSettingsOpen)
            return;
        const place = () => {
            const top = document.querySelector(COMPOSER_SELECTOR)?.getBoundingClientRect().top;
            setComposerTop(top !== undefined && Number.isFinite(top) && top > 0 ? Math.round(top) : undefined);
        };
        place();
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
        const composer = document.querySelector(COMPOSER_SELECTOR);
        if (composer)
            observer?.observe(composer);
        window.addEventListener('resize', place);
        const dismiss = (event) => { if (event.target instanceof Element && !event.target.closest('[data-whale-pet]'))
            setIsSettingsOpen(false); };
        const escape = (event) => { if (event.key === 'Escape' && !event.isComposing)
            setIsSettingsOpen(false); };
        window.addEventListener('pointerdown', dismiss, true);
        window.addEventListener('keydown', escape);
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', place);
            window.removeEventListener('pointerdown', dismiss, true);
            window.removeEventListener('keydown', escape);
        };
    }, [isSettingsOpen, preferences.language, preferences.fontSize]);
    useEffect(() => {
        const down = (event) => {
            if (!event.defaultPrevented && matchesPeekShortcut(event, preferences.peekShortcut)) {
                event.preventDefault();
                togglePeek();
                return;
            }
            if (event.key === 'Alt')
                setGhost(true);
            if (event.isComposing || !event.altKey || event.ctrlKey || event.metaKey)
                return;
            if (event.key.toLowerCase() === 'w') {
                event.preventDefault();
                setPetHidden(hidden => !hidden);
            }
            if (event.key.toLowerCase() === 't') {
                event.preventDefault();
                stateMachine.toggleGalGameMode();
            }
        };
        const up = (event) => { if (event.key === 'Alt')
            setGhost(false); };
        const reset = () => setGhost(false);
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', reset);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', reset); };
    }, [stateMachine, preferences.peekShortcut, togglePeek]);
    // At most one render per frame, and only when something drawn changed.
    useEffect(() => {
        const unsubscribe = stateMachine.subscribe(next => {
            const key = statusRenderKey(next);
            if (key === statusKeyRef.current)
                return;
            statusKeyRef.current = key;
            const pending = statusFrameRef.current;
            statusFrameRef.current = next;
            if (pending)
                return;
            nextFrame(() => {
                const latest = statusFrameRef.current;
                statusFrameRef.current = null;
                if (latest)
                    setStatus(latest);
            });
        });
        return unsubscribe;
    }, [stateMachine]);
    useEffect(() => {
        if (!status.isGalGameMode) {
            setUiHidden(false);
            setLogOpen(false);
        }
    }, [status.isGalGameMode]);
    useEffect(() => {
        const measure = () => {
            const box = textScrollRef.current;
            if (box)
                setPageBox(previous => previous.width === box.clientWidth - 52 && previous.height === box.clientHeight - 12 ? previous : { width: box.clientWidth - 52, height: box.clientHeight - 12 });
        };
        measure();
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        if (textScrollRef.current)
            observer?.observe(textScrollRef.current);
        window.addEventListener('resize', measure);
        return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
    }, [status.isGalGameMode, preferences.fontSize, preferences.reading, expanded, uiHidden]);
    useEffect(() => {
        const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        const motion = () => setReduceMotion(media?.matches ?? false);
        const visibility = () => { const active = !document.hidden && document.hasFocus(); setForeground(active); if (!active)
            voiceRef.current?.silence(); };
        motion();
        visibility();
        media?.addEventListener('change', motion);
        window.addEventListener('focus', visibility);
        window.addEventListener('blur', visibility);
        document.addEventListener('visibilitychange', visibility);
        return () => { media?.removeEventListener('change', motion); window.removeEventListener('focus', visibility); window.removeEventListener('blur', visibility); document.removeEventListener('visibilitychange', visibility); };
    }, [stateMachine]);
    useEffect(() => {
        if (previousStream.current && !status.isStreaming && !status.isReasoning && !foreground && preferences.notifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const notification = new Notification(petName, { body: t('回答完成啦，回来看看吧。', 'Your answer is ready.'), tag: 'whale-finished' });
            notification.onclick = () => { window.focus(); notification.close(); };
        }
        previousStream.current = status.isStreaming;
    }, [status.isStreaming, status.isReasoning, foreground, preferences.notifications]);
    useEffect(() => {
        if (status.isGalGameMode)
            document.body.classList.add('dsh-galgame-mode');
        else
            document.body.classList.remove('dsh-galgame-mode');
        return () => { document.body.classList.remove('dsh-galgame-mode'); };
    }, [status.isGalGameMode]);
    // ---- Theatre reading ------------------------------------------------------
    // Without an answer yet the theatre shows her own line, with the user's chosen names.
    const dialogueSource = status.latestDialogue && status.latestDialogue !== status.speech ? status.latestDialogue : preferences.language === 'zh' ? address(companionSpeech) : companionSpeech;
    // Pages exist only on the theatre stage; the desktop companion never needs them.
    const dialoguePages = useMemo(() => status.isGalGameMode ? paginateDialogue(dialogueSource, pageBox.width, pageBox.height, preferences.fontSize) : [dialogueSource], [status.isGalGameMode, dialogueSource, pageBox, preferences.fontSize]);
    useEffect(() => {
        const cur = status.latestDialogue || status.speech;
        if (cur !== lastDialogueRef.current) {
            if (!lastDialogueRef.current || !cur.startsWith(lastDialogueRef.current.slice(0, 30))) {
                setCurrentPageIndex(0);
                followTextRef.current = true;
            }
            lastDialogueRef.current = cur;
        }
    }, [status.latestDialogue, status.speech]);
    useEffect(() => {
        if (!status.isGalGameMode)
            return;
        const close = (event) => {
            const target = event.target;
            // Escape always works (even from a focused button or slider); other keys leave form controls alone.
            if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey)
                return;
            if (event.key !== 'Escape' && target?.closest('input, textarea, select, button, summary, [contenteditable="true"]'))
                return;
            if (event.key !== 'Escape' && event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && !['l', 'a', 'h', 'm'].includes(event.key.toLowerCase()))
                return;
            if (event.key !== 'Escape') {
                if (target?.closest('[role="button"], [role="log"]'))
                    return;
                event.preventDefault();
                if (event.key === 'ArrowLeft')
                    setCurrentPageIndex(i => Math.max(0, i - 1));
                else if (event.key.toLowerCase() === 'a')
                    update({ autoAdvance: !preferences.autoAdvance });
                else if (event.key.toLowerCase() === 'l') {
                    setHistory(readConversationLog());
                    setLogOpen(true);
                }
                else if (event.key.toLowerCase() === 'm')
                    toggleMute();
                else if (event.key.toLowerCase() === 'h')
                    setUiHidden(value => !value);
                else
                    handleAdvancePage();
                return;
            }
            const more = document.querySelector('[data-whale-pet] details[open]');
            if (more) {
                more.removeAttribute('open');
                return;
            }
            if (theatrePanel) {
                setTheatrePanel(null);
                return;
            }
            if (uiHidden)
                setUiHidden(false);
            else if (logOpen)
                setLogOpen(false);
            else
                stateMachine.setGalGameMode(false);
        };
        window.addEventListener('keydown', close);
        return () => window.removeEventListener('keydown', close);
    }, [status.isGalGameMode, stateMachine, uiHidden, logOpen, revealed, currentPageIndex, dialoguePages, preferences.autoAdvance, preferences.reading, preferences.muted, theatrePanel]);
    useEffect(() => {
        if (status.isReasoning) {
            followThoughtRef.current = true;
            setIsThoughtBubbleVisible(true);
        }
    }, [status.isReasoning]);
    useEffect(() => {
        if (thoughtScrollRef.current && followThoughtRef.current)
            thoughtScrollRef.current.scrollTop = thoughtScrollRef.current.scrollHeight;
    }, [status.reasoningText]);
    // Pages start at the top; full reading follows new text only while the reader is at the bottom.
    useEffect(() => {
        const box = textScrollRef.current;
        if (!status.isGalGameMode || !box)
            return;
        if (preferences.reading === 'pages')
            box.scrollTop = 0;
        else if (followTextRef.current)
            box.scrollTop = box.scrollHeight;
    }, [currentPageIndex, status.latestDialogue, status.isGalGameMode, preferences.reading]);
    useEffect(() => () => voiceRef.current?.dispose(), []);
    // ---- Voice ----------------------------------------------------------------
    const voiceAllowed = !preferences.muted && !preferences.quiet && preferences.volume > 0 && foreground && !uiHidden && !logOpen;
    useEffect(() => { voiceRef.current?.setVolume(preferences.volume); }, [preferences.volume]);
    // ---- Theatre scene & music -------------------------------------------------
    const bgmRef = useRef(null);
    if (!bgmRef.current)
        bgmRef.current = new BgmPlayer();
    const [pageVisible, setPageVisible] = useState(true);
    const [customScene, setCustomScene] = useState(null);
    const [customSceneChecked, setCustomSceneChecked] = useState(false);
    const [customBgmName, setCustomBgmName] = useState(null);
    const [customBgmVersion, setCustomBgmVersion] = useState(0);
    const [bgmPlaying, setBgmPlaying] = useState(false);
    const [sceneLayers, setSceneLayers] = useState({ a: '', b: '', front: 'a' });
    const sceneUrlCache = useRef(new Map());
    const customSceneRef = useRef(null);
    customSceneRef.current = customScene?.url ?? null;
    const releaseUrl = (url) => {
        if (!url || !url.startsWith('blob:'))
            return;
        try {
            URL.revokeObjectURL(url);
        }
        catch { /* not a blob URL here */ }
    };
    /** Painted scenes become short blob: URLs once, so re-renders never diff a 60 KB data URI. */
    const paintedSceneUrl = (id) => {
        const cached = sceneUrlCache.current.get(id);
        if (cached !== undefined)
            return cached;
        let url = '';
        try {
            url = URL.createObjectURL(new Blob([sceneSvg(id)], { type: 'image/svg+xml' }));
        }
        catch {
            url = sceneUrl(id, null);
        }
        sceneUrlCache.current.set(id, url);
        return url;
    };
    const flash = (message) => { setToast(message); later(() => setToast(''), 2800); };
    useEffect(() => {
        let alive = true;
        void loadMedia('scene').then(record => {
            if (!alive)
                return;
            if (record) {
                try {
                    setCustomScene({ url: URL.createObjectURL(record.blob), name: record.name });
                }
                catch { /* object URLs unavailable */ }
            }
            setCustomSceneChecked(true);
        });
        void loadMedia('bgm').then(async (record) => {
            if (!alive || !record)
                return;
            try {
                bgmRef.current?.setCustom(await record.blob.arrayBuffer());
                setCustomBgmName(record.name);
            }
            catch { /* unreadable file */ }
        });
        // Page hide / unload: stop at once and release the audio device.
        const hide = () => bgmRef.current?.stopNow();
        const visibility = () => setPageVisible(!document.hidden);
        window.addEventListener('pagehide', hide);
        document.addEventListener('visibilitychange', visibility);
        return () => {
            alive = false;
            window.removeEventListener('pagehide', hide);
            document.removeEventListener('visibilitychange', visibility);
            bgmRef.current?.dispose();
            sceneUrlCache.current.forEach(releaseUrl);
            sceneUrlCache.current.clear();
            releaseUrl(customSceneRef.current);
        };
    }, []);
    // Leaving the theatre closes its menus and stops skipping; a shuffle picks a new scene on entry.
    useEffect(() => {
        if (!status.isGalGameMode) {
            setTheatrePanel(null);
            setSkipping(false);
            return;
        }
        if (preferences.sceneShuffle)
            update({ scene: shuffleScene(preferences.scene, Boolean(customScene)) });
    }, [status.isGalGameMode]);
    const sceneHour = new Date(clock).getHours();
    const chosenScene = preferences.scene === 'auto' ? timeOfDayScene(sceneHour) : preferences.scene;
    const activeScene = chosenScene === 'custom' && !customScene && customSceneChecked ? 'study' : chosenScene;
    const immersive = activeScene !== 'none';
    useEffect(() => {
        document.body?.classList?.toggle('dsh-galgame-immersive', status.isGalGameMode && immersive);
        return () => { document.body?.classList?.remove('dsh-galgame-immersive'); };
    }, [status.isGalGameMode, immersive]);
    const sceneTarget = !status.isGalGameMode || !immersive ? '' : activeScene === 'custom' ? customScene?.url ?? '' : paintedSceneUrl(activeScene);
    // Crossfade: decode the next picture first, then swap layers, so a switch never flashes white or half-loaded.
    useEffect(() => {
        if (!status.isGalGameMode)
            return;
        const frontUrl = sceneLayers.front === 'a' ? sceneLayers.a : sceneLayers.b;
        if (sceneTarget === frontUrl)
            return;
        let cancelled = false;
        const swap = () => { if (!cancelled)
            setSceneLayers(previous => previous.front === 'a' ? { ...previous, b: sceneTarget, front: 'b' } : { ...previous, a: sceneTarget, front: 'a' }); };
        if (!sceneTarget || typeof Image !== 'function') {
            swap();
            return;
        }
        const image = new Image();
        image.src = sceneTarget;
        const ready = typeof image.decode === 'function' ? image.decode() : new Promise(resolve => { image.onload = () => resolve(); image.onerror = () => resolve(); });
        ready.then(swap, swap);
        return () => { cancelled = true; };
    }, [status.isGalGameMode, sceneTarget]);
    // Music follows the theatre: it fades in on entry and fades out on exit or when the page is hidden.
    const wantBgm = status.isGalGameMode && preferences.bgmOn && pageVisible;
    useEffect(() => {
        const bgm = bgmRef.current;
        if (!bgm)
            return;
        if (!wantBgm) {
            if (bgm.playing)
                bgm.fadeOut();
            setBgmPlaying(false);
            return;
        }
        let alive = true;
        void bgm.play(preferences.bgmTrack, preferences.bgmVolume).then(ok => {
            if (!alive)
                return;
            setBgmPlaying(ok);
            if (!ok && preferences.bgmTrack === 'custom') {
                update({ bgmTrack: 'daily' });
                flash(t('这首本地音乐无法播放，已换回内置曲目', 'That file could not be played; switched back to a built-in track'));
            }
        });
        return () => { alive = false; };
    }, [wantBgm, preferences.bgmTrack, customBgmVersion]);
    useEffect(() => { bgmRef.current?.setVolume(preferences.bgmVolume); }, [preferences.bgmVolume]);
    // ---- Discoveries: the interaction gallery and the first-run guide ---------------
    const [discoveries, setDiscoveries] = useState(readDiscoveries);
    const [guideDone, setGuideDone] = useState([]);
    const [guideThanks, setGuideThanks] = useState(false);
    const onboardingRef = useRef(preferences.onboardingDone);
    onboardingRef.current = preferences.onboardingDone;
    /** She did something for the first time (gallery), or a guide step was just carried out. */
    const found = (id) => {
        setDiscoveries(known => { const next = discover(known, id, Date.now()); if (next !== known)
            saveDiscoveries(next); return next; });
        if (!onboardingRef.current && GUIDE_STEPS.includes(id))
            setGuideDone(done => done.includes(id) ? done : [...done, id]);
    };
    const guideAt = guideStep(guideDone);
    useEffect(() => {
        if (preferences.onboardingDone || guideAt < GUIDE_STEPS.length)
            return;
        // All three done: she thanks the user with a bow, and the card goes away.
        react('happy', 'sparkle', 3600);
        setBubbleHidden(false);
        setGuideThanks(true);
        later(() => { setGuideThanks(false); setGuideDone([]); update({ onboardingDone: true }); }, 3600);
    }, [guideAt, preferences.onboardingDone]);
    useEffect(() => { if (status.isGalGameMode)
        found('theatre'); }, [status.isGalGameMode]);
    useEffect(() => { if (status.state === 'EATING')
        found('meal'); }, [status.state]);
    // ---- Expressions & reactions (v0.6.0) ----------------------------------------
    const react = (pose, emote, ms) => {
        const key = ++emoteSeq.current;
        setReaction({ pose, emote, until: Date.now() + ms, key });
        later(() => setReaction(current => current && current.key === key ? null : current), ms);
    };
    useEffect(() => {
        setHeldLong(false);
        if (!held)
            return;
        const timer = setTimeout(() => setHeldLong(true), 2500);
        return () => clearTimeout(timer);
    }, [held]);
    // Answer finished: an expression read from its last lines, then the usual rice break.
    const finishedStream = useRef(false);
    useEffect(() => {
        if (status.isStreaming) {
            finishedStream.current = true;
            return;
        }
        if (!finishedStream.current || status.isReasoning)
            return;
        finishedStream.current = false;
        // Finished while DSH was not in front: mark the window title and greet the user when they come back.
        const here = typeof document === 'undefined' || (!document.hidden && document.hasFocus());
        if (answerNotice.current.finish(here, preferences.answerNotice) === 'wait')
            document.title = markTitle(document.title, true, preferences.language === 'en');
        if (status.isGalGameMode)
            return;
        const tail = status.latestDialogue.slice(-400);
        if (status.quotaErrorKey)
            return;
        let lastLowDay = null;
        try {
            lastLowDay = localStorage.getItem(LOW_BALANCE_DAY_KEY);
        }
        catch { /* storage may be disabled */ }
        if (here && !preferences.quiet && lowBalanceDue(walletLow.current, lastLowDay, Date.now())) {
            try {
                localStorage.setItem(LOW_BALANCE_DAY_KEY, balanceDay(Date.now()));
            }
            catch { /* said once this session instead */ }
            walletLow.current = false;
            react('surprised', 'sweat', 4200);
            setBubbleHidden(false);
            setBalanceLine(t('余额快见底了……要记得充值哦。', 'Your balance is running low…'));
            later(() => setBalanceLine(''), 6000);
            return;
        }
        const emotion = detectEmotion(tail);
        if (emotion === 'neutral')
            react('proud', 'sparkle', 2600);
        else
            react(EMOTION_POSE[emotion], emoteFor(emotion, tail), 2600);
    }, [status.isStreaming, status.isReasoning]);
    // Back in DSH with an unseen answer: the title mark goes, she waves, and (if chosen) says one short line.
    const answerNotice = useRef(new AnswerNotice());
    // Balance: the line she says about it, the chip's blink and its detail popover.
    const [balanceLine, setBalanceLine] = useState('');
    const [chipFlash, setChipFlash] = useState(false);
    const [walletOpen, setWalletOpen] = useState(false);
    const [walletAsked, setWalletAsked] = useState(false);
    const walletLow = useRef(false);
    const seenQuotaError = useRef(null);
    useEffect(() => {
        const key = status.quotaErrorKey;
        if (!key || seenQuotaError.current === key)
            return;
        seenQuotaError.current = key;
        window.dispatchEvent(new Event('dsh-whale-pet:refresh-balance'));
        if (status.isGalGameMode || preferences.quiet)
            return;
        react('shy', 'sweat', 4200);
        setBubbleHidden(false);
        setBalanceLine(t('余额好像不够了，对不起……！', 'Looks like the balance ran out… sorry!'));
        later(() => setBalanceLine(''), 6000);
        setChipFlash(true);
        later(() => setChipFlash(false), 2400);
    }, [status.quotaErrorKey]);
    useEffect(() => {
        if (!walletOpen)
            return;
        const outside = (event) => { if (!event.target?.closest?.('.petWalletPop, .petWalletChip'))
            setWalletOpen(false); };
        const escape = (event) => { if (event.key === 'Escape' && !event.isComposing)
            setWalletOpen(false); };
        document.addEventListener('pointerdown', outside, true);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape); };
    }, [walletOpen]);
    const [welcomeBack, setWelcomeBack] = useState('');
    useEffect(() => {
        if (preferences.answerNotice !== 'off')
            return;
        answerNotice.current.cancel();
        document.title = markTitle(document.title, false);
        setWelcomeBack('');
    }, [preferences.answerNotice]);
    useEffect(() => () => { document.title = markTitle(document.title, false); }, []);
    useEffect(() => {
        if (!foreground || !answerNotice.current.back(preferences.answerNotice))
            return;
        document.title = markTitle(document.title, false);
        if (status.isGalGameMode || status.isStreaming || status.isReasoning)
            return;
        react('happy', 'heart', 3200);
        if (preferences.answerNotice !== 'line' || preferences.quiet)
            return;
        const [zh, en] = WELCOME_BACK_LINES[answerNotice.current.nextLine()];
        setBubbleHidden(false);
        // address() turns 主人 into the name the user chose.
        setWelcomeBack(t(zh.replaceAll('{name}', '主人'), en));
        later(() => setWelcomeBack(''), 5000);
    }, [foreground, preferences.answerNotice]);
    // Pricing-period announcements: half price is good news, peak is a little alarming.
    useEffect(() => {
        if (!tierAnnounce || !preferences.peakNotice || preferences.quiet || status.isGalGameMode || status.isStreaming || status.isReasoning)
            return;
        if (tierAnnounce.tier === 'valley')
            react('happy', 'heart', 3200);
        else
            react('surprised', 'exclaim', 3200);
    }, [tierAnnounce]);
    // Idle glances: now and then a different face, so she feels alive without being busy.
    useEffect(() => {
        if (status.isGalGameMode || status.state !== 'IDLE' || !foreground || isDragging || isSettingsOpen || reaction || preferences.quiet)
            return;
        const timer = setTimeout(() => {
            const pose = ['smug', 'happy', 'proud', 'smug'][Math.floor(Math.random() * 4)];
            react(pose, Math.random() < 0.35 ? (pose === 'happy' ? 'heart' : 'note') : null, 3200);
        }, 50_000 + Math.random() * 60_000);
        return () => clearTimeout(timer);
    }, [status.isGalGameMode, status.state, foreground, isDragging, isSettingsOpen, reaction, preferences.quiet]);
    useEffect(() => {
        if (preferences.muted || preferences.quiet)
            voiceRef.current?.silence();
        else if (!voiceAllowed)
            voiceRef.current?.cut();
    }, [voiceAllowed, preferences.muted, preferences.quiet]);
    useEffect(() => {
        const pose = status.pose;
        if (pose !== previousPose.current && voiceAllowed) {
            if (pose === 'getit')
                voiceRef.current?.cue('eureka');
            if (pose === 'sajiao')
                voiceRef.current?.cue('jelly');
            if (pose === 'eating')
                voiceRef.current?.cue('rice');
            if (/^think/.test(pose) && !/^think/.test(previousPose.current))
                voiceRef.current?.cue('think');
        }
        previousPose.current = pose;
    }, [status.pose, voiceAllowed]);
    // The clock drives elapsed time, pricing period, reminders and staleness. It ticks every second only
    // while a model is working (the elapsed counter); otherwise every 15 s, plus an exact wake-up when an
    // announcement ends or the pricing period changes. A tick re-renders the whole overlay, so this matters.
    const clockBusy = status.isReasoning || status.isStreaming;
    useEffect(() => {
        const tick = () => { if (!document.hidden)
            setClock(Date.now()); };
        const timer = setInterval(tick, clockBusy ? 1000 : 15000);
        document.addEventListener('visibilitychange', tick);
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
    }, [clockBusy]);
    const clockMinute = Math.floor(clock / 60000);
    const tariff = useMemo(() => tariffAt(clock), [clockMinute]);
    useEffect(() => {
        const now = Date.now();
        const due = [tierAnnounce?.until ?? 0, tariff.nextChange ?? 0].filter(at => at > now);
        if (!due.length)
            return;
        const timer = setTimeout(() => setClock(Date.now()), Math.min(...due) - now + 50);
        return () => clearTimeout(timer);
    }, [tierAnnounce, tariff.nextChange]);
    // 梁文峰 / 梁文谷: announce once on load and at every switch.
    const tierNow = tariff.tier;
    useEffect(() => {
        const previous = previousTierRef.current;
        previousTierRef.current = tierNow;
        if (previous === tierNow || !preferences.peakNotice || preferences.quiet)
            return;
        setTierAnnounce({ tier: tierNow, until: Date.now() + 9000 });
        if (previous !== null && voiceAllowed)
            voiceRef.current?.cue('tap');
    }, [tierNow, preferences.peakNotice, preferences.quiet]);
    useEffect(() => {
        if (status.isReasoning || status.isStreaming) {
            if (!startedAt.current)
                startedAt.current = Date.now();
        }
        else
            startedAt.current = 0;
    }, [status.isReasoning, status.isStreaming]);
    useEffect(() => {
        const now = new Date(clock);
        const day = now.toLocaleDateString();
        if (preferences.reminders && !preferences.quiet && now.getHours() === 12 && lunchDay.current !== day && status.state === 'IDLE') {
            lunchDay.current = day;
            stateMachine.triggerPostOutputEating(4500);
        }
    }, [clock, preferences.reminders, preferences.quiet, status.state, stateMachine]);
    // ---- Hover dock -----------------------------------------------------------
    const handleMouseEnterPet = useCallback(() => {
        if (menuTimerRef.current) {
            clearTimeout(menuTimerRef.current);
            menuTimerRef.current = null;
        }
        setIsMenuOpen(true);
    }, []);
    const handleMouseLeavePet = useCallback(() => {
        if (menuTimerRef.current)
            clearTimeout(menuTimerRef.current);
        menuTimerRef.current = later(() => setIsMenuOpen(false), 750);
    }, []);
    // Every idle wait is sampled afresh; paused/busy modes never accumulate a backlog.
    useEffect(() => {
        const paused = petHidden || !preferences.wandering || status.isGalGameMode || status.isReasoning || status.isStreaming || status.isInputFocused || reduceMotion || !foreground || docked || isSettingsOpen || isMenuOpen;
        const stop = () => {
            pendingWanderRef.current = null;
            if (wanderTimerRef.current !== null)
                clearTimeout(wanderTimerRef.current);
            if (wanderFinishRef.current !== null)
                clearTimeout(wanderFinishRef.current);
            wanderTimerRef.current = null;
            wanderFinishRef.current = null;
            stateMachine.finishWandering(false);
        };
        if (paused) {
            stop();
            return;
        }
        let cancelled = false;
        const schedule = () => {
            wanderTimerRef.current = setTimeout(() => {
                if (cancelled)
                    return;
                const current = stateMachine.getStatus();
                if (!isDraggingRef.current && current.state === 'IDLE') {
                    const from = wanderPositionRef.current;
                    const target = wanderDestination(from.x, from.y, stageW, stageH, window.innerWidth, window.innerHeight);
                    if (target) {
                        pendingWanderRef.current = target;
                        stateMachine.setWandering(true);
                        setWanderRequest(request => request + 1);
                    }
                }
                schedule();
            }, nextWanderDelay());
        };
        schedule();
        return () => { cancelled = true; stop(); };
    }, [preferences.wandering, status.isGalGameMode, status.isReasoning, status.isStreaming, status.isInputFocused, isMenuOpen, isSettingsOpen, stateMachine, reduceMotion, foreground, docked, petHidden, stageW, stageH]);
    // Move only after the WANDERING render installs its slow position transition.
    // The model subscription is frame-batched; moving in the interval used the idle transition.
    useEffect(() => {
        if (status.state !== 'WANDERING' || !pendingWanderRef.current)
            return;
        const target = pendingWanderRef.current;
        pendingWanderRef.current = null;
        setPosition(target);
        wanderFinishRef.current = setTimeout(() => {
            wanderFinishRef.current = null;
            stateMachine.finishWandering(Math.random() < 0.25);
        }, 3300);
    }, [status.state, wanderRequest, stateMachine]);
    // ---- Drag, click, inertia --------------------------------------------------
    const handleMouseDown = useCallback((e, region) => {
        if (status.isGalGameMode || docked || e.button !== 0)
            return;
        // Do not take focus from the host composer (and do not arm the keyboard focus ring) on a mouse press.
        e.preventDefault?.();
        stateMachine.resetActivity();
        // Interrupt settling/wandering at the visible position, not its CSS destination.
        const element = e.currentTarget?.closest('[data-whale-pet="widget"]');
        const rect = element?.getBoundingClientRect();
        const origin = rect && Number.isFinite(rect.left) ? { x: rect.left, y: rect.top } : petPos;
        setPosition(origin);
        dragFrameRef.current = null;
        setSizeAnchor(null);
        isDraggingRef.current = true;
        setIsDragging(true);
        stateMachine.setWandering(false);
        dragStartRef.current = { startX: e.clientX, startY: e.clientY, petX: origin.x, petY: origin.y, region, element: element ?? undefined, startTime: Date.now(), maxDistance: 0, distance: 0, lastX: e.clientX, lastY: e.clientY, lastMove: Date.now(), vx: 0, vy: 0 };
    }, [petPos.x, petPos.y, status.isGalGameMode, stateMachine, docked]);
    useEffect(() => {
        if (!isDragging)
            return;
        const handleMouseMove = (e) => {
            const drag = dragStartRef.current;
            if (!drag)
                return;
            const moveElapsed = Math.max(16, Date.now() - drag.lastMove);
            drag.vx = (e.clientX - drag.lastX) / moveElapsed;
            drag.vy = (e.clientY - drag.lastY) / moveElapsed;
            drag.lastMove = Date.now();
            drag.distance += Math.hypot(e.clientX - drag.lastX, e.clientY - drag.lastY);
            drag.lastX = e.clientX;
            drag.lastY = e.clientY;
            const dx = e.clientX - drag.startX;
            const dy = e.clientY - drag.startY;
            drag.maxDistance = Math.max(drag.maxDistance, Math.hypot(dx, dy));
            if (preferences.docked || drag.maxDistance < DRAG_THRESHOLD)
                return;
            drag.started = true;
            if (!drag.lifted && !isSettingsOpen && !reduceMotion) {
                const rect = drag.element?.getBoundingClientRect();
                const from = rect ? { x: rect.left, y: rect.top } : { x: drag.petX, y: drag.petY };
                drag.lifted = true;
                liftedAt.current = Date.now();
                setHeld({ x: e.clientX, y: e.clientY, from, key: ++carrySequence.current });
            }
            // Coalesce to one position update per frame; fast drags fire far more events than frames.
            const pending = dragFrameRef.current;
            dragFrameRef.current = { x: drag.petX + dx, y: drag.petY + dy };
            if (pending)
                return;
            nextFrame(() => {
                // A callback from a released drag must never consume the next drag's input.
                if (dragStartRef.current !== drag)
                    return;
                const target = dragFrameRef.current;
                dragFrameRef.current = null;
                if (target && isDraggingRef.current)
                    setPosition(constrainRef.current(target.x, target.y));
            });
        };
        const handleMouseUp = (e) => {
            const drag0 = dragStartRef.current;
            if (drag0?.started && !preferences.docked) {
                const end = { x: drag0.petX + e.clientX - drag0.startX, y: drag0.petY + e.clientY - drag0.startY };
                setPosition(constrainRef.current(end.x, end.y));
            }
            dragFrameRef.current = null;
            isDraggingRef.current = false;
            setIsDragging(false);
            setHeld(null);
            // Carried for a while: once she is back on her feet, a dizzy sigh.
            if (liftedAt.current && Date.now() - liftedAt.current > 1500) {
                setLanded(true);
                later(() => setLanded(false), 2600);
            }
            liftedAt.current = 0;
            const drag = dragStartRef.current;
            if (drag) {
                const dist = Math.max(drag.maxDistance, Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY));
                const duration = Date.now() - drag.startTime;
                if (drag.started && !preferences.docked) {
                    const dizzy = drag.distance > 900 && duration < 2500;
                    if (!drag.lifted && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && Date.now() - drag.lastMove < 100) {
                        const vx = Math.max(-30, Math.min(30, drag.vx * 70));
                        const vy = Math.max(-20, Math.min(20, drag.vy * 70));
                        setPosition(previous => constrainRef.current(previous.x + vx, previous.y + vy));
                    }
                    setAffection(dizzy ? 'dizzy' : 'float');
                    // Any real drag counts (with reduced motion she is moved without the lift).
                    found('carry');
                    if (dizzy)
                        found('dizzy');
                    later(() => setAffection(''), dizzy ? 2400 : 800);
                }
                if (!drag.started && dist < DRAG_THRESHOLD && duration < 380 && drag.region === 'chest') {
                    touchHer({ kind: 'chest', side: 1 });
                }
                else if (!drag.started && dist < DRAG_THRESHOLD && duration < 380) {
                    setIsBouncing(true);
                    later(() => setIsBouncing(false), 480);
                    stateMachine.triggerSajiao();
                    // The first click toggles Settings; quick follow-up clicks are pokes.
                    if (pokeHer())
                        setIsSettingsOpen(previous => !previous);
                    else
                        setIsSettingsOpen(false);
                }
            }
            dragStartRef.current = null;
        };
        const cancelDrag = () => { isDraggingRef.current = false; setIsDragging(false); setHeld(null); dragStartRef.current = null; dragFrameRef.current = null; };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('blur', cancelDrag);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('blur', cancelDrag);
        };
    }, [isDragging, stateMachine, preferences.docked, isSettingsOpen, reduceMotion]);
    // ---- Theatre handlers -----------------------------------------------------
    const handleAdvancePage = () => {
        if (isRevealing) {
            setRevealed(Array.from(displayDialogue).length);
            voiceRef.current?.cut();
            return;
        }
        if (preferences.reading !== 'pages')
            return;
        if (currentPageIndex < dialoguePages.length - 1)
            setCurrentPageIndex(prev => prev + 1);
        else if (dialoguePages.length > 1)
            setCurrentPageIndex(0);
    };
    // Send via the native DSH composer, keeping the draft whenever that fails.
    const handleSendMessage = () => {
        const text = inputValue.trim();
        if (!text)
            return;
        unlockAudio();
        const composerEl = (document.querySelector('[data-composer-input]') ||
            document.querySelector('[data-composer-card] [contenteditable="true"]') ||
            document.querySelector('[data-composer-card] [role="textbox"]') ||
            document.querySelector('[data-composer-seat] [contenteditable="true"]') ||
            document.querySelector('[data-composer-seat] textarea') ||
            document.querySelector('textarea'));
        if (!composerEl) {
            stateMachine.setLatestDialogue(t('未找到 DSH 输入框，请先打开一个对话。你的草稿已保留。', 'Open a DSH conversation first. Your draft has been kept.'));
            return;
        }
        if (composerEl instanceof HTMLTextAreaElement || composerEl instanceof HTMLInputElement) {
            composerEl.focus();
            const proto = composerEl instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(composerEl, text);
            composerEl.dispatchEvent(new Event('input', { bubbles: true }));
            composerEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        else {
            composerEl.focus();
            const sel = window.getSelection();
            if (sel) {
                const range = document.createRange();
                range.selectNodeContents(composerEl);
                sel.removeAllRanges();
                sel.addRange(range);
            }
            let inserted = false;
            try {
                inserted = document.execCommand('insertText', false, text);
            }
            catch {
                inserted = false;
            }
            if (!inserted) {
                try {
                    composerEl.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
                }
                catch { /* ignore */ }
                composerEl.textContent = text;
                composerEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        later(() => {
            const card = document.querySelector('[data-composer-card]') || document.querySelector('[data-composer-seat]');
            const sendBtn = card ? Array.from(card.querySelectorAll('button')).find(b => /send|发送|steer|queue/i.test(b.getAttribute('aria-label') || b.textContent || '') && !b.disabled && b.getAttribute('aria-disabled') !== 'true') || null : null;
            if (sendBtn && !sendBtn.hasAttribute('disabled')) {
                sendBtn.click();
                setInputValue('');
            }
            else
                stateMachine.setLatestDialogue(t('暂时无法发送，请检查 DSH 输入框与发送按钮。你的草稿已保留。', 'Unable to send. Check the DSH composer; your draft has been kept.'));
        }, 80);
    };
    const displayDialogue = preferences.reading === 'scroll' ? dialogueSource : dialoguePages[currentPageIndex] || dialoguePages[0] || '';
    const characters = useMemo(() => status.isGalGameMode ? Array.from(displayDialogue) : [], [status.isGalGameMode, displayDialogue]);
    const canReveal = preferences.typewriter && preferences.speed !== 'instant' && !reduceMotion && status.latestDialogue.length <= 600 && !/```|\|.*\|/.test(displayDialogue);
    const isRevealing = canReveal && preferences.reading === 'pages' && revealed < characters.length;
    const visibleText = isRevealing ? characters.slice(0, revealed).join('') : displayDialogue;
    const revealDrivesVoice = status.isGalGameMode && isRevealing && foreground && !uiHidden && !logOpen;
    useEffect(() => {
        const previous = revealIdentity.current;
        if (previous.page !== currentPageIndex || !displayDialogue.startsWith(previous.text)) {
            setRevealed(0);
            spokenRevealRef.current = 0;
        }
        revealIdentity.current = { page: currentPageIndex, text: displayDialogue };
    }, [currentPageIndex, displayDialogue]);
    useEffect(() => {
        if (!canReveal || revealed >= characters.length || !foreground || !status.isGalGameMode || uiHidden || logOpen || !preferences.typewriter || preferences.reading !== 'pages')
            return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            setRevealed(characters.length);
            return;
        }
        const timer = setTimeout(() => setRevealed(count => Math.min(count + 1, characters.length)), revealDelay(characters[Math.max(0, revealed - 1)] || '', preferences.speed));
        return () => clearTimeout(timer);
    }, [status.isGalGameMode, uiHidden, logOpen, preferences.typewriter, preferences.reading, characters.length, revealed, canReveal, foreground, preferences.speed]);
    useEffect(() => {
        if (!preferences.autoAdvance || preferences.reading !== 'pages' || !status.isGalGameMode || status.isStreaming || isRevealing || uiHidden || logOpen || currentPageIndex >= dialoguePages.length - 1)
            return;
        const timer = setTimeout(() => setCurrentPageIndex(i => Math.min(i + 1, dialoguePages.length - 1)), Math.min(4000, Math.max(2000, characters.length * 15)));
        return () => clearTimeout(timer);
    }, [preferences.autoAdvance, preferences.reading, status.isGalGameMode, status.isStreaming, isRevealing, uiHidden, logOpen, currentPageIndex, dialoguePages, characters.length]);
    // Skip (快进): finish the current page at once, then flip pages quickly until the last one.
    useEffect(() => {
        if (!skipping || !status.isGalGameMode)
            return;
        if (isRevealing) {
            setRevealed(characters.length);
            voiceRef.current?.cut();
            return;
        }
        if (preferences.reading !== 'pages' || currentPageIndex >= dialoguePages.length - 1) {
            if (!status.isStreaming)
                setSkipping(false);
            return;
        }
        const timer = setTimeout(() => setCurrentPageIndex(i => Math.min(i + 1, dialoguePages.length - 1)), 200);
        return () => clearTimeout(timer);
    }, [skipping, isRevealing, characters.length, currentPageIndex, dialoguePages.length, status.isGalGameMode, status.isStreaming, preferences.reading]);
    // Holding Ctrl skips, as in most visual novels; releasing it stops. Ignored while text is selected or typed.
    useEffect(() => {
        if (!status.isGalGameMode)
            return;
        const down = (event) => {
            if (event.key !== 'Control' || event.repeat)
                return;
            const target = event.target;
            if (target?.closest?.('input, textarea, [contenteditable="true"]') || String(window.getSelection?.() ?? ''))
                return;
            setSkipping(true);
        };
        const up = (event) => { if (event.key === 'Control')
            setSkipping(false); };
        const stop = () => setSkipping(false);
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', stop);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', stop); };
    }, [status.isGalGameMode]);
    // Theatre: like a visual novel, each page sets her expression; a change hops and shows a mood mark.
    useEffect(() => {
        if (!status.isGalGameMode || status.isStreaming || status.isReasoning) {
            if (pageEmotion.emotion !== 'neutral')
                setPageEmotion(current => ({ emotion: 'neutral', emote: null, key: current.key }));
            return;
        }
        const emotion = detectEmotion(displayDialogue);
        if (emotion === pageEmotion.emotion)
            return;
        const key = ++emoteSeq.current;
        setPageEmotion({ emotion, emote: emoteFor(emotion, displayDialogue), key });
        if (emotion !== 'neutral' && !reduceMotion) {
            try {
                document.querySelector?.('[data-whale-pet="stage"] .puppetRoot')?.animate([{ translate: '0 0' }, { translate: '0 -18px' }, { translate: '0 0' }], { duration: 380, easing: 'cubic-bezier(.3, 1.4, .5, 1)' });
            }
            catch { /* Web Animations unavailable */ }
        }
    }, [displayDialogue, status.isGalGameMode, status.isStreaming, status.isReasoning]);
    // One scheduler, two sources: the theatre's letter-by-letter reveal when it
    // is running, otherwise newly streamed text. Skips and bulk text are not voiced.
    useEffect(() => {
        const previous = spokenRevealRef.current;
        spokenRevealRef.current = revealed;
        if (!revealDrivesVoice || !voiceAllowed || revealed <= previous)
            return;
        if (revealed - previous > 3) {
            voiceRef.current?.cut();
            return;
        }
        voiceRef.current?.speak(speakableText(characters.slice(previous, revealed).join('')));
    }, [revealed, revealDrivesVoice, voiceAllowed]);
    useEffect(() => {
        const previous = spokenStreamRef.current;
        spokenStreamRef.current = status.latestDialogue;
        if (!status.isStreaming || !voiceAllowed || revealDrivesVoice)
            return;
        const speech = appendedSpeech(previous, status.latestDialogue);
        if (speech)
            voiceRef.current?.speak(speech);
    }, [status.latestDialogue, status.isStreaming, voiceAllowed, revealDrivesVoice]);
    useEffect(() => {
        if (!status.isStreaming && !revealDrivesVoice)
            voiceRef.current?.cut();
    }, [status.isStreaming, revealDrivesVoice]);
    const copyCode = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setToast(t('已复制', 'Copied'));
            found('code');
        }
        catch {
            setToast(t('复制失败，请选中文字手动复制', 'Copy failed. Select the text and copy it manually.'));
        }
        later(() => setToast(''), 2500);
    };
    const unlockAudio = () => { if (!preferences.muted && !preferences.quiet)
        voiceRef.current?.unlock(); if (wantBgm)
        bgmRef.current?.unlock(); };
    const toggleMute = () => { if (preferences.muted)
        voiceRef.current?.unlock();
    else
        voiceRef.current?.silence(); update({ muted: !preferences.muted }); };
    const codeText = useMemo(() => dialogueBlocks(status.latestDialogue).filter(block => block.kind === 'code').map(block => block.text).join('\n\n'), [status.latestDialogue]);
    const nativeSpeed = useMemo(() => {
        const value = document.querySelector('[data-tokens-per-second]')?.getAttribute('data-tokens-per-second');
        return value && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
    }, [clock]);
    const elapsed = startedAt.current ? Math.max(0, (clock - startedAt.current) / 1000).toFixed(1) : null;
    const localeTag = preferences.language === 'en' ? 'en-GB' : 'zh-CN';
    // Formatting dates is costly; the label only changes with the period, the language or the day.
    const nextChangeLabel = useMemo(() => {
        if (tariff.nextChange === null)
            return '';
        const d = new Date(tariff.nextChange);
        const time = d.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit', hour12: false });
        return d.toDateString() === new Date(clock).toDateString() ? time : d.toLocaleDateString(localeTag, { weekday: 'short' }) + ' ' + time;
    }, [tariff.nextChange, localeTag, clockMinute]);
    const tierShort = tariff.tier === 'peak' ? t('峰', 'Peak') : t('谷', 'Off-peak');
    const tierName = tariff.tier === 'peak' ? t('梁文峰时间', 'Liang Wenfeng time') : t('梁文谷时间', 'Liang Wengu time');
    const tierUntil = tariff.nextChange !== null ? t(`至 ${nextChangeLabel}`, `until ${nextChangeLabel}`) : '';
    const tierRule = t('北京时间工作日 9:00–12:00、14:00–18:00 为高峰；其余时间及周末、法定节假日为空闲（半价）。', 'Peak: Beijing time, weekdays 09:00–12:00 and 14:00–18:00. Other hours, weekends and Chinese public holidays are off-peak at half price.');
    const tierLine = (tier) => tier === 'peak'
        ? t('现在是梁文峰时间！API 高峰价，省着点用哦～', 'It’s Liang Wenfeng time! Peak API pricing — go easy.')
        : t('现在是梁文谷时间！空闲时段半价，放开用吧～', 'It’s Liang Wengu time! Off-peak, half price.');
    const tierAnnouncing = preferences.peakNotice && !preferences.quiet && tierAnnounce !== null && tierAnnounce.until > clock;
    const wallet = walletView({ host: status.hostBalance ?? null, known: status.balancesKnown, toppedUp: status.toppedUpBalance, granted: status.grantedBalance, checkedAt: stateMachine.getStatus().balancesCheckedAt ?? null, now: clock, ricePrice: preferences.ricePrice, lowAt: preferences.lowBalanceAt });
    walletLow.current = wallet.low;
    const hour = new Date(clock).getHours();
    const contextualSpeech = poke === 'chest' ? t('呀！请、请不要碰这里……', 'Ah! Please don’t touch me there…')
        : poke === 'tail-annoyed' ? t('尾巴很敏感啦……让我缓一缓嘛。', 'My tail is sensitive… give me a little break.')
            : poke === 'angry' ? t('别戳啦！再戳我真的要生气了！', 'Stop poking me! I’m getting really mad!')
                : poke === 'curious' ? t('唔？主人是在戳我吗？', 'Hm? Are you poking me?')
                    : poke === 'tail' ? t('呀！尾、尾巴不可以随便摸啦……', 'Eek! N-not the tail…')
                        : held && heldLong ? t('放、放我下来啦！脚都够不着地了……', 'P-put me down! My feet can’t reach the floor…')
                            : landed ? t('哈啊啊……在空中晃得头好晕……', 'Haaah… all that swinging made me dizzy…')
                                : held ? t('哇啊！被、被拎起来了……', 'Whoa! I’m being lifted…')
                                    : guideThanks ? t('谢谢主人陪我练习～以后请多多关照！', 'Thank you for practising with me~ I’m in your care!')
                                        : balanceLine ? balanceLine
                                            : welcomeBack ? welcomeBack
                                                : affection === 'pat' ? t('嘿嘿……最喜欢主人摸摸头啦～', 'Hehe… I love head pats!')
                                                    : affection === 'dizzy' ? t('头好晕……深海漩涡出现啦！', 'Whoa… a deep-sea whirlpool!')
                                                        : tierAnnouncing ? tierLine(tierAnnounce.tier)
                                                            : preferences.reminders && status.state === 'IDLE' && hour >= 1 && hour < 5 ? t('呼啊……夜深啦，主人记得休息，我陪着你。', 'It’s late… remember to rest. I’m right here.')
                                                                : preferences.reminders && status.state === 'EATING' && hour === 12 ? t('午饭时间到！主人也要按时吃饭哦～', 'Lunch time! Remember to have something to eat.')
                                                                    : companionSpeech;
    // ---- Touch (desktop and theatre) -------------------------------------------
    const showMood = (mood, pose, emote, ms) => {
        setPoke(mood);
        react(pose, emote, ms);
        later(() => setPoke(current => current === mood ? '' : current), ms);
    };
    /** Counts a poke; true when it was a plain first click. */
    function pokeHer() {
        const { first, mood } = pokes.current.tap(Date.now());
        if (mood === 'angry') {
            showMood('angry', 'angry', 'anger', 3200);
            found('angry');
        }
        else if (mood === 'curious') {
            showMood('curious', 'surprised', 'question', 1800);
            found('poke');
        }
        return first;
    }
    const touchHer = (touch) => {
        if (isDraggingRef.current)
            return;
        // Only the theatre reports pokes (the widget's clicks go through its drag handler).
        if (touch.kind === 'chest') {
            const now = Date.now();
            if (now - chestTouchAt.current < 3200)
                return;
            chestTouchAt.current = now;
            stateMachine.resetActivity();
            setIsSettingsOpen(false);
            setBubbleHidden(false);
            showMood('chest', 'shy', 'sweat', 3200);
            if (status.isGalGameMode)
                flash(t('呀！请、请不要碰这里……', 'Ah! Please don’t touch me there…'));
            return;
        }
        if (touch.kind === 'poke') {
            pokeHer();
            return;
        }
        stateMachine.resetActivity();
        if (touch.kind === 'pat') {
            setAffection('pat');
            found('pat');
            // No proud here: with the model it would raise a hand to her chest, which reads oddly as a reaction to a pat.
            react(['sajiao', 'shy', 'happy'][Math.floor(Math.random() * 3)], 'heart', 2000);
            if (voiceAllowed)
                voiceRef.current?.cue('jelly');
            later(() => setAffection(current => current === 'pat' ? '' : current), 2000);
            return;
        }
        // Tail strokes stay shy; repeated strokes ask for a break instead of using the poke-anger animation.
        if (tailPatience.current.touch(Date.now()) === 'angry') {
            showMood('tail-annoyed', 'shy', 'sweat', 3000);
            return;
        }
        setAffection('tail');
        found('tail');
        showMood('tail', 'shy', 'sweat', 2600);
        if (voiceAllowed)
            voiceRef.current?.cue('tap');
        later(() => setAffection(current => current === 'tail' ? '' : current), 2600);
    };
    // ---- Live2D import / removal ------------------------------------------------
    const live2dFailureText = (reason) => ({
        'no-model': t('没找到 大肥鱼.model3.json，请选择含有它的那一层文件夹（不是压缩包，也不是它的上一层或里面的子文件夹）。', 'No 大肥鱼.model3.json found. Pick the folder that directly contains it (not the zip, its parent or a subfolder).'),
        incomplete: t('模型文件不完整，请把压缩包完整解压后再导入。', 'The model is incomplete. Extract the whole archive and import again.'),
        interrupted: t('导入中断了（文件夹可能被移动，或读取被取消）。原来的模型没有变，请再选一次文件夹。', 'The import was interrupted (the folder moved or reading was cancelled). Nothing changed; pick the folder again.'),
        'not-dafeiyu': t('这不是大肥鱼的 Live2D 模型。插件的表情和动作是为 DeepSeek-chan（大肥鱼）准备的。', 'This is not the 大肥鱼 Live2D model. Her expressions are made for DeepSeek-chan (大肥鱼).'),
        'bad-json': t('模型描述文件无法读取。', 'The model description could not be read.'),
        image: t('贴图无法读取。', 'A texture could not be read.'),
        storage: t('本机存储空间不足或不可用，模型没有保存。', 'Local storage is full or unavailable; the model was not saved.'),
        'core-failed': t('Live2D 运行库启动失败，请刷新 DSH 后重试。', 'Live2D could not start. Reload DSH and retry.'),
        'core-missing': t('Live2D 运行库没有加载，已改用插图。', 'The Live2D runtime did not load; illustrations are shown.'),
        'core-timeout': t('Live2D 运行库启动超时，已改用插图。', 'The Live2D runtime took too long to start; illustrations are shown.'),
        'no-webgl': t('当前环境不支持 WebGL，已改用插图。', 'WebGL is not available; illustrations are shown.'),
        'moc-version': t('模型版本比 Live2D 运行库新，已改用插图。', 'The model is newer than the Live2D runtime; illustrations are shown.'),
        'context-lost': t('显卡上下文丢失，已改用插图。重新打开设置里的开关可再试一次。', 'The graphics context was lost; illustrations are shown. Toggle the model off and on to retry.'),
    }[reason] ?? t('Live2D 模型加载失败，已改用插图。', 'The Live2D model failed to load; illustrations are shown.'));
    /** Which files are missing or unreadable, in plain words (textures, motions, the moc). */
    const missingText = (result) => {
        if (!result.detail)
            return '';
        const names = result.detail.split(', ');
        const kind = names.every(name => /\.(png|jpe?g|webp)$/i.test(name)) ? t('缺少贴图', 'Missing textures') : names.every(name => /motion3\.json$/i.test(name)) ? t('缺少动作文件', 'Missing motion files') : t('缺少文件', 'Missing files');
        return ` ${kind}${t('：', ': ')}${names.slice(0, 3).join(t('、', ', '))}${names.length > 3 ? t(` 等 ${names.length} 个`, ` and ${names.length - 3} more`) : ''}`;
    };
    const importLive2D = async (files) => {
        setLive2dState({ state: 'importing', progress: [0, 0] });
        try {
            const result = await importLive2DFiles(files, (done, total) => setLive2dState({ state: 'importing', progress: [done, total] }));
            if (!result.ok) {
                setLive2dState(live2dRecord ? { state: 'failed', name: live2dRecord.name, bytes: live2dRecord.bytes, message: live2dFailureText(result.error) + missingText(result) } : { state: 'failed', message: live2dFailureText(result.error) + missingText(result) });
                return;
            }
            if (!(await saveLive2DModel(result.record))) {
                setLive2dState({ state: 'failed', message: live2dFailureText('storage') });
                return;
            }
            setLive2dFailure(null);
            setLive2dAspect(null);
            setLive2dRecord(result.record);
            setLive2dState({ state: 'ready', name: result.record.name, bytes: result.record.bytes });
            update({ live2d: true });
            flash(t('Live2D 模型已导入', 'Live2D model imported'));
        }
        catch (error) {
            setLive2dState({ state: 'failed', name: live2dRecord?.name, message: live2dFailureText('interrupted') });
            console.warn('[dsh-whale-pet][live2d] import failed', error);
        }
    };
    const removeLive2D = async () => {
        await deleteLive2DModel();
        setLive2dRecord(null);
        setLive2dFailure(null);
        setLive2dAspect(null);
        setLive2dState({ state: 'none' });
    };
    const live2dSettings = { bundled: live2dIncluded, ...live2dState, needsReimport: live2dNeedsReimport(live2dRecord), active: live2dOn && live2dAspect !== null };
    const lang = preferences.language === 'zh' ? 'zh-CN' : 'en';
    const openTheatre = () => { setIsSettingsOpen(false); stateMachine.setGalGameMode(true); };
    const settingsProps = () => ({
        p: { ...preferences, autoGalGame: status.autoGalGameOnChat }, wallet, detached: group?.mode === 'detached',
        tier: { tier: tariff.tier, name: tierName, until: tierUntil, rule: tierRule, holidayDataMissing: tariff.holidayDataMissing },
        update: (patch) => { update(patch); if (patch.autoGalGame !== undefined)
            stateMachine.setAutoGalGameOnChat(patch.autoGalGame); },
        onSizeStart: () => setSizeAnchor(previous => previous ?? currentSizeLayout.current),
        toggleMute,
        quiet: () => setPreferences(previous => quietPreset(previous)),
        reset: () => {
            setPreferences({ ...defaultPreferences(), onboardingDone: true });
            stateMachine.setForm('maiden');
            stateMachine.setAutoGalGameOnChat(true);
            const fresh = spriteGeometry('Maid', viewport.height, 1);
            setPosition(clampPet(viewport.width - fresh.stageWidth - 24, viewport.height - fresh.stageHeight - 30, fresh.stageWidth, fresh.stageHeight, viewport.width, viewport.height));
        },
        doctor: () => setDoctor(diagnosticReport()),
        notify: async () => {
            if (preferences.notifications) {
                update({ notifications: false });
                return;
            }
            if (typeof Notification === 'undefined') {
                setToast(t('当前环境不支持系统通知', 'Notifications are not available'));
                return;
            }
            const permission = await Notification.requestPermission();
            update({ notifications: permission === 'granted' });
            if (permission !== 'granted')
                setToast(t('未获得通知权限，已保持关闭', 'Permission not granted; notifications remain off'));
        },
        close: () => setIsSettingsOpen(false),
        openTheatre,
        live2d: live2dSettings,
        importLive2D: (files) => { void importLive2D(files); },
        removeLive2D: () => { void removeLive2D(); },
        discoveries,
        replayGuide: () => { setGuideDone([]); setIsSettingsOpen(false); update({ onboardingDone: false }); },
    });
    // The panel does not depend on the pet's position, so a drag never rebuilds it.
    const settingsPanel = useMemo(() => isSettingsOpen ? SettingsPanel(settingsProps()) : null, [isSettingsOpen, preferences, status.autoGalGameOnChat, JSON.stringify(wallet), tariff.tier, tierUntil, tariff.holidayDataMissing, group?.mode, viewport.width, viewport.height, JSON.stringify(live2dSettings), live2dRecord, discoveries]);
    // ---- Theatre: background, music and upload handlers ----------------------------
    const pickScene = (id) => {
        const scene = sceneMeta(id).id;
        if (scene === 'custom' && !customScene) {
            flash(t('先上传一张图片作为「我的背景」', 'Upload a picture first to use “My picture”'));
            return;
        }
        update({ scene });
    };
    const uploadScene = async (file) => {
        const check = checkMedia('scene', file);
        if (!check.ok) {
            flash(check.reason === 'type' ? t('请选择图片（PNG / JPG / WebP / GIF）', 'Choose an image (PNG, JPG, WebP or GIF)') : t('图片需小于 15 MB', 'Pictures must be under 15 MB'));
            return;
        }
        let url = '';
        try {
            url = URL.createObjectURL(file);
        }
        catch {
            flash(t('当前环境无法读取图片', 'Pictures cannot be read here'));
            return;
        }
        releaseUrl(customSceneRef.current);
        setCustomScene({ url, name: file.name });
        update({ scene: 'custom' });
        const saved = await saveMedia('scene', file);
        flash(saved ? t('已设为背景，下次进入剧场会自动恢复', 'Background set; it will be restored next time') : t('已设为背景（浏览器存储不可用，仅本次有效）', 'Background set for this session (browser storage unavailable)'));
    };
    const removeScene = async () => {
        releaseUrl(customSceneRef.current);
        setCustomScene(null);
        if (preferences.scene === 'custom')
            update({ scene: 'study' });
        await deleteMedia('scene');
        flash(t('已移除我的背景', 'Your picture was removed'));
    };
    const startBgm = (track) => {
        // Called inside the click, so browsers that require a gesture let audio start.
        void bgmRef.current?.play(track, preferences.bgmVolume).then(ok => setBgmPlaying(ok));
    };
    const toggleBgm = () => {
        if (preferences.bgmOn) {
            bgmRef.current?.fadeOut();
            setBgmPlaying(false);
            update({ bgmOn: false });
            return;
        }
        update({ bgmOn: true });
        startBgm(preferences.bgmTrack);
    };
    const pickTrack = (id) => {
        const track = BGM_TRACKS.find(item => item.id === id)?.id;
        if (!track)
            return;
        if (track === 'custom' && !customBgmName) {
            flash(t('先添加一首本地音乐', 'Add a music file first'));
            return;
        }
        update({ bgmTrack: track, bgmOn: true });
        startBgm(track);
    };
    const uploadBgm = async (file) => {
        const check = checkMedia('bgm', file);
        if (!check.ok) {
            flash(check.reason === 'type' ? t('请选择音频文件（MP3 / OGG / WAV / M4A）', 'Choose an audio file (MP3, OGG, WAV or M4A)') : t('音乐文件需小于 40 MB', 'Music files must be under 40 MB'));
            return;
        }
        let bytes;
        try {
            bytes = await file.arrayBuffer();
        }
        catch {
            flash(t('读取音乐文件失败', 'Could not read that file'));
            return;
        }
        bgmRef.current?.setCustom(bytes);
        setCustomBgmName(file.name);
        setCustomBgmVersion(version => version + 1);
        update({ bgmTrack: 'custom', bgmOn: true });
        const saved = await saveMedia('bgm', file);
        flash(saved ? t('已添加，正在无缝循环播放', 'Added; now looping seamlessly') : t('已添加（浏览器存储不可用，仅本次有效）', 'Added for this session (browser storage unavailable)'));
    };
    const removeBgm = async () => {
        bgmRef.current?.setCustom(null);
        setCustomBgmName(null);
        if (preferences.bgmTrack === 'custom')
            update({ bgmTrack: 'daily' });
        await deleteMedia('bgm');
        flash(t('已移除我的音乐', 'Your music was removed'));
    };
    const sceneLabel = (id) => { const meta = sceneMeta(id); return t(meta.zh, meta.en); };
    const sceneCards = SCENES.map(scene => ({
        id: scene.id,
        label: scene.id === 'auto' ? t(scene.zh, scene.en) + ' · ' + sceneLabel(timeOfDayScene(sceneHour)) : t(scene.zh, scene.en),
        thumb: scene.id === 'none' ? '' : scene.id === 'custom' ? customScene?.url ?? '' : status.isGalGameMode && theatrePanel === 'scene' ? paintedSceneUrl(scene.id === 'auto' ? timeOfDayScene(sceneHour) : scene.id) : '',
        active: preferences.scene === 'auto' ? scene.id === 'auto' : scene.id === activeScene,
        kind: scene.id === 'none' ? 'none' : scene.id === 'custom' ? 'custom' : scene.id === 'auto' ? 'auto' : 'painted',
    }));
    const bgmTracks = BGM_TRACKS.filter(track => track.id !== 'custom' || customBgmName).map(track => ({
        id: track.id,
        label: track.id === 'custom' && customBgmName ? customBgmName.replace(/\.[^.]+$/, '') : t(track.zh, track.en),
        mood: t(track.moodZh, track.moodEn),
    }));
    // ---- Theatre ----------------------------------------------------------------
    if (status.isGalGameMode) {
        return TheatreView({
            t, p: preferences, status, lang, petName,
            puppet: { imgSrc: currentImgSrc, poseName: hitPose, poseScale: (POSE_META[hitPose] ?? POSE_META.Maid).scale, isMaiden, live: preferences.liveMotion && liveSupported, motion: reduceMotion ? 0 : 1, emote: reaction?.emote ?? pageEmotion.emote ?? null, emoteKey: reaction?.emote ? reaction.key : pageEmotion.emote ? pageEmotion.key : 0, live2d: live2dBinding, onTouch: touchHer },
            tier: preferences.peakNotice ? { tier: tariff.tier, label: tierName, until: tierUntil } : null,
            phase: status.isStreaming || status.isReasoning ? phaseLabel + (elapsed !== null ? ' · ' + elapsed + 's' : '') + (nativeSpeed !== null ? ' · ' + nativeSpeed.toFixed(1) + ' tokens/s' : '') : null,
            uiHidden, expanded, logOpen, history,
            showThoughts: isThoughtBubbleVisible && (status.isReasoning || Boolean(status.reasoningText)),
            visibleText, isRevealing, pageIndex: currentPageIndex, pageCount: dialoguePages.length,
            inputValue, toast, textRef: textScrollRef, thoughtRef: thoughtScrollRef,
            scene: { id: activeScene, label: sceneLabel(activeScene), base: sceneMeta(activeScene).base, glow: sceneMeta(activeScene).glow, ambient: sceneMeta(activeScene).ambient, immersive, layers: sceneLayers },
            sceneCards, customSceneName: customScene?.name ?? null,
            panel: theatrePanel, skipping,
            bgm: { on: preferences.bgmOn, playing: bgmPlaying, track: preferences.bgmTrack, volume: preferences.bgmVolume, customName: customBgmName, tracks: bgmTracks },
            on: {
                exit: () => stateMachine.setGalGameMode(false),
                // With a painted scene the background behaves like a visual novel: click to continue.
                backdrop: () => theatrePanel ? setTheatrePanel(null) : uiHidden ? setUiHidden(false) : immersive ? handleAdvancePage() : stateMachine.setGalGameMode(false),
                dismiss: () => setTheatrePanel(null),
                unlock: unlockAudio,
                hideUi: setUiHidden,
                toggleExpanded: () => setExpanded(value => !value),
                openLog: () => { setHistory(readConversationLog()); setLogOpen(true); },
                closeLog: () => setLogOpen(false),
                toggleAuto: () => update({ autoAdvance: !preferences.autoAdvance }),
                toggleMute,
                toggleReading: () => update({ reading: preferences.reading === 'pages' ? 'scroll' : 'pages' }),
                toggleTheme: () => update({ theme: preferences.theme === 'light' ? 'dark' : 'light' }),
                toggleLanguage: () => update({ language: preferences.language === 'zh' ? 'en' : 'zh' }),
                hideThoughts: () => setIsThoughtBubbleVisible(false),
                thoughtScroll: node => { followThoughtRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 36; },
                textScroll: node => { followTextRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 36; },
                advance: handleAdvancePage,
                previous: () => setCurrentPageIndex(i => Math.max(0, i - 1)),
                wheel: event => {
                    if (preferences.reading !== 'pages' || event.target.closest('pre') || Math.abs(event.deltaY) < 15 || Date.now() - wheelTime.current < 400)
                        return;
                    event.preventDefault();
                    wheelTime.current = Date.now();
                    if (event.deltaY > 0)
                        handleAdvancePage();
                    else
                        setCurrentPageIndex(index => Math.max(0, index - 1));
                },
                skipReveal: () => { setRevealed(characters.length); voiceRef.current?.cut(); },
                toggleSkip: () => setSkipping(value => !value),
                input: setInputValue,
                send: handleSendMessage,
                copy: text => void copyCode(text),
                panel: setTheatrePanel,
                pickScene,
                shuffleScene: () => update({ scene: shuffleScene(activeScene, Boolean(customScene)) }),
                toggleShuffle: () => update({ sceneShuffle: !preferences.sceneShuffle }),
                uploadScene: file => void uploadScene(file),
                removeScene: () => void removeScene(),
                bgmToggle: toggleBgm,
                bgmPick: pickTrack,
                bgmStep: direction => pickTrack(cycleBgmTrack(preferences.bgmTrack, direction, Boolean(customBgmName))),
                bgmVolume: volume => update({ bgmVolume: Math.min(1, Math.max(0, volume)) }),
                uploadBgm: file => void uploadBgm(file),
                removeBgm: () => void removeBgm(),
                setSpeed: speed => update({ speed }),
                setLive2DScale: size => update({ live2dTheatreScale: Math.min(2, Math.max(0.6, size)) }),
                setFontSize: size => update({ fontSize: Math.min(24, Math.max(14, Math.round(size))) }),
                toggleTypewriter: () => update({ typewriter: !preferences.typewriter }),
                toggleLive: () => update({ liveMotion: !preferences.liveMotion }),
            },
        });
    }
    // ---- Desktop widget ---------------------------------------------------------
    const crownAlign = petPos.x + stageW / 2 < 200 ? 'start' : petPos.x + stageW / 2 > viewport.width - 200 ? 'end' : 'center';
    const bubbleSide = petPos.x + stageW / 2 < viewport.width / 2 ? 'right' : 'left';
    const showDock = isMenuOpen && !isSettingsOpen && !isDragging;
    // Peak/valley and balance show above her head (the user chooses which); the other actions live in the hover menu.
    const heads = headChipsShown(preferences.headChips);
    const chip = balanceChipState(wallet);
    const showWalletChip = heads.balance && !docked && !isSettingsOpen && !isDragging;
    const showTierChip = heads.tier && preferences.peakNotice && !isSettingsOpen && !isDragging;
    const walletTime = wallet.checkedAt ? new Date(wallet.checkedAt).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) : '';
    const walletTitle = chip === 'loading' ? t('正在读取余额', 'Reading the balance')
        : chip === 'signed-out' ? t('余额：登录后可见，点击查看说明', 'Balance: sign in to view. Click for details')
            : chip === 'failed' ? t('余额没读到，点击查看原因', 'Balance not read. Click to see why')
                : chip === 'stale' ? t('余额可能已过期，点击刷新', 'Balance may be out of date. Click to refresh')
                    : t('余额，点击查看更新时间', 'Balance. Click for the last update');
    const walletDetail = chip === 'signed-out' ? t('在 DSH 里登录 DeepSeek 账号后，这里会显示余额。只用 API Key 时 DSH 不提供余额。', 'Sign in to your DeepSeek account in DSH and the balance shows here. DSH has none for API-key-only use.')
        : chip === 'failed' ? (wallet.status === 'error'
            ? t('没能从 DSH 账户服务读到余额，可能是网络或登录状态的问题。我会自动重试，也可以现在重试。', 'The DSH account service did not return a balance (network or sign-in). I retry automatically, or try now.')
            : t('DSH 还没有把余额交给我。打开 DSH 的账户设置页，我就能读到；不想看的话可以把它隐藏。', 'DSH has not given me the balance yet. Open the DSH account settings page and I can read it, or hide it here.'))
            : chip === 'stale' ? t(`上次更新 ${walletTime || '—'}，之后可能变了。`, `Last updated ${walletTime || '—'}; it may have changed.`)
                : t(`上次更新 ${walletTime || '—'}。`, `Last updated ${walletTime || '—'}.`);
    const refreshWallet = () => {
        window.dispatchEvent(new Event('dsh-whale-pet:refresh-balance'));
        setWalletAsked(true);
        later(() => setWalletAsked(false), 2500);
    };
    const puppetOpacity = ghost && !isSettingsOpen ? Math.min(0.25, preferences.opacity) : preferences.opacity;
    return (_jsxs("div", { "data-ghost": ghost && !isSettingsOpen, "data-hidden": petHidden, "data-paused": !foreground || reduceMotion, "data-docked": docked, "data-peek-edge": docked ? 'right' : undefined, "data-peek-lean": docked && live2dOn ? true : undefined, "data-peek-swap": peekArt || undefined, "data-sizing": Boolean(sizeAnchor) || undefined, "data-dragging": isDragging || undefined, "data-settling": affection === 'float' || affection === 'dizzy' || undefined, "data-wandering": status.state === 'WANDERING' || undefined, "data-whale-pet": "widget", "data-pet-theme": preferences.theme, lang: lang, className: "petWidget", style: { left: `${petPos.x}px`, top: `${petPos.y}px`, width: `${stageW}px`, height: `${stageH}px` }, onPointerDown: unlockAudio, onMouseEnter: handleMouseEnterPet, onMouseLeave: handleMouseLeavePet, children: [doctor && _jsxs("aside", { "data-whale-pet": "doctor", "data-pet-theme": preferences.theme, className: "petLog", role: "dialog", "aria-label": "Doctor", children: [_jsxs("header", { children: [_jsx("strong", { children: "Doctor" }), _jsx("button", { type: "button", onClick: () => setDoctor(''), children: t('关闭', 'Close') })] }), _jsx("p", { className: "petLogNote", children: t('仅含选择器和匹配数量，不含聊天内容；空闲时生成标记可能缺失。', 'Selectors and counts only; no chat content. Generation markers can be absent while idle.') }), _jsx("pre", { children: doctor }), _jsx("button", { type: "button", onClick: () => void copyCode(doctor), children: t('复制诊断信息', 'Copy diagnostics') })] }), toast && _jsx("div", { className: "petToast", role: "status", children: toast }), _jsxs("div", { className: 'characterWrapper state-' + status.state.toLowerCase(), children: [_jsxs("div", { className: "petCrown", "data-align": crownAlign, style: { bottom: `${stageH - imageTop + 6}px` }, children: [_jsxs("div", { className: "toolbar", "data-visible": showDock, "data-settings-open": isSettingsOpen, onMouseEnter: handleMouseEnterPet, onMouseLeave: handleMouseLeavePet, role: "toolbar", "aria-label": t('大肥鱼快捷操作', '大肥鱼 actions'), children: [_jsxs("button", { type: "button", className: "toolBtn toolBtnPrimary", onClick: openTheatre, title: t('进入剧场模式（Alt+T）', 'Open theatre (Alt+T)'), children: [dockIcon('M2.5 4.5h11v7h-11zM5.5 13.5h5'), t('剧场', 'Theatre')] }), _jsxs("button", { type: "button", className: "toolBtn petSettingsButton", "aria-expanded": isSettingsOpen, onClick: () => setIsSettingsOpen(!isSettingsOpen), title: t('打开设置', 'Open settings'), children: [dockIcon('M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4'), t('设置', 'Settings')] }), _jsx("span", { className: "toolDivider", "aria-hidden": "true" }), _jsx("button", { type: "button", className: "toolBtn toolIcon", "aria-pressed": preferences.quiet, onClick: () => setPreferences(previous => quietPreset(previous)), "aria-label": preferences.quiet ? t('结束安静模式', 'End quiet mode') : t('安静模式', 'Quiet mode'), title: preferences.quiet ? t('结束安静模式', 'End quiet mode') : t('安静模式：暂停闲聊、音效和游荡', 'Quiet mode: pause chatter, sounds and wandering'), children: dockIcon('M12.5 9.5A5 5 0 016.5 3.5a5 5 0 106 6z') }), _jsxs("button", { type: "button", className: "toolBtn petEdgePeek", "aria-pressed": docked, onClick: togglePeek, "aria-keyshortcuts": preferences.peekShortcut || undefined, "aria-label": docked ? t('回来陪我', 'Come back') : t('去边缘偷看', 'Peek from the edge'), title: docked ? t('回来陪我：回到刚才的位置', 'Come back to your previous spot') : t('到右侧探头陪伴', 'Keep you company from the right edge'), children: [dockIcon('M2 12.5h12M4 12.5v-2M12 12.5v-2M5 8a3 3 0 116 0M6.5 7.5h.01M9.5 7.5h.01'), _jsx("span", { children: docked ? t('回来', 'Come back') : t('探头', 'Peek') }), _jsx("kbd", { children: preferences.peekShortcut || t('未设置', 'No shortcut') })] }), codeText && _jsx("button", { type: "button", className: "toolBtn toolIcon", onClick: () => void copyCode(codeText), "aria-label": t('复制代码', 'Copy code'), title: t('复制最近回答中的代码', 'Copy code from the latest answer'), children: dockIcon('M5.5 5.5h8v8h-8zM10.5 5.5v-3h-8v8h3') })] }), !isSettingsOpen && !isDragging && _jsxs("div", { className: "petCrownRow", children: [showTierChip && _jsxs("button", { type: "button", className: "petTierChip", "data-tier": tariff.tier, title: tierName + '\n' + tierRule, "aria-label": `${tierName} ${tierUntil}`, onClick: () => setTierAnnounce({ tier: tariff.tier, until: Date.now() + 9000 }), children: [_jsx("i", { "aria-hidden": "true" }), _jsx("span", { children: tierShort }), tierUntil && _jsx("span", { className: "petTierUntil", children: tierUntil })] }), showWalletChip && _jsx("button", { type: "button", className: "petWalletChip", "data-status": wallet.status, "data-chip": chip, "data-low": wallet.low || undefined, "data-flash": chipFlash || undefined, title: walletTitle, "aria-label": walletTitle, "aria-expanded": walletOpen, "aria-busy": chip === 'loading' || undefined, onClick: () => { if (chip !== 'loading')
                                            setWalletOpen(open => !open); }, children: chip === 'loading' ? _jsx("span", { className: "petWalletSkeleton", "aria-hidden": "true" })
                                            : chip === 'signed-out' ? _jsx("span", { children: t('余额 · 登录后可见', 'Balance · sign in to view') })
                                                : chip === 'failed' ? _jsxs(_Fragment, { children: [_jsx("span", { children: t('余额 —', 'Balance —') }), _jsx("i", { className: "petWalletWarn", "aria-hidden": "true" })] })
                                                    : _jsxs(_Fragment, { children: [chip === 'stale' && _jsxs("svg", { className: "petWalletClock", viewBox: "0 0 16 16", "aria-hidden": "true", children: [_jsx("circle", { cx: "8", cy: "8", r: "6" }), _jsx("path", { d: "M8 4.5V8l2.5 1.5" })] }), _jsxs("span", { children: [t('充值', 'Paid'), " ", wallet.toppedUp ?? '—'] }), !wallet.grantedNone && _jsxs(_Fragment, { children: [_jsx("span", { className: "petWalletSep", "aria-hidden": "true", children: "\u00B7" }), _jsxs("span", { children: [t('赠', 'Bonus'), " ", wallet.granted ?? '—'] })] })] }) }), showWalletChip && walletOpen && chip !== 'loading' && _jsxs("div", { className: "petWalletPop", role: "dialog", "aria-label": t('余额详情', 'Balance details'), "data-chip": chip, children: [_jsx("p", { children: walletDetail }), _jsxs("div", { className: "petWalletPopActions", children: [chip !== 'signed-out' && (wallet.source === 'host' || wallet.status === 'error') && _jsx("button", { type: "button", onClick: refreshWallet, disabled: walletAsked, children: walletAsked ? t('正在读取…', 'Reading…') : chip === 'failed' ? t('重试', 'Retry') : t('刷新', 'Refresh') }), (chip === 'failed' || chip === 'signed-out') && _jsx("button", { type: "button", onClick: () => { update({ headChips: heads.tier ? 'tier' : 'none' }); setWalletOpen(false); flash(t('已隐藏余额，可在设置的“头顶显示”里恢复', 'Balance hidden. Bring it back under “Above her head” in settings')); }, children: t('隐藏余额', 'Hide balance') }), _jsx("button", { type: "button", onClick: () => { setWalletOpen(false); setIsSettingsOpen(true); }, children: t('设置', 'Settings') })] })] })] })] }), !preferences.onboardingDone && !isSettingsOpen && _jsxs("aside", { className: "petOnboarding", "data-side": bubbleSide, style: { top: `${imageTop + Math.round(geometry.imageHeight * 0.25)}px` }, "aria-label": t('认识大肥鱼', 'Meet 大肥鱼'), children: [_jsxs("strong", { children: [t('认识一下大肥鱼', 'Meet 大肥鱼'), _jsxs("span", { className: "petGuideCount", children: [Math.min(guideAt, GUIDE_STEPS.length), " / ", GUIDE_STEPS.length] })] }), _jsx("ol", { className: "petGuideSteps", children: [
                                    t('摸摸我的头：在我头顶来回移动鼠标。', 'Pat my head: move the pointer back and forth over it.'),
                                    t('把我拎起来试试：按住我拖动，再松手。', 'Try picking me up: press, drag, and let go.'),
                                    t(`按 ${preferences.peekShortcut || '探头按钮'}，我就躲到边上；再按一次回来。`, `Press ${preferences.peekShortcut || 'the Peek button'} and I hide at the edge; press again to come back.`),
                                ].map((line, i) => _jsxs("li", { "data-state": guideDone.includes(GUIDE_STEPS[i]) ? 'done' : i === guideAt ? 'now' : 'next', "aria-current": i === guideAt ? 'step' : undefined, children: [_jsx("i", { "aria-hidden": "true", children: guideDone.includes(GUIDE_STEPS[i]) ? '✓' : i + 1 }), _jsx("span", { children: line })] }, i)) }), _jsx("p", { className: "petGuideNote", children: t('点我一下可以打开设置；之后能在设置的“互动图鉴”里再看一次。', 'Click me to open settings; you can replay this from the gallery there.') }), _jsx("button", { type: "button", className: "petGuideSkip", onClick: () => { setGuideDone([]); update({ onboardingDone: true }); }, children: t('跳过', 'Skip') })] }), !docked && !preferences.quiet && (!bubbleHidden || tierAnnouncing) && (status.speech || tierAnnouncing || poke === 'chest') && !isSettingsOpen && (_jsxs("div", { style: { fontSize: Math.max(12, preferences.fontSize - 3), top: `${imageTop + Math.round(geometry.imageHeight * 0.1)}px` }, className: "speechBubble", "data-side": bubbleSide, onClick: () => stateMachine.setGalGameMode(true), role: "button", tabIndex: 0, title: t('点击进入剧场', 'Click to open the theatre'), onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            stateMachine.setGalGameMode(true);
                        } }, children: [_jsx("button", { type: "button", className: "petBubbleClose", "aria-label": t('隐藏闲聊气泡', 'Hide chatter bubble'), onClick: event => { event.stopPropagation(); setBubbleHidden(true); }, children: "\u00D7" }), preferences.language === 'zh' ? address(contextualSpeech) : contextualSpeech] })), !docked && status.state === 'REASONING' && _jsxs("div", { className: "bubbleContainer", style: { top: `${imageTop}px` }, "aria-hidden": "true", children: [_jsx("i", { className: "bubble bubble1" }), _jsx("i", { className: "bubble bubble2" }), _jsx("i", { className: "bubble bubble3" })] }), !preferences.onboardingDone && guideAt === 0 && !docked && !isDragging && _jsx("div", { className: "petGuideHand", style: { top: `${imageTop + Math.round(geometry.imageHeight * 0.07)}px` }, "aria-hidden": "true", children: _jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: "M9 11V5.5a1.5 1.5 0 013 0V10l5.2 1.1a2 2 0 011.6 2.2l-.6 4.2a3 3 0 01-3 2.5H11a3 3 0 01-2.5-1.3L5.2 14a1.4 1.4 0 012.2-1.7z" }) }) }), !docked && affection === 'pat' && _jsx("div", { className: "petHearts", style: { top: `${imageTop}px` }, "aria-hidden": "true", children: "\u2661 \u2661 \u2661" }), _jsx("div", { "data-sleepy": preferences.reminders && hour >= 1 && hour < 5 && status.state === 'IDLE', className: 'petSpriteSize' + (isBouncing ? ' qBounce' : '') + (affection ? ' petReaction-' + affection : ''), style: { width: `${stageW}px`, height: `${stageH}px` }, tabIndex: 0, role: "button", "aria-label": t(`${petName}：按 Enter 打开设置`, `${petName}: press Enter for settings`), "aria-expanded": isSettingsOpen, onKeyDown: event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            setIsSettingsOpen(open => !open);
                        } }, children: _jsx(LivingPuppet, { poseName: hitPose, imgSrc: currentImgSrc, isMaiden: isMaiden, isGalGameMode: false, state: reaction && !status.isStreaming && !status.isReasoning ? 'IDLE' : status.state, box: { width: geometry.imageWidth, height: geometry.imageHeight, left: geometry.imageLeft }, live: preferences.liveMotion && liveSupported && !peekArt, motion: reduceMotion ? 0 : 1, emote: reaction?.emote ?? null, emoteKey: reaction?.key ?? 0, live2d: live2dBinding, opacity: puppetOpacity, onMouseDown: handleMouseDown, onTouch: docked ? undefined : touchHer, held: held }) })] }), isSettingsOpen && group && (_jsx("div", { ref: panelRef, className: "settingsDrawer", "data-mode": group.mode, "data-side": group.side, "data-flipping": panelFlipping || undefined, role: "dialog", "aria-labelledby": "pet-settings-title", style: { position: 'fixed', left: group.panel.x, top: group.panel.y, width: group.panel.width, height: group.panel.height, maxHeight: group.panel.maxHeight }, onClick: e => e.stopPropagation(), onMouseDown: e => e.stopPropagation(), children: settingsPanel }))] }, "widget"));
}
//# sourceMappingURL=PetOverlay.js.map
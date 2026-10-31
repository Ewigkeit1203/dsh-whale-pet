import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { SettingsPanel } from './SettingsPanel.js';
import { viewportPanel, paginateText, revealDelay, diagnosticReport } from './usability.js';
import { PetAudio, dialogueBlocks, readConversationLog, parseBalance } from './experience.js';
import { DialogueContent } from './DialogueContent.js';
import { readPreferences, savePreferences, quietPreset, defaultPreferences } from './preferences.js';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { LivingPuppet } from './LivingPuppet.js';
import { MAID_DATA_URI, CHIBI_DATA_URI, ANSWERING_DATA_URI, BAIFAN_DATA_URI, GETIT_DATA_URI, SAJIAO_DATA_URI, THINK1_DATA_URI, THINK2_DATA_URI, THINK3_DATA_URI, THINK4_DATA_URI, THINK5_DATA_URI, DIZZY_DATA_URI, } from './assets-data.js';
import styles from './PetOverlay.module.css';
/**
 * Splits dialogue text into complete-sentence pages that comfortably fill the GalGame dialogue box.
 * Ensures complete sentences without abrupt mid-sentence cutoffs.
 */
function paginateDialogue(text, width, height, font) {
    const blocks = dialogueBlocks(text);
    let measure;
    if (typeof document.createElement === 'function') {
        const context = document.createElement('canvas').getContext('2d');
        if (context) {
            context.font = font + 'px "Microsoft YaHei", sans-serif';
            measure = value => context.measureText(value).width;
        }
    }
    return blocks.flatMap(block => block.kind === 'code' ? ['```' + (block.language || '') + '\n' + block.text + '\n```'] : paginateText(block.text, width, height, font, measure));
}
export function PetOverlay({ stateMachine }) {
    const [preferences, setPreferences] = useState(readPreferences);
    const sizeSteps = [0.5, 0.75, 1, 1.15, 1.3];
    const selectedSize = sizeSteps.reduce((nearest, value) => Math.abs(value - preferences.scale) < Math.abs(nearest - preferences.scale) ? value : nearest);
    const t = (zh, en) => preferences.language === 'en' ? en : zh;
    const update = (patch) => setPreferences(prev => ({ ...prev, ...patch }));
    const [status, setStatus] = useState(() => stateMachine.getStatus());
    const [position, setPosition] = useState({
        x: preferences.x ?? Math.max(10, window.innerWidth - 300),
        y: preferences.y ?? Math.max(90, window.innerHeight - Math.min(480, window.innerHeight * 0.6) - 30),
        side: 'right',
    });
    const [uiHidden, setUiHidden] = useState(false);
    const [logOpen, setLogOpen] = useState(false);
    const [history, setHistory] = useState([]);
    const [revealed, setRevealed] = useState(0);
    const [toast, setToast] = useState('');
    const [affection, setAffection] = useState('');
    const [clock, setClock] = useState(() => Date.now());
    const audioRef = useRef(null);
    if (!audioRef.current)
        audioRef.current = new PetAudio();
    const previousPose = useRef('');
    const revealIdentity = useRef({ page: -1, text: '' });
    const startedAt = useRef(0);
    const lunchDay = useRef('');
    const headPat = useRef({ x: 0, direction: 0, turns: 0, time: 0, cooldown: 0 });
    const [pageBox, setPageBox] = useState({ width: 760, height: 140 });
    const [doctor, setDoctor] = useState('');
    const [ghost, setGhost] = useState(false);
    const [petHidden, setPetHidden] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [bubbleHidden, setBubbleHidden] = useState(false);
    const panelTether = useRef(position);
    const wheelTime = useRef(0);
    const [dimmed, setDimmed] = useState(false);
    const [foreground, setForeground] = useState(true);
    const [reduceMotion, setReduceMotion] = useState(false);
    const previousStream = useRef(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsAnchor, setSettingsAnchor] = useState({ x: 16, y: 90 });
    const [isBouncing, setIsBouncing] = useState(false);
    const wanderingEnabled = preferences.wandering;
    const setWanderingEnabled = (wandering) => update({ wandering });
    const [inputValue, setInputValue] = useState('');
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [isThoughtBubbleVisible, setIsThoughtBubbleVisible] = useState(true);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef(null);
    const wanderTimerRef = useRef(null);
    const delayedTimers = useRef(new Set());
    const menuTimerRef = useRef(null);
    const textScrollRef = useRef(null);
    const thoughtScrollRef = useRef(null);
    const followThoughtRef = useRef(true);
    const lastDialogueRef = useRef('');
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
    useEffect(() => {
        stateMachine.setForm(preferences.form);
        stateMachine.setAutoGalGameOnChat(preferences.autoGalGame);
    }, [stateMachine]);
    useEffect(() => {
        const timer = setTimeout(() => savePreferences({ ...preferences, form: status.form, autoGalGame: status.autoGalGameOnChat, x: position.x, y: position.y }), 250);
        return () => clearTimeout(timer);
    }, [preferences, status.form, status.autoGalGameOnChat, position]);
    const companionSpeech = preferences.language === 'zh' ? status.speech :
        status.pose === 'sajiao' ? 'Hey, stay with your little whale a little longer!' :
            ({ IDLE: 'Your little whale is right here with you.', PEEKING: 'I’m listening. What’s on your mind?', REASONING: 'Let me think this through…', ANSWERING: 'Putting the answer together for you…', EATING: 'Time for a little rice break!', WANDERING: 'Taking a little stroll…' }[status.state]);
    const phaseLabel = ({ IDLE: t('待机', 'Ready'), PEEKING: t('倾听中', 'Listening'), REASONING: t('思考中', 'Thinking'), ANSWERING: t('回答中', 'Answering'), EATING: t('休息中', 'Resting'), WANDERING: t('散步中', 'Strolling') }[status.state]);
    useEffect(() => {
        if (!isSettingsOpen)
            return;
        const place = () => {
            const composer = document.querySelector('[data-composer-card], [data-composer-seat]')?.getBoundingClientRect();
            const panel = viewportPanel(window.innerWidth, window.innerHeight, position.x, position.y, composer?.top);
            setSettingsAnchor({ x: panel.x, y: panel.y });
        };
        place();
        window.addEventListener('resize', place);
        const dismiss = (event) => { if (event.target instanceof Element && !event.target.closest('[data-whale-pet]'))
            setIsSettingsOpen(false); };
        const escape = (event) => { if (event.key === 'Escape')
            setIsSettingsOpen(false); };
        window.addEventListener('pointerdown', dismiss, true);
        window.addEventListener('keydown', escape);
        return () => { window.removeEventListener('resize', place); window.removeEventListener('pointerdown', dismiss, true); window.removeEventListener('keydown', escape); };
    }, [isSettingsOpen]);
    useEffect(() => {
        const previous = panelTether.current;
        panelTether.current = position;
        if (!isSettingsOpen || (!isDragging && affection !== 'float' && affection !== 'dizzy'))
            return;
        const composerTop = document.querySelector('[data-composer-card], [data-composer-seat]')?.getBoundingClientRect().top ?? window.innerHeight;
        setSettingsAnchor(anchor => ({ x: Math.max(16, Math.min(window.innerWidth - 356, anchor.x + position.x - previous.x)), y: Math.max(16, Math.min(Math.max(16, composerTop - 180), anchor.y + position.y - previous.y)) }));
    }, [position.x, position.y, isSettingsOpen, isDragging, affection]);
    useEffect(() => {
        const down = (event) => {
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
    }, [stateMachine]);
    // Subscribe to state machine
    useEffect(() => {
        return stateMachine.subscribe((newStatus) => {
            setStatus(newStatus);
        });
    }, [stateMachine]);
    useEffect(() => {
        const fit = () => {
            const node = document.querySelector('[data-whale-pet="widget"]');
            if (!node)
                return;
            const rect = node.getBoundingClientRect();
            setPosition(prev => ({ ...prev,
                x: Math.max(10, Math.min(prev.x, window.innerWidth - rect.width - 16)),
                y: Math.max(90, Math.min(prev.y, window.innerHeight - rect.height - 16)),
            }));
        };
        fit();
        window.addEventListener('resize', fit);
        document.addEventListener('load', fit, true);
        return () => {
            window.removeEventListener('resize', fit);
            document.removeEventListener('load', fit, true);
        };
    }, [status.form, status.pose, status.isGalGameMode, preferences.scale]);
    useEffect(() => {
        if (!status.isGalGameMode) {
            setUiHidden(false);
            setLogOpen(false);
        }
    }, [status.isGalGameMode]);
    useEffect(() => {
        const pause = () => { if (document.hidden)
            audioRef.current?.silence(); };
        document.addEventListener('visibilitychange', pause);
        return () => document.removeEventListener('visibilitychange', pause);
    }, []);
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
    }, [status.isGalGameMode, preferences.fontSize, preferences.reading, expanded]);
    useEffect(() => {
        const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        const motion = () => setReduceMotion(media?.matches ?? false);
        const visibility = () => { const active = !document.hidden && document.hasFocus(); setForeground(active); stateMachine.setPaused(!active); if (!active)
            audioRef.current?.silence(); };
        motion();
        visibility();
        media?.addEventListener('change', motion);
        window.addEventListener('focus', visibility);
        window.addEventListener('blur', visibility);
        document.addEventListener('visibilitychange', visibility);
        let timer;
        const reading = (event) => {
            if (!(event.target instanceof Element) || event.target.closest('[data-whale-pet]'))
                return;
            if (event.type === 'wheel' || event.target.closest('[data-chat-node-key], [data-composer-card], [data-composer-seat]')) {
                setDimmed(true);
                if (timer)
                    clearTimeout(timer);
                timer = setTimeout(() => setDimmed(false), 1200);
            }
            else
                setDimmed(false);
        };
        window.addEventListener('pointermove', reading, { passive: true });
        window.addEventListener('wheel', reading, { passive: true });
        return () => { if (timer)
            clearTimeout(timer); stateMachine.setPaused(false); media?.removeEventListener('change', motion); window.removeEventListener('focus', visibility); window.removeEventListener('blur', visibility); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pointermove', reading); window.removeEventListener('wheel', reading); };
    }, [stateMachine]);
    useEffect(() => {
        if (previousStream.current && !status.isStreaming && !status.isReasoning && !foreground && preferences.notifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const notification = new Notification('大肥鱼 · Little Whale', { body: t('回答完成啦，回来看看吧。', 'Your answer is ready.'), tag: 'whale-finished' });
            notification.onclick = () => { window.focus(); notification.close(); };
        }
        previousStream.current = status.isStreaming;
    }, [status.isStreaming, status.isReasoning, foreground, preferences.notifications]);
    // Sync GalGame mode class to document.body
    useEffect(() => {
        if (status.isGalGameMode) {
            document.body.classList.add('dsh-galgame-mode');
        }
        else {
            document.body.classList.remove('dsh-galgame-mode');
        }
        return () => {
            document.body.classList.remove('dsh-galgame-mode');
        };
    }, [status.isGalGameMode]);
    // Paginate reply text for Visual Novel paragraph progression
    // 目标字数与剧场框尺寸匹配：框加大后尽量放满每一段
    const dialoguePages = useMemo(() => {
        return paginateDialogue(status.latestDialogue || companionSpeech, pageBox.width, pageBox.height, preferences.fontSize);
    }, [status.latestDialogue, companionSpeech, pageBox, preferences.fontSize]);
    // Reset pagination when a new response starts
    useEffect(() => {
        const cur = status.latestDialogue || status.speech;
        if (cur !== lastDialogueRef.current) {
            if (!lastDialogueRef.current || !cur.startsWith(lastDialogueRef.current.slice(0, 30))) {
                setCurrentPageIndex(0);
            }
            lastDialogueRef.current = cur;
        }
    }, [status.latestDialogue, status.speech]);
    useEffect(() => {
        if (!status.isGalGameMode)
            return;
        const close = (event) => {
            const target = event.target;
            if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || target?.closest('input, textarea, select, button, summary, [contenteditable="true"]'))
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
            if (event.key === 'Escape' && !event.isComposing) {
                const more = document.querySelector('[data-whale-pet] details[open]');
                if (more) {
                    more.removeAttribute('open');
                    return;
                }
                ;
                if (uiHidden)
                    setUiHidden(false);
                else if (logOpen)
                    setLogOpen(false);
                else
                    stateMachine.setGalGameMode(false);
            }
        };
        window.addEventListener('keydown', close);
        return () => window.removeEventListener('keydown', close);
    }, [status.isGalGameMode, stateMachine, uiHidden, logOpen, revealed, currentPageIndex, dialoguePages, preferences.autoAdvance, preferences.reading]);
    // Re-open thought bubble when new reasoning begins
    useEffect(() => {
        if (status.isReasoning) {
            followThoughtRef.current = true;
            setIsThoughtBubbleVisible(true);
        }
    }, [status.isReasoning]);
    // Auto-scroll thought bubble as CoT streams in
    useEffect(() => {
        if (thoughtScrollRef.current && followThoughtRef.current) {
            thoughtScrollRef.current.scrollTop = thoughtScrollRef.current.scrollHeight;
        }
    }, [status.reasoningText]);
    // Auto-scroll dialogue box when streaming
    useEffect(() => {
        if (status.isGalGameMode && textScrollRef.current && preferences.reading === 'pages') {
            textScrollRef.current.scrollTop = textScrollRef.current.scrollHeight;
        }
    }, [currentPageIndex, status.latestDialogue, status.isGalGameMode]);
    useEffect(() => {
        const timer = setInterval(() => { if (!document.hidden)
            setClock(Date.now()); }, 1000);
        return () => { clearInterval(timer); audioRef.current?.dispose(); };
    }, []);
    useEffect(() => {
        if (preferences.muted || preferences.quiet)
            audioRef.current?.silence();
    }, [preferences.muted, preferences.quiet]);
    useEffect(() => {
        const pose = status.pose;
        if (pose !== previousPose.current && !preferences.muted && !preferences.quiet) {
            if (pose === 'getit')
                audioRef.current?.play('ding', preferences.volume);
            if (pose === 'sajiao')
                audioRef.current?.play('jelly', preferences.volume);
            if (pose === 'eating')
                audioRef.current?.play('rice', preferences.volume);
        }
        previousPose.current = pose;
    }, [status.pose, preferences.muted, preferences.quiet, preferences.volume]);
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
    // Menu hover persistence logic
    const handleMouseEnterPet = useCallback(() => {
        if (menuTimerRef.current) {
            clearTimeout(menuTimerRef.current);
            menuTimerRef.current = null;
        }
        setDimmed(false);
        setIsMenuOpen(true);
    }, []);
    const handleMouseLeavePet = useCallback(() => {
        if (menuTimerRef.current)
            clearTimeout(menuTimerRef.current);
        menuTimerRef.current = later(() => {
            setIsMenuOpen(false);
        }, 750);
    }, []);
    // Mouse gaze tracking listener
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (status.isInputFocused)
                return;
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const nx = (e.clientX - centerX) / (window.innerWidth / 2);
            const ny = (e.clientY - centerY) / (window.innerHeight / 2);
            stateMachine.setGazeOffset({ x: nx, y: ny });
        };
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [status.isInputFocused, stateMachine]);
    // Wandering Logic (Pauses on dragging)
    useEffect(() => {
        if (petHidden || !wanderingEnabled || status.isGalGameMode || reduceMotion || !foreground || preferences.docked) {
            if (wanderTimerRef.current !== null) {
                clearInterval(wanderTimerRef.current);
                wanderTimerRef.current = null;
            }
            return;
        }
        const interval = setInterval(() => {
            if (isDraggingRef.current || isMenuOpen || isSettingsOpen)
                return;
            const curStatus = stateMachine.getStatus();
            if (curStatus.state !== 'IDLE' && curStatus.state !== 'WANDERING')
                return;
            stateMachine.setWandering(true);
            const margin = 40;
            const width = status.form === 'maiden' ? 280 : 170;
            const height = status.form === 'maiden' ? 420 : 220;
            const maxX = Math.max(margin, window.innerWidth - width - margin);
            const minX = Math.max(margin, window.innerWidth - 420);
            const targetX = Math.floor(minX + Math.random() * (maxX - minX));
            const targetY = Math.max(margin, window.innerHeight - height - margin);
            setPosition((prev) => ({
                x: targetX,
                y: targetY,
                side: targetX < window.innerWidth / 2 ? 'left' : 'right',
            }));
            later(() => {
                // Wandering finishes: pause and eat a couple bites of white rice
                stateMachine.finishWanderingWithEating(3500);
            }, 3300);
        }, 14000);
        wanderTimerRef.current = interval;
        return () => {
            clearInterval(interval);
            wanderTimerRef.current = null;
        };
    }, [wanderingEnabled, status.form, status.isGalGameMode, isMenuOpen, isSettingsOpen, stateMachine, reduceMotion, foreground, preferences.docked, petHidden]);
    // Dragging and click handlers for floating widget (Double-click shrunk state completely removed)
    const handleMouseDown = useCallback((e) => {
        if (status.isGalGameMode || preferences.docked || e.button !== 0)
            return;
        stateMachine.resetActivity();
        isDraggingRef.current = true;
        setIsDragging(true);
        stateMachine.setWandering(false);
        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            petX: position.x,
            petY: position.y,
            startTime: Date.now(),
            maxDistance: 0,
            distance: 0, lastX: e.clientX, lastY: e.clientY, lastMove: Date.now(), vx: 0, vy: 0,
        };
    }, [position, status.isGalGameMode, stateMachine, preferences.docked]);
    useEffect(() => {
        if (!isDragging)
            return;
        const handleMouseMove = (e) => {
            if (!dragStartRef.current)
                return;
            const moveElapsed = Math.max(16, Date.now() - dragStartRef.current.lastMove);
            dragStartRef.current.vx = (e.clientX - dragStartRef.current.lastX) / moveElapsed;
            dragStartRef.current.vy = (e.clientY - dragStartRef.current.lastY) / moveElapsed;
            dragStartRef.current.lastMove = Date.now();
            dragStartRef.current.distance += Math.hypot(e.clientX - dragStartRef.current.lastX, e.clientY - dragStartRef.current.lastY);
            dragStartRef.current.lastX = e.clientX;
            dragStartRef.current.lastY = e.clientY;
            const dx = e.clientX - dragStartRef.current.startX;
            const dy = e.clientY - dragStartRef.current.startY;
            dragStartRef.current.maxDistance = Math.max(dragStartRef.current.maxDistance, Math.hypot(dx, dy));
            const rect = document.querySelector('[data-whale-pet="widget"]')?.getBoundingClientRect();
            const newX = Math.max(10, Math.min(window.innerWidth - (rect?.width || 280) - 16, dragStartRef.current.petX + dx));
            const newY = Math.max(90, Math.min(window.innerHeight - (rect?.height || 480) - 16, dragStartRef.current.petY + dy));
            setPosition({
                x: newX,
                y: newY,
                side: newX < window.innerWidth / 2 ? 'left' : 'right',
            });
        };
        const handleMouseUp = (e) => {
            isDraggingRef.current = false;
            setIsDragging(false);
            if (dragStartRef.current) {
                const dist = Math.max(dragStartRef.current.maxDistance, Math.hypot(e.clientX - dragStartRef.current.startX, e.clientY - dragStartRef.current.startY));
                const duration = Date.now() - dragStartRef.current.startTime;
                if (dist >= 6) {
                    const dizzy = dragStartRef.current.distance > 900 && duration < 2500;
                    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && Date.now() - dragStartRef.current.lastMove < 100) {
                        const rect = document.querySelector('[data-whale-pet="widget"]')?.getBoundingClientRect();
                        const vx = Math.max(-30, Math.min(30, dragStartRef.current.vx * 70));
                        const vy = Math.max(-20, Math.min(20, dragStartRef.current.vy * 70));
                        setPosition(previous => ({ ...previous, x: Math.max(10, Math.min(window.innerWidth - (rect?.width || 280) - 16, previous.x + vx)), y: Math.max(90, Math.min(window.innerHeight - (rect?.height || 480) - 16, previous.y + vy)) }));
                    }
                    setAffection(dizzy ? 'dizzy' : 'float');
                    later(() => setAffection(''), dizzy ? 2400 : 800);
                }
                if (dist < 6 && duration < 380) {
                    // Direct single-click: Q-bounce + Mad/Sajiao reaction + Slide out Settings
                    setIsBouncing(true);
                    later(() => setIsBouncing(false), 480);
                    stateMachine.triggerMad();
                    setIsSettingsOpen((prev) => !prev);
                }
            }
            dragStartRef.current = null;
        };
        window.addEventListener('mousemove', handleMouseMove);
        const cancelDrag = () => { isDraggingRef.current = false; setIsDragging(false); dragStartRef.current = null; };
        window.addEventListener('blur', cancelDrag);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('blur', cancelDrag);
        };
    }, [isDragging, stateMachine]);
    // Advance GalGame text page on clicking dialogue text
    const handleAdvancePage = () => {
        if (isRevealing) {
            setRevealed(Array.from(displayDialogue).length);
            return;
        }
        if (preferences.reading !== 'pages')
            return;
        if (currentPageIndex < dialoguePages.length - 1) {
            setCurrentPageIndex((prev) => prev + 1);
        }
        else if (dialoguePages.length > 1) {
            setCurrentPageIndex(0);
        }
    };
    // Send message via native DSH composer
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
                    const inputEvent = new InputEvent('beforeinput', {
                        bubbles: true,
                        cancelable: true,
                        inputType: 'insertText',
                        data: text,
                    });
                    composerEl.dispatchEvent(inputEvent);
                }
                catch {
                    // ignore
                }
                composerEl.textContent = text;
                composerEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        later(() => {
            const card = document.querySelector('[data-composer-card]') || document.querySelector('[data-composer-seat]');
            let sendBtn = null;
            if (card) {
                const buttons = Array.from(card.querySelectorAll('button'));
                sendBtn = (buttons.find((b) => {
                    const aria = b.getAttribute('aria-label') || b.textContent || '';
                    return /send|发送|steer|queue/i.test(aria) && !b.disabled && b.getAttribute('aria-disabled') !== 'true';
                }) || null);
            }
            if (sendBtn && !sendBtn.hasAttribute('disabled')) {
                sendBtn.click();
                setInputValue('');
            }
            else {
                stateMachine.setLatestDialogue(t('暂时无法发送，请检查 DSH 输入框与发送按钮。你的草稿已保留。', 'Unable to send. Check the DSH composer; your draft has been kept.'));
            }
        }, 80);
    };
    // Dynamic Image Selection
    const resolveCharacterImage = () => {
        if (status.form === 'chibi') {
            return CHIBI_DATA_URI; // DaFeiYu.png
        }
        // Maiden form poses:
        if (status.pose === 'sajiao' || status.pose === 'mad')
            return SAJIAO_DATA_URI;
        if (status.isStreaming)
            return ANSWERING_DATA_URI;
        if (status.pose === 'eating' || status.state === 'EATING')
            return BAIFAN_DATA_URI;
        if (status.pose === 'answering' || status.state === 'ANSWERING')
            return ANSWERING_DATA_URI;
        if (status.pose === 'getit')
            return GETIT_DATA_URI;
        if (status.pose === 'think1')
            return THINK1_DATA_URI;
        if (status.pose === 'think2')
            return THINK2_DATA_URI;
        if (status.pose === 'think3')
            return THINK3_DATA_URI;
        if (status.pose === 'think4')
            return THINK4_DATA_URI;
        if (status.pose === 'think5')
            return THINK5_DATA_URI;
        if (status.state === 'REASONING') {
            return THINK1_DATA_URI;
        }
        return MAID_DATA_URI;
    };
    const isMaiden = status.form === 'maiden';
    const currentImgSrc = affection === 'pat' ? SAJIAO_DATA_URI : affection === 'dizzy' && !status.isStreaming ? DIZZY_DATA_URI : resolveCharacterImage();
    const hitPose = [[DIZZY_DATA_URI, 'Dizzy'], [MAID_DATA_URI, 'Maid'], [CHIBI_DATA_URI, 'DaFeiYu'], [BAIFAN_DATA_URI, 'baifan'], [ANSWERING_DATA_URI, 'Answering'], [SAJIAO_DATA_URI, 'sajiao'], [GETIT_DATA_URI, 'getit'], [THINK1_DATA_URI, 'Think1'], [THINK2_DATA_URI, 'Think2'], [THINK3_DATA_URI, 'Think3'], [THINK4_DATA_URI, 'Think4'], [THINK5_DATA_URI, 'Think5']].find(([src]) => src === currentImgSrc)?.[1] || 'Maid';
    const displayDialogue = preferences.reading === 'scroll' ? status.latestDialogue || companionSpeech : dialoguePages[currentPageIndex] || dialoguePages[0] || '';
    const characters = useMemo(() => Array.from(displayDialogue), [displayDialogue]);
    const canReveal = preferences.typewriter && preferences.speed !== 'instant' && !reduceMotion && status.latestDialogue.length <= 600 && !/```|\|.*\|/.test(displayDialogue);
    const isRevealing = canReveal && preferences.reading === 'pages' && revealed < characters.length;
    const visibleText = isRevealing ? characters.slice(0, revealed).join('') : displayDialogue;
    useEffect(() => {
        const previous = revealIdentity.current;
        if (previous.page !== currentPageIndex || !displayDialogue.startsWith(previous.text))
            setRevealed(0);
        revealIdentity.current = { page: currentPageIndex, text: displayDialogue };
    }, [currentPageIndex, displayDialogue]);
    useEffect(() => {
        if (!canReveal || revealed >= characters.length || !foreground || !status.isGalGameMode || uiHidden || logOpen || !preferences.typewriter || preferences.reading !== 'pages')
            return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            setRevealed(characters.length);
            return;
        }
        const timer = setTimeout(() => {
            setRevealed(count => Math.min(count + 1, characters.length));
        }, revealDelay(characters[Math.max(0, revealed - 1)] || '', preferences.speed));
        return () => clearTimeout(timer);
    }, [status.isGalGameMode, uiHidden, logOpen, preferences.typewriter, preferences.reading, preferences.muted, preferences.quiet, preferences.volume, characters.length, revealed, canReveal, foreground, preferences.speed]);
    useEffect(() => {
        if (!preferences.autoAdvance || preferences.reading !== 'pages' || !status.isGalGameMode || status.isStreaming || isRevealing || uiHidden || logOpen || currentPageIndex >= dialoguePages.length - 1)
            return;
        const timer = setTimeout(() => setCurrentPageIndex(i => Math.min(i + 1, dialoguePages.length - 1)), Math.min(4000, Math.max(2000, characters.length * 15)));
        return () => clearTimeout(timer);
    }, [preferences.autoAdvance, preferences.reading, status.isGalGameMode, status.isStreaming, isRevealing, uiHidden, logOpen, currentPageIndex, dialoguePages, characters.length]);
    useEffect(() => {
        if (!foreground || preferences.muted || preferences.quiet || uiHidden || logOpen || !(status.isStreaming || (status.isGalGameMode && isRevealing)))
            return;
        let syllable = 0;
        const timer = setInterval(() => {
            // Short phrases with breathing spaces keep the voice gentle rather than a continuous beep.
            if (document.hidden)
                return;
            if (syllable++ % 7 < 5)
                audioRef.current?.play('blip', preferences.volume);
        }, 105);
        return () => clearInterval(timer);
    }, [preferences.muted, preferences.quiet, preferences.volume, uiHidden, logOpen, status.isStreaming, status.isGalGameMode, isRevealing, foreground]);
    const copyCode = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setToast(t('代码已复制', 'Code copied'));
        }
        catch {
            setToast(t('复制失败，请选中代码手动复制', 'Copy failed. Select the code and copy it manually.'));
        }
        later(() => setToast(''), 2500);
    };
    const unlockAudio = () => { if (!preferences.muted && !preferences.quiet)
        audioRef.current?.unlock(); };
    const toggleMute = () => { if (preferences.muted)
        audioRef.current?.unlock();
    else
        audioRef.current?.silence(); update({ muted: !preferences.muted }); };
    const codeText = dialogueBlocks(status.latestDialogue).filter(block => block.kind === 'code').map(block => block.text).join('\n\n');
    const nativeSpeed = useMemo(() => {
        const value = document.querySelector('[data-tokens-per-second]')?.getAttribute('data-tokens-per-second');
        return value && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
    }, [clock]);
    const elapsed = startedAt.current ? Math.max(0, (clock - startedAt.current) / 1000).toFixed(1) : null;
    const sameCurrency = (status.toppedUpBalance.match(/[$¥￥€£]/)?.[0]?.replace('￥', '¥') ?? '') === (status.grantedBalance.match(/[$¥￥€£]/)?.[0]?.replace('￥', '¥') ?? '');
    const balance = status.balancesKnown && sameCurrency ? (parseBalance(status.toppedUpBalance) ?? 0) + (parseBalance(status.grantedBalance) ?? 0) : null;
    const lowBalance = balance !== null && balance < 2;
    const hour = new Date(clock).getHours();
    const contextualSpeech = affection === 'pat' ? t('嘿嘿……最喜欢你摸摸头啦～', 'Hehe… I love head pats!') : affection === 'dizzy' ? t('头好晕……深海漩涡出现啦！', 'Whoa… a deep-sea whirlpool!') : preferences.reminders && status.state === 'IDLE' && hour >= 1 && hour < 5 ? t('呼啊……夜深啦，记得休息，我陪着你。', 'It’s late… remember to rest. I’m right here.') : preferences.reminders && status.state === 'EATING' && hour === 12 ? t('午饭时间到！你也要按时吃饭哦～', 'Lunch time! Remember to have something to eat.') : lowBalance && status.state === 'IDLE' ? t('深海算力快见底啦，记得看看余额哦。', 'Our deep-sea credit is getting low. Check your balance.') : companionSpeech;
    const patHead = (event) => {
        if (event.buttons || isDraggingRef.current)
            return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left + rect.width * 0.25 || event.clientX > rect.left + rect.width * 0.75)
            return;
        if (event.clientY > rect.top + rect.height * 0.36 || event.clientY < rect.top + rect.height * 0.08)
            return;
        const sample = headPat.current, now = Date.now(), dx = event.clientX - sample.x;
        if (now < sample.cooldown || Math.abs(dx) < 8)
            return;
        if (now - sample.time > 700)
            sample.turns = 0;
        const direction = Math.sign(dx);
        if (direction !== sample.direction)
            sample.turns++;
        sample.x = event.clientX;
        sample.direction = direction;
        sample.time = now;
        if (sample.turns >= 5) {
            sample.turns = 0;
            sample.cooldown = now + 4000;
            setAffection('pat');
            stateMachine.resetActivity();
            if (!preferences.muted && !preferences.quiet)
                audioRef.current?.play('jelly', preferences.volume);
            later(() => setAffection(''), 2000);
        }
    };
    const stateClass = status.state === 'PEEKING'
        ? styles.statePeeking
        : status.state === 'REASONING'
            ? styles.stateReasoning
            : status.state === 'ANSWERING'
                ? styles.stateAnswering
                : status.state === 'EATING'
                    ? styles.stateEating
                    : status.state === 'WANDERING'
                        ? styles.stateWandering
                        : styles.stateIdle;
    // -------------------------------------------------------------
    // GalGame Mode: Screen Centered Stage & Comic Thought Bubble
    // -------------------------------------------------------------
    if (status.isGalGameMode) {
        const showThoughtBubble = isThoughtBubbleVisible && (status.isReasoning || Boolean(status.reasoningText));
        return (_jsxs(_Fragment, { children: [_jsx("div", { "data-whale-pet": "backdrop", "data-pet-theme": preferences.theme, lang: preferences.language === 'zh' ? 'zh-CN' : 'en', className: "galgameBackdrop", onClick: () => uiHidden ? setUiHidden(false) : stateMachine.setGalGameMode(false), onPointerDown: unlockAudio, title: t("点击空白区域退出对话模式", "Click background to exit") }), !uiHidden && showThoughtBubble && (_jsxs("div", { "data-whale-pet": "thought", "data-pet-theme": preferences.theme, lang: preferences.language === 'zh' ? 'zh-CN' : 'en', className: "comicThoughtBubble", children: [_jsxs("div", { className: "thoughtBubbleHeader", children: [_jsxs("div", { className: "thoughtBubbleTitleGroup", children: [_jsx("span", { children: "\uD83D\uDCAD" }), _jsx("span", { children: t("深度思考过程", "Thoughts") }), status.isReasoning && _jsx("span", { className: "thoughtLivePill", children: t("推理中...", "Thinking…") })] }), _jsx("button", { className: "thoughtCloseBtn", onClick: () => setIsThoughtBubbleVisible(false), title: t("隐藏思考气泡", "Hide thoughts"), children: "\u2715" })] }), _jsx("div", { className: "thoughtBubbleContent", style: { '--pet-text-size': preferences.fontSize + 'px' }, ref: thoughtScrollRef, onScroll: e => { const node = e.currentTarget; followThoughtRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 36; }, children: status.reasoningText || t('正在整理思路……', 'Thinking things through…') }), _jsx("div", { className: "comicTrailNode trail1" }), _jsx("div", { className: "comicTrailNode trail2" }), _jsx("div", { className: "comicTrailNode trail3" })] })), _jsx("div", { "data-expanded": expanded, "data-theatre-hidden": uiHidden, "data-whale-pet": "stage", "data-pet-theme": preferences.theme, lang: preferences.language === 'zh' ? 'zh-CN' : 'en', className: `galgameCharacterCentered ${isMaiden ? 'galgameCharacterMaiden' : 'galgameCharacterChibi'}`, children: _jsx(LivingPuppet, { poseName: hitPose, imgSrc: currentImgSrc, isMaiden: isMaiden, isGalGameMode: true, mouthOpenRatio: status.mouthOpenRatio, gazeOffset: status.gazeOffset, state: status.state }) }), !uiHidden && _jsxs("div", { onPointerDownCapture: event => { unlockAudio(); if (!event.target.closest('details'))
                        event.currentTarget.querySelector('details[open]')?.removeAttribute('open'); }, "data-whale-pet": "dialogue", "data-pet-theme": preferences.theme, lang: preferences.language === 'zh' ? 'zh-CN' : 'en', className: "galgameTheatreBox", "data-expanded": expanded, children: [_jsxs("div", { className: "galgameHeaderBar", children: [_jsxs("div", { className: "galgameNameTag", children: [_jsx("span", { children: "\uD83D\uDC1F" }), _jsx("span", { children: preferences.petName === '大肥鱼' ? t("大肥鱼", "Little Whale") : preferences.petName })] }), _jsxs("div", { className: "galgameTopControls", children: [(status.isStreaming || status.isReasoning) && _jsxs("span", { className: "petPhase", role: "status", children: [phaseLabel, elapsed !== null ? ' · ' + elapsed + 's' : '', nativeSpeed !== null ? ' · ' + nativeSpeed.toFixed(1) + ' tokens/s' : ''] }), _jsx("button", { className: "galgameCloseBtn", "aria-pressed": expanded, onClick: () => setExpanded(value => !value), children: expanded ? t('标准剧场', 'Standard') : t('大屏阅读', 'Expand') }), _jsx("button", { className: "galgameCloseBtn", title: t('查看已加载的问答', 'Review loaded messages'), onClick: () => { setHistory(readConversationLog()); setLogOpen(true); }, children: t('回顾', 'Log') }), _jsx("button", { className: "galgameCloseBtn", title: t('读完后自动显示下一段', 'Show the next page automatically after reading'), "aria-pressed": preferences.autoAdvance, onClick: () => update({ autoAdvance: !preferences.autoAdvance }), children: preferences.autoAdvance ? t('自动：开', 'Auto: On') : t('自动：关', 'Auto: Off') }), _jsxs("details", { className: "petTheatreMore", children: [_jsx("summary", { "aria-label": t('更多选项', 'More options'), title: t('更多选项', 'More options'), children: "\u2022\u2022\u2022" }), _jsxs("div", { className: "petMorePanel", onClick: e => { if (e.target.closest('button'))
                                                        e.currentTarget.closest('details')?.removeAttribute('open'); }, children: [_jsxs("button", { onClick: () => setUiHidden(true), children: [_jsx("span", { "aria-hidden": "true", children: "\u25C9" }), t('隐藏界面，欣赏立绘', 'Hide interface'), _jsx("kbd", { children: "H" })] }), _jsxs("button", { onClick: toggleMute, children: [_jsx("span", { "aria-hidden": "true", children: "\u266B" }), preferences.muted ? t('开启人物音效', 'Enable character sounds') : t('关闭人物音效', 'Mute character sounds')] }), _jsxs("button", { onClick: () => update({ reading: preferences.reading === 'pages' ? 'scroll' : 'pages' }), children: [_jsx("span", { "aria-hidden": "true", children: "\u25A4" }), preferences.reading === 'pages' ? t('切换为完整阅读', 'Read full response') : t('切换为分页阅读', 'Read in pages')] }), _jsx("hr", {}), _jsx("button", { onClick: () => update({ theme: preferences.theme === 'light' ? 'dark' : 'light' }), children: preferences.theme === 'light' ? t('☾ 深色主题', '☾ Dark theme') : t('☀ 浅色主题', '☀ Light theme') }), _jsxs("button", { onClick: () => update({ language: preferences.language === 'zh' ? 'en' : 'zh' }), children: [_jsx("span", { "aria-hidden": "true", children: "\u25CE" }), preferences.language === 'zh' ? 'English' : '中文'] })] })] }), _jsx("button", { className: "galgameCloseBtn", onClick: () => stateMachine.setGalGameMode(false), title: t('退出对话模式 (Escape)', 'Exit dialogue (Escape)'), children: t('✕ 退出', '✕ Exit') })] })] }), _jsxs("div", { className: "galgameTextBody", onWheel: event => {
                                if (preferences.reading !== 'pages' || event.target.closest('pre') || Math.abs(event.deltaY) < 15 || Date.now() - wheelTime.current < 400)
                                    return;
                                event.preventDefault();
                                wheelTime.current = Date.now();
                                if (event.deltaY > 0)
                                    handleAdvancePage();
                                else
                                    setCurrentPageIndex(index => Math.max(0, index - 1));
                            }, "data-reading": preferences.reading, style: { '--pet-text-size': preferences.fontSize + 'px' }, onPointerDown: unlockAudio, ref: textScrollRef, onClick: handleAdvancePage, role: "log", "aria-live": "polite", "aria-atomic": "false", tabIndex: 0, onKeyDown: e => { if (e.target !== e.currentTarget)
                                return; if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleAdvancePage();
                            } }, title: dialoguePages.length > 1 ? t("点击切换下一段话", "Next page") : undefined, children: [_jsx("span", { className: "galgameQuotes", children: "\u300C" }), _jsx(DialogueContent, { text: visibleText, copy: copyCode, copyLabel: t('复制', 'Copy') }), status.isStreaming && _jsx("span", { className: "galgameCursor" }), _jsx("span", { className: "galgameQuotes", children: "\u300D" })] }), preferences.reading === 'pages' && dialoguePages.length > 1 && _jsxs("div", { className: "petReadingNav", children: [_jsx("button", { disabled: currentPageIndex === 0, onClick: () => setCurrentPageIndex(i => Math.max(0, i - 1)), children: t('← 上一段', '← Previous') }), _jsxs("span", { className: "petSinglePage", children: [currentPageIndex + 1, " / ", dialoguePages.length] })] }), !isRevealing && preferences.reading === 'pages' && currentPageIndex < dialoguePages.length - 1 && _jsx("span", { className: "petNextTriangle", "aria-hidden": "true", children: "\u25BC" }), isRevealing && _jsx("button", { className: "petSkipReveal", onClick: () => setRevealed(characters.length), children: t('跳过本段动画', 'Reveal this page') }), _jsxs("div", { className: "galgameComposerArea", children: [_jsx("input", { type: "text", className: "galgameInput", placeholder: t("输入你的问题，与大肥鱼对话…… (Enter 发送)", "Talk to Little Whale… (Enter to send)"), value: inputValue, onChange: (e) => setInputValue(e.target.value), onKeyDown: (e) => {
                                        if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    } }), _jsx("button", { className: "galgameSendBtn", onClick: handleSendMessage, children: t('发送', 'Send') })] })] }), uiHidden && _jsx("button", { "data-whale-pet": "restore", "data-pet-theme": preferences.theme, className: "petRestore", onClick: () => setUiHidden(false), children: t('点击任意处恢复对话', 'Click anywhere to restore dialogue') }), logOpen && !uiHidden && _jsxs("aside", { "data-whale-pet": "log", "data-pet-theme": preferences.theme, className: "petLog", role: "dialog", "aria-label": t('历史回顾', 'Conversation log'), children: [_jsxs("header", { children: [_jsx("strong", { children: t('历史回顾', 'Conversation log') }), _jsx("button", { onClick: () => setLogOpen(false), children: t('关闭', 'Close') })] }), _jsx("p", { children: t('显示当前页面已加载的问答，切换会话后重新打开即可更新。', 'Showing messages loaded on this page. Reopen after switching conversations.') }), history.length ? history.map((entry, index) => _jsxs("article", { children: [_jsx("strong", { children: entry.role === 'user' ? t('你', 'You') : t('大肥鱼', 'Little Whale') }), _jsx("button", { onClick: () => void copyCode(entry.text), children: t('复制', 'Copy') }), _jsx(DialogueContent, { text: entry.text, copy: copyCode, copyLabel: t('复制', 'Copy') })] }, index)) : _jsx("p", { children: t('当前页面暂无已加载记录。', 'No loaded messages on this page.') })] }), toast && _jsx("div", { "data-whale-pet": "toast", className: "petToast", role: "status", children: toast })] }));
    }
    // -------------------------------------------------------------
    // Widget Mode: Floating Desktop Pet at Viewport Edge
    // -------------------------------------------------------------
    return (_jsxs("div", { "data-ghost": ghost && !isSettingsOpen, "data-hidden": petHidden, "data-paused": !foreground || reduceMotion, "data-dimmed": dimmed && !isSettingsOpen, "data-docked": preferences.docked, "data-whale-pet": "widget", "data-pet-theme": preferences.theme, lang: preferences.language === 'zh' ? 'zh-CN' : 'en', className: `${styles.overlayContainer} ${isDragging ? styles.dragging : affection === 'float' || affection === 'dizzy' ? 'petSettling' : status.state === 'WANDERING' ? styles.wandering : ''}`, style: {
            left: `${position.x}px`,
            top: `${position.y}px`,
        }, onPointerDown: unlockAudio, onMouseEnter: handleMouseEnterPet, onMouseLeave: handleMouseLeavePet, children: [doctor && _jsxs("aside", { "data-whale-pet": "doctor", "data-pet-theme": preferences.theme, className: "petLog", role: "dialog", "aria-label": "Doctor", children: [_jsx("button", { onClick: () => setDoctor(''), children: t('关闭', 'Close') }), _jsx("h2", { children: "Doctor" }), _jsx("p", { children: t('仅含选择器和匹配数量，不含聊天内容；空闲时生成标记可能缺失。', 'Selectors and counts only; no chat content. Generation markers can be absent while idle.') }), _jsx("pre", { children: doctor }), _jsx("button", { onClick: () => void copyCode(doctor), children: t('复制诊断信息', 'Copy diagnostics') })] }), !preferences.onboardingDone && !isSettingsOpen && _jsxs("aside", { className: "petOnboarding", children: [_jsx("strong", { children: t('认识一下大肥鱼', 'Meet Little Whale') }), _jsx("p", { children: t('在头顶来回移动鼠标，试试摸头。', 'Move the pointer over my head for a head pat.') }), _jsx("p", { children: t('点击聊天输入框，进入剧场模式。', 'Click the composer to enter the theatre.') }), _jsx("p", { children: t('按住角色拖动，带我换个位置。', 'Drag me to a new spot.') }), _jsx("button", { onClick: () => update({ onboardingDone: true }), children: t('知道了 / 跳过', 'Got it / Skip') })] }), toast && _jsx("div", { className: "petToast", role: "status", children: toast }), _jsxs("div", { className: `${styles.characterWrapper} ${stateClass}`, children: [_jsxs("div", { "data-settings-open": isSettingsOpen, className: `${styles.toolbar} ${isMenuOpen && !isSettingsOpen ? styles.toolbarVisible : ''}`, onMouseEnter: handleMouseEnterPet, onMouseLeave: handleMouseLeavePet, children: [status.balancesKnown && _jsxs("div", { "data-low": lowBalance, className: styles.balanceHeaderBar, title: t("当前账户实时余额", "Account balance"), children: [_jsx("span", { className: styles.balanceTag, children: t("充值:", "Paid:") }), _jsx("span", { className: styles.balanceVal, children: status.toppedUpBalance || '¥0.00' }), _jsx("span", { className: styles.balanceDivider, children: "|" }), _jsx("span", { className: styles.balanceTag, children: t("赠金:", "Bonus:") }), _jsx("span", { className: styles.balanceVal, children: status.grantedBalance || '¥0.00' }), balance !== null && _jsxs("span", { title: t('每碗额度可在设置调整；不估算今日用量', 'Credit per bowl is configurable; daily usage is not estimated'), children: [" \u00B7 ", t('还能吃', 'Bowls left'), " ", Math.floor(balance / preferences.ricePrice)] })] }), _jsxs("div", { className: styles.toolbarButtons, children: [_jsx("button", { className: styles.toolBtn, "aria-pressed": preferences.quiet, onClick: () => setPreferences(previous => quietPreset(previous)), children: preferences.quiet ? t('恢复陪伴', 'Resume') : t('安静模式', 'Quiet') }), _jsx("button", { className: styles.toolBtn, "aria-pressed": preferences.docked, onClick: () => update({ docked: !preferences.docked }), children: t('贴边', 'Dock') }), codeText && _jsx("button", { className: styles.toolBtn, onClick: () => void copyCode(codeText), children: t('复制代码', 'Copy code') }), _jsx("button", { className: styles.toolBtn, onClick: () => stateMachine.toggleForm(), title: t("切换少女立绘 / Q版形态", "Switch portrait / chibi"), children: isMaiden ? t("切换Q版", "Chibi") : t("切换立绘", "Portrait") }), _jsx("button", { className: styles.toolBtn, onClick: () => stateMachine.setGalGameMode(true), title: t("切换进入对话模式", "Open dialogue"), children: t('剧场模式', 'Theatre') }), _jsx("button", { className: styles.toolBtn, onClick: () => setIsSettingsOpen(!isSettingsOpen), title: t("展开更多设置面板", "Open settings"), children: t('设置', 'Settings') })] })] }), isSettingsOpen && (_jsxs("div", { className: styles.settingsDrawer, style: { position: 'fixed', left: settingsAnchor.x, top: settingsAnchor.y, maxWidth: 'calc(100vw - 32px)', maxHeight: Math.max(96, Math.min(window.innerHeight - 16, document.querySelector('[data-composer-card], [data-composer-seat]')?.getBoundingClientRect().top ?? window.innerHeight - 16) - settingsAnchor.y - 16) }, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: styles.drawerHeader, children: [_jsx("span", { children: t("🐟 大肥鱼设置", "🐟 Little Whale") }), _jsx("button", { className: styles.drawerCloseBtn, onClick: () => setIsSettingsOpen(false), title: t("关闭设置", "Close settings"), children: "\u2715" })] }), _jsxs("div", { className: "petSettingsBody", children: [SettingsPanel({ p: { ...preferences, form: status.form, autoGalGame: status.autoGalGameOnChat }, update: patch => { update(patch); if (patch.autoGalGame !== undefined)
                                            stateMachine.setAutoGalGameOnChat(patch.autoGalGame); }, toggleMute,
                                        quiet: () => setPreferences(previous => quietPreset(previous)),
                                        reset: () => { setPreferences({ ...defaultPreferences(), onboardingDone: true }); stateMachine.setForm('maiden'); stateMachine.setAutoGalGameOnChat(true); setPosition({ x: Math.max(16, window.innerWidth - 300), y: 100, side: 'right' }); },
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
                                        }
                                    }), _jsxs("div", { className: styles.drawerBtnGroup, children: [_jsx("button", { className: styles.drawerBtn, onClick: () => stateMachine.toggleForm(), children: t('切换角色形态', 'Switch character form') }), _jsx("button", { className: styles.drawerBtn, onClick: () => { setIsSettingsOpen(false); stateMachine.setGalGameMode(true); }, children: t('剧场模式', 'Theatre') })] })] })] })), !preferences.quiet && !bubbleHidden && status.speech && !isSettingsOpen && (_jsxs("div", { style: { fontSize: preferences.fontSize - 3 }, className: styles.speechBubble, onClick: () => stateMachine.setGalGameMode(true), role: "button", tabIndex: 0, onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            stateMachine.setGalGameMode(true);
                        } }, "data-side": position.x < window.innerWidth / 2 ? 'right' : 'left', children: [_jsx("button", { className: "petBubbleClose", "aria-label": t('隐藏闲聊气泡', 'Hide chatter bubble'), onClick: event => { event.stopPropagation(); setBubbleHidden(true); }, children: "\u00D7" }), contextualSpeech.replaceAll('主人', preferences.userName).replaceAll('大肥鱼', preferences.petName)] })), status.state === 'REASONING' && (_jsxs("div", { className: styles.bubbleContainer, children: [_jsx("div", { className: `${styles.bubble} ${styles.bubble1}` }), _jsx("div", { className: `${styles.bubble} ${styles.bubble2}` }), _jsx("div", { className: `${styles.bubble} ${styles.bubble3}` })] })), affection === 'pat' && _jsx("div", { className: "petHearts", "aria-hidden": "true", children: "\u2661 \u2661 \u2661" }), affection === 'dizzy' && _jsx("div", { className: "petHearts", "aria-hidden": "true", children: "\u25CE \u25CE" }), _jsx("div", { "data-sleepy": preferences.reminders && hour >= 1 && hour < 5 && status.state === 'IDLE', onMouseMove: patHead, className: `petSpriteSize ${isBouncing ? styles.qBounce : ''} petReaction-${affection}`, style: { zoom: preferences.scale }, children: _jsx(LivingPuppet, { poseName: hitPose, imgSrc: currentImgSrc, isMaiden: isMaiden, isGalGameMode: false, mouthOpenRatio: status.mouthOpenRatio, gazeOffset: status.gazeOffset, state: status.state, opacity: ghost && !isSettingsOpen ? Math.min(0.25, preferences.opacity) : dimmed && !isSettingsOpen ? Math.min(0.4, preferences.opacity) : preferences.opacity, onMouseDown: handleMouseDown }) })] })] }));
}
//# sourceMappingURL=PetOverlay.js.map
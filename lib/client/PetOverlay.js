import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { PetAudio, dialogueBlocks, readConversationLog, parseBalance } from './experience.js';
import { DialogueContent } from './DialogueContent.js';
import { readPreferences, savePreferences } from './preferences.js';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { LivingPuppet } from './LivingPuppet.js';
import { MAID_DATA_URI, CHIBI_DATA_URI, ANSWERING_DATA_URI, BAIFAN_DATA_URI, GETIT_DATA_URI, SAJIAO_DATA_URI, THINK1_DATA_URI, THINK2_DATA_URI, THINK3_DATA_URI, THINK4_DATA_URI, THINK5_DATA_URI, } from './assets-data.js';
import styles from './PetOverlay.module.css';
/**
 * Splits dialogue text into complete-sentence pages that comfortably fill the GalGame dialogue box.
 * Ensures complete sentences without abrupt mid-sentence cutoffs.
 */
function paginateDialogue(text, targetLength = 180) {
    const trimmed = text.trim();
    if (!trimmed)
        return ['……'];
    const blocks = dialogueBlocks(trimmed);
    if (blocks.some(block => block.kind === 'code'))
        return blocks.flatMap(block => block.kind === 'code' ? ['```' + (block.language || '') + '\n' + block.text + '\n```'] : paginateDialogue(block.text, targetLength));
    if (trimmed.length <= targetLength)
        return [trimmed];
    const pages = [];
    let remaining = trimmed;
    while (remaining.length > 0) {
        if (remaining.length <= targetLength) {
            pages.push(remaining);
            break;
        }
        const searchSlice = remaining.slice(0, Math.min(remaining.length, Math.round(targetLength * 1.25)));
        const sentenceMatch = searchSlice.match(/([。！？\n!?]+)(?=[^。！？\n!?]*$)/);
        let cutIndex = -1;
        if (sentenceMatch && sentenceMatch.index !== undefined && sentenceMatch.index >= Math.round(targetLength * 0.45)) {
            cutIndex = sentenceMatch.index + sentenceMatch[1].length;
        }
        else {
            const commaMatch = searchSlice.match(/([，；,;]+)(?=[^，；,;]*$)/);
            if (commaMatch && commaMatch.index !== undefined && commaMatch.index >= Math.round(targetLength * 0.5)) {
                cutIndex = commaMatch.index + commaMatch[1].length;
            }
            else {
                cutIndex = targetLength;
            }
        }
        const page = remaining.slice(0, cutIndex).trim();
        if (page)
            pages.push(page);
        remaining = remaining.slice(cutIndex).trim();
    }
    return pages.length > 0 ? pages : [trimmed];
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
        setSettingsAnchor({ x: Math.max(12, Math.min(window.innerWidth - 302, position.x > window.innerWidth / 2 ? position.x - 304 : position.x + 180)), y: Math.max(12, Math.min(position.y, window.innerHeight - 540)) });
        const dismiss = (event) => { if (event.target instanceof Element && !event.target.closest('[data-whale-pet]'))
            setIsSettingsOpen(false); };
        const escape = (event) => { if (event.key === 'Escape')
            setIsSettingsOpen(false); };
        window.addEventListener('pointerdown', dismiss, true);
        window.addEventListener('keydown', escape);
        return () => { window.removeEventListener('pointerdown', dismiss, true); window.removeEventListener('keydown', escape); };
    }, [isSettingsOpen]);
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
        return paginateDialogue(status.latestDialogue || companionSpeech, 260);
    }, [status.latestDialogue, companionSpeech]);
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
    }, [status.isGalGameMode, stateMachine, uiHidden, logOpen]);
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
        const timer = setInterval(() => setClock(Date.now()), 1000);
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
        if (!wanderingEnabled || status.isGalGameMode) {
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
    }, [wanderingEnabled, status.form, status.isGalGameMode, isMenuOpen, isSettingsOpen, stateMachine]);
    // Dragging and click handlers for floating widget (Double-click shrunk state completely removed)
    const handleMouseDown = useCallback((e) => {
        if (status.isGalGameMode || e.button !== 0)
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
    }, [position, status.isGalGameMode, stateMachine]);
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
    const currentImgSrc = affection === 'pat' ? SAJIAO_DATA_URI : affection === 'dizzy' && !status.isStreaming ? THINK2_DATA_URI : resolveCharacterImage();
    const displayDialogue = preferences.reading === 'scroll' ? status.latestDialogue || companionSpeech : dialoguePages[currentPageIndex] || dialoguePages[0] || '';
    const characters = useMemo(() => Array.from(displayDialogue), [displayDialogue]);
    const isRevealing = preferences.typewriter && preferences.reading === 'pages' && revealed < characters.length;
    const visibleText = isRevealing ? characters.slice(0, revealed).join('') : displayDialogue;
    useEffect(() => {
        const previous = revealIdentity.current;
        if (previous.page !== currentPageIndex || !displayDialogue.startsWith(previous.text))
            setRevealed(0);
        revealIdentity.current = { page: currentPageIndex, text: displayDialogue };
    }, [currentPageIndex, displayDialogue]);
    useEffect(() => {
        if (revealed >= characters.length || !status.isGalGameMode || uiHidden || logOpen || !preferences.typewriter || preferences.reading !== 'pages')
            return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            setRevealed(characters.length);
            return;
        }
        const timer = setInterval(() => {
            setRevealed(count => Math.min(count + 1, characters.length));
        }, 42);
        return () => clearInterval(timer);
    }, [status.isGalGameMode, uiHidden, logOpen, preferences.typewriter, preferences.reading, preferences.muted, preferences.quiet, preferences.volume, characters.length, revealed]);
    useEffect(() => {
        if (!preferences.autoAdvance || preferences.reading !== 'pages' || !status.isGalGameMode || status.isStreaming || isRevealing || uiHidden || logOpen || currentPageIndex >= dialoguePages.length - 1)
            return;
        const timer = setTimeout(() => setCurrentPageIndex(i => Math.min(i + 1, dialoguePages.length - 1)), Math.min(4000, Math.max(2000, characters.length * 15)));
        return () => clearTimeout(timer);
    }, [preferences.autoAdvance, preferences.reading, status.isGalGameMode, status.isStreaming, isRevealing, uiHidden, logOpen, currentPageIndex, dialoguePages, characters.length]);
    useEffect(() => {
        if (preferences.muted || preferences.quiet || uiHidden || logOpen || !(status.isStreaming || (status.isGalGameMode && isRevealing)))
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
    }, [preferences.muted, preferences.quiet, preferences.volume, uiHidden, logOpen, status.isStreaming, status.isGalGameMode, isRevealing]);
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
    const balance = status.balancesKnown ? (parseBalance(status.toppedUpBalance) ?? 0) + (parseBalance(status.grantedBalance) ?? 0) : null;
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
        return (_jsxs(_Fragment, { children: [_jsx("div", { "data-whale-pet": "backdrop", "data-pet-theme": preferences.theme, lang: preferences.language === 'zh' ? 'zh-CN' : 'en', className: "galgameBackdrop", onClick: () => uiHidden ? setUiHidden(false) : stateMachine.setGalGameMode(false), onPointerDown: unlockAudio, title: t("点击空白区域退出对话模式", "Click background to exit") }), !uiHidden && showThoughtBubble && (_jsxs("div", { "data-whale-pet": "thought", "data-pet-theme": preferences.theme, lang: preferences.language === 'zh' ? 'zh-CN' : 'en', className: "comicThoughtBubble", children: [_jsxs("div", { className: "thoughtBubbleHeader", children: [_jsxs("div", { className: "thoughtBubbleTitleGroup", children: [_jsx("span", { children: "\uD83D\uDCAD" }), _jsx("span", { children: t("深度思考过程", "Thoughts") }), status.isReasoning && _jsx("span", { className: "thoughtLivePill", children: t("推理中...", "Thinking…") })] }), _jsx("button", { className: "thoughtCloseBtn", onClick: () => setIsThoughtBubbleVisible(false), title: t("隐藏思考气泡", "Hide thoughts"), children: "\u2715" })] }), _jsx("div", { className: "thoughtBubbleContent", ref: thoughtScrollRef, onScroll: e => { const node = e.currentTarget; followThoughtRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 36; }, children: status.reasoningText || t('正在整理思路……', 'Thinking things through…') }), _jsx("div", { className: "comicTrailNode trail1" }), _jsx("div", { className: "comicTrailNode trail2" }), _jsx("div", { className: "comicTrailNode trail3" })] })), _jsx("div", { "data-whale-pet": "stage", "data-pet-theme": preferences.theme, lang: preferences.language === 'zh' ? 'zh-CN' : 'en', className: `galgameCharacterCentered ${isMaiden ? 'galgameCharacterMaiden' : 'galgameCharacterChibi'}`, children: _jsx(LivingPuppet, { imgSrc: currentImgSrc, isMaiden: isMaiden, isGalGameMode: true, mouthOpenRatio: status.mouthOpenRatio, gazeOffset: status.gazeOffset, state: status.state }) }), !uiHidden && _jsxs("div", { onPointerDownCapture: event => { unlockAudio(); if (!event.target.closest('details'))
                        event.currentTarget.querySelector('details[open]')?.removeAttribute('open'); }, "data-whale-pet": "dialogue", "data-pet-theme": preferences.theme, lang: preferences.language === 'zh' ? 'zh-CN' : 'en', className: "galgameTheatreBox", children: [_jsxs("div", { className: "galgameHeaderBar", children: [_jsxs("div", { className: "galgameNameTag", children: [_jsx("span", { children: "\uD83D\uDC1F" }), _jsx("span", { children: t("大肥鱼", "Little Whale") })] }), _jsxs("div", { className: "galgameTopControls", children: [(status.isStreaming || status.isReasoning) && _jsxs("span", { className: "petPhase", role: "status", children: [phaseLabel, elapsed !== null ? ' · ' + elapsed + 's' : '', nativeSpeed !== null ? ' · ' + nativeSpeed.toFixed(1) + ' tokens/s' : ''] }), _jsx("button", { className: "galgameCloseBtn", title: t('查看已加载的问答', 'Review loaded messages'), onClick: () => { setHistory(readConversationLog()); setLogOpen(true); }, children: t('回顾', 'Log') }), _jsxs("button", { className: "galgameCloseBtn", title: t('读完后自动显示下一段', 'Show the next page automatically after reading'), "aria-pressed": preferences.autoAdvance, onClick: () => update({ autoAdvance: !preferences.autoAdvance }), children: [t('自动', 'Auto'), preferences.autoAdvance ? ' ●' : ''] }), _jsxs("details", { className: "petTheatreMore", children: [_jsx("summary", { "aria-label": t('更多选项', 'More options'), title: t('更多选项', 'More options'), children: "\u2022\u2022\u2022" }), _jsxs("div", { className: "petMorePanel", onClick: e => { if (e.target.closest('button'))
                                                        e.currentTarget.closest('details')?.removeAttribute('open'); }, children: [_jsx("button", { onClick: () => setUiHidden(true), children: t('隐藏界面，欣赏立绘', 'Hide interface') }), _jsx("button", { onClick: toggleMute, children: preferences.muted ? t('开启人物音效', 'Enable character sounds') : t('关闭人物音效', 'Mute character sounds') }), _jsx("button", { onClick: () => update({ reading: preferences.reading === 'pages' ? 'scroll' : 'pages' }), children: preferences.reading === 'pages' ? t('切换为完整阅读', 'Read full response') : t('切换为分页阅读', 'Read in pages') }), _jsx("button", { onClick: () => update({ theme: preferences.theme === 'light' ? 'dark' : 'light' }), children: preferences.theme === 'light' ? t('☾ 深色主题', '☾ Dark theme') : t('☀ 浅色主题', '☀ Light theme') }), _jsx("button", { onClick: () => update({ language: preferences.language === 'zh' ? 'en' : 'zh' }), children: preferences.language === 'zh' ? 'English' : '中文' })] })] }), _jsx("button", { className: "galgameCloseBtn", onClick: () => stateMachine.setGalGameMode(false), title: t('退出对话模式 (Escape)', 'Exit dialogue (Escape)'), children: t('✕ 退出', '✕ Exit') })] })] }), _jsxs("div", { className: "galgameTextBody", onPointerDown: unlockAudio, ref: textScrollRef, onClick: handleAdvancePage, role: "button", tabIndex: 0, onKeyDown: e => { if (e.target !== e.currentTarget)
                                return; if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleAdvancePage();
                            } }, title: dialoguePages.length > 1 ? t("点击切换下一段话", "Next page") : undefined, children: [_jsx("span", { className: "galgameQuotes", children: "\u300C" }), _jsx(DialogueContent, { text: visibleText, copy: copyCode, copyLabel: t('复制', 'Copy') }), status.isStreaming && _jsx("span", { className: "galgameCursor" }), _jsx("span", { className: "galgameQuotes", children: "\u300D" })] }), preferences.reading === 'pages' && dialoguePages.length > 1 && _jsxs("div", { className: "petReadingNav", children: [_jsx("button", { disabled: currentPageIndex === 0, onClick: () => setCurrentPageIndex(i => Math.max(0, i - 1)), children: t('← 上一段', '← Previous') }), _jsxs("span", { children: [currentPageIndex + 1, " / ", dialoguePages.length] })] }), preferences.reading === 'pages' && dialoguePages.length > 1 && (_jsx("button", { className: "galgamePagePrompt", onClick: handleAdvancePage, children: currentPageIndex < dialoguePages.length - 1 ? (_jsxs(_Fragment, { children: [_jsx("span", { children: isRevealing ? t('点击显示全部', 'Show full page') : t('▼ 点击下一段', '▼ Next page') }), _jsxs("span", { children: ["(", currentPageIndex + 1, "/", dialoguePages.length, ")"] })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: t("● 点击回开头", "● Back to start") }), _jsxs("span", { children: ["(", dialoguePages.length, "/", dialoguePages.length, ")"] })] })) })), _jsxs("div", { className: "galgameComposerArea", children: [_jsx("input", { type: "text", className: "galgameInput", placeholder: t("输入你的问题，与大肥鱼对话…… (Enter 发送)", "Talk to Little Whale… (Enter to send)"), value: inputValue, onChange: (e) => setInputValue(e.target.value), onKeyDown: (e) => {
                                        if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    } }), _jsx("button", { className: "galgameSendBtn", onClick: handleSendMessage, children: t('发送', 'Send') })] })] }), uiHidden && _jsx("button", { "data-whale-pet": "restore", "data-pet-theme": preferences.theme, className: "petRestore", onClick: () => setUiHidden(false), children: t('点击任意处恢复对话', 'Click anywhere to restore dialogue') }), logOpen && !uiHidden && _jsxs("aside", { "data-whale-pet": "log", "data-pet-theme": preferences.theme, className: "petLog", role: "dialog", "aria-label": t('历史回顾', 'Conversation log'), children: [_jsxs("header", { children: [_jsx("strong", { children: t('历史回顾', 'Conversation log') }), _jsx("button", { onClick: () => setLogOpen(false), children: t('关闭', 'Close') })] }), _jsx("p", { children: t('显示当前页面已加载的问答，切换会话后重新打开即可更新。', 'Showing messages loaded on this page. Reopen after switching conversations.') }), history.length ? history.map((entry, index) => _jsxs("article", { children: [_jsx("strong", { children: entry.role === 'user' ? t('你', 'You') : t('大肥鱼', 'Little Whale') }), _jsx(DialogueContent, { text: entry.text, copy: copyCode, copyLabel: t('复制', 'Copy') })] }, index)) : _jsx("p", { children: t('当前页面暂无已加载记录。', 'No loaded messages on this page.') })] }), toast && _jsx("div", { "data-whale-pet": "toast", className: "petToast", role: "status", children: toast })] }));
    }
    // -------------------------------------------------------------
    // Widget Mode: Floating Desktop Pet at Viewport Edge
    // -------------------------------------------------------------
    return (_jsxs("div", { "data-whale-pet": "widget", "data-pet-theme": preferences.theme, lang: preferences.language === 'zh' ? 'zh-CN' : 'en', className: `${styles.overlayContainer} ${isDragging ? styles.dragging : affection === 'float' || affection === 'dizzy' ? 'petSettling' : status.state === 'WANDERING' ? styles.wandering : ''}`, style: {
            left: `${position.x}px`,
            top: `${position.y}px`,
        }, onPointerDown: unlockAudio, onMouseEnter: handleMouseEnterPet, onMouseLeave: handleMouseLeavePet, children: [toast && _jsx("div", { className: "petToast", role: "status", children: toast }), _jsxs("div", { className: `${styles.characterWrapper} ${stateClass}`, children: [_jsxs("div", { className: `${styles.toolbar} ${isMenuOpen ? styles.toolbarVisible : ''}`, onMouseEnter: handleMouseEnterPet, onMouseLeave: handleMouseLeavePet, children: [_jsxs("div", { "data-low": lowBalance, className: styles.balanceHeaderBar, title: t("当前账户实时余额", "Account balance"), children: [_jsx("span", { className: styles.balanceTag, children: t("充值:", "Paid:") }), _jsx("span", { className: styles.balanceVal, children: status.toppedUpBalance || '¥0.00' }), _jsx("span", { className: styles.balanceDivider, children: "|" }), _jsx("span", { className: styles.balanceTag, children: t("赠金:", "Bonus:") }), _jsx("span", { className: styles.balanceVal, children: status.grantedBalance || '¥0.00' })] }), _jsxs("div", { className: styles.toolbarButtons, children: [codeText && _jsx("button", { className: styles.toolBtn, onClick: () => void copyCode(codeText), children: t('复制代码', 'Copy code') }), _jsx("button", { className: styles.toolBtn, onClick: () => stateMachine.toggleForm(), title: t("切换少女立绘 / Q版形态", "Switch portrait / chibi"), children: isMaiden ? t("切换Q版", "Chibi") : t("切换立绘", "Portrait") }), _jsx("button", { className: styles.toolBtn, onClick: () => stateMachine.setGalGameMode(true), title: t("切换进入对话模式", "Open dialogue"), children: t('对话模式', 'Dialogue') }), _jsx("button", { className: styles.toolBtn, onClick: () => setIsSettingsOpen(!isSettingsOpen), title: t("展开更多设置面板", "Open settings"), children: t('设置', 'Settings') })] })] }), isSettingsOpen && (_jsxs("div", { className: styles.settingsDrawer, style: { position: 'fixed', left: settingsAnchor.x, top: settingsAnchor.y, maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100vh - 24px)' }, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: styles.drawerHeader, children: [_jsx("span", { children: t("🐟 大肥鱼设置", "🐟 Little Whale") }), _jsx("button", { className: styles.drawerCloseBtn, onClick: () => setIsSettingsOpen(false), title: t("关闭设置", "Close settings"), children: "\u2715" })] }), _jsxs("div", { className: "petPreferenceGrid", children: [_jsx("span", { children: t('外观', 'Appearance') }), _jsx("div", { className: "petThemeSwitch", role: "group", "aria-label": t('主题', 'Theme'), children: ['light', 'dark'].map(theme => _jsx("button", { className: preferences.theme === theme ? 'selected' : '', "aria-pressed": preferences.theme === theme, "aria-label": theme === 'light' ? t('浅色主题', 'Light theme') : t('深色主题', 'Dark theme'), onClick: () => update({ theme }), children: theme === 'light' ? '☀' : '☾' }, theme)) }), _jsx("span", { children: "Language / \u8BED\u8A00" }), _jsx("div", { className: "petThemeSwitch", children: ['zh', 'en'].map(language => _jsx("button", { "aria-pressed": preferences.language === language, className: preferences.language === language ? 'selected' : '', onClick: () => update({ language }), children: language === 'zh' ? '中文' : 'English' }, language)) }), _jsx("span", { id: "pet-scale-label", children: t('大小', 'Size') }), _jsxs("div", { className: "petSizeSlider", children: [_jsx("input", { type: "range", min: "0", max: "4", step: "1", "aria-labelledby": "pet-scale-label", "aria-valuetext": Math.round(selectedSize * 100) + '%', value: sizeSteps.indexOf(selectedSize), onChange: e => update({ scale: sizeSteps[Number(e.target.value)] }) }), _jsx("div", { className: "petSizeDots", "aria-hidden": "true", children: sizeSteps.map((scale, index) => _jsx("i", { className: index === 2 ? 'default' : '' }, scale)) })] }), _jsx("label", { htmlFor: "pet-opacity", children: t('透明度', 'Opacity') }), _jsx("input", { id: "pet-opacity", type: "range", min: "0.35", max: "1", step: "0.05", value: preferences.opacity, onChange: e => update({ opacity: Number(e.target.value) }) }), _jsxs("label", { title: t('回答时持续发出轻柔的人物说话音，也包含互动音效', 'Soft speech-like sounds during answers and interactions'), children: [_jsx("input", { type: "checkbox", checked: !preferences.muted, onChange: toggleMute }), " ", t('人物音效', 'Character sounds')] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: preferences.typewriter, onChange: e => update({ typewriter: e.target.checked }) }), " ", t('逐字显示文字', 'Reveal text gradually')] }), _jsx("label", { htmlFor: "pet-volume", children: t('人物音效音量', 'Character volume') }), _jsx("input", { id: "pet-volume", type: "range", min: "0", max: "1", step: "0.05", value: preferences.volume, onChange: e => update({ volume: Number(e.target.value) }) }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: preferences.reminders, onChange: e => update({ reminders: e.target.checked }) }), " ", t('午饭和熬夜提醒', 'Lunch & late-night reminders')] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: preferences.quiet, onChange: e => update({ quiet: e.target.checked }) }), " ", t('隐藏闲聊并关闭音效', 'Hide chatter & mute sounds')] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: preferences.autoAdvance, onChange: e => update({ autoAdvance: e.target.checked }) }), " ", t('读完后自动显示下一段', 'Show the next page automatically')] })] }), _jsxs("div", { className: styles.drawerItem, children: [_jsx("span", { className: styles.drawerLabel, children: t("角色形态", "Character") }), _jsxs("div", { className: styles.drawerBtnGroup, children: [_jsx("button", { className: `${styles.drawerBtn} ${status.form === 'chibi' ? styles.drawerBtnActive : ''}`, onClick: () => stateMachine.setForm('chibi'), children: t('迷你Q版', 'Chibi') }), _jsx("button", { className: `${styles.drawerBtn} ${status.form === 'maiden' ? styles.drawerBtnActive : ''}`, onClick: () => stateMachine.setForm('maiden'), children: t('少女立绘', 'Portrait') })] })] }), _jsx("div", { className: styles.drawerItem, children: _jsx("button", { className: styles.drawerFullBtn, onClick: () => {
                                        setIsSettingsOpen(false);
                                        stateMachine.setGalGameMode(true);
                                    }, children: t('展开剧场对话模式', 'Open dialogue theatre') }) }), _jsx("div", { className: styles.drawerItem, children: _jsx("button", { className: `${styles.drawerFullBtn} ${status.autoGalGameOnChat ? styles.drawerBtnActive : ''}`, onClick: () => stateMachine.toggleAutoGalGameOnChat(), children: status.autoGalGameOnChat ? t("点击输入框自动展开: 开", "Open on composer click: On") : t("点击输入框自动展开: 关", "Open on composer click: Off") }) }), _jsx("div", { className: styles.drawerItem, children: _jsx("button", { className: `${styles.drawerFullBtn} ${wanderingEnabled ? styles.drawerBtnActive : ''}`, onClick: () => setWanderingEnabled(!wanderingEnabled), children: wanderingEnabled ? t("闲置随机散步: 开", "Wandering: On") : t("闲置随机散步: 关", "Wandering: Off") }) })] })), !preferences.quiet && status.speech && !isSettingsOpen && (_jsx("div", { className: styles.speechBubble, "data-side": position.x < window.innerWidth / 2 ? 'right' : 'left', children: contextualSpeech })), status.state === 'REASONING' && (_jsxs("div", { className: styles.bubbleContainer, children: [_jsx("div", { className: `${styles.bubble} ${styles.bubble1}` }), _jsx("div", { className: `${styles.bubble} ${styles.bubble2}` }), _jsx("div", { className: `${styles.bubble} ${styles.bubble3}` })] })), affection === 'pat' && _jsx("div", { className: "petHearts", "aria-hidden": "true", children: "\u2661 \u2661 \u2661" }), affection === 'dizzy' && _jsx("div", { className: "petHearts", "aria-hidden": "true", children: "\u25CE \u25CE" }), _jsx("div", { "data-sleepy": preferences.reminders && hour >= 1 && hour < 5 && status.state === 'IDLE', onMouseMove: patHead, className: `petSpriteSize ${isBouncing ? styles.qBounce : ''} petReaction-${affection}`, style: { zoom: preferences.scale }, children: _jsx(LivingPuppet, { imgSrc: currentImgSrc, isMaiden: isMaiden, isGalGameMode: false, mouthOpenRatio: status.mouthOpenRatio, gazeOffset: status.gazeOffset, state: status.state, opacity: preferences.opacity, onMouseDown: handleMouseDown }) })] })] }));
}
//# sourceMappingURL=PetOverlay.js.map
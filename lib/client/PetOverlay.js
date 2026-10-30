import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { LivingPuppet } from './LivingPuppet.js';
import { MAIDEN_DATA_URI, CHIBI_DATA_URI, PONDERING_DATA_URI, PUZZLED_DATA_URI, PUFF_DATA_URI, GETIT_DATA_URI, SAJIAO_DATA_URI, BAIFAN_DATA_URI, } from './assets-data.js';
import styles from './PetOverlay.module.css';
/**
 * Splits dialogue text into complete-sentence pages that comfortably fill the GalGame dialogue box.
 * Ensures complete sentences without abrupt mid-sentence cutoffs.
 */
function paginateDialogue(text, targetLength = 180) {
    const trimmed = text.trim();
    if (!trimmed)
        return ['……'];
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
    const [status, setStatus] = useState(() => stateMachine.getStatus());
    const [position, setPosition] = useState({
        x: window.innerWidth - 220,
        y: window.innerHeight - 260,
        side: 'right',
    });
    const [isDragging, setIsDragging] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isBouncing, setIsBouncing] = useState(false);
    const [wanderingEnabled, setWanderingEnabled] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [isThoughtBubbleVisible, setIsThoughtBubbleVisible] = useState(true);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef(null);
    const wanderTimerRef = useRef(null);
    const menuTimerRef = useRef(null);
    const textScrollRef = useRef(null);
    const thoughtScrollRef = useRef(null);
    const lastDialogueRef = useRef('');
    // Subscribe to state machine
    useEffect(() => {
        return stateMachine.subscribe((newStatus) => {
            setStatus(newStatus);
        });
    }, [stateMachine]);
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
        return paginateDialogue(status.latestDialogue || status.speech, 260);
    }, [status.latestDialogue, status.speech]);
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
    // Re-open thought bubble when new reasoning begins
    useEffect(() => {
        if (status.isReasoning) {
            setIsThoughtBubbleVisible(true);
        }
    }, [status.isReasoning]);
    // Auto-scroll thought bubble as CoT streams in
    useEffect(() => {
        if (thoughtScrollRef.current) {
            thoughtScrollRef.current.scrollTop = thoughtScrollRef.current.scrollHeight;
        }
    }, [status.reasoningText]);
    // Auto-scroll dialogue box when streaming
    useEffect(() => {
        if (status.isGalGameMode && textScrollRef.current) {
            textScrollRef.current.scrollTop = textScrollRef.current.scrollHeight;
        }
    }, [currentPageIndex, status.latestDialogue, status.isGalGameMode]);
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
        menuTimerRef.current = setTimeout(() => {
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
            if (isDraggingRef.current)
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
            setTimeout(() => {
                stateMachine.setWandering(false);
            }, 3300);
        }, 14000);
        wanderTimerRef.current = interval;
        return () => {
            clearInterval(interval);
            wanderTimerRef.current = null;
        };
    }, [wanderingEnabled, status.form, status.isGalGameMode, stateMachine]);
    // Dragging and click handlers for floating widget (Double-click shrunk state completely removed)
    const handleMouseDown = useCallback((e) => {
        if (status.isGalGameMode)
            return;
        isDraggingRef.current = true;
        setIsDragging(true);
        stateMachine.setWandering(false);
        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            petX: position.x,
            petY: position.y,
            startTime: Date.now(),
        };
    }, [position, status.isGalGameMode, stateMachine]);
    useEffect(() => {
        if (!isDragging)
            return;
        const handleMouseMove = (e) => {
            if (!dragStartRef.current)
                return;
            const dx = e.clientX - dragStartRef.current.startX;
            const dy = e.clientY - dragStartRef.current.startY;
            const newX = Math.max(10, Math.min(window.innerWidth - 180, dragStartRef.current.petX + dx));
            const newY = Math.max(10, Math.min(window.innerHeight - 200, dragStartRef.current.petY + dy));
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
                const dist = Math.hypot(e.clientX - dragStartRef.current.startX, e.clientY - dragStartRef.current.startY);
                const duration = Date.now() - dragStartRef.current.startTime;
                if (dist < 6 && duration < 380) {
                    // Direct single-click: Q-bounce + Mad/Sajiao reaction + Slide out Settings
                    setIsBouncing(true);
                    setTimeout(() => setIsBouncing(false), 480);
                    stateMachine.triggerMad();
                    setIsSettingsOpen((prev) => !prev);
                }
            }
            dragStartRef.current = null;
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, stateMachine]);
    // Advance GalGame text page on clicking dialogue text
    const handleAdvancePage = () => {
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
        stateMachine.setLatestDialogue(`「${text}」—— 正在为你调用深海算力，请稍候……`);
        stateMachine.clearReasoningText();
        stateMachine.setReasoning(true);
        setCurrentPageIndex(0);
        setIsThoughtBubbleVisible(true);
        setInputValue('');
        const composerEl = (document.querySelector('[data-composer-input]') ||
            document.querySelector('[data-composer-card] [contenteditable="true"]') ||
            document.querySelector('[data-composer-card] [role="textbox"]') ||
            document.querySelector('[data-composer-seat] [contenteditable="true"]') ||
            document.querySelector('[data-composer-seat] textarea') ||
            document.querySelector('textarea'));
        if (!composerEl) {
            console.warn('[dsh-whale-pet] Could not locate DSH composer element');
            return;
        }
        const seat = (document.querySelector('[data-composer-seat]') || document.querySelector('[data-composer-card]'));
        if (seat) {
            seat.style.pointerEvents = 'auto';
        }
        if (composerEl instanceof HTMLTextAreaElement || composerEl instanceof HTMLInputElement) {
            composerEl.focus();
            composerEl.value = text;
            composerEl.dispatchEvent(new Event('input', { bubbles: true }));
            composerEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        else {
            composerEl.focus();
            const sel = window.getSelection();
            if (sel) {
                const range = document.createRange();
                range.selectNodeContents(composerEl);
                range.collapse(false);
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
        setTimeout(() => {
            const card = document.querySelector('[data-composer-card]') || document.querySelector('[data-composer-seat]');
            let sendBtn = null;
            if (card) {
                const buttons = Array.from(card.querySelectorAll('button'));
                sendBtn = (buttons.find((b) => {
                    const aria = b.getAttribute('aria-label') || b.textContent || '';
                    return /send|发送|steer|queue/i.test(aria) && !b.disabled;
                }) ||
                    (buttons.length > 0 ? buttons[buttons.length - 1] : null));
            }
            if (sendBtn && !sendBtn.hasAttribute('disabled')) {
                sendBtn.click();
            }
            else {
                composerEl.focus();
                const enterEv = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true,
                });
                composerEl.dispatchEvent(enterEv);
            }
        }, 80);
    };
    // Dynamic Image Selection
    // 正式输出或干饭动作时切换为大口吃白饭插画（baifan2.png）
    const resolveCharacterImage = () => {
        if (status.state === 'EATING' || status.pose === 'eating') {
            return BAIFAN_DATA_URI;
        }
        if (status.form === 'chibi') {
            return CHIBI_DATA_URI;
        }
        if (status.pose === 'mad') {
            return SAJIAO_DATA_URI;
        }
        if (status.state === 'REASONING') {
            if (status.pose === 'puzzled')
                return PUZZLED_DATA_URI;
            if (status.pose === 'puff')
                return PUFF_DATA_URI;
            if (status.pose === 'getit')
                return GETIT_DATA_URI;
            return PONDERING_DATA_URI;
        }
        return MAIDEN_DATA_URI;
    };
    const isMaiden = status.form === 'maiden';
    const currentImgSrc = resolveCharacterImage();
    const displayDialogue = dialoguePages[currentPageIndex] || dialoguePages[0] || '';
    const stateClass = status.state === 'PEEKING'
        ? styles.statePeeking
        : status.state === 'REASONING'
            ? styles.stateReasoning
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
        return (_jsxs(_Fragment, { children: [_jsx("div", { className: "galgameBackdrop", onClick: () => stateMachine.setGalGameMode(false), title: "\u70B9\u51FB\u7A7A\u767D\u533A\u57DF\u9000\u51FA\u5BF9\u8BDD\u6A21\u5F0F" }), showThoughtBubble && (_jsxs("div", { className: "comicThoughtBubble", children: [_jsxs("div", { className: "thoughtBubbleHeader", children: [_jsxs("div", { className: "thoughtBubbleTitleGroup", children: [_jsx("span", { children: "\uD83D\uDCAD" }), _jsx("span", { children: "\u6DF1\u5EA6\u601D\u8003\u8FC7\u7A0B" }), status.isReasoning && _jsx("span", { className: "thoughtLivePill", children: "\u63A8\u7406\u4E2D..." })] }), _jsx("button", { className: "thoughtCloseBtn", onClick: () => setIsThoughtBubbleVisible(false), title: "\u9690\u85CF\u601D\u8003\u6C14\u6CE1", children: "\u2715" })] }), _jsx("div", { className: "thoughtBubbleContent", ref: thoughtScrollRef, children: status.reasoningText || '思考中……正在检索深海知识库，梳理多维逻辑脉络……' }), _jsx("div", { className: "comicTrailNode trail1" }), _jsx("div", { className: "comicTrailNode trail2" }), _jsx("div", { className: "comicTrailNode trail3" })] })), _jsx("div", { className: `galgameCharacterCentered ${isMaiden ? 'galgameCharacterMaiden' : 'galgameCharacterChibi'}`, children: _jsx(LivingPuppet, { imgSrc: currentImgSrc, isMaiden: isMaiden, isGalGameMode: true, mouthOpenRatio: status.mouthOpenRatio, gazeOffset: status.gazeOffset, state: status.state }) }), _jsxs("div", { className: "galgameTheatreBox", children: [_jsxs("div", { className: "galgameHeaderBar", children: [_jsxs("div", { className: "galgameNameTag", children: [_jsx("span", { children: "\uD83D\uDC1F" }), _jsx("span", { children: "\u5927\u80A5\u9C7C" })] }), _jsxs("div", { className: "galgameTopControls", children: [dialoguePages.length > 1 && (_jsxs("span", { className: "galgamePageBadge", children: ["\u7B2C ", currentPageIndex + 1, " / ", dialoguePages.length, " \u6BB5"] })), _jsx("button", { className: "galgameCloseBtn", onClick: () => stateMachine.setGalGameMode(false), title: "\u9000\u51FA\u5BF9\u8BDD\u6A21\u5F0F (\u6216\u70B9\u51FB\u7A7A\u767D\u5904\u9000\u51FA)", children: "\u2715 \u9000\u51FA" })] })] }), _jsxs("div", { className: "galgameTextBody", ref: textScrollRef, onClick: handleAdvancePage, title: dialoguePages.length > 1 ? '点击切换下一段话' : undefined, children: [_jsx("span", { className: "galgameQuotes", children: "\u300C" }), _jsx("span", { children: displayDialogue }), status.isStreaming && _jsx("span", { className: "galgameCursor" }), _jsx("span", { className: "galgameQuotes", children: "\u300D" })] }), dialoguePages.length > 1 && (_jsx("div", { className: "galgamePagePrompt", onClick: handleAdvancePage, children: currentPageIndex < dialoguePages.length - 1 ? (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u25BC \u70B9\u51FB\u4E0B\u4E00\u6BB5" }), _jsxs("span", { children: ["(", currentPageIndex + 1, "/", dialoguePages.length, ")"] })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u25CF \u70B9\u51FB\u56DE\u5F00\u5934" }), _jsxs("span", { children: ["(", dialoguePages.length, "/", dialoguePages.length, ")"] })] })) })), _jsxs("div", { className: "galgameComposerArea", children: [_jsx("input", { type: "text", className: "galgameInput", placeholder: "\u8F93\u5165\u4F60\u7684\u95EE\u9898\uFF0C\u4E0E\u5927\u80A5\u9C7C\u5BF9\u8BDD\u2026\u2026 (Enter \u53D1\u9001)", value: inputValue, onChange: (e) => setInputValue(e.target.value), onKeyDown: (e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    } }), _jsx("button", { className: "galgameSendBtn", onClick: handleSendMessage, children: "\u53D1\u9001" })] })] })] }));
    }
    // -------------------------------------------------------------
    // Widget Mode: Floating Desktop Pet at Viewport Edge
    // -------------------------------------------------------------
    return (_jsx("div", { className: `${styles.overlayContainer} ${isDragging ? styles.dragging : status.state === 'WANDERING' ? styles.wandering : ''}`, style: {
            left: `${position.x}px`,
            top: `${position.y}px`,
        }, onMouseEnter: handleMouseEnterPet, onMouseLeave: handleMouseLeavePet, children: _jsxs("div", { className: `${styles.characterWrapper} ${stateClass} ${isBouncing ? styles.qBounce : ''}`, children: [_jsxs("div", { className: `${styles.toolbar} ${isMenuOpen ? styles.toolbarVisible : ''}`, onMouseEnter: handleMouseEnterPet, onMouseLeave: handleMouseLeavePet, children: [_jsxs("div", { className: styles.balanceHeaderBar, title: "\u5F53\u524D\u8D26\u6237\u5B9E\u65F6\u4F59\u989D", children: [_jsx("span", { className: styles.balanceTag, children: "\u5145\u503C:" }), _jsx("span", { className: styles.balanceVal, children: status.toppedUpBalance || '¥0.00' }), _jsx("span", { className: styles.balanceDivider, children: "|" }), _jsx("span", { className: styles.balanceTag, children: "\u8D60\u91D1:" }), _jsx("span", { className: styles.balanceVal, children: status.grantedBalance || '¥0.00' })] }), _jsxs("div", { className: styles.toolbarButtons, children: [_jsx("button", { className: styles.toolBtn, onClick: () => stateMachine.toggleForm(), title: "\u5207\u6362\u5C11\u5973\u7ACB\u7ED8 / Q\u7248\u5F62\u6001", children: isMaiden ? '切换Q版' : '切换立绘' }), _jsx("button", { className: styles.toolBtn, onClick: () => stateMachine.setGalGameMode(true), title: "\u5207\u6362\u8FDB\u5165\u5BF9\u8BDD\u6A21\u5F0F", children: "\u5BF9\u8BDD\u6A21\u5F0F" }), _jsx("button", { className: styles.toolBtn, onClick: () => setIsSettingsOpen(!isSettingsOpen), title: "\u5C55\u5F00\u66F4\u591A\u8BBE\u7F6E\u9762\u677F", children: "\u8BBE\u7F6E" })] })] }), isSettingsOpen && (_jsxs("div", { className: `${styles.settingsDrawer} ${position.x > (typeof window !== 'undefined' ? window.innerWidth - 320 : 800)
                        ? styles.settingsDrawerLeft
                        : styles.settingsDrawerRight}`, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: styles.drawerHeader, children: [_jsx("span", { children: "\uD83D\uDC1F \u5927\u80A5\u9C7C\u8BBE\u7F6E" }), _jsx("button", { className: styles.drawerCloseBtn, onClick: () => setIsSettingsOpen(false), title: "\u5173\u95ED\u8BBE\u7F6E", children: "\u2715" })] }), _jsxs("div", { className: styles.drawerItem, children: [_jsx("span", { className: styles.drawerLabel, children: "\u89D2\u8272\u5F62\u6001" }), _jsxs("div", { className: styles.drawerBtnGroup, children: [_jsx("button", { className: `${styles.drawerBtn} ${status.form === 'chibi' ? styles.drawerBtnActive : ''}`, onClick: () => stateMachine.setForm('chibi'), children: "\u8FF7\u4F60Q\u7248" }), _jsx("button", { className: `${styles.drawerBtn} ${status.form === 'maiden' ? styles.drawerBtnActive : ''}`, onClick: () => stateMachine.setForm('maiden'), children: "\u5C11\u5973\u7ACB\u7ED8" })] })] }), _jsx("div", { className: styles.drawerItem, children: _jsx("button", { className: styles.drawerFullBtn, onClick: () => {
                                    setIsSettingsOpen(false);
                                    stateMachine.setGalGameMode(true);
                                }, children: "\u5C55\u5F00\u5267\u573A\u5BF9\u8BDD\u6A21\u5F0F" }) }), _jsx("div", { className: styles.drawerItem, children: _jsx("button", { className: `${styles.drawerFullBtn} ${status.autoGalGameOnChat ? styles.drawerBtnActive : ''}`, onClick: () => stateMachine.toggleAutoGalGameOnChat(), children: status.autoGalGameOnChat ? '点击输入框自动展开: 开' : '点击输入框自动展开: 关' }) }), _jsx("div", { className: styles.drawerItem, children: _jsx("button", { className: `${styles.drawerFullBtn} ${wanderingEnabled ? styles.drawerBtnActive : ''}`, onClick: () => setWanderingEnabled(!wanderingEnabled), children: wanderingEnabled ? '闲置随机散步: 开' : '闲置随机散步: 关' }) })] })), status.speech && !isSettingsOpen && (_jsx("div", { className: styles.speechBubble, children: status.speech })), status.state === 'REASONING' && (_jsxs("div", { className: styles.bubbleContainer, children: [_jsx("div", { className: `${styles.bubble} ${styles.bubble1}` }), _jsx("div", { className: `${styles.bubble} ${styles.bubble2}` }), _jsx("div", { className: `${styles.bubble} ${styles.bubble3}` })] })), _jsx(LivingPuppet, { imgSrc: currentImgSrc, isMaiden: isMaiden, isGalGameMode: false, mouthOpenRatio: status.mouthOpenRatio, gazeOffset: status.gazeOffset, state: status.state, onMouseDown: handleMouseDown })] }) }));
}
//# sourceMappingURL=PetOverlay.js.map
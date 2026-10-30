const DIALOGUES = {
    IDLE: [
        '今天又是元气满满的一天，呼呼~',
        '待机中……好想吃热腾腾的白米饭呀~',
        '有什么任务尽管交给我大肥鱼吧！',
        '咕噜噜……在深海里吐泡泡~',
    ],
    PEEKING: [
        '在写什么呢？让我看看让我看看~',
        '探头！这次要问什么问题呀？',
        '认真盯——正在倾听主人说话！',
    ],
    REASONING: [
        '唔……让我想想看，深海知识库检索中……',
        '手指抵住下巴——正在认真梳理逻辑链条！',
        '咕噜噜……正在组织最有条理的回答哦~',
    ],
    EATING: [
        '掏出大铁盆！大口大口吃白米饭！',
        '吧唧吧唧，白米饭真是太香啦~',
        '干饭鱼！吃饱了才有力气推理~',
        '吨吨吨！再来一盆！',
    ],
    WANDERING: [
        '游啊游，在网页边缘散步中~',
        '巡逻一圈，看页面整不整齐！',
    ],
};
const MAD_DIALOGUES = [
    '哼！不许随便戳大肥鱼，大肥鱼也是有脾气的！',
    '（鼓起腮帮子）主人坏心眼，就知道逗我玩~',
    '撒娇中……必须补偿一碗热腾腾的白米饭才能哄好！',
    '气鼓鼓！再戳我就要把你的消息吞进肚子里啦！',
];
export class PetStateMachine {
    state = 'IDLE';
    form = 'maiden';
    pose = 'default';
    isInputFocused = false;
    isReasoning = false;
    isStreaming = false;
    isGalGameMode = false;
    autoGalGameOnChat = true;
    speech = '';
    latestDialogue = '';
    reasoningText = '';
    toppedUpBalance = '¥0.00';
    grantedBalance = '¥0.00';
    mouthOpenRatio = 0;
    blinkRatio = 0;
    gazeOffset = { x: 0, y: 0 };
    speechTimer = null;
    debounceTimer = null;
    animationTimer = null;
    blinkTimer = null;
    reasoningCycleTimer = null;
    madTimer = null;
    listeners = new Set();
    thinkingPoseIndex = 0;
    thinkingPoses = ['pondering', 'puff', 'puzzled', 'getit'];
    constructor() {
        this.speech = this.getRandomDialogue('IDLE');
        this.startLivingAnimationLoops();
    }
    getStatus() {
        return {
            state: this.state,
            form: this.form,
            pose: this.pose,
            speech: this.speech,
            reasoningText: this.reasoningText,
            toppedUpBalance: this.toppedUpBalance,
            grantedBalance: this.grantedBalance,
            isReasoning: this.isReasoning,
            isStreaming: this.isStreaming,
            isInputFocused: this.isInputFocused,
            isGalGameMode: this.isGalGameMode,
            autoGalGameOnChat: this.autoGalGameOnChat,
            mouthOpenRatio: this.mouthOpenRatio,
            blinkRatio: this.blinkRatio,
            gazeOffset: { ...this.gazeOffset },
            latestDialogue: this.latestDialogue || this.speech,
        };
    }
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.getStatus());
        return () => {
            this.listeners.delete(listener);
        };
    }
    notify() {
        const status = this.getStatus();
        for (const listener of this.listeners) {
            try {
                listener(status);
            }
            catch (err) {
                console.error('[dsh-whale-pet] Listener error:', err);
            }
        }
    }
    getRandomDialogue(state) {
        const list = DIALOGUES[state];
        return list[Math.floor(Math.random() * list.length)];
    }
    startLivingAnimationLoops() {
        let mouthPhase = 0;
        this.animationTimer = setInterval(() => {
            if (this.isStreaming || this.state === 'EATING') {
                mouthPhase += 0.35;
                const raw = (Math.sin(mouthPhase) + 1) / 2;
                this.mouthOpenRatio = Math.min(1, Math.max(0, raw * 0.9));
                this.notify();
            }
            else if (this.mouthOpenRatio > 0) {
                this.mouthOpenRatio = Math.max(0, this.mouthOpenRatio - 0.15);
                this.notify();
            }
        }, 60);
        const scheduleNextBlink = () => {
            const delay = 3200 + Math.random() * 2400;
            this.blinkTimer = setTimeout(() => {
                this.performBlinkCycle(() => {
                    if (Math.random() < 0.25) {
                        setTimeout(() => {
                            this.performBlinkCycle(scheduleNextBlink);
                        }, 100);
                    }
                    else {
                        scheduleNextBlink();
                    }
                });
            }, delay);
        };
        scheduleNextBlink();
    }
    performBlinkCycle(onComplete) {
        if (this.isReasoning) {
            this.blinkRatio = 0.5;
            this.notify();
            setTimeout(onComplete, 400);
            return;
        }
        this.blinkRatio = 1.0;
        this.notify();
        setTimeout(() => {
            this.blinkRatio = 0.0;
            this.notify();
            setTimeout(onComplete, 120);
        }, 90);
    }
    setBalances(toppedUp, granted) {
        if (this.toppedUpBalance === toppedUp && this.grantedBalance === granted)
            return;
        this.toppedUpBalance = toppedUp;
        this.grantedBalance = granted;
        this.notify();
    }
    setInputFocus(focused) {
        if (this.isInputFocused === focused)
            return;
        this.isInputFocused = focused;
        if (focused) {
            this.gazeOffset.y = 0.65;
        }
        else {
            this.gazeOffset.y = 0;
        }
        this.recomputeState();
    }
    setReasoning(reasoning) {
        if (this.isReasoning === reasoning)
            return;
        this.isReasoning = reasoning;
        if (this.reasoningCycleTimer !== null) {
            clearInterval(this.reasoningCycleTimer);
            this.reasoningCycleTimer = null;
        }
        if (reasoning) {
            this.thinkingPoseIndex = 0;
            this.pose = this.thinkingPoses[0];
            this.speech = this.getRandomDialogue('REASONING');
            // Cycle thinking animation poses every 3.2s
            this.reasoningCycleTimer = setInterval(() => {
                if (this.isReasoning && this.pose !== 'mad') {
                    this.thinkingPoseIndex = (this.thinkingPoseIndex + 1) % this.thinkingPoses.length;
                    this.pose = this.thinkingPoses[this.thinkingPoseIndex];
                    this.notify();
                }
            }, 3200);
        }
        else {
            if (['pondering', 'puff', 'puzzled', 'getit'].includes(this.pose)) {
                this.pose = 'default';
            }
        }
        this.recomputeState();
    }
    setReasoningText(text) {
        if (this.reasoningText === text)
            return;
        this.reasoningText = text;
        this.notify();
    }
    clearReasoningText() {
        if (this.reasoningText === '')
            return;
        this.reasoningText = '';
        this.notify();
    }
    setStreaming(streaming) {
        if (this.isStreaming === streaming)
            return;
        this.isStreaming = streaming;
        if (streaming) {
            if (this.reasoningCycleTimer !== null) {
                clearInterval(this.reasoningCycleTimer);
                this.reasoningCycleTimer = null;
            }
            this.pose = 'default'; // EATING state displays baifan2.png
        }
        this.recomputeState();
    }
    triggerMad() {
        if (this.madTimer !== null) {
            clearTimeout(this.madTimer);
        }
        this.pose = 'mad';
        this.speech = MAD_DIALOGUES[Math.floor(Math.random() * MAD_DIALOGUES.length)];
        this.notify();
        this.madTimer = setTimeout(() => {
            this.madTimer = null;
            if (this.pose === 'mad') {
                if (this.isReasoning) {
                    this.pose = this.thinkingPoses[this.thinkingPoseIndex];
                }
                else if (this.isStreaming) {
                    this.pose = 'default';
                }
                else {
                    this.pose = 'default';
                }
                this.speech = this.getRandomDialogue(this.state);
                this.notify();
            }
        }, 2000);
    }
    setPose(pose) {
        this.pose = pose;
        this.notify();
    }
    setLatestDialogue(text) {
        if (this.latestDialogue === text)
            return;
        this.latestDialogue = text;
        this.notify();
    }
    setGazeOffset(offset) {
        const clampedX = Math.max(-1, Math.min(1, offset.x));
        const clampedY = Math.max(-1, Math.min(1, offset.y));
        if (Math.abs(this.gazeOffset.x - clampedX) < 0.02 && Math.abs(this.gazeOffset.y - clampedY) < 0.02) {
            return;
        }
        this.gazeOffset = { x: clampedX, y: clampedY };
        this.notify();
    }
    setAutoGalGameOnChat(enabled) {
        this.autoGalGameOnChat = enabled;
        this.notify();
    }
    toggleAutoGalGameOnChat() {
        this.setAutoGalGameOnChat(!this.autoGalGameOnChat);
    }
    setForm(form) {
        if (this.form === form)
            return;
        this.form = form;
        this.notify();
    }
    toggleForm() {
        this.setForm(this.form === 'chibi' ? 'maiden' : 'chibi');
    }
    setGalGameMode(enabled) {
        if (this.isGalGameMode === enabled)
            return;
        this.isGalGameMode = enabled;
        this.notify();
    }
    toggleGalGameMode() {
        this.setGalGameMode(!this.isGalGameMode);
    }
    setWandering(wandering) {
        if (this.state === 'EATING' || this.state === 'REASONING' || this.isInputFocused || this.isGalGameMode)
            return;
        if (wandering && this.state === 'IDLE') {
            this.state = 'WANDERING';
            this.speech = this.getRandomDialogue('WANDERING');
            this.notify();
        }
        else if (!wandering && this.state === 'WANDERING') {
            this.state = 'IDLE';
            this.speech = this.getRandomDialogue('IDLE');
            this.notify();
        }
    }
    recomputeState() {
        let nextState = 'IDLE';
        if (this.isStreaming) {
            nextState = 'EATING';
        }
        else if (this.isReasoning) {
            nextState = 'REASONING';
        }
        else if (this.isInputFocused) {
            nextState = 'PEEKING';
        }
        else {
            nextState = 'IDLE';
        }
        if (nextState === this.state)
            return;
        if ((this.state === 'EATING' || this.state === 'REASONING') && nextState !== 'EATING' && nextState !== 'REASONING') {
            if (this.debounceTimer !== null)
                clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.debounceTimer = null;
                this.commitState(nextState);
            }, 350);
            return;
        }
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.commitState(nextState);
    }
    commitState(nextState) {
        this.state = nextState;
        if (this.pose !== 'mad') {
            this.speech = this.getRandomDialogue(nextState);
        }
        this.notify();
        if (this.speechTimer !== null)
            clearTimeout(this.speechTimer);
        this.speechTimer = setTimeout(() => {
            if (this.pose !== 'mad') {
                this.speech = this.getRandomDialogue(this.state);
                this.notify();
            }
        }, 7000);
    }
    dispose() {
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        if (this.speechTimer !== null) {
            clearTimeout(this.speechTimer);
            this.speechTimer = null;
        }
        if (this.animationTimer !== null) {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }
        if (this.blinkTimer !== null) {
            clearTimeout(this.blinkTimer);
            this.blinkTimer = null;
        }
        if (this.reasoningCycleTimer !== null) {
            clearInterval(this.reasoningCycleTimer);
            this.reasoningCycleTimer = null;
        }
        if (this.madTimer !== null) {
            clearTimeout(this.madTimer);
            this.madTimer = null;
        }
        this.listeners.clear();
    }
}
//# sourceMappingURL=state-machine.js.map
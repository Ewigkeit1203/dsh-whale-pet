export const LIVE2D_LOOKS = {
    Maid: {},
    Answering: { angle: { y: -3 }, eyes: { y: -0.1 }, smile: 0.2, gaze: 0.6 },
    baifan: { toggles: ['钢盆'], smile: 1, chew: true, angle: { y: 4 }, gaze: 0.4 },
    // 竖食指开 is the toggle fallback for imports without the gesture animations.
    getit: { toggles: ['竖食指开'], gesture: 'point', pulse: 'nod', eyeOpen: 1.1, shock: 0.3, smile: 0.4, angle: { y: 6 } },
    Think1: { toggles: ['加载'], angle: { x: -4, y: 6, z: 8 }, eyes: { x: -0.5, y: 0.6 }, gaze: 0.2 },
    Think2: { angle: { x: 6, y: 8, z: -8 }, eyes: { x: 0.6, y: 0.7 }, mouthForm: -0.3, gaze: 0.2 },
    Think3: { toggles: ['单片眼镜'], angle: { y: -4, z: 4 }, eyes: { y: -0.3 }, gaze: 0.3 },
    Think4: { toggles: ['加载'], angle: { y: 10, z: -5 }, eyes: { y: 1 }, gaze: 0.2 },
    Think5: { toggles: ['黑框眼镜'], angle: { x: -8, y: -2 }, eyes: { x: -0.6 }, gaze: 0.3 },
    sajiao: { toggles: ['脸红'], pulse: 'pat', cheek: 1, mouthForm: -0.5, angle: { y: -4, z: -10 }, eyes: { y: -0.4 }, gaze: 0.2 },
    Dizzy: { toggles: ['圈圈眼'], wobble: 7, mouthForm: -0.4, gaze: 0 },
    smug: { toggles: ['屑屑眼'], gesture: 'grass', mouthForm: 1, angle: { y: 4, z: 6 } },
    shy: { toggles: ['脸红', '＞＜'], angle: { y: -8, z: -8 }, eyes: { x: 0.5, y: -0.6 }, gaze: 0.3 },
    angry: { toggles: ['黑脸', '流冷汗'], pulse: 'huff', mouthForm: -1, cheek: 0.6, gaze: 0.3 },
    surprised: { pulse: 'startle', shock: 1, eyeOpen: 1.15, mouth: 0.45, angle: { y: 8 } },
    proud: { gesture: 'chest', smile: 1, mouthForm: 1, angle: { y: 10, z: 4 } },
    happy: { toggles: ['爱心眼'], pulse: 'nod', smile: 0.6, mouthForm: 1, angle: { z: 5 } },
    // 屑屑: the late-night heavy eyelids the owner liked, kept as an idle glance of its own.
    smirk: { eyeOpen: 0.45, angle: { y: -6, z: 3 } },
};
/** Look for a pose name from PetOverlay's resolveCharacter(); unknown poses stay neutral. */
export function live2dLookFor(pose, context = {}) {
    const base = LIVE2D_LOOKS[pose] ?? LIVE2D_LOOKS.Maid;
    const look = context.state ? { ...base, walk: context.state === 'WANDERING', idle: context.state === 'IDLE', thinking: context.state === 'REASONING' } : base;
    if (context.edgePeek)
        return { edgePeek: true, idle: false, walk: false, gaze: 0.45, smile: 0.15, angle: { y: 2, z: 6 }, eyes: { y: 0.2 } };
    if (context.guardChest && !context.held)
        return { ...look, guardChest: true, gesture: undefined, gaze: 0.1, idle: false, walk: false };
    if (context.held)
        return { ...look, held: true, heldKey: context.heldKey, gaze: 0 };
    if (context.sleepy && pose === 'Maid')
        return { ...look, eyeOpen: 0.45, angle: { y: -6, z: 3 } };
    return look;
}
//# sourceMappingURL=live2d-look.js.map
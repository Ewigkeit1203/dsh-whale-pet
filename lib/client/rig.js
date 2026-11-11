export const POSE_RIG = {
    Maid: { face: [0.4333, 0.1036, 0.5902, 0.1924], top: 0.0054, bottom: 0.9994 },
    sajiao: { face: [0.4187, 0.1437, 0.5561, 0.2232], top: 0.0383, bottom: 0.9994 },
    Answering: { face: [0.4066, 0.1084, 0.5495, 0.1934], top: 0.0039, bottom: 0.999 },
    baifan: { face: [0.435, 0.1098, 0.5846, 0.194], top: 0.005, bottom: 0.9996 },
    getit: { face: [0.4066, 0.1293, 0.5476, 0.2211], top: 0.0232, bottom: 0.9994 },
    Think1: { face: [0.4458, 0.1322, 0.6125, 0.1951], top: 0.0185, bottom: 0.9839 },
    Think2: { face: [0.412, 0.1359, 0.5806, 0.2026], top: 0.0012, bottom: 0.9994 },
    Think3: { face: [0.3981, 0.1681, 0.5784, 0.2592], top: 0.0369, bottom: 0.9976 },
    Think4: { face: [0.4424, 0.1303, 0.5821, 0.1909], top: 0.0046, bottom: 0.9996 },
    Think5: { face: [0.4424, 0.1303, 0.5827, 0.1909], top: 0.0046, bottom: 0.9996 },
    Dizzy: { face: [0.3633, 0.1081, 0.5088, 0.2025], top: 0.0072, bottom: 0.9928 },
    smug: { face: [0.4375, 0.1003, 0.5547, 0.1777], top: 0.0007, bottom: 0.998 },
    shy: { face: [0.4365, 0.1497, 0.5449, 0.1947], top: 0.0039, bottom: 0.9948 },
    angry: { face: [0.4336, 0.11, 0.5605, 0.1836], top: 0.0046, bottom: 0.9909 },
    surprised: { face: [0.4297, 0.1074, 0.5586, 0.1803], top: 0.0026, bottom: 0.9967 },
    proud: { face: [0.4297, 0.0814, 0.5635, 0.1647], top: 0.002, bottom: 0.9967 },
    happy: { face: [0.4268, 0.1029, 0.5576, 0.1784], top: 0.0033, bottom: 0.9948 },
    // v0.7.0 art: carried (arms up) and the peeking close-up (its right side is the edge she holds).
    carry: { face: [0.47, 0.165, 0.645, 0.245], top: 0, bottom: 0.9945 },
    peek: { face: [0.45, 0.27, 0.86, 0.47], top: 0.0079, bottom: 0.9934 },
    // Imported Live2D model in its rest pose (measured on the framed render).
    Live2D: { face: [0.42, 0.075, 0.58, 0.15], top: 0.02, bottom: 1 },
};
/** Rig for a pose, falling back to Maid's proportions for unknown artwork. */
export function poseRig(pose) {
    return POSE_RIG[pose] ?? POSE_RIG.Maid;
}
//# sourceMappingURL=rig.js.map
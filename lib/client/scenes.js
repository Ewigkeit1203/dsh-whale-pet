/**
 * Theatre backgrounds (Background Switcher).
 *
 * The repository ships no background artwork and the bundle already inlines the
 * character PNGs, so the built-in scenes are painted in code as layered SVG
 * illustrations. They are drawn slightly out of focus, like a camera focused on
 * the character, which keeps the centre calm behind her. Users can add their
 * own picture (stored in IndexedDB by media-store.ts) as the "custom" scene.
 *
 * Everything here is deterministic: the same scene id always paints the same
 * picture, so a crossfade never changes the scene under the reader.
 */
export const SCENES = [
    { id: 'auto', zh: '跟随时间', en: 'Time of day', base: '#141d42', glow: 'rgba(150, 190, 255, .55)', ambient: 'dust' },
    { id: 'study', zh: '和室书房·夜', en: 'Study at night', base: '#141d42', glow: 'rgba(150, 190, 255, .55)', ambient: 'dust' },
    { id: 'lab', zh: '科技机房', en: 'Server room', base: '#050b1a', glow: 'rgba(80, 230, 255, .55)', ambient: 'data' },
    { id: 'cafe', zh: '午后咖啡厅', en: 'Afternoon café', base: '#5a3a24', glow: 'rgba(255, 200, 130, .6)', ambient: 'motes' },
    { id: 'seaside', zh: '海边黄昏', en: 'Seaside dusk', base: '#3a3466', glow: 'rgba(255, 170, 130, .55)', ambient: 'sparkle' },
    { id: 'none', zh: '透明（显示 DSH）', en: 'Transparent (show DSH)', base: 'transparent', glow: 'rgba(124, 194, 255, .35)', ambient: 'none' },
    { id: 'custom', zh: '我的背景', en: 'My picture', base: '#10131c', glow: 'rgba(200, 210, 255, .4)', ambient: 'none' },
];
/** Painted scenes that the shuffle may pick (never transparent, custom only when present). */
export const PAINTED_SCENES = ['study', 'lab', 'cafe', 'seaside'];
export function sceneMeta(id) {
    return SCENES.find(scene => scene.id === id) ?? SCENES[1];
}
/**
 * Time-of-day scene, as visual novels change backgrounds with the hour:
 * daytime café (06–16), seaside dusk (16–19) and the study at night.
 */
export function timeOfDayScene(hour) {
    if (hour >= 6 && hour < 16)
        return 'cafe';
    if (hour >= 16 && hour < 19)
        return 'seaside';
    return 'study';
}
export function isSceneId(value) {
    return typeof value === 'string' && SCENES.some(scene => scene.id === value);
}
/** Picks a different scene than `current`; `random` is injectable for tests. */
export function shuffleScene(current, hasCustom, random = Math.random) {
    const pool = [...PAINTED_SCENES, ...(hasCustom ? ['custom'] : [])].filter(id => id !== current);
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] ?? 'study';
}
// ---------------------------------------------------------------------------
// Painting helpers
// ---------------------------------------------------------------------------
const SCENE_W = 1920;
const SCENE_H = 1080;
function sceneRandom(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const sceneNum = (value) => Math.round(value * 10) / 10;
const scenePts = (points) => points.map(([x, y]) => sceneNum(x) + ',' + sceneNum(y)).join(' ');
function sceneLinear(id, stops, x2 = 0, y2 = 1) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`).join('')}</linearGradient>`;
}
function sceneRadial(id, stops) {
    return `<radialGradient id="${id}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`).join('')}</radialGradient>`;
}
function sceneWrap(defs, body, blur, vignette) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_W} ${SCENE_H}" width="${SCENE_W}" height="${SCENE_H}" preserveAspectRatio="xMidYMid slice">`
        + `<defs>${defs}`
        + `<filter id="dof" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${blur}"/></filter>`
        + `<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>`
        + `<radialGradient id="vig" cx="50%" cy="46%" r="75%"><stop offset=".55" stop-color="${vignette}" stop-opacity="0"/><stop offset="1" stop-color="${vignette}" stop-opacity=".62"/></radialGradient>`
        + `</defs><g filter="url(#dof)">${body}</g><rect width="${SCENE_W}" height="${SCENE_H}" fill="url(#vig)"/></svg>`;
}
// ---------------------------------------------------------------------------
// Scene: study at night (blue room, moonlit window, warm desk lamp)
// ---------------------------------------------------------------------------
function paintStudy() {
    const r = sceneRandom(11);
    const defs = sceneLinear('stWall', [[0, '#141c44'], [0.55, '#22336a'], [1, '#2b3f7c']])
        + sceneLinear('stSky', [[0, '#081236'], [0.6, '#1a2d66'], [1, '#3a5598']])
        + sceneLinear('stCurtain', [[0, '#1c2c68'], [0.25, '#3552a4'], [0.5, '#22387c'], [0.75, '#3a5ab0'], [1, '#1d2e6c']], 1, 0)
        + sceneLinear('stFloor', [[0, '#25306a'], [1, '#121a40']])
        + sceneLinear('stBeam', [[0, '#e8f0ff', 0.16], [1, '#e8f0ff', 0]], 0.4, 1)
        + sceneLinear('stDesk', [[0, '#3a3157'], [1, '#191832']])
        + sceneRadial('stMoon', [[0, '#ffffff', 0.95], [0.3, '#dfe9ff', 0.55], [1, '#9ab8ff', 0]])
        + sceneRadial('stLamp', [[0, '#ffd08a', 0.85], [0.25, '#ffb35c', 0.45], [1, '#ff9a3c', 0]]);
    let b = `<rect width="${SCENE_W}" height="${SCENE_H}" fill="url(#stWall)"/>`;
    // Ceiling and beam
    b += `<rect width="${SCENE_W}" height="70" fill="#0d1434"/><rect y="62" width="${SCENE_W}" height="14" fill="#1a2350"/>`;
    // Window with night sky, moon and stars
    b += `<rect x="1250" y="120" width="560" height="640" rx="6" fill="url(#stSky)"/>`;
    for (let i = 0; i < 70; i++)
        b += `<circle cx="${sceneNum(1260 + r() * 540)}" cy="${sceneNum(130 + r() * 420)}" r="${sceneNum(0.8 + r() * 1.8)}" fill="#fff" opacity="${sceneNum(0.3 + r() * 0.7)}"/>`;
    b += `<circle cx="1610" cy="270" r="190" fill="url(#stMoon)"/><circle cx="1610" cy="270" r="54" fill="#f4f7ff"/>`;
    // Distant town lights at the bottom of the window
    b += `<path d="M1250 690 L1310 660 L1360 672 L1420 640 L1490 668 L1560 650 L1640 676 L1720 646 L1810 670 L1810 760 L1250 760Z" fill="#101a44"/>`;
    for (let i = 0; i < 40; i++)
        b += `<rect x="${sceneNum(1260 + r() * 540)}" y="${sceneNum(680 + r() * 70)}" width="3" height="3" fill="${r() > 0.5 ? '#ffd38a' : '#9fc4ff'}" opacity="${sceneNum(0.4 + r() * 0.6)}"/>`;
    // Shoji-style mullions
    b += `<g stroke="#0c1433" stroke-width="10" fill="none"><rect x="1250" y="120" width="560" height="640" rx="6"/><path d="M1437 120V760M1623 120V760M1250 333H1810M1250 546H1810"/></g>`;
    b += `<rect x="1230" y="752" width="600" height="26" rx="4" fill="#1a2454"/>`;
    // Curtains with folds
    b += `<path d="M1170 90 C1200 300 1150 560 1210 820 L1290 820 C1250 560 1300 300 1270 90Z" fill="url(#stCurtain)"/>`;
    b += `<path d="M1790 90 C1820 300 1770 560 1830 820 L1920 820 L1920 90Z" fill="url(#stCurtain)"/>`;
    b += `<rect x="1150" y="80" width="770" height="16" rx="8" fill="#2a3a78"/>`;
    // Moonlight beam on the floor
    b += `<polygon points="${scenePts([[1250, 760], [1810, 760], [1400, 1080], [700, 1080]])}" fill="url(#stBeam)"/>`;
    // Bookshelf
    b += `<rect x="60" y="150" width="470" height="700" rx="6" fill="#18204a"/><rect x="78" y="168" width="434" height="664" fill="#111839"/>`;
    const bookColors = ['#3c5aa6', '#6a4f8f', '#a05a6a', '#c9a45c', '#4f8a8b', '#2f4a8f', '#8a6fb8', '#d2896a'];
    for (let shelf = 0; shelf < 4; shelf++) {
        const base = 330 + shelf * 166;
        let x = 88;
        while (x < 492) {
            const w = 16 + r() * 18;
            if (x + w > 500)
                break;
            const h = 92 + r() * 46;
            const lean = r() > 0.9 ? 6 : 0;
            const color = bookColors[Math.floor(r() * bookColors.length)];
            b += `<rect x="${sceneNum(x)}" y="${sceneNum(base - h)}" width="${sceneNum(w)}" height="${sceneNum(h)}" rx="2" fill="${color}" transform="rotate(${lean} ${sceneNum(x)} ${base})"/>`;
            b += `<rect x="${sceneNum(x + 3)}" y="${sceneNum(base - h + 12)}" width="${sceneNum(w - 6)}" height="3" fill="#fff" opacity=".18"/>`;
            x += w + 2 + (r() > 0.85 ? 18 : 0);
        }
        b += `<rect x="70" y="${base}" width="450" height="14" fill="#232c5c"/>`;
    }
    // Bunting garland across the wall
    b += `<path d="M560 210 Q820 300 1110 205" stroke="#c9d6ff" stroke-width="3" fill="none" opacity=".8"/>`;
    const flags = ['#ff9fb2', '#9fd3ff', '#ffe08a', '#b9a4ff', '#8fe3c8'];
    for (let i = 0; i < 11; i++) {
        const t = (i + 0.5) / 11;
        const x = 560 + 550 * t;
        const y = (1 - t) * (1 - t) * 210 + 2 * (1 - t) * t * 300 + t * t * 205;
        b += `<polygon points="${scenePts([[x - 18, y], [x + 18, y], [x, y + 46]])}" fill="${flags[i % flags.length]}" opacity=".85"/>`;
    }
    // Pinboard and a framed picture behind her (soft, low contrast)
    b += `<rect x="640" y="360" width="300" height="230" rx="6" fill="#2f4280"/><rect x="652" y="372" width="276" height="206" fill="#3a5096"/>`;
    for (let i = 0; i < 7; i++)
        b += `<rect x="${sceneNum(665 + r() * 220)}" y="${sceneNum(385 + r() * 150)}" width="${sceneNum(40 + r() * 30)}" height="${sceneNum(34 + r() * 26)}" fill="${r() > 0.5 ? '#e9eefc' : '#ffe9a8'}" opacity=".75" transform="rotate(${sceneNum(r() * 10 - 5)})"/>`;
    b += `<rect x="1000" y="250" width="170" height="200" rx="4" fill="#25366e"/><rect x="1012" y="262" width="146" height="176" fill="#5a86c8"/><path d="M1012 400 L1060 340 L1100 380 L1130 350 L1158 390 L1158 438 L1012 438Z" fill="#3b6aa8"/>`;
    // Floor
    b += `<rect y="860" width="${SCENE_W}" height="220" fill="url(#stFloor)"/>`;
    b += `<g stroke="#3a4685" stroke-width="2" opacity=".55">${[0, 1, 2, 3, 4, 5, 6].map(i => `<line x1="${-200 + i * 380}" y1="860" x2="${-700 + i * 520}" y2="1080"/>`).join('')}<line x1="0" y1="940" x2="${SCENE_W}" y2="940"/></g>`;
    // Bed edge on the right with pillows
    b += `<rect x="1380" y="820" width="560" height="260" rx="24" fill="#2b3f86"/><rect x="1380" y="820" width="560" height="40" rx="18" fill="#4a64b4"/>`;
    b += `<ellipse cx="1560" cy="815" rx="120" ry="44" fill="#5d7fd0"/><ellipse cx="1760" cy="812" rx="110" ry="40" fill="#c36f8f"/>`;
    // Desk and lamp with a warm pool of light
    b += `<circle cx="470" cy="700" r="460" fill="url(#stLamp)"/>`;
    b += `<rect x="-20" y="800" width="760" height="40" rx="8" fill="#463c68"/><rect x="0" y="838" width="720" height="260" fill="url(#stDesk)"/>`;
    b += `<path d="M430 800 L440 690 L520 610" stroke="#2a2440" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M480 575 L585 620 L555 660 L455 615Z" fill="#3a3358"/><ellipse cx="520" cy="640" rx="34" ry="12" fill="#ffe2a8"/>`;
    b += `<rect x="150" y="760" width="190" height="40" rx="4" fill="#e9ecf8" opacity=".9"/><rect x="170" y="752" width="160" height="12" rx="3" fill="#9bb0e8"/>`;
    // Potted plant
    b += `<path d="M640 800 L700 800 L690 860 L650 860Z" fill="#c98e6a"/>${[0, 1, 2, 3, 4].map(i => `<ellipse cx="${670 + (i - 2) * 16}" cy="${770 - Math.abs(i - 2) * 6}" rx="12" ry="34" fill="#5fae8c" transform="rotate(${(i - 2) * 18} 670 800)"/>`).join('')}`;
    // Floating dust in the moonlight
    for (let i = 0; i < 40; i++)
        b += `<circle cx="${sceneNum(900 + r() * 900)}" cy="${sceneNum(500 + r() * 520)}" r="${sceneNum(1 + r() * 2.4)}" fill="#dfe8ff" opacity="${sceneNum(0.15 + r() * 0.35)}"/>`;
    return sceneWrap(defs, b, 3.2, '#050a1e');
}
// ---------------------------------------------------------------------------
// Scene: server room (perspective corridor of racks with LEDs)
// ---------------------------------------------------------------------------
function paintLab() {
    const r = sceneRandom(23);
    const vx = 960, vy = 450, f = 900;
    const P = (x, y, z) => [vx + f * x / z, vy - f * y / z];
    const defs = sceneLinear('lbCeil', [[0, '#02050d'], [1, '#0b1a33']])
        + sceneLinear('lbFloor', [[0, '#0a1a33'], [1, '#02060f']])
        + sceneLinear('lbRack', [[0, '#0c1830'], [1, '#14264a']], 1, 0)
        + sceneLinear('lbRackR', [[0, '#14264a'], [1, '#0c1830']], 1, 0)
        + sceneRadial('lbCore', [[0, '#bff7ff', 0.95], [0.25, '#4fd9ff', 0.55], [1, '#1a4a8a', 0]])
        + sceneRadial('lbPink', [[0, '#ff7ad9', 0.55], [1, '#ff7ad9', 0]]);
    let b = `<rect width="${SCENE_W}" height="${vy}" fill="url(#lbCeil)"/><rect y="${vy}" width="${SCENE_W}" height="${SCENE_H - vy}" fill="url(#lbFloor)"/>`;
    // Floor grid
    let grid = '';
    for (let x = -3; x <= 3; x += 0.5) {
        const [x1, y1] = P(x, -1.6, 1.6);
        const [x2, y2] = P(x, -1.6, 40);
        grid += `<line x1="${sceneNum(x1)}" y1="${sceneNum(y1)}" x2="${sceneNum(x2)}" y2="${sceneNum(y2)}"/>`;
    }
    for (let z = 1.8; z < 40; z *= 1.22) {
        const [x1, y] = P(-3, -1.6, z);
        const [x2] = P(3, -1.6, z);
        grid += `<line x1="${sceneNum(x1)}" y1="${sceneNum(y)}" x2="${sceneNum(x2)}" y2="${sceneNum(y)}"/>`;
    }
    b += `<g stroke="#2a8cff" stroke-width="1.5" opacity=".22">${grid}</g>`;
    // Ceiling light strips
    for (const x of [-1.4, 0, 1.4]) {
        const [x1, y1] = P(x, 2.3, 1.4);
        const [x2, y2] = P(x, 2.3, 40);
        b += `<line x1="${sceneNum(x1)}" y1="${sceneNum(y1)}" x2="${sceneNum(x2)}" y2="${sceneNum(y2)}" stroke="#7fe8ff" stroke-width="14" opacity=".35" filter="url(#soft)"/>`;
        b += `<line x1="${sceneNum(x1)}" y1="${sceneNum(y1)}" x2="${sceneNum(x2)}" y2="${sceneNum(y2)}" stroke="#d6fbff" stroke-width="4" opacity=".85"/>`;
    }
    // Glowing core at the end of the corridor
    b += `<circle cx="${vx}" cy="${vy}" r="380" fill="url(#lbCore)"/>`;
    b += `<rect x="${vx - 60}" y="${vy - 90}" width="120" height="180" rx="8" fill="#9ff1ff" opacity=".55"/>`;
    // Racks on both walls, far to near so near ones overlap
    const leds = ['#4fffe0', '#4fd9ff', '#7cff8a', '#ff6ad5', '#ffd25a'];
    const racks = [];
    for (let z = 30; z > 1.5; z -= 1.75) {
        const z1 = z, z2 = z - 1.35;
        for (const side of [-1, 1]) {
            const X = side * 2.7;
            const face = [P(X, -1.6, z1), P(X, 1.9, z1), P(X, 1.9, z2), P(X, -1.6, z2)];
            let rack = `<polygon points="${scenePts(face)}" fill="url(#${side < 0 ? 'lbRack' : 'lbRackR'})" stroke="#1e3a6a" stroke-width="${sceneNum(Math.max(1, 6 / z))}"/>`;
            for (let row = 0; row < 14; row++) {
                const y = -1.35 + row * 0.22;
                if (r() < 0.25)
                    continue;
                const a = z2 + 0.15 + r() * 0.4, c = Math.min(z1 - 0.1, a + 0.15 + r() * 0.6);
                const [lx1, ly1] = P(X - side * 0.01, y, a);
                const [lx2, ly2] = P(X - side * 0.01, y, c);
                const color = leds[Math.floor(r() * leds.length)];
                rack += `<line x1="${sceneNum(lx1)}" y1="${sceneNum(ly1)}" x2="${sceneNum(lx2)}" y2="${sceneNum(ly2)}" stroke="${color}" stroke-width="${sceneNum(Math.max(1.2, 22 / z))}" stroke-linecap="round" opacity="${sceneNum(0.55 + r() * 0.45)}"/>`;
            }
            racks.push(rack);
        }
    }
    b += racks.join('');
    // Holographic panels floating near the walls
    const holo = (x, y, w, h, skew) => `<g transform="translate(${x} ${y}) skewY(${skew})" opacity=".8"><rect width="${w}" height="${h}" rx="10" fill="#38d8ff" opacity=".12" stroke="#7fefff" stroke-width="2"/>`
        + [0, 1, 2, 3, 4].map(i => `<rect x="18" y="${22 + i * (h - 40) / 5}" width="${sceneNum((w - 36) * (0.4 + ((i * 37) % 60) / 100))}" height="6" rx="3" fill="#aef6ff" opacity=".6"/>`).join('')
        + `<polyline points="${scenePts([[18, h - 24], [w * 0.3, h - 50], [w * 0.5, h - 34], [w * 0.75, h - 70], [w - 18, h - 44]])}" stroke="#ff8ae0" stroke-width="3" fill="none"/></g>`;
    b += holo(250, 260, 300, 200, 8) + holo(1390, 230, 280, 190, -8);
    b += `<ellipse cx="300" cy="1000" rx="420" ry="160" fill="#ff7ad9" opacity=".12" filter="url(#soft)"/><ellipse cx="1650" cy="1010" rx="380" ry="150" fill="#ff7ad9" opacity=".09" filter="url(#soft)"/>`;
    // Data sparks
    for (let i = 0; i < 70; i++)
        b += `<rect x="${sceneNum(r() * SCENE_W)}" y="${sceneNum(r() * SCENE_H)}" width="${sceneNum(2 + r() * 3)}" height="${sceneNum(2 + r() * 3)}" fill="${r() > 0.7 ? '#ff9ae6' : '#9ff4ff'}" opacity="${sceneNum(0.2 + r() * 0.5)}"/>`;
    return sceneWrap(defs, b, 2.2, '#000814');
}
// ---------------------------------------------------------------------------
// Scene: afternoon café (warm light, window, pendant lamps, counter)
// ---------------------------------------------------------------------------
function paintCafe() {
    const r = sceneRandom(37);
    const defs = sceneLinear('cfWall', [[0, '#e9c79a'], [1, '#c98f5a']])
        + sceneLinear('cfOut', [[0, '#fff6dc'], [0.6, '#ffe2a6'], [1, '#f2c27c']])
        + sceneLinear('cfWood', [[0, '#7a4a2a'], [1, '#4a2a17']])
        + sceneLinear('cfCounter', [[0, '#9a6236'], [0.15, '#6e4122'], [1, '#3a2213']])
        + sceneLinear('cfRay', [[0, '#fff8e0', 0.35], [1, '#fff8e0', 0]], 0.6, 1)
        + sceneRadial('cfBulb', [[0, '#fff3c4', 1], [0.3, '#ffd27a', 0.6], [1, '#ffb347', 0]])
        + sceneRadial('cfLeaf', [[0, '#9fd08a', 0.9], [1, '#5f9a5a', 0]]);
    let b = `<rect width="${SCENE_W}" height="${SCENE_H}" fill="url(#cfWall)"/>`;
    // Wainscot
    b += `<rect y="700" width="${SCENE_W}" height="380" fill="url(#cfWood)"/>`;
    for (let x = 0; x < SCENE_W; x += 120)
        b += `<rect x="${x + 10}" y="730" width="100" height="320" rx="6" fill="#000" opacity=".08"/>`;
    b += `<rect y="690" width="${SCENE_W}" height="16" fill="#8a5a35"/>`;
    // Big window with a bright street outside
    b += `<rect x="90" y="120" width="820" height="560" rx="10" fill="url(#cfOut)"/>`;
    for (let i = 0; i < 26; i++)
        b += `<circle cx="${sceneNum(110 + r() * 780)}" cy="${sceneNum(160 + r() * 380)}" r="${sceneNum(30 + r() * 70)}" fill="url(#cfLeaf)" opacity="${sceneNum(0.35 + r() * 0.45)}"/>`;
    for (let i = 0; i < 18; i++)
        b += `<circle cx="${sceneNum(110 + r() * 780)}" cy="${sceneNum(420 + r() * 240)}" r="${sceneNum(10 + r() * 22)}" fill="#fff" opacity="${sceneNum(0.25 + r() * 0.35)}"/>`;
    b += `<g stroke="#5a3520" stroke-width="16" fill="none"><rect x="90" y="120" width="820" height="560" rx="10"/><path d="M500 120V680M90 360H910"/></g>`;
    b += `<rect x="70" y="672" width="860" height="24" rx="6" fill="#6e4122"/>`;
    // Sun rays falling into the room
    b += `<polygon points="${scenePts([[150, 140], [480, 140], [1250, 1080], [520, 1080]])}" fill="url(#cfRay)"/>`;
    b += `<polygon points="${scenePts([[560, 140], [880, 140], [1700, 1080], [1150, 1080]])}" fill="url(#cfRay)" opacity=".7"/>`;
    // Chalkboard menu
    b += `<rect x="1440" y="280" width="380" height="330" rx="12" fill="#6a4426"/><rect x="1458" y="298" width="344" height="294" rx="6" fill="#26392f"/>`;
    b += `<g stroke="#f4f1e6" stroke-width="5" stroke-linecap="round" fill="none" opacity=".75"><path d="M1500 350 q30 -20 60 0 t60 0 t60 0"/><path d="M1490 410H1620M1660 410H1760M1490 460H1600M1660 460H1760M1490 510H1640M1680 510H1760"/></g>`;
    b += `<circle cx="1730" cy="350" r="20" fill="none" stroke="#ffd27a" stroke-width="5" opacity=".8"/>`;
    // Shelf with jars and cups
    b += `<rect x="1020" y="420" width="360" height="14" rx="4" fill="#6e4122"/>`;
    const jar = ['#f2e2c4', '#d9b48a', '#9cc7b4', '#f0c8b0'];
    for (let i = 0; i < 6; i++)
        b += `<rect x="${1035 + i * 56}" y="${sceneNum(350 + r() * 20)}" width="42" height="${sceneNum(70 - r() * 20)}" rx="8" fill="${jar[i % jar.length]}" opacity=".9"/>`;
    // Pendant lamps
    for (const [x, len] of [[1090, 250], [1300, 170], [1660, 110]]) {
        b += `<line x1="${x}" y1="0" x2="${x}" y2="${len}" stroke="#2a1a10" stroke-width="4"/>`;
        b += `<circle cx="${x}" cy="${len + 34}" r="190" fill="url(#cfBulb)" opacity=".75"/>`;
        b += `<path d="M${x - 62} ${len + 40} Q${x} ${len - 30} ${x + 62} ${len + 40}Z" fill="#3a2414"/><ellipse cx="${x}" cy="${len + 42}" rx="24" ry="10" fill="#fff4c8"/>`;
    }
    // Hanging plant
    b += `<line x1="980" y1="0" x2="980" y2="120" stroke="#2a1a10" stroke-width="3"/><path d="M950 120 L1010 120 L1000 160 L960 160Z" fill="#e2b48a"/>`;
    for (let i = 0; i < 9; i++)
        b += `<ellipse cx="${sceneNum(960 + r() * 40)}" cy="${sceneNum(170 + i * 22)}" rx="9" ry="20" fill="#5c9a58" transform="rotate(${sceneNum(r() * 60 - 30)} 980 ${170 + i * 22})"/>`;
    // Counter with cups and a coffee machine
    b += `<rect x="-20" y="860" width="${SCENE_W + 40}" height="240" fill="url(#cfCounter)"/><rect x="-20" y="850" width="${SCENE_W + 40}" height="22" rx="6" fill="#b07444"/>`;
    b += `<rect x="1460" y="700" width="260" height="160" rx="16" fill="#c9ccd2"/><rect x="1480" y="720" width="220" height="40" rx="8" fill="#2c2f36"/><rect x="1560" y="780" width="60" height="50" rx="6" fill="#7e838c"/>`;
    for (const [x, c] of [[320, '#ffffff'], [420, '#f6d6c2'], [1240, '#ffffff']]) {
        b += `<path d="M${x} 800 L${x + 70} 800 L${x + 60} 852 L${x + 10} 852Z" fill="${c}"/><path d="M${x + 68} 812 q24 4 4 26" stroke="${c}" stroke-width="7" fill="none"/>`;
        b += `<path d="M${x + 22} 780 q-12 -24 6 -44 M${x + 46} 780 q-12 -24 6 -44" stroke="#fff" stroke-width="5" fill="none" opacity=".45" stroke-linecap="round"/>`;
    }
    // Light motes
    for (let i = 0; i < 50; i++)
        b += `<circle cx="${sceneNum(200 + r() * 1300)}" cy="${sceneNum(200 + r() * 800)}" r="${sceneNum(1.2 + r() * 2.6)}" fill="#fff6d6" opacity="${sceneNum(0.25 + r() * 0.45)}"/>`;
    return sceneWrap(defs, b, 3.4, '#2a1406');
}
// ---------------------------------------------------------------------------
// Scene: seaside dusk (sunset sea, sun path, a far-away whale tail)
// ---------------------------------------------------------------------------
function paintSeaside() {
    const r = sceneRandom(51);
    const horizon = 640;
    const defs = sceneLinear('ssSky', [[0, '#1f2a64'], [0.35, '#5a4a96'], [0.65, '#d77a9a'], [0.86, '#ffab7a'], [1, '#ffd59a']])
        + sceneLinear('ssSea', [[0, '#6a5a9a'], [0.25, '#3e4a8a'], [1, '#141c46']])
        + sceneLinear('ssSand', [[0, '#f0c39a'], [1, '#a9786a']])
        + sceneLinear('ssCloud', [[0, '#ffd2c2'], [1, '#c9789a']])
        + sceneRadial('ssSun', [[0, '#fff7d6', 1], [0.18, '#ffe0a0', 0.9], [0.45, '#ffb07a', 0.35], [1, '#ff8a7a', 0]]);
    let b = `<rect width="${SCENE_W}" height="${horizon}" fill="url(#ssSky)"/>`;
    for (let i = 0; i < 60; i++)
        b += `<circle cx="${sceneNum(r() * SCENE_W)}" cy="${sceneNum(r() * 260)}" r="${sceneNum(0.8 + r() * 1.6)}" fill="#fff" opacity="${sceneNum(0.2 + r() * 0.6)}"/>`;
    b += `<circle cx="1320" cy="${horizon - 30}" r="520" fill="url(#ssSun)"/><circle cx="1320" cy="${horizon - 30}" r="78" fill="#fff4cc"/>`;
    // Soft clouds lit from below
    const cloud = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" opacity=".85"><ellipse cx="0" cy="0" rx="190" ry="34" fill="url(#ssCloud)"/><ellipse cx="-70" cy="-18" rx="90" ry="36" fill="url(#ssCloud)"/><ellipse cx="60" cy="-26" rx="110" ry="42" fill="url(#ssCloud)"/></g>`;
    b += cloud(380, 230, 1.3) + cloud(900, 150, 0.9) + cloud(1640, 300, 1.1) + cloud(1180, 420, 0.7) + cloud(200, 470, 0.8);
    // Islands on the horizon
    b += `<path d="M0 ${horizon} L0 600 Q120 560 260 598 Q340 580 420 ${horizon}Z" fill="#3a3270" opacity=".85"/>`;
    b += `<path d="M1600 ${horizon} Q1700 590 1800 606 Q1860 596 1920 610 L1920 ${horizon}Z" fill="#3a3270" opacity=".75"/>`;
    // Sea
    b += `<rect y="${horizon}" width="${SCENE_W}" height="${SCENE_H - horizon}" fill="url(#ssSea)"/>`;
    b += `<polygon points="${scenePts([[1250, horizon], [1390, horizon], [1560, SCENE_H], [1080, SCENE_H]])}" fill="#ffc89a" opacity=".16" filter="url(#soft)"/>`;
    for (let i = 0; i < 90; i++) {
        const t = r(), y = horizon + 4 + t * t * 430, spread = 70 + t * 230, w = 18 + t * 120 * r();
        b += `<rect x="${sceneNum(1320 + (r() - 0.5) * spread * 2 - w / 2)}" y="${sceneNum(y)}" width="${sceneNum(w)}" height="${sceneNum(1.5 + t * 3)}" rx="2" fill="#ffe2b0" opacity="${sceneNum((0.85 - t * 0.5) * (0.4 + r() * 0.6))}"/>`;
    }
    for (let i = 0; i < 34; i++) {
        const y = horizon + 30 + r() * 400, x = r() * SCENE_W, w = 30 + r() * 120;
        b += `<line x1="${sceneNum(x)}" y1="${sceneNum(y)}" x2="${sceneNum(x + w)}" y2="${sceneNum(y)}" stroke="#c7b8ff" stroke-width="2" opacity=".35"/>`;
    }
    // A whale tail far away (she is a whale, after all)
    b += `<path d="M560 ${horizon + 22} q-6 -30 -34 -46 q24 2 38 22 q14 -20 38 -22 q-28 16 -34 46Z" fill="#2a2a5e"/><ellipse cx="562" cy="${horizon + 24}" rx="30" ry="4" fill="#ffd7a0" opacity=".5"/>`;
    // Seagulls
    for (const [x, y, s] of [[760, 300, 1], [820, 270, 0.7], [1500, 200, 0.9]])
        b += `<path d="M${x - 20 * s} ${y} q${10 * s} -12 ${20 * s} 0 q${10 * s} -12 ${20 * s} 0" stroke="#2a2550" stroke-width="3" fill="none"/>`;
    // Beach and foam
    b += `<path d="M0 860 Q500 800 980 900 Q1400 990 1920 940 L1920 1080 L0 1080Z" fill="url(#ssSand)"/>`;
    b += `<path d="M0 860 Q500 800 980 900 Q1400 990 1920 940" stroke="#fff4ea" stroke-width="8" fill="none" opacity=".75"/>`;
    b += `<path d="M0 884 Q520 826 990 926 Q1400 1010 1920 966" stroke="#fff" stroke-width="3" fill="none" opacity=".35"/>`;
    // Shells and sparkle
    b += `<ellipse cx="1500" cy="1020" rx="16" ry="10" fill="#ffe2d6"/><ellipse cx="320" cy="980" rx="12" ry="8" fill="#ffd6e2"/>`;
    for (let i = 0; i < 30; i++)
        b += `<circle cx="${sceneNum(r() * SCENE_W)}" cy="${sceneNum(horizon + 10 + r() * 240)}" r="${sceneNum(1 + r() * 2)}" fill="#fff3d0" opacity="${sceneNum(0.3 + r() * 0.5)}"/>`;
    return sceneWrap(defs, b, 2.6, '#140c2a');
}
const SCENE_PAINTERS = { study: paintStudy, lab: paintLab, cafe: paintCafe, seaside: paintSeaside };
const scenePaintedCache = new Map();
/** SVG markup of a painted scene, or '' for transparent / custom scenes. */
export function sceneSvg(id) {
    const painter = SCENE_PAINTERS[id];
    if (!painter)
        return '';
    let svg = scenePaintedCache.get(id);
    if (!svg) {
        svg = painter();
        scenePaintedCache.set(id, svg);
    }
    return svg;
}
/** A CSS-ready URL for a painted scene; custom pictures pass their own object URL. */
export function sceneUrl(id, customUrl) {
    if (id === 'custom')
        return customUrl ?? '';
    const svg = sceneSvg(id);
    return svg ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) : '';
}
//# sourceMappingURL=scenes.js.map
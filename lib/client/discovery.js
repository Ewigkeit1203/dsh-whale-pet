export const INTERACTIONS = [
    { id: 'pat', name: ['摸摸头', 'Head pat'], hint: ['她好像喜欢被摸头……', 'She seems to like her head being stroked…'], how: ['在她头顶来回移动鼠标', 'Move the pointer back and forth over her head'] },
    { id: 'tail', name: ['摸尾巴', 'Tail touch'], hint: ['她的尾巴好像很敏感……', 'Her tail seems to be sensitive…'], how: ['在尾巴上来回移动鼠标', 'Move the pointer back and forth over her tail'] },
    { id: 'poke', name: ['戳一戳', 'Poke'], hint: ['连着点她几下会怎样？', 'What if you click her a few times in a row?'], how: ['快速点她三下', 'Click her three times quickly'] },
    { id: 'angry', name: ['戳到生气', 'Poked too much'], hint: ['凡事都有个限度……', 'Everything has a limit…'], how: ['一直戳个不停', 'Keep poking without a break'] },
    { id: 'carry', name: ['拎起来', 'Pick her up'], hint: ['按住她不放，再动一动鼠标？', 'Hold her and move the pointer?'], how: ['按住她拖动，松手放下', 'Press and drag her, release to put her down'] },
    { id: 'dizzy', name: ['晃晕了', 'Dizzy'], hint: ['拎着她的时候别晃太猛……', 'Do not swing her too hard while carrying…'], how: ['拎起来快速大幅度地晃', 'Carry her and swing fast and wide'] },
    { id: 'peek', name: ['探头', 'Peek'], hint: ['她可以躲到屏幕边上，只露个头。', 'She can hide at the screen edge and peek out.'], how: ['按探头快捷键，或用悬停菜单里的“探头”', 'Press the peek shortcut, or use Peek in the hover menu'] },
    { id: 'theatre', name: ['对话剧场', 'Theatre'], hint: ['聊天输入框里藏着一个舞台。', 'There is a stage hidden behind the chat input.'], how: ['点击聊天输入框，或用悬停菜单里的“剧场”', 'Click the chat input, or use Theatre in the hover menu'] },
    { id: 'code', name: ['复制代码', 'Copy code'], hint: ['回答里有代码时，她的菜单会多一个按钮。', 'When an answer has code, her menu gets one more button.'], how: ['回答含代码时，在悬停菜单里点复制', 'When an answer has code, use Copy in the hover menu'] },
    { id: 'meal', name: ['干饭时间', 'Rice break'], hint: ['回答完一个问题之后，看看她在做什么。', 'Watch what she does after finishing an answer.'], how: ['等她回答完，她会吃几口饭', 'Wait for an answer to finish; she has a few bites of rice'] },
];
/** The three first-run steps, in order. */
export const GUIDE_STEPS = ['pat', 'carry', 'peek'];
export const DISCOVERIES_KEY = 'dsh-whale-pet.discoveries.v1';
/** Storage can contain finite numbers outside Date's valid range. */
export function discoveryDate(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
        return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
}
export function readDiscoveries() {
    const found = {};
    try {
        const stored = JSON.parse(localStorage.getItem(DISCOVERIES_KEY) || '{}');
        if (stored && typeof stored === 'object')
            for (const { id } of INTERACTIONS)
                if (discoveryDate(stored[id]))
                    found[id] = stored[id];
    }
    catch { /* storage may be disabled: the gallery starts empty */ }
    return found;
}
export function saveDiscoveries(found) {
    try {
        localStorage.setItem(DISCOVERIES_KEY, JSON.stringify(found));
    }
    catch { /* kept in memory for this session */ }
}
/** Records the first time only: the same object comes back when it was already known. */
export function discover(found, id, now) {
    return discoveryDate(found[id]) || !discoveryDate(now) ? found : { ...found, [id]: now };
}
export function discoveryCount(found) {
    return INTERACTIONS.filter(item => discoveryDate(found[item.id])).length;
}
/** Index of the guide step to show next given the steps done in this run of the guide; GUIDE_STEPS.length when finished. */
export function guideStep(done) {
    const next = GUIDE_STEPS.findIndex(id => !done.includes(id));
    return next < 0 ? GUIDE_STEPS.length : next;
}
//# sourceMappingURL=discovery.js.map
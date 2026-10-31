export const LAYOUT = {
    margin: 16,
    gap: 16,
    panelWidth: 340,
    minPanelHeight: 260,
    /** Room needed above the composer before the panel prefers to stay above it. */
    comfortablePanelHeight: 340,
    petTop: 90,
    composerGap: 12,
};
function within(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
/** Lowest y the panel may reach. */
export function panelFloor(viewportHeight, composerTop) {
    const screenFloor = viewportHeight - LAYOUT.margin;
    if (composerTop === undefined || !Number.isFinite(composerTop))
        return screenFloor;
    const aboveComposer = composerTop - LAYOUT.composerGap;
    // Keep above the composer whenever a usable panel still fits there.
    return aboveComposer - LAYOUT.margin >= LAYOUT.comfortablePanelHeight ? Math.min(screenFloor, aboveComposer) : screenFloor;
}
export function panelWidthFor(viewportWidth) {
    return Math.max(200, Math.min(LAYOUT.panelWidth, viewportWidth - LAYOUT.margin * 2));
}
/** Allowed pet x-range for a given side so that the whole group is on screen. */
export function petRangeForSide(side, viewportWidth, petWidth, panelWidth) {
    const { margin, gap } = LAYOUT;
    return side === 'left'
        ? [margin + panelWidth + gap, viewportWidth - margin - petWidth]
        : [margin, viewportWidth - margin - petWidth - gap - panelWidth];
}
export function groupFits(viewportWidth, viewportHeight, petWidth, composerTop) {
    const panelWidth = panelWidthFor(viewportWidth);
    const horizontal = petWidth + LAYOUT.gap + panelWidth <= viewportWidth - LAYOUT.margin * 2;
    const vertical = panelFloor(viewportHeight, composerTop) - LAYOUT.margin >= LAYOUT.minPanelHeight;
    return horizontal && vertical;
}
/** Viewport clamp for the pet on its own (settings closed or detached). */
export function clampPet(x, y, petWidth, petHeight, viewportWidth, viewportHeight) {
    const { margin, petTop } = LAYOUT;
    const top = Math.min(petTop, Math.max(margin, viewportHeight - petHeight - margin));
    return {
        x: within(x, margin, Math.max(margin, viewportWidth - petWidth - margin)),
        y: within(y, top, Math.max(top, viewportHeight - petHeight - margin)),
    };
}
/**
 * Choose a side and pet x so that the group fits.
 * Keeps `previousSide` while it still fits; otherwise switches; otherwise
 * moves the pet to the closest valid position.
 */
export function placeGroupX(x, petWidth, viewportWidth, previousSide, pinned = false) {
    const panelWidth = panelWidthFor(viewportWidth);
    const preferred = previousSide ?? (x + petWidth / 2 > viewportWidth / 2 ? 'left' : 'right');
    const other = preferred === 'left' ? 'right' : 'left';
    for (const side of [preferred, other]) {
        const [min, max] = petRangeForSide(side, viewportWidth, petWidth, panelWidth);
        if (min <= max && x >= min && x <= max)
            return { side, x, fits: true };
    }
    if (pinned) {
        // A docked pet stays where it is (its edge inset may be tighter than the margin); only the panel must fit.
        const fitsSide = (side) => side === 'left' ? x - LAYOUT.gap - panelWidth >= LAYOUT.margin : x + petWidth + LAYOUT.gap + panelWidth <= viewportWidth - LAYOUT.margin;
        const side = fitsSide(preferred) ? preferred : fitsSide(other) ? other : null;
        return side ? { side, x, fits: true } : { side: preferred, x, fits: false };
    }
    let best = null;
    for (const side of [preferred, other]) {
        const [min, max] = petRangeForSide(side, viewportWidth, petWidth, panelWidth);
        if (min > max)
            continue;
        const candidate = within(x, min, max);
        const distance = Math.abs(candidate - x);
        if (!best || distance < best.distance)
            best = { side, x: candidate, distance };
    }
    return best ? { side: best.side, x: best.x, fits: true } : { side: preferred, x, fits: false };
}
export function layoutGroup(input) {
    const { viewportWidth: vw, viewportHeight: vh, pet, composerTop } = input;
    const { margin, gap } = LAYOUT;
    const width = panelWidthFor(vw);
    const floor = panelFloor(vh, composerTop);
    const free = clampPet(pet.x, pet.y, pet.width, pet.height, vw, vh);
    const petPos = input.petPinned ? { x: pet.x, y: pet.y } : free;
    const placed = groupFits(vw, vh, pet.width, composerTop)
        ? placeGroupX(petPos.x, pet.width, vw, input.previousSide, input.petPinned)
        : null;
    if (!placed || !placed.fits) {
        // Detached: an independent sheet, horizontally centred, top-anchored.
        const maxHeight = Math.max(160, floor - margin);
        return {
            mode: 'detached',
            side: input.previousSide ?? 'left',
            pet: petPos,
            panel: { x: Math.round((vw - width) / 2), y: margin, width, maxHeight },
        };
    }
    const petX = placed.x;
    const panelX = placed.side === 'left' ? petX - gap - width : petX + pet.width + gap;
    // Align the panel's top with the head, then keep the whole panel above the floor.
    const desiredHeight = Math.max(LAYOUT.minPanelHeight, Math.min(input.panelHeight || 0, floor - margin));
    const headY = petPos.y + Math.round(pet.height * 0.06);
    const panelY = within(headY, margin, floor - desiredHeight);
    return {
        mode: 'tethered',
        side: placed.side,
        pet: { x: petX, y: petPos.y },
        panel: { x: Math.round(panelX), y: Math.round(panelY), width, maxHeight: Math.round(floor - panelY) },
    };
}
//# sourceMappingURL=layout.js.map
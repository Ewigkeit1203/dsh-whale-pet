"""Regenerate approximate hit contours after replacing the existing PNG artwork.
Development helper only: requires Pillow; the shipped browser bundle has no new dependency.
"""
import json
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent.parent
result = {}
for path in sorted((root / 'assets').glob('*.png')):
    image = Image.open(path).convert('RGBA')
    alpha = image.getchannel('A')
    width, height = image.size
    stride = max(1, height // 48)
    rows = []
    for y in range(0, height, stride):
        box = alpha.crop((0, y, width, min(height, y + stride))).getbbox()
        if box:
            rows.append((100 * box[0] / width, 100 * y / height, 100 * box[2] / width))
    if rows:
        points = [f'{left:.2f}% {y:.2f}%' for left, y, right in rows]
        points += [f'{right:.2f}% {y:.2f}%' for left, y, right in reversed(rows)]
        result[path.stem] = 'polygon(' + ','.join(points) + ')'
(root / 'src/client/hitareas.ts').write_text(
    '// Generated locally from alpha envelopes; see scripts/generate-hitareas.py.\n'
    + 'export const HIT_AREAS: Record<string, string> = ' + json.dumps(result) + '\n',
    encoding='utf-8',
)

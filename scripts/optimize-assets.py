"""Create compact WebP copies of the character artwork for the browser bundle.

Development helper (requires Pillow). For every assets/*.png it writes
assets/optimized/<name>.webp and records the PNG's SHA-1 in
assets/optimized/manifest.json. build.js embeds the WebP only while that hash
still matches the PNG, so replacing a PNG never ships stale art: the build
falls back to the PNG until this script is run again.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
assets = root / 'assets'
out = assets / 'optimized'
out.mkdir(exist_ok=True)
manifest = {}
for png in sorted(assets.glob('*.png')):
    digest = hashlib.sha1(png.read_bytes()).hexdigest()
    target = out / (png.stem + '.webp')
    Image.open(png).convert('RGBA').save(target, 'WEBP', quality=90, method=6, alpha_quality=100)
    manifest[png.stem] = {'png_sha1': digest, 'webp_bytes': target.stat().st_size, 'png_bytes': png.stat().st_size}
    print(f'{png.name}: {png.stat().st_size // 1024} KB -> {target.stat().st_size // 1024} KB')
(out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

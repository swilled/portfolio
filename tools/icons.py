"""Draw the home-screen icons from assets/favicon.svg (a 16x16 pixel grid of rects).

    python tools/icons.py

Writes assets/icons/: apple-touch-icon.png (180), icon-192.png, icon-512.png and
icon-maskable-512.png (art inside the safe zone), all scaled by whole pixels so they stay crisp.
"""
import os
import re
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
svg = open(os.path.join(root, 'assets', 'favicon.svg'), encoding='utf-8').read()
rects = []
for m in re.finditer(r'<rect([^>]*)/>', svg):
    a = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
    rects.append((int(a.get('x', 0)), int(a.get('y', 0)), int(a['width']), int(a['height']), a['fill']))
bg = rects[0][4]


def draw(size, cell):
    img = Image.new('RGB', (size, size), bg)
    off = (size - 16 * cell) // 2
    for x, y, w, h, fill in rects[1:]:
        img.paste(fill, (off + x * cell, off + y * cell, off + (x + w) * cell, off + (y + h) * cell))
    return img


out = os.path.join(root, 'assets', 'icons')
os.makedirs(out, exist_ok=True)
for name, size, cell in [('apple-touch-icon.png', 180, 11), ('icon-192.png', 192, 12), ('icon-512.png', 512, 32), ('icon-maskable-512.png', 512, 22)]:
    draw(size, cell).save(os.path.join(out, name), optimize=True)
    print(name, size)

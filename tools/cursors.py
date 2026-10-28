"""Print the CSS for the pixel cursors (an arrow and a pointing hand), one pair per theme.

    python tools/cursors.py

Paste the output over the cursor block near the top of css/style.css. Browsers draw CSS cursors
natively, so there's no JavaScript and no lag behind the real pointer.

The art is drawn at 2 screen pixels per art pixel, like the site's icons, with the same offset
shadow the palette and notes use. 'o' is the outline, 'f' the fill.
"""
from urllib.parse import quote

ARROW = [
    'o.......', 'oo......', 'ofo.....', 'offo....', 'offfo...', 'offffo..',
    'offfffo.', 'offoooo.', 'ofo.....', 'oo......', 'o.......',
]
HAND = [
    '...oo.......', '..offo......', '..offo......', '..offoooooo.', '..offoffoffo', 'oooffffffffo',
    'offofffffffo', 'offffffffffo', '.offfffffffo', '..offffffffo', '...offffffo.', '...oooooooo.',
]
SCALE = 2


def runs(rows, keep, dx=0, dy=0):
    # one rectangle per horizontal run keeps the data URI small
    d = ''
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            n = 1
            while x + n < len(row) and (row[x + n] in keep) == (row[x] in keep):
                n += 1
            if row[x] in keep:
                d += f'M{x + dx} {y + dy}h{n}v1h-{n}z'
            x += n
    return d


def shadow_rows(rows):
    # the shape shifted one pixel down-right, minus the shape itself, minus lone pixels that read as dirt
    w, h = len(rows[0]) + 1, len(rows) + 1
    shape = {(x, y) for y, r in enumerate(rows) for x, c in enumerate(r) if c in 'of'}
    cast = {(x + 1, y + 1) for x, y in shape} - shape
    cast = {(x, y) for x, y in cast if {(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)} & cast}
    return [''.join('s' if (x, y) in cast else '.' for x in range(w)) for y in range(h)]


def svg(rows, fill, line, shadow):
    w, h = len(rows[0]) + 1, len(rows) + 1
    return (f"<svg xmlns='http://www.w3.org/2000/svg' width='{w * SCALE}' height='{h * SCALE}' viewBox='0 0 {w} {h}' shape-rendering='crispEdges'>"
            f"<path fill='{shadow}' d='{runs(shadow_rows(rows), 's')}'/><path fill='{line}' d='{runs(rows, 'o')}'/><path fill='{fill}' d='{runs(rows, 'f')}'/></svg>")


def url(rows, *colors):
    return 'url("data:image/svg+xml,' + quote(svg(rows, *colors), safe=" /=:'") + '")'


# night: amber with the pink offset shadow; day: ink on paper with the printout's red
for sel, fill, line, shadow in [(':root', '#ffb547', '#0f0c16', '#ff6fa5'), ('[data-theme="light"]', '#1c1922', '#fffdf6', '#c4351d')]:
    print(f'{sel} {{')
    print(f'  --arrow: {url(ARROW, fill, line, shadow)} 1 1, default;')
    print(f'  --hand: {url(HAND, fill, line, shadow)} 7 1, pointer;')
    print('}')

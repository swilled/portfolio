// Pixel landscapes for the alpine log. Every scene is drawn at 320x140 art pixels and scaled up with
// image-rendering: pixelated, so each square on screen is one real pixel. The static layers are drawn
// once into a buffer; only water, trains, animals and climbers are redrawn each frame.
// Night (dark theme) re-tints the same scene toward moonlight instead of using a second drawing.
(() => {
  const W = 320, H = 140;
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgb = (c) => `rgb(${c.map((v) => Math.round(v)).join(',')})`;
  const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const tintCache = new Map();
  const tint = (h, night) => {
    if (!night || h[0] !== '#') return h;
    if (tintCache.has(h)) return tintCache.get(h);
    const c = hex(h), lum = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;
    // bright things (snow) stay pale blue under the moon; dark things sink toward plum
    const out = rgb(mix(mix(c, [lum * 255, lum * 255, lum * 255 * 1.08], 0.55), [22, 18, 42], 0.8 - lum * 0.42));
    tintCache.set(h, out);
    return out;
  };
  const rand = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  // deterministic per-pixel noise, so textures don't shimmer between redraws
  const noise = (x, y, s = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
  // a smooth wandering line, for snowlines, treelines and shorelines
  const wobble = (x, amp, seed = 0) => amp * (0.55 * Math.sin(x * 0.047 + seed) + 0.3 * Math.sin(x * 0.13 + seed * 2.1) + 0.15 * Math.sin(x * 0.41 + seed * 3.7));

  function painter(ctx, night) {
    let skyLow = [216, 238, 250];
    const c = (h) => tint(h, night);
    // haze: distant things lean toward the sky colour
    const haze = (h, f) => (f ? toHex(mix(hex(h), skyLow, f)) : h);
    const G = {
      night, c, noise, wobble,
      px: (x, y, col, w = 1, h = 1) => { ctx.fillStyle = col[0] === '#' ? c(col) : col; ctx.fillRect(Math.round(x), Math.round(y), w, h); },
      // sky in flat bands with a checker dither between them, like an old game background
      sky(top, bottom) {
        skyLow = hex(bottom);
        const a = hex(night ? '#0d0b1c' : top), b = hex(night ? '#2b2342' : bottom), bands = 8, bh = Math.ceil(H / bands);
        for (let i = 0; i < bands; i++) {
          ctx.fillStyle = rgb(mix(a, b, i / (bands - 1)));
          ctx.fillRect(0, i * bh, W, bh);
          ctx.fillStyle = rgb(mix(a, b, Math.min(1, (i + 1) / (bands - 1))));
          for (let x = 0; x < W; x += 2) ctx.fillRect(x + (i % 2), i * bh + bh - 1, 1, 1);
        }
        if (night) {
          const r = rand(7);
          for (let i = 0; i < 80; i++) { ctx.fillStyle = r() < 0.2 ? '#ede6f5' : '#7d7398'; ctx.fillRect((r() * W) | 0, (r() * 64) | 0, 1, 1); }
        }
      },
      sun(x, y, r) {
        for (let j = -r - 2; j <= r + 2; j++) for (let i = -r - 2; i <= r + 2; i++) {
          const d = i * i + j * j;
          if (d <= r * r) ctx.fillStyle = night ? '#f3e7c6' : '#fff4c8';
          else if (!night && d <= (r + 2) * (r + 2) && (i + j) % 2 === 0) ctx.fillStyle = '#ffeaa6';
          else continue;
          ctx.fillRect(x + i, y + j, 1, 1);
        }
        if (night) [[-2, -1], [1, 1], [2, -2]].forEach(([i, j]) => { ctx.fillStyle = '#d9caa0'; ctx.fillRect(x + i, y + j, 1, 1); });
      },
      cloud(x, y, w) {
        for (let j = 0; j < 4; j++) G.px(x + j * 2, y - j, night ? '#4a4366' : '#ffffff', w - j * 4, 1);
        G.px(x, y + 1, night ? '#3a3456' : '#e6f1fa', w, 1);
      },
      // a ridge profile from [x, y-of-top] key points, with deterministic jaggedness
      prof(points, jag = 0, seed = 1) {
        const out = new Array(W).fill(H + 1);
        for (let k = 1; k < points.length; k++) {
          const [x0, y0] = points[k - 1], [x1, y1] = points[k];
          for (let x = Math.max(0, Math.ceil(x0)); x <= Math.min(W - 1, x1); x++) {
            const t = (x - x0) / (x1 - x0 || 1);
            const n = jag ? Math.round(Math.sin(x * 0.71 + seed) * jag * 0.55 + Math.sin(x * 1.93 + seed * 3) * jag * 0.3 + (noise(x, 0, seed) - 0.5) * jag * 0.5) : 0;
            out[x] = Math.round(y0 + (y1 - y0) * t + n);
          }
        }
        return out;
      },
      // fill a profile down to `base`. Light comes from the upper left, so the tone (0 sunlit, 1 mid, 2 shadow)
      // comes from the smoothed slope of the ridge. mat(x, y, top, tone) returns a [lit, mid, shade] triple or a colour.
      mountain(p, base, mat, fade = 0) {
        // smooth the ridge before reading its slope, so jagged tops don't flip the shading column by column
        const sm = p.map((v, x) => {
          let sum = 0, n = 0;
          for (let k = -7; k <= 7; k++) { const q = p[x + k]; if (q !== undefined && q <= base) { sum += q; n++; } }
          return n ? sum / n : v;
        });
        const at = (x) => sm[Math.max(0, Math.min(W - 1, x))];
        for (let x = 0; x < W; x++) {
          const top = p[x];
          if (top > base) continue;
          const slope = at(x + 4) - at(x - 4);
          for (let y = top; y <= base; y++) {
            // dither the seams between tones instead of cutting a straight vertical line
            const d = (x + y) % 2 ? 0.9 : -0.9;
            const tone = slope + d < -2.2 ? 0 : slope + d > 2.2 ? 2 : 1;
            let col = mat(x, y, top, tone);
            if (Array.isArray(col)) col = col[tone];
            ctx.fillStyle = c(haze(col, fade));
            ctx.fillRect(x, y, 1, 1);
          }
        }
      },
      // snow down to a wandering line, with gullies that carry it further down in tapered streaks
      snowy(x, y, top, line, gullies = [], depth = 0) {
        if (depth && y - top < depth) return true;
        let limit = line(x);
        gullies.forEach(([gx, w, len]) => { const d = Math.abs(x - gx); if (d < w) limit += len * (1 - d / w) * (0.7 + noise(gx, 1) * 0.6); });
        return y < limit;
      },
      // rock with a little speckle so faces don't read as flat fills
      rock(x, y, tones, s = 0) {
        const n = noise(x, y, s);
        return n < 0.1 ? tones.map((t) => toHex(mix(hex(t), [0, 0, 0], 0.18))) : n > 0.95 ? tones.map((t) => toHex(mix(hex(t), [255, 255, 255], 0.15))) : tones;
      },
      // a still lake that mirrors whatever is already drawn above it
      lake(y0, y1, x0, x1, water) {
        const hgt = y1 - y0;
        ctx.save();
        ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, hgt); ctx.clip();
        ctx.translate(0, 2 * y0); ctx.scale(1, -1);
        ctx.drawImage(ctx.canvas, 0, y0 - hgt, W, hgt, 0, y0 - hgt, W, hgt);
        ctx.restore();
        ctx.globalAlpha = 0.6; G.px(x0, y0, water, x1 - x0, hgt); ctx.globalAlpha = 1;
        G.px(x0, y0, toHex(mix(hex(water), [255, 255, 255], 0.35)), x1 - x0, 1);
      },
      conifer(x, base, h, col = '#2f5a3a', dark = '#22432b') {
        for (let j = 0; j < h; j++) {
          const w = Math.max(1, Math.round((j / h) * (h * 0.42)) * 2 + 1), y = base - h + j;
          G.px(x - (w >> 1), y, col, w >> 1, 1);
          G.px(x - (w >> 1) + (w >> 1), y, dark, w - (w >> 1), 1);
        }
        G.px(x, base, '#4a3526');
      },
      forest(x0, x1, baseAt, count, seed, hMin, hMax, col, dark) {
        const r = rand(seed);
        Array.from({ length: count }, () => [x0 + r() * (x1 - x0), hMin + r() * (hMax - hMin)])
          .sort((a, b) => baseAt(a[0]) - baseAt(b[0]) || a[1] - b[1])
          .forEach(([x, h]) => G.conifer(Math.round(x), Math.round(baseAt(x)), Math.round(h), col, dark));
      },
      sprite(rows, pal, x, y, flip = false) {
        rows.forEach((row, j) => [...row].forEach((ch, i) => {
          if (ch === '.' || !pal[ch]) return;
          G.px(x + (flip ? row.length - 1 - i : i), y + j, pal[ch]);
        }));
      },
      speckle(x0, x1, y0, y1, n, seed, cols) {
        const r = rand(seed);
        for (let i = 0; i < n; i++) G.px(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), cols[(r() * cols.length) | 0]);
      },
      path(points, col, step = 3) {
        points.reduce((a, b) => {
          const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
          for (let k = 0; k < n; k += step) G.px(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, col);
          return b;
        });
      },
    };
    return G;
  }

  const SNOW = ['#ffffff', '#eef3fa', '#c3cfe2'];
  const GREY = ['#8f8c90', '#727077', '#55535c'];
  const FOREST = ['#3d6b45', '#2f5a3a', '#22432b'];
  const MEADOW = ['#86c15a', '#6fa84a', '#578a3a'];

  const SPRITES = {
    chalet: [['....rrrr....', '..rrrrrrrr..', 'rrrrrrrrrrrr', '.wwwwwwwwww.', '.wwbbwwbbww.', '.wwbbwwbbww.', '.wwwwddwwww.', '.wwwwddwwww.'],
      { r: '#5b4a42', w: '#9a6a3c', b: '#f0dfa8', d: '#5a3a22' }],
    train: [['.cccccccccccc..cccccccccccc.', 'crrbrrbrrbrrrccrrbrrbrrbrrrc', 'crrrrrrrrrrrrccrrrrrrrrrrrrc', '.k..k......k....k.......k...'],
      { r: '#a8322b', b: '#f2e6c8', c: '#e8dcc0', k: '#222222' }],
    sphinx: [['..ss..', '.ssss.', 'gggggg', 'gbgbgg'], { s: '#d8dde4', g: '#8d939c', b: '#3a3e49' }],
    lookout: [['..rr..', '.rrrr.', 'rrrrrr', 'wbwwbw', 'wwwwww', '.l..l.'], { r: '#5a4a40', w: '#c9b48c', b: '#3a2e26', l: '#4a3526' }],
    hotel: [['...r......r......r...', '..rrr....rrr....rrr..', '.rrrrrrrrrrrrrrrrrrr.', 'rrrrrrrrrrrrrrrrrrrrr', 'wbwbwbwbwbwbwbwbwbwbw', 'wwwwwwwwwwwwwwwwwwwww', 'wbwbwbwbwbwbwbwbwbwbw'],
      { r: '#4a3a33', w: '#d9c7a0', b: '#6b5a40' }],
    inn: [['....gggg....', '..gggggggg..', 'gggggggggggg', 'wbwwbwwbwwbw', 'wwwwwwwwwwww'], { g: '#4f5f55', w: '#c9b48c', b: '#3a2e26' }],
    goat: [['w...', 'wwww', 'w..w'], { w: '#f7f4ec' }],
    bear: [['.bbbb.', 'bbbbbb', 'b.b.b.'], { b: '#6b4a2e' }],
    marmot: [['.mm', 'mmm'], { m: '#8a6a48' }],
    car: [['..cccc...', '.cbbbbcc.', 'ccccccccc', '.k....k..'], { c: '#3d6fb5', b: '#b8d6f0', k: '#222222' }],
    tent: [['..o..', '.ooo.', 'ooooo'], { o: '#e8742a' }],
  };

  /* ---------- the peaks ---------- */
  const SCENES = {
    // Eiger, Mönch and Jungfrau from the meadows below Kleine Scheidegg, the Sphinx on the Jungfraujoch
    jungfrau: {
      draw(G) {
        G.sky('#6fb6e6', '#d8eefb');
        G.sun(42, 20, 5);
        G.cloud(220, 30, 26); G.cloud(92, 44, 18);
        const monch = G.prof([[96, 96], [120, 60], [138, 32], [150, 30], [166, 40], [186, 60], [200, 74]], 1.2, 5);
        const jung = G.prof([[178, 78], [204, 54], [226, 40], [238, 33], [246, 36], [262, 13], [280, 30], [300, 48], [320, 62]], 1.2, 9);
        const eiger = G.prof([[0, 94], [26, 64], [50, 34], [62, 18], [72, 30], [90, 56], [112, 80], [126, 98]], 1.6, 3);
        G.mountain(monch, 112, (x, y, top) => (G.snowy(x, y, top, (xx) => 58 + G.wobble(xx, 6, 1), [[124, 3, 9], [178, 3, 10]], 3) ? SNOW : G.rock(x, y, GREY, 2)), 0.12);
        G.mountain(jung, 112, (x, y, top) => (G.snowy(x, y, top, (xx) => 80 + G.wobble(xx, 7, 2), [[214, 3, 10], [252, 4, 9], [292, 3, 10]], 4) ? SNOW : G.rock(x, y, GREY, 3)), 0.08);
        // Eiger: mostly dark rock; its north face holds snow only on ledges
        G.mountain(eiger, 112, (x, y, top) => {
          if (y - top < 2 && y < 40) return SNOW;
          if (y < 80 && y % 7 === 0 && G.noise(x >> 2, y) < 0.3) return SNOW;
          return G.rock(x, y, ['#62666f', '#4b4f59', '#3a3d46'], 1);
        });
        G.sprite(...SPRITES.sphinx, 182, 60);
        const meadow = G.prof([[0, 104], [70, 98], [150, 108], [230, 100], [320, 106]], 0.6, 2);
        G.mountain(meadow, H, (x, y, top) => (y - top < 1 ? '#a3d46d' : MEADOW));
        G.speckle(0, W, 110, H, 90, 4, ['#f4e04d', '#ffffff', '#c66bd6']);
        G.sprite(...SPRITES.chalet, 262, 110);
        for (let x = 0; x < W; x++) G.px(x, 123 + Math.round(Math.sin(x / 60) * 1.5), '#6b5a48');
      },
      dyn(G, t) {
        const x = Math.round(((t * 14) % (W + 60)) - 50);
        G.sprite(...SPRITES.train, x, 120 + Math.round(Math.sin((x + 14) / 60) * 1.5));
        return [{ x, y: 120, w: 28, h: 4, id: 'train' }];
      },
    },
    // Mount Siyeh's north face over Cracker Lake: Belt Supergroup layers, the black diorite sill with pale
    // marble on either side, scree fans running into turquoise glacial water
    siyeh: {
      draw(G) {
        G.sky('#6aaedf', '#d2e9f7');
        G.cloud(30, 26, 24);
        const strata = (x, y, tone, s) => {
          const k = y + Math.round(G.wobble(x, 2, s) + x * 0.04);
          if (k >= 56 && k < 60) return ['#2f2c2e', '#2a2729', '#211f21'][tone];
          if (k === 54 || k === 55 || k === 60 || k === 61) return ['#e2ddd2', '#cfc9bd', '#a9a399'][tone];
          const band = Math.floor(k / 5) % 6;
          const set = [GREY, ['#93827a', '#7c6c65', '#62554f'], GREY, ['#a09a8e', '#888277', '#6d685e'], ['#8b7670', '#75625d', '#5c4c48'], ['#85837f', '#6d6b68', '#555350']][band];
          return G.rock(x, y, set, s)[tone];
        };
        const left = G.prof([[0, 58], [36, 44], [64, 50], [88, 72]], 2.2, 4);
        const right = G.prof([[244, 64], [276, 42], [300, 46], [320, 54]], 2.2, 6);
        // the face: a summit block, then a near-vertical wall falling to the scree
        const face = G.prof([[40, 100], [62, 66], [88, 42], [110, 24], [124, 10], [138, 17], [160, 23], [184, 21], [206, 29], [230, 41], [256, 64], [276, 100]], 1.2, 8);
        [left, right].forEach((p, i) => G.mountain(p, 106, (x, y, top, tone) => (y - top < 2 && y < 52 ? SNOW[tone] : strata(x, y, tone, i + 3)), 0.18));
        G.mountain(face, 104, (x, y, top, tone) => {
          if (y - top < 2 && y < 32) return SNOW[tone];
          if ((y % 6 === 0) && G.noise(x >> 3, y) < 0.16 && y < 76) return SNOW[Math.min(2, tone + 1)]; // snow on ledges
          return strata(x, y, tone, 1);
        });
        // scree fans
        [92, 124, 160, 196, 230].forEach((cx, i) => {
          for (let j = 0; j < 12; j++) {
            const w = j * 2 + 1;
            for (let k = 0; k < w; k++) G.px(cx - j + k, 94 + j, G.noise(cx + k, j, i) < 0.3 ? '#8f8a82' : '#aaa59c');
          }
        });
        G.lake(106, 126, 64, 268, '#2fc4bb');
        G.forest(0, 70, (x) => 126 - Math.round(x * 0.08), 16, 3, 10, 24, FOREST[1], FOREST[2]);
        G.forest(262, 320, (x) => 126 - Math.round((320 - x) * 0.08), 13, 5, 10, 24, FOREST[1], FOREST[2]);
        G.px(0, 126, '#5d6a49', W, H - 126);
        G.speckle(0, W, 127, H, 70, 2, ['#8a8f79', '#a39e8f', '#6e7a5a']);
      },
      dyn(G, t) {
        for (let i = 0; i < 12; i++) G.px(72 + ((i * 47 + Math.floor(t * 6)) % 190), 110 + ((i * 5) % 14), '#a6f3ec', 3, 1);
        const gx = 116 + Math.round(Math.sin(t * 0.3) * 4);
        G.sprite(...SPRITES.goat, gx, 97);
        G.sprite(...SPRITES.goat, 204, 101, true);
        return [{ x: gx, y: 97, w: 4, h: 3, id: 'goat' }, { x: 204, y: 101, w: 4, h: 3, id: 'goat' }];
      },
    },
    // Mount Brown above Lake McDonald: silver snags from the 2017 Sprague Fire, the lookout on its false
    // summit, and the lake's red, green and blue stones in front
    brown: {
      draw(G) {
        G.sky('#76b9e4', '#dff0f9');
        G.sun(272, 20, 5);
        G.cloud(150, 18, 30);
        const edwards = G.prof([[196, 66], [246, 38], [276, 42], [320, 58]], 2, 2);
        const brown = G.prof([[0, 94], [36, 72], [90, 50], [112, 44], [126, 46], [150, 34], [172, 22], [194, 28], [232, 62], [270, 92]], 1.4, 4);
        const tree = (x) => 56 + G.wobble(x, 7, 3);
        const slope = (x, y, top, tone, s) => {
          if (y - top < 2 && y < 36) return SNOW[tone];
          if (y < tree(x)) return G.rock(x, y, ['#9a9188', '#7f776f', '#645e58'], s)[tone];
          // burned slope above the living forest
          return y < tree(x) + 22 + G.wobble(x, 4, 7) ? ['#6d6a5c', '#5d5a4f', '#4a4840'][tone] : FOREST[tone];
        };
        G.mountain(edwards, 104, (x, y, top, tone) => slope(x, y, top, tone, 2), 0.15);
        G.mountain(brown, 104, (x, y, top, tone) => slope(x, y, top, tone, 1));
        G.sprite(...SPRITES.lookout, 109, 38);
        const r = rand(11);
        for (let i = 0; i < 110; i++) {
          const x = Math.round(20 + r() * 230), y = Math.round(tree(x) + 2 + r() * 22);
          if (y > (brown[x] ?? 200) + 4 && y < 100) G.px(x, y, '#c9c2b6', 1, 2 + Math.round(r() * 3));
        }
        G.forest(0, 320, () => 104, 46, 9, 8, 16, FOREST[1], FOREST[2]);
        G.lake(104, 126, 0, W, '#2c6a96');
        G.px(0, 126, '#8a7f70', W, H - 126);
        G.speckle(0, W, 126, H, 320, 6, ['#b0473a', '#4f7d4a', '#3f6fa0', '#c9a24a', '#7a4f7f', '#d9cfbf', '#9a5a3a']);
      },
      dyn(G, t) {
        for (let i = 0; i < 14; i++) G.px((i * 41 + Math.floor(t * 5)) % W, 108 + ((i * 7) % 16), '#a4cfe9', 4, 1);
        return [{ x: 0, y: 104, w: W, h: 22, id: 'lake' }];
      },
    },
    // Altyn Peak above Swiftcurrent Lake and the Many Glacier Hotel: red argillite over green slopes
    altyn: {
      draw(G) {
        G.sky('#70b3e1', '#d6ecf8');
        G.cloud(250, 22, 22);
        const back = G.prof([[150, 64], [196, 38], [232, 30], [270, 44], [320, 38]], 2.4, 3);
        const altyn = G.prof([[0, 86], [36, 60], [80, 36], [104, 28], [118, 30], [150, 46], [188, 72], [214, 94]], 1.6, 6);
        const grass = (x) => 70 + G.wobble(x, 6, 5);
        G.mountain(back, 100, (x, y, top, tone) => (G.snowy(x, y, top, (xx) => 40 + G.wobble(xx, 4, 8), [[214, 3, 18], [250, 4, 12]], 2) ? SNOW[tone] : G.rock(x, y, GREY, 4)[tone]), 0.2);
        G.mountain(altyn, 100, (x, y, top, tone) => {
          if (y > grass(x)) return MEADOW[tone];
          const k = Math.floor((y + G.wobble(x, 2, 4)) / 6) % 4;
          return G.rock(x, y, [['#a8634f', '#8f5244', '#6e3f35'], ['#b98266', '#9c6c55', '#7a5443'], ['#8f746a', '#776159', '#5c4a44'], ['#a46a52', '#8a5846', '#6a4337']][k], 6)[tone];
        });
        G.forest(0, 320, (x) => 100 + (x % 7 === 0 ? 1 : 0), 40, 4, 8, 16, FOREST[1], FOREST[2]);
        G.sprite(...SPRITES.hotel, 150, 93);
        G.lake(100, 124, 0, W, '#3a8a9e');
        G.px(0, 124, '#677651', W, H - 124);
        G.speckle(0, W, 125, H, 60, 8, ['#e6d36a', '#ffffff', '#9a8f7a']);
      },
      dyn(G, t) {
        for (let i = 0; i < 12; i++) G.px((i * 53 + Math.floor(t * 4)) % W, 104 + ((i * 3) % 18), '#acdde3', 3, 1);
        // berry season: a grizzly ambles along the far shore
        const bx = 18 + Math.round((t * 3) % 120);
        G.sprite(...SPRITES.bear, bx, 97);
        return [{ x: bx, y: 97, w: 6, h: 3, id: 'bear' }];
      },
    },
    // Mount Adams from the south: the South Spur past Lunch Counter and Piker's Peak, a car at the trailhead
    adams: {
      draw(G) {
        G.sky('#78bbe7', '#e2f1fa');
        G.sun(288, 20, 5);
        const adams = G.prof([[0, 104], [40, 82], [86, 50], [124, 28], [136, 22], [148, 24], [164, 13], [184, 16], [218, 38], [266, 70], [320, 98]], 0.8, 2);
        const ribs = [[60, 3, 30], [104, 3, 24], [212, 3, 26], [250, 3, 22]];
        G.mountain(adams, 116, (x, y, top, tone) => {
          const line = (xx) => 84 + G.wobble(xx, 8, 6);
          // dark rock ribs pushing up through the glaciers
          const rib = ribs.some(([rx, w, len]) => Math.abs(x - rx - (line(x) - y) * 0.2) < 1.2 && y > line(x) - len && y < line(x) && G.noise(rx, y >> 1) > 0.25);
          if (!rib && G.snowy(x, y, top, line, [[150, 6, 12], [180, 5, 10]])) return SNOW[tone];
          return G.rock(x, y, ['#857c74', '#6c645d', '#544d48'], 5)[tone];
        });
        // pumice slopes and scattered subalpine firs
        const ground = G.prof([[0, 112], [120, 104], [220, 110], [320, 104]], 0.6, 5);
        G.mountain(ground, H, (x, y, top) => G.rock(x, y, ['#c8bca4', '#b5a990', '#9c9078'], 9));
        G.forest(0, 320, (x) => ground[x] + 8, 22, 12, 6, 12, '#3b5a40', '#2c4630');
        G.path([[60, 132], [90, 112], [118, 86], [128, 70], [140, 50], [146, 30], [160, 18], [166, 13]], '#e05a3a');
        G.sprite(...SPRITES.tent, 124, 66);
        G.sprite(...SPRITES.car, 52, 132);
      },
      dyn() { return [{ x: 52, y: 132, w: 9, h: 4, id: 'car' }, { x: 120, y: 62, w: 10, h: 6, id: 'lunch' }]; },
    },
    // Rainier from Paradise: glaciers, dark cleavers, the Skyline loop through wildflower meadows
    skyline: {
      draw(G) {
        G.sky('#7cc0ea', '#e3f2fb');
        G.cloud(30, 30, 24); G.cloud(262, 40, 20);
        const rainier = G.prof([[0, 106], [30, 86], [76, 50], [116, 24], [146, 12], [174, 10], [204, 18], [248, 46], [298, 82], [320, 94]], 0.8, 3);
        const cleavers = [[130, 3, 34], [198, 2, 30], [96, 3, 22]];
        G.mountain(rainier, 108, (x, y, top, tone) => {
          const line = (xx) => 92 + G.wobble(xx, 6, 2);
          const cleaver = cleavers.some(([cx, w, len]) => { const t = (y - 40) / len; return t > 0 && t < 1 && Math.abs(x - cx - (y - 40) * 0.25) < w * Math.sin(t * Math.PI) + 0.3; });
          if (cleaver) return G.rock(x, y, ['#5e5853', '#4c4743', '#3a3633'], 3)[tone];
          if (G.snowy(x, y, top, line, [[150, 7, 12], [60, 4, 8]])) return G.noise(x, y, 4) < 0.025 ? '#9fbde0' : SNOW[tone];
          return G.rock(x, y, ['#857e77', '#6e6862', '#58534e'], 3)[tone];
        });
        const meadow = G.prof([[0, 108], [90, 100], [180, 106], [260, 98], [320, 104]], 0.6, 7);
        G.mountain(meadow, H, (x, y, top) => (y - top < 1 ? '#a3dc70' : MEADOW));
        G.speckle(0, W, 104, H, 260, 3, ['#7b6fd0', '#e0503a', '#ffffff', '#f2d14a']);
        G.forest(0, 70, () => 126, 11, 2, 10, 22, FOREST[1], FOREST[2]);
        G.forest(280, 320, () => 124, 7, 6, 10, 20, FOREST[1], FOREST[2]);
        G.sprite(...SPRITES.inn, 58, 118);
        G.path([[70, 122], [96, 112], [120, 102], [150, 96], [176, 100], [200, 110], [210, 122], [170, 128], [120, 126], [70, 122]], '#b0472e');
      },
      dyn(G, t) {
        const show = Math.floor(t / 3) % 3 !== 2;
        if (show) G.sprite(...SPRITES.marmot, 232, 116);
        return show ? [{ x: 232, y: 116, w: 3, h: 2, id: 'marmot' }] : [];
      },
    },
    // next summer: Rainier's Disappointment Cleaver route, Camp Muir halfway up
    rainier: {
      draw(G) {
        SCENES.skyline.draw(G);
        G.path([[100, 112], [126, 92], [140, 72], [148, 58], [152, 44], [160, 30], [166, 18], [170, 11]], '#ffb547', 2);
        G.sprite(...SPRITES.tent, 141, 68);
      },
      dyn(G, t) {
        const p = (t % 8) / 8;
        G.px(Math.round(100 + p * 70), Math.round(112 - p * 101) - 2, '#1c1922', 1, 2);
        return [];
      },
    },
    // Mount Baker from Heather Meadows: a broad glaciated cone that still steams from Sherman Crater
    baker: {
      draw(G) {
        G.sky('#74b7e4', '#e0f0fa');
        G.cloud(40, 24, 22);
        const baker = G.prof([[0, 102], [60, 72], [116, 36], [146, 20], [172, 18], [206, 34], [258, 66], [320, 96]], 0.8, 4);
        G.mountain(baker, 112, (x, y, top, tone) => (G.snowy(x, y, top, (xx) => 90 + G.wobble(xx, 6, 3), [[100, 5, 10], [230, 5, 10]])
          ? (G.noise(x, y, 2) < 0.02 ? '#9fbde0' : SNOW[tone]) : G.rock(x, y, ['#857c74', '#6c645d', '#544d48'], 2)[tone]));
        const meadow = G.prof([[0, 110], [100, 104], [200, 112], [320, 106]], 0.6, 3);
        G.mountain(meadow, H, (x, y, top) => ['#7aa35c', '#6a9450', '#557a40']);
        G.lake(118, 132, 116, 224, '#4783ab');
        G.forest(0, 110, () => 132, 13, 13, 8, 18, FOREST[1], FOREST[2]);
        G.forest(226, 320, () => 132, 11, 14, 8, 18, FOREST[1], FOREST[2]);
        G.px(0, 132, '#55704a', W, H - 132);
      },
      dyn(G, t) {
        for (let i = 0; i < 5; i++) {
          const k = (t * 0.5 + i * 0.2) % 1;
          G.px(186 + Math.round(Math.sin(k * 6 + i) * 2), 22 - Math.round(k * 16), k < 0.7 ? '#f4f4f4' : '#d6d6d6', 2, 1);
        }
        return [];
      },
    },
    // the North Cascades: granite towers, couloirs and small glaciers
    cascades: {
      draw(G) {
        G.sky('#72b2e2', '#dceefa');
        const back = G.prof([[0, 58], [36, 40], [62, 50], [96, 26], [126, 48], [166, 28], [196, 46], [238, 20], [268, 44], [320, 34]], 4, 5);
        const front = G.prof([[0, 96], [46, 72], [86, 84], [136, 54], [166, 76], [216, 60], [256, 86], [320, 72]], 3, 9);
        G.mountain(back, 110, (x, y, top, tone) => (G.snowy(x, y, top, (xx) => 50 + G.wobble(xx, 6, 1), [[96, 3, 14], [238, 4, 16], [166, 3, 12]], 3) ? SNOW[tone] : G.rock(x, y, GREY, 7)[tone]), 0.2);
        G.mountain(front, 120, (x, y, top, tone) => (y - top < 2 ? SNOW[tone] : y > 92 + G.wobble(x, 5, 2) ? FOREST[tone] : G.rock(x, y, ['#6e7582', '#59606d', '#454b56'], 8)[tone]));
        G.lake(118, 134, 0, W, '#2a7886');
        G.forest(0, 320, () => 120, 40, 21, 8, 18, '#2a5034', '#1f3d27');
        G.px(0, 134, '#4a5a3e', W, H - 134);
      },
      dyn() { return []; },
    },
  };

  // one canvas per stage; swapping scenes or themes rebuilds the static buffer
  window.Alpine = {
    W, H, SCENES, SPRITES, painter, tint,
    mount(canvas, onHit) {
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      const buf = document.createElement('canvas');
      buf.width = W; buf.height = H;
      const bctx = buf.getContext('2d');
      let scene = null, hits = [], raf = 0, last = 0;
      const t0 = performance.now();
      const isNight = () => document.documentElement.dataset.theme !== 'light';
      const build = () => {
        if (!scene) return;
        bctx.clearRect(0, 0, W, H);
        scene.draw(painter(bctx, isNight()));
        ctx.drawImage(buf, 0, 0);
        hits = scene.dyn ? scene.dyn(painter(ctx, isNight()), 2) || [] : [];
      };
      const frame = (now) => {
        raf = requestAnimationFrame(frame);
        if (now - last < 83) return; // 12fps, like the rest of the pixel motion
        last = now;
        ctx.drawImage(buf, 0, 0);
        hits = scene && scene.dyn ? scene.dyn(painter(ctx, isNight()), (now - t0) / 1000) || [] : [];
      };
      const hitAt = (e) => {
        const r = canvas.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
        return [hits.find((h) => x >= h.x - 3 && x <= h.x + h.w + 3 && y >= h.y - 3 && y <= h.y + h.h + 3), x, y];
      };
      canvas.addEventListener('click', (e) => {
        const [hit, x, y] = hitAt(e);
        if (onHit) onHit(hit ? hit.id : null, x, y);
      });
      // the hand only over something that reacts
      canvas.addEventListener('pointermove', (e) => canvas.classList.toggle('hot', !!hitAt(e)[0]));
      canvas.addEventListener('pointerleave', () => canvas.classList.remove('hot'));
      document.addEventListener('themechange', build);
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) new IntersectionObserver(([e]) => { cancelAnimationFrame(raf); if (e.isIntersecting) raf = requestAnimationFrame(frame); }).observe(canvas);
      return { show(name) { scene = SCENES[name]; build(); } };
    },
  };
})();

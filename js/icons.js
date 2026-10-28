// Pixel-art tech logos, drawn on a 16x16 grid. pixelIcon(name) returns an <svg> string.
// ufLogo() returns the pixel Gators logo as a small multi-colour <svg>.
(() => {
  const N = 16;
  const FONT = { // 3x5 glyphs
    T: ['###', '.#.', '.#.', '.#.', '.#.'], S: ['###', '#..', '###', '..#', '###'], J: ['..#', '..#', '..#', '#.#', '###'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'], W: ['#.#', '#.#', '###', '###', '#.#'], A: ['.#.', '#.#', '###', '#.#', '#.#'],
    Q: ['###', '#.#', '#.#', '###', '..#'], L: ['#..', '#..', '#..', '#..', '###'], C: ['###', '#..', '#..', '#..', '###'],
    '+': ['...', '.#.', '###', '.#.', '...'],
  };

  function canvas(w = N, h = N) {
    const g = Array.from({ length: h }, () => new Array(w).fill(0));
    const inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
    const api = {
      g,
      set: (x, y, v = 1) => { if (inb(x, y)) g[y][x] = v; },
      get: (x, y) => (inb(x, y) ? g[y][x] : 0),
      rect: (x, y, rw, rh, v = 1) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) api.set(i, j, v); },
      fill: (fn, v = 1) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (fn(x + 0.5, y + 0.5)) g[y][x] = v; },
      circle: (cx, cy, r, v = 1) => api.fill((x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r, v),
      ring: (cx, cy, r, t = 1.2, v = 1) => api.fill((x, y) => { const d = Math.hypot(x - cx, y - cy); return d <= r && d >= r - t; }, v),
      ellipse: (cx, cy, rx, ry, ang, t = 0.3, v = 1) => api.fill((x, y) => {
        const c = Math.cos(ang), s = Math.sin(ang), dx = x - cx, dy = y - cy;
        const u = dx * c + dy * s, k = -dx * s + dy * c;
        return Math.abs((u / rx) ** 2 + (k / ry) ** 2 - 1) < t;
      }, v),
      line: (x0, y0, x1, y1, v = 1) => {
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) { api.set(x0, y0, v); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
      },
      // hand-drawn rows: '#' is a filled pixel
      art: (rows) => rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') api.set(x, y); })),
      text: (str, x, y, v = 1) => { [...str].forEach((ch, k) => FONT[ch].forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') api.set(x + k * 4 + i, y + j, v); }))); },
      big: (ch, x, y, v = 1) => FONT[ch].forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') api.rect(x + i * 2, y + j * 2, 2, 2, v); })),
    };
    return api;
  }

  const DRAW = {
    /* languages */
    python(c) {
      // two interlocked snakes: one up-left, one down-right
      c.rect(5, 1, 6, 3); c.rect(1, 4, 10, 3); c.rect(1, 7, 3, 4); c.set(5, 1, 0); c.set(1, 4, 0); c.set(1, 10, 0); c.set(6, 2, 0);
      c.rect(12, 5, 3, 4); c.rect(5, 9, 10, 3); c.rect(5, 12, 6, 3); c.set(14, 5, 0); c.set(14, 11, 0); c.set(10, 14, 0); c.set(9, 13, 0);
    },
    typescript(c) { c.rect(1, 1, 14, 14); [[1, 1], [14, 1], [1, 14], [14, 14]].forEach(([x, y]) => c.set(x, y, 0)); c.text('TS', 7, 9, 0); },
    javascript(c) { c.rect(1, 1, 14, 14); c.text('JS', 7, 9, 0); },
    rust(c) {
      c.ring(8, 8, 7, 2);
      for (let a = 0; a < 8; a++) { const t = (a / 8) * Math.PI * 2; c.set(Math.round(7.5 + Math.cos(t) * 7.4), Math.round(7.5 + Math.sin(t) * 7.4)); }
      c.text('R', 6, 5);
    },
    cpp(c) {
      c.fill((x, y) => { const dx = Math.abs(x - 8); return dx <= 7.2 && Math.abs(y - 8) <= 7.6 - dx * 0.5; });
      c.text('C++', 2, 6, 0);
    },
    sql(c) { c.rect(0, 3, 16, 10); c.rect(1, 4, 14, 8, 0); c.text('SQL', 2, 6); },
    r(c) {
      c.ellipse(7.5, 6.5, 7, 4.6, 0, 0.42);
      c.rect(5, 4, 8, 12, 0);
      c.big('R', 6, 5);
    },

    /* web, backend, infra */
    react(c) {
      c.circle(8, 8, 1.7);
      [0, Math.PI / 3, -Math.PI / 3].forEach((a) => {
        for (let th = 0; th < Math.PI * 2; th += 0.02) {
          const u = 7.3 * Math.cos(th), w = 2.3 * Math.sin(th);
          c.set(Math.floor(8 + u * Math.cos(a) - w * Math.sin(a)), Math.floor(8 + u * Math.sin(a) + w * Math.cos(a)));
        }
      });
    },
    nextjs(c) { c.circle(8, 8, 7.4); c.rect(5, 4, 1, 8, 0); c.rect(10, 4, 1, 5, 0); c.line(5, 4, 11, 13, 0); },
    nodejs(c) {
      c.fill((x, y) => { const dx = Math.abs(x - 8), dy = Math.abs(y - 8); return dx <= 6.6 && dy <= 7.6 - dx * 0.55; });
      c.text('JS', 4, 6, 0);
    },
    tailwind(c) {
      const rows = [
        '...####.........',
        '..######......##',
        '.###..###....###',
        '##......######..',
        '#........####...',
      ];
      [1, 8].forEach((y0, k) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') c.set(i - k, y0 + j); })));
    },
    fastapi(c) {
      c.circle(8, 8, 7.4);
      [[9, 3, 2], [8, 4, 2], [7, 5, 2], [6, 6, 2], [5, 7, 6], [9, 8, 2], [8, 9, 2], [7, 10, 2], [6, 11, 2]].forEach(([x, y, w]) => c.rect(x, y, w, 1, 0));
    },
    tauri(c) {
      c.ring(6, 6.5, 4.8, 1.7); c.fill((x, y) => x > 7.5 && y > 7.5, 0);
      c.ring(10, 9.5, 4.8, 1.7);
      c.fill((x, y) => x < 8.5 && y < 8.5 && Math.hypot(x - 10, y - 9.5) <= 4.8 && Math.hypot(x - 10, y - 9.5) >= 3.1 && Math.hypot(x - 6, y - 6.5) > 3.1, 0);
      c.circle(6, 6.5, 1.3); c.circle(10, 9.5, 1.3);
    },
    postgres(c) {
      c.art([
        '...#########....',
        '..###########...',
        '.#############..',
        '.####.#########.',
        '.##############.',
        '.##############.',
        '..#############.',
        '..############..',
        '...#########....',
        '...###..####....',
        '...###...###....',
        '...###...###....',
        '..####...##.....',
        '..###....##.....',
        '.........#......',
        '................',
      ]);
    },
    redis(c) {
      [2, 6, 10].forEach((y) => { c.rect(3, y, 12, 1); c.rect(2, y + 1, 12, 1); c.rect(1, y + 2, 12, 1); });
      c.set(9, 3, 0); c.set(8, 2, 0); c.set(10, 2, 0);
    },
    supabase(c) {
      c.art([
        '..........##....',
        '.........###....',
        '........####....',
        '.......#####....',
        '......######....',
        '.....#######....',
        '....########....',
        '...#############',
        '#############...',
        '....########....',
        '....#######.....',
        '....######......',
        '....#####.......',
        '....####........',
        '....###.........',
        '....##..........',
      ]);
    },
    docker(c) {
      c.fill((x, y) => y >= 8 && y <= 13 && x >= 1 && x <= 14 - Math.max(0, y - 11) * 2 && !(y < 9 && x > 13));
      c.rect(13, 6, 2, 2); c.rect(14, 5, 1, 1);
      [[3, 6], [6, 6], [9, 6], [6, 3], [9, 3]].forEach(([x, y]) => c.rect(x, y, 2, 2));
      c.set(4, 10, 0);
    },
    aws(c) {
      c.text('AWS', 2, 2);
      c.fill((x, y) => x >= 1.5 && x <= 12.5 && Math.abs(y - (12.6 - 0.09 * (x - 7) ** 2)) <= 0.8);
      c.rect(11, 9, 3, 1); c.rect(13, 9, 1, 3);
    },
    vercel(c) { c.fill((x, y) => y >= 2 && y <= 14 && Math.abs(x - 8) <= (y - 2) * 0.6 + 0.4); },
    git(c) {
      c.fill((x, y) => Math.abs(x - 8) + Math.abs(y - 8) <= 7.4);
      c.line(5, 4, 11, 10, 0); c.line(8, 7, 8, 12, 0); c.circle(8, 12.3, 1.2, 0); c.circle(11, 10.3, 1.2, 0); c.circle(8, 7.3, 1.2, 0);
    },
    github(c) {
      c.circle(8, 8, 7.5);
      c.fill((x, y) => ((x - 8) / 4.2) ** 2 + ((y - 7.6) / 3.6) ** 2 <= 1, 0);
      c.fill((x, y) => y >= 3 && y <= 6 && ((x >= 4 && x <= 6 && y >= 9 - x) || (x >= 10 && x <= 12 && y >= x - 7)), 0);
      c.rect(6, 10, 4, 6, 0); c.line(3, 11, 5, 12, 0);
    },

    /* desktop */
    doc(c) {
      c.art([
        '..#########.....', '..#.......##....', '..#.......#.#...', '..#.......####..', '..#..........#..', '..#.######...#..',
        '..#..........#..', '..#.########.#..', '..#..........#..', '..#.########.#..', '..#..........#..', '..#.#####....#..',
        '..#..........#..', '..#..........#..', '..############..', '................',
      ]);
    },
    folder(c) {
      c.art([
        '................', '................', '.#####..........', '#.....#.........', '#......#######..', '#.............#.',
        '#.############.#', '#.#..........#.#', '#.#..........#.#', '#.#..........#.#', '#.#..........#.#', '#.#..........#.#',
        '#.############.#', '#..............#', '################', '................',
      ]);
    },
    mail(c) {
      c.art([
        '................', '................', '................', '################', '##............##', '#.#..........#.#',
        '#..#........#..#', '#...#......#...#', '#....#....#....#', '#.....####.....#', '#..............#', '#..............#',
        '################', '................', '................', '................',
      ]);
    },
    // ~/life's desktop
    mountain(c) {
      const big = (x, y) => y > 2 && Math.abs(x - 6.5) <= (y - 2) * 0.62, small = (x, y) => y > 6 && Math.abs(x - 12) <= (y - 6) * 0.62;
      c.fill((x, y) => y < 15 && (big(x, y) || small(x, y)));
      // snow above the line, outline below it
      c.fill((x, y) => y > 7.5 && y < 14 && (Math.abs(x - 6.5) <= (y - 2) * 0.62 - 1.3 || (y > 10.5 && Math.abs(x - 12) <= (y - 6) * 0.62 - 1.3)), 0);
      c.rect(0, 14, 16, 1);
    },
    paddle(c) {
      c.circle(6.5, 6.5, 5.6); [[5, 4], [8, 5], [4, 7], [7, 8]].forEach(([x, y]) => c.set(x, y, 0));
      for (let i = 0; i < 4; i++) c.rect(10 + i, 10 + i, 2, 2);
      c.circle(13.5, 3.5, 1.6);
    },
    flag(c) {
      c.rect(2, 1, 1, 15);
      c.fill((x, y) => x > 3 && x < 15 && y > 2 && y < 11 && (Math.floor((x - 3) / 2) + Math.floor((y - 2) / 2)) % 2 === 0);
      c.rect(3, 2, 12, 1); c.rect(3, 10, 12, 1); c.rect(14, 2, 1, 9);
    },
    gamepad(c) {
      c.fill((x, y) => y > 4 && y < 11 && x > 1 && x < 15);
      [[2, 4], [13, 4], [2, 10], [13, 10]].forEach(([x, y]) => c.set(x, y, 0));
      c.rect(2, 11, 4, 2); c.rect(10, 11, 4, 2);
      c.rect(3, 7, 3, 1, 0); c.rect(4, 6, 1, 3, 0);
      c.set(11, 6, 0); c.set(12, 8, 0); c.set(10, 8, 0);
    },
    record(c) {
      // vinyl, a label ring, the spindle hole and a glint off the grooves
      c.circle(8, 8, 7.5); c.ring(8, 8, 4.7, 1, 0); c.circle(8, 8, 1.2, 0); [[4, 6], [5, 5], [6, 4]].forEach(([x, y]) => c.set(x, y, 0));
    },
    trash(c) {
      c.art([
        '................', '......####......', '.##############.', '................', '..############..', '..#..#..#..#.#..',
        '..#..#..#..#.#..', '..#..#..#..#.#..', '..#..#..#..#.#..', '..#..#..#..#.#..', '..#..#..#..#.#..', '..#..#..#..#.#..',
        '..#..#..#..#.#..', '..############..', '................', '................',
      ]);
    },
    linkedin(c) {
      c.rect(1, 1, 14, 14); [[1, 1], [14, 1], [1, 14], [14, 14]].forEach(([x, y]) => c.set(x, y, 0));
      c.rect(3, 6, 2, 7, 0); c.rect(3, 3, 2, 2, 0);
      c.rect(7, 6, 2, 7, 0); c.rect(9, 6, 3, 2, 0); c.rect(11, 7, 2, 6, 0);
    },

    /* data + ai */
    pandas(c) { c.rect(3, 1, 2, 9); c.rect(3, 12, 2, 3); c.rect(7, 3, 2, 3); c.rect(7, 7, 2, 2); c.rect(7, 10, 2, 3); c.rect(11, 1, 2, 3); c.rect(11, 6, 2, 9); },
    numpy(c) {
      c.fill((x, y) => { const dx = Math.abs(x - 8); return dx <= 7 && y >= 1 + dx * 0.45 && y <= 15 - dx * 0.45; });
      c.line(8, 8, 8, 15, 0); c.line(1, 4, 8, 8, 0); c.line(15, 4, 8, 8, 0);
    },
    polars(c) { c.circle(8, 9, 6.2); c.circle(3.6, 4, 2.2); c.circle(12.4, 4, 2.2); c.set(6, 8, 0); c.set(10, 8, 0); c.rect(7, 11, 3, 1, 0); },
    duckdb(c) { c.circle(8, 8, 7.5); c.circle(6.6, 8, 3.4, 0); c.rect(10, 7, 4, 2, 0); },
    scikit(c) { c.circle(5.5, 10, 4.6); c.ring(11, 6, 5.9, 1.3, 0); c.circle(11, 6, 4.6); },
    pytorch(c) {
      c.ring(8, 9.5, 6.2, 2.1);
      c.fill((x, y) => y < 6.5 && x > 7, 0);
      c.line(6, 4, 9, 1); c.line(7, 4, 10, 1); c.line(7, 5, 10, 2);
      c.circle(11.6, 5.2, 1.2);
    },
    jupyter(c) {
      c.fill((x, y) => y < 7 && ((x - 8) / 6.8) ** 2 + ((y - 7) / 4.6) ** 2 <= 1 && ((x - 8) / 6.4) ** 2 + ((y - 7.6) / 3.6) ** 2 > 1);
      c.fill((x, y) => y > 9 && ((x - 8) / 6.8) ** 2 + ((y - 9) / 4.6) ** 2 <= 1 && ((x - 8) / 6.4) ** 2 + ((y - 8.4) / 3.6) ** 2 > 1);
      c.rect(12, 0, 2, 2); c.set(1, 2); c.rect(2, 14, 2, 2);
    },
    sqlite(c) {
      c.fill((x, y) => x >= 3 && x <= 13 && y >= 3 && y <= 13 && !(y < 4.4 && Math.abs(x - 8) > 3.6) && !(y > 11.6 && Math.abs(x - 8) > 3.6));
      c.rect(4, 6, 9, 1, 0); c.rect(4, 9, 9, 1, 0); c.rect(5, 4, 7, 1, 0);
    },
    openai(c) {
      c.art([
        '......####......',
        '....##....##....',
        '...#..####..#...',
        '..#.##....##.#..',
        '..##..#..#..##..',
        '.#.#...##...#.#.',
        '.#.#..#..#..#.#.',
        '.#..##....##..#.',
        '.#..##....##..#.',
        '.#.#..#..#..#.#.',
        '.#.#...##...#.#.',
        '..##..#..#..##..',
        '..#.##....##.#..',
        '...#..####..#...',
        '....##....##....',
        '......####......',
      ]);
    },
    claude(c) {
      // a hand-drawn starburst: uneven rays around a solid centre
      const rays = [7.4, 6, 7.2, 5.6, 7.4, 6.2, 7, 5.8, 7.3, 6, 6.8];
      c.fill((x, y) => {
        const dx = x - 8, dy = y - 8, d = Math.hypot(dx, dy);
        if (d < 2.4) return true;
        return rays.some((len, k) => {
          const a = (k / rays.length) * Math.PI * 2 + 0.2, along = dx * Math.cos(a) + dy * Math.sin(a);
          const across = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
          return along > 0 && along < len && across < 1.15 - along * 0.07;
        });
      });
    },
    huggingface(c) {
      c.circle(8, 8, 7.4);
      c.rect(4, 5, 2, 2, 0); c.rect(10, 5, 2, 2, 0);
      c.fill((x, y) => y > 8.5 && y < 12 && ((x - 8) / 4) ** 2 + ((y - 8.5) / 3.2) ** 2 <= 1, 0);
    },
    mcp(c) {
      c.ellipse(6, 6, 5.4, 2.8, Math.PI / 4, 0.42);
      c.ellipse(10, 10, 5.4, 2.8, Math.PI / 4, 0.42);
      c.ellipse(8, 8, 1.6, 1.6, 0, 1.1);
    },
  };

  function toPath(g, val = 1) {
    let d = '';
    g.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        if (row[x] !== val) { x++; continue; }
        let e = x;
        while (e + 1 < row.length && row[e + 1] === val) e++;
        d += `M${x} ${y}h${e - x + 1}v1h-${e - x + 1}z`;
        x = e + 1;
      }
    });
    return d;
  }

  const cache = {};
  window.pixelIcon = (name) => {
    if (!cache[name]) {
      const c = canvas();
      DRAW[name](c);
      cache[name] = `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path d="${toPath(c.g)}"/></svg>`;
    }
    return cache[name];
  };
  window.pixelIconNames = Object.keys(DRAW);

  // Experience logos, hand-pixelled from each company's own mark (Amazon's smile, PolicyCon's ring,
  // Tutoring Club's two students, Intellizence's brush-circle "i"). '.' is empty; other letters index the palette.
  const LOGOS = {
    amazon: {
      pal: { k: 'currentColor', o: '#ff9900' },
      rows: [
        '................', '................', '....######......', '...#......#.....', '..........#.....', '....#######.....',
        '...#......#.....', '...#......#.....', '...#.....##.....', '....#####.##....', '................',
        '.o...........o..', '..oo.......oo.o.', '....ooooooo...o.', '................', '................',
      ].map((r) => r.replace(/#/g, 'k')),
    },
    policycon: {
      pal: { r: '#d6262d', w: '#ffffff', k: '#38363b' },
      rows: [
        '.....rrrrrr.....', '...rrrrrrrrrr...', '..rrrrrrrrrrrr..', '.rrrrwwwwwwrrrr.', '.rrrwwkkkkwwrr..', 'rrrwwkkkkkkwwr..',
        'rrrwwkkkkkkww...', 'rrrwwkkkkkkww...', 'rrrwwkkkkkkww...', 'rrrwwkkkkkkwwr..', '.rrwwwkkkkwwrr..', '.rrwwwwwwwwrrrr.',
        '..rww.rrrrrrrr..', '...ww.rrrrrr....', '...ww...........', '................',
      ],
    },
    tutoringclub: {
      pal: { o: '#f26b3a', b: '#2f6db5' },
      rows: [
        '................', '........bbbbb...', '.......bbbbbbbo.', '.........bbb..o.', '.........bbbb...', '..oooo..bbbbbb..',
        '.oooooo.bbbbbb..', '.oooooo..bbbb...', '..oooo..........', '..........bbbb..', '.oooooo.bbbbbbb.', 'oooooooobbbbbbbb',
        'oooooooobbbbbbbb', 'oooooooo.bbbbbbb', 'oooooooo.bbbbbbb', '................',
      ],
    },
    intellizence: {
      pal: { b: '#2f8ff0', o: '#f26b2a' },
      rows: [
        '.....bbbbbb.....', '...bbbbbbbbbb...', '..bbb......bbb..', '.bbb...oo...bbb.', '.bb....oo....bb.', 'bbb...........bb',
        'bb....ooo.....bb', 'bb.....oo.....bb', 'bb.....oo.....bb', 'bb.....oo.....bb', '.bb....oo....bb.', '.bbb..oooo..bbb.',
        '..bbbb.....bbb..', '...bbbbbbbbbb...', '.....bbbbbb.....', '................',
      ],
    },
  };
  window.companyLogo = (name) => {
    const { pal, rows } = LOGOS[name];
    const paths = Object.entries(pal).map(([key, fill]) => {
      const g = rows.map((r) => [...r].map((c) => (c === key ? 1 : 0)));
      return `<path fill="${fill}" d="${toPath(g, 1)}"/>`;
    });
    return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${paths.join('')}</svg>`;
  };

  // the gator head: green, open jaw, white teeth, navy outline, orange mouth, and a light ring so it reads on any ground
  let uf = null;
  window.ufLogo = () => {
    if (uf) return uf;
    // the Gators oval, pixelated from the official mark: g green, b blue, m orange, w white
    const ART = [
      '..............................wwwww.....................................',
      '...................wwwwwwww.wwwbbbbww...................................',
      '.................wwbbbbbbbbwbbmmmmmbbwww................................',
      '................wbbmmmmmmmmbmmmmmmmmmbwwwwwwwww.........................',
      '...............wbmmmmmmmmmmmmmmwwwmmmmmmmbbbbbwwww............wwww......',
      '..............wwmmmmwbbbwwmmmwbbbbbwmmmmmmmmmmmbbbwww...wwwwwwbbbww.....',
      '..............wbmmmbbbgbbbbwwbbggggbwmmmmmmmmmmmmmmbbwwwbbbbbbbggbww....',
      '.............wwmmmbbgggggggbbbbbbgggbbbbbbbbmmmmmmmmmbbbbgggbbggggbw....',
      '...........wwbmmmwbgggggggggbggggbbbbbbbwbwbbbbbmmmwwbggggggggbggggbwww.',
      '.........wwbbmmmmmbgggbbbggggbggggggggggbbbbbbwwwwbbbggggggggggbbbggbbw.',
      '........wwbmmmmmmwbggggbbbggggbggggggggggggggggbgggbggggbbbbggggggggggbw',
      '.......wbbmmmmmwbbbggggbwwbgggggggggggggggggggggggbgggggbgggggggggggggbw',
      '......wbmmmmmmbbbbbbgggbwwbbbgbggggggggggggggggggggggggggggggggggggggbbw',
      '.....wbmmmmmbwbggbgggggbwwwwbbggggggggggggggggggggggggggggggggggggggbbw.',
      '....wbmmmmmbbbgggbggggggbbbbbggggggggggggggggggggggggggggggggbbbbbbbbbw.',
      '...wbmmmmbbbbbggbbggggggbbbggggggggggggggggggggggggggggggggbbwwbwwbwwbw.',
      '..wwbmmmbbbwbbbgbbggggggggggggggggggggggggggbbgggggggggggbbwwwwbwwbwwww.',
      '..wbmmmmbbwbbbbbggggggggggggggggggggggggggbbwbbbbbgggggbbbbwwwwbwbwwbw..',
      '.wwmmmmbbwbgggbgggggggggggggggggggggggggbbwwwbbwwbbbbbbwwbbwwwbwwbwbw...',
      '.wbmmmmbbwbggbgggggggggggggggggggggggggbbbwwwbbbwwwbbwwwwbbwwwbwbbbbww..',
      '.wbmmmbbbbbgbbggggggggbbbbgggggggggggbbwbbwwbbbbwwbbbwwwbbbwwbwbbbmmbw..',
      'wwmmmmbbbbbbbgggggggbbwwwbbbbggggggbbwwwbbwwbbbwwbbbbwwwbbwwbbbbbmmmbw..',
      'wbmmmmbbbbbbbggggggbbbwwbmmbwwbbbbwbbwwbmmbmmmmbbbbbbwwbbbbbbbbbbmmmmw..',
      'wbmmmmbbbbgbggggbggbmmbwbmmbwwbmwwwmmwbmbbmmmmmmmmbbbbbbbbbbbbbbbmmmmw..',
      'wbmmmmbbbggbgggbggbmmmmbbmmbbbmmwwbmmbmmbwbmmmmbbmmbbbbbbbbbbbbbbmmmmw..',
      'wbmmmmbbbggbgggbggbmmbbmmbmmmmmmbbbbmmmmwwwbmmmwwmmmmmbbbbbbbbbbbmmmmw..',
      'wwmmmmbbbggbgggbggbmmwwmbwbmmbmmmmbwbmbbbbwwmmbwwbmmmmbbbbbbbbbbbmmmbw..',
      '.wmmmmbbbbgbgggbggbmbwwbbwbmmwbmmmbwwbbggggbbbwwwbmmbbwwmmbwwwwbwmmmbw..',
      '.wbmmmmbwbbbgggbggbbbbbbbwwmmwwbmmbbbggggggggbbbwbmbbwwbbbwwwwwwwbmmbw..',
      '.wbmmmmbbwbbgggbbbbbgggggbwbbwwbmbbggggggggggggbbbbwwwwbbwwwbwbbbbbbw...',
      '..wbmmmmbbwbggggbbggggggggbbwwwbbgggggggggggggggggbbbbbbbbbbbbggggbbw...',
      '..wwmmmmbbbbbgggggggggggggggbbbggggggggggggggggggggggggggggggggggbbw....',
      '...wbmmmmbbwbgggggggggggggggggggggggggggggggggggggggggggggggggggbbww....',
      '....wbmmmmbbwbgggggggggggggggggggggggggggggggggbbbbgggggggggggbbwww.....',
      '.....wbmmmmbbwbgggggggggggggggggggbbbbbbbbbbbbggggbbbbbbbbwbbbwwww......',
      '......wbmmmmmbwbbgggggggggggggggbbbgggggggggggbggggggbwbbbmmmmmbw.......',
      '.......wbmmmmmbwbbbggggggggggbbbbbbbggggggggggbwwwwbwbbbmmmmmmbw........',
      '........wbmmmmmmbwbbbbggggbbbbgggggggbbbbbbbbwwbbbbbbbbmmmmmbww.........',
      '.........wwbmmmmmmmbbbbbbbbbggggggggbbwbbbbbbbbbbbbbmmmmmmmbww..........',
      '...........wwbmmmmmmmmbbbbwwwwbbbbwbwbbbbbbbbbbbbmmmmmmmmbww............',
      '............wwwbmmmmmmmmmmbbbbbbbbbbbbbbbbbbbmmmmmmmmmmbww..............',
      '..............wwwbbmmmmmmmmmmmmmmmmbbmmmmmmmmmmmmmmmbbwww...............',
      '................wwwwbbmmmmmmmmmmmmmmmmmmmmmmmmmmmbbwww..................',
      '...................wwwwbbbmmmmmmmmmmmmmmmmmmmbbbwwww....................',
      '......................wwwwwwbbbbbbbbbbbbbbwwwwww........................',
      '.............................wwwwwwwwwwwww..............................',
    ];
    const PAL = { b: '#003087', g: '#046a38', m: '#fa4616', w: '#ffffff' };
    // one rect per horizontal run of a colour keeps the svg small
    const path = (k) => ART.map((row, y) => {
      let d = '';
      for (let x = 0; x < row.length;) {
        if (row[x] !== k) { x++; continue; }
        let n = 1;
        while (row[x + n] === k) n++;
        d += `M${x} ${y}h${n}v1h-${n}z`;
        x += n;
      }
      return d;
    }).join('');
    uf = `<svg viewBox="0 0 72 46" shape-rendering="crispEdges" aria-hidden="true">` +
      Object.entries(PAL).map(([k, c]) => `<path fill="${c}" d="${path(k)}"/>`).join('') + '</svg>';
    return uf;
  };
})();

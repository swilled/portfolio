// ~/life: the trail, the summit log, the ladder to Denali, pickleball, the pit wall, lights out,
// a handheld for the games, and a crate of records with a turntable.
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (l) => l[(Math.random() * l.length) | 0];
  const isNight = () => root.dataset.theme !== 'light';
  const css = (v) => getComputedStyle(root).getPropertyValue(v).trim();
  document.querySelectorAll('.dicon[data-icon]').forEach((el) => { if (window.pixelIcon) el.insertAdjacentHTML('afterbegin', pixelIcon(el.dataset.icon)); });
  // same titlebar as home: the terminal reports its size
  const tty = document.getElementById('tty');
  const sizeTty = () => { if (tty) tty.textContent = `zsh · ${Math.floor(innerWidth / 8.4)}×${Math.floor(innerHeight / 19)}`; };
  sizeTty();
  addEventListener('resize', sizeTty);

  /* ---------- toast + confetti ---------- */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  const say = (html, ms = 3200) => {
    toastEl.innerHTML = html;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  };
  const confetti = (colors = ['#ffb547', '#ff6fa5', '#8fa8ff', '#c7a6f0', '#ede6f5']) => {
    if (reduced) return;
    const c = document.createElement('canvas');
    c.className = 'confetti';
    document.body.appendChild(c);
    const W = innerWidth, H = innerHeight;
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const bits = Array.from({ length: 160 }, () => ({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 900, vy: -300 - Math.random() * 700, s: 4 + ((Math.random() * 3) | 0) * 2, col: pick(colors) }));
    let last = performance.now(), age = 0;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; age += dt;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2.2) / 0.8);
      bits.forEach((b) => { b.vy += 1400 * dt; b.x += b.vx * dt; b.y += b.vy * dt; ctx.fillStyle = b.col; ctx.fillRect(Math.round(b.x / 2) * 2, Math.round(b.y / 2) * 2, b.s, b.s); });
      if (age < 3) requestAnimationFrame(tick); else c.remove();
    };
    requestAnimationFrame(tick);
  };
  // small pixel art -> svg string ('.' is empty, other letters index the palette)
  const artSvg = (rows, pal) => {
    let d = '';
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && pal[ch]) d += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[ch]}"/>`; }));
    return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${d}</svg>`;
  };

  /* ---------- night / day ---------- */
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const syncMeta = () => { if (themeMeta) themeMeta.content = isNight() ? '#0f0c16' : '#f7f3ea'; };
  syncMeta();
  const setTheme = (next) => {
    if (next === root.dataset.theme) return;
    const apply = () => { root.dataset.theme = next; syncMeta(); document.dispatchEvent(new Event('themechange')); };
    store.set('theme', next);
    if (!document.startViewTransition || reduced) { apply(); return; }
    root.classList.add('theming');
    document.startViewTransition(apply).finished.finally(() => root.classList.remove('theming'));
  };
  document.getElementById('theme').addEventListener('click', () => setTheme(isNight() ? 'light' : 'dark'));

  /* ---------- reveals + typed prompts ---------- */
  const typeIn = (el) => {
    if (el.dataset.typed) return;
    el.dataset.typed = '1';
    const text = el.textContent;
    if (reduced) { el.classList.add('done'); return; }
    el.textContent = '';
    let i = 0;
    const tick = () => { el.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(tick, 34 + Math.random() * 36); else setTimeout(() => el.classList.add('done'), 900); };
    setTimeout(tick, 120);
  };
  typeIn(document.querySelector('.life-hero .typed'));
  const pending = new Set(document.querySelectorAll('.reveal'));
  const show = (el) => { if (!pending.delete(el)) return; el.classList.add('in'); el.querySelectorAll('.typed').forEach(typeIn); };
  const sweep = () => pending.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight - 40) show(el); });
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && show(e.target)), { threshold: 0.12 });
  pending.forEach((el) => io.observe(el));
  addEventListener('scroll', () => setTimeout(sweep, 100), { passive: true });
  sweep();
  // below-the-fold drawing waits until it's about to scroll into view, so the page is ready sooner
  const whenNear = (el, fn) => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const o = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { o.disconnect(); fn(); } }, { rootMargin: '600px 0px' });
    o.observe(el);
  };

  /* ---------- section icons ---------- */
  const ICONS = {
    alpine: [['......a.....', '.....aaa....', '....aswsa...', '...asssssa..', '..aassssssa.', '.aaa.sssssa.', 'aaaa..sssssa', 'aaaaa..sssss'], { a: '#8fa8ff', s: '#ffb547', w: '#ffffff' }],
    court: [['..pppp......', '.pppppp.....', '.pppppp.....', '.pppppp.....', '..pppp......', '....h.......', '.....h...bb.', '......h..bb.'], { p: '#ffb547', h: '#c9c0d9', b: '#e6f04a' }],
    track: [['kwkwkwkw....', 'wkwkwkwk....', 'kwkwkwkw....', 'wkwkwkwk....', 'k...........', 'k...........', 'k...........', 'k...........'], { k: '#ede6f5', w: '#3a3150' }],
    games: [['............', '.gggggggggg.', 'gg.ggggg.ggg', 'g...ggg.r.gg', 'gg.gggg...gg', 'gggggggg.ggg', '.gg......gg.', '............'], { g: '#c7a6f0', r: '#ff6fa5' }],
    music: [['.cccccccccc.', 'cwwwwwwwwwwc', 'cw.r.ww.r.wc', 'cwwwwwwwwwwc', 'ccc.cccc.ccc', 'cccccccccccc', '............', '............'], { c: '#ff6fa5', w: '#ede6f5', r: '#3a3150' }],
  };
  document.querySelectorAll('.dirs a[data-icon]').forEach((a) => a.insertAdjacentHTML('afterbegin', artSvg(...ICONS[a.dataset.icon])));

  /* ---------- the avatar, dressed for the mountains ---------- */
  const PALETTE = {
    o: '#07050c', h0: '#5a4840', h1: '#2a1f1a', h2: '#1c1411', h3: '#0f0b09', s0: '#b67f55', s1: '#966240', s2: '#7a4b2f', s3: '#5c3720',
    // gorpcore: a teal shell, stone tech pants, grey trail runners with an orange flash
    t0: '#6fc2ae', t1: '#3f8f80', t2: '#2e6f63', t3: '#1f4f47', p0: '#c2b48f', p1: '#9a8b6c', p2: '#7c6f54', p3: '#5c523e', f0: '#d8d4cc', f1: '#a8a49c', f2: '#ff7a3d', f3: '#3a3632',
  };
  const svg = document.getElementById('avatar');
  const bubble = document.getElementById('bubble');
  const poses = {};
  if (svg && typeof sprite === 'function') {
    const NS = 'http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox', '0 0 28 75');
    const layer = (cells) => {
      const g = document.createElementNS(NS, 'g');
      cells.forEach(([x, y, col, w = 1, h = 1]) => { const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h); r.setAttribute('fill', col); g.appendChild(r); });
      return g;
    };
    // ice axe behind the left hand
    svg.appendChild(layer([[5, 30, '#9aa1ad', 1, 30], [1, 29, '#c8ccd4', 8, 2], [0, 30, '#c8ccd4', 2, 1], [5, 60, '#6b717c', 1, 2], [4, 29, '#07050c', 1, 1]]));
    // the shell has full-length sleeves and a zipped funnel neck; hands and face stay out
    const gorp = (g, up) => {
      const sleeve = (x, y) => { const c = g[y] && g[y][x]; if (c && c[0] === 's') g[y][x] = 't' + c[1]; };
      for (let y = 17; y <= 41; y++) [5, 6, 7, 8].forEach((x) => sleeve(x, y));
      if (up) { for (let y = 7; y <= 19; y++) [23, 24, 25, 26].forEach((x) => sleeve(x, y)); }
      else for (let y = 17; y <= 41; y++) [19, 20, 21, 22].forEach((x) => sleeve(x, y));
      for (let y = 15; y <= 18; y++) for (let x = 11; x <= 16; x++) if (y <= 16 || (x >= 12 && x <= 15)) g[y][x] = 't' + (x < 13 ? 1 : x < 15 ? 2 : 3);
      return reoutline(g);
    };
    for (const [name, up] of [['stand', false], ['wave', true]]) {
      const g = document.createElementNS(NS, 'g');
      for (const [key, d] of Object.entries(toPaths(gorp(sprite(up), up), 1, 0, 0))) {
        if (!d || !PALETTE[key]) continue;
        const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', PALETTE[key]); g.appendChild(p);
      }
      svg.appendChild(g);
      poses[name] = g;
    }
    // shell zip, chest pocket, and a sling bag across the body
    const strap = [];
    for (let k = 0; k <= 10; k++) strap.push([9 + k, 18 + Math.round(k * 1.4), '#1c1922', 1, 1]);
    svg.appendChild(layer([[13, 15, '#1f4f47', 1, 23], [16, 21, '#1f4f47', 3, 1], ...strap, [15, 31, '#2b2730', 5, 5], [15, 31, '#3d3843', 5, 1], [17, 33, '#ff7a3d', 1, 1]]));
    // climbing helmet over the hair
    svg.appendChild(layer([[9, 0, '#f26b1d', 10, 1], [8, 1, '#f26b1d', 12, 1], [7, 2, '#f26b1d', 14, 3], [6, 5, '#c4541a', 16, 1], [10, 1, '#ff9b5c', 2, 1], [9, 2, '#ff9b5c', 1, 1], [7, 6, '#1c1411', 1, 4], [20, 6, '#1c1411', 1, 4]]));
  }
  const pose = (n) => Object.entries(poses).forEach(([k, g]) => { g.style.display = k === n ? '' : 'none'; });
  pose('stand');
  let bubbleT = null, waveT = null;
  const speak = (text, ms = 2200) => { if (!bubble) return; bubble.textContent = text; bubble.classList.add('show'); clearTimeout(bubbleT); bubbleT = setTimeout(() => bubble.classList.remove('show'), ms); };
  const wave = (n = 3, text) => {
    if (text) speak(text);
    clearInterval(waveT);
    let k = n * 2; pose('wave');
    if (reduced) return;
    waveT = setInterval(() => { k -= 1; pose(k % 2 ? 'stand' : 'wave'); if (k <= 0) { clearInterval(waveT); pose('stand'); } }, 300);
  };
  setTimeout(() => wave(3, 'on belay?'), 700);
  if (svg) svg.addEventListener('click', () => wave(2, pick(['belay on.', 'climbing!', 'rope!', 'off belay.', 'slack, please', 'take!'])));

  /* ---------- the trail: an elevation profile across the page; you hike it as you scroll ---------- */
  const trail = document.getElementById('trail');
  const STOPS = [['alpine', 0.14], ['court', 0.33], ['track', 0.52], ['games', 0.71], ['music', 0.9]];
  const drawTrail = () => {
    if (!trail) return;
    const r = trail.getBoundingClientRect(), P = 4, W = Math.ceil(r.width / P), H = 24;
    trail.width = W; trail.height = H;
    const ctx = trail.getContext('2d');
    const ridge = (x) => Math.round(15 - 5 * Math.sin(x / W * Math.PI * 3.2 + 0.6) - 3 * Math.sin(x / W * Math.PI * 9) - 2 * Math.sin(x * 0.3));
    const col = { far: isNight() ? '#1c1628' : '#e2dac8', near: isNight() ? '#2a2140' : '#cfc5af', line: css('--amber'), flag: css('--pink'), dim: css('--dim') };
    ctx.clearRect(0, 0, W, H);
    for (let x = 0; x < W; x++) { const y = ridge(x); ctx.fillStyle = col.near; ctx.fillRect(x, y, 1, H - y); }
    for (let x = 0; x < W; x += 2) { ctx.fillStyle = col.line; ctx.fillRect(x, ridge(x) - 1, 1, 1); }
    STOPS.forEach(([id, f]) => { const x = Math.round(f * W), y = ridge(x); ctx.fillStyle = col.dim; ctx.fillRect(x, y - 7, 1, 7); ctx.fillStyle = col.flag; ctx.fillRect(x + 1, y - 7, 3, 2); });
    // the hiker, placed by how far down the page you are
    const max = document.documentElement.scrollHeight - innerHeight, p = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    const hx = Math.round(4 + p * (W - 8)), hy = ridge(hx);
    ctx.fillStyle = '#1c1411'; ctx.fillRect(hx, hy - 6, 2, 1);
    ctx.fillStyle = '#966240'; ctx.fillRect(hx, hy - 5, 2, 1);
    ctx.fillStyle = isNight() ? '#ede6f5' : '#1c1922'; ctx.fillRect(hx, hy - 4, 2, 2);
    ctx.fillStyle = '#463866'; ctx.fillRect(hx, hy - 2, 1, 2); ctx.fillRect(hx + 1 + (Math.floor(scrollY / 40) % 2), hy - 2, 1, 2);
    ctx.fillStyle = '#f26b1d'; ctx.fillRect(hx - 1, hy - 4, 1, 3); // pack
    trail.dataset.w = W;
  };
  if (trail) {
    drawTrail();
    addEventListener('resize', drawTrail);
    let q = false;
    addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(() => { q = false; drawTrail(); }); } }, { passive: true });
    document.addEventListener('themechange', drawTrail);
    // each flag is a link to its section; the trail between them isn't
    const flagAt = (e) => {
      const r = trail.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
      const stop = STOPS.reduce((a, b) => (Math.abs(b[1] - f) < Math.abs(a[1] - f) ? b : a));
      return Math.abs(stop[1] - f) * r.width < 16 ? stop : null;
    };
    trail.addEventListener('click', (e) => {
      const stop = flagAt(e);
      if (stop) document.getElementById(stop[0]).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
    trail.addEventListener('pointermove', (e) => trail.classList.toggle('hot', !!flagAt(e)));
    trail.addEventListener('pointerleave', () => trail.classList.remove('hot'));
  }

  /* ---------- the summit log ---------- */
  const ENTRIES = [
    { id: 'jungfrau', name: 'Jungfrau', elev: '4,158 m', ft: 13642, tag: 'summit', place: 'Bernese Alps, Switzerland', meta: 'normal route from the Jungfraujoch · PD · ~850 m of gain',
      note: 'The highest of the Eiger, Mönch and Jungfrau. The route crosses the Jungfraufirn to the Rottalsattel, then a steep snow and ice traverse onto an airy rock ridge to the top.' },
    { id: 'siyeh', name: 'Mount Siyeh', elev: '10,014 ft', ft: 10014, tag: 'summit', place: 'Glacier National Park, Montana · 2026', meta: 'fifth-highest peak in the park',
      note: 'From Cracker Lake its north face is one of the biggest walls in the Rockies: about 4,000 feet of banded rock straight down into turquoise glacial water.' },
    { id: 'brown', name: 'Mount Brown', elev: '8,565 ft', ft: 8565, tag: 'summit', place: 'Glacier National Park, Montana · 2026', meta: '~4,300 ft of gain from Lake McDonald',
      note: 'Straight up from Lake McDonald, through the silver snags of the 2017 Sprague Fire and past the old fire lookout on the false summit.' },
    { id: 'altyn', name: 'Altyn Peak', elev: '7,947 ft', ft: 7947, tag: 'summit', place: 'Many Glacier, Glacier National Park · 2026', meta: 'class 2 scramble · 3,000+ ft in about two miles',
      note: 'Red argillite right above Swiftcurrent Lake and the Many Glacier Hotel. Late summer is berry season, which means bears share the slope.' },
    { id: 'adams', name: 'Mount Adams', elev: '12,281 ft', ft: 12281, tag: 'turned back', place: 'South Cascades, Washington', meta: 'car-to-car attempt · South Spur · ~6,700 ft of gain',
      note: 'One push from the car, up past Lunch Counter toward Piker\'s Peak. The mountain won this one. It\'s on the list to finish.' },
    { id: 'skyline', name: 'Skyline Loop', elev: '5.5 mi', ft: 0, tag: 'hiked', place: 'Paradise, Mount Rainier National Park', meta: '~1,700 ft of gain · up to Panorama Point',
      note: 'Wildflower meadows under the Nisqually Glacier. A good look at the mountain I want to stand on next summer.' },
  ];
  const HITS = {
    train: () => say('the Jungfrau Railway has climbed through the Eiger since 1912.'),
    goat: () => say(pick(['a mountain goat. it climbs better than me.', 'meh.', 'goats: undefeated on scree.'])),
    lake: () => { const n = 2 + ((Math.random() * 6) | 0); say(`skipped a stone: <b>${n} skips</b>. ${n > 5 ? 'personal best.' : 'the colored ones skip worse.'}`); },
    bear: () => say('berry season. give it a lot of room.'),
    car: () => say('car to car. the car won this round.'),
    lunch: () => say('Lunch Counter, ~9,400 ft. most people camp here.'),
    marmot: () => say('<b>eeep!</b> a marmot.'),
  };
  const stage = document.getElementById('stage');
  const cap = document.getElementById('stage-cap');
  const entriesEl = document.getElementById('entries');
  let scene = null;
  if (stage && window.Alpine) scene = Alpine.mount(stage, (id) => { if (id && HITS[id]) HITS[id](); });
  const select = (id) => {
    const e = ENTRIES.find((x) => x.id === id);
    if (!e || !scene) return;
    scene.show(id);
    entriesEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === id)));
    cap.innerHTML = `<p class="peak-name">${e.name}</p><p class="peak-elev">${e.elev}</p><p class="peak-meta">${e.place} · ${e.meta}</p><p class="peak-note">${e.note}</p>`;
  };
  // the list ships in the html so nothing jumps on load; build any entry it's missing
  ENTRIES.forEach((e) => {
    let btn = entriesEl.querySelector(`button[data-id="${e.id}"]`);
    if (!btn) {
      const li = document.createElement('li');
      const cls = e.tag === 'summit' ? '' : e.tag === 'hiked' ? ' hike' : ' tried';
      li.setAttribute('role', 'presentation');
      li.innerHTML = `<button type="button" role="tab" data-id="${e.id}"><b>${e.name}</b><span class="tag${cls}">${e.tag}</span><small>${e.elev} · ${e.place.split(',')[0]}</small></button>`;
      entriesEl.appendChild(li);
      btn = li.firstChild;
    }
    btn.addEventListener('click', () => select(e.id));
  });
  select('siyeh');

  /* ---------- the ladder: every peak to scale, Denali on the horizon ---------- */
  const LADDER = [
    { name: 'Altyn', ft: 7947, x: 22, shape: 'peak', st: 'done', id: 'altyn' },
    { name: 'Brown', ft: 8565, x: 54, shape: 'peak', st: 'done', id: 'brown' },
    { name: 'Siyeh', ft: 10014, x: 88, shape: 'peak', st: 'done', id: 'siyeh' },
    { name: 'Baker', ft: 10781, x: 126, shape: 'dome', st: 'next' },
    { name: 'Adams', ft: 12281, x: 166, shape: 'dome', st: 'tried', id: 'adams' },
    { name: 'Jungfrau', ft: 13642, x: 202, shape: 'peak', st: 'done', id: 'jungfrau' },
    { name: 'Rainier', ft: 14411, x: 246, shape: 'dome', st: 'next' },
    { name: 'Denali', ft: 20310, x: 284, shape: 'massif', st: 'someday' },
  ];
  const ladder = document.getElementById('ladder');
  const ladderLabels = document.getElementById('ladder-labels');
  let climberOn = 'Jungfrau';
  const drawLadder = () => {
    if (!ladder) return;
    const W = 320, H = 120, base = 112, k = 92 / 20310;
    ladder.width = W; ladder.height = H;
    const ctx = ladder.getContext('2d');
    const P = { done: css('--amber'), tried: css('--pink'), next: css('--blue'), some: css('--mute'), snow: isNight() ? '#ede6f5' : '#ffffff', ground: css('--line'), ink: css('--text') };
    ctx.clearRect(0, 0, W, H);
    // half-width at height fraction t (0 = summit, 1 = base) for each kind of mountain
    const halfAt = (pk, t, h) => {
      if (pk.shape === 'dome') return h * 0.46 * Math.sqrt(1 - (1 - t) ** 1.7);
      if (pk.shape === 'massif') return h * 0.36 * t + (t > 0.15 ? 3 : 0);
      return h * 0.42 * t;
    };
    [...LADDER].sort((a, b) => b.ft - a.ft).forEach((pk) => {
      const h = Math.round(pk.ft * k);
      let prev = 0;
      for (let y = 0; y <= h; y++) {
        const t = y / h, w = Math.round(halfAt(pk, t, h)), yy = base - h + y;
        if (pk.st === 'done' || pk.st === 'tried') {
          for (let x = -w; x <= w; x++) {
            const col = pk.st === 'done' ? (t < 0.22 ? P.snow : P.done) : ((x + yy) % 3 === 0 || Math.abs(x) >= w - 1 ? P.tried : null);
            if (col) { ctx.fillStyle = col; ctx.fillRect(pk.x + x, yy, 1, 1); }
          }
        } else {
          // dotted outline: walk both edges, filling across the steps so the line never breaks
          const col = pk.st === 'next' ? P.next : P.some;
          for (let x = Math.min(prev, w); x <= Math.max(prev, w); x++) {
            if ((x + yy) % 2 === 0) { ctx.fillStyle = col; ctx.fillRect(pk.x - x, yy, 1, 1); ctx.fillRect(pk.x + x, yy, 1, 1); }
          }
        }
        prev = w;
      }
    });
    ctx.fillStyle = P.ground; ctx.fillRect(0, base + 1, W, 3);
    // the climber stands on the highest summit so far (or wherever the konami code sends him)
    const at = LADDER.find((p) => p.name === climberOn), hy = base - Math.round(at.ft * k);
    [['#1c1411', 0], ['#966240', 1], [P.ink, 2], [P.ink, 3], ['#463866', 4], ['#463866', 5]].forEach(([c, j]) => { ctx.fillStyle = c; ctx.fillRect(at.x, hy - 7 + j, 2, 1); });
    ctx.fillStyle = '#f26b1d'; ctx.fillRect(at.x, hy - 7, 2, 1);
    ctx.fillStyle = P.tried; ctx.fillRect(at.x + 3, hy - 9, 1, 6); ctx.fillRect(at.x + 4, hy - 9, 3, 2);
  };
  if (ladder) {
    LADDER.forEach((pk) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.left = (pk.x / 320 * 100) + '%';
      b.style.top = ((112 - Math.round(pk.ft * 92 / 20310) - 22) / 120 * 100) + '%';
      b.innerHTML = `<b>${pk.name}</b>${pk.ft.toLocaleString('en-US')} ft`;
      b.addEventListener('click', () => {
        if (pk.id) { select(pk.id); document.getElementById('alpine').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
        else if (pk.st === 'someday') say('Denali, 20,310 ft. <b>not yet.</b> ask me in a few years.');
        else say(`${pk.name}: next summer.`);
      });
      ladderLabels.appendChild(b);
    });
    whenNear(ladder, () => { drawLadder(); document.addEventListener('themechange', drawLadder); });
  }

  // next season's goals, each with its own scene
  document.querySelectorAll('.goal canvas[data-scene]').forEach((c) => whenNear(c, () => { if (window.Alpine) Alpine.mount(c, () => say(pick(['training starts now.', 'one step at a time.', 'weather permitting.']))).show(c.dataset.scene); }));
  const countEl = document.getElementById('season-count');
  if (countEl) {
    const days = Math.ceil((new Date('2027-06-15T00:00:00') - new Date()) / 864e5);
    countEl.textContent = days > 0 ? `${days} days to go` : 'it\'s go time';
  }

  /* ---------- court: a pickleball rally against pranav, with the kitchen rule ---------- */
  const court = document.getElementById('court-canvas');
  const courtScore = document.getElementById('court-score');
  let rally = null;
  const courtDraw = (g) => {
    const W = 240, H = 120, ctx = court.getContext('2d');
    const P = isNight()
      ? { out: '#1f2740', surf: '#2a3d6b', kit: '#33497a', line: '#d9dcef', net: '#ede6f5', you: '#ffb547', ai: '#ff6fa5', ball: '#e6f04a' }
      : { out: '#c9d3e6', surf: '#3a69b0', kit: '#4a7bc4', line: '#ffffff', net: '#1c1922', you: '#c4351d', ai: '#1c1922', ball: '#e6f04a' };
    ctx.fillStyle = P.out; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = P.surf; ctx.fillRect(10, 10, W - 20, H - 20);
    ctx.fillStyle = P.kit; ctx.fillRect(W / 2 - 32, 10, 64, H - 20);
    ctx.fillStyle = P.line;
    ctx.fillRect(10, 10, W - 20, 1); ctx.fillRect(10, H - 11, W - 20, 1); ctx.fillRect(10, 10, 1, H - 20); ctx.fillRect(W - 11, 10, 1, H - 20);
    ctx.fillRect(W / 2 - 32, 10, 1, H - 20); ctx.fillRect(W / 2 + 32, 10, 1, H - 20);
    ctx.fillRect(10, H / 2, W / 2 - 42, 1); ctx.fillRect(W / 2 + 33, H / 2, W / 2 - 43, 1);
    ctx.fillStyle = P.net; for (let y = 6; y < H - 6; y += 3) ctx.fillRect(W / 2, y, 1, 2);
    if (!g) return;
    ctx.fillStyle = P.ai; ctx.fillRect(Math.round(g.ax) - 1, Math.round(g.ay) - 7, 3, 14);
    ctx.fillStyle = P.you; ctx.fillRect(Math.round(g.px) - 1, Math.round(g.py) - 7, 3, 14);
    ctx.fillStyle = P.ball; ctx.fillRect(Math.round(g.bx) - 1, Math.round(g.by) - 1, 3, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(Math.round(g.bx) - 1, Math.round(g.by) + 3, 3, 1);
  };
  if (court) {
    court.width = 240; court.height = 120;
    courtDraw(null);
    document.addEventListener('themechange', () => courtDraw(rally));
    const KIT = 32, WIN = 7;
    const start = () => {
      if (rally) return;
      const g = { px: 210, py: 60, ax: 30, ay: 60, bx: 120, by: 60, vx: 0, vy: 0, you: 0, ai: 0, wait: 0.8, keys: {}, rallyLen: 0 };
      rally = g;
      const serve = (dir) => { g.bx = 120; g.by = 30 + Math.random() * 60; const a = (Math.random() - 0.5) * 0.7; g.vx = Math.cos(a) * 95 * dir; g.vy = Math.sin(a) * 95; g.wait = 0.7; g.rallyLen = 0; };
      serve(Math.random() < 0.5 ? 1 : -1);
      const toCourt = (e) => { const r = court.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 240, ((e.clientY - r.top) / r.height) * 120]; };
      const move = (e) => { const [x, y] = toCourt(e); g.px = clamp(x, 124, 236); g.py = clamp(y, 12, 108); };
      court.addEventListener('pointermove', move);
      const keys = (e) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { g.keys[e.key] = e.type === 'keydown'; e.preventDefault(); } if (e.key === 'Escape') end(); };
      addEventListener('keydown', keys); addEventListener('keyup', keys);
      const point = (who, why) => {
        if (who === 'you') g.you++; else g.ai++;
        courtScore.textContent = `you ${g.you} · pranav ${g.ai}${why ? ` · ${why}` : ''}`;
        if (why) say(why === 'kitchen!' ? '<b>kitchen violation.</b> no volleys inside the non-volley zone.' : why);
        if (g.you >= WIN || g.ai >= WIN) {
          const won = g.you > g.ai;
          courtScore.textContent = `${won ? 'you win' : 'pranav wins'} ${Math.max(g.you, g.ai)}–${Math.min(g.you, g.ai)}. ${won ? 'he wants a rematch.' : 'run it back?'}`;
          if (won) confetti(['#e6f04a', '#ffb547', '#8fa8ff']);
          end();
          return;
        }
        serve(who === 'you' ? -1 : 1);
      };
      const end = () => {
        rally = null;
        court.removeEventListener('pointermove', move);
        removeEventListener('keydown', keys); removeEventListener('keyup', keys);
        document.getElementById('court-start').textContent = 'play again';
      };
      courtScore.textContent = 'you 0 · pranav 0';
      let last = performance.now();
      const frame = (now) => {
        if (rally !== g) { courtDraw(null); return; }
        const dt = Math.min(0.033, (now - last) / 1000); last = now;
        if (g.keys.ArrowUp) g.py = clamp(g.py - 90 * dt, 12, 108);
        if (g.keys.ArrowDown) g.py = clamp(g.py + 90 * dt, 12, 108);
        if (g.keys.ArrowLeft) g.px = clamp(g.px - 90 * dt, 124, 236);
        if (g.keys.ArrowRight) g.px = clamp(g.px + 90 * dt, 124, 236);
        // pranav: tracks the ball, stays behind his kitchen line (mostly)
        g.ay += clamp(g.by - g.ay, -70 * dt, 70 * dt);
        const want = g.vx < 0 && g.bx < 110 ? clamp(g.bx - 18, 16, 86) : 40;
        g.ax += clamp(want - g.ax, -50 * dt, 50 * dt);
        if (g.wait > 0) g.wait -= dt;
        else {
          g.bx += g.vx * dt; g.by += g.vy * dt;
          if (g.by < 12 || g.by > 108) { g.vy *= -1; g.by = clamp(g.by, 12, 108); }
          const hit = (x, y, dir) => {
            const off = clamp((g.by - y) / 8, -1, 1), sp = Math.min(190, Math.hypot(g.vx, g.vy) * 1.05);
            g.vx = Math.cos(off * 0.8) * sp * dir; g.vy = Math.sin(off * 0.8) * sp; g.rallyLen++;
            if (g.rallyLen === 12) say('12-shot rally. <b>dinking masterclass.</b>');
          };
          if (g.vx > 0 && Math.abs(g.bx - g.px) < 3 && Math.abs(g.by - g.py) < 9) {
            if (g.px < 120 + KIT) { point('ai', 'kitchen!'); requestAnimationFrame(frame); courtDraw(g); return; }
            hit(g.px, g.py, -1);
          }
          if (g.vx < 0 && Math.abs(g.bx - g.ax) < 3 && Math.abs(g.by - g.ay) < 9) hit(g.ax, g.ay, 1);
          if (g.bx < 2) point('you', g.rallyLen > 6 ? 'long rally, good point' : '');
          else if (g.bx > 238) point('ai', '');
        }
        courtDraw(g);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    document.getElementById('court-start').addEventListener('click', start);
  }

  // the trophy shelf
  const TROPHY = [['.gggggg.', 'gggggggg', 'g.gggg.g', 'g.gggg.g', '.gggggg.', '..gggg..', '...gg...', '...gg...', '..gggg..', '.bbbbbb.', '.bwwwwb.', '.bbbbbb.'], { g: '#e8b23a', b: '#5a4632', w: '#d9c7a0' }];
  document.querySelectorAll('.trophy').forEach((t) => { t.innerHTML = artSvg(...TROPHY); });

  /* ---------- track: live from the pit wall (Jolpica's open F1 data) ---------- */
  const F1 = 'https://api.jolpi.ca/ergast/f1';
  const pwStats = document.getElementById('pw-stats'), pwNext = document.getElementById('pw-next');
  const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  // if the feed is down: the last standings this browser saw, then the copy saved at deploy (tools/snapshot.py), dated
  const f1Live = Promise.all([getJSON(`${F1}/current/driverStandings.json`), getJSON(`${F1}/current/next.json`).catch(() => null), getJSON(`${F1}/2025/driverStandings.json`).catch(() => null)])
    .then((v) => { store.set('f1-last', JSON.stringify({ at: new Date().toISOString().slice(0, 10), v })); return { v }; });
  const f1Saved = () => {
    try { const c = JSON.parse(store.get('f1-last')); if (c && c.v) return { v: c.v, asOf: c.at }; } catch (e) { /* bad copy */ }
    return getJSON('../assets/snapshot.json').then((s) => ({ v: [s.f1.cur, s.f1.next, s.f1.prev], asOf: s.taken }));
  };
  f1Live.catch(f1Saved)
    .then(({ v: [cur, next, prev], asOf }) => {
      const list = cur.MRData.StandingsTable.StandingsLists[0];
      const me = list.DriverStandings.find((d) => d.Driver.code === 'NOR');
      const champ = prev && prev.MRData.StandingsTable.StandingsLists[0].DriverStandings[0].Driver.code === 'NOR';
      pwStats.innerHTML = `<div><dt>${list.season} position</dt><dd class="papaya">P${me.position}</dd></div><div><dt>points</dt><dd>${me.points}</dd></div>` +
        `<div><dt>wins this year</dt><dd>${me.wins}</dd></div><div><dt>after round</dt><dd>${list.round}</dd></div>` +
        (champ ? '<div style="grid-column:1/-1"><dt>2025</dt><dd class="papaya">world champion</dd></div>' : '');
      const race = next && next.MRData.RaceTable.Races[0];
      if (asOf) {
        // a saved copy can't count down honestly, so it just says how old it is
        const day = new Date(asOf + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
        pwNext.textContent = `the timing feed is down. standings as of ${day}.`;
      } else if (race) {
        const when = new Date(`${race.date}T${race.time || '12:00:00Z'}`);
        const tick = () => {
          const ms = when - new Date();
          if (ms <= 0) { pwNext.innerHTML = `<b>${race.raceName}</b> is on now.`; return; }
          const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
          pwNext.innerHTML = `next: <b>${race.raceName}</b> in ${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };
        tick(); setInterval(tick, 1000);
      }
    })
    .catch(() => { pwStats.innerHTML = '<div><dt>pit wall</dt><dd>no signal</dd></div>'; pwNext.textContent = 'the timing feed is down. try again later.'; });

  /* ---------- lights out: five reds, then go ---------- */
  const lightsBox = document.getElementById('lights'), gantry = document.querySelectorAll('#gantry i'), msg = document.getElementById('lights-msg');
  const bestEl = document.getElementById('lights-best'), startBtn = document.getElementById('lights-start'), launch = document.getElementById('launch');
  let best = +(store.get('lights-best') || 0), lstate = 'idle', goAt = 0, ltimers = [];
  const showBest = () => { bestEl.textContent = best ? `best ${(best / 1000).toFixed(3)}s · F1 drivers hover around 0.200s` : 'F1 drivers hover around 0.200s'; };
  showBest();
  const CAR = [['......oo........', '....oooooo..bb..', '.ooooooookkooooo', 'oooooooooooooooo', '.kk........kk...'], { o: '#ff8000', k: '#1c1922', b: '#4a8cff' }];
  const drawLaunch = (x, speed = 0) => {
    const W = 200, H = 30, ctx = launch.getContext('2d');
    launch.width = W; launch.height = H;
    ctx.fillStyle = isNight() ? '#141118' : '#e7e0d2'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = isNight() ? '#2a2638' : '#b9b0a0'; ctx.fillRect(0, 22, W, 8);
    for (let i = 0; i < W; i += 8) { ctx.fillStyle = (i / 8) % 2 ? '#c4351d' : '#ffffff'; ctx.fillRect(i, 22, 8, 1); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(18, 22, 1, 8);
    if (speed) for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(255,128,0,0.5)'; ctx.fillRect(Math.round(x) - 6 - i * 5, 15 + (i % 3) * 2, 4, 1); }
    CAR[0].forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') { ctx.fillStyle = CAR[1][ch]; ctx.fillRect(Math.round(x) + i, 17 + j, 1, 1); } }));
  };
  if (launch) drawLaunch(4);
  document.addEventListener('themechange', () => launch && drawLaunch(4));
  const resetLights = () => { ltimers.forEach(clearTimeout); ltimers = []; gantry.forEach((g) => g.classList.remove('on')); };
  const startLights = () => {
    resetLights();
    lstate = 'arming';
    msg.textContent = 'wait for it…';
    drawLaunch(4);
    gantry.forEach((g, i) => ltimers.push(setTimeout(() => g.classList.add('on'), 600 + i * 900)));
    ltimers.push(setTimeout(() => { gantry.forEach((g) => g.classList.remove('on')); goAt = performance.now(); lstate = 'go'; }, 600 + 4 * 900 + 700 + Math.random() * 2300));
  };
  const react = () => {
    if (lstate === 'arming') { resetLights(); lstate = 'idle'; msg.innerHTML = '<b>jump start!</b> drive-through penalty. press start to try again.'; return; }
    if (lstate !== 'go') return;
    const ms = performance.now() - goAt;
    lstate = 'idle';
    const isBest = !best || ms < best;
    if (isBest) { best = Math.round(ms); store.set('lights-best', String(best)); }
    showBest();
    msg.innerHTML = `<b>${(ms / 1000).toFixed(3)}s</b> ${ms < 200 ? 'that\'s pole position stuff.' : ms < 300 ? 'clean getaway.' : ms < 450 ? 'bogged down a little.' : 'you\'ve been passed by the whole grid.'}${isBest ? ' new best.' : ''}`;
    if (!reduced) {
      let x = 4, v = 0;
      const run = () => { v += 0.6; x += v; drawLaunch(x, v); if (x < 210) requestAnimationFrame(run); else drawLaunch(4); };
      requestAnimationFrame(run);
    }
  };
  if (startBtn) startBtn.addEventListener('click', (e) => { e.stopPropagation(); startLights(); });
  if (lightsBox) lightsBox.addEventListener('pointerdown', (e) => { if (e.target !== startBtn) react(); });
  addEventListener('keydown', (e) => { if (e.code === 'Space' && (lstate === 'arming' || lstate === 'go') && e.target.tagName !== 'INPUT') { e.preventDefault(); react(); } });

  /* ---------- games: a handheld that plays whichever cartridge you put in ---------- */
  const GW = 320, GH = 120;
  const fill = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const disc = (ctx, c, x, y, r) => { ctx.fillStyle = c; for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); ctx.fillRect(Math.round(x - w), Math.round(y + dy), w * 2, 1); } };
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, f) => { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * f)).join(',')})`; };
  const label = (ctx, c, str, x, y, size = 9, align = 'left') => { ctx.fillStyle = c; ctx.font = `700 ${size}px "JetBrains Mono", monospace`; ctx.textAlign = align; ctx.fillText(str, x, y); ctx.textAlign = 'left'; };
  const rnd = (a, b) => a + Math.random() * (b - a);

  // minecraft: a hillside, a house going up block by block, a day/night cycle, and a creeper after dark
  const MC_BLOCK = {
    grass: ['#8a5a33', (ctx, x, y, f) => { fill(ctx, f('#5aa83c'), x, y, 8, 3); fill(ctx, f('#4a9030'), x + 2, y + 3, 2, 1); fill(ctx, f('#4a9030'), x + 6, y + 3, 1, 2); fill(ctx, f('#6e4526'), x + 4, y + 6, 2, 1); }],
    dirt: ['#8a5a33', (ctx, x, y, f) => { fill(ctx, f('#6e4526'), x + 1, y + 2, 2, 2); fill(ctx, f('#6e4526'), x + 5, y + 5, 2, 1); }],
    stone: ['#7d7d7d', (ctx, x, y, f) => { fill(ctx, f('#686868'), x + 1, y + 1, 3, 1); fill(ctx, f('#686868'), x + 4, y + 5, 3, 1); fill(ctx, f('#929292'), x + 5, y + 2, 1, 1); }],
    cobble: ['#8a8a8a', (ctx, x, y, f) => { fill(ctx, f('#646464'), x, y + 3, 8, 1); fill(ctx, f('#646464'), x + 4, y, 1, 3); fill(ctx, f('#646464'), x + 2, y + 4, 1, 4); fill(ctx, f('#a6a6a6'), x + 5, y + 5, 2, 1); }],
    plank: ['#b08850', (ctx, x, y, f) => { fill(ctx, f('#8a6a3c'), x, y + 3, 8, 1); fill(ctx, f('#8a6a3c'), x, y + 7, 8, 1); fill(ctx, f('#8a6a3c'), x + 5, y, 1, 3); }],
    log: ['#6b4a2e', (ctx, x, y, f) => { fill(ctx, f('#4f361f'), x + 2, y, 1, 8); fill(ctx, f('#4f361f'), x + 5, y, 1, 8); }],
    roof: ['#4a3420', (ctx, x, y, f) => { fill(ctx, f('#3a2818'), x, y + 4, 8, 1); fill(ctx, f('#5e4430'), x + 1, y + 1, 3, 1); }],
    glass: ['#bfe6f5', (ctx, x, y, f) => { fill(ctx, f('#e8f7ff'), x, y, 8, 1); fill(ctx, f('#e8f7ff'), x, y, 1, 8); fill(ctx, f('#ffffff'), x + 2, y + 2, 1, 2); }],
    door: ['#7a5230', (ctx, x, y, f) => { fill(ctx, f('#5e3e22'), x + 1, y + 1, 6, 6); fill(ctx, f('#c9a24a'), x + 5, y + 4, 1, 1); }],
    leaves: ['#3f8a2e', (ctx, x, y, f) => { fill(ctx, f('#2f6a22'), x + 1, y + 1, 2, 2); fill(ctx, f('#2f6a22'), x + 5, y + 4, 2, 2); fill(ctx, f('#57a843'), x + 4, y + 1, 1, 1); }],
  };
  const block = (ctx, x, y, type, f) => { const [base, deco] = MC_BLOCK[type]; fill(ctx, f(base), x, y, 8, 8); deco(ctx, x, y, f); };
  // fortnite: the battle bus, everyone dropping in, and the storm closing
  const FN = {
    init: () => ({ busT: 0, divers: [], storm: 0, alive: 100, win: 0, told: false }),
    gy: (x) => 90 + Math.round(Math.sin(x * 0.035) * 5 + Math.sin(x * 0.11) * 2) + Math.max(0, 34 - Math.min(x - 8, GW - 8 - x)),
    step(s, dt) {
      s.busT += dt;
      const bus = -50 + s.busT * 42;
      if (bus > GW + 60) s.busT = -4;
      if (bus > 24 && bus < GW - 24 && Math.random() < dt * 3 && !s.win) s.divers.push({ x: bus, y: 26, vy: 30, open: false, you: false, land: 0 });
      s.divers.forEach((d) => {
        if (d.land) { d.land += dt; return; }
        if (!d.open && d.y > 52) d.open = true;
        d.vy = d.open ? 14 : Math.min(d.vy + 60 * dt, 60);
        d.y += d.vy * dt; if (d.open && !d.you) d.x += 5 * dt;
        if (d.y >= FN.gy(d.x) - 5) { d.y = FN.gy(d.x) - 5; d.land = 0.001; }
      });
      s.divers = s.divers.filter((d) => d.land < 3);
      if (s.win) { s.win -= dt; if (s.win <= 0) { s.win = 0; s.storm = 0; s.alive = 100; } return; }
      s.storm += dt / 45;
      s.alive = Math.max(1, Math.round(100 - 99 * Math.pow(Math.min(s.storm, 1), 1.4)));
      if (s.storm >= 1) s.win = 3.5;
    },
    draw(ctx, s, t) {
      ['#3d8ee6', '#4b98ea', '#5aa2ee', '#69acf1', '#78b6f3', '#87c0f5'].forEach((c, i) => fill(ctx, c, 0, i * 16, GW, 16));
      fill(ctx, '#87c0f5', 0, 96, GW, GH - 96);
      for (let i = 0; i < 3; i++) { const x = ((i * 140 + t * 4) % (GW + 60)) - 50; fill(ctx, '#ffffff', x, 44 + i * 9, 36, 5); fill(ctx, '#ffffff', x + 6, 41 + i * 9, 16, 3); }
      fill(ctx, '#2f7fd8', 0, 100, GW, GH - 100);
      for (let x = (t * 8) % 12 - 12; x < GW; x += 12) fill(ctx, '#5aa2ee', x, 104 + ((x / 12) % 2 ? 4 : 0), 5, 1);
      for (let x = 8; x < GW - 8; x++) { const y = FN.gy(x); if (y >= 102) continue; fill(ctx, '#3f8f36', x, y, 1, 104 - y); fill(ctx, '#7ad85e', x, y, 1, 2); fill(ctx, '#8a5a33', x, Math.max(y + 6, 98), 1, 6); }
      [[46, 'tree'], [70, 'house'], [122, 'tree'], [150, 'tree'], [208, 'tower'], [262, 'tree']].forEach(([x, k]) => {
        const y = FN.gy(x);
        if (k === 'tree') { fill(ctx, '#6b4a2e', x, y - 6, 2, 6); fill(ctx, '#2f7a28', x - 3, y - 12, 8, 7); fill(ctx, '#4aa23e', x - 2, y - 12, 4, 2); }
        if (k === 'house') { fill(ctx, '#e6d8b8', x - 7, y - 10, 14, 10); fill(ctx, '#c4351d', x - 9, y - 13, 18, 3); fill(ctx, '#5e3e22', x - 2, y - 6, 4, 6); fill(ctx, '#bfe6f5', x + 3, y - 8, 3, 3); }
        if (k === 'tower') { fill(ctx, '#9a9a9a', x - 4, y - 22, 8, 22); fill(ctx, '#7a7a7a', x - 4, y - 22, 8, 2); fill(ctx, '#bfe6f5', x - 2, y - 18, 4, 3); fill(ctx, '#bfe6f5', x - 2, y - 11, 4, 3); }
      });
      // the storm
      const k = Math.min(s.storm, 1), half = (GW / 2 + 24) * (1 - k * 0.86), L = Math.round(170 - half), R = Math.round(170 + half);
      ctx.fillStyle = 'rgba(122, 60, 255, 0.42)'; ctx.fillRect(0, 0, Math.max(0, L), GH); ctx.fillRect(R, 0, GW - R, GH);
      for (let y = 0; y < GH; y += 4) { const j = ((y / 4) % 3) - 1; fill(ctx, '#c79bff', L + j, y, 1, 4); fill(ctx, '#c79bff', R - j, y, 1, 4); }
      // the bus
      const bx = Math.round(-50 + s.busT * 42), by = 18;
      if (bx > -40 && bx < GW + 40) {
        fill(ctx, '#5ad0ff', bx - 8, by - 15, 16, 8); fill(ctx, '#a8e6ff', bx - 6, by - 14, 4, 2); fill(ctx, '#ffffff', bx - 6, by - 7, 1, 7); fill(ctx, '#ffffff', bx + 5, by - 7, 1, 7);
        fill(ctx, '#2a6fdb', bx - 12, by, 24, 8); fill(ctx, '#ffe04a', bx - 12, by, 24, 1);
        for (let i = 0; i < 4; i++) fill(ctx, '#d8f1ff', bx - 10 + i * 6, by + 2, 3, 3);
        fill(ctx, '#1c1922', bx - 9, by + 7, 3, 2); fill(ctx, '#1c1922', bx + 6, by + 7, 3, 2);
      }
      s.divers.forEach((d) => {
        const x = Math.round(d.x), y = Math.round(d.y), body = d.you ? '#ffb547' : '#1c1922';
        if (d.open && !d.land) { fill(ctx, d.you ? '#ffb547' : '#ff6fa5', x - 4, y - 7, 9, 2); fill(ctx, '#ffffff', x - 3, y - 5, 1, 2); fill(ctx, '#ffffff', x + 3, y - 5, 1, 2); }
        fill(ctx, body, x - 1, y - 3, 3, 5);
        if (d.you) fill(ctx, '#ffffff', x, y - 5, 1, 1);
      });
      label(ctx, '#0b0a0f', `${s.alive} left`, 9, 13); label(ctx, '#ffffff', `${s.alive} left`, 8, 12);
      if (s.win) { label(ctx, '#0b0a0f', '#1 VICTORY ROYALE', 161, 63, 14, 'center'); label(ctx, '#ffe04a', '#1 VICTORY ROYALE', 160, 62, 14, 'center'); }
    },
    down(s, x) { s.divers.push({ x, y: 2, vy: 30, open: false, you: true, land: 0 }); if (!s.told) { s.told = true; say('where we dropping?'); } },
  };

  // rocket league: two cars, one ball, a lot of boost
  const RL = {
    F: 104, r: 7,
    kick(s) { s.ball = { x: 160, y: 50, vx: rnd(-20, 20), vy: 0 }; s.cars = [{ x: 60, y: RL.F, vx: 0, vy: 0, top: 118 }, { x: 260, y: RL.F, vx: 0, vy: 0, top: 86 }]; s.cool = [0, 0]; },
    init() { const s = { score: [0, 0], goal: 0, fx: [], chat: null, clock: 300 }; RL.kick(s); return s; },
    scored(s, team) {
      s.score[team]++; s.goal = 1.8;
      const gx = team ? 8 : GW - 8;
      for (let i = 0; i < 46; i++) s.fx.push({ x: gx, y: 84, vx: rnd(-100, 100), vy: rnd(-150, -20), life: rnd(0.5, 1.3), c: pick(team ? ['#ff8a3d', '#ffe04a', '#ffffff'] : ['#4a8cff', '#8fd4ff', '#ffffff']) });
    },
    step(s, dt) {
      s.fx = s.fx.filter((p) => (p.life -= dt) > 0); s.fx.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt; });
      if (s.chat && (s.chat.life -= dt) <= 0) s.chat = null;
      if (s.goal) { s.goal -= dt; if (s.goal <= 0) { s.goal = 0; RL.kick(s); } return; }
      s.clock -= dt; if (s.clock <= 0) { s.clock = 300; s.score = [0, 0]; }
      const b = s.ball, F = RL.F, r = RL.r;
      b.vy += 240 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 1 - 0.25 * dt;
      if (b.y > F - r) { b.y = F - r; b.vy *= -0.62; b.vx *= 0.96; if (Math.abs(b.vy) < 12) b.vy = 0; }
      if (b.y < 8 + r) { b.y = 8 + r; b.vy = Math.abs(b.vy) * 0.6; }
      const mouth = b.y > 70;
      if (b.x < 14 + r && !mouth) { b.x = 14 + r; b.vx = Math.abs(b.vx) * 0.7; }
      if (b.x > GW - 14 - r && !mouth) { b.x = GW - 14 - r; b.vx = -Math.abs(b.vx) * 0.7; }
      if (b.x < 6) return RL.scored(s, 1);
      if (b.x > GW - 6) return RL.scored(s, 0);
      s.cars.forEach((c, i) => {
        const dir = i ? -1 : 1, target = i ? Math.max(b.x + 14, 170) : b.x - 14;
        s.cool[i] -= dt;
        c.vx += clamp((target - c.x) * 6, -320, 320) * dt; c.vx *= 1 - 1.5 * dt; c.vx = clamp(c.vx, -c.top, c.top);
        c.boost = Math.abs(c.vx) > c.top * 0.8;
        if (c.y >= F && Math.abs(b.x - c.x) < 26 && b.y < F - 22 && b.vy > -20) c.vy = -150;
        c.vy += 300 * dt; c.y += c.vy * dt; if (c.y > F) { c.y = F; c.vy = 0; }
        c.x = clamp(c.x + c.vx * dt, 22, GW - 22);
        const dx = b.x - c.x, dy = b.y - (c.y - 4);
        if (Math.hypot(dx, dy) < r + 9 && s.cool[i] <= 0) {
          if (i === 1 && b.x > 230 && b.vx > 60) s.chat = { text: 'What a save!', life: 1.6, car: 1 };
          b.vx = dir * rnd(90, 170) * (i ? 0.6 : 1) + c.vx * 0.5 + dx * 3; b.vy = -rnd(60, 170) + Math.min(0, c.vy) * 0.6;
          s.cool[i] = 0.25;
        }
      });
    },
    draw(ctx, s, t) {
      const F = RL.F, b = s.ball;
      fill(ctx, '#0d1030', 0, 0, GW, GH);
      for (let y = 4; y < 40; y += 4) for (let x = (y % 8 ? 3 : 0); x < GW; x += 6) fill(ctx, (x * 7 + y * 13 + Math.floor(t * 3)) % 23 < 2 ? '#ffe9a8' : y < 20 ? '#232857' : '#2c3268', x, y, 2, 2);
      fill(ctx, '#171d48', 0, 42, GW, F - 42); fill(ctx, '#4a8cff', 0, 42, GW / 2, 1); fill(ctx, '#ff8a3d', GW / 2, 42, GW / 2, 1);
      for (let x = 0; x < GW; x += 32) fill(ctx, (x / 32) % 2 ? '#2a8040' : '#2f8f46', x, F, 32, GH - F);
      fill(ctx, '#d8e0e8', 159, F, 2, GH - F);
      [[0, '#4a8cff'], [GW - 14, '#ff8a3d']].forEach(([x, c]) => {
        fill(ctx, c, x, 68, 14, 2);
        for (let y = 72; y < F; y += 4) for (let k = 0; k < 14; k += 4) fill(ctx, c, x + k + (y % 8 ? 2 : 0), y, 1, 1);
        fill(ctx, c, x === 0 ? 13 : GW - 14, 68, 1, F - 68);
      });
      fill(ctx, 'rgba(0,0,0,0.35)', b.x - 6, F, 12, 2);
      disc(ctx, '#8e94a3', b.x, b.y, RL.r); disc(ctx, '#c9ced8', b.x - 1, b.y - 1, RL.r - 1); fill(ctx, '#ffffff', b.x - 4, b.y - 4, 2, 2); fill(ctx, '#8e94a3', b.x - 1, b.y - 6, 2, 12);
      s.cars.forEach((c, i) => {
        const col = i ? ['#ff8a3d', '#c4561a'] : ['#2f6fdb', '#1d4aa0'], face = (i ? -1 : 1) * (Math.abs(c.vx) > 8 ? Math.sign(c.vx) * (i ? -1 : 1) : 1), x = Math.round(c.x), y = Math.round(c.y);
        if (c.boost) for (let k = 0; k < 3; k++) fill(ctx, k ? '#ffb547' : '#ffffff', x - face * (11 + k * 3) - 1, y - 6 + (Math.floor(t * 20 + k) % 2), 3, 2);
        fill(ctx, col[0], x - 9, y - 7, 18, 4); fill(ctx, col[1], x - 9, y - 4, 18, 1); fill(ctx, col[1], x - 4 - face, y - 10, 8, 3); fill(ctx, '#bfe6f5', x + (face > 0 ? 0 : -3), y - 9, 3, 2);
        fill(ctx, '#111111', x - 7, y - 3, 4, 3); fill(ctx, '#111111', x + 3, y - 3, 4, 3);
      });
      s.fx.forEach((p) => fill(ctx, p.c, p.x, p.y, 2, 2));
      fill(ctx, 'rgba(0,0,0,0.65)', 116, 2, 88, 13);
      const m = Math.floor(s.clock / 60), sec = String(Math.floor(s.clock % 60)).padStart(2, '0');
      label(ctx, '#4a8cff', String(s.score[0]), 124, 12, 10); label(ctx, '#ede6f5', `${m}:${sec}`, 160, 12, 9, 'center'); label(ctx, '#ff8a3d', String(s.score[1]), 196, 12, 10, 'right');
      if (s.goal) { label(ctx, '#0b0a0f', 'GOAL!', 161, 67, 20, 'center'); label(ctx, '#ffffff', 'GOAL!', 160, 66, 20, 'center'); }
      if (s.chat) {
        const c = s.cars[s.chat.car], w = s.chat.text.length * 5 + 8, x = clamp(Math.round(c.x - w / 2), 2, GW - w - 2);
        fill(ctx, 'rgba(0,0,0,0.75)', x, c.y - 26, w, 11); label(ctx, '#ffffff', s.chat.text, x + 4, c.y - 18, 8);
      }
    },
    down(s) {
      const c = s.cars[0];
      if (c.y >= RL.F) c.vy = -170;
      c.vx += 70;
      s.chat = { text: pick(['What a save!', 'Nice shot!', 'Calculated.', 'Wow!', 'Thanks!', 'What a play!', 'Close one!', '$#@%!']), life: 1.6, car: 0 };
    },
  };

  // rhythia: notes fly at a 3x3 grid on the beat; the cursor hits them (autoplay, until you take the mouse)
  const RY = {
    A: 0.85, cx: 160, cy: 60, P: 28,
    cell: (i) => [RY.cx + ((i % 3) - 1) * RY.P, RY.cy + (((i / 3) | 0) - 1) * RY.P],
    init: () => ({ notes: [], next: 0.6, cur: [160, 60], trail: [], ptr: null, ptrT: -9, combo: 0, hits: 0, total: 0, fx: [], beat: 0, last: 4 }),
    step(s, dt, t) {
      s.beat = Math.max(0, s.beat - dt * 3);
      while (s.next < t + RY.A) {
        let c; do { c = (Math.random() * 9) | 0; } while (c === s.last);
        s.last = c; s.notes.push({ c, at: s.next, col: pick(['#ff6fa5', '#8fa8ff', '#ffb547', '#7dffc4']) });
        s.next += pick([0.38, 0.38, 0.19, 0.57]);
      }
      const human = s.ptr && t - s.ptrT < 2;
      if (human) s.cur = s.ptr.slice();
      else if (s.notes[0]) { const [x, y] = RY.cell(s.notes[0].c), k = 1 - Math.exp(-dt * 16); s.cur[0] += (x - s.cur[0]) * k; s.cur[1] += (y - s.cur[1]) * k; }
      s.human = human;
      s.trail.unshift(s.cur.slice()); s.trail.length = Math.min(s.trail.length, 6);
      while (s.notes.length && s.notes[0].at <= t) {
        const n = s.notes.shift(), [x, y] = RY.cell(n.c), hit = Math.abs(s.cur[0] - x) <= 14 && Math.abs(s.cur[1] - y) <= 14;
        s.total++;
        if (hit) { s.hits++; s.combo++; s.beat = 1; } else s.combo = 0;
        s.fx.push({ x, y, hit, col: n.col, life: 0.35 });
      }
      s.fx = s.fx.filter((f) => (f.life -= dt) > 0);
    },
    draw(ctx, s, t) {
      fill(ctx, mix('#07060c', '#1c1534', s.beat * 0.7), 0, 0, GW, GH);
      const g = RY.P * 1.5;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { for (let k = 0; k < 1; k += 0.08) fill(ctx, '#2a2440', RY.cx + sx * g * (1 + k * 3), RY.cy + sy * g * (1 + k * 1.2), 1, 1); });
      ctx.strokeStyle = '#3a3150'; ctx.lineWidth = 1; ctx.strokeRect(RY.cx - g - 0.5, RY.cy - g - 0.5, g * 2 + 1, g * 2 + 1);
      for (let i = s.notes.length - 1; i >= 0; i--) {
        const n = s.notes[i], z = (n.at - t) / RY.A;
        if (z > 1) continue;
        const k = 1 / (1 + 3 * z), [x, y] = RY.cell(n.c), nx = RY.cx + (x - RY.cx) * k, ny = RY.cy + (y - RY.cy) * k, sz = Math.max(3, Math.round(24 * k));
        ctx.globalAlpha = Math.min(1, (1 - z) * 2.2);
        ctx.strokeStyle = n.col; ctx.lineWidth = 2; ctx.strokeRect(Math.round(nx - sz / 2) + 1, Math.round(ny - sz / 2) + 1, sz - 2, sz - 2);
        ctx.globalAlpha = 1;
      }
      s.fx.forEach((f) => {
        if (f.hit) { const e = Math.round((0.35 - f.life) * 30); ctx.globalAlpha = f.life / 0.35; ctx.strokeStyle = f.col; ctx.lineWidth = 1; ctx.strokeRect(f.x - 12 - e + 0.5, f.y - 12 - e + 0.5, 24 + e * 2, 24 + e * 2); ctx.globalAlpha = 1; }
        else for (let k = -3; k <= 3; k++) { fill(ctx, '#ff4d6d', f.x + k, f.y + k, 1, 1); fill(ctx, '#ff4d6d', f.x + k, f.y - k, 1, 1); }
      });
      s.trail.forEach((p, i) => { if (i) fill(ctx, `rgba(255,255,255,${0.45 - i * 0.07})`, p[0] - 2, p[1] - 2, 4, 4); });
      fill(ctx, '#ffffff', s.cur[0] - 2, s.cur[1] - 2, 4, 4);
      label(ctx, '#ede6f5', `${s.combo}x`, 8, 14, 11);
      label(ctx, '#ede6f5', `${s.total ? ((s.hits / s.total) * 100).toFixed(1) : '100.0'}%`, GW - 8, 14, 11, 'right');
      label(ctx, s.human ? '#ffb547' : '#6f6880', s.human ? 'you' : 'autoplay', 8, GH - 7, 8);
    },
    move(s, x, y, t) { s.ptr = [x, y]; s.ptrT = t; },
    down(s, x, y, t) { s.ptr = [x, y]; s.ptrT = t; },
    leave(s) { s.ptr = null; },
  };

  // geometry dash: one cube, one button, a lot of spikes (autoplay until you click)
  const GD = {
    G: 96, X: 70, V: 105, L: 2600,
    init() { const s = { x: 0, y: 86, vy: 0, ang: 0, air: false, obs: [], att: 1, manual: false, lastIn: -9, hold: false, dead: 0, done: 0, bits: [] }; GD.level(s); return s; },
    level(s) { s.obs = []; let p = 240; while (p < GD.L - 120) { const n = pick([1, 1, 2, 3]); s.obs.push({ p, n }); p += n * 9 + rnd(70, 140); } },
    reset(s) { s.x = 0; s.y = GD.G - 10; s.vy = 0; s.ang = 0; s.air = false; },
    die(s) { s.dead = 0.7; for (let i = 0; i < 18; i++) s.bits.push({ x: GD.X + 5, y: s.y + 5, vx: rnd(-90, 90), vy: rnd(-130, 20), life: 0.7 }); },
    step(s, dt, t) {
      s.bits = s.bits.filter((b) => (b.life -= dt) > 0); s.bits.forEach((b) => { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 220 * dt; });
      if (s.dead) { s.dead -= dt; if (s.dead <= 0) { s.dead = 0; s.att++; GD.reset(s); } return; }
      if (s.done) { s.done -= dt; if (s.done <= 0) { s.done = 0; s.att = 1; GD.level(s); GD.reset(s); } return; }
      if (s.manual && !s.hold && t - s.lastIn > 6) s.manual = false;
      s.x += GD.V * dt;
      if (s.x >= GD.L) { s.done = 2.5; return; }
      let want = s.manual && s.hold;
      if (!s.manual) {
        const o = s.obs.find((q) => q.p + q.n * 9 - s.x > GD.X);
        if (o) { const d = o.p - s.x - (GD.X + 10); if (d <= (55 - (o.n * 9 + 10)) / 2 && d > -4) want = true; }
      }
      if (want && !s.air) { s.vy = -235; s.air = true; }
      if (s.air) {
        s.vy += 900 * dt; s.y += s.vy * dt; s.ang += 400 * dt;
        if (s.y >= GD.G - 10) { s.y = GD.G - 10; s.vy = 0; s.air = false; s.ang = Math.round(s.ang / 90) * 90; }
      }
      for (const o of s.obs) {
        const sx = o.p - s.x;
        if (sx > GD.X + 12 || sx + o.n * 9 < GD.X - 2) continue;
        for (let k = 0; k < o.n; k++) { const a = sx + k * 9; if (GD.X + 10 > a + 2 && GD.X < a + 7 && s.y + 10 > GD.G - 6) return GD.die(s); }
      }
    },
    draw(ctx, s, t) {
      const hue = Math.round(220 + Math.sin(t * 0.2) * 60);
      ctx.fillStyle = `hsl(${hue}, 62%, 24%)`; ctx.fillRect(0, 0, GW, GH);
      ctx.strokeStyle = `hsl(${hue}, 62%, 32%)`; ctx.lineWidth = 1;
      for (let i = 0; i < 9; i++) { const x = (((i * 53 - s.x * 0.25) % (GW + 40)) + GW + 40) % (GW + 40) - 20; ctx.strokeRect(Math.round(x) + 0.5, 8 + ((i * 29) % 60) + 0.5, 14, 14); }
      ctx.fillStyle = `hsl(${hue}, 62%, 15%)`; ctx.fillRect(0, GD.G, GW, GH - GD.G);
      fill(ctx, '#ffffff', 0, GD.G, GW, 1);
      for (let x = -((s.x) % 24); x < GW; x += 24) fill(ctx, `hsl(${hue}, 62%, 22%)`, x, GD.G + 1, 1, GH - GD.G);
      label(ctx, 'rgba(255,255,255,0.75)', `attempt ${s.att}`, 120 - s.x, 50, 12);
      for (const o of s.obs) {
        const sx = Math.round(o.p - s.x);
        if (sx > GW || sx + o.n * 9 < 0) continue;
        for (let k = 0; k < o.n; k++) for (let r = 0; r < 9; r++) {
          const w = 1 + 2 * Math.floor(r / 2), x0 = sx + k * 9 + 4 - Math.floor(w / 2);
          fill(ctx, '#0b0a0f', x0, GD.G - 9 + r, w, 1); fill(ctx, '#ffffff', x0, GD.G - 9 + r, 1, 1); fill(ctx, '#ffffff', x0 + w - 1, GD.G - 9 + r, 1, 1);
        }
      }
      if (!s.dead) {
        for (let k = 1; k <= 3; k++) fill(ctx, `rgba(255,224,74,${0.35 - k * 0.1})`, GD.X - k * 5, s.y + 3, 3, 3);
        ctx.save(); ctx.translate(GD.X + 5, Math.round(s.y) + 5); ctx.rotate((Math.round(s.ang / 15) * 15 * Math.PI) / 180);
        fill(ctx, '#1c1922', -5, -5, 10, 10); fill(ctx, '#ffe04a', -4, -4, 8, 8); fill(ctx, '#7dffc4', -3, -3, 6, 6); fill(ctx, '#ffe04a', -2, -2, 4, 4);
        fill(ctx, '#1c1922', -3, -2, 2, 2); fill(ctx, '#1c1922', 1, -2, 2, 2); fill(ctx, '#1c1922', -3, 2, 6, 1);
        ctx.restore();
      }
      s.bits.forEach((b) => fill(ctx, '#ffe04a', b.x, b.y, 2, 2));
      const p = Math.min(1, s.x / GD.L);
      fill(ctx, 'rgba(255,255,255,0.18)', 100, 6, 120, 4); fill(ctx, '#7dffc4', 100, 6, Math.round(120 * p), 4);
      label(ctx, '#ffffff', `${Math.floor(p * 100)}%`, 226, 11, 8);
      label(ctx, s.manual ? '#ffb547' : 'rgba(255,255,255,0.45)', s.manual ? 'you' : 'autoplay', 8, GH - 7, 8);
      if (s.done) { label(ctx, '#0b0a0f', 'LEVEL COMPLETE!', 161, 55, 14, 'center'); label(ctx, '#7dffc4', 'LEVEL COMPLETE!', 160, 54, 14, 'center'); }
    },
    down(s, x, y, t) { s.manual = true; s.lastIn = t; s.hold = true; },
    up(s) { s.hold = false; },
    key(s, type, t) { if (type === 'keydown') { s.manual = true; s.lastIn = t; s.hold = true; } else s.hold = false; },
  };

  // brawl stars: a 3v3 on a little top-down map, bushes and all; tap to move your brawler
  const BS = {
    map: null,
    build() {
      const m = Array.from({ length: 15 }, () => Array(40).fill('.'));
      const put = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { m[j][i] = c; m[j][39 - i] = c; } };
      put(8, 2, 2, 3, 'w'); put(8, 10, 2, 3, 'w'); put(16, 6, 1, 3, 'w'); put(13, 0, 1, 2, 'w'); put(13, 13, 1, 2, 'w');
      put(4, 6, 2, 3, 'b'); put(11, 5, 3, 5, 'b'); put(17, 1, 4, 2, 'b'); put(17, 12, 4, 2, 'b');
      return m;
    },
    tile(x, y) { const i = Math.floor(x / 8), j = Math.floor(y / 8); return i < 0 || j < 0 || i >= 40 || j >= 15 ? 'w' : BS.map[j][i]; },
    spawn: (team, k) => ({ x: team ? 300 : 20, y: 28 + k * 32, team, hp: 6, cool: rnd(0, 1), dead: 0, goal: null }),
    init(told = false) {
      BS.map = BS.map || BS.build();
      const bs = [];
      for (let k = 0; k < 3; k++) bs.push(BS.spawn(0, k), BS.spawn(1, k));
      bs[0].you = true;
      return { bs, shots: [], score: [0, 0], clock: 120, over: 0, told };
    },
    step(s, dt) {
      if (s.over) { s.over -= dt; if (s.over <= 0) Object.assign(s, BS.init(s.told)); return; }
      s.clock -= dt; if (s.clock <= 0) { s.clock = 0; s.over = 3; return; }
      s.bs.forEach((b, idx) => {
        if (b.dead) { b.dead -= dt; if (b.dead <= 0) Object.assign(b, BS.spawn(b.team, idx >> 1), { order: null }); return; }
        if (b.you && b.order) b.goal = b.order;
        if (!b.goal) b.goal = [rnd(40, 280), rnd(10, 110)];
        const [gx, gy] = b.goal, d = Math.hypot(gx - b.x, gy - b.y);
        if (d < 3) { b.goal = null; b.order = null; }
        else {
          const sp = 32 * dt, nx = b.x + ((gx - b.x) / d) * sp, ny = b.y + ((gy - b.y) / d) * sp;
          const okX = BS.tile(nx, b.y) !== 'w', okY = BS.tile(b.x, ny) !== 'w';
          if (okX) b.x = nx; if (okY) b.y = ny;
          if (!okX && !okY) { b.goal = null; b.order = null; }
        }
        b.cool -= dt;
        let best = null, bd = 70;
        s.bs.forEach((o) => { if (o.team === b.team || o.dead) return; const dd = Math.hypot(o.x - b.x, o.y - b.y); if (!(BS.tile(o.x, o.y) === 'b' && dd > 18) && dd < bd) { best = o; bd = dd; } });
        if (best && b.cool <= 0) {
          b.cool = 1.1;
          const a = Math.atan2(best.y - b.y, best.x - b.x);
          for (let k = -1; k <= 1; k++) s.shots.push({ x: b.x, y: b.y, vx: Math.cos(a + k * 0.12) * 120, vy: Math.sin(a + k * 0.12) * 120, team: b.team, life: 0.6 });
        }
      });
      s.shots.forEach((p) => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (BS.tile(p.x, p.y) === 'w') p.life = 0;
        s.bs.forEach((o) => { if (!o.dead && o.team !== p.team && p.life > 0 && Math.abs(o.x - p.x) < 4 && Math.abs(o.y - p.y) < 4) { p.life = 0; if (--o.hp <= 0) { o.dead = 2; s.score[p.team]++; } } });
      });
      s.shots = s.shots.filter((p) => p.life > 0);
    },
    draw(ctx, s, t) {
      BS.map.forEach((row, j) => row.forEach((c, i) => {
        const x = i * 8, y = j * 8;
        fill(ctx, (i + j) % 2 ? '#e3c48a' : '#dbbb7f', x, y, 8, 8);
        if (c === 'w') { fill(ctx, '#a0643a', x, y, 8, 8); fill(ctx, '#c98a52', x, y, 8, 3); fill(ctx, '#7a4a2a', x, y + 7, 8, 1); }
      }));
      fill(ctx, 'rgba(74,140,255,0.18)', 0, 0, 16, GH); fill(ctx, 'rgba(232,69,60,0.16)', GW - 16, 0, 16, GH);
      s.shots.forEach((p) => fill(ctx, p.team ? '#ffd23a' : '#ffffff', p.x - 1, p.y - 1, 2, 2));
      const brawler = (b) => {
        const x = Math.round(b.x), y = Math.round(b.y), c = b.team ? ['#e8453c', '#ff8a80'] : ['#2f7fe8', '#8fc4ff'];
        fill(ctx, 'rgba(0,0,0,0.25)', x - 4, y + 3, 8, 2);
        fill(ctx, '#1c1922', x - 4, y - 4, 8, 8); fill(ctx, c[0], x - 3, y - 3, 6, 6); fill(ctx, c[1], x - 2, y - 3, 4, 2); fill(ctx, '#1c1922', x - 1, y - 1, 1, 1); fill(ctx, '#1c1922', x + 1, y - 1, 1, 1);
        fill(ctx, '#1c1922', x - 4, y - 8, 8, 2); fill(ctx, b.team ? '#ff4d4d' : '#5ce05c', x - 4, y - 8, Math.round((8 * b.hp) / 6), 2);
        if (b.you && Math.floor(t * 3) % 2) [[-6, -6], [4, -6], [-6, 4], [4, 4]].forEach(([dx, dy]) => fill(ctx, '#ffb547', x + dx, y + dy, 2, 2));
      };
      s.bs.forEach((b) => { if (!b.dead) brawler(b); });
      BS.map.forEach((row, j) => row.forEach((c, i) => {
        if (c !== 'b') return;
        const x = i * 8, y = j * 8;
        fill(ctx, '#3aa64a', x, y, 8, 8); fill(ctx, '#2e8a3c', x + 1, y + 2, 2, 2); fill(ctx, '#2e8a3c', x + 5, y + 5, 2, 2); fill(ctx, '#55c262', x + 4, y + 1, 2, 1);
      }));
      // your team can see each other through bushes
      s.bs.forEach((b) => { if (!b.dead && !b.team && BS.tile(b.x, b.y) === 'b') { ctx.globalAlpha = 0.55; brawler(b); ctx.globalAlpha = 1; } });
      fill(ctx, 'rgba(0,0,0,0.6)', 116, 2, 88, 13);
      label(ctx, '#8fc4ff', String(s.score[0]), 124, 12, 10);
      const left = Math.ceil(s.clock);
      label(ctx, '#ffffff', `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, 160, 12, 9, 'center');
      label(ctx, '#ff8a80', String(s.score[1]), 196, 12, 10, 'right');
      if (s.over) {
        const msg = s.score[0] > s.score[1] ? 'VICTORY' : s.score[0] < s.score[1] ? 'DEFEAT' : 'DRAW';
        label(ctx, '#0b0a0f', msg, 161, 67, 18, 'center'); label(ctx, '#ffd23a', msg, 160, 66, 18, 'center');
      }
    },
    down(s, x, y) { s.bs[0].order = [x, y]; if (!s.told) { s.told = true; say('tap to move. you\'re the blue one in the ring.'); } },
  };

  // minecraft: a PvP duel, sword crits and knockback, on a strip of grass
  const HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];
  const MC = {
    G: 96,
    spawn: (i) => ({ x: i ? 230 : 90, y: 96, vx: 0, vy: 0, hp: 20, cool: rnd(0.2, 0.6), hurt: 0, back: 0, swing: 0, i, dir: i ? -1 : 1 }),
    init: () => ({ ps: [MC.spawn(0), MC.spawn(1)], fx: [], msg: null, wait: 0, kills: [0, 0] }),
    step(s, dt) {
      s.fx = s.fx.filter((p) => (p.life -= dt) > 0); s.fx.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; });
      if (s.msg && (s.msg.life -= dt) <= 0) s.msg = null;
      if (s.wait) { s.wait -= dt; if (s.wait <= 0) { s.wait = 0; s.ps = [MC.spawn(0), MC.spawn(1)]; } return; }
      s.ps.forEach((p, i) => {
        const o = s.ps[1 - i], dir = Math.sign(o.x - p.x) || 1, d = Math.abs(o.x - p.x);
        p.dir = dir;
        p.cool -= dt; p.hurt = Math.max(0, p.hurt - dt); p.back = Math.max(0, p.back - dt); p.swing = Math.max(0, p.swing - dt);
        const want = p.back ? -dir * 34 : d > 11 ? dir * 46 : 0;
        if (p.y >= MC.G) { p.vx += (want - p.vx) * Math.min(1, dt * 8); if (Math.random() < dt * 0.6 && d < 40) p.vy = -95; }
        p.vy += 380 * dt; p.x = clamp(p.x + p.vx * dt, 12, GW - 16); p.y += p.vy * dt;
        if (p.y > MC.G) { p.y = MC.G; p.vy = 0; }
        if (d < 15 && p.cool <= 0 && o.hp > 0) {
          p.cool = rnd(0.45, 0.7); p.swing = 0.15;
          if (Math.random() < (i ? 0.55 : 0.72)) {
            const crit = p.vy > 20;
            o.hp -= crit ? 3 : 2; o.hurt = 0.25; o.vx = dir * 90; o.vy = -60;
            if (Math.random() < 0.4) o.back = 0.3;
            for (let k = 0; k < (crit ? 10 : 4); k++) s.fx.push({ x: o.x + 2, y: o.y - 10, vx: rnd(-40, 40), vy: rnd(-70, -10), life: 0.45, c: crit ? '#d8f1ff' : '#ffffff' });
            if (o.hp <= 0) {
              s.kills[i]++; s.wait = 2.2;
              s.msg = { text: i ? 'pranav was slain by opp' : 'opp was slain by pranav', life: 2.2 };
              for (let k = 0; k < 16; k++) s.fx.push({ x: o.x + 2, y: o.y - 8, vx: rnd(-50, 50), vy: rnd(-60, 0), life: 0.8, c: '#e8e8e8' });
            }
          }
        }
      });
    },
    draw(ctx, s, t) {
      const same = (c) => c;
      fill(ctx, '#7ec0ee', 0, 0, GW, GH);
      for (let i = 0; i < 3; i++) { const x = ((i * 130 + t * 5) % (GW + 60)) - 50; fill(ctx, '#ffffff', x, 12 + i * 8, 40, 6); }
      for (let x = 0; x < GW; x += 8) { const h = 14 + Math.round(Math.sin(x * 0.05) * 6 + Math.sin(x * 0.13) * 3); fill(ctx, '#8fb8a0', x, MC.G - h, 8, h); }
      for (let x = 0; x < GW; x += 8) { block(ctx, x, MC.G, 'grass', same); block(ctx, x, MC.G + 8, 'dirt', same); block(ctx, x, MC.G + 16, 'stone', same); }
      s.ps.forEach((p) => {
        if (p.hp <= 0) return;
        const x = Math.round(p.x), y = Math.round(p.y), shirt = p.i ? '#b03a2e' : '#2fa4a9', legs = p.i ? '#3a3a3a' : '#3b3fb0', leg = Math.abs(p.vx) > 8 ? Math.floor(t * 8) % 2 : 0;
        fill(ctx, '#3b2a1a', x, y - 16, 4, 1); fill(ctx, '#c69c6d', x, y - 15, 4, 3); fill(ctx, '#3b2a1a', x + (p.dir > 0 ? 3 : 0), y - 14, 1, 1);
        fill(ctx, shirt, x, y - 12, 4, 6); fill(ctx, legs, x, y - 6, 2, 6 - leg); fill(ctx, legs, x + 2, y - 6, 2, 5 + leg);
        const hx = p.dir > 0 ? x + 4 : x - 1;
        if (p.swing) fill(ctx, '#5fe0e0', p.dir > 0 ? hx : hx - 6, y - 10, 7, 1);
        else { fill(ctx, '#5fe0e0', hx, y - 16, 1, 6); fill(ctx, '#6b4a2e', hx, y - 10, 1, 2); }
        if (p.hurt) { ctx.fillStyle = 'rgba(255,40,40,0.5)'; ctx.fillRect(x, y - 16, 4, 16); }
        label(ctx, 'rgba(0,0,0,0.5)', p.i ? 'opp' : 'pranav', x + 3, y - 20, 7, 'center'); label(ctx, '#ffffff', p.i ? 'opp' : 'pranav', x + 2, y - 21, 7, 'center');
      });
      s.fx.forEach((p) => fill(ctx, p.c, p.x, p.y, 2, 2));
      s.ps.forEach((p, i) => {
        for (let k = 0; k < 10; k++) {
          const full = p.hp >= (k + 1) * 2, half = !full && p.hp === k * 2 + 1, x0 = i ? GW - 8 - (k + 1) * 6 : 6 + k * 6;
          HEART.forEach((row, j) => [...row].forEach((ch, c) => { if (ch === 'r') fill(ctx, full || (half && c < 2) ? '#e8403a' : '#3a2020', x0 + c, 6 + j); }));
        }
      });
      label(ctx, '#ffffff', `${s.kills[0]} - ${s.kills[1]}`, 160, 13, 9, 'center');
      if (s.msg) { fill(ctx, 'rgba(0,0,0,0.45)', 4, GH - 15, s.msg.text.length * 5 + 8, 11); label(ctx, '#ffffff', s.msg.text, 8, GH - 7, 8); }
    },
  };

  const GAMES = [
    { id: 'minecraft', name: 'Minecraft', scene: MC, line: 'competitive PvP, plus survival with friends, big builds and the odd speedrun.',
      cart: [['gggggggggggg', 'gggggggggggg', 'gdgggdgggdgg', 'dddddddddddd', 'dbdddbdddbdd', 'dddddddddddd', 'ddbddddbdddd', 'dddddddddddd'], { g: '#5aa83c', d: '#8a5a33', b: '#6e4526' }] },
    { id: 'fortnite', name: 'Fortnite', scene: FN, line: 'squads with friends.',
      cart: [['...pppppp...', '..pqpppppp..', '...pppppp...', '...w....w...', 'bbbbbbbbbbbb', 'bwwbwwbwwbbb', 'bbbbbbbbbbbb', '.kk......kk.'], { p: '#5ad0ff', q: '#a8e6ff', w: '#d8f1ff', b: '#2a6fdb', k: '#1c1922' }] },
    { id: 'rocketleague', name: 'Rocket League', scene: RL, line: 'soccer with rocket-powered cars. still chasing consistent aerials.',
      cart: [['........ww..', '.......wggw.', '.......wggw.', '........ww..', '..bbbb......', 'bbbbbbbb....', 'obbbbbbbb...', '.kk...kk....'], { b: '#2f6fdb', o: '#ff8a3d', w: '#e8e8e8', g: '#a8a8a8', k: '#1c1922' }] },
    { id: 'rhythia', name: 'Rhythia', scene: RY, line: 'a rhythm aim game: hit the notes on a 3×3 grid with your cursor, on the beat.',
      cart: [['.ggg.ppp.ggg', '.ggg.ppp.ggg', '............', '.ggg.ggg.ggg', '.ggg.gwg.ggg', '............', '.ggg.ggg.bbb', '.ggg.ggg.bbb'], { g: '#5a4f78', p: '#ff6fa5', b: '#8fa8ff', w: '#ffffff' }] },
    { id: 'geometrydash', name: 'Geometry Dash', scene: GD, line: 'one button, a lot of spikes, a lot of attempts.',
      cart: [['oooooo......', 'oyyyyo......', 'okyyko......', 'oyyyyo...w..', 'okkkko...w..', 'oooooo..www.', '........www.', 'cccccccccccc'], { o: '#1c1922', y: '#ffe04a', k: '#3a3150', w: '#9a90b0', c: '#4a8cff' }] },
    { id: 'brawlstars', name: 'Brawl Stars', scene: BS, line: 'quick 3v3s on my phone, in between everything else.',
      cart: [['..kkkkkkkk..', '.kyyyyyyyyk.', 'kyykkyykkyyk', 'kyykkyykkyyk', 'kyyyyyyyyyyk', 'kyyyykkyyyyk', '.kykykykyk..', '..kkkkkkk...'], { y: '#ffd23a', k: '#1c1922' }] },
  ];
  // mining the grass block (click Minecraft again once it's in): three crack stages, then it drops dirt
  const CRACK = [
    ['............', '.....k......', '.....k......', '....k.......', '............', '............', '............', '............'],
    ['.......k....', '.....kk.....', '.....k......', '....k.k.....', '...k...k....', '........k...', '............', '............'],
    ['.k.....k....', '..k..kk...k.', '...kk.k..k..', '....k.k.kk..', '..kk...k....', '.k...k..k...', '....k....kk.', '...k.....k..'],
  ];
  let mining = false, mined = 0;
  const mine = (art) => {
    if (mining) return;
    mining = true;
    const crack = document.createElement('span');
    crack.className = 'crack'; art.appendChild(crack);
    let k = 0;
    const next = () => {
      if (k < CRACK.length) { crack.innerHTML = artSvg(CRACK[k++], { k: 'rgba(20,12,8,0.7)' }); setTimeout(next, 150); return; }
      crack.remove();
      art.classList.add('broken');
      for (let i = 0; i < 10; i++) {
        const p = document.createElement('i');
        p.className = 'bit'; p.style.background = pick(['#5aa83c', '#8a5a33', '#6e4526']);
        p.style.setProperty('--dx', `${Math.round(Math.random() * 40 - 20)}px`); p.style.setProperty('--dy', `${Math.round(Math.random() * 24 - 18)}px`);
        art.appendChild(p);
      }
      mined++;
      say(mined === 1 ? '+1 dirt. (no silk touch.)' : `+1 dirt. that's <b>${mined}</b>.`, 1800);
      setTimeout(() => { art.querySelectorAll('.bit').forEach((p) => p.remove()); art.classList.remove('broken'); mining = false; }, reduced ? 300 : 800);
    };
    next();
  };
  // the handheld: put a cartridge in, it boots, then plays that game's attract mode
  const carts = document.getElementById('carts'), cartNote = document.getElementById('cart-note');
  const hh = document.getElementById('hh-screen'), slot = document.getElementById('hh-cart');
  const hctx = hh && hh.getContext('2d');
  let game = null, gstate = null, boot = 0, gt = 0, glast = 0;
  if (hh) { hh.width = GW; hh.height = GH; }
  // booting: a row of blocks filling in, then the game
  const drawBoot = () => {
    fill(hctx, '#0f0c16', 0, 0, GW, GH);
    const k = Math.min(1, (0.9 - boot) / 0.8), n = Math.round(k * 12);
    for (let i = 0; i < 12; i++) fill(hctx, i < n ? '#ffb547' : '#2a2140', 100 + i * 10, 56, 8, 8);
  };
  const insert = (g, quiet) => {
    if (!hh) return;
    game = g; gstate = g.scene.init(); gt = 0; boot = quiet ? 0 : 0.9;
    carts.querySelectorAll('.cart').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.id === g.id)));
    cartNote.innerHTML = `<b>${g.name}</b>: ${g.line}`;
    slot.innerHTML = artSvg(...g.cart);
    slot.classList.remove('in'); void slot.offsetWidth; slot.classList.add('in');
    if (reduced) { for (let i = 0; i < 120; i++) g.scene.step(gstate, 1 / 30, (gt += 1 / 30)); g.scene.draw(hctx, gstate, gt); }
  };
  const tickHH = (now) => {
    requestAnimationFrame(tickHH);
    const dt = glast ? Math.min(0.05, (now - glast) / 1000) : 0; glast = now;
    if (!game || reduced) return;
    const r = hh.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    if (boot > 0) { boot = Math.max(0, boot - dt); drawBoot(); return; }
    gt += dt; game.scene.step(gstate, dt, gt); game.scene.draw(hctx, gstate, gt);
  };
  if (carts) {
    GAMES.forEach((g) => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.className = 'cart'; b.dataset.id = g.id; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = `<span class="cart-art">${artSvg(...g.cart)}</span>${g.name}`;
      b.addEventListener('click', () => { if (game === g) { if (g.id === 'minecraft') mine(b.firstChild); return; } insert(g); });
      li.appendChild(b); carts.appendChild(li);
    });
    insert(GAMES[0], true);
    requestAnimationFrame(tickHH);
  }

  /* ---------- music: a crate of records and a turntable; 30-second previews from Apple Music ---------- */
  // ids are Apple Music track ids; titles here are only a fallback until the lookup comes back
  const CRATE = [
    { group: 'otuka', id: 1730784885, title: 'Skin', artist: 'otuka' },
    { group: 'otuka', id: 1730561257, title: 'break', artist: 'otuka' },
    { group: 'paramore', id: 604804763, title: 'Misery Business', artist: 'Paramore' },
    { group: 'paramore', id: 1227049868, title: 'Hard Times', artist: 'Paramore' },
    { group: 'lucki', id: 1696244996, title: 'No Bap', artist: 'LUCKI' },
    { group: 'lucki', id: 1329090072, title: 'Clueless', artist: 'LUCKI' },
    { group: 'a$ap rocky', id: 994721492, title: 'L$D', artist: 'A$AP Rocky' },
    { group: 'a$ap rocky', id: 1388566993, title: 'Praise The Lord (Da Shine)', artist: 'A$AP Rocky' },
    { group: 'a$ap rocky', id: 1442956431, title: 'Sundress', artist: 'A$AP Rocky' },
    { group: 'house + instrumentals', id: 1640463908, title: 'Delilah (pull me out of this)', artist: 'Fred again..', note: 'for working: house built out of voice notes and found sounds.' },
    { group: 'house + instrumentals', id: 1507430880, title: "I'm God", artist: 'Clams Casino', note: 'Clams Casino produced a lot of early A$AP Rocky. this is the beat.' },
  ];
  const deck = document.getElementById('deck'), crateEl = document.getElementById('crate');
  const playBtn = document.getElementById('deck-play'), nextBtn = document.getElementById('deck-next');
  const npT = document.getElementById('np-t'), npA = document.getElementById('np-a'), npNote = document.getElementById('np-note'), npProg = document.getElementById('np-prog');
  const player = new Audio();
  player.crossOrigin = 'anonymous'; player.preload = 'none';
  try { player.preservesPitch = false; player.mozPreservesPitch = false; player.webkitPreservesPitch = false; } catch (e) {}
  let actx = null, analyser = null, gain = null, playing = false, current = -1, nowPlaying = '', heard = new Set();
  // volume: remembered between visits; applied after the analyser so the record still dances when it's quiet
  const volEl = document.getElementById('deck-vol'), volN = document.getElementById('deck-vol-n'), muteBtn = document.getElementById('deck-mute');
  let vol = store.get('crate-vol') === null ? 0.7 : +store.get('crate-vol'), muted = false, beforeMute = 0.7;
  const applyVol = () => {
    const v = muted ? 0 : vol;
    if (gain) gain.gain.value = v; else player.volume = v; // iOS ignores element volume, so the graph's gain does the work there
    if (volEl) { volEl.value = Math.round(v * 100); volEl.style.setProperty('--v', `${Math.round(v * 100)}%`); }
    if (volN) volN.textContent = Math.round(v * 100);
    if (muteBtn) { muteBtn.textContent = v ? 'vol' : 'mute'; muteBtn.setAttribute('aria-pressed', String(!v)); muteBtn.setAttribute('aria-label', v ? 'Mute' : 'Unmute'); }
  };
  const bins = new Uint8Array(32);
  const wire = () => {
    if (actx) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = actx.createAnalyser(); analyser.fftSize = 64; analyser.smoothingTimeConstant = 0.7;
      gain = actx.createGain();
      actx.createMediaElementSource(player).connect(analyser).connect(gain).connect(actx.destination);
      player.volume = 1;
      applyVol();
    } catch (e) { analyser = null; gain = null; }
  };
  // a cover, sampled down to a few pixels and posterized so it sits in the site's pixel world
  const pixelate = (img, n) => {
    const c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.drawImage(img, 0, 0, n, n);
    try {
      const d = x.getImageData(0, 0, n, n);
      for (let i = 0; i < d.data.length; i += 4) for (let k = 0; k < 3; k++) d.data[i + k] = Math.round(d.data[i + k] / 51) * 51;
      x.putImageData(d, 0, 0);
    } catch (e) {}
    return c;
  };
  const accentOf = (c) => {
    try {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let best = null, score = -1;
      for (let i = 0; i < d.length; i += 4) {
        const [r, g, b] = [d[i], d[i + 1], d[i + 2]], mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = (mx - mn) * (mx > 60 ? 1 : 0.2);
        if (s > score) { score = s; best = [r, g, b]; }
      }
      return score > 40 ? `rgb(${best.join(',')})` : null;
    } catch (e) { return null; }
  };
  // the sleeves, with record-store dividers between artists
  const sleeves = [];
  if (crateEl) {
    let group = '';
    CRATE.forEach((r, i) => {
      if (r.group !== group) {
        group = r.group;
        const tab = document.createElement('span');
        tab.className = 'divider'; tab.textContent = group; tab.setAttribute('aria-hidden', 'true');
        crateEl.appendChild(tab);
      }
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sleeve'; b.style.setProperty('--tilt', `${((i * 7) % 5) - 2}deg`);
      b.setAttribute('aria-label', `${r.title} by ${r.artist}`);
      b.innerHTML = `<span class="sleeve-art"><b>${r.artist.replace(/[^A-Za-z$]/g, '').slice(0, 2)}</b></span><span class="sleeve-t">${r.title}</span>`;
      b.addEventListener('click', () => drop(i));
      crateEl.appendChild(b);
      sleeves.push(b);
    });
  }
  // look every record up in one request: real titles, album, year, art and a preview
  const lookup = fetch(`https://itunes.apple.com/lookup?id=${CRATE.map((r) => r.id).join(',')}&country=us`)
    .then((res) => res.json())
    .then((data) => {
      const byId = new Map((data.results || []).map((x) => [x.trackId, x]));
      CRATE.forEach((r, i) => {
        const x = byId.get(r.id);
        if (!x) return;
        Object.assign(r, { title: x.trackName, artist: x.artistName, album: x.collectionName, year: (x.releaseDate || '').slice(0, 4), preview: x.previewUrl });
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          r.cover = pixelate(img, 24); r.small = pixelate(img, 18); r.accent = accentOf(r.small);
          const art = sleeves[i].querySelector('.sleeve-art');
          r.small.className = 'px'; art.replaceChildren(r.small);
          if (r.accent) sleeves[i].style.setProperty('--accent', r.accent);
        };
        img.src = x.artworkUrl100;
      });
    })
    .catch(() => {});
  const showNow = (r) => {
    npT.textContent = r.title;
    npA.textContent = [r.artist, r.album, r.year].filter(Boolean).join(' · ');
    npNote.textContent = r.note || '';
  };
  const drop = (i) => {
    const r = CRATE[i];
    current = i;
    sleeves.forEach((s, k) => s.classList.toggle('out', k === i));
    showNow(r);
    lookup.then(() => {
      if (current !== i) return;
      if (!r.preview) { npNote.textContent = 'the crate needs the internet. try again online.'; return; }
      wire();
      if (actx && actx.state === 'suspended') actx.resume();
      player.src = r.preview;
      player.playbackRate = 1;
      player.play().then(() => {
        playing = true; heard.add(i);
        nowPlaying = `♪ ${r.title} · ${r.artist}`; where.textContent = nowPlaying;
        playBtn.textContent = '■ stop';
        if (heard.size === CRATE.length) say('you dug through the <b>whole crate</b>.', 3000);
      }).catch(() => {});
    });
  };
  const stopRecord = () => { player.pause(); playing = false; nowPlaying = ''; playBtn.textContent = '▶ play'; where.textContent = '~/life/music'; };
  const togglePlay = () => { if (playing) stopRecord(); else if (current >= 0 && player.src) { player.play().then(() => { playing = true; nowPlaying = `♪ ${CRATE[current].title} · ${CRATE[current].artist}`; where.textContent = nowPlaying; playBtn.textContent = '■ stop'; }).catch(() => {}); } else drop(0); };
  const nextRecord = () => drop((current + 1) % CRATE.length);
  player.addEventListener('ended', () => { playing = false; nextRecord(); });
  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (nextBtn) nextBtn.addEventListener('click', nextRecord);
  applyVol();
  if (volEl) volEl.addEventListener('input', () => { vol = volEl.value / 100; muted = false; store.set('crate-vol', String(vol)); applyVol(); });
  if (muteBtn) muteBtn.addEventListener('click', (e) => {
    e.preventDefault(); // it sits inside the slider's label
    if (muted || !vol) { muted = false; if (!vol) vol = beforeMute || 0.7; } else { beforeMute = vol; muted = true; }
    applyVol();
  });

  // the turntable: platter, a record whose label is the cover (rotated pixel by pixel), the tonearm, a spectrum
  if (deck) {
    const W = 320, H = 180, ctx = deck.getContext('2d'), CX = 116, CY = 92, R = 72, LR = 22;
    deck.width = W; deck.height = H;
    const lab = ctx.createImageData(LR * 2, LR * 2);
    let ang = 0, last = 0, acc = 0, scratching = false, prevA = 0, prevT = 0, spin = 0;
    const PIVOT = [266, 34], ARM = 112;
    // the arm angle that puts the needle d pixels from the spindle
    const armFor = (d) => {
      let best = 0, err = 1e9;
      for (let a = 1.6; a < 3.4; a += 0.005) { const nx = PIVOT[0] + Math.cos(a) * ARM, ny = PIVOT[1] + Math.sin(a) * ARM, e = Math.abs(Math.hypot(nx - CX, ny - CY) - d); if (e < err) { err = e; best = a; } }
      return best;
    };
    const REST = 1.75, OUTER = armFor(R - 4), INNER = armFor(LR + 8);
    let arm = REST;
    const line = (x0, y0, x1, y1, c, w = 2) => {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      ctx.fillStyle = c;
      for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), w, w);
    };
    const draw = (now) => {
      requestAnimationFrame(draw);
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
      acc += dt;
      if (acc < 1 / 15 && !scratching) return; // pixel-stepped: about 15fps
      const step = acc; acc = 0;
      const night = isNight();
      const P = night
        ? { bg: '#141118', body: '#221c30', edge: '#3a3150', plat: '#2e2840', rec: '#0b0a0f', groove: '#16131d', shine: '#3a3450', arm: '#c9c0d9', ink: '#ede6f5', dim: '#5a5270' }
        : { bg: '#efe8da', body: '#d9c7a0', edge: '#1c1922', plat: '#b5a37f', rec: '#1c1922', groove: '#2c2833', shine: '#4a4552', arm: '#3b3643', ink: '#1c1922', dim: '#8a7d63' };
      const r = CRATE[current] || {}, accent = r.accent || (night ? '#ffb547' : '#c4351d');
      if (!scratching) { spin = playing ? 3.49 : spin * 0.8; ang += spin * step; }
      const target = playing ? OUTER + (INNER - OUTER) * Math.min(1, (player.currentTime || 0) / (player.duration || 30)) : REST;
      arm += (target - arm) * Math.min(1, step * 6);
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = P.edge; ctx.fillRect(8, 8, W - 16, H - 16);
      ctx.fillStyle = P.body; ctx.fillRect(10, 10, W - 20, H - 20);
      // platter and record, ringed with grooves (static, so drawn once per theme)
      const key = night ? 'n' : 'd';
      if (!draw.plat || draw.plat.key !== key) {
        const c = Object.assign(document.createElement('canvas'), { width: R * 2 + 8, height: R * 2 + 8 }), x2 = c.getContext('2d'), o = R + 4;
        for (let y = -R - 3; y <= R + 3; y++) for (let x = -R - 3; x <= R + 3; x++) {
          const d = Math.hypot(x, y);
          if (d > R + 3) continue;
          let col = P.plat;
          if (d <= R) col = d > R - 2 ? P.groove : (Math.round(d) % 4 === 0 && d > LR + 4) ? P.groove : P.rec;
          if (d <= R && d > LR + 4 && Math.abs(Math.atan2(y, x) + 2.3) < 0.18 && Math.round(d) % 3 === 0) col = P.shine;
          x2.fillStyle = col; x2.fillRect(o + x, o + y, 1, 1);
        }
        draw.plat = { key, c };
      }
      ctx.drawImage(draw.plat.c, CX - R - 4, CY - R - 4);
      // the label: the cover, rotated with nearest-neighbour so it stays pixel art
      const src = r.cover;
      let sd = r.coverData || null;
      if (src && !sd) try { sd = r.coverData = src.getContext('2d').getImageData(0, 0, src.width, src.height).data; } catch (e) { sd = null; }
      const ca = Math.cos(-ang), sa = Math.sin(-ang), base = rgbOf(accent);
      for (let y = 0; y < LR * 2; y++) for (let x = 0; x < LR * 2; x++) {
        const dx = x - LR + 0.5, dy = y - LR + 0.5, o = (y * LR * 2 + x) * 4;
        if (dx * dx + dy * dy > LR * LR) { lab.data[o + 3] = 0; continue; }
        const u = dx * ca - dy * sa, v = dx * sa + dy * ca;
        if (sd) {
          const sx = Math.floor(((u + LR) / (LR * 2)) * src.width), sy = Math.floor(((v + LR) / (LR * 2)) * src.height);
          const so = (clamp(sy, 0, src.height - 1) * src.width + clamp(sx, 0, src.width - 1)) * 4;
          lab.data[o] = sd[so]; lab.data[o + 1] = sd[so + 1]; lab.data[o + 2] = sd[so + 2];
        } else {
          const stripe = Math.floor((v + LR) / 6) % 2;
          lab.data[o] = base[0] * (stripe ? 0.8 : 1); lab.data[o + 1] = base[1] * (stripe ? 0.8 : 1); lab.data[o + 2] = base[2] * (stripe ? 0.8 : 1);
        }
        lab.data[o + 3] = 255;
      }
      const tmp = draw.tmp || (draw.tmp = Object.assign(document.createElement('canvas'), { width: LR * 2, height: LR * 2 }));
      tmp.getContext('2d').putImageData(lab, 0, 0);
      ctx.drawImage(tmp, CX - LR, CY - LR);
      ctx.fillStyle = P.arm; ctx.fillRect(CX - 1, CY - 1, 2, 2);
      // a fleck on the rim so you can see it turn
      ctx.fillStyle = P.shine; ctx.fillRect(Math.round(CX + Math.cos(ang) * (R - 6)), Math.round(CY + Math.sin(ang) * (R - 6)), 2, 2);
      // tonearm
      const nx = PIVOT[0] + Math.cos(arm) * ARM, ny = PIVOT[1] + Math.sin(arm) * ARM;
      ctx.fillStyle = P.edge; ctx.fillRect(PIVOT[0] - 8, PIVOT[1] - 8, 16, 16);
      ctx.fillStyle = P.plat; ctx.fillRect(PIVOT[0] - 6, PIVOT[1] - 6, 12, 12);
      line(PIVOT[0] - Math.cos(arm) * 14, PIVOT[1] - Math.sin(arm) * 14, PIVOT[0], PIVOT[1], P.arm, 4);
      line(PIVOT[0], PIVOT[1], nx, ny, P.arm, 2);
      ctx.fillStyle = P.arm; ctx.fillRect(Math.round(nx) - 3, Math.round(ny) - 2, 7, 5);
      ctx.fillStyle = accent; ctx.fillRect(Math.round(nx) - 1, Math.round(ny) + 3, 2, 2);
      // the spectrum, in the record's colour
      if (analyser && playing) analyser.getByteFrequencyData(bins); else bins.fill(0);
      for (let i = 0; i < 14; i++) {
        const v = playing ? bins[i + 1] / 255 : 0, h = Math.max(1, Math.round((v * 54) / 3));
        for (let k = 0; k < h; k++) { ctx.fillStyle = k > 13 ? P.ink : accent; ctx.fillRect(212 + i * 7, 160 - k * 3, 5, 2); }
      }
      // start/stop light and speed
      ctx.fillStyle = playing ? accent : P.dim; ctx.fillRect(22, 156, 10, 6);
      ctx.fillStyle = P.dim; ctx.font = '700 8px "JetBrains Mono", monospace'; ctx.fillText('33', 38, 162);
    };
    const rgbOf = (c) => (c.startsWith('#') ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/\d+/g).map(Number));
    requestAnimationFrame(draw);
    // drag the record to scratch: the preview follows your hand (faster, slower), and lets go back to 33
    const at = (e) => { const b = deck.getBoundingClientRect(); return [((e.clientX - b.left) / b.width) * W, ((e.clientY - b.top) / b.height) * H]; };
    deck.addEventListener('pointerdown', (e) => {
      const [x, y] = at(e);
      if (Math.hypot(x - CX, y - CY) > R) { togglePlay(); return; }
      if (!playing) { togglePlay(); return; }
      scratching = true; prevA = Math.atan2(y - CY, x - CX); prevT = performance.now();
      deck.setPointerCapture(e.pointerId);
      if (!heard.scratched) { heard.scratched = true; say('wikka wikka.', 1400); }
    });
    deck.addEventListener('pointermove', (e) => {
      if (!scratching) return;
      const [x, y] = at(e), a = Math.atan2(y - CY, x - CX), now = performance.now();
      let da = a - prevA; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
      ang += da;
      const w = da / Math.max(0.016, (now - prevT) / 1000);
      player.playbackRate = clamp(w / 3.49, 0.25, 3);
      prevA = a; prevT = now;
    });
    const release = () => { if (!scratching) return; scratching = false; player.playbackRate = 1; };
    deck.addEventListener('pointerup', release); deck.addEventListener('pointercancel', release);
  }
  // the progress bar under now playing
  player.addEventListener('timeupdate', () => { if (npProg) npProg.style.width = `${Math.round((player.currentTime / (player.duration || 30)) * 40) * 2.5}%`; });

  /* ---------- the campus at the bottom, same as the portfolio ---------- */
  const campus = document.getElementById('campus');
  if (campus && window.fx && fx.campus) fx.campus(campus, { onGator: () => say('chomp. <b>go gators.</b>'), onTower: () => say(`Century Tower says it's <b>${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</b>.`) });

  /* ---------- easter eggs: konami sends him up Denali; type "lando" anywhere ---------- */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kpos = 0, typedAnywhere = '';
  const summit = () => {
    climberOn = 'Denali';
    drawLadder();
    document.querySelector('.ladder').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    confetti(['#ffffff', '#8fa8ff', '#ffb547']);
    say('20,310 ft. <b>someday.</b>', 4000);
    setTimeout(() => { climberOn = 'Jungfrau'; drawLadder(); }, 9000);
  };
  addEventListener('keydown', (e) => {
    kpos = e.key === KONAMI[kpos] ? kpos + 1 : e.key === KONAMI[0] ? 1 : 0;
    if (kpos === KONAMI.length) { kpos = 0; summit(); }
    const t = e.target;
    if (t && t.tagName === 'INPUT') return;
    if (e.key.length === 1) typedAnywhere = (typedAnywhere + e.key.toLowerCase()).slice(-5);
    if (typedAnywhere === 'lando') { typedAnywhere = ''; confetti(['#ff8000', '#1c1922', '#ffffff']); say('<b>LANDO NORRIS!</b> 🧡'); }
  });

  /* ---------- command line ---------- */
  const go = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); };
  const HELP = '<b>commands</b>\nalpine · court · track · games · music\nsummit · denali · lights · pickleball\nplay · next · stop · play paramore (or any artist)\ntheme · day · night · cd ~\n<span class="dim">try typing lando, or the konami code.</span>';
  const COMMANDS = {
    help: () => say(HELP, 9000), '?': () => say(HELP, 9000), ls: () => say('alpine/  court/  track/  games/  music/'),
    alpine: () => go('alpine'), court: () => go('court'), track: () => go('track'), games: () => go('games'), music: () => go('music'),
    'cd ~': () => { location.href = '../'; }, 'cd ..': () => { location.href = '../'; }, cd: () => { location.href = '../'; }, home: () => { location.href = '../'; },
    summit, denali: summit,
    lights: () => { go('track'); setTimeout(startLights, reduced ? 0 : 600); },
    pickleball: () => { go('court'); setTimeout(() => document.getElementById('court-start').click(), reduced ? 0 : 600); },
    play: () => { go('music'); if (!playing) togglePlay(); },
    next: () => { go('music'); nextRecord(); },
    stop: () => { if (playing) togglePlay(); },
    lando: () => { confetti(['#ff8000', '#1c1922', '#ffffff']); say('<b>LANDO NORRIS!</b> 🧡'); },
    theme: () => setTheme(isNight() ? 'light' : 'dark'), day: () => setTheme('light'), night: () => setTheme('dark'),
    clear: () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }),
  };
  ['alpine', 'court', 'track', 'games', 'music'].forEach((s) => { COMMANDS['cd ' + s] = COMMANDS[s]; });
  // play <artist> drops that artist's first record
  CRATE.forEach((r, i) => {
    const keys = [r.group, r.group.split(' ')[0]];
    if (r.group === 'a$ap rocky') keys.push('rocky', 'asap rocky', 'asap');
    if (r.group.startsWith('house')) keys.push('house', 'instrumentals', 'fred again', 'clams casino');
    keys.forEach((k) => { if (!COMMANDS[`play ${k}`]) COMMANDS[`play ${k}`] = () => { go('music'); drop(i); }; });
  });
  const form = document.getElementById('prompt'), input = document.getElementById('cmd'), mode = document.getElementById('mode');
  input.addEventListener('focus', () => { mode.textContent = 'INSERT'; mode.classList.add('insert'); });
  input.addEventListener('blur', () => { mode.textContent = 'NORMAL'; mode.classList.remove('insert'); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = input.value.trim(), cmd = raw.toLowerCase().replace(/\s+/g, ' ').replace(/\/$/, '');
    if (!cmd) return;
    input.value = '';
    (COMMANDS[cmd] || (() => say(`zsh: command not found: ${raw.replace(/[<>&]/g, '')}\ntry <b>help</b>`)))();
  });
  addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && t.tagName === 'INPUT') return;
    if (e.key === '/' || e.key === ':') { e.preventDefault(); input.focus(); }
    if (e.key === '?') say(HELP, 9000);
  });
  const where = document.getElementById('where');
  addEventListener('scroll', () => {
    const hit = ['music', 'games', 'track', 'court', 'alpine'].find((id) => document.getElementById(id).getBoundingClientRect().top < innerHeight * 0.4);
    where.textContent = nowPlaying || (hit ? `~/life/${hit}` : '~/life');
  }, { passive: true });

  console.log('%cyou found ~/life. try the konami code, or type lando anywhere.', 'color:#ff8000;font:600 13px monospace');
})();

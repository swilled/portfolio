// Canvas effects: hero code glow, Hypothesize pipeline, Spotifind song map, UF campus at night, text scramble.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // one palette per material; C is swapped in place when the theme changes, and every canvas redraws
  const PALETTES = {
    dark: { plum: '#3a3150', dim: '#6e6488', soft: '#9c92b0', text: '#ede6f5', amber: '#ffb547', pink: '#ff6fa5', blue: '#8fa8ff', bg: '#0f0c16', lav: '#c7a6f0',
      mark: 'rgba(255,181,71,0.16)', active: 'rgba(255,181,71,0.55)', dot: 'rgba(156,146,176,0.12)' },
    light: { plum: '#d8cfbb', dim: '#5f5968', soft: '#3b3643', text: '#1c1922', amber: '#c4351d', pink: '#a3305f', blue: '#2546c4', bg: '#f7f3ea', lav: '#7b5bb5',
      mark: 'rgba(255,224,74,0.6)', active: 'rgba(196,53,29,0.6)', dot: 'rgba(60,48,30,0.2)' },
  };
  const isLight = () => document.documentElement.dataset.theme === 'light';
  const C = { ...PALETTES[isLight() ? 'light' : 'dark'] };
  const canvases = [];
  document.addEventListener('themechange', () => {
    Object.assign(C, PALETTES[isLight() ? 'light' : 'dark']);
    canvases.forEach((cv) => cv.dispatchEvent(new Event('fit')));
  });
  const FONT = '"JetBrains Mono", ui-monospace, monospace';

  // Runs draw(t, dt) at ~fps while the canvas is on screen and the tab is visible.
  function loop(canvas, draw, fps = 30) {
    // resizing clears a canvas, so repaint the current frame whenever fit() resizes it
    let lastT = 2;
    canvases.push(canvas);
    canvas.addEventListener('fit', () => draw(lastT, 0));
    if (reduced) { draw(lastT, 0); return; }
    let visible = false, raf = 0, last = null;
    const t0 = performance.now();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      if (last !== null && now - last < 1000 / fps) return;
      const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      lastT = (now - t0) / 1000;
      draw(lastT, dt);
    };
    const start = () => { if (!raf && visible && !document.hidden) { last = null; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const check = () => {
      const r = canvas.getBoundingClientRect();
      visible = r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
      visible ? start() : stop();
    };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    let queued = false;
    window.addEventListener('scroll', () => { if (!queued) { queued = true; setTimeout(() => { queued = false; check(); }, 150); } }, { passive: true });
    check();
  }

  // Keeps a canvas matched to its CSS size at device pixel ratio.
  function fit(canvas) {
    const ctx = canvas.getContext('2d');
    const state = { w: 0, h: 0, ctx };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.w = r.width; state.h = r.height;
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (state.onResize) state.onResize();
      canvas.dispatchEvent(new Event('fit'));
    };
    new ResizeObserver(resize).observe(canvas);
    resize();
    return state;
  }

  /* ---------- hero: a quiet dot grid that turns into code around the cursor ---------- */
  function glow(canvas) {
    const s = fit(canvas), ctx = s.ctx;
    const GAP = 22, R = 120;
    const CHARS = '01{}[]<>/\\=+*#$%&;:~^|';
    let cols = 0, rows = 0, glyph = null;
    s.onResize = () => {
      cols = Math.ceil(s.w / GAP) + 1; rows = Math.ceil(s.h / GAP) + 1;
      glyph = Array.from({ length: cols * rows }, () => (Math.random() * CHARS.length) | 0);
    };
    s.onResize();
    const host = canvas.parentElement;
    const p = { x: s.w * 0.75, y: s.h * 0.5, tx: s.w * 0.75, ty: s.h * 0.5, seen: -99, on: 0 };
    const rings = [];
    let now = 0;
    const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    host.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; [p.tx, p.ty] = local(e); p.seen = now; });
    host.addEventListener('pointerdown', (e) => { if (e.target.closest('a, button, .avatar')) return; const [x, y] = local(e); rings.push({ x, y, t0: now }); });
    // other scripts can send a ripple from any point on the page
    canvas.ripple = (clientX, clientY) => { const r = canvas.getBoundingClientRect(); rings.push({ x: clientX - r.left, y: clientY - r.top, t0: now }); };
    loop(canvas, (t, dt) => {
      now = t;
      const idle = t - p.seen > 2.5;
      // with no cursor around, a faint ghost spotlight drifts through the right half
      if (idle) { p.tx = s.w * (0.72 + 0.18 * Math.sin(t * 0.23)); p.ty = s.h * (0.5 + 0.3 * Math.sin(t * 0.37 + 1)); }
      const k = Math.min(1, dt * (idle ? 1.2 : 12));
      p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k;
      p.on += ((idle ? 0.12 : 0.7) - p.on) * Math.min(1, dt * 3);
      for (let j = rings.length - 1; j >= 0; j--) if (t - rings[j].t0 > 1.8) rings.splice(j, 1);
      ctx.clearRect(0, 0, s.w, s.h);
      ctx.font = `700 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const cx = x * GAP + GAP / 2, cy = y * GAP + GAP / 2;
        const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy) || 1;
        let heat = d < R ? (1 - d / R) ** 1.7 * p.on : 0;
        for (const r of rings) {
          const age = t - r.t0, off = Math.abs(Math.hypot(cx - r.x, cy - r.y) - age * 560);
          if (off < 30) heat = Math.max(heat, (1 - off / 30) * (1 - age / 1.8));
        }
        if (heat < 0.05) {
          ctx.fillStyle = C.dot;
          ctx.fillRect(cx - 1, cy - 1, 2, 2);
          continue;
        }
        const i = y * cols + x;
        if (Math.random() < 0.012) glyph[i] = (Math.random() * CHARS.length) | 0;
        // one quiet ink, with the accent only right under the cursor
        ctx.globalAlpha = Math.min(0.4, heat * 0.6 + 0.06);
        ctx.fillStyle = heat > 0.6 ? C.amber : C.dim;
        const push = d < R ? (1 - d / R) * 2 : 0;
        ctx.fillText(CHARS[glyph[i]], cx + (dx / d) * push, cy + (dy / d) * push);
        ctx.globalAlpha = 1;
      }
    }, 40);
  }

  /* ---------- Hypothesize: one idea at a time, from source to verdict ---------- */
  function hypothesize(canvas) {
    const s = fit(canvas), ctx = s.ctx;
    const IDEAS = [
      // textbook and folklore ideas, nothing from the real book
      { src: 'blog', title: 'The Super Bowl indicator', claim: 'the winning conference calls the year',
        rule: [['entry', 'long the index if the NFC wins'], ['exit', 'hold to year end'], ['data', 'S&P 500 · 1967-2025 · yearly']],
        live: false, why: 'a coincidence, not a cause', ins: 1.45, oos: -0.12, p: 0.58 },
      { src: 'paper', title: 'Sunshine and stock returns', claim: 'markets do better on sunny days',
        rule: [['entry', 'long on clear-sky days'], ['exit', 'next close'], ['data', 'city weather + local index']],
        live: false, why: 'vanishes after costs', ins: 1.12, oos: 0.04, p: 0.47 },
      { src: 'rss', title: 'Drift after earnings surprises', claim: 'prices keep moving after a big surprise',
        rule: [['entry', 'top-decile surprise, next open'], ['exit', 'after 60 days'], ['data', 'US stocks · 2000-2025']],
        live: true, why: 'kept for review', ins: 1.31, oos: 0.97, p: 0.03 },
      { src: 'paper', title: 'Lunar cycles and returns', claim: 'returns are higher around new moons',
        rule: [['entry', 'long 7 days around a new moon'], ['exit', 'full moon'], ['data', '48 indices · 1990-2025']],
        live: false, why: 'not significant', ins: 0.94, oos: 0.11, p: 0.39 },
      { src: 'blog', title: 'A 14-parameter crossover system', claim: 'beat the market every year since 2015',
        rule: [['entry', '14 tuned thresholds'], ['exit', '9 more of them'], ['data', 'one index · 2015-2025']],
        live: false, why: 'overfit parameters', ins: 2.4, oos: -0.05, p: 0.57 },
    ];
    const T = 8; // seconds per idea
    let idx = -1, curve = [], tested = 211, rejected = 197, kept = 14, last = 'rejected #0211 · look-ahead bias';
    let seed = 3;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const next = () => {
      if (idx >= 0) {
        const it = IDEAS[idx];
        tested++; it.live ? kept++ : rejected++;
        last = `${it.live ? 'kept' : 'rejected'} #${String(tested).padStart(4, '0')} · ${it.why}`;
      }
      idx = (idx + 1) % IDEAS.length;
      const it = IDEAS[idx];
      curve = []; let v = 0;
      for (let i = 0; i < 120; i++) {
        const drift = i < 72 ? 0.32 : it.live ? 0.24 : -0.12 - rnd() * 0.08;
        v += drift + (rnd() - 0.5) * 2.2; curve.push(v);
      }
    };
    next();
    // with reduced motion there's a single frame, so show one idea all the way through to its verdict
    let clock = reduced ? T - 0.5 : 0;
    const wrap = (text, maxW) => {
      const words = text.split(' '), lines = []; let line = '';
      words.forEach((w) => { const tryL = line ? line + ' ' + w : w; if (ctx.measureText(tryL).width > maxW && line) { lines.push(line); line = w; } else line = tryL; });
      if (line) lines.push(line);
      return lines;
    };
    const panel = (x, y, w, h, n, label, active) => {
      ctx.strokeStyle = active ? C.active : C.plum;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.fillStyle = active ? C.amber : C.dim;
      ctx.fillText(`${n} ${label}`, x + 10, y + 14);
    };
    const ease = (v) => Math.max(0, Math.min(1, v));
    loop(canvas, (t, dt) => {
      clock += dt;
      if (clock > T) { clock = 0; next(); }
      const it = IDEAS[idx], w = s.w, h = s.h;
      const fs = Math.max(9.5, Math.min(13, w / 58)), lh = fs * 1.55, pad = Math.round(w * 0.03);
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${fs}px ${FONT}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      const colW = Math.round(w * 0.44), rx = pad + colW + pad, rw = w - rx - pad;
      const top = pad, bottom = Math.round(h * 0.84), aH = Math.round((bottom - top) * 0.46);
      const ph = { read: ease(clock / 1.6), mark: ease((clock - 1.6) / 0.6), rule: ease((clock - 2.2) / 1.4), test: ease((clock - 3.6) / 2), verdict: ease((clock - 5.6) / 0.3) };

      // 01 · source
      panel(pad, top, colW, aH, '01', 'read the source', ph.read < 1 || ph.mark < 1);
      ctx.fillStyle = C.blue;
      ctx.fillText(`[${it.src}]`, pad + 10, top + 14 + lh * 1.2);
      ctx.font = `700 ${fs}px ${FONT}`;
      const tl = wrap(it.title, colW - 20);
      let shown = Math.floor(ph.read * it.title.length);
      tl.forEach((line, i) => {
        ctx.fillStyle = C.text;
        ctx.fillText(line.slice(0, Math.max(0, shown)), pad + 10, top + 14 + lh * (2.3 + i));
        shown -= line.length + 1;
      });
      ctx.font = `${fs}px ${FONT}`;
      if (ph.mark > 0) {
        const cl = wrap(`"${it.claim}"`, colW - 20), y0 = top + 14 + lh * (2.6 + tl.length);
        cl.forEach((line, i) => {
          const lw = ctx.measureText(line).width;
          ctx.fillStyle = C.mark;
          ctx.fillRect(pad + 8, y0 + i * lh - lh / 2 + 1, lw * ph.mark + 4, lh - 2);
          ctx.fillStyle = C.soft;
          ctx.fillText(line, pad + 10, y0 + i * lh);
        });
      }

      // 02 · llm turns the claim into a rule
      const by = top + aH + pad * 0.6, bh = bottom - by;
      panel(pad, by, colW, bh, '02', 'llm writes a testable rule', ph.rule > 0 && ph.rule < 1);
      const total = it.rule.reduce((a, [k, v]) => a + k.length + v.length + 2, 0);
      let budget = Math.floor(ph.rule * total);
      it.rule.forEach(([k, v], i) => {
        if (budget <= 0) return;
        const y = by + 14 + lh * (1.4 + i * 1.15);
        ctx.fillStyle = C.amber;
        ctx.fillText(k.slice(0, budget), pad + 10, y);
        budget -= k.length + 2;
        if (budget > 0) {
          ctx.fillStyle = C.soft;
          const vv = v.slice(0, budget), maxC = Math.floor((colW - 20 - fs * 4) / (fs * 0.6));
          ctx.fillText(vv.length > maxC ? vv.slice(0, maxC - 1) + '…' : vv, pad + 10 + fs * 4, y);
          budget -= v.length;
        }
      });
      if (ph.rule > 0 && ph.rule < 1 && Math.floor(t * 3) % 2) {
        ctx.fillStyle = C.amber;
        ctx.fillRect(pad + 10, by + 14 + lh * (1.4 + it.rule.length * 1.15) - fs / 2, fs * 0.55, fs);
      }

      // 03 · backtest, in and out of sample
      panel(rx, top, rw, bottom - top, '03', 'try to break it', ph.test > 0 && ph.verdict < 1);
      const gx = rx + 12, gw = rw - 24, gy = top + lh * 2.4, gh = (bottom - top) * 0.5;
      const lo = Math.min(...curve), hi = Math.max(...curve), split = Math.round(curve.length * 0.6);
      const px = Math.max(2, Math.round(gw / 120));
      const X = (i) => gx + (i / (curve.length - 1)) * gw, Y = (v) => gy + gh - ((v - lo) / (hi - lo || 1)) * gh;
      ctx.fillStyle = C.dim;
      ctx.fillText('in-sample', gx, gy - lh * 0.6);
      ctx.fillText('out-of-sample', X(split) + 6, gy - lh * 0.6);
      ctx.fillStyle = C.plum;
      for (let y = gy; y < gy + gh; y += 6) ctx.fillRect(Math.round(X(split)), y, 1, 3);
      for (let x = gx; x < gx + gw; x += 6) ctx.fillRect(x, Math.round(Y(0)), 3, 1);
      const n = Math.floor(ph.test * curve.length);
      for (let i = 1; i < n; i++) {
        const x = Math.round(X(i) / px) * px, y0 = Math.round(Y(curve[i - 1]) / px) * px, y1 = Math.round(Y(curve[i]) / px) * px;
        ctx.fillStyle = i < split ? C.blue : it.live ? C.amber : C.pink;
        ctx.fillRect(x, Math.min(y0, y1), px, Math.abs(y1 - y0) + px);
      }
      if (n > 1 && n < curve.length) { ctx.fillStyle = C.text; ctx.fillRect(Math.round(X(n - 1) / px) * px - 1, Math.round(Y(curve[n - 1]) / px) * px - 1, px + 2, px + 2); }
      if (ph.test >= 1) {
        const sy = gy + gh + lh * 1.2;
        ctx.fillStyle = C.dim; ctx.fillText('sharpe', gx, sy); ctx.fillText('p-value', gx, sy + lh);
        ctx.fillStyle = C.soft;
        ctx.fillText(`in ${it.ins.toFixed(2)}  ·  out ${it.oos.toFixed(2)}`, gx + fs * 5.5, sy);
        ctx.fillText(it.p.toFixed(2), gx + fs * 5.5, sy + lh);
      }
      if (ph.verdict > 0) {
        const col = it.live ? C.amber : C.pink, label = it.live ? '✓ KEPT' : '✕ REJECTED';
        const vy = bottom - lh * 2.1;
        ctx.globalAlpha = ph.verdict;
        ctx.font = `700 ${fs * 1.15}px ${FONT}`;
        const lw = ctx.measureText(label).width;
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.strokeRect(gx, vy - lh * 0.75, lw + 18, lh * 1.5);
        ctx.fillStyle = col;
        ctx.fillText(label, gx + 9, vy);
        ctx.font = `${fs}px ${FONT}`;
        ctx.fillStyle = C.soft;
        const reason = wrap(it.why, gw - lw - 30)[0];
        ctx.fillText(reason, gx + lw + 30, vy);
        ctx.globalAlpha = 1;
      }

      // ledger
      const ly = Math.round(h * 0.92);
      let lx = pad;
      [[`tested ${tested}`, C.soft], [`rejected ${rejected}`, C.pink], [`kept ${kept}`, C.amber]].forEach(([label, col]) => {
        ctx.fillStyle = col; ctx.fillText(label, lx, ly); lx += ctx.measureText(label).width + fs * 1.6;
      });
      ctx.fillStyle = C.dim;
      ctx.textAlign = 'right';
      if (w > 520) ctx.fillText(last, w - pad, ly);
      ctx.textAlign = 'left';
    }, 30);
  }

  /* ---------- Spotifind: a rotating 3D map of songs, nearest neighbours by sound ---------- */
  function spotifind(canvas) {
    const s = fit(canvas), ctx = s.ctx;
    const GENRE_NAMES = ['indie', 'hip-hop', 'electronic', 'acoustic'];
    const genre = (k) => [GENRE_NAMES[k], [C.blue, C.pink, C.amber, C.lav][k]];
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 0.85;
    const centers = [[-0.5, -0.3, 0.35], [0.55, -0.25, -0.35], [-0.25, 0.5, -0.45], [0.45, 0.45, 0.45]];
    const songs = Array.from({ length: 220 }, (_, i) => {
      const k = i % 4, c = centers[k];
      return { k, p: c.map((v) => v + gauss() * 0.36), id: 1000 + ((rnd() * 8999) | 0), eq: Array.from({ length: 14 }, () => [0.6 + rnd() * 2.4, rnd() * 6]) };
    });
    let q = 0, qT = 0, nbrs = [], rot = 0.6, spin = 0.22, hover = null;
    const pick = () => {
      q = (rnd() * songs.length) | 0;
      const a = songs[q].p;
      nbrs = songs.map((o, i) => ({ i, d: Math.hypot(o.p[0] - a[0], o.p[1] - a[1], o.p[2] - a[2]) }))
        .filter((o) => o.i !== q).sort((x, y) => x.d - y.d).slice(0, 5)
        .map((o) => ({ ...o, sim: Math.max(0.55, 0.99 - o.d * 1.1) }));
      qT = 0;
    };
    pick();
    if (reduced) qT = 3;
    const host = canvas.parentElement;
    host.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); hover = (e.clientX - r.left) / r.width - 0.3; });
    host.addEventListener('pointerleave', () => { hover = null; });
    host.addEventListener('click', () => pick());
    const BOX = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    loop(canvas, (t, dt) => {
      const w = s.w, h = s.h, mapW = w * 0.6, cx = mapW * 0.5, cy = h * 0.52, scale = Math.min(mapW, h) * 0.28;
      qT += dt;
      if (qT > 4.5) pick();
      spin += ((hover === null ? 0.22 : hover * 2.4) - spin) * Math.min(1, dt * 2);
      rot += spin * dt;
      const ca = Math.cos(rot), sa = Math.sin(rot), tilt = 0.42, ct = Math.cos(tilt), st = Math.sin(tilt);
      const P = ([x, y, z]) => {
        const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
        const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
        const k = 3.4 / (3.4 + z2);
        return [cx + x1 * scale * k, cy + y2 * scale * k, z2, k];
      };
      const px = Math.max(3, Math.round(w / 150));
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, mapW, h); ctx.clip();
      // bounding cube, dotted
      ctx.fillStyle = C.plum;
      EDGES.forEach(([a, b]) => {
        const [x0, y0] = P(BOX[a]), [x1, y1] = P(BOX[b]);
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 7);
        for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 2, 2);
      });
      const fs = Math.max(9.5, Math.min(12.5, w / 60));
      ctx.font = `${fs}px ${FONT}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      [[[1.15, 1, 1], 'energy'], [[-1, -1.15, 1], 'dance'], [[-1, 1, -1.15], 'mood']].forEach(([pt, label]) => {
        const [x, y] = P(pt); ctx.fillStyle = C.dim; ctx.fillText(label, x - ctx.measureText(label).width / 2, y);
      });
      // songs, far to near
      const proj = songs.map((o, i) => [i, ...P(o.p)]).sort((a, b) => b[3] - a[3]);
      const nset = new Set(nbrs.map((n) => n.i));
      proj.forEach(([i, x, y, z, k]) => {
        const hot = i === q || nset.has(i);
        const size = Math.max(2, Math.round(px * k * (hot ? 1.3 : 0.9)));
        ctx.globalAlpha = hot ? 1 : Math.max(0.18, Math.min(0.75, 0.75 - z * 0.3));
        ctx.fillStyle = genre(songs[i].k)[1];
        ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
      });
      ctx.globalAlpha = 1;
      // links grow from the query to each neighbour
      const [qx, qy] = P(songs[q].p);
      nbrs.forEach((nb, j) => {
        const grow = Math.max(0, Math.min(1, qT * 2.4 - j * 0.3));
        if (!grow) return;
        const [nx, ny] = P(songs[nb.i].p);
        const n = Math.ceil(Math.hypot(nx - qx, ny - qy) / 5);
        ctx.fillStyle = C.text;
        for (let i = 0; i <= n * grow; i += 1) ctx.fillRect(Math.round(qx + ((nx - qx) * i) / n), Math.round(qy + ((ny - qy) * i) / n), 2, 2);
      });
      const pulse = 3 + 2 * Math.sin(t * 6);
      ctx.strokeStyle = C.text; ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(qx - px - pulse), Math.round(qy - px - pulse), Math.round(2 * (px + pulse)), Math.round(2 * (px + pulse)));
      ctx.restore();

      // side panel: now playing, an equaliser, and the five closest songs
      const x0 = mapW + w * 0.02, pw = w - x0 - w * 0.04, song = songs[q], g = genre(song.k);
      let y = h * 0.1;
      ctx.fillStyle = C.dim; ctx.fillText('now playing', x0, y);
      y += fs * 1.6;
      ctx.fillStyle = g[1]; ctx.fillRect(x0, y - px / 2, px, px);
      ctx.font = `700 ${fs}px ${FONT}`;
      ctx.fillStyle = C.text; ctx.fillText(`track_${song.id}`, x0 + px * 2, y);
      ctx.font = `${fs}px ${FONT}`;
      ctx.fillStyle = C.dim; ctx.fillText(g[0], x0 + px * 2 + ctx.measureText(`track_${song.id}  `).width + fs, y);
      y += fs * 1.2;
      const bars = 14, bw = Math.max(2, Math.floor(pw / bars) - 2), eqH = h * 0.16;
      for (let b = 0; b < bars; b++) {
        const [f, ph] = song.eq[b];
        const lvl = Math.round(((0.25 + 0.75 * Math.abs(Math.sin(t * f + ph))) * eqH) / 4) * 4;
        for (let yy = 0; yy < lvl; yy += 4) {
          ctx.fillStyle = yy > eqH * 0.7 ? C.text : g[1];
          ctx.globalAlpha = 0.5 + (yy / eqH) * 0.5;
          ctx.fillRect(x0 + b * (bw + 2), y + eqH - yy, bw, 3);
        }
      }
      ctx.globalAlpha = 1;
      y += eqH + fs * 2;
      ctx.fillStyle = C.dim; ctx.fillText('closest by sound', x0, y);
      nbrs.forEach((nb, j) => {
        const show = Math.max(0, Math.min(1, qT * 2.4 - j * 0.3));
        if (!show) return;
        const o = songs[nb.i], yy = y + fs * 1.7 * (j + 1);
        ctx.globalAlpha = show;
        ctx.fillStyle = genre(o.k)[1]; ctx.fillRect(x0, yy - px / 2, px, px);
        ctx.fillStyle = C.soft; ctx.fillText(`track_${o.id}`, x0 + px * 2, yy);
        ctx.textAlign = 'right';
        ctx.fillStyle = C.amber; ctx.fillText(`${Math.round(nb.sim * 100)}%`, x0 + pw, yy);
        ctx.textAlign = 'left';
      });
      ctx.globalAlpha = 1;
    }, 30);
  }

  /* ---------- contact: UF at night, in pixels. Century Tower's clock shows your local time ---------- */
  function campus(canvas, { onGator, onTower } = {}) {
    const s = fit(canvas), ctx = s.ctx;
    const P = 4; // css px per art pixel
    const NIGHT = {
      star: '#9c92b0', starHi: '#ede6f5', moon: '#f6e3b4', crater: '#d9c493',
      far: '#1c1628', tower: '#2a2140', towerHi: '#3a3150', spire: '#463866', lit: '#ffb547',
      face: '#ede6f5', hand: '#0f0c16', tree: '#1f182d', moss: '#3a3150', ground: '#0c0912',
      water: '#151126', ripple: '#2c2546', gator: '#4f5a3c', gatorHi: '#6b7650', eye: '#ffb547',
    };
    // daytime, printed: ink greys, a highlighter sun, clouds and birds instead of stars and fireflies
    const DAY = {
      sun: '#ffd84a', sunEdge: '#c4351d', cloud: '#fffdf6', cloudEdge: '#cfc5af', bird: '#3b3643',
      far: '#ddd4c0', tower: '#5a5262', towerHi: '#6e6676', spire: '#3e6b8a', lit: '#f7f3ea',
      face: '#f7f3ea', hand: '#1c1922', tree: '#736c7d', moss: '#9a93a3', ground: '#4a4352',
      water: '#aebbe6', ripple: '#2546c4', gator: '#5d6b45', gatorHi: '#7d8a60', eye: '#1c1922',
    };
    let COL = NIGHT;
    const clouds = [[0.15, 6, 7], [0.48, 11, 9], [0.8, 4, 6]].map(([x, y, r]) => ({ x, y, r }));
    let seed = 5;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    let W = 0, H = 0, ground = 0, far = [], stars = [], trees = [], lamps = [], flies = [], tower = 0, lake = [0, 0];
    const gator = { x: 0, dir: 1, chomp: 0, blink: 0 };
    s.onResize = () => {
      W = Math.ceil(s.w / P); H = Math.ceil(s.h / P); ground = H - 12; seed = 5;
      tower = Math.round(W * 0.72); lake = [Math.round(W * 0.1), Math.round(W * 0.4)];
      far = Array.from({ length: W }, (_, x) => Math.max(2, Math.round(5 + 2.5 * Math.sin(x * 0.07) + 1.5 * Math.sin(x * 0.23 + 1) + rnd())));
      stars = Array.from({ length: Math.round(W * 0.35) }, () => ({ x: (rnd() * W) | 0, y: (rnd() * (ground - 22)) | 0, p: rnd() * 6, hi: rnd() < 0.15 }));
      trees = [];
      for (let x = 4; x < W; x += 16 + ((rnd() * 18) | 0)) {
        if (x > lake[0] - 6 && x < lake[1] + 4) continue;
        if (Math.abs(x - tower) < 12) continue;
        trees.push({ x, rx: 8 + ((rnd() * 6) | 0), ry: 5 + ((rnd() * 3) | 0), h: Math.min(ground - 26, 14 + ((rnd() * 9) | 0)), moss: Array.from({ length: 6 }, () => [((rnd() - 0.5) * 14) | 0, 2 + ((rnd() * 4) | 0)]) });
      }
      lamps = [lake[1] + 8, tower - 16, tower + 16, W - 12].filter((x) => x > 0 && x < W);
      flies = Array.from({ length: 7 }, () => ({ x: rnd() * W, y: ground - 4 - rnd() * 14, p: rnd() * 6 }));
      gator.x = lake[0] + 6;
    };
    s.onResize();
    const px = (x, y, c, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x * P, y * P, w * P, h * P); };
    const line = (x0, y0, x1, y1, c) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) px(Math.round(x0 + ((x1 - x0) * i) / (n || 1)), Math.round(y0 + ((y1 - y0) * i) / (n || 1)), c);
    };
    const host = canvas.parentElement;
    const hitAt = (e) => {
      const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / P, y = (e.clientY - r.top) / P;
      if (y < 0 || y > H) return null;
      if (Math.abs(x - (gator.x + 4)) < 7 && Math.abs(y - ground) < 5) return 'gator';
      if (Math.abs(x - tower) < 7 && y < ground) return 'tower';
      return null;
    };
    host.addEventListener('click', (e) => {
      const hit = hitAt(e);
      if (hit === 'gator') { gator.chomp = 1; if (onGator) onGator(); }
      else if (hit === 'tower' && onTower) onTower();
    });
    // the hand only over the two things that answer a click
    host.addEventListener('pointermove', (e) => canvas.classList.toggle('hot', !!hitAt(e)));
    host.addEventListener('pointerleave', () => canvas.classList.remove('hot'));
    loop(canvas, (t, dt) => {
      const day = isLight();
      COL = day ? DAY : NIGHT;
      ctx.clearRect(0, 0, s.w, s.h);
      const mx = Math.round(W * 0.86), my = 9;
      if (day) {
        // sun, then clouds drifting right, then a few birds
        for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const d = x * x + y * y; if (d <= 40) px(mx + x, my + y, d > 28 ? COL.sunEdge : COL.sun); }
        clouds.forEach((cl) => {
          const cx = Math.round(((cl.x * W + t * 1.2) % (W + 30)) - 15), cy = cl.y, r = cl.r;
          const blob = (edge) => {
            for (let y = -r; y <= r; y++) for (let x = -r * 2; x <= r * 2; x++) {
              const inside = (x / (r * 2 + edge)) ** 2 + (y / (r * 0.55 + edge)) ** 2 <= 1 || ((x + r) / (r + edge)) ** 2 + ((y + r * 0.3) / (r * 0.7 + edge)) ** 2 <= 1;
              if (inside) px(cx + x, cy + y, edge ? COL.cloudEdge : COL.cloud);
            }
          };
          blob(1); blob(0);
        });
        for (let i = 0; i < 4; i++) {
          const bx = Math.round(((i * 37 + t * 4) % (W + 20)) - 10), by = 14 + ((i * 7) % 10) + Math.round(Math.sin(t + i) * 1.5), up = Math.floor(t * 4 + i) % 2;
          px(bx, by + up, COL.bird); px(bx + 1, by + 1 - up, COL.bird); px(bx + 2, by + up, COL.bird);
        }
      } else {
        stars.forEach((st) => {
          const tw = Math.sin(t * 1.3 + st.p);
          if (tw < -0.6) return;
          px(st.x, st.y, st.hi && tw > 0.7 ? COL.starHi : COL.star);
        });
        for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 26) px(mx + x, my + y, COL.moon);
        [[-2, -1], [1, 2], [2, -2], [-1, 2]].forEach(([x, y]) => px(mx + x, my + y, COL.crater));
      }
      // far treeline
      far.forEach((h, x) => px(x, ground - h, COL.far, 1, h));
      // Century Tower: brick shaft, lit belfry, clock, copper spire
      const th = Math.min(50, ground - 18), top = ground - th, tl = tower - 5;
      px(tl, top, COL.tower, 11, th);
      px(tl, top, COL.towerHi, 1, th);
      for (let k = 0; k < 3; k++) px(tl + 2 + k * 3, top + 3, COL.lit, 1, 4);
      px(tl - 1, top - 1, COL.towerHi, 13, 1);
      for (let y = 0; y < 12; y++) { const half = Math.max(0, 5 - Math.floor(y / 2)); px(tower - half, top - 2 - y, COL.spire, half * 2 + 1, 1); }
      px(tl - 1, top - 4, COL.spire, 1, 3); px(tl + 11, top - 4, COL.spire, 1, 3);
      const now = new Date(), cx = tower, cy = top + 13;
      for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 10) px(cx + x, cy + y, COL.face);
      const ma = (now.getMinutes() / 60) * Math.PI * 2 - Math.PI / 2, ha = (((now.getHours() % 12) + now.getMinutes() / 60) / 12) * Math.PI * 2 - Math.PI / 2;
      line(cx, cy, cx + Math.round(Math.cos(ma) * 3), cy + Math.round(Math.sin(ma) * 3), COL.hand);
      line(cx, cy, cx + Math.round(Math.cos(ha) * 2), cy + Math.round(Math.sin(ha) * 2), COL.hand);
      for (let y = top + 20; y < ground - 4; y += 6) px(tower - 1, y, COL.lit, 2, 2);
      // oaks with spanish moss
      trees.forEach((tr) => {
        const cyT = ground - tr.h;
        px(tr.x - 1, cyT, COL.tree, 2, tr.h);
        for (let y = -tr.ry; y <= tr.ry; y++) for (let x = -tr.rx; x <= tr.rx; x++) if ((x / tr.rx) ** 2 + (y / tr.ry) ** 2 <= 1) px(tr.x + x, cyT + y, COL.tree);
        tr.moss.forEach(([dx, len]) => px(tr.x + dx, cyT + Math.round(tr.ry * 0.6), COL.moss, 1, len + Math.round(Math.sin(t + dx) * 0.6)));
      });
      // lamps along the path
      lamps.forEach((x) => {
        px(x, ground - 9, COL.tower, 1, 9);
        px(x - 1, ground - 10, COL.tower, 3, 1);
        if (!day && Math.sin(t * 9 + x) > -0.97) { px(x, ground - 10, COL.lit); ctx.globalAlpha = 0.35; px(x - 1, ground - 9, COL.lit); px(x + 1, ground - 9, COL.lit); ctx.globalAlpha = 1; }
      });
      // ground, with Lake Alice cut into it
      px(0, ground, COL.ground, W, H - ground);
      px(lake[0], ground, COL.water, lake[1] - lake[0], H - ground);
      for (let y = ground + 1; y < H; y += 2) {
        const off = Math.floor((t * 6 + y * 3) % 8);
        for (let x = lake[0] + off; x < lake[1] - 2; x += 8) px(x, y, COL.ripple, 3, 1);
      }
      // the moon's (or sun's) reflection, wobbling
      const rx = Math.round(lake[0] + (lake[1] - lake[0]) * 0.7);
      for (let y = ground + 1; y < H; y += 2) { const w = Math.max(1, 5 - (y - ground)); ctx.globalAlpha = day ? 0.6 : 0.3; px(rx - Math.floor(w / 2) + Math.round(Math.sin(t * 2 + y) * 0.6), y, day ? COL.sun : COL.lit, w, 1); }
      ctx.globalAlpha = 1;
      // the gator patrols the lake, blinks, and bites when clicked
      gator.x += gator.dir * dt * 2.2;
      if (gator.x > lake[1] - 12) gator.dir = -1;
      if (gator.x < lake[0] + 2) gator.dir = 1;
      gator.chomp = Math.max(0, gator.chomp - dt * 2.5);
      gator.blink = (t % 5) < 0.15;
      const gx = Math.round(gator.x), gy = ground, f = gator.dir;
      const at = (x) => (f > 0 ? gx + x : gx + 9 - x);
      for (let x = 0; x <= 9; x++) px(at(x), gy + 1, COL.gator);
      for (let x = 1; x <= 6; x++) px(at(x), gy, COL.gator);
      [2, 4].forEach((x) => px(at(x), gy - 1, gator.blink ? COL.gator : COL.eye));
      if (gator.chomp > 0.2) { for (let x = 6; x <= 9; x++) px(at(x), gy - 1 - Math.round(gator.chomp * 2), COL.gatorHi); }
      [1, 3, 5].forEach((x) => px(at(x), gy, COL.gatorHi));
      // fireflies, at night only
      if (!day) flies.forEach((fl, i) => {
        const a = Math.sin(t * 2 + fl.p);
        if (a < 0.2) return;
        ctx.globalAlpha = a;
        px(Math.round(fl.x + Math.sin(t * 0.5 + i) * 6), Math.round(fl.y + Math.cos(t * 0.7 + i) * 3), COL.lit);
        ctx.globalAlpha = 1;
      });
    }, 20);
  }

  /* ---------- text: decode into place ---------- */
  const GLYPHS = '!<>-_\\/[]{}=+*^?#%$';
  function scramble(el, { duration = 900, delay = 0 } = {}) {
    const final = el.textContent;
    if (reduced) return;
    const len = final.length;
    // pixel glyphs are wider or narrower than the letters they stand in for, so pin each word's
    // measured width (after the font has loaded) or the name reflows between one and two lines mid-decode
    const run = () => {
      el.style.width = `${el.getBoundingClientRect().width}px`;
      el.style.whiteSpace = 'nowrap';
      const start = performance.now();
      // timers rather than rAF so it always finishes, even in a background tab
      const tick = () => {
        const k = Math.min(1, Math.max(0, (performance.now() - start) / duration));
        const shown = Math.floor(k * len);
        let out = final.slice(0, shown);
        for (let i = shown; i < len; i++) out += final[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        el.textContent = out;
        if (k < 1) setTimeout(tick, 45); else { el.textContent = final; el.style.width = ''; el.style.whiteSpace = ''; }
      };
      tick();
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(run, delay));
  }

  /* ---------- Velo: a 3D ascii funnel. ideas from two sources pour in, most die in testing, a few reach Speed ---------- */
  function velo(canvas) {
    const s = fit(canvas), ctx = s.ctx;
    const COLS = 58, ROWS = 34, RAMP = '.,-~:;=!*#$@';
    const TOP = 1, BOT = -1.05, SPOUT = -1.45, R1 = 1, R0 = 0.11;
    const rad = (y) => R0 + ((R1 - R0) * (y - BOT)) / (TOP - BOT);
    const slope = (R1 - R0) / (TOP - BOT);
    const lim = (v, a, b) => Math.max(a, Math.min(b, v));
    let A = 0.5, B = 0.42, drag = null, made = 0, through = 0, spawnT = 0;
    const parts = [], runs = [];
    // mine (o) and Hypothesize's (*); mine make it through more often
    const spawn = (y) => { made++; const own = Math.random() < 0.4; parts.push({ own, a: Math.random() * Math.PI * 2, y, v: 0.32 + Math.random() * 0.22, w: (Math.random() - 0.5) * 1.6, k: 0.2 + Math.random() * 0.6, die: Math.random() < (own ? 0.09 : 0.025) ? -9 : BOT + 0.1 + Math.random() * (TOP - BOT) * 0.85, dead: 0 }); };
    for (let i = 0; i < 14; i++) spawn(BOT + 0.3 + Math.random() * (TOP - BOT));
    canvas.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY, A, B]; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (drag) { A = drag[2] + (e.clientX - drag[0]) * 0.012; B = lim(drag[3] + (e.clientY - drag[1]) * 0.006, 0.05, 1.1); } });
    const up = () => { drag = null; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    const chars = new Array(COLS * ROWS), cols = new Array(COLS * ROWS), depth = new Float32Array(COLS * ROWS);
    loop(canvas, (t, dt) => {
      if (!drag) A += 0.32 * dt;
      // ideas in, ideas out
      spawnT -= dt;
      if (spawnT <= 0) { spawnT = 0.14 + Math.random() * 0.16; spawn(TOP + 0.2); }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (p.dead) { p.dead += dt; if (p.dead > 0.6) parts.splice(i, 1); continue; }
        p.y -= p.v * dt; p.a += p.w * dt * (1.4 - p.y * 0.4);
        if (p.y < p.die) p.dead = 0.001;
        else if (p.y < SPOUT) { parts.splice(i, 1); through++; runs.push(0); }
      }
      for (let i = runs.length - 1; i >= 0; i--) { runs[i] += dt / 1.8; if (runs[i] >= 1) runs.splice(i, 1); }

      chars.fill(''); depth.fill(0);
      const cw = s.w / COLS, ch = s.h / ROWS;
      const ca = Math.cos(A), sa = Math.sin(A), cb = Math.cos(B), sb = Math.sin(B);
      const F = Math.min(s.w * 1.36, s.h * 1.22);
      const rot = (x, y, z) => { const x1 = x * ca - z * sa, z1 = x * sa + z * ca; return [x1, y * cb + z1 * sb, -y * sb + z1 * cb]; };
      const put = (x, y, z, c, col, bias = 0) => {
        const [x1, y2, z2] = rot(x, y, z), o = 1 / (z2 + 4.2);
        const cx = Math.floor((s.w / 2 + F * o * x1) / cw), cy = Math.floor((s.h * 0.47 - F * o * y2) / ch);
        if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS - 2) return;
        const i = cy * COLS + cx;
        if (o + bias > depth[i]) { depth[i] = o + bias; chars[i] = c; cols[i] = col; }
      };
      // light from up and to the front left; the inside of the funnel is dimmer than the outside
      const L = [-0.35, 0.75, -0.56];
      const shade = (th, y, rim) => {
        const nl = Math.hypot(1, slope);
        const [nx, ny, nz] = rot(Math.cos(th) / nl, -slope / nl, Math.sin(th) / nl);
        const facing = nz < 0;
        let lum = nx * L[0] + ny * L[1] + nz * L[2];
        if (!facing) lum = -lum * 0.55;
        const k = lim(Math.round((lum * 0.5 + 0.5) * (RAMP.length - 1) + (rim ? 2 : 0)), 0, RAMP.length - 1);
        return [RAMP[k], rim ? C.text : facing ? C.soft : C.dim];
      };
      // meridians and rings: a wireframe, so you can see the ideas falling inside
      const M = 18;
      for (let m = 0; m < M; m++) {
        const th = (m / M) * Math.PI * 2;
        for (let y = BOT; y <= TOP; y += 0.03) { const r = rad(y), [c, col] = shade(th, y, false); put(r * Math.cos(th), y, r * Math.sin(th), c, col); }
      }
      [TOP, 0.55, 0.1, -0.35, -0.75].forEach((y, j) => {
        const r = rad(y);
        for (let th = 0; th < Math.PI * 2; th += 0.025) { const [c, col] = shade(th, y, j === 0); put(r * Math.cos(th), y, r * Math.sin(th), c, col); }
      });
      for (let y = SPOUT; y < BOT; y += 0.04) for (let th = 0; th < Math.PI * 2; th += 0.5) put(R0 * Math.cos(th), y, R0 * Math.sin(th), ':', C.dim);
      // the ideas
      parts.forEach((p) => {
        const r = (p.y > TOP ? R1 : rad(Math.max(BOT, p.y))) * p.k;
        const x = r * Math.cos(p.a), z = r * Math.sin(p.a);
        if (p.dead) put(x, p.y, z, p.dead < 0.2 ? '+' : p.dead < 0.4 ? 'x' : '.', C.pink, 0.5);
        else if (p.die < -5 && p.y < BOT + 0.6) put(x, p.y, z, '#', C.amber, 0.5);
        else put(x, p.y, z, p.own ? 'o' : '*', p.own ? C.blue : C.text, 0.5);
      });
      ctx.clearRect(0, 0, s.w, s.h);
      ctx.font = `500 ${Math.round(ch * 0.86)}px ${FONT}`;
      ctx.textBaseline = 'top';
      for (let i = 0; i < chars.length; i++) {
        if (!chars[i]) continue;
        ctx.fillStyle = cols[i];
        ctx.fillText(chars[i], (i % COLS) * cw, Math.floor(i / COLS) * ch);
      }
      // the survivors leave the spout and run along the floor to Speed
      const [sx1, sy2, sz2] = rot(0, SPOUT, 0), so = 1 / (sz2 + 4.2);
      const spoutCol = Math.floor((s.w / 2 + F * so * sx1) / cw), spoutRow = Math.floor((s.h * 0.47 - F * so * sy2) / ch);
      const floor = ROWS - 2, end = COLS - 8;
      ctx.fillStyle = C.dim;
      for (let c = Math.min(spoutCol, end); c < end; c++) ctx.fillText('─', c * cw, floor * ch);
      ctx.fillText('▶', end * cw, floor * ch);
      ctx.fillStyle = C.amber;
      ctx.fillText('speed', (end + 2) * cw, floor * ch);
      runs.forEach((p) => {
        const drop = Math.max(1, floor - spoutRow), across = Math.max(1, end - spoutCol), total = drop + across, k = Math.floor(p * total);
        const col = k < drop ? spoutCol : spoutCol + (k - drop), row = k < drop ? spoutRow + k : floor;
        ctx.fillStyle = C.amber; ctx.fillText('■', col * cw, row * ch);
      });
      ctx.fillStyle = C.blue; ctx.fillText('o', 0, 0);
      ctx.fillStyle = C.dim; ctx.fillText('mine', 2 * cw, 0);
      ctx.fillStyle = C.text; ctx.fillText('*', 8 * cw, 0);
      ctx.fillStyle = C.dim; ctx.fillText('hypothesize', 10 * cw, 0);
      const outTxt = `in ${made} · out ${through}`;
      ctx.fillStyle = through ? C.amber : C.dim;
      ctx.fillText(outTxt, (COLS - outTxt.length) * cw, 0);
    }, 15);
  }

  window.fx = { glow, hypothesize, spotifind, campus, scramble, velo };
})();

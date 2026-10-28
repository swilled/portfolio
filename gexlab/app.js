// GEXLab site: theme toggle, live surface, gamma profile, breathing smile, lightbox, reveals.
(() => {
  document.documentElement.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const btn = document.getElementById('theme');
  const apply = (t) => {
    root.dataset.theme = t;
    btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    document.querySelector('meta[name="theme-color"]').content = t === 'dark' ? '#131313' : '#f4f1ea';
  };
  let saved = null;
  try { saved = localStorage.getItem('gexlab-theme'); } catch { /* storage unavailable */ }
  apply(saved || 'light');
  btn.addEventListener('click', () => {
    const t = root.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(t);
    try { localStorage.setItem('gexlab-theme', t); } catch { /* storage unavailable */ }
  });

  /* ---------- run a callback each frame only while an element is on screen ---------- */
  function whileVisible(el, fn) {
    if (reduced) { fn(1.2); return; }
    let raf = 0, on = false;
    const t0 = performance.now();
    const frame = () => { raf = requestAnimationFrame(frame); fn((performance.now() - t0) / 1000); };
    const set = (v) => { on = v; if (on && !document.hidden && !raf) raf = requestAnimationFrame(frame); else if ((!on || document.hidden) && raf) { cancelAnimationFrame(raf); raf = 0; } };
    new IntersectionObserver(([e]) => set(e.isIntersecting)).observe(el);
    document.addEventListener('visibilitychange', () => set(on));
    const check = () => { const r = el.getBoundingClientRect(); set(r.bottom > 0 && r.top < innerHeight); };
    addEventListener('scroll', check, { passive: true });
    check();
    fn(0);
  }

  /* ---------- hero: a rotating wireframe of dealer gamma across strike × expiry ---------- */
  const cv = document.getElementById('surface');
  if (cv) {
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, lastT = 0;
    const size = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(lastT);
    };
    const N = 30;
    const f = (x, y, t) => 1.05 * Math.exp(-((x - 0.2 - 0.1 * Math.sin(t * 0.3)) ** 2 * 3.2 + (y + 0.1) ** 2 * 2.2))
      - 0.8 * Math.exp(-((x + 0.55) ** 2 * 6 + (y - 0.35 + 0.08 * Math.cos(t * 0.4)) ** 2 * 5))
      + 0.08 * Math.sin(4 * x + 2 * y + t * 0.6);
    function draw(t) {
      lastT = t;
      ctx.clearRect(0, 0, w, h);
      const a = 0.55 + t * 0.06, s = Math.min(w, h * 1.6) * 0.42, cx = w * 0.66, cy = h * 0.52;
      const P = (x, y) => {
        const z = f(x, y, t), u = x * Math.cos(a) - y * Math.sin(a), v = x * Math.sin(a) + y * Math.cos(a);
        return [cx + u * s, cy + v * s * 0.42 - z * s * 0.55, z];
      };
      ctx.lineWidth = 1;
      const seg = (p, q) => {
        const z = (p[2] + q[2]) / 2;
        ctx.strokeStyle = z > 0.45 ? `rgba(214,128,104,${0.35 + z * 0.5})` : z < -0.25 ? `rgba(136,180,200,${0.4 - z * 0.4})` : 'rgba(170,176,170,0.22)';
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      };
      for (let i = 0; i <= N; i++) for (let j = 0; j < N; j++) {
        const x = -1 + (2 * i) / N, y0 = -1 + (2 * j) / N, y1 = -1 + (2 * (j + 1)) / N;
        seg(P(x, y0), P(x, y1));
        seg(P(y0, x), P(y1, x));
      }
    }
    new ResizeObserver(size).observe(cv);
    whileVisible(cv, draw);
  }

  /* ---------- gamma exposure profile ---------- */
  const gex = document.getElementById('gex');
  if (gex) {
    const strikes = 21, top = 20, rowH = 15, cx = 290, spotI = 11;
    const vals = Array.from({ length: strikes }, (_, i) => {
      const k = i - spotI;
      return 0.9 * Math.exp(-((k + 5) ** 2) / 6) - 0.75 * Math.exp(-((k - 4) ** 2) / 5) + 0.12 * Math.sin(i * 1.7) + (k < 0 ? 0.15 : -0.1);
    });
    const max = Math.max(...vals.map(Math.abs));
    svgEl('line', { x1: cx, y1: top - 8, x2: cx, y2: top + strikes * rowH + 4, class: 'axis' }, gex);
    let callWall = 0, putWall = 0, flip = 0;
    vals.forEach((v, i) => { if (v > vals[callWall]) callWall = i; if (v < vals[putWall]) putWall = i; if (i && Math.sign(v) !== Math.sign(vals[i - 1])) flip = i; });
    vals.forEach((v, i) => {
      const y = top + i * rowH, len = (Math.abs(v) / max) * 200;
      const r = svgEl('rect', { x: v >= 0 ? cx : cx - len, y: y + 2, width: len, height: rowH - 4, class: `bar ${v >= 0 ? 'pos' : 'neg'}` }, gex);
      r.style.transformOrigin = v >= 0 ? 'left center' : 'right center';
      r.style.transform = 'scaleX(0)';
      r.style.transitionDelay = i * 35 + 'ms';
      const t = svgEl('text', { x: 18, y: y + rowH - 4 }, gex);
      t.textContent = (5900 - (i - spotI) * 10).toString();
    });
    const level = (i, label) => {
      const y = top + i * rowH + rowH / 2;
      svgEl('line', { x1: 60, y1: y, x2: 500, y2: y, class: 'lvl-line', 'stroke-dasharray': '2 4' }, gex);
      const t = svgEl('text', { x: 508, y: y + 4, class: 'lvl' }, gex);
      t.textContent = label;
    };
    level(callWall, 'CALL WALL');
    level(putWall, 'PUT WALL');
    level(flip, 'GAMMA FLIP');
    const sy = top + spotI * rowH + rowH / 2;
    svgEl('line', { x1: 60, y1: sy, x2: 500, y2: sy, class: 'spot' }, gex);
    const st = svgEl('text', { x: 64, y: sy - 5 }, gex);
    st.textContent = 'spot';
    gex.setAttribute('viewBox', `0 0 600 ${top + strikes * rowH + 16}`);
    gex.closest('.viz').addEventListener('reveal', () => gex.querySelectorAll('.bar').forEach((b) => { b.style.transform = 'scaleX(1)'; }));
  }

  /* ---------- breathing volatility smile ---------- */
  const smile = document.getElementById('smile');
  if (smile) {
    const W = 520, H = 300, L = 40, R = 500, B = 260, T = 30;
    const fill = svgEl('path', { class: 'fill' }, smile);
    const ghost = svgEl('path', { class: 'ghost' }, smile);
    const curve = svgEl('path', { class: 'curve' }, smile);
    svgEl('line', { x1: (L + R) / 2, y1: T, x2: (L + R) / 2, y2: B, class: 'atm' }, smile);
    svgEl('line', { x1: L, y1: B, x2: R, y2: B, stroke: 'var(--rule-strong)' }, smile);
    [['puts', L, 'start'], ['ATM', (L + R) / 2 + 6, 'start'], ['calls', R, 'end']].forEach(([s, x, a]) => { const t = svgEl('text', { x, y: B + 18, 'text-anchor': a }, smile); t.textContent = s; });
    const ivText = svgEl('text', { x: (L + R) / 2 + 8, y: T + 12 }, smile);
    const path = (skew, lift) => {
      let d = '';
      for (let i = 0; i <= 40; i++) {
        const k = -1 + i / 20, iv = 0.175 + lift + 0.11 * k * k + skew * -k * 0.06;
        const x = L + ((k + 1) / 2) * (R - L), y = B - ((iv - 0.1) / 0.32) * (B - T);
        d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      return d;
    };
    ghost.setAttribute('d', path(1, 0.02));
    whileVisible(smile, (t) => {
      const skew = 1.4 + 0.7 * Math.sin(t * 0.9), lift = 0.015 * Math.sin(t * 0.6);
      const d = path(skew, lift);
      curve.setAttribute('d', d);
      fill.setAttribute('d', `${d}L${R} ${B}L${L} ${B}Z`);
      ivText.textContent = `ATM IV ${((0.175 + lift) * 100).toFixed(1)}%`;
    });
    smile.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }

  /* ---------- lightbox ---------- */
  const box = document.getElementById('lightbox'), boxImg = document.getElementById('lightbox-img');
  document.querySelectorAll('.shot').forEach((s) => s.addEventListener('click', () => {
    const img = s.querySelector('img');
    boxImg.src = s.dataset.full;
    boxImg.alt = img.alt;
    if (box.showModal) box.showModal(); else window.open(s.dataset.full, '_blank');
  }));
  document.getElementById('lightbox-close').addEventListener('click', () => box.close());
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });

  /* ---------- reveals ---------- */
  const pending = new Set(document.querySelectorAll('.reveal'));
  const show = (el) => { if (!pending.delete(el)) return; el.classList.add('in'); el.dispatchEvent(new Event('reveal')); };
  const sweep = () => pending.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight - 40) show(el); });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && show(e.target)), { threshold: 0.2 });
    pending.forEach((el) => io.observe(el));
  }
  addEventListener('scroll', () => setTimeout(sweep, 100), { passive: true });
  addEventListener('load', sweep);
  sweep();
})();

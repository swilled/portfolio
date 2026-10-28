// Speed site: live simulated chart, order book and tape, plus page motion.
(() => {
  document.documentElement.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(document.documentElement);
  const C = {
    bg: '#0e0f12', grid: '#1b1d23', text: '#f2efe8', soft: '#b9b6ae', muted: '#77757f',
    bull: css.getPropertyValue('--bull').trim() || '#34c88a', bear: css.getPropertyValue('--bear').trim() || '#e0525e',
    bullDeep: '#0f4a35', bearDeep: '#4a1a1f', gold: '#f0c766', blue: '#5b8cff',
  };
  const MONO = '"IBM Plex Mono", ui-monospace, monospace';

  /* ---------- shared: canvas sizing + a visibility-aware frame loop ---------- */
  function fit(canvas, onResize) {
    const ctx = canvas.getContext('2d');
    const s = { ctx, w: 0, h: 0 };
    const resize = () => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      s.w = r.width; s.h = r.height;
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (onResize) onResize(s);
      canvas.dispatchEvent(new Event('fit'));
    };
    new ResizeObserver(resize).observe(canvas);
    resize();
    return s;
  }
  function loop(canvas, step, draw) {
    canvas.addEventListener('fit', () => draw());
    if (reduced) { for (let i = 0; i < 200; i++) step(1 / 30); draw(); return; }
    let raf = 0, last = null, visible = false;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = last === null ? 1 / 60 : Math.min(0.1, (now - last) / 1000);
      last = now;
      step(dt, now);
      draw(now);
    };
    const set = (v) => { visible = v; if (visible && !document.hidden && !raf) { last = null; raf = requestAnimationFrame(frame); } else if ((!visible || document.hidden) && raf) { cancelAnimationFrame(raf); raf = 0; } };
    new IntersectionObserver(([e]) => set(e.isIntersecting)).observe(canvas);
    document.addEventListener('visibilitychange', () => set(visible));
    const check = () => { const r = canvas.getBoundingClientRect(); set(r.bottom > 0 && r.top < innerHeight); };
    addEventListener('scroll', check, { passive: true });
    check();
  }

  /* ---------- one simulated market shared by the chart, ladder and tape ---------- */
  const market = (() => {
    const TICK = 0.25;
    let price = 21384.25, drift = 0, ticks = 0;
    const listeners = [];
    const tick = () => {
      drift = drift * 0.97 + (Math.random() - 0.5) * 0.35;
      const move = Math.round((drift + (Math.random() - 0.5) * 1.6) / TICK) * TICK;
      price = Math.round((price + move) / TICK) * TICK;
      const side = move > 0 || (move === 0 && Math.random() < 0.5) ? 'buy' : 'sell';
      const size = Math.random() < 0.06 ? 20 + ((Math.random() * 80) | 0) : 1 + ((Math.random() * 9) | 0);
      ticks++;
      listeners.forEach((f) => f({ price, side, size, t: performance.now() }));
    };
    return { TICK, get price() { return price; }, get ticks() { return ticks; }, on: (f) => listeners.push(f), tick };
  })();
  // advance the market by wall-clock time, so it ticks at the same rate however many views are visible
  let tickAcc = 0, pumpT = null;
  const pump = () => {
    const now = performance.now();
    const dt = pumpT === null ? 0 : Math.min(0.1, (now - pumpT) / 1000);
    pumpT = now;
    tickAcc += dt * 28;
    while (tickAcc >= 1) { tickAcc -= 1; market.tick(); }
  };

  /* ---------- hero chart: candles, volume, last-price line, HUD ---------- */
  const chart = document.getElementById('hero-chart');
  if (chart) {
    const s = fit(chart);
    const PERIOD = 900, MAX = 70;
    const candles = [];
    let cur = null;
    market.on(({ price, size, t }) => {
      if (!cur || t - cur.t0 >= PERIOD) {
        cur = { t0: t, o: cur ? cur.c : price, h: price, l: price, c: price, v: 0 };
        candles.push(cur);
        if (candles.length > MAX) candles.shift();
      }
      cur.h = Math.max(cur.h, price); cur.l = Math.min(cur.l, price); cur.c = price; cur.v += size;
    });
    for (let i = 0; i < 1400; i++) { market.tick(); if (i % 20 === 0 && cur) cur.t0 -= PERIOD; }
    const qBid = document.getElementById('q-bid'), qAsk = document.getElementById('q-ask'), qLast = document.getElementById('q-last');
    const hFps = document.getElementById('hud-fps'), hMs = document.getElementById('hud-ms'), hTps = document.getElementById('hud-tps');
    let frames = 0, acc = 0, msAcc = 0, lastTicks = market.ticks;
    loop(chart, (dt) => {
      pump(dt);
      frames++; acc += dt;
      if (acc >= 0.5) {
        hFps.textContent = Math.round(frames / acc);
        hMs.textContent = (msAcc / frames).toFixed(2);
        hTps.textContent = Math.round((market.ticks - lastTicks) / acc);
        frames = 0; acc = 0; msAcc = 0; lastTicks = market.ticks;
      }
    }, () => {
      const t0 = performance.now();
      const { ctx, w, h } = s;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
      const padR = 70, chartH = h * 0.78, volTop = h * 0.82;
      let lo = Infinity, hi = -Infinity, vmax = 1;
      candles.forEach((k) => { lo = Math.min(lo, k.l); hi = Math.max(hi, k.h); vmax = Math.max(vmax, k.v); });
      const pad = (hi - lo) * 0.12 + 1;
      lo -= pad; hi += pad;
      const y = (p) => 12 + (1 - (p - lo) / (hi - lo)) * (chartH - 12);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textBaseline = 'middle';
      for (let i = 0; i <= 5; i++) {
        const p = lo + ((hi - lo) * i) / 5, yy = Math.round(y(p)) + 0.5;
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
        ctx.fillText(p.toFixed(2), w - padR + 8, yy);
      }
      const cw = (w - padR) / MAX, bw = Math.max(2, cw * 0.62);
      candles.forEach((k, i) => {
        const x = i * cw + (MAX - candles.length) * cw;
        const up = k.c >= k.o, col = up ? C.bull : C.bear;
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(x + cw / 2), Math.round(y(k.h)), 1, Math.max(1, Math.round(y(k.l) - y(k.h))));
        const top = y(Math.max(k.o, k.c)), bot = y(Math.min(k.o, k.c));
        ctx.fillRect(Math.round(x + (cw - bw) / 2), Math.round(top), Math.round(bw), Math.max(1, Math.round(bot - top)));
        ctx.globalAlpha = 0.35;
        const vh = ((h - volTop - 6) * k.v) / vmax;
        ctx.fillRect(Math.round(x + (cw - bw) / 2), h - 6 - vh, Math.round(bw), vh);
        ctx.globalAlpha = 1;
      });
      const last = market.price, ly = Math.round(y(last)) + 0.5, up = cur && cur.c >= cur.o;
      ctx.setLineDash([3, 3]); ctx.strokeStyle = up ? C.bull : C.bear;
      ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(w - padR, ly); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = up ? C.bull : C.bear;
      ctx.fillRect(w - padR + 2, ly - 9, padR - 4, 18);
      ctx.fillStyle = '#08090b'; ctx.font = `600 11px ${MONO}`;
      ctx.fillText(last.toFixed(2), w - padR + 8, ly);
      qBid.textContent = (last - market.TICK).toFixed(2); qAsk.textContent = (last + market.TICK).toFixed(2); qLast.textContent = last.toFixed(2);
      msAcc += performance.now() - t0;
    });
  }

  /* ---------- order book ladder ---------- */
  const dom = document.getElementById('dom');
  if (dom) {
    const s = fit(dom);
    const book = new Map();
    const flash = new Map();
    const sizeAt = (p) => {
      if (!book.has(p)) book.set(p, 5 + Math.random() * 60);
      return book.get(p);
    };
    let lastPrint = null;
    market.on(({ price, size, side, t }) => { lastPrint = { price, side, t }; book.set(price, Math.max(1, sizeAt(price) - size)); });
    let churn = 0;
    loop(dom, (dt) => {
      pump(dt);
      churn += dt;
      if (churn > 0.05) {
        churn = 0;
        for (let i = 0; i < 4; i++) {
          const p = market.price + Math.round((Math.random() - 0.5) * 30) * market.TICK;
          book.set(p, Math.max(1, sizeAt(p) + (Math.random() - 0.45) * 18));
          flash.set(p, performance.now());
        }
      }
    }, (now = performance.now()) => {
      const { ctx, w, h } = s;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
      const rows = Math.floor(h / 22), rh = h / rows, mid = market.price;
      const colW = w / 3;
      ctx.font = `12px ${MONO}`; ctx.textBaseline = 'middle';
      ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      ctx.fillText('BID', colW / 2, rh / 2); ctx.fillText('PRICE', w / 2, rh / 2); ctx.fillText('ASK', w - colW / 2, rh / 2);
      for (let r = 1; r < rows; r++) {
        const p = mid + (Math.floor(rows / 2) - r) * market.TICK;
        const yy = r * rh, isAsk = p > mid, isBid = p < mid;
        const sz = sizeAt(p), bar = Math.min(1, sz / 90) * (colW - 12);
        const f = flash.get(p), fl = f ? Math.max(0, 1 - (now - f) / 300) : 0;
        if (p === mid) { ctx.fillStyle = 'rgba(240,199,102,0.12)'; ctx.fillRect(0, yy, w, rh); }
        if (isBid) { ctx.fillStyle = C.bullDeep; ctx.fillRect(colW - 6 - bar, yy + 3, bar, rh - 6); }
        if (isAsk) { ctx.fillStyle = C.bearDeep; ctx.fillRect(w - colW + 6, yy + 3, bar, rh - 6); }
        if (fl) { ctx.fillStyle = `rgba(255,255,255,${0.12 * fl})`; ctx.fillRect(isBid ? 0 : w - colW, yy, colW, rh); }
        ctx.textAlign = 'center';
        ctx.fillStyle = p === mid ? C.gold : C.soft;
        ctx.fillText(p.toFixed(2), w / 2, yy + rh / 2);
        ctx.fillStyle = isBid ? C.bull : isAsk ? C.bear : C.muted;
        if (isBid) { ctx.textAlign = 'right'; ctx.fillText(String(Math.round(sz)), colW - 12, yy + rh / 2); }
        if (isAsk) { ctx.textAlign = 'left'; ctx.fillText(String(Math.round(sz)), w - colW + 12, yy + rh / 2); }
        if (lastPrint && lastPrint.price === p && now - lastPrint.t < 400) {
          ctx.strokeStyle = lastPrint.side === 'buy' ? C.bull : C.bear; ctx.lineWidth = 1.5;
          ctx.strokeRect(colW + 4, yy + 2, colW - 8, rh - 4);
        }
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, Math.round(yy) + 0.5); ctx.lineTo(w, Math.round(yy) + 0.5); ctx.stroke();
      }
      ctx.textAlign = 'left';
    });
  }

  /* ---------- time & sales tape ---------- */
  const tape = document.getElementById('tape');
  if (tape) {
    const s = fit(tape);
    const prints = [];
    market.on((p) => { prints.unshift({ ...p, at: new Date() }); if (prints.length > 60) prints.pop(); });
    loop(tape, (dt) => pump(dt), (now = performance.now()) => {
      const { ctx, w, h } = s;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
      const rh = 24, rows = Math.floor(h / rh);
      ctx.font = `12px ${MONO}`; ctx.textBaseline = 'middle';
      ctx.fillStyle = C.muted;
      ctx.fillText('TIME', 14, rh / 2); ctx.fillText('PRICE', w * 0.42, rh / 2); ctx.fillText('SIZE', w * 0.72, rh / 2);
      let buy = 0, sell = 0;
      prints.forEach((p) => { if (p.side === 'buy') buy += p.size; else sell += p.size; });
      prints.slice(0, rows - 2).forEach((p, i) => {
        const yy = (i + 1) * rh, big = p.size >= 20, age = Math.max(0, 1 - (now - p.t) / 250);
        const col = p.side === 'buy' ? C.bull : C.bear;
        if (big) { ctx.fillStyle = p.side === 'buy' ? 'rgba(52,200,138,0.16)' : 'rgba(224,82,94,0.16)'; ctx.fillRect(0, yy, w, rh); }
        if (age) { ctx.fillStyle = `rgba(255,255,255,${0.1 * age})`; ctx.fillRect(0, yy, w, rh); }
        ctx.fillStyle = C.muted;
        ctx.fillText(p.at.toTimeString().slice(0, 8) + '.' + String(p.at.getMilliseconds()).padStart(3, '0'), 14, yy + rh / 2);
        ctx.fillStyle = col;
        ctx.fillText(p.price.toFixed(2), w * 0.42, yy + rh / 2);
        ctx.fillStyle = big ? C.gold : col;
        ctx.fillText(String(p.size), w * 0.72, yy + rh / 2);
      });
      // buy/sell pressure bar
      const tot = buy + sell || 1, by = h - rh + 6;
      ctx.fillStyle = C.bull; ctx.fillRect(14, by, (w - 28) * (buy / tot), 8);
      ctx.fillStyle = C.bear; ctx.fillRect(14 + (w - 28) * (buy / tot), by, (w - 28) * (sell / tot), 8);
    });
  }

  /* ---------- drifting price numbers behind the hero ---------- */
  const tb = document.getElementById('ticker-bg');
  if (tb && !reduced) {
    for (let i = 0; i < 26; i++) {
      const sp = document.createElement('span');
      sp.textContent = (21300 + Math.random() * 160).toFixed(2);
      sp.style.left = Math.random() * 100 + '%';
      sp.style.top = 10 + Math.random() * 85 + '%';
      sp.style.animationDuration = 6 + Math.random() * 8 + 's';
      sp.style.animationDelay = -Math.random() * 10 + 's';
      tb.appendChild(sp);
    }
  }

  /* ---------- tilt images toward the cursor ---------- */
  if (!reduced && matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.tilt').forEach((el) => {
      const img = el.querySelector('img');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        img.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 10 + 'deg');
        img.style.setProperty('--rx', -((e.clientY - r.top) / r.height - 0.5) * 8 + 'deg');
      });
      el.addEventListener('pointerleave', () => { img.style.setProperty('--rx', '0deg'); img.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- reveals + counters ---------- */
  const count = (el) => {
    const to = +el.dataset.count, dec = +(el.dataset.decimals || 0);
    const pre = el.dataset.prefix ? el.dataset.prefix.replace('&lt;', '<') : '', suf = el.dataset.suffix || '';
    if (reduced || !to) return;
    const t0 = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / 1300), e = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + (to * e).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      if (k < 1) setTimeout(tick, 30);
    };
    tick();
  };
  const pending = new Set(document.querySelectorAll('.reveal'));
  const show = (el) => { if (!pending.delete(el)) return; el.classList.add('in'); el.querySelectorAll('[data-count]').forEach(count); };
  const sweep = () => pending.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight - 40) show(el); });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && show(e.target)), { threshold: 0.15 });
    pending.forEach((el) => io.observe(el));
  }
  addEventListener('scroll', () => setTimeout(sweep, 100), { passive: true });
  addEventListener('load', sweep);
  sweep();
})();

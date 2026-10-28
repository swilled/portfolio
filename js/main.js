(() => {
  document.documentElement.classList.add('js');
  const LINKS = {
    resume: 'assets/resume.pdf',
    email: 'mailto:pranav.sivakumar@ufl.edu',
    github: 'https://github.com/swilled',
    linkedin: 'https://www.linkedin.com/in/pranavsivakumar',
  };
  const PALETTE = {
    o: '#07050c',
    h0: '#5a4840', h1: '#2a1f1a', h2: '#1c1411', h3: '#0f0b09',
    s0: '#b67f55', s1: '#966240', s2: '#7a4b2f', s3: '#5c3720',
    t0: '#ffffff', t1: '#f2eee8', t2: '#d9d2c8', t3: '#b5aca1',
    p0: '#5b4a80', p1: '#463866', p2: '#33284d', p3: '#221a35',
    f0: '#ffffff', f1: '#f2eee8', f2: '#d9d2c8', f3: '#ff6fa5',
  };
  // outfits only override the colours they change
  const OUTFITS = {
    normal: {},
    gators: { t0: '#5d7bf2', t1: '#2449d8', t2: '#1b37a8', t3: '#13287a', f3: '#fa4616' },
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (list) => list[(Math.random() * list.length) | 0];

  document.querySelectorAll('[data-uf]').forEach((el) => { if (window.ufLogo) el.innerHTML = ufLogo(); });
  document.querySelectorAll('[data-logo]').forEach((el) => { if (window.companyLogo) el.innerHTML = companyLogo(el.dataset.logo); });
  document.querySelectorAll('.dicon[data-icon]').forEach((el) => { if (window.pixelIcon) el.insertAdjacentHTML('afterbegin', pixelIcon(el.dataset.icon)); });

  /* ---------- night (terminal) / day (printout) ---------- */
  const root = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const syncThemeMeta = () => { if (themeMeta) themeMeta.content = root.dataset.theme === 'light' ? '#f7f3ea' : '#0f0c16'; };
  syncThemeMeta();
  const setTheme = (next) => {
    if (next === root.dataset.theme) return;
    const apply = () => { root.dataset.theme = next; syncThemeMeta(); document.dispatchEvent(new Event('themechange')); };
    store.set('theme', next);
    // either direction, the new page wipes in top to bottom in pixel steps
    if (!document.startViewTransition || reducedMotion) { apply(); return; }
    root.classList.add('theming');
    document.startViewTransition(apply).finished.finally(() => root.classList.remove('theming'));
  };
  const themeBtn = document.getElementById('theme');
  if (themeBtn) themeBtn.addEventListener('click', () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light'));

  /* ---------- confetti, for the few things that deserve it ---------- */
  const confetti = (colors = ['#ffb547', '#ff6fa5', '#8fa8ff', '#c7a6f0', '#ede6f5']) => {
    if (reducedMotion) return;
    const c = document.createElement('canvas');
    c.className = 'confetti';
    document.body.appendChild(c);
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    const bits = Array.from({ length: 180 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 900, vy: -300 - Math.random() * 700,
      s: 4 + ((Math.random() * 3) | 0) * 2, col: pick(colors),
    }));
    let last = performance.now(), age = 0;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; age += dt;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2.2) / 0.8);
      bits.forEach((b) => {
        b.vy += 1400 * dt; b.vx *= 0.99; b.x += b.vx * dt; b.y += b.vy * dt;
        ctx.fillStyle = b.col;
        ctx.fillRect(Math.round(b.x / 2) * 2, Math.round(b.y / 2) * 2, b.s, b.s);
      });
      if (age < 3) requestAnimationFrame(tick); else c.remove();
    };
    requestAnimationFrame(tick);
  };

  /* ---------- avatar: poses ---------- */
  const svg = document.getElementById('avatar');
  const rig = document.getElementById('rig');
  const avatarBox = document.querySelector('.hero-avatar');
  const groundEl = avatarBox && avatarBox.querySelector('.ground');
  const bubble = document.getElementById('bubble');
  const heroBg = document.getElementById('hero-bg');
  const NS = 'http://www.w3.org/2000/svg';
  const poses = {};
  let hatG = null;
  if (svg && typeof sprite === 'function') {
    svg.setAttribute('viewBox', '0 0 28 75');
    const build = (name, grid) => {
      const g = document.createElementNS(NS, 'g');
      for (const [key, d] of Object.entries(toPaths(grid, 1, 0, 0))) {
        if (!d || !PALETTE[key]) continue;
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d);
        p.dataset.k = key;
        g.appendChild(p);
      }
      svg.appendChild(g);
      poses[name] = g;
    };
    build('stand', sprite(false));
    build('wave', sprite(true));
    build('wave2', spriteWave2());
    build('shrug', spriteShrug());
    const HAT = { w: '#f2eee8', r1: '#d6334a', r2: '#a32238' };
    hatG = document.createElementNS(NS, 'g');
    santaHat().forEach(([x, y, k]) => {
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', 1); r.setAttribute('height', 1); r.setAttribute('fill', HAT[k]);
      hatG.appendChild(r);
    });
    hatG.style.display = 'none';
    svg.appendChild(hatG);
  }
  let outfit = 'normal';
  const setOutfit = (name) => {
    outfit = name;
    if (svg) svg.querySelectorAll('path[data-k]').forEach((p) => p.setAttribute('fill', (OUTFITS[name] || {})[p.dataset.k] || PALETTE[p.dataset.k]));
  };
  const setHat = (on) => { if (hatG) hatG.style.display = on ? '' : 'none'; };
  const pose = (name) => { for (const [k, g] of Object.entries(poses)) g.style.display = k === name ? '' : 'none'; };
  pose('stand');
  setOutfit('normal');

  // the calendar dresses him: gator blue on fall Saturdays, a santa hat in december
  const today = new Date();
  const gameday = today.getDay() === 6 && today.getMonth() >= 8 && today.getMonth() <= 10;
  const december = today.getMonth() === 11;
  if (gameday) setOutfit('gators');
  if (december) setHat(true);

  /* ---------- avatar: a typed speech bubble ---------- */
  let bubbleTimer = null, typeTimer = null;
  const speak = (text, ms = 2400) => {
    if (!bubble) return;
    clearTimeout(bubbleTimer); clearInterval(typeTimer);
    bubble.classList.remove('show');
    void bubble.offsetWidth;
    bubble.textContent = reducedMotion ? text : '';
    bubble.classList.add('show');
    if (!reducedMotion) {
      let i = 0;
      typeTimer = setInterval(() => { bubble.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typeTimer); }, 22);
    }
    if (ms) bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms + text.length * 22);
  };

  /* ---------- avatar: a little physics, so he moves like he has weight ---------- */
  const S = { x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, rotT: 0, sq: 0, vsq: 0, held: false, thrown: false, zoom: 0, origin: '50% 100%' };
  let simOn = false, lastT = 0;
  // the physics runs smoothly, but he's drawn like a sprite: moves snap to his own pixel grid,
  // turns snap to 15 degrees, squash comes in whole pixels, and frames land on twos (12fps)
  let lastDraw = 0;
  const render = (force) => {
    if (!rig) return;
    const now = performance.now();
    if (!force && now - lastDraw < 83) return;
    lastDraw = now;
    const unit = (svg.getBoundingClientRect().height / 75) || 6;
    const snap = (v) => Math.round(v / unit) * unit;
    const x = snap(S.x), y = snap(S.y), rot = Math.round(S.rot / 15) * 15;
    const sq = Math.round(clamp(S.sq, -0.25, 0.3) * 75) / 75;
    rig.style.transformOrigin = S.origin;
    rig.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${(1 + sq * 0.6).toFixed(3)}, ${(1 - sq).toFixed(3)})`;
    if (bubble) bubble.style.translate = `${x}px ${y}px`;
    if (groundEl) {
      const lift = clamp(-y / 260, 0, 1);
      groundEl.style.transform = `translateX(${snap(S.x * 0.9)}px) scaleX(${(Math.round((1 - lift * 0.55) * 8) / 8).toFixed(3)})`;
      groundEl.style.opacity = lift > 0.3 ? 0.4 : 1;
    }
  };
  const land = (v) => {
    S.vsq += clamp(v / 260, 1, 7);
    if (S.thrown) {
      S.thrown = false;
      setTimeout(() => speak(pick(['ow. i\'m good.', 'nailed the landing', 'again!'])), 250);
    }
  };
  // the hero is his room: throws bounce off its walls and ceiling instead of vanishing behind them
  const heroEl = document.getElementById('top');
  const bounds = () => {
    const hb = heroEl.getBoundingClientRect(), bb = avatarBox.getBoundingClientRect();
    return { l: hb.left - bb.left + 8, r: hb.right - bb.right - 8, t: hb.top - bb.top + 40 };
  };
  const step = (now) => {
    const dt = Math.min(0.033, (now - lastT) / 1000 || 0.016);
    lastT = now;
    if (S.held) {
      S.rot += (clamp(S.vx * 0.025, -40, 40) - S.rot) * Math.min(1, dt * 9);
      S.vsq += (-S.sq * 320 - S.vsq * 16) * dt; S.sq += S.vsq * dt;
    } else {
      if (S.zoom === 1) {
        // f1: accelerate off the right edge, then come back in from the left
        S.vx = Math.min(4200, S.vx + 6000 * dt); S.x += S.vx * dt;
        if (rig.getBoundingClientRect().left > innerWidth) { S.zoom = 2; S.x = -rig.getBoundingClientRect().right + S.x - 60; S.vx = 2600; }
      } else {
        S.vx += (-70 * S.x - 12 * S.vx) * dt; S.x += S.vx * dt;
      }
      if (S.y < 0 || S.vy < 0) {
        S.vy += 2700 * dt; S.y += S.vy * dt;
        if (S.y >= 0) { const v = S.vy; S.y = 0; S.vy = 0; land(v); }
      } else if (S.y > 0) { S.y += -S.y * Math.min(1, dt * 14); S.vy = 0; }
      // lean into horizontal motion, spring back upright
      const lean = S.zoom ? clamp(S.vx * 0.006, -14, 14) : clamp(-S.vx * 0.012, -18, 18);
      S.vr += (-(S.rot - (S.rotT + lean)) * 140 - S.vr * 13) * dt; S.rot += S.vr * dt;
      if (Math.abs(S.rotT) >= 360 && Math.abs(S.rot - S.rotT) < 4 && Math.abs(S.vr) < 40) { S.rot -= S.rotT; S.rotT = 0; }
      S.vsq += (-S.sq * 320 - S.vsq * 16) * dt; S.sq += S.vsq * dt;
      if (S.zoom === 2 && Math.abs(S.x) < 4 && Math.abs(S.vx) < 30) S.zoom = 0;
      if (!S.zoom) {
        const b = bounds();
        if (S.x < b.l) { S.x = b.l; S.vx = Math.abs(S.vx) * 0.45; S.vr += 120; S.vsq -= 2; }
        if (S.x > b.r) { S.x = b.r; S.vx = -Math.abs(S.vx) * 0.45; S.vr -= 120; S.vsq -= 2; }
        if (S.y < b.t) { S.y = b.t; S.vy = Math.abs(S.vy) * 0.4; S.vsq += 2; }
      }
    }
    render();
    const still = !S.held && !S.zoom && S.y === 0 && Math.abs(S.x) < 0.3 && Math.abs(S.vx) < 2 && Math.abs(S.rot - S.rotT) < 0.2 && Math.abs(S.vr) < 1 && Math.abs(S.sq) < 0.003 && Math.abs(S.vsq) < 0.05;
    if (still) { S.x = 0; S.rot = S.rotT; S.sq = 0; S.vsq = 0; S.vx = 0; S.vr = 0; render(true); simOn = false; return; }
    requestAnimationFrame(step);
  };
  const kick = () => { if (reducedMotion || simOn) return; simOn = true; lastT = performance.now(); requestAnimationFrame(step); };
  const airborne = () => S.y < -1 || S.vy < 0;
  const jump = (power = 900) => {
    if (reducedMotion || airborne() || S.held) return;
    S.vsq += 4; kick(); // crouch first
    setTimeout(() => { S.vy = -power; S.vsq -= 9; kick(); }, 110);
  };
  const ripple = () => {
    if (!heroBg || !heroBg.ripple || !svg) return;
    const r = svg.getBoundingClientRect();
    heroBg.ripple(r.left + r.width * 0.85, r.top + r.height * 0.08);
  };
  let waving = null, posing = null;
  const wave = (times = 3, text) => {
    if (!poses.wave) return;
    if (text) speak(text);
    ripple();
    clearInterval(waving); clearTimeout(posing);
    if (reducedMotion) { pose('wave'); return; }
    let n = times * 2;
    pose('wave');
    waving = setInterval(() => {
      n -= 1;
      pose(n % 2 ? 'wave2' : 'wave');
      S.rotT = n % 2 ? 1.2 : -0.6; kick();
      if (n <= 0) { clearInterval(waving); pose('stand'); S.rotT = 0; kick(); }
    }, 170);
  };
  const hold = (name, ms) => { clearInterval(waving); clearTimeout(posing); pose(name); posing = setTimeout(() => pose('stand'), ms); };

  // first hello depends on the time of day, the calendar, and whether you've been here before
  const visits = +(store.get('visits') || 0) + 1;
  store.set('visits', visits);
  const hour = today.getHours();
  const hello = gameday ? 'go gators! i\'m pranav.' : december ? 'happy holidays! i\'m pranav.' : visits > 1 ? 'welcome back!'
    : hour < 5 ? 'up late? i\'m pranav.' : hour < 12 ? 'good morning! i\'m pranav.' : hour >= 18 ? 'evening! i\'m pranav.' : 'hey, i\'m pranav!';
  setTimeout(() => wave(3, hello), 900);

  /* ---------- avatar: clicking him, and picking him up ---------- */
  let pokes = 0, pokeTimer = null;
  const poke = () => {
    pokes += 1;
    clearTimeout(pokeTimer);
    pokeTimer = setTimeout(() => { pokes = 0; }, 2000);
    if (pokes === 1) wave(2, pick(['hi!', 'hey there', 'yo', 'hello!']));
    else if (pokes === 3) { jump(); speak('whoa'); }
    else if (pokes === 5) { jump(1150); S.rotT -= 360; speak('ta-da'); }
    else if (pokes === 8) { hold('shrug', 1600); speak('i\'m telling HR'); }
    else if (pokes === 12) {
      speak('ok. i\'m done.');
      S.rotT = -86; kick();
      setTimeout(() => { S.rotT = 0; jump(500); speak('kidding. hi.'); }, 1700);
    }
  };
  let grab = null;
  if (svg && avatarBox) {
    svg.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      grab = { px: e.clientX, py: e.clientY, ox: S.x, oy: S.y, lx: e.clientX, ly: e.clientY, lt: performance.now(), moved: false, fy: (e.clientY - r.top) / r.height };
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    });
    svg.addEventListener('pointermove', (e) => {
      if (!grab) return;
      const dx = e.clientX - grab.px, dy = e.clientY - grab.py;
      if (!grab.moved && Math.hypot(dx, dy) > 6) {
        grab.moved = true;
        S.held = true;
        S.origin = `50% ${Math.round(grab.fy * 100)}%`;
        clearInterval(waving);
        pose('shrug');
        avatarBox.classList.add('held');
        speak(pick(['hey! put me down', 'whoa whoa whoa', 'where are we going?']), 0);
        kick();
      }
      if (!grab.moved) return;
      const now = performance.now(), dtp = Math.max(8, now - grab.lt) / 1000;
      S.vx = S.vx * 0.5 + ((e.clientX - grab.lx) / dtp) * 0.5;
      S.vy = S.vy * 0.5 + ((e.clientY - grab.ly) / dtp) * 0.5;
      grab.lx = e.clientX; grab.ly = e.clientY; grab.lt = now;
      const b = bounds();
      S.x = clamp(grab.ox + dx, b.l, b.r); S.y = clamp(grab.oy + dy, b.t, 40);
    });
    const drop = () => {
      if (!grab) return;
      const g = grab;
      grab = null;
      if (!g.moved) { poke(); return; }
      S.held = false;
      S.origin = '50% 100%';
      avatarBox.classList.remove('held');
      pose('stand');
      S.vx = clamp(S.vx, -2600, 2600); S.vy = clamp(S.vy, -2600, 2600);
      S.vr = S.vx * 0.15;
      const speed = Math.hypot(S.vx, S.vy);
      S.thrown = speed > 1300;
      speak(S.thrown ? 'wheeeee' : pick(['thanks, i guess', 'smooth', 'ok that was fun']), 1600);
      kick();
    };
    svg.addEventListener('pointerup', drop);
    svg.addEventListener('pointercancel', drop);
    svg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); } });
    // a small hop when you first hover him
    let hopReady = 0;
    svg.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse' || Date.now() < hopReady) return; hopReady = Date.now() + 5000; jump(320); });
  }
  // he notices what you're about to click
  const HOVERS = [['.hero a[href$="resume.pdf"]', 'one page, promise'], ['.hero [data-link="github"]', 'most of my work lives here'], ['.hero [data-link="email"]', 'i reply fast'], ['.hero [data-link="linkedin"]', 'let\'s connect']];
  HOVERS.forEach((entry) => { const node = document.querySelector(entry[0]); if (node) node.addEventListener('mouseenter', () => speak(entry[1], 1400)); });
  // and gets a little restless if nobody does anything
  const IDLE = ['still there?', 'psst: try typing help below', 'you can pick me up, btw'];
  let lastInput = Date.now(), idleSaid = 0;
  ['pointermove', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true }));
  setInterval(() => {
    if (idleSaid >= IDLE.length || Date.now() - lastInput < 25000 || document.hidden || !svg) return;
    if (svg.getBoundingClientRect().bottom < 0) return;
    speak(IDLE[idleSaid++], 3000);
    if (idleSaid === 1) jump(260);
    lastInput = Date.now();
  }, 4000);

  // ↑ ↑ ↓ ↓ ← → ← → b a
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kpos = 0;
  const cheat = () => {
    document.getElementById('top').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    confetti();
    speak('cheat code accepted. +30 lives', 3000);
    if (avatarBox) { avatarBox.classList.add('rainbow'); setTimeout(() => avatarBox.classList.remove('rainbow'), 8000); }
    setTimeout(() => { jump(1150); S.rotT -= 360; }, 300);
  };
  document.addEventListener('keydown', (e) => {
    kpos = e.key === KONAMI[kpos] ? kpos + 1 : e.key === KONAMI[0] ? 1 : 0;
    if (kpos === KONAMI.length) { kpos = 0; cheat(); }
  });

  /* ---------- canvases ---------- */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  const say = (html, ms = 4200) => {
    toastEl.innerHTML = html;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  };
  // the desktop's trash can
  const TRASH = ['trash is empty. bad ideas go to hypothesize instead.', 'still empty.', 'you really like this trash can.', 'ok fine: 🗑 one (1) unused css variable.'];
  let trashN = 0;
  const trashBtn = document.getElementById('trash');
  if (trashBtn) trashBtn.addEventListener('click', () => say(TRASH[Math.min(trashN++, TRASH.length - 1)], 2600));

  if (window.fx) {
    if (heroBg) fx.glow(heroBg);
    const hyp = document.getElementById('viz-hypothesize');
    if (hyp) fx.hypothesize(hyp);
    const funnel = document.getElementById('velo-funnel');
    if (funnel) fx.velo(funnel);
    const spo = document.getElementById('viz-spotifind');
    if (spo) fx.spotifind(spo);
    const campus = document.getElementById('campus');
    if (campus) {
      let chomps = 0;
      fx.campus(campus, {
        onGator: () => { chomps++; say(chomps >= 3 ? 'the gator has had enough of you.' : 'chomp. <b>go gators.</b>', 2400); if (chomps === 3) confetti(['#fa4616', '#2449d8', '#f2eee8']); },
        onTower: () => say(`Century Tower says it's <b>${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</b>. it's right.`, 3000),
      });
    }
    document.querySelectorAll('[data-scramble]').forEach((el, i) => fx.scramble(el, { duration: 900, delay: 300 + i * 250 }));
  }

  // tree ~/life: days until the Rainier window opens
  document.querySelectorAll('[data-rainier]').forEach((el) => {
    const days = Math.ceil((new Date('2027-06-15T00:00:00') - new Date()) / 864e5);
    if (days > 0) el.textContent = `${days} days`;
  });

  /* ---------- the intro is a conversation with him ---------- */
  const chatLog = document.getElementById('chat-log');
  if (chatLog) chatLog.addEventListener('scroll', () => chatLog.classList.toggle('scrolled', chatLog.scrollTop > 4), { passive: true });
  const MAIL = '<a href="mailto:pranav.sivakumar@ufl.edu">pranav.sivakumar@ufl.edu</a>';
  const ANSWERS = {
    hi: "hey! ask me about what i've built, my stack, or how i use AI.",
    built: 'five things worth showing. Speed draws live market data at 240Hz, Blip lets blind and low-vision people use the web by voice, GEXLab is an options-data workbench, Hypothesize is an LLM research pipeline, and Spotifind recommends music by sound.',
    stack: 'python, typescript, rust and sql every day. react and next.js for interfaces, fastapi on the backend, tauri for desktop, polars and pandas for data. the <a href="#stack">full list</a> is right below, and this is what using it looks like:',
    commits: 'very. here are the last twelve months, live from github:',
    ai: 'constantly. i built MCP servers at Intellizence that put their data inside AI assistants, and Hypothesize uses LLMs to read research and turn claims into testable rules. what i build with:',
    background: 'double major at UF, and this past summer i was a research intern at Intellizence. the <a href="#experience">rest is here</a>.',
    fun: 'pickleball, mountaineering, formula 1, video games, lifting, alt, rap and house. there\'s a <a href="life/">whole page for it</a>. the big one right now:',
    resume: 'one page, promise.',
    contact: `email is best: ${MAIL}. i'm also on <a href="https://www.linkedin.com/in/pranavsivakumar" target="_blank" rel="noopener">linkedin</a> and <a href="https://github.com/swilled" target="_blank" rel="noopener">github</a>.`,
    hire: `let's talk: ${MAIL}. my <a href="assets/resume.pdf" target="_blank" rel="noopener">résumé</a> has the short version.`,
    experience: 'most recent first. <a href="#experience">details</a> are further down.',
    gators: 'go gators! 🐊',
    who: "i'm pranav. well, a pixel version of him. the real one studies data science + economics at UF and builds software.",
    unknown: `i'm the pixel version, so my vocabulary's small. try one of the questions above, or ask the real me: ${MAIL}.`,
  };
  const ROUTES = [
    [/\b(go gators|gators?|chomp)\b/, 'gators'],
    [/\b(hi|hey|hello|yo|sup|hiya)\b/, 'hi'],
    [/(r[ée]sum[ée]|\bcv\b)/, 'resume'],
    [/(intern|hire|hiring|job|position|role|available)/, 'hire'],
    [/(email|contact|reach|linkedin|github|talk to you)/, 'contact'],
    [/(experience|intellizence|amazon|tutor|policycon|worked)/, 'experience'],
    [/(built|build|project|made|make|speed|blip|gexlab|hypothesize|spotifind|portfolio|work on)/, 'built'],
    [/\b(ai|llm|llms|claude|codex|gpt|openai|mcp|agents?|prompt)\b/, 'ai'],
    [/(commit|github|contribution|active|how much do you code|streak)/, 'commits'],
    [/(stack|language|tech|tools|python|rust|typescript|react|framework|code|program)/, 'stack'],
    [/(fun|hobb|free time|weekend|enjoy|like to do|music|sport|climb|mountain|hike|rainier)/, 'fun'],
    [/(school|uf\b|florida|major|stud|degree|class of|year|background|education|college)/, 'background'],
    [/(who are you|your name|are you real|about you|yourself)/, 'who'],
  ];
  /* ---------- answers can carry a picture: a live github calendar, a mountain, the projects, ... ---------- */
  const GH_USER = 'swilled';
  let ghPromise = null;
  // contribution data comes from a public mirror of the github calendar, so there's no token in the page
  // if the mirror is down: the last answer this browser saw, then the copy saved at deploy (tools/snapshot.py), dated
  const ghLive = () => Promise.all([
    fetch(`https://github-contributions-api.jogruber.de/v4/${GH_USER}?y=last`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    fetch(`https://github-contributions-api.jogruber.de/v4/${GH_USER}?y=${new Date().getFullYear()}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]).then((v) => { store.set('gh-last', JSON.stringify({ at: new Date().toISOString().slice(0, 10), v })); return { v }; });
  const ghSaved = () => {
    try { const c = JSON.parse(store.get('gh-last')); if (c && c.v) return Promise.resolve({ v: c.v, asOf: c.at }); } catch (e) { /* bad copy */ }
    return fetch('assets/snapshot.json').then((r) => r.json()).then((s) => ({ v: [s.github.last, s.github.year], asOf: s.taken }));
  };
  const github = () => ghPromise || (ghPromise = ghLive().catch(ghSaved).then(({ v: [last, year], asOf }) => ({
    days: last.contributions,
    lastYear: last.total.lastYear ?? last.contributions.reduce((a, d) => a + d.count, 0),
    thisYear: year ? year.total[new Date().getFullYear()] : null,
    asOf,
  })).catch(() => null));
  const asOfLabel = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
  const fmtN = (n) => n.toLocaleString('en-US');
  // the hero's github hover quotes the live count instead of a number that goes stale
  github().then((d) => { const h = HOVERS.find(([sel]) => sel.includes('github')); if (d && h) h[1] = `${fmtN(d.lastYear)} contributions this past year`; });
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const CARDS = {
    commits: () => {
      const card = el('a', 'acard cal');
      card.href = `https://github.com/${GH_USER}`; card.target = '_blank'; card.rel = 'noopener';
      card.innerHTML = '<p class="acard-head"><span>github.com/swilled</span><span class="cal-total">loading…</span></p><div class="cal-grid" aria-hidden="true"></div><p class="acard-foot"><span>less</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>more</span></p>';
      const grid = card.querySelector('.cal-grid'), total = card.querySelector('.cal-total');
      github().then((d) => {
        if (!d) { total.textContent = 'github is being shy, try again later'; return; }
        total.textContent = d.asOf ? `${fmtN(d.lastYear)} in the year to ${asOfLabel(d.asOf)} · github's feed is down, this is the last copy`
          : `${fmtN(d.lastYear)} in the last year${d.thisYear ? ` · ${fmtN(d.thisYear)} in ${new Date().getFullYear()}` : ''}`;
        const pad = new Date(d.days[0].date + 'T00:00:00').getDay();
        let html = '<i class="pad"></i>'.repeat(pad);
        d.days.forEach((day) => { html += `<i class="l${day.level}" title="${day.count} on ${day.date}"></i>`; });
        grid.innerHTML = html;
        grid.scrollLeft = grid.scrollWidth;
      });
      return card;
    },
    stack: () => CARDS.commits(),
    fun: () => {
      const card = el('div', 'acard peak');
      const c = el('canvas');
      card.append(c, el('p', 'acard-foot', '<b>mt rainier</b> · 14,411 ft · <span class="amber">looking to summit next summer</span>'));
      setTimeout(() => drawRainier(c), 0);
      return card;
    },
    built: () => {
      const card = el('div', 'acard thumbs');
      [['speed', 'Speed', 'speed/media/speed-poster.webp'], ['blip', 'Blip', 'blip/media/blip-poster.webp'], ['gexlab', 'GEXLab', 'gexlab/media/gexlab-poster.webp'],
        ['hypothesize', 'Hypothesize', '#viz-hypothesize'], ['spotifind', 'Spotifind', '#viz-spotifind']].forEach(([id, name, src]) => {
        const a = el('a', 'thumb');
        a.href = '#' + id;
        const cv = src.startsWith('#') ? document.querySelector(src) : null;
        a.style.backgroundImage = `url("${cv ? cv.toDataURL() : src}")`;
        a.append(el('span', '', name));
        card.appendChild(a);
      });
      return card;
    },
    ai: () => {
      const card = el('div', 'acard badges');
      [['claude', 'claude code'], ['openai', 'codex'], [null, 'antigravity'], ['mcp', 'mcp servers'], ['huggingface', 'hugging face']].forEach(([icon, label]) => {
        const b = el('span', 'badge');
        b.innerHTML = (icon && window.pixelIcon ? pixelIcon(icon) : '<b class="glyph">▲</b>') + `<span>${label}</span>`;
        card.appendChild(b);
      });
      return card;
    },
    background: () => {
      const card = el('div', 'acard school');
      card.innerHTML = `<span class="school-logo">${window.ufLogo ? ufLogo() : ''}</span><p><b>University of Florida</b><br>B.S. data science · B.S. economics<br><span class="dim">class of 2029 · gainesville, fl</span></p>`;
      return card;
    },
    experience: () => {
      const card = el('div', 'acard logos');
      [['intellizence', 'Intellizence', '2026'], ['amazon', 'Amazon', '2026'], ['tutoringclub', 'Tutoring Club', '2024–25'], ['policycon', 'PolicyCON', '2024']].forEach(([id, name, when]) => {
        const b = el('a', 'logo');
        b.href = '#experience';
        b.innerHTML = `${window.companyLogo ? companyLogo(id) : ''}<span>${name}</span><small>${when}</small>`;
        card.appendChild(b);
      });
      return card;
    },
    resume: () => {
      const card = el('a', 'acard doc');
      card.href = LINKS.resume; card.target = '_blank'; card.rel = 'noopener';
      card.innerHTML = '<span class="page" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><span><b>resume.pdf</b><br><span class="dim">1 page · click to print it out</span></span>';
      return card;
    },
  };
  CARDS.hire = CARDS.resume;
  // the github hover line in the hero uses the live number when there is one
  github().then((d) => {
    if (!d) return;
    const line = HOVERS.find(([sel]) => sel.includes('github'));
    if (line) line[1] = `${fmtN(d.lastYear)} contributions this year`;
  });

  // Mt. Rainier, with a dotted route, a climber working up it, and a flag on top
  function drawRainier(c) {
    const S2 = 4, W = 84, H = 36;
    c.width = W * S2; c.height = H * S2;
    const ctx = c.getContext('2d');
    const h = (x) => {
      const peak = 30, px = 46;
      let v = x < px ? peak - (px - x) * 0.62 : peak - (x - px) * 0.78;
      if (x > 34 && x < 41) v += 2.2 * Math.sin(((x - 34) / 7) * Math.PI); // liberty cap
      return Math.max(0, v);
    };
    const hills = Array.from({ length: W }, (_, x) => 6 + Math.round(2.5 * Math.sin(x * 0.21) + 1.5 * Math.sin(x * 0.53 + 2)));
    const route = [[26, 9], [33, 13], [30, 17], [38, 21], [36, 25], [43, 28], [46, 30]];
    const stars = Array.from({ length: 22 }, (_, i) => [(i * 37) % W, (i * 11) % 14]);
    let t0 = performance.now();
    const frame = (now) => {
      if (!c.isConnected) return;
      const t = (now - t0) / 1000, day = root.dataset.theme === 'light';
      const P = day
        ? { star: null, hill: '#ddd4c0', rock: '#6e6676', shade: '#5a5262', snow: '#fffdf6', snowShade: '#d8cfbb', route: '#c4351d', flag: '#c4351d', man: '#1c1922' }
        : { star: '#6e6488', hill: '#2a2140', rock: '#463866', shade: '#33284d', snow: '#ede6f5', snowShade: '#b5aac9', route: '#ffb547', flag: '#ff6fa5', man: '#ffb547' };
      ctx.clearRect(0, 0, c.width, c.height);
      const px = (x, y, col, w = 1, hh = 1) => { ctx.fillStyle = col; ctx.fillRect(x * S2, y * S2, w * S2, hh * S2); };
      if (P.star) stars.forEach(([x, y], i) => { if (Math.sin(t * 2 + i) > -0.3) px(x, y, P.star); });
      for (let x = 0; x < W; x++) {
        const top = H - Math.round(h(x)), shaded = x > 46;
        for (let y = top; y < H; y++) {
          const alt = H - y, snowLine = 16 + Math.round(2 * Math.sin(x * 0.9) + 1.5 * Math.sin(x * 0.37 + 1));
          px(x, y, alt > snowLine ? (shaded ? P.snowShade : P.snow) : (shaded ? P.shade : P.rock));
        }
        px(x, H - hills[x], P.hill, 1, hills[x]);
      }
      // dotted route, then a climber that walks it every few seconds
      const pts = [];
      for (let i = 1; i < route.length; i++) {
        const [x0, y0] = route[i - 1], [x1, y1] = route[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let k = 0; k < n; k++) pts.push([Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n)]);
      }
      pts.forEach(([x, a], i) => { if (i % 2 === 0) px(x, H - a - 1, P.route); });
      const at = pts[Math.min(pts.length - 1, Math.floor(((t % 7) / 6) * pts.length))];
      px(at[0], H - at[1] - 3, P.man, 1, 2);
      // summit flag, flapping on twos
      const sx = 46, sy = H - 31;
      px(sx, sy - 4, P.man, 1, 4);
      const flap = Math.floor(t * 4) % 2;
      px(sx + 1, sy - 4, P.flag, 3, 1); px(sx + 1, sy - 3, P.flag, 2 + flap, 1);
      setTimeout(() => requestAnimationFrame(frame), 120);
    };
    requestAnimationFrame(frame);
  }

  // the latest picture sits beside the conversation, and stays empty until someone asks something
  const chatAtt = document.getElementById('chat-att');
  let chatBusy = false;
  // a few small bobs and hand moves while he "talks", on the same 12fps beat as everything else
  const talk = (ms) => {
    if (reducedMotion) return;
    const beats = Math.min(10, Math.ceil(ms / 260));
    for (let i = 0; i < beats; i++) {
      setTimeout(() => {
        S.vsq += i % 2 ? -2.2 : 2.2; kick();
        if (i % 3 === 1) { pose('wave2'); setTimeout(() => pose('stand'), 160); }
      }, i * 260);
    }
  };
  const addLine = (who, html) => {
    const li = document.createElement('li');
    li.className = who;
    li.innerHTML = `<span class="nick">${who === 'me' ? 'pranav' : 'you'}</span><span class="msg"></span>`;
    li.querySelector('.msg').innerHTML = html;
    chatLog.appendChild(li);
    chatLog.scrollTop = chatLog.scrollHeight;
    return li;
  };
  const answer = (key, asked) => {
    if (!chatLog || chatBusy) return;
    chatBusy = true;
    addLine('you', asked.replace(/[<>&]/g, ''));
    const li = addLine('me', '');
    li.classList.add('typing');
    const html = ANSWERS[key], plain = html.replace(/<[^>]+>/g, ''), msg = li.querySelector('.msg');
    const done = () => {
      li.classList.remove('typing');
      msg.innerHTML = html;
      const card = CARDS[key] && CARDS[key]();
      if (card && chatAtt) chatAtt.replaceChildren(card);
      chatLog.scrollTop = chatLog.scrollHeight;
      chatBusy = false;
    };
    if (key === 'gators') { setOutfit('gators'); jump(1000); confetti(['#fa4616', '#2449d8', '#f2eee8']); }
    if (key === 'hi') wave(2);
    if (reducedMotion) { done(); return; }
    // type it out as plain text, then swap in the version with links
    let i = 0;
    talk(plain.length * 14);
    setTimeout(function tick() {
      i = Math.min(plain.length, i + 3);
      msg.textContent = plain.slice(0, i);
      chatLog.scrollTop = chatLog.scrollHeight;
      if (i < plain.length) setTimeout(tick, 40); else done();
    }, 380);
  };
  document.querySelectorAll('#chat-asks button').forEach((b) => b.addEventListener('click', () => {
    if (chatBusy) return;
    b.classList.add('used');
    answer(b.dataset.ask, b.textContent);
  }));
  const chatForm = document.getElementById('chat-form'), chatQ = document.getElementById('chat-q');
  if (chatForm) chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = chatQ.value.trim();
    if (!q || chatBusy) return;
    chatQ.value = '';
    const hit = ROUTES.find(([re]) => re.test(q.toLowerCase()));
    answer(hit ? hit[1] : 'unknown', q);
  });

  /* ---------- ls -l: hovering a project shows what it looks like ---------- */
  const PEEK = { speed: 'speed/media/speed-poster.webp', blip: 'blip/media/blip-poster.webp', gexlab: 'gexlab/media/gexlab-poster.webp', hypothesize: '#viz-hypothesize', spotifind: '#viz-spotifind' };
  const peek = document.createElement('div');
  peek.className = 'peek';
  peek.setAttribute('aria-hidden', 'true');
  document.body.appendChild(peek);
  document.querySelectorAll('.ls a').forEach((a) => {
    const id = a.getAttribute('href').slice(1), src = PEEK[id];
    if (!src) return;
    a.addEventListener('mouseenter', () => {
      // the two live visualisations are snapshotted from their canvases, so the preview matches the theme
      const el = src.startsWith('#') ? document.querySelector(src) : null;
      const url = el ? el.toDataURL() : src;
      if (!url) return;
      peek.style.backgroundImage = `url("${url}")`;
      peek.classList.add('show');
    });
    a.addEventListener('mousemove', (e) => {
      const x = Math.min(e.clientX + 24, innerWidth - 316), y = Math.min(e.clientY + 18, innerHeight - 200);
      peek.style.left = x + 'px'; peek.style.top = y + 'px';
    });
    a.addEventListener('mouseleave', () => peek.classList.remove('show'));
  });

  /* ---------- tech marquee ---------- */
  const LABELS = { nextjs: 'next.js', nodejs: 'node.js', scikit: 'scikit-learn', cpp: 'c++', huggingface: 'hugging face' };
  const SPEED = 38; // px per second, same for every row
  document.querySelectorAll('.marquee').forEach((m, row) => {
    if (!window.pixelIcon) return;
    const names = m.dataset.icons.split(/\s+/);
    const track = document.createElement('div');
    track.className = 'marquee-track';
    const addSet = (hidden) => names.forEach((n) => {
      const item = document.createElement('div');
      item.className = 'tech';
      if (hidden) item.setAttribute('aria-hidden', 'true');
      item.innerHTML = `${pixelIcon(n)}<span>${LABELS[n] || n}</span>`;
      track.appendChild(item);
    });
    m.appendChild(track);
    // one half of the track has to be wider than the widest screen, or the row starts with a gap
    let sets = 0;
    addSet(false); sets++;
    const setWidth = track.scrollWidth;
    const need = Math.max(window.screen.width, window.innerWidth, 1600);
    while (track.scrollWidth < need) { addSet(true); sets++; }
    for (let i = 0; i < sets; i++) addSet(true);
    const half = setWidth * sets;
    track.style.setProperty('--dur', (half / SPEED).toFixed(1) + 's');
    // start each row part-way through its loop so the rows don't line up
    track.style.animationDelay = -((half / SPEED) * (0.2 + row * 0.27)).toFixed(1) + 's';
  });

  /* ---------- scroll reveals, typed prompts, count-ups ---------- */
  const typeIn = (el) => {
    if (el.dataset.typed) return;
    el.dataset.typed = '1';
    const text = el.textContent;
    if (reducedMotion) { el.classList.add('done'); return; }
    el.textContent = '';
    let i = 0;
    const tick = () => {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, 38 + Math.random() * 40);
      else setTimeout(() => el.classList.add('done'), 900);
    };
    setTimeout(tick, 150);
  };
  const countUp = (el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const to = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reducedMotion) return;
    const t0 = performance.now(), dur = 1200;
    const tick = (now) => {
      const k = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + Math.round(to * e).toLocaleString('en-US') + suf;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  typeIn(document.querySelector('.hero .typed'));
  setTimeout(() => document.querySelectorAll('.hero [data-count]').forEach(countUp), 700);
  const pending = new Set(document.querySelectorAll('.reveal'));
  const show = (el) => {
    if (!pending.delete(el)) return;
    el.classList.add('in');
    el.querySelectorAll('.typed').forEach(typeIn);
    el.querySelectorAll('[data-count]').forEach(countUp);
  };
  // reveal anything in (or already scrolled past) the viewport; a plain scroll check backs up the observer
  const sweep = () => { pending.forEach((el) => { if (el.getBoundingClientRect().top < window.innerHeight - 40) show(el); }); };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && show(e.target)), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    pending.forEach((el) => io.observe(el));
  }
  let sweepQueued = false;
  window.addEventListener('scroll', () => {
    if (sweepQueued) return;
    sweepQueued = true;
    setTimeout(() => { sweepQueued = false; sweep(); }, 120);
  }, { passive: true });
  window.addEventListener('load', sweep);
  sweep();

  /* ---------- scroll: the marquee speeds up with you, a tiny you walks along the status bar ---------- */
  const anims = [...document.querySelectorAll('.marquee-track')].map((t) => t.getAnimations && t.getAnimations()[0]).filter(Boolean);
  let vel = 0, lastY = window.scrollY, mqOn = false;
  const marqueeTick = () => {
    const dy = window.scrollY - lastY;
    lastY = window.scrollY;
    vel += (dy - vel) * 0.18;
    // scrolling up runs the rows backwards
    const rate = 1 + Math.max(-6, Math.min(7, vel * 0.3));
    anims.forEach((a) => { a.playbackRate = rate; });
    if (Math.abs(vel) > 0.05 || dy) requestAnimationFrame(marqueeTick);
    else { anims.forEach((a) => { a.playbackRate = 1; }); mqOn = false; }
  };

  const walker = document.getElementById('walker');
  const pct = document.getElementById('pct');
  // the little you in the status bar: walks when you scroll slowly, runs when you scroll fast, sits when you stop
  const MINI = {
    top: ['...hhhhh...', '..hhhhhhh..', '..hhhhhhhh.', '..hsssssh..', '...sssss...', '...sssss...', '....sss....', '.ttttttttt.', '.ttttttttt.'],
    arms: ['.sttttttts.', '.sttttttts.', '.s.ttttt.s.', '.s.ttttt.s.'],
    swing: ['.sttttttts.', 's.ttttttt.s', 's..ttttt..s', '...ttttt...'],
    up: ['.stttttttt.', '.stttttttt.', '.s.ttttt...', '.s.ttttt...'],
    pumpA: ['.stttttttss', 's.ttttttt..', 's..ttttt...', '...ttttt...'],
    pumpB: ['ssttttttts.', '..ttttttt.s', '...ttttt..s', '...ttttt...'],
    hips: ['...ppppp...'],
    stand: ['...pp.pp...', '...pp.pp...', '...pp.pp...', '...pp.pp...', '...ww.ww...', '...kk.kk...'],
    stride: ['...pp.pp...', '..pp...pp..', '..pp...pp..', '.pp.....pp.', '.ww.....ww.', '.kk.....kk.'],
    pass: ['....ppp....', '....pp.....', '....ppp....', '....p.pp...', '....w.ww...', '....k.kk...'],
    runA: ['...pp.pp...', 'kwpp...pp..', '........pp.', '.........pp', '.........ww', '.........kk'],
    runB: ['...ppppp...', '....pp.ppp.', '....pp...pk', '....pp.....', '....ww.....', '....kk.....'],
    sit: ['...pppppppw', '..........k'],
  };
  const w_lean = (d) => MINI.top.map((r, y) => (y > 6 ? r : d > 0 ? '.' + r.slice(0, 10) : r.slice(1) + '.'));
  const MINI_COL = { h: '#1c1411', s: '#966240', t: '#f2eee8', p: '#463866', w: '#ffffff', k: '#ff6fa5', o: '#07050c' };
  const blank = (n) => Array(n).fill('...........');
  const miniFrames = {
    stand: [...MINI.top, ...MINI.arms, ...MINI.hips, ...MINI.stand],
    walkA: [...MINI.top, ...MINI.swing, ...MINI.hips, ...MINI.stride],
    walkB: [...MINI.top, ...MINI.arms, ...MINI.hips, ...MINI.pass],
    runA: [...w_lean(1), ...MINI.pumpA, ...MINI.hips, ...MINI.runA],
    runB: [...w_lean(1), ...MINI.pumpB, ...MINI.hips, ...MINI.runB],
    skid: [...w_lean(-1), ...MINI.swing, ...MINI.hips, ...MINI.stride],
    sit: [...blank(4), ...MINI.top, ...MINI.arms, ...MINI.hips, ...MINI.sit],
    wave: [...MINI.top.map((r, y) => (y >= 2 && y <= 6 ? r.slice(0, 10) + 's' : r)), ...MINI.up, ...MINI.hips, ...MINI.stand],
  };
  let wsvg = null;
  if (walker) {
    const toSvg = (rows) => {
      const W = 13, H = rows.length + 2, cell = (x, y) => (rows[y - 1] && rows[y - 1][x - 1]) || '.';
      let out = '';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let c = cell(x, y);
        if (c === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => cell(x + dx, y + dy) !== '.')) c = 'o';
        if (c !== '.') out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${MINI_COL[c]}"/>`;
      }
      return out;
    };
    walker.innerHTML = '<svg viewBox="0 0 13 22" shape-rendering="crispEdges">' +
      Object.entries(miniFrames).map(([k, rows]) => `<g data-f="${k}">${toSvg(rows)}</g>`).join('') + '</svg>';
    wsvg = walker.firstChild;
  }
  let shown = '';
  const miniPose = (name) => { if (!walker || name === shown) return; shown = name; walker.querySelectorAll('g').forEach((g) => { g.style.display = g.dataset.f === name ? '' : 'none'; }); };
  miniPose('stand');
  const bar = walker && walker.parentElement;
  let facing = 1, wx = 8, prevY = window.scrollY;
  const progress = () => { const max = document.documentElement.scrollHeight - window.innerHeight; return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0; };
  const placeWalker = (p) => {
    if (!walker) return;
    wx = Math.round(8 + p * (bar.clientWidth - 40));
    walker.style.transform = `translateX(${wx}px) scaleX(${facing})`;
  };
  // little effects that live on the status bar: dust, z's, a speech bubble, the summit flag
  const puff = (n = 1, spread = 10) => {
    if (!bar || reducedMotion) return;
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i');
      d.className = 'dust';
      d.style.left = `${wx + 13 - facing * 10}px`;
      d.style.setProperty('--dx', `${-facing * (4 + Math.random() * spread)}px`);
      bar.appendChild(d);
      setTimeout(() => d.remove(), 450);
    }
  };
  const wsay = (() => {
    if (!bar) return () => {};
    const b = document.createElement('span');
    b.className = 'walker-say'; b.setAttribute('aria-hidden', 'true');
    bar.appendChild(b);
    let t = null;
    return (text, ms = 1600) => {
      b.textContent = text;
      b.style.left = `${Math.max(4, Math.min(bar.clientWidth - b.offsetWidth - 4, wx + 13 - b.offsetWidth / 2))}px`;
      b.classList.add('on'); clearTimeout(t); t = setTimeout(() => b.classList.remove('on'), ms);
    };
  })();
  const play = (cls, ms) => { if (!wsvg || reducedMotion) return; wsvg.classList.remove(cls); void wsvg.getBoundingClientRect(); wsvg.classList.add(cls); setTimeout(() => wsvg.classList.remove(cls), ms); };
  let summited = false, flag = null, wasBottom = false;
  const plantFlag = () => {
    if (summited || !bar) return;
    summited = true;
    flag = document.createElement('span');
    flag.className = 'walker-flag'; flag.setAttribute('aria-hidden', 'true');
    flag.innerHTML = '<svg viewBox="0 0 7 11" shape-rendering="crispEdges"><rect x="1" y="0" width="1" height="11" fill="#c9c0d9"/><rect x="2" y="0" width="4" height="3" fill="#ff6fa5"/><rect x="2" y="3" width="2" height="1" fill="#ff6fa5"/></svg>';
    flag.style.left = `${wx + 24}px`;
    bar.appendChild(flag);
    wsay('summit!', 2200);
  };

  // gait comes from scroll speed, measured per frame
  let wvel = 0, lastMove = 0, wframeAt = 0, wstep = 0, wrun = 0, wzoom = false, loopOn = false, wdir = 0, wskid = 0, wdustAt = 0;
  const walkLoop = (now) => {
    const dy = window.scrollY - prevY;
    prevY = window.scrollY;
    wvel += (Math.abs(dy) - wvel) * 0.3;
    if (dy) {
      const dir = dy > 0 ? 1 : -1;
      if (wdir && dir !== wdir && wvel > 10) { wskid = now + 240; puff(5, 14); }
      wdir = dir; facing = dir; lastMove = now;
    }
    const p = progress();
    placeWalker(p);
    const moving = now - lastMove < 140;
    if (now < wskid) miniPose('skid');
    else if (moving) {
      const run = wvel > 14;
      if (now - wframeAt > (run ? 75 : 140)) { wframeAt = now; wstep++; }
      miniPose(run ? (wstep % 2 ? 'runA' : 'runB') : (wstep % 2 ? 'walkA' : 'walkB'));
      if (wsvg) wsvg.style.transform = run && wstep % 2 === 0 ? 'translateY(-2px)' : '';
      if (run) {
        wrun += 16;
        if (now - wdustAt > 110) { wdustAt = now; puff(); }
        if (wrun > 1400 && !wzoom) { wzoom = true; wsay(pick(['zoooom', 'nyoom', 'gotta go']), 1200); }
      } else wrun = 0;
    }
    if (!moving && now >= wskid) {
      if (wsvg) wsvg.style.transform = '';
      wrun = 0; wzoom = false; loopOn = false;
      const bottom = p > 0.995;
      miniPose(bottom ? 'wave' : 'stand');
      if (bottom) plantFlag();
      if (p < 0.005 && wasBottom) { wasBottom = false; play('hop', 450); wsay('back to the top'); }
      if (bottom) wasBottom = true;
      return;
    }
    requestAnimationFrame(walkLoop);
  };
  const onScroll = () => {
    const p = progress();
    if (pct) pct.textContent = window.scrollY < 8 ? 'Top' : p > 0.995 ? 'Bot' : `${Math.round(p * 100)}%`;
    if (asleep) { asleep = false; wsay(pick(['huh? oh, hi', 'i was resting my eyes', '...five more minutes'])); }
    if (reducedMotion) { placeWalker(p); if (p > 0.995) plantFlag(); return; }
    if (!loopOn) { loopOn = true; lastMove = performance.now(); requestAnimationFrame(walkLoop); }
    if (!mqOn && anims.length) { mqOn = true; requestAnimationFrame(marqueeTick); }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => placeWalker(progress()));
  placeWalker(progress());
  // left alone, he sits down on the status bar, then dozes off
  let asleep = false, zAt = 0;
  setInterval(() => {
    if (!walker || loopOn) return;
    const idle = performance.now() - Math.max(lastMove, lastPoke);
    if (idle > 7000 && progress() <= 0.995) miniPose('sit');
    if (idle > 22000) {
      asleep = true;
      if (!reducedMotion && performance.now() - zAt > 1400) {
        zAt = performance.now();
        const z = document.createElement('i');
        z.className = 'zz'; z.textContent = 'z'; z.style.left = `${wx + 16}px`;
        bar.appendChild(z); setTimeout(() => z.remove(), 1900);
      }
    }
  }, 500);
  // poke him: a hop, and five quick w_pokes is a backflip
  let lastPoke = 0, w_pokes = [];
  if (walker) walker.addEventListener('click', () => {
    const now = performance.now();
    lastPoke = now;
    if (asleep) { asleep = false; miniPose('stand'); wsay('!!'); play('hop', 450); return; }
    w_pokes = w_pokes.filter((t) => now - t < 2000); w_pokes.push(now);
    miniPose(progress() > 0.995 ? 'wave' : 'stand');
    if (w_pokes.length >= 5) { w_pokes = []; play('flip', 700); setTimeout(() => wsay('ta-da'), 650); return; }
    play('hop', 450);
    wsay(pick(['hi!', 'boing', 'hey', 'that tickles', 'i walk, you scroll']));
  });

  /* ---------- pickleball: pong against pranav, in the hero ---------- */
  const hero = document.getElementById('top');
  let game = null;
  const pickleball = () => {
    if (game || !hero) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
    const c = document.createElement('canvas');
    c.className = 'pong';
    hero.appendChild(c);
    hero.classList.add('playing');
    const ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    const size = () => { const r = hero.getBoundingClientRect(); W = r.width; H = r.height; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    const U = 10, PH = 9 * U, TO = 5;
    const css = (v) => getComputedStyle(root).getPropertyValue(v).trim();
    const PC = { veil: root.dataset.theme === 'light' ? 'rgba(247,243,234,0.7)' : 'rgba(15,12,22,0.55)', net: css('--line'), ai: css('--pink'), you: css('--amber'), ball: css('--text'), label: css('--dim') };
    const g = { ai: H / 2, you: H / 2, bx: W / 2, by: H / 2, vx: 0, vy: 0, sAi: 0, sYou: 0, serve: 1.2, over: false, keys: {} };
    game = g;
    const serve = (dir) => { g.bx = W / 2; g.by = H / 2; const a = (Math.random() - 0.5) * 0.9; g.vx = Math.cos(a) * 430 * dir; g.vy = Math.sin(a) * 430; g.serve = 0.9; };
    serve(Math.random() < 0.5 ? -1 : 1);
    const move = (e) => { const r = hero.getBoundingClientRect(); g.you = clamp(e.clientY - r.top, PH / 2, H - PH / 2); };
    const keys = (e) => {
      if (e.key === 'Escape') { end(); return; }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { g.keys[e.key] = e.type === 'keydown'; e.preventDefault(); }
      if (g.over && e.type === 'keydown') end();
    };
    hero.addEventListener('pointermove', move);
    document.addEventListener('keydown', keys); document.addEventListener('keyup', keys);
    c.addEventListener('click', () => { if (g.over) end(); });
    const end = () => {
      if (!game) return;
      game = null;
      hero.removeEventListener('pointermove', move);
      document.removeEventListener('keydown', keys); document.removeEventListener('keyup', keys);
      c.remove(); hero.classList.remove('playing');
    };
    let last = performance.now();
    speak('first to 5. you\'re on the right.', 2600);
    const frame = (now) => {
      if (game !== g) return;
      const dt = Math.min(0.03, (now - last) / 1000); last = now;
      if (g.keys.ArrowUp) g.you = clamp(g.you - 600 * dt, PH / 2, H - PH / 2);
      if (g.keys.ArrowDown) g.you = clamp(g.you + 600 * dt, PH / 2, H - PH / 2);
      if (!g.over) {
        // pranav tracks the ball, a little late, so he can be beaten
        const target = g.vx < 0 ? g.by : H / 2;
        g.ai += clamp(target - g.ai, -340 * dt, 340 * dt);
        if (g.serve > 0) g.serve -= dt;
        else {
          g.bx += g.vx * dt; g.by += g.vy * dt;
          if (g.by < U || g.by > H - U) { g.vy *= -1; g.by = clamp(g.by, U, H - U); }
          const hit = (py, side) => {
            const off = clamp((g.by - py) / (PH / 2), -1, 1), sp = Math.min(1100, Math.hypot(g.vx, g.vy) * 1.06);
            g.vx = Math.cos(off * 0.9) * sp * side; g.vy = Math.sin(off * 0.9) * sp;
          };
          if (g.vx < 0 && g.bx < 46 + U && g.bx > 30 && Math.abs(g.by - g.ai) < PH / 2 + U) hit(g.ai, 1);
          if (g.vx > 0 && g.bx > W - 46 - U && g.bx < W - 30 && Math.abs(g.by - g.you) < PH / 2 + U) hit(g.you, -1);
          if (g.bx < -20) { g.sYou++; speak(pick(['nice shot', 'lucky', 'ok ok', 'rematch later']), 1400); serve(-1); }
          if (g.bx > W + 20) { g.sAi++; speak(pick(['dink!', 'too easy', 'kitchen\'s mine', 'ez']), 1400); jump(400); serve(1); }
          if (g.sAi >= TO || g.sYou >= TO) {
            g.over = true;
            if (g.sYou > g.sAi) { speak('gg. you win.', 4000); confetti(); } else speak('gg. better luck next time.', 4000);
          }
        }
      }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = PC.veil; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = PC.net;
      for (let y = U; y < H; y += U * 3) ctx.fillRect(W / 2 - U / 4, y, U / 2, U * 1.5);
      ctx.font = `700 ${Math.round(H * 0.16)}px "Pixelify Sans", monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = PC.ai; ctx.fillText(g.sAi, W * 0.38, H * 0.08);
      ctx.fillStyle = PC.you; ctx.fillText(g.sYou, W * 0.62, H * 0.08);
      ctx.globalAlpha = 1;
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillStyle = PC.label;
      ctx.fillText('pranav', 52, 16); ctx.fillText('you', W - 52, 16);
      ctx.fillText(g.over ? 'press any key to close' : 'mouse or ↑↓ · esc to quit', W / 2, H - 28);
      ctx.fillStyle = PC.ai; ctx.fillRect(36, g.ai - PH / 2, U, PH);
      ctx.fillStyle = PC.you; ctx.fillRect(W - 46, g.you - PH / 2, U, PH);
      if (!g.over) { ctx.fillStyle = PC.ball; ctx.fillRect(Math.round(g.bx - U / 2), Math.round(g.by - U / 2), U, U); }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  /* ---------- speedrun: top of the page to the contact section, timed, with splits ---------- */
  let run = null;
  const fmtTime = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, '0')}.${String(Math.floor((ms % 1000) / 10)).padStart(2, '0')}`;
  const speedrun = () => {
    if (run) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
    const hud = document.createElement('div');
    hud.className = 'speedrun';
    hud.innerHTML = '<p class="sr-title">speedrun · any%</p><p class="sr-time">3</p><ol class="sr-splits"></ol>';
    document.body.appendChild(hud);
    const timeEl = hud.querySelector('.sr-time'), splitsEl = hud.querySelector('.sr-splits');
    const SPLITS = [['stack', 'stack'], ['work', 'projects'], ['experience', 'career'], ['about', 'about'], ['contact', 'contact']];
    const pb = +(store.get('speedrun-pb') || 0);
    run = { t0: 0, done: 0, hud };
    const quit = (e) => { if (e.key === 'Escape' && run) { run.hud.remove(); run = null; document.removeEventListener('keydown', quit); } };
    document.addEventListener('keydown', quit);
    let n = 3;
    const count = setInterval(() => {
      n -= 1;
      if (!run) { clearInterval(count); return; }
      if (n > 0) { timeEl.textContent = n; return; }
      clearInterval(count);
      timeEl.textContent = 'GO';
      run.t0 = performance.now();
      const tick = () => {
        if (!run) return;
        const ms = performance.now() - run.t0;
        timeEl.textContent = fmtTime(ms);
        while (run.done < SPLITS.length) {
          const [id, label] = SPLITS[run.done], el = document.getElementById(id);
          if (!el || el.getBoundingClientRect().top > innerHeight * 0.5) break;
          splitsEl.insertAdjacentHTML('beforeend', `<li><span>${label}</span><span>${fmtTime(ms)}</span></li>`);
          run.done++;
        }
        if (run.done < SPLITS.length) { requestAnimationFrame(tick); return; }
        const best = !pb || ms < pb;
        if (best) store.set('speedrun-pb', String(Math.round(ms)));
        hud.classList.add('finished');
        hud.insertAdjacentHTML('beforeend', ms < 1200 ? '<p class="sr-note">TAS detected. nice try.</p>'
          : best ? `<p class="sr-note">new PB!${pb ? ` (was ${fmtTime(pb)})` : ''}</p>` : `<p class="sr-note">PB ${fmtTime(pb)}</p>`);
        if (best && ms >= 1200) confetti();
        const r = run;
        run = null;
        document.removeEventListener('keydown', quit);
        setTimeout(() => r.hud.classList.add('out'), 6000);
        setTimeout(() => r.hud.remove(), 6600);
      };
      requestAnimationFrame(tick);
    }, 700);
  };

  /* ---------- command line ---------- */
  const go = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };
  const open = (url) => {
    if (url.startsWith('mailto:')) { if (window.copyMail) window.copyMail(); else window.location.href = url; }
    else if (url === LINKS.resume && window.openResume) window.openResume();
    else window.open(url, '_blank', 'noopener');
  };
  const playDemo = (id) => {
    go(id);
    const btn = document.querySelector(`#${id} .pl-big`);
    if (btn) setTimeout(() => btn.click(), reducedMotion ? 0 : 600);
  };
  // commands that make the avatar do something scroll back up to him first
  const atHero = (fn) => () => { const far = window.scrollY > 200; go('top'); setTimeout(fn, far && !reducedMotion ? 500 : 0); };

  const HELP = '<b>commands</b>\n' +
    'whoami · neofetch · ls · colophon\n' +
    'speed · gexlab · blip · hypothesize · spotifind\n' +
    'play speed   jump to a demo and play it\n' +
    'experience · about · contact\n' +
    'resume · email · github · linkedin\n' +
    'pickleball · speedrun · go gators\n' +
    'theme · day · night\n' +
    '<span class="dim">some things aren\'t listed.</span>';
  const COMMANDS = {
    help: () => say(HELP, 10000),
    '?': () => say(HELP, 10000),
    whoami: () => { go('top'); say('Pranav Sivakumar. Data science + economics @ UF, class of 2029.'); },
    talk: atHero(() => { const q = document.getElementById('chat-q'); if (q) q.focus(); }),
    'talk pranav': () => COMMANDS.talk(),
    neofetch: atHero(() => wave(2, 'that\'s me')),
    ls: () => go('work'),
    'ls -l': () => go('work'),
    'ls projects': () => go('work'),
    'ls -l projects': () => go('work'),
    projects: () => go('work'),
    work: () => go('work'),
    'cd projects': () => go('work'),
    stack: () => go('stack'),
    'cat stack.txt': () => go('stack'),
    experience: () => go('experience'),
    'git log': () => go('experience'),
    about: () => go('about'),
    'cat about.md': () => go('about'),
    contact: () => go('contact'),
    ping: () => go('contact'),
    'ping pranav': () => go('contact'),
    resume: () => open(LINKS.resume),
    'open resume.pdf': () => open(LINKS.resume),
    email: () => open(LINKS.email),
    mail: () => open(LINKS.email),
    github: () => open(LINKS.github),
    linkedin: () => open(LINKS.linkedin),
    clear: () => go('top'),
    theme: () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light'),
    'theme light': () => setTheme('light'),
    'theme dark': () => setTheme('dark'),
    day: () => setTheme('light'),
    night: () => setTheme('dark'),
    life: () => { location.href = 'life/'; },
    'cd ~/life': () => { location.href = 'life/'; },
    'cd life': () => { location.href = 'life/'; },
    // games and toys
    pickleball,
    pong: pickleball,
    speedrun,
    // the avatar
    hi: atHero(() => wave(3, 'hi!')),
    hello: atHero(() => wave(3, 'hello!')),
    wave: atHero(() => wave(3, 'o/')),
    jump: atHero(() => { jump(); speak('boing'); }),
    flip: atHero(() => { jump(1150); S.rotT -= 360; speak('ta-da'); }),
    spin: () => COMMANDS.flip(),
    dance: atHero(() => { speak('♪ ♫ ♪', 2400); for (let i = 0; i < 6; i++) setTimeout(() => { jump(330); pose(i % 2 ? 'wave' : 'wave2'); }, i * 360); setTimeout(() => pose('stand'), 2300); }),
    shrug: atHero(() => { hold('shrug', 1800); speak('¯\\_(ツ)_/¯'); }),
    'go gators': atHero(() => { setOutfit('gators'); jump(1000); speak('go gators! 🐊', 2400); confetti(['#fa4616', '#2449d8', '#f2eee8']); }),
    gators: () => COMMANDS['go gators'](),
    'outfit gators': atHero(() => { setOutfit('gators'); speak('game day fit'); }),
    'outfit santa': atHero(() => { setHat(true); speak('ho ho ho'); }),
    'outfit normal': atHero(() => { setOutfit('normal'); setHat(false); speak('back to basics'); }),
    coffee: atHero(() => { jump(500); speak('thanks. back to work.'); }),
    'make coffee': () => COMMANDS.coffee(),
    f1: atHero(() => { if (reducedMotion) return; speak('box box', 1200); S.zoom = 1; S.vx = 0; kick(); }),
    konami: () => say('↑ ↑ ↓ ↓ ← → ← → b a'),
    vim: () => say("you're already in it."),
    ':q': () => say('nice try.'),
    ':wq': () => say('nice try.'),
    exit: () => say('there is no exit. only more projects.'),
    'rm -rf /': atHero(() => { hold('shrug', 1500); speak('absolutely not'); }),
    'sudo rm -rf /': () => COMMANDS['rm -rf /'](),
    sudo: () => say('pranav is not in the sudoers file. this incident will be reported.'),
    'sudo hire pranav': () => { say('permission granted. opening email…'); confetti(); setTimeout(() => open(LINKS.email), 900); },
    colophon: () => {
      const w = window.pageWeight && window.pageWeight();
      say('<b>colophon</b>\n' +
        'plain html, css and js. no framework; the build only minifies and fingerprints files.\n' +
        'type: jetbrains mono + pixelify sans, self-hosted. every icon, logo and scene is drawn in code.\n' +
        'live: the github calendar, f1 standings and apple music previews, with a dated copy if a feed is down.\n' +
        'lighthouse: 100 accessibility · 100 best practices · 100 seo. two themes, one layout: switching moves nothing.\n' +
        (w ? `<span class="dim">this visit: ${w.text}</span>` : ''), 14000);
    },
    'cat colophon': () => COMMANDS.colophon(),
  };
  document.querySelectorAll('[data-cmd]').forEach((b) => b.addEventListener('click', () => { const fn = COMMANDS[b.dataset.cmd]; if (fn) fn(); }));
  // the ping in the contact section reports this visit's real round trip to the server
  const ttfb = document.querySelector('[data-ttfb]');
  addEventListener('load', () => { const w = window.pageWeight && window.pageWeight(); if (ttfb && w && w.ttfb > 0) ttfb.textContent = w.ttfb.toFixed(2); }, { once: true });
  ['speed', 'gexlab', 'blip', 'hypothesize', 'spotifind'].forEach((p) => {
    COMMANDS[p] = () => go(p);
    COMMANDS['cd ' + p] = () => go(p);
    COMMANDS['cat ' + p] = () => go(p);
  });
  ['speed', 'gexlab', 'blip'].forEach((p) => { COMMANDS['play ' + p] = () => playDemo(p + '-video'); });

  const form = document.getElementById('prompt');
  const input = document.getElementById('cmd');
  const mode = document.getElementById('mode');
  if (window.matchMedia('(max-width: 640px)').matches) input.placeholder = 'type help';
  const history = [];
  let hIndex = 0;
  const setMode = (insert) => { mode.textContent = insert ? 'INSERT' : 'NORMAL'; mode.classList.toggle('insert', insert); };
  input.addEventListener('focus', () => setMode(true));
  input.addEventListener('blur', () => setMode(false));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    const cmd = raw.toLowerCase().replace(/\s+/g, ' ').replace(/\/$/, '');
    if (!cmd) return;
    history.push(raw);
    hIndex = history.length;
    input.value = '';
    const fn = COMMANDS[cmd];
    if (fn) fn();
    else {
      say(`zsh: command not found: ${raw.replace(/[<>&]/g, '')}\ntry <b>help</b>`);
      if (svg && svg.getBoundingClientRect().bottom > 0) hold('shrug', 1400);
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.blur(); return; }
    if (e.key === 'ArrowUp' && history.length) { hIndex = Math.max(0, hIndex - 1); input.value = history[hIndex]; e.preventDefault(); }
    if (e.key === 'ArrowDown' && history.length) { hIndex = Math.min(history.length, hIndex + 1); input.value = history[hIndex] || ''; e.preventDefault(); }
    if (e.key === 'Tab') {
      const v = input.value.toLowerCase();
      const match = v && Object.keys(COMMANDS).find((k) => k.startsWith(v) && k !== v);
      if (match) { input.value = match; e.preventDefault(); }
    }
  });

  // single-key shortcuts, only when not typing, not inside a video player, and not mid-game
  const KEYS = {
    r: () => open(LINKS.resume),
    e: () => open(LINKS.email),
    g: () => open(LINKS.github),
    l: () => open(LINKS.linkedin),
    p: () => go('work'),
    '?': () => say(HELP, 10000),
  };
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (t && t.closest && t.closest('.pl')) return;
    if (kpos > 0 || game) return; // mid-konami or mid-pickleball
    if (e.key === '/' || e.key === ':') { e.preventDefault(); input.focus(); return; }
    const fn = KEYS[e.key];
    if (fn) { e.preventDefault(); fn(); }
  });

  /* ---------- titlebar size + statusbar path ---------- */
  const tty = document.getElementById('tty');
  const sizeTty = () => { if (tty) tty.textContent = `zsh · ${Math.floor(window.innerWidth / 8.4)}×${Math.floor(window.innerHeight / 19)}`; };
  sizeTty();
  window.addEventListener('resize', sizeTty);
  const where = document.getElementById('where');
  const PATHS = [['contact', '~/contact'], ['about', '~/about.md'], ['experience', '~/career'], ['spotifind', '~/projects/spotifind'], ['hypothesize', '~/projects/hypothesize'],
    ['gexlab', '~/projects/gexlab'], ['blip', '~/projects/blip'], ['speed', '~/projects/speed'], ['work', '~/projects'], ['stack', '~/stack.txt']];
  const trackPath = () => {
    const y = window.innerHeight * 0.4;
    const hit = PATHS.find(([id]) => { const el = document.getElementById(id); return el && el.getBoundingClientRect().top < y; });
    if (where) where.textContent = hit ? hit[1] : '~/';
  };
  window.addEventListener('scroll', trackPath, { passive: true });
  trackPath();

  /* ---------- for whoever opens devtools ---------- */
  const BANNER = [
    '███  ███   ██  █  █  ██  █  █',
    '█  █ █  █ █  █ ██ █ █  █ █  █',
    '███  ███  ████ █ ██ ████ █  █',
    '█    █ █  █  █ █  █ █  █  ██ ',
    '█    █  █ █  █ █  █ █  █  ██ ',
  ].join('\n');
  console.log(`%c${BANNER}`, 'color:#ffb547;font:12px/1.1 monospace');
  console.log('%cyou opened devtools. my kind of person.\n%csay hi: pranav.sivakumar@ufl.edu · source: github.com/swilled\ntry typing "help" in the bar at the bottom, or the konami code.',
    'color:#ff6fa5;font:600 13px monospace', 'color:#9c92b0;font:12px monospace');
})();

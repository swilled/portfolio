// Shared conveniences for every page: the email copies instead of opening a mail app,
// a ⌘K / Ctrl+K palette for everything on the page, a tab title that notices when you leave,
// and printing in the day theme.
(() => {
  const MAIL = 'pranav.sivakumar@ufl.edu';
  const life = location.pathname.includes('/life');
  // the project pages (speed/, blip/, gexlab/) have their own look but share this
  const sub = !life && /\/(speed|blip|gexlab)\//.test(location.pathname);
  const base = life || sub ? '../' : '';
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  let toastEl = document.getElementById('toast');
  if (!toastEl && sub) {
    toastEl = document.createElement('div');
    toastEl.id = 'toast'; toastEl.className = 'qol-toast'; toastEl.setAttribute('role', 'status');
    document.body.appendChild(toastEl);
  }
  let toastT = null;
  const toast = (html, ms = 3600) => {
    if (!toastEl) return;
    toastEl.innerHTML = html;
    toastEl.classList.add('show', 'live');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show', 'live'), ms);
  };

  /* ---------- email: copy it, with the mail app one click away ---------- */
  const copyMail = () => {
    // if the clipboard is off limits, show the address anyway: a bare mailto: does nothing on a machine with no mail app
    const fallback = () => (toastEl ? toast(`<b>${MAIL}</b> · <a href="mailto:${MAIL}" data-mailto>open mail app</a>`, 6000) : (location.href = `mailto:${MAIL}`));
    if (!navigator.clipboard || !window.isSecureContext) return fallback();
    navigator.clipboard.writeText(MAIL).then(
      () => toast(`copied <b>${MAIL}</b> · <a href="mailto:${MAIL}" data-mailto>open mail app</a>`, 4200),
      fallback,
    );
  };
  window.copyMail = copyMail;
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!a || a.hasAttribute('data-mailto') || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    copyMail();
  });

  /* ---------- the tab title notices you left ---------- */
  const title = document.title;
  let backT = null, left = false;
  document.addEventListener('visibilitychange', () => {
    clearTimeout(backT);
    if (document.hidden) { left = true; document.title = 'pranav@uf: [detached]'; }
    // only welcome back someone who left: a page prerendered on hover becomes visible without ever being left
    else if (left) { left = false; document.title = 'pranav@uf: [reattached]'; backT = setTimeout(() => { document.title = title; }, 1600); }
  });

  /* ---------- keyboard users never land on something still waiting to scroll in ---------- */
  document.addEventListener('focusin', (e) => {
    const r = e.target.closest && e.target.closest('.reveal:not(.in)');
    if (r) r.classList.add('in');
  });

  /* ---------- print the day theme, whatever is on screen ---------- */
  let printedFrom = null;
  addEventListener('beforeprint', () => { const r = document.documentElement; if (r.dataset.theme && r.dataset.theme !== 'light') { printedFrom = r.dataset.theme; r.dataset.theme = 'light'; } });
  addEventListener('afterprint', () => { if (printedFrom) { document.documentElement.dataset.theme = printedFrom; printedFrom = null; } });

  /* ---------- what this page actually cost you, measured in your browser ---------- */
  // bytes are the encoded (compressed) size, so a cached revisit still reports the page's real weight
  const weigh = () => {
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (!nav) return null;
    const res = performance.getEntriesByType('resource');
    const size = (e) => e.encodedBodySize || e.transferSize || 0;
    const bytes = res.reduce((a, e) => a + size(e), size(nav));
    const ms = (nav.loadEventEnd || nav.domContentLoadedEventEnd) - nav.startTime;
    return { bytes, files: res.length + 1, ms, ttfb: nav.responseStart - nav.requestStart };
  };
  const fmtKB = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  window.pageWeight = () => { const w = weigh(); return w && { ...w, text: `${fmtKB(w.bytes)} in ${w.files} files · ready in ${(w.ms / 1000).toFixed(2)} s` }; };
  const weightEls = document.querySelectorAll('[data-weight]');
  if (weightEls.length) {
    // lazy images and the like arrive later, so it re-measures whenever the line scrolls into view
    const show = () => { const w = window.pageWeight(); if (w) weightEls.forEach((el) => { el.textContent = w.text; }); };
    if (document.readyState === 'complete') show(); else addEventListener('load', () => setTimeout(show, 0), { once: true });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) show(); });
      weightEls.forEach((el) => io.observe(el));
    }
  }

  /* ---------- ⌘K: everything on the page, searchable ---------- */
  const run = (cmd) => {
    const input = document.getElementById('cmd'), form = document.getElementById('prompt');
    if (!input || !form) return;
    input.value = cmd;
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
  };
  const goTo = (href) => () => {
    if (href.startsWith('#')) { const el = document.querySelector(href); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else location.href = href;
  };
  const items = () => {
    const out = [];
    const add = (group, label, hint, act) => out.push({ group, label, hint, act });
    document.querySelectorAll('header nav a[href^="#"]').forEach((a) => add('go to', a.textContent.trim(), a.getAttribute('href'), goTo(a.getAttribute('href'))));
    document.querySelectorAll('article.project[id]').forEach((p) => {
      const h = p.querySelector('h3');
      if (h) add('projects', h.textContent.trim(), p.querySelector('.kicker') ? p.querySelector('.kicker').textContent.replace(/^\d+\s*·\s*/, '') : '', goTo(`#${p.id}`));
    });
    if (document.getElementById('velo')) add('projects', 'Velo Research', 'currently building', goTo('#velo'));
    if (sub) {
      add('go to', 'cd ~', 'back to the portfolio', goTo('../'));
      add('go to', 'cd ~/life', 'off the clock', goTo('../life/'));
      ['speed', 'blip', 'gexlab'].filter((id) => !location.pathname.includes(`/${id}/`)).forEach((id) => add('projects', id, 'project page', goTo(`../${id}/`)));
      ['hypothesize', 'spotifind'].forEach((id) => add('projects', id, 'on the portfolio', goTo(`../#${id}`)));
      add('projects', 'Velo Research', 'currently building', goTo('../#velo'));
    } else if (life) {
      add('go to', 'cd ~', 'back to the portfolio', goTo('../'));
      ['speed', 'blip', 'gexlab', 'hypothesize', 'spotifind'].forEach((id) => add('projects', id, 'on the portfolio', goTo(`../#${id}`)));
      [['summit', 'send the climber up Denali'], ['lights', 'F1 reaction test'], ['pickleball', 'play a rally'], ['play', 'drop the needle'], ['next', 'next record'], ['lando', '🧡']].forEach(([c, h]) => add('commands', c, h, () => run(c)));
    } else {
      [['alpine', 'summit log'], ['court', 'tennis + pickleball'], ['track', 'F1 pit wall'], ['games', 'the handheld'], ['music', 'the record crate']].forEach(([id, h]) => add('~/life', `~/life/${id}`, h, goTo(`life/#${id}`)));
      [['talk pranav', 'ask him something'], ['pickleball', 'pong against him'], ['speedrun', 'race the page'], ['go gators', 'game day fit'], ['dance', '♪'], ['flip', 'ta-da'], ['neofetch', 'system info'], ['colophon', 'how this site is built'], ['sudo hire pranav', '']].forEach(([c, h]) => add('commands', c, h, () => run(c)));
    }
    add('actions', 'copy email', MAIL, copyMail);
    add('actions', 'open résumé', 'print it out', () => (window.openResume ? window.openResume() : window.open(`${base}assets/resume.pdf`, '_blank', 'noopener')));
    add('actions', 'github', 'github.com/swilled', () => window.open('https://github.com/swilled', '_blank', 'noopener'));
    add('actions', 'linkedin', 'in/pranavsivakumar', () => window.open('https://www.linkedin.com/in/pranavsivakumar', '_blank', 'noopener'));
    if (document.getElementById('theme')) add('actions', 'switch theme', 'night ↔ day', () => document.getElementById('theme').click());
    add('actions', 'back to top', '', () => scrollTo({ top: 0, behavior: 'smooth' }));
    return out;
  };
  // subsequence match: every typed letter in order; earlier, tighter matches rank higher
  const score = (q, s) => {
    s = s.toLowerCase();
    if (!q) return 1;
    if (s.startsWith(q)) return 100 - s.length * 0.01;
    const at = s.indexOf(q);
    if (at >= 0) return 60 - at;
    let i = 0, gaps = 0, last = -1;
    for (const ch of s) { if (ch === q[i]) { if (last >= 0) gaps += (s.indexOf(ch, last + 1) - last - 1); last = s.indexOf(ch, last + 1); i++; if (i === q.length) break; } }
    return i === q.length ? 30 - gaps : 0;
  };

  const pal = document.createElement('div');
  pal.className = 'palette';
  pal.setAttribute('role', 'dialog'); pal.setAttribute('aria-modal', 'true'); pal.setAttribute('aria-label', 'Search the site');
  pal.innerHTML = `<div class="pal-box"><label class="pal-in"><span aria-hidden="true">❯</span><input type="text" spellcheck="false" autocomplete="off" placeholder="jump to a section, project or command…" aria-controls="pal-list"></label>` +
    `<ul class="pal-list" id="pal-list" role="listbox"></ul><p class="pal-foot"><kbd>↑</kbd><kbd>↓</kbd> move <kbd>enter</kbd> go <kbd>esc</kbd> close</p></div>`;
  document.body.appendChild(pal);
  const input = pal.querySelector('input'), list = pal.querySelector('.pal-list');
  let all = [], shown = [], sel = 0, lastFocus = null;
  const render = () => {
    const q = input.value.trim().toLowerCase();
    shown = all.map((it) => ({ it, s: Math.max(score(q, it.label), score(q, `${it.group} ${it.hint}`) * 0.6) })).filter((x) => x.s > 0)
      .sort((a, b) => (q ? b.s - a.s : 0)).map((x) => x.it);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    list.innerHTML = '';
    let group = '';
    shown.forEach((it, i) => {
      if (!q && it.group !== group) { group = it.group; const g = document.createElement('li'); g.className = 'grp'; g.textContent = group; g.setAttribute('role', 'presentation'); list.appendChild(g); }
      const li = document.createElement('li');
      li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === sel)); li.dataset.i = i;
      li.innerHTML = `<span></span><small></small>`;
      li.firstChild.textContent = it.label; li.lastChild.textContent = it.hint;
      li.addEventListener('mousemove', () => { if (sel !== i) { sel = i; mark(); } });
      li.addEventListener('click', () => choose(i));
      list.appendChild(li);
    });
    if (!shown.length) { const li = document.createElement('li'); li.className = 'grp'; li.textContent = 'nothing matches. try "help" in the prompt below.'; list.appendChild(li); }
  };
  const mark = () => {
    list.querySelectorAll('[role="option"]').forEach((li) => li.setAttribute('aria-selected', String(+li.dataset.i === sel)));
    const cur = list.querySelector('[aria-selected="true"]');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  };
  const close = () => { pal.classList.remove('open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  const choose = (i) => { const it = shown[i]; if (!it) return; close(); setTimeout(it.act, 0); };
  const openPal = () => {
    lastFocus = document.activeElement;
    all = items(); input.value = ''; sel = 0; render();
    pal.classList.add('open'); input.focus();
  };
  window.openPalette = openPal;
  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  pal.addEventListener('mousedown', (e) => { if (e.target === pal) close(); });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.classList.contains('open') ? close() : openPal(); }
  });
  // the hint, with the right modifier for this machine
  document.querySelectorAll('[data-palette-hint]').forEach((el) => { el.innerHTML = `<kbd>${isMac ? '⌘' : 'ctrl'} k</kbd> search`; el.addEventListener('click', openPal); });
})();

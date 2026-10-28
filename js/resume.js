// The résumé, printed: any link to resume.pdf opens a dot-matrix printer that feeds the page out.
// The links still point at the PDF, so ctrl/cmd-click, middle-click and no-JS all get the file itself.
// The page image is rendered from the PDF by tools/resume.py, so the PDF stays the only thing to edit.
(() => {
  const life = location.pathname.includes('/life');
  const base = life ? '../' : '';
  const PDF = `${base}assets/resume.pdf`, IMG = `${base}assets/resume-page.webp`;
  const MAIL = 'pranav.sivakumar@ufl.edu';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const upd = document.querySelector('.upd');
  const updated = upd ? upd.textContent.trim() : '';

  const rv = document.createElement('div');
  rv.className = 'rv';
  rv.setAttribute('role', 'dialog'); rv.setAttribute('aria-modal', 'true'); rv.setAttribute('aria-labelledby', 'rv-title');
  rv.innerHTML = `
    <div class="rv-box">
      <div class="rv-bar">
        <span class="rv-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="rv-title" id="rv-title">lp resume.pdf</span>
        <span class="rv-status" aria-live="polite"></span>
        <button class="rv-x" type="button" aria-label="Close résumé"><kbd>esc</kbd></button>
      </div>
      <div class="rv-printer" aria-hidden="true"><span class="rv-slot"></span><span class="rv-led"></span></div>
      <div class="rv-feed">
        <div class="rv-paper">
          <img alt="Pranav Sivakumar's résumé: University of Florida, B.S. Data Science and B.S. Economics; experience at Intellizence, Amazon, MyFundedFutures, PolicyCON and Tutoring Club; projects GEXLab and Hypothesize. Download the PDF below for the text." width="1224" height="1584" decoding="async">
          <span class="rv-head" aria-hidden="true"></span>
        </div>
      </div>
      <div class="rv-actions">
        <a class="btn primary" href="${PDF}" download="Pranav-Sivakumar-Resume.pdf" data-rv-keep>↓ download pdf</a>
        <a class="btn" href="${PDF}" target="_blank" rel="noopener" data-rv-keep>open in a tab ↗</a>
        <button class="btn" type="button" data-rv-mail>copy email</button>
        <span class="rv-meta">1 page${updated ? ` · updated ${updated}` : ''}</span>
      </div>
    </div>`;
  document.body.appendChild(rv);
  const box = rv.querySelector('.rv-box'), feed = rv.querySelector('.rv-feed'), paper = rv.querySelector('.rv-paper');
  const img = paper.querySelector('img'), head = rv.querySelector('.rv-head'), status = rv.querySelector('.rv-status');
  let timer = null, lastFocus = null, fed = 0;

  const setFed = (p) => {
    fed = p;
    paper.style.setProperty('--fed', `${(p * 100).toFixed(2)}%`);
    status.textContent = p >= 1 ? 'done · 1 page' : `printing… ${Math.round(p * 100)}%`;
    // keep the print head in view while the page is taller than the window
    const y = paper.offsetTop + paper.offsetHeight * p - feed.clientHeight * 0.7;
    if (p < 1) feed.scrollTop = Math.max(0, y);
  };
  const finish = () => {
    clearTimeout(timer); timer = null;
    const wasPrinting = fed > 0 && fed < 1;
    setFed(1);
    rv.classList.add('printed');
    // the page is out: tear it off and hand it over from the top
    if (wasPrinting) setTimeout(() => feed.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }), 350);
  };
  // a line at a time, with the little stalls a real printer has
  const print = () => {
    rv.classList.remove('printed');
    setFed(0);
    feed.scrollTop = 0;
    if (reduced) { finish(); return; }
    const step = () => {
      const next = Math.min(1, fed + 0.018 + Math.random() * 0.012);
      setFed(next);
      head.style.setProperty('--x', `${Math.round(Math.random() * 100)}%`);
      if (next >= 1) { finish(); return; }
      timer = setTimeout(step, Math.random() < 0.08 ? 160 : 34);
    };
    timer = setTimeout(step, 260);
  };

  const open = () => {
    if (rv.classList.contains('open')) return;
    lastFocus = document.activeElement;
    if (!img.getAttribute('src')) img.src = IMG;
    rv.classList.add('open');
    document.documentElement.classList.add('rv-lock');
    rv.querySelector('.rv-x').focus();
    if (img.complete && img.naturalWidth) print();
    else { status.textContent = 'warming up…'; img.addEventListener('load', print, { once: true }); }
  };
  const close = () => {
    clearTimeout(timer); timer = null;
    rv.classList.remove('open');
    document.documentElement.classList.remove('rv-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };
  window.openResume = open;

  rv.querySelector('.rv-x').addEventListener('click', close);
  rv.addEventListener('mousedown', (e) => { if (e.target === rv) close(); });
  // impatient? any click on the paper finishes the page
  feed.addEventListener('click', () => { if (timer) finish(); });
  rv.querySelector('[data-rv-mail]').addEventListener('click', () => {
    if (window.copyMail) window.copyMail(); else location.href = `mailto:${MAIL}`;
  });
  document.addEventListener('keydown', (e) => {
    if (!rv.classList.contains('open')) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (timer && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); finish(); return; }
    // keep tab inside the dialog
    if (e.key === 'Tab') {
      const f = [...box.querySelectorAll('button, a[href]')];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }, true);

  // every plain click on a résumé link prints it instead
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href$="resume.pdf"]');
    if (!a || a.hasAttribute('data-rv-keep') || a.hasAttribute('download')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    open();
  });
})();

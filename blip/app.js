// Blip site: hold-to-talk demo, phrase explorer, exact-words safety demo, reveals.
(() => {
  document.documentElement.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 60) : ms));

  // types text into an element, a few characters at a time
  async function typeInto(el, text, cps = 55) {
    if (reduced) { el.textContent = text; return; }
    el.textContent = '';
    for (let i = 0; i < text.length; i += 2) { el.textContent = text.slice(0, i + 2); await wait(1000 / cps * 2); }
    el.textContent = text;
  }

  const soundBox = document.getElementById('sound');
  const speak = (text) => {
    if (!soundBox || !soundBox.checked || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[“”]/g, ''));
    u.rate = 1.05;
    speechSynthesis.speak(u);
  };

  /* ---------- hero: hold to talk ---------- */
  const SCRIPT = [
    ['Read my latest email.', 'From Maya: “Still on for dinner Friday at 7? I booked a table at Luna on 5th.”'],
    ['Reply: yes, see you then.', 'Draft to Maya: “Yes, see you then.” Say “send this email” when you\'re ready.', 'lock'],
    ['Make it 7:30.', 'Updated: “Yes, see you at 7:30.”'],
    ['Send this email.', 'Sent to Maya.'],
  ];
  const app = document.querySelector('.app');
  const log = document.getElementById('log');
  const talk = document.getElementById('talk');
  const state = document.getElementById('state');
  const hint = document.getElementById('hint');
  let step = 0, holding = false, busy = false, userDriven = false, youLine = null;

  const addLine = (who, text, cls) => {
    const li = document.createElement('li');
    li.className = who + (cls ? ' ' + cls : '');
    li.innerHTML = `<span class="who">${who === 'you' ? 'You' : 'Blip'}</span><span class="msg"></span>`;
    log.appendChild(li);
    while (log.children.length > 6) log.removeChild(log.firstChild);
    const msg = li.querySelector('.msg');
    msg.textContent = text || '';
    return msg;
  };

  const press = async () => {
    if (busy || holding) return;
    holding = true;
    if (step === 0 && log.children.length) log.innerHTML = '';
    app.classList.add('live');
    talk.classList.add('down');
    talk.textContent = 'Listening… release to send';
    state.textContent = 'Listening';
    hint.textContent = 'Release to send.';
    youLine = addLine('you', '…');
    typeInto(youLine, SCRIPT[step][0], 24);
  };
  const release = async () => {
    if (!holding) return;
    holding = false;
    busy = true;
    const [said, reply, cls] = SCRIPT[step];
    if (youLine) youLine.textContent = said;
    app.classList.remove('live');
    app.classList.add('thinking');
    talk.classList.remove('down');
    talk.textContent = 'Hold to talk';
    state.textContent = 'Thinking';
    await wait(650);
    app.classList.remove('thinking');
    state.textContent = 'Speaking';
    const msg = addLine('blip', '', cls);
    speak(reply);
    await typeInto(msg, reply);
    step = (step + 1) % SCRIPT.length;
    state.textContent = step === 0 ? 'Done' : 'Ready';
    hint.textContent = step === 0 ? 'Hold again to start over.' : 'Hold the button, or hold Space on it.';
    busy = false;
  };

  talk.addEventListener('pointerdown', (e) => { e.preventDefault(); userDriven = true; talk.setPointerCapture(e.pointerId); press(); });
  talk.addEventListener('pointerup', release);
  talk.addEventListener('pointercancel', release);
  talk.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); userDriven = true; press(); } });
  talk.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } });
  talk.addEventListener('click', (e) => e.preventDefault());

  // until someone tries it, the demo plays itself while it's on screen
  let autoVisible = false;
  new IntersectionObserver(([e]) => { autoVisible = e.isIntersecting; }).observe(app);
  (async function auto() {
    await wait(1200);
    while (!userDriven) {
      if (autoVisible && !busy && !document.hidden) {
        await press();
        await wait(1500);
        if (userDriven) break;
        await release();
        await wait(step === 0 ? 4000 : 1600);
      } else await wait(500);
    }
  })();

  /* ---------- phrase explorer ---------- */
  const PHRASES = [
    ['What\'s here?', 'This is a news article: a headline, three sections and a newsletter form with two fields.'],
    ['Summarize this page.', 'The city is adding 40 miles of bike lanes over four years, with no new local taxes.'],
    ['Search for weekend weather.', 'Searching this site for “weekend weather.” Top result: Weekend forecast, sunny Saturday.'],
    ['Find Saturday.', 'Found “Saturday,” 1 of 2: “Expect clear skies on Saturday, with highs near 72.”'],
    ['Switch to my mail tab.', 'Switched to Inbox · Post. You have 2 unread messages.'],
    ['Fill from my profile.', 'Filled name, email and phone. I guessed that the unlabeled box is “email”: it sits under the name field.'],
    ['Read back.', 'Name: Pranav. Email: filled. Phone: filled. Date of birth is still empty.'],
    ['Spell email.', 'p, r, a, n, a, v, dot, s, at, u, f, l, dot, e, d, u.'],
    ['Faster.', 'Speaking faster: 1.5×.'],
    ['Undo.', 'Undid the last change: the phone field is empty again.'],
  ];
  const wrap = document.getElementById('phrases');
  const answer = document.getElementById('answer-text');
  let answering = 0;
  PHRASES.forEach(([say, reply]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'phrase';
    b.setAttribute('aria-pressed', 'false');
    const li = document.createElement('div');
    li.setAttribute('role', 'listitem');
    li.className = 'phrase-li';
    li.appendChild(b);
    b.textContent = `“${say}”`;
    b.addEventListener('click', async () => {
      wrap.querySelectorAll('.phrase').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const id = ++answering;
      answer.textContent = '';
      speak(reply);
      if (!reduced) await wait(250);
      if (id === answering) await typeInto(answer, reply, 70);
    });
    wrap.appendChild(li);
  });

  /* ---------- exact-words safety demo ---------- */
  const chat = document.getElementById('safety-chat');
  const SAFETY = [
    ['you', 'Send it.'],
    ['lock', 'To send this email to Maya, say “send this email”.'],
    ['you', 'Yes.'],
    ['lock', 'A bare “yes” isn\'t enough. Say “send this email” to send it.'],
    ['you', 'Send this email.'],
    ['ok', 'Sent to Maya.'],
  ];
  let safetyRun = 0;
  const playSafety = async () => {
    const id = ++safetyRun;
    chat.innerHTML = '';
    for (const [who, text] of SAFETY) {
      if (id !== safetyRun) return;
      await wait(who === 'you' ? 700 : 900);
      if (id !== safetyRun) return;
      const li = document.createElement('li');
      li.className = who;
      li.textContent = text;
      chat.appendChild(li);
    }
  };
  document.getElementById('replay-safety').addEventListener('click', playSafety);

  /* ---------- reveals + counters ---------- */
  const count = (el) => {
    const to = +el.dataset.count, dec = +(el.dataset.decimals || 0), suf = el.dataset.suffix || '';
    if (reduced) return;
    const t0 = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / 1500), e = 1 - Math.pow(1 - k, 3);
      el.textContent = (to * e).toFixed(dec) + suf;
      if (k < 1) setTimeout(tick, 30);
    };
    tick();
  };
  const pending = new Set([...document.querySelectorAll('.reveal'), chat]);
  const show = (el) => {
    if (!pending.delete(el)) return;
    if (el === chat) { playSafety(); return; }
    el.classList.add('in');
    el.querySelectorAll('[data-count]').forEach(count);
  };
  const sweep = () => pending.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight - 60) show(el); });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && show(e.target)), { threshold: 0.25 });
    pending.forEach((el) => io.observe(el));
  }
  addEventListener('scroll', () => setTimeout(sweep, 100), { passive: true });
  addEventListener('load', sweep);
  sweep();
})();

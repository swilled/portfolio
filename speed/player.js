/*
  Player: turns <figure class="player"> into a custom video player.

  <figure class="player" id="speed-video" data-title="Speed demo"
          data-chapters='[[0,"intro"],[5,"charting"]]'
          data-thumbs="media/speed-thumbs.webp" data-thumb-cols="10" data-thumb-w="160" data-thumb-h="90"
          data-next-label="GEXLab" data-next-href="#gexlab">
    <video src="media/speed-demo.mp4" poster="media/speed-poster.webp" preload="none" controls playsinline></video>
  </figure>
  <div class="player-chapters" data-for="speed-video"></div>   (optional: chapter chips)

  Without JS the native <video controls> still works. Theme it with the CSS variables in player.css.
*/
(() => {
  const players = new Set();
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
  };
  const fmt = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  // 16x16 pixel icons
  const ICON = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h2v1h2v1h2v1h2v1h1v4h-1v1h-2v1H8v1H6v1H4z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h4v12H3zM9 2h4v12H9z"/></svg>',
    replay: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 1h4v1h2v1h1v1h1v2h1v4h-1v2h-1v1h-1v1h-2v1H6v-1H4v-1H3v-1H2v-2h2v1h1v1h1v1h4v-1h1v-1h1V6h-1V5h-1V4H6v1H5v1h2v2H1V2h2v1h1V2h2z"/></svg>',
    vol: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 6h3V5h1V4h1V3h2v10H6v-1H5v-1H4v-1H1zM10 5h1v1h1v4h-1v1h-1zM12 3h1v1h1v8h-1v1h-1v-1h1V4h-1z"/></svg>',
    mute: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 6h3V5h1V4h1V3h2v10H6v-1H5v-1H4v-1H1zM10 5h1v1h1v1h1V6h1V5h1v1h-1v1h-1v2h1v1h1v1h-1v-1h-1V9h-1v1h-1v1h-1v-1h1V9h1V7h-1V6h-1z"/></svg>',
    full: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1h5v2H3v3H1zM10 1h5v5h-2V3h-3zM1 10h2v3h3v2H1zM13 10h2v5h-5v-2h3z"/></svg>',
    exitfull: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1h2v5H1V4h3zM10 1h2v3h3v2h-5zM1 10h5v5H4v-3H1zM10 10h5v2h-3v3h-2z"/></svg>',
    pip: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 2h14v12H1zm2 2v8h10V4zm5 4h4v3H8z"/></svg>',
  };
  const SPEEDS = [1, 1.25, 1.5, 2];

  class Player {
    constructor(root) {
      this.root = root;
      this.video = root.querySelector('video');
      const v = this.video;
      this.src = v.getAttribute('src');
      this.storeKey = 'pl:' + this.src;
      this.title = root.dataset.title || 'video';
      this.chapters = JSON.parse(root.dataset.chapters || '[]').map(([t, label]) => ({ t, label }));
      this.thumbs = root.dataset.thumbs
        ? { url: root.dataset.thumbs, cols: +root.dataset.thumbCols || 10, w: +root.dataset.thumbW || 160, h: +root.dataset.thumbH || 90 }
        : null;
      this.duration = +root.dataset.duration || 0;
      this.scrubbing = false;
      this.idleTimer = null;

      v.controls = false;
      v.removeAttribute('controls');
      v.playsInline = true;
      v.tabIndex = -1;
      root.tabIndex = 0;
      root.setAttribute('role', 'region');
      root.setAttribute('aria-label', `${this.title} video player. Space plays, arrows seek, f fullscreen.`);
      root.classList.add('pl', 'pl-poster');
      const vol = store.get('pl:volume');
      if (vol) { v.volume = vol.v; v.muted = vol.m; }

      this.build();
      this.bind();
      players.add(this);
    }

    build() {
      this.big = el('button', 'pl-big', `${ICON.play}<span>play demo</span>`);
      this.big.type = 'button';
      this.big.setAttribute('aria-label', `Play ${this.title}`);
      this.meta = el('span', 'pl-meta');
      this.resume = el('button', 'pl-resume');
      this.resume.type = 'button';
      this.resume.hidden = true;
      this.spinner = el('span', 'pl-spinner', '<i></i><i></i><i></i>');
      this.osd = el('span', 'pl-osd');
      this.osd.setAttribute('aria-live', 'polite');

      this.end = el('div', 'pl-end');
      const replay = el('button', 'pl-end-btn', `${ICON.replay}<span>replay</span>`);
      replay.type = 'button';
      replay.addEventListener('click', (e) => { e.stopPropagation(); this.seek(0); this.play(); });
      this.end.appendChild(replay);
      if (this.root.dataset.nextHref) {
        const next = el('a', 'pl-end-btn pl-next', `<span>next: ${this.root.dataset.nextLabel || 'next'}</span><span aria-hidden="true">→</span>`);
        next.href = this.root.dataset.nextHref;
        this.end.appendChild(next);
      }

      this.btnPlay = this.button('pl-play', ICON.play, 'Play (k)');
      this.time = el('span', 'pl-time', '0:00 <span>/ 0:00</span>');
      this.prog = el('div', 'pl-prog');
      this.prog.setAttribute('role', 'slider');
      this.prog.tabIndex = 0;
      this.prog.setAttribute('aria-label', 'Seek');
      this.prog.setAttribute('aria-valuemin', '0');
      this.prog.setAttribute('aria-valuenow', '0');
      this.track = el('div', 'pl-track');
      this.buf = el('div', 'pl-buf');
      this.played = el('div', 'pl-played');
      this.handle = el('div', 'pl-handle');
      this.track.append(this.buf, this.played);
      this.marks = el('div', 'pl-marks');
      this.tip = el('div', 'pl-tip', '<div class="pl-tip-img"></div><div class="pl-tip-text"><b></b><span></span></div>');
      if (!this.thumbs) this.tip.classList.add('pl-tip-noimg');
      this.prog.append(this.track, this.marks, this.handle, this.tip);

      this.chapterLabel = el('span', 'pl-chapter');
      this.btnSpeed = this.button('pl-speed', '1×', 'Playback speed ([ and ])');
      const volWrap = el('div', 'pl-volwrap');
      this.btnMute = this.button('pl-mute', this.video.muted ? ICON.mute : ICON.vol, 'Mute (m)');
      this.volume = el('input', 'pl-vol');
      Object.assign(this.volume, { type: 'range', min: 0, max: 1, step: 0.05, value: this.video.muted ? 0 : this.video.volume });
      this.volume.setAttribute('aria-label', 'Volume');
      volWrap.append(this.btnMute, this.volume);
      this.btnPip = this.button('pl-pip', ICON.pip, 'Picture in picture (p)');
      if (!document.pictureInPictureEnabled) this.btnPip.hidden = true;
      this.btnFull = this.button('pl-full', ICON.full, 'Fullscreen (f)');

      const left = el('div', 'pl-left');
      left.append(this.btnPlay, this.time);
      const right = el('div', 'pl-right');
      right.append(this.chapterLabel, this.btnSpeed, volWrap, this.btnPip, this.btnFull);
      const row = el('div', 'pl-row');
      row.append(left, right);
      this.bar = el('div', 'pl-bar');
      this.bar.append(this.prog, row);

      const center = el('div', 'pl-center');
      center.append(this.big, this.meta, this.resume);
      // the whole thumbnail is a play button, not just the corner one
      center.addEventListener('click', (e) => { if (e.target === center) this.big.click(); });
      this.root.append(center, this.spinner, this.osd, this.end, this.bar);

      if (this.thumbs) {
        const img = this.tip.querySelector('.pl-tip-img');
        img.style.backgroundImage = `url("${this.thumbs.url}")`;
        img.style.width = this.thumbs.w + 'px';
        img.style.height = this.thumbs.h + 'px';
      }

      this.chips = this.root.id ? document.querySelector(`.player-chapters[data-for="${this.root.id}"]`) : null;
      if (this.chips && this.chapters.length) {
        this.chapters.forEach((c) => {
          const b = el('button', 'pl-chip', `<span class="pl-chip-t">${fmt(c.t)}</span>${c.label}`);
          b.type = 'button';
          b.addEventListener('click', () => { this.seek(c.t); this.play(); this.root.focus({ preventScroll: true }); });
          this.chips.appendChild(b);
          c.chip = b;
        });
        const edges = () => {
          const ch = this.chips, max = ch.scrollWidth - ch.clientWidth;
          ch.classList.toggle('more-l', ch.scrollLeft > 4);
          ch.classList.toggle('more-r', ch.scrollLeft < max - 4);
        };
        this.chips.addEventListener('scroll', edges, { passive: true });
        new ResizeObserver(edges).observe(this.chips);
        edges();
      }
      this.updateMeta();
      this.renderMarks();
    }

    button(cls, html, label) {
      const b = el('button', 'pl-btn ' + cls, html);
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.title = label;
      return b;
    }

    get dur() { return this.video.duration || this.duration || 0; }

    updateMeta() {
      const d = this.dur;
      const parts = [];
      if (d) parts.push(fmt(d));
      if (this.chapters.length) parts.push(`${this.chapters.length} chapters`);
      parts.push(this.video.muted ? 'muted' : 'sound on');
      this.meta.textContent = parts.join(' · ');
      const saved = store.get(this.storeKey);
      if (saved && saved.t > 5 && (!d || saved.t < d - 5)) {
        this.resume.hidden = false;
        this.resume.textContent = `resume from ${fmt(saved.t)}`;
      } else this.resume.hidden = true;
    }

    renderMarks() {
      const d = this.dur;
      if (!d) return;
      this.marks.innerHTML = '';
      this.chapters.forEach((c) => {
        if (c.t <= 0) return;
        const m = el('i');
        m.style.left = (c.t / d) * 100 + '%';
        this.marks.appendChild(m);
      });
      this.prog.setAttribute('aria-valuemax', String(Math.round(d)));
      this.time.innerHTML = `${fmt(this.video.currentTime)} <span>/ ${fmt(d)}</span>`;
    }

    chapterAt(t) {
      let cur = null;
      for (const c of this.chapters) if (c.t <= t + 0.05) cur = c;
      return cur;
    }

    bind() {
      const v = this.video, r = this.root;
      const start = (t) => { r.classList.remove('pl-poster'); if (t != null) this.seek(t); this.play(); };
      this.big.addEventListener('click', (e) => { e.stopPropagation(); start(); });
      this.resume.addEventListener('click', (e) => { e.stopPropagation(); start((store.get(this.storeKey) || {}).t || 0); });
      this.btnPlay.addEventListener('click', () => this.toggle());
      v.addEventListener('click', () => {
        // on touch screens the first tap only brings the controls back
        if (matchMedia('(hover: none)').matches && r.classList.contains('pl-idle')) { this.wake(); return; }
        this.toggle();
      });
      v.addEventListener('dblclick', () => this.fullscreen());

      v.addEventListener('loadedmetadata', () => { this.renderMarks(); this.updateMeta(); });
      v.addEventListener('play', () => {
        players.forEach((p) => { if (p !== this) p.pause(); });
        r.classList.add('pl-playing');
        r.classList.remove('pl-ended', 'pl-poster');
        this.btnPlay.innerHTML = ICON.pause;
        this.btnPlay.setAttribute('aria-label', 'Pause (k)');
        this.wake();
      });
      v.addEventListener('pause', () => {
        r.classList.remove('pl-playing', 'pl-idle');
        this.btnPlay.innerHTML = ICON.play;
        this.btnPlay.setAttribute('aria-label', 'Play (k)');
        this.save();
      });
      v.addEventListener('ended', () => { r.classList.add('pl-ended'); store.del(this.storeKey); });
      v.addEventListener('waiting', () => r.classList.add('pl-loading'));
      ['playing', 'canplay', 'seeked'].forEach((ev) => v.addEventListener(ev, () => r.classList.remove('pl-loading')));
      v.addEventListener('timeupdate', () => this.tick());
      v.addEventListener('progress', () => this.drawBuffer());
      v.addEventListener('volumechange', () => {
        this.btnMute.innerHTML = v.muted || v.volume === 0 ? ICON.mute : ICON.vol;
        this.volume.value = v.muted ? 0 : v.volume;
        store.set('pl:volume', { v: v.volume, m: v.muted });
        this.updateMeta();
      });

      this.btnSpeed.addEventListener('click', () => this.speed(1));
      this.btnMute.addEventListener('click', () => { v.muted = !v.muted; if (!v.muted && v.volume === 0) v.volume = 0.6; });
      this.volume.addEventListener('input', () => { v.volume = +this.volume.value; v.muted = v.volume === 0; });
      this.btnPip.addEventListener('click', () => this.pip());
      this.btnFull.addEventListener('click', () => this.fullscreen());
      document.addEventListener('fullscreenchange', () => {
        const on = document.fullscreenElement === r;
        r.classList.toggle('pl-fs', on);
        this.btnFull.innerHTML = on ? ICON.exitfull : ICON.full;
      });

      // scrubbing + hover preview
      const tAt = (e) => {
        const rect = this.track.getBoundingClientRect();
        const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
        return { t: (x / rect.width) * this.dur, x, w: rect.width };
      };
      const showTip = (e) => {
        if (!this.dur) return;
        const { t, x, w } = tAt(e);
        const c = this.chapterAt(t);
        this.tip.querySelector('b').textContent = c ? c.label : '';
        this.tip.querySelector('span').textContent = fmt(t);
        if (this.thumbs) {
          const i = Math.max(0, Math.min(Math.floor(t), Math.floor(this.dur) - 1));
          const img = this.tip.querySelector('.pl-tip-img');
          img.style.backgroundPosition = `-${(i % this.thumbs.cols) * this.thumbs.w}px -${Math.floor(i / this.thumbs.cols) * this.thumbs.h}px`;
        }
        const tw = this.tip.offsetWidth || 170;
        this.tip.style.left = Math.min(Math.max(x - tw / 2, 0), w - tw) + 'px';
        this.prog.classList.add('pl-hover');
        this.prog.style.setProperty('--hover', (x / w) * 100 + '%');
      };
      let wasPlaying = false, raf = 0, pendingT = null;
      this.prog.addEventListener('pointermove', (e) => {
        showTip(e);
        if (!this.scrubbing) return;
        pendingT = tAt(e).t;
        this.paint(pendingT);
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (pendingT != null) v.currentTime = pendingT; });
      });
      this.prog.addEventListener('pointerleave', () => { if (!this.scrubbing) this.prog.classList.remove('pl-hover'); });
      this.prog.addEventListener('pointerdown', (e) => {
        if (!this.dur) return;
        r.classList.remove('pl-poster');
        this.scrubbing = true;
        r.classList.add('pl-scrubbing');
        this.prog.setPointerCapture(e.pointerId);
        wasPlaying = !v.paused;
        v.pause();
        const { t } = tAt(e);
        v.currentTime = t;
        this.paint(t);
        showTip(e);
      });
      const endScrub = () => {
        if (!this.scrubbing) return;
        this.scrubbing = false;
        r.classList.remove('pl-scrubbing');
        this.prog.classList.remove('pl-hover');
        if (wasPlaying) this.play();
      };
      this.prog.addEventListener('pointerup', endScrub);
      this.prog.addEventListener('pointercancel', endScrub);
      this.prog.addEventListener('keydown', (e) => {
        const step = e.shiftKey ? 10 : 5;
        const keys = { ArrowRight: v.currentTime + step, ArrowLeft: v.currentTime - step, Home: 0, End: this.dur - 0.5 };
        if (e.key in keys) { this.seek(keys[e.key]); e.preventDefault(); e.stopPropagation(); }
      });

      r.addEventListener('pointermove', () => this.wake());
      r.addEventListener('focusin', () => this.wake());
      r.addEventListener('keydown', (e) => this.key(e));
    }

    key(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target === this.volume && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
      if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
      const v = this.video;
      const k = e.key.toLowerCase();
      const map = {
        ' ': () => this.toggle(), k: () => this.toggle(),
        j: () => this.seek(v.currentTime - 10, '−10s'), l: () => this.seek(v.currentTime + 10, '+10s'),
        arrowleft: () => this.seek(v.currentTime - 5, '−5s'), arrowright: () => this.seek(v.currentTime + 5, '+5s'),
        arrowup: () => this.vol(0.1), arrowdown: () => this.vol(-0.1),
        m: () => { v.muted = !v.muted; this.flash(v.muted ? 'muted' : `volume ${Math.round(v.volume * 100)}%`); },
        f: () => this.fullscreen(), p: () => this.pip(),
        ']': () => this.speed(1), '[': () => this.speed(-1),
        n: () => this.chapterJump(1), b: () => this.chapterJump(-1),
      };
      if (/^[0-9]$/.test(k)) { this.seek((this.dur * +k) / 10, `${k * 10}%`); e.preventDefault(); e.stopPropagation(); return; }
      if (map[k]) { map[k](); e.preventDefault(); e.stopPropagation(); }
    }

    wake() {
      const r = this.root;
      r.classList.remove('pl-idle');
      clearTimeout(this.idleTimer);
      if (this.video.paused) return;
      this.idleTimer = setTimeout(() => {
        const focusInBar = this.bar.contains(document.activeElement);
        if (!this.video.paused && !this.scrubbing && !focusInBar) r.classList.add('pl-idle');
      }, 2200);
    }

    play() { this.root.classList.remove('pl-poster'); const p = this.video.play(); if (p) p.catch(() => {}); }
    pause() { this.video.pause(); }
    toggle() { if (this.video.paused) this.play(); else this.pause(); }

    seek(t, label) {
      const d = this.dur;
      t = Math.max(0, d ? Math.min(t, d - 0.05) : t);
      this.video.currentTime = t;
      this.paint(t);
      if (label) this.flash(label);
      this.root.classList.remove('pl-ended');
    }

    vol(dv) {
      const v = this.video;
      v.muted = false;
      v.volume = Math.min(1, Math.max(0, Math.round((v.volume + dv) * 20) / 20));
      this.flash(`volume ${Math.round(v.volume * 100)}%`);
    }

    speed(dir) {
      const v = this.video;
      const i = SPEEDS.indexOf(v.playbackRate);
      const n = SPEEDS[(Math.max(i, 0) + dir + SPEEDS.length) % SPEEDS.length];
      v.playbackRate = n;
      this.btnSpeed.textContent = n + '×';
      this.flash(`${n}× speed`);
    }

    chapterJump(dir) {
      if (!this.chapters.length) return;
      const t = this.video.currentTime;
      const cur = this.chapterAt(t);
      let i = cur ? this.chapters.indexOf(cur) : -1;
      // "previous" from deep inside a chapter goes to that chapter's start first
      if (dir < 0 && cur && t - cur.t > 2) i += 1;
      const c = this.chapters[Math.min(Math.max(i + dir, 0), this.chapters.length - 1)];
      this.seek(c.t, c.label);
    }

    flash(text) {
      this.osd.textContent = text;
      this.osd.classList.remove('pl-show');
      void this.osd.offsetWidth;
      this.osd.classList.add('pl-show');
    }

    async fullscreen() {
      const r = this.root, v = this.video;
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (r.requestFullscreen) { await r.requestFullscreen(); if (v.paused) this.play(); }
        else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
      } catch { /* fullscreen refused */ }
    }

    async pip() {
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else { await this.video.requestPictureInPicture(); if (this.video.paused) this.play(); }
      } catch { /* picture-in-picture refused */ }
    }

    paint(t) {
      const d = this.dur;
      if (!d) return;
      const pct = (t / d) * 100;
      this.played.style.width = pct + '%';
      this.handle.style.left = pct + '%';
      this.time.innerHTML = `${fmt(t)} <span>/ ${fmt(d)}</span>`;
      this.prog.setAttribute('aria-valuenow', String(Math.round(t)));
      this.prog.setAttribute('aria-valuetext', `${fmt(t)} of ${fmt(d)}`);
      const c = this.chapterAt(t);
      this.chapterLabel.textContent = c ? c.label : '';
      if (this.chips) {
        const live = !this.root.classList.contains('pl-poster');
        this.chapters.forEach((ch) => ch.chip && ch.chip.classList.toggle('pl-chip-on', live && ch === c));
        // keep the active chip in view in the scrolling row, without scrolling the page
        if (live && c && c.chip && c !== this.lastChip) {
          this.lastChip = c;
          const row = this.chips, chip = c.chip;
          row.scrollTo({ left: chip.offsetLeft - row.offsetLeft - 8, behavior: 'smooth' });
        }
      }
    }

    tick() {
      if (!this.scrubbing) this.paint(this.video.currentTime);
      const now = performance.now();
      if (!this.lastSave || now - this.lastSave > 2000) { this.lastSave = now; this.save(); }
    }

    save() {
      const t = this.video.currentTime, d = this.dur;
      if (t > 5 && d && t < d - 5) store.set(this.storeKey, { t });
    }

    drawBuffer() {
      const v = this.video, d = this.dur;
      if (!d || !v.buffered.length) return;
      let end = 0;
      for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= v.currentTime + 0.5) end = Math.max(end, v.buffered.end(i));
      this.buf.style.width = (end / d) * 100 + '%';
    }
  }

  // pause a playing video once it is mostly scrolled away (unless fullscreen or picture-in-picture)
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const p = [...players].find((x) => x.root === e.target);
      if (!p || e.isIntersecting || p.video.paused) return;
      if (document.fullscreenElement === p.root || document.pictureInPictureElement === p.video) return;
      p.pause();
    });
  }, { threshold: 0.25 }) : null;

  window.initPlayers = (scope = document) => {
    scope.querySelectorAll('figure.player').forEach((f) => {
      if (f.dataset.ready || !f.querySelector('video')) return;
      f.dataset.ready = '1';
      new Player(f);
      if (io) io.observe(f);
    });
  };
  window.initPlayers();
})();

# pranav sivakumar · portfolio

Static sites, hand-written. The source folder runs as is; `python tools/build.py` makes the deployable copy in `dist/` (minified, fingerprinted CSS/JS).

```
index.html, css/, js/, assets/   the portfolio (terminal + pixel art)
life/                            ~/life: alpine log, court, track, games, music
404.html                         self-contained not-found page (Pages serves it for any missing path)
site.webmanifest, assets/icons/  home-screen icons (redraw with tools/icons.py after changing favicon.svg)
tools/                           build.py, snapshot.py, resume.py, icons.py (not deployed)
speed/                           Speed project site
gexlab/                          GEXLab project site
blip/                            Blip project site
```

Each project folder is self-contained (its own `index.html`, `style.css`, `app.js`, `player.js`, `player.css` and `media/`), so it can also be moved into that project's own repo and served from there. The portfolio's main page reuses the videos and posters in those folders.

## Run locally

```sh
python serve.py      # range-aware, so video seeking works
```

Open http://localhost:8765, http://localhost:8765/speed/, /gexlab/, /blip/.

## Edit

- **~/life:** peaks are `ENTRIES` and `LADDER` in `life/life.js`; each peak's pixel landscape is a scene in `life/scenes.js`. Games are the `GAMES` array (each has a small attract-mode scene for the handheld). Records are the `CRATE` array: Apple Music track ids, looked up at runtime for titles, art and 30-second previews. F1 data is live from api.jolpi.ca.

- **Themes:** night (CRT terminal) and day (line-printer printout). Tokens are at the top of `css/style.css`; light-only material (paper bands, sprocket strips, highlighter) is under `[data-theme="light"]`. Canvas palettes live in `PALETTES` in `js/fx.js`. It opens on night; a visitor's switch is saved and wins on every page after that.
- **Hero chat:** answers and their picture cards are `ANSWERS`, `ROUTES` and `CARDS` in `js/main.js`. The GitHub calendar is live (public mirror at github-contributions-api.jogruber.de, no token); change `GH_USER` if the handle changes.
- **Desktop (wide screens):** the icons and `todo.txt` note are at the top of `index.html`.
- **Experience logos:** hand-pixelled in `LOGOS` in `js/icons.js` (Amazon, Intellizence, Tutoring Club, PolicyCon).

- **Copy:** all text lives in each `index.html`.
- **Links:** the email, GitHub and LinkedIn links are in `index.html` and in `LINKS` at the top of `js/main.js`. Change both.
- **Résumé:** replace `assets/resume.pdf`.
- **Avatar:** `js/sprite.js` builds the 28×75 sprite; colours are in `PALETTE` in `js/main.js`.
- **Tech marquee:** the `data-icons` lists in `index.html` (one row each); the pixel logos are drawn in `js/icons.js`. Rows repeat themselves until they're wider than the screen, so short lists never leave a gap.
- **Avatar:** `js/main.js` gives him simple physics (jump, lean, squash, throw and bounce). He wears gator blue on fall Saturdays and a santa hat in December.
- **Contact scene:** `fx.campus` draws UF at night; Century Tower's clock shows the visitor's local time, and the gator in Lake Alice bites when clicked.
- **Hero background:** a dot grid that turns into code around the cursor (`fx.glow` in `js/fx.js`); clicking sends a ripple.
- **Video thumbnails:** `*/media/*-poster.webp` are designed thumbnails.
- **Videos:** `*/media/*-demo.mp4`, with `*-poster.jpg` (thumbnail) and `*-thumbs.jpg` (one 160×90 frame per second, used for scrub previews). Chapters are the `data-chapters` attribute on each `<figure class="player">`.

## Video player

`js/player.js` + `css/player.css` (copied into each project folder). Nothing downloads until someone presses play.

Keys while the player is focused: space/k play, ←/→ 5s, j/l 10s, ↑/↓ volume, m mute, 0–9 jump, n/b next/previous chapter, [ ] speed, f fullscreen, p picture-in-picture. It remembers where you stopped and your volume.

## Portfolio command line

The status bar accepts `help`, `pickleball`, `speedrun`, `go gators`, `outfit gators|santa|normal` (plus unlisted ones: `dance`, `flip`, `f1`, `shrug`, `sudo`, the Konami code...), `neofetch`, `ls`, `ping pranav`, `git log`, `speed`, `gexlab`, `blip`, `hypothesize`, `spotifind`, `play speed` (and gexlab/blip), `experience`, `about`, `contact`, `resume`, `email`, `github`, `linkedin`, `wave`, `clear`. Tab completes, arrows walk history. Single keys when not typing: `r` résumé, `p` projects, `e` email, `g` GitHub, `l` LinkedIn, `/` focus the prompt, `?` help.

## Deploy

Cloudflare Pages. Build first, then upload `dist/`:

```sh
python tools/snapshot.py   # refresh the fallback copy of the live data
python tools/build.py      # -> dist/
python serve.py 8766 dist  # preview exactly what ships
```

`build.py` minifies every CSS/JS file a page links to (esbuild via npx, needs Node), renames it after its content hash (`style.96e8f560.css`), rewrites the pages, and writes `dist/_headers` with a year-long `immutable` rule per hashed file. HTML and media keep their names. Never edit `dist/` by hand; it's rebuilt from scratch each time.

Notes:
- **25 MB per-file limit.** The demo videos are re-encoded for the web (1080p60 H.264, about 2.3 Mbps, `+faststart` so they start before fully downloading). The full-quality originals live in each project's own `demo-video/` folder. To redo one:
  `ffmpeg -i original.mp4 -c:v libx264 -preset slow -crf 23 -maxrate 2300k -bufsize 4600k -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart speed/media/speed-demo.mp4`
  Delete the old file first: the web copies used to be hard links to the originals, and writing into a hard link changes the original too.
- **`_headers`:** security headers, a Content-Security-Policy, and cache rules (the source copy revalidates CSS/JS every visit; the built copy caches the hashed files for a year). If a new feature calls another domain (an API, a CDN), add it to `connect-src` / `img-src` / `media-src` or the browser blocks it. `python serve.py` applies the same file locally, so a blocked request shows up in the console before deploy.
- **Fonts are self-hosted** (`assets/fonts/`, plus `media/fonts/` in each project folder). Nothing loads from Google.
- Private notes (`reports/`, `research_notes/`) moved to `Desktop/portfolio-notes/` so they can't be deployed by accident. Keep them out of this folder.

## Before going live

- **Analytics:** in the Cloudflare dashboard, Pages project → Metrics → Web Analytics → Enable. Cloudflare injects its cookieless beacon itself; `_headers` already allows it.
- **Domain:** replace `YOUR-DOMAIN` in `robots.txt` and `sitemap.xml`.
- **Live-data fallback:** run `python tools/snapshot.py` before each deploy. If the GitHub or F1 feed is down, the page shows the last copy that visitor's browser saw, then `assets/snapshot.json`, labelled with its date.
- **Share previews:** `assets/og.png` and `assets/og-life.png` are the link-preview cards; each project page uses its own `media/og.jpg` (1200×630, cut from its poster). LinkedIn, iMessage and X need absolute URLs, so once the Cloudflare domain is set, change each `og:image` / `twitter:image` to `https://<domain>/assets/og.png` (and `og-life.png` on `life/`) and add `<meta property="og:url">`.
- **Résumé:** after replacing `assets/resume.pdf`, run `python tools/resume.py` to regenerate `assets/resume-page.webp` (the page the résumé viewer prints out). The viewer (`js/resume.js`) opens on any plain click of a link to `resume.pdf`; ctrl/cmd-click still opens the file.
- **Résumé date:** the "oct 2026" label on the résumé button is hand-set in `index.html`; bump it when `assets/resume.pdf` changes.
- **Now line:** the `now:` text in the status bar is in `index.html`.
- **Commit count:** the GitHub calendar comes from a public mirror that caches for about an hour. For fresher numbers, a scheduled Cloudflare Worker (or GitHub Action) can write a small JSON the page reads instead.

`js/qol.js` (every page, including the project pages, which get its styles from `css/qol.css`) holds the measured page weight (any `[data-weight]` element: compressed bytes, file count and load time from the browser's own timing data), the email-copies-to-clipboard behaviour, the ⌘K / Ctrl+K palette, the away-tab title and print-in-day-theme. Printing (Ctrl+P) gives a clean paper version: the print rules at the end of `css/style.css` hide the canvases, video and status bar.

Moving between pages uses a cross-document view transition (the same stepped wipe as the theme switch; `@view-transition` in `css/style.css`, `css/qol.css` and `404.html`), and every page carries speculation rules that prerender a same-site link once it's hovered, so project pages open instantly. Browsers without either just navigate normally.

Project cards on the home page each carry a `# tradeoff:` line under the bullets: one decision and what it cost.

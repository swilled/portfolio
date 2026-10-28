// Pixel avatar: a 28x75 sprite built from simple shapes, shaded per row so limbs and torso read as round.
// sprite(wave) returns a grid of material keys (h hair, s skin, t tee, p pants, f shoes, o outline + shade level 0-3).
const sprite = (wave) => {
  const W = 28, H = 75, part = [];
  for (let y = 0; y < H; y++) part.push(new Array(W).fill(''));
  const set = (x, y, k) => { if (x >= 0 && x < W && y >= 0 && y < H) part[y][x] = k; };
  const span = (y, a, b, k) => { for (let x = a; x <= b; x++) set(x, y, k); };
  // hair: wavy volume on top, short sides, fringe swept left to right
  span(0, 10, 11, 'h'); span(0, 14, 16, 'h'); set(19, 0, 'h');
  span(1, 9, 20, 'h'); span(2, 8, 20, 'h'); span(3, 7, 20, 'h'); span(4, 8, 19, 'h');
  // face: squared jaw, ears showing
  for (let y = 5; y <= 12; y++) span(y, 9, 18, 's');
  span(13, 10, 17, 's'); span(14, 11, 16, 's');
  set(8, 10, 's'); set(8, 11, 's'); set(19, 10, 's'); set(19, 11, 's');
  // longer wavy hair: fuller top, fringe falling in waves, sides over the top of the ears
  set(7, 1, 'h'); set(21, 2, 'h'); set(21, 3, 'h'); span(4, 7, 20, 'h');
  span(5, 7, 20, 'h'); span(6, 7, 17, 'h'); span(6, 19, 20, 'h');
  span(7, 7, 12, 'h'); span(7, 14, 15, 'h'); span(7, 19, 20, 'h');
  span(8, 7, 9, 'h'); set(11, 8, 'h'); span(8, 19, 20, 'h');
  set(7, 9, 'h'); set(8, 9, 'h'); set(19, 9, 'h'); set(20, 9, 'h');
  // slim neck, broad shoulders tapering to a slim straight waist
  for (let y = 15; y <= 16; y++) span(y, 12, 15, 'n');
  for (let y = 17; y <= 37; y++) { const a = y <= 21 ? 8 : 9; span(y, a, 27 - a, 't'); }
  span(17, 12, 15, 'n'); span(18, 13, 14, 'n');
  for (let y = 17; y <= 22; y++) span(y, 5, 8, 'T');
  set(5, 17, '');
  for (let y = 23; y <= 42; y++) span(y, 5, 6, 'a');
  span(43, 5, 7, 'a'); span(44, 5, 6, 'a');
  if (wave) {
    for (let y = 16; y <= 20; y++) span(y, 19, 23, 'U');
    set(23, 16, ''); set(19, 16, '');
    span(19, 24, 25, 'b'); span(18, 24, 25, 'b');
    for (let y = 7; y <= 17; y++) span(y, 24, 25, 'b');
    span(3, 24, 26, 'b'); span(4, 23, 26, 'b'); span(5, 23, 26, 'b'); span(6, 23, 26, 'b'); set(27, 4, 'b'); set(22, 6, 'b');
  } else {
    for (let y = 17; y <= 22; y++) span(y, 19, 22, 'U');
    set(22, 17, '');
    for (let y = 23; y <= 42; y++) span(y, 21, 22, 'b');
    span(43, 20, 22, 'b'); span(44, 21, 22, 'b');
  }
  // long legs
  for (let y = 38; y <= 41; y++) span(y, 9, 18, 'p');
  for (let y = 42; y <= 71; y++) { span(y, 9, 12, 'P'); span(y, 15, 18, 'Q'); }
  for (let y = 72; y <= 73; y++) { span(y, 8, 12, 'f'); span(y, 15, 19, 'g'); }
  span(74, 8, 12, 'F'); span(74, 15, 19, 'F');
  const mat = { G: 'g', E: 'g', M: 'g', h: 'h', s: 's', n: 's', a: 's', b: 's', t: 't', T: 't', U: 't', p: 'p', P: 'p', Q: 'p', f: 'f', g: 'f', F: 'f' };
  const g = part.map(r => r.map(() => ''));
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const k = part[y][x]; if (!k) { x++; continue; }
      let e = x; while (e + 1 < W && part[y][e + 1] === k) e++;
      for (let i = x; i <= e; i++) {
        let lvl;
        if (k === 'G') lvl = 0;
        else if (k === 'E') lvl = 1;
        else if (k === 'M') lvl = 2;
        else if (k === 'h') {
          const nx = (i + 0.5 - 14) / 6.7, ny = (y + 0.5 - 3) / 5;
          const band = ((i + 2 * y + Math.round(1.4 * Math.sin(y * 1.1))) % 5 + 5) % 5 === 0 ? 0.4 : 0;
          const l = 0.45 - 0.6 * nx - 0.45 * ny + band;
          lvl = l > 0.95 ? 0 : l > 0.5 ? 1 : l > 0.05 ? 2 : 3;
        } else if (k === 's' && y < 15) {
          const nx = (i + 0.5 - 14) / 4.8, ny = (y + 0.5 - 9.2) / 5.6;
          const l = 0.6 - 0.75 * nx - 0.3 * ny;
          lvl = l > 1.05 ? 0 : l > 0.45 ? 1 : l > 0.0 ? 2 : 3;
        } else if (k === 'F') lvl = 3;
        else {
          const t = e === x ? 0.5 : (i - x) / (e - x);
          lvl = t < 0.2 ? 0 : t < 0.58 ? 1 : t < 0.85 ? 2 : 3;
          if (k === 'n') lvl = Math.max(lvl, y <= 16 ? 3 : 2);
          if (k === 't' && y >= 36) lvl = Math.max(lvl, 2);
          if ((k === 'P' || k === 'Q') && y <= 44) lvl = Math.max(lvl, 1);
          if (k === 'p' && y === 38) lvl = 3;
        }
        g[y][i] = mat[k] + lvl;
      }
      x = e + 1;
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!part[y][x]) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = part[y + dy] && part[y + dy][x + dx]; if (n) { g[y][x] = 'o'; break; } }
  }
  return g;
};
const toPaths = (g, s, ox, oy) => { const d = { o: '' }; ['h', 's', 't', 'p', 'f', 'g'].forEach(k => { for (let i = 0; i < 4; i++) d[k + i] = ''; }); g.forEach((row, y) => row.forEach((c, x) => { if (!c) return; d[c] += 'M' + (ox + x * s) + ' ' + (oy + y * s) + 'h' + s + 'v' + s + 'h-' + s + 'z'; })); return d; };

// Extra poses built on the standing sprite: a shrug (forearms out, palms up) and a Santa hat overlay.
const reoutline = (g) => {
  const H = g.length, W = g[0].length;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === 'o') g[y][x] = '';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!g[y][x]) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = g[y + dy] && g[y + dy][x + dx]; if (n && n !== 'o') { g[y][x] = 'o'; break; } }
  }
  return g;
};
const spriteShrug = () => {
  const g = sprite(false);
  // drop the lower arms, then bend them outwards at the elbow with the hands turned up
  for (let y = 31; y <= 44; y++) { for (let x = 4; x <= 7; x++) g[y][x] = ''; for (let x = 20; x <= 23; x++) g[y][x] = ''; }
  for (let y = 31; y <= 32; y++) { for (let x = 1; x <= 6; x++) g[y][x] = y === 31 ? 's1' : 's2'; for (let x = 21; x <= 26; x++) g[y][x] = y === 31 ? 's1' : 's2'; }
  for (let y = 28; y <= 30; y++) { g[y][1] = 's1'; g[y][2] = 's2'; g[y][25] = 's1'; g[y][26] = 's2'; }
  return reoutline(g);
};
// a hat that sits over the hair: [x, y, colour key] cells
const santaHat = () => {
  const cells = [];
  for (let x = 7; x <= 20; x++) { cells.push([x, 4, 'w']); cells.push([x, 5, 'w']); }
  for (let y = 0; y <= 3; y++) for (let x = 8 + y; x <= 19 - Math.max(0, 2 - y); x++) cells.push([x, y, y === 3 ? 'r2' : 'r1']);
  [[20, 1], [21, 2], [22, 3]].forEach(([x, y]) => cells.push([x, y, 'r2']));
  [[22, 4], [23, 4], [22, 5], [23, 5]].forEach(([x, y]) => cells.push([x, y, 'w']));
  return cells;
};
// second waving frame: the top of the hand tips inward one pixel, so a wave reads as a wave instead of an arm popping up and down
const spriteWave2 = () => {
  const g = sprite(true);
  for (let y = 2; y <= 4; y++) {
    for (let x = 22; x < 27; x++) {
      const c = g[y][x + 1];
      if (x >= 22 && c && c !== 'o' && c[0] === 's') { g[y][x] = c; g[y][x + 1] = ''; }
    }
  }
  return reoutline(g);
};

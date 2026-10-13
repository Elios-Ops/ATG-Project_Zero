// RAMPAGE: SAVE LILLY — every screen and the in-game HUD, drawn on one canvas texture in front of the camera.
// Screens: title, menu, stage select, how to play, play HUD, banners, speech, tally, pause, game over, results.
import * as THREE from 'three';
import { drawText } from './hudfont.js';
import { STAGES } from './levels.js';
import { DIFFICULTY } from './sim.js';

const COL = { ink: '#f1ece6', dim: '#a8a2a0', red: '#ff3a24', crimson: '#d8231a', amber: '#ffb23a', gold: '#ffd23a', teal: '#21d4c4', dark: 'rgba(8,6,8,0.82)', green: '#5aff8a' };

export function createHud(p0, cam, fonts, logo, light) {
  const canvas = new OffscreenCanvas(1280, 720), ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
  mesh.renderOrder = 1000; mesh.frustumCulled = false; cam.add(mesh);
  let W = 1280, H = 720, k = 1, portrait = false;
  const hits = [];                                                  // clickable rectangles of the current screen
  function layout() {
    portrait = cam.aspect < 0.8;
    const base = light ? 900 : 1280;
    W = portrait ? Math.round(base * 0.62) : base; H = Math.round(W / cam.aspect);
    canvas.width = W; canvas.height = H; k = portrait ? W / 560 : Math.min(W / 1280, H / 720);
    const hh = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 0.5;
    mesh.position.set(0, 0, -0.5); mesh.scale.set(hh * cam.aspect, hh, 1);
  }
  const T = (s, x, y, size, color = COL.ink, align = 'left', display = false) => drawText(ctx, display ? fonts.D : fonts.T, s, x, y, size * k, color, align);
  const TS = (s, x, y, size, color, align, display) => { T(s, x + 2 * k, y + 3 * k, size, 'rgba(0,0,0,0.75)', align, display); T(s, x, y, size, color, align, display); };
  function panel(x, y, w, h, a = 0.82, edge = COL.crimson) {
    ctx.fillStyle = `rgba(10,7,9,${a})`; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = edge; ctx.fillRect(x, y, w, 3 * k); ctx.fillRect(x, y + h - 2 * k, w, 2 * k);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, y + 3 * k, 3 * k, h - 5 * k);
  }
  function button(id, label, x, y, w, h, on, sub) {
    hits.push({ id, x, y, w, h });
    ctx.fillStyle = on ? 'rgba(216,35,26,0.92)' : 'rgba(14,10,12,0.78)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = on ? COL.gold : 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2 * k; ctx.strokeRect(x, y, w, h);
    if (on) { ctx.fillStyle = COL.gold; ctx.beginPath(); ctx.moveTo(x - 14 * k, y + h / 2 - 9 * k); ctx.lineTo(x - 4 * k, y + h / 2); ctx.lineTo(x - 14 * k, y + h / 2 + 9 * k); ctx.fill(); }
    T(label, x + w / 2, y + h / 2 + 11 * k, 30, on ? '#ffffff' : COL.ink, 'center', true);
    if (sub) T(sub, x + w / 2, y + h + 22 * k, 17, COL.dim, 'center');
  }
  function drawLogo(cx, top, w) {                         // top: where the logo's top edge goes
    if (!logo) { TS('RAMPAGE', cx, top + 90 * k, 96 * w / 900, COL.red, 'center', true); TS('SAVE LILLY', cx, top + 150 * k, 48, COL.teal, 'center', true); return 160 * k; }
    const h = w * logo.height / logo.width; ctx.drawImage(logo, cx - w / 2, top, w, h); return h;
  }
  function vignette(a = 0.55) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const fmt = n => Math.max(0, Math.round(n)).toLocaleString('en-US');
  function lifeIcon(x, y, s) {                                       // a little Jax head
    ctx.fillStyle = '#d9a07a'; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1312'; ctx.beginPath(); ctx.arc(x - s * 0.1, y - s * 0.35, s * 0.85, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#e0321e'; ctx.fillRect(x - s, y + s * 0.65, s * 2, s * 0.4);
    ctx.fillStyle = '#15110f'; ctx.fillRect(x + s * 0.25, y - s * 0.05, s * 0.16, s * 0.34); ctx.fillRect(x - s * 0.15, y - s * 0.05, s * 0.16, s * 0.34);
  }
  function keepIcon(x, y, s, got) {
    ctx.strokeStyle = got ? COL.teal : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.stroke();
    if (got) { ctx.fillStyle = COL.teal; ctx.beginPath(); ctx.arc(x, y, s * 0.55, 0, 7); ctx.fill(); }
  }
  function gearIcon(x, y, s) {
    ctx.fillStyle = COL.gold; ctx.beginPath();
    for (let i = 0; i <= 32; i++) { const a = i / 32 * Math.PI * 2, r = (i % 4 < 2) ? s : s * 0.75; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.fill(); ctx.fillStyle = '#1a1208'; ctx.beginPath(); ctx.arc(x, y, s * 0.3, 0, 7); ctx.fill();
  }

  // ------------------------------------------------------------------------------------------------ screens
  function title(m) {
    vignette(0.65);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
    const lw = Math.min(W * 0.86, 820 * k, H * 1.05), lh = drawLogo(W / 2, H * (portrait ? 0.12 : 0.07), lw), ly = H * (portrait ? 0.12 : 0.07) + lh;
    if (Math.sin(m.t * 4.4) > -0.2) TS(m.touch ? 'TAP TO START' : 'PRESS START', W / 2, ly + 62 * k, 44, COL.gold, 'center', true);
    T('SPACE  ·  CONTROLLER A  ·  CLICK', W / 2, ly + 96 * k, 17, COL.dim, 'center');
    if (m.table && m.table.length) {
      const pw = 330 * k, px = portrait ? W / 2 - pw / 2 : W - pw - 30 * k, py = portrait ? H * 0.68 : H * 0.35, ph = (54 + Math.min(5, m.table.length) * 34) * k;
      panel(px, py, pw, ph, 0.75);
      T('TOP CONTENDERS THIS WEEK', px + 16 * k, py + 34 * k, 20, COL.amber);
      m.table.slice(0, 5).forEach((r, i) => { T(`${i + 1}. ${(r.name || 'PLAYER').slice(0, 16)}`, px + 16 * k, py + (70 + i * 34) * k, 21, r.you ? COL.gold : COL.ink); T(fmt(r.score), px + pw - 16 * k, py + (70 + i * 34) * k, 21, COL.ink, 'right'); });
    }
    T('© ALL THINGS GAMED · RAMPAGE · LOT 82', 24 * k, H - 22 * k, 16, COL.dim);
    T('ENTER. SURVIVE. CONQUER.', W - 24 * k, H - 22 * k, 16, COL.red, 'right', true);
  }
  function menu(m) {
    vignette(0.7); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
    const lh = drawLogo(W / 2, 16 * k, Math.min(W * 0.6, 470 * k, H * 0.55));
    const items = m.items, bw = Math.min(W * 0.7, 440 * k), bh = 54 * k, x = W / 2 - bw / 2, y0 = 16 * k + lh + 26 * k;
    items.forEach((it, i) => button(it.id, it.label, x, y0 + i * (bh + 14 * k), bw, bh, i === m.sel));
    const it = items[m.sel]; if (it && it.desc) T(it.desc, W / 2, y0 + items.length * (bh + 14 * k) + 26 * k, 19, COL.dim, 'center');
    footer(m.touch ? 'TAP TO CHOOSE' : '↑ ↓ CHOOSE · ← → CHANGE · SPACE CONFIRM · BACKSPACE BACK');
    if (m.back) button('back', 'BACK', 24 * k, H - 86 * k, 150 * k, 50 * k, false);
  }
  function select(m) {
    vignette(0.7); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
    TS('STAGE SELECT', W / 2, 80 * k, 54, COL.ink, 'center', true);
    T('PRACTICE ANY STAGE · SCORES COUNT IN ARCADE MODE', W / 2, 116 * k, 18, COL.dim, 'center');
    const cols = portrait ? 1 : 4, cw = portrait ? W * 0.8 : Math.min(270 * k, (W - 120 * k) / 4), ch = portrait ? 100 * k : 300 * k, gap = 18 * k;
    const x0 = W / 2 - (cols * cw + (cols - 1) * gap) / 2, y0 = 150 * k;
    STAGES.forEach((st, i) => {
      const cx = x0 + (i % cols) * (cw + gap), cy = y0 + Math.floor(i / cols) * (ch + gap), on = i === m.sel;
      hits.push({ id: 'stage' + i, x: cx, y: cy, w: cw, h: ch });
      ctx.fillStyle = on ? 'rgba(90,14,10,0.92)' : 'rgba(12,9,11,0.82)'; ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeStyle = on ? COL.gold : 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2 * k; ctx.strokeRect(cx, cy, cw, ch);
      const sw = ['#ff6a1a', '#ffb21a', '#ff2414', '#c01a10'][i]; ctx.fillStyle = sw; ctx.fillRect(cx, cy, cw, 6 * k);
      T(st.title, cx + 18 * k, cy + 44 * k, 22, sw, 'left', true);
      T(st.name, cx + 18 * k, cy + (portrait ? 80 : 92) * k, portrait ? 30 : 34, '#ffffff', 'left', true);
      if (!portrait) wrap(st.tag, cx + 18 * k, cy + 140 * k, cw - 36 * k, 18, COL.dim);
    });
    footer(m.touch ? 'TAP A STAGE' : '← → CHOOSE · SPACE PLAY · BACKSPACE BACK');
    button('back', 'BACK', 24 * k, H - 86 * k, 150 * k, 50 * k, false);
  }
  function wrap(text, x, y, w, size, color) {
    const words = text.split(' '); let line = '', yy = y; ctx.font = `${size * k}px sans-serif`;
    for (const wd of words) { const t2 = line ? line + ' ' + wd : wd; if (ctx.measureText(t2).width * 0.95 > w && line) { T(line, x, yy, size, color); line = wd; yy += size * 1.35 * k; } else line = t2; }
    if (line) T(line, x, yy, size, color);
  }
  function howto(m) {
    vignette(0.7); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    TS('HOW TO PLAY', W / 2, 80 * k, 54, COL.ink, 'center', true);
    const pw = Math.min(W - 60 * k, 980 * k), px = W / 2 - pw / 2, py = 110 * k; panel(px, py, pw, H - 220 * k, 0.8);
    const rows = [
      ['MOVE', 'A / D  or  ← →  ·  stick'], ['CLIMB', 'W / S  or  ↑ ↓ at a ladder'], ['JUMP', 'SPACE  ·  controller A  ·  JUMP button'],
      ['PAUSE', 'P  ·  controller START'], ['RETRY', 'R (from pause or game over)'],
    ];
    rows.forEach(([a, b], i) => { T(a, px + 30 * k, py + (54 + i * 40) * k, 26, COL.amber, 'left', true); T(b, px + 190 * k, py + (54 + i * 40) * k, 22); });
    const y2 = py + 270 * k;
    T('JUMP OVER DRUMS AND VOLTS FOR POINTS. GRAB THE OVERDRIVE GAUNTLET TO SMASH THEM.', px + 30 * k, y2, 18, COL.ink);
    T("COLLECT GEARS (100) AND LILLY'S THREE KEEPSAKES (800 EACH). TOUCH A BEACON TO SAVE YOUR PLACE.", px + 30 * k, y2 + 30 * k, 18, COL.ink);
    T('THE BONUS COUNTS DOWN: FINISH FAST. WHEN IT RUNS OUT THE WARDEN GETS ANGRY.', px + 30 * k, y2 + 60 * k, 18, COL.ink);
    T('FINAL: STEP ON THE FOUR GLOWING COUPLINGS TO BRING THE WARDEN DOWN.', px + 30 * k, y2 + 90 * k, 18, COL.gold);
    gearIcon(px + pw - 120 * k, y2 - 60 * k, 16 * k); keepIcon(px + pw - 80 * k, y2 - 60 * k, 14 * k, true); lifeIcon(px + pw - 40 * k, y2 - 60 * k, 14 * k);
    button('back', 'BACK', 24 * k, H - 86 * k, 150 * k, 50 * k, false);
  }
  function footer(s) { T(s, W / 2, H - 28 * k, 17, COL.dim, 'center'); }

  function play(m) {
    const s = m.sim; if (!s) return;
    ctx.save(); if (portrait) ctx.translate(0, 70 * k);           // phones: clear the city's bar at the top
    // top-left: score and lives
    panel(16 * k, 14 * k, 270 * k, 88 * k, 0.7);
    T('SCORE', 30 * k, 40 * k, 16, COL.dim); T(fmt(m.score + s.score), 30 * k, 82 * k, 40, '#ffffff', 'left', true);
    for (let i = 0; i < Math.min(6, s.lives); i++) lifeIcon(200 * k + i * 0 + (i % 3) * 26 * k, (i < 3 ? 46 : 76) * k, 10 * k);
    if (s.lives > 6) T('×' + s.lives, 270 * k, 84 * k, 18, COL.ink, 'right');
    // top-centre: stage and bonus (or the Warden's couplings)
    const st = STAGES[m.stageIdx], cw = 300 * k, cx = W / 2 - cw / 2;
    panel(cx, 14 * k, cw, 74 * k, 0.7);
    T(`${st.title} · ${st.name}`, W / 2, 38 * k, 17, COL.amber, 'center', true);
    if (s.boss) {
      const done = s.boss.done.filter(Boolean).length; T('COUPLINGS', cx + 18 * k, 72 * k, 18, COL.dim);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = s.boss.done[i] ? 'rgba(255,255,255,0.15)' : (i < 4 - done ? COL.red : COL.red); ctx.fillStyle = s.boss.done[i] ? 'rgba(255,255,255,0.18)' : COL.red; ctx.fillRect(cx + 130 * k + i * 38 * k, 56 * k, 32 * k, 18 * k); }
    } else {
      T('BONUS', cx + 20 * k, 72 * k, 18, COL.dim);
      T(fmt(s.bonus), cx + cw - 20 * k, 76 * k, 30, s.bonus <= 1000 ? COL.red : COL.gold, 'right', true);
    }
    // top-right: keepsakes and gears
    if (!s.boss) {
      const rx = W - 16 * k - 210 * k; panel(rx, 14 * k, 210 * k, 74 * k, 0.7);
      s.keeps.forEach((g2, i) => keepIcon(rx + 34 * k + i * 36 * k, 48 * k, 12 * k, g2));
      gearIcon(rx + 150 * k, 48 * k, 13 * k); T('×' + s.gears, rx + 168 * k, 56 * k, 22, '#ffffff');
      T(DIFFICULTY[m.difficulty].name, rx + 105 * k, 80 * k, 13, COL.dim, 'center');
    }
    ctx.restore();
    // Overdrive timer
    const h = s.hero;
    if (h.gaunt > 0) {
      const bw = 300 * k, bx = W / 2 - bw / 2, by = H - 70 * k; panel(bx, by - 30 * k, bw, 52 * k, 0.75, COL.amber);
      T('OVERDRIVE', bx + 14 * k, by - 6 * k, 20, COL.amber, 'left', true);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(bx + 130 * k, by - 20 * k, 155 * k, 14 * k);
      ctx.fillStyle = COL.amber; ctx.fillRect(bx + 130 * k, by - 20 * k, 155 * k * h.gaunt / 10, 14 * k);
    }
    // the Surge
    if (s.surgeY !== null && h.state === 'play') {
      const gap = h.y - s.surgeY;
      if (gap < 7) { const by = H - (portrait ? 260 : 120) * k; panel(W / 2 - 220 * k, by, 440 * k, 50 * k, 0.85); T(gap < 3 ? 'THE SURGE IS ON YOU — CLIMB!' : `THE SURGE: ${gap.toFixed(1)} m BELOW`, W / 2, by + 35 * k, 24, gap < 3 ? COL.red : COL.amber, 'center', true); }
    }
    // score popups
    for (const p of m.popups) { const a = 1 - p.t; if (a <= 0) continue; ctx.globalAlpha = a; TS(p.text, p.sx, p.sy - p.t * 40 * k, p.text === '1UP' ? 30 : 22, p.text === '1UP' ? COL.green : '#ffffff', 'center', true); ctx.globalAlpha = 1; }
    // touch buttons
    if (m.touch) {
      const r = 64 * k, jx = W - r - 34 * k, jy = H - r - (portrait ? 150 : 40) * k;
      hits.push({ id: 'jump', x: jx - r, y: jy - r, w: 2 * r, h: 2 * r });
      ctx.fillStyle = m.jumpHeld ? 'rgba(216,35,26,0.75)' : 'rgba(20,14,16,0.55)'; ctx.beginPath(); ctx.arc(jx, jy, r, 0, 7); ctx.fill();
      ctx.strokeStyle = COL.gold; ctx.lineWidth = 3 * k; ctx.stroke(); T('JUMP', jx, jy + 10 * k, 28, '#ffffff', 'center', true);
      hits.push({ id: 'pause', x: W - 70 * k, y: 100 * k, w: 54 * k, h: 54 * k });
      ctx.fillStyle = 'rgba(20,14,16,0.55)'; ctx.fillRect(W - 70 * k, 100 * k, 54 * k, 54 * k);
      ctx.fillStyle = '#fff'; ctx.fillRect(W - 54 * k, 112 * k, 8 * k, 30 * k); ctx.fillRect(W - 40 * k, 112 * k, 8 * k, 30 * k);
    }
  }
  function speech(m) {
    const sp = m.speech; if (!sp || sp.t > sp.dur) return;
    const a = Math.min(1, sp.t * 6, (sp.dur - sp.t) * 4);
    ctx.globalAlpha = a;
    ctx.font = `${22 * k}px sans-serif`;
    const w = Math.max(160 * k, sp.text.length * 12.5 * k + 40 * k), h = 50 * k;
    let x = sp.sx, y = sp.sy, offscreen = !(x > 0 && x < W && y > 0 && y < H);
    if (offscreen) { x = W / 2; y = 128 * k; }
    x = Math.max(w / 2 + 10 * k, Math.min(W - w / 2 - 10 * k, x)); y = Math.max(h + 110 * k, Math.min(H - 20 * k, y));
    ctx.fillStyle = 'rgba(245,250,250,0.95)'; roundRect(x - w / 2, y - h - 14 * k, w, h, 14 * k); ctx.fill();
    if (!offscreen) { ctx.beginPath(); ctx.moveTo(x - 10 * k, y - 15 * k); ctx.lineTo(x + 6 * k, y - 15 * k); ctx.lineTo(x - 8 * k, y); ctx.fill(); }
    T(offscreen ? 'LILLY: ' + sp.text : sp.text, x, y - h / 2 - 4 * k, 22, '#0d6f69', 'center', true);
    ctx.globalAlpha = 1;
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function banner(m) {
    const b = m.banner; if (!b || b.t > b.dur) return;
    const u = b.t / b.dur, a = Math.min(1, b.t * 5, (b.dur - b.t) * 3), slide = (1 - Math.min(1, b.t * 4)) * 60 * k;
    ctx.globalAlpha = a;
    const y = H * (b.big ? 0.42 : 0.3);
    if (b.big) { ctx.fillStyle = 'rgba(8,4,6,0.8)'; ctx.fillRect(0, y - 90 * k, W, 150 * k); ctx.fillStyle = COL.crimson; ctx.fillRect(0, y - 90 * k, W, 4 * k); ctx.fillRect(0, y + 56 * k, W, 4 * k); }
    TS(b.text, W / 2 + slide, y, b.big ? 72 : 46, b.color || '#ffffff', 'center', true);
    if (b.sub) T(b.sub, W / 2 - slide, y + (b.big ? 40 : 34) * k, b.big ? 24 : 20, b.subColor || COL.amber, 'center', true);
    ctx.globalAlpha = 1;
  }
  function letterbox(m) {
    const a = m.letterbox || 0; if (a <= 0) return;
    const bh = 72 * k * a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
    if (m.caption) { ctx.globalAlpha = a; T(m.caption, W / 2, H - bh / 2 + 9 * k, 24, '#ffffff', 'center', true); ctx.globalAlpha = 1; }
    if (m.canSkip && a > 0.9) T(m.touch ? 'TAP TO SKIP' : 'SPACE TO SKIP', W - 20 * k, 40 * k, 15, COL.dim, 'right');
  }
  function tally(m) {
    const tl = m.tally; if (!tl) return;
    const pw = Math.min(W - 40 * k, 560 * k), ph = (170 + tl.rows.length * 38) * k, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
    panel(px, py, pw, ph, 0.9);
    TS(tl.title, W / 2, py + 64 * k, 52, COL.gold, 'center', true);
    tl.rows.forEach((r, i) => { if (tl.t < 0.4 + i * 0.35) return; T(r[0], px + 34 * k, py + (120 + i * 38) * k, 24, COL.ink, 'left', true); T(r[1], px + pw - 34 * k, py + (120 + i * 38) * k, 24, r[2] || '#ffffff', 'right', true); });
    if (tl.t > 0.4 + tl.rows.length * 0.35) { T('TOTAL', px + 34 * k, py + ph - 30 * k, 30, COL.amber, 'left', true); T(fmt(tl.shown), px + pw - 34 * k, py + ph - 30 * k, 36, '#ffffff', 'right', true); }
  }
  function overlayMenu(m, titleText, sub, items) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    TS(titleText, W / 2, H * 0.28, 76, titleText === 'GAME OVER' ? COL.red : '#ffffff', 'center', true);
    if (sub) T(sub, W / 2, H * 0.28 + 44 * k, 22, COL.amber, 'center', true);
    const bw = Math.min(W * 0.7, 420 * k), bh = 56 * k, y0 = H * 0.42;
    items.forEach((it, i) => button(it.id, it.label, W / 2 - bw / 2, y0 + i * (bh + 16 * k), bw, bh, i === m.sel));
  }
  function results(m) {
    const r = m.results; if (!r) return;
    vignette(0.6); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
    TS(r.title, W / 2, H * 0.19, portrait ? 52 : 76, r.win ? COL.gold : COL.red, 'center', true);
    if (r.sub) T(r.sub, W / 2, H * 0.19 + 40 * k, 22, COL.teal, 'center', true);
    const pw = Math.min(W - 40 * k, 620 * k), ph = (110 + r.rows.length * 34) * k, px = W / 2 - pw / 2, py = H * 0.19 + 64 * k;
    panel(px, py, pw, ph, 0.85);
    r.rows.forEach((row, i) => { T(row[0], px + 30 * k, py + (44 + i * 34) * k, 21, COL.ink); T(row[1], px + pw - 30 * k, py + (44 + i * 34) * k, 21, row[2] || '#ffffff', 'right'); });
    T('FINAL SCORE', px + 30 * k, py + ph - 26 * k, 28, COL.amber, 'left', true); T(fmt(r.score), px + pw - 30 * k, py + ph - 24 * k, 40, '#ffffff', 'right', true);
    T(`RANK · ${r.rank}`, W / 2, py + ph + 44 * k, 34, COL.gold, 'center', true);
    if (m.rewardText) T(m.rewardText, W / 2, py + ph + 78 * k, 19, COL.dim, 'center');
    const bw = Math.min(W * 0.4, 260 * k), bh = 54 * k, by = Math.min(H - 80 * k, py + ph + 110 * k);
    button('again', 'PLAY AGAIN', W / 2 - bw - 10 * k, by, bw, bh, m.sel === 0, m.touch ? '' : 'R');
    button('menu', 'MAIN MENU', W / 2 + 10 * k, by, bw, bh, m.sel === 1, m.touch ? '' : 'M');
  }
  function wipe(m) {
    const u = m.wipe; if (!u) return;
    ctx.fillStyle = '#0a0406';
    const n = 8;
    for (let i = 0; i < n; i++) {
      const p = Math.max(0, Math.min(1, u * 1.6 - i / n * 0.6)), y = i * H / n;
      ctx.fillStyle = i % 2 ? '#0a0406' : '#3a0806'; ctx.fillRect(i % 2 ? W - p * W * 1.1 : -0.1 * W, y, p * W * 1.2, H / n + 1);
    }
  }
  let lastDraw = -1;
  function draw(m, now) {
    const hz = light ? 12 : 30;
    if (now - lastDraw < 1 / hz && !m.force) return;
    lastDraw = now; m.force = false;
    hits.length = 0; ctx.clearRect(0, 0, W, H);
    if (m.screen === 'title') title(m);
    else if (m.screen === 'menu') menu(m);
    else if (m.screen === 'select') select(m);
    else if (m.screen === 'howto') howto(m);
    if (m.showHud) play(m);
    speech(m); banner(m); letterbox(m); tally(m);
    if (m.screen === 'pause') overlayMenu(m, 'PAUSED', `${STAGES[m.stageIdx].title} · ${STAGES[m.stageIdx].name}`, m.items);
    if (m.screen === 'gameover') overlayMenu(m, 'GAME OVER', `SCORE ${fmt(m.score)}`, m.items);
    if (m.screen === 'results') results(m);
    wipe(m);
    tex.needsUpdate = true;
  }
  function hit(px, py) {                                  // px, py: 0..1 of the view
    const x = px * W, y = py * H;
    for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h.id; }
    return null;
  }
  layout();
  return { mesh, layout, draw, hit, size: () => ({ W, H, k, portrait }) };
}

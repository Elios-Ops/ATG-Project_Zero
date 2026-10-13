// RAMPAGE: SAVE LILLY — the game's rules as a pure, deterministic simulation (no three.js, no p0).
// Fixed step (1/60 s). The renderer reads this state; the tests drive it headless. All Things Gamed, Lot #82.
import { buildLevel, surf } from './levels.js';

export const DT = 1 / 60;
export const T = {                       // hero tuning (world metres, seconds)
  run: 6.4, accG: 70, accA: 44, decG: 80, grav: 32, jump: 12.6, jumpCut: 5.0, maxFall: 24, climb: 4.2,
  coyote: 0.1, buffer: 0.13, hw: 0.32, hh: 1.4, inv: 2.2, dieTime: 1.9, gauntlet: 10,
  drumR: 0.42, drumSpeed: 4.4, bugSpeed: 2.0,
};
export const DIFFICULTY = {
  rookie: { name: 'ROOKIE', lives: 5, hazard: 0.78, surge: 0.78 },
  normal: { name: 'NORMAL', lives: 3, hazard: 1.0, surge: 1.0 },
  rampage: { name: 'RAMPAGE', lives: 3, hazard: 1.25, surge: 1.18 },
};
export const POINTS = { gear: 100, jump: 100, jump2: 300, smash: 300, smashBug: 500, keep: 800, clear: 2000, coupling: 2500, boss: 10000, life: 0, noDeath: 1000 };

export function rng(seed) {                       // mulberry32: the same numbers on every machine
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);

// ------------------------------------------------------------------------------------------------ creation
export function createSim(levelId, opts = {}) {
  const L = buildLevel(levelId);
  const diff = DIFFICULTY[opts.difficulty || 'normal'];
  const s = {
    L, id: levelId, diff, rand: rng(opts.seed ?? 82), t: 0, frame: 0,
    score: opts.score ?? 0, lives: opts.lives ?? diff.lives, gears: 0, keeps: [false, false, false], jumped: 0, smashed: 0, deaths: 0,
    bonus: L.bonus, bonusClock: 0, anger: 0, result: null, events: [], invincible: !!opts.invincible,
    cp: 0, items: L.items.map((it, i) => ({ ...it, i, got: false })),
    plats: L.plats.map(p => ({ ...p, bx0: p.x0, bx1: p.x1, by0: p.y0, by1: p.y1, vx: 0, vy: 0, dy: 0, col: 'idle', ct: 0 })),
    drums: [], bugs: [], waves: [], popups: [], nextId: 1,
    surgeY: L.surge ? L.surge.start : null,
    warden: L.warden ? { state: 'idle', t: 0, next: L.warden.firstThrow, throws: 0 } : null,
    hoppers: (L.hoppers || []).map(h => ({ ...h, warn: false })),
    bouncer: L.bouncer ? { next: 1.5 } : null,
    boss: L.boss ? { done: [false, false, false, false], phase: 0, state: 'idle', t: 0, cd: 2.4, attack: null, target: null, beam: null, gift: -1, last: '' } : null,
    sabotaged: false, triggers: new Set(), lilly: L.lilly ? L.lilly.mode : null,
    hero: null,
  };
  for (const b of L.bugs || []) addBug(s, b.x, b.y);
  placePlatforms(s);
  spawnHero(s, L.checkpoints[0]);
  s.hero.inv = 0;
  return s;
}
function spawnHero(s, cp) {
  s.hero = { x: cp.x, y: cp.y, vx: 0, vy: 0, ground: null, ladder: null, face: 1, coyote: 0, jbuf: 0, held: false, inv: T.inv,
             state: 'play', st: 0, gaunt: 0, airT: 0, landT: 1, climbT: 0, runT: 0, hurtBy: null, lastY: cp.y };
  const g = platUnder(s, cp.x, cp.y + 0.3, 0.6); if (g >= 0) { s.hero.ground = g; s.hero.y = platY(s.plats[g], cp.x); }
}
const ev = (s, type, x = 0, y = 0, extra) => s.events.push({ type, x, y, ...extra });
const pop = (s, text, x, y) => s.popups.push({ text, x, y, t: 0 });
function addPoints(s, n, x, y) { if (!n) return; s.score += n; pop(s, String(n), x, y); }

// ------------------------------------------------------------------------------------------------ platforms
export function platY(p, x) { return p.y0 + (p.y1 - p.y0) * (x - p.x0) / (p.x1 - p.x0 || 1); }
function solid(p) { return !(p.kind === 'collapse' && (p.col === 'fall' || p.col === 'gone')) && !p.hidden; }
function placePlatforms(s) {
  const t = s.t;
  for (const p of s.plats) {
    const ox = p.x0, oy = p.y0;
    if (p.move) {
      const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * (t / p.move.period + p.move.phase));
      p.x0 = p.bx0 + p.move.ax * k; p.x1 = p.bx1 + p.move.ax * k; p.y0 = p.by0 + p.move.ay * k; p.y1 = p.by1 + p.move.ay * k;
    } else if (p.loop) {
      const R = p.loop.y1 - p.loop.y0, sp = p.loop.speed;
      const u = ((Math.abs(sp) * t + p.loop.phase) % R + R) % R;
      const y = sp > 0 ? p.loop.y0 + u : p.loop.y1 - u;
      p.y0 = p.y1 = y; p.wrapped = Math.abs(y - oy) > 2;
    }
    p.vx = (p.x0 - ox) / DT; p.dy = p.y0 - oy; p.vy = p.dy / DT;
    if (p.wrapped || s.frame === 0) { p.vx = 0; p.vy = 0; p.dy = 0; }
    if (p.kind === 'collapse') {
      p.ct += DT;
      if (p.col === 'shake' && p.ct > 0.5) { p.col = 'fall'; p.ct = 0; ev(s, 'collapse', (p.x0 + p.x1) / 2, p.y0); }
      else if (p.col === 'fall' && p.ct > 0.9) { p.col = 'gone'; p.ct = 0; }
      else if (p.col === 'gone' && p.ct > 3.4) { p.col = 'idle'; p.ct = 0; ev(s, 'restore', (p.x0 + p.x1) / 2, p.y0); }
    }
  }
}
// the highest solid platform whose surface lies at or below y + up at x (within `down` below)
function platUnder(s, x, y, down = 0.5, skip = -1) {
  let best = -1, by = -Infinity;
  for (let i = 0; i < s.plats.length; i++) {
    const p = s.plats[i]; if (i === skip || !solid(p) || p.boss) continue;
    if (x < p.x0 - 0.02 || x > p.x1 + 0.02) continue;
    const py = platY(p, x);
    if (py <= y && py >= y - down && py > by) { by = py; best = i; }
  }
  return best;
}
// landing: crossed the surface going down this step (surfaces move, so compare against where it was)
function landing(s, x, prevY, y, vy, skip = -1) {
  if (vy > 0) return -1;
  let best = -1, by = -Infinity;
  for (let i = 0; i < s.plats.length; i++) {
    const p = s.plats[i]; if (i === skip || !solid(p) || p.boss) continue;
    if (x < p.x0 - 0.05 || x > p.x1 + 0.05) continue;
    const now = platY(p, x), before = now - p.dy;
    if (prevY >= before - 0.06 && y <= now + 0.01 && now > by) { by = now; best = i; }
  }
  return best;
}

// ------------------------------------------------------------------------------------------------ the hero
function ladderAt(s, x, y, mode) {
  for (let i = 0; i < s.L.ladders.length; i++) {
    const l = s.L.ladders[i];
    if (Math.abs(x - l.x) > 0.55) continue;
    if (mode === 'up' && y >= l.y0 - 0.45 && y <= l.y1 - 0.3) return i;
    if (mode === 'down' && Math.abs(y - l.y1) < 0.45) return i;
  }
  return -1;
}
function heroStep(s, inp) {
  const h = s.hero, prevY = h.y, wasGround = h.ground !== null;
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  if (inp.jumpPressed) h.jbuf = T.buffer; else h.jbuf = Math.max(0, h.jbuf - DT);
  h.inv = Math.max(0, h.inv - DT); h.gaunt = Math.max(0, h.gaunt - DT);
  if (h.gaunt > 0 && h.gaunt < DT * 1.5) ev(s, 'gauntletEnd', h.x, h.y);

  // ---- on a ladder
  if (h.ladder !== null) {
    const l = s.L.ladders[h.ladder];
    h.x += (l.x - h.x) * Math.min(1, DT * 18); h.vx = 0;
    const cv = (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
    h.vy = cv * T.climb; h.y += h.vy * DT; if (cv) h.climbT += DT;
    if (h.jbuf > 0 && dir) {                                   // hop off sideways
      h.ladder = null; h.vy = T.jump * 0.7; h.vx = dir * T.run * 0.8; h.face = dir; h.jbuf = 0; ev(s, 'jump', h.x, h.y);
    } else if (h.y >= l.y1) {
      h.y = l.y1; h.ladder = null; h.vy = 0; const g = platUnder(s, h.x, h.y + 0.05, 0.3); h.ground = g >= 0 ? g : null;
    } else if (h.y <= l.y0 && cv < 0) {
      h.y = l.y0; h.ladder = null; h.vy = 0; const g = platUnder(s, h.x, h.y + 0.05, 0.3); h.ground = g >= 0 ? g : null;
    }
    return;
  }
  // ---- grab a ladder (not while wearing the gauntlet: it is too heavy)
  if (h.gaunt <= 0) {
    if (inp.up) { const i = ladderAt(s, h.x, h.y, 'up'); if (i >= 0 && !(h.ground === null && h.vy > 2)) { h.ladder = i; h.ground = null; h.vx = 0; h.vy = 0; h.y = Math.max(h.y, s.L.ladders[i].y0); return; } }
    if (inp.down && h.ground !== null) { const i = ladderAt(s, h.x, h.y, 'down'); if (i >= 0) { h.ladder = i; h.ground = null; h.y -= 0.06; h.vx = 0; return; } }
  }
  // ---- run
  const target = dir * T.run;
  const acc = h.ground !== null ? (dir ? T.accG : T.decG) : T.accA;
  h.vx += clamp(target - h.vx, -acc * DT, acc * DT);
  if (dir) h.face = dir;
  // ---- carried by the platform (conveyors, lifts)
  let carryX = 0;
  if (h.ground !== null) { const p = s.plats[h.ground]; carryX = (p.conv || 0) + p.vx; }
  // ---- jump
  if (h.jbuf > 0 && (h.ground !== null || h.coyote > 0)) {
    const p = h.ground !== null ? s.plats[h.ground] : null;
    h.vy = T.jump + (p && p.vy > 0 ? p.vy * 0.5 : 0); h.ground = null; h.coyote = 0; h.jbuf = 0; h.held = true; h.airT = 0;
    if (p) h.vx += p.vx * 0.6;
    ev(s, 'jump', h.x, h.y);
  }
  if (!inp.jump) h.held = false;
  if (h.ground === null) {
    if (!h.held && h.vy > T.jumpCut) h.vy = T.jumpCut;       // let go early: a shorter hop
    h.vy = Math.max(h.vy - T.grav * DT, -T.maxFall);
    h.coyote = Math.max(0, h.coyote - DT); h.airT += DT;
  }
  // ---- move horizontally
  const b = s.L.bounds;
  h.x += (h.vx + carryX) * DT;
  if (h.x < b.x0 + T.hw) { h.x = b.x0 + T.hw; h.vx = Math.max(0, h.vx); }
  if (h.x > b.x1 - T.hw) { h.x = b.x1 - T.hw; h.vx = Math.min(0, h.vx); }
  // ---- vertical
  if (h.ground !== null) {
    const p = s.plats[h.ground];
    if (solid(p) && h.x >= p.x0 - 0.05 && h.x <= p.x1 + 0.05) h.y = platY(p, h.x);
    else {
      const g = platUnder(s, h.x, h.y + 0.25, 0.35, h.ground);
      if (g >= 0 && solid(s.plats[g])) { h.ground = g; h.y = platY(s.plats[g], h.x); }
      else { h.ground = null; h.coyote = solid(p) ? T.coyote : 0; h.vy = Math.min(h.vy, 0); }
    }
  } else {
    h.y += h.vy * DT;
    const g = landing(s, h.x, prevY, h.y, h.vy);
    if (g >= 0) { h.ground = g; h.y = platY(s.plats[g], h.x); if (h.airT > 0.12) { h.landT = 0; ev(s, 'land', h.x, h.y, { hard: h.vy < -16 }); } h.vy = 0; h.airT = 0; }
  }
  if (h.ground !== null) {
    const p = s.plats[h.ground];
    if (p.kind === 'collapse' && p.col === 'idle') { p.col = 'shake'; p.ct = 0; ev(s, 'shake', (p.x0 + p.x1) / 2, p.y0); }
    if (Math.abs(h.vx) > 0.5) h.runT += DT * Math.abs(h.vx) / T.run;
  }
  h.landT += DT;
  if (!wasGround && h.ground === null && h.vy < 0) h.lastY = Math.max(h.lastY, h.y);
}

// ------------------------------------------------------------------------------------------------ drums, bugs
function addDrum(s, x, y, vx, kind = 'normal', mode = 'fall') {
  const d = { id: s.nextId++, x, y, vx, vy: 0, kind, mode, plat: -1, ladder: -1, spin: 0, scored: false, dead: false, age: 0, ladderCool: 0 };
  s.drums.push(d); return d;
}
function addBug(s, x, y) {
  if (s.bugs.filter(b => !b.dead).length >= 4) return null;
  const b = { id: s.nextId++, x, y, vy: 0, dir: s.rand() < 0.5 ? -1 : 1, ground: platUnder(s, x, y + 0.3, 0.8), ladder: -1, cool: 1, dead: false, age: 0 };
  s.bugs.push(b); return b;
}
function drumStep(s, d) {
  d.age += DT; d.ladderCool = Math.max(0, d.ladderCool - DT);
  const sp = T.drumSpeed * s.diff.hazard * (s.anger ? 1.12 : 1);
  if (d.mode === 'roll') {
    const p = s.plats[d.plat];
    if (!p || !solid(p)) { d.mode = 'fall'; d.vy = 0; return; }
    const slope = sign(p.y0 - p.y1);                           // +1: downhill to the right
    if (slope) d.vx = slope * sp; else if (!d.vx) d.vx = sp;
    else d.vx = sign(d.vx) * sp;
    const ox = d.x;
    d.x += (d.vx + (p.conv || 0) + p.vx) * DT; d.spin += d.vx * DT / T.drumR;
    if (d.x < p.x0 || d.x > p.x1) {
      const g = platUnder(s, d.x, platY(p, clamp(d.x, p.x0, p.x1)) + 0.2, 0.3, d.plat);
      if (g >= 0) { d.plat = g; d.y = platY(s.plats[g], d.x); }
      else { d.mode = 'fall'; d.vy = 0; d.vx *= 0.7; }
      return;
    }
    d.y = platY(p, d.x);
    // ride a ladder down?  (crimson drums love to; normal ones sometimes)
    if (d.ladderCool <= 0 && d.kind !== 'bounce') for (let i = 0; i < s.L.ladders.length; i++) {
      const l = s.L.ladders[i];
      if (Math.abs(l.y1 - d.y) > 0.35 || (ox - l.x) * (d.x - l.x) > 0) continue;
      d.ladderCool = 0.5;
      const heroBelow = s.hero.y < d.y - 1 && Math.abs(s.hero.x - l.x) < 7;
      const chance = d.kind === 'crimson' ? (heroBelow ? 0.75 : 0.45) : (heroBelow ? 0.3 : 0.12);
      if (s.rand() < chance) { d.mode = 'ladder'; d.ladder = i; d.x = l.x; ev(s, 'drumLadder', d.x, d.y); }
      break;
    }
  } else if (d.mode === 'ladder') {
    const l = s.L.ladders[d.ladder];
    d.y -= 3.4 * s.diff.hazard * DT; d.spin += 0.1;
    if (d.y <= l.y0) { d.y = l.y0; const g = platUnder(s, d.x, d.y + 0.1, 0.4); if (g >= 0) { d.plat = g; d.mode = 'roll'; d.vx = s.rand() < 0.5 ? -1 : 1; d.ladderCool = 0.6; } else d.mode = 'fall'; }
  } else {                                                       // falling or bouncing
    const prevY = d.y;
    d.vy = Math.max(d.vy - (d.kind === 'bounce' ? 22 : T.grav) * DT, -20);
    d.x += d.vx * DT; d.y += d.vy * DT; d.spin += d.vx * DT / T.drumR;
    const g = landing(s, d.x, prevY, d.y, d.vy);
    if (g >= 0) {
      d.y = platY(s.plats[g], d.x); ev(s, 'drumLand', d.x, d.y, { big: d.vy < -10 });
      if (d.kind === 'bounce') { d.vy = 8.2; if (Math.abs(d.vx) < 1) d.vx = (s.rand() < 0.5 ? -1 : 1) * 2.4; }
      else { d.mode = 'roll'; d.plat = g; d.vy = 0; }
    }
  }
  const b = s.L.bounds;
  if (d.y < b.y0 - 1 || d.x < b.x0 - 2 || d.x > b.x1 + 2 || (s.surgeY !== null && d.y < s.surgeY - 0.5)) d.dead = true;
  for (const pit of s.L.pits || []) if (d.x > pit.x0 && d.x < pit.x1 && d.y < pit.y) { d.dead = true; ev(s, 'slag', d.x, pit.y); }
  if (s.L.crucible && d.mode === 'roll' && d.x < s.L.crucible.x + 0.6 && d.y < s.L.crucible.y + 1.5) {
    d.dead = true; ev(s, 'crucible', s.L.crucible.x, s.L.crucible.y);
    if (d.kind === 'crimson') { const bug = addBug(s, s.L.crucible.x + 1.4, s.L.crucible.y + 0.3); if (bug) { bug.dir = 1; ev(s, 'bugSpawn', bug.x, bug.y); } }
  }
  for (const f of s.L.furnaces || []) if (d.x > f.x0 && d.x < f.x1 && d.y < 1) { d.dead = true; ev(s, 'furnace', d.x, 0.5); }
}
function bugStep(s, b) {
  b.age += DT; b.cool = Math.max(0, b.cool - DT);
  const sp = T.bugSpeed * s.diff.hazard;
  if (b.ladder >= 0) {
    const l = s.L.ladders[b.ladder];
    b.y += b.ldir * 1.8 * DT;
    if ((b.ldir > 0 && b.y >= l.y1) || (b.ldir < 0 && b.y <= l.y0)) {
      b.y = b.ldir > 0 ? l.y1 : l.y0; b.ladder = -1; b.ground = platUnder(s, b.x, b.y + 0.1, 0.3); b.dir = s.rand() < 0.5 ? -1 : 1; b.cool = 1.2;
    }
    return;
  }
  const p = s.plats[b.ground];
  if (!p || !solid(p)) {
    b.vy = Math.max(b.vy - T.grav * DT, -18); const py = b.y; b.y += b.vy * DT;
    const g = landing(s, b.x, py, b.y, b.vy); if (g >= 0) { b.ground = g; b.y = platY(s.plats[g], b.x); b.vy = 0; }
    if (b.y < s.L.bounds.y0) b.dead = true;
    return;
  }
  const ox = b.x;
  b.x += (b.dir * sp + (p.conv || 0) * 0.5) * DT;
  if (b.x < p.x0 + 0.3) { b.x = p.x0 + 0.3; b.dir = 1; } else if (b.x > p.x1 - 0.3) { b.x = p.x1 - 0.3; b.dir = -1; }
  b.y = platY(p, b.x);
  if (b.cool <= 0) for (let i = 0; i < s.L.ladders.length; i++) {
    const l = s.L.ladders[i];
    if ((ox - l.x) * (b.x - l.x) > 0) continue;
    const up = Math.abs(l.y0 - b.y) < 0.4, down = Math.abs(l.y1 - b.y) < 0.4;
    if (!up && !down) continue;
    b.cool = 0.8;
    const wantUp = s.hero.y > b.y + 1, wantDown = s.hero.y < b.y - 1;
    if ((up && wantUp && s.rand() < 0.55) || (down && wantDown && s.rand() < 0.55) || s.rand() < 0.12) {
      if (up && (wantUp || !down)) { b.ladder = i; b.ldir = 1; b.x = l.x; }
      else if (down) { b.ladder = i; b.ldir = -1; b.x = l.x; }
    }
    break;
  }
  for (const pit of s.L.pits || []) if (b.x > pit.x0 && b.x < pit.x1 && b.y < pit.y) b.dead = true;
}

// ------------------------------------------------------------------------------------------------ fixed hazards (pure functions of time)
export function ventState(v, t, sab = 1) {
  const P = v.period * sab, c = ((t + v.phase) % P + P) % P;
  return c >= P - 1.0 ? 'on' : c >= P - 1.9 ? 'warn' : 'off';
}
export function crusherState(c, t, slow = 1) {
  const P = c.period * slow, u = ((t + c.phase) % P + P) % P;
  const rest = P - 1.5;
  let yb, st;
  if (u < rest) { yb = c.top; st = 'up'; }
  else if (u < rest + 0.55) { yb = c.top; st = 'warn'; }
  else if (u < rest + 0.7) { yb = c.top - (c.top - c.floor) * (u - rest - 0.55) / 0.15; st = 'slam'; }
  else if (u < rest + 1.05) { yb = c.floor; st = 'down'; }
  else { yb = c.floor + (c.top - c.floor) * (u - rest - 1.05) / 0.45; st = 'rise'; }
  return { yb, st };
}
export function laserState(l, t) {
  const c = ((t + l.phase) % l.period + l.period) % l.period;
  return c >= l.period - 1.2 ? 'on' : c >= l.period - 2.0 ? 'warn' : 'off';
}

// ------------------------------------------------------------------------------------------------ the Warden (stages) and the boss
function wardenStep(s) {
  const w = s.warden, W = s.L.warden; w.t += DT;
  if (w.state === 'idle') {
    w.next -= DT * (s.anger ? 1.25 : 1);
    if (w.next <= 0) {
      if (w.throws > 0 && w.throws % 5 === 4) { w.state = 'pound'; w.t = 0; ev(s, 'pound', W.x, W.y); w.throws++; }
      else { w.state = 'grab'; w.t = 0; }
    }
  } else if (w.state === 'grab' && w.t > 0.55) {
    w.state = 'throw'; w.t = 0; w.throws++;
    const kind = s.rand() < W.crimson * s.diff.hazard ? 'crimson' : 'normal';
    const d = addDrum(s, W.throwX, W.y + 0.1, W.throwDir * T.drumSpeed, kind, 'fall'); d.vy = 2;
    ev(s, 'throw', W.x, W.y, { kind });
  } else if ((w.state === 'throw' && w.t > 0.35) || (w.state === 'pound' && w.t > 1.5)) {
    w.state = 'idle'; w.t = 0;
    const [a, b] = W.interval; w.next = (a + (b - a) * s.rand()) / s.diff.hazard;
  }
}
const BOSS_CD = [2.5, 2.1, 1.75, 1.4];
function heroTier(s) {
  const h = s.hero;
  if (h.ground !== null && !s.plats[h.ground].boss) return h.ground;
  const g = platUnder(s, h.x, h.y + 0.1, 6); return g;
}
function bossStep(s) {
  const B = s.boss, Lb = s.L.boss, h = s.hero; B.t += DT;
  if (B.state === 'defeat') return;
  // couplings: stand on a clamp's plate to overload it
  if (h.state === 'play' && h.ground !== null) for (let i = 0; i < 4; i++) {
    const c = s.L.couplings[i];
    if (B.done[i] || Math.abs(h.x - c.x) > 0.7 || Math.abs(h.y - c.y) > 0.4) continue;
    B.done[i] = true; B.phase = B.done.filter(Boolean).length;
    addPoints(s, POINTS.coupling, c.x, c.y + 1.6); ev(s, 'coupling', c.x, c.y, { n: B.phase });
    s.waves.length = 0; B.beam = null; B.attack = null;
    if (B.phase >= 4) { B.state = 'defeat'; B.t = 0; s.drums.forEach(d => (d.dead = true)); addPoints(s, POINTS.boss, Lb.x, Lb.y + 3); ev(s, 'bossDefeat', Lb.x, Lb.y); s.result = 'bossDefeat'; return; }
    B.state = 'hurt'; B.t = 0; B.cd = 1.2; ev(s, 'roar', Lb.x, Lb.y);
    if (B.phase === 2) B.gift = 2.2;
  }
  if (B.gift > 0) { B.gift -= DT; if (B.gift <= 0) { s.items.push({ type: 'gauntlet', x: s.L.gift.x, y: s.L.gift.y, i: s.items.length, got: false, gift: true }); s.lilly = 'free'; ev(s, 'lillyGift', s.L.gift.x, s.L.gift.y); } }
  if (B.state === 'hurt') { if (B.t > 1.9) { B.state = 'idle'; B.t = 0; } return; }
  if (B.state === 'idle') {
    B.cd -= DT * s.diff.hazard;
    if (B.cd > 0 || h.state !== 'play') return;
    const opts = ['roll', 'roll'];
    if (B.phase >= 1) opts.push('bounce');
    if (B.phase >= 2) opts.push('slam', 'slam');
    if (B.phase >= 3) opts.push('beam', 'beam');
    let a = opts[Math.floor(s.rand() * opts.length)];
    if (a === B.last && a !== 'roll') a = 'roll';
    B.attack = a; B.last = a; B.state = 'tell'; B.t = 0;
    B.target = heroTier(s);
    ev(s, 'tell', Lb.x, Lb.y, { attack: a });
    return;
  }
  if (B.state === 'tell') {
    const tell = { roll: 0.55, bounce: 0.65, slam: 0.9, beam: 1.15 }[B.attack];
    if (B.attack === 'beam' && B.target >= 0) {
      const p = s.plats[B.target]; B.beam = { plat: B.target, x0: p.x0, x1: p.x1, on: false };
    }
    if (B.t < tell) return;
    B.state = 'strike'; B.t = 0;
    const side = s.hero.x < 14 ? -1 : 1;
    if (B.attack === 'roll') {
      const d = addDrum(s, Lb.x + side * 2.6, Lb.y + 0.2, side * T.drumSpeed, s.rand() < 0.3 ? 'crimson' : 'normal', 'fall'); d.vy = 3;
      ev(s, 'throw', Lb.x, Lb.y, { kind: d.kind });
    } else if (B.attack === 'bounce') {
      const d = addDrum(s, Lb.x + side * 1.5, Lb.y + 1, side * 3.0, 'bounce', 'fall'); d.vy = 6;
      ev(s, 'throw', Lb.x, Lb.y, { kind: 'bounce' });
    } else if (B.attack === 'slam') {
      ev(s, 'slam', Lb.x, Lb.y);
      const g = B.target;
      if (g >= 0) {
        const p = s.plats[g], ox = clamp(14, p.x0 + 0.2, p.x1 - 0.2);
        for (const dir of [-1, 1]) if ((dir < 0 && ox > p.x0 + 0.5) || (dir > 0 && ox < p.x1 - 0.5)) s.waves.push({ plat: g, x: ox, dir, t: 0 });
      }
    } else if (B.attack === 'beam' && B.beam) { B.beam.on = true; ev(s, 'beam', Lb.x, Lb.y); }
    return;
  }
  if (B.state === 'strike') {
    const dur = B.attack === 'beam' ? 0.6 : 0.4;
    if (B.t >= dur) { B.state = 'idle'; B.t = 0; B.cd = BOSS_CD[B.phase]; B.beam = null; }
  }
}

// ------------------------------------------------------------------------------------------------ the step
export function stepSim(s, inp = {}) {
  s.events.length = 0; s.t += DT; s.frame++;
  for (const p of s.popups) p.t += DT; s.popups = s.popups.filter(p => p.t < 1.0);
  placePlatforms(s);
  const h = s.hero;
  if (s.result && s.result !== 'bossDefeat') return s;
  if (s.boss && s.boss.state === 'defeat') { s.boss.t += DT; return s; }
  // bonus clock (classic arcade bonus: it counts down; at zero the Warden gets angry)
  s.bonusClock += DT;
  if (s.bonusClock >= 2 && h.state === 'play') { s.bonusClock = 0; if (s.bonus > 0) { s.bonus -= 100; if (s.bonus <= 0) { s.anger = 1; ev(s, 'anger'); } } }
  // hero
  if (h.state === 'play') heroStep(s, inp);
  else if (h.state === 'dying') {
    h.st += DT; h.vy -= T.grav * 0.6 * DT; if (h.st < 0.5) h.y += 2 * DT;
    if (h.st >= T.dieTime) {
      if (s.lives > 0) respawn(s);
      else { s.result = 'gameover'; ev(s, 'gameover'); }
    }
  }
  // world
  if (s.warden) wardenStep(s);
  if (s.boss) bossStep(s);
  for (const hp of s.hoppers) {
    if (Math.abs(hp.x - h.x) > 24) { hp.warn = false; continue; }
    const P = hp.period / s.diff.hazard, c = ((s.t + hp.phase) % P + P) % P;
    const warn = c > P - 0.8;
    if (warn && !hp.warn) ev(s, 'hopperWarn', hp.x, hp.y);
    if (!warn && hp.warn) { const d = addDrum(s, hp.x, hp.y - 0.6, hp.dir * T.drumSpeed * 0.6, 'normal', 'fall'); d.vy = -2; ev(s, 'hopperDrop', hp.x, hp.y); }
    hp.warn = warn;
  }
  if (s.bouncer && h.y > s.L.bouncer.fromY && h.state === 'play') {
    s.bouncer.next -= DT * s.diff.hazard;
    if (s.bouncer.next <= 0) {
      const Bo = s.L.bouncer, [a, b] = Bo.interval;
      s.bouncer.next = a + (b - a) * s.rand();
      const d = addDrum(s, Bo.x + (s.rand() * 8 - 4), Bo.y, (s.rand() < 0.5 ? -1 : 1) * (1.5 + s.rand() * 1.5), 'bounce', 'fall');
      ev(s, 'throw', Bo.x, Bo.y, { kind: 'bounce' });
    }
  }
  for (const d of s.drums) drumStep(s, d);
  for (const b of s.bugs) if (!b.dead) bugStep(s, b);
  for (const w of s.waves) { const p = s.plats[w.plat]; w.t += DT; w.x += w.dir * 9.5 * DT; if (w.x < p.x0 || w.x > p.x1) w.dead = true; }
  s.waves = s.waves.filter(w => !w.dead);
  if (s.surgeY !== null && s.t > s.L.surge.delay) {
    const S = s.L.surge; s.surgeY += (S.speed + S.accel * s.t) * s.diff.surge * DT * (h.state === 'play' ? 1 : 0.2);
  }
  // vents and crushers announce themselves
  const slow = s.sabotaged ? 1.7 : 1;
  for (const v of s.L.vents || []) { const st = ventState(v, s.t); const prev = ventState(v, s.t - DT); if (st !== prev && st !== 'off') ev(s, st === 'on' ? 'vent' : 'ventWarn', v.x, v.y); }
  for (const c of s.L.crushers || []) { const st = crusherState(c, s.t, c.press ? slow : 1).st, prev = crusherState(c, s.t - DT, c.press ? slow : 1).st; if (st !== prev && (st === 'down' || st === 'warn') && Math.abs(c.x - h.x) < 20) ev(s, st === 'down' ? 'crush' : 'crushWarn', c.x, c.floor); }
  for (const l of s.L.lasers || []) { const st = laserState(l, s.t), prev = laserState(l, s.t - DT); if (st !== prev && st !== 'off' && Math.abs(l.y - h.y) < 14) ev(s, st === 'on' ? 'laser' : 'laserWarn', (l.x0 + l.x1) / 2, l.y); }
  if (h.state === 'play') interact(s);
  s.drums = s.drums.filter(d => !d.dead); s.bugs = s.bugs.filter(b => !b.dead);
  return s;
}

// ------------------------------------------------------------------------------------------------ the hero meets the world
function boxHit(h, x0, x1, y0, y1) { return h.x + T.hw > x0 && h.x - T.hw < x1 && h.y + T.hh > y0 && h.y < y1; }
function die(s, cause) {
  const h = s.hero;
  if (s.invincible) { if (['slag', 'fall', 'surge', 'furnace'].includes(cause)) { respawn(s); ev(s, 'testRescue', h.x, h.y); } return; }
  h.state = 'dying'; h.st = 0; h.vy = 7; h.ladder = null; h.ground = null; h.hurtBy = cause; s.lives--; s.deaths++;
  ev(s, 'die', h.x, h.y, { cause });
}
function respawn(s) {
  const cp = s.L.checkpoints[s.cp];
  spawnHero(s, cp);
  for (const d of s.drums) if (Math.hypot(d.x - cp.x, d.y - cp.y) < 9) d.dead = true;
  for (const b of s.bugs) if (Math.hypot(b.x - cp.x, b.y - cp.y) < 7) b.dead = true;
  for (const p of s.plats) if (p.kind === 'collapse') { p.col = 'idle'; p.ct = 0; }
  s.waves.length = 0;
  if (s.surgeY !== null) s.surgeY = Math.min(s.surgeY, cp.y - 7);
  if (s.boss && s.boss.state !== 'defeat') { s.boss.state = 'idle'; s.boss.cd = 2.2; s.boss.beam = null; }
  if (s.warden) { s.warden.next = Math.max(s.warden.next, 2.0); }
  ev(s, 'respawn', cp.x, cp.y);
}
function interact(s) {
  const h = s.hero, L = s.L;
  // items
  for (const it of s.items) {
    if (it.got || Math.abs(it.x - h.x) > 0.75 || it.y < h.y - 0.3 || it.y > h.y + T.hh + 0.6) continue;
    if (it.secret && !(h.x < 0.2)) continue;
    it.got = true;
    if (it.type === 'gear') { s.gears++; addPoints(s, POINTS.gear, it.x, it.y); ev(s, 'gear', it.x, it.y); }
    else if (it.type === 'keep') { s.keeps[it.id] = true; addPoints(s, POINTS.keep, it.x, it.y); ev(s, 'keep', it.x, it.y, { id: it.id }); }
    else if (it.type === 'gauntlet') { h.gaunt = T.gauntlet; ev(s, 'gauntlet', it.x, it.y); }
    else if (it.type === 'life') { s.lives++; pop(s, '1UP', it.x, it.y); ev(s, 'life', it.x, it.y); }
  }
  // checkpoints (only forward)
  for (let i = s.cp + 1; i < L.checkpoints.length; i++) {
    const c = L.checkpoints[i];
    if (Math.abs(c.x - h.x) < 1.3 && Math.abs(c.y - h.y) < 1.6) { s.cp = i; ev(s, 'checkpoint', c.x, c.y); }
  }
  // triggers
  for (const tr of L.triggers || []) {
    if (s.triggers.has(tr.id) || !boxHit(h, tr.x, tr.x + tr.w, tr.y, tr.y + tr.h)) continue;
    s.triggers.add(tr.id);
    if (tr.id === 'sabotage') { s.sabotaged = true; s.lilly = 'sabotage'; ev(s, 'sabotage', h.x, h.y); }
  }
  if (s.secretFound !== true && L.secret && h.x < L.secret.x1 - 0.2 && h.y > L.secret.y0 - 0.2 && h.y < L.secret.y1) { s.secretFound = true; ev(s, 'secret', h.x, h.y); }
  // goal
  if (L.goal && boxHit(h, L.goal.x, L.goal.x + L.goal.w, L.goal.y, L.goal.y + L.goal.h) && h.ground !== null) {
    s.result = 'clear'; ev(s, 'clear', h.x, h.y); return;
  }
  // drums and bugs: jump them for points, smash them with the gauntlet, or get hit
  const airborne = h.ground === null && h.ladder === null;
  let jumpedNow = 0;
  for (const d of s.drums) {
    const cy = d.y + T.drumR;
    if (h.gaunt > 0 && Math.abs(d.x - (h.x + h.face * 0.5)) < 1.25 && Math.abs(cy - (h.y + 0.8)) < 1.3) {
      d.dead = true; s.smashed++; addPoints(s, POINTS.smash, d.x, d.y + 1); ev(s, 'smash', d.x, cy); continue;
    }
    const nx = clamp(d.x, h.x - T.hw, h.x + T.hw), ny = clamp(cy, h.y, h.y + T.hh);
    if ((nx - d.x) ** 2 + (ny - cy) ** 2 < (T.drumR * 0.82) ** 2) { if (h.inv <= 0) { die(s, 'drum'); return; } continue; }
    if (!d.scored && airborne && Math.abs(d.x - h.x) < 0.55 && h.y > cy && h.y - cy < 3.2) { d.scored = true; jumpedNow++; }
  }
  if (jumpedNow) { s.jumped += jumpedNow; addPoints(s, jumpedNow > 1 ? POINTS.jump2 : POINTS.jump, h.x, h.y + 2); ev(s, 'drumJump', h.x, h.y, { n: jumpedNow }); }
  for (const b of s.bugs) {
    if (h.gaunt > 0 && Math.abs(b.x - (h.x + h.face * 0.5)) < 1.25 && Math.abs(b.y + 0.4 - (h.y + 0.8)) < 1.3) {
      b.dead = true; s.smashed++; addPoints(s, POINTS.smashBug, b.x, b.y + 1); ev(s, 'smash', b.x, b.y + 0.4, { bug: true }); continue;
    }
    if (h.inv <= 0 && boxHit(h, b.x - 0.35, b.x + 0.35, b.y + 0.05, b.y + 0.8)) { die(s, 'volt'); return; }
  }
  if (h.inv > 0) return;
  // steam vents, crushers, lasers, shockwaves, the beam
  for (const v of L.vents || []) if (ventState(v, s.t) === 'on' && boxHit(h, v.x - 0.5, v.x + 0.5, v.y, v.y + 2.8)) { die(s, v.crimson ? 'energy' : 'steam'); return; }
  const slow = s.sabotaged ? 1.7 : 1;
  for (const c of L.crushers || []) {
    const { yb, st } = crusherState(c, s.t, c.press ? slow : 1);
    if (yb >= h.y + T.hh) continue;
    const x0 = c.x - c.w / 2, x1 = c.x + c.w / 2;
    if (!boxHit(h, x0 + 0.08, x1 - 0.08, yb, yb + 3)) continue;
    if (st === 'slam' || st === 'down' || yb < h.y + 0.9) { die(s, 'crusher'); return; }
    h.x = h.x < c.x ? x0 - T.hw : x1 + T.hw; h.vx = 0;          // the rising head is solid
  }
  for (const l of L.lasers || []) if (laserState(l, s.t) === 'on' && boxHit(h, l.x0, l.x1, l.y - 0.12, l.y + 0.12)) { die(s, 'laser'); return; }
  for (const w of s.waves) {
    const p = s.plats[w.plat];
    if (Math.abs(w.x - h.x) < 0.55 && h.ladder === null && h.y - platY(p, h.x) < 0.5 && h.y >= platY(p, h.x) - 0.2 && h.x >= p.x0 && h.x <= p.x1) { die(s, 'shockwave'); return; }
  }
  const bm = s.boss && s.boss.beam;
  if (bm && bm.on) { const p = s.plats[bm.plat], by = platY(p, h.x) + 0.55; if (h.ladder === null && boxHit(h, bm.x0, bm.x1, by - 0.14, by + 0.14)) { die(s, 'beam'); return; } }
  // falling into slag, off the world, or into the Surge
  for (const pit of L.pits || []) if (h.x > pit.x0 && h.x < pit.x1 && h.y < pit.y) { die(s, 'slag'); return; }
  if (s.L.furnaces && h.y < 0.6) for (const f of s.L.furnaces) if (h.x > f.x0 - 0.2 && h.x < f.x1 + 0.2) { die(s, 'furnace'); return; }
  if (h.y < L.bounds.y0) { die(s, 'fall'); return; }
  if (s.surgeY !== null && h.y < s.surgeY - 0.2) { die(s, 'surge'); return; }
}

// ------------------------------------------------------------------------------------------------ helpers the renderer and bots share
export function stageClearTally(s) {
  const bonus = Math.max(0, s.bonus), clear = POINTS.clear, nod = s.deaths === 0 ? POINTS.noDeath : 0;
  return { bonus, clear, noDeath: nod, total: bonus + clear + nod };
}
export { surf };

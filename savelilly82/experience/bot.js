// RAMPAGE: SAVE LILLY — the autopilot. It plays a stage from a route (walk, climb, jump, ride, wait) and reacts to
// hazards on the way: it jumps drums, Volts and shockwaves, and waits out vents, crushers and lasers. The title screen
// uses it for the attract demo; the tests use it to prove every stage can be finished. It reads the sim, never writes.
import { T, ventState, crusherState, laserState, platY } from './sim.js';

const W = (x, extra) => ({ op: 'go', x, ...extra });
const C = (ladder, extra) => ({ op: 'climb', ladder, ...extra });
const D = (ladder, extra) => ({ op: 'down', ladder, ...extra });
const J = (dir, at, extra) => ({ op: 'jump', dir, at, ...extra });
const R = (until, extra) => ({ op: 'ride', until, ...extra });
const Wt = (until, extra) => ({ op: 'wait', until, ...extra });

const lift = (s, shaft, k = null) => s.plats.filter(p => p.kind === 'lift' && p.shaft === shaft);
const anyLift = (s, shaft, test) => lift(s, shaft).some(test);
export const ROUTES = {
  foundry: [
    W(10, { cp: 0 }), C(0), W(4.5), C(2), W(11), C(4), W(21.5), W(18, { cp: 1 }), C(7), W(12.5), C(8), W(14), C(10), W(12.5),
  ],
  machine: [
    W(19.4, { cp: 0 }), W(46.9), W(47.4, { cp: 1 }), Wt(s => anyLift(s, 0, p => p.y0 > -0.3 && p.y0 < 0.5)), J(1, null, { land: 'lift' }),
    R(s => s.hero.y > 5.7), J(1, null, { stopOn: 7 }), W(55.9),
    Wt(s => anyLift(s, 1, p => p.y0 < 6.3 && p.y0 > 5.2)), J(1, null, { land: 'lift' }), R(s => s.hero.y < 3.0), J(1, null, { stopOn: 8 }), W(61.9),
    Wt(s => anyLift(s, 2, p => p.y0 > 1.4 && p.y0 < 2.2)), J(1, null, { land: 'lift' }), R(s => s.hero.y > 8.4), J(1, null, { stopOn: 9 }), W(68.2),
    J(1, null, { stopOn: 10 }), W(75.5), W(100.8, { cp: 2 }), W(122, { cp: 3 }),
  ],
  ascent: [
    W(2, { cp: 0 }), C(0), W(6.4), J(1, 6.4, { stopOn: 2 }), W(10.0), J(1, 10.0, { stopOn: 3 }), W(13.5), J(1, 13.5, { stopOn: 4 }),
    W(17.0), J(1, 17.0, { stopOn: 5, aimX: 19.7 }), W(22.4), C(1), W(11), C(2), W(3, { cp: 1 }), W(1.5), C(3), W(4.5), C(4), W(2), C(5), W(5), C(6), W(7), C(7),
    W(12, { cp: 2 }), W(20), C(9), W(14.6), Wt(s => s.plats[23].x1 > 13.4), J(-1, null, { stopOn: 23, hold: true }), Wt(s => s.plats[23].x0 < 6.6),
    J(-1, null, { stopOn: 24, aimX: 5.0 }), W(1.5), C(10), W(9), C(11), W(17), C(12), W(20, { cp: 3 }), W(12.4), J(-1, 12.4, { stopOn: 30 }), W(9.4),
    J(-1, 9.4, { stopOn: 31 }), W(5.8), J(-1, 5.8, { stopOn: 32 }), W(2.4), J(-1, 2.4, { stopOn: 33 }), W(3), C(13), W(9), C(14), W(12),
  ],
  warden: [
    W(8, { cp: 0 }), C(0), W(14), W(10), C(2), W(2.6), W(4), C(4), W(8.4), W(4), D(4), W(10), D(2), W(18), C(3), W(25.4),
  ],
};

export function createBot(levelId, opts = {}) {
  return { route: opts.route || ROUTES[levelId], i: 0, sub: 0, t: 0, lastCp: 0, lastDeaths: 0, jumpHold: 0, waitT: 0 };
}
function resume(bot, s) {       // after a respawn, go back to the first step of the current checkpoint
  const k = bot.route.findIndex(st => st.cp === s.cp);
  bot.i = k >= 0 ? k : 0; bot.sub = 0;
}

// ---- hazard sense: return 'jump' | 'wait' | null for the hero moving in `dir`
function threat(s, dir) {
  const h = s.hero, onGround = h.ground !== null;
  // drums and Volts on the same level coming at us (or that we are running into)
  for (const d of s.drums) {
    const dy = d.y - h.y;
    if (Math.abs(dy) > 0.9 && !(d.mode === 'fall' && d.y > h.y && d.y - h.y < 3 && Math.abs(d.x - h.x) < 1.2)) continue;
    const rel = d.x - h.x, closing = -sign(rel) * (d.vx + (s.plats[d.plat]?.conv || 0)) + (dir ? Math.abs(dir) * T.run * (sign(rel) === dir ? 1 : -1) : 0);
    if (h.gaunt > 0) continue;
    if (Math.abs(rel) < 3.2 && closing > 0.5 && Math.abs(rel) / closing < 0.36) return 'jump';
    if (d.kind === 'bounce' && Math.abs(rel) < 2.5) return 'jump';
  }
  for (const b of s.bugs) {
    if (Math.abs(b.y - h.y) > 0.6 || h.gaunt > 0) continue;
    const rel = b.x - h.x, closing = -sign(rel) * b.dir * T.bugSpeed + (dir && sign(rel) === dir ? T.run : 0);
    if (Math.abs(rel) < 2.6 && closing > 0.3 && Math.abs(rel) / closing < 0.34) return 'jump';
    if (Math.abs(rel) < 0.9) return 'jump';
  }
  for (const w of s.waves) if (w.plat === h.ground && Math.abs(w.x - h.x) < 1.6 && sign(h.x - w.x) === w.dir) return 'jump';
  const B = s.boss;
  if (B && B.state === 'tell' && B.attack === 'beam' && B.beam && B.beam.plat === h.ground && B.t > 0.95) return 'jump';
  if (!onGround || !dir) return null;
  // things to wait out ahead of us
  const ahead = x0 => (dir > 0 ? x0 - h.x : h.x - x0);
  for (const v of s.L.vents || []) {
    const a = ahead(v.x); if (Math.abs(v.y - h.y) > 0.8 || a < -0.7 || a > 1.7) continue;
    const st = ventState(v, s.t), soon = ventState(v, s.t + 0.5);
    if (st !== 'off' || soon !== 'off') return a < -0.3 ? null : 'wait';
  }
  const slow = s.sabotaged ? 1.7 : 1;
  for (const c of s.L.crushers || []) {
    const a = ahead(c.x - dir * c.w / 2); if (a < -c.w - 0.5 || a > 1.4 || Math.abs(c.floor - h.y) > 0.6) continue;
    const need = (c.w + 1.2) / T.run + 0.12;
    let ok = true; for (let k = 0; k <= 6; k++) { const st = crusherState(c, s.t + need * k / 6, c.press ? slow : 1); if (st.yb < h.y + T.hh + 0.2) ok = false; }
    if (!ok) return a < 0 ? null : 'wait';
  }
  for (const l of s.L.lasers || []) {
    if (l.y < h.y || l.y > h.y + T.hh + 0.1) continue;
    const enter = dir > 0 ? l.x0 - h.x : h.x - l.x1, inside = h.x > l.x0 - T.hw && h.x < l.x1 + T.hw;
    if (!inside && (enter < -0.2 || enter > 1.2)) continue;
    const span = Math.min(l.x1, 30) - Math.max(l.x0, -3), need = (inside ? Math.abs(dir > 0 ? l.x1 - h.x : h.x - l.x0) : span) / T.run + 0.35;
    let ok = true; for (let k = 0; k <= 6; k++) if (laserState(l, s.t + need * k / 6) === 'on') ok = false;
    if (!ok && !inside) return 'wait';
  }
  return null;
}
const sign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);

export function botInput(bot, s) {
  const h = s.hero, inp = { left: false, right: false, up: false, down: false, jump: false, jumpPressed: false };
  bot.t += 1 / 60;
  if (s.deaths !== bot.lastDeaths) { bot.lastDeaths = s.deaths; bot.dead = true; }
  if (h.state !== 'play') return inp;
  if (bot.dead) { bot.dead = false; resume(bot, s); }
  if (bot.jumpHold > 0) { bot.jumpHold -= 1 / 60; inp.jump = true; }
  const st = bot.route[bot.i];
  if (!st) return inp;
  const move = dir => { if (dir > 0) inp.right = true; else if (dir < 0) inp.left = true; };
  const jump = () => { if (h.ground !== null || (h.ladder !== null)) { inp.jumpPressed = true; inp.jump = true; bot.jumpHold = 0.35; } };
  const next = () => { bot.i++; bot.sub = 0; bot.waitT = 0; };
  if (st.op === 'go') {
    const dx = st.x - h.x;
    if (Math.abs(dx) < 0.15 && h.ground !== null) { next(); return inp; }
    const dir = sign(dx), th = threat(s, dir);
    if (th === 'jump') jump();
    if (th !== 'wait' || h.ground === null) move(dir);
    return inp;
  }
  if (st.op === 'climb' || st.op === 'down') {
    const l = s.L.ladders[st.ladder];
    if (h.ladder === null && bot.sub === 0) {
      if (Math.abs(l.x - h.x) > 0.25) { const d = sign(l.x - h.x), th = threat(s, d); if (th === 'jump') jump(); if (th !== 'wait') move(d); return inp; }
      if (threat(s, 0) === 'jump') { jump(); return inp; }
      bot.sub = 1;
    }
    if (h.ladder === null && bot.sub === 1) {
      if (st.op === 'climb') inp.up = true; else inp.down = true;
      bot.waitT += 1 / 60; if (bot.waitT > 0.3) { bot.sub = 0; bot.waitT = 0; }
      return inp;
    }
    if (h.ladder !== null) { bot.sub = 2; if (st.op === 'climb') inp.up = true; else inp.down = true; return inp; }
    if (bot.sub === 2) next();
    return inp;
  }
  if (st.op === 'wait') {
    if (threat(s, 0) === 'jump') jump();
    bot.waitT += 1 / 60;
    if (st.until(s) || bot.waitT > 20) next();
    return inp;
  }
  if (st.op === 'ride') {
    if (threat(s, 0) === 'jump' && h.ground !== null && s.plats[h.ground].kind !== 'lift') jump();
    if (st.until(s)) next();
    return inp;
  }
  if (st.op === 'jump') {
    if (bot.sub === 0) {
      if (st.at !== null && st.at !== undefined && Math.abs(st.at - h.x) > 0.2) { move(sign(st.at - h.x)); return inp; }
      if (h.ground === null) return inp;
      bot.aim = null;                                          // lock the landing spot at take-off
      if (st.aimX !== undefined) bot.aim = { p: { x0: st.aimX, x1: st.aimX } };
      else if (st.stopOn !== undefined) { const p = s.plats[st.stopOn]; bot.aim = { p, dx: 0 }; }
      else if (st.land === 'lift') {
        let best = null; for (const p of s.plats) if (p.kind === 'lift' && sign((p.x0 + p.x1) / 2 - h.x) === st.dir && (!best || Math.abs((p.x0 + p.x1) / 2 - h.x) < Math.abs((best.x0 + best.x1) / 2 - h.x))) best = p;
        if (best) bot.aim = { p: best, dx: 0 };
      }
      jump(); move(st.dir); bot.sub = 1; bot.waitT = 0; return inp;
    }
    bot.waitT += 1 / 60;
    const aim = bot.aim ? (bot.aim.p.x0 + bot.aim.p.x1) / 2 : null;   // steer in the air toward the landing spot
    if (aim !== null && h.ground === null) { if (Math.abs(aim - h.x) > 0.25) move(sign(aim - h.x)); }
    else if (!st.hold || bot.waitT < 0.25) move(st.dir);
    const landed = h.ground !== null && bot.waitT > 0.1;
    if (landed) {
      const p = s.plats[h.ground];
      if ((st.stopOn !== undefined && h.ground === st.stopOn) || (st.land === 'lift' && p.kind === 'lift') || (st.stopOn === undefined && st.land === undefined)) next();
      else if (bot.waitT > 1.2) { bot.sub = 0; }   // missed: try again from here
    }
    return inp;
  }
  return inp;
}

// RAMPAGE: THE CLIMB — pure rules shared by the renderer and the headless tests.
// No THREE, no p0, no randomness: the same inputs give the same run everywhere.
//
// Space: lot-local metres (origin at the floor centre, +Y up). The course spirals up the inside of the
// tower walls (interior half-width WALL) from the gate floor to the crown pad at about 53 m.
// A positive angle step runs counter-clockwise seen from above; the renderer maps "right" to it.

export const WALL = 11.2;          // interior wall plane (lot edge is 12.5 m; the façade lives outside this)
export const MAST = 0.55;          // central laser mast radius
export const SPEED = 5.6, AIR_SPEED = 5.2, JUMP = 8.4, GRAVITY = 19.5;
export const COYOTE = 0.11, BUFFER = 0.13, R_PLAYER = 0.3;
export const PENALTY = 3;          // seconds added per hazard hit (respawn at checkpoint)
export const STEP = 1 / 120;       // fixed simulation step

// ------------------------------------------------------------------ course
// Each entry: [kind, angle step (deg), rise (m), radius (m)]. Kinds: pad, cp (checkpoint, vents the
// Surge), move (slides along the spiral), crumble (drops 0.55 s after you land), finish (the crown).
// Hazards are attached to a pad by index: laser (sweeps from the mast at knee height), sweep (a bar
// across the pad), crush (a piston), fire (a timed vent).
const PLAN = [
  // STAGE 1 — THE GATE (0–12 m): learn to jump, first sweeper, first laser
  ['start', 0, 0.6, 8.6], ['pad', 26, .75, 8.6], ['pad', 25, .8, 8.4], ['pad', 26, .8, 8.8], ['pad', 27, .85, 8.6],
  ['pad', 24, .8, 8.4, 'sweep'], ['pad', 26, .9, 8.7], ['pad', 27, .85, 8.6, 'laser'], ['pad', 25, .9, 8.5],
  ['pad', 26, .9, 8.8], ['pad', 28, .95, 8.6], ['pad', 26, .9, 8.4, 'crush'], ['pad', 25, .9, 8.7],
  ['cp', 27, .95, 8.6],
  // STAGE 2 — THE SHAFT (12–35 m): moving and crumbling plates, fire, crossing lasers
  ['pad', 27, .95, 8.6], ['move', 30, .9, 8.6], ['pad', 30, .95, 8.6], ['crumble', 26, .9, 8.3], ['crumble', 25, .9, 8.8],
  ['pad', 26, .95, 8.6, 'fire'], ['pad', 27, 1.0, 8.4, 'laser'], ['pad', 26, .95, 8.8], ['move', 31, .9, 8.6],
  ['pad', 30, 1.0, 8.6, 'sweep'], ['pad', 26, .95, 8.4], ['crumble', 25, .95, 8.7], ['pad', 26, 1.0, 8.6, 'crush'],
  ['cp', 27, .95, 8.6],
  ['pad', 26, 1.0, 8.6, 'laser'], ['pad', 27, 1.0, 8.3], ['move', 31, .95, 8.6], ['pad', 30, 1.0, 8.8, 'fire'],
  ['crumble', 25, .95, 8.5], ['crumble', 25, 1.0, 8.7], ['pad', 26, 1.0, 8.6, 'sweep'], ['pad', 27, 1.0, 8.4],
  ['pad', 26, 1.0, 8.7, 'laser'], ['move', 31, .95, 8.6], ['pad', 30, 1.0, 8.6, 'crush'], ['pad', 26, 1.0, 8.5],
  ['cp', 27, 1.0, 8.6],
  // STAGE 3 — THE EVENT HORIZON (35–53 m): everything at once beside the energy walls, then the crown
  ['pad', 27, 1.0, 8.6, 'laser'], ['crumble', 26, 1.0, 8.4], ['move', 31, .95, 8.7], ['pad', 30, 1.0, 8.6, 'fire'],
  ['pad', 26, 1.0, 8.3, 'sweep'], ['crumble', 25, 1.0, 8.7], ['pad', 26, 1.05, 8.6, 'laser'], ['move', 31, 1.0, 8.6],
  ['pad', 30, 1.0, 8.5, 'crush'], ['crumble', 25, 1.0, 8.8], ['pad', 26, 1.05, 8.6, 'fire'], ['pad', 27, 1.05, 8.4, 'laser'],
  ['crumble', 25, 1.0, 8.7], ['pad', 26, 1.05, 8.6, 'sweep'], ['finish', 40, 1.0, 5.6],
];
export const STAGES = [
  { name: 'THE GATE', from: 0, surge: 0.30 },
  { name: 'THE SHAFT', from: 12, surge: 0.36 },
  { name: 'THE EVENT HORIZON', from: 35, surge: 0.42 },
];
export function buildCourse() {
  const pads = [], hazards = [];
  let a = -100, y = 0.1;                  // start beside the east entrance (angle ~0 faces +X); spiral up from there
  PLAN.forEach(([kind, da, rise, r, hz], i) => {
    a += da; y += rise;
    const rad = a * Math.PI / 180;
    const size = kind === 'cp' || kind === 'start' ? 3.6 : kind === 'finish' ? 5.2 : 2.8;
    pads.push({ i, kind, x: Math.cos(rad) * r, z: Math.sin(rad) * r, y: +y.toFixed(3), size, angle: rad, r,
                phase: (i * 0.73) % (Math.PI * 2) });
    if (hz) hazards.push({ type: hz, pad: i, phase: (i * 1.31) % (Math.PI * 2) });
  });
  return { pads, hazards, top: pads[pads.length - 1].y };
}
export const COURSE = buildCourse();

// ------------------------------------------------------------------ moving parts (pure functions of time)
export function padOffset(p, t) {           // tangential slide for 'move' pads, metres along x/z
  if (p.kind !== 'move') return [0, 0];
  const s = Math.sin(t * 1.0 + p.phase) * 1.2;
  return [-Math.sin(p.angle) * s, Math.cos(p.angle) * s];
}
export function laserAngle(h, t) { return t * 2.6 + h.phase; }               // radians, one sweep ~2.4 s
export function sweepOffset(h, t) { return Math.sin(t * 2.1 + h.phase) * 1.25; }
export function crushHeight(h, t) {          // piston foot height above the pad: 0 = slammed down
  const c = ((t * 0.55 + h.phase / 6.283) % 1 + 1) % 1;                      // ~1.8 s cycle
  return c < 0.62 ? 2.6 : c < 0.72 ? 2.6 * (1 - (c - 0.62) / 0.1) : c < 0.86 ? 0 : 2.6 * ((c - 0.86) / 0.14);
}
export function fireOn(h, t) { return ((t * 0.42 + h.phase / 6.283) % 1 + 1) % 1 > 0.62; }   // ~0.9 s of every 2.4 s

// ------------------------------------------------------------------ run state
export function createRun(course = COURSE) {
  const s0 = course.pads[0];
  return { x: s0.x, y: s0.y, z: s0.z, vx: 0, vz: 0, vy: 0, grounded: true, on: 0, coyote: 0, jumpBuf: 0,
           active: false, over: false, finished: false, time: 0, hits: 0, cp: 0, best: 0, maxY: s0.y,
           surge: -4, invuln: 0, crumble: {}, stage: 0, simT: 0, events: [] };
}
function respawn(s, course) {
  // Stagger back to the last hazard-free solid pad behind you (never past your checkpoint); the Surge keeps rising.
  const hz = new Set(course.hazards.map(h => h.pad));
  let i = Math.max(s.cp, Math.min(s.on >= 0 ? s.on : s.cp, course.pads.length - 1));
  while (i > s.cp && (hz.has(i) || course.pads[i].kind === 'crumble' || course.pads[i].kind === 'move')) i--;
  const p = course.pads[i];
  Object.assign(s, { x: p.x, y: p.y, z: p.z, vx: 0, vz: 0, vy: 0, grounded: true, on: i, invuln: 1.2 });
}
function padActive(s, p, t) {
  const c = s.crumble[p.i];
  return !(c && c.down > 0);
}
// input: {mx, mz} world-space wish direction (length 0..1), jump: true on the frame the key went down.
export function step(s, input, course = COURSE) {
  if (s.over || s.finished) return null;
  const dt = STEP, pads = course.pads;
  if (!s.active && (input.mx || input.mz || input.jump)) s.active = true;
  if (!s.active) return null;
  s.simT += dt; s.time += dt; const t = s.simT;
  let ev = null;
  s.invuln = Math.max(0, s.invuln - dt);
  if (input.jump) s.jumpBuf = BUFFER; else s.jumpBuf = Math.max(0, s.jumpBuf - dt);
  // crumble timers
  for (const k in s.crumble) {
    const c = s.crumble[k];
    if (c.down > 0) { c.down -= dt; if (c.down <= 0) delete s.crumble[k]; }
    else if (c.fuse > 0) { c.fuse -= dt; if (c.fuse <= 0) c.down = 3.0; }
  }
  // carried by a moving pad
  if (s.grounded) {
    const p = pads[s.on];
    if (p && p.kind === 'move') {
      const [ax, az] = padOffset(p, t - dt), [bx, bz] = padOffset(p, t);
      s.x += bx - ax; s.z += bz - az;
    }
  }
  // jump (buffer + coyote time)
  if (s.jumpBuf > 0 && (s.grounded || s.coyote > 0)) {
    s.vy = JUMP; s.grounded = false; s.coyote = 0; s.jumpBuf = 0; ev = 'jump';
  }
  // horizontal: responsive on the ground, a little floatier in the air
  const len = Math.hypot(input.mx, input.mz), k = len > 1 ? 1 / len : 1;
  const top = s.grounded ? SPEED : AIR_SPEED, acc = s.grounded ? 16 : 7;
  s.vx += (input.mx * k * top - s.vx) * Math.min(1, dt * acc);
  s.vz += (input.mz * k * top - s.vz) * Math.min(1, dt * acc);
  s.x += s.vx * dt; s.z += s.vz * dt;
  // walls and the central mast
  s.x = Math.max(-WALL + R_PLAYER, Math.min(WALL - R_PLAYER, s.x));
  s.z = Math.max(-WALL + R_PLAYER, Math.min(WALL - R_PLAYER, s.z));
  const rr = Math.hypot(s.x, s.z), minR = MAST + R_PLAYER;
  if (rr < minR) { const f = minR / Math.max(rr, 1e-4); s.x *= f; s.z *= f; }
  // vertical + landing on pad tops (one-way platforms: you can jump up through them)
  const before = s.y; s.vy -= GRAVITY * dt; s.y += s.vy * dt;
  const wasGrounded = s.grounded; s.grounded = false;
  if (s.y <= 0.1) { s.y = 0.1; s.vy = 0; s.grounded = true; s.on = -1; }
  for (const p of pads) {
    if (!padActive(s, p, t)) continue;
    const [ox, oz] = padOffset(p, t), h = p.size / 2 + R_PLAYER * 0.5;
    if (Math.abs(s.x - p.x - ox) <= h && Math.abs(s.z - p.z - oz) <= h && s.vy <= 0 && before >= p.y - 0.06 && s.y <= p.y) {
      s.y = p.y; s.vy = 0; s.grounded = true;
      if (s.on !== p.i && !wasGrounded) ev = ev || 'land';
      s.on = p.i;
      if (p.kind === 'crumble' && !s.crumble[p.i]) s.crumble[p.i] = { fuse: 0.55, down: 0 };
      if (p.kind === 'cp' && p.i > s.cp) { s.cp = p.i; s.surge = Math.min(s.surge, p.y - 7); ev = 'checkpoint'; }
      if (p.kind === 'finish') { s.finished = true; ev = 'finish'; }
      break;
    }
  }
  s.coyote = s.grounded ? COYOTE : Math.max(0, s.coyote - dt);
  s.maxY = Math.max(s.maxY, s.y);
  s.stage = s.maxY >= STAGES[2].from ? 2 : s.maxY >= STAGES[1].from ? 1 : 0;
  // hazards
  if (!s.finished && s.invuln <= 0 && hazardHit(s, course, t)) {
    s.hits++; respawn(s, course); ev = 'hit';
  }
  // the Surge: rises after a short grace period; a checkpoint vents it back down
  if (!s.finished) {
    if (s.time > 3) s.surge += STAGES[s.stage].surge * dt;
    if (s.surge > s.y - 0.15) { s.over = true; ev = 'eliminated'; }
  }
  return ev;
}
export function angDiff(a, b) { return Math.abs(((a - b) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); }
export function hazardHit(s, course, t) {
  for (const h of course.hazards) {
    const p = course.pads[h.pad];
    if (s.y < p.y - 0.2 || s.y > p.y + 3.2) continue;
    const dx = s.x - p.x, dz = s.z - p.z, onPad = Math.abs(dx) < p.size / 2 + .2 && Math.abs(dz) < p.size / 2 + .2;
    if (h.type === 'laser') {
      // beam from the mast to the wall, 0.55 m above the pad top; jump over it
      const by = p.y + 0.55; if (s.y > by + 0.05 || s.y + 1.6 < by) continue;
      const a = laserAngle(h, t), pa = Math.atan2(s.z, s.x);
      if (angDiff(pa, a) < 0.05 + R_PLAYER / Math.max(1, Math.hypot(s.x, s.z)) && angDiff(pa, p.angle) < 0.25) return true;
    } else if (h.type === 'sweep') {
      if (!onPad || s.y > p.y + 0.5) continue;      // the bar is 0.5 m tall: jump it
      const off = sweepOffset(h, t), tx = -Math.sin(p.angle), tz = Math.cos(p.angle);
      if (Math.abs(dx * tx + dz * tz - off) < 0.25 + R_PLAYER) return true;
    } else if (h.type === 'crush') {
      if (onPad && crushHeight(h, t) < 1.5 && s.y < p.y + 1.7) return true;
    } else if (h.type === 'fire') {
      if (onPad && fireOn(h, t) && Math.hypot(dx, dz) < 1.0 && s.y < p.y + 2.2) return true;
    }
  }
  return false;
}
// ------------------------------------------------------------------ scoring (higher wins, one number)
export function score(s, course = COURSE) {
  if (s.finished) return Math.max(60000, 100000 - Math.round(100 * (s.time + PENALTY * s.hits)));
  return Math.max(1, Math.round(s.maxY * 1000));       // height reached, at most ~53,000: finishers always rank higher
}
export function rank(s) {
  if (!s.finished) return s.maxY >= STAGES[2].from ? 'SURVIVOR' : s.maxY >= STAGES[1].from ? 'CONTENDER' : 'ROOKIE';
  const t = s.time + PENALTY * s.hits;
  return t < 95 ? 'CHAMPION' : t < 130 ? 'GLADIATOR' : 'CONQUEROR';
}

// ------------------------------------------------------------------ autopilot (attract-mode demo + headless tests)
// Plays like a careful contender: heads for the next pad (leading moving ones), jumps at the edge, and before a
// hazard looks ahead with these same rules to wait for a safe window. mem keeps its state between steps.
export function autopilotStep(s, course, mem) {
  const target = course.pads[Math.min(course.pads.length - 1, (s.on >= 0 ? s.on : -1) + 1)];
  const [ox, oz] = padOffset(target, s.simT + (s.grounded ? 0.7 : 0.25));
  const dx = target.x + ox - s.x, dz = target.z + oz - s.z, d = Math.hypot(dx, dz);
  let jump = s.grounded && d < target.size / 2 + 1.9;
  const cur = s.on >= 0 ? course.pads[s.on] : null;
  if (s.grounded && cur) {
    const [cx, cz] = padOffset(cur, s.simT), half = cur.size / 2 - 0.35;
    if (Math.abs(s.x - cur.x - cx) > half || Math.abs(s.z - cur.z - cz) > half) jump = true;
  }
  let mx = dx / (d || 1), mz = dz / (d || 1);
  if (mem.careful && s.grounded && s.on !== mem.planned && course.hazards.some(h => h.pad === target.i || h.pad === s.on)) {
    mem.planned = s.on; mem.holdUntil = s.simT + planWait(s, course);
  }
  if (mem.careful && s.simT < (mem.holdUntil || 0)) { mx = mz = 0; jump = false; }
  const edge = jump && !mem.jumpWas; mem.jumpWas = jump;
  return { mx, mz, jump: edge };
}
export function planWait(s0, course) {
  for (let w = 0; w <= 2.6; w += 0.05) {
    const s = JSON.parse(JSON.stringify(s0)), m = {}, start = s.on, hits = s.hits;
    for (let k = 0; k < Math.round(w / STEP); k++) step(s, { mx: 0, mz: 0, jump: false }, course);
    for (let k = 0; k < 3.5 / STEP && !s.over && !s.finished; k++) {
      step(s, autopilotStep(s, course, m), course);
      if (s.on >= start + 2 && s.grounded) break;
    }
    if (s.hits === hits && !s.over) return w;
  }
  return 0;
}

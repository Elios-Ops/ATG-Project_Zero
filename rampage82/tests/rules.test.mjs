// Headless checks for RAMPAGE: THE CLIMB, using the game's own rules.
// node rampage82/tests/rules.test.mjs
import { COURSE, createRun, step, score, rank, STEP, JUMP, GRAVITY, AIR_SPEED, WALL, padOffset, STAGES, autopilotStep } from '../experience/rules.js';

const fail = m => { console.error('FAIL', m); process.exit(1); };
const out = { checks: [] };
const ok = m => out.checks.push(m);

// 1. Geometry: every pad inside the interior walls, the course climbs to the crown, gaps are jumpable.
const apex = JUMP * JUMP / (2 * GRAVITY);
for (const p of COURSE.pads) {
  const h = p.size / 2 + 1.6;                      // + slide range of moving pads
  if (Math.abs(p.x) + h > WALL + 0.01 && p.kind !== 'move' || Math.abs(p.z) + h > WALL + 0.01 && p.kind !== 'move')
    if (Math.abs(p.x) + p.size / 2 > WALL || Math.abs(p.z) + p.size / 2 > WALL) fail(`pad ${p.i} outside walls`);
  if (p.y > 56.5) fail(`pad ${p.i} above the crown`);
}
for (let i = 1; i < COURSE.pads.length; i++) {
  const a = COURSE.pads[i - 1], b = COURSE.pads[i];
  const rise = b.y - a.y, gap = Math.max(0, Math.hypot(b.x - a.x, b.z - a.z) - a.size / 2 - b.size / 2);
  if (rise > apex - 0.45) fail(`pad ${i}: rise ${rise.toFixed(2)} too close to jump apex ${apex.toFixed(2)}`);
  const tUp = (JUMP + Math.sqrt(JUMP * JUMP - 2 * GRAVITY * rise)) / GRAVITY;
  if (gap > AIR_SPEED * tUp * 0.8) fail(`pad ${i}: gap ${gap.toFixed(2)} m not comfortably jumpable`);
}
ok(`${COURSE.pads.length} pads, ${COURSE.hazards.length} hazards, crown at ${COURSE.top.toFixed(2)} m; all gaps jumpable (apex ${apex.toFixed(2)} m)`);

// 2. A simple bot plays the real rules. It walks to the next pad and jumps when close enough.
function policy(s, course, jumpWas) {      // the bot's move for one step (no waiting)
  const target = course.pads[Math.min(course.pads.length - 1, (s.on >= 0 ? s.on : s.cp) + 1)];
  const [ox, oz] = padOffset(target, s.simT + (s.grounded ? 0.7 : 0.25));
  const dx = target.x + ox - s.x, dz = target.z + oz - s.z, d = Math.hypot(dx, dz);
  let jump = s.grounded && d < target.size / 2 + 1.9;
  const cur = s.on >= 0 ? course.pads[s.on] : null;
  if (s.grounded && cur) { const [cx, cz] = padOffset(cur, s.simT), half = cur.size / 2 - 0.35;
    if (Math.abs(s.x - cur.x - cx) > half || Math.abs(s.z - cur.z - cz) > half) jump = true; }
  return { mx: dx / (d || 1), mz: dz / (d || 1), jump, edge: jump && !jumpWas };
}
function planWait(s0, course) {             // smallest wait (0..2.6 s) after which the next two pads are crossed without a hit
  for (let w = 0; w <= 2.6; w += 0.05) {
    const s = JSON.parse(JSON.stringify(s0)); let jw = false; const start = s.on, hits = s.hits;
    for (let k = 0; k < Math.round(w / STEP); k++) step(s, { mx: 0, mz: 0, jump: false }, course);
    for (let k = 0; k < 3.5 / STEP && !s.over && !s.finished; k++) {
      const p = policy(s, course, jw); jw = p.jump; step(s, { mx: p.mx, mz: p.mz, jump: p.edge }, course);
      if (s.on >= start + 2 && s.grounded) break;
    }
    if (s.hits === hits && !s.over) return w;
  }
  return 0;
}
function bot(course, { timing = false, maxT = 400 } = {}) {
  const s = createRun(course); let jumpWas = false, lastPlanned = -2, holdUntil = 0;
  const log = [];
  while (!s.over && !s.finished && s.simT < maxT) {
    const target = course.pads[Math.min(course.pads.length - 1, (s.on >= 0 ? s.on : s.cp) + 1)];
    const [ox, oz] = padOffset(target, s.simT + (s.grounded ? 0.7 : 0.25));   // lead a moving pad like a player would
    const tx = target.x + ox, tz = target.z + oz;
    const dx = tx - s.x, dz = tz - s.z, d = Math.hypot(dx, dz);
    let mx = dx / (d || 1), mz = dz / (d || 1);
    let jump = false;
    if (s.grounded && d < target.size / 2 + 1.9) jump = true;
    const cur = s.on >= 0 ? course.pads[s.on] : null;            // like a player: jump at the edge of the pad you are on
    if (s.grounded && cur) {
      const [cx, cz] = padOffset(cur, s.simT), half = cur.size / 2 - 0.35;
      if (Math.abs(s.x - cur.x - cx) > half || Math.abs(s.z - cur.z - cz) > half) jump = true;
    }
    if (timing && s.grounded && s.on !== lastPlanned && course.hazards.some(h => h.pad === target.i || h.pad === s.on)) {
      // skilled play: look ahead with the real rules and wait for a safe window before committing
      lastPlanned = s.on; holdUntil = s.simT + planWait(s, course);
    }
    if (timing && s.simT < holdUntil) { mx = mz = 0; jump = false; }
    const ev = step(s, { mx, mz, jump: jump && !jumpWas }, course);
    jumpWas = jump;
    if (ev && ev !== 'jump' && ev !== 'land') log.push([ev, +s.simT.toFixed(1), +s.y.toFixed(1)]);
  }
  return { s, log };
}
const calm = { ...COURSE, hazards: [] };
const r1 = bot(calm);
if (!r1.s.finished) fail(`bot could not finish the course without hazards (reached ${r1.s.maxY.toFixed(1)} m, ${r1.s.over ? 'caught by the Surge' : 'timed out'})`);
ok(`no-hazard bot finished in ${r1.s.time.toFixed(1)} s, score ${score(r1.s)}, rank ${rank(r1.s)}`);
const r2 = bot(COURSE);
ok(`hazard bot (no timing): ${r2.s.finished ? 'FINISHED' : 'eliminated'} at ${r2.s.maxY.toFixed(1)} m after ${r2.s.time.toFixed(1)} s, ${r2.s.hits} hits, score ${score(r2.s)}`);
const r3 = bot(COURSE, { timing: true });
ok(`hazard bot (cautious): ${r3.s.finished ? 'FINISHED' : 'eliminated'} at ${r3.s.maxY.toFixed(1)} m after ${r3.s.time.toFixed(1)} s, ${r3.s.hits} hits, score ${score(r3.s)}`);

// 3. Surge pressure: standing still gets you caught; checkpoints vent it.
const idle = createRun(); step(idle, { mx: 0, mz: 0, jump: true });
while (!idle.over && idle.simT < 120) step(idle, { mx: 0, mz: 0, jump: false });
if (!idle.over) fail('an idle player must be caught by the Surge');
ok(`idle player caught by the Surge after ${idle.time.toFixed(1)} s, score ${score(idle)}`);
// 4. Scores: every finisher outranks every non-finisher.
if (score({ finished: true, time: 460, hits: 10, maxY: 53 }) <= score({ finished: false, maxY: 53.2 })) fail('finisher must outrank non-finisher');
ok('finisher always outranks a non-finisher');
// 5. Determinism.
const again = bot(calm); if (again.s.time !== r1.s.time || score(again.s) !== score(r1.s)) fail('not deterministic');
ok('deterministic');
out.ok = true; out.stages = STAGES.map(s => s.name); out.calmEvents = r1.log.slice(0, 8);
console.log(JSON.stringify(out, null, 2));

// 6. The shipped autopilot (used by the attract-mode demo) finishes the real course.
{ const s = createRun(), m = { careful: true };
  while (!s.over && !s.finished && s.simT < 400) step(s, autopilotStep(s, COURSE, m), COURSE);
  if (!s.finished) fail(`attract autopilot failed at ${s.maxY.toFixed(1)} m`);
  console.log(JSON.stringify({ attractAutopilot: `finished in ${s.time.toFixed(1)} s, ${s.hits} hits, score ${score(s)}` })); }

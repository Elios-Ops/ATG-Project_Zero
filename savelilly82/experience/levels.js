// RAMPAGE: SAVE LILLY — level data (pure: no three.js, no p0). All Things Gamed, Lot #82.
// World units are metres of the game world (the renderer scales the whole world to fit the lot). x right, y up.
// A platform is a walkable line segment (x0,y0)-(x1,y1): one-way, so you can jump up through it and land on top.
//   kind: 'girder' | 'steel' | 'ground' | 'conveyor' (conv: surface speed) | 'collapse' | 'lift' (moving) | 'ledge'
// A ladder joins a lower surface (y0) to an upper one (y1) at x. Hazards and items are listed per level.

const P = (x0, y0, x1, y1, kind = 'girder', extra = {}) => ({ x0, y0, x1, y1, kind, ...extra });
const surf = (p, x) => p.y0 + (p.y1 - p.y0) * (x - p.x0) / (p.x1 - p.x0 || 1);
function ladder(plats, x, lowIdx, highIdx, extra = {}) {
  return { x, y0: surf(plats[lowIdx], x), y1: surf(plats[highIdx], x), ...extra };
}
const gears = (x0, x1, n, at) => Array.from({ length: n }, (_, i) => {
  const x = x0 + (x1 - x0) * (n === 1 ? .5 : i / (n - 1));
  return { type: 'gear', x, y: (typeof at === 'function' ? at(x) : at) + 0.9 };
});

export const STAGES = [
  { id: 'foundry', title: 'STAGE 1', name: 'THE FOUNDRY', tag: 'The Warden takes Lilly to the top of the fortress.' },
  { id: 'machine', title: 'STAGE 2', name: 'THE MACHINE', tag: 'Conveyors, crushers and lifts. The Warden is watching.' },
  { id: 'ascent', title: 'STAGE 3', name: 'THE ASCENT', tag: 'The Surge is rising. Climb.' },
  { id: 'warden', title: 'FINAL', name: 'THE WARDEN', tag: 'Overload the four couplings. Bring him down.' },
];

// ------------------------------------------------------------------------------------------------ STAGE 1: THE FOUNDRY
// Six sloped girders zig-zag up the foundry wall. The Warden stands on the top deck throwing energy drums, which roll
// downhill, drop off the open ends to the girder below and sometimes ride a ladder down. Crimson drums that reach the
// crucible at the bottom left wake a Volt (a spark creature that hunts along the girders).
function foundry() {
  const plats = [
    P(0, 0, 28, 0.5, 'ground'),            // 0  T0 floor, downhill to the crucible on the left
    P(0, 4.4, 26, 3.8),                    // 1  T1 downhill right, open right end
    P(2, 7.6, 16.5, 7.93),                 // 2  T2 left part (downhill left)
    P(21, 8.03, 28, 8.2),                  // 3  T2 right part
    P(0, 12.0, 26, 11.4),                  // 4  T3 downhill right
    P(2, 15.2, 28, 15.8),                  // 5  T4 downhill left
    P(0, 19.4, 6, 19.4, 'steel'),          // 6  the Warden's deck
    P(6, 19.4, 26, 19.0),                  // 7  T5 downhill right
    P(9.5, 23.4, 15.5, 23.4, 'ledge'),     // 8  Lilly's ledge (the goal)
    P(16.9, 7.98, 19.5, 7.98, 'lift', { move: { ax: 2.6, ay: 0, period: 4.4, phase: 0 } }), // 9 moving platform over the T2 break
  ];
  const ladders = [
    ladder(plats, 10, 0, 1), ladder(plats, 23, 0, 1),
    ladder(plats, 4.5, 1, 2), ladder(plats, 13, 1, 2),
    ladder(plats, 11, 2, 4), ladder(plats, 24, 3, 4),
    ladder(plats, 6, 4, 5), ladder(plats, 18, 4, 5),
    ladder(plats, 12.5, 5, 7), ladder(plats, 24, 5, 7),
    ladder(plats, 14, 7, 8),
  ];
  const brokenLadders = [{ x: 20, y0: surf(plats[1], 20), y1: surf(plats[1], 20) + 1.4 }, { x: 8.5, y0: surf(plats[5], 8.5) + 2.2, y1: surf(plats[7], 8.5) }];
  const items = [
    ...gears(6, 20, 4, x => surf(plats[0], x)), ...gears(2, 8, 2, x => surf(plats[1], x)), ...gears(15, 22, 3, x => surf(plats[1], x)),
    ...gears(6, 15, 3, x => surf(plats[2], x)), ...gears(14, 22, 3, x => surf(plats[4], x)), ...gears(8, 16, 3, x => surf(plats[5], x)),
    ...gears(16, 22, 3, x => surf(plats[7], x)),
    { type: 'keep', x: 26.6, y: surf(plats[3], 26.6) + 0.9, id: 0 },
    { type: 'keep', x: 1.2, y: surf(plats[4], 1.2) + 0.9, id: 1 },
    { type: 'keep', x: 27, y: surf(plats[5], 27) + 0.9, id: 2 },
    { type: 'gauntlet', x: 3.6, y: surf(plats[2], 3.6) + 1.0 },
    { type: 'gauntlet', x: 21, y: surf(plats[5], 21) + 1.0 },
    { type: 'life', x: 27.2, y: surf(plats[0], 27.2) + 0.9 },
  ];
  return {
    id: 'foundry', kind: 'vertical', bounds: { x0: 0, x1: 28, y0: -2, y1: 26 }, camera: { minY: -1, maxY: 26, minX: 0, maxX: 28, view: 14.5 },
    plats, ladders, brokenLadders, items,
    spawn: { x: 4, y: surf(plats[0], 4) }, goal: { x: 10.2, y: 23.3, w: 5, h: 2.5 },
    checkpoints: [{ x: 4, y: surf(plats[0], 4) }, { x: 21.5, y: surf(plats[4], 21.5) }],
    vents: [{ x: 16, y: surf(plats[1], 16), period: 4.4, phase: 0.8 }, { x: 13.5, y: surf(plats[4], 13.5), period: 3.8, phase: 2.0 }],
    warden: { x: 3.0, y: 19.4, throwX: 5.4, throwDir: 1, interval: [2.6, 3.8], crimson: 0.22, firstThrow: 2.2 },
    crucible: { x: 1.2, y: surf(plats[0], 1.2) },
    lilly: { x: 12.5, y: 23.4, mode: 'held' },
    bonus: 5000,
  };
}

// ------------------------------------------------------------------------------------------------ STAGE 2: THE MACHINE
// A long run through the fortress's machine hall: conveyors with drums from hoppers, a corridor of crushers under a
// back-pushing catwalk, a slag pit crossed on lifts, Volts on the catwalks, and three presses at the exit. Lilly jams
// the presses when you reach them.
function machine() {
  const plats = [
    P(0, 0, 6, 0, 'steel'),                                   // 0
    P(6, 0, 14, 0, 'conveyor', { conv: -2.2 }),              // 1
    P(14, 0, 16, 0, 'steel'),                                 // 2
    P(16, 0, 24, 0, 'conveyor', { conv: 2.6 }),              // 3
    P(24, 0, 48, 0, 'steel'),                                 // 4  crusher corridor floor
    P(4, 4.4, 20, 4.4, 'steel'),                              // 5  section A catwalk
    P(25.5, 6.6, 46.8, 6.6, 'conveyor', { conv: -1.7 }),     // 6  section B catwalk (pushes back)
    // section C: slag pit crossed on lifts (lifts are generated below)
    P(53.6, 5.4, 56.2, 5.4, 'steel'),                         // 7  S1
    P(59.4, 2.6, 62.2, 2.6, 'steel'),                         // 8  S2
    P(65.2, 8.0, 68.4, 8.0, 'steel'),                         // 9  S3
    P(69.8, 4.2, 73.6, 4.2, 'steel'),                         // 10 S4
    P(74, 0, 100, 0, 'steel'),                                // 11 section D floor
    P(78, 4.4, 96.5, 4.4, 'conveyor', { conv: 1.4 }),        // 12 section D catwalk
    P(100, 0, 124, 0, 'steel'),                               // 13 section E (presses)
  ];
  // lifts: three shafts, two cars each, looping between the slag and the roof
  const shafts = [{ x: 50.9, dir: 1 }, { x: 57.6, dir: -1 }, { x: 63.6, dir: 1 }];
  for (const [si, s] of shafts.entries()) for (let k = 0; k < 2; k++) {
    plats.push(P(s.x - 1.15, 0, s.x + 1.15, 0, 'lift', { loop: { y0: -1.2, y1: 12.8, speed: 2.3 * s.dir, phase: k * 7 + si * 2.3 }, shaft: si }));
  }
  const ladders = [
    ladder(plats, 4.6, 0, 5), ladder(plats, 19.4, 3, 5),
    ladder(plats, 25.9, 4, 6), ladder(plats, 46.4, 4, 6),
    ladder(plats, 78.6, 11, 12), ladder(plats, 95.8, 11, 12),
  ];
  const items = [
    ...gears(1, 5, 2, 0), ...gears(7, 13, 3, 0), ...gears(17, 23, 3, 0), ...gears(6, 18, 4, 4.4),
    ...gears(27, 45, 6, 6.6), ...gears(29, 43, 3, 0),
    ...gears(54.2, 55.6, 2, 5.4), ...gears(59.9, 61.7, 2, 2.6), ...gears(70.3, 73, 2, 4.2),
    ...gears(80, 94, 5, 4.4), ...gears(76, 98, 6, 0), ...gears(102, 118, 5, 0),
    { type: 'keep', x: 36, y: 7.5, id: 0 }, { type: 'keep', x: 67.4, y: 8.9, id: 1 }, { type: 'keep', x: 93, y: 5.3, id: 2 },
    { type: 'gauntlet', x: 12, y: 5.4 }, { type: 'gauntlet', x: 81, y: 1.0 },
    { type: 'life', x: 66, y: 8.9 },
  ];
  return {
    id: 'machine', kind: 'horizontal', bounds: { x0: 0, x1: 124, y0: -3, y1: 18 }, camera: { minY: -2, maxY: 17, minX: 0, maxX: 124, view: 12.5 },
    plats, ladders, brokenLadders: [], items,
    spawn: { x: 2, y: 0 }, goal: { x: 120.2, y: 0, w: 3.4, h: 3.2 },
    checkpoints: [{ x: 2, y: 0 }, { x: 46.9, y: 0 }, { x: 75.5, y: 0 }, { x: 100.8, y: 0 }],
    pits: [{ x0: 48, x1: 74, y: -0.8 }],
    hoppers: [{ x: 10, y: 10, period: 3.4, phase: 0.5, dir: -1 }, { x: 20.5, y: 10, period: 3.4, phase: 2.2, dir: 1 },
              { x: 95.5, y: 11, period: 3.0, phase: 1.0, dir: -1 }],
    crushers: [{ x: 28.2, w: 2.2, floor: 0, top: 4.3, period: 2.8, phase: 0 }, { x: 32.6, w: 2.2, floor: 0, top: 4.3, period: 2.8, phase: 0.7 },
               { x: 37.0, w: 2.2, floor: 0, top: 4.3, period: 2.8, phase: 1.4 }, { x: 41.4, w: 2.2, floor: 0, top: 4.3, period: 2.8, phase: 2.1 },
               { x: 104.4, w: 3.0, floor: 0, top: 4.6, period: 2.2, phase: 0, press: true },
               { x: 109.4, w: 3.0, floor: 0, top: 4.6, period: 2.2, phase: 0.73, press: true },
               { x: 114.4, w: 3.0, floor: 0, top: 4.6, period: 2.2, phase: 1.46, press: true }],
    vents: [{ x: 84, y: 0, period: 3.6, phase: 0 }, { x: 89.5, y: 0, period: 3.6, phase: 1.8 }],
    bugs: [{ x: 14, y: 4.4 }, { x: 88, y: 0 }, { x: 84, y: 4.4 }],
    triggers: [{ id: 'sabotage', x: 99.5, y: -1, w: 2, h: 8 }],
    lilly: { x: 112, y: 9, mode: 'gantry' },
    wardenCameo: { x: 108, y: 10 },
    bonus: 6000,
  };
}

// ------------------------------------------------------------------------------------------------ STAGE 3: THE ASCENT
// The final shaft to the summit, 70 m of it, with the crimson Surge rising behind you. Two routes split at 15 m:
// the left climbs ladders past timed lasers, the right leaps across collapsing plates for gears and a keepsake.
// A cracked panel on the left wall hides a secret alcove. Near the top the Warden hurls bouncing drums down the shaft.
function ascent() {
  const c = (x0, x1, y) => P(x0, y, x1, y, 'collapse');
  const s = (x0, x1, y) => P(x0, y, x1, y, 'steel');
  const plats = [
    P(0, 0, 24, 0, 'ground'),     // 0
    s(0, 7, 3.6),                 // 1  a1
    c(8.4, 10.4, 4.6),            // 2
    c(11.9, 13.9, 5.6),           // 3
    c(15.4, 17.4, 6.6),           // 4
    s(19, 24, 7.6),               // 5  a3
    s(10, 24, 11.4),              // 6  b1
    s(0, 12, 15.2),               // 7  c1 (route split)
    s(0, 6, 19.2),                // 8  left L2
    s(-3, 7, 23.4),               // 9  left L3 (extends into the secret alcove x<0)
    s(0, 6, 27.6),                // 10 left L4
    s(0, 8, 31.8),                // 11 left L5
    c(13.4, 15.2, 16.4),          // 12 right
    c(16.7, 18.5, 17.6),          // 13
    c(20, 22, 18.8),              // 14
    s(19.6, 24, 20.0),            // 15 R1
    P(15.6, 20.6, 18.0, 20.6, 'lift', { move: { ax: 0, ay: 6.6, period: 6.0, phase: 0 } }), // 16 vertical lift R1 -> R2
    s(19, 24, 28),                // 17 R2
    c(15.6, 17.6, 29.4),          // 18
    c(12.4, 14.4, 30.8),          // 19
    s(8.4, 12, 32.2),             // 20 R3
    s(0, 24, 36),                 // 21 J (routes rejoin, checkpoint)
    s(14, 24, 40),                // 22 K1
    P(6.4, 42, 8.8, 42, 'lift', { move: { ax: 5.0, ay: 0, period: 5.0, phase: 0 } }), // 23 M1 horizontal
    s(0, 6, 44),                  // 24 K2
    s(0, 4, 48.2), c(4, 6, 48.2), s(6, 10, 48.2),   // 25 26 27 K3 (collapsing middle)
    s(8, 18, 52.4),               // 28 K4
    s(12, 24, 56.6),              // 29 K5 (checkpoint)
    c(9, 11, 58),                 // 30
    c(5.5, 7.5, 59.4),            // 31
    c(2, 4, 60.8),                // 32
    s(0, 5, 62),                  // 33 F1
    s(0, 10, 66.2),               // 34 F2
    P(6, 70, 18, 70, 'ledge'),    // 35 SUMMIT
  ];
  const L = (x, a, b) => ladder(plats, x, a, b);
  const ladders = [
    L(2, 0, 1), L(22.4, 5, 6), L(11, 6, 7),
    L(1.5, 7, 8), L(4.5, 8, 9), L(2, 9, 10), L(5, 10, 11), L(7, 11, 21),
    L(10, 20, 21),
    L(20, 21, 22), L(1.5, 24, 25), L(9, 27, 28), L(17, 28, 29),
    L(3, 33, 34), L(9, 34, 35),
  ];
  const items = [
    ...gears(9, 17, 3, x => (x < 11 ? 4.6 : x < 15 ? 5.6 : 6.6)), ...gears(12, 22, 3, 11.4), ...gears(4, 10, 2, 15.2),
    ...gears(1, 5, 2, 23.4), ...gears(1, 6, 2, 31.8),
    ...gears(14.3, 21, 3, x => (x < 16 ? 16.4 : x < 19 ? 17.6 : 18.8)), ...gears(20, 23, 3, 28), ...gears(9, 11.5, 2, 32.2),
    ...gears(4, 20, 5, 36), ...gears(15, 23, 3, 40), ...gears(9, 17, 3, 52.4), ...gears(1, 9, 3, 66.2),
    { type: 'keep', x: 23, y: 28.9, id: 0 }, { type: 'keep', x: 0.8, y: 44.9, id: 1 }, { type: 'keep', x: 23.2, y: 57.5, id: 2 },
    { type: 'life', x: -2.2, y: 24.3, secret: true },
    { type: 'gauntlet', x: 22, y: 41 },
  ];
  return {
    id: 'ascent', kind: 'vertical', bounds: { x0: -3, x1: 24, y0: -6, y1: 74 }, camera: { minY: -2, maxY: 74, minX: -3, maxX: 24, view: 13.5 },
    plats, ladders, brokenLadders: [], items,
    spawn: { x: 4, y: 0 }, goal: { x: 8, y: 70, w: 8, h: 3 },
    checkpoints: [{ x: 4, y: 0 }, { x: 3, y: 15.2 }, { x: 12, y: 36 }, { x: 20, y: 56.6 }],
    secret: { x0: -3, x1: 0, y0: 23.4, y1: 26.4 },
    lasers: [{ x0: 20.2, x1: 21.5, y: 8.5, period: 3.4, phase: 0 }, { x0: 14, x1: 18, y: 12.2, period: 3.4, phase: 1.2 },
             { x0: 2.5, x1: 3.7, y: 20.0, period: 3.0, phase: 0.4 }, { x0: 3, x1: 4.3, y: 28.4, period: 3.0, phase: 1.8 },
             { x0: 2.3, x1: 3.5, y: 44.8, period: 3.2, phase: 0.9 }, { x0: 5, x1: 7.5, y: 67.0, period: 3.4, phase: 0.2 }],
    vents: [{ x: 12.5, y: 52.4, period: 3.4, phase: 0.6, crimson: true }],
    surge: { start: -4, delay: 4, speed: 0.5, accel: 0.0016 },
    bouncer: { x: 12, y: 71, fromY: 34, interval: [3.0, 4.2] },
    wardenCameo: { x: 12, y: 70.2 },
    lilly: { x: 15, y: 74, mode: 'held' },
    bonus: 7000,
  };
}

// ------------------------------------------------------------------------------------------------ FINAL: THE WARDEN
// The Warden stands on a platform held up by four power couplings, cabled to clamps on the tiers below. Step on a
// clamp's plate to overload it. Each one makes him angrier and adds an attack: rolling drums, bouncing drums, a slam
// that sends shockwaves along your tier, and the crimson eye's beam. After the second, Lilly picks her lock and drops
// you an Overdrive Gauntlet. After the fourth, his platform gives way.
function warden() {
  const plats = [
    P(0, 0, 28, 0, 'steel'),             // 0 floor (furnaces at both walls)
    P(6, 4.4, 22, 4.4, 'steel'),         // 1 T1 centre
    P(0, 9.2, 12.8, 8.8),                // 2 T2 left (downhill to the centre gap)
    P(15.2, 8.8, 28, 9.2),               // 3 T2 right (downhill to the centre gap)
    P(1.6, 13.2, 10.6, 13.6),            // 4 T3 left (downhill to the wall)
    P(17.4, 13.6, 26.4, 13.2),           // 5 T3 right
    P(10.2, 15.6, 17.8, 15.6, 'steel', { boss: true }), // 6 the Warden's platform (unreachable)
  ];
  const L = (x, a, b) => ladder(plats, x, a, b);
  const ladders = [L(8, 0, 1), L(20, 0, 1), L(10, 1, 2), L(18, 1, 3), L(4, 2, 4), L(24, 3, 5)];
  const couplings = [
    { x: 14, y: 4.4 }, { x: 2.6, y: surf(plats[2], 2.6) }, { x: 25.4, y: surf(plats[3], 25.4) }, { x: 8.4, y: surf(plats[4], 8.4) },
  ];
  const items = [...gears(9, 19, 4, 4.4), ...gears(3, 11, 3, x => surf(plats[2], x)), ...gears(17, 25, 3, x => surf(plats[3], x))];
  return {
    id: 'warden', kind: 'boss', bounds: { x0: 0, x1: 28, y0: -2, y1: 21 }, camera: { minY: -1.5, maxY: 21, minX: 0, maxX: 28, view: 20, fixed: { x: 14, y: 9.6 } },
    plats, ladders, brokenLadders: [], items, couplings,
    spawn: { x: 3, y: 0 }, goal: null,
    checkpoints: [{ x: 3, y: 0 }],
    furnaces: [{ x0: 0, x1: 1.1 }, { x0: 26.9, x1: 28 }],
    boss: { x: 14, y: 15.6, throwY: 13.6 },
    lilly: { x: 25.8, y: 17.2, mode: 'cage' },
    gift: { x: 14, y: 9.6 },
    bonus: 8000,
  };
}

const BUILDERS = { foundry, machine, ascent, warden };
export function buildLevel(id) { return BUILDERS[id](); }
export { surf };

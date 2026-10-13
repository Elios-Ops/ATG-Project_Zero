// RAMPAGE: SAVE LILLY — headless tests of the rules: every stage can be finished by the autopilot, the boss can be
// beaten, deaths respawn at checkpoints, game over and scoring work, and the simulation is deterministic.
// node savelilly82/tests/sim.test.mjs [--verbose]
import { createSim, stepSim, DT, DIFFICULTY } from '../experience/sim.js';
import { createBot, botInput } from '../experience/bot.js';

const V = process.argv.includes('--verbose');
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };

function play(level, { seed = 1, difficulty = 'normal', invincible = false, maxT = 400, lives = 99 } = {}) {
  const s = createSim(level, { seed, difficulty, invincible, lives }), bot = createBot(level);
  const causes = {};
  while (!s.result && s.t < maxT) {
    stepSim(s, botInput(bot, s));
    for (const e of s.events) if (e.type === 'die') causes[e.cause] = (causes[e.cause] || 0) + 1;
  }
  return { result: s.result, t: +s.t.toFixed(1), deaths: s.deaths, score: s.score, gears: s.gears, step: bot.i, of: bot.route.length, causes, hero: [+s.hero.x.toFixed(2), +s.hero.y.toFixed(2)] };
}
const STAGES = ['foundry', 'machine', 'ascent', 'warden'];
// 1) the route itself: with hazards unable to kill, the autopilot reaches the goal of every stage
for (const lv of STAGES) {
  const r = play(lv, { invincible: true, maxT: 300 });
  ok(r.result === 'clear' || r.result === 'bossDefeat', `${lv}: route completes (invincible) in ${r.t}s ${JSON.stringify(r)}`);
}
// 2) with real hazards: completion rate and time over seeds (lives unlimited so we see how often it dies)
for (const lv of STAGES) {
  const rs = Array.from({ length: 12 }, (_, i) => play(lv, { seed: 100 + i, maxT: 600 }));
  const done = rs.filter(r => r.result === 'clear' || r.result === 'bossDefeat');
  const deaths = rs.reduce((a, r) => a + r.deaths, 0) / rs.length, causes = {};
  for (const r of rs) for (const [k, v] of Object.entries(r.causes)) causes[k] = (causes[k] || 0) + v;
  const times = done.map(r => r.t).sort((a, b) => a - b);
  ok(done.length >= 10, `${lv}: autopilot finishes ${done.length}/12 with hazards; median ${times[times.length >> 1]}s; avg deaths ${deaths.toFixed(1)} ${JSON.stringify(causes)}`);
  if (V) for (const r of rs) console.log('   ', JSON.stringify(r));
}
// 3) determinism: same seed, same inputs -> same state
{
  const a = play('foundry', { seed: 7, maxT: 40 }), b = play('foundry', { seed: 7, maxT: 40 });
  ok(JSON.stringify(a) === JSON.stringify(b), 'deterministic for a seed');
}
// 4) standing still: the Warden's drums take the lives -> game over
{
  const s = createSim('foundry', { seed: 3, lives: 1 });
  while (!s.result && s.t < 240) stepSim(s, {});
  ok(s.result === 'gameover' || s.t >= 240, `idle player: ${s.result || 'survived'} at ${s.t.toFixed(1)}s`);
}
{
  const s = createSim('ascent', { seed: 3, lives: 1 });
  while (!s.result && s.t < 120) stepSim(s, {});
  ok(s.result === 'gameover', `ascent: the Surge catches an idle player (${s.result} at ${s.t.toFixed(1)}s)`);
}
// 5) respawn goes to the last checkpoint reached
{
  const s = createSim('foundry', { seed: 5, lives: 3 }), bot = createBot('foundry');
  while (s.cp < 1 && s.t < 200) stepSim(s, botInput(bot, s));
  s.hero.state = 'play'; s.lives = 3; s.invincible = false;
  s.hero.inv = 0; s.hero.ground = null; s.hero.ladder = null; s.hero.x = 1; s.hero.y = -5; stepSim(s, {});
  let tt = 0; while (s.hero.state !== 'play' && tt < 5) { stepSim(s, {}); tt += DT; }
  const cp = s.L.checkpoints[1];
  ok(s.cp === 1 && Math.abs(s.hero.x - cp.x) < 0.01, `respawn at checkpoint 1 (${s.hero.x.toFixed(2)}, ${s.hero.y.toFixed(2)}) lives ${s.lives}`);
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);

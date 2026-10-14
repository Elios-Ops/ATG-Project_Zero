// RAMPAGE: SAVE LILLY — All Things Gamed, Lot #82. The game: renderer, camera, screens, stages, cutscenes, sound.
// The rules live in sim.js (pure), the levels in levels.js, the art in chars.js / world.js / fx.js, the screens in hud.js.
import * as THREE from 'three';
import { createSim, stepSim, DT, DIFFICULTY, POINTS, stageClearTally, platY } from './sim.js';
import { STAGES } from './levels.js';
import { createBot, botInput } from './bot.js';
import { buildHero, buildWarden, buildLilly } from './chars.js';
import { loadMeshyCast } from './meshychars.js';
import { buildWorld, makeTextures, PAL } from './world.js';
import { createFx } from './fx.js';
import { createHud } from './hud.js';
import { loadBitmapFont } from './hudfont.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const STAGE_IDS = ['foundry', 'machine', 'ascent', 'warden'];
const CAMD = 10.6, CAMY = 14;                          // the camera stays inside the lot's box; the world moves
const MUSIC = { title: 'assets/music/title.mp3', foundry: 'assets/music/stage.mp3', machine: 'assets/music/machine.mp3', ascent: 'assets/music/ascent.mp3', warden: 'assets/music/boss.mp3', victory: 'assets/music/victory.mp3' };
const LINES = {
  foundry: ['HELP! JAX!', 'WATCH THE DRUMS!', 'JUMP THEM!', 'THE LADDERS, JAX!', "I'M UP HERE!"],
  machine: ['THE PRESSES ARE TIMED!', 'RIDE THE LIFTS!', 'KEEP MOVING!', 'MIND THE VOLTS!'],
  ascent: ['THE SURGE! CLIMB!', 'DON\'T LOOK DOWN!', 'ALMOST THERE!', 'HURRY, JAX!'],
  warden: ['THE COUPLINGS! STEP ON THEM!', 'HE AIMS FOR YOUR FLOOR!', 'JUMP THE SHOCKWAVE!', 'YOU CAN DO IT!'],
};
const RANKS = [[90000, 'RAMPAGE LEGEND'], [78000, 'CHAMPION'], [66000, 'CONQUEROR'], [52000, 'GLADIATOR'], [36000, 'CONTENDER'], [0, 'ROOKIE']];

export async function createGame(p0, opts = {}) {
  p0.loading(0.04, 'opening the fortress'); const dbg = (...a) => opts.debug && p0.log('SAVE LILLY dbg', ...a); dbg('begin');
  p0.controls.mode = 'none'; p0.controls.vertical = false; p0.bodies.visible = false;
  const renderer = p0.renderer, scene = p0.scene, cam = p0.camera;
  // ------------------------------------------------------------------ quality: the software renderer (and the review) gets the light version
  let light = !!opts.light;
  try {
    const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (/swiftshader|llvmpipe|software/i.test(String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)))) light = true;
  } catch (e) { /* keep */ }
  const basePR = Math.min(light ? 0.55 : 1, p0.pixelRatio || 1, 1600 / Math.max(1, p0.width));
  renderer.setPixelRatio(basePR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
  const matCache = new Map();
  function M(color, o = {}) {
    if (o.additive) return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o.opacity ?? 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
    if (o.glow) return new THREE.MeshBasicMaterial({ color, fog: false, toneMapped: false });
    const p = { color, map: o.map || null, side: o.side ?? THREE.FrontSide, flatShading: !!o.flat };
    if (o.emissive) p.emissive = new THREE.Color(o.emissive);
    if (light) return new THREE.MeshLambertMaterial(p);
    return new THREE.MeshStandardMaterial({ ...p, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0.1 });
  }
  scene.background = new THREE.Color(0x050406);
  if (!light) { try { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; pm.dispose(); } catch (e) { /* no environment */ } }
  cam.fov = 40; cam.near = 0.1; cam.far = 260; cam.position.set(0, CAMY, CAMD); cam.lookAt(0, CAMY, 0); cam.updateProjectionMatrix();
  scene.add(cam);

  // ------------------------------------------------------------------ fonts, logo
  dbg('renderer ok', light); p0.loading(0.1, 'painting the signs');
  const fonts = { D: null, T: null };
  try { [fonts.D, fonts.T] = await Promise.all([loadBitmapFont(p0, 'font-anton'), loadBitmapFont(p0, 'font-oswald')]); } catch (e) { p0.log('SAVE LILLY: fonts unavailable', String(e)); }
  let logo = null;
  try { logo = await createImageBitmap(await (await fetch(p0.asset('assets/logo.png'))).blob()); } catch (e) { p0.log('SAVE LILLY: logo unavailable', String(e)); }
  const hud = createHud(p0, cam, fonts, logo, light);

  // ------------------------------------------------------------------ world root, characters
  p0.loading(0.2, 'forging the characters');
  const tex = makeTextures();
  const root = new THREE.Group(); scene.add(root);
  const fx = createFx(light); root.add(fx.group);
  let hero = buildHero(M), warden = buildWarden(M), lilly = buildLilly(M);   // built-in characters: the fallback
  if (!opts.procedural) {
    try {
      p0.loading(0.24, 'waking the Warden');
      const cast = await loadMeshyCast(p0, light, (f, n) => p0.loading(0.24 + 0.16 * f, `loading ${n}`));
      hero = cast.hero; warden = cast.warden; lilly = cast.lilly;
    } catch (e) { p0.log('SAVE LILLY: Meshy characters unavailable, using the built-in ones', String(e)); }
  }
  root.add(hero.root, warden.root, lilly.root);
  const heldDrum = (() => {
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 18), M(0x3a3e48, { metal: 0.6, rough: 0.35 })); body.rotation.x = Math.PI / 2; g.add(body);
    for (const z of [-0.3, 0, 0.3]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.05, 6, 20), M(0xff7a1a, { glow: true })); b.position.z = z; g.add(b); }
    g.scale.setScalar(1.25); g.visible = false; root.add(g); return g;
  })();
  const heroLight = light ? null : new THREE.PointLight(0xffd2b0, 26, 7, 1.4); if (heroLight) root.add(heroLight);
  const cage = (() => {
    const g = new THREE.Group(), barM = M(0x8a8e98, { metal: 0.9, rough: 0.3 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 6), barM); b.position.set(Math.cos(a) * 0.62, 0.95, Math.sin(a) * 0.62); g.add(b); }
    for (const y of [0, 1.9]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 20), barM); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.1, 18), M(0x2a2e36, { metal: 0.7 })); g.add(base);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 8, 6), M(0x5a5e68, { metal: 0.9 })); chain.position.y = 5.9; g.add(chain);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M(0x21d4c4, { glow: true })); lamp.position.y = 2.0; g.add(lamp);
    root.add(g); return g;
  })();
  const ghosts = new Map();                                   // other players in the session, as glass silhouettes

  // ------------------------------------------------------------------ state
  const G = {
    screen: 'title', t: 0, sel: 0, items: [], difficulty: 'normal', stageIdx: 0, arcade: true, score: 0, lives: 3, runT: 0,
    sim: null, bot: null, attract: true, mode: 'title', cut: null, banner: null, speech: null, letterbox: 0, caption: '', canSkip: false,
    popups: [], tally: null, results: null, wipe: 0, showHud: false, touch: false, jumpHeld: false, table: p0.table || [], rewardText: '',
    stageStats: [], sent: false, totalKeeps: 0, totalGears: 0, startLives: 3, hitstop: 0, shake: 0, cam: { x: 14, y: 8, z: 1 }, camOverride: null,
    lillyMode: 'held', lillyPos: null, wardenMode: 'idle', wardenU: 0, wardenT: 0, wardenOff: { x: 0, y: 0 }, heroOverride: null, lineT: 6, music: null,
  };
  let world = null, levelId = null;
  const sfx = (n, v = 0.5) => { try { p0.sound.play(`assets/sfx/${n}.mp3`, { volume: v }); } catch (e) { /* muted */ } };
  function music(name) {
    if (G.music === name) return; G.music = name;
    try { if (!name) p0.music.stop(); else p0.music.play(MUSIC[name], { loop: name !== 'victory', volume: name === 'title' ? 0.5 : 0.42 }); } catch (e) { /* no audio */ }
  }

  // ------------------------------------------------------------------ levels
  function disposeWorld() {
    if (!world) return;
    root.remove(world.group);
    world.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && !o.material.userData.shared) { const m = o.material; if (m.map && !Object.values(tex).includes(m.map)) m.map.dispose(); m.dispose(); } });
    world = null; fx.clearEmitters();
  }
  let loadId = 0;
  async function loadLevel(id, simOpts) {
    const my = ++loadId;
    disposeWorld();
    levelId = id;
    G.sim = createSim(id, simOpts);
    world = buildWorld(G.sim.L, { M, light, tex, fx });
    root.add(world.group);
    const P = PAL[id];
    scene.fog = new THREE.Fog(P.fog, CAMD + 4, CAMD + 34);
    scene.background = new THREE.Color(P.skyTop);
    placeCast(true);
    const h = G.sim.hero; G.cam.x = h.x; G.cam.y = h.y + 3;
    try { await renderer.compileAsync(scene, cam); } catch (e) { /* older renderers compile on draw */ }
    return my === loadId;                                     // false: a newer load replaced this one meanwhile
  }

  // ------------------------------------------------------------------ the cast: where the Warden and Lilly stand in each stage
  function placeCast(reset) {
    const L = G.sim.L, id = L.id;
    warden.root.visible = lilly.root.visible = true;
    warden.root.scale.setScalar(1); warden.root.position.z = 0;
    if (reset) {
      G.wardenOff.x = G.wardenOff.y = 0; G.lillyMode = id === 'warden' || id === 'machine' ? 'cage' : 'held'; G.heroOverride = null;
      if (id === 'foundry') G.lillyPos = { x: L.lilly.x, y: L.lilly.y, z: 0 };
      else if (id === 'machine') G.lillyPos = { x: L.lilly.x, y: L.lilly.y - 2.2, z: -2.6 };
      else if (id === 'ascent') G.lillyPos = { x: 16.6, y: 70, z: -0.4 };
      else G.lillyPos = { x: L.lilly.x, y: L.lilly.y, z: 0 };
      cage.visible = id !== 'foundry';
      cage.position.set(G.lillyPos.x, G.lillyPos.y, G.lillyPos.z);
    }
    if (id === 'foundry') warden.root.position.set(L.warden.x + G.wardenOff.x, L.warden.y + G.wardenOff.y, -0.1);
    else if (id === 'machine') { warden.root.position.set(L.wardenCameo.x + G.wardenOff.x, L.wardenCameo.y + G.wardenOff.y, -2.6); warden.root.scale.setScalar(0.9); }
    else if (id === 'ascent') warden.root.position.set(L.wardenCameo.x + G.wardenOff.x, L.wardenCameo.y + G.wardenOff.y, -0.6);
    else { warden.root.position.set(L.boss.x + G.wardenOff.x, L.boss.y + G.wardenOff.y, -0.2); warden.root.scale.setScalar(warden.kind === 'meshy' ? 1.0 : 1.15); }
  }

  // ------------------------------------------------------------------ flow
  const mainItems = () => [
    { id: 'start', label: 'START GAME', desc: 'Three stages and the Warden. One run for the weekly table.' },
    { id: 'select', label: 'STAGE SELECT', desc: 'Practise any stage. Scores count in START GAME.' },
    { id: 'diff', label: `◀  ${DIFFICULTY[G.difficulty].name}  ▶`, desc: { rookie: 'Five lives, gentler hazards.', normal: 'Three lives. The way it is meant to be played.', rampage: 'Faster drums, a hungrier Surge. For legends.' }[G.difficulty] },
    { id: 'howto', label: 'HOW TO PLAY', desc: 'Controls, items and the Warden.' },
  ];
  function toTitle() {
    G.screen = 'title'; G.mode = 'title'; G.showHud = false; G.results = null; G.tally = null; G.letterbox = 0; G.banner = null; G.speech = null;
    startAttract(); music('title');
  }
  async function startAttract() {
    G.attract = true;
    const current = await loadLevel('foundry', { seed: 1 + Math.floor(Math.random() * 1e6), difficulty: 'normal', lives: 99 });
    if (current && G.attract) G.bot = createBot('foundry');
  }
  function toMenu() { G.screen = 'menu'; G.sel = 0; G.items = mainItems(); G.force = true; }
  function startRun(stageIdx, arcade) {
    G.arcade = arcade; G.stageIdx = stageIdx; G.score = 0; G.runT = 0; G.lives = DIFFICULTY[G.difficulty].lives; G.stageStats = []; G.sent = false; G.rewardText = '';
    G.totalKeeps = 0; G.totalGears = 0;
    transition(() => beginStage());
  }
  async function beginStage() {
    G.attract = false; G.bot = opts.autopilot ? createBot(STAGE_IDS[G.stageIdx]) : null;
    await loadLevel(STAGE_IDS[G.stageIdx], { seed: (Date.now() & 0xffff) + G.stageIdx, difficulty: G.difficulty, lives: G.lives, invincible: !!opts.invincible });
    G.screen = 'play'; G.showHud = false; G.mode = 'intro'; G.speech = null; G.popups = [];
    music(STAGE_IDS[G.stageIdx]);
    startCut(introCut(STAGE_IDS[G.stageIdx]));
  }
  function transition(fn) { G.trans = { t: 0, fn, done: false }; }
  function stageCleared() {
    const s = G.sim, tl = stageClearTally(s), keeps = s.keeps.filter(Boolean).length;
    G.score += s.score + tl.total; G.lives = s.lives; G.totalKeeps += keeps; G.totalGears += s.gears;
    G.stageStats.push({ id: s.id, time: s.t, deaths: s.deaths, gears: s.gears, keeps });
    G.tally = { t: 0, title: 'STAGE CLEAR', shown: 0, target: s.score + tl.total, rows: [
      ['STAGE POINTS', fmt(s.score)], ['CLEAR BONUS', fmt(tl.clear)], ['TIME BONUS', fmt(tl.bonus), '#ffd23a'],
      ['NO-FALL BONUS', tl.noDeath ? fmt(tl.noDeath) : '—', tl.noDeath ? '#5aff8a' : '#a8a2a0'], ["LILLY'S KEEPSAKES", `${keeps} / 3`, '#21d4c4']] };
    sfx('clear', 0.6);
  }
  function finishRun(won) {
    G.showHud = false; G.mode = 'results'; G.screen = 'results'; G.sel = 0;
    const lifeBonus = won ? G.lives * 2000 : 0;
    const total = G.score + lifeBonus;
    const rank = (RANKS.find(([s]) => total >= s) || RANKS[RANKS.length - 1])[1];
    G.results = { win: won, title: won ? 'LILLY RESCUED!' : 'GAME OVER', sub: won ? 'THE WARDEN IS DOWN. THE FORTRESS IS QUIET.' : 'THE WARDEN STILL HOLDS LILLY.', score: total, rank,
      rows: [['STAGES', `${G.stageStats.length} / 4`], ['GEARS', fmt(G.totalGears)], ["KEEPSAKES", `${G.totalKeeps} / 9`, '#21d4c4'], ['TIME', clock(G.runT)], ['LIVES BONUS', won ? fmt(lifeBonus) : '—'], ['DIFFICULTY', DIFFICULTY[G.difficulty].name]] };
    G.finalScore = total;
    if (G.arcade && !G.sent) { G.sent = true; try { p0.score(total); } catch (e) { /* offline */ } if (won) try { p0.win(); } catch (e) { /* no prize */ } }
    p0.log('SAVE LILLY run', JSON.stringify({ won, score: total, time: +G.runT.toFixed(1), difficulty: G.difficulty, stages: G.stageStats }));
    music(won ? 'victory' : null); if (!won) sfx('gameover', 0.6);
  }
  const fmt = n => Math.max(0, Math.round(n)).toLocaleString('en-US');
  const clock = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  // ------------------------------------------------------------------ cutscenes: small timelines that drive the camera, the cast and captions
  function startCut(c) { G.cut = { t: 0, ...c }; G.mode = 'cut'; G.canSkip = c.skip !== false; G.showHud = false; }
  function endCut() { const c = G.cut; G.cut = null; G.camOverride = null; G.caption = ''; if (c && c.done) c.done(); }
  const lerp = (a, b, k) => a + (b - a) * k, ease = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
  function say(text, dur = 2.6) { G.speech = { text, t: 0, dur }; sfx('lilly', 0.35); }
  function introCut(id) {
    const s = G.sim, L = s.L, h = s.hero, st = STAGES[G.stageIdx];
    const card = () => { G.banner = { text: `${st.title} · ${st.name}`, sub: st.tag.toUpperCase(), t: 0, dur: 2.6, big: true }; sfx('stage', 0.55); };
    const go = () => { G.mode = 'play'; G.showHud = true; G.lineT = 7; };
    if (id === 'foundry') return { dur: 6.2, update(t) {
      const top = { x: 8.4, y: 21.6 }, bot = { x: h.x + 6, y: h.y + 4 };
      const k2 = ease((t - 3.4) / 1.6);
      G.camOverride = { x: lerp(top.x, bot.x, k2), y: lerp(top.y, bot.y, k2), z: t < 3.4 ? 0.82 : lerp(0.82, 1, k2) };
      G.letterbox = Math.min(1, t * 2, (6.2 - t) * 2);
      G.wardenMode = t < 0.4 ? 'idle' : t < 1.9 ? 'roar' : t < 3.4 ? 'pound' : 'idle';
      if (this.f0 === undefined && t > 0.4) { this.f0 = 1; sfx('roar', 0.7); G.shake = 0.5; }
      if (this.f1 === undefined && t > 1.9) { this.f1 = 1; sfx('pound', 0.6); }
      if (this.f2 === undefined && t > 1.2) { this.f2 = 1; say('HELP! JAX!', 2.2); }
      G.caption = t < 3.4 ? 'THE WARDEN HAS TAKEN LILLY TO THE TOP OF THE FOUNDRY' : 'CLIMB THE GIRDERS. JUMP THE DRUMS. SAVE LILLY.';
      if (this.f3 === undefined && t > 4.6) { this.f3 = 1; card(); }
    }, done: go };
    if (id === 'machine') return { dur: 5.2, update(t) {
      const far = { x: L.wardenCameo.x - 4, y: 8 }, near = { x: h.x + 6, y: h.y + 4 }, k2 = ease((t - 2.2) / 1.4);
      G.camOverride = { x: lerp(far.x, near.x, k2), y: lerp(far.y, near.y, k2), z: lerp(0.9, 1, k2) };
      G.letterbox = Math.min(1, t * 2, (5.2 - t) * 2);
      G.wardenMode = t < 1.8 ? 'pound' : 'idle'; if (this.f0 === undefined) { this.f0 = 1; sfx('pound', 0.5); }
      if (this.f1 === undefined && t > 0.6) { this.f1 = 1; say('JAX! THROUGH THE MACHINE HALL!', 2.4); }
      G.caption = 'HE IS DRAGGING HER THROUGH THE MACHINE HALL';
      if (this.f2 === undefined && t > 3.6) { this.f2 = 1; card(); }
    }, done: go };
    if (id === 'ascent') return { dur: 6.0, update(t) {
      const top = { x: 12, y: 68 }, bot = { x: h.x + 6, y: h.y + 4 }, k2 = ease((t - 2.2) / 2.0);
      G.camOverride = { x: lerp(top.x, bot.x, k2), y: lerp(top.y, bot.y, k2), z: lerp(0.85, 1, k2) };
      G.letterbox = Math.min(1, t * 2, (6.0 - t) * 2);
      G.wardenMode = t < 1.8 ? 'roar' : 'idle'; if (this.f0 === undefined && t > 0.3) { this.f0 = 1; sfx('roar', 0.7); G.shake = 0.4; }
      G.caption = t < 2.2 ? 'THE SUMMIT. SEVENTY METRES UP.' : 'THE SURGE IS RISING. CLIMB!';
      if (this.f1 === undefined && t > 4.4) { this.f1 = 1; card(); say('THE SURGE! CLIMB!', 2.2); }
    }, done: go };
    return { dur: 8.2, update(t) {                         // the Warden: he drops in, roars in close-up, pounds, and the arena opens
      const Wy = L.boss.y;
      if (t < 1.0) G.camOverride = { x: 14, y: Wy + 1.5, z: 0.55 };
      else if (t < 3.2) G.camOverride = { x: 14.4, y: Wy + 3.6, z: 0.34 };
      else if (t < 4.8) G.camOverride = { x: 14, y: Wy + 2.4, z: 0.5 };
      else G.camOverride = { x: 14, y: 10.6, z: 1 };
      G.letterbox = Math.min(1, t * 2, (8.2 - t) * 2);
      G.wardenOff.y = t < 0.85 ? Math.max(0, 16 * (1 - t / 0.85) ** 2) : 0;
      if (this.f0 === undefined && t > 0.85) { this.f0 = 1; sfx('slam', 0.9); G.shake = 1.1; fx.emit('dust', L.boss.x, L.boss.y, 0, 40); fx.emit('smash', L.boss.x, L.boss.y + 0.3, 0.4, 30); }
      G.wardenMode = t < 0.85 ? 'idle' : t < 1.2 ? 'hurt' : t < 3.2 ? 'roar' : t < 4.8 ? 'pound' : 'idle';
      if (this.f1 === undefined && t > 1.25) { this.f1 = 1; sfx('roar', 0.9); G.shake = 0.6; }
      if (this.f4 === undefined && t > 3.2) { this.f4 = 1; sfx('pound', 0.7); }
      if (this.f2 === undefined && t > 5.0) { this.f2 = 1; say('JAX! THE COUPLINGS!', 2.4); }
      G.caption = t < 3.2 ? 'THE WARDEN' : t < 4.8 ? 'MASTER OF THE FORTRESS' : 'STEP ON THE FOUR GLOWING COUPLINGS TO BRING HIM DOWN';
      if (this.f3 === undefined && t > 6.0) { this.f3 = 1; card(); }
    }, done: () => { G.wardenOff.y = 0; go(); } };
  }
  function clearCut(id) {
    const s = G.sim, L = s.L;
    if (id === 'foundry') return { dur: 4.6, skip: true, update(t, dt) {
      G.camOverride = { x: 11, y: 21, z: 0.9 }; G.letterbox = Math.min(1, t * 2);
      G.lillyMode = t < 1.4 ? 'cheer' : 'held';
      if (t > 1.2 && t < 1.6) { G.wardenMode = 'roar'; if (!this.f0) { this.f0 = 1; sfx('roar', 0.7); } }
      if (t > 1.6) { G.wardenMode = 'grab'; const u = ease((t - 1.6) / 0.6); G.wardenOff.x = lerp(0, L.lilly.x - L.warden.x - 1.2, u); G.wardenOff.y = lerp(0, 4.0, u) + Math.sin(u * Math.PI) * 2; }
      if (t > 2.3) { G.wardenOff.y += dt * 14; G.lillyPos.x = warden.root.position.x + 1.2; G.lillyPos.y = warden.root.position.y + 2.6; if (!this.f1) { this.f1 = 1; say('JAAAX!', 1.6); sfx('jumpBig', 0.6); } }
      G.caption = t < 2.3 ? 'NOT SO FAST...' : 'THE WARDEN LEAPS FOR THE MACHINE HALL!';
    }, done: () => tallyThenNext() };
    if (id === 'machine') return { dur: 2.6, update(t) { G.letterbox = Math.min(1, t * 2); G.caption = 'THE LIFT RISES TOWARD THE SUMMIT SHAFT'; G.heroOverride = { anim: 'win' }; }, done: () => tallyThenNext() };
    if (id === 'ascent') return { dur: 4.2, update(t, dt) {
      G.camOverride = { x: 12, y: 70, z: 0.85 }; G.letterbox = Math.min(1, t * 2);
      G.wardenMode = t < 1.4 ? 'roar' : 'grab'; if (!this.f0) { this.f0 = 1; sfx('roar', 0.7); G.shake = 0.5; }
      if (t > 1.6) { G.wardenOff.y += dt * 12; cage.position.y += dt * 12; G.lillyPos.y += dt * 12; if (!this.f1) { this.f1 = 1; say('HE\'S TAKING ME TO THE TOP!', 2); sfx('jumpBig', 0.6); } }
      G.caption = 'THE WARDEN DRAGS LILLY TO HIS LAIR';
    }, done: () => tallyThenNext() };
    return null;
  }
  function tallyThenNext() {
    stageCleared(); G.mode = 'tally';
  }
  function bossDefeatCut() {
    const L = G.sim.L, h = G.sim.hero;
    return { dur: 9.5, skip: false, update(t, dt) {
      G.letterbox = Math.min(1, t * 2);
      G.camOverride = t < 5 ? { x: 14, y: 9, z: 1 } : { x: lerp(14, h.x + 0.4, ease((t - 5) / 1.6)), y: lerp(9, h.y + 1.3, ease((t - 5) / 1.6)), z: lerp(1, t > 7 ? 0.32 : 0.6, ease((t - 5) / 2.6)) };
      const u = Math.min(1, t / 2.2);
      G.wardenMode = 'defeat'; G.wardenU = u; G.wardenOff.y = -u * u * 13.6;
      if (!this.f0) { this.f0 = 1; sfx('roar', 0.8); G.shake = 1.0; }
      if (t > 2.2 && !this.f1) { this.f1 = 1; sfx('crash', 0.9); G.shake = 1.4; fx.emit('dust', L.boss.x, 1, 0, 60); fx.emit('smash', L.boss.x, 2, 0, 60); }
      if (t > 3.0 && t < 4.6 && Math.random() < 0.3) fx.emit('electric', L.boss.x, 2.2, 0.5, 2, { w: 3, h: 2 });
      // Lilly kicks the cage open and comes down to Jax
      if (t > 3.6) {
        G.lillyMode = t < 5 ? 'free' : t < 7.2 ? 'run' : 'hug';
        if (!this.f2) { this.f2 = 1; say('YOU DID IT!', 2.2); }
        const k3 = ease((t - 5) / 2.2);
        if (t > 5) { G.lillyPos.x = lerp(L.lilly.x, h.x + 0.85, k3); G.lillyPos.y = lerp(L.lilly.y, h.y, Math.min(1, k3 * 1.4)) + Math.sin(k3 * Math.PI) * 2.2; G.lillyPos.z = 0; cage.position.y += dt * 0; }
      }
      G.heroOverride = { anim: t > 7.2 ? 'win' : 'idle', face: 1 };
      if (t > 7.4 && !this.f3) { this.f3 = 1; sfx('rescue', 0.8); G.banner = { text: 'LILLY RESCUED!', sub: 'ENTER. SURVIVE. CONQUER.', t: 0, dur: 2.4, big: true, color: '#ffd23a' }; }
      if (t > 7.4) for (let i = 0; i < 2; i++) if (Math.random() < 0.15) fx.emit('firework', h.x + (Math.random() - 0.5) * 16, h.y + 5 + Math.random() * 6, -1, 40, { color: [0xffd23a, 0xff3a24, 0x21d4c4, 0xffffff][Math.floor(Math.random() * 4)] });
      G.caption = t < 3.6 ? 'THE WARDEN FALLS!' : 'LILLY IS FREE';
    }, done: () => { stageCleared(); G.tally.title = 'THE WARDEN IS DOWN'; G.mode = 'tally'; G.final = true; } };
  }

  // ------------------------------------------------------------------ events -> sound, particles, shake, words
  function onEvents(s) {
    for (const e of s.events) {
      switch (e.type) {
        case 'jump': sfx('jump', 0.32); break;
        case 'land': sfx('land', 0.22); fx.emit('land', e.x, e.y, 0, e.hard ? 8 : 4); break;
        case 'gear': sfx('gear', 0.32); fx.emit('pickup', e.x, e.y, 0.2, 10); break;
        case 'keep': sfx('keep', 0.55); fx.emit('pickup', e.x, e.y, 0.2, 18, { color: 0x21d4c4 }); G.banner = { text: "LILLY'S KEEPSAKE", sub: '+800', t: 0, dur: 1.6, color: '#21d4c4' }; say(['MY WRENCH!', 'MY GOGGLES!', 'MY LOCKET!'][e.id % 3], 1.6); break;
        case 'gauntlet': sfx('powerup', 0.6); G.banner = { text: 'OVERDRIVE!', sub: 'SMASH DRUMS AND VOLTS · NO LADDERS', t: 0, dur: 1.8, color: '#ffb23a' }; music_duck(); break;
        case 'life': sfx('life', 0.6); break;
        case 'drumJump': sfx(e.n > 1 ? 'combo' : 'score', 0.4); break;
        case 'smash': sfx('smash', 0.5); fx.emit('smash', e.x, e.y, 0.2, 24); G.shake = Math.max(G.shake, 0.25); G.hitstop = 0.05; break;
        case 'throw': sfx('throw', 0.4); break;
        case 'drumLand': if (e.big) { sfx('drumland', 0.22); fx.emit('spark', e.x, e.y, 0.3, 6); } break;
        case 'pound': sfx('pound', 0.45); break;
        case 'roar': sfx('roar', 0.7); G.shake = 0.5; break;
        case 'vent': sfx('steam', 0.25); break;
        case 'crush': sfx('crush', 0.35); fx.emit('dust', e.x, e.y + 0.1, 0, 8); G.shake = Math.max(G.shake, 0.12); break;
        case 'crushWarn': sfx('clank', 0.18); break;
        case 'laser': sfx('laser', 0.18); break;
        case 'collapse': sfx('crumble', 0.35); fx.emit('dust', e.x, e.y, 0, 10); break;
        case 'shake': sfx('creak', 0.25); break;
        case 'checkpoint': sfx('checkpoint', 0.5); G.banner = { text: 'CHECKPOINT', sub: 'BEACON LIT', t: 0, dur: 1.5, color: '#ffd23a' }; fx.emit('pickup', e.x, e.y + 2, 0, 16, { color: 0xffd23a }); if (Math.random() < 0.6) say('KEEP GOING!', 1.6); break;
        case 'die': sfx('die', 0.6); G.shake = 0.6; G.hitstop = 0.12; fx.emit('smash', e.x, e.y + 0.8, 0.2, 20); setTimeout0(() => say(['GET UP, JAX!', 'JAX!', 'TRY AGAIN!'][Math.floor(Math.random() * 3)], 1.6)); break;
        case 'respawn': G.banner = { text: s.lives === 1 ? 'LAST LIFE' : `${s.lives} LIVES`, t: 0, dur: 1.2, color: s.lives === 1 ? '#ff3a24' : '#ffffff' }; break;
        case 'crucible': fx.emit('fire', e.x, e.y + 1.4, 0, 12); break;
        case 'bugSpawn': sfx('volt', 0.4); fx.emit('electric', e.x, e.y + 0.4, 0.2, 14, { color: 0x7ad8ff }); break;
        case 'hopperWarn': sfx('alarm', 0.18); break;
        case 'slag': fx.emit('fire', e.x, e.y, 0, 6); break;
        case 'furnace': fx.emit('fire', e.x, e.y, 0, 10); break;
        case 'anger': G.banner = { text: 'THE WARDEN IS ANGRY', sub: 'THE BONUS HAS RUN OUT', t: 0, dur: 2, color: '#ff3a24' }; sfx('roar', 0.6); break;
        case 'sabotage': sfx('jam', 0.6); say("I'LL JAM THE PRESSES!", 2.4); G.lillyMode = 'sabotage'; setTimeout0(() => { G.lillyMode = 'cheer'; }, 2.5); break;
        case 'secret': sfx('secret', 0.6); G.banner = { text: 'SECRET FOUND', t: 0, dur: 1.6, color: '#5aff8a' }; break;
        case 'coupling': sfx('overload', 0.7); fx.emit('electric', e.x, e.y + 0.5, 0.2, 40, { w: 1.6, h: 1.4 }); fx.emit('smash', e.x, e.y + 0.4, 0.2, 20); G.shake = 0.8;
          G.banner = { text: `COUPLING ${e.n} / 4`, sub: e.n === 3 ? 'ONE MORE!' : 'OVERLOADED', t: 0, dur: 1.8, color: '#ff3a24' }; break;
        case 'tell': if (e.attack === 'slam' || e.attack === 'beam') sfx('charge', 0.4); break;
        case 'slam': sfx('slam', 0.7); G.shake = 0.7; fx.emit('dust', s.L.boss.x, s.L.boss.y, 0, 20); break;
        case 'beam': sfx('beam', 0.55); break;
        case 'lillyGift': sfx('powerup', 0.5); say("CATCH! IT'S AN OVERDRIVE!", 2.4); fx.emit('pickup', e.x, e.y, 0.2, 20, { color: 0xff7a1a }); break;
        case 'gauntletEnd': break;
        case 'gameover': break;
      }
    }
    for (const p of s.popups) if (!p.shown) { p.shown = true; G.popups.push({ text: p.text, x: p.x, y: p.y, t: 0 }); }
  }
  const timers = [];
  function setTimeout0(fn, d = 0.9) { timers.push({ t: d, fn }); }
  function music_duck() { /* the power-up sting plays over the music */ }

  // ------------------------------------------------------------------ input
  const keys = p0.input.keys, prev = new Set();
  let padPrev = [], touchJump = 0, menuClick = null;
  const pressed = c => keys.has(c) && !prev.has(c);
  const any = (...c) => c.some(pressed);
  const held = (...c) => c.some(x => keys.has(x));
  p0.on('pointerdown', e => {
    if (e.touch) G.touch = true;
    const w = Math.max(1, p0.width), h = Math.max(1, p0.height);
    const id = hud.hit((e.x ?? p0.input.pointer.x) / w, (e.y ?? p0.input.pointer.y) / h);
    if (G.mode === 'play' && id === 'jump') { touchJump = 2; G.jumpHeld = true; return; }
    menuClick = id || 'any';
  });
  p0.on('pointerup', () => { G.jumpHeld = false; });
  p0.on('table', top => { G.table = top || []; G.force = true; });
  p0.on('reward', r => { if (r.kind === 'score') G.rewardText = r.ok ? `WEEKLY BEST ${fmt(r.best)} · PLACE ${r.place || '—'}` : (r.reason ? String(r.reason).toUpperCase() : 'SCORE KEPT FOR THIS VISIT'); G.force = true; });
  p0.on('reconnect', () => { p0.bodies.visible = false; for (const [, g] of ghosts) root.remove(g.root); ghosts.clear(); });
  p0.on('message', (d, from) => { if (d && d.k === 'g') { let g = ghosts.get(from); if (!g) { g = makeGhost(); ghosts.set(from, g); } Object.assign(g, { st: d.st, x: d.x, y: d.y, f: d.f, a: d.a, seen: G.t }); } });
  p0.on('leave', p => { const g = ghosts.get(p.id); if (g) { root.remove(g.root); ghosts.delete(p.id); } });
  function makeGhost() {
    const gm = (c, o = {}) => new THREE.MeshBasicMaterial({ color: 0x7ad8ff, transparent: true, opacity: 0.16, depthWrite: false });
    const h = buildHero(gm); root.add(h.root); return { root: h.root, h, st: '', x: 0, y: 0, f: 1, a: 'idle', seen: 0 };
  }
  function playInput() {
    const pad = p0.input.gamepad, ax = pad ? pad.axes[0] : 0, ay = pad ? pad.axes[1] : 0;
    const inp = {
      left: held('KeyA', 'ArrowLeft') || ax < -0.4, right: held('KeyD', 'ArrowRight') || ax > 0.4,
      up: held('KeyW', 'ArrowUp') || ay < -0.5, down: held('KeyS', 'ArrowDown') || ay > 0.5,
      jump: held('Space') || G.jumpHeld || touchJump > 0, jumpPressed: pressed('Space') || touchJump === 2,
    };
    if (touchJump === 2) touchJump = 1;
    return inp;
  }
  function padPressed(i) { const p = p0.input.gamepad; const v = p ? p.buttons[i] > 0.5 : false; const was = padPrev[i]; return v && !was; }

  // ------------------------------------------------------------------ menus
  function menuNav(items) {
    if (any('KeyW', 'ArrowUp')) { G.sel = (G.sel + items.length - 1) % items.length; sfx('move', 0.3); G.force = true; }
    if (any('KeyS', 'ArrowDown')) { G.sel = (G.sel + 1) % items.length; sfx('move', 0.3); G.force = true; }
  }
  function confirm() { return any('Space', 'KeyE') || padPressed(0); }
  function back() { return any('Backspace', 'KeyQ') || padPressed(1); }
  function handleMenus() {
    const click = menuClick; menuClick = null;
    if (G.screen === 'title') {
      if (click || keys.size && [...keys].some(c => !prev.has(c)) || padPressed(0) || padPressed(9)) { sfx('start', 0.6); music('title'); toMenu(); }
      return;
    }
    if (G.screen === 'menu') {
      menuNav(G.items);
      const it = G.items[G.sel];
      if (it.id === 'diff' && (any('KeyA', 'ArrowLeft') || any('KeyD', 'ArrowRight'))) {
        const order = ['rookie', 'normal', 'rampage'], d = any('KeyA', 'ArrowLeft') ? -1 : 1;
        G.difficulty = order[(order.indexOf(G.difficulty) + d + 3) % 3]; G.items = mainItems(); sfx('move', 0.3); G.force = true;
      }
      let choose = confirm() ? it.id : null;
      if (click && click !== 'any') { const i = G.items.findIndex(x => x.id === click); if (i >= 0) { G.sel = i; choose = click; } if (click === 'back') { toTitle(); return; } }
      if (back()) { toTitle(); return; }
      if (!choose) return;
      sfx('select', 0.5);
      if (choose === 'start') startRun(0, true);
      else if (choose === 'select') { G.screen = 'select'; G.sel = 0; }
      else if (choose === 'diff') { const order = ['rookie', 'normal', 'rampage']; G.difficulty = order[(order.indexOf(G.difficulty) + 1) % 3]; G.items = mainItems(); }
      else if (choose === 'howto') G.screen = 'howto';
      G.force = true; return;
    }
    if (G.screen === 'select') {
      if (any('KeyA', 'ArrowLeft', 'KeyW', 'ArrowUp')) { G.sel = (G.sel + 3) % 4; sfx('move', 0.3); }
      if (any('KeyD', 'ArrowRight', 'KeyS', 'ArrowDown')) { G.sel = (G.sel + 1) % 4; sfx('move', 0.3); }
      if (click && click.startsWith('stage')) { G.sel = +click.slice(5); sfx('select', 0.5); startRun(G.sel, false); return; }
      if (back() || click === 'back') { toMenu(); G.sel = 1; return; }
      if (confirm()) { sfx('select', 0.5); startRun(G.sel, false); }
      G.force = true; return;
    }
    if (G.screen === 'howto') { if (back() || click === 'back' || confirm()) { toMenu(); G.sel = 3; } return; }
    if (G.screen === 'pause') {
      menuNav(G.items); let choose = confirm() ? G.items[G.sel].id : null;
      if (click && click !== 'any') choose = click;
      if (any('KeyP', 'Escape') || padPressed(9)) choose = 'resume';
      if (any('KeyR')) choose = 'restart';
      if (!choose) return;
      sfx('select', 0.4);
      if (choose === 'resume') { G.screen = 'play'; G.mode = 'play'; G.resumeT = G.t; }
      else if (choose === 'restart') { G.lives = Math.max(G.lives, 1); transition(() => beginStage()); G.screen = 'play'; }
      else if (choose === 'quit') transition(() => { toTitle(); toMenu(); });
      G.force = true; return;
    }
    if (G.screen === 'gameover') {
      menuNav(G.items); let choose = confirm() ? G.items[G.sel].id : null;
      if (click && click !== 'any') choose = click;
      if (any('KeyR')) choose = 'retry';
      if (!choose) return;
      sfx('select', 0.4);
      if (choose === 'retry') { G.score = 0; G.sent = false; G.lives = DIFFICULTY[G.difficulty].lives; transition(() => beginStage()); }   // an arcade continue: the score starts again
      else if (choose === 'results') finishRun(false);
      else transition(() => { toTitle(); toMenu(); });
      G.force = true; return;
    }
    if (G.screen === 'results') {
      if (any('KeyA', 'ArrowLeft')) G.sel = 0; if (any('KeyD', 'ArrowRight')) G.sel = 1;
      let choose = confirm() ? (G.sel ? 'menu' : 'again') : null;
      if (click && click !== 'any') choose = click;
      if (any('KeyR')) choose = 'again'; if (any('KeyM')) choose = 'menu';
      if (!choose) return;
      sfx('select', 0.5);
      if (choose === 'again') startRun(0, true); else transition(() => { toTitle(); toMenu(); });
      G.force = true;
    }
  }

  // ------------------------------------------------------------------ camera
  const view = { w: 28, h: 16, ws: 0.5, x: 14, y: 8 };
  function frameCamera(dt) {
    const s = G.sim; if (!s) return;
    const L = s.L, h = s.hero, aspect = cam.aspect;
    let tz = 1, tx, ty;
    const portrait = aspect < 0.8;
    const want = L.camera.view || 12.5, visH = Math.max(want, (portrait ? Math.min(want, 13) : want * 1.6) / aspect);   // phones see at least ~13 m across
    if (G.camOverride) { tx = G.camOverride.x; ty = G.camOverride.y; tz = G.camOverride.z || 1; }
    else {
      const look = L.kind === 'horizontal' ? 3.2 : 1.2;
      tx = h.x + (h.face || 1) * look; ty = h.y + (L.kind === 'horizontal' ? 2.6 : 3.2);
      if (L.camera.fixed) { tx = L.camera.fixed.x; ty = L.camera.fixed.y; }
    }
    const k = Math.min(1, dt * (G.camOverride ? 3 : 4.5));
    G.cam.x += (tx - G.cam.x) * k; G.cam.y += (ty - G.cam.y) * k; G.cam.z += (tz - G.cam.z) * Math.min(1, dt * 2.5);
    const vh = visH * G.cam.z, vw = vh * aspect;
    const C = L.camera;
    let cx = G.cam.x, cy = G.cam.y;
    if (C.maxX - C.minX > vw) cx = Math.max(C.minX + vw / 2, Math.min(C.maxX - vw / 2, cx)); else cx = (C.minX + C.maxX) / 2;
    if (C.maxY - C.minY > vh) cy = Math.max(C.minY + vh / 2, Math.min(C.maxY - vh / 2, cy)); else cy = (C.minY + C.maxY) / 2;
    const ws = 2 * CAMD * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) / vh;
    view.w = vw; view.h = vh; view.ws = ws; view.x = cx; view.y = cy;
    root.scale.setScalar(ws);
    let sx = 0, sy = 0;
    if (G.shake > 0) { const a = Math.min(1, G.shake) * 0.12; sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a; }
    root.position.set(-cx * ws + sx, CAMY - cy * ws + sy, 0);
    fx.setScale(p0.height * renderer.getPixelRatio() * cam.projectionMatrix.elements[5] * 0.5 * ws);
  }
  const v3 = new THREE.Vector3();
  function toScreen(x, y, z = 0) {
    v3.set(x, y, z).multiplyScalar(view.ws).add(root.position).project(cam);
    const { W, H } = hud.size(); return { sx: (v3.x * 0.5 + 0.5) * W, sy: (-v3.y * 0.5 + 0.5) * H };
  }

  // ------------------------------------------------------------------ cast animation each frame
  function animateCast(dt) {
    const s = G.sim; if (!s) return;
    const h = s.hero, L = s.L, o = G.heroOverride;
    let anim = 'idle';
    if (h.state === 'dying') anim = 'die';
    else if (h.ladder !== null) anim = 'climb';
    else if (h.ground !== null) anim = h.landT < 0.1 ? 'land' : Math.abs(h.vx) > 0.6 ? 'run' : 'idle';
    else anim = h.vy > 0 ? 'jump' : 'fall';
    if (o && o.anim) anim = o.anim;
    hero.root.position.set(h.x, h.state === 'dying' ? h.y + Math.max(-3, 1.5 * Math.sin(Math.min(h.st, 1.2) * 2.6)) : h.y, 0);
    if (heroLight) heroLight.position.set(h.x + 0.8, h.y + 2.2, 2.2);
    const cs = Math.max(1.05, Math.min(1.4, (L.camera.view || 12.5) / 12.5 * 1.05));   // wide shots: bigger characters
    hero.root.scale.setScalar(cs); lilly.root.scale.setScalar(cs * 0.95);
    hero.root.rotation.z = h.state === 'dying' ? Math.min(h.st, 0.8) * 2.2 * -h.face : 0;
    hero.update(dt, { anim, t: G.t, runPhase: h.runT * 1.35, climbPhase: h.climbT * 1.1, face: o && o.face ? o.face : h.face, gauntlet: h.gaunt > 0, vx: h.vx, vy: h.vy, inv: h.inv > 0 && h.state === 'play' });
    // the Warden: his mode comes from the cutscene, the stage spawner or the boss
    let wm = G.wardenMode, wu = G.wardenU, anger = s.anger;
    if (G.mode === 'play' || G.attract) {
      if (s.warden) { wm = s.warden.state === 'throw' ? 'throw' : s.warden.state; wu = Math.min(1, s.warden.t / (s.warden.state === 'grab' ? 0.55 : 0.35)); }
      else if (s.boss) {
        const B = s.boss; anger = B.phase / 3;
        wm = B.state === 'hurt' ? 'hurt' : B.state === 'tell' ? (B.attack === 'beam' ? 'beam' : B.attack === 'slam' ? 'tell' : 'grab') : B.state === 'strike' ? (B.attack === 'slam' ? 'slam' : B.attack === 'beam' ? 'beam' : 'throw') : 'idle';
        wu = B.state === 'strike' ? Math.min(1, B.t / 0.4) : Math.min(1, B.t / 0.6);
      } else if (L.id === 'ascent') { wm = (Math.floor(G.t / 3) % 3 === 0) ? 'pound' : 'idle'; }
      else if (L.id === 'machine') { wm = (Math.floor(G.t / 4) % 2 === 0) ? 'pound' : 'idle'; }
    }
    placeCast(false);
    // the drum he lifts before a throw (between his fists, above his head)
    heldDrum.visible = wm === 'grab' && warden.root.visible;
    if (heldDrum.visible) {
      if (warden.handsCenter) { warden.root.updateMatrixWorld(true); warden.handsCenter(heldDrum.position, root); heldDrum.position.z += 0.3; }
      else {
        const wp = warden.root.position, sc = warden.root.scale.x, lift = Math.min(1, wu * 1.3);
        heldDrum.position.set(wp.x + 0.9 * sc * (L.id === 'warden' ? (h.x < wp.x ? -1 : 1) : 1), wp.y + (2.6 + 2.6 * lift) * sc, wp.z + 0.6);
      }
      heldDrum.rotation.z = G.t * 2;
    }
    warden.update(dt, { mode: wm, t: G.t, u: wu, anger, face: L.id === 'warden' ? (h.x < warden.root.position.x ? -1 : 1) : 1 });
    // Lilly
    let lm = G.lillyMode;
    if (G.mode === 'play' && L.id === 'warden' && s.lilly === 'free') lm = 'free';
    if (G.speech && G.speech.t < G.speech.dur && (lm === 'held' || lm === 'cage')) lm = 'shout';
    const lp = G.lillyPos;
    lilly.root.position.set(lp.x, lp.y + (cage.visible && L.id !== 'warden' ? 0.1 : 0) + (L.id === 'warden' && s.lilly !== 'free' && lm !== 'run' && lm !== 'hug' ? 0.08 : 0), (lp.z || 0) + 0.02);
    if (L.id === 'warden' && (lm === 'free')) lilly.root.position.y = L.lilly.y + 1.95;
    lilly.update(dt, { mode: lm, t: G.t, face: lm === 'run' || lm === 'hug' ? -1 : (h.x < lp.x ? -1 : 1) });
  }

  // ------------------------------------------------------------------ the frame
  let acc = 0, slowFrames = 0;
  function frame(dt) {
    dt = Math.min(dt, 0.1); G.t += dt;
    if (dt > 0.07) { slowFrames++; if (slowFrames === 6) renderer.setPixelRatio(Math.max(0.45, renderer.getPixelRatio() * 0.75)); }
    for (const tm of timers) { tm.t -= dt; if (tm.t <= 0) { tm.fn(); tm.done = true; } }
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i].done) timers.splice(i, 1);
    // transitions: wipe in, swap, wipe out
    if (G.trans) {
      const tr = G.trans; tr.t += dt; G.wipe = Math.min(1, tr.t / 0.45);
      if (tr.t >= 0.45 && !tr.done) { tr.done = true; tr.busy = true; Promise.resolve(tr.fn()).then(() => { tr.busy = false; tr.t2 = 0; }); }
      if (tr.done && !tr.busy) { tr.t2 = (tr.t2 || 0) + dt; G.wipe = Math.max(0, 1 - tr.t2 / 0.45); if (tr.t2 >= 0.45) { G.trans = null; G.wipe = 0; } }
    }
    const s = G.sim;
    // menus
    if (['title', 'menu', 'select', 'howto', 'pause', 'gameover', 'results'].includes(G.screen) && !G.trans) handleMenus();
    // simulation
    if (s && !G.trans) {
      if (G.attract && G.bot) {
        acc += dt; while (acc >= DT) { acc -= DT; stepSim(s, botInput(G.bot, s)); onAttractEvents(s); if (s.result || s.t > 70) { G.sim = null; startAttract(); break; } }
      } else if (G.mode === 'play' && G.screen === 'play') {
        if ((any('KeyP') || padPressed(9)) && G.t - (G.resumeT || -1) > 0.2) { G.screen = 'pause'; G.sel = 0; G.items = [{ id: 'resume', label: 'RESUME' }, { id: 'restart', label: 'RESTART STAGE' }, { id: 'quit', label: 'QUIT TO MENU' }]; sfx('pause', 0.4); }
        else if (G.hitstop > 0) G.hitstop -= dt;
        else {
          acc += dt; G.runT += dt;
          while (acc >= DT) {
            acc -= DT;
            const inp = G.bot ? botInput(G.bot, s) : playInput();
            stepSim(s, inp); onEvents(s);
            if (s.result) break;
          }
          if (s.result === 'clear') { const c = clearCut(s.id); if (c) startCut(c); else tallyThenNext(); }
          else if (s.result === 'bossDefeat') { music(null); startCut(bossDefeatCut()); }
          else if (s.result === 'gameover') { G.lives = 0; G.showHud = false; G.screen = 'gameover'; G.sel = 0; music(null); sfx('gameover', 0.6);
            G.items = [{ id: 'retry', label: 'CONTINUE' }, { id: 'results', label: 'SEE RESULTS' }, { id: 'quit', label: 'MAIN MENU' }]; G.score += s.score; }
          // Lilly speaks up now and then
          G.lineT -= dt;
          if (G.lineT <= 0 && s.hero.state === 'play') { const ls = LINES[s.id]; say(ls[Math.floor(Math.random() * ls.length)], 2.2); G.lineT = 11 + Math.random() * 6; }
        }
      } else acc = 0;
    }
    // cutscenes
    if (G.cut) {
      G.cut.t += dt; G.cut.update(G.cut.t, dt);
      if ((G.canSkip && G.cut.skip !== false && G.cut.t > 0.6 && (pressed('Space') || padPressed(0) || menuClick)) || G.cut.t >= G.cut.dur) { menuClick = null; endCut(); }
    } else if (G.mode === 'play' || G.screen !== 'play') G.letterbox = Math.max(0, G.letterbox - dt * 3);
    // stage tally, then the next stage (or the ending)
    if (G.mode === 'tally' && G.tally) {
      const tl = G.tally; tl.t += dt; tl.shown = Math.min(tl.target, tl.shown + tl.target * dt * 0.8);
      if (tl.t > 0.4 && tl.t < 3 && Math.floor(tl.t * 12) !== Math.floor((tl.t - dt) * 12)) sfx('tick', 0.15);
      if (tl.t > 4.2 || (tl.t > 1.2 && (pressed('Space') || padPressed(0) || menuClick))) {
        menuClick = null; G.tally = null;
        if (G.final) { G.final = false; finishRun(true); }
        else if (G.stageIdx < 3 && G.arcade) { G.stageIdx++; transition(() => beginStage()); G.mode = 'wait'; }
        else if (!G.arcade) { transition(() => { toTitle(); toMenu(); G.screen = 'select'; G.sel = G.stageIdx; }); G.mode = 'wait'; }
      }
    }
    // camera, cast, world, particles
    if (G.sim) {
      frameCamera(dt);
      animateCast(dt);
      world && world.update(dt, G.sim, G.t);
      // others in the session: glass runners on the same stage
      sendGhost(dt);
      for (const [, g] of ghosts) {
        const show = g.st === levelId && G.t - g.seen < 2 && !G.attract;
        g.root.visible = show; if (!show) continue;
        g.root.position.x += (g.x - g.root.position.x) * Math.min(1, dt * 10); g.root.position.y += (g.y - g.root.position.y) * Math.min(1, dt * 10); g.root.position.z = -0.6;
        g.h.update(dt, { anim: g.a, t: G.t, runPhase: G.t * 2, climbPhase: G.t * 1.2, face: g.f, gauntlet: false });
      }
    }
    fx.update(dt, view);
    G.shake = Math.max(0, G.shake - dt * 2.2);
    if (G.banner) G.banner.t += dt; if (G.speech) G.speech.t += dt;
    for (const p of G.popups) p.t += dt; G.popups = G.popups.filter(p => p.t < 1);
    // HUD
    const m = G;
    m.showHud = G.mode === 'play' && G.screen === 'play' && !G.attract || (G.screen === 'pause');
    for (const p of G.popups) { const sp = toScreen(p.x, p.y + 0.6); p.sx = sp.sx; p.sy = sp.sy; }
    if (G.speech && G.sim) { const lp = G.lillyPos || { x: 0, y: 0 }; const sp = toScreen(lp.x, lp.y + 2.0, lp.z || 0); G.speech.sx = sp.sx; G.speech.sy = sp.sy; }
    hud.draw(m, G.t);
    if (G.sim) { const h = G.sim.hero; p0.me.position.set(Math.max(-12, Math.min(12, (h.x - 14) * 0.4)), Math.max(1, Math.min(56, h.y * 0.7 + 1)), 0); }
    prev.clear(); for (const c of keys) prev.add(c);
    const pad = p0.input.gamepad; padPrev = pad ? pad.buttons.map(b => b > 0.5) : [];
  }
  function onAttractEvents(s) { for (const e of s.events) { if (e.type === 'land') fx.emit('land', e.x, e.y, 0, 3); if (e.type === 'drumLand' && e.big) fx.emit('spark', e.x, e.y, 0.3, 4); if (e.type === 'gear') fx.emit('pickup', e.x, e.y, 0.2, 8); } }
  let ghostT = 0;
  function sendGhost(dt) {
    ghostT += dt; if (ghostT < 0.125 || G.attract || !G.sim || !p0.room) return; ghostT = 0;
    const h = G.sim.hero, a = h.ladder !== null ? 'climb' : h.ground === null ? (h.vy > 0 ? 'jump' : 'fall') : Math.abs(h.vx) > 0.6 ? 'run' : 'idle';
    try { p0.room.send({ k: 'g', st: levelId, x: +h.x.toFixed(2), y: +h.y.toFixed(2), f: h.face, a }); } catch (e) { /* solo */ }
  }

  // ------------------------------------------------------------------ start
  p0.loading(0.45, 'building the foundry');
  await startAttract();
  music('title');
  if (!opts.noHudText) p0.hud('RAMPAGE: SAVE LILLY — rescue Lilly from the Warden.\nMove A/D or ←→ · climb W/S · jump SPACE · pause P · retry R\nController: stick + A · Phones: stick + JUMP\nClick or press any key for sound.');
  p0.loading(0.8, 'compiling the fortress');
  // warm every material once (stages compile again behind their wipes)
  try { await renderer.compileAsync(scene, cam); } catch (e) { /* ok */ }
  frameCamera(0.016); renderer.render(scene, cam);
  if (opts.test) await opts.test(api());
  p0.loop((dt) => { frame(dt); });
  p0.log('SAVE LILLY ready', JSON.stringify({ light, pr: renderer.getPixelRatio(), version: '1.0' }));
  return api();
  function api() {
    return { G, start: (stage = 0, arcade = true) => { G.screen = 'menu'; startRun(stage, arcade); }, toTitle, sim: () => G.sim };
  }
}

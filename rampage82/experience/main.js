// RAMPAGE: THE CLIMB — All Things Gamed, Lot #82.
// A televised survival climb up the inside of the RAMPAGE tower: race the rising Surge to the crown.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COURSE, STAGES, WALL, MAST, STEP, createRun, step, score, rank, padOffset, laserAngle, sweepOffset,
         crushHeight, fireOn, PENALTY, autopilotStep } from './rules.js';

const C = { armor: 0x14151a, plate: 0x24252c, trim: 0x3a3b44, crimson: 0xff2414, orange: 0xff7a1a, gold: 0xffc23a,
            ink: '#e8ecf4', red: '#ff3a24', amber: '#ffb23a', dim: '#9aa0ad' };

export default async function start(p0) {
  p0.loading(0.05, 'opening the gate');
  p0.controls.mode = 'none'; p0.controls.vertical = false;
  p0.bodies.visible = false;                        // we draw every player as a RAMPAGE contender
  const renderer = p0.renderer, scene = p0.scene, cam = p0.camera;
  scene.background = new THREE.Color(0x07070a);
  scene.fog = new THREE.Fog(0x07070a, 18, 70);
  cam.fov = 64; cam.near = 0.1; cam.far = 140; cam.updateProjectionMatrix();

  // ------------------------------------------------------------------ quality: decide early (software renderer = light)
  let light = false;
  try {
    const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    if (/swiftshader|llvmpipe|software/i.test(name)) light = true;
  } catch (e) { /* keep default */ }
  renderer.setPixelRatio(Math.min(light ? 0.6 : 1, p0.pixelRatio || 1, 1280 / Math.max(1, p0.width)));
  const Mat = (o) => light ? new THREE.MeshBasicMaterial(o) : new THREE.MeshLambertMaterial(o);
  const glowMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: false });
  const add = (o) => (scene.add(o), o);
  if (!light) { const sun = new THREE.DirectionalLight(0xffe4d8, 0.9); sun.position.set(6, 40, 10); scene.add(sun); }

  // ------------------------------------------------------------------ fonts (OFL, shipped in assets/)
  let FONT = 'Impact, sans-serif', FONT2 = 'sans-serif';      // families only; weight goes before the size
  try {
    const a = new FontFace('Anton', `url(${p0.asset('assets/Anton-Regular.ttf')})`);
    const o = new FontFace('Oswald', `url(${p0.asset('assets/Oswald.ttf')})`);
    await Promise.all([a.load(), o.load()]); self.fonts.add(a); self.fonts.add(o);
    FONT = 'Anton'; FONT2 = 'Oswald';
  } catch (e) { p0.log('RAMPAGE: font fallback', String(e)); }
  p0.loading(0.2, 'raising the walls');

  // ------------------------------------------------------------------ tower interior
  const wallTex = (() => {                          // armour panels with a crimson channel, procedural
    const c = new OffscreenCanvas(256, 512), g = c.getContext('2d');
    g.fillStyle = '#121318'; g.fillRect(0, 0, 256, 512);
    for (let y = 0; y < 512; y += 64) for (let x = 0; x < 256; x += 128) {
      g.fillStyle = (x + y) % 192 ? '#1b1c22' : '#17181e'; g.fillRect(x + 4, y + 4, 120, 56);
      g.fillStyle = '#26272f'; g.fillRect(x + 4, y + 4, 120, 3);
    }
    g.fillStyle = '#5a0c08'; g.fillRect(122, 0, 12, 512); g.fillStyle = '#ff2414'; g.fillRect(126, 0, 4, 512);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const wallM = Mat({ map: wallTex });
  wallTex.repeat.set(6, 9);
  for (const [x, z, ry] of [[0, -WALL - .05, 0], [0, WALL + .05, Math.PI], [-WALL - .05, 0, Math.PI / 2], [WALL + .05, 0, -Math.PI / 2]]) {
    const w = add(new THREE.Mesh(new THREE.PlaneGeometry(22.6, 35.5), wallM)); w.position.set(x, 17.75, z); w.rotation.y = ry;
  }
  // the Event Horizon seen from inside (35.5–55.8 m): energy flowing west, toward ZELTAR (Lot #106)
  const ehU = { t: { value: 0 } };
  const ehMat = new THREE.ShaderMaterial({
    uniforms: ehU, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float t; varying vec3 vW;
      float h(vec2 v){ vec3 p = fract(vec3(v.xyx) * .1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
      void main(){
        float u = abs(vW.z) > 11.0 ? vW.x : (vW.x < 0. ? 10.5 - abs(vW.z) * .9 : vW.z);   // west wall wraps toward its centre
        vec2 q = vec2(u + t * 4.0, vW.y - 35.0);
        vec2 cell = floor(q * vec2(2.2, 2.8)); float s = h(cell);
        vec2 l = fract(q * vec2(2.2, 2.8));
        float px = step(.8, s) * step(.13, l.x) * step(.14, l.y);
        float row = floor(q.y * 2.8), ph = fract((u + t * (4. + h(vec2(row, 2.)) * 3.)) / 13.);
        float tr = pow(ph, 12.) * pow(.5 + .5 * cos(q.y * 17.6), 14.);
        vec3 c = mix(vec3(1., .05, .02), vec3(1., .45, .08), s);
        gl_FragColor = vec4(vec3(.02, .006, .006) + c * (px * .7 + tr * 1.6), 1.);
      }` });
  for (const [x, z, ry] of [[0, -WALL, 0], [0, WALL, Math.PI], [-WALL, 0, Math.PI / 2], [WALL, 0, -Math.PI / 2]]) {
    const w = add(new THREE.Mesh(new THREE.PlaneGeometry(22.4, 20.3), ehMat)); w.position.set(x, 45.65, z); w.rotation.y = ry;
  }
  // frame bands between levels + floor + crown ring above the finish
  const trimM = Mat({ color: C.trim }), plateM = Mat({ color: C.plate }), armorM = Mat({ color: C.armor });
  for (const y of [0.05, 12.2, 35.3, 55.9]) for (const [x, z, sx, sz] of [[0, -WALL + .3, 22.4, .6], [0, WALL - .3, 22.4, .6], [-WALL + .3, 0, .6, 22.4], [WALL - .3, 0, .6, 22.4]]) {
    const b = add(new THREE.Mesh(new THREE.BoxGeometry(sx, .5, sz), y === 0.05 ? armorM : trimM)); b.position.set(x, y + .25, z);
  }
  const floor = add(new THREE.Mesh(new THREE.BoxGeometry(22.4, .1, 22.4), armorM)); floor.position.y = 0.05;
  const grid = new THREE.GridHelper(22, 11, 0x5a0c08, 0x2a0605); grid.position.y = 0.11; add(grid);
  // central laser mast with emitter rings
  const mast = add(new THREE.Mesh(new THREE.CylinderGeometry(MAST, MAST * 1.3, COURSE.top + 2, 10, 1), Mat({ color: C.plate })));
  mast.position.y = (COURSE.top + 2) / 2;
  // crown spires around the finish (seen above you at the end)
  const spireM = Mat({ color: C.trim });
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, r = 10.2, h = 2.2 + (i % 3) * .8;
    const sp = add(new THREE.Mesh(new THREE.ConeGeometry(.28, h, 5), spireM)); sp.position.set(Math.cos(a) * r, 55.9 + h / 2, Math.sin(a) * r);
  }
  p0.loading(0.4, 'building the gauntlet');

  // ------------------------------------------------------------------ course: pads (static ones instanced) + rims
  const KIND = { start: C.gold, pad: C.crimson, cp: C.gold, move: C.orange, crumble: 0x9a1a10, finish: 0xfff0c0 };
  const padGeo = new THREE.BoxGeometry(1, 0.45, 1);
  const rimGeo = (() => {
    const t = 0.09, parts = [[0, .5 - t / 2, 1, t], [0, -.5 + t / 2, 1, t], [.5 - t / 2, 0, t, 1], [-.5 + t / 2, 0, t, 1]].map(([x, z, w, d]) => {
      const g = new THREE.BoxGeometry(w, .06, d); g.translate(x, 0, z); return g; });
    return mergeGeometries(parts);
  })();
  const statics = COURSE.pads.filter(p => p.kind !== 'move' && p.kind !== 'crumble');
  const padInst = new THREE.InstancedMesh(padGeo, plateM, statics.length);
  const rimInst = new THREE.InstancedMesh(rimGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), statics.length);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S3 = new THREE.Vector3(), col = new THREE.Color();
  const hzPads = new Set(COURSE.hazards.map(h => h.pad));
  statics.forEach((p, k) => {
    Q.setFromAxisAngle(V.set(0, 1, 0), -p.angle);
    M4.compose(V.set(p.x, p.y - .225, p.z), Q, S3.set(p.size, 1, p.size)); padInst.setMatrixAt(k, M4);
    M4.compose(V.set(p.x, p.y + .01, p.z), Q, S3.set(p.size, 1, p.size)); rimInst.setMatrixAt(k, M4);
    rimInst.setColorAt(k, col.set(hzPads.has(p.i) ? C.orange : KIND[p.kind]));
  });
  add(padInst); add(rimInst);
  const dyn = COURSE.pads.filter(p => p.kind === 'move' || p.kind === 'crumble').map(p => {
    const g = new THREE.Group(); g.rotation.y = -p.angle;
    const body = new THREE.Mesh(padGeo, p.kind === 'crumble' ? Mat({ color: 0x2a1512 }) : plateM); body.scale.set(p.size, 1, p.size); body.position.y = -.225;
    const rim = new THREE.Mesh(rimGeo, glowMat(KIND[p.kind])); rim.scale.set(p.size, 1, p.size); rim.position.y = .01;
    g.add(body, rim); add(g); return { p, g };
  });
  // checkpoint gates + finish arch
  for (const p of COURSE.pads.filter(p => p.kind === 'cp' || p.kind === 'finish')) {
    const g = add(new THREE.Group()); g.position.set(p.x, p.y, p.z); g.rotation.y = -p.angle;
    const m = glowMat(p.kind === 'cp' ? C.gold : 0xfff0c0);
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.14, 2.8, .14), m); post.position.set(0, 1.4, s * p.size / 2 * .9); g.add(post); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(.14, .14, p.size * .9), m); beam.position.y = 2.8; g.add(beam);
  }
  // ------------------------------------------------------------------ hazards
  const beamM = new THREE.MeshBasicMaterial({ color: 0xff3020, fog: false }), beamGlow = glowMat(0xff2010, .25);
  const barM = glowMat(C.orange), pistonM = Mat({ color: C.trim }), fireM = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: .85, fog: false });
  const hz = COURSE.hazards.map(h => {
    const p = COURSE.pads[h.pad], o = { h, p };
    if (h.type === 'laser') {
      o.g = add(new THREE.Group()); o.g.position.y = p.y + .55;
      const len = WALL - MAST - .1, core = new THREE.Mesh(new THREE.BoxGeometry(len, .07, .07), beamM), glow = new THREE.Mesh(new THREE.BoxGeometry(len, .3, .3), beamGlow);
      core.position.x = glow.position.x = MAST + len / 2; o.g.add(core, glow);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(MAST + .08, .07, 6, 16), glowMat(C.crimson)); ring.rotation.x = Math.PI / 2; o.g.add(ring);
    } else if (h.type === 'sweep') {
      o.m = add(new THREE.Mesh(new THREE.BoxGeometry(p.size * 1.02, .5, .22), barM)); o.m.rotation.y = -p.angle + Math.PI / 2;
    } else if (h.type === 'crush') {
      o.m = add(new THREE.Group());
      const head = new THREE.Mesh(new THREE.BoxGeometry(p.size * .9, .6, p.size * .9), pistonM), rod = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 4, 8), pistonM);
      const edge = new THREE.Mesh(rimGeo, glowMat(C.orange)); edge.scale.set(p.size * .9, 1, p.size * .9); edge.position.y = -.31;
      rod.position.y = 2.3; o.m.add(head, rod, edge); o.m.rotation.y = -p.angle;
    } else if (h.type === 'fire') {
      o.nozzle = add(new THREE.Mesh(new THREE.CylinderGeometry(.45, .55, .12, 10), glowMat(0x401008))); o.nozzle.position.set(p.x, p.y + .06, p.z);
      o.flame = add(new THREE.Mesh(new THREE.ConeGeometry(.75, 2.4, 10, 1, true), fireM)); o.flame.position.set(p.x, p.y + 1.25, p.z);
    }
    return o;
  });
  // ------------------------------------------------------------------ the Surge
  const surgeU = { t: { value: 0 } };
  const surge = add(new THREE.Mesh(new THREE.PlaneGeometry(22.4, 22.4, 1, 1), new THREE.ShaderMaterial({
    uniforms: surgeU, fog: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float t; varying vec2 vP;
      float h(vec2 v){ vec3 p = fract(vec3(v.xyx) * .1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.), f.x), f.y); }
      void main(){ vec2 p = vP * .35; float v = n(p + vec2(t * .6, t * .2)) * .6 + n(p * 2.3 - vec2(t * .4, -t * .7)) * .4;
        vec3 c = mix(vec3(.25, .01, .0), vec3(1., .2, .03), smoothstep(.35, .9, v)) + vec3(1., .6, .2) * pow(v, 6.) * 1.5;
        gl_FragColor = vec4(c, 1.); }` })));
  surge.rotation.x = -Math.PI / 2;
  const surgeGlow = add(new THREE.Mesh(new THREE.PlaneGeometry(22.4, 22.4), glowMat(0xff3010, .18))); surgeGlow.rotation.x = -Math.PI / 2;
  p0.loading(0.6, 'arming the contenders');

  // ------------------------------------------------------------------ contenders (you + ghosts of other players)
  function contender(main) {
    const g = new THREE.Group();
    const body = main ? Mat({ color: 0x2b2d36 }) : new THREE.MeshBasicMaterial({ color: 0x8a92a8, transparent: true, opacity: .35, fog: false });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.24, .5, 3, 8), body); torso.position.y = .62;
    const helm = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), body); helm.position.y = 1.2;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(.3, .07, .12), glowMat(main ? C.crimson : 0xffb0a0)); visor.position.set(0, 1.22, .17);
    const pads = new THREE.Mesh(new THREE.BoxGeometry(.7, .14, .3), main ? Mat({ color: 0x40424c }) : body); pads.position.y = .98;
    const crest = new THREE.Mesh(new THREE.BoxGeometry(.05, .16, .34), glowMat(main ? C.orange : 0xffc0a0)); crest.position.y = 1.4;
    g.add(torso, helm, visor, pads, crest); return g;
  }
  const me = add(contender(true));
  const demoBody = add(contender(false)); demoBody.children.forEach(c => { if (c.material?.color) c.material = glowMat(0xff6a50, .55); });
  const ghosts = new Map();
  // ------------------------------------------------------------------ HUD (drawn into the scene: score, timer, warnings)
  const canvas = new OffscreenCanvas(1024, 576), ctx = canvas.getContext('2d');
  const hudTex = new THREE.CanvasTexture(canvas); hudTex.generateMipmaps = false; hudTex.minFilter = THREE.LinearFilter; hudTex.colorSpace = THREE.SRGBColorSpace;
  const hud = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, depthTest: false, depthWrite: false, fog: false }));
  hud.renderOrder = 1000; scene.add(cam); cam.add(hud);
  const portrait = () => cam.aspect < .75;
  function layout() {
    canvas.width = portrait() ? 768 : 1024; canvas.height = Math.round(canvas.width / cam.aspect);
    const d = 1, hh = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * d; hud.position.set(0, 0, -d); hud.scale.set(hh * cam.aspect, hh, 1);
  }
  layout(); p0.on('resize', () => { layout(); dirty = true; });

  // ------------------------------------------------------------------ game state
  let run = createRun(), best = null, acc = 0, table = p0.table || [], rewardText = '', pending = null, sent = false;
  let jumpQ = false, lastSpace = false, lastR = false, lastI = false, dirty = true, hudT = 0, gameAge = 0, slow = 0;
  let banner = { text: 'ENTER. SURVIVE. CONQUER.', sub: 'MOVE TO START', t: 4 }, lastStage = 0, warned = false;
  let camA = Math.atan2(COURSE.pads[0].z, COURSE.pads[0].x), camY = 4, attract = true;
  // attract mode: an AI contender demonstrates the climb (same rules, same autopilot the tests prove)
  let demo = createRun(), demoMem = { careful: true }, demoAcc = 0, demoRest = 0;
  step(demo, { mx: 0, mz: 0, jump: true });
  const sfx = (n, v = .3) => { try { p0.sound.play(`assets/${n}.wav`, { volume: v }); } catch (e) {} };
  function reset() {
    run = createRun(); pending = null; sent = false; rewardText = ''; jumpQ = false; warned = false; lastStage = 0;
    banner = { text: 'STAGE 1 · THE GATE', sub: 'RACE THE SURGE TO THE CROWN', t: 3 }; dirty = true;
  }
  p0.on('keydown', e => { if ((e.code || e) === 'Space') jumpQ = true; });
  p0.on('pointerdown', e => {
    const x = (e.x ?? p0.input.pointer.x) / Math.max(1, p0.width), y = (e.y ?? p0.input.pointer.y) / Math.max(1, p0.height);
    if (y > .78 && x > .8) reset(); else if (y > .72 && x > .55) jumpQ = true;
  });
  p0.on('table', top => { table = top; dirty = true; });
  p0.on('reward', r => { if (r.kind === 'score') { rewardText = r.ok ? `WEEKLY BEST ${r.best} · PLACE ${r.place || '—'}` : (r.reason || 'Result kept for this visit'); dirty = true; } });
  p0.on('reconnect', () => { p0.bodies.visible = false; table = p0.table || []; banner = { text: 'RECONNECTED', sub: 'YOUR RUN CONTINUES', t: 2 }; });
  p0.hud('RAMPAGE: THE CLIMB — race the rising Surge up the tower to the crown.\nA/D or ←/→ run around the spiral · W/S toward/away from the wall · Space jumps · R retries · I invites\nPhones: stick moves, tap JUMP / RETRY. Gold gates vent the Surge. Jump the lasers and sweepers; dodge crushers and fire. Click or press a key for sound.');

  // ------------------------------------------------------------------ HUD drawing
  function txt(t, x, y, size, color = C.ink, align = 'left', f = FONT2) {
    ctx.font = `${f === FONT ? 400 : 600} ${Math.round(size)}px ${f}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(t, x, y);
  }
  function panel(x, y, w, h, a = .82) { ctx.fillStyle = `rgba(6,6,9,${a})`; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#ff2414'; ctx.fillRect(x, y, 4, h); }
  function drawHud() {
    const W = canvas.width, H = canvas.height, P = portrait(), k = P ? W / 700 : W / 1024;
    ctx.clearRect(0, 0, W, H);
    const tTot = run.time + PENALTY * run.hits;
    // broadcast bar
    panel(16 * k, 14 * k, 470 * k, 74 * k);
    txt('RAMPAGE', 34 * k, 62 * k, 40 * k, '#ffffff', 'left', FONT);
    const live = Math.floor(p0.time * 1) % 2 === 0;           // 1 Hz blink (well under the 3-flashes-per-second limit)
    ctx.fillStyle = live ? '#ff2414' : '#5a0c08'; ctx.beginPath(); ctx.arc(232 * k, 50 * k, 8 * k, 0, 7); ctx.fill();
    txt('LIVE', 248 * k, 60 * k, 24 * k, '#ffffff');
    txt(STAGES[run.stage].name, 316 * k, 60 * k, 20 * k, C.amber);
    panel(W - 236 * k, 14 * k, 220 * k, 74 * k);
    txt(tTot.toFixed(1) + 's', W - 30 * k, 64 * k, 40 * k, C.amber, 'right', FONT);
    // height meter (right edge): you, the Surge, gates, crown
    const mx = W - 54 * k, top = 120 * k, bot = H - (P ? 300 : 190) * k, span = bot - top, yOf = y => bot - Math.max(0, Math.min(1, y / COURSE.top)) * span;
    ctx.fillStyle = 'rgba(6,6,9,.7)'; ctx.fillRect(mx - 14 * k, top - 10 * k, 28 * k, span + 20 * k);
    ctx.fillStyle = 'rgba(255,36,20,.55)'; const sy = yOf(run.surge); ctx.fillRect(mx - 10 * k, sy, 20 * k, bot - sy);
    for (const p of COURSE.pads) if (p.kind === 'cp') { ctx.fillStyle = C.amber; ctx.fillRect(mx - 14 * k, yOf(p.y) - 2, 28 * k, 4); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(mx - 16 * k, yOf(run.y) - 4 * k, 32 * k, 8 * k);
    txt(`${run.y.toFixed(0)}m`, mx - 22 * k, yOf(run.y) + 7 * k, 20 * k, '#ffffff', 'right');
    // surge warning (danger first)
    const gap = run.y - run.surge;
    if (run.active && !run.over && !run.finished && gap < 5) {
      const msg = gap < 2 ? 'THE SURGE IS ON YOU' : `SURGE ${gap.toFixed(1)} m BELOW`;
      panel(W / 2 - 230 * k, H - (P ? 420 : 150) * k, 460 * k, 56 * k, .9); txt(msg, W / 2, H - (P ? 382 : 112) * k, 28 * k, gap < 2 ? '#ff4a30' : C.amber, 'center', FONT);
    }
    // announcer banner
    if (banner.t > 0 && !run.over && !run.finished) {
      panel(W / 2 - 300 * k, (P ? 150 : 120) * k, 600 * k, 96 * k, .85);
      txt(banner.text, W / 2, (P ? 200 : 170) * k, 38 * k, '#ffffff', 'center', FONT); txt(banner.sub, W / 2, (P ? 232 : 202) * k, 20 * k, C.amber, 'center');
    }
    // title / results
    if (!run.active || run.over || run.finished) {
      const bx = W / 2 - 330 * k, by = (P ? 250 : 100) * k;
      if (!run.active) {             // title over the live demo: compact, so the climb behind it stays visible
        const ty = (P ? 110 : 98) * k;
        panel(bx, ty, 660 * k, 112 * k, .7);
        txt('RAMPAGE', bx + 24 * k, ty + 66 * k, 60 * k, '#ffffff', 'left', FONT);
        txt('THE CLIMB', bx + 24 * k, ty + 98 * k, 22 * k, C.amber, 'left');
        txt('RACE THE RISING SURGE TO THE CROWN', bx + 636 * k, ty + 42 * k, 20 * k, C.ink, 'right');
        txt(P ? 'STICK MOVES · TAP JUMP' : 'A/D RUN · W/S WALL · SPACE JUMPS', bx + 636 * k, ty + 70 * k, 20 * k, C.dim, 'right');
        txt(`ENTER. SURVIVE. CONQUER.${attract ? `  ·  DEMO ${demo.maxY.toFixed(0)} m` : ''}`, bx + 636 * k, ty + 98 * k, 20 * k, '#ff4a30', 'right', FONT);
        const py = H - (P ? 420 : 236) * k; panel(W / 2 - 200 * k, py, 400 * k, 48 * k, .75);
        txt(P ? 'MOVE THE STICK TO ENTER' : 'MOVE OR PRESS SPACE TO ENTER', W / 2, py + 33 * k, 22 * k, '#ffffff', 'center', FONT);
      } else {
      panel(bx, by, 660 * k, 300 * k, .9);
        const r = rank(run);
        txt(run.finished ? 'CONQUERED' : 'CAUGHT BY THE SURGE', W / 2, by + 74 * k, (run.finished ? 66 : 48) * k, run.finished ? '#ffffff' : '#ff4a30', 'center', FONT);
        txt(`${r} · ${score(run).toLocaleString('en-US')} POINTS`, W / 2, by + 124 * k, 30 * k, C.amber, 'center');
        txt(run.finished ? `${tTot.toFixed(2)} s · ${run.hits} HIT${run.hits === 1 ? '' : 'S'} (+${PENALTY * run.hits}s)` : `REACHED ${run.maxY.toFixed(1)} m OF ${COURSE.top.toFixed(0)}`, W / 2, by + 166 * k, 24 * k, C.ink, 'center');
        txt(`BEST THIS VISIT: ${best === null ? '—' : best.toLocaleString('en-US')}`, W / 2, by + 204 * k, 22 * k, C.dim, 'center');
        txt(rewardText || (P ? 'TAP RETRY TO CLIMB AGAIN' : 'PRESS R TO CLIMB AGAIN'), W / 2, by + 250 * k, 22 * k, '#ff6a50', 'center');
      }
      // weekly leaders
      const ly = run.active ? by + 308 * k : H - (P ? 330 : 112) * k - (24 + 26 * Math.max(1, Math.min(3, table.length))) * k; panel(bx, ly, 660 * k, (24 + 26 * Math.max(1, Math.min(3, table.length))) * k, .82);
      txt('WEEKLY LEADERS', bx + 22 * k, ly + 30 * k, 22 * k, C.amber, 'left', FONT);
      if (!table.length) txt('BE THE FIRST TO CONQUER THE TOWER', bx + 260 * k, ly + 30 * k, 20 * k, C.dim);
      table.slice(0, 3).forEach((r, i) => txt(`${i + 1}. ${String(r.name).slice(0, 18)}  ${Number(r.score).toLocaleString('en-US')}`, bx + 260 * k, ly + (30 + 26 * i) * k, 20 * k));
    }
    // touch buttons (also clickable)
    const by2 = H - (P ? 150 : 92) * k;
    panel(W * .57, by2, W * .21, (P ? 120 : 76) * k, .7); txt('JUMP', W * .675, by2 + (P ? 76 : 52) * k, 34 * k, '#ffffff', 'center', FONT);
    panel(W * .8, by2, W * .18, (P ? 120 : 76) * k, .7); txt('RETRY', W * .89, by2 + (P ? 76 : 52) * k, 30 * k, C.amber, 'center', FONT);
    hudTex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ warm up every material, then go
  p0.loading(0.85, 'compiling the arena');
  await renderer.compileAsync(scene, cam);
  drawHud(); renderer.render(scene, cam);
  p0.log('RAMPAGE: The Climb ready', JSON.stringify({ pads: COURSE.pads.length, hazards: COURSE.hazards.length, light }));

  // ------------------------------------------------------------------ frame loop
  const right = new THREE.Vector3(), fwd = new THREE.Vector3();
  p0.loop((dt, time) => {
    dt = Math.min(dt, 0.1); gameAge += dt; ehU.t.value = time; surgeU.t.value = time;
    if (dt > .065) { slow++; if (slow === 4) renderer.setPixelRatio(Math.max(.5, renderer.getPixelRatio() * .75)); }
    const keys = p0.input.keys;
    const r = keys.has('KeyR'), inv = keys.has('KeyI'), sp = keys.has('Space');
    if (r && !lastR) reset(); if (inv && !lastI) p0.invite({ kind: 'team', note: 'Race me up the RAMPAGE tower!' });
    if (sp && !lastSpace) jumpQ = true; lastR = r; lastI = inv; lastSpace = sp;
    const ix = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const iz = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    if (ix || iz || jumpQ) attract = false;
    if (attract && !run.active) {
      demoAcc += dt;
      while (demoAcc >= STEP) { demoAcc -= STEP; if (!demo.over && !demo.finished) step(demo, autopilotStep(demo, COURSE, demoMem)); }
      if (demo.over || demo.finished) { demoRest += dt; if (demoRest > 2.5) { demo = createRun(); demoMem = { careful: true }; demoRest = 0; step(demo, { mx: 0, mz: 0, jump: true }); } }
    }
    const F = attract && !run.active ? demo : run;            // what the camera and the world follow
    demoBody.visible = F === demo; if (F === demo) { demoBody.position.set(demo.x, demo.y, demo.z); if (Math.hypot(demo.vx, demo.vz) > .3) demoBody.rotation.y = Math.atan2(demo.vx, demo.vz); }
    // camera basis: on the tower's axis looking out at the contender; A/D run around the spiral
    const tA = Math.atan2(F.z, F.x); let dA = ((tA - camA) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; camA += dA * Math.min(1, dt * 6);
    fwd.set(Math.cos(camA), 0, Math.sin(camA)); right.set(-fwd.z, 0, fwd.x);
    const mx = right.x * ix + fwd.x * iz, mz = right.z * ix + fwd.z * iz;
    acc += dt;
    while (acc >= STEP) {
      const ev = step(run, { mx, mz, jump: jumpQ }); jumpQ = false; acc -= STEP;
      if (!ev) continue;
      dirty = true;
      if (ev === 'jump') sfx('jump', .22);
      else if (ev === 'land') sfx('land', .16);
      else if (ev === 'checkpoint') { sfx('checkpoint', .35); banner = { text: 'CHECKPOINT', sub: 'SURGE VENTED', t: 2 }; }
      else if (ev === 'hit') { sfx('hit', .35); banner = { text: 'HIT!', sub: `STAGGERED · +${PENALTY}s`, t: 1.6 }; }
      else if (ev === 'finish' || ev === 'eliminated') {
        sfx(ev === 'finish' ? 'conquer' : 'eliminated', .4);
        const sc = score(run); best = best === null ? sc : Math.max(best, sc); pending = sc;
        p0.log('RAMPAGE run', JSON.stringify({ result: ev, score: sc, time: +run.time.toFixed(2), hits: run.hits, maxY: +run.maxY.toFixed(1) }));
      }
    }
    if (run.stage !== lastStage) { lastStage = run.stage; banner = { text: `STAGE ${run.stage + 1} · ${STAGES[run.stage].name}`, sub: 'THE SURGE RISES FASTER', t: 2.4 }; sfx('stage', .3); }
    const gap = run.y - run.surge;
    if (run.active && gap < 3 && !warned) { warned = true; sfx('warn', .3); } if (gap > 6) warned = false;
    if (pending !== null && !sent && gameAge >= Math.max(10, p0.game?.minSeconds || 10)) { p0.score(pending); sent = true; }
    // world animation (pure functions of the followed run's clock so they match the rules exactly)
    const t = F.simT;
    for (const d of dyn) {
      const [ox, oz] = padOffset(d.p, t), c = F.crumble[d.p.i];
      d.g.visible = !(c && c.down > 0);
      const shake = c && c.fuse > 0 ? Math.sin(time * 70) * .05 : 0;
      d.g.position.set(d.p.x + ox + shake, d.p.y, d.p.z + oz);
    }
    for (const o of hz) {
      const p = o.p;
      if (o.h.type === 'laser') o.g.rotation.y = -laserAngle(o.h, t);
      else if (o.h.type === 'sweep') { const s = sweepOffset(o.h, t); o.m.position.set(p.x - Math.sin(p.angle) * s, p.y + .25, p.z + Math.cos(p.angle) * s); }
      else if (o.h.type === 'crush') o.m.position.set(p.x, p.y + crushHeight(o.h, t) + .3, p.z);
      else if (o.h.type === 'fire') { const on = fireOn(o.h, t); o.flame.visible = on; o.flame.scale.y = on ? .85 + .15 * Math.sin(time * 9) : 1; }
    }
    surge.position.y = F.surge; surgeGlow.position.y = F.surge + .6;
    // contender
    me.position.set(run.x, run.y, run.z);
    if (Math.hypot(run.vx, run.vz) > .3) me.rotation.y = Math.atan2(run.vx, run.vz);
    me.children[0].position.y = .62 + (run.grounded && Math.hypot(run.vx, run.vz) > .5 ? Math.abs(Math.sin(time * 14)) * .05 : 0);
    me.scale.y = run.grounded ? 1 : 1.06;
    p0.me.position.set(run.x, run.y + 1.6, run.z); p0.me.yaw = me.rotation.y;
    // ghosts: other contenders, wherever they are in their own climb
    for (const [id, pl] of p0.players) {
      if (pl.isMe) continue;
      let g = ghosts.get(id); if (!g) { g = add(contender(false)); ghosts.set(id, g); }
      g.position.lerp(V.set(pl.position.x, pl.position.y - 1.6, pl.position.z), Math.min(1, dt * 10)); g.rotation.y = pl.yaw || 0;
    }
    for (const [id, g] of ghosts) if (!p0.players.has(id)) { scene.remove(g); ghosts.delete(id); }
    // camera
    camY += (F.y + 3.1 - camY) * Math.min(1, dt * 5);
    cam.position.set(-fwd.x * .6, camY, -fwd.z * .6);
    cam.lookAt(F.x + right.x * 1.4, F.y + .9, F.z + right.z * 1.4);
    banner.t -= dt; hudT += dt;
    if (dirty || hudT > .1) { drawHud(); dirty = false; hudT = 0; }
  });
}

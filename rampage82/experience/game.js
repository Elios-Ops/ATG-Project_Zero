// RAMPAGE: THE CLIMB — All Things Gamed, Lot #82. v0.2
// A televised survival climb up the inside of the RAMPAGE tower: race the rising Surge to the crown.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COURSE, STAGES, WALL, MAST, STEP, createRun, step, score, rank, padOffset, laserAngle, sweepOffset,
         crushHeight, fireOn, PENALTY, autopilotStep } from './rules.js';
import { buildGladiator, animateGladiator } from './gladiator.js';
import { loadBitmapFont, drawText } from './hudfont.js';

// The CONQUEROR achievement: once the owner creates the item (POST /api/agent/items, kind "achievement"), put its id
// here and every first finish gives it. Until then the crest is shown in the game only (no account changes from code).
const ITEM_CONQUEROR = null;
const C = { armor: 0x14151a, plate: 0x24252c, trim: 0x3a3b44, crimson: 0xff2414, orange: 0xff7a1a, gold: 0xffc23a,
            ink: '#e8ecf4', amber: '#ffb23a', dim: '#9aa0ad', red: '#ff4a30' };

export async function createGame(p0, opts = {}) {
  p0.loading(0.05, 'opening the gate');
  p0.controls.mode = 'none'; p0.controls.vertical = false;
  p0.bodies.visible = false;
  const renderer = p0.renderer, scene = p0.scene, cam = p0.camera;
  const FOG = new THREE.Color(0x07070a), FOG_HOT = new THREE.Color(0x2a0604);
  scene.background = FOG.clone(); scene.fog = new THREE.Fog(FOG.clone(), 16, 64);
  cam.fov = 64; cam.near = 0.1; cam.far = 140; cam.updateProjectionMatrix();

  // ------------------------------------------------------------------ quality (software renderer -> light version, chosen once)
  let light = false;
  try {
    const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (/swiftshader|llvmpipe|software/i.test(String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)))) light = true;
  } catch (e) { /* default */ }
  renderer.setPixelRatio(Math.min(light ? 0.6 : 1, p0.pixelRatio || 1, 1280 / Math.max(1, p0.width)));
  const Mat = o => light ? new THREE.MeshBasicMaterial(o) : new THREE.MeshLambertMaterial(o);
  const glowMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: false });
  const addMat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const add = o => (scene.add(o), o);
  if (!light) { const key = new THREE.DirectionalLight(0xffe4d8, 0.75); key.position.set(6, 60, 10); scene.add(key); }

  let FD = null, FT = null;                                 // display (Anton) + text (Oswald) bitmap fonts
  try { [FD, FT] = await Promise.all([loadBitmapFont(p0, 'font-anton'), loadBitmapFont(p0, 'font-oswald')]); }
  catch (e) { p0.log('RAMPAGE: bitmap fonts unavailable, using system font', String(e)); }
  p0.loading(0.2, 'raising the walls');

  // ------------------------------------------------------------------ tower interior
  const wallTex = (() => {
    const c = new OffscreenCanvas(256, 512), g = c.getContext('2d');
    g.fillStyle = '#121318'; g.fillRect(0, 0, 256, 512);
    for (let y = 0; y < 512; y += 64) for (let x = 0; x < 256; x += 128) {
      g.fillStyle = (x + y) % 192 ? '#1b1c22' : '#17181e'; g.fillRect(x + 4, y + 4, 120, 56);
      g.fillStyle = '#26272f'; g.fillRect(x + 4, y + 4, 120, 3); g.fillStyle = '#0c0c10'; g.fillRect(x + 4, y + 57, 120, 3);
      g.fillStyle = '#2c2d35'; for (const [rx, ry] of [[10, 10], [114, 10], [10, 50], [114, 50]]) g.fillRect(x + rx, y + ry, 3, 3);
    }
    g.fillStyle = '#5a0c08'; g.fillRect(122, 0, 12, 512); g.fillStyle = '#ff2414'; g.fillRect(126, 0, 4, 512);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(6, 9); return t;
  })();
  const wallM = Mat({ map: wallTex });
  for (const [x, z, ry] of [[0, -WALL - .05, 0], [0, WALL + .05, Math.PI], [-WALL - .05, 0, Math.PI / 2], [WALL + .05, 0, -Math.PI / 2]]) {
    const w = add(new THREE.Mesh(new THREE.PlaneGeometry(22.6, 35.5), wallM)); w.position.set(x, 17.75, z); w.rotation.y = ry;
  }
  // the Event Horizon from inside (35.5–55.8 m): the same westward flow the façade shows, toward ZELTAR
  const ehU = { t: { value: 0 } };
  const ehMat = new THREE.ShaderMaterial({ uniforms: ehU, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float t; varying vec3 vW;
      float h(vec2 v){ vec3 p = fract(vec3(v.xyx) * .1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
      void main(){
        float u = abs(vW.z) > 11.0 ? vW.x : (vW.x < 0. ? 10.5 - abs(vW.z) * .9 : vW.z);
        vec2 q = vec2(u + t * 4.0, vW.y - 35.0), g = q * vec2(2.2, 2.8); float s = h(floor(g)); vec2 l = fract(g);
        float px = step(.8, s) * step(.13, l.x) * step(.14, l.y);
        float ph = fract((u + t * (4. + h(vec2(floor(q.y * 2.8), 2.)) * 3.)) / 13.), p2 = ph * ph, p4 = p2 * p2;
        float c = .5 + .5 * cos(q.y * 17.6), c2 = c * c, c4 = c2 * c2;
        vec3 col = mix(vec3(1., .05, .02), vec3(1., .45, .08), s);
        gl_FragColor = vec4(vec3(.02, .006, .006) + col * (px * .7 + p4 * p4 * p4 * c4 * c4 * c4 * c2 * 1.6), 1.);
      }` });
  for (const [x, z, ry] of [[0, -WALL, 0], [0, WALL, Math.PI], [-WALL, 0, Math.PI / 2], [WALL, 0, -Math.PI / 2]]) {
    const w = add(new THREE.Mesh(new THREE.PlaneGeometry(22.4, 20.3), ehMat)); w.position.set(x, 45.65, z); w.rotation.y = ry;
  }
  const trimM = Mat({ color: C.trim }), plateM = Mat({ color: C.plate }), armorM = Mat({ color: C.armor });
  for (const y of [0.05, 12.2, 35.3, 55.9]) for (const [x, z, sx, sz] of [[0, -WALL + .3, 22.4, .6], [0, WALL - .3, 22.4, .6], [-WALL + .3, 0, .6, 22.4], [WALL - .3, 0, .6, 22.4]]) {
    const b = add(new THREE.Mesh(new THREE.BoxGeometry(sx, .5, sz), y === 0.05 ? armorM : trimM)); b.position.set(x, y + .25, z);
    if (y > 1) { const n = add(new THREE.Mesh(new THREE.BoxGeometry(sx === .6 ? .04 : sx, .05, sz === .6 ? .04 : sz), glowMat(C.crimson))); n.position.set(x * .985, y + .02, z * .985); }
  }
  const floor = add(new THREE.Mesh(new THREE.BoxGeometry(22.4, .1, 22.4), armorM)); floor.position.y = 0.05;
  const grid = new THREE.GridHelper(22, 11, 0x5a0c08, 0x2a0605); grid.position.y = 0.11; add(grid);
  const mast = add(new THREE.Mesh(new THREE.CylinderGeometry(MAST, MAST * 1.3, COURSE.top + 2, 10, 1), plateM)); mast.position.y = (COURSE.top + 2) / 2;
  for (let y = 4; y < COURSE.top; y += 6) { const r = add(new THREE.Mesh(new THREE.TorusGeometry(MAST + .05, .04, 4, 14), glowMat(0x7a1008))); r.rotation.x = Math.PI / 2; r.position.y = y; }
  // crown spires above the finish: they ignite when someone conquers the tower
  const spireM = Mat({ color: C.trim }), spireTipM = glowMat(0x401008);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, r = 10.2, h = 2.2 + (i % 3) * .8;
    const sp = add(new THREE.Mesh(new THREE.ConeGeometry(.28, h, 5), spireM)); sp.position.set(Math.cos(a) * r, 55.9 + h / 2, Math.sin(a) * r);
    const tip = add(new THREE.Mesh(new THREE.ConeGeometry(.12, .7, 5), spireTipM)); tip.position.set(Math.cos(a) * r, 55.9 + h + .2, Math.sin(a) * r);
  }
  // light shafts falling from the crown (additive, cheap)
  const shaftM = addMat(0xff4020, light ? .03 : .045);
  for (let i = 0; i < 5; i++) { const s = add(new THREE.Mesh(new THREE.PlaneGeometry(1.6 + i * .4, 56), shaftM)); s.position.set(Math.cos(i * 1.3) * 6, 28, Math.sin(i * 1.3) * 6); s.rotation.y = i * 1.1; }

  // ------------------------------------------------------------------ east wall inside: the portal you came through + the Contenders' Wall
  function canvasPanel(w, h, px) { const c = new OffscreenCanvas(px, Math.round(px * h / w)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, g: c.getContext('2d'), t }; }
  const portal = canvasPanel(6.4, 6.2, 512);
  (() => { const { c, g } = portal; const W = c.width, H = c.height;
    const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, '#ff5a2a'); gr.addColorStop(.55, '#5a0c08'); gr.addColorStop(1, '#120406');
    g.fillStyle = '#0a0a0d'; g.fillRect(0, 0, W, H); g.fillStyle = gr; g.fillRect(W * .12, H * .22, W * .76, H * .78);
    g.strokeStyle = '#ff2414'; g.lineWidth = 10; g.strokeRect(W * .12, H * .22, W * .76, H * .78);
    drawText(g, FD, 'RAMPAGE', W / 2, H * .15, 72, '#ffffff', 'center'); })();
  portal.t.needsUpdate = true;
  const portalMesh = add(new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.2), new THREE.MeshBasicMaterial({ map: portal.t, fog: false })));
  portalMesh.position.set(WALL - .04, 3.2, 0); portalMesh.rotation.y = -Math.PI / 2;
  const wall = canvasPanel(7.2, 5.4, 768);
  const wallMesh = add(new THREE.Mesh(new THREE.PlaneGeometry(7.2, 5.4), new THREE.MeshBasicMaterial({ map: wall.t, fog: false })));
  wallMesh.position.set(WALL - .04, 3.4, -7.0); wallMesh.rotation.y = -Math.PI / 2;
  let notes = [], canWrite = false, notesAt = -999;
  function drawWall() {
    const { c, g } = wall, W = c.width, H = c.height;
    g.fillStyle = '#0b0b0e'; g.fillRect(0, 0, W, H); g.fillStyle = '#ff2414'; g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6);
    drawText(g, FD, "CONTENDERS' WALL", 24, 64, 52, '#ffffff');
    drawText(g, FT, canWrite ? 'PRESS N OR TAP NOTE TO LEAVE A WORD' : 'SIGN IN TO LEAVE A WORD', W - 24, 60, 22, '#ffb23a', 'right');
    if (!notes.length) drawText(g, FT, 'NO WORDS YET. CONQUER THE TOWER AND BE THE FIRST.', 24, 130, 26, '#9aa0ad');
    notes.slice(0, 7).forEach((n, i) => {
      const y = 126 + i * 62, name = String(n.author?.name || 'contender').slice(0, 16).toUpperCase();
      drawText(g, FT, name, 24, y, 24, '#ff6a50');
      const text = String(n.text || '').replace(/\s+/g, ' ').slice(0, 64);
      drawText(g, FT, text, 24, y + 30, 24, '#e8ecf4', 'left', 500);
    });
    wall.t.needsUpdate = true;
  }
  async function refreshNotes() {
    notesAt = p0.time;
    try { const r = await p0.notes.list({ limit: 12 }); notes = r.notes || []; canWrite = !!r.canWrite; } catch (e) { /* notes optional */ }
    drawWall(); dirty = true;
  }
  async function leaveNote() {
    try {
      const r = await p0.notes.write({ title: 'Leave a word for the next contender', placeholder: 'Your tip, your time, your challenge' });
      if (r.ok) { notes = [r.note, ...notes]; drawWall(); banner = { text: 'WORD LEFT ON THE WALL', sub: 'THANK YOU, CONTENDER', t: 2 }; }
    } catch (e) { /* cancelled */ }
  }
  drawWall();
  p0.loading(0.4, 'building the gauntlet');

  // ------------------------------------------------------------------ course: pads, gates, hazards
  const KIND = { start: C.gold, pad: C.crimson, cp: C.gold, move: C.orange, crumble: 0x9a1a10, finish: 0xfff0c0 };
  const padGeo = new THREE.BoxGeometry(1, 0.45, 1);
  const rimGeo = mergeGeometries([[0, .5 - .045, 1, .09], [0, -.5 + .045, 1, .09], [.5 - .045, 0, .09, 1], [-.5 + .045, 0, .09, 1]].map(([x, z, w, d]) => {
    const g = new THREE.BoxGeometry(w, .06, d); g.translate(x, 0, z); return g; }));
  const statics = COURSE.pads.filter(p => p.kind !== 'move' && p.kind !== 'crumble');
  const padInst = new THREE.InstancedMesh(padGeo, plateM, statics.length);
  const rimInst = new THREE.InstancedMesh(rimGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), statics.length);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S3 = new THREE.Vector3(), col = new THREE.Color();
  const hzPads = new Set(COURSE.hazards.map(h => h.pad)), rimIdx = new Map();
  statics.forEach((p, k) => {
    Q.setFromAxisAngle(V.set(0, 1, 0), -p.angle);
    M4.compose(V.set(p.x, p.y - .225, p.z), Q, S3.set(p.size, 1, p.size)); padInst.setMatrixAt(k, M4);
    M4.compose(V.set(p.x, p.y + .01, p.z), Q, S3.set(p.size, 1, p.size)); rimInst.setMatrixAt(k, M4);
    rimInst.setColorAt(k, col.set(hzPads.has(p.i) ? C.orange : KIND[p.kind])); rimIdx.set(p.i, k);
  });
  add(padInst); add(rimInst);
  const dyn = COURSE.pads.filter(p => p.kind === 'move' || p.kind === 'crumble').map(p => {
    const g = new THREE.Group(); g.rotation.y = -p.angle;
    const body = new THREE.Mesh(padGeo, p.kind === 'crumble' ? Mat({ color: 0x2a1512 }) : plateM); body.scale.set(p.size, 1, p.size); body.position.y = -.225;
    const rimM = glowMat(KIND[p.kind]), rim = new THREE.Mesh(rimGeo, rimM); rim.scale.set(p.size, 1, p.size); rim.position.y = .01;
    g.add(body, rim); add(g); return { p, g, rimM };
  });
  const gates = COURSE.pads.filter(p => p.kind === 'cp' || p.kind === 'finish').map(p => {
    const g = add(new THREE.Group()); g.position.set(p.x, p.y, p.z); g.rotation.y = -p.angle;
    const m = glowMat(p.kind === 'cp' ? 0x7a5010 : 0xfff0c0);
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.14, 2.8, .14), m); post.position.set(0, 1.4, s * p.size / 2 * .9); g.add(post); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(.14, .14, p.size * .9), m); beam.position.y = 2.8; g.add(beam);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(p.size, 3), addMat(p.kind === 'cp' ? 0xffb23a : 0xfff0c0, .0)); halo.position.y = 1.4; halo.rotation.y = Math.PI / 2; g.add(halo);
    return { p, m, halo, lit: 0 };
  });
  const beamM = new THREE.MeshBasicMaterial({ color: 0xff3020, fog: false }), beamGlow = addMat(0xff2010, .35);
  const pistonM = Mat({ color: C.trim }), fireM = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const hz = COURSE.hazards.map(h => {
    const p = COURSE.pads[h.pad], o = { h, p };
    if (h.type === 'laser') {
      o.g = add(new THREE.Group()); o.g.position.y = p.y + .55;
      const len = WALL - MAST - .1, core = new THREE.Mesh(new THREE.BoxGeometry(len, .07, .07), beamM), glow = new THREE.Mesh(new THREE.BoxGeometry(len, .34, .34), beamGlow);
      core.position.x = glow.position.x = MAST + len / 2; o.g.add(core, glow);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(MAST + .1, .09, 6, 16), glowMat(C.crimson)); ring.rotation.x = Math.PI / 2; o.g.add(ring);
    } else if (h.type === 'sweep') {
      o.m = add(new THREE.Group());
      o.m.add(new THREE.Mesh(new THREE.BoxGeometry(p.size * 1.02, .5, .22), glowMat(C.orange)), new THREE.Mesh(new THREE.BoxGeometry(p.size * 1.04, .7, .5), addMat(0xff7a1a, .25)));
      o.m.rotation.y = -p.angle + Math.PI / 2;
    } else if (h.type === 'crush') {
      o.m = add(new THREE.Group());
      const head = new THREE.Mesh(new THREE.BoxGeometry(p.size * .9, .6, p.size * .9), pistonM), rod = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 4, 8), pistonM);
      const edge = new THREE.Mesh(rimGeo, glowMat(C.orange)); edge.scale.set(p.size * .9, 1, p.size * .9); edge.position.y = -.31;
      rod.position.y = 2.3; o.m.add(head, rod, edge); o.m.rotation.y = -p.angle;
      o.warn = add(new THREE.Mesh(new THREE.PlaneGeometry(p.size * .9, p.size * .9), addMat(0xff2010, 0))); o.warn.rotation.x = -Math.PI / 2; o.warn.rotation.z = p.angle; o.warn.position.set(p.x, p.y + .03, p.z);
    } else if (h.type === 'fire') {
      o.nozzleM = glowMat(0x401008); o.nozzle = add(new THREE.Mesh(new THREE.CylinderGeometry(.45, .55, .12, 10), o.nozzleM)); o.nozzle.position.set(p.x, p.y + .06, p.z);
      o.flame = add(new THREE.Mesh(new THREE.ConeGeometry(.75, 2.4, 10, 1, true), fireM)); o.flame.position.set(p.x, p.y + 1.25, p.z);
    }
    return o;
  });
  // ------------------------------------------------------------------ the Surge (+ embers and its light)
  const surgeU = { t: { value: 0 }, heat: { value: 0 } };
  const surge = add(new THREE.Mesh(new THREE.PlaneGeometry(22.4, 22.4), new THREE.ShaderMaterial({ uniforms: surgeU, fog: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float t, heat; varying vec2 vP;
      float h(vec2 v){ vec3 p = fract(vec3(v.xyx) * .1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.), f.x), f.y); }
      void main(){ vec2 p = vP * .35; float v = n(p + vec2(t * .6, t * .2)) * .6 + n(p * 2.3 - vec2(t * .4, -t * .7)) * .4;
        vec3 c = mix(vec3(.25, .01, .0), vec3(1., .2, .03), smoothstep(.35, .9, v)) + vec3(1., .6, .2) * pow(v, 6.) * (1.5 + heat);
        gl_FragColor = vec4(c * (1. + heat * .4), 1.); }` })));
  surge.rotation.x = -Math.PI / 2;
  const surgeGlow = add(new THREE.Mesh(new THREE.PlaneGeometry(22.4, 22.4), addMat(0xff3010, .2))); surgeGlow.rotation.x = -Math.PI / 2;
  const NE = light ? 70 : 240, eGeo = new THREE.BufferGeometry(), ePos = new Float32Array(NE * 3), eSeed = new Float32Array(NE);
  for (let i = 0; i < NE; i++) { const a = Math.random() * 6.283, r = 1 + Math.random() * 9.8; ePos[i * 3] = Math.cos(a) * r; ePos[i * 3 + 1] = Math.random() * 14; ePos[i * 3 + 2] = Math.sin(a) * r; eSeed[i] = Math.random(); }
  eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  const embers = add(new THREE.Points(eGeo, new THREE.PointsMaterial({ color: 0xff6a30, size: .13, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  const surgeLight = light ? null : add(new THREE.PointLight(0xff2a10, 0, 16, 1.6));
  const playerLight = light ? null : add(new THREE.PointLight(0xffd8c0, 1.4, 7, 1.5));
  const gateLight = light ? null : add(new THREE.PointLight(0xffb23a, 1.6, 9, 1.5));
  p0.loading(0.6, 'arming the contenders');

  // ------------------------------------------------------------------ contenders
  const me = add(buildGladiator({ light }));
  const demoBody = add(buildGladiator({ ghost: true, tint: 0xff6a50 }));
  const ghosts = new Map();
  // ------------------------------------------------------------------ HUD (in the scene: what players must see)
  const canvas = new OffscreenCanvas(1024, 576), ctx = canvas.getContext('2d');
  const hudTex = new THREE.CanvasTexture(canvas); hudTex.generateMipmaps = false; hudTex.minFilter = THREE.LinearFilter; hudTex.colorSpace = THREE.SRGBColorSpace;
  const hud = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, depthTest: false, depthWrite: false, fog: false }));
  hud.renderOrder = 1000; scene.add(cam); cam.add(hud);
  const portrait = () => cam.aspect < .75;
  let dirty = true;
  function layout() {
    canvas.width = portrait() ? 768 : 1024; canvas.height = Math.round(canvas.width / cam.aspect);
    const hh = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); hud.position.set(0, 0, -1); hud.scale.set(hh * cam.aspect, hh, 1); dirty = true;
  }
  layout(); p0.on('resize', layout);

  // ------------------------------------------------------------------ state
  let run = createRun(), best = null, acc = 0, table = p0.table || [], rewardText = '', itemText = '', pending = null, sent = false;
  let jumpQ = false, lastSpace = false, lastR = false, lastI = false, lastN = false, hudT = 0, gameAge = 0, slow = 0;
  let banner = { text: 'ENTER. SURVIVE. CONQUER.', sub: 'MOVE TO START', t: 4 }, lastStage = 0, warned = false;
  let camA = 0, camY = 4, attract = !opts.autopilotPlayer, shake = 0, celebrate = 0, conqueror = false, vent = 0, dispSurge = run.surge;
  let demo = createRun(), demoMem = { careful: true }, demoAcc = 0, demoRest = 0, pilotMem = { careful: true };
  step(demo, { mx: 0, mz: 0, jump: true });
  if (opts.autopilotPlayer) step(run, { mx: 0, mz: 0, jump: true });
  const sfx = (n, v = .3) => { try { p0.sound.play(`assets/${n}.wav`, { volume: v }); } catch (e) {} };
  function reset() {
    run = createRun(); pending = null; sent = false; rewardText = ''; itemText = ''; jumpQ = false; warned = false; lastStage = 0; celebrate = 0; dispSurge = run.surge;
    banner = { text: 'STAGE 1 · THE GATE', sub: 'RACE THE SURGE TO THE CROWN', t: 3 }; dirty = true;
    if (opts.autopilotPlayer) { pilotMem = { careful: true }; step(run, { mx: 0, mz: 0, jump: true }); }
  }
  p0.on('keydown', e => { if ((e.code || e) === 'Space') jumpQ = true; });
  p0.on('pointerdown', e => {
    const x = (e.x ?? p0.input.pointer.x) / Math.max(1, p0.width), y = (e.y ?? p0.input.pointer.y) / Math.max(1, p0.height);
    if (y > .78 && x > .8) reset();
    else if (y > .72 && x > .55) jumpQ = true;
    else if (y > .78 && x < .2 && (!run.active || run.over || run.finished)) leaveNote();
  });
  p0.on('table', top => { table = top; dirty = true; });
  p0.on('reward', r => {
    if (r.kind === 'score') rewardText = r.ok ? `WEEKLY BEST ${Number(r.best).toLocaleString('en-US')} · PLACE ${r.place || '—'}` : (r.reason || 'RESULT KEPT FOR THIS VISIT');
    if (r.kind === 'item') itemText = r.ok ? 'CONQUEROR ACHIEVEMENT EARNED' : '';
    dirty = true;
  });
  p0.on('reconnect', () => { p0.bodies.visible = false; table = p0.table || []; banner = { text: 'RECONNECTED', sub: 'YOUR RUN CONTINUES', t: 2 }; });
  p0.hud('RAMPAGE: THE CLIMB — race the rising Surge up the tower to the crown.\nA/D or ←/→ run around the spiral · W/S toward/away from the wall · Space jumps · R retries · N leaves a note · I invites\nPhones: stick moves, tap JUMP / RETRY. Gold gates vent the Surge. Jump lasers and sweepers; dodge crushers and fire.');

  // ------------------------------------------------------------------ HUD drawing
  const T = (t, x, y, size, color = C.ink, align = 'left', display = false) => drawText(ctx, display ? FD : FT, t, x, y, size, color, align);
  function panel(x, y, w, h, a = .82) { ctx.fillStyle = `rgba(6,6,9,${a})`; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#ff2414'; ctx.fillRect(x, y, 4, h); }
  function crest(cx, cy, r) {                                // CONQUEROR crest: shield with a crown of spikes
    ctx.save(); ctx.translate(cx, cy);
    ctx.beginPath(); ctx.moveTo(-r, -r * .8); ctx.lineTo(r, -r * .8); ctx.lineTo(r * .85, r * .2); ctx.lineTo(0, r); ctx.lineTo(-r * .85, r * .2); ctx.closePath();
    ctx.fillStyle = '#16060a'; ctx.fill(); ctx.lineWidth = r * .1; ctx.strokeStyle = '#ffb23a'; ctx.stroke();
    ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(i * r * .3 - r * .12, -r * .8); ctx.lineTo(i * r * .3, -r * (1.25 + (i === 0 ? .25 : 0))); ctx.lineTo(i * r * .3 + r * .12, -r * .8); }
    ctx.fillStyle = '#ff2414'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * .45, -r * .35); ctx.lineTo(r * .45, -r * .35); ctx.lineTo(0, r * .55); ctx.closePath(); ctx.fillStyle = '#ff2414'; ctx.fill();
    ctx.restore();
  }
  function drawHud() {
    const W = canvas.width, H = canvas.height, P = portrait(), k = P ? W / 700 : W / 1024, R = (run.active || !attract) ? run : demo;
    ctx.clearRect(0, 0, W, H);
    // Surge proximity: a steady red glow rising from the bottom edge (continuous, never flashing)
    const gap = R.y - R.surge, heat = run.active && !run.over && !run.finished ? Math.max(0, Math.min(1, (6 - gap) / 5)) : 0;
    if (heat > 0) { const g = ctx.createLinearGradient(0, H, 0, H * (1 - .45 * heat)); g.addColorStop(0, `rgba(255,40,16,${.42 * heat})`); g.addColorStop(1, 'rgba(255,40,16,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    const tTot = run.time + PENALTY * run.hits;
    panel(16 * k, 14 * k, 470 * k, 74 * k);
    T('RAMPAGE', 34 * k, 66 * k, 42 * k, '#ffffff', 'left', true);
    ctx.fillStyle = Math.floor(p0.time) % 2 === 0 ? '#ff2414' : '#5a0c08'; ctx.beginPath(); ctx.arc(236 * k, 50 * k, 8 * k, 0, 7); ctx.fill();
    T('LIVE', 252 * k, 60 * k, 24 * k, '#ffffff');
    T(STAGES[R.stage].name, 318 * k, 60 * k, 20 * k, C.amber);
    panel(W - 236 * k, 14 * k, 220 * k, 74 * k);
    T((run.active ? tTot : 0).toFixed(1) + 's', W - 30 * k, 66 * k, 42 * k, C.amber, 'right', true);
    // height meter: you, the Surge, the gates, the crown
    const mx = W - 54 * k, top = 120 * k, bot = H - (P ? 300 : 190) * k, span = bot - top, yOf = y => bot - Math.max(0, Math.min(1, y / COURSE.top)) * span;
    ctx.fillStyle = 'rgba(6,6,9,.7)'; ctx.fillRect(mx - 14 * k, top - 10 * k, 28 * k, span + 20 * k);
    ctx.fillStyle = 'rgba(255,36,20,.6)'; const sy = yOf(R.surge); ctx.fillRect(mx - 10 * k, sy, 20 * k, bot - sy);
    for (const p of COURSE.pads) if (p.kind === 'cp') { ctx.fillStyle = p.i <= R.cp ? '#ffffff' : C.amber; ctx.fillRect(mx - 14 * k, yOf(p.y) - 2, 28 * k, 4); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(mx - 16 * k, yOf(R.y) - 4 * k, 32 * k, 8 * k);
    T(`${R.y.toFixed(0)}m`, mx - 22 * k, yOf(R.y) + 8 * k, 22 * k, '#ffffff', 'right');
    if (run.active && !run.over && !run.finished && gap < 5) {
      panel(W / 2 - 230 * k, H - (P ? 420 : 160) * k, 460 * k, 56 * k, .9);
      T(gap < 2 ? 'THE SURGE IS ON YOU' : `SURGE ${gap.toFixed(1)} m BELOW`, W / 2, H - (P ? 380 : 120) * k, 30 * k, gap < 2 ? C.red : C.amber, 'center', true);
    }
    // first-stage coaching: what the next hazard wants from you
    if (run.active && !run.over && !run.finished && run.stage === 0 && run.grounded) {
      const nxt = COURSE.hazards.find(h => h.pad === run.on + 1 || h.pad === run.on);
      const tip = nxt && { laser: 'JUMP THE LASER AS IT SWEEPS PAST', sweep: 'JUMP THE SWEEPER BAR', crush: 'WAIT FOR THE CRUSHER TO LIFT', fire: 'CROSS WHEN THE VENT GOES DARK' }[nxt.type];
      if (tip) { panel(W / 2 - 250 * k, H - (P ? 480 : 220) * k, 500 * k, 44 * k, .8); T(tip, W / 2, H - (P ? 450 : 190) * k, 22 * k, '#ffffff', 'center'); }
    }
    if (banner.t > 0 && !run.over && !run.finished) {
      panel(W / 2 - 300 * k, (P ? 150 : 110) * k, 600 * k, 96 * k, .85);
      T(banner.text, W / 2, (P ? 202 : 162) * k, 42 * k, '#ffffff', 'center', true); T(banner.sub, W / 2, (P ? 234 : 194) * k, 20 * k, C.amber, 'center');
    }
    const bx = W / 2 - 330 * k;
    if (!run.active) {                                       // title over the live demo
      const ty = (P ? 110 : 98) * k; panel(bx, ty, 660 * k, 112 * k, .7);
      T('RAMPAGE', bx + 24 * k, ty + 70 * k, 64 * k, '#ffffff', 'left', true);
      T('THE CLIMB', bx + 26 * k, ty + 100 * k, 22 * k, C.amber);
      T('RACE THE RISING SURGE TO THE CROWN', bx + 636 * k, ty + 42 * k, 20 * k, C.ink, 'right');
      T(P ? 'STICK MOVES · TAP JUMP' : 'A/D RUN · W/S WALL · SPACE JUMPS', bx + 636 * k, ty + 70 * k, 20 * k, C.dim, 'right');
      T(`ENTER. SURVIVE. CONQUER.${attract ? `  ·  DEMO ${demo.maxY.toFixed(0)} m` : ''}`, bx + 636 * k, ty + 100 * k, 20 * k, C.red, 'right', true);
      const py = H - (P ? 420 : 236) * k; panel(W / 2 - 200 * k, py, 400 * k, 48 * k, .75);
      T(P ? 'MOVE THE STICK TO ENTER' : 'MOVE OR PRESS SPACE TO ENTER', W / 2, py + 34 * k, 24 * k, '#ffffff', 'center', true);
    } else if (run.over || run.finished) {
      const by = (P ? 250 : 96) * k; panel(bx, by, 660 * k, 300 * k, .9);
      if (run.finished) crest(bx + 70 * k, by + 70 * k, 38 * k);
      T(run.finished ? 'CONQUERED' : 'CAUGHT BY THE SURGE', W / 2 + (run.finished ? 30 : 0) * k, by + 74 * k, (run.finished ? 66 : 50) * k, run.finished ? '#ffffff' : C.red, 'center', true);
      T(`${rank(run)} · ${score(run).toLocaleString('en-US')} POINTS`, W / 2, by + 124 * k, 30 * k, C.amber, 'center', true);
      T(run.finished ? `${tTot.toFixed(2)} s · ${run.hits} HIT${run.hits === 1 ? '' : 'S'} (+${PENALTY * run.hits}s)` : `REACHED ${run.maxY.toFixed(1)} m OF ${COURSE.top.toFixed(0)}`, W / 2, by + 166 * k, 24 * k, C.ink, 'center');
      T(`BEST THIS VISIT: ${best === null ? '—' : best.toLocaleString('en-US')}${conqueror ? '  ·  CONQUEROR' : ''}`, W / 2, by + 204 * k, 22 * k, C.dim, 'center');
      T(itemText || rewardText || (P ? 'TAP RETRY TO CLIMB AGAIN' : 'PRESS R TO CLIMB AGAIN'), W / 2, by + 250 * k, 22 * k, '#ff6a50', 'center');
    }
    if (!run.active || run.over || run.finished) {
      const ly = run.active ? (P ? 250 : 96) * k + 308 * k : H - (P ? 330 : 112) * k - (24 + 26 * Math.max(1, Math.min(3, table.length))) * k;
      panel(bx, ly, 660 * k, (24 + 26 * Math.max(1, Math.min(3, table.length))) * k, .82);
      T('WEEKLY LEADERS', bx + 22 * k, ly + 32 * k, 22 * k, C.amber, 'left', true);
      if (!table.length) T('BE THE FIRST TO CONQUER THE TOWER', bx + 260 * k, ly + 32 * k, 20 * k, C.dim);
      table.slice(0, 3).forEach((r, i) => T(`${i + 1}. ${String(r.name).slice(0, 18)}  ${Number(r.score).toLocaleString('en-US')}`, bx + 260 * k, ly + (32 + 26 * i) * k, 20 * k));
      const nb = H - (P ? 150 : 92) * k; panel(W * .02, nb, W * .17, (P ? 120 : 76) * k, .7); T('NOTE', W * .105, nb + (P ? 76 : 52) * k, 30 * k, '#ffffff', 'center', true);
    }
    const by2 = H - (P ? 150 : 92) * k;
    panel(W * .57, by2, W * .21, (P ? 120 : 76) * k, .7); T('JUMP', W * .675, by2 + (P ? 76 : 52) * k, 34 * k, '#ffffff', 'center', true);
    panel(W * .8, by2, W * .18, (P ? 120 : 76) * k, .7); T('RETRY', W * .89, by2 + (P ? 76 : 52) * k, 30 * k, C.amber, 'center', true);
    hudTex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ warm up, then go
  p0.loading(0.85, 'compiling the arena');
  await renderer.compileAsync(scene, cam);
  drawHud(); renderer.render(scene, cam);
  refreshNotes();
  p0.log('RAMPAGE: The Climb ready', JSON.stringify({ version: '0.2', pads: COURSE.pads.length, hazards: COURSE.hazards.length, light, autopilot: !!opts.autopilotPlayer }));

  function onEvent(R, ev, isDemo) {
    if (ev === 'checkpoint') { const g = gates.find(g => g.p.i === R.cp); if (g) g.lit = 1; if (!isDemo) { vent = 1; sfx('checkpoint', .35); banner = { text: 'CHECKPOINT', sub: 'SURGE VENTED', t: 2 }; } }
    if (isDemo) { if (ev === 'finish') celebrate = 1; return; }
    if (ev === 'jump') sfx('jump', .22);
    else if (ev === 'land') sfx('land', .16);
    else if (ev === 'hit') { sfx('hit', .35); shake = .35; banner = { text: 'HIT!', sub: `STAGGERED · +${PENALTY}s`, t: 1.6 }; }
    else if (ev === 'finish' || ev === 'eliminated') {
      sfx(ev === 'finish' ? 'conquer' : 'eliminated', .4);
      const sc = score(R); best = best === null ? sc : Math.max(best, sc); pending = sc;
      if (ev === 'finish') { celebrate = 1; conqueror = true; }
      p0.log('RAMPAGE run', JSON.stringify({ result: ev, score: sc, time: +R.time.toFixed(2), hits: R.hits, maxY: +R.maxY.toFixed(1) }));
    }
  }
  // ------------------------------------------------------------------ frame loop
  const right = new THREE.Vector3(), fwd = new THREE.Vector3(), camT = new THREE.Vector3();
  p0.loop((dt, time) => {
    dt = Math.min(dt, 0.1); gameAge += dt; ehU.t.value = time; surgeU.t.value = time;
    if (dt > .065) { slow++; if (slow === 4) renderer.setPixelRatio(Math.max(.5, renderer.getPixelRatio() * .75)); }
    const keys = p0.input.keys, r = keys.has('KeyR'), inv = keys.has('KeyI'), sp = keys.has('Space'), nk = keys.has('KeyN');
    if (r && !lastR) reset(); if (inv && !lastI) p0.invite({ kind: 'team', note: 'Race me up the RAMPAGE tower!' });
    if (nk && !lastN) leaveNote(); if (sp && !lastSpace) jumpQ = true; lastR = r; lastI = inv; lastSpace = sp; lastN = nk;
    const ix = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const iz = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    if (ix || iz || jumpQ) attract = false;
    if (attract && !run.active) {                            // the demo climbs while the title is up
      demoAcc += dt;
      while (demoAcc >= STEP) { demoAcc -= STEP; if (!demo.over && !demo.finished) { const ev = step(demo, autopilotStep(demo, COURSE, demoMem)); if (ev) onEvent(demo, ev, true); } }
      if (demo.over || demo.finished) { demoRest += dt; if (demoRest > 5) { demo = createRun(); demoMem = { careful: true }; demoRest = 0; celebrate = 0; step(demo, { mx: 0, mz: 0, jump: true }); } }
    }
    const F = attract && !run.active ? demo : run;
    const tA = Math.atan2(F.z, F.x), dA = ((tA - camA) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; camA += dA * Math.min(1, dt * 6);
    fwd.set(Math.cos(camA), 0, Math.sin(camA)); right.set(-fwd.z, 0, fwd.x);
    const mx = right.x * ix + fwd.x * iz, mz = right.z * ix + fwd.z * iz;
    acc += dt;
    while (acc >= STEP) {
      const input = opts.autopilotPlayer && !run.over && !run.finished ? autopilotStep(run, COURSE, pilotMem) : { mx, mz, jump: jumpQ };
      const ev = step(run, input); jumpQ = false; acc -= STEP;
      if (ev) { dirty = true; onEvent(run, ev, false); }
    }
    if (run.stage !== lastStage) { lastStage = run.stage; banner = { text: `STAGE ${run.stage + 1} · ${STAGES[run.stage].name}`, sub: 'THE SURGE RISES FASTER', t: 2.4 }; sfx('stage', .3); }
    const gap = run.y - run.surge;
    if (run.active && gap < 3 && !warned) { warned = true; sfx('warn', .3); } if (gap > 6) warned = false;
    if (pending !== null && !sent && gameAge >= Math.max(10, p0.game?.minSeconds || 10)) {
      p0.score(pending); sent = true;
      if (run.finished && ITEM_CONQUEROR) p0.items.give(ITEM_CONQUEROR);
    }
    // world: pure functions of the followed run's clock, so they match the rules exactly
    const t = F.simT;
    for (const d of dyn) {
      const [ox, oz] = padOffset(d.p, t), c = F.crumble[d.p.i];
      d.g.visible = !(c && c.down > 0);
      const fuse = c && c.fuse > 0;
      d.g.position.set(d.p.x + ox + (fuse ? Math.sin(time * 60) * .05 : 0), d.p.y, d.p.z + oz);
      if (d.p.kind === 'crumble') d.rimM.color.setHex(fuse ? (Math.sin(time * 12) > 0 ? 0xff5a20 : 0x5a0c08) : 0x9a1a10);   // ~2 Hz warning
    }
    for (const o of hz) {
      const p = o.p;
      if (o.h.type === 'laser') o.g.rotation.y = -laserAngle(o.h, t);
      else if (o.h.type === 'sweep') { const s = sweepOffset(o.h, t); o.m.position.set(p.x - Math.sin(p.angle) * s, p.y + .25, p.z + Math.cos(p.angle) * s); }
      else if (o.h.type === 'crush') {
        const ch = crushHeight(o.h, t); o.m.position.set(p.x, p.y + ch + .3, p.z);
        o.warn.material.opacity = ch < 2.6 ? .5 * (1 - ch / 2.6) + .1 : 0;                       // red on the pad as it drops
      } else if (o.h.type === 'fire') {
        const on = fireOn(o.h, t), c = ((t * 0.42 + o.h.phase / 6.283) % 1 + 1) % 1, warm = on ? 1 : Math.max(0, (c - .44) / .18);
        o.flame.visible = on; o.flame.scale.y = on ? .85 + .15 * Math.sin(time * 9) : 1;
        o.nozzleM.color.setRGB(.25 + .75 * warm, .06 + .3 * warm, .03);                           // the vent glows before it fires
      }
    }
    for (const g of gates) { g.lit = Math.max(g.lit - dt * .6, F.cp >= g.p.i && g.p.kind === 'cp' ? .35 : 0); g.halo.material.opacity = g.lit * .6; g.m.color.setHex(F.cp >= g.p.i && g.p.kind === 'cp' ? 0xffffff : g.p.kind === 'cp' ? 0x7a5010 : 0xfff0c0); }
    dispSurge += (F.surge - dispSurge) * Math.min(1, dt * (F.surge < dispSurge ? 2.5 : 8));        // a vent visibly drops the Surge
    surge.position.y = dispSurge; surgeGlow.position.y = dispSurge + .6;
    const heatGap = F.y - dispSurge, heat = Math.max(0, Math.min(1, (8 - heatGap) / 7));
    surgeU.heat.value = heat; scene.fog.color.copy(FOG).lerp(FOG_HOT, heat * .8); scene.background.copy(scene.fog.color);
    for (let i = 0; i < NE; i++) {                           // embers rise off the Surge
      let y = ePos[i * 3 + 1] + dt * (1.2 + eSeed[i] * 2.2);
      if (y > dispSurge + 16 || y < dispSurge) y = dispSurge + Math.random() * 2;
      ePos[i * 3 + 1] = y; ePos[i * 3] += Math.sin(time + eSeed[i] * 9) * dt * .3;
    }
    eGeo.attributes.position.needsUpdate = true;
    if (surgeLight) { surgeLight.position.set(F.x * .5, dispSurge + 2, F.z * .5); surgeLight.intensity = 2 + heat * 10; }
    if (playerLight) playerLight.position.set(F.x - fwd.x * 1.5, F.y + 2.4, F.z - fwd.z * 1.5);
    const nextCp = COURSE.pads.find(p => (p.kind === 'cp' || p.kind === 'finish') && p.i > F.cp);
    if (gateLight && nextCp) gateLight.position.set(nextCp.x, nextCp.y + 2, nextCp.z);
    // contenders
    const animate = (fig, R, cheer) => {
      fig.position.set(R.x, R.y, R.z); const v = Math.hypot(R.vx, R.vz);
      if (v > .3) fig.rotation.y = Math.atan2(R.vx, R.vz);
      animateGladiator(fig, { speed: v / 5.6, grounded: R.grounded, vy: R.vy, hit: R.invuln > .8 ? (R.invuln - .8) / .4 : 0, cheer }, dt, time);
    };
    animate(me, run, run.finished ? Math.min(1, celebrate) : 0);
    demoBody.visible = F === demo; if (F === demo) animate(demoBody, demo, demo.finished ? 1 : 0);
    p0.me.position.set(run.x, run.y + 1.6, run.z); p0.me.yaw = me.rotation.y;
    for (const [id, pl] of p0.players) {
      if (pl.isMe) continue;
      let g = ghosts.get(id); if (!g) { g = add(buildGladiator({ ghost: true, tint: 0xff9a80 })); g.userData.prev = new THREE.Vector3(); ghosts.set(id, g); }
      g.userData.prev.copy(g.position);
      g.position.lerp(V.set(pl.position.x, pl.position.y - 1.6, pl.position.z), Math.min(1, dt * 10)); g.rotation.y = pl.yaw || 0;
      animateGladiator(g, { speed: g.position.distanceTo(g.userData.prev) / Math.max(dt, 1e-3) / 5.6, grounded: true }, dt, time);
      g.visible = g.position.distanceTo(cam.position) > 2.5;             // never fill the screen with someone standing by the camera
    }
    for (const [id, g] of ghosts) if (!p0.players.has(id)) { scene.remove(g); ghosts.delete(id); }
    // crown ignites on a conquest
    spireTipM.color.setRGB(.25 + .75 * Math.min(1, celebrate), .06 + .5 * Math.min(1, celebrate), .03);
    // camera: on the axis looking out; a finish orbits the conqueror; hits shake a little
    shake = Math.max(0, shake - dt);
    if (F.finished && celebrate > 0) {
      celebrate = Math.min(4, celebrate + dt * .5);
      const oa = camA + Math.PI + time * .35, R0 = 5.5;
      camT.set(F.x + Math.cos(oa) * R0, F.y + 2.2 + celebrate * .4, F.z + Math.sin(oa) * R0);
      cam.position.lerp(camT, Math.min(1, dt * 2)); cam.lookAt(F.x, F.y + 1.2, F.z);
    } else {
      camY += (F.y + 3.1 - camY) * Math.min(1, dt * 5);
      cam.position.set(-fwd.x * .6 + (Math.random() - .5) * shake * .3, camY + (Math.random() - .5) * shake * .3, -fwd.z * .6);
      cam.lookAt(F.x + right.x * 1.4, F.y + .9, F.z + right.z * 1.4);
    }
    if (p0.time - notesAt > 60) refreshNotes();
    banner.t -= dt; hudT += dt;
    if (dirty || hudT > .1) { drawHud(); dirty = false; hudT = 0; }
  });
}

// RAMPAGE: SAVE LILLY — the three characters, modelled in code and animated procedurally (no skeletons to load).
// JAX the hero, THE WARDEN, and LILLY. Original designs by All Things Gamed. World units: metres, feet at y = 0, facing +x.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k * k * (3 - 2 * k);
const clamp01 = v => Math.max(0, Math.min(1, v));

// ---- shared geometry helpers
function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (parent) parent.add(m); return m;
}
function group(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; }
const sph = (r, ws = 18, hs = 14) => new THREE.SphereGeometry(r, ws, hs);
const cap = (r, len, rs = 14) => new THREE.CapsuleGeometry(r, len, 6, rs);
const cyl = (rt, rb, h, rs = 16) => new THREE.CylinderGeometry(rt, rb, h, rs);
function rbox(w, h, d, r = 0.05) {                          // a box with softened edges (reads better than a cube)
  const g = new THREE.BoxGeometry(w, h, d, 3, 3, 3), p = g.attributes.position, v = new THREE.Vector3();
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const cx = Math.max(-hx, Math.min(hx, v.x)), cy = Math.max(-hy, Math.min(hy, v.y)), cz = Math.max(-hz, Math.min(hz, v.z));
    const d3 = new THREE.Vector3(v.x - cx, v.y - cy, v.z - cz); if (d3.lengthSq() > 0) d3.setLength(r);
    p.setXYZ(i, cx + d3.x, cy + d3.y, cz + d3.z);
  }
  g.computeVertexNormals(); return g;
}
function limb(parent, len, r, mat, x, y, z) {               // a joint group with a capsule hanging down from it
  const j = group(parent, x, y, z);
  mesh(cap(r, Math.max(0.001, len - 2 * r)), mat, 0, -len / 2, 0, j);
  return j;
}

// ================================================================================================ JAX
export function buildHero(M) {
  const C = {
    skin: M(0xd9a07a, { rough: 0.7 }), jacket: M(0x1d2433, { rough: 0.6 }), jacketHi: M(0x2c3650, { rough: 0.55 }),
    scarf: M(0xd8231a, { rough: 0.55, emissive: 0x3a0402 }), pants: M(0x2a2a30, { rough: 0.7 }), boot: M(0x141418, { rough: 0.5 }),
    sole: M(0xff7a1a, { emissive: 0x7a2800, rough: 0.5 }), hair: M(0x1a1312, { rough: 0.8 }), hairTip: M(0xe0321e, { rough: 0.6, emissive: 0x200200 }),
    brass: M(0xc8923a, { metal: 0.8, rough: 0.3 }), lens: M(0x6fe6ff, { emissive: 0x0e4a58, rough: 0.1 }), white: M(0xf6f3ee, { rough: 0.4 }),
    pupil: M(0x15110f, { rough: 0.3 }), steel: M(0x8a92a2, { metal: 0.6, rough: 0.3 }), glow: M(0xff8a2a, { emissive: 0xff6a10, glow: true }),
    mouth: M(0x5a1a14, { rough: 0.6 }),
  };
  const root = new THREE.Group(), body = group(root, 0, 0, 0);       // body: bobs and leans
  const hips = group(body, 0, 0.58, 0);
  // legs
  const legL = limb(hips, 0.42, 0.11, C.pants, 0, 0, 0.13), legR = limb(hips, 0.42, 0.11, C.pants, 0, 0, -0.13);
  for (const leg of [legL, legR]) {
    const knee = group(leg, 0, -0.42, 0); leg.userData.knee = knee;
    const boot = mesh(rbox(0.3, 0.2, 0.2, 0.07), C.boot, 0.06, -0.06, 0, knee);
    mesh(rbox(0.32, 0.05, 0.21, 0.02), C.sole, 0.06, -0.15, 0, knee);
    mesh(rbox(0.12, 0.06, 0.205, 0.02), C.brass, 0.12, -0.02, 0, knee);
    leg.userData.boot = boot;
  }
  // torso
  const torso = group(hips, 0, 0.02, 0);
  mesh(rbox(0.36, 0.42, 0.4, 0.12), C.jacket, 0, 0.24, 0, torso);
  mesh(rbox(0.38, 0.1, 0.42, 0.04), C.jacketHi, 0, 0.05, 0, torso);             // belt
  mesh(rbox(0.07, 0.07, 0.07, 0.02), C.brass, 0.19, 0.05, 0, torso);            // buckle
  mesh(rbox(0.05, 0.3, 0.3, 0.02), C.scarf, 0.17, 0.27, 0, torso);              // chest stripe
  // scarf: a knot at the neck and two tails that trail behind with lag
  const neck = group(torso, 0, 0.47, 0);
  mesh(new THREE.TorusGeometry(0.15, 0.06, 8, 16), C.scarf, 0, 0, 0, neck).rotation.x = Math.PI / 2;
  const tails = [];
  for (const z of [0.07, -0.05]) {
    let parent = group(neck, -0.12, 0, z); const seg = [];
    for (let i = 0; i < 4; i++) { const g = group(parent, i === 0 ? 0 : -0.15, 0, 0); mesh(rbox(0.16, 0.1 - i * 0.012, 0.04, 0.02), C.scarf, -0.07, 0, 0, g); seg.push(g); parent = g; }
    tails.push(seg);
  }
  // head
  const head = group(torso, 0.01, 0.62, 0);
  mesh(sph(0.3, 22, 18), C.skin, 0, 0.08, 0, head).scale.set(1, 1.02, 0.96);
  mesh(sph(0.075, 10, 8), C.skin, 0.28, 0.03, 0, head);                          // nose
  for (const z of [0.29, -0.29]) mesh(sph(0.07, 10, 8), C.skin, -0.02, 0.06, z, head); // ears
  const eyes = [];
  for (const z of [0.11, -0.11]) {
    const e = group(head, 0.25, 0.12, z);
    mesh(sph(0.075, 14, 10), C.white, 0, 0, 0, e).scale.set(0.55, 1.15, 1);
    const pu = mesh(sph(0.042, 10, 8), C.pupil, 0.035, 0, 0, e); pu.scale.set(0.5, 1.1, 1);
    const brow = mesh(rbox(0.03, 0.035, 0.12, 0.012), C.hair, 0.02, 0.11, 0, e);
    eyes.push({ e, pu, brow });
  }
  const mouth = mesh(rbox(0.03, 0.03, 0.12, 0.012), C.mouth, 0.285, -0.08, 0, head);
  // hair: spikes swept back, crimson tips
  const hair = group(head, -0.02, 0.24, 0);
  mesh(new THREE.SphereGeometry(0.3, 16, 10, 0, TAU, 0, Math.PI / 2), C.hair, 0, -0.05, 0, hair).scale.set(1.02, 0.75, 1.0);
  const spikes = [[0.12, 0.08, 0, -0.9], [0.02, 0.12, 0.12, -1.2], [0.02, 0.12, -0.12, -1.2], [-0.1, 0.1, 0.05, -1.6], [-0.1, 0.1, -0.08, -1.6], [-0.2, 0.0, 0, -2.1]];
  for (const [x, y, z, rz] of spikes) {
    const s = group(hair, x, y, z); s.rotation.z = rz; s.rotation.x = z * 2.2;
    mesh(new THREE.ConeGeometry(0.075, 0.26, 8), C.hair, 0, 0.1, 0, s);
    mesh(new THREE.ConeGeometry(0.035, 0.1, 8), C.hairTip, 0, 0.25, 0, s);
  }
  // goggles pushed up on the forehead
  const gog = group(head, 0.12, 0.27, 0);
  mesh(rbox(0.06, 0.05, 0.56, 0.02), C.boot, -0.05, -0.01, 0, gog);
  for (const z of [0.1, -0.1]) {
    const ring = mesh(new THREE.TorusGeometry(0.065, 0.022, 8, 16), C.brass, 0.1, 0.02, z, gog); ring.rotation.y = Math.PI / 2;
    const ln = mesh(new THREE.CircleGeometry(0.055, 16), C.lens, 0.11, 0.02, z, gog); ln.rotation.y = Math.PI / 2;
  }
  gog.rotation.z = -0.35;
  // arms: left in a glove, right in the mechanical gauntlet
  const armL = limb(torso, 0.34, 0.075, C.jacket, 0, 0.4, 0.25), armR = limb(torso, 0.34, 0.075, C.jacket, 0, 0.4, -0.25);
  const elbowL = group(armL, 0, -0.32, 0), elbowR = group(armR, 0, -0.32, 0);
  mesh(cap(0.07, 0.16), C.jacketHi, 0, -0.12, 0, elbowL); mesh(sph(0.085, 12, 10), C.skin, 0, -0.27, 0, elbowL);
  const gaunt = group(elbowR, 0, 0, 0);
  mesh(cyl(0.11, 0.13, 0.22, 12), C.steel, 0, -0.12, 0, gaunt);
  const fist = mesh(rbox(0.22, 0.2, 0.22, 0.06), C.steel, 0, -0.31, 0, gaunt);
  const knuckles = []; for (let i = 0; i < 3; i++) knuckles.push(mesh(sph(0.03, 8, 6), C.glow, 0.11, -0.3, -0.06 + i * 0.06, gaunt));
  mesh(cyl(0.035, 0.035, 0.14, 8), C.brass, -0.12, -0.12, 0, gaunt);
  const gGlow = mesh(sph(0.2, 14, 10), M(0xff7a1a, { additive: true, opacity: 0.0 }), 0, -0.3, 0, gaunt);

  const hero = { root, body, hips, torso, head, legL, legR, armL, armR, elbowL, elbowR, gaunt, gGlow, knuckles, eyes, mouth, tails, hair, blinkT: 2, tailV: [0, 0] };
  hero.update = (dt, st) => animateHero(hero, dt, st);
  root.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return hero;
}
function animateHero(H, dt, s) {
  const t = s.t, a = s.anim;
  let bob = 0, lean = 0, lL = 0, lR = 0, kL = 0, kR = 0, aL = 0.15, aR = -0.15, eL = -0.3, eR = -0.3, headTilt = 0, squash = 1;
  if (a === 'idle') {
    bob = Math.sin(t * 2.2) * 0.012; aL = 0.12 + Math.sin(t * 2.2) * 0.03; aR = -0.12 - Math.sin(t * 2.2) * 0.03; headTilt = Math.sin(t * 0.9) * 0.05;
  } else if (a === 'run') {
    const p = s.runPhase * TAU;
    lL = Math.sin(p) * 0.85; lR = -lL; kL = Math.max(0, -Math.cos(p)) * 1.1 + 0.15; kR = Math.max(0, Math.cos(p)) * 1.1 + 0.15;
    aL = -Math.sin(p) * 0.9; aR = -aL; eL = eR = -1.1; bob = Math.abs(Math.sin(p)) * 0.07; lean = 0.18; headTilt = -0.06;
  } else if (a === 'jump') {
    lL = 0.7; lR = -0.25; kL = 1.2; kR = 0.5; aL = -2.4; aR = 0.6; eL = -0.2; eR = -1.2; lean = 0.05; squash = 1.06;
  } else if (a === 'fall') {
    lL = 0.25; lR = -0.35; kL = 0.6; kR = 0.3; aL = -2.0 + Math.sin(t * 18) * 0.25; aR = -2.0 + Math.cos(t * 18) * 0.25; eL = eR = -0.5;
  } else if (a === 'climb') {
    const p = s.climbPhase * TAU;
    aL = -2.6 + Math.sin(p) * 0.5; aR = -2.6 - Math.sin(p) * 0.5; eL = eR = -0.9; lL = 0.6 + Math.sin(p) * 0.45; lR = 0.6 - Math.sin(p) * 0.45; kL = kR = 1.0;
  } else if (a === 'hurt' || a === 'die') {
    aL = -2.8; aR = -2.4; lL = 0.5; lR = -0.4; kL = 0.8; kR = 0.4; lean = -0.5; headTilt = 0.4;
  } else if (a === 'win') {
    const k = Math.abs(Math.sin(t * 5));
    aR = -2.9; eR = -0.2; aL = 0.2 + k * 0.2; bob = k * 0.12; lL = 0.1; lR = -0.1; headTilt = -0.15;
  } else if (a === 'land') { squash = 0.86; kL = kR = 0.8; lL = 0.4; lR = 0.4; aL = 0.6; aR = -0.6; bob = -0.08; }
  if (s.gauntlet) { aR = a === 'run' ? -1.3 + Math.sin(t * 22) * 0.6 : -1.5 + Math.sin(t * 16) * 0.7; eR = -0.4; }  // swinging the gauntlet
  const k = Math.min(1, dt * 18);
  const sm = (o, prop, v) => (o[prop] = lerp(o[prop], v, k));
  sm(H.legL.rotation, 'z', lL); sm(H.legR.rotation, 'z', lR);
  sm(H.legL.userData.knee.rotation, 'z', -kL); sm(H.legR.userData.knee.rotation, 'z', -kR);
  sm(H.armL.rotation, 'z', aL); sm(H.armR.rotation, 'z', aR); sm(H.elbowL.rotation, 'z', -eL * 0.0 + (a === 'climb' ? 0 : eL * 0.5)); sm(H.elbowR.rotation, 'z', eR * 0.5);
  sm(H.body.position, 'y', bob); sm(H.body.rotation, 'z', -lean); sm(H.head.rotation, 'z', headTilt);
  sm(H.body.scale, 'y', squash); H.body.scale.x = H.body.scale.z = 1 / Math.sqrt(H.body.scale.y);
  // facing: turn the whole figure (quick, not instant: the turn reads)
  const want = s.face > 0 ? -0.38 : Math.PI + 0.38;
  if (a === 'climb') H.root.rotation.y = lerp(H.root.rotation.y, -Math.PI / 2, Math.min(1, dt * 14));
  else H.root.rotation.y = lerp(H.root.rotation.y, want, Math.min(1, dt * 14));
  // blink, and the face reacts
  H.blinkT -= dt; const blink = H.blinkT < 0.12 ? 0.1 : 1; if (H.blinkT < 0) H.blinkT = 2 + Math.random() * 3;
  for (const e of H.eyes) {
    e.e.scale.y = blink; e.brow.position.y = a === 'hurt' || a === 'die' ? 0.14 : a === 'run' ? 0.09 : 0.11;
    e.brow.rotation.x = (a === 'run' || s.gauntlet ? 0.35 : 0) * Math.sign(e.e.position.z);
  }
  H.mouth.scale.y = a === 'win' ? 3.5 : a === 'hurt' || a === 'die' ? 4 : a === 'jump' ? 2 : 1;
  // scarf tails trail behind the motion
  const speed = s.vx || 0, rise = s.vy || 0;
  const sp = Math.min(1, Math.abs(speed) / 6.4);
  for (const seg of H.tails) seg.forEach((g, i) => {
    const flutter = Math.sin(t * (8 + sp * 8) - i * 1.1) * (0.08 + sp * 0.22);
    const target = i === 0 ? lerp(1.25, 0.25, sp) - rise * 0.03 : lerp(0.18, -0.05, sp) + flutter;
    g.rotation.z = lerp(g.rotation.z, target, Math.min(1, dt * 10));
  });
  // the Overdrive gauntlet glows while it is charged
  const g = s.gauntlet ? 0.55 + 0.25 * Math.sin(t * 12) : 0;
  H.gGlow.material.opacity = lerp(H.gGlow.material.opacity, g, Math.min(1, dt * 10));
  H.gaunt.scale.setScalar(lerp(H.gaunt.scale.x, s.gauntlet ? 1.45 : 1, Math.min(1, dt * 8)));
  H.root.visible = !(s.inv && Math.floor(t * 10) % 2 === 0 && a !== 'die');
}

// ================================================================================================ THE WARDEN
// A cybernetic gorilla-ogre: knuckle-walking on huge forearms, a reactor heart in an armoured chest, a crimson eye.
export function buildWarden(M) {
  const C = {
    hide: M(0x3a3446, { rough: 0.88 }), hideHi: M(0x4a4258, { rough: 0.85 }), fur: M(0x16131b, { rough: 0.95 }),
    face: M(0x5c4642, { rough: 0.75 }), muzzle: M(0x6c524a, { rough: 0.75 }),
    plate: M(0xaab2be, { metal: 0.7, rough: 0.32 }), plateDk: M(0x4a505c, { metal: 0.6, rough: 0.4 }), bolt: M(0xd8dde6, { metal: 0.8, rough: 0.25 }),
    crimson: M(0xc0201a, { rough: 0.45, emissive: 0x3a0402 }), tusk: M(0xefe4c8, { rough: 0.45 }), teeth: M(0xe2d8c0, { rough: 0.5 }),
    eyeY: M(0xffc23a, { emissive: 0xb06a00, rough: 0.3 }), eyeR: M(0xff2414, { glow: true }), core: M(0xff2414, { glow: true }),
    mouth: M(0x3a0808, { rough: 0.6 }), chain: M(0x8a8e98, { metal: 0.8, rough: 0.35 }), light: M(0xff3a20, { glow: true }),
  };
  const root = new THREE.Group(), body = group(root);
  const hips = group(body, 0, 1.3, 0);
  // legs: short, bowed, planted
  const legs = [];
  for (const z of [0.62, -0.62]) {
    const leg = group(hips, 0, 0, z);
    const th = mesh(cap(0.42, 0.45), C.hide, 0.05, -0.38, 0, leg); th.rotation.z = -0.15;
    const sh = mesh(cap(0.36, 0.3), C.hideHi, 0.12, -0.92, 0, leg);
    mesh(rbox(0.95, 0.34, 0.66, 0.14), C.plateDk, 0.28, -1.15, 0, leg);
    mesh(rbox(0.36, 0.2, 0.68, 0.08), C.plate, 0.62, -1.08, 0, leg);
    legs.push(leg);
  }
  // torso: a barrel chest on a back hump
  const torso = group(hips, 0, 0.05, 0);
  const trunk = mesh(sph(1.15, 26, 20), C.hide, 0.2, 1.3, 0, torso); trunk.scale.set(1.0, 1.05, 1.2);
  mesh(sph(0.95, 20, 16), C.hideHi, -0.45, 1.85, 0, torso).scale.set(1.0, 0.95, 1.25);     // hump
  mesh(sph(0.75, 18, 14), C.hideHi, 0.55, 0.6, 0, torso).scale.set(1, 0.8, 1.15);            // belly
  for (let i = 0; i < 7; i++) { const sp = mesh(new THREE.ConeGeometry(0.16, 0.5, 6), C.fur, -0.9 + i * 0.2, 2.55 - Math.abs(i - 3) * 0.06 + (i > 4 ? -0.1 * (i - 4) : 0), 0, torso); sp.rotation.z = 0.5 - i * 0.18; }
  // chest armour: two plates, rivets and the reactor heart
  for (const z of [0.42, -0.42]) { const pl = mesh(rbox(0.32, 0.9, 0.72, 0.14), C.plate, 1.1, 1.45, z, torso); pl.rotation.z = 0.18; pl.rotation.x = z > 0 ? -0.15 : 0.15; }
  for (const [y, z] of [[1.85, 0.62], [1.85, -0.62], [1.05, 0.6], [1.05, -0.6]]) mesh(sph(0.055, 8, 6), C.bolt, 1.28, y, z, torso);
  const coreRing = mesh(new THREE.TorusGeometry(0.28, 0.08, 10, 22), C.plateDk, 1.3, 1.42, 0, torso); coreRing.rotation.y = Math.PI / 2;
  const core = mesh(sph(0.24, 16, 12), C.core, 1.3, 1.42, 0, torso);
  const coreHalo = mesh(sph(0.65, 14, 10), M(0xff2414, { additive: true, opacity: 0.25 }), 1.45, 1.42, 0, torso);
  // back: steel plate and two exhaust stacks
  mesh(rbox(0.3, 1.2, 1.3, 0.12), C.plateDk, -1.2, 1.7, 0, torso).rotation.z = -0.35;
  const stacks = [];
  for (const z of [0.42, -0.42]) { const s = mesh(cyl(0.14, 0.18, 0.9, 12), C.plate, -1.25, 2.45, z, torso); s.rotation.z = 0.55; mesh(cyl(0.16, 0.16, 0.12, 12), C.crimson, -1.5, 2.85, z, torso).rotation.z = 0.55; stacks.push(s); }
  // collar of chain
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, l = mesh(new THREE.TorusGeometry(0.13, 0.04, 6, 10), C.chain, 0.6 + Math.cos(a) * 0.55, 2.35, Math.sin(a) * 0.75, torso); l.rotation.y = a; l.rotation.x = i % 2 ? Math.PI / 2 : 0; }
  // head: low and forward
  const neck = group(torso, 1.0, 2.35, 0), head = group(neck, 0.3, 0.05, 0);
  const skull = mesh(sph(0.66, 22, 18), C.face, 0, 0.15, 0, head); skull.scale.set(1.0, 0.92, 1.05);
  mesh(rbox(0.62, 0.16, 0.72, 0.06), C.plate, -0.05, 0.72, 0, head);                            // steel skull plate
  for (const z of [0.24, -0.24]) mesh(sph(0.05, 8, 6), C.bolt, 0.18, 0.8, z, head);
  for (let i = 0; i < 5; i++) { const sp = mesh(new THREE.ConeGeometry(0.1, 0.35, 6), C.fur, -0.35 + i * 0.12, 0.72 - i * 0.02, 0, head); sp.rotation.z = 0.9 - i * 0.12; }
  const muzzle = mesh(sph(0.34, 16, 12), C.muzzle, 0.44, -0.04, 0, head); muzzle.scale.set(0.8, 0.78, 1.15);
  for (const z of [0.11, -0.11]) mesh(sph(0.055, 8, 6), C.mouth, 0.71, 0.05, z, head);          // nostrils
  const brows = [];
  mesh(rbox(0.3, 0.2, 1.0, 0.08), C.fur, 0.38, 0.4, 0, head);                                   // brow ridge
  for (const z of [0.25, -0.25]) { const b = mesh(rbox(0.26, 0.15, 0.48, 0.06), C.fur, 0.46, 0.44, z, head); b.rotation.x = z > 0 ? 0.2 : -0.2; brows.push(b); }
  const jaw = group(head, 0.25, -0.22, 0);
  mesh(rbox(0.72, 0.26, 0.92, 0.12), C.muzzle, 0.25, -0.1, 0, jaw);
  mesh(rbox(0.16, 0.12, 0.7, 0.04), C.mouth, 0.52, 0.04, 0, jaw);
  for (const z of [0.32, -0.32]) { const tk = mesh(new THREE.ConeGeometry(0.075, 0.32, 8), C.tusk, 0.55, 0.18, z, jaw); tk.rotation.z = -0.2; }
  for (let i = 0; i < 5; i++) mesh(rbox(0.06, 0.08, 0.09, 0.02), C.teeth, 0.6, 0.08, -0.22 + i * 0.11, jaw);
  // eyes: a small furious yellow eye and the crimson cybernetic one in a chrome socket
  const eyeL = mesh(sph(0.085, 12, 10), C.eyeY, 0.52, 0.26, 0.26, head);
  const sock = mesh(new THREE.TorusGeometry(0.15, 0.055, 10, 20), C.plate, 0.52, 0.26, -0.27, head); sock.rotation.y = Math.PI / 2;
  mesh(rbox(0.1, 0.36, 0.26, 0.04), C.plate, 0.38, 0.28, -0.42, head).rotation.x = 0.3;
  const eyeR = mesh(sph(0.12, 16, 12), C.eyeR, 0.55, 0.26, -0.27, head);
  const eyeHalo = mesh(sph(0.36, 14, 10), M(0xff2414, { additive: true, opacity: 0.35 }), 0.62, 0.26, -0.27, head);
  const antenna = mesh(cyl(0.02, 0.02, 0.4, 6), C.plate, 0.25, 0.7, -0.42, head); antenna.rotation.x = -0.5;
  mesh(sph(0.04, 6, 6), C.light, 0.25, 0.88, -0.52, head);
  for (const z of [0.6, -0.6]) mesh(sph(0.13, 10, 8), C.face, -0.05, 0.3, z, head);            // ears
  // arms: shoulders, huge forearms, bracers and fists that knuckle-walk
  function arm(z) {
    const sh = group(torso, 0.55, 2.0, z);
    mesh(sph(0.62, 18, 14), C.hide, 0, 0, 0, sh);
    const pad = mesh(rbox(0.9, 0.38, 0.9, 0.16), C.plate, 0.05, 0.38, Math.sign(z) * 0.1, sh); pad.rotation.x = Math.sign(z) * 0.35;
    mesh(rbox(0.92, 0.1, 0.2, 0.03), C.crimson, 0.05, 0.5, Math.sign(z) * 0.22, sh).rotation.x = Math.sign(z) * 0.35;
    const up = group(sh, 0, 0, 0);
    mesh(cap(0.42, 0.7), C.hide, 0, -0.55, 0, up);
    const el = group(up, 0, -1.1, 0);
    mesh(cap(0.56, 0.75), C.hideHi, 0, -0.62, 0, el);
    mesh(cyl(0.6, 0.64, 0.6, 18), C.plate, 0, -0.78, 0, el);                                      // bracer
    for (let i = 0; i < 3; i++) mesh(sph(0.06, 8, 6), C.light, 0.62, -0.62 - i * 0.16, 0, el);
    for (const zz of [0.3, -0.3]) mesh(cyl(0.06, 0.06, 0.95, 8), C.bolt, 0.45, -0.4, zz, el);
    const fist = group(el, 0, -1.4, 0);
    mesh(sph(0.62, 18, 14), C.hide, 0, 0, 0, fist).scale.set(1.15, 0.9, 1.05);
    mesh(rbox(0.34, 0.46, 0.98, 0.1), C.plate, 0.48, 0.0, 0, fist);
    for (let i = 0; i < 4; i++) mesh(sph(0.075, 8, 6), C.bolt, 0.66, 0.08, -0.33 + i * 0.22, fist);
    const shackle = mesh(new THREE.TorusGeometry(0.58, 0.07, 8, 20), C.chain, 0, -0.32, 0, el); shackle.rotation.x = Math.PI / 2;
    return { sh, up, el, fist };
  }
  const armF = arm(1.25), armB = arm(-1.25);
  const W = { root, body, hips, torso, neck, head, jaw, brows, eyeR, eyeHalo, eyeL, core, coreHalo, armF, armB, legs, stacks };
  W.update = (dt, st) => animateWarden(W, dt, st);
  return W;
}
function animateWarden(W, dt, s) {
  const t = s.t, m = s.mode, k = Math.min(1, dt * 10), u = s.u || 0;
  const breathe = Math.sin(t * 1.8);
  let lean = 0.12, bodyY = breathe * 0.05, jaw = 0.06, headUp = 0, headTurn = 0, browA = 0.2;
  let fU = 0.38 + breathe * 0.03, fE = -0.28, bU = 0.32 + breathe * 0.03, bE = -0.3, fX = 0, bX = 0;   // knuckle-walking stance
  if (m === 'idle') headTurn = Math.sin(t * 0.7) * 0.2;
  else if (m === 'grab') { const e = ease(u); fU = lerp(0.38, 2.75, e); fE = lerp(-0.28, -0.35, e); bU = lerp(0.32, 2.6, e); bE = -0.35; lean = lerp(0.12, -0.15, e); jaw = 0.3 * e; headUp = 0.25 * e; }
  else if (m === 'throw') { const e = ease(Math.min(1, u * 1.6)); fU = lerp(2.75, 0.55, e); fE = lerp(-0.35, -0.05, e); bU = lerp(2.6, 0.5, e); bE = -0.1; lean = lerp(-0.15, 0.45, e); jaw = 0.65 - 0.4 * e; }
  else if (m === 'pound') { const b = Math.sin(t * 15); fU = 1.35 + Math.max(0, b) * 0.35; bU = 1.35 + Math.max(0, -b) * 0.35; fE = bE = -2.1; lean = -0.2; jaw = 0.6; headUp = 0.4; browA = 0.35; }
  else if (m === 'roar') { lean = -0.3; headUp = 0.6; jaw = 0.9 + Math.sin(t * 40) * 0.05; fU = bU = 1.6; fE = bE = -0.7; fX = 0.65; bX = -0.65; bodyY += Math.sin(t * 50) * 0.03; browA = 0.45; }
  else if (m === 'tell') { const e = ease(Math.min(1, u * 1.4)); fU = bU = lerp(0.38, 2.95, e); fE = bE = -0.3; lean = -0.12; jaw = 0.45; headUp = 0.35; browA = 0.5; }
  else if (m === 'slam') { const e = ease(Math.min(1, u * 3)); fU = bU = lerp(2.95, 0.3, e); fE = bE = lerp(-0.3, -0.05, e); lean = lerp(-0.12, 0.6, e); bodyY -= 0.35 * e; jaw = 0.75; browA = 0.5; }
  else if (m === 'beam') { lean = 0.35; headUp = -0.15; jaw = 0.35; fU = 0.6; bU = 0.6; fE = bE = -0.6; browA = 0.55; }
  else if (m === 'hurt') { lean = -0.45 + Math.sin(t * 30) * 0.06; headUp = 0.5; jaw = 0.9; fU = 2.0; bU = 1.4; fE = bE = -1.6; fX = 0.6; bX = -0.4; browA = -0.2; }
  else if (m === 'defeat') { const e = ease(Math.min(1, u)); lean = lerp(0.2, -1.2, e); headUp = lerp(0, 0.8, e); jaw = 0.9 * (1 - e) + 0.2; fU = lerp(1, 2.8, e); bU = lerp(1, 2.6, e); bodyY -= 1.2 * e; browA = -0.3; }
  W.body.position.y = lerp(W.body.position.y, bodyY, k);
  W.torso.rotation.z = lerp(W.torso.rotation.z, -lean, k);
  W.neck.rotation.z = lerp(W.neck.rotation.z, headUp, k); W.neck.rotation.y = lerp(W.neck.rotation.y, headTurn, k * 0.5);
  W.jaw.rotation.z = lerp(W.jaw.rotation.z, -jaw, Math.min(1, dt * 16));
  const anger = s.anger || 0;
  W.brows.forEach((b, i) => { b.rotation.x = lerp(b.rotation.x, (i ? -1 : 1) * (browA + anger * 0.25), k); b.position.y = lerp(b.position.y, 0.4 - (browA + anger * 0.2) * 0.08, k); });
  W.armF.up.rotation.z = lerp(W.armF.up.rotation.z, fU, k); W.armF.el.rotation.z = lerp(W.armF.el.rotation.z, fE, k); W.armF.up.rotation.x = lerp(W.armF.up.rotation.x, fX, k);
  W.armB.up.rotation.z = lerp(W.armB.up.rotation.z, bU, k); W.armB.el.rotation.z = lerp(W.armB.el.rotation.z, bE, k); W.armB.up.rotation.x = lerp(W.armB.up.rotation.x, bX, k);
  const alive = m === 'defeat' ? clamp01(1 - u * 1.4) : 1;
  const flick = m === 'defeat' && u > 0.4 ? (Math.sin(t * 9) > 0 ? 1 : 0.3) : 1;
  const beat = 0.75 + 0.25 * Math.sin(t * (4 + anger * 4));
  W.eyeHalo.material.opacity = (0.3 + anger * 0.25 + (m === 'beam' || m === 'tell' ? 0.45 : 0)) * alive * flick;
  W.eyeHalo.scale.setScalar(1 + (m === 'beam' ? 0.7 : 0) + beat * 0.1);
  W.coreHalo.material.opacity = (0.16 + 0.2 * beat + anger * 0.15) * alive;
  W.core.scale.setScalar(0.9 + 0.15 * beat);
  W.eyeR.visible = alive > 0.05 || flick > 0.5;
  // three-quarters toward the camera, turned to the side he throws
  const want = (s.face ?? 1) > 0 ? -0.9 : -(Math.PI - 0.9);
  W.root.rotation.y = lerp(W.root.rotation.y, want, Math.min(1, dt * 4));
}

// ================================================================================================ LILLY
export function buildLilly(M) {
  const C = {
    skin: M(0xe2b08e, { rough: 0.7 }), suit: M(0x16b8ad, { rough: 0.55 }), suitDk: M(0x0d6f69, { rough: 0.6 }),
    belt: M(0x6b4424, { rough: 0.6 }), shoe: M(0xf2f2ee, { rough: 0.5 }), shoeT: M(0x16b8ad, { rough: 0.5 }),
    hair: M(0x3b2318, { rough: 0.8 }), band: M(0xffd23a, { rough: 0.5, emissive: 0x2a1c00 }), white: M(0xf6f3ee, { rough: 0.4 }),
    pupil: M(0x1a2a3a, { rough: 0.3 }), steel: M(0xa6adb8, { metal: 0.9, rough: 0.3 }), mouth: M(0x7a2a2a, { rough: 0.6 }), cheek: M(0xf08a7a, { rough: 0.7 }),
  };
  const root = new THREE.Group(), body = group(root);
  const hips = group(body, 0, 0.52, 0);
  const legL = limb(hips, 0.4, 0.085, C.suit, 0, 0, 0.1), legR = limb(hips, 0.4, 0.085, C.suit, 0, 0, -0.1);
  for (const leg of [legL, legR]) { const kn = group(leg, 0, -0.4, 0); leg.userData.knee = kn; mesh(rbox(0.22, 0.12, 0.15, 0.05), C.shoe, 0.04, -0.04, 0, kn); mesh(rbox(0.1, 0.05, 0.155, 0.02), C.shoeT, 0.08, 0.0, 0, kn); }
  const torso = group(hips, 0, 0.02, 0);
  mesh(rbox(0.3, 0.38, 0.32, 0.11), C.suit, 0, 0.22, 0, torso);
  mesh(rbox(0.32, 0.08, 0.34, 0.03), C.belt, 0, 0.04, 0, torso);
  for (const z of [0.12, -0.12]) mesh(rbox(0.08, 0.1, 0.06, 0.02), C.belt, 0.12, 0.0, z, torso);  // pouches
  mesh(rbox(0.04, 0.24, 0.05, 0.015), C.suitDk, 0.155, 0.24, 0, torso);                          // zip
  const head = group(torso, 0.01, 0.56, 0);
  mesh(sph(0.27, 22, 18), C.skin, 0, 0.06, 0, head);
  mesh(sph(0.05, 8, 6), C.skin, 0.26, 0.02, 0, head);
  for (const z of [0.16, -0.16]) mesh(sph(0.045, 8, 6), C.cheek, 0.21, -0.04, z, head).scale.set(0.4, 0.7, 1);
  const eyes = [];
  for (const z of [0.1, -0.1]) { const e = group(head, 0.22, 0.09, z); mesh(sph(0.075, 14, 10), C.white, 0, 0, 0, e).scale.set(0.55, 1.2, 1); const pu = mesh(sph(0.045, 10, 8), C.pupil, 0.035, -0.005, 0, e); pu.scale.set(0.5, 1.15, 1); const lash = mesh(rbox(0.02, 0.025, 0.11, 0.01), C.hair, 0.02, 0.09, 0, e); eyes.push({ e, lash }); }
  const mouth = mesh(rbox(0.03, 0.025, 0.09, 0.01), C.mouth, 0.255, -0.08, 0, head);
  // hair: a fringe, a yellow headband and a big ponytail that swings
  mesh(new THREE.SphereGeometry(0.285, 18, 12, 0, TAU, 0, Math.PI / 2), C.hair, -0.02, 0.06, 0, head).scale.set(1.0, 0.95, 1.02);
  mesh(rbox(0.1, 0.1, 0.42, 0.05), C.hair, 0.2, 0.22, 0, head).rotation.z = -0.5;
  const bandG = group(head, -0.02, 0.17, 0); bandG.rotation.z = 0.35;
  mesh(new THREE.TorusGeometry(0.285, 0.035, 8, 28), C.band, 0, 0, 0, bandG).rotation.x = Math.PI / 2;
  const pony = group(head, -0.26, 0.26, 0), ponySeg = [];
  let pp = pony;
  for (let i = 0; i < 5; i++) { const g = group(pp, i === 0 ? 0 : -0.075, i === 0 ? 0 : -0.06, 0); mesh(sph(0.115 - i * 0.016, 12, 10), C.hair, -0.04, -0.03, 0, g).scale.set(1.25, 1, 1.1); ponySeg.push(g); pp = g; }
  mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 12), C.band, 0, 0, 0, pony).rotation.y = Math.PI / 2;
  const armL = limb(torso, 0.3, 0.06, C.suit, 0, 0.36, 0.2), armR = limb(torso, 0.3, 0.06, C.suit, 0, 0.36, -0.2);
  const elL = group(armL, 0, -0.28, 0), elR = group(armR, 0, -0.28, 0);
  mesh(cap(0.055, 0.12), C.skin, 0, -0.1, 0, elL); mesh(cap(0.055, 0.12), C.skin, 0, -0.1, 0, elR);
  const wrench = group(elR, 0, -0.22, 0);
  mesh(rbox(0.05, 0.36, 0.05, 0.015), C.steel, 0, -0.1, 0, wrench);
  mesh(new THREE.TorusGeometry(0.06, 0.022, 6, 12, Math.PI * 1.4), C.steel, 0, -0.3, 0, wrench).rotation.z = 0.6;
  const Ly = { root, body, hips, torso, head, legL, legR, armL, armR, elL, elR, eyes, mouth, ponySeg, wrench, blinkT: 1 };
  Ly.update = (dt, st) => animateLilly(Ly, dt, st);
  return Ly;
}
function animateLilly(Ly, dt, s) {
  const t = s.t, m = s.mode, k = Math.min(1, dt * 10);
  let aL = 0.2, aR = -0.2, eL = 0, eR = 0, lL = 0, lR = 0, bob = Math.sin(t * 2) * 0.01, lean = 0, headTilt = 0, mouth = 1, jumpY = 0;
  if (m === 'held' || m === 'cage') {           // struggling and calling out
    const w = Math.sin(t * 7); aL = -2.6 + w * 0.4; aR = -2.4 - w * 0.4; eL = eR = -0.3; lL = 0.3 + w * 0.3; lR = -0.3 + w * 0.3; headTilt = Math.sin(t * 3) * 0.15; mouth = 2.5 + Math.max(0, w) * 1.5;
  } else if (m === 'shout') { aL = -2.2; aR = -2.2; eL = eR = -1.6; headTilt = -0.2; mouth = 4; lean = -0.1; }
  else if (m === 'wave') { aR = -2.9 + Math.sin(t * 9) * 0.35; eR = -0.3; aL = 0.25; mouth = 2.5; headTilt = 0.1; }
  else if (m === 'sabotage' || m === 'lever') { const p = Math.sin(t * 6); aR = -2.0 + p * 1.0; aL = -1.6 + p * 0.8; eL = eR = -0.6; lean = 0.25; mouth = 1.5; }
  else if (m === 'cheer' || m === 'free') { const p = Math.abs(Math.sin(t * 5)); aL = -2.8; aR = -2.8; jumpY = p * 0.25; mouth = 3.5; headTilt = -0.15; lL = 0.2 * p; lR = -0.2 * p; }
  else if (m === 'run') { const p = t * 12; lL = Math.sin(p) * 0.8; lR = -lL; aL = -Math.sin(p) * 0.8; aR = -aL; bob = Math.abs(Math.sin(p)) * 0.06; lean = 0.15; mouth = 2; }
  else if (m === 'hug') { aL = -1.7; aR = -1.7; eL = eR = -1.3; headTilt = 0.15; mouth = 2; lean = 0.15; }
  const sm = (o, p, v) => (o[p] = lerp(o[p], v, k));
  sm(Ly.armL.rotation, 'z', aL); sm(Ly.armR.rotation, 'z', aR); sm(Ly.elL.rotation, 'z', eL); sm(Ly.elR.rotation, 'z', eR);
  sm(Ly.legL.rotation, 'z', lL); sm(Ly.legR.rotation, 'z', lR);
  sm(Ly.body.position, 'y', bob + jumpY); sm(Ly.body.rotation, 'z', -lean); sm(Ly.head.rotation, 'z', headTilt);
  Ly.mouth.scale.y = lerp(Ly.mouth.scale.y, mouth, k);
  Ly.blinkT -= dt; const blink = Ly.blinkT < 0.12 ? 0.1 : 1; if (Ly.blinkT < 0) Ly.blinkT = 1.8 + Math.random() * 3;
  for (const e of Ly.eyes) e.e.scale.y = blink;
  Ly.ponySeg.forEach((g, i) => { g.rotation.z = Math.sin(t * 4 - i * 0.8) * (0.25 + (m === 'run' || m === 'cheer' ? 0.25 : 0)) - 0.25; });
  Ly.root.rotation.y = lerp(Ly.root.rotation.y, (s.face ?? -1) > 0 ? -0.4 : Math.PI + 0.4, Math.min(1, dt * 8));
  Ly.wrench.visible = m !== 'hug';
}

// RAMPAGE contender: an original armoured gladiator built from simple shapes (no external model), with
// procedural run / jump / stagger / victory animation. Faces +Z; feet at y = 0; about 1.85 m tall with the crest.
import * as THREE from 'three';

export function buildGladiator({ ghost = false, light = false, tint = 0xff2414 } = {}) {
  const lit = o => (light || ghost) ? new THREE.MeshBasicMaterial(o) : new THREE.MeshLambertMaterial(o);
  const glow = (c, op = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: op < 1, opacity: op, fog: false });
  const M = ghost
    ? { armor: glow(0x9aa2b8, .32), trim: glow(0xc8cedd, .4), leather: glow(0x7a5040, .3), crimson: glow(tint, .7), gold: glow(0xffd090, .6), visor: glow(0xffc0a8, .9) }
    : { armor: lit({ color: 0x22242b }), trim: lit({ color: 0x5c5f6a }), leather: lit({ color: 0x3b1d16 }), crimson: glow(tint), gold: glow(0xffb23a), visor: glow(0xff3a1e) };
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent && parent.add(m); return m; };
  const pivot = (x, y, z, parent) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cap = (r, l) => new THREE.CapsuleGeometry(r, l, 2, 7);

  const root = new THREE.Group();
  const hips = pivot(0, 0.95, 0, root);
  mesh(box(0.34, 0.16, 0.22), M.leather, 0, 0, 0, hips);
  for (let i = 0; i < 7; i++) {                                    // pteruges: leather strips around the hips
    const a = (i / 7) * Math.PI * 2, strip = mesh(box(0.08, 0.26, 0.03), i % 2 ? M.leather : M.trim, Math.sin(a) * 0.17, -0.14, Math.cos(a) * 0.12, hips);
    strip.rotation.y = a;
  }
  const torso = pivot(0, 0.06, 0, hips);
  mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.5, 7), M.armor, 0, 0.27, 0, torso);
  mesh(box(0.34, 0.2, 0.08), M.trim, 0, 0.36, 0.13, torso);             // chest plate
  mesh(box(0.05, 0.36, 0.02), M.crimson, 0, 0.3, 0.175, torso);          // crimson channel down the chest (RAMPAGE)
  const pauL = mesh(new THREE.SphereGeometry(0.17, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.trim, 0.27, 0.5, 0, torso); pauL.scale.set(1.25, 0.9, 1.2);
  mesh(box(0.2, 0.04, 0.2), M.crimson, 0.29, 0.5, 0, torso);             // pauldron trim
  const pauR = mesh(new THREE.SphereGeometry(0.11, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), M.armor, -0.25, 0.5, 0, torso);
  // head: helmet, cheek guards, glowing visor slit, transverse-free crest (front-to-back plume)
  const head = pivot(0, 0.6, 0, torso);
  mesh(new THREE.SphereGeometry(0.15, 10, 8), M.armor, 0, 0.12, 0, head);
  mesh(box(0.3, 0.16, 0.08), M.armor, 0, 0.06, 0.1, head);
  mesh(box(0.22, 0.035, 0.03), M.visor, 0, 0.13, 0.145, head);
  mesh(box(0.04, 0.12, 0.05), M.trim, 0, 0.03, 0.15, head);              // nose guard
  const plume = pivot(0, 0.27, -0.02, head);
  for (let i = 0; i < 7; i++) mesh(box(0.045, 0.12 + Math.sin(i / 6 * Math.PI) * 0.1, 0.06), M.crimson, 0, 0.03 + Math.sin(i / 6 * Math.PI) * 0.04, 0.16 - i * 0.055, plume);
  // arms: shield on the left, short sword on the right
  const arm = (side) => {
    const s = pivot(side * 0.3, 0.46, 0, torso);
    mesh(cap(0.065, 0.2), M.armor, 0, -0.15, 0, s);
    const el = pivot(0, -0.3, 0, s);
    mesh(cap(0.06, 0.18), M.trim, 0, -0.13, 0, el);
    mesh(box(0.13, 0.1, 0.13), M.leather, 0, -0.28, 0, el);              // gauntlet
    return { s, el };
  };
  const L = arm(1), R = arm(-1);
  const shield = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 14), M.armor, 0.1, -0.16, 0.06, L.el); shield.rotation.z = Math.PI / 2;
  const boss = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 8), M.gold, 0.13, -0.16, 0.06, L.el); boss.rotation.z = Math.PI / 2;
  const rim = mesh(new THREE.TorusGeometry(0.25, 0.015, 4, 18), M.crimson, 0.125, -0.16, 0.06, L.el); rim.rotation.y = Math.PI / 2;
  const sword = pivot(0, -0.3, 0.05, R.el);
  mesh(box(0.04, 0.05, 0.16), M.gold, 0, 0, 0, sword);                   // guard
  mesh(box(0.03, 0.04, 0.45), M.trim, 0, 0, 0.3, sword);                 // blade
  mesh(box(0.012, 0.045, 0.4), M.crimson, 0, 0, 0.3, sword);             // glowing edge
  // legs with greaves
  const leg = (side) => {
    const h = pivot(side * 0.1, -0.06, 0, hips);
    mesh(cap(0.08, 0.26), M.leather, 0, -0.2, 0, h);
    const k = pivot(0, -0.42, 0, h);
    mesh(cap(0.07, 0.26), M.armor, 0, -0.2, 0, k);
    mesh(box(0.12, 0.2, 0.06), M.trim, 0, -0.18, 0.06, k);               // greave
    mesh(box(0.12, 0.07, 0.24), M.leather, 0, -0.42, 0.05, k);            // boot
    return { h, k };
  };
  const LL = leg(1), RL = leg(-1);
  // cape hangs from the shoulders and streams back with speed
  const capeP = pivot(0, 0.52, -0.16, torso);
  const cape = mesh(new THREE.PlaneGeometry(0.46, 0.85, 1, 3), new THREE.MeshBasicMaterial({ color: ghost ? 0xff8a70 : 0x8a0c08, side: THREE.DoubleSide, transparent: ghost, opacity: ghost ? .35 : 1, fog: !ghost }), 0, -0.42, -0.02, capeP);
  root.userData = { hips, torso, head, L, R, LL, RL, capeP, plume, sword, phase: 0, blend: 0 };
  return root;
}

// st: { speed 0..1, grounded, vy, hit 0..1, cheer 0..1 }
export function animateGladiator(g, st, dt, t) {
  const u = g.userData, sp = Math.min(1, st.speed || 0);
  u.phase += dt * (5 + 9 * sp);
  u.blend += ((st.grounded ? 0 : 1) - u.blend) * Math.min(1, dt * 10);          // 0 running, 1 airborne
  const a = 1 - u.blend, s = Math.sin(u.phase), c = Math.cos(u.phase);
  const swing = s * 0.85 * sp;
  // legs
  u.LL.h.rotation.x = a * swing + u.blend * -0.7;  u.RL.h.rotation.x = a * -swing + u.blend * 0.25;
  u.LL.k.rotation.x = a * Math.max(0, -c) * 1.1 * sp + u.blend * 1.2;  u.RL.k.rotation.x = a * Math.max(0, c) * 1.1 * sp + u.blend * 0.5;
  // arms: counter-swing; up for balance in the air; overhead on victory
  const cheer = st.cheer || 0;
  u.L.s.rotation.x = (a * -swing * 0.7 + u.blend * -0.9) * (1 - cheer) + cheer * -2.7;
  u.R.s.rotation.x = (a * swing * 0.7 + u.blend * -1.3) * (1 - cheer) + cheer * (-2.9 + Math.sin(t * 6) * 0.15);
  u.L.s.rotation.z = 0.15 + cheer * 0.35; u.R.s.rotation.z = -0.15 - cheer * 0.25;
  u.L.el.rotation.x = -0.5 - sp * 0.3; u.R.el.rotation.x = -0.6 - sp * 0.3 + cheer * 0.4;
  // body: bob, lean into the run, stagger back when hit
  u.hips.position.y = 0.95 + a * Math.abs(s) * 0.05 * sp - u.blend * 0.06;
  u.torso.rotation.x = 0.12 * sp - (st.hit || 0) * 0.6 + cheer * -0.15 + 0.02 * Math.sin(t * 2.1);
  u.head.rotation.x = -0.1 * sp + (st.hit || 0) * 0.3;
  u.capeP.rotation.x = 0.2 + sp * 0.75 + u.blend * 0.5 + Math.sin(t * 8) * 0.06 * (sp + u.blend);
  u.plume.rotation.x = -0.1 * sp;
}

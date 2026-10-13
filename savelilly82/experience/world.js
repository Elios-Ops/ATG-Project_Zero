// RAMPAGE: SAVE LILLY — the fortress: platforms, ladders, machinery, hazards, items and the layered backdrops,
// built in code from a level's data. Static parts are merged per material; repeated parts are instanced.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ventState, crusherState, laserState, platY, T } from './sim.js';

const TAU = Math.PI * 2;
const PAL = {
  foundry: { skyTop: 0x07060a, skyBot: 0x3a0d06, haze: 0x5a1a0a, fog: 0x1a0806, wall: 0x6a4a40, accent: 0xff6a1a, far: 0x120b0c, lamp: 0xffa060 },
  machine: { skyTop: 0x05070c, skyBot: 0x1a2030, haze: 0x2a3446, fog: 0x0c0f16, wall: 0x4a5262, accent: 0xffb21a, far: 0x0b0d13, lamp: 0xffd2a0 },
  ascent: { skyTop: 0x0a0408, skyBot: 0x4a0a10, haze: 0x6a1018, fog: 0x1a060a, wall: 0x5a3a40, accent: 0xff2414, far: 0x10080b, lamp: 0xff8070 },
  warden: { skyTop: 0x080306, skyBot: 0x520a0a, haze: 0x7a1408, fog: 0x1c0606, wall: 0x6a3a38, accent: 0xff2414, far: 0x12080a, lamp: 0xff6040 },
};
export { PAL };

// ---------------------------------------------------------------------------------------------- textures drawn in code
function canvasTex(w, h, draw, repeat = true) {
  const c = new OffscreenCanvas(w, h), g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4; return t;
}
export function makeTextures() {
  const rnd = (() => { let a = 82; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
  return {
    grate: canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#2b2f38'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#121419'; for (let y = 4; y < h; y += 16) for (let x = 4; x < w; x += 16) g.fillRect(x, y, 10, 10);
      g.strokeStyle = '#4a5160'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
    }),
    hazard: canvasTex(128, 32, (g, w, h) => {
      g.fillStyle = '#ffb21a'; g.fillRect(0, 0, w, h); g.fillStyle = '#16161a';
      for (let x = -h; x < w + h; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); }
    }),
    belt: canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#1b1c20'; g.fillRect(0, 0, w, h); g.fillStyle = '#2e3038';
      for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 8, h);
      g.fillStyle = '#ff8a2a'; g.beginPath(); g.moveTo(40, 20); g.lineTo(54, 32); g.lineTo(40, 44); g.lineTo(44, 32); g.fill();
    }),
    panel: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#7d7d82'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) { const v = 90 + rnd() * 70; g.fillStyle = `rgba(${v},${v * 0.92},${v * 0.88},0.25)`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 2 + rnd() * 6); }
      g.strokeStyle = 'rgba(20,20,24,0.9)'; g.lineWidth = 4;
      for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      for (let y = 0; y < h; y += 64) for (let x = (y / 64) % 2 ? 32 : 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); }
      g.fillStyle = 'rgba(200,200,210,0.6)'; for (let y = 8; y < h; y += 64) for (let x = 8; x < w; x += 32) g.fillRect(x, y, 3, 3);
      for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(90,40,20,${0.15 + rnd() * 0.2})`; const x = rnd() * w; g.fillRect(x, rnd() * h, 3 + rnd() * 3, 20 + rnd() * 50); }
    }),
    brick: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#3a2a26'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 24) for (let x = (y / 24) % 2 ? -24 : 0; x < w; x += 48) {
        const v = 60 + rnd() * 50; g.fillStyle = `rgb(${v + 20},${v * 0.7},${v * 0.6})`; g.fillRect(x + 2, y + 2, 44, 20);
      }
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.3})`; g.fillRect(rnd() * w, rnd() * h, 10 + rnd() * 40, 6 + rnd() * 20); }
    }),
    crack: canvasTex(128, 32, (g, w, h) => {
      g.fillStyle = '#3a3a40'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ff7a1a'; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) { g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd() - 0.3) * 30; y += (rnd() - 0.5) * 14; g.lineTo(x, y); } g.stroke(); }
    }, false),
    sign: canvasTex(256, 64, (g, w, h) => {
      g.fillStyle = '#1a1a1e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffb21a'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = '#ffb21a'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DANGER  ▲  HIGH VOLTAGE', w / 2, h / 2 + 2);
    }, false),
    glowDot: canvasTex(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, false),
  };
}

// ---------------------------------------------------------------------------------------------- geometry helpers
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function place(geo, x, y, z, rz = 0, ry = 0, rx = 0, sx = 1, sy = 1, sz = 1) {
  const g = geo.clone(), m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  g.applyMatrix4(m); return g;
}
class Batch {                                            // collect geometries per material, merge once
  constructor() { this.map = new Map(); }
  add(mat, geo) { if (!this.map.has(mat)) this.map.set(mat, []); this.map.get(mat).push(geo.index ? geo.toNonIndexed() : geo); }
  build(parent) {
    for (const [mat, list] of this.map) {
      for (const g of list) { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); }
      const m = new THREE.Mesh(mergeGeometries(list, false), mat); m.matrixAutoUpdate = false; parent.add(m);
    }
  }
}
function gearShape(r, teeth = 10, hole = 0.35) {
  const s = new THREE.Shape(), n = teeth * 4;
  for (let i = 0; i <= n; i++) { const a = i / n * TAU, rr = (i % 4 < 2) ? r : r * 0.8; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i === 0) s.moveTo(x, y); else s.lineTo(x, y); }
  const h = new THREE.Path(); h.absarc(0, 0, r * hole, 0, TAU, true); s.holes.push(h);
  return s;
}
const gearGeo = (r, depth = 0.1, teeth = 10) => { const g = new THREE.ExtrudeGeometry(gearShape(r, teeth), { depth, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -depth / 2); return g; };

// ---------------------------------------------------------------------------------------------- the world
export function buildWorld(L, ctx) {
  const { M, light, tex, fx } = ctx, P = PAL[L.id];
  const g = new THREE.Group(), dyn = [];                         // dyn: per-frame updaters
  const B = new Batch();
  const mat = {
    girder: M(0xb3261a, { rough: 0.55, metal: 0.4 }), girderDk: M(0x6e140e, { rough: 0.6, metal: 0.4 }), rivet: M(0xf0c070, { metal: 0.8, rough: 0.3 }),
    steel: M(0x9aa2b2, { rough: 0.45, metal: 0.45, map: tex.grate }), lip: M(0xffd8a0, { glow: true }), steelDk: M(0x1c1f26, { rough: 0.6, metal: 0.5 }), hazard: M(0xffffff, { map: tex.hazard, rough: 0.6 }),
    ladder: M(0xc9ccd4, { metal: 0.8, rough: 0.35 }), ladderY: M(0xffb21a, { rough: 0.5 }), ground: M(0x2a2624, { rough: 0.85, map: tex.brick }),
    wall: M(P.wall, { rough: 0.9, map: tex.panel }), wallDk: M(0x0c0b0d, { rough: 0.9 }), pipe: M(0x4a4e58, { metal: 0.85, rough: 0.35 }),
    pipeRust: M(0x6b3018, { rough: 0.7, metal: 0.4 }), brass: M(0xc8923a, { metal: 0.85, rough: 0.3 }), glowA: M(P.accent, { glow: true }),
    win: M(0xffa040, { glow: true }), dark: M(0x08080a, { rough: 1 }), chain: M(0x5a5e68, { metal: 0.9, rough: 0.4 }),
    belt: M(0xffffff, { map: tex.belt, rough: 0.7 }), crack: M(0xc8c0c0, { map: tex.crack, rough: 0.6, emissive: 0x3a1200 }),
    glass: M(0x9fe8ff, { additive: true, opacity: 0.12 }), sign: M(0xffffff, { map: tex.sign, rough: 0.6, emissive: 0x201400 }),
  };
  const D = 1.1;                                                  // depth of the gameplay plane's structures
  // ------------------------------------------------------------ platforms
  const conveyors = [], lifts = [], collapses = [], movers = [];
  for (const [i, p] of L.plats.entries()) {
    const len = Math.hypot(p.x1 - p.x0, p.y1 - p.y0), ang = Math.atan2(p.y1 - p.y0, p.x1 - p.x0), cx = (p.x0 + p.x1) / 2, cy = (p.y0 + p.y1) / 2;
    if (p.kind === 'girder') {
      // a truss girder: top and bottom chords with a zig-zag web, rivets on the face
      const H = 0.62, n = Math.max(2, Math.round(len / 0.9));
      const local = [];
      local.push([mat.girder, place(box(len, 0.13, D), 0, -0.065, 0)]);
      local.push([mat.girder, place(box(len, 0.11, D * 0.8), 0, -H + 0.055, 0)]);
      for (let k = 0; k < n; k++) {
        const x0 = -len / 2 + (k + 0.5) * len / n, dx = len / n / 2;
        const a = Math.atan2(H - 0.2, dx) * (k % 2 ? 1 : -1);
        for (const z of [D / 2 - 0.08, -D / 2 + 0.08]) local.push([mat.girderDk, place(box(Math.hypot(dx, H - 0.2) + 0.06, 0.09, 0.07), x0, -H / 2, z, a)]);
      }
      for (let x = -len / 2 + 0.3; x < len / 2; x += 0.6) local.push([mat.rivet, place(new THREE.SphereGeometry(0.035, 6, 4), x, -0.06, D / 2 + 0.01)]);
      for (const [m, geo] of local) { geo.rotateZ(ang); geo.translate(cx, cy, 0); B.add(m, geo); }
    } else if (p.kind === 'steel' || p.kind === 'ledge') {
      const geo = place(box(len, 0.34, D), 0, -0.17, 0); geo.rotateZ(ang); geo.translate(cx, cy, 0); B.add(mat.steel, geo);
      const edge = place(box(len, 0.16, 0.05), 0, -0.2, D / 2 + 0.03); edge.rotateZ(ang); edge.translate(cx, cy, 0); B.add(mat.hazard, edge);
      const lip = place(box(len, 0.04, 0.06), 0, -0.01, D / 2 + 0.03); lip.rotateZ(ang); lip.translate(cx, cy, 0); B.add(mat.lip, lip);
      if (p.kind === 'ledge') { for (let x = p.x0 + 0.3; x <= p.x1; x += 1.2) B.add(mat.pipe, place(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), x, cy + 0.45, -D / 2 + 0.1)); B.add(mat.pipe, place(box(len, 0.05, 0.05), cx, cy + 0.9, -D / 2 + 0.1)); }
      if (!p.boss && cy > 0.5) for (const x of [p.x0 + 0.15, p.x1 - 0.15]) B.add(mat.steelDk, place(box(0.12, 0.5, D * 0.9), x, cy - 0.45, 0));
    } else if (p.kind === 'ground') {
      const geo = place(box(len + 0.2, 3, D + 0.6), 0, -1.5, 0); geo.rotateZ(ang); geo.translate(cx, cy, 0); B.add(mat.ground, geo);
      const top = place(box(len, 0.08, D + 0.62), 0, -0.04, 0); top.rotateZ(ang); top.translate(cx, cy, 0); B.add(mat.steelDk, top);
    } else if (p.kind === 'conveyor') {
      const geo = place(box(len, 0.24, D), cx, cy - 0.14, 0); B.add(mat.steelDk, geo);
      const beltTex = tex.belt.clone(); beltTex.needsUpdate = true; beltTex.repeat.set(len / 0.8, 1);
      const bm = M(0xffffff, { map: beltTex, rough: 0.7 });
      const belt = new THREE.Mesh(new THREE.BoxGeometry(len - 0.1, 0.04, D - 0.1), bm); belt.position.set(cx, cy - 0.01, 0); g.add(belt);
      if (p.conv < 0) beltTex.rotation = Math.PI, beltTex.center.set(0.5, 0.5);
      for (const x of [p.x0, p.x1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, D, 12), mat.pipe); r.rotation.x = Math.PI / 2; r.position.set(x, cy - 0.14, 0); g.add(r); }
      conveyors.push({ tex: beltTex, speed: p.conv, len });
    } else if (p.kind === 'collapse') {
      const m = new THREE.Group(); m.position.set(cx, cy, 0); g.add(m);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, D), mat.crack); slab.position.y = -0.15; m.add(slab);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 0.06), M(0xff9a4a, { glow: true })); lip.position.set(0, -0.01, D / 2 + 0.03); m.add(lip);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(len * 0.98, 0.05, D * 0.98), M(0xff6a1a, { additive: true, opacity: 0.0 })); glow.position.y = 0.0; m.add(glow);
      for (const x of [-len / 2 + 0.1, len / 2 - 0.1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, D * 0.6), mat.steelDk); b.position.set(x, -0.3, 0); m.add(b); }
      collapses.push({ i, m, glow, cy });
    } else if (p.kind === 'lift') {
      const m = new THREE.Group(); g.add(m);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, D), mat.steel); deck.position.y = -0.09; m.add(deck);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.05), mat.hazard); edge.position.set(0, -0.14, D / 2 + 0.03); m.add(edge);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 0.06), mat.lip); lip.position.set(0, -0.01, D / 2 + 0.03); m.add(lip);
      for (const x of [-len / 2 + 0.08, len / 2 - 0.08]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.1, 0.07), mat.ladderY); post.position.set(x, 0.55, -D / 2 + 0.1); m.add(post); }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), mat.ladderY); rail.position.set(0, 1.1, -D / 2 + 0.1); m.add(rail);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat.glowA); lamp.position.set(0, -0.2, D / 2); m.add(lamp);
      if (p.loop) { const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 30, 4), mat.chain); cable.position.set(0, 15.2, -0.2); m.add(cable); }
      lifts.push({ i, m });
    }
  }
  // lift shafts in the machine hall
  if (L.id === 'machine') for (const x of [50.9, 57.6, 63.6]) {
    for (const dx of [-1.35, 1.35]) B.add(mat.pipe, place(box(0.16, 15, 0.16), x + dx, 6, -0.7));
    B.add(mat.steelDk, place(box(3.0, 0.4, 1.4), x, 13.6, -0.2));
    const wheel = new THREE.Mesh(gearGeo(0.7, 0.2, 12), mat.brass); wheel.position.set(x, 13.6, 0.5); g.add(wheel); dyn.push(dt => (wheel.rotation.z += dt * 2.3));
  }
  // ------------------------------------------------------------ ladders
  const rungGeo = box(0.62, 0.06, 0.08), railGeo = box(0.07, 1, 0.09);
  const drawLadder = (l, broken = false) => {
    const h = l.y1 - l.y0;
    for (const dx of [-0.32, 0.32]) B.add(broken ? mat.pipeRust : mat.ladderY, place(railGeo, l.x + dx, l.y0 + h / 2, 0.35, 0, 0, 0, 1, h + (broken ? 0 : 0.6), 1));
    for (let y = l.y0 + 0.3; y < l.y1 - 0.05; y += 0.36) B.add(mat.ladder, place(rungGeo, l.x, y, 0.35));
  };
  for (const l of L.ladders) drawLadder(l);
  for (const l of L.brokenLadders || []) drawLadder(l, true);

  // ------------------------------------------------------------ backdrop: sky, far skyline, the fortress wall behind the play plane
  const b = L.bounds, W = b.x1 - b.x0, H = b.y1 - b.y0, mx = (b.x0 + b.x1) / 2, my = (b.y0 + b.y1) / 2;
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color(P.skyTop) }, bot: { value: new THREE.Color(P.skyBot) }, haze: { value: new THREE.Color(P.haze) }, time: { value: 0 }, flash: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 top, bot, haze; uniform float time, flash;
      float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+1.0),f.x), f.y); }
      void main(){ float y = vUv.y; vec3 c = mix(bot, top, smoothstep(0.0, 0.85, y));
        float cl = n(vec2(vUv.x * 6.0 + time * 0.02, y * 3.0)) * 0.6 + n(vec2(vUv.x * 14.0 - time * 0.03, y * 7.0)) * 0.4;
        c += haze * smoothstep(0.45, 0.9, cl) * (1.0 - y) * 0.55;
        c += vec3(1.0, 0.85, 0.9) * flash * (0.35 + cl * 0.4) * (0.4 + y);
        gl_FragColor = vec4(c, 1.0); }`,
    depthWrite: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(W * 6 + 260, H * 3 + 160), skyMat); sky.position.set(mx, my, -70); g.add(sky);
  // far skyline: towers, chimneys and lit windows (instanced)
  {
    const far = M(P.far, { rough: 1 }), n = Math.ceil((W * 3 + 120) / 6);
    const towers = new THREE.InstancedMesh(box(1, 1, 1), far, n * 2), wins = new THREE.InstancedMesh(box(0.35, 0.5, 0.05), M(P.lamp, { glow: true }), 600);
    const m4 = new THREE.Matrix4(); let wi = 0; const r = (() => { let a = 7 + L.id.length; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
    for (let i = 0; i < n * 2; i++) {
      const x = mx - (W * 1.5 + 60) + i * 3 + r() * 2, hgt = 10 + r() * 34 + (i % 7 === 0 ? 20 : 0), w = 2.5 + r() * 5, z = -40 - r() * 14;
      m4.compose(new THREE.Vector3(x, b.y0 - 6 + hgt / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, hgt, 3)); towers.setMatrixAt(i, m4);
      for (let k = 0; k < 4 && wi < 600; k++) if (r() < 0.7) { m4.compose(new THREE.Vector3(x + (r() - 0.5) * w * 0.7, b.y0 - 6 + r() * hgt, z + 1.6), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); wins.setMatrixAt(wi++, m4); }
    }
    wins.count = wi; g.add(towers, wins);
    // chimneys with smoke and a glow at their mouths
    for (let i = 0; i < 6; i++) {
      const x = mx - W * 0.9 + i * (W * 1.8 / 5) + r() * 6, hgt = H * 0.6 + r() * 16, z = -32 - r() * 6;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.5, hgt, 10), far); c.position.set(x, b.y0 + hgt / 2 - 4, z); g.add(c);
      const mouth = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), M(P.accent, { additive: true, opacity: 0.35 })); mouth.position.set(x, b.y0 + hgt - 4, z); g.add(mouth);
      if (fx) fx.addEmitter({ type: 'smoke', x, y: b.y0 + hgt - 3.5, z, rate: light ? 0.6 : 1.6 });
    }
  }
  // the fortress wall behind the gameplay plane: panels, pillars, pipes, turning gears, furnace windows, chains
  {
    const wz = -4.2, wall = place(box(W + 40, H + 30, 0.4), mx, my, wz - 0.2);
    const uv = wall.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (W + 40) / 6, uv.getY(i) * (H + 30) / 6);
    B.add(mat.wall, wall);
    const r = (() => { let a = 99 + L.id.length * 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
    for (let x = b.x0 - 14; x < b.x1 + 14; x += 7) {
      B.add(mat.steelDk, place(box(0.9, H + 30, 0.9), x, my, wz + 0.4));                               // pillars
      for (let y = b.y0; y < b.y1 + 8; y += 8) B.add(mat.rivet, place(new THREE.SphereGeometry(0.08, 6, 4), x, y, wz + 0.88));
    }
    for (let y = b.y0 + 3; y < b.y1 + 6; y += 9) {                                                      // horizontal pipes
      B.add(mat.pipe, place(new THREE.CylinderGeometry(0.28, 0.28, W + 40, 10), mx, y, wz + 1.0, Math.PI / 2));
      B.add(mat.pipeRust, place(new THREE.CylinderGeometry(0.16, 0.16, W + 40, 8), mx, y + 0.7, wz + 1.2, Math.PI / 2));
      for (let x = b.x0 - 10; x < b.x1 + 10; x += 5 + r() * 4) B.add(mat.brass, place(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 10), x, y, wz + 1.0, Math.PI / 2));
    }
    const nGears = Math.max(4, Math.round(W * H / 90));
    for (let i = 0; i < nGears; i++) {
      const rr = 0.9 + r() * 2.4, gm = new THREE.Mesh(gearGeo(rr, 0.3, 8 + Math.round(rr * 4)), r() < 0.5 ? mat.pipe : mat.brass);
      gm.position.set(b.x0 + r() * W, b.y0 + r() * H, wz + 0.6 + r() * 0.6); g.add(gm);
      const sp = (r() < 0.5 ? -1 : 1) * (0.2 + r() * 0.5) / rr; dyn.push(dt => (gm.rotation.z += dt * sp));
    }
    const furnaces = [];
    for (let i = 0; i < Math.max(2, Math.round(W * H / 220)); i++) {                                  // furnace windows
      const x = b.x0 + 2 + r() * (W - 4), y = b.y0 + 2 + r() * (H - 4), fw = 2.2 + r() * 2;
      B.add(mat.dark, place(box(fw + 0.6, 1.6, 0.3), x, y, wz + 0.25));
      const fire = new THREE.Mesh(new THREE.PlaneGeometry(fw, 1.0), M(0xff6a1a, { glow: true })); fire.position.set(x, y, wz + 0.42); g.add(fire);
      for (let k = 0; k < 5; k++) B.add(mat.steelDk, place(box(0.08, 1.1, 0.12), x - fw / 2 + (k + 0.5) * fw / 5, y, wz + 0.5));
      furnaces.push({ fire, ph: r() * 10 });
    }
    dyn.push((dt, s, t) => { for (const f of furnaces) { const k = 0.75 + 0.25 * Math.sin(t * 7 + f.ph) * Math.sin(t * 3.1 + f.ph); f.fire.material.color.setRGB(k, 0.42 * k, 0.08 * k); } });
    for (let i = 0; i < Math.round(W / 4); i++) {                                                     // hanging chains (behind)
      const x = b.x0 + r() * W, len = 3 + r() * 8, y = b.y1 + 2 - len / 2;
      for (let k = 0; k < len / 0.3; k++) { const l = place(new THREE.TorusGeometry(0.12, 0.035, 5, 8), x, b.y1 + 2 - k * 0.3, -2.4, 0, k % 2 ? Math.PI / 2 : 0); B.add(mat.chain, l); }
    }
    // signage stencils on the wall
    for (let i = 0; i < Math.max(2, Math.round(W / 22)); i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), mat.sign); s.position.set(b.x0 + 3 + r() * (W - 6), b.y0 + 3 + r() * (H - 6), wz + 0.45); g.add(s); }
  }
  B.build(g);

  // ------------------------------------------------------------ lights
  const lights = [];
  if (!light) {
    const key = new THREE.DirectionalLight(0xffe2cc, 2.4); key.position.set(-8, 14, 12); g.add(key); g.add(key.target); key.target.position.set(0, 0, 0);
    const rim = new THREE.DirectionalLight(0x6fa8ff, 1.1); rim.position.set(6, 8, -10); g.add(rim);
    const n = Math.min(4, Math.max(2, Math.round(W * H / 260)));
    for (let i = 0; i < n; i++) {
      const pl = new THREE.PointLight(P.accent, 70, 20, 1.5); pl.position.set(b.x0 + (i + 0.5) * W / n, b.y0 + (i % 2 ? 0.66 : 0.33) * H, -1.5); g.add(pl); lights.push(pl);
    }
  }
  const amb = new THREE.HemisphereLight(0x9aa0b8, 0x3a2018, light ? 2.6 : 1.5); g.add(amb);

  // ------------------------------------------------------------ hazards
  const vents = (L.vents || []).map(v => {
    const m = new THREE.Group(); m.position.set(v.x, v.y, 0); g.add(m);
    const grate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), mat.steelDk); grate.position.y = 0.04; m.add(grate);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 10), mat.pipeRust); pipe.position.set(0, -0.7, -0.3); m.add(pipe);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M(0xff2414, { glow: true })); lamp.position.set(0.45, 0.12, 0.45); m.add(lamp);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 2.8, 12, 1, true), M(v.crimson ? 0xff2414 : 0xd8dce6, { additive: true, opacity: 0 })); col.position.y = 1.4; m.add(col);
    return { v, m, lamp, col };
  });
  const crushers = (L.crushers || []).map(c => {
    const m = new THREE.Group(); m.position.set(c.x, 0, 0); g.add(m);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(c.w + 0.5, 1.2, D + 0.4), mat.steelDk); housing.position.y = c.top + 2.0; m.add(housing);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(c.w + 0.52, 0.25, D + 0.42), mat.hazard); stripe.position.y = c.top + 1.5; m.add(stripe);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1, 10), mat.ladder); m.add(rod);
    const head = new THREE.Group(); m.add(head);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(c.w, 1.0, D + 0.2), c.press ? mat.pipe : mat.girder); hb.position.y = 0.5; head.add(hb);
    const hs = new THREE.Mesh(new THREE.BoxGeometry(c.w + 0.02, 0.22, D + 0.22), mat.hazard); hs.position.y = 0.12; head.add(hs);
    for (let k = 0; k < Math.round(c.w / 0.4); k++) { const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 4), mat.ladder); tooth.rotation.x = Math.PI; tooth.position.set(-c.w / 2 + 0.2 + k * 0.4, -0.1, 0); head.add(tooth); }
    const warn = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), M(0xff2414, { glow: true })); warn.position.set(0, c.top + 2.0, D / 2 + 0.25); m.add(warn);
    return { c, m, head, rod, warn };
  });
  const lasers = (L.lasers || []).map(l => {
    const m = new THREE.Group(); g.add(m);
    for (const x of [l.x0 - 0.25, l.x1 + 0.25]) {
      const em = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.7), mat.steelDk); em.position.set(x, l.y, 0); m.add(em);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), M(0xff2414, { glow: true })); lens.position.set(x + (x < l.x0 ? 0.25 : -0.25), l.y, 0); m.add(lens);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.16), mat.steelDk); post.position.set(x, l.y - 0.85, -0.1); m.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(l.x1 - l.x0 + 0.3, 0.12, 0.12), M(0xff3020, { additive: true, opacity: 1 })); beam.position.set((l.x0 + l.x1) / 2, l.y, 0); m.add(beam);
    const halo = new THREE.Mesh(new THREE.BoxGeometry(l.x1 - l.x0 + 0.3, 0.5, 0.5), M(0xff2414, { additive: true, opacity: 0.3 })); halo.position.copy(beam.position); m.add(halo);
    return { l, beam, halo };
  });
  // slag pits and the rising Surge
  const lavaMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, c1: { value: new THREE.Color(0xff3a0a) }, c2: { value: new THREE.Color(0xffc040) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float time; uniform vec3 c1, c2;
      float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+1.0),f.x), f.y); }
      void main(){ vec2 p = vUv * vec2(30.0, 3.0); float v = n(p + vec2(time * 0.3, 0.0)) * 0.6 + n(p * 2.3 - vec2(0.0, time * 0.5)) * 0.4;
        vec3 c = mix(c1 * 0.5, c2, smoothstep(0.45, 0.85, v)); gl_FragColor = vec4(c * (0.8 + 0.4 * vUv.y), 1.0); }`,
    fog: false,
  });
  for (const pit of L.pits || []) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(pit.x1 - pit.x0, 1.6, D + 2), lavaMat); s.position.set((pit.x0 + pit.x1) / 2, pit.y - 1.0, 0); g.add(s);
    if (fx) fx.addEmitter({ type: 'ember', x0: pit.x0, x1: pit.x1, y: pit.y, z: 0, rate: light ? 4 : 10 });
    if (!light) { const pl = new THREE.PointLight(0xff5a1a, 40, 14, 1.5); pl.position.set((pit.x0 + pit.x1) / 2, pit.y + 2, 1); g.add(pl); }
  }
  let surge = null;
  if (L.surge) {
    const sm = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } }, transparent: true, depthWrite: false, fog: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec2 vUv; uniform float time;
        float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
        void main(){ float y = vUv.y; vec2 g = vec2(vUv.x * 60.0 - time * 3.0, y * 40.0); float s = h(floor(g));
          float px = step(0.8, s) * step(0.15, fract(g.x)) * step(0.15, fract(g.y));
          float edge = smoothstep(0.93, 1.0, y) * (0.7 + 0.3 * sin(vUv.x * 40.0 + time * 4.0));
          vec3 c = vec3(1.0, 0.08, 0.04) * (0.35 + 0.5 * y) + vec3(1.0, 0.45, 0.1) * (px * 0.6 + edge * 1.4);
          gl_FragColor = vec4(c, 0.55 + 0.45 * y); }`,
    });
    surge = new THREE.Mesh(new THREE.PlaneGeometry(W + 30, 30), sm); surge.position.set(mx, 0, 1.4); g.add(surge);
  }
  // the crucible (stage 1), hoppers (stage 2), furnaces (boss)
  if (L.crucible) {
    const c = L.crucible, m = new THREE.Group(); m.position.set(c.x, c.y, 0); g.add(m);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.65, 1.4, 16, 1, true), mat.pipe); pot.position.y = 0.7; m.add(pot);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.1, 8, 20), mat.brass); rim.rotation.x = Math.PI / 2; rim.position.y = 1.4; m.add(rim);
    const fire = new THREE.Mesh(new THREE.CircleGeometry(0.8, 16), M(0xff7a1a, { glow: true })); fire.rotation.x = -Math.PI / 2; fire.position.y = 1.3; m.add(fire);
    const label = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.05), mat.hazard); label.position.set(0, 0.6, 0.8); m.add(label);
    if (fx) fx.addEmitter({ type: 'fire', x: c.x, y: c.y + 1.4, z: 0, rate: light ? 6 : 16, spread: 0.6 });
  }
  const hoppers = (L.hoppers || []).map(h => {
    const m = new THREE.Group(); m.position.set(h.x, h.y, 0); g.add(m);
    const chute = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.6, 1.6, 10), mat.pipe); chute.position.y = 0.6; m.add(chute);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), M(0xffb21a, { glow: true })); lamp.position.set(0, -0.3, 0.6); m.add(lamp);
    B.add(mat.steelDk, place(box(0.3, 8, 0.3), h.x, h.y + 4.5, -0.6));
    return { h, lamp };
  });
  for (const f of L.furnaces || []) {
    const x = (f.x0 + f.x1) / 2, m = new THREE.Mesh(new THREE.BoxGeometry(f.x1 - f.x0 + 0.4, 2.4, D + 0.8), M(0xff5a10, { glow: true })); m.position.set(x, -0.1, -0.3); g.add(m);
    const arch = new THREE.Mesh(new THREE.BoxGeometry(f.x1 - f.x0 + 1, 0.6, D + 1.2), mat.steelDk); arch.position.set(x, 2.6, 0); g.add(arch);
    if (fx) fx.addEmitter({ type: 'fire', x, y: 0.4, z: 0, rate: light ? 8 : 20, spread: 0.6 });
  }
  // boss: couplings with cables to the Warden's platform
  const couplings = (L.couplings || []).map((c, i) => {
    const m = new THREE.Group(); m.position.set(c.x, c.y, 0); g.add(m);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.9), M(0xff2414, { glow: true })); plate.position.y = 0.03; m.add(plate);
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.5), mat.steelDk); clamp.position.set(0, 0.45, -0.55); m.add(clamp);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 8, 14), mat.brass); coil.position.set(0, 0.6, -0.28); m.add(coil);
    const tx = L.boss.x + (c.x < L.boss.x ? -3.2 : 3.2) * (i % 2 ? 0.6 : 1), ty = L.boss.y - 0.3;
    const dx = tx - c.x, dy = ty - (c.y + 0.9), len = Math.hypot(dx, dy);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 6), M(0xff2414, { glow: true })); cable.position.set(c.x + dx / 2, c.y + 0.9 + dy / 2, -0.5); cable.rotation.z = Math.atan2(dy, dx) - Math.PI / 2; g.add(cable);
    return { c, plate, cable, m };
  });
  let bossDeck = null;
  if (L.boss) {
    const p = L.plats.find(q => q.boss);
    bossDeck = new THREE.Group(); g.add(bossDeck);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(p.x1 - p.x0, 0.5, D + 1), mat.girder); deck.position.set((p.x0 + p.x1) / 2, p.y0 - 0.25, 0); bossDeck.add(deck);
    const st = new THREE.Mesh(new THREE.BoxGeometry(p.x1 - p.x0, 0.12, D + 1.02), mat.hazard); st.position.set((p.x0 + p.x1) / 2, p.y0 - 0.45, 0); bossDeck.add(st);
  }
  // checkpoints: beacons that light gold when reached
  const beacons = L.checkpoints.slice(1).map((c, i) => {
    const m = new THREE.Group(); m.position.set(c.x, c.y, -0.35); g.add(m);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.0, 8), mat.pipe); pole.position.y = 1.0; m.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), M(0x5a5a62, { rough: 0.3 })); lamp.position.y = 2.1; m.add(lamp);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), M(0x2a2a30, { rough: 0.6, side: THREE.DoubleSide })); flag.position.set(0.38, 1.7, 0); m.add(flag);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), M(0xffc23a, { additive: true, opacity: 0 })); halo.position.y = 2.1; m.add(halo);
    return { i: i + 1, lamp, flag, halo, on: false };
  });
  // stage 2 exit: a lift door
  if (L.id === 'machine') {
    const gx = L.goal.x + L.goal.w / 2, door = new THREE.Group(); door.position.set(gx, 0, -0.7); g.add(door);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(L.goal.w + 0.8, 4.2, 0.4), mat.steelDk); frame.position.y = 2.1; door.add(frame);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(L.goal.w, 3.4), M(0xffc860, { glow: true })); inner.position.set(0, 1.7, 0.21); door.add(inner);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.6, 3), M(0x40ff80, { glow: true })); arrow.position.set(0, 4.0, 0.3); door.add(arrow);
    dyn.push((dt, s, t) => { arrow.position.y = 4.0 + Math.sin(t * 4) * 0.12; });
  }

  // ------------------------------------------------------------ items
  const gearItemGeo = gearGeo(0.32, 0.12, 9);
  const itemMats = {
    gear: M(0xffc23a, { metal: 0.8, rough: 0.25, emissive: 0x5a3a00 }), keep: M(0x21e0d0, { emissive: 0x0a6a64, rough: 0.3 }),
    gauntlet: M(0xff7a1a, { emissive: 0xb03a00, rough: 0.35, metal: 0.5 }), life: M(0xff2a4a, { emissive: 0x80101e, rough: 0.35 }),
  };
  const heart = (() => { const s = new THREE.Shape(); s.moveTo(0, -0.3); s.bezierCurveTo(0.45, 0.05, 0.25, 0.4, 0, 0.18); s.bezierCurveTo(-0.25, 0.4, -0.45, 0.05, 0, -0.3); const g2 = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }); g2.translate(0, 0, -0.06); return g2; })();
  const keepGeos = [
    (() => { const a = place(box(0.1, 0.5, 0.08), 0, -0.05, 0), b2 = place(new THREE.TorusGeometry(0.12, 0.045, 6, 12, Math.PI * 1.4), 0, 0.25, 0, 0.6); return mergeGeometries([a.toNonIndexed(), b2.toNonIndexed()]); })(),
    (() => mergeGeometries([place(new THREE.TorusGeometry(0.13, 0.045, 8, 14), -0.15, 0, 0).toNonIndexed(), place(new THREE.TorusGeometry(0.13, 0.045, 8, 14), 0.15, 0, 0).toNonIndexed(), place(box(0.12, 0.05, 0.05), 0, 0.02, 0).toNonIndexed()]))(),
    (() => mergeGeometries([place(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16), 0, 0, 0, 0, 0, Math.PI / 2).toNonIndexed(), place(new THREE.TorusGeometry(0.06, 0.02, 6, 10), 0, 0.26, 0).toNonIndexed()]))(),
  ];
  const items = new Map();
  const itemMesh = it => {
    let m;
    if (it.type === 'gear') m = new THREE.Mesh(gearItemGeo, itemMats.gear);
    else if (it.type === 'keep') m = new THREE.Mesh(keepGeos[it.id % 3], itemMats.keep);
    else if (it.type === 'gauntlet') { m = new THREE.Group(); const f = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.4), itemMats.gauntlet); m.add(f); const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.3, 10), mat.pipe); cuff.position.y = -0.3; m.add(cuff); }
    else m = new THREE.Mesh(heart, itemMats.life);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glowDot, color: it.type === 'gear' ? 0xffc23a : it.type === 'keep' ? 0x21e0d0 : it.type === 'life' ? 0xff2a4a : 0xff7a1a, blending: THREE.AdditiveBlending, transparent: true, opacity: it.type === 'gear' ? 0.35 : 0.7, depthWrite: false, fog: false }));
    halo.scale.setScalar(it.type === 'gear' ? 1.1 : 1.8);
    const holder = new THREE.Group(); holder.add(m, halo); holder.position.set(it.x, it.y, 0.1); g.add(holder);
    return { holder, m };
  };

  // ------------------------------------------------------------ drums, Volts, shockwaves, the beam (pooled by id)
  const drumGeo = (() => { const c = new THREE.CylinderGeometry(T.drumR, T.drumR, 0.9, 18); c.rotateX(Math.PI / 2); return c; })();
  const bandGeo = (() => { const c = new THREE.TorusGeometry(T.drumR + 0.01, 0.05, 6, 20); return c; })();
  const drumMats = { normal: M(0x3a3e48, { metal: 0.7, rough: 0.35 }), crimson: M(0x5a0d0a, { metal: 0.5, rough: 0.4, emissive: 0x3a0402 }), bounce: M(0x2a2a30, { metal: 0.6, rough: 0.4 }) };
  const bandMats = { normal: M(0xff7a1a, { glow: true }), crimson: M(0xff2414, { glow: true }), bounce: M(0xffd23a, { glow: true }) };
  const drums = new Map(), bugs = new Map();
  const makeDrum = d => {
    const m = new THREE.Group(), body = new THREE.Mesh(drumGeo, drumMats[d.kind]); m.add(body);
    for (const z of [-0.3, 0, 0.3]) { const band = new THREE.Mesh(bandGeo, bandMats[d.kind]); band.position.z = z; m.add(band); }
    const capm = new THREE.Mesh(new THREE.CircleGeometry(T.drumR * 0.7, 12), bandMats[d.kind]); capm.position.z = 0.46; m.add(capm);
    if (d.kind === 'bounce') for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 5), mat.ladder); const a = k / 6 * TAU; sp.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0); sp.rotation.z = a - Math.PI / 2; m.add(sp); }
    g.add(m); return m;
  };
  const makeBug = () => {
    const m = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), M(0x7ad8ff, { glow: true })); core.position.y = 0.42; m.add(core);
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), M(0x1a2a4a, { metal: 0.6, rough: 0.3, flat: true })); shell.position.y = 0.42; m.add(shell);
    for (const z of [0.14, -0.14]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M(0xffffff, { glow: true })); e.position.set(0.3, 0.5, z); m.add(e); }
    for (let k = 0; k < 5; k++) { const leg = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.4, 4), M(0x7ad8ff, { glow: true })); const a = -0.3 - k * 0.6; leg.position.set(Math.cos(a) * 0.3, 0.42 + Math.sin(a) * 0.3, 0); leg.rotation.z = a + Math.PI / 2; m.add(leg); }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glowDot, color: 0x5ac8ff, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.7, depthWrite: false, fog: false })); halo.scale.setScalar(1.6); halo.position.y = 0.42; m.add(halo);
    g.add(m); return { m, core, shell };
  };
  const waveMeshes = [], waveMat = M(0xff7a1a, { additive: true, opacity: 0.9 });
  const beamMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.22, 0.25), M(0xff2414, { additive: true, opacity: 1 })); beamMesh.visible = false; g.add(beamMesh);
  const beamHalo = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.8), M(0xff2414, { additive: true, opacity: 0.35 })); beamHalo.visible = false; g.add(beamHalo);
  const tellLine = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 0.04), M(0xff5040, { additive: true, opacity: 0.8 })); tellLine.visible = false; g.add(tellLine);

  // ------------------------------------------------------------ per-frame update
  function update(dt, s, t) {
    for (const f of dyn) f(dt, s, t);
    skyMat.uniforms.time.value = t; lavaMat.uniforms.time.value = t;
    if (L.id === 'ascent') {                                     // storm: a soft sky flash now and then (never faster than ~1 a second)
      const k = (t % 7.3) / 7.3; skyMat.uniforms.flash.value = k > 0.95 ? (1 - (k - 0.95) / 0.05) * 0.6 : 0;
    }
    for (const c of conveyors) c.tex.offset.x = (c.tex.offset.x + dt * Math.abs(c.speed) / 0.8) % 1;
    for (const li of lifts) { const p = s.plats[li.i]; li.m.position.set((p.x0 + p.x1) / 2, p.y0, 0); li.m.visible = !(p.loop && (p.y0 < p.loop.y0 + 0.2)); }
    for (const c of collapses) {
      const p = s.plats[c.i];
      if (p.col === 'idle') { c.m.visible = true; c.m.position.set((p.x0 + p.x1) / 2, c.cy, 0); c.m.rotation.z = 0; c.glow.material.opacity = 0.0; }
      else if (p.col === 'shake') { c.m.position.x = (p.x0 + p.x1) / 2 + Math.sin(t * 70) * 0.05; c.glow.material.opacity = 0.3 + p.ct; }
      else if (p.col === 'fall') { c.m.position.y = c.cy - p.ct * p.ct * 9; c.m.rotation.z = p.ct * 0.8; c.glow.material.opacity = 0.6; }
      else c.m.visible = false;
    }
    for (const v of vents) {
      const st = ventState(v.v, s.t);
      v.lamp.material.color.setHex(st === 'off' ? 0x401010 : 0xff2414);
      v.col.material.opacity = st === 'on' ? 0.35 + 0.1 * Math.sin(t * 30) : 0;
      if (fx && st === 'on') fx.emit(v.v.crimson ? 'energy' : 'steam', v.v.x, v.v.y + 0.2, 0, light ? 1 : 3, { vy: 6, spread: 0.3 });
      if (fx && st === 'warn' && Math.random() < 0.3) fx.emit('hiss', v.v.x, v.v.y + 0.2, 0, 1, {});
    }
    const slow = s.sabotaged ? 1.7 : 1;
    for (const c of crushers) {
      const { yb, st } = crusherState(c.c, s.t, c.c.press ? slow : 1);
      c.head.position.y = yb; c.rod.position.y = (yb + 1 + c.c.top + 1.5) / 2; c.rod.scale.y = Math.max(0.1, c.c.top + 1.5 - yb - 1 + 0.5);
      c.head.position.x = st === 'warn' ? Math.sin(t * 60) * 0.04 : 0;
      c.warn.material.color.setHex(st === 'warn' || st === 'slam' ? 0xff2414 : 0x3a1010);
    }
    for (const l of lasers) {
      const st = laserState(l.l, s.t);
      l.beam.visible = st !== 'off'; l.halo.visible = st === 'on';
      l.beam.scale.y = l.beam.scale.z = st === 'on' ? 1.4 + Math.sin(t * 40) * 0.2 : 0.25;
      l.beam.material.opacity = st === 'on' ? 1 : (Math.sin(t * TAU * 2.5) > 0 ? 0.7 : 0.15);     // warn: 2.5 Hz blink
    }
    if (surge) { surge.position.y = s.surgeY - 15; surge.material.uniforms.time.value = t; }
    for (const h of hoppers) h.lamp.material.color.setHex(h.h.warnState ? 0xffb21a : 0x3a2a10);
    s.hoppers.forEach((hp, i) => hoppers[i] && hoppers[i].lamp.material.color.setHex(hp.warn ? 0xffd23a : 0x3a2a10));
    couplings.forEach((c, i) => {
      const done = s.boss && s.boss.done[i];
      c.plate.material.color.setHex(done ? 0x2a2a2a : (Math.sin(t * 5 + i) > 0 ? 0xff3a20 : 0xc01a10));
      c.cable.visible = !done;
    });
    if (bossDeck && s.boss) { const d = s.boss.state === 'defeat' ? Math.min(1, s.boss.t / 1.2) : 0; bossDeck.position.y = -d * d * 16; bossDeck.rotation.z = d * 0.4; }
    for (const bc of beacons) { const on = s.cp >= bc.i; if (on !== bc.on) { bc.on = on; bc.lamp.material.color.setHex(on ? 0xffd23a : 0x5a5a62); bc.flag.material.color.setHex(on ? 0xd8231a : 0x2a2a30); } bc.halo.material.opacity = on ? 0.4 + 0.15 * Math.sin(t * 3) : 0; bc.flag.rotation.y = Math.sin(t * 3 + bc.i) * 0.2; }
    // items
    for (const it of s.items) {
      let e = items.get(it); if (!e && !it.got) { e = itemMesh(it); items.set(it, e); }
      if (!e) continue;
      e.holder.visible = !it.got;
      if (!it.got) { e.m.rotation.y = t * (it.type === 'gear' ? 2.2 : 1.5) + it.i; e.holder.position.y = it.y + Math.sin(t * 3 + it.i) * 0.08; }
    }
    // drums
    const seen = new Set();
    for (const d of s.drums) {
      let m = drums.get(d.id); if (!m) { m = makeDrum(d); drums.set(d.id, m); }
      seen.add(d.id); m.position.set(d.x, d.y + T.drumR, 0); m.rotation.z = -d.spin;
    }
    for (const [id, m] of drums) if (!seen.has(id)) { g.remove(m); drums.delete(id); }
    seen.clear();
    for (const b of s.bugs) {
      let e = bugs.get(b.id); if (!e) { e = makeBug(); bugs.set(b.id, e); }
      seen.add(b.id); e.m.position.set(b.x, b.y, 0.1); e.m.rotation.y = b.dir > 0 ? 0 : Math.PI; e.core.scale.setScalar(0.85 + 0.25 * Math.abs(Math.sin(t * 14 + b.id)));
      e.shell.rotation.x += dt * 5; e.m.position.y += Math.abs(Math.sin(t * 10 + b.id)) * 0.08;
      if (fx && Math.random() < 0.25) fx.emit('spark', b.x, b.y + 0.4, 0.1, 1, { color: 0x7ad8ff });
    }
    for (const [id, e] of bugs) if (!seen.has(id)) { g.remove(e.m); bugs.delete(id); }
    while (waveMeshes.length < s.waves.length) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 6, 14, Math.PI), waveMat); g.add(w); waveMeshes.push(w); }
    waveMeshes.forEach((w, i) => {
      const wv = s.waves[i]; w.visible = !!wv; if (!wv) return;
      const p = s.plats[wv.plat]; w.position.set(wv.x, platY(p, wv.x), 0); w.scale.set(1, 1 + Math.sin(t * 30) * 0.15, 1.6);
    });
    const B2 = s.boss;
    beamMesh.visible = beamHalo.visible = tellLine.visible = false;
    if (B2 && B2.beam) {
      const p = s.plats[B2.beam.plat], x0 = B2.beam.x0, x1 = B2.beam.x1, xm = (x0 + x1) / 2, y = platY(p, xm) + 0.55;
      if (B2.beam.on) { beamMesh.visible = beamHalo.visible = true; beamMesh.position.set(xm, y, 0); beamMesh.scale.x = beamHalo.scale.x = x1 - x0; beamHalo.position.copy(beamMesh.position); beamMesh.scale.y = 1 + Math.sin(t * 50) * 0.2; }
      else { tellLine.visible = Math.sin(t * TAU * 2.5) > -0.3; tellLine.position.set(xm, y, 0); tellLine.scale.x = x1 - x0; }
    }
  }
  return { group: g, update, palette: P, lights, skyMat };
}

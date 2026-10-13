// RAMPAGE: SAVE LILLY — particles: two pooled point clouds (additive glow and soft smoke) driven on the CPU.
import * as THREE from 'three';

const VERT = `attribute float size; attribute float alpha; attribute vec3 tint; varying float vA; varying vec3 vC; uniform float pxScale;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * pxScale / max(0.1, -mv.z); vA = alpha; vC = tint; }`;
const FRAG = `varying float vA; varying vec3 vC; uniform float soft;
void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; if (r > 1.0) discard; float a = mix(1.0 - r * r, smoothstep(1.0, 0.0, r) * (1.0 - r * 0.5), soft); gl_FragColor = vec4(vC, a * vA); }`;

class Cloud {
  constructor(n, additive) {
    this.n = n; this.live = 0;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.c = new Float32Array(n * 3);
    this.s = new Float32Array(n); this.a = new Float32Array(n); this.life = new Float32Array(n); this.age = new Float32Array(n);
    this.grow = new Float32Array(n); this.drag = new Float32Array(n); this.grav = new Float32Array(n); this.s0 = new Float32Array(n); this.a0 = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    this.posA = new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage);
    this.colA = new THREE.BufferAttribute(this.c, 3).setUsage(THREE.DynamicDrawUsage);
    this.sizeA = new THREE.BufferAttribute(this.s, 1).setUsage(THREE.DynamicDrawUsage);
    this.alphaA = new THREE.BufferAttribute(this.a, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.posA); g.setAttribute('tint', this.colA); g.setAttribute('size', this.sizeA); g.setAttribute('alpha', this.alphaA);
    g.setDrawRange(0, 0); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { pxScale: { value: 400 }, soft: { value: additive ? 0 : 1 } },
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = additive ? 5 : 4;
  }
  spawn(x, y, z, vx, vy, vz, col, size, life, o = {}) {
    if (this.live >= this.n) return;
    const i = this.live++, k = i * 3;
    this.p[k] = x; this.p[k + 1] = y; this.p[k + 2] = z; this.v[k] = vx; this.v[k + 1] = vy; this.v[k + 2] = vz;
    this.c[k] = col.r; this.c[k + 1] = col.g; this.c[k + 2] = col.b;
    this.s[i] = this.s0[i] = size; this.a[i] = this.a0[i] = o.alpha ?? 1; this.life[i] = life; this.age[i] = 0;
    this.grow[i] = o.grow ?? 0; this.drag[i] = o.drag ?? 0.5; this.grav[i] = o.grav ?? 0;
  }
  update(dt) {
    for (let i = 0; i < this.live; i++) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {                          // swap-remove
        const j = --this.live, ki = i * 3, kj = j * 3;
        for (let q = 0; q < 3; q++) { this.p[ki + q] = this.p[kj + q]; this.v[ki + q] = this.v[kj + q]; this.c[ki + q] = this.c[kj + q]; }
        for (const arr of [this.s, this.a, this.life, this.age, this.grow, this.drag, this.grav, this.s0, this.a0]) arr[i] = arr[j];
        i--; continue;
      }
      const k = i * 3, dr = Math.max(0, 1 - this.drag[i] * dt);
      this.v[k + 1] -= this.grav[i] * dt; this.v[k] *= dr; this.v[k + 1] *= dr; this.v[k + 2] *= dr;
      this.p[k] += this.v[k] * dt; this.p[k + 1] += this.v[k + 1] * dt; this.p[k + 2] += this.v[k + 2] * dt;
      const u = this.age[i] / this.life[i];
      this.s[i] = this.s0[i] * (1 + this.grow[i] * u); this.a[i] = this.a0[i] * (1 - u) * (u < 0.1 ? u * 10 : 1);
    }
    this.points.geometry.setDrawRange(0, this.live);
    this.posA.needsUpdate = this.colA.needsUpdate = this.sizeA.needsUpdate = this.alphaA.needsUpdate = true;
  }
}

export function createFx(light) {
  const glow = new Cloud(light ? 360 : 1100, true), soft = new Cloud(light ? 160 : 420, false);
  const group = new THREE.Group(); group.add(soft.points, glow.points);
  const emitters = [], col = new THREE.Color(), R = Math.random;
  const C = h => col.setHex(h);
  function emit(type, x, y, z = 0, n = 1, o = {}) {
    for (let i = 0; i < n; i++) {
      switch (type) {
        case 'spark': glow.spawn(x, y, z, (R() - 0.5) * 6, R() * 5 + 1, (R() - 0.5) * 2, C(o.color ?? 0xffa040), 0.12 + R() * 0.1, 0.3 + R() * 0.4, { grav: 14, drag: 1 }); break;
        case 'smash': glow.spawn(x, y, z, (R() - 0.5) * 12, R() * 9, (R() - 0.5) * 4, C(R() < 0.5 ? 0xffd23a : 0xff5a1a), 0.18 + R() * 0.15, 0.4 + R() * 0.5, { grav: 18, drag: 1.2 }); break;
        case 'land': soft.spawn(x + (R() - 0.5) * 0.6, y + 0.05, z + (R() - 0.5) * 0.6, (R() - 0.5) * 3, R() * 0.8, (R() - 0.5), C(0x8a7a70), 0.4, 0.45, { grow: 2.2, drag: 3, alpha: 0.5 }); break;
        case 'steam': soft.spawn(x + (R() - 0.5) * 0.3, y, z + (R() - 0.5) * 0.3, (R() - 0.5) * 0.8, (o.vy ?? 4) * (0.7 + R() * 0.5), (R() - 0.5) * 0.5, C(0xdfe4ee), 0.5, 0.7, { grow: 3, drag: 1.2, alpha: 0.55 }); break;
        case 'hiss': soft.spawn(x + (R() - 0.5) * 0.3, y, z, (R() - 0.5), 1.5 + R(), 0, C(0xc8ccd8), 0.25, 0.4, { grow: 1.5, drag: 2, alpha: 0.4 }); break;
        case 'energy': glow.spawn(x + (R() - 0.5) * 0.4, y, z + (R() - 0.5) * 0.4, (R() - 0.5), (o.vy ?? 5) * (0.7 + R() * 0.5), (R() - 0.5), C(R() < 0.6 ? 0xff2414 : 0xff8a2a), 0.35, 0.55, { grow: 1, drag: 1 }); break;
        case 'fire': glow.spawn(x + (R() - 0.5) * (o.spread ?? 0.5), y, z + (R() - 0.5) * 0.4, (R() - 0.5) * 0.5, 1.5 + R() * 1.8, 0, C(R() < 0.5 ? 0xff7a1a : 0xffc040), 0.4 + R() * 0.3, 0.5 + R() * 0.4, { grow: -0.6, drag: 0.5 }); break;
        case 'ember': glow.spawn(o.x0 !== undefined ? o.x0 + R() * (o.x1 - o.x0) : x + (R() - 0.5) * 2, y, z + (R() - 0.5) * 2, (R() - 0.5) * 0.6, 1 + R() * 2.5, (R() - 0.5) * 0.4, C(R() < 0.7 ? 0xff6a1a : 0xffd060), 0.08 + R() * 0.08, 1.5 + R() * 2, { drag: 0.2 }); break;
        case 'smoke': soft.spawn(x + (R() - 0.5) * 1.2, y, z, 0.4 + R() * 0.6, 1.2 + R(), 0, C(0x2a2224), 2.2, 4 + R() * 2, { grow: 2.5, drag: 0.1, alpha: 0.45 }); break;
        case 'dust': soft.spawn(x + (R() - 0.5) * 1.5, y, z + (R() - 0.5), (R() - 0.5) * 2, R() * 1.2, 0, C(0x6a5a50), 0.6, 0.9, { grow: 2, drag: 2, alpha: 0.5 }); break;
        case 'pickup': glow.spawn(x, y, z, Math.cos(i / n * 6.283) * 3, Math.sin(i / n * 6.283) * 3, 0, C(o.color ?? 0xffd23a), 0.16, 0.45, { drag: 3 }); break;
        case 'firework': { const a = R() * 6.283, b = R() * 2 - 1, sp = 4 + R() * 3, s = Math.sqrt(1 - b * b);
          glow.spawn(x, y, z, Math.cos(a) * s * sp, b * sp, Math.sin(a) * s * sp * 0.4, C(o.color ?? 0xffd23a), 0.22, 1.1 + R() * 0.6, { grav: 3, drag: 1.1 }); break; }
        case 'electric': glow.spawn(x + (R() - 0.5) * (o.w ?? 1), y + (R() - 0.5) * (o.h ?? 1), z, (R() - 0.5) * 4, (R() - 0.5) * 4, 0, C(o.color ?? 0xff3020), 0.2, 0.25, { drag: 2 }); break;
      }
    }
  }
  function addEmitter(e) { emitters.push({ ...e, acc: 0 }); }
  function clearEmitters() { emitters.length = 0; glow.live = 0; soft.live = 0; }
  function update(dt, view) {
    for (const e of emitters) {
      if (view && (Math.abs((e.x ?? (e.x0 + e.x1) / 2) - view.x) > view.w + 30 || Math.abs(e.y - view.y) > view.h + 30)) continue;
      e.acc += e.rate * dt;
      while (e.acc >= 1) { e.acc -= 1; emit(e.type, e.x ?? 0, e.y, e.z, 1, e); }
    }
    glow.update(dt); soft.update(dt);
  }
  function setScale(px) { glow.mat.uniforms.pxScale.value = px; soft.mat.uniforms.pxScale.value = px; }
  return { group, emit, addEmitter, clearEmitters, update, setScale };
}

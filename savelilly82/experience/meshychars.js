// RAMPAGE: SAVE LILLY — the Meshy characters (Jax, Lilly, the Warden) with their animation clips, behind the same small
// interface as the procedural characters in chars.js: { root, update(dt, state) }. chars.js stays as the fallback.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const lerp = (a, b, k) => a + (b - a) * k;
let GLOW = null;
function glowTex() {
  if (GLOW) return GLOW;
  const c = new OffscreenCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); GLOW = new THREE.CanvasTexture(c); return GLOW;
}

function prepare(gltf, { height, light, emissive = 0, inPlace = null }) {
  const model = gltf.scene, box = new THREE.Box3().setFromObject(model);
  const h = box.max.y - box.min.y, s = height / h;
  const inner = new THREE.Group(); inner.add(model);
  inner.rotation.y = Math.PI / 2;                                  // glTF characters face +Z; the game's face +X
  inner.scale.setScalar(s); model.position.y = -box.min.y;
  const root = new THREE.Group(); root.add(inner);
  model.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = false;                                       // skinned meshes move away from their bind-pose bounds
    const m = o.material;
    if (light) {                                                   // software renderer: one cheap lit material
      o.material = new THREE.MeshLambertMaterial({ map: m.map, color: m.color });
    } else {
      if (m.emissiveMap) { m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = emissive; }
      else if (m.emissive) m.emissiveIntensity = emissive;
      m.envMapIntensity = 0.9;
    }
  });
  // in-place clips: the game's physics moves the character, so the root bone keeps its height and ground position
  let rootBone = null; model.traverse(o => { if (o.isBone && !rootBone && !(o.parent && o.parent.isBone)) rootBone = o; });
  if (rootBone && inPlace) for (const clip of gltf.animations) for (const tr of clip.tracks) {
    if (tr.name !== rootBone.name + '.position') continue;
    const v = tr.values, x0 = v[0], y0 = v[1], z0 = v[2], flatY = inPlace.includes(clip.name);
    for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; if (flatY) v[i + 1] = y0; }
  }
  const mixer = new THREE.AnimationMixer(model), actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  const bones = {}; model.traverse(o => { if (o.isBone) bones[o.name] = o; });
  return { root, inner, model, mixer, actions, bones, scale: s };
}
function player(c) {                                               // crossfading clip player
  let cur = null;
  return {
    play(name, { fade = 0.15, once = false, time = null, speed = 1 } = {}) {
      const a = c.actions[name]; if (!a) return null;
      if (cur !== a) {
        a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once;
        if (time !== null) a.time = time;
        a.play(); if (cur) cur.crossFadeTo(a, fade, false); cur = a;
      }
      a.timeScale = speed; return a;
    },
    get current() { return cur; },
  };
}

// ------------------------------------------------------------------------------------------------ JAX
function makeHero(gltf, light) {
  const c = prepare(gltf, { height: 1.7, light, emissive: 0.26, inPlace: ['Regular_Jump'] }), P = player(c);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffa060, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.16, depthWrite: false, fog: false }));
  halo.scale.set(1.5, 2.2, 1); halo.position.set(0, 0.95, -0.35); c.root.add(halo);          // a faint backlight: Jax reads against dark walls
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff7a1a, blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  glow.scale.setScalar(0.5 / c.scale);
  (c.bones['hand.R'] || c.model).add(glow);
  let jumpT = 0, last = '';
  const hero = { root: c.root, kind: 'meshy' };
  hero.update = (dt, s) => {
    const a = s.anim;
    if (a === 'jump' || a === 'fall') {
      if (last !== 'jump' && last !== 'fall') jumpT = 0;
      jumpT += dt;
      const act = P.play('Regular_Jump', { fade: 0.08, speed: 0 });
      if (act) act.time = Math.min(0.9, 0.58 + jumpT * 0.8);         // take-off into the tuck at the top, then hold
    } else if (a === 'run') P.play('Running', { fade: 0.12, speed: Math.max(0.6, Math.min(1.35, Math.abs(s.vx || 0) / 6.4 * 1.15)) });
    else if (a === 'climb') P.play('Ladder_Climb_Loop', { fade: 0.12, speed: Math.abs(s.vy || 0) > 0.1 ? 1.15 : 0 });
    else if (a === 'hurt' || a === 'die') P.play('Hit_Reaction', { fade: 0.06, once: true, speed: 1.2 });
    else if (a === 'win') P.play('Victory_Fist_Pump', { fade: 0.2 });
    else if (a === 'land') P.play('Idle_9', { fade: 0.1 });
    else P.play('Idle_9', { fade: 0.2 });
    last = a;
    c.mixer.update(dt);
    // facing: three-quarters toward the camera; on a ladder, the back to the camera
    const want = a === 'climb' ? Math.PI / 2 : (s.face > 0 ? -0.38 : Math.PI + 0.38);
    c.root.rotation.y = lerp(c.root.rotation.y, want, Math.min(1, dt * 14));
    glow.material.opacity = lerp(glow.material.opacity, s.gauntlet ? 0.75 + 0.2 * Math.sin(s.t * 12) : 0, Math.min(1, dt * 10));
    glow.scale.setScalar((s.gauntlet ? 0.8 : 0.5) / c.scale);
    c.root.visible = !(s.inv && Math.floor(s.t * 10) % 2 === 0 && a !== 'die');
  };
  return hero;
}

// ------------------------------------------------------------------------------------------------ LILLY
function makeLilly(gltf, light) {
  const c = prepare(gltf, { height: 1.48, light, emissive: 0.22, inPlace: [] }), P = player(c);
  const ly = { root: c.root, kind: 'meshy' };
  ly.update = (dt, s) => {
    const m = s.mode;
    if (m === 'run') P.play('Running', { fade: 0.15, speed: 1.1 });
    else if (m === 'hug') P.play('Idle_11', { fade: 0.25 });
    else if (m === 'sabotage' || m === 'lever') P.play('Walking', { fade: 0.2, speed: 1.6 });
    else if (m === 'cheer' || m === 'free' || m === 'wave') P.play('Cheer_with_Both_Hands', { fade: 0.2 });
    else if (m === 'held' || m === 'cage' || m === 'shout') P.play('Cheer_with_Both_Hands', { fade: 0.25, speed: 1.25 });   // waving for help
    else P.play('Idle_11', { fade: 0.25 });
    c.mixer.update(dt);
    const want = (s.face ?? -1) > 0 ? -0.4 : Math.PI + 0.4;
    c.root.rotation.y = lerp(c.root.rotation.y, want, Math.min(1, dt * 8));
  };
  return ly;
}

// ------------------------------------------------------------------------------------------------ THE WARDEN
const WARDEN_CLIP = { idle: 'idle', grab: 'throw', throw: 'throw', pound: 'roar', roar: 'roar', tell: 'slam', slam: 'slam', beam: 'eye_attack', hurt: 'hurt', defeat: 'defeat' };
const ONCE = new Set(['throw', 'slam', 'eye_attack', 'hurt', 'defeat']);
function makeWarden(gltf, light) {
  const c = prepare(gltf, { height: 5.0, light, emissive: 0 }), P = player(c);
  // the crimson cyber eye and the reactor heart glow on top of the model's own texture
  const eye = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff2414, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.6, depthWrite: false, fog: false }));
  const head = c.bones.head || c.model;
  c.root.updateMatrixWorld(true);
  const eyeAt = head.worldToLocal(c.model.localToWorld(new THREE.Vector3(-0.09, 1.78, 0.37)));   // his right eye, model space
  eye.position.copy(eyeAt); head.add(eye);
  const heldAt = new THREE.Vector3();
  const W = { root: c.root, kind: 'meshy', bones: c.bones };
  let lastMode = '';
  W.update = (dt, s) => {
    const m = s.mode, clip = WARDEN_CLIP[m] || 'idle';
    if (m === 'pound' && lastMode !== 'pound') P.play('roar', { fade: 0.15, time: 1.45 });
    else P.play(clip, { fade: clip === 'defeat' ? 0.1 : 0.18, once: ONCE.has(clip), speed: 1 });
    lastMode = m;
    c.mixer.update(dt);
    const anger = s.anger || 0, beat = 0.75 + 0.25 * Math.sin(s.t * (4 + anger * 4));
    const alive = m === 'defeat' ? Math.max(0, 1 - (s.u || 0) * 1.4) : 1;
    eye.material.opacity = (0.45 + anger * 0.25 + (clip === 'eye_attack' ? 0.5 : 0)) * alive * (0.85 + 0.15 * beat);
    eye.scale.setScalar((clip === 'eye_attack' ? 0.5 : 0.24) / c.scale);
    const want = (s.face ?? 1) > 0 ? -0.9 : -(Math.PI - 0.9);
    c.root.rotation.y = lerp(c.root.rotation.y, want, Math.min(1, dt * 4));
  };
  W.handsCenter = (out, space) => {                                // where a lifted drum sits: between the fists
    const l = c.bones['hand.L'], r = c.bones['hand.R'];
    if (!l || !r) return null;
    l.getWorldPosition(heldAt); out.copy(heldAt); r.getWorldPosition(heldAt); out.add(heldAt).multiplyScalar(0.5);
    return space ? space.worldToLocal(out) : out;
  };
  return W;
}

export async function loadMeshyCast(p0, light, progress) {
  const loader = new GLTFLoader(), names = ['jax', 'warden', 'lilly'], got = {};
  let done = 0;
  await Promise.all(names.map(async n => {
    got[n] = await loader.loadAsync(p0.asset(`assets/chars/${n}.glb`));
    done++; if (progress) progress(done / names.length, n);
  }));
  return { hero: makeHero(got.jax, light), lilly: makeLilly(got.lilly, light), warden: makeWarden(got.warden, light) };
}

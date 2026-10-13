// TEST-ONLY dev kit entry (served by devkit-run.cjs --script, never packaged): the three characters large, in a studio,
// cycling through their animations, so their design can be judged up close.
import * as THREE from 'three';
import { buildHero, buildWarden, buildLilly } from './chars.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export default async function start(p0) {
  p0.controls.mode = 'none'; p0.bodies.visible = false;
  const scene = p0.scene, cam = p0.camera, r = p0.renderer;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.3;
  scene.background = new THREE.Color(0x2a1a1c);
  { const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; }
  const M = (color, o = {}) => o.additive ? new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o.opacity ?? 1, blending: THREE.AdditiveBlending, depthWrite: false })
    : o.glow ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0.1, emissive: o.emissive ? new THREE.Color(o.emissive) : undefined, map: o.map || null, flatShading: !!o.flat });
  const key = new THREE.DirectionalLight(0xffe2cc, 2.6); key.position.set(-4, 8, 10); scene.add(key);
  const rim = new THREE.DirectionalLight(0x6fa8ff, 1.4); rim.position.set(5, 6, -8); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x9aa0b8, 0x3a2018, 1.4));
  const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.4, 6), M(0x3a3038)); floor.position.y = -0.2; scene.add(floor);
  const g = new THREE.Group(); scene.add(g); g.position.set(0, 1, 0);
  const hero = buildHero(M), warden = buildWarden(M), lilly = buildLilly(M);
  hero.root.position.set(-4.2, 0, 1); hero.root.scale.setScalar(1.6);
  lilly.root.position.set(4.6, 0, 1); lilly.root.scale.setScalar(1.6);
  warden.root.position.set(0.4, 0, -1);
  g.add(hero.root, warden.root, lilly.root);
  cam.fov = 40; cam.position.set(0, 4.6, 12.5); cam.lookAt(0, 3.2, 0); cam.updateProjectionMatrix();
  const HA = ['idle', 'run', 'jump', 'climb', 'win', 'hurt'], WA = ['idle', 'roar', 'pound', 'grab', 'throw', 'tell', 'slam', 'hurt'], LA = ['held', 'wave', 'cheer', 'shout', 'run', 'sabotage'];
  let t = 0;
  p0.loop(dt => {
    t += dt; const k = Math.floor(t / 2.5);
    const ha = HA[k % HA.length], wa = WA[k % WA.length], la = LA[k % LA.length], u = (t % 2.5) / 2.5;
    hero.update(dt, { anim: ha, t, runPhase: t * 1.4, climbPhase: t * 1.1, face: 1, gauntlet: k % 4 === 3, vx: ha === 'run' ? 6 : 0, vy: 0 });
    
    warden.update(dt, { mode: wa, t, u, anger: 0.5, face: 1 });
    lilly.update(dt, { mode: la, t, face: -1 });
    p0.hud(`hero: ${ha} · warden: ${wa} · lilly: ${la}`);
  });
}

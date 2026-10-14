// TEST-ONLY dev kit entry (devkit-run.cjs --script, never packaged): the Meshy cast at gameplay lighting, cycling animations.
import * as THREE from 'three';
import { loadMeshyCast } from './meshychars.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export default async function start(p0) {
  p0.controls.mode = 'none'; p0.bodies.visible = false;
  const scene = p0.scene, cam = p0.camera, r = p0.renderer;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.35;
  scene.background = new THREE.Color(0x2a1a1c);
  { const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; }
  const key = new THREE.DirectionalLight(0xffe2cc, 2.4); key.position.set(-4, 8, 10); scene.add(key);
  const rim = new THREE.DirectionalLight(0x6fa8ff, 1.2); rim.position.set(5, 6, -8); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x9aa0b8, 0x3a2018, 1.5));
  const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0x3a3038 })); floor.position.y = -0.2; scene.add(floor);
  const cast = await loadMeshyCast(p0, false);
  cast.hero.root.position.set(-4.4, 0, 1); cast.hero.root.scale.setScalar(1.6);
  cast.lilly.root.position.set(4.6, 0, 1); cast.lilly.root.scale.setScalar(1.6);
  cast.warden.root.position.set(0.4, 0, -1);
  scene.add(cast.hero.root, cast.lilly.root, cast.warden.root);
  cam.fov = 40; cam.position.set(0, 4.2, 13); cam.lookAt(0, 2.8, 0); cam.updateProjectionMatrix();
  const HA = ['idle', 'run', 'jump', 'climb', 'win', 'hurt'], WA = ['idle', 'roar', 'grab', 'tell', 'beam', 'hurt', 'pound', 'defeat'], LA = ['held', 'run', 'cheer', 'idle', 'sabotage'];
  let t = 0;
  p0.loop(dt => {
    t += dt; const k = Math.floor(t / 2.5), u = (t % 2.5) / 2.5;
    const ha = HA[k % HA.length], wa = WA[k % WA.length], la = LA[k % LA.length];
    cast.hero.update(dt, { anim: ha, t, face: 1, vx: 6, vy: ha === 'climb' ? 3 : 0, gauntlet: k % 3 === 2 });
    cast.warden.update(dt, { mode: wa, t, u, anger: 0.5, face: 1 });
    cast.lilly.update(dt, { mode: la, t, face: -1 });
    p0.hud(`jax: ${ha} · warden: ${wa} · lilly: ${la}`);
  });
}

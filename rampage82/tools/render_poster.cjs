// Render RAMPAGE's ORIGINAL promotional art (the gladiator broadcast) from the game's own contender model.
// Replaces the concept-image crop on the +Z display. Uses three.js r186 (MIT) and gladiator.js; output is ours.
// PLAYWRIGHT=<path> node rampage82/tools/render_poster.cjs <three vendor dir> <fonts assets dir> <out.png>
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const [VENDOR, ASSETS, OUTPNG] = process.argv.slice(2);
const EXP = path.resolve(__dirname, '..', 'experience');
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}</style>
<script type="importmap">{"imports":{"three":"/three.module.js"}}</script></head><body>
<script type="module">
import * as THREE from 'three';
import { buildGladiator, animateGladiator } from '/gladiator.js';
const W = 800, H = 1536;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.setPixelRatio(1);
r.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(r.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050406);
const cam = new THREE.PerspectiveCamera(30, W / H, .1, 200); cam.position.set(0.6, 0.35, 6.8); cam.lookAt(0, 1.05, 0);
// energy wall behind: the Event Horizon pattern, pouring west
const bg = new THREE.Mesh(new THREE.PlaneGeometry(14, 22), new THREE.ShaderMaterial({ uniforms: { t: { value: 7.3 } },
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: \`uniform float t; varying vec2 vP;
    float h(vec2 v){ vec3 p = fract(vec3(v.xyx) * .1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
    void main(){ vec2 q = vec2(vP.x * 3.4 + t * 4., vP.y * 3.4 + 9.), g = q * vec2(2.2, 2.8); float s = h(floor(g)); vec2 l = fract(g);
      float px = step(.8, s) * step(.13, l.x) * step(.14, l.y);
      float ph = fract((q.x + t * (4. + h(vec2(floor(q.y * 2.8), 2.)) * 3.)) / 13.), tr = pow(ph, 12.) * pow(.5 + .5 * cos(q.y * 17.6), 14.);
      float halo = exp(-dot(vP - vec2(0., 1.8), vP - vec2(0., 1.8)) * .06);
      float halo2 = exp(-dot(vP - vec2(0., 2.2), vP - vec2(0., 2.2)) * .18);
      vec3 c = mix(vec3(1., .05, .02), vec3(1., .45, .08), s) * (px * .45 + tr * 1.4) * (.15 + halo * .9) + vec3(.6, .05, .02) * halo2 * 1.1;
      gl_FragColor = vec4(c, 1.); }\` }));
bg.position.set(0, 2.5, -4); scene.add(bg);
// arena floor with a molten edge (the Surge below)
const fl = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.MeshLambertMaterial({ color: 0x141418 })); fl.rotation.x = -Math.PI / 2; scene.add(fl);
const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.18, 48), new THREE.MeshBasicMaterial({ color: 0xff2414 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .01; scene.add(ring);
// embers
const N = 500, pos = new Float32Array(N * 3); let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < N; i++) { pos[i * 3] = (rnd() - .5) * 7; pos[i * 3 + 1] = rnd() * 5; pos[i * 3 + 2] = (rnd() - .5) * 4 - 1; }
const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
scene.add(new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xff6a30, size: .035, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })));
// the contender, posed: wide stance, sword raised, shield forward
const g = buildGladiator(); scene.add(g); g.rotation.y = -0.35; g.scale.setScalar(1.15);
animateGladiator(g, { speed: 0, grounded: true, cheer: 0 }, 0.016, 0);
const u = g.userData;
u.LL.h.rotation.set(-0.35, 0, 0.18); u.RL.h.rotation.set(0.25, 0, -0.16); u.LL.k.rotation.x = 0.45; u.RL.k.rotation.x = 0.2; u.hips.position.y = 0.9;
u.R.s.rotation.set(-2.75, 0, -0.35); u.R.el.rotation.x = -0.35;              // sword overhead
u.L.s.rotation.set(-1.15, 0, 0.35); u.L.el.rotation.x = -0.9;                // shield guarding
u.sword.rotation.x = 1.25; u.torso.rotation.set(-0.08, 0.25, 0); u.head.rotation.set(-0.12, -0.15, 0); u.capeP.rotation.x = 0.55;
// light: warm key, two crimson rims, low fill
scene.add(new THREE.HemisphereLight(0x302028, 0x080406, .6));
const key = new THREE.DirectionalLight(0xffe0cc, 1.6); key.position.set(-2, 3, 4); scene.add(key);
for (const x of [-2.2, 2.2]) { const l = new THREE.PointLight(0xff2a10, 30, 8, 1.6); l.position.set(x, 2.2, -1.6); scene.add(l); }
const under = new THREE.PointLight(0xff5a20, 6, 4, 1.5); under.position.set(0, .2, 1); scene.add(under);
// title band, lettered with the game's own Anton atlas (OFL)
const meta = await (await fetch('/font-anton.json')).json(), img = await createImageBitmap(await (await fetch('/font-anton.png')).blob());
const tc = document.createElement('canvas'); tc.width = 800; tc.height = 300; const g2 = tc.getContext('2d');
const word = (t, y, size, col) => { const s = size / meta.size; let w = 0; for (const ch of t) w += meta.glyphs[ch][4] * s;
  const sc = document.createElement('canvas'); sc.width = Math.ceil(w) + 4; sc.height = Math.ceil(meta.lineHeight * s) + 4; const x = sc.getContext('2d'); let cx = 0;
  for (const ch of t) { const [gx, gy, gw, gh, adv] = meta.glyphs[ch]; x.drawImage(img, gx, gy, gw, gh, cx, 0, gw * s, gh * s); cx += adv * s; }
  x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, sc.width, sc.height); g2.drawImage(sc, 400 - w / 2, y); };
const grd = g2.createLinearGradient(0, 0, 0, 300); grd.addColorStop(0, 'rgba(5,4,6,0)'); grd.addColorStop(.35, 'rgba(5,4,6,.85)'); grd.addColorStop(1, 'rgba(5,4,6,.95)');
g2.fillStyle = grd; g2.fillRect(0, 0, 800, 300);
word('RAMPAGE', 52, 150, '#ffffff'); word('ENTER. SURVIVE. CONQUER.', 246, 40, '#ff3a20');
r.render(scene, cam);
const out = document.createElement('canvas'); out.width = W; out.height = H; const o = out.getContext('2d');
o.drawImage(r.domElement, 0, 0); o.drawImage(tc, 0, H - 300);
window.__png = out.toDataURL('image/png');
</script></body></html>`;
const files = { '/three.module.js': path.join(VENDOR, 'three.module.js'), '/three.core.js': path.join(VENDOR, 'three.core.js'), '/gladiator.js': path.join(EXP, 'gladiator.js'),
  '/font-anton.json': path.join(ASSETS, 'font-anton.json'), '/font-anton.png': path.join(ASSETS, 'font-anton.png') };
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/' || u === '/poster.html') { res.setHeader('Content-Type', 'text/html'); res.end(PAGE); return; }
  if (files[u]) { res.setHeader('Content-Type', u.endsWith('.png') ? 'image/png' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(fs.readFileSync(files[u])); return; }
  res.writeHead(404); res.end();
});
(async () => {
  await new Promise(r => server.listen(5600, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 1536 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await page.goto('http://127.0.0.1:5600/poster.html');
  await page.waitForFunction(() => window.__png, null, { timeout: 60000 });
  const data = await page.evaluate(() => window.__png);
  fs.writeFileSync(OUTPNG, Buffer.from(data.split(',')[1], 'base64'));
  console.log(JSON.stringify({ out: OUTPNG, bytes: fs.statSync(OUTPNG).size, errors: errs }));
  await browser.close(); server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });

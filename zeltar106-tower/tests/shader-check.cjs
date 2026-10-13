// Compile RAMPAGE's lot shaders inside the documented P0Surface interface (WebGL2, GLSL ES 3.0) and time them
// against a plain surface on a 1280x720 full-screen draw. Software renderer by default (like the platform review).
// PLAYWRIGHT=<path> node rampage82/tests/shader-check.cjs
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path');
const DIR = path.resolve(__dirname, '..', 'exterior');
const PRELUDE = `#version 300 es
precision highp float;
uniform float p0Time; uniform float p0Near; uniform float p0Seed; uniform vec3 p0Color;
struct P0Surface { vec3 color; float alpha; vec3 emissive; float roughness; float metalness; vec3 normal; vec2 uv; vec3 position; vec3 world; vec3 view; };
`;
const MAIN = `
in vec2 vUv; out vec4 o;
void main() {
  P0Surface s; s.color = vec3(0.5, 0.1, 0.1); s.alpha = 1.0; s.emissive = vec3(0.0); s.roughness = 0.5; s.metalness = 0.0;
  s.normal = vec3(0.0, 0.0, 1.0); s.uv = vUv; s.position = vec3(mix(-6.5, 6.5, vUv.x), mix(36.2, 55.8, vUv.y), 6.54);
  s.world = s.position; s.view = normalize(vec3(0.3, -0.2, 1.0));
  p0Surface(s);
  o = vec4(s.color + s.emissive, s.alpha);
}`;
const PLAIN = 'void p0Surface(inout P0Surface s) { }';
const VS = `#version 300 es
in vec2 a; out vec2 vUv; void main() { vUv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const shaders = { plain: PLAIN };
  for (const f of ['event-horizon.glsl', 'neon.glsl', 'glass.glsl']) shaders[f] = fs.readFileSync(path.join(DIR, f), 'utf8');
  const res = await page.evaluate(({ shaders, PRELUDE, MAIN, VS }) => {
    const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
    const gl = c.getContext('webgl2'); if (!gl) return { error: 'no webgl2' };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const out = { renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), shaders: {} };
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    for (const [name, src] of Object.entries(shaders)) {
      const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, VS); gl.compileShader(vs);
      const fsh = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fsh, PRELUDE + src + MAIN); gl.compileShader(fsh);
      if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) { out.shaders[name] = { compiled: false, log: gl.getShaderInfoLog(fsh) }; continue; }
      const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fsh); gl.bindAttribLocation(pr, 0, 'a'); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { out.shaders[name] = { compiled: true, linked: false, log: gl.getProgramInfoLog(pr) }; continue; }
      gl.useProgram(pr); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const ut = gl.getUniformLocation(pr, 'p0Time');
      const px = new Uint8Array(4); gl.uniform1f(ut, 1); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const N = 12, t0 = performance.now();
      for (let i = 0; i < N; i++) { gl.uniform1f(ut, i * 0.37); gl.drawArrays(gl.TRIANGLES, 0, 3); }
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      out.shaders[name] = { compiled: true, linked: true, msPerFullScreenDraw: +((performance.now() - t0) / N).toFixed(2) };
    }
    return out;
  }, { shaders, PRELUDE, MAIN, VS });
  const base = res.shaders?.plain?.msPerFullScreenDraw;
  for (const [n, r] of Object.entries(res.shaders || {})) if (r.msPerFullScreenDraw && base) r.vsPlain = +(r.msPerFullScreenDraw / base).toFixed(2);
  console.log(JSON.stringify(res, null, 2));
  await browser.close();
  if (Object.values(res.shaders || {}).some(r => !r.compiled || r.linked === false)) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });

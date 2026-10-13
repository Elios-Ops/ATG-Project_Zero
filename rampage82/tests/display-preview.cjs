// Render RAMPAGE's broadcast boards and an Event Horizon pane through the REAL event-horizon.glsl (P0Surface interface),
// fed by the real display atlas, at several moments of the cycle. Output: one PNG contact sheet (rows = boards, cols = time).
// PLAYWRIGHT=<path> node rampage82/tests/display-preview.cjs <display-atlas.png> <out.png> [lod1]
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path');
const [ATLAS, OUT, LOD1] = process.argv.slice(2);
const SHADER = fs.readFileSync(path.resolve(__dirname, '..', 'exterior', 'event-horizon.glsl'), 'utf8');
// board: name, pixel size, position(u,v) in lot metres, atlas uv(u,v) (null = no atlas), view vector
const BOARDS = [
  { name: '+Z promo', w: 160, h: 307, pos: 'vec3(mix(-5.0, 5.0, u), mix(13.6, 32.8, v), 9.36)', uv: 'vec2(u * 0.5, v)' },
  { name: 'EAST', w: 307, h: 254, pos: 'vec3(9.62, mix(23.15, 33.0, v), mix(5.95, -5.95, u))', uv: 'vec2(mix(0.5, 1.0, u), mix(0.542, 0.959, v))' },
  { name: 'REAR', w: 160, h: 307, pos: 'vec3(mix(5.0, -5.0, u), mix(13.6, 32.8, v), -9.6)', uv: 'vec2(mix(0.620, 0.880, u), mix(0.0, 0.5, v))' },
  { name: 'EH south', w: 200, h: 301, pos: 'vec3(mix(-6.54, 6.54, u), mix(36.2, 55.8, v), 6.54)', uv: 'vec2(u, v)' },
  { name: 'EH west (gap)', w: 200, h: 301, pos: 'vec3(-6.54, mix(36.2, 55.8, v), mix(-6.54, 6.54, u))', uv: 'vec2(u, v)' },
];
const TIMES = [1.0, 4.0, 6.5, 9.0, 11.5, 14.0];
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const atlas = 'data:image/png;base64,' + fs.readFileSync(ATLAS).toString('base64');
  const png = await page.evaluate(async ({ SHADER, BOARDS, TIMES, atlas, lod1 }) => {
    const img = new Image(); img.src = atlas; await img.decode();
    const W = BOARDS.reduce((m, b) => Math.max(m, b.w), 0) + 8, H = BOARDS.map(b => b.h + 8);
    const c = document.createElement('canvas'); c.width = W * TIMES.length; c.height = H.reduce((a, b) => a + b, 0);
    const gl = c.getContext('webgl2', { preserveDrawingBuffer: true });
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    const vs = `#version 300 es
in vec2 a; out vec2 vUv; void main() { vUv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;
    const progs = BOARDS.map(b => {
      const fs = `#version 300 es
precision highp float;
uniform float p0Time; uniform float p0Near; uniform sampler2D atlas;
struct P0Surface { vec3 color; float alpha; vec3 emissive; float roughness; float metalness; vec3 normal; vec2 uv; vec3 position; vec3 world; vec3 view; };
${SHADER}
in vec2 vUv; out vec4 o;
void main() {
  float u = vUv.x, v = vUv.y; P0Surface s;
  s.color = ${lod1 ? 'vec3(0.12, 0.01, 0.005)' : `texture(atlas, vec2(${b.uv}.x, 1.0 - ${b.uv}.y)).rgb`};
  s.alpha = 1.0; s.emissive = vec3(0.0); s.roughness = 0.5; s.metalness = 0.0; s.normal = vec3(0.0, 0.0, 1.0); s.uv = vUv;
  s.position = ${b.pos}; s.world = s.position; s.view = normalize(vec3(0.2, -0.3, 1.0));
  p0Surface(s);
  vec3 col = s.color + s.emissive; col = col / (1.0 + col);                    // simple tone map
  o = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
}`;
      const p = gl.createProgram();
      for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
        const sh = gl.createShader(t); gl.shaderSource(sh, src); gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(b.name + ': ' + gl.getShaderInfoLog(sh));
        gl.attachShader(p, sh);
      }
      gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p); return p;
    });
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0.05, 0.05, 0.06, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    let y0 = 0;
    BOARDS.forEach((b, i) => {
      TIMES.forEach((t, j) => {
        gl.useProgram(progs[i]); gl.uniform1f(gl.getUniformLocation(progs[i], 'p0Time'), t);
        gl.uniform1f(gl.getUniformLocation(progs[i], 'p0Near'), 0);
        gl.viewport(j * W + 4, c.height - y0 - 4 - b.h, b.w, b.h); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
      y0 += H[i];
    });
    return c.toDataURL('image/png');
  }, { SHADER, BOARDS, TIMES, atlas, lod1: !!LOD1 });
  fs.writeFileSync(OUT, Buffer.from(png.split(',')[1], 'base64'));
  console.log('wrote', OUT, 'times', TIMES.join(', '));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

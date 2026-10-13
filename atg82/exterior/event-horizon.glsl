// Horizontal pixels and geometric fragments advect west, toward lot 106.
// No vertex displacement: the 3.5cm display stays behind the glazing.
float atgHash(vec2 v) {
  vec3 p = fract(vec3(v.xyx) * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
void p0Surface(inout P0Surface s) {
  vec2 q = vec2(s.position.x, s.position.y - 43.0);
  float t = p0Time;
  vec2 cell = floor(vec2(q.x + t * 4.0, q.y) * vec2(2.2, 2.8));
  float seed = atgHash(cell);
  vec2 local = fract(vec2(q.x + t * 4.0, q.y) * vec2(2.2, 2.8));
  float pixel = step(0.81, seed) * step(0.13, local.x) * step(0.14, local.y);
  float row = floor(q.y * 2.8);
  float phase = fract((q.x + t * (4.0 + atgHash(vec2(row, 2.0)) * 3.0)) / 13.0);
  float trail = pow(phase, 12.0) * pow(0.5 + 0.5 * cos(q.y * 17.6), 14.0);
  float shard = step(0.94, seed) * step(abs(local.y - local.x), 0.23);
  vec3 hue = mix(vec3(0.02, 0.85, 1.0), vec3(1.0, 0.03, 0.55), seed);
  s.color = vec3(0.008, 0.014, 0.026);
  s.emissive = hue * (pixel * 0.75 + trail * 1.8 + shard * 1.1);
  s.roughness = 0.3;
}

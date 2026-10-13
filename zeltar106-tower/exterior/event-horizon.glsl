// ZELTAR — Event Horizon + galaxy displays (Lot #106). Material: EventDisplay (additive).
// Paired with RAMPAGE (Lot #82): shared p0Time, origin Y 35 m, energy flows EAST (q.x - t*4) toward the 4 m public
// gap; lens centre at local X +14.5 m, Y 46 m (outside the lot: only shader sampling uses it). No vertex motion.
float zh(vec2 v) { vec3 p = fract(vec3(v.xyx) * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
float zn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(zh(i), zh(i + vec2(1.0, 0.0)), f.x), mix(zh(i + vec2(0.0, 1.0)), zh(i + 1.0), f.x), f.y);
}
vec3 energy(vec2 q, float speed, float dens) {
  vec2 g = vec2(q.x - p0Time * speed, q.y) * vec2(2.2, 2.8) * dens;
  float s = zh(floor(g)); vec2 l = fract(g);
  float px = step(0.81, s) * step(0.13, l.x) * step(0.14, l.y);
  float row = floor(q.y * 2.8 * dens);
  float ph = fract((-q.x + p0Time * (speed + zh(vec2(row, 2.0)) * 3.0)) / 13.0);
  float p2 = ph * ph, p4 = p2 * p2, c = 0.5 + 0.5 * cos(q.y * 17.6 * dens), c2 = c * c, c4 = c2 * c2;
  float tr = p4 * p4 * p4 * (c4 * c4 * c4 * c2);
  return mix(vec3(0.02, 0.85, 1.0), vec3(1.0, 0.03, 0.55), s) * (px * 0.75 + tr * 1.8);
}
vec3 galaxy(vec2 uv) {                                   // a slowly turning spiral galaxy with a dark core
  vec2 d = uv - vec2(0.0, 23.2); d.x *= 1.15;
  float r = length(d) * 0.22, a = atan(d.y, d.x) + p0Time * 0.15;
  float arms = 0.5 + 0.5 * sin(a * 2.0 - r * 9.0);
  float dust = 0.5 + 0.5 * sin(a * 7.0 + r * 31.0 - p0Time * 0.4);
  float core = exp(-r * r * 16.0), hole = smoothstep(0.08, 0.16, r);
  vec3 col = mix(vec3(0.05, 0.45, 1.0), vec3(0.9, 0.2, 1.0), arms) * (arms * arms * arms) * (0.4 + dust) * exp(-r * 2.2);
  float stars = step(0.985, zh(floor(uv * 9.0)));
  return (col + vec3(0.6, 0.9, 1.0) * core * 0.9) * hole + vec3(0.7, 0.9, 1.0) * stars * 0.6;
}
void p0Surface(inout P0Surface s) {
  vec3 p = s.position;
  s.color = vec3(0.004, 0.006, 0.012); s.roughness = 0.3; s.metalness = 0.0;
  // galaxy displays on the west (showroom) face and the east (gap) face, 13–33 m
  if (p.y > 13.0 && p.y < 33.5 && abs(p.x) > 8.5) { s.emissive = galaxy(vec2(p.z, p.y)); return; }
  // Event Horizon panes 36.2–55.8 m; the east (gap) face wraps toward its centre, mirroring RAMPAGE's west face
  bool side = abs(p.x) > abs(p.z);
  float u = !side ? p.x : (p.x > 0.0 ? -(10.5 - abs(p.z) * 0.9) : p.z);
  float depth = side ? abs(p.x) : abs(p.z);
  vec2 q = vec2(u, p.y - 35.0);
  q += vec2(s.view.x + s.view.z, s.view.y) * (zn(q * 0.4 + p0Time * 0.1) - 0.5) * 0.9;   // refraction-LIKE warp
  vec3 e = depth < 6.3 ? energy(q * vec2(0.8, 1.0), 1.6, 0.55) * 0.55 : energy(q, 4.0, 1.0);
  if (depth >= 6.3) {
    if (!side) {
      float r = length(vec2(p.x - 14.5, (p.y - 46.0) * 0.9));
      if (r > 8.8 && r < 11.7) {
        float d = min(min(abs(r - 9.3), abs(r - 10.2)), abs(r - 11.2)) / 0.14;
        e += vec3(0.3, 0.85, 1.0) * exp(-d * d) * (0.55 + 0.45 * sin(p0Time * 2.0 - r * 1.5));
      }
    } else if (p.x > 0.0) {
      float r = length(vec2(p.z, p.y - 46.0)), R = 5.0 - fract(p0Time * 0.2) * 4.0;
      float d = (r - R) / 0.16; e += vec3(0.3, 0.85, 1.0) * exp(-d * d) * 0.9;
    }
  }
  s.emissive = e;
}

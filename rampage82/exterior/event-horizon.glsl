// RAMPAGE — Event Horizon + three broadcast displays (Lot #82). Material: EventDisplay (additive). v2
// Paired with ZELTAR (Lot #106): shared p0Time, origin Y 35 m, energy flows WEST (q.x + t*4) toward the
// 4 m public gap; lens centre at local X -14.5 m, Y 46 m (outside the lot: only shader sampling uses it).
// No vertex motion: the geometry and its bounds never move. Integer-style hash (no sin of large numbers).
float rh(vec2 v) { vec3 p = fract(vec3(v.xyx) * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
float rn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(rh(i), rh(i + vec2(1.0, 0.0)), f.x), mix(rh(i + vec2(0.0, 1.0)), rh(i + 1.0), f.x), f.y);
}
vec3 energy(vec2 q, float speed, float dens) {
  vec2 g = vec2(q.x + p0Time * speed, q.y) * vec2(2.2, 2.8) * dens;
  float s = rh(floor(g)); vec2 l = fract(g);
  float px = step(0.81, s) * step(0.13, l.x) * step(0.14, l.y);
  float row = floor(q.y * 2.8 * dens);
  float ph = fract((q.x + p0Time * (speed + rh(vec2(row, 2.0)) * 3.0)) / 13.0);
  float p2 = ph * ph, p4 = p2 * p2, c = 0.5 + 0.5 * cos(q.y * 17.6 * dens), c2 = c * c, c4 = c2 * c2;
  float tr = p4 * p4 * p4 * (c4 * c4 * c4 * c2);                 // pow(ph,12) * pow(c,14) without pow()
  return mix(vec3(1.0, 0.04, 0.02), vec3(1.0, 0.42, 0.06), s) * (px * 0.75 + tr * 1.8);
}
// The EAST (12 x 10 m, 23-33 m) and REAR (10 x 19.2 m, 13.6-32.8 m) broadcast boards. The base texture holds one
// monochrome mask per channel (tools/make_display_atlas.py); every 5 s the board dissolves to the next channel.
// l: board coordinate 0..1 as seen from outside; q: metres on the board. Nothing flashes faster than ~1 Hz.
vec3 board(vec3 tex, vec2 l, vec2 q, float rear) {
  float c = fract((p0Time + rear * 7.0) / 15.0), k = floor(c * 3.0), f = fract(c * 3.0);
  float d = rn(q * 1.7);
  float a = clamp(min(f * 9.0 - d, (1.0 - f) * 9.0 - d) * 5.0, 0.0, 1.0);          // dissolve in, hold, dissolve out
  float m = k < 0.5 ? tex.r : (k < 1.5 ? tex.g : tex.b);
  if (rear < 0.5) {
    if (k > 0.5 && k < 1.5) m *= step(0.1 + floor((1.0 - l.y) * 3.0) * 0.17, f);   // ENTER. SURVIVE. CONQUER. in turn
    if (k > 1.5) {                                                                // countdown: 3, 2, 1, then THE CLIMB BEGINS
      float n = floor(f * 4.0);
      m *= l.y > 0.27 ? step(abs(floor(l.x * 3.0) - n), 0.1) * (1.0 + 0.6 * (1.0 - fract(f * 4.0))) : step(2.5, n);
    }
  } else if (k < 0.5) m = min(m * 1.8, 1.0);                                      // arena image: lift the dark art
  else if (k < 1.5) m *= 0.75 + 0.25 * sin(p0Time * 3.0);                        // WARNING breathes (~0.5 Hz)
  float y = l.y - fract(p0Time * 0.18), sweep = exp(-y * y * 100.0);             // a slow bright sweep down the board
  float scan = 0.82 + 0.18 * sin(q.y * 40.0);                                    // LED rows
  vec3 col = mix(vec3(1.0, 0.04, 0.02), vec3(1.0, 0.3, 0.05), l.y * l.y) * m * scan * (1.4 + sweep * 0.8);   // crimson, orange crest
  vec3 bg = (energy(q, 2.0, 1.0) * 0.12 + vec3(0.03, 0.004, 0.002)) * (1.0 - m * a);
  return bg + col * a + vec3(1.0, 0.4, 0.08) * a * (1.0 - a) * 2.4;
}
void p0Surface(inout P0Surface s) {
  vec3 p = s.position;
  vec3 art = s.color;                                   // the display atlas (EventDisplay's base texture)
  s.color = vec3(0.006, 0.003, 0.003); s.roughness = 0.3; s.metalness = 0.0;
  // +Z promotional display: art -> crimson energy -> art on a 12 s cycle (same cadence as ZELTAR's dissolve)
  if (p.y > 13.0 && p.y < 33.5 && p.z > 8.5 && abs(p.x) < 5.3) {
    float c = fract(p0Time / 12.0);
    float T = smoothstep(0.35, 0.5, c) - smoothstep(0.85, 1.0, c);
    float m = clamp((T * 1.1 - rn(p.xy * 0.35)) * 7.0, 0.0, 1.0);
    vec3 en = energy(vec2(p.x, p.y - 13.0), 4.0, 1.0);
    float edge = smoothstep(0.0, 0.15, m) * (1.0 - smoothstep(0.15, 0.4, m));
    float y = (p.y - 13.6) / 19.2 - fract(p0Time * 0.18);
    s.emissive = mix(art * (1.3 + exp(-y * y * 100.0) * 0.5) * (0.85 + 0.15 * sin(p.y * 40.0)), en, m) + vec3(1.0, 0.3, 0.05) * edge * 0.8;
    return;
  }
  if (p.y > 13.0 && p.y < 33.5 && p.z < -8.5 && abs(p.x) < 5.3) {                  // REAR board (faces -Z)
    s.emissive = board(art, vec2((5.0 - p.x) / 10.0, (p.y - 13.6) / 19.2), vec2(-p.x, p.y - 13.6), 1.0);
    return;
  }
  if (p.y > 22.5 && p.y < 33.5 && p.x > 8.5 && abs(p.z) < 6.3) {                  // EAST board (faces the ring road)
    s.emissive = board(art, vec2((5.95 - p.z) / 11.9, (p.y - 23.15) / 9.85), vec2(-p.z, p.y - 23.15), 0.0);
    return;
  }
  // street-level LED ticker on the promotional base
  if (p.y < 8.0) { s.emissive = energy(vec2(p.x * 2.0, p.y * 3.0), 6.0, 1.0); return; }
  // Event Horizon panes, 36.2–55.8 m. Horizontal coordinate per face (west face wraps toward its centre, mirroring ZELTAR)
  bool side = abs(p.x) > abs(p.z);
  float u = !side ? p.x : (p.x < 0.0 ? 10.5 - abs(p.z) * 0.9 : p.z);
  float depth = side ? abs(p.x) : abs(p.z);            // front layer ~6.54 m from the axis, deep layer ~5.94 m
  vec2 q = vec2(u, p.y - 35.0);
  // refraction-LIKE warp: the pattern bends with the view direction (no scene sampling exists in Project 0 shaders)
  q += vec2(s.view.x + s.view.z, s.view.y) * (rn(q * 0.4 + p0Time * 0.1) - 0.5) * 0.9;
  vec3 e = depth < 6.3 ? energy(q * vec2(0.8, 1.0), 1.6, 0.55) * 0.55          // deep layer: slower, larger, dimmer -> parallax
                       : energy(q, 4.0, 1.0);
  // lensing crescents toward the singularity in the gap (front layer only)
  if (depth >= 6.3) {
    if (!side) {
      float r = length(vec2(p.x + 14.5, (p.y - 46.0) * 0.9));
      if (r > 8.8 && r < 11.7) {                               // only near the crescents
        float d = min(min(abs(r - 9.3), abs(r - 10.2)), abs(r - 11.2)) / 0.14;
        e += vec3(1.0, 0.35, 0.08) * exp(-d * d) * (0.55 + 0.45 * sin(p0Time * 2.0 - r * 1.5));
      }
    } else if (p.x < 0.0) {
      float r = length(vec2(p.z, p.y - 46.0)), R = 5.0 - fract(p0Time * 0.2) * 4.0;   // rings converge on the gap face
      float d = (r - R) / 0.16; e += vec3(1.0, 0.35, 0.08) * exp(-d * d) * 0.9;
    }
  }
  s.emissive = e;
}

// RAMPAGE — crimson/orange neon (Lot #82). Material: Neon.
// Strips pulse upward on the shared clock; warm-white signage breathes. At the EAST entrance (the ring road) the
// light tells players where to go: the four chevrons above the portal light in sequence, bottom to top, and the
// portal frame runs light down toward the door. Every effect is slower than 3 flashes a second.
void p0Surface(inout P0Surface s) {
  vec3 base = s.color, p = s.position;
  float white = step(0.6, min(base.r, min(base.g, base.b)));
  float band = pow(0.5 + 0.5 * sin(p.y * 0.45 - p0Time * 2.4), 6.0);          // ~2.6 s cycle
  float glow = mix(1.1 + band * 1.6, 1.6 * (0.85 + 0.15 * sin(p0Time * 1.3)), white);
  if (p.x > 9.6 && abs(p.z) < 4.7) {
    if (p.y > 12.8 && p.y < 21.6) {                                              // stepped chevrons: rising arrows, 1.6 s sweep
      float k = floor((p.y - 13.0) / 1.75);
      float on = 1.0 - smoothstep(0.0, 0.35, fract(p0Time * 0.62 - k * 0.22));
      glow = 0.7 + on * 2.6;
    } else if (p.y < 6.4 && p.x > 11.6) {                                        // portal frame: light runs down to the door
      float run = smoothstep(0.55, 1.0, fract(p.y * 0.6 + p0Time * 0.9));
      glow = 1.2 + run * 2.2;
    }
  }
  s.emissive = base * glow + base * p0Near * 0.3;
  s.color = base * 0.05;
}

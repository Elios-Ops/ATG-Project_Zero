// ZELTAR — cyan/blue neon (Lot #106). Material: Neon. Light streams UP the wing fins like speed lines; signage
// breathes; at the WEST showroom the frame runs light toward the door. Every effect is slower than 3 flashes a second.
void p0Surface(inout P0Surface s) {
  vec3 base = s.color, p = s.position;
  float white = step(0.6, min(base.r, min(base.g, base.b)));
  float streak = pow(0.5 + 0.5 * sin(p.y * 0.35 - p0Time * 3.2), 8.0);          // fast-reading upward streaks, ~2 s
  float glow = mix(1.0 + streak * 2.0, 1.6 * (0.85 + 0.15 * sin(p0Time * 1.3)), white);
  if (p.x < -10.8 && abs(p.z) < 6.4 && p.y < 7.0) glow = 1.2 + smoothstep(0.55, 1.0, fract(abs(p.z) * 0.5 - p0Time * 0.9)) * 2.2;
  s.emissive = base * glow + base * p0Near * 0.3;
  s.color = base * 0.05;
}

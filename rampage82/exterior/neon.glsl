// RAMPAGE — crimson/orange neon (Lot #82). Material: Neon. Strips pulse upward on the shared clock;
// warm-white signage (ATG, RAMPAGE marquee letters, tagline) breathes gently instead of pulsing.
void p0Surface(inout P0Surface s) {
  vec3 base = s.color;                                      // hue from the palette texture
  float white = step(0.6, min(base.r, min(base.g, base.b)));
  float band = pow(0.5 + 0.5 * sin(s.position.y * 0.45 - p0Time * 2.4), 6.0);   // ~2.6 s cycle: reads as alive, no strobing
  float breathe = 0.85 + 0.15 * sin(p0Time * 1.3);
  s.emissive = base * mix(1.1 + band * 1.6, 1.6 * breathe, white) + base * p0Near * 0.3;
  s.color = base * 0.05;
}

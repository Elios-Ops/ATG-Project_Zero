// RAMPAGE — glass skin over the Event Horizon and the portal (Lot #82). Material: Glass (transparent).
// Fresnel from the documented view vector: nearly clear head-on, a crimson-tinted sheen at grazing angles.
void p0Surface(inout P0Surface s) {
  float f = pow(1.0 - clamp(abs(dot(s.view, s.normal)), 0.0, 1.0), 3.0);
  s.alpha = mix(0.08, 0.55, f);
  s.color = vec3(0.04, 0.01, 0.012);
  s.roughness = 0.05; s.metalness = 0.0;
  s.emissive = vec3(0.9, 0.12, 0.05) * f * 0.25;
}

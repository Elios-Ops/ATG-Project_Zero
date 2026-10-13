void p0Surface(inout P0Surface s) {
  float wave = 0.5 + 0.5 * sin(s.position.y * 0.3 - p0Time * 1.7);
  s.color = vec3(0.012);
  s.emissive = mix(vec3(1.0, 0.48, 0.025), vec3(0.03, 0.72, 1.0), wave) * 1.1;
}

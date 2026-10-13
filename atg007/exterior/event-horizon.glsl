// Eastbound partner of lot 82. The illusion centre is outside the box,
// but only shader sampling refers to it: no vertices or particles leave the lot.
float atgHash(vec2 v) {
  vec3 p = fract(vec3(v.xyx) * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
int atgRow(int glyph, int r) {
  if(glyph==0) {
    if(r==0)return 14; if(r==3)return 31; return 17;
  }
  if(glyph==1) { if(r==0)return 31; return 4; }
  if(r==0 || r==6)return 14;
  if(r==2)return 16; if(r==3)return 23; return 17;
}
float atgLogo(vec2 p) {
  ivec2 g=ivec2(floor(p));
  if(g.x<0 || g.x>=18 || g.y<0 || g.y>=7)return 0.0;
  int glyph=g.x/6, col=g.x-glyph*6;
  if(col>=5)return 0.0;
  int bits=atgRow(glyph,6-g.y);
  return float((bits >> (4-col)) & 1);
}
void p0Surface(inout P0Surface s) {
  float t=p0Time;
  float horizontal=s.position.x;
  // On the gap-facing side, wrap both ends toward the centre of the pane.
  if(abs(s.normal.x)>0.5)horizontal=10.5-abs(s.position.z)*0.9;
  vec2 q=vec2(horizontal,s.position.y-35.0);
  vec2 cell=floor(vec2(q.x-t*4.0,q.y)*vec2(2.2,2.8));
  float seed=atgHash(cell);
  vec2 local=fract(vec2(q.x-t*4.0,q.y)*vec2(2.2,2.8));
  float pixel=step(0.81,seed)*step(0.13,local.x)*step(0.14,local.y);
  float row=floor(q.y*2.8);
  float phase=fract((q.x-t*(4.0+atgHash(vec2(row,2.0))*3.0))/13.0);
  float trail=pow(phase,12.0)*pow(0.5+0.5*cos(q.y*17.6),14.0);
  float shard=step(0.94,seed)*step(abs(local.y-local.x),0.23);
  vec3 hue=mix(vec3(0.02,0.85,1.0),vec3(1.0,0.03,0.55),seed);
  // A partial lensing crescent remains on our panes. The central gap is empty.
  float radius=length(vec2(q.x-14.5,(q.y-11.0)*0.9));
  float ring=exp(-pow((radius-4.65)*4.0,2.0));
  float blackout=1.0-smoothstep(3.2,4.0,radius);
  float cycle=mod(t,12.0);
  float dissolve=smoothstep(1.0,3.5,cycle);
  vec2 lp=(q-vec2(-6.0,17.0))/0.24;
  lp.x-=cycle*2.0+floor(lp.y)*dissolve*0.9;
  float logo=atgLogo(lp)*(1.0-smoothstep(3.0,4.0,cycle));
  s.color=vec3(0.008,0.014,0.026)*(1.0-blackout);
  s.emissive=(hue*(pixel*0.75+trail*1.8+shard*1.1)*(1.0-blackout))
    +vec3(1.0,0.48,0.08)*ring*1.25+vec3(0.2,0.85,1.0)*logo;
  s.roughness=0.3;
}

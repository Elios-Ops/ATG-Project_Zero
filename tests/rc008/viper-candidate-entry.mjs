import * as THREE from '../../zeltar106/tests/vendor/three.module.js';
// Directive 007 visual candidate only. Not approved for production integration.
// Original ATG lofted hard-surface design, matched to the owner's VIPER mood board.
export function createViperCandidate(paintMaterial,lightMaterial) {
 const root=new THREE.Group();root.name='VIPER_007_VISUAL_CANDIDATE';
 const metal=new THREE.MeshBasicMaterial({color:'#10151a',vertexColors:true});
 const canopy=new THREE.MeshBasicMaterial({color:'#132a37',vertexColors:true});
 const mats=[paintMaterial,metal,canopy,lightMaterial];
 const buckets=Array.from({length:5},()=>({p:[],n:[],c:[]}));
 function tri(a,b,c,m,tint=1) {
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),C=new THREE.Vector3(...c);
  const n=new THREE.Vector3().crossVectors(B.clone().sub(A),C.clone().sub(A)).normalize();
  const shade=m===3?1:.52+.48*Math.max(0,n.dot(new THREE.Vector3(.30,.86,.40)));
  const color=Array.isArray(tint)?tint:[tint,tint,tint],out=buckets[m];
  for(const v of [a,b,c]){out.p.push(...v);out.n.push(...n.toArray());out.c.push(...color.map(x=>x*shade));}
 }
 function quad(a,b,c,d,m,t=1){tri(a,b,c,m,t);tri(a,c,d,m,t);}
 function block(x,y,z,w,h,d,m,t=1) {
  const p=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>[x+v[0]*w/2,y+v[1]*h/2,z+v[2]*d/2]);
  for(const ids of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])quad(...ids.map(i=>p[i]),m,t);
 }
 function loft(sections,m,ox=0,t=1) {
  const shape=[[-.68,-1],[.68,-1],[1,-.50],[1,.40],[.58,1],[-.58,1],[-1,.40],[-1,-.50]];
  const rows=sections.map(([z,w,h,y])=>shape.map(([x,dy])=>[ox+x*w/2,y+dy*h/2,z]));
  for(let k=0;k<rows.length-1;k++)for(let j=0;j<8;j++)quad(rows[k][j],rows[k][(j+1)%8],rows[k+1][(j+1)%8],rows[k+1][j],m,t);
  for(let j=1;j<7;j++){tri(rows[0][0],rows[0][j+1],rows[0][j],m,t);tri(rows.at(-1)[0],rows.at(-1)[j],rows.at(-1)[j+1],m,t);}
 }
 function tube(x,y,z,length,r0,r1,m,n=16) {
  for(let i=0;i<n;i++){
   const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,material=typeof m==='function'?m(i):m;
   quad([x+Math.cos(a)*r0,y+Math.sin(a)*r0,z-length/2],[x+Math.cos(b)*r0,y+Math.sin(b)*r0,z-length/2],
    [x+Math.cos(b)*r1,y+Math.sin(b)*r1,z+length/2],[x+Math.cos(a)*r1,y+Math.sin(a)*r1,z+length/2],material);
  }
 }
 function annulus(x,y,z,outer,inner,m,back=false,n=16) {
  for(let i=0;i<n;i++){
   const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;
   const p=[[x+Math.cos(a)*outer,y+Math.sin(a)*outer,z],[x+Math.cos(b)*outer,y+Math.sin(b)*outer,z],
    [x+Math.cos(b)*inner,y+Math.sin(b)*inner,z],[x+Math.cos(a)*inner,y+Math.sin(a)*inner,z]];
   if(back)p.reverse();quad(...p,m);
  }
 }
 function disc(x,y,z,r,m,back=false,n=16) {
  for(let i=0;i<n;i++){
   const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;
   const u=[x+Math.cos(a)*r,y+Math.sin(a)*r,z],v=[x+Math.cos(b)*r,y+Math.sin(b)*r,z];
   tri([x,y,z],back?v:u,back?u:v,m);
  }
 }
 function rod(a,b,r,m,n=8) {
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),axis=B.clone().sub(A).normalize();
  const u=new THREE.Vector3().crossVectors(axis,Math.abs(axis.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0)).normalize();
  const v=new THREE.Vector3().crossVectors(axis,u);
  function point(origin,t){return origin.clone().addScaledVector(u,Math.cos(t)*r).addScaledVector(v,Math.sin(t)*r).toArray();}
  for(let i=0;i<n;i++){const t=i/n*Math.PI*2,q=(i+1)/n*Math.PI*2;quad(point(A,t),point(A,q),point(B,q),point(B,t),m);}
 }
 function wing(poly,y,h,m,t=1) {
  const area=poly.reduce((a,p,i)=>{const q=poly[(i+1)%poly.length];return a+p[0]*q[1]-q[0]*p[1];},0);if(area<0)poly=[...poly].reverse();
  for(let i=1;i<poly.length-1;i++){
   tri([poly[0][0],y+h/2,poly[0][1]],[poly[i+1][0],y+h/2,poly[i+1][1]],[poly[i][0],y+h/2,poly[i][1]],m,t);
   tri([poly[0][0],y-h/2,poly[0][1]],[poly[i][0],y-h/2,poly[i][1]],[poly[i+1][0],y-h/2,poly[i+1][1]],m,t);
  }
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];quad([a[0],y-h/2,a[1]],[b[0],y-h/2,b[1]],[b[0],y+h/2,b[1]],[a[0],y+h/2,a[1]],m,t);}
 }
 function fin(x,z,lean=1) {
  // Swept quadrilateral fin, inset white livery panel and lime leading edge.
  const outline=[[z-.35,.46],[z+.26,.46],[z-.13,.91],[z-.44,.82]];
  const p=outline.map(([Z,Y])=>[x+(Y-.46)*lean*.12,Y,Z]);
  const q=p.map(v=>[v[0]+.025,v[1],v[2]]);
  quad(...p,4,.035);quad(...[...q].reverse(),4,.035);
  for(let k=0;k<4;k++)quad(p[k],p[(k+1)%4],q[(k+1)%4],q[k],4,.035);
  // Fin livery is vertex colored, sharing the paint material and one optional mesh.
  const a=[x+.027,.49,z-.29],b=[x+.027,.49,z+.15],c=[x+.063,.83,z-.16],d=[x+.063,.76,z-.34];
  quad(a,b,c,d,4,.84);quad(...[a,b,c,d].map(v=>[v[0]-.03,v[1],v[2]]).reverse(),4,.84);
  const aa=[x+.029,.51,z+.11],bb=[x+.07,.85,z-.15],cc=[x+.07,.82,z-.17],dd=[x+.029,.50,z+.08];
  quad(aa,bb,cc,dd,4,[.32,1,.008]);quad(...[aa,bb,cc,dd].map(v=>[v[0]-.035,v[1],v[2]]).reverse(),4,[.32,1,.008]);
 }
 // Black chassis and spear; white dorsal armor leaves meaningful dark negative space.
 loft([[-.88,.29,.17,.29],[-.54,.52,.26,.34],[.16,.51,.26,.35],[.56,.34,.19,.31],[1.30,.024,.04,.20]],1);
 loft([[-.60,.45,.10,.45],[-.16,.50,.10,.46],[.43,.29,.07,.40],[1.22,.018,.025,.235]],0);
 // Long pointed canopy with a lowered windscreen and rear roll structure.
 loft([[-.42,.33,.05,.52],[-.28,.37,.27,.62],[.08,.31,.26,.61],[.43,.19,.15,.49],[.71,.03,.02,.385]],2);
 loft([[-.44,.39,.025,.53],[-.27,.42,.025,.505],[.26,.30,.025,.45],[.65,.08,.025,.375]],1);
 for(const s of [-1,1]) {
  // Armored cockpit flanks, green seam lines and a pointed nose slash.
  wing([[s*.11,-.35],[s*.28,-.16],[s*.24,.28],[s*.055,.98]],.38,.025,0);
  rod([s*.195,.51,-.32],[s*.16,.64,-.13],.009,3,6);
  rod([s*.16,.64,-.13],[s*.115,.53,.34],.009,3,6);
  rod([s*.115,.53,.34],[s*.035,.39,.66],.008,3,6);
  rod([s*.035,.29,.99],[s*.13,.37,.47],.009,3,6);
  for(const z of [-.22,-.07,.08])block(s*.26,.42,z,.018,.055,.054,1);
 }
 block(0,.68,-.27,.20,.025,.08,1);block(0,.70,-.30,.065,.025,.04,3);
 block(0,.32,-.67,.36,.12,.17,1);block(0,.46,-.59,.22,.08,.18,0);
 // Twin compact power units sit behind the forward spear, not alongside its nose.
 for(const s of [-1,1]) {
  const x=s*.61,y=.32,centre=-.24,len=1.24,r=.23;
  tube(x,y,centre,len,r,r*.93,1);
  // Upper/outer sculpted armor bands are separated by exposed mechanical ribs.
  for(const [z,length] of [[-.69,.17],[-.44,.23],[-.12,.23],[.22,.16]]) {
   tube(x,y,z,length,r*1.055,r*1.055,i=>i>=1&&i<=7?0:1);
   for(const a of [Math.PI*.20,Math.PI*.80]){
    const xx=x+Math.cos(a)*r*1.07,yy=y+Math.sin(a)*r*1.07;
    block(xx,yy,z,.035,.032,.06,1);
   }
  }
  for(const z of [-.57,-.29,.055]){
   tube(x,y,z,.048,r*1.065,r*1.065,1);
   tube(x,y,z-.035,.015,r*1.072,r*1.072,3);
  }
  // Recessed front intake: flared black lip, bright rim, inner throat, rotor hub.
  tube(x,y,.395,.09,.225,.26,1);annulus(x,y,.44,.26,.207,0);
  annulus(x,y,.443,.241,.221,3);tube(x,y,.36,.16,.185,.207,1);
  disc(x,y,.285,.182,1);
  for(let k=0;k<10;k++){
   const a=k/10*Math.PI*2,b=a+.24;
   tri([x+Math.cos(a)*.065,y+Math.sin(a)*.065,.30],[x+Math.cos(b)*.17,y+Math.sin(b)*.17,.31],[x+Math.cos(a+.11)*.17,y+Math.sin(a+.11)*.17,.31],0,.40);
  }
  disc(x,y,.325,.059,1);annulus(x,y,.328,.056,.039,3);
  // Rear nozzle: recessed luminous throat, black perforated collar and vanes.
  tube(x,y,-.89,.11,.235,.205,1);annulus(x,y,-.946,.232,.17,0,true);
  annulus(x,y,-.95,.219,.192,3,true);disc(x,y,-.953,.155,3,true);
  for(let k=0;k<8;k++){
   const a=k/8*Math.PI*2;block(x+Math.cos(a)*.245,y+Math.sin(a)*.245,-.81,.032,.033,.10,1);
  }
  // Side fairings carry a spear echo and are connected to the engine hull.
  loft([[-.50,.30,.07,.58],[-.08,.34,.10,.55],[.32,.29,.095,.50],[.79,.025,.025,.30]],0,x);
  wing([[x-s*.10,.45],[x+s*.05,.76],[x+s*.17,.42],[x+s*.20,-.27]],.37,.035,1);
  rod([x,.52,.28],[x+s*.075,.33,.70],.013,3,6);
  // Two triangular engine mounts, crossmember, hydraulic sleeve and harness.
  for(const z of [-.48,.03]) {
   rod([s*.21,.31,z+.06],[x-s*.15,.28,z-.08],.035,1,8);
   rod([s*.21,.27,z-.13],[x-s*.15,.28,z+.03],.025,0,8);
   block(s*.30,.29,z,.12,.095,.10,1);block(s*.32,.34,z,.045,.022,.055,3);
  }
  rod([s*.27,.36,-.40],[x-s*.12,.42,-.54],.016,3,6);
  // Rear wing arm and stabilizer pivot are substantial mechanical connections.
  wing([[s*.22,-.55],[s*.69,-.89],[s*.83,-.68],[s*.45,-.21]],.40,.05,1);
  block(s*.61,.49,-.51,.12,.08,.15,1);fin(s*.69,-.46,s);
  // Secondary inboard blades echo the reference's four-fin arrangement.
  block(s*.16,.50,-.66,.32,.04,.10,1);fin(s*.26,-.64,s);
  // Two compact front splitters add the spear silhouette from side and above.
  wing([[s*.10,.54],[s*.38,.39],[s*.37,.80],[s*.035,1.18]],.245,.025,1);
  rod([s*.34,.26,.72],[s*.06,.23,1.14],.009,3,6);
 }
 // Structural spine with a low central blade, leaving the taller outboard fins dominant.
 wing([[-.11,-.84],[.11,-.84],[.065,-.38],[-.065,-.38]],.52,.06,0);
 block(0,.56,-.70,.03,.14,.17,1);
 buckets.forEach((b,i)=>{
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));
  g.computeBoundingBox();g.computeBoundingSphere();const mesh=new THREE.Mesh(g,i===4?paintMaterial:mats[i]);
  mesh.name=['White_Armor_And_Customizable_Panels','Black_Chassis_Engine_Housings_Connections','Spear_Cockpit','Green_Intakes_Exhaust_Accents','Optional_Angular_Stabilizers'][i];
  root.add(mesh);if(i===4)root.userData.fins=mesh;
 });
 root.userData.reviewCandidate=true;root.userData.front='+Z';return root;
}

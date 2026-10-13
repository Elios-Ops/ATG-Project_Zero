import * as THREE from './vendor/three.module.js';
import {createViperCandidate} from './viper-candidate-entry.mjs';

// Original ATG surface-model pipeline. Cross-section lofts form continuous hulls;
// every component joins the shared frame. All same-material triangles are merged.
export const ZELPOD_NAMES=['COMET','VIPER','TITAN'];
export function createZelPod(index,paintMaterial,lightMaterial) {
 if(index===1)return createViperCandidate(paintMaterial,lightMaterial);
 const group=new THREE.Group();group.name=ZELPOD_NAMES[index];
 const frame=new THREE.MeshBasicMaterial({color:'#27374c',vertexColors:true});
 const glass=new THREE.MeshBasicMaterial({color:'#72a3bd',vertexColors:true});
 const mats=[paintMaterial,frame,glass,lightMaterial];
 const buckets=Array.from({length:5},()=>({p:[],n:[],c:[]}));
 function triangle(a,b,c,mat,tint=1) {
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),C=new THREE.Vector3(...c);
  const normal=new THREE.Vector3().crossVectors(B.clone().sub(A),C.clone().sub(A)).normalize();
  const shade=mat===3?1:(.66+.34*Math.max(0,normal.dot(new THREE.Vector3(.35,.84,.42))));
  const bucket=buckets[mat];
  for(const v of [a,b,c]){bucket.p.push(...v);bucket.n.push(...normal.toArray());bucket.c.push(shade*tint,shade*tint,shade*tint);}
 }
 function quad(a,b,c,d,mat,tint=1){triangle(a,b,c,mat,tint);triangle(a,c,d,mat,tint);}
 function block(x,y,z,w,h,d,mat,tint=1) {
  const p=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>[x+v[0]*w/2,y+v[1]*h/2,z+v[2]*d/2]);
  for(const ids of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])quad(...ids.map(i=>p[i]),mat,tint);
 }
 // Sections run tail -> nose (+Z forward), with an octagonal bevelled section.
 function hull(sections,mat,offsetX=0) {
  const profile=[[-.66,-1],[.66,-1],[1,-.55],[1,.45],[.64,1],[-.64,1],[-1,.45],[-1,-.55]];
  const rings=sections.map(([z,w,h,y])=>profile.map(([x,dy])=>[offsetX+x*w/2,y+dy*h/2,z]));
  for(let k=0;k<rings.length-1;k++)for(let j=0;j<8;j++)quad(rings[k][j],rings[k][(j+1)%8],rings[k+1][(j+1)%8],rings[k+1][j],mat);
  for(let j=1;j<7;j++){triangle(rings[0][0],rings[0][j+1],rings[0][j],mat);triangle(rings.at(-1)[0],rings.at(-1)[j],rings.at(-1)[j+1],mat);}
 }
 function tube(x,y,z,length,r0,r1,mat,n=12) {
  for(let i=0;i<n;i++) {
   const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;
   quad([x+Math.cos(a)*r0,y+Math.sin(a)*r0,z-length/2],[x+Math.cos(b)*r0,y+Math.sin(b)*r0,z-length/2],
    [x+Math.cos(b)*r1,y+Math.sin(b)*r1,z+length/2],[x+Math.cos(a)*r1,y+Math.sin(a)*r1,z+length/2],mat);
  }
 }
 function disc(x,y,z,r,mat,n=12) {
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;triangle([x,y,z],[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*r,y+Math.sin(b)*r,z],mat);}
 }
 function wing(poly,y,thickness,mat) {
  // Polygon in x/z, closed as an extruded thin aerodynamic panel.
  const area=poly.reduce((a,p,i)=>{const q=poly[(i+1)%poly.length];return a+p[0]*q[1]-q[0]*p[1];},0);
  if(area<0)poly=[...poly].reverse();
  for(let i=1;i<poly.length-1;i++) {
   triangle([poly[0][0],y+thickness/2,poly[0][1]],[poly[i+1][0],y+thickness/2,poly[i+1][1]],[poly[i][0],y+thickness/2,poly[i][1]],mat);
   triangle([poly[0][0],y-thickness/2,poly[0][1]],[poly[i][0],y-thickness/2,poly[i][1]],[poly[i+1][0],y-thickness/2,poly[i+1][1]],mat);
  }
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];quad([a[0],y-thickness/2,a[1]],[b[0],y-thickness/2,b[1]],[b[0],y+thickness/2,b[1]],[a[0],y+thickness/2,a[1]],mat);}
 }
 function fin(x,z,width,height,length) {
  const p=[[x-width/2,.42,z-length/2],[x-width/2,.42,z+length/2],[x-width/2,.42+height,z-length*.15],
   [x+width/2,.42,z-length/2],[x+width/2,.42,z+length/2],[x+width/2,.42+height,z-length*.15]];
  triangle(p[0],p[2],p[1],4);triangle(p[3],p[4],p[5],4);
  quad(p[0],p[1],p[4],p[3],4);quad(p[1],p[2],p[5],p[4],4);quad(p[2],p[0],p[3],p[5],4);
 }
 const heavy=index===2,angular=index===1;
 const spread=heavy?.69:angular?.57:.61,engineY=heavy?.38:.34;
 if(index===0) {
  hull([[-.84,.37,.16,.29],[-.52,.53,.32,.33],[.15,.47,.29,.34],[.62,.32,.21,.31],[1.03,.06,.07,.29]],0);
  hull([[-.45,.36,.06,.49],[-.27,.37,.28,.55],[.13,.32,.27,.54],[.48,.13,.08,.47]],2);
  for(const s of [-1,1])wing([[s*.16,-.54],[s*.78,-.75],[s*.71,-.05],[s*.24,.35]],.27,.045,0);
 } else if(index===1) {
  hull([[-.73,.36,.22,.28],[-.42,.61,.35,.32],[.1,.53,.34,.33],[.67,.18,.16,.28],[.93,.015,.035,.26]],0);
  hull([[-.34,.39,.07,.49],[-.22,.39,.34,.57],[.12,.25,.32,.57],[.42,.03,.07,.46]],2);
  for(const s of [-1,1])wing([[s*.13,-.44],[s*.78,-.73],[s*.92,-.36],[s*.37,.45]],.29,.055,0);
 } else {
  hull([[-.77,.61,.22,.29],[-.46,.7,.36,.34],[.38,.62,.36,.34],[.78,.43,.26,.31],[.94,.19,.12,.28]],0);
  hull([[-.36,.42,.06,.53],[-.25,.43,.33,.6],[.25,.4,.31,.59],[.48,.29,.08,.49]],2);
  for(const s of [-1,1])wing([[s*.24,-.53],[s*.8,-.61],[s*.84,.48],[s*.23,.57]],.27,.085,1);
 }
 // Cockpit collar, canopy rails, nose sensors and uninterrupted centre frame.
 block(0,.25,-.02,.30,.10,1.52,1);
 for(const s of [-1,1]) {
  block(s*(heavy?.23:.19),.51,-.08,.035,.055,.69,1);
  block(s*.095,.34,.65,.027,.04,.29,3);
 }
 block(0,.50,-.40,heavy?.44:.36,.075,.08,1);
 block(0,.38,.92,.06,.04,.09,3);
 // Front canopy frame is separated from the tinted faceted glass by a metal brow.
 block(0,heavy?.65:angular?.68:.63,-.20,heavy?.39:.30,.025,.03,1);
 // Longitudinal hard points, paired engines, intake turbine, armored rings, exhaust.
 for(const s of [-1,1]) {
  const x=s*spread,len=heavy?1.62:angular?1.18:1.85,r=heavy?.255:angular?.18:.195;
  for(const z of [-.43,.34])block(s*spread/2,.28,z,spread,.07,heavy?.16:.09,1);
  tube(x,engineY,0,len,r,r*.83,0,angular?8:12);
  const nose=len/2,tail=-len/2;
  tube(x,engineY,nose-.025,.09,r*.89,r*.7,1);
  disc(x,engineY,nose+.023,r*.65,1);
  for(let i=0;i<8;i++) {
   const a=i/8*Math.PI*2;
   const X=x+Math.cos(a)*r*.40,Y=engineY+Math.sin(a)*r*.40;
   block(X,Y,nose+.030,r*.18,r*.08,.025,2);
  }
  disc(x,engineY,nose+.044,r*.18,3);
  tube(x,engineY,tail+.02,.13,r*.87,r*.95,1);
  tube(x,engineY,tail-.07,.06,r*.71,r*.82,3);
  // Reverse-facing exhaust disc: no transparency, shadow maps or particles.
  for(let i=0;i<12;i++) {
   const a=i/12*Math.PI*2,b=(i+1)/12*Math.PI*2;
   triangle([x,engineY,tail-.10],[x+Math.cos(b)*r*.66,engineY+Math.sin(b)*r*.66,tail-.10],
    [x+Math.cos(a)*r*.66,engineY+Math.sin(a)*r*.66,tail-.10],3);
  }
  const rings=heavy?[-.52,-.15,.23,.58]:angular?[-.35,.25]:[-.55,.42];
  for(const z of rings)tube(x,engineY,z,heavy?.065:.035,r*1.055,r*1.055,1);
  block(x,engineY+r*.97,0,heavy?.13:.07,.027,len*.65,3);
  if(heavy) {
   for(const z of [-.47,0,.47])block(x,engineY+r+.028,z,.25,.042,.21,0);
   for(const z of [-.57,-.32,-.07,.18,.43])block(x+s*.23,engineY+.11,z,.042,.07,.075,1);
  } else {
   for(const z of [-.34,-.12,.10,.32])block(x,engineY+r+.01,z,.10,.018,.035,1);
  }
  fin(s*(heavy?.40:angular?.55:.39),heavy?-.54:angular?-.42:-.62,angular?.07:.055,heavy?.24:angular?.46:.23,angular?.68:.46);
 }
 if(heavy){block(0,.72,-.29,.035,.035,.13,1);block(0,.75,-.23,.035,.035,.03,3);}
 // Five meshes: four permanent material groups + one removable fin group.
 buckets.forEach((b,i)=>{
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));
  geometry.computeBoundingSphere();geometry.computeBoundingBox();
  const material=i===4?paintMaterial:mats[i];const mesh=new THREE.Mesh(geometry,material);
  mesh.name=['Customizable_Body_Panels','Structural_Frame_And_Engines','Faceted_Cockpit','Exhaust_And_Lighting','Optional_Stabilizers'][i];
  group.add(mesh);if(i===4)group.userData.fins=mesh;
 });
 group.userData.originalDesign=true;return group;
}

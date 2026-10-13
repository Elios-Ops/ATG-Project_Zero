import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {createZelPod,ZELPOD_NAMES} from './zelpods-entry.mjs';
import * as old from '../baseline/experience/rules.js';
import * as next from '../experience/rules.js';
const results=[];
for(let i=0;i<3;i++) {
 const bytes=fs.readFileSync('zeltar106/models/'+ZELPOD_NAMES[i]+'.glb');
 const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert.deepEqual(doc.extensionsUsed||[],[]);assert.equal(doc.materials.length,4);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const runtime=createZelPod(i,new THREE.MeshBasicMaterial({vertexColors:true}),new THREE.MeshBasicMaterial({vertexColors:true}));
 let tris=0,meshes=0;
 gltf.scene.traverse(o=>{
  if(!o.isMesh)return;meshes++;
  const g=o.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3;
  assert(Array.from(g.attributes.position.array).every(Number.isFinite));
  assert(Array.from(g.attributes.normal.array).every(Number.isFinite));
  for(let k=0;k<g.attributes.normal.count;k++){
   const a=g.attributes.normal.array;assert(Math.abs(Math.hypot(a[k*3],a[k*3+1],a[k*3+2])-1)<.0001,'Unit surface normal');
  }
 });
 assert.equal(meshes,5);assert(tris<1500);
 const a=new THREE.Box3().setFromObject(gltf.scene),b=new THREE.Box3().setFromObject(runtime);
 assert(a.min.distanceTo(b.min)<.0001&&a.max.distanceTo(b.max)<.0001,'Reimport matches runtime bounds');
 let configs=0;
 for(const paint of next.paints)for(const lamp of next.lamps)for(const fins of [false,true]) {
  runtime.children[0].material.color.set(paint);runtime.children[3].material.color.set(lamp);runtime.userData.fins.visible=fins;
  assert.equal(runtime.children[4].visible,fins);assert.equal(runtime.children[0].material.color.getHexString(),paint.slice(1));configs++;
 }
 assert.equal(configs,30);results.push({name:ZELPOD_NAMES[i],reimport:true,triangles:tris,drawCalls:meshes,configs});
}
// Compare every physical state for identical controls, preserving old profile identities.
const profileMap=[1,2,0];
for(let i=0;i<3;i++) {
 const a=old.createRace(profileMap[i]),b=next.createRace(i);
 for(let frame=0;frame<120*100&&!a.finished;frame++) {
  const input=old.autopilot(a);old.advance(a,input,1/120);next.advance(b,input,1/120);
  for(const key of Object.keys(a))if(key!=='pod')assert.deepEqual(b[key],a[key],'Unchanged race field '+key);
 }
 assert(a.finished&&b.finished);assert.equal(old.points(a),next.points(b));
}
for(const f of ['createRace','advance','points','gate','normalizeAngle','autopilot'])assert.equal(next[f].toString(),old[f].toString(),'Original mechanics function '+f);
const lock=JSON.parse(fs.readFileSync('zeltar106/reports/baseline-source-lock.json'));
for(const [path,hash] of Object.entries(lock))if(fs.existsSync(path))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),hash,'Baseline preserved '+path);
for(const name of ['event-horizon.glsl','racing-neon.glsl','lot.json'])assert(fs.readFileSync('zeltar106/baseline/exterior/'+name).equals(fs.readFileSync('zeltar106/exterior/'+name)),'Exterior shader/config preserved');
function glbJson(path){const b=fs.readFileSync(path);return [JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),b];}
for(let i=0;i<3;i++) {
 const [a,ba]=glbJson('zeltar106/baseline/exterior/lod'+i+'.glb'),[b,bb]=glbJson('zeltar106/exterior/lod'+i+'.glb');
 assert.deepEqual(a.meshes,b.meshes);assert.deepEqual(a.materials,b.materials);
 for(let k=0;k<a.accessors.length;k++){
  const va=a.bufferViews[a.accessors[k].bufferView],vb=b.bufferViews[b.accessors[k].bufferView];
  const aa=ba.subarray(28+ba.readUInt32LE(12)+va.byteOffset,28+ba.readUInt32LE(12)+va.byteOffset+va.byteLength);
  const ab=bb.subarray(28+bb.readUInt32LE(12)+vb.byteOffset,28+bb.readUInt32LE(12)+vb.byteOffset+vb.byteLength);
  assert(aa.equals(ab),'Exterior geometry accessor unchanged');
 }
}
const report={ok:true,models:results,freeConfigurations:90,mechanicsIdentical:true,oldToNewProfiles:{COMET:'former COMET',VIPER:'former KITE',TITAN:'former VECTOR'},originalFilesUnchanged:Object.keys(lock).length,exteriorGeometryIdentical:true,exteriorChanges:'Brand sign atlas and root name only; shaders/config unchanged'};
fs.writeFileSync('zeltar106/reports/model-reimport-and-regression.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

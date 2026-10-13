import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {createZelPod} from './zelpods-entry.mjs';
import * as before from '../../zeltar106/experience/rules.js';
import * as after from '../experience/rules.js';
const b=fs.readFileSync('atg007/models/VIPER.glb');
const doc=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
assert(!doc.extensionsUsed);assert.equal(doc.materials.length,4);
const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
const runtime=createZelPod(1,new THREE.MeshBasicMaterial({color:'#f3f5f4',vertexColors:true}),new THREE.MeshBasicMaterial({color:'#85ed12',vertexColors:true}));
let triangles=0,meshes=0;
gltf.scene.traverse(o=>{
 if(!o.isMesh)return;meshes++;const g=o.geometry;triangles+=(g.index?.count||g.attributes.position.count)/3;
 for(const attr of ['position','normal','color'])assert(Array.from(g.attributes[attr].array).every(Number.isFinite));
 const n=g.attributes.normal;for(let i=0;i<n.count;i++)assert(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.0001);
});
assert(triangles<5000);assert.equal(meshes,5);
const a=new THREE.Box3().setFromObject(gltf.scene),c=new THREE.Box3().setFromObject(runtime);assert(a.min.distanceTo(c.min)<.0001&&a.max.distanceTo(c.max)<.0001);
for(const paint of ['#f3f5f4',...after.paints])for(const lamp of ['#85ed12',...after.lamps])for(const fins of [true,false]){
 runtime.children[0].material.color.set(paint);runtime.children[3].material.color.set(lamp);runtime.userData.fins.visible=fins;
 assert.equal(runtime.userData.fins.visible,fins);
}
assert.equal(fs.readFileSync('atg007/experience/rules.js','utf8'),fs.readFileSync('zeltar106/experience/rules.js','utf8'),'Entire gameplay module preserved');
for(const f of ['advance','createRace','points'])assert.equal(before[f].toString(),after[f].toString());
for(const name of ['COMET','TITAN'])assert(fs.readFileSync('atg007/models/'+name+'.glb').equals(fs.readFileSync('zeltar106/models/'+name+'.glb')),'Unmodified '+name);
const lock=JSON.parse(fs.readFileSync('atg007/reports/preserved-source-lock.json'));
for(const [p,h] of Object.entries(lock))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),h,'Preserved '+p);
assert(fs.readFileSync('atg007/models/VIPER.glb').equals(fs.readFileSync('atg007/experience/assets/VIPER-007-candidate.glb')));
const result={ok:true,reviewCandidate:true,triangles,drawCalls:meshes,materials:4,bytes:b.length,textureCount:0,front:'+Z',independentReimport:true,bounds:[a.min.toArray(),a.max.toArray()],customizationAndFinVisibility:true,entireRulesModuleUnchanged:true,cometAndTitanGlbsUnchanged:true,preservedFiles:Object.keys(lock).length};
fs.writeFileSync('atg007/reports/candidate-model-validation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));

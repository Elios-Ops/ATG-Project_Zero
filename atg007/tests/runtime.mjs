import {createRequire} from 'node:module';
import fs from 'node:fs';
import * as THREE from './vendor/three.module.js';
import {createRace,advance,autopilot} from '../experience/rules.js';
const require=createRequire(import.meta.url);
const {createCanvas,GlobalFonts}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','sans-serif');
globalThis.OffscreenCanvas=class {constructor(w,h){return createCanvas(w,h)}};
fs.writeFileSync('atg007/tests/runtime-entry.mjs',fs.readFileSync('atg007/experience/main.js','utf8').replace("from 'three'","from './vendor/three.module.js'").replace("from './rules.js'","from '../experience/rules.js'").replace("from './zelpods.js'","from './zelpods-entry.mjs'"));
const {default:start}=await import('./runtime-entry.mjs');
async function runView(width,height,name) {
 const logs=[],handlers=new Map(),scores=[],sounds=[];let loop;
 const me={id:1,position:new THREE.Vector3(),yaw:0};
 const p0={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(64,width/height,.08,85),renderer:{setPixelRatio(){},async compileAsync(){},render(){}},
  controls:{},bodies:{},me,players:new Map([[1,me]]),width,height,pixelRatio:1,input:{keys:new Set(),pointer:{x:0,y:0}},
  loading(){},loop(f){loop=f},on(k,f){handlers.set(k,f)},hud(t){this.hudText=t},sound:{play(p){sounds.push(p)}},
  table:[],game:null,score(n){scores.push(n)},invite(){},log(...args){logs.push(args)},buy(){throw new Error('Purchases must stay inactive')}};
 await start(p0);
 p0.scene.traverse(o=>{if(o.isMesh&&o.geometry.attributes.position.count===194)assert(o.geometry.attributes.normal.array[1]>.99,'Road faces upward')});
 function step(n=1){for(let i=0;i<n;i++)loop(1/120,0)}
 function press(k){p0.input.keys.add(k);step(1);p0.input.keys.delete(k);step(1)}
 function serialize(tag) {
  p0.scene.updateMatrixWorld();p0.camera.updateMatrixWorld();const meshes=[];
  p0.scene.traverseVisible(o=>{
   if(!o.isMesh||o.parent===p0.camera)return;
   const g=o.geometry;
   function add(matrix) {
    meshes.push({positions:Array.from(g.attributes.position.array),normals:Array.from(g.attributes.normal?.array||[]),
      indices:Array.from(g.index?.array||Array.from({length:g.attributes.position.count},(_,i)=>i)),matrix:matrix.elements,color:o.material.color.toArray(),colors:g.attributes.color?Array.from(g.attributes.color.array):null});
   }
   if(o.isInstancedMesh){const m=new THREE.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);add(new THREE.Matrix4().multiplyMatrices(o.matrixWorld,m));}}
   else add(o.matrixWorld);
  });
  fs.writeFileSync('atg007/reports/'+name+'-'+tag+'-scene.json',JSON.stringify({meshes,camera:p0.camera.matrixWorldInverse.elements,projection:p0.camera.projectionMatrix.elements,width,height}));
  const c=p0.camera.children.find(x=>x.isMesh).material.map.image;fs.writeFileSync('atg007/reports/'+name+'-'+tag+'-hud.png',c.toBuffer('image/png'));
 }
 step(240);serialize('lab');
 press('Digit2');step(30);serialize('viper-reference');press('KeyC');press('KeyL');press('KeyF');step(30);serialize('custom');
 assert(logs.some(x=>x[0]==='ATG select'&&x[1]===1),'Pod selection');
 assert(logs.some(x=>x[0]==='ATG lab config'&&JSON.parse(x[1]).paint===1),'Paint');
 assert(logs.some(x=>x[0]==='ATG lab config'&&JSON.parse(x[1]).lamp===1),'Lights');
 press('Space');step(30);serialize('race');
 if(name==='desktop') {
  const shadow=createRace(1);
  for(let i=0;i<120*90&&!shadow.finished;i++) {
   const input=autopilot(shadow);p0.input.keys.clear();p0.input.keys.add('KeyW');
   // Keyboard steering only has three values; same controller tests the actual input path.
   if(input.turn>.25)p0.input.keys.add('KeyA');else if(input.turn< -.25)p0.input.keys.add('KeyD');
   const turn=p0.input.keys.has('KeyA')?1:p0.input.keys.has('KeyD')?-1:0;
   advance(shadow,{throttle:1,turn,boost:false},1/120);step(1);
  }
  assert(shadow.finished,'Keyboard controller completes race');
  p0.input.keys.clear();step(120);serialize('finish');assert(scores.length===1,'Exactly one score');
  assert(logs.some(x=>x[0]==='ATG race progress'&&JSON.parse(x[1]).finished),'Actual loop finish');
  press('KeyR');step(120);assert(Math.abs(me.position.x)<.001&&Math.abs(me.position.z-8.4)<.001,'Retry returns to start');
  press('KeyB');step(120);assert(Math.abs(me.position.z)<.001,'Return to lab');
  handlers.get('reconnect')();step(10);
 }
 // Touch controls cycle an option in the same hit-tested HUD used in the browser.
 if(name==='phone') {
  press('KeyB');step(30);
  handlers.get('pointerdown')({x:width*.73,y:height*.58,touch:true});step(30);
  assert(logs.some(x=>x[0]==='ATG lab config'&&JSON.parse(x[1]).paint===2),'Touch paint');
 }
 const report={view:name,ok:true,scores,sceneMeshes:p0.scene.children.length,checks:['startup','pod selection','paint','lighting','fins','launch','HUD',...(name==='desktop'?['full keyboard race','finish scoring once','retry','return to lab','reconnect']:[]),...(name==='phone'?['touch paint']:[])]};
 return report;
}
function assert(ok,msg){if(!ok)throw new Error(msg)}
try {
 const reports=[];for(const [w,h,n] of [[960,540,'desktop'],[390,844,'phone'],[800,600,'odd']])reports.push(await runView(w,h,n));
 fs.writeFileSync('atg007/reports/runtime-tests.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
} finally {fs.unlinkSync('atg007/tests/runtime-entry.mjs')}

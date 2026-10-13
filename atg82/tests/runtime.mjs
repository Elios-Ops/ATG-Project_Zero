import {createRequire} from 'node:module';
import fs from 'node:fs';
import * as THREE from './vendor/three.module.js';
import {platforms,createRun,advance} from '../experience/rules.js';
const require=createRequire(import.meta.url);
const {createCanvas,GlobalFonts}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','sans-serif');
globalThis.OffscreenCanvas=class {constructor(w,h){return createCanvas(w,h)}};
const source=fs.readFileSync(new URL('../experience/main.js',import.meta.url),'utf8');
// Test-only module with local copy of the platform's pinned THREE import.
const testSource=source.replace("from 'three'","from '../tests/vendor/three.module.js'");
fs.writeFileSync(new URL('../experience/.runtime-test.mjs',import.meta.url),testSource);
const {default:start}=await import('../experience/.runtime-test.mjs');
async function setup(width,height,name) {
 const listeners=new Map();let loop;const scores=[];
 const camera=new THREE.PerspectiveCamera(57,width/height,.1,110);
 const p0={scene:new THREE.Scene(),camera,renderer:{setPixelRatio(){},async compileAsync(){},render(){}},
 controls:{},me:{id:'tester',position:new THREE.Vector3(),yaw:0},bodies:{get:()=>null},
 width,height,pixelRatio:1,table:[],game:null,input:{keys:new Set(),pointer:{x:0,y:0}},
 loading(){},hud(t){this.hudText=t},on(e,fn){listeners.set(e,fn)},loop(fn){loop=fn},
 sound:{play(){}},invite(){},score(n){scores.push(n)},log(){}};
 await start(p0);
 function step(n=1){for(let i=0;i<n;i++)loop(1/120,i/120)}
 function serialize(tag) {
  camera.updateMatrixWorld();p0.scene.updateMatrixWorld();
  const meshes=[];
  p0.scene.traverse(o=>{
   if(!o.isMesh||o.parent===camera)return;
   const geo=o.geometry,pos=geo.attributes.position;
   meshes.push({positions:Array.from(pos.array),normals:Array.from(geo.attributes.normal?.array||[]),
    indices:Array.from(geo.index?.array||Array.from({length:pos.count},(_,i)=>i)),
    matrix:o.matrixWorld.elements,color:o.material.color.toArray()});
  });
  fs.writeFileSync('atg82/reports/'+name+'-'+tag+'-scene.json',JSON.stringify({meshes,camera:camera.matrixWorldInverse.elements,projection:camera.projectionMatrix.elements,width,height}));
  const hud=camera.children.find(x=>x.isMesh).material.map.image;
  fs.writeFileSync('atg82/reports/'+name+'-'+tag+'-hud.png',hud.toBuffer('image/png'));
 }
 step(20);serialize('start');
 if(name==='desktop') {
  const shadow=createRun();let t=20/120;
  for(let frame=0;frame<120*120&&!shadow.finished;frame++) {
   const target=platforms[shadow.next],current=platforms[shadow.lastPad];
   const dx=target.x-shadow.x,dz=target.z-shadow.z;
   const x=Math.abs(dx)>.0001?Math.sign(dx):0,z=Math.abs(dz)>.0001?Math.sign(dz):0;
   p0.input.keys.clear();
   if(x)p0.input.keys.add(x>0?'KeyD':'KeyA');
   if(z)p0.input.keys.add(z>0?'KeyS':'KeyW');
   const jump=shadow.grounded&&Math.hypot(shadow.x-current.x,shadow.z-current.z)>.8;
   if(jump)listeners.get('keydown')({code:'Space'});
   advance(shadow,{x,z,jump},1/120,t);step(1);t+=1/120;
  }
  if(!shadow.finished)throw new Error('Bot did not finish');
  p0.input.keys.clear();step(60);serialize('finish');
  if(scores.length!==1)throw new Error('Finish must submit exactly one score');
  p0.input.keys.add('KeyR');step(1);p0.input.keys.delete('KeyR');step(30);
  if(p0.me.position.x!==-8||p0.me.position.z!==8)throw new Error('Retry failed');
  listeners.get('reconnect')();step(1);
 }
 // Touch jump works with pixel-space pointers; runtime paths execute on narrow view too.
 p0.input.pointer={x:width*.67,y:height*.88};listeners.get('pointerdown')({x:width*.67,y:height*.88,touch:true});
 step(20);if(p0.me.position.y<=3.1)throw new Error('Touch jump failed');
 listeners.get('pointerdown')({x:width*.9,y:height*.88,touch:true});step(1);
 if(p0.me.position.x!==-8)throw new Error('Touch retry failed');
 return {view:name,ok:true,scores,hud:p0.hudText,camera:camera.position.toArray(),checks:['startup','scene creation','HUD rendering','touch jump','touch retry',...(name==='desktop'?['full play-through through game loop','one finish score','keyboard replay','reconnect']:[])]};
}
try {
 const results=[];
 for(const [w,h,name] of [[960,540,'desktop'],[390,844,'phone'],[800,600,'odd']])results.push(await setup(w,h,name));
 fs.writeFileSync('atg82/reports/runtime-tests.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
} finally {fs.unlinkSync('atg82/experience/.runtime-test.mjs')}

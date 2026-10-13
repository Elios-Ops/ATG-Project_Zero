import fs from 'node:fs';
import {createRequire} from 'node:module';
import * as THREE from '../../zeltar106/tests/vendor/three.module.js';
import {createRace,advance,autopilot} from '../../releases/lot106-rc008/experience/rules.js';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{createCanvas}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
globalThis.OffscreenCanvas=class{constructor(w,h){return createCanvas(w,h)}};
fs.writeFileSync('ATG-Project0/tests/rc008/touch-entry.mjs',fs.readFileSync('ATG-Project0/releases/lot106-rc008/experience/main.js','utf8').replace("from 'three'","from '../../zeltar106/tests/vendor/three.module.js'").replace("from './rules.js'","from '../../releases/lot106-rc008/experience/rules.js'").replace("from './zelpods.js'","from './zelpods-entry.mjs'"));
try {
 const {default:start}=await import('./touch-entry.mjs');const handlers=new Map(),logs=[],scores=[],ratios=[];let loop;
 const me={id:1,position:new THREE.Vector3(),yaw:0},width=390,height=844;
 const p0={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(64,width/height,.08,85),renderer:{setPixelRatio(x){ratios.push(x)},async compileAsync(){},render(){}},
 controls:{},bodies:{},me,players:new Map([[1,me]]),width,height,pixelRatio:2,input:{keys:new Set(),pointer:{x:0,y:0}},loading(){},loop(f){loop=f},on(k,f){handlers.set(k,f)},hud(){},sound:{play(){}},
 table:[],game:{minSeconds:10},score(n){scores.push(n);handlers.get('reward')({kind:'score',ok:true,place:1});handlers.get('table')([{name:'Touch pilot',score:n,you:true}]);},invite(){},log(...a){logs.push(a)},buy(){throw new Error('No purchases')}};
 await start(p0);function step(n=1,dt=1/120){for(let i=0;i<n;i++)loop(dt,0)}
 function touch(x,y){handlers.get('pointerdown')({x:width*x,y:height*y,touch:true});step(30);}
 step(240);touch(.25,.58); // VIPER candidate
 touch(.74,.58);touch(.25,.65);touch(.74,.65); // paint, lamp, optional fins
 let config=JSON.parse(logs.filter(x=>x[0]==='ATG lab config').at(-1)[1]);assert.deepEqual(config,{mode:'lab',pod:1,paint:1,lamp:1,trim:false});
 touch(.5,.90);assert(logs.some(x=>x[0]==='ATG race start'&&x[1]==='VIPER'));
 const shadow=createRace(1);
 for(let i=0;i<120*100&&!shadow.finished;i++) {
  const input=autopilot(shadow);p0.input.keys.clear();p0.input.keys.add('KeyW');
  if(input.turn>.25)p0.input.keys.add('KeyA');else if(input.turn<-.25)p0.input.keys.add('KeyD');
  const turn=p0.input.keys.has('KeyA')?1:p0.input.keys.has('KeyD')?-1:0;
  advance(shadow,{throttle:1,turn,boost:false},1/120);step();
 }
 p0.input.keys.clear();step(240);assert(shadow.finished);assert.equal(scores.length,1);assert.equal(scores[0],100000-Math.round((shadow.time+shadow.penalty)*100));
 touch(.87,.95);assert(me.position.distanceTo(new THREE.Vector3(0,1.6,8.4))<.001,'Touch replay');
 p0.input.keys.add('KeyW');touch(.62,.95);step(60);p0.input.keys.clear();
 assert(me.position.x>0,'Stick acceleration after touch boost');
 touch(.87,.12);step(240);assert(me.position.z===0,'Touch return to lab');
 // Slow-frame resolution safeguard is retained, without recompiling materials.
 step(4,.08);assert.equal(ratios.at(-1),.65);
 const report={ok:true,view:'390x844',touchSelection:'VIPER candidate',checks:['touch pod/paint/lights/fins','touch launch','36-gate race through the built-in stick key path','exact points submission once','reward/table updates','touch replay','touch boost','touch return to Lab','slow-frame resolution reduction'],score:scores[0],pixelRatioCap:1,slowPixelRatio:.65};
 fs.writeFileSync('ATG-Project0/reports/rc008/mobile-controls-tests.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {fs.unlinkSync('ATG-Project0/tests/rc008/touch-entry.mjs')}

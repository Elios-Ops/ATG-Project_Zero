import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pods,createRace,advance,autopilot,points,gate,GATES,LAPS,RADIUS,ROAD_HALF} from '../experience/rules.js';
const results=[];
for(let pod=0;pod<pods.length;pod++) {
 const r=createRace(pod),begin=performance.now();
 for(let frame=0;frame<120*120&&!r.finished;frame++)advance(r,autopilot(r),1/120);
 assert(r.finished,pods[pod].name+' must finish');assert.equal(r.cleared,GATES*LAPS);
 const finished=JSON.stringify(r);advance(r,{throttle:1,turn:1,boost:true},.1);assert.equal(JSON.stringify(r),finished);
 results.push({pod:pods[pod].name,seconds:r.time,penalty:r.penalty,points:points(r),gates:r.cleared,hits:r.hits,simulationMs:performance.now()-begin});
}
let r=createRace();for(let i=0;i<120;i++)advance(r,{throttle:1,turn:0,boost:false},1/120);
const before=r.speed;for(let i=0;i<30;i++)advance(r,{throttle:-1,turn:0,boost:false},1/120);assert(r.speed<before,'Braking lowers speed');
r=createRace();for(let i=0;i<120*15;i++)advance(r,{throttle:1,turn:0,boost:false},1/120);
assert(r.hits>0);assert(Math.hypot(r.x,r.z)<=RADIUS+ROAD_HALF+.001);assert(!r.finished);
const slower=structuredClone(r);slower.penalty++;assert(points(slower)<points(r));
r=createRace();r.x=0;r.z=-RADIUS;r.yaw=0;r.started=true;
for(let i=0;i<120;i++)advance(r,{throttle:1,turn:0,boost:false},1/120);assert(r.cleared<12,'Skipped gates cannot complete a lap');
r=createRace();for(let i=0;i<240;i++)advance(r,{throttle:1,turn:.35,boost:true},1/120);assert(r.energy<100);
for(let i=0;i<720;i++)advance(r,{throttle:0,turn:0,boost:false},1/120);assert(r.energy>90);
assert.deepEqual(createRace(1),createRace(1));
const source=fs.readFileSync('atg007/experience/main.js','utf8');assert(!source.includes('p0.buy('));assert(!source.includes('p0.win('));
const report={ok:true,runs:results,checks:['all three pods complete 36 ordered gates','braking','barriers and penalty scoring','no shortcut finish','energy recovery','finish immutable','retry reset','no purchase or prize calls']};
fs.writeFileSync('atg007/reports/physics-tests.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

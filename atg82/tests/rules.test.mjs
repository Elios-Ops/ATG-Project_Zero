import assert from 'node:assert/strict';
import {createRun,advance,platforms,fail,score,hazardX} from '../experience/rules.js';
let run=createRun(),t=0;
// Bot uses the same movement and jump physics as players. Waits on pads to time sweepers.
let log=[];
for(let frame=0;frame<120*180&&!run.finished;frame++) {
 const target=platforms[run.next];
 const dx=target.x-run.x,dz=target.z-run.z,dist=Math.hypot(dx,dz);
 const current=platforms[run.lastPad];
 let jump=run.grounded && Math.hypot(run.x-current.x,run.z-current.z)>.8;
 const input={x:dx/dist,z:dz/dist,jump};
 const event=advance(run,input,1/120,t);t+=1/120;
 if(event==='finish'||event==='checkpoint'||event==='fall')log.push({event,next:run.next,time:run.time});
}
assert(run.finished,'Bot must be able to complete every stage');
assert(run.next===platforms.length);assert(score(run)>0);
const completed={time:run.time,falls:run.falls,score:score(run)};
const frozen=JSON.stringify(run);advance(run,{x:1,z:1,jump:true},.1,t);assert.equal(JSON.stringify(run),frozen);
run=createRun();run.next=6;run.checkpoint=3;run.active=true;run.time=17;fail(run);
assert.equal(run.next,4);assert.equal(run.x,-8);assert.equal(run.falls,1);assert.equal(run.time,17);
const before=score(run);run.falls++;assert(score(run)<before);
for(let i of [4,7])for(let t=0;t<100;t+=.1)assert(Math.abs(hazardX(i,t)-platforms[i].x)<=1.35);
run=createRun();run.x=2;run.z=8;run.y=5;run.vy=-1;
for(let i=0;i<120;i++)advance(run,{x:0,z:0,jump:false},1/120,0);
assert(!run.finished,'Finish cannot bypass stage order');
assert.deepEqual(createRun(),createRun(),'Retry resets run');
console.log(JSON.stringify({ok:true,completed,checks:['full physical course completion','stage order','finish frozen','checkpoint penalty','hazard bounds','retry'],log},null,2));

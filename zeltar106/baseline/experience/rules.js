// Small kinematic racing model: no physics engine, worker or networking required.
export const RADIUS=8.4, ROAD_HALF=1.35, GATES=12, LAPS=3;
export const pods=[
  {name:'VECTOR',max:6.8,accel:5.4,turn:2.25,shape:0,description:'Balanced • quick response'},
  {name:'COMET',max:7.3,accel:4.8,turn:2.05,shape:1,description:'Fast • wide cornering'},
  {name:'KITE',max:6.3,accel:6.1,turn:2.6,shape:2,description:'Agile • tight cornering'}
];
export const paints=['#11cde0','#ffa52d','#ee4d98','#a789ff','#78e5ad'];
export const lamps=['#24eaff','#ffb43e','#ef76ff'];
export function gate(i) {
 const a=i*Math.PI*2/GATES;
 return {x:RADIUS*Math.sin(a),z:RADIUS*Math.cos(a),angle:a};
}
export function createRace(pod=0) {
 return {x:0,z:RADIUS,yaw:Math.PI/2,speed:0,steer:0,time:0,
   next:1,cleared:0,lap:1,hits:0,penalty:0,cooldown:0,energy:100,
   finished:false,pod,started:false,bestSplit:[],lastEvent:null};
}
export function normalizeAngle(a) {
 while(a>Math.PI)a-=Math.PI*2;
 while(a< -Math.PI)a+=Math.PI*2;
 return a;
}
export function points(r) {
 return Math.max(1,100000-Math.round((r.time+r.penalty)*100));
}
export function advance(r,input,dt) {
 if(r.finished)return null;
 const p=pods[r.pod];let event=null;
 if(!r.started && input.throttle>0)r.started=true;
 if(r.started)r.time+=dt;
 r.cooldown=Math.max(0,r.cooldown-dt);
 r.steer+=(input.turn-r.steer)*Math.min(1,dt*12);
 const boost=input.boost && r.energy>1 && input.throttle>0;
 if(boost)r.energy=Math.max(0,r.energy-dt*42);
 else r.energy=Math.min(100,r.energy+dt*18);
 const max=p.max*(boost?1.28:1);
 if(input.throttle>0)r.speed=Math.min(max,r.speed+p.accel*dt);
 else r.speed=Math.max(0,r.speed-dt*(input.throttle<0?9:1.1));
 if(r.speed>max)r.speed=Math.max(max,r.speed-dt*6);
 r.yaw+=r.steer*p.turn*dt*Math.min(1,r.speed/2.0);
 const oldX=r.x,oldZ=r.z;
 r.x+=Math.sin(r.yaw)*r.speed*dt;r.z+=Math.cos(r.yaw)*r.speed*dt;
 let radius=Math.hypot(r.x,r.z);
 // Smooth radial barriers prevent tunnelling or taking shortcuts across the infield.
 const low=RADIUS-ROAD_HALF,high=RADIUS+ROAD_HALF;
 if(radius<low || radius>high) {
  const bound=Math.max(low,Math.min(high,radius));
  r.x*=bound/radius;r.z*=bound/radius;r.speed*=Math.pow(.97,dt*60);
  if(r.cooldown===0 && r.started){r.hits++;r.penalty+=1;r.cooldown=.9;event='barrier';}
 }
 const target=gate(r.next%GATES);
 // Directed crossing of the checkpoint's radial plane, within the roadway.
 const tangent={x:Math.cos(target.angle),z:-Math.sin(target.angle)};
 const oldSide=(oldX-target.x)*tangent.x+(oldZ-target.z)*tangent.z;
 const newSide=(r.x-target.x)*tangent.x+(r.z-target.z)*tangent.z;
 const radial=Math.abs(r.x*Math.sin(target.angle)+r.z*Math.cos(target.angle)-RADIUS);
 if(r.started && oldSide<0 && newSide>=0 && radial<=ROAD_HALF+.1) {
  r.next++;r.cleared++;event='checkpoint';
  if(r.cleared%GATES===0) {
   r.bestSplit.push(r.time+r.penalty);r.lap++;event='lap';
   if(r.cleared===GATES*LAPS){r.finished=true;r.speed=0;event='finish';}
  }
 }
 r.lastEvent=event;return event;
}
export function autopilot(r) {
 // Test/balancing bot only; actual experience never calls this function.
 const theta=Math.atan2(r.x,r.z);
 const desired=theta+Math.PI/2;
 const radialError=Math.hypot(r.x,r.z)-RADIUS;
 const headingError=normalizeAngle(desired-r.yaw)+radialError*.38;
 return {throttle:1,turn:Math.max(-1,Math.min(1,headingError*1.8)),boost:false};
}

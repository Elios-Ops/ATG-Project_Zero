// Pure rules, shared by the renderer and headless play-through tests.
export const platforms = [
  {x:-8,z:8,y:1.5,w:4,d:4},
  {x:-8,z:3,y:1.8,w:3.5,d:3.5},
  {x:-8,z:-2,y:2.1,w:3.5,d:3.5},
  {x:-8,z:-7,y:2.4,w:4,d:4,checkpoint:true},
  {x:-3,z:-7,y:2.7,w:3.5,d:3.5,hazard:true},
  {x:2,z:-7,y:3,w:3.5,d:3.5},
  {x:7,z:-7,y:3.3,w:4,d:4,checkpoint:true},
  {x:7,z:-2,y:3.6,w:3.5,d:3.5,hazard:true},
  {x:7,z:3,y:3.9,w:3.5,d:3.5},
  {x:7,z:8,y:4.2,w:4,d:4,checkpoint:true},
  {x:2,z:8,y:4.5,w:4,d:4,finish:true}
];
export const SPEED=5.4, JUMP=7.8, GRAVITY=18, PENALTY=3;
export function createRun() {
  return {x:-8,y:1.5,z:8,vy:0,grounded:true,next:1,checkpoint:0,
    active:false,finished:false,time:0,falls:0,points:0,lastPad:0};
}
export function hazardX(i,t) {
  const p=platforms[i];
  return p.x + Math.sin(t*1.7+i)*1.35;
}
export function fail(s) {
  const p=platforms[s.checkpoint];
  Object.assign(s,{x:p.x,y:p.y,z:p.z,vy:0,grounded:true,lastPad:s.checkpoint});
  // Re-run the checkpoint segment: an earlier clear cannot skip missing pads.
  s.next=s.checkpoint+1;s.falls++;
  return 'fall';
}
export function advance(s,input,dt,t) {
  if(s.finished)return null;
  if(!s.active && (input.x || input.z || input.jump))s.active=true;
  if(s.active)s.time+=dt;
  let event=null;
  if(input.jump && s.grounded){s.vy=JUMP;s.grounded=false;event='jump';}
  const length=Math.hypot(input.x,input.z)||1;
  s.x+=input.x/length*SPEED*dt;s.z+=input.z/length*SPEED*dt;
  s.x=Math.max(-11.5,Math.min(11.5,s.x));s.z=Math.max(-11.5,Math.min(11.5,s.z));
  const before=s.y;s.vy-=GRAVITY*dt;s.y+=s.vy*dt;s.grounded=false;
  for(let i=0;i<platforms.length;i++) {
    const p=platforms[i];
    if(Math.abs(s.x-p.x)<=p.w/2 && Math.abs(s.z-p.z)<=p.d/2 &&
       s.vy<=0 && before>=p.y-0.02 && s.y<=p.y) {
      s.y=p.y;s.vy=0;s.grounded=true;s.lastPad=i;
      if(i===s.next) {
        s.next++;s.points+=100;event='pad';
        if(p.checkpoint){s.checkpoint=i;event='checkpoint';}
        if(p.finish){s.finished=true;event='finish';}
      }
      break;
    }
  }
  if(s.y<.3)return fail(s);
  for(let i=0;i<platforms.length;i++) {
    const p=platforms[i];
    if(!p.hazard)continue;
    if(Math.abs(s.x-hazardX(i,t))<.48 && Math.abs(s.z-p.z)<1.75 &&
       s.y<p.y+.55 && s.y+1.1>p.y)return fail(s);
  }
  return event;
}
// Higher-is-better avoids requiring an unapproved lowWins setting.
export function score(s) {
  return Math.max(1,100000-Math.round((s.time+s.falls*PENALTY)*100));
}
export function medal(s) {
  const time=s.time+s.falls*PENALTY;
  return time<28 && s.falls===0?'GOLD':time<45?'SILVER':'BRONZE';
}

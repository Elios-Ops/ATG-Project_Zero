import * as THREE from 'three';
import {platforms,createRun,advance,hazardX,score,medal,PENALTY} from './rules.js';

export default async function start(p0) {
  p0.loading(.1,'Opening the Academy');
  p0.controls.mode='none';p0.controls.vertical=false;
  p0.scene.background=new THREE.Color('#040b18');
  p0.scene.fog=new THREE.Fog('#040b18',35,70);
  p0.camera.fov=57;p0.camera.near=.1;p0.camera.far=110;p0.camera.updateProjectionMatrix();
  const renderer=p0.renderer;
  renderer.setPixelRatio(Math.min(1,p0.pixelRatio||1));
  const cyan=new THREE.MeshBasicMaterial({color:'#14e7fa'});
  const violet=new THREE.MeshBasicMaterial({color:'#a95dff'});
  const pink=new THREE.MeshBasicMaterial({color:'#ff4397'});
  const gold=new THREE.MeshBasicMaterial({color:'#ffcf5c'});
  const deck=new THREE.MeshBasicMaterial({color:'#172c45'});
  const dark=new THREE.MeshBasicMaterial({color:'#081426'});
  const boxGeo=new THREE.BoxGeometry(1,1,1);
  function box(x,y,z,w,h,d,m) {
    const mesh=new THREE.Mesh(boxGeo,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);p0.scene.add(mesh);return mesh;
  }
  box(0,.1,0,24,.2,24,dark);
  // A thin shell frames the indoor training floor; most tower volume remains unused.
  for(const x of [-11.9,11.9]) {
    box(x,6,0,.15,12,24,deck);
    box(x,6,0,.05,12,.05,cyan);
  }
  box(0,6,-11.9,24,12,.15,deck);
  for(const y of [1,5,9])box(0,y,-11.79,23,.04,.04,cyan);
  const hazards=[];
  platforms.forEach((p,i)=>{
    box(p.x,p.y-.3,p.z,p.w,.6,p.d,deck);
    const m=p.finish?gold:p.checkpoint?violet:cyan;
    box(p.x,p.y+.014,p.z,p.w,.028,p.d,m);
    box(p.x,p.y+.04,p.z,p.w-.12,.03,p.d-.12,dark);
    if(p.hazard)hazards.push({i,mesh:box(p.x,p.y+.25,p.z,.22,.45,3.2,pink)});
    // arrows made of geometry indicate the next pad, without relying on HUD.
    if(i<platforms.length-1) {
      const n=platforms[i+1];const a=new THREE.ArrowHelper(
        new THREE.Vector3(n.x-p.x,0,n.z-p.z).normalize(),
        new THREE.Vector3(p.x,p.y+.06,p.z),1,m.color,.35,.3);
      p0.scene.add(a);
    }
    if(p.checkpoint || p.finish) {
      for(const x of [-p.w/2+.1,p.w/2-.1])box(p.x+x,p.y+1.3,p.z,.12,2.6,.12,m);
      box(p.x,p.y+2.6,p.z,p.w,.12,.12,m);
    }
  });
  p0.loading(.45,'Marking the course');
  // All critical information is in-scene; p0.hud is only a supplementary guide.
  const canvas=new OffscreenCanvas(1024,768),ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.generateMipmaps=false;
  const hudMat=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false});
  const hud=new THREE.Mesh(new THREE.PlaneGeometry(1,1),hudMat);hud.renderOrder=1000;
  p0.scene.add(p0.camera);p0.camera.add(hud);
  const body=new THREE.Group();
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.23,.55,4,8),cyan);torso.position.y=.6;body.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.21,8,6),gold);head.position.y=1.18;body.add(head);
  p0.scene.add(body);
  // City's shared glass bodies remain visible for other visitors; own body is replaced.
  const own=p0.bodies.get(p0.me.id);if(own)own.visible=false;
  let run=createRun(),best=null,acc=0,visual=0,refresh=0,flash='',flashTime=0;
  let jumpQueued=false,lastJump=false,lastRetry=false,lastInvite=false,scoreSent=false,pendingScore=null,table=p0.table||[];
  let rewardText='',qualityFrames=0;
  function reset() {
    run=createRun();scoreSent=false;pendingScore=null;rewardText='';
    flash='CLEAR EVERY PAD IN ORDER';flashTime=3;jumpQueued=false;
  }
  function effect(name) {p0.sound.play('assets/'+name+'.wav',{volume:.22});}
  function key(e) {
    const code=typeof e==='string'?e:e.code;
    if(code==='Space')jumpQueued=true;
  }
  p0.on('keydown',key);
  p0.on('pointerdown',e=>{
    // Bottom two oversized controls in our camera HUD, also usable with mouse.
    const rawX=e.x??p0.input.pointer.x,rawY=e.y??p0.input.pointer.y;
    const x=rawX/Math.max(1,p0.width),y=rawY/Math.max(1,p0.height);
    if(y>.78 && x>.78)reset();
    else if(y>.78 && x>.55)jumpQueued=true;
  });
  p0.on('table',top=>{table=top;refresh=1;});
  p0.on('reward',r=>{
    if(r.kind!=='score')return;
    rewardText=r.ok?'WEEKLY BEST SAVED • PLACE '+(r.place||'—'):(r.reason||'Result kept for this visit');
    refresh=1;
  });
  p0.on('reconnect',()=>{
    table=p0.table||[];
    const mine=p0.bodies.get(p0.me.id);if(mine)mine.visible=false;
    flash='RECONNECTED • YOUR RUN CONTINUES';flashTime=3;
  });
  p0.hud('WASD / arrows move • Space jumps • R retries • I invites\nTouch stick moves; tap JUMP or RETRY. Clear pads in order. Falls add 3s; purple gates are checkpoints. Higher points win. Esc leaves.');
  function text(t,x,y,size,color='#e0f2ff',align='left') {
    ctx.font='bold '+size+'px sans-serif';ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(t,x,p0.camera.aspect<.75?y:y*canvas.height/768);
  }
  function panel(x,y,w,h) {ctx.fillStyle='rgba(4,12,26,.87)';const factor=p0.camera.aspect<.75?1:canvas.height/768;ctx.fillRect(x,y*factor,w,h*factor);}
  function drawHud() {
    if(p0.camera.aspect<.75) {drawPhone();return;}
    ctx.clearRect(0,0,canvas.width,canvas.height);
    panel(20,18,984,119);
    text('ALL THINGS GAMED',42,51,18,'#18e8ff');
    text('GLADIATOR TRAINING ACADEMY',42,88,27);
    const seconds=run.time+run.falls*PENALTY;
    text(seconds.toFixed(2)+'s',975,83,40,'#ffcf5c','right');
    text('STAGE '+Math.min(10,run.next-1)+'/10  •  FALLS '+run.falls+'  •  +3s / FALL',42,119,17);
    if(!run.active) {
      panel(140,160,744,150);
      text('YOUR FIRST RUN STARTS WHEN YOU MOVE',512,196,22,'#ffcf5c','center');
      text('WASD / ARROWS MOVE  •  SPACE JUMPS',512,230,20,'#e0f2ff','center');
      text('FOLLOW THE ARROWS  •  CLEAR EVERY PAD',512,263,18,'#18e8ff','center');
      text('PURPLE = CHECKPOINT  •  PINK = MOVING HAZARD',512,292,16,'#d4b3ff','center');
    }
    if(run.finished) {
      panel(140,165,744,200);
      text(medal(run)+' • COURSE COMPLETE',512,208,32,'#ffcf5c','center');
      text(score(run)+' POINTS  •  '+seconds.toFixed(2)+' SECONDS',512,249,24,'#18e8ff','center');
      text('BEST THIS VISIT: '+(best===null?'—':best.toFixed(2)+'s'),512,287,20,'#e0f2ff','center');
      text(rewardText||'PRESS R OR TAP RETRY FOR ANOTHER RUN',512,330,16,'#d4b3ff','center');
    } else if(flashTime>0 && run.active) {
      text(flash,30,699,18,'#d4b3ff');
    }
    if(!run.active||run.finished) {
    panel(22,450,365,140);text('WEEKLY LEADERS',42,478,18,'#18e8ff');
    if(!table.length)text('FINISH TO SET THE FIRST SCORE',42,515,15);
    table.slice(0,3).forEach((r,i)=>text((i+1)+'. '+String(r.name).slice(0,15)+'  '+r.score,42,511+i*29,17));
    }
    text('WASD • SPACE • R RETRY • I INVITE',30,740,16);
    panel(570,623,210,108);panel(800,623,202,108);
    text('JUMP',675,687,31,'#18e8ff','center');text('RETRY',900,687,28,'#ffcf5c','center');
    texture.needsUpdate=true;
  }
  function drawPhone() {
    const h=canvas.height,w=768;
    ctx.clearRect(0,0,w,h);panel(14,14,740,200);
    text('ALL THINGS GAMED',36,62,31,'#18e8ff');
    text('GLADIATOR ACADEMY',36,112,39);
    text((run.time+run.falls*PENALTY).toFixed(2)+'s',36,171,43,'#ffcf5c');
    text('STAGE '+Math.min(10,run.next-1)+'/10',735,162,32,'#d4b3ff','right');
    if(!run.active) {
      panel(32,235,704,230);
      text('MOVE TO START',384,285,36,'#ffcf5c','center');
      text('STICK MOVES • TAP JUMP',384,334,29,'#e0f2ff','center');
      text('FOLLOW ARROWS • CLEAR ALL PADS',384,381,26,'#18e8ff','center');
      text('PURPLE GATES SAVE YOUR PROGRESS',384,426,25,'#d4b3ff','center');
    }
    if(run.finished) {
      panel(32,245,704,290);
      text(medal(run)+' • COMPLETE',384,300,40,'#ffcf5c','center');
      text(score(run)+' POINTS',384,361,36,'#18e8ff','center');
      text('BEST '+best.toFixed(2)+'s • '+run.falls+' FALLS',384,417,30,'#e0f2ff','center');
      text(rewardText?'SCORE: '+(rewardText.includes('SAVED')?'SAVED':'SEE GAME HUD'):'TAP RETRY TO RACE AGAIN',384,482,24,'#d4b3ff','center');
    } else if(flashTime>0&&run.active) {
      panel(26,235,716,68);text(flash,384,280,27,'#d4b3ff','center');
    }
    if(!run.active||run.finished) {
    panel(20,h*.71,728,165);text('WEEKLY LEADERS',42,h*.71+39,27,'#18e8ff');
    if(!table.length)text('BE THE FIRST TO FINISH',42,h*.71+86,27);
    table.slice(0,2).forEach((r,i)=>text((i+1)+'. '+String(r.name).slice(0,17)+'  '+r.score,42,h*.71+85+i*42,27));
    }
    panel(426,h*.82,158,h*.13);panel(600,h*.82,155,h*.13);
    text('JUMP',505,h*.90,32,'#18e8ff','center');text('RETRY',676,h*.90,31,'#ffcf5c','center');
    texture.needsUpdate=true;
  }
  // Fixed overview avoids pointer-lock dependency and keeps all jumps visible.
  p0.camera.position.set(0,24,10);p0.camera.lookAt(0,2,0);
  function layout() {
    const portrait=p0.camera.aspect<.75;
    canvas.width=portrait?768:1024;canvas.height=portrait?Math.round(768/p0.camera.aspect):Math.round(1024/p0.camera.aspect);
    p0.camera.position.set(0,Math.min(53,24/Math.min(1,p0.camera.aspect)),10);
    p0.camera.lookAt(0,2,0);
    const distance=1,hh=2*Math.tan(THREE.MathUtils.degToRad(p0.camera.fov/2))*distance;
    hud.position.set(0,0,-distance);hud.scale.set(hh*p0.camera.aspect,hh,1);
  }
  layout();p0.on('resize',layout);drawHud();
  p0.loading(.9,'Ready to train');
  await renderer.compileAsync(p0.scene,p0.camera);
  renderer.render(p0.scene,p0.camera);
  let gameAge=0;
  p0.loop((dt,t)=>{
    gameAge+=dt;
    if(dt>.065)qualityFrames++;
    if(qualityFrames===4){renderer.setPixelRatio(.65);qualityFrames++;}
    visual+=Math.min(dt,.1);flashTime-=dt;
    const keys=p0.input.keys;
    const retry=keys.has('KeyR'),invite=keys.has('KeyI');
    if(retry&&!lastRetry)reset();
    if(invite&&!lastInvite)p0.invite({kind:'team',note:'Race the ATG Training Academy!'});
    lastRetry=retry;lastInvite=invite;
    const x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
    const held=keys.has('Space');
    if(held&&!lastJump)jumpQueued=true;lastJump=held;
    acc+=Math.min(dt,.1);
    while(acc>=1/120) {
      const event=advance(run,{x,z,jump:jumpQueued},1/120,visual);jumpQueued=false;acc-=1/120;
      if(['pad','checkpoint','fall','finish'].includes(event))p0.log('ATG progress',JSON.stringify({next:run.next,checkpoint:run.checkpoint,finished:run.finished}));
      if(event==='fall'){flash='RESET TO CHECKPOINT • +3s';flashTime=2;effect('fall');}
      if(event==='checkpoint'){flash='CHECKPOINT LOCKED';flashTime=2;effect('checkpoint');}
      if(event==='jump')effect('jump');
      if(event==='finish') {
        const total=run.time+run.falls*PENALTY;best=best===null?total:Math.min(best,total);
        pendingScore=score(run);effect('finish');
      }
    }
    if(pendingScore!==null&&!scoreSent&&gameAge>=Math.max(10,p0.game?.minSeconds||10)) {
      p0.score(pendingScore);scoreSent=true;
    }
    for(const h of hazards)h.mesh.position.x=hazardX(h.i,visual);
    body.position.set(run.x,run.y,run.z);
    if(x||z)body.rotation.y=Math.atan2(x,z);
    p0.me.position.set(run.x,run.y+1.6,run.z);p0.me.yaw=body.rotation.y;
    refresh+=dt;if(refresh>.1){drawHud();refresh=0;}
  });
  p0.log('Academy ready: 10 stages, 3 checkpoints, 2 moving hazards.');
}

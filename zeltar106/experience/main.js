import * as THREE from 'three';
import {createZelPod} from './zelpods.js';
import {pods,paints,lamps,RADIUS,ROAD_HALF,GATES,LAPS,gate,createRace,advance,points} from './rules.js';

export default async function start(p0) {
 p0.loading(.1,'Opening the Design Lab');
 p0.controls.mode='none';p0.controls.vertical=false;
 p0.scene.background=new THREE.Color('#030917');
 p0.scene.fog=new THREE.Fog('#030917',23,52);
 p0.camera.fov=64;p0.camera.near=.08;p0.camera.far=85;p0.camera.updateProjectionMatrix();
 const renderer=p0.renderer;renderer.setPixelRatio(Math.min(1,p0.pixelRatio||1));
 const colors={deck:'#142943',dark:'#081425',cyan:'#1ddbf6',gold:'#ffac35',pink:'#f45d9b'};
 const mats={};for(const [k,v] of Object.entries(colors))mats[k]=new THREE.MeshBasicMaterial({color:v});
 const podPaint=new THREE.MeshBasicMaterial({color:paints[0]});
 const podLamp=new THREE.MeshBasicMaterial({color:lamps[0]});
 const boxGeo=new THREE.BoxGeometry(1,1,1);
 const track=new THREE.Group(),lab=new THREE.Group();p0.scene.add(track,lab);
 function box(parent,x,y,z,w,h,d,m) {
  const mesh=new THREE.Mesh(boxGeo,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;
 }
 // Track rings are merged strips: a small draw count, no shadows or post-processing.
 function ring(inner,outer,y,material) {
  const n=96,pos=[],idx=[];
  for(let i=0;i<=n;i++) {
   const a=i/n*Math.PI*2;
   for(const r of [inner,outer])pos.push(Math.sin(a)*r,y,Math.cos(a)*r);
   if(i<n){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setIndex(idx);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);track.add(mesh);return mesh;
 }
 box(track,0,.05,0,24,.1,24,mats.dark);
 ring(RADIUS-ROAD_HALF,RADIUS+ROAD_HALF,.15,mats.deck);
 ring(RADIUS-ROAD_HALF,RADIUS-ROAD_HALF+.055,.17,mats.cyan);
 ring(RADIUS+ROAD_HALF-.055,RADIUS+ROAD_HALF,.17,mats.gold);
 // A centre reactor adds depth without obstructing the road or chase camera.
 const reactor=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.6,1.6,16),mats.dark);
 reactor.position.y=.85;track.add(reactor);
 const halo=new THREE.Mesh(new THREE.TorusGeometry(2.3,.06,4,32),mats.cyan);halo.rotation.x=Math.PI/2;halo.position.y=1.7;track.add(halo);
 const gateMeshes=[];
 for(let i=0;i<GATES;i++) {
  const p=gate(i),group=new THREE.Group();group.position.set(p.x,0,p.z);group.rotation.y=p.angle;
  for(const x of [-ROAD_HALF,ROAD_HALF])box(group,0,.85,x,.09,1.7,.09,mats.dark);
  // local Z is radial; local X tangent: gate spans the track radially.
  const beam=box(group,0,1.75,0,.12,.12,ROAD_HALF*2.1,mats.cyan);
  const flag=box(group,0,.8,ROAD_HALF,.10,1.5,.10,mats.cyan);
  track.add(group);gateMeshes.push({group,flag,beam});
 }
 // Race furniture is instanced once per material.
 const chevrons=new THREE.InstancedMesh(boxGeo,mats.cyan,48),matrix=new THREE.Matrix4();
 for(let i=0;i<48;i++) {
  const a=i/48*Math.PI*2;matrix.compose(new THREE.Vector3(Math.sin(a)*RADIUS,.17,Math.cos(a)*RADIUS),
   new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),a),new THREE.Vector3(.08,.025,.35));chevrons.setMatrixAt(i,matrix);
 }
 track.add(chevrons);
 box(lab,0,.05,0,23.5,.1,23.5,mats.dark);
 for(const x of [-10,10])box(lab,x,3,-3,.14,6,17,mats.deck);
 box(lab,0,3,-10,20,6,.14,mats.deck);
 for(const y of [1,3,5])box(lab,0,y,-9.88,20,.04,.04,mats.cyan);
 const plinth=new THREE.Mesh(new THREE.CylinderGeometry(3.1,3.3,.35,32),mats.deck);plinth.position.y=.25;lab.add(plinth);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(3.1,.035,4,48),mats.gold);rim.rotation.x=Math.PI/2;rim.position.y=.45;lab.add(rim);
 const podRoot=new THREE.Group();p0.scene.add(podRoot);
 const podModels=[];
 podPaint.vertexColors=true;podLamp.vertexColors=true;
 for(let i=0;i<3;i++) {
  const g=createZelPod(i,podPaint,podLamp);podRoot.add(g);podModels.push(g);
 }
 p0.loading(.55,'Preparing your free workshop');
 const canvas=new OffscreenCanvas(1024,576),ctx=canvas.getContext('2d');
 const texture=new THREE.CanvasTexture(canvas);texture.generateMipmaps=false;
 const hud=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));
 hud.renderOrder=1000;p0.scene.add(p0.camera);p0.camera.add(hud);
 p0.bodies.visible=false;
 const rivals=new Map();
 const rivalTemplate=createZelPod(0,new THREE.MeshBasicMaterial({color:'#f45d9b',vertexColors:true}),new THREE.MeshBasicMaterial({color:'#ffac35',vertexColors:true}));
 function showRival(player) {
  if(player.id===p0.me.id||rivals.has(player.id))return;
  const g=rivalTemplate.clone(); // Shared immutable meshes avoid allocations on reconnect.
  p0.scene.add(g);rivals.set(player.id,g);
 }
 for(const p of p0.players.values())showRival(p);
 p0.on('join',showRival);p0.on('leave',p=>{const g=rivals.get(p.id);if(g)p0.scene.remove(g);rivals.delete(p.id)});
 let mode='lab',choice=0,paint=0,lamp=0,trim=true;
 let race=createRace(),best=null,clock=0,acc=0,refresh=0,scoreSent=false,pending=null;
 let table=p0.table||[],reward='',touchBoost=0,slow=0,notice='',noticeTime=0;
 const prior=new Set(),buttons=[];
 const cameraWant=new THREE.Vector3(),focus=new THREE.Vector3();
 const ownPosition=new THREE.Vector3();
 function effect(name){p0.sound.play('assets/'+name+'.wav',{volume:.18});}
 function customize() {
  podPaint.color.set(paints[paint]);podLamp.color.set(lamps[lamp]);
  podModels.forEach((p,i)=>{p.visible=i===choice;p.userData.fins.visible=trim});
 }
 function launch() {
  mode='race';acc=0;race=createRace(choice);scoreSent=false;pending=null;reward='';
  notice='THREE LAPS • FOLLOW THE GOLD GATE';noticeTime=2;effect('launch');
  p0.log('ATG race start',pods[choice].name);
 }
 function action(id) {
  if(id==='launch'||id==='retry')launch();
  if(id==='lab'){mode='lab';pending=null;reward='';}
  if(id==='pod'){choice=(choice+1)%pods.length;customize();}
  if(id==='paint'){paint=(paint+1)%paints.length;customize();}
  if(id==='lamp'){lamp=(lamp+1)%lamps.length;customize();}
  if(id==='trim'){trim=!trim;customize();}
  if(id==='boost')touchBoost=.7;
  if(id==='invite')p0.invite({kind:'team',note:'Race ZELTAR at The ZEL Towers!'});
  p0.log('ATG lab config',JSON.stringify({mode,pod:choice,paint,lamp,trim}));
 }
 p0.on('pointerdown',e=>{
  const x=(e.x??p0.input.pointer.x)/p0.width*canvas.width;
  const y=(e.y??p0.input.pointer.y)/p0.height*canvas.height;
  const b=buttons.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);
  if(b)action(b.id);
 });
 p0.on('table',top=>{table=top;refresh=1;});
 p0.on('reward',r=>{
  if(r.kind!=='score')return;
  reward=r.ok?'WEEKLY BEST SAVED • PLACE '+(r.place||'—'):(r.reason||'Score kept for this visit');refresh=1;
 });
 p0.on('reconnect',()=>{
  for(const g of rivals.values())p0.scene.remove(g);rivals.clear();for(const p of p0.players.values())showRival(p);
  table=p0.table||[];notice='RECONNECTED • RUN RETAINED';noticeTime=2;
 });
 p0.hud('ZelPod Lab: 1/2/3 vehicle • C paint • L lighting • F fins • Space race\nRace: W accelerate / S brake • A/D steer • Shift boost • R retry • B Lab • I invite\nTouch: stick drives; tap free Lab options or BOOST / RETRY. Three laps, all gates in order. Barrier hit +1s. Higher points win. Esc leaves.');
 function text(t,x,y,size,color='#e0efff',align='left') {
  ctx.font='bold '+size+'px sans-serif';ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(t,x,y);
 }
 function panel(x,y,w,h){ctx.fillStyle='rgba(3,10,23,.88)';ctx.fillRect(x,y,w,h);}
 function button(id,label,x,y,w,h,color='#19e4fa') {
  panel(x,y,w,h);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
  text(label,x+w/2,y+h*.63,canvas.width<800?29:20,color,'center');buttons.push({id,x,y,w,h});
 }
 function leaderboard(x,y,w) {
  panel(x,y,w,132);text('WEEKLY LEADERS',x+16,y+28,18,'#ffb343');
  if(!table.length)text('FINISH TO SET THE FIRST SCORE',x+16,y+66,14);
  table.slice(0,3).forEach((r,i)=>text((i+1)+'. '+String(r.name).slice(0,14)+'  '+r.score,x+16,y+61+i*25,16));
 }
 function draw() {
  const w=canvas.width,h=canvas.height,phone=w<800;
  ctx.clearRect(0,0,w,h);buttons.length=0;
  panel(12,12,w-24,phone?155:92);
  text('ALL THINGS GAMED  /  ZELTAR',30,phone?52:39,phone?28:17,'#1ddbf6');
  text(mode==='lab'?'ZELPOD DESIGN LAB':'ZELTAR • AURORA CIRCUIT',30,phone?105:71,phone?38:27);
  if(mode==='lab') {
   if(phone) {
    panel(20,190,w-40,156);
    text(pods[choice].name+' • FREE',w/2,240,38,'#ffb343','center');
    text(pods[choice].description,w/2,289,27,'#cbdcf2','center');
    text('YOUR ZELPOD • YOUR COLOURS • YOUR RUN',w/2,328,23,'#1ddbf6','center');
    const y=h*.55,half=(w-72)/2;
    button('pod','ZELPOD',24,y,half,96);button('paint','PAINT',48+half,y,half,96,paints[paint]);
    button('lamp','LIGHTS',24,y+114,half,96,lamps[lamp]);button('trim',trim?'FINS ON':'FINS OFF',48+half,y+114,half,96);
    button('launch','RACE • 3 LAPS',24,h*.86,w-48,116,'#ffb343');
   } else {
    panel(20,130,286,198);
    text(pods[choice].name+' • FREE',38,165,28,'#ffb343');
    text(pods[choice].description,38,195,16);
    text('1 / 2 / 3 • PICK A ZELPOD',38,225,16,'#8acbdf');
    text('C PAINT  •  L LIGHTS  •  F FINS',38,254,14);
    text('All options are free',38,288,17,'#a9ddbc');
    text('POINTS = 100000 - 100 x time',38,315,13,'#8acbdf');
    leaderboard(w-302,130,282);
    button('pod','ZELPOD',24,h-102,156,64);button('paint','PAINT',198,h-102,156,64,paints[paint]);
    button('lamp','LIGHTS',372,h-102,156,64,lamps[lamp]);button('trim',trim?'FINS ON':'FINS OFF',546,h-102,156,64);
    button('launch','RACE',w-240,h-102,214,64,'#ffb343');
   }
  } else {
   const secs=race.time+race.penalty;
   text(secs.toFixed(2)+'s',w-30,phone?152:72,phone?38:36,'#ffb343','right');
   text('LAP '+Math.min(LAPS,race.lap)+'/'+LAPS+'  •  GATE '+(race.finished?GATES:race.cleared%GATES)+'/'+GATES+'  •  +'+race.penalty+'s',30,phone?149:99,phone?25:15);
   if(!race.started&&!race.finished){panel(26,phone?215:130,w-52,phone?155:84);text('W / STICK FORWARD TO ACCELERATE',w/2,phone?267:164,phone?28:23,'#ffb343','center');text('A/D STEER • S BRAKE • SHIFT BOOST',w/2,phone?315:195,phone?24:18,'#e0efff','center');}
   if(race.finished) {
    const y=phone?230:135;panel(26,y,w-52,phone?290:177);
    text('ZELTAR • RACE COMPLETE',w/2,y+(phone?63:45),phone?45:32,'#ffb343','center');
    text(points(race)+' POINTS',w/2,y+(phone?128:83),phone?43:30,'#1ddbf6','center');
    text('BEST THIS VISIT '+best.toFixed(2)+'s',w/2,y+(phone?186:117),phone?29:20,'#e0efff','center');
    text(phone?(reward?'RESULT RECORDED':'TAP RETRY TO GO AGAIN'):(reward||'R RETRIES • B RETURNS TO DESIGN LAB'),w/2,y+(phone?246:153),phone?24:16,'#ccaafa','center');
    if(!phone)leaderboard(26,h-258,305);
   }
   const ey=phone?180:h-190;
   if(!race.finished){panel(24,ey,phone?400:245,phone?72:53);text('BOOST '+Math.round(race.energy)+'%  •  '+(race.speed*30).toFixed(0)+' KM/H',38,ey+(phone?46:33),phone?22:15);}
   if(noticeTime>0&&!race.finished&&race.started)text(notice,30,phone?310:h-219,phone?23:16,'#e5b1ff');
   const bh=phone?108:62,bw=phone?158:150;
   button('boost','BOOST',w-bw*2-54,h-bh-30,bw,bh,'#ffb343');
   button('retry','RETRY',w-bw-30,h-bh-30,bw,bh);
   button('lab','LAB',phone?w-190:24,phone?180:h-98,phone?160:150,phone?72:62,'#ccaafa');
  }
  texture.needsUpdate=true;
 }
 function layout() {
  canvas.width=p0.camera.aspect<.75?768:1024;canvas.height=Math.round(canvas.width/p0.camera.aspect);
  const hh=2*Math.tan(THREE.MathUtils.degToRad(p0.camera.fov/2));hud.position.set(0,0,-1);hud.scale.set(hh*p0.camera.aspect,hh,1);refresh=1;
 }
 layout();p0.on('resize',layout);customize();
 p0.camera.position.set(4,4.6,7);p0.camera.lookAt(0,.8,0);draw();
 // Both modes are made visible for warm-up, then only the chosen mode is drawn.
 track.visible=lab.visible=true;p0.loading(.9,'Ready to design');
 await renderer.compileAsync(p0.scene,p0.camera);renderer.render(p0.scene,p0.camera);
 p0.loop((dt,t)=>{
  clock+=dt;touchBoost=Math.max(0,touchBoost-dt);noticeTime-=dt;
  const keys=p0.input.keys;
  function edge(code){return keys.has(code)&&!prior.has(code);}
  if(mode==='lab') {
   for(let i=0;i<3;i++)if(edge('Digit'+(i+1))){choice=i;customize();p0.log('ATG select',i);}
   if(edge('KeyC'))action('paint');if(edge('KeyL'))action('lamp');if(edge('KeyF'))action('trim');
   if(edge('Space'))launch();
  } else {
   if(edge('KeyR'))launch();if(edge('KeyB'))action('lab');
  }
  if(edge('KeyI'))action('invite');prior.clear();for(const k of keys)prior.add(k);
  if(dt>.07&&++slow===4)renderer.setPixelRatio(.65);
  track.visible=mode==='race';lab.visible=mode==='lab';
  if(mode==='race') {
   const throttle=keys.has('KeyW')||keys.has('ArrowUp')?1:keys.has('KeyS')||keys.has('ArrowDown')?-1:0;
   const turn=Number(keys.has('KeyA')||keys.has('ArrowLeft'))-Number(keys.has('KeyD')||keys.has('ArrowRight'));
   acc+=Math.min(dt,.1);
   while(acc>=1/120) {
    const event=advance(race,{throttle,turn,boost:keys.has('ShiftLeft')||touchBoost>0},1/120);acc-=1/120;
    if(event==='barrier'){notice='BARRIER HIT • +1s';noticeTime=1.2;effect('hit');}
    if(event==='checkpoint')effect('gate');
    if(event==='lap'){notice='LAP COMPLETE';noticeTime=1.5;effect('lap');}
    if(event) p0.log('ATG race progress',JSON.stringify({gate:race.cleared,lap:race.lap,finished:race.finished}));
    if(event==='finish'){const total=race.time+race.penalty;best=best===null?total:Math.min(best,total);pending=points(race);effect('finish');}
   }
   if(pending!==null&&!scoreSent&&clock>=Math.max(10,p0.game?.minSeconds||10)){p0.score(pending);scoreSent=true;}
   podRoot.scale.setScalar(1);podRoot.position.set(race.x,.24,race.z);podRoot.rotation.set(0,race.yaw,0);
   const back=3.6+race.speed*.10;
   cameraWant.set(race.x-Math.sin(race.yaw)*back,3.6,race.z-Math.cos(race.yaw)*back);
   cameraWant.x=THREE.MathUtils.clamp(cameraWant.x,-11.8,11.8);cameraWant.z=THREE.MathUtils.clamp(cameraWant.z,-11.8,11.8);
   p0.camera.position.lerp(cameraWant,1-Math.exp(-dt*7));focus.set(race.x+Math.sin(race.yaw)*1.7,.5,race.z+Math.cos(race.yaw)*1.7);p0.camera.lookAt(focus);
   ownPosition.set(race.x,1.6,race.z);p0.me.yaw=race.yaw;
   for(let i=0;i<GATES;i++){const m=i===race.next%GATES?mats.gold:mats.cyan;gateMeshes[i].flag.material=m;gateMeshes[i].beam.material=m;}
  } else {
   podRoot.scale.setScalar(1.6);podRoot.position.set(0,.52,0);podRoot.rotation.set(0,clock*.25,0);
   const y=p0.camera.aspect<.75?7:4.6;
   cameraWant.set(4,y,p0.camera.aspect<.75?9.2:7);
   p0.camera.position.lerp(cameraWant,1-Math.exp(-dt*4));p0.camera.lookAt(0,p0.camera.aspect<.75?-.15:.8,0);ownPosition.set(0,1.6,0);
  }
  p0.me.position.copy(ownPosition);
  for(const [id,g] of rivals){const p=p0.players.get(id);if(!p)continue;g.position.lerp(p.position,Math.min(1,dt*10));g.position.y=.4;g.rotation.y=p.yaw;g.visible=mode==='race';}
  halo.rotation.z=clock*.3;
  refresh+=dt;if(refresh>.1){draw();refresh=0;}
 });
 p0.log('ATG Design Lab ready: 3 free ZelPods, 5 paints, 3 lights, fins; 3-lap circuit.');
}

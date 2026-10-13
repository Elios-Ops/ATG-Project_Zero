const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const http=require('http'),fs=require('fs'),path=require('path');
 const root=path.resolve('atg82');
 const server=http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');
  const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'application/octet-stream');
  res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(5500,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'},executablePath:'/tmp/atg-shell/chrome-headless-shell-linux64/chrome-headless-shell',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const context=await browser.newContext({permissions:['local-network-access'],ignoreHTTPSErrors:true});
 const page=await context.newPage();
 page.on('console',m=>console.log(m.type(),m.text().slice(0,400)));
 page.on('pageerror',e=>console.log('PAGEERROR',e.message));
 await page.goto('https://project0.city/devkit?entry=http://localhost:5500/experience/main.js&width=25&depth=25&height=57&size=960x540&players=2',{waitUntil:'domcontentloaded',timeout:60000});
 const started=await page.evaluate(()=>devkit.wait());
 if(started!=='started')throw new Error('Devkit startup failed');
 await page.waitForTimeout(500);await page.evaluate(()=>devkit.press('KeyR',50));
 const pads=[[-8,8,1.5],[-8,3,1.8],[-8,-2,2.1],[-8,-7,2.4],[-3,-7,2.7],[2,-7,3],[7,-7,3.3],[7,-2,3.6],[7,3,3.9],[7,8,4.2],[2,8,4.5]];
 let done=false;const start=Date.now();
 while(Date.now()-start<75000) {
  const state=await page.evaluate(()=>({position:devkit.room?.position,console:devkit.console}));
  let next=1;
  for(const line of state.console)if(line.includes('ATG progress')) {
   const progress=JSON.parse(line.slice(line.indexOf('{')));next=progress.next;if(progress.finished)done=true;
  }
  if(done)break;
  const p=state.position,target=pads[next];if(!p){await page.waitForTimeout(100);continue;}if(!target)throw new Error('Missing target');
  const dx=target[0]-p.x,dz=target[1]-p.z;
  const x=Math.abs(dx)>.35?Math.sign(dx):0,z=Math.abs(dz)>.35?Math.sign(dz):0;
  const current=pads[next-1];
  // Settle after landing, then trigger a jump near the departure edge.
  const fromCenter=Math.hypot(p.x-current[0],p.z-current[1]);
  const lead=Math.max(0,(.95-fromCenter)/5.4)*1000;
  const duration=Math.max(350,Math.hypot(dx,dz)/5.4*1000);
  await page.evaluate(({x,z})=>{
   for(const [k,d] of [['KeyD',x>0],['KeyA',x<0],['KeyS',z>0],['KeyW',z<0]])devkit.key(k,d);
  },{x,z});
  await page.waitForTimeout(lead);
  await page.evaluate(()=>devkit.press('Space',60));
  await page.waitForTimeout(Math.max(0,duration-lead-60));
  await page.evaluate(()=>{for(const k of ['KeyD','KeyA','KeyS','KeyW'])devkit.key(k,false)});
  await page.waitForTimeout(250);

 }
 await page.evaluate(()=>{for(const k of ['KeyD','KeyA','KeyS','KeyW','Space'])devkit.key(k,false)});
 if(!done)throw new Error('Official devkit bot did not complete within 75s');
 await page.waitForTimeout(1000);
 const result=await page.evaluate(()=>({status:devkit.status,errors:devkit.errors,console:devkit.console,frames:devkit.frames,room:devkit.room}));
 fs.writeFileSync('atg82/reports/devkit-full-playthrough.json',JSON.stringify(result,null,2));
 console.log('FULL RUN',JSON.stringify(result));
 await page.screenshot({path:'atg82/reports/internal-devkit-finish.png'});
 await page.evaluate(()=>devkit.press('KeyR',80));
 await page.waitForTimeout(300);
 const pos=await page.evaluate(()=>devkit.room.position);
 if(Math.abs(pos.x+8)>.05||Math.abs(pos.z-8)>.05)throw new Error('Official browser replay failed');
 console.log('Replay passed');
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});

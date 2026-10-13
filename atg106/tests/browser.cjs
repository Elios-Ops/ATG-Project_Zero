const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const http=require('http'),fs=require('fs'),path=require('path');
 const root=path.resolve('atg106');
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
 console.log('START',await page.evaluate(()=>devkit.wait()));
 await page.waitForTimeout(1500);
 if(await page.evaluate(()=>devkit.status)!=='started')throw new Error('Devkit failed to start');
 await page.evaluate(()=>devkit.press('Digit2',120));
 await page.evaluate(()=>devkit.press('KeyC',120));
 await page.evaluate(()=>devkit.press('KeyL',120));
 await page.evaluate(()=>devkit.press('KeyF',120));
 await page.waitForTimeout(500);
 const config=await page.evaluate(()=>devkit.console);
 fs.writeFileSync('atg106/reports/devkit-customization.json',JSON.stringify(config,null,2));
 if(!config.some(x=>x.includes('ATG select 1')))throw new Error('Pod selection failed in sandbox');
 await page.evaluate(()=>devkit.press('Space',180));
 await page.waitForTimeout(800);
 await page.evaluate(()=>devkit.key('KeyW',true));
 let finished=false;const begins=Date.now();
 while(Date.now()-begins<80000) {
  const state=await page.evaluate(()=>({p:devkit.room?.position,log:devkit.console,status:devkit.status}));
  if(state.status!=='started')throw new Error('Game stopped during race');
  if(state.log.some(x=>x.includes('ATG race progress')&&x.includes('"finished":true'))){finished=true;break;}
  if(state.p) {
   const p=state.p,theta=Math.atan2(p.x,p.z),radius=Math.hypot(p.x,p.z);
   let error=theta+Math.PI/2-p.yaw;
   while(error>Math.PI)error-=Math.PI*2;while(error< -Math.PI)error+=Math.PI*2;
   error+=(radius-8.4)*.38;
   await page.evaluate(error=>{devkit.key('KeyA',error>.14);devkit.key('KeyD',error< -.14);},error);
  }
  await page.waitForTimeout(90);
 }
 await page.evaluate(()=>{for(const k of ['KeyW','KeyA','KeyD'])devkit.key(k,false)});
 if(!finished)throw new Error('Browser steering bot did not complete');
 await page.waitForTimeout(1200);
 const full=await page.evaluate(()=>({summary:devkit.summary(),frames:devkit.frames,errors:devkit.errors,console:devkit.console,room:devkit.room}));
 fs.writeFileSync('atg106/reports/devkit-full-race.json',JSON.stringify(full,null,2));console.log('FULL RACE',JSON.stringify(full));
 if(full.errors.length)throw new Error('Sandbox errors');
 if(!full.console.some(x=>x.includes('reward: p0.score')&&x.includes(': ok')))throw new Error('Score not accepted');
 await page.evaluate(()=>devkit.press('KeyR',250));await page.waitForTimeout(1200);
 const replay=await page.evaluate(()=>devkit.room.position);
 if(Math.abs(replay.x)>.1||Math.abs(replay.z-8.4)>.1)throw new Error('Replay did not reset race');
 await page.evaluate(()=>devkit.press('KeyB',250));await page.waitForTimeout(1200);
 if(Math.abs((await page.evaluate(()=>devkit.room.position)).z)>.1)throw new Error('Return to Lab failed');
 await page.evaluate(()=>devkit.drop());await page.waitForTimeout(700);
 console.log('REVIEW',JSON.stringify(await page.evaluate(()=>devkit.review(15))));
 fs.writeFileSync('atg106/reports/devkit-review.json',JSON.stringify(await page.evaluate(()=>({summary:devkit.summary(),frames:devkit.frames,errors:devkit.errors,console:devkit.console})),null,2));
 await page.getByRole('button',{name:'Phone',exact:true}).click();console.log('PHONE',await page.evaluate(()=>devkit.wait()));
 await page.waitForTimeout(3000);
 fs.writeFileSync('atg106/reports/devkit-phone.json',JSON.stringify(await page.evaluate(()=>({summary:devkit.summary(),frames:devkit.frames,errors:devkit.errors,console:devkit.console})),null,2));
 await page.screenshot({path:'atg106/reports/internal-devkit-phone.png'});
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});

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
 console.log('PAGE',await page.title());
 await page.waitForTimeout(6000);
 console.log(await page.evaluate(()=>({devkit:typeof devkit,status:window.devkit?.status,errors:window.devkit?.errors,body:document.body.innerText.slice(0,1000)})));
 await page.screenshot({path:'atg82/reports/devkit-start.png'});
 if(await page.evaluate(()=>typeof devkit!=='undefined')) {
  console.log('WAIT',await page.evaluate(()=>devkit.wait()));
  await page.evaluate(()=>devkit.press('KeyW',1000));
  await page.evaluate(()=>devkit.press('Space',150));
  await page.waitForTimeout(1500);
  await page.evaluate(()=>devkit.drop());
  await page.waitForTimeout(1000);
  const report=await page.evaluate(()=>({summary:devkit.summary(),frames:devkit.frames,errors:devkit.errors,hud:devkit.hud,console:devkit.console,room:devkit.room}));
  require('fs').writeFileSync('atg82/reports/devkit-desktop.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }
 console.log('REVIEW',JSON.stringify(await page.evaluate(()=>devkit.review(15))));
 require('fs').writeFileSync('atg82/reports/devkit-review.json',JSON.stringify(await page.evaluate(()=>({summary:devkit.summary(),frames:devkit.frames,errors:devkit.errors,console:devkit.console})),null,2));
 await page.getByRole('button',{name:'Phone',exact:true}).click();
 console.log('PHONE WAIT',await page.evaluate(()=>devkit.wait()));
 await page.waitForTimeout(3000);
 require('fs').writeFileSync('atg82/reports/devkit-phone.json',JSON.stringify(await page.evaluate(()=>({summary:devkit.summary(),frames:devkit.frames,errors:devkit.errors,room:devkit.room})),null,2));
 await page.screenshot({path:'atg82/reports/internal-devkit-phone.png'});
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});

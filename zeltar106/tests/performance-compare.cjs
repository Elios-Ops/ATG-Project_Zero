const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path');
(async()=>{
 const root=path.resolve('.');
 const server=http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(fs.readFileSync(file));
 });await new Promise(r=>server.listen(5500,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'},executablePath:'/tmp/zeltar-shell/chrome-headless-shell-linux64/chrome-headless-shell',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const context=await browser.newContext({permissions:['local-network-access'],ignoreHTTPSErrors:true});const runs=[];
 for(const folder of ['zeltar106/baseline','zeltar106']) {
  const page=await context.newPage();
  await page.goto('https://project0.city/devkit?entry=http://localhost:5500/'+folder+'/experience/main.js&width=25&depth=25&height=57&size=960x540&players=2',{waitUntil:'domcontentloaded',timeout:60000});
  const status=await page.evaluate(()=>devkit.wait());if(status!=='started')throw new Error('Cannot benchmark '+folder);
  const review=await page.evaluate(()=>devkit.review(15));
  await page.getByRole('button',{name:'Phone',exact:true}).click();await page.evaluate(()=>devkit.wait());
  await page.waitForTimeout(1500);await page.evaluate(()=>devkit.press('Space',150));
  await page.evaluate(()=>{devkit.key('KeyW',true);devkit.key('KeyA',true);});await page.waitForTimeout(6000);
  const phone=await page.evaluate(()=>({status:devkit.status,frames:devkit.frames,errors:devkit.errors}));
  runs.push({release:folder==='zeltar106/baseline'?'Validated Pod Racer baseline':'ZELTAR',desktopReview:review,phoneRace:phone});
  if(review.errors.length||review.violations.length||phone.errors.length)throw new Error('Benchmark errors');
  console.log(folder,'desktop',review.fps,'phone',phone.frames.fps);await page.close();
 }
 const report={renderer:'Chromium SwiftShader software WebGL2',method:'Sequential same-browser official devkit reviews (15s, 960x540, two players), plus 390x844 phone racing samples (6s). No hardware GPU.',runs};
 fs.writeFileSync('zeltar106/reports/performance-comparison.json',JSON.stringify(report,null,2));await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});

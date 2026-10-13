const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const http=require('http'),fs=require('fs'),path=require('path');
 const root=path.resolve('zeltar106');
 const server=http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');
  const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'application/octet-stream');
  res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(5500,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'},executablePath:'/tmp/zeltar-shell/chrome-headless-shell-linux64/chrome-headless-shell',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const context=await browser.newContext({permissions:['local-network-access'],ignoreHTTPSErrors:true});
 const page=await context.newPage();
 page.on('console',m=>console.log(m.type(),m.text().slice(0,400)));
 page.on('pageerror',e=>console.log('PAGEERROR',e.message));
 await page.goto('https://project0.city/devkit?entry=http://localhost:5500/experience/main.js&width=25&depth=25&height=57&size=960x540&players=2',{waitUntil:'domcontentloaded',timeout:60000});
 console.log('START',await page.evaluate(()=>devkit.wait()));
 const review=await page.evaluate(()=>devkit.review(15));
 fs.writeFileSync('zeltar106/reports/devkit-final-review.json',JSON.stringify(review,null,2));console.log('FINAL REVIEW',JSON.stringify(review));
 await page.getByRole('button',{name:'Phone',exact:true}).click();await page.evaluate(()=>devkit.wait());await page.waitForTimeout(4000);
 fs.writeFileSync('zeltar106/reports/devkit-final-phone.json',JSON.stringify(await page.evaluate(()=>({status:devkit.status,frames:devkit.frames,errors:devkit.errors})),null,2));
 const sources=['event-horizon.glsl','racing-neon.glsl'].map(name=>({name,source:fs.readFileSync('zeltar106/exterior/'+name,'utf8')}));
 await page.evaluate(()=>devkit.press('Space',160));await page.waitForTimeout(1800);
 await page.screenshot({path:'zeltar106/reports/internal-race-visual.png'});
 const shaders=await page.evaluate(sources=>{
  const c=document.createElement('canvas');const gl=c.getContext('webgl2');if(!gl)return {ok:false,error:'WebGL2 unavailable'};
  const prefix='#version 300 es\nprecision highp float;precision highp int;\nuniform float p0Time;out vec4 outColor;\nstruct P0Surface {vec3 color;float alpha;vec3 emissive;float roughness;float metalness;vec3 normal;vec2 uv;vec3 position;vec3 world;vec3 view;};\n';
  const vertex='#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID==1)?3.0:-1.0,(gl_VertexID==2)?3.0:-1.0);gl_Position=vec4(p,0,1);}';
  const tail='\nvoid main(){P0Surface s;s.color=vec3(0.1);s.alpha=1.0;s.emissive=vec3(0);s.normal=vec3(0,0,1);s.position=vec3(gl_FragCoord.x*.03,43.0+gl_FragCoord.y*.03,0);p0Surface(s);outColor=vec4(s.color+s.emissive,s.alpha);}';
  const results=sources.map(({name,source})=>{
   const v=gl.createShader(gl.VERTEX_SHADER),f=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(v,vertex);gl.compileShader(v);gl.shaderSource(f,prefix+source+tail);gl.compileShader(f);
   const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);
   return {file:name,compiled:gl.getShaderParameter(f,gl.COMPILE_STATUS),linked:gl.getProgramParameter(p,gl.LINK_STATUS),logs:gl.getShaderInfoLog(f)||gl.getProgramInfoLog(p)||''};
  });return {ok:results.every(x=>x.compiled&&x.linked),results};
 },sources);
 fs.writeFileSync('zeltar106/reports/webgl-shader-validation.json',JSON.stringify(shaders,null,2));console.log('SHADERS',JSON.stringify(shaders));
 if(!shaders.ok||review.errors.length||review.violations.length)throw new Error('Final preflight failed');
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});

// RAMPAGE: The Climb — official Project 0 dev kit run (Playwright). Serves ../experience locally, read-only.
// PLAYWRIGHT=<path to playwright module> node rampage82/tests/devkit.cjs <outdir> [--software]
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', 'experience'), OUT = path.resolve(process.argv[2] || 'devkit-out');
const SOFTWARE = process.argv.includes('--software');
fs.mkdirSync(OUT, { recursive: true });
const types = { '.js': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Cache-Control', 'no-store');
  const f = path.resolve(ROOT, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); res.end(fs.readFileSync(f));
});
const snap = page => page.evaluate(() => ({ status: devkit.status, summary: devkit.summary(), errors: devkit.errors, frames: devkit.frames, console: devkit.console }));
const shot = (page, n) => page.screenshot({ path: path.join(OUT, n + '.png') });
async function run(browser, label, size) {
  const ctx = await browser.newContext({ permissions: ['local-network-access'], viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage(); const pageErrors = []; page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto(`https://project0.city/devkit?entry=http://localhost:5500/main.js&width=25&depth=25&height=57&size=${size}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const status = await page.evaluate(() => devkit.wait()); const r = { label, status, pageErrors };
  if (status !== 'started') { r.final = await snap(page); await ctx.close(); return r; }
  await page.waitForTimeout(2500); await shot(page, `${label}-01-title`);
  if (label === 'phone') { await page.waitForTimeout(1500); r.final = await snap(page); await ctx.close(); return r; }
  // play: run right around the spiral, jumping rhythmically
  await page.evaluate(() => devkit.key('KeyD', true));
  for (let i = 0; i < 26; i++) { await page.evaluate(() => devkit.press('Space', 80)); await page.waitForTimeout(420); if (i === 9) await shot(page, `${label}-02-climb`); }
  await shot(page, `${label}-03-climb-later`);
  await page.evaluate(() => devkit.key('KeyD', false));
  // stand still: the Surge catches the player -> results screen + score after the 10 s minimum
  await page.waitForTimeout(16000); await shot(page, `${label}-04-results`);
  r.final = await snap(page);
  await page.evaluate(() => devkit.press('KeyR', 80)); await page.waitForTimeout(600); await shot(page, `${label}-05-retry`);
  r.review = await page.evaluate(() => devkit.review(14));
  await ctx.close(); return r;
}
(async () => {
  await new Promise(r => server.listen(5500, '127.0.0.1', r));
  const args = SOFTWARE ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [];
  const browser = await chromium.launch({ headless: true, args });
  const res = [await run(browser, SOFTWARE ? 'sw-desktop' : 'desktop', '960x540')];
  if (!SOFTWARE) res.push(await run(browser, 'phone', '390x844'));
  fs.writeFileSync(path.join(OUT, `devkit-results${SOFTWARE ? '-software' : ''}.json`), JSON.stringify(res, null, 2));
  for (const r of res) console.log(r.label, r.status, JSON.stringify(r.final && { summary: r.final.summary, errors: r.final.errors, frames: r.final.frames && { fps: r.final.frames.fps, p95: r.final.frames.p95, worst: r.final.frames.worst } }), r.review ? JSON.stringify({ review: { started: r.review.started, crash: r.review.crash, fps: r.review.fps, worst: r.review.worstFrame, errors: r.review.errors } }) : '', r.pageErrors.length ? 'PAGEERRORS ' + r.pageErrors.join(' | ') : '');
  await browser.close(); server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });

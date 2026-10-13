// RAMPAGE: The Climb — attract-mode capture in the official dev kit (no input): screenshots of the AI demo climbing.
// PLAYWRIGHT=<path> node rampage82/tests/devkit-attract.cjs <outdir>
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', 'experience'), OUT = path.resolve(process.argv[2] || 'devkit-attract');
fs.mkdirSync(OUT, { recursive: true });
const types = { '.js': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Cache-Control', 'no-store');
  const f = path.resolve(ROOT, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); res.end(fs.readFileSync(f));
});
(async () => {
  await new Promise(r => server.listen(5500, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ permissions: ['local-network-access'], viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://project0.city/devkit?entry=http://localhost:5500/main.js&width=25&depth=25&height=57&size=960x540', { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (await page.evaluate(() => devkit.wait()) !== 'started') throw new Error('not started');
  // close the dev kit's own "how to play" box so the game is visible (players can do the same; ui is minimized when published)
  await page.evaluate(() => { for (const b of document.querySelectorAll('*')) if (b.children.length === 0 && /^[×✕]$/.test((b.textContent || '').trim())) b.click(); });
  const t0 = Date.now();
  for (const s of [6, 18, 30, 42, 54, 66, 78, 88]) {
    await page.waitForTimeout(Math.max(0, s * 1000 - (Date.now() - t0)));
    await page.screenshot({ path: path.join(OUT, `attract-${String(s).padStart(2, '0')}s.png`), clip: { x: 50, y: 195, width: 960, height: 540 } });
  }
  const res = await page.evaluate(() => ({ summary: devkit.summary(), errors: devkit.errors, frames: devkit.frames }));
  fs.writeFileSync(path.join(OUT, 'attract-results.json'), JSON.stringify(res, null, 2));
  console.log(JSON.stringify({ summary: res.summary, errors: res.errors, fps: res.frames.fps, p95: res.frames.p95, worst: res.frames.worst }));
  await browser.close(); server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });

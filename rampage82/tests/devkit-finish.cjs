// RAMPAGE: The Climb — finish-line verification in the official dev kit.
// Serves the real experience plus a TEST-ONLY entry (never shipped) that lets the game's own autopilot drive the
// player's run, so the whole path is exercised: climb, finish, celebration, results, score, notes wall, retry, ghosts.
// PLAYWRIGHT=<path> node rampage82/tests/devkit-finish.cjs <outdir>
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', 'experience'), OUT = path.resolve(process.argv[2] || 'devkit-finish');
fs.mkdirSync(OUT, { recursive: true });
const ENTRY = "import { createGame } from './game.js';\nexport default function start(p0) { return createGame(p0, { autopilotPlayer: true }); }\n";
const types = { '.js': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Cache-Control', 'no-store');
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/finish-entry.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(ENTRY); return; }
  const f = path.resolve(ROOT, '.' + url);
  if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); res.end(fs.readFileSync(f));
});
const clip = { x: 50, y: 195, width: 960, height: 540 };
(async () => {
  await new Promise(r => server.listen(5500, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ permissions: ['local-network-access'], viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept('Vent at every gold gate. See you at the crown.'));   // the dev kit's stand-in for the notes window
  await page.goto('https://project0.city/devkit?entry=http://localhost:5500/finish-entry.js&width=25&depth=25&height=57&size=960x540', { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (await page.evaluate(() => devkit.wait()) !== 'started') throw new Error('not started');
  await page.evaluate(() => { for (const b of document.querySelectorAll('*')) if (b.children.length === 0 && /^[×✕]$/.test((b.textContent || '').trim())) b.click(); });
  await page.evaluate(() => devkit.players(3));
  const t0 = Date.now(), seen = {}; let finished = false;
  for (const at of [15, 45, 75, 100]) { await page.waitForTimeout(Math.max(0, at * 1000 - (Date.now() - t0))); await page.screenshot({ path: path.join(OUT, `climb-${at}s.png`), clip }); }
  while (Date.now() - t0 < 200000) {
    const c = await page.evaluate(() => devkit.console.join('\n'));
    if (c.includes('"result":"finish"')) { finished = true; break; }
    if (c.includes('"result":"eliminated"')) break;
    await page.waitForTimeout(500);
  }
  seen.finishAfterS = +((Date.now() - t0) / 1000).toFixed(1);
  await page.waitForTimeout(1200); await page.screenshot({ path: path.join(OUT, 'finish-celebration-1s.png'), clip });
  await page.waitForTimeout(3500); await page.screenshot({ path: path.join(OUT, 'finish-celebration-5s.png'), clip });
  await page.waitForTimeout(7000); await page.screenshot({ path: path.join(OUT, 'finish-results.png'), clip });     // score is sent after the 10 s minimum
  await page.evaluate(() => devkit.press('KeyN', 80)); await page.waitForTimeout(1500);
  await page.evaluate(() => devkit.press('KeyR', 80)); await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, 'retry-start-wall.png'), clip });
  const res = await page.evaluate(() => ({ summary: devkit.summary(), errors: devkit.errors, frames: devkit.frames, console: devkit.console.filter(l => !l.startsWith('devkit')) }));
  res.finished = finished; res.seen = seen;
  fs.writeFileSync(path.join(OUT, 'finish-results.json'), JSON.stringify(res, null, 2));
  console.log(JSON.stringify({ finished, finishAfterS: seen.finishAfterS, summary: res.summary, errors: res.errors, fps: res.frames.fps, p95: res.frames.p95,
    log: res.console.filter(l => /RAMPAGE run|reward|note|room/i.test(l)).slice(-8) }));
  await browser.close(); server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });

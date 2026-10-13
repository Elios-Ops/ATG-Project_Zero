// Bitmap HUD text from pre-rendered OFL font atlases (assets/font-*.png + .json): Project 0 packages take no .ttf.
// Glyphs are white; each string is tinted on a scratch canvas. Characters outside the atlas fall back to the system font.
export async function loadBitmapFont(p0, name) {
  const meta = await (await fetch(p0.asset(`assets/${name}.json`))).json();
  const img = await createImageBitmap(await (await fetch(p0.asset(`assets/${name}.png`))).blob());
  return { meta, img };
}
const scratch = new OffscreenCanvas(64, 64), sx = scratch.getContext('2d');
export function drawText(ctx, font, text, x, y, size, color, align = 'left', fallbackWeight = 600) {
  text = String(text);
  const g = font && font.meta.glyphs;
  if (!g || [...text].some(ch => !g[ch])) {               // fallback: names with characters the atlas lacks
    ctx.font = `${fallbackWeight} ${Math.round(size)}px sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, y); return;
  }
  const s = size / font.meta.size, lh = Math.ceil(font.meta.lineHeight * s) + 2;
  let w = 0; for (const ch of text) w += g[ch][4]; w = Math.ceil(w * s) + 4;
  if (scratch.width < w || scratch.height < lh) { scratch.width = Math.max(scratch.width, w); scratch.height = Math.max(scratch.height, lh); }
  sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, w, lh);
  let cx = 0;
  for (const ch of text) { const [gx, gy, gw, gh, adv] = g[ch]; sx.drawImage(font.img, gx, gy, gw, gh, cx, 0, gw * s, gh * s); cx += adv * s; }
  sx.globalCompositeOperation = 'source-in'; sx.fillStyle = color; sx.fillRect(0, 0, w, lh);
  const x0 = align === 'center' ? x - cx / 2 : align === 'right' ? x - cx : x;
  ctx.drawImage(scratch, 0, 0, w, lh, Math.round(x0), Math.round(y - font.meta.ascent * s), w, lh);
}

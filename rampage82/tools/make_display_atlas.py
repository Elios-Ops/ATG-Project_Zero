# RAMPAGE display atlas (1024 x 1024, the EventDisplay base texture). Three displays share it:
#   left half      [0,512) x [0,1024)   +Z promo display: the original broadcast art (colour), shown as is
#   top-right      [512,1024) x [0,512) EAST display (12 x 10 m): content box 512 x 427 (rows 42..469)
#   bottom-right   [512,1024) x [512,1024) REAR display (10 x 19.2 m): content box 266 x 512 (cols 123..389)
# The two new displays are monochrome MASKS, one per channel; event-horizon.glsl colours and animates them:
#   EAST  R: RAMPAGE wordmark   G: ENTER. / SURVIVE. / CONQUER. (one line per third)   B: countdown 3 2 1 + THE CLIMB BEGINS
#   REAR  R: arena image (the broadcast art as luminance)   G: WARNING / the Surge is rising   B: RAMPAGE + the creed
# python make_display_atlas.py --art <rampage-display-534x1024.png> --fonts <fonts dir> --out <atlas.png>
import argparse
from PIL import Image, ImageDraw, ImageFont, ImageOps

ap = argparse.ArgumentParser()
ap.add_argument('--art', required=True); ap.add_argument('--fonts', required=True); ap.add_argument('--out', required=True)
a = ap.parse_args()
ANTON = f'{a.fonts}/anton/Anton-Regular.ttf'
OSWALD = f'{a.fonts}/oswald/Oswald[wght].ttf'

def font(path, size, bold=False):
    f = ImageFont.truetype(path, size)
    if bold:
        try: f.set_variation_by_axes([700])
        except Exception: pass
    return f
def fit(path, text, w, h, bold=False):
    """Largest font size whose text fits w x h."""
    lo, hi = 6, 600
    while lo < hi:
        s = (lo + hi + 1) // 2; b = font(path, s, bold).getbbox(text)
        if b[2] - b[0] <= w and b[3] - b[1] <= h: lo = s
        else: hi = s - 1
    return font(path, lo, bold)
def text(d, cx, cy, s, f):
    b = f.getbbox(s); d.text((cx - (b[0] + b[2]) / 2, cy - (b[1] + b[3]) / 2), s, font=f, fill=255)
def tri(d, cx, cy, r, w):                       # the RAMPAGE emblem: a downward triangle outline
    pts = [(cx - r, cy - r * .62), (cx + r, cy - r * .62), (cx, cy + r * .9)]
    d.polygon(pts, fill=255); k = 1 - w / r
    d.polygon([(cx + (x - cx) * k, cy + (y - cy) * k + w * .1) for x, y in pts], fill=0)
def stripes(d, x0, y0, x1, y1, step=22):
    for x in range(x0 - (y1 - y0), x1, step):
        d.polygon([(x, y1), (x + step // 2, y1), (x + step // 2 + (y1 - y0), y0), (x + (y1 - y0), y0)], fill=255)
    d.rectangle((x1, y0, x1 + 60, y1), fill=0); d.rectangle((x0 - 60, y0, x0 - 1, y1), fill=0)

atlas = Image.new('RGB', (1024, 1024))
art = Image.open(a.art).convert('RGB')
aw = art.width; art = art.crop(((aw - 512) // 2, 0, (aw - 512) // 2 + 512, 1024)) if aw >= 512 else art.resize((512, 1024))
atlas.paste(art, (0, 0))

# ---------------------------------------------------------------- EAST (box: x 512..1023, y 42..469)
E = [Image.new('L', (512, 427)) for _ in range(3)]
d = ImageDraw.Draw(E[0])
text(d, 256, 62, 'ALL THINGS GAMED', fit(OSWALD, 'ALL THINGS GAMED', 300, 34, True))
d.rectangle((40, 96, 472, 101), fill=255)
text(d, 256, 196, 'RAMPAGE', fit(ANTON, 'RAMPAGE', 470, 170))
d.rectangle((40, 292, 472, 297), fill=255)
tri(d, 256, 352, 46, 11)
d = ImageDraw.Draw(E[1])
for i, s in enumerate(('ENTER.', 'SURVIVE.', 'CONQUER.')):
    text(d, 256, 427 * (2 * i + 1) / 6, s, fit(ANTON, s, 460, 112))
d = ImageDraw.Draw(E[2])
for i, s in enumerate(('3', '2', '1')):
    text(d, 512 * (2 * i + 1) / 6, 150, s, fit(ANTON, s, 150, 230))
text(d, 256, 360, 'THE CLIMB BEGINS', fit(OSWALD, 'THE CLIMB BEGINS', 440, 56, True))
atlas.paste(Image.merge('RGB', E), (512, 42))

# ---------------------------------------------------------------- REAR (box: x 635..900, y 512..1023)
R = [Image.new('L', (266, 512)) for _ in range(3)]
lum = ImageOps.autocontrast(ImageOps.grayscale(Image.open(a.art).convert('RGB').resize((266, 512))), cutoff=1)
R[0] = lum
d = ImageDraw.Draw(R[1])
text(d, 133, 56, 'WARNING', fit(ANTON, 'WARNING', 236, 80))
stripes(d, 16, 106, 250, 132)
tri(d, 133, 250, 96, 20)
text(d, 133, 396, 'THE SURGE', fit(ANTON, 'THE SURGE', 236, 58))
text(d, 133, 452, 'IS RISING', fit(ANTON, 'IS RISING', 236, 46))
stripes(d, 16, 486, 250, 500)
d = ImageDraw.Draw(R[2])
text(d, 133, 70, 'RAMPAGE', fit(ANTON, 'RAMPAGE', 240, 90))
d.rectangle((24, 128, 242, 132), fill=255)
for i, s in enumerate(('ENTER.', 'SURVIVE.', 'CONQUER.')):
    text(d, 133, 205 + i * 92, s, fit(ANTON, s, 230, 74))
d.rectangle((24, 432, 242, 436), fill=255)
text(d, 133, 474, 'ALL THINGS GAMED', fit(OSWALD, 'ALL THINGS GAMED', 200, 26, True))
atlas.paste(Image.merge('RGB', R), (635, 512))

atlas.save(a.out)
print('atlas', a.out, atlas.size)

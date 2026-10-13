"""RAMPAGE: SAVE LILLY — the title logo (original artwork drawn from the OFL fonts Anton and Oswald).
python savelilly82/tools/make_logo.py <fonts dir with anton/ and oswald/> <out.png>"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONTS, OUT = sys.argv[1], sys.argv[2]
W, H = 1600, 640
anton = lambda s: ImageFont.truetype(f'{FONTS}/anton/Anton-Regular.ttf', s)
oswald = ImageFont.truetype(f'{FONTS}/oswald/Oswald[wght].ttf', 46)
try: oswald.set_variation_by_name('SemiBold')
except Exception: pass

def text_mask(text, font, size_box):
    m = Image.new('L', size_box, 0); d = ImageDraw.Draw(m)
    b = d.textbbox((0, 0), text, font=font); x = (size_box[0] - (b[2] - b[0])) // 2 - b[0]; y = (size_box[1] - (b[3] - b[1])) // 2 - b[1]
    d.text((x, y), text, font=font, fill=255); return m
def gradient(size, stops):
    h = size[1]; ys = np.linspace(0, 1, h)[:, None]
    out = np.zeros((h, size[0], 3))
    for (p0, c0), (p1, c1) in zip(stops[:-1], stops[1:]):
        k = np.clip((ys - p0) / (p1 - p0), 0, 1); sel = (ys >= p0) & (ys <= p1)
        col = np.array(c0)[None, None, :] * (1 - k[..., None]) + np.array(c1)[None, None, :] * k[..., None]
        out = np.where(sel[..., None], col, out)
    return Image.fromarray(out.astype(np.uint8), 'RGB')
def shear(img, k):
    return img.transform(img.size, Image.AFFINE, (1, k, -k * img.size[1] / 2, 0, 1, 0), resample=Image.BICUBIC)

canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
# ---- RAMPAGE
box = (W, 330)
m = shear(text_mask('RAMPAGE', anton(300), box), 0.18)
outline = m.filter(ImageFilter.MaxFilter(17))
glow = outline.filter(ImageFilter.GaussianBlur(22))
layer = Image.new('RGBA', box, (0, 0, 0, 0))
layer.paste(Image.new('RGBA', box, (255, 40, 20, 255)), (0, 0), glow.point(lambda v: int(v * 0.85)))
layer.paste(Image.new('RGBA', box, (16, 5, 8, 255)), (0, 0), outline)
inner = m.filter(ImageFilter.MaxFilter(5))
layer.paste(Image.new('RGBA', box, (255, 200, 120, 255)), (0, 0), inner)        # hot rim
fill = gradient(box, [(0, (255, 226, 160)), (0.32, (255, 112, 40)), (0.55, (232, 36, 22)), (1, (110, 8, 6))])
layer.paste(fill, (0, 0), m)
# a bright bevel line across the letters
bev = Image.new('L', box, 0); ImageDraw.Draw(bev).rectangle((0, 118, W, 126), fill=150)
layer.paste(Image.new('RGBA', box, (255, 240, 210, 255)), (0, 0), Image.fromarray((np.array(bev) * (np.array(m) / 255)).astype(np.uint8)))
canvas.alpha_composite(layer, (0, 52))
# ---- ALL THINGS GAMED (small, above)
d = ImageDraw.Draw(canvas)
d.text((W // 2, 40), 'ALL THINGS GAMED PRESENTS', font=oswald, fill=(255, 210, 160, 230), anchor='mm')
# ---- SAVE LILLY on a banner
bw, bh, by = 980, 170, 390
ban = Image.new('RGBA', (bw + 80, bh + 40), (0, 0, 0, 0)); bd = ImageDraw.Draw(ban)
poly = [(40, 20), (bw + 40, 20), (bw + 70, (bh + 40) // 2), (bw + 40, bh + 20), (40, bh + 20), (10, (bh + 40) // 2)]
bd.polygon(poly, fill=(14, 8, 10, 240))
bd.line(poly + [poly[0]], fill=(216, 35, 26, 255), width=7)
ban = shear(ban, 0.1)
canvas.alpha_composite(ban, ((W - bw - 80) // 2, by))
box2 = (W, 220)
m2 = shear(text_mask('SAVE LILLY', anton(150), box2), 0.12)
o2 = m2.filter(ImageFilter.MaxFilter(9))
l2 = Image.new('RGBA', box2, (0, 0, 0, 0))
l2.paste(Image.new('RGBA', box2, (33, 212, 196, 255)), (0, 0), o2.filter(ImageFilter.GaussianBlur(12)).point(lambda v: int(v * 0.7)))
l2.paste(Image.new('RGBA', box2, (6, 20, 22, 255)), (0, 0), o2)
l2.paste(gradient(box2, [(0, (255, 255, 255)), (0.5, (200, 255, 248)), (1, (33, 212, 196))]), (0, 0), m2)
canvas.alpha_composite(l2, (0, by - 4))
# ---- the tagline
d.text((W // 2, 612), 'ENTER.   SURVIVE.   CONQUER.', font=oswald, fill=(255, 178, 58, 255), anchor='mm')
bb = canvas.getbbox(); canvas = canvas.crop((max(0, bb[0] - 16), max(0, bb[1] - 16), min(W, bb[2] + 16), min(H, bb[3] + 16)))
canvas.thumbnail((1400, 1400))
canvas.save(OUT, optimize=True)
print('logo', OUT, canvas.size)

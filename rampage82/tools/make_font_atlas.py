"""Pre-render the OFL fonts into bitmap glyph atlases for the HUD (Project 0 packages do not accept .ttf).
python rampage82/tools/make_font_atlas.py <fonts dir with anton/ and oswald/> <out assets dir>
Writes font-anton.png/.json and font-oswald.png/.json (white glyphs on transparent, advance widths in pixels)."""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

FONTS, OUT = sys.argv[1], sys.argv[2]
CHARS = (" ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
         ".,:;!?'\"-+/()[]%#&·—–×→←|@_=*<>$")
def atlas(ttf, name, size, variation=None, width=1024):
    f = ImageFont.truetype(ttf, size)
    if variation:
        try: f.set_variation_by_name(variation)
        except Exception: pass
    asc, desc = f.getmetrics(); h = asc + desc + 4
    glyphs, x, y = {}, 2, 2
    for ch in CHARS:
        w = int(round(f.getlength(ch))) + 2
        if x + w > width: x, y = 2, y + h
        glyphs[ch] = [x, y, w, h, round(f.getlength(ch), 2)]
        x += w + 2
    H = y + h + 2; H = 1 << (H - 1).bit_length()
    img = Image.new('RGBA', (width, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    for ch, (gx, gy, w, gh, adv) in glyphs.items(): d.text((gx + 1, gy + 2), ch, font=f, fill=(255, 255, 255, 255))
    img.save(os.path.join(OUT, f'{name}.png'), optimize=True)
    json.dump({'size': size, 'ascent': asc + 2, 'lineHeight': h, 'glyphs': glyphs}, open(os.path.join(OUT, f'{name}.json'), 'w'), separators=(',', ':'))
    return img.size
os.makedirs(OUT, exist_ok=True)
print('anton', atlas(os.path.join(FONTS, 'anton', 'Anton-Regular.ttf'), 'font-anton', 72))
print('oswald', atlas(os.path.join(FONTS, 'oswald', 'Oswald[wght].ttf'), 'font-oswald', 44, 'SemiBold'))

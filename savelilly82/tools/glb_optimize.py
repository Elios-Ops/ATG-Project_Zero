"""RAMPAGE: SAVE LILLY — make a character GLB game-ready without touching its rig: re-encode its textures smaller
(PNG -> JPEG unless the image needs alpha) and rebuild the binary chunk. Meshes, skins, animations and materials are
copied as they are. Optionally drop animation clips by name.
  python glb_optimize.py <in.glb> <out.glb> --size 1024 [--size-for name=2048 ...] [--drop clipname ...] [--quality 86]"""
import argparse, io, json, struct
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('--size', type=int, default=1024)
ap.add_argument('--size-for', action='append', default=[]); ap.add_argument('--drop', action='append', default=[]); ap.add_argument('--quality', type=int, default=86)
a = ap.parse_args()
raw = open(a.src, 'rb').read()
assert raw[:4] == b'glTF'
off = 12; chunks = []
while off < len(raw):
    ln, typ = struct.unpack('<II', raw[off:off + 8]); chunks.append((typ, raw[off + 8:off + 8 + ln])); off += 8 + ln
J = json.loads(chunks[0][1]); BIN = chunks[1][1] if len(chunks) > 1 else b''
per = dict(s.split('=') for s in a.size_for)
# new image bytes
new_img = {}
for i, img in enumerate(J.get('images', [])):
    bv = J['bufferViews'][img['bufferView']]; data = BIN[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    im = Image.open(io.BytesIO(data)); im.load()
    size = int(per.get(img.get('name', ''), a.size))
    alpha = im.mode in ('RGBA', 'LA') and im.getchannel('A').getextrema()[0] < 250
    im = im.convert('RGBA' if alpha else 'RGB')
    if max(im.size) > size: im = im.resize((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    if alpha: im.save(buf, 'PNG', optimize=True); img['mimeType'] = 'image/png'
    else: im.save(buf, 'JPEG', quality=a.quality, optimize=True, progressive=False); img['mimeType'] = 'image/jpeg'
    new_img[img['bufferView']] = buf.getvalue()
    print('image', img.get('name'), im.size, 'alpha' if alpha else 'jpeg', len(data), '->', len(new_img[img['bufferView']]))
# drop animations by name
if a.drop and 'animations' in J:
    J['animations'] = [an for an in J['animations'] if an.get('name') not in a.drop]
# rebuild the binary chunk (keep only buffer views still referenced: accessors, images)
used = set()
for acc in J.get('accessors', []):
    if 'bufferView' in acc: used.add(acc['bufferView'])
    sp = acc.get('sparse')
    if sp: used.add(sp['indices']['bufferView']); used.add(sp['values']['bufferView'])
for img in J.get('images', []): used.add(img['bufferView'])
live_acc = set()
for an in J.get('animations', []):
    for s in an['samplers']: live_acc.update((s['input'], s['output']))
anim_acc = set()
for an in json.loads(chunks[0][1]).get('animations', []):
    for s in an['samplers']: anim_acc.update((s['input'], s['output']))
dead_acc = anim_acc - live_acc
for k in dead_acc:
    bvk = J['accessors'][k].get('bufferView')
    if bvk is not None and not any(J['accessors'][j].get('bufferView') == bvk for j in range(len(J['accessors'])) if j not in dead_acc): used.discard(bvk)
out = bytearray(); remap = {}
new_views = []
for i, bv in enumerate(J['bufferViews']):
    if i not in used: continue
    data = new_img.get(i) or BIN[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    while len(out) % 4: out.append(0)
    nb = dict(bv); nb['byteOffset'] = len(out); nb['byteLength'] = len(data); nb['buffer'] = 0
    remap[i] = len(new_views); new_views.append(nb); out += data
J['bufferViews'] = new_views
for acc in J.get('accessors', []):
    if 'bufferView' in acc:
        if acc['bufferView'] in remap: acc['bufferView'] = remap[acc['bufferView']]
        else: acc.pop('bufferView')        # dropped clip data: the accessor is no longer referenced
    sp = acc.get('sparse')
    if sp: sp['indices']['bufferView'] = remap[sp['indices']['bufferView']]; sp['values']['bufferView'] = remap[sp['values']['bufferView']]
for img in J.get('images', []): img['bufferView'] = remap[img['bufferView']]
while len(out) % 4: out.append(0)
J['buffers'] = [{'byteLength': len(out)}]
js = json.dumps(J, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
open(a.dst, 'wb').write(glb)
print('wrote', a.dst, len(raw), '->', len(glb), 'animations', [an.get('name') for an in J.get('animations', [])])

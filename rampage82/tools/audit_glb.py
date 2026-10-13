"""Independent audit of RAMPAGE LOD GLBs against the Lot #82 budgets (from GET /api/agent/me, C002).
Reads the GLB container directly (no Blender). python rampage82/tools/audit_glb.py <dir with lod0/1/2.glb>"""
import json, struct, sys, os

BUDGET = {  # Lot #82, tower, large tier (API-verified 2026-10-13)
    'lod0': dict(triangles=87500, drawCalls=14, materials=4, textures=8, maxTextureSize=1024, texels=8388608, fileBytes=6553600, uploadBytes=26214400),
    'lod1': dict(triangles=12500, drawCalls=4, materials=2, textures=2, maxTextureSize=512, texels=734003.2, fileBytes=1310720, uploadBytes=8388608),
    'lod2': dict(triangles=1330, drawCalls=1, materials=1, textures=1, maxTextureSize=256, texels=94371.84, fileBytes=278921, uploadBytes=2097152),
}
EXACT = {'lod2': ('drawCalls', 'materials')}
ENV = dict(x=12.5, z=12.5, ymin=0.0, ymax=57.0)
FORBIDDEN = {'KHR_draco_mesh_compression', 'EXT_mesh_gpu_instancing', 'EXT_meshopt_compression'}

def read_glb(path):
    b = open(path, 'rb').read()
    magic, ver, length = struct.unpack_from('<4sII', b, 0); assert magic == b'glTF' and ver == 2
    off, js, binc = 12, None, None
    while off < length:
        clen, ctype = struct.unpack_from('<I4s', b, off); data = b[off + 8: off + 8 + clen]
        if ctype == b'JSON': js = json.loads(data)
        elif ctype == b'BIN\x00': binc = data
        off += 8 + clen
    return js, binc, len(b)
def png_size(data):
    if data[:8] == b'\x89PNG\r\n\x1a\n': return struct.unpack('>II', data[16:24])
    if data[:2] == b'\xff\xd8':  # JPEG: scan SOF
        i = 2
        while i < len(data):
            if data[i] != 0xFF: i += 1; continue
            m = data[i + 1]
            if m in (0xC0, 0xC2): h, w = struct.unpack('>HH', data[i + 5:i + 9]); return w, h
            i += 2 + struct.unpack('>H', data[i + 2:i + 4])[0]
    return (0, 0)
def audit(path, lod):
    g, binc, size = read_glb(path)
    prims = [p for m in g.get('meshes', []) for p in m['primitives']]
    tris, mn, mx = 0, [1e9] * 3, [-1e9] * 3
    for p in prims:
        if 'indices' in p: tris += g['accessors'][p['indices']]['count'] // 3
        else: tris += g['accessors'][p['attributes']['POSITION']]['count'] // 3
        a = g['accessors'][p['attributes']['POSITION']]
        mn = [min(u, v) for u, v in zip(mn, a['min'])]; mx = [max(u, v) for u, v in zip(mx, a['max'])]
    # node transforms: the exporter writes identity nodes for these meshes; check and refuse otherwise
    for n in g.get('nodes', []):
        if any(k in n for k in ('matrix', 'rotation', 'scale')) or any(abs(v) > 1e-6 for v in n.get('translation', [0, 0, 0])):
            raise SystemExit(f'{lod}: node transform present; bounds would need composing')
    texels, dims = 0, []
    for img in g.get('images', []):
        bv = g['bufferViews'][img['bufferView']]; data = binc[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
        w, h = png_size(data); dims.append((img.get('name'), w, h)); texels += w * h * 4 / 3      # with mipmaps
    used_ext = set(g.get('extensionsUsed', []))
    stats = dict(triangles=tris, drawCalls=len(prims), materials=len(g.get('materials', [])), textures=len(g.get('images', [])),
                 maxTextureSize=max([max(w, h) for _, w, h in dims] or [0]), texels=round(texels), fileBytes=size)
    errors = []
    for k, lim in BUDGET[lod].items():
        if k in stats and stats[k] > lim: errors.append(f'{k} {stats[k]} > {lim}')
    for k in EXACT.get(lod, ()):
        if stats[k] != BUDGET[lod][k]: errors.append(f'{k} must be exactly {BUDGET[lod][k]} (is {stats[k]})')
    if used_ext & FORBIDDEN: errors.append(f'forbidden extensions {used_ext & FORBIDDEN}')
    if any(img.get('uri') for img in g.get('images', [])): errors.append('external image file')
    # glTF is Y-up: x = lot X, y = height, z = lot Z
    if mn[0] < -ENV['x'] or mx[0] > ENV['x'] or mn[2] < -ENV['z'] or mx[2] > ENV['z'] or mn[1] < ENV['ymin'] - 1e-4 or mx[1] > ENV['ymax']:
        errors.append(f'bounds outside lot: min {mn} max {mx}')
    return dict(ok=not errors, errors=errors, stats=stats, budget=BUDGET[lod], materials=[m.get('name') for m in g.get('materials', [])],
                textures=dims, bounds=dict(min=[round(v, 3) for v in mn], max=[round(v, 3) for v in mx]), extensions=sorted(used_ext))
if __name__ == '__main__':
    d = sys.argv[1]; rep = {lod: audit(os.path.join(d, f'{lod}.glb'), lod) for lod in ('lod0', 'lod1', 'lod2')}
    rep['ok'] = all(r['ok'] for r in rep.values() if isinstance(r, dict))
    json.dump(rep, open(os.path.join(d, 'audit.json'), 'w'), indent=1)
    for lod in ('lod0', 'lod1', 'lod2'):
        r = rep[lod]; s = r['stats']
        print(f"{lod}: {'PASS' if r['ok'] else 'FAIL'}  tris {s['triangles']}/{r['budget']['triangles']}  draws {s['drawCalls']}/{r['budget']['drawCalls']}  "
              f"mats {s['materials']}/{r['budget']['materials']} {r['materials']}  tex {s['textures']}/{r['budget']['textures']} max {s['maxTextureSize']}px  "
              f"bytes {s['fileBytes']}/{r['budget']['fileBytes']}  bounds {r['bounds']}  {r['errors'] or ''}")
    print('ALL PASS' if rep['ok'] else 'AUDIT FAILED')

# RAMPAGE exterior production: C006 Blender model -> Project 0 LOD0 / LOD1 / LOD2 GLBs + palette textures.
# Blender 4.5:  Blender --background <RAMPAGE_C006_character.blend> --python export_lods.py -- <out_dir> <display_atlas.png>
# The source .blend is opened read-only and never saved. No decimation: LOD1 drops small parts, LOD2 is a built shell.
# v2 (Directive 011): every source material maps by its BASE name (the Event Horizon panes use 'EventDisplay.001',
# which v1 shipped as Armor); EventDisplay carries the display atlas (tools/make_display_atlas.py); the rear and east
# banners give way to two new framed broadcast boards; sloped neon strips light the pylon edges and the EH base.
import bpy, bmesh, sys, os, math, json
from mathutils import Vector
import numpy as np

OUT, ATLAS = sys.argv[sys.argv.index('--') + 1:][:2]
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene

for _m in list(bpy.data.materials): _m.name = 'src__' + _m.name        # free the production names (in memory only; never saved)
# ---------------------------------------------------------------- palette: every source material -> one 8x8 cell
SRC = {  # source material -> (target LOD0 material, base sRGB, emissive sRGB 0..1 (None = no glow))
    'Armor': ('Armor', (14, 15, 18), None), 'ArmorPlate': ('Armor', (34, 35, 40), None), 'ArmorPlateWorn': ('Armor', (52, 50, 50), None),
    'Trim': ('Armor', (70, 71, 76), None), 'Framework': ('Armor', (84, 84, 88), None), 'Recess': ('Armor', (6, 6, 8), None),
    'SignPanel': ('Armor', (24, 4, 4), None), 'Banner': ('Armor', (92, 10, 8), (60, 4, 2)),
    'Neon': ('Neon', (255, 22, 10), (255, 22, 10)), 'NeonOrange': ('Neon', (255, 110, 18), (255, 110, 18)),
    'SignRed': ('Neon', (255, 36, 16), (255, 36, 16)), 'SignWarmWhite': ('Neon', (255, 236, 220), (255, 236, 220)),
    'SignBannerText': ('Neon', (255, 170, 110), (255, 170, 110)),
    'EH_Glass': ('Glass', (30, 8, 10), None), 'PortalGlass': ('Glass', (30, 8, 10), None),
    'EventDisplay': ('EventDisplay', (6, 2, 2), None), 'EventDisplay_DeepLayer_preview': ('EventDisplay', (4, 1, 1), None),
    'GladiatorDisplay': ('EventDisplay', (0, 0, 0), None),
}
DROP_COLLECTIONS = ('Context', 'R6_EH_Lensing_preview')       # context is not the build; lensing is drawn by the shader
DROP_OBJECTS = ('Banner_Rear', 'Rear_Emblem', 'Banner_Rear_Up', 'Sign_Rear_Banner', 'Truss_N_',      # behind the REAR board
                'Banner_East', 'Sign_East_Banner')                                                  # behind the EAST board
cells = {name: i for i, name in enumerate(SRC)}
def cell_uv(name):
    i = cells[name]; cx, cy = i % 8, i // 8
    return ((cx + .5) / 8, 1 - (cy + .5) / 8)
def write_png(path, which, size=64):
    im = bpy.data.images.new(os.path.basename(path), size, size, alpha=False)
    px = np.zeros((size, size, 4), np.float32); s = size // 8
    for name, (tgt, base, emis) in SRC.items():
        i = cells[name]; cx, cy = i % 8, i // 8
        if which == 'base': col = base
        elif which == 'emis': col = emis or (0, 0, 0)
        else: col = base if tgt == 'Neon' else (emis or (0, 0, 0))        # lod1 emissive
        y0 = size - (cy + 1) * s                                           # Blender images are bottom-up
        px[y0:y0 + s, cx * s:(cx + 1) * s, :3] = np.array(col) / 255.0; px[y0:y0 + s, cx * s:(cx + 1) * s, 3] = 1
    im.pixels.foreach_set(px.ravel()); im.update(); im.filepath_raw = path; im.file_format = 'PNG'; im.save()
    return bpy.data.images.load(path)
TEX = {k: write_png(os.path.join(OUT, f'palette-{k}.png'), k) for k in ('base', 'emis', 'lod1emis')}
ATLAS_IMG = bpy.data.images.load(ATLAS)

def make_mat(name, base_img=None, emis_img=None, alpha=None, extra_img=None, rough=.45, metal=.8):
    m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; b = t.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if base_img:
        n = t.nodes.new('ShaderNodeTexImage'); n.image = base_img; n.interpolation = 'Closest'; t.links.new(n.outputs['Color'], b.inputs['Base Color'])
    if emis_img:
        n = t.nodes.new('ShaderNodeTexImage'); n.image = emis_img; n.interpolation = 'Closest'
        t.links.new(n.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 1.0
    if extra_img:   # EventDisplay carries the display atlas as its base texture (the shader decides where it shows)
        n = t.nodes.new('ShaderNodeTexImage'); n.image = extra_img; t.links.new(n.outputs['Color'], b.inputs['Base Color'])
    if alpha is not None:
        b.inputs['Alpha'].default_value = alpha; m.surface_render_method = 'BLENDED'
    return m

# ---------------------------------------------------------------- gather source meshes
def source_objects():
    obs = []
    for o in sc.objects:
        if o.type != 'MESH': continue
        if any(c.name.startswith(DROP_COLLECTIONS) for c in o.users_collection): continue
        if o.name.startswith(DROP_OBJECTS): continue
        obs.append(o)
    return obs
def bake_object(o, keep):
    """Copy an object's evaluated mesh into a list of (verts, faces, uvs, target material) in world space."""
    dg = bpy.context.evaluated_depsgraph_get(); e = o.evaluated_get(dg); me = e.to_mesh()
    src = o.material_slots[0].material.name.replace('src__', '', 1).split('.')[0] if o.material_slots and o.material_slots[0].material else 'Armor'
    if src not in SRC: src = 'Armor'
    tgt = keep(src, o)
    if tgt is None: e.to_mesh_clear(); return None
    M = o.matrix_world
    verts = [M @ v.co for v in me.vertices]
    faces = [tuple(p.vertices) for p in me.polygons]
    has_uv = me.uv_layers.active is not None and src in ('GladiatorDisplay', 'EventDisplay', 'EventDisplay_DeepLayer_preview')
    uvs = []
    for p in me.polygons:
        if has_uv and src == 'GladiatorDisplay':   # the promo art lives in the atlas's left half
            uvs.append([(me.uv_layers.active.data[li].uv[0] * .5, me.uv_layers.active.data[li].uv[1]) for li in p.loop_indices])
        elif has_uv: uvs.append([tuple(me.uv_layers.active.data[li].uv) for li in p.loop_indices])
        else: uvs.append([cell_uv(src)] * len(p.loop_indices))
    e.to_mesh_clear()
    return verts, faces, uvs, tgt
def build(name, parts, mats):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); order = list(mats)
    for verts, faces, uvs, tgt in parts:
        vs = [bm.verts.new(v) for v in verts]
        for f, uv in zip(faces, uvs):
            try: face = bm.faces.new([vs[i] for i in f])
            except ValueError: continue
            face.material_index = order.index(tgt)
            for loop, u in zip(face.loops, uv): loop[uvl].uv = u
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for mname in order: me.materials.append(mats[mname])
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); return o

# ---------------------------------------------------------------- v2 additions (built here, in lot-safe bounds; the .blend is untouched)
def box(name, x0, x1, y0, y1, z0, z1, cell):
    v = [Vector((x1 if i & 1 else x0, y1 if i & 2 else y0, z1 if i & 4 else z0)) for i in range(8)]
    f = [(0, 2, 3, 1), (4, 5, 7, 6), (0, 4, 6, 2), (1, 3, 7, 5), (0, 1, 5, 4), (2, 6, 7, 3)]
    return name, v, f, [[cell_uv(cell)] * 4 for _ in f], SRC[cell][0]
def strut(name, a, b, w, cell):              # a square prism from point a to point b (sloped neon along a leaning edge)
    h = w / 2; v = []
    for c in (a, b): v += [Vector((c[0] + dx, c[1] + dy, c[2])) for dx, dy in ((-h, -h), (h, -h), (-h, h), (h, h))]
    f = [(0, 2, 3, 1), (4, 5, 7, 6), (0, 4, 6, 2), (1, 3, 7, 5), (0, 1, 5, 4), (2, 6, 7, 3)]
    return name, v, f, [[cell_uv(cell)] * 4 for _ in f], SRC[cell][0]
def quad(name, pts, uvs):
    return name, [Vector(p) for p in pts], [(0, 1, 2, 3)], [uvs], 'EventDisplay'
def additions():
    P = []
    # REAR broadcast board (faces lot -Z = Blender +Y): the +Z gladiator frame mirrored, 0.24 m proud of the 24 m shoulder neon
    P += [box('V2_Rear_Sill', -6.4, 6.4, 8.64, 10.84, 12.5, 13.65, 'ArmorPlate'), box('V2_Rear_Top', -6.3, 6.3, 8.24, 10.54, 32.8, 34.6, 'ArmorPlate'),
          box('V2_Rear_Backing', -5.7, 5.7, 7.64, 9.54, 13.0, 33.4, 'Recess')]
    for sx in (-1, 1):
        P += [box(f'V2_Rear_Frame_{sx}', *sorted((sx * 5.0, sx * 6.2)), 9.44, 10.44, 13.0, 33.4, 'ArmorPlate'),
              box(f'V2_Rear_Wing_{sx}', *sorted((sx * 6.1, sx * 7.5)), 9.04, 10.44, 14.5, 31.5, 'ArmorPlate'),
              box(f'V2_Neon_Rear_{sx}', *sorted((sx * 4.92, sx * 5.04)), 10.08, 10.35, 13.5, 32.9, 'Neon')]
    P += [box('V2_Neon_Rear_Sill', -5.6, 5.6, 10.24, 10.34, 13.57, 13.67, 'Neon'),
          quad('V2_Display_Rear', ((5, 9.6, 13.6), (-5, 9.6, 13.6), (-5, 9.6, 32.8), (5, 9.6, 32.8)),
               [(.620, 0.0), (.880, 0.0), (.880, .5), (.620, .5)])]
    # EAST broadcast board (faces the ring road, +X) between the chevron hood (22.5 m) and the 35 m shoulder
    P += [box('V2_East_Sill', 8.6, 10.5, -6.8, 6.8, 22.5, 23.15, 'ArmorPlate'), box('V2_East_Top', 8.4, 10.4, -6.8, 6.8, 33.0, 34.6, 'ArmorPlate'),
          box('V2_East_Backing', 8.0, 9.58, -5.95, 5.95, 23.15, 33.0, 'Recess')]
    for sy in (-1, 1):
        P += [box(f'V2_East_Frame_{sy}', 9.0, 10.4, *sorted((sy * 5.95, sy * 6.8)), 22.5, 34.6, 'ArmorPlate'),
              box(f'V2_Neon_East_{sy}', 10.36, 10.48, *sorted((sy * 5.86, sy * 5.98)), 23.15, 33.0, 'NeonOrange')]
    P += [box('V2_Neon_East_Sill', 10.46, 10.56, -5.9, 5.9, 22.98, 23.1, 'Neon'), box('V2_Neon_East_Top', 10.36, 10.46, -5.9, 5.9, 33.04, 33.14, 'Neon'),
          quad('V2_Display_East', ((9.62, -5.95, 23.15), (9.62, 5.95, 23.15), (9.62, 5.95, 33.0), (9.62, -5.95, 33.0)),
               [(.5, .542), (1.0, .542), (1.0, .959), (.5, .959)])]
    # pylon edges: sloped orange strips on the face-side edges (none on the west face, which belongs to the gap pairing)
    def edge(z):                               # pylon section at height z: inner 7.35 -> 6.85, outer 11.15 -> 10.25 (12 -> 48 m)
        t = (z - 12.0) / 36.0; return 7.35 - .5 * t, 11.15 - .9 * t
    for n, sx, sy, axis in (('FE', 1, -1, 'x'), ('FE', 1, -1, 'y'), ('RE', 1, 1, 'x'), ('RE', 1, 1, 'y'), ('FW', -1, -1, 'y'), ('RW', -1, 1, 'y')):
        pts = []
        for z in (18.0, 48.0):
            i, o = edge(z)
            pts.append((sx * o, sy * i, z) if axis == 'x' else (sx * i, sy * o, z))
        P.append(strut(f'V2_Neon_Pylon_{n}_{axis}', pts[0], pts[1], .14, 'NeonOrange'))
    # the Event Horizon's base: an orange line under the drip ledge on the E, N and S faces
    P += [box('V2_Neon_EH_Base_E', 8.44, 8.6, -6.9, 6.9, 35.18, 35.3, 'NeonOrange'),
          box('V2_Neon_EH_Base_N', -6.9, 6.9, 8.44, 8.6, 35.18, 35.3, 'NeonOrange'),
          box('V2_Neon_EH_Base_S', -6.9, 6.9, -8.6, -8.44, 35.18, 35.3, 'NeonOrange')]
    for name, v, f, uv, tgt in P:
        for c in v: assert abs(c.x) <= 12.2 and abs(c.y) <= 12.2 and c.z <= 56.9, name
    return P
ADD = additions()
def add_parts(keep):
    out = []
    for name, v, f, uv, tgt in ADD:
        t = keep(name, tgt)
        if t: out.append((v, f, uv, t))
    return out

# ---------------------------------------------------------------- LOD0: everything visible, 4 materials
M0 = {'Armor': make_mat('Armor', TEX['base'], TEX['emis']), 'Neon': make_mat('Neon', TEX['base'], TEX['emis'], rough=.4, metal=0),
      'Glass': make_mat('Glass', None, None, alpha=.18, rough=.05, metal=0), 'EventDisplay': make_mat('EventDisplay', None, None, extra_img=ATLAS_IMG, rough=.3, metal=0)}
srcs = source_objects()
parts0 = [p for p in (bake_object(o, lambda s, o: SRC[s][0]) for o in srcs) if p] + add_parts(lambda n, t: t)
lod0 = build('RAMPAGE_LOD0', parts0, M0)
def export(obj, path):
    for o in sc.objects: o.select_set(False)
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_materials='EXPORT', export_image_format='AUTO', export_draco_mesh_compression_enable=False,
                              export_cameras=False, export_lights=False, export_extras=False)
report = {}
def ship(o, n):
    p = os.path.join(OUT, f'{n}.glb'); export(o, p)
    report[n] = {'triangles': len(o.data.polygons), 'materials': [m.name for m in o.data.materials], 'bytes': os.path.getsize(p)}
    for m in o.data.materials: m.name = f'{m.name}__{n}_shipped'          # free the exact names for the next LOD
ship(lod0, 'lod0')

# ---------------------------------------------------------------- LOD1: big forms, 2 materials (Armor with baked neon glow, EventDisplay)
SMALL = ('Plate_', 'Brace_', 'Channel_', 'Rib_Node', 'Vent_', 'Pylon_Vent', 'Pylon_Collar', 'Slat', 'Crown_Spire', 'Crown_Needle', 'Crown_Central_Spire',
         'Crown_Deck_Spire', 'Crown_Mast', 'Crown_Housing', 'Crown_Piston', 'Parapet_Tooth', 'Parapet_Channel', 'Truss_', 'Cage_Bar', 'Cage_SideBar',
         'Machine_Pipe', 'Machine_Slat', 'Exhaust_Clamp', 'Exhaust_Bracket', 'Pod_Slat', 'Pod_Pipe', 'Portal_Mullion', 'Portal_Step', 'EH_Mullion',
         'EH_Bevel', 'Rear_Tank_Band', 'Prow_Chevron_EndCap', 'Shoulder_Neon', 'Belt_Neon', 'Sign_', 'Buttress_Blade_Neon', 'Pylon_Blade_Neon',
         'Machine_Neon', 'Glad_Neon', 'Portal_Soffit_Neon', 'EH_Mullion_Neon', 'Crown_Beacon', 'Crown_Machine_Neon', 'Parapet_Neon', 'Canopy_',
         'Promo_Door_Neon', 'Rear_Gate_Neon', 'Rear_Bay_Neon', 'Banner_Front_Neon', 'Banner_East_Neon', 'Podium_Vent', 'Promo_Vent', 'Side_Louvre_Neon',
         'Podium_Band2', 'Pylon_Fin_X2', 'Buttress_BladeX', 'Crown_Collar', 'Exhaust_Stack_Glow', 'Rear_Emblem_Inner', 'Prow_Cheek_Neon')
def keep1(src, o):
    if o.name.startswith(SMALL) or src in ('EH_Glass', 'PortalGlass', 'EventDisplay_DeepLayer_preview'): return None
    return 'EventDisplay' if SRC[src][0] == 'EventDisplay' else 'Armor'
# LOD1 shares material names with LOD0 so EventDisplay keeps its shader; textures: palette + LOD1 glow map (the atlas stays LOD0 only).
# Without the atlas the boards read a dim red base: the shader then shows its energy and a faint first layer.
M1 = {'Armor': make_mat('Armor', TEX['base'], TEX['lod1emis']), 'EventDisplay': make_mat('EventDisplay', None, None, rough=.3, metal=0)}
M1['EventDisplay'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.12, .01, .005, 1)
parts1 = [p for p in (bake_object(o, keep1) for o in srcs) if p] + add_parts(lambda n, t: None if n.startswith('V2_Neon') else ('EventDisplay' if t == 'EventDisplay' else 'Armor'))
lod1 = build('RAMPAGE_LOD1', parts1, M1)
ship(lod1, 'lod1')

# ---------------------------------------------------------------- LOD2: a closed silhouette shell, 1 material, 1 texture
def frust(bm, cx, cy, hx0, hy0, z0, hx1, hy1, z1, n=8, ch=.3, rot=0.0):
    ring = lambda hx, hy, z: [Vector((cx + hx * math.cos(rot + 2 * math.pi * (i + .5) / n) / math.cos(math.pi / n),
                                      cy + hy * math.sin(rot + 2 * math.pi * (i + .5) / n) / math.cos(math.pi / n), z)) for i in range(n)]
    a = [bm.verts.new(v) for v in ring(hx0, hy0, z0)]; b = [bm.verts.new(v) for v in ring(hx1, hy1, z1)]
    for i in range(n):
        j = (i + 1) % n; bm.faces.new([a[i], a[j], b[j], b[i]])
    bm.faces.new(list(reversed(a))); bm.faces.new(b)
    return [f for f in bm.faces if f.is_valid][-n - 2:]
def lod2_mesh():
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    def tag(faces, cellname):
        for f in faces:
            for l in f.loops: l[uvl].uv = cell_uv(cellname)
    tag(frust(bm, 0, 0, 11.6, 11.6, 0.1, 9.0, 9.0, 12.6, n=4, rot=0.0), 'ArmorPlate')             # battered podium
    tag(frust(bm, 0, 0, 8.6, 8.6, 12.6, 7.4, 7.4, 35.6, n=4, rot=0.0), 'Armor')                    # shaft core
    tag(frust(bm, 0, 0, 7.0, 7.0, 35.6, 7.0, 7.0, 56.4, n=4, rot=0.0), 'NeonOrange')                # Event Horizon box (bright: no shaders at LOD2)
    for sx in (-1, 1):
        for sy in (-1, 1):
            c0, c1 = 9.25, 8.55
            tag(frust(bm, sx * c0, sy * c0, 1.9, 1.9, 0.1, 1.7, 1.7, 49.0, n=4, rot=0.0), 'Trim')     # pylons (with the buttress foot)
            v = [bm.verts.new(Vector(p)) for p in ((sx * (c1 - 1.7), sy * (c1 - 1.7), 49.0), (sx * (c1 + 1.7), sy * (c1 - 1.7), 49.0),
                                                   (sx * (c1 + 1.7), sy * (c1 + 1.7), 49.0), (sx * (c1 - 1.7), sy * (c1 + 1.7), 49.0), (sx * 11.5, sy * 11.5, 56.8))]
            fs = [bm.faces.new([v[0], v[1], v[4]]), bm.faces.new([v[1], v[2], v[4]]), bm.faces.new([v[2], v[3], v[4]]), bm.faces.new([v[3], v[0], v[4]]), bm.faces.new([v[3], v[2], v[1], v[0]])]
            tag(fs, 'Neon')                                                                                   # horned crown (crimson)
    # east prow wedge + chevron crest, west/promo banners as colour on the core (texture cells)
    v = [bm.verts.new(Vector(p)) for p in ((8.6, -7, .1), (12.1, -4.4, .1), (12.1, 4.4, .1), (8.6, 7, .1), (8.8, -6.7, 13), (11.5, -4.1, 13), (11.5, 4.1, 13), (8.8, 6.7, 13), (9.4, 0, 21.2))]
    fs = [bm.faces.new([v[0], v[1], v[5], v[4]]), bm.faces.new([v[1], v[2], v[6], v[5]]), bm.faces.new([v[2], v[3], v[7], v[6]]),
          bm.faces.new([v[4], v[5], v[8]]), bm.faces.new([v[5], v[6], v[8]]), bm.faces.new([v[6], v[7], v[8]]), bm.faces.new([v[3], v[2], v[1], v[0]])]
    tag(fs, 'SignRed')
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new('RAMPAGE_LOD2'); bm.to_mesh(me); bm.free()
    me.materials.append(make_mat('Armor', TEX['base'], None))
    o = bpy.data.objects.new('RAMPAGE_LOD2', me); sc.collection.objects.link(o); return o
lod2 = lod2_mesh()
ship(lod2, 'lod2')

json.dump(report, open(os.path.join(OUT, 'export-report.json'), 'w'), indent=1)
print('EXPORT', json.dumps(report))

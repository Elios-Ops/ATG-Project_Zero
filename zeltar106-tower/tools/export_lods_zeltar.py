# ZELTAR exterior production (Lot #106): ZELTAR tower model -> Project 0 LOD0 / LOD1 / LOD2 GLBs + palette textures.
# Derived from the validated RAMPAGE exporter (rampage82/tools/export_lods.py): same materials and pipeline, ZELTAR palette and LOD2.
# Blender 4.5:  Blender --background <ZELTAR_tower.blend> --python export_lods_zeltar.py -- <out_dir> <display_base.png>
# The source .blend is opened read-only and never saved. No decimation: LOD1 drops small parts, LOD2 is a built shell.
import bpy, bmesh, sys, os, math, json
from mathutils import Vector
import numpy as np

OUT, GLAD = sys.argv[sys.argv.index('--') + 1:][:2]
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene

for _m in list(bpy.data.materials): _m.name = 'src__' + _m.name        # free the production names (in memory only; never saved)
# ---------------------------------------------------------------- palette: every source material -> one 8x8 cell
SRC = {  # source material -> (target LOD0 material, base sRGB, emissive sRGB 0..1 (None = no glow)) — ZELTAR silver / cyan
    'Armor': ('Armor', (132, 138, 150), None), 'ArmorPlate': ('Armor', (176, 182, 194), None), 'ArmorPlateWorn': ('Armor', (108, 114, 126), None),
    'Trim': ('Armor', (206, 212, 222), None), 'Framework': ('Armor', (90, 96, 108), None), 'Recess': ('Armor', (10, 14, 22), None),
    'SignPanel': ('Armor', (12, 18, 30), None), 'Banner': ('Armor', (14, 22, 42), (4, 16, 40)),
    'Neon': ('Neon', (20, 215, 255), (20, 215, 255)), 'NeonOrange': ('Neon', (40, 110, 255), (40, 110, 255)),
    'SignRed': ('Neon', (70, 230, 255), (70, 230, 255)), 'SignWarmWhite': ('Neon', (236, 246, 255), (236, 246, 255)),
    'SignBannerText': ('Neon', (210, 242, 255), (210, 242, 255)),
    'EH_Glass': ('Glass', (16, 34, 52), None), 'PortalGlass': ('Glass', (16, 34, 52), None),
    'EventDisplay': ('EventDisplay', (2, 4, 10), None), 'EventDisplay_DeepLayer_preview': ('EventDisplay', (1, 2, 6), None),
    'GladiatorDisplay': ('EventDisplay', (0, 0, 0), None),
}
DROP_COLLECTIONS = ('Context', 'R6_EH_Lensing_preview')       # context is not the build; lensing is drawn by the shader
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
GLAD_IMG = bpy.data.images.load(GLAD)

def make_mat(name, base_img=None, emis_img=None, alpha=None, extra_img=None, rough=.45, metal=.8):
    m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; b = t.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if base_img:
        n = t.nodes.new('ShaderNodeTexImage'); n.image = base_img; n.interpolation = 'Closest'; t.links.new(n.outputs['Color'], b.inputs['Base Color'])
    if emis_img:
        n = t.nodes.new('ShaderNodeTexImage'); n.image = emis_img; n.interpolation = 'Closest'
        t.links.new(n.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 1.0
    if extra_img:   # EventDisplay carries the gladiator art as its base texture (the shader decides where it shows)
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
        obs.append(o)
    return obs
def bake_object(o, keep):
    """Copy an object's evaluated mesh into a list of (verts, faces, uvs, target material) in world space."""
    dg = bpy.context.evaluated_depsgraph_get(); e = o.evaluated_get(dg); me = e.to_mesh()
    src = o.material_slots[0].material.name.replace('src__', '', 1).split('.')[0] if o.material_slots and o.material_slots[0].material else 'Armor'   # 'EventDisplay.001' -> 'EventDisplay'
    if src not in SRC: src = 'Armor'
    tgt = keep(src, o)
    if tgt is None: e.to_mesh_clear(); return None
    M = o.matrix_world
    verts = [M @ v.co for v in me.vertices]
    faces = [tuple(p.vertices) for p in me.polygons]
    has_uv = me.uv_layers.active is not None and src in ('GladiatorDisplay', 'EventDisplay', 'EventDisplay_DeepLayer_preview')
    uvs = []
    for p in me.polygons:
        if has_uv: uvs.append([tuple(me.uv_layers.active.data[li].uv) for li in p.loop_indices])
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

# ---------------------------------------------------------------- LOD0: everything visible, 4 materials
M0 = {'Armor': make_mat('Armor', TEX['base'], TEX['emis']), 'Neon': make_mat('Neon', TEX['base'], TEX['emis'], rough=.4, metal=0),
      'Glass': make_mat('Glass', None, None, alpha=.18, rough=.05, metal=0), 'EventDisplay': make_mat('EventDisplay', None, None, extra_img=GLAD_IMG, rough=.3, metal=0)}
srcs = source_objects()
parts0 = [p for p in (bake_object(o, lambda s, o: SRC[s][0]) for o in srcs) if p]
lod0 = build('ZELTAR_LOD0', parts0, M0)
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
SMALL = ('Window_Strip', 'Portal_Mullion_Pod', 'ZelPod_Canopy', 'Showroom_Turntable', 'Display_Neon', 'Banner_Neon', 'Fin_Tip_Neon', 'Crown_Drum_Neon', 'Podium_Neon', 'Plinth_Neon', 'Transition_Neon', 'EH_Channel', 'Showroom_Neon', 'ZelPod_Glow', 'Marquee_Neon', 'Plate_', 'Brace_', 'Channel_', 'Rib_Node', 'Vent_', 'Pylon_Vent', 'Pylon_Collar', 'Slat', 'Crown_Spire', 'Crown_Needle', 'Crown_Central_Spire',
         'Crown_Deck_Spire', 'Crown_Mast', 'Crown_Housing', 'Crown_Piston', 'Parapet_Tooth', 'Parapet_Channel', 'Truss_', 'Cage_Bar', 'Cage_SideBar',
         'Machine_Pipe', 'Machine_Slat', 'Exhaust_Clamp', 'Exhaust_Bracket', 'Pod_Slat', 'Pod_Pipe', 'Portal_Mullion', 'Portal_Step', 'EH_Mullion',
         'EH_Bevel', 'Rear_Tank_Band', 'Prow_Chevron_EndCap', 'Shoulder_Neon', 'Belt_Neon', 'Sign_', 'Buttress_Blade_Neon', 'Pylon_Blade_Neon',
         'Machine_Neon', 'Glad_Neon', 'Portal_Soffit_Neon', 'EH_Mullion_Neon', 'Crown_Beacon', 'Crown_Machine_Neon', 'Parapet_Neon', 'Canopy_',
         'Promo_Door_Neon', 'Rear_Gate_Neon', 'Rear_Bay_Neon', 'Banner_Front_Neon', 'Banner_East_Neon', 'Podium_Vent', 'Promo_Vent', 'Side_Louvre_Neon',
         'Podium_Band2', 'Pylon_Fin_X2', 'Buttress_BladeX', 'Crown_Collar', 'Exhaust_Stack_Glow', 'Rear_Emblem_Inner', 'Prow_Cheek_Neon')
def keep1(src, o):
    if o.name.startswith(SMALL) or src in ('EH_Glass', 'PortalGlass', 'EventDisplay_DeepLayer_preview'): return None
    return 'EventDisplay' if SRC[src][0] == 'EventDisplay' else 'Armor'
# LOD1 shares material names with LOD0 so EventDisplay keeps its shader; textures: palette + LOD1 glow map (the gladiator art stays LOD0 only)
M1 = {'Armor': make_mat('Armor', TEX['base'], TEX['lod1emis']), 'EventDisplay': make_mat('EventDisplay', None, None, rough=.3, metal=0)}
parts1 = [p for p in (bake_object(o, keep1) for o in srcs) if p]
lod1 = build('ZELTAR_LOD1', parts1, M1)
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
    tag(frust(bm, 0, 0, 11.6, 11.6, 0.1, 10.4, 10.4, 8.2, n=12), 'ArmorPlate')                 # round stepped podium
    tag(frust(bm, 0, 0, 9.3, 9.3, 8.2, 8.1, 8.1, 35.4, n=8, rot=math.pi / 8), 'Armor')           # octagonal shaft
    tag(frust(bm, 0, 0, 6.9, 6.9, 35.4, 6.9, 6.9, 56.3, n=4, rot=0.0), 'Neon')                    # Event Horizon box (bright: no shaders at LOD2)
    for k in range(4):                                                                        # four wing fins
        a = math.pi / 4 + k * math.pi / 2; c, s_ = math.cos(a), math.sin(a)
        P = lambda r, tx, z: Vector((r * c - tx * s_, r * s_ + tx * c, z))
        v = [bm.verts.new(p) for p in (P(9.0, -1.0, .1), P(9.0, 1.0, .1), P(11.7, 0, .1), P(8.5, -.8, 50), P(8.5, .8, 50), P(10.2, 0, 50), P(10.9, 0, 56.9))]
        fs = [bm.faces.new([v[0], v[1], v[4], v[3]]), bm.faces.new([v[1], v[2], v[5], v[4]]), bm.faces.new([v[2], v[0], v[3], v[5]]),
              bm.faces.new([v[3], v[4], v[6]]), bm.faces.new([v[4], v[5], v[6]]), bm.faces.new([v[5], v[3], v[6]]), bm.faces.new([v[2], v[1], v[0]])]
        tag(fs, 'Trim')
    v = [bm.verts.new(Vector(p)) for p in ((-.6, -.6, 56.3), (.6, -.6, 56.3), (.6, .6, 56.3), (-.6, .6, 56.3), (0, 0, 56.9))]
    tag([bm.faces.new([v[0], v[1], v[4]]), bm.faces.new([v[1], v[2], v[4]]), bm.faces.new([v[2], v[3], v[4]]), bm.faces.new([v[3], v[0], v[4]])], 'SignRed')
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new('ZELTAR_LOD2'); bm.to_mesh(me); bm.free()
    me.materials.append(make_mat('Armor', TEX['base'], None))
    o = bpy.data.objects.new('ZELTAR_LOD2', me); sc.collection.objects.link(o); return o
lod2 = lod2_mesh()
ship(lod2, 'lod2')

json.dump(report, open(os.path.join(OUT, 'export-report.json'), 'w'), indent=1)
print('EXPORT', json.dumps(report))

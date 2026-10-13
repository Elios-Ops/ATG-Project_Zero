# ATG Directive 009 — ZELTAR tower (Lot #106). Helper layer reused from the validated RAMPAGE C006 generator.
# Blender 4.5 LTS:  Blender --background --factory-startup --python build_c005.py -- <out.blend>
#
# Coordinates (unchanged from C004): Blender Z-up, lot centre at origin, floor Z=0.
#   +X = EAST  — MAIN ENTRANCE (14 m inner ring road)        -X = WEST — Event Horizon gap face toward Lot #106
#   -Y = lot +Z — secondary PROMOTIONAL face (gladiator display)   +Y = rear (lot -Z)
# Envelope 25 x 25 x 57 m. Safety margin (C005): |X|,|Y| <= 12.20 m (0.30 m), Z <= 56.90 m (0.10 m).
import bpy, bmesh, sys, math, os, random
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index('--') + 1]
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.environ['ATG_FONTS']                 # dir with anton/ and oswald/ (SIL OFL 1.1)
GLAD = None                                    # ZELTAR draws its displays in the shader; no art texture
LIM_XY, LIM_Z = 12.20, 56.90
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
RNG = random.Random(82)                      # deterministic detailing

# ------------------------------------------------------------------ materials (massing-grade; real PBR comes with bakes)
def mat(name, base=(0.05, 0.05, 0.05), metal=0.0, rough=0.5, emit=None, strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1); b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = strength
    return m
M = {
    'armor':  mat('Armor', (0.026, 0.027, 0.031), 0.85, 0.45),
    'plate':  mat('ArmorPlate', (0.070, 0.071, 0.078), 0.9, 0.34),
    'plate2': mat('ArmorPlateWorn', (0.11, 0.105, 0.105), 0.9, 0.42),
    'trim':   mat('Trim', (0.16, 0.16, 0.17), 0.9, 0.3),
    'frame':  mat('Framework', (0.20, 0.20, 0.21), 0.95, 0.38),
    'recess': mat('Recess', (0.009, 0.009, 0.011), 0.6, 0.6),
    'neon':   mat('Neon', (0.12, 0.0, 0.0), 0.0, 0.4, (1.0, 0.012, 0.004), 6.0),
    'neonO':  mat('NeonOrange', (0.12, 0.02, 0.0), 0.0, 0.4, (1.0, 0.20, 0.015), 4.5),
    'signR':  mat('SignRed', (0.25, 0.01, 0.01), 0.0, 0.4, (1.0, 0.02, 0.006), 5.0),
    'signW':  mat('SignWarmWhite', (0.7, 0.7, 0.7), 0.0, 0.4, (1.0, 0.86, 0.76), 2.4),
    'signB':  mat('SignBannerText', (0.6, 0.3, 0.2), 0.0, 0.4, (1.0, 0.42, 0.18), 2.4),
    'panel':  mat('SignPanel', (0.03, 0.004, 0.004), 0.5, 0.45),
    'banner': mat('Banner', (0.15, 0.007, 0.005), 0.1, 0.6, (0.5, 0.01, 0.004), 0.25),
    'glass':  mat('PortalGlass', (0.015, 0.012, 0.014), 0.2, 0.06, (0.9, 0.07, 0.02), 0.22),
}
g = bpy.data.materials.new('GladiatorDisplay'); g.use_nodes = True; nt = g.node_tree
img = nt.nodes.new('ShaderNodeTexImage'); img.image = bpy.data.images.new('blank', 4, 4)
b = nt.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (0, 0, 0, 1); b.inputs['Emission Strength'].default_value = 1.6
# approved C005 decision 3: gladiator art -> crimson energy dissolve. 'DissolveT' (0 art .. 1 energy) previews the p0Time-driven loop.
tv = nt.nodes.new('ShaderNodeValue'); tv.name = tv.label = 'DissolveT'; tv.outputs[0].default_value = 0.0
gtc = nt.nodes.new('ShaderNodeTexCoord'); gmp = nt.nodes.new('ShaderNodeMapping'); gmp.inputs['Scale'].default_value = (0.18, 0.18, 2.8)
gnz = nt.nodes.new('ShaderNodeTexNoise'); gnz.inputs['Scale'].default_value = 3.0; gnz.inputs['Detail'].default_value = 6
gcr = nt.nodes.new('ShaderNodeValToRGB'); gel = gcr.color_ramp.elements
gel[0].position, gel[0].color = .56, (0, 0, 0, 1); gel[1].position, gel[1].color = .8, (1, .5, .1, 1); gel.new(.66).color = (.85, .012, .004, 1)
gnz2 = nt.nodes.new('ShaderNodeTexNoise'); gnz2.inputs['Scale'].default_value = .35; gnz2.inputs['Detail'].default_value = 2
sub = nt.nodes.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'
mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 7.0; mul.use_clamp = True
mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'
nt.links.new(gtc.outputs['Object'], gmp.inputs['Vector']); nt.links.new(gmp.outputs['Vector'], gnz.inputs['Vector']); nt.links.new(gnz.outputs['Fac'], gcr.inputs['Fac'])
nt.links.new(gtc.outputs['Object'], gnz2.inputs['Vector'])
nt.links.new(tv.outputs[0], sub.inputs[0]); nt.links.new(gnz2.outputs['Fac'], sub.inputs[1]); nt.links.new(sub.outputs[0], mul.inputs[0])
nt.links.new(mul.outputs[0], mixc.inputs['Factor']); nt.links.new(img.outputs['Color'], mixc.inputs['A']); nt.links.new(gcr.outputs['Color'], mixc.inputs['B'])
nt.links.new(mixc.outputs['Result'], b.inputs['Emission Color']); M['glad'] = g
e = bpy.data.materials.new('EventDisplay'); e.use_nodes = True; nt = e.node_tree
b = nt.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (0.006, 0.004, 0.004, 1); b.inputs['Roughness'].default_value = 0.2
tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (0.18, 0.18, 2.8)
nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 6; nz.inputs['Roughness'].default_value = 0.62
cr = nt.nodes.new('ShaderNodeValToRGB'); el = cr.color_ramp.elements
el[0].position, el[0].color = 0.56, (0.0, 0.0, 0.0, 1); el[1].position, el[1].color = 0.80, (1.0, 0.5, 0.1, 1)
el.new(0.66).color = (0.85, 0.015, 0.006, 1)
nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], nz.inputs['Vector'])
nt.links.new(nz.outputs['Fac'], cr.inputs['Fac']); nt.links.new(cr.outputs['Color'], b.inputs['Emission Color'])
b.inputs['Emission Strength'].default_value = 3.5; e.use_backface_culling = True; M['eh'] = e
# Event Horizon main layer, preview of an ADDITIVE material: energy adds light, dark areas let the deeper layer show through
def eh_layer(name, scale, lo, mid, hi, strength, hue_hi):
    m = bpy.data.materials.new(name); m.use_nodes = True; m.use_backface_culling = True; m.surface_render_method = 'BLENDED'
    t = m.node_tree; t.nodes.remove(t.nodes['Principled BSDF']); out = t.nodes['Material Output']
    tc_ = t.nodes.new('ShaderNodeTexCoord'); mp_ = t.nodes.new('ShaderNodeMapping'); mp_.inputs['Scale'].default_value = scale
    wv_ = t.nodes.new('ShaderNodeTexNoise'); wv_.inputs['Scale'].default_value = 3.0; wv_.inputs['Detail'].default_value = 6; wv_.inputs['Distortion'].default_value = .6
    cr_ = t.nodes.new('ShaderNodeValToRGB'); el_ = cr_.color_ramp.elements
    el_[0].position, el_[0].color = lo, (0, 0, 0, 1); el_[1].position, el_[1].color = hi, (*hue_hi, 1); el_.new(mid).color = (.85, .012, .004, 1)
    em = t.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = strength
    tr = t.nodes.new('ShaderNodeBsdfTransparent'); add = t.nodes.new('ShaderNodeAddShader')
    t.links.new(tc_.outputs['Object'], mp_.inputs['Vector']); t.links.new(mp_.outputs['Vector'], wv_.inputs['Vector'])
    t.links.new(wv_.outputs['Fac'], cr_.inputs['Fac']); t.links.new(cr_.outputs['Color'], em.inputs['Color'])
    t.links.new(em.outputs[0], add.inputs[0]); t.links.new(tr.outputs[0], add.inputs[1]); t.links.new(add.outputs[0], out.inputs['Surface'])
    return m
M['ehMain'] = eh_layer('EventDisplay', (0.18, 0.18, 2.8), .58, .67, .82, 3.6, (1.0, .5, .1))           # front energy layer (additive)
M['ehDeep'] = mat('EventDisplay_DeepLayer_preview', (0.004, 0.003, 0.003), 0.0, 0.3)
_t = M['ehDeep'].node_tree; _b = _t.nodes['Principled BSDF']
_tc = _t.nodes.new('ShaderNodeTexCoord'); _mp = _t.nodes.new('ShaderNodeMapping'); _mp.inputs['Scale'].default_value = (0.07, 0.07, 1.1)
_nz = _t.nodes.new('ShaderNodeTexNoise'); _nz.inputs['Scale'].default_value = 2.2; _nz.inputs['Detail'].default_value = 3
_cr = _t.nodes.new('ShaderNodeValToRGB'); _el = _cr.color_ramp.elements
_el[0].position, _el[0].color = .45, (0.01, 0, 0, 1); _el[1].position, _el[1].color = .78, (.75, .06, .01, 1)
_t.links.new(_tc.outputs['Object'], _mp.inputs['Vector']); _t.links.new(_mp.outputs['Vector'], _nz.inputs['Vector']); _t.links.new(_nz.outputs['Fac'], _cr.inputs['Fac'])
_t.links.new(_cr.outputs['Color'], _b.inputs['Emission Color']); _b.inputs['Emission Strength'].default_value = 1.4
M['ehGlass'] = mat('EH_Glass', (0.05, 0.01, 0.012), 0.0, 0.04)
_b = M['ehGlass'].node_tree.nodes['Principled BSDF']; _b.inputs['Alpha'].default_value = .16; _b.inputs['Coat Weight'].default_value = 1.0
_b.inputs['Specular IOR Level'].default_value = 1.0; M['ehGlass'].surface_render_method = 'BLENDED'; M['ehGlass'].use_backface_culling = True
M['ehLens'] = mat('EH_LensCrescent_preview', (0.15, 0.02, 0.0), 0.0, 0.4, (1.0, 0.28, 0.05), 3.2)
M['ctx_ground'] = mat('Ground', (0.6, 0.6, 0.61), 0.0, 0.85)
M['ctx_road'] = mat('RingRoad', (0.33, 0.33, 0.35), 0.0, 0.9)
M['ctx_gap'] = mat('GapMarker', (0.42, 0.40, 0.41), 0.0, 0.9)
M['ctx_env'] = mat('Envelope', (0.3, 0.3, 0.3), 0.0, 0.5, (0.45, 0.5, 0.6), 0.5)
M['ctx_margin'] = mat('SafetyMargin', (0.3, 0.2, 0.0), 0.0, 0.5, (1.0, 0.55, 0.0), 1.2)

def coll(name):
    c = bpy.data.collections.new(name); sc.collection.children.link(c); return c
C_BASE, C_ENTRY, C_SHAFT, C_DETAIL, C_UPPER, C_CROWN, C_SIGN, C_CTX = (coll(n) for n in (
    'R5_Base_0-12.5', 'R5_EastEntrance', 'R5_Shaft_12.5-35', 'R5_Detailing', 'R5_EventHorizon_35-57', 'R5_Crown', 'R5_Signage', 'Context_not_exported'))

# ------------------------------------------------------------------ primitives
def obj(name, bm, material, col):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); o.data.materials.append(M[material]); col.objects.link(o); return o
def hull(name, pts, material, col):
    bm = bmesh.new()
    for p in pts: bm.verts.new(p)
    r = bmesh.ops.convex_hull(bm, input=bm.verts[:])
    dead = list({v for v in r['geom_interior'] + r['geom_unused'] if isinstance(v, bmesh.types.BMVert)})
    if dead: bmesh.ops.delete(bm, geom=dead, context='VERTS')
    return obj(name, bm, material, col)
def box(name, x0, x1, y0, y1, z0, z1, material, col):
    return hull(name, [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)], material, col)
def quad(name, corners, material, col):
    bm = bmesh.new(); vs = [bm.verts.new(c) for c in corners]; f = bm.faces.new(vs)
    uv = bm.loops.layers.uv.new('UVMap')
    for loop, t in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): loop[uv].uv = t
    return obj(name, bm, material, col)
def rect(cx, cy, hx, hy, z, ch=0.0):
    if ch <= 0: return [(cx - hx, cy - hy, z), (cx + hx, cy - hy, z), (cx + hx, cy + hy, z), (cx - hx, cy + hy, z)]
    return [(cx - hx + ch, cy - hy, z), (cx + hx - ch, cy - hy, z), (cx + hx, cy - hy + ch, z), (cx + hx, cy + hy - ch, z),
            (cx + hx - ch, cy + hy, z), (cx - hx + ch, cy + hy, z), (cx - hx, cy + hy - ch, z), (cx - hx, cy - hy + ch, z)]
def frustum(name, cx, cy, h0, z0, h1, z1, material, col, ch0=0.0, ch1=0.0):
    return hull(name, rect(cx, cy, h0, h0, z0, ch0) + rect(cx, cy, h1, h1, z1, ch1), material, col)
def beam(name, p0, p1, t, material, col, up=(0, 0, 1)):
    p0, p1 = Vector(p0), Vector(p1); d = (p1 - p0).normalized()
    a = d.cross(Vector(up)); a = a.normalized() if a.length > 1e-6 else Vector((1, 0, 0))
    b2 = d.cross(a).normalized()
    return hull(name, [p + (a * sa + b2 * sb) * t / 2 for p in (p0, p1) for sa in (-1, 1) for sb in (-1, 1)], material, col)

# ------------------------------------------------------------------ signage (OFL fonts, fitted, clipping-checked)
FONT_DISPLAY = bpy.data.fonts.load(f'{FONTS}/anton/Anton-Regular.ttf')          # SIL OFL 1.1
FONT_TEXT = bpy.data.fonts.load(f'{FONTS}/oswald/Oswald[wght].ttf')             # SIL OFL 1.1
SIGN_LOG = []
RIGHT = {'S': Vector((1, 0, 0)), 'E': Vector((0, 1, 0)), 'N': Vector((-1, 0, 0)), 'W': Vector((0, -1, 0))}   # as seen from outside
OUTN = {'S': Vector((0, -1, 0)), 'E': Vector((1, 0, 0)), 'N': Vector((0, 1, 0)), 'W': Vector((-1, 0, 0))}
def text(name, body, surface_pt, material, col, font, max_w, max_h, face, slope=0.0, vertical=False, extrude=0.03, space=1.0):
    """Text lying ON a panel surface. surface_pt: point on the panel face at the sign centre; slope: inward lean of the
    panel (metres per metre of height). The glyphs are fitted inside max_w x max_h (no clipping) and their back face
    sits 5 mm proud of the panel, so nothing sinks in or floats. vertical=True reads top-to-bottom (banner style)."""
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.font = font; cu.size = 1.0; cu.extrude = extrude
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.space_character = space; cu.resolution_u = 3
    t = bpy.data.objects.new(name + '_c', cu); sc.collection.objects.link(t)
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(t.evaluated_get(dg)); bpy.data.objects.remove(t)
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]
    w, h = max(xs) - min(xs), max(ys) - min(ys); cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    k = min(max_w / w, max_h / h)
    for v in me.vertices: v.co.x = (v.co.x - cx) * k; v.co.y = (v.co.y - cy) * k
    r, n0 = RIGHT[face], OUTN[face]
    s = (Vector((0, 0, 1)) - n0 * slope).normalized()            # up the panel surface
    n = r.cross(s).normalized()                                   # outward panel normal
    xd, yd = (-s, r) if vertical else (r, s)
    B = Matrix((xd, yd, n)).transposed().to_4x4()
    o = bpy.data.objects.new(name, me); o.matrix_world = Matrix.Translation(Vector(surface_pt) + n * (extrude + .005)) @ B
    o.data.materials.append(M[material]); col.objects.link(o)
    SIGN_LOG.append({'sign': name, 'text': body, 'face': face, 'vertical': vertical, 'glyph_w_m': round(w * k, 2), 'glyph_h_m': round(h * k, 2),
                     'panel_box_w': max_w, 'panel_box_h': max_h, 'fits_in_box': w * k <= max_w + 1e-6 and h * k <= max_h + 1e-6})
    return o
def plate_sign(name, body, face, u0, u1, z0, z1, d, font, material, col, margin=.35, vertical=True, space=1.0):
    """Sign on an fplate-style banner: centred, slope-matched, fitted with a margin."""
    zm, um = (z0 + z1) / 2, (u0 + u1) / 2
    p0, p1 = Vector(fp(face, um, z0, d)), Vector(fp(face, um, z1, d))
    slope = ((p0 - p1).dot(OUTN[face])) / (z1 - z0)
    L, Wd = (z1 - z0) / math.cos(math.atan(slope)) - 2 * margin, (u1 - u0) - 2 * margin
    return text(name, body, (p0 + p1) / 2, material, col, font, L if vertical else Wd, Wd if vertical else L, face, slope, vertical, space=space)


# ================================================================== ZELTAR (Lot #106) — architecture
# Blender coords: +X = EAST = the 4 m public gap toward RAMPAGE (Event Horizon flows east); -X = WEST = main showroom.
# -Y = lot +Z. Envelope 25 x 25 x 57 m; design margin |X|,|Y| <= 12.20 m, Z <= 56.90 m (as RAMPAGE).
def ring(r, z, n=16, rot=math.pi / 16):
    return [(r * math.cos(rot + 2 * math.pi * i / n), r * math.sin(rot + 2 * math.pi * i / n), z) for i in range(n)]
def ngon(name, r0, z0, r1, z1, material, col, n=16):
    return hull(name, ring(r0, z0, n) + ring(r1, z1, n), material, col)
def ring_neon(name, r, z, col, n=32, t=.1, material='neon', skip=None):
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        if skip and skip((a0 + a1) / 2): continue
        beam(f'{name}_{i}', (r * math.cos(a0), r * math.sin(a0), z), (r * math.cos(a1), r * math.sin(a1), z), t, material, col)
def core_r(z): return 9.4 - 1.2 * max(0.0, z - 8.2) / 26.8          # shaft radius 9.4 (8.2 m) -> 8.2 (35 m)
west_or_east = lambda a: abs(math.cos(a)) > 0.86                       # angles facing the west/east displays

# ------------------------------------------------------------------ podium 0–8.2 m: round stepped plinth, glass band, cornice
ngon('Plinth_Step0', 12.15, 0.0, 12.1, 0.22, 'trim', C_BASE, 24)
ngon('Plinth_Step1', 11.7, 0.22, 11.6, 0.48, 'plate', C_BASE, 24)
ngon('Podium_Core', 10.9, 0.48, 10.2, 7.4, 'armor', C_BASE)
ngon('Podium_GlassBand', 11.0, 1.0, 10.45, 6.4, 'glass', C_BASE)
for k in range(16):                                                    # mullions between the glass panes
    a = 2 * math.pi * k / 16
    beam(f'Portal_Mullion_Pod_{k}', (11.05 * math.cos(a), 11.05 * math.sin(a), .5), (10.5 * math.cos(a), 10.5 * math.sin(a), 6.5), .16, 'trim', C_BASE)
ngon('Podium_Cornice', 11.25, 7.4, 10.6, 8.3, 'plate', C_BASE)
ring_neon('Podium_Neon', 11.27, 7.38, C_BASE, 32, .1)
ring_neon('Plinth_Neon', 12.12, 0.24, C_BASE, 40, .07, 'neonO')
# west showroom: a deep glazed bay with ZelPods on display, a blade canopy, the ZELTAR marquee, the ATG plaque
box('Showroom_Bay', -11.6, -9.0, -5.4, 5.4, .48, 6.8, 'recess', C_ENTRY)
box('Showroom_Glass', -11.66, -11.6, -5.2, 5.2, .55, 6.6, 'glass', C_ENTRY)
for y in (-3.5, -1.2, 1.2, 3.5): box(f'Portal_Mullion_Show_{y}', -11.72, -11.6, y - .07, y + .07, .55, 6.6, 'trim', C_ENTRY)
for n_, p0, p1 in (('S', (-11.7, -5.25, .6), (-11.7, -5.25, 6.65)), ('N', (-11.7, 5.25, .6), (-11.7, 5.25, 6.65)), ('T', (-11.7, -5.25, 6.65), (-11.7, 5.25, 6.65))):
    beam(f'Showroom_Neon_{n_}', p0, p1, .13, 'neon', C_ENTRY)
for k, y in enumerate((-2.5, 2.5)):                                    # two ZelPods on turntables
    hull(f'Showroom_Turntable_{k}', [(-9.9 + 1.3 * math.cos(a), y + 1.3 * math.sin(a), z) for a in [i * math.pi / 8 for i in range(16)] for z in (.5, .62)], 'trim', C_ENTRY)
    hull(f'ZelPod_Hull_{k}', [(-9.9 + dx, y + dy, z) for dx, dy, z in ((-1.3, 0, .9), (1.3, 0, .85), (0, -.55, .8), (0, .55, .8), (-.9, 0, 1.25), (.4, 0, 1.45), (.9, -.3, .95), (.9, .3, .95), (-1.0, -.35, .75), (-1.0, .35, .75))], 'plate', C_ENTRY)
    hull(f'ZelPod_Canopy_{k}', [(-9.9 + dx, y + dy, z) for dx, dy, z in ((-.3, -.25, 1.3), (-.3, .25, 1.3), (.5, -.2, 1.35), (.5, .2, 1.35), (.1, 0, 1.62))], 'glass', C_ENTRY)
    beam(f'ZelPod_Glow_{k}', (-11.2, y, .66), (-8.6, y, .66), .12, 'neon', C_ENTRY)
box('Showroom_Floor_Glow', -11.5, -9.2, -5.2, 5.2, .48, .52, 'neonO', C_ENTRY)
hull('Showroom_Canopy', [(-12.15, -6.2, 6.8), (-12.15, 6.2, 6.8), (-9.6, -6.6, 6.9), (-9.6, 6.6, 6.9), (-12.15, -6.2, 7.25), (-12.15, 6.2, 7.25), (-9.6, -6.6, 7.4), (-9.6, 6.6, 7.4)], 'plate', C_ENTRY)
beam('Showroom_Canopy_Neon', (-12.12, -6.15, 6.78), (-12.12, 6.15, 6.78), .08, 'neon', C_ENTRY)
box('Marquee_Panel', -11.0, -10.55, -5.6, 5.6, 7.55, 9.75, 'panel', C_SIGN)
beam('Marquee_Neon_T', (-11.03, -5.6, 9.8), (-11.03, 5.6, 9.8), .09, 'neon', C_SIGN)
beam('Marquee_Neon_B', (-11.03, -5.6, 7.5), (-11.03, 5.6, 7.5), .09, 'neon', C_SIGN)
text('Sign_ZELTAR_Marquee', 'ZELTAR', (-11.0, 0, 8.65), 'signR', C_SIGN, FONT_DISPLAY, 9.6, 1.85, 'W', space=1.25)
hull('ATG_Plaque', [(-10.75, -3.4, 9.95), (-10.75, 3.4, 9.95), (-10.2, -3.4, 9.95), (-10.2, 3.4, 9.95), (-10.55, -2.5, 12.5), (-10.55, 2.5, 12.5), (-10.0, -2.5, 12.5), (-10.0, 2.5, 12.5)], 'panel', C_SIGN)
text('Sign_ATG', 'ATG', (-10.75 + .2 * (11.6 - 9.95) / 2.55, 0, 11.6), 'signW', C_SIGN, FONT_DISPLAY, 2.6, 1.3, 'W', slope=.2 / 2.55)
text('Sign_ATG_Sub', 'ALL THINGS GAMED', (-10.75 + .2 * (10.4 - 9.95) / 2.55, 0, 10.4), 'signR', C_SIGN, FONT_TEXT, 5.6, .46, 'W', slope=.2 / 2.55, space=1.08)
text('Sign_Tagline', 'ZELPOD RACING', (-12.16, 0, 7.02), 'signW', C_SIGN, FONT_TEXT, 4.0, .3, 'W', extrude=.01, space=1.2)

# ------------------------------------------------------------------ shaft 8.2–35 m: sleek core, window strips, galaxy displays, helix
ngon('Shaft_Core', core_r(8.2), 8.2, core_r(35), 35.0, 'armor', C_SHAFT)
for k in range(16):                                                    # vertical dark-glass window strips (skip the display faces)
    a = 2 * math.pi * (k + .5) / 16
    if west_or_east(a): continue
    c, s_ = math.cos(a), math.sin(a)
    hull(f'Window_Strip_{k}', [((core_r(z) + d) * c + tx * -s_, (core_r(z) + d) * s_ + tx * c, z) for z in (9.0, 34.2) for d in (-.1, .08) for tx in (-.6, .6)], 'glass', C_SHAFT)
for sx, face in ((-1, 'W'), (1, 'E')):                                 # galaxy displays (the shader draws them), framed, flanked by banners
    xd = sx * 9.25
    box(f'Display_Backing_{face}', min(xd, sx * 8.4), max(xd, sx * 8.4), -5.0, 5.0, 12.8, 33.6, 'recess', C_SHAFT)
    cs = [(xd + sx * .02, -sx * 4.5, 13.3), (xd + sx * .02, sx * 4.5, 13.3), (xd + sx * .02, sx * 4.5, 33.1), (xd + sx * .02, -sx * 4.5, 33.1)]
    quad(f'Galaxy_Display_{face}', cs, 'ehMain', C_SHAFT)
    for y in (-4.75, 4.75):
        box(f'Display_Frame_{face}_{y}', min(xd, xd + sx * .55), max(xd, xd + sx * .55), y - .25, y + .25, 12.8, 33.6, 'trim', C_SHAFT)
        beam(f'Display_Neon_{face}_{y}', (xd + sx * .57, y, 13.0), (xd + sx * .57, y, 33.4), .1, 'neon', C_SHAFT)
    for z in (12.8, 33.6):
        box(f'Display_FrameH_{face}_{z}', min(xd, xd + sx * .55), max(xd, xd + sx * .55), -5.0, 5.0, z - .25, z + .25, 'trim', C_SHAFT)
    if face == 'W':
        for y in (-6.6, 6.6):                                          # vertical ZELTAR banners, as in the original design
            box(f'Banner_{face}_{y}', -9.55, -8.6, y - 1.2, y + 1.2, 13.5, 32.8, 'banner', C_SIGN)
            beam(f'Banner_Neon_{face}_{y}_a', (-9.58, y - 1.22, 13.5), (-9.58, y - 1.22, 32.8), .07, 'neon', C_SIGN)
            beam(f'Banner_Neon_{face}_{y}_b', (-9.58, y + 1.22, 13.5), (-9.58, y + 1.22, 32.8), .07, 'neon', C_SIGN)
            text(f'Sign_Banner_ZELTAR_{y}', 'ZELTAR', (-9.56, y, 23.15), 'signB', C_SIGN, FONT_DISPLAY, 17.0, 1.9, 'W', vertical=True, space=1.15)
# cyan racing-stripe helix: two turns from 12 to 34.5 m, skipping the display faces
N = 96
for i in range(N):
    t0, t1 = i / N, (i + 1) / N
    a0, a1 = t0 * 4 * math.pi + .4, t1 * 4 * math.pi + .4
    if west_or_east((a0 + a1) / 2): continue
    z0, z1 = 12.0 + 22.5 * t0, 12.0 + 22.5 * t1
    r0, r1 = core_r(z0) + .32, core_r(z1) + .32
    p0, p1 = (r0 * math.cos(a0), r0 * math.sin(a0), z0), (r1 * math.cos(a1), r1 * math.sin(a1), z1)
    beam(f'Helix_Band_{i}', p0, p1, .42, 'plate', C_SHAFT)
    beam(f'Channel_Helix_{i}', tuple(Vector(p0) * 1.03), tuple(Vector(p1) * 1.03), .12, 'neon', C_DETAIL)
# horizontal speed-line rings
for z in (16.0, 21.5, 27.0):
    ring_neon(f'Channel_Speedline_{z}', core_r(z) + .06, z, C_DETAIL, 32, .07, skip=west_or_east)

# ------------------------------------------------------------------ four swept wing fins (full height): the racing silhouette
for k, a in enumerate([math.pi / 4 + i * math.pi / 2 for i in range(4)]):
    c, s_ = math.cos(a), math.sin(a)
    def P(r, tx, z): return (r * c - tx * s_, r * s_ + tx * c, z)
    hull(f'Fin_{k}', [P(9.0, -1.2, .5), P(9.0, 1.2, .5), P(11.75, -.9, .5), P(11.75, .9, .5),
                      P(8.4, -.9, 50.0), P(8.4, .9, 50.0), P(10.2, -.5, 50.0), P(10.2, .5, 50.0)], 'trim', C_SHAFT)
    hull(f'Fin_Tip_{k}', [P(8.4, -.9, 50.0), P(8.4, .9, 50.0), P(10.2, -.5, 50.0), P(10.2, .5, 50.0), P(10.9, 0, 56.9), P(9.0, 0, 55.4)], 'plate', C_CROWN)
    beam(f'Fin_Neon_{k}', P(11.78, 0, .9), P(10.23, 0, 49.8), .12, 'neon', C_SHAFT)
    beam(f'Fin_Tip_Neon_{k}', P(10.23, 0, 50.0), P(10.88, 0, 56.6), .1, 'neon', C_CROWN)
    for j, z in enumerate((14.0, 24.0, 34.0, 44.0)):                     # aero vanes
        hull(f'Plate_Vane_{k}_{j}', [P(10.6 - z * .03, -.95, z), P(10.6 - z * .03, .95, z), P(11.5 - z * .03, 0, z + .4), P(10.4 - z * .03, -.8, z + 2.2), P(10.4 - z * .03, .8, z + 2.2)], 'plate', C_DETAIL)

# ------------------------------------------------------------------ transition 35 m + Event Horizon 35–57 m (same pane contract as RAMPAGE)
ngon('Transition_Cornice', 9.6, 33.8, 8.0, 36.2, 'plate', C_SHAFT)
ring_neon('Transition_Neon', 9.62, 33.78, C_SHAFT, 32, .1)
DH = 6.54
frustum('EH_Core', 0, 0, DH - .95, 36.0, DH - .95, 53.2, 'recess', C_UPPER)
EH = {'S': [(-DH, -DH), (DH, -DH)], 'E': [(DH, -DH), (DH, DH)], 'N': [(DH, DH), (-DH, DH)], 'W': [(-DH, DH), (-DH, -DH)]}
for f, ((x0, y0), (x1, y1)) in EH.items():
    corners = [(x0, y0, 36.2), (x1, y1, 36.2), (x1, y1, 55.8), (x0, y0, 55.8)]
    o = quad(f'EventDisplay_{f}', corners, 'ehMain', C_UPPER)
    o['p0_flow'] = 'east (+X), q.x - t*4, shared p0Time'; o['p0_lens_centre_local'] = '(+14.5, 46.0)'; o['p0_pairing'] = 'mirrors RAMPAGE Lot #82'
    n_ = OUTN[f]
    quad(f'EventDisplay_Deep_{f}', [tuple(Vector(c_) - n_ * .6) for c_ in corners], 'ehDeep', C_UPPER)
    quad(f'EH_Glass_{f}', [tuple(Vector(c_) + n_ * .35) for c_ in corners], 'ehGlass', C_UPPER)
def eh_point(face, u, z, d):
    h = DH + d
    return {'S': (u, -h, z), 'N': (-u, h, z), 'W': (-h, -u, z), 'E': (h, u, z)}[face]
for face in 'SENW':
    W2 = DH + .45
    for (u0, u1, z0, z1, d0, d1, tag) in ((-W2 - .1, -DH - .02, 35.6, 56.4, 1.3, 1.0, 'JambL'), (DH + .02, W2 + .1, 35.6, 56.4, 1.3, 1.0, 'JambR'),
                                          (-W2, W2, 35.6, 36.2, 1.4, 1.0, 'Sill'), (-W2, W2, 55.8, 56.5, 1.0, 1.2, 'Head')):
        hull(f'EH_Frame_{face}_{tag}', [eh_point(face, u, z, d) for u in (u0, u1) for (z, d) in ((z0, d0), (z1, d1))] +
             [eh_point(face, u, z, -.05) for u in (u0, u1) for z in (z0, z1)], 'trim', C_UPPER)
    for k, u in enumerate((-2.2, 2.2)):
        hull(f'EH_Mullion_{face}_{k}', [eh_point(face, uu, z, d) for uu in (u - .1, u + .1) for (z, d) in ((36.3, .45), (55.7, .45))] +
             [eh_point(face, uu, z, .02) for uu in (u - .1, u + .1) for z in (36.3, 55.7)], 'trim', C_UPPER)
    beam(f'EH_Channel_{face}', eh_point(face, -W2 + .2, 56.0, 1.05), eh_point(face, W2 - .2, 56.0, 1.05), .1, 'neon', C_UPPER)
for f_, (x0, x1, y0, y1) in {'S': (-DH, DH, -DH + .72, -DH + .76), 'N': (-DH, DH, DH - .76, DH - .72), 'W': (-DH + .72, -DH + .76, -DH, DH), 'E': (DH - .76, DH - .72, -DH, DH)}.items():
    box(f'EH_Inner_Liner_{f_}', x0, x1, y0, y1, 53.0, 56.5, 'armor', C_UPPER)
# ------------------------------------------------------------------ crown: deck, antenna ring, cyan spire (all <= 56.90 m)
frustum('Roof_Deck', 0, 0, DH - .85, 53.2, DH - 1.0, 53.5, 'armor', C_CROWN, .6, .6)
ngon('Crown_Drum', 3.2, 53.5, 2.6, 55.2, 'plate', C_CROWN)
ring_neon('Crown_Drum_Neon', 3.0, 55.2, C_CROWN, 24, .08)
hull('Crown_Spire_Main', ring(.55, 55.2, 8) + [(0, 0, 56.9)], 'neon', C_CROWN)
for k in range(8):
    a = 2 * math.pi * k / 8 + math.pi / 8
    x, y = 4.8 * math.cos(a), 4.8 * math.sin(a)
    hull(f'Crown_Needle_{k}', [(x + .09 * math.cos(b), y + .09 * math.sin(b), 53.5) for b in [i * math.pi / 3 for i in range(6)]] + [(x, y, 56.2 + (k % 3) * .3)], 'trim', C_CROWN)

# ================================================================== CONTEXT (not part of the build)
bpy.ops.mesh.primitive_plane_add(size=170, location=(0, 0, 0)); gp = bpy.context.object; gp.name = 'Ctx_Ground'
gp.data.materials.append(M['ctx_ground']); [c.objects.unlink(gp) for c in gp.users_collection]; C_CTX.objects.link(gp)
import json
os.makedirs(os.path.join(os.path.dirname(OUT), 'renders'), exist_ok=True)
json.dump(SIGN_LOG, open(os.path.join(os.path.dirname(OUT), 'renders', 'zeltar-signage.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print('SAVED', OUT, 'objects', len([o for o in bpy.data.objects if o.type == 'MESH']))

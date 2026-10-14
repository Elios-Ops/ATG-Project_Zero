"""RAMPAGE: SAVE LILLY — custom creature rig and animation for the Meshy model of THE WARDEN (Blender 4.5, background).
The original geometry, UVs and textures are kept as they are. This script adds a gorilla-ogre skeleton, skin weights
(rigid gauntlets, fists, feet and armour; blended organic joints) and seven animation clips timed to the boss fight.
  Blender --background --factory-startup --python rig_warden.py -- <warden.glb> <out.blend> <out.glb>
The source GLB is only read; the .blend and the GLB are new files."""
import bpy, sys, math
import numpy as np
from mathutils import Vector, Quaternion, Matrix

SRC, OUT_BLEND, OUT_GLB = sys.argv[sys.argv.index('--') + 1:][:3]
FPS = 30
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.fps = FPS
bpy.ops.import_scene.gltf(filepath=SRC)
mesh = [o for o in sc.objects if o.type == 'MESH'][0]
mesh.name = 'Warden'
# ---------------------------------------------------------------- feet on the ground, transforms applied (geometry unchanged)
bpy.context.view_layer.objects.active = mesh; mesh.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
V = np.array([v.co[:] for v in mesh.data.vertices]); z0 = V[:, 2].min()
for v in mesh.data.vertices: v.co.z -= z0
V[:, 2] -= z0
print('WARDEN height', round(V[:, 2].max(), 3), 'verts', len(V))

# ---------------------------------------------------------------- the skeleton (Blender axes: +X = his left, -Y = front, +Z = up)
B = {  # name: (head, tail, parent)
    'root': ((0, 0, 0), (0, 0.25, 0), None),
    'hips': ((0, 0.03, 0.74), (0, 0.03, 0.92), 'root'),
    'spine': ((0, 0.03, 0.92), (0, 0.05, 1.18), 'hips'),
    'chest': ((0, 0.05, 1.18), (0, 0.02, 1.5), 'spine'),
    'neck': ((0, -0.02, 1.52), (0, -0.12, 1.7), 'chest'),
    'head': ((0, -0.12, 1.7), (0, -0.22, 1.88), 'neck'),
    'jaw': ((0, -0.16, 1.73), (0, -0.4, 1.66), 'head'),
}
for s, sx in (('L', 1), ('R', -1)):
    B.update({
        f'shoulder.{s}': ((sx * 0.16, 0.03, 1.44), (sx * 0.47, 0.03, 1.42), 'chest'),
        f'upper_arm.{s}': ((sx * 0.55, 0.04, 1.36), (sx * 0.59, 0.05, 1.08), f'shoulder.{s}'),
        f'forearm.{s}': ((sx * 0.59, 0.05, 1.08), (sx * 0.59, 0.0, 0.86), f'upper_arm.{s}'),
        f'hand.{s}': ((sx * 0.59, 0.0, 0.86), (sx * 0.59, -0.03, 0.56), f'forearm.{s}'),
        f'thigh.{s}': ((sx * 0.25, 0.03, 0.74), (sx * 0.28, 0.0, 0.38), 'hips'),
        f'shin.{s}': ((sx * 0.28, 0.0, 0.38), (sx * 0.31, 0.04, 0.09), f'thigh.{s}'),
        f'foot.{s}': ((sx * 0.31, 0.04, 0.09), (sx * 0.33, -0.22, 0.02), f'shin.{s}'),
    })
arm_data = bpy.data.armatures.new('WardenRig'); rig = bpy.data.objects.new('WardenRig', arm_data); sc.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
for name, (h, t, p) in B.items():
    eb = arm_data.edit_bones.new(name); eb.head = h; eb.tail = t
    if p: eb.parent = arm_data.edit_bones[p]
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------------------------------------------------------- skin weights: chains interpolated along height, regions blended
def ramp(v, a, b): return np.clip((v - a) / (b - a), 0, 1)
x, y, z = V[:, 0], V[:, 1], V[:, 2]
ax = np.abs(x); side = np.where(x >= 0, 'L', 'R')
W = {n: np.zeros(len(V)) for n in B}
def chain(weights, bones, cuts, blend=0.05):
    """Distribute `weights` over bones ordered bottom -> top, split at heights `cuts` with soft blends."""
    rem = weights.copy()
    for bone, c in zip(bones[:-1], cuts):
        below = 1 - ramp(z, c - blend, c + blend)
        part = rem * below; yield bone, part; rem = rem - part
    yield bones[-1], rem
# region memberships (soft)
arm = ramp(ax, 0.36, 0.44) * (1 - ramp(z, 1.3, 1.42)) * ramp(z, 0.45, 0.5)
shoulder_zone = ramp(ax, 0.3, 0.42) * ramp(z, 1.24, 1.32) * (1 - ramp(z, 1.55, 1.62))
leg = (1 - ramp(z, 0.68, 0.82)) * ramp(ax, 0.03, 0.08)
arm = np.maximum(arm, 0); torso = np.clip(1 - arm - shoulder_zone, 0, 1) * (1 - leg) ; leg = leg * (1 - arm)
for s in ('L', 'R'):
    m = side == s
    for bone, w in chain(arm * m, [f'hand.{s}', f'forearm.{s}', f'upper_arm.{s}', f'shoulder.{s}'], [0.86, 1.08, 1.32], 0.04): W[bone] += w
    sh = shoulder_zone * m
    W[f'shoulder.{s}'] += sh * 0.6; W[f'upper_arm.{s}'] += sh * 0.2; W['chest'] += sh * 0.2
    for bone, w in chain(leg * m, [f'foot.{s}', f'shin.{s}', f'thigh.{s}', 'hips'], [0.12, 0.38, 0.74], 0.05): W[bone] += w
for bone, w in chain(torso, ['hips', 'spine', 'chest', 'neck', 'head'], [0.92, 1.2, 1.56, 1.7], 0.06): W[bone] += w
# the jaw: the lower face in front of the skull
jaw = (y < -0.24) * ramp(z, 1.6, 1.64) * (1 - ramp(z, 1.74, 1.78)) * (1 - ramp(ax, 0.17, 0.22))
W['jaw'] += jaw * W['head'] * 0.0 + jaw; W['head'] *= (1 - jaw)
tot = sum(W.values()); tot[tot == 0] = 1
for n in W: W[n] /= tot
# Blender's bone-heat weights, cleaned up: an arm never shares a vertex with a leg or the hips below the chest
# (that tore spikes when he lifted his arms), fists / feet / gauntlets are rigid, the jaw is the lower face.
FALLBACK = W
for o in sc.objects: o.select_set(False)
mesh.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
names = [n for n in B if n != 'root']; idx = {n: i for i, n in enumerate(names)}
H = np.zeros((len(V), len(names)))
gname = {g.index: g.name for g in mesh.vertex_groups}
for v in mesh.data.vertices:
    for ge in v.groups:
        n = gname.get(ge.group)
        if n in idx: H[v.index, idx[n]] = ge.weight
missing = H.sum(1) < 1e-4
print('HEAT missing', int(missing.sum()))
for n in names: H[missing, idx[n]] = FALLBACK[n][missing]
for s in ('L', 'R'):
    A = [idx[f'{b}.{s}'] for b in ('shoulder', 'upper_arm', 'forearm', 'hand')]
    Lg = [idx[f'{b}.{s}'] for b in ('thigh', 'shin', 'foot')] + [idx['hips'], idx['spine']]
    low = z < 1.2
    a_sum, l_sum = H[:, A].sum(1), H[:, Lg].sum(1)
    arm_wins = low & (a_sum >= l_sum) & (a_sum > 0); leg_wins = low & (l_sum > a_sum)
    for j in Lg: H[arm_wins, j] = 0
    for j in A: H[leg_wins & (ax > 0.3), j] = 0
H /= np.maximum(H.sum(1, keepdims=True), 1e-9)
top = H.argmax(1); topw = H.max(1)
for n in ('hand.L', 'hand.R', 'foot.L', 'foot.R'):
    m = (top == idx[n]) & (topw > 0.5); H[m] = 0; H[m, idx[n]] = 1
for n in ('forearm.L', 'forearm.R'):
    m = (top == idx[n]) & (topw > 0.6); keep = H[m, idx[n]].copy(); H[m] = 0; H[m, idx[n]] = 1
jm = jaw > 0.5; H[jm] = 0; H[jm, idx['jaw']] = 1
for sd, sgn in (('L', 1), ('R', -1)):                      # at fist height, everything outside the thigh is fist
    m = (x * sgn > 0.405) & (z > 0.5) & (z < 0.9); H[m] = 0; H[m, idx[f'hand.{sd}']] = 1
H /= np.maximum(H.sum(1, keepdims=True), 1e-9)
for g in list(mesh.vertex_groups): mesh.vertex_groups.remove(g)
for n in names:
    g = mesh.vertex_groups.new(name=n); col = H[:, idx[n]]
    for i in np.nonzero(col > 0.01)[0]: g.add([int(i)], float(col[i]), 'REPLACE')
W = {n: H[:, idx[n]] for n in names}; W['root'] = np.zeros(len(V))
# Where a fist rests on the hip the mesh is welded: triangles bridge arm and body and would stretch into spikes when the
# arm moves. Remove only those hidden contact faces (below the chest); everything else of the original mesh stays.
import bmesh
chain_of = np.full(len(V), 'body', dtype=object)
for s in ('L', 'R'):
    asum = sum(H[:, idx[f'{b}.{s}']] for b in ('shoulder', 'upper_arm', 'forearm', 'hand'))
    chain_of[asum > 0.5] = 'arm' + s
bm = bmesh.new(); bm.from_mesh(mesh.data); bm.faces.ensure_lookup_table()
bridge = [f for f in bm.faces if len({chain_of[v.index] for v in f.verts}) > 1 and min(v.co.z for v in f.verts) < 1.15]
bmesh.ops.delete(bm, geom=bridge, context='FACES_ONLY')
bm.to_mesh(mesh.data); bm.free()
print('BRIDGE faces removed', len(bridge), 'of', len(mesh.data.polygons) + len(bridge))
# small pieces the cut left behind on the arm side go with the arm (welded by position, like the import's UV seams)
co = np.array([v.co[:] for v in mesh.data.vertices]); par = list(range(len(co)))
def find(a):
    while par[a] != a: par[a] = par[par[a]]; a = par[a]
    return a
key = {}
for i, c in enumerate(np.round(co, 5)):
    k = tuple(c)
    if k in key: par[find(i)] = find(key[k])
    else: key[k] = i
for e in mesh.data.edges: a2, b2 = find(e.vertices[0]), find(e.vertices[1]); par[a2] = b2 if a2 != b2 else par[a2]
roots = np.array([find(i) for i in range(len(co))]); u, cnt = np.unique(roots, return_counts=True)
used = np.zeros(len(co), bool)
for pl in mesh.data.polygons: used[list(pl.vertices)] = True
moved = 0
for r, c in zip(u, cnt):
    if c > 600: continue
    m = (roots == r) & used
    if not m.any(): continue
    cx, cz = co[m, 0].mean(), co[m, 2].mean()
    if abs(cx) < 0.33 or cz > 1.2: continue
    sd = 'L' if cx > 0 else 'R'; bone = f'hand.{sd}' if cz < 0.86 else f'forearm.{sd}'
    for g in mesh.vertex_groups:
        idxs = [int(i) for i in np.nonzero(m)[0]]
        if g.name == bone: g.add(idxs, 1.0, 'REPLACE')
        else: g.remove(idxs)
    moved += int(m.sum())
print('FRAGMENTS reattached', moved)
print('WEIGHTS', {n: int((W[n] > 0.5).sum()) for n in B})

# ---------------------------------------------------------------- animation helpers: rotations given in ARMATURE space, degrees
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='POSE')
for pb in rig.pose.bones: pb.rotation_mode = 'QUATERNION'
REST = {pb.name: pb.bone.matrix_local.to_quaternion() for pb in rig.pose.bones}
def q_arm(rx=0, ry=0, rz=0):
    return (Quaternion((0, 0, 1), math.radians(rz)) @ Quaternion((0, 1, 0), math.radians(ry)) @ Quaternion((1, 0, 0), math.radians(rx)))
def pose(name, rx=0, ry=0, rz=0):
    r = REST[name]; return r.inverted() @ q_arm(rx, ry, rz) @ r
def clear():
    for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
def key(frame, spec, loc=None):
    """spec: {bone: (rx, ry, rz)} in armature space (degrees); loc: {bone: (x, y, z)} in bone space. Unlisted bones rest."""
    clear()
    for name, r in spec.items(): rig.pose.bones[name].rotation_quaternion = pose(name, *r)
    for name, l in (loc or {}).items(): rig.pose.bones[name].location = l
    for pb in rig.pose.bones:
        pb.keyframe_insert('rotation_quaternion', frame=frame); pb.keyframe_insert('location', frame=frame)
def mirror(spec):                                  # copy .L bones to .R with the side flipped
    out = dict(spec)
    for n, (rx, ry, rz) in spec.items():
        if n.endswith('.L'): out[n[:-2] + '.R'] = (rx, -ry, -rz)
    return out
def action(name, frames_and_poses, loop=True):
    rig.animation_data_create(); act = bpy.data.actions.new(name); rig.animation_data.action = act
    for f, spec, *rest in frames_and_poses: key(f, spec, rest[0] if rest else None)
    for fc in act.fcurves:
        for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'
    act.use_fake_user = True
    trk = rig.animation_data.nla_tracks.new(); trk.name = name; trk.strips.new(name, int(frames_and_poses[0][0]), act); trk.mute = True
    rig.animation_data.action = None
    return act
# base stance: hunched, fists low and forward, knees soft
STANCE = mirror({'chest': (14, 0, 0), 'neck': (-6, 0, 0), 'head': (-4, 0, 0), 'upper_arm.L': (-12, -6, 0), 'forearm.L': (-14, 0, 0), 'thigh.L': (-12, 0, 0), 'shin.L': (16, 0, 0), 'foot.L': (-4, 0, 0)})
def S(**over):                                      # stance with overrides; keys like upper_arm_L=(..)
    d = dict(STANCE)
    for k, v in over.items(): d[k.replace('_L', '.L').replace('_R', '.R')] = v
    return d
HIPS_DOWN = lambda h: {'hips': (0, -h, 0)}           # bone-space Y is along the bone (up): negative = lower

# ---------------------------------------------------------------- the seven clips (timed to the boss fight)
action('idle', [
    (0, S(chest=(14, 0, 0)), HIPS_DOWN(0.0)),
    (36, S(chest=(10, 0, 0), head=(-8, 0, 3), upper_arm_L=(-14, -9, 0), upper_arm_R=(-10, 4, 0)), HIPS_DOWN(0.015)),
    (72, S(chest=(14, 0, 0)), HIPS_DOWN(0.0)),
])
pound_l = S(chest=(-6, 0, 0), head=(-18, 0, 0), jaw=(28, 0, 0), upper_arm_L=(-78, 34, 0), forearm_L=(-110, 0, 0), upper_arm_R=(-60, -20, 0), forearm_R=(-70, 0, 0))
pound_r = S(chest=(-6, 0, 0), head=(-18, 0, 0), jaw=(28, 0, 0), upper_arm_R=(-78, -34, 0), forearm_R=(-110, 0, 0), upper_arm_L=(-60, 20, 0), forearm_L=(-70, 0, 0))
roar = [(0, S()), (10, S(chest=(22, 0, 0), head=(4, 0, 0)), HIPS_DOWN(0.05)),
        (22, S(chest=(-16, 0, 0), head=(-34, 0, 0), jaw=(34, 0, 0), upper_arm_L=(-40, -58, 0), forearm_L=(-30, 0, 0), upper_arm_R=(-40, 58, 0), forearm_R=(-30, 0, 0))),
        (30, S(chest=(-18, 0, 4), head=(-36, 0, -6), jaw=(36, 0, 0), upper_arm_L=(-44, -62, 0), forearm_L=(-30, 0, 0), upper_arm_R=(-44, 62, 0), forearm_R=(-30, 0, 0))),
        (38, S(chest=(-16, 0, -4), head=(-34, 0, 6), jaw=(34, 0, 0), upper_arm_L=(-40, -58, 0), forearm_L=(-30, 0, 0), upper_arm_R=(-40, 58, 0), forearm_R=(-30, 0, 0)))]
f = 44
for i in range(4): roar.append((f, pound_l if i % 2 == 0 else pound_r)); f += 7
roar += [(f + 6, S(chest=(4, 0, 0), jaw=(10, 0, 0))), (75, S())]
action('roar', roar)
action('throw', [                                    # grab 0.55 s (overhead), throw 0.35 s
    (0, S()), (10, S(chest=(-4, 0, 0), upper_arm_L=(-120, -12, 0), forearm_L=(-40, 0, 0), upper_arm_R=(-120, 12, 0), forearm_R=(-40, 0, 0)), HIPS_DOWN(0.04)),
    (16, S(chest=(-18, 0, 0), head=(-14, 0, 0), jaw=(18, 0, 0), upper_arm_L=(-168, -10, 0), forearm_L=(-30, 0, 0), upper_arm_R=(-168, 10, 0), forearm_R=(-30, 0, 0)), HIPS_DOWN(0.02)),
    (21, S(chest=(34, 0, 0), head=(8, 0, 0), jaw=(30, 0, 0), upper_arm_L=(-58, -8, 0), forearm_L=(-8, 0, 0), upper_arm_R=(-58, 8, 0), forearm_R=(-8, 0, 0)), HIPS_DOWN(0.07)),
    (27, S(chest=(24, 0, 0), upper_arm_L=(-30, -8, 0), upper_arm_R=(-30, 8, 0)), HIPS_DOWN(0.04)),
], loop=False)
action('slam', [                                     # tell 0.9 s (arms rise), strike 0.4 s
    (0, S()), (14, S(chest=(-6, 0, 0), upper_arm_L=(-130, -14, 0), forearm_L=(-30, 0, 0), upper_arm_R=(-130, 14, 0), forearm_R=(-30, 0, 0)), HIPS_DOWN(0.03)),
    (27, S(chest=(-20, 0, 0), head=(-16, 0, 0), jaw=(26, 0, 0), upper_arm_L=(-172, -8, 0), forearm_L=(-20, 0, 0), upper_arm_R=(-172, 8, 0), forearm_R=(-20, 0, 0)), HIPS_DOWN(0.0)),
    (31, S(chest=(46, 0, 0), head=(14, 0, 0), jaw=(30, 0, 0), upper_arm_L=(-24, -10, 0), forearm_L=(-6, 0, 0), upper_arm_R=(-24, 10, 0), forearm_R=(-6, 0, 0), thigh_L=(-34, 0, 0), shin_L=(46, 0, 0), thigh_R=(-34, 0, 0), shin_R=(46, 0, 0)), HIPS_DOWN(0.16)),
    (39, S(chest=(40, 0, 0), head=(10, 0, 0), upper_arm_L=(-20, -10, 0), upper_arm_R=(-20, 10, 0), thigh_L=(-30, 0, 0), shin_L=(40, 0, 0), thigh_R=(-30, 0, 0), shin_R=(40, 0, 0)), HIPS_DOWN(0.14)),
], loop=False)
aim = S(chest=(26, 0, 0), neck=(4, 0, 0), head=(6, 0, 0), jaw=(12, 0, 0), upper_arm_L=(-34, -26, 0), forearm_L=(-20, 0, 0), upper_arm_R=(-34, 26, 0), forearm_R=(-20, 0, 0), thigh_L=(-20, 0, 0), shin_L=(26, 0, 0), thigh_R=(-20, 0, 0), shin_R=(26, 0, 0))
action('eye_attack', [                               # tell 1.15 s (crouch and aim), beam 0.6 s
    (0, S()), (16, aim, HIPS_DOWN(0.08)), (24, {**aim, 'head': (8, 0, 2)}, HIPS_DOWN(0.08)), (34, {**aim, 'head': (6, 0, -2)}, HIPS_DOWN(0.08)),
    (35, {**aim, 'chest': (20, 0, 0), 'head': (0, 0, 0), 'jaw': (24, 0, 0)}, HIPS_DOWN(0.06)), (52, {**aim, 'chest': (18, 0, 0), 'head': (-2, 0, 0), 'jaw': (24, 0, 0)}, HIPS_DOWN(0.06)),
], loop=False)
action('hurt', [
    (0, S()), (5, S(chest=(-28, 0, 6), head=(-30, 0, 10), jaw=(32, 0, 0), upper_arm_L=(-70, -50, 0), forearm_L=(-60, 0, 0), upper_arm_R=(-30, 40, 0), forearm_R=(-30, 0, 0)), HIPS_DOWN(-0.02)),
    (12, S(chest=(-20, 0, -4), head=(-24, 0, -6), jaw=(28, 0, 0), upper_arm_L=(-60, -44, 0), forearm_L=(-50, 0, 0), upper_arm_R=(-24, 36, 0)), HIPS_DOWN(0.0)),
    (36, S()),
], loop=False)
action('defeat', [
    (0, S()), (10, S(chest=(-22, 0, 0), head=(-30, 0, 0), jaw=(36, 0, 0), upper_arm_L=(-60, -60, 0), upper_arm_R=(-60, 60, 0))),
    (24, S(chest=(-30, 0, 8), head=(-40, 0, 12), jaw=(30, 0, 0), upper_arm_L=(-80, -70, 0), upper_arm_R=(-70, 72, 0), thigh_L=(-30, 0, 0), shin_L=(50, 0, 0), thigh_R=(-24, 0, 0), shin_R=(40, 0, 0)), HIPS_DOWN(0.12)),
    (46, {**S(chest=(-10, 0, 0), head=(10, 0, 0), jaw=(10, 0, 0), upper_arm_L=(-150, -40, 0), upper_arm_R=(-150, 40, 0), thigh_L=(-70, 0, 0), shin_L=(80, 0, 0), thigh_R=(-60, 0, 0), shin_R=(70, 0, 0)), 'root': (-70, 0, 0)}, {'root': (0, 0, -0.1)}),
    (66, {**S(chest=(-4, 0, 0), head=(20, 0, 0), jaw=(6, 0, 0), upper_arm_L=(-160, -50, 0), upper_arm_R=(-160, 50, 0), thigh_L=(-60, 0, 0), shin_L=(70, 0, 0), thigh_R=(-50, 0, 0), shin_R=(60, 0, 0)), 'root': (-86, 0, 0)}, {'root': (0, 0, -0.12)}),
], loop=False)
bpy.ops.object.mode_set(mode='OBJECT'); clear()
# ---------------------------------------------------------------- textures: base colour 2048, metal-roughness 1024 (was 4096 each)
for img in bpy.data.images:
    if img.size[0] > 0:
        s = 1024 if 'metallic' in img.name else 2048
        if img.size[0] > s: img.scale(s, s)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
# ---------------------------------------------------------------- export: one GLB, all seven clips as separate animations
for o in sc.objects: o.select_set(o in (mesh, rig))
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                          export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=1,
                          export_skins=True, export_all_influences=False, export_image_format='JPEG', export_jpeg_quality=86,
                          export_draco_mesh_compression_enable=False, export_cameras=False, export_lights=False, export_def_bones=False)
print('EXPORTED', OUT_GLB, [a.name for a in bpy.data.actions])

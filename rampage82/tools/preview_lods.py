# Render the exported LOD GLBs (as Project 0 receives them) from one camera. Shaders are NOT applied in Blender:
# EventDisplay shows its base texture (the gladiator art) where the shader would draw energy; neon shows its glow map.
# Blender --background --factory-startup --python preview_lods.py -- <dir with lod*.glb>
import bpy, sys, os, math
from mathutils import Vector
D = sys.argv[sys.argv.index('--') + 1]
for lod, cam_pos, lens in (('lod0', (44, -38, 22), 34), ('lod1', (44, -38, 22), 34), ('lod2', (44, -38, 22), 34)):
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=os.path.join(D, f'{lod}.glb'))
    for m in bpy.data.materials:
        if not m.use_nodes: continue
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and 'palette' in (n.image.name if n.image else ''): n.interpolation = 'Closest'
        b = m.node_tree.nodes.get('Principled BSDF')
        if b and m.name.startswith('Neon'): b.inputs['Emission Strength'].default_value = 4.0
        if b and m.name.startswith('Armor') and b.inputs['Emission Color'].is_linked: b.inputs['Emission Strength'].default_value = 3.0
    sc.render.engine = 'BLENDER_EEVEE_NEXT'; sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.03, .035, .05, 1)
    l = bpy.data.lights.new('S', 'SUN'); l.energy = 1.2; ob = bpy.data.objects.new('S', l); ob.rotation_euler = (math.radians(55), 0, math.radians(58)); sc.collection.objects.link(ob)
    bpy.ops.mesh.primitive_plane_add(size=160); g = bpy.context.object; gm = bpy.data.materials.new('G'); gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.5, .5, .52, 1); g.data.materials.append(gm)
    cd = bpy.data.cameras.new('C'); cd.lens = lens; cam = bpy.data.objects.new('C', cd); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = cam_pos; cam.rotation_euler = (Vector((0, 0, 26)) - Vector(cam_pos)).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x, sc.render.resolution_y = 900, 1125
    sc.render.filepath = os.path.join(D, f'preview-{lod}.png'); bpy.ops.render.render(write_still=True); print('rendered', lod)

import bpy,pathlib,json,sys
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parent
metrics=json.loads((ROOT/'metrics.json').read_text())
names=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ('RAMPAGE','ZELTAR')
for name in names:
 dest=ROOT/name;bpy.ops.wm.open_mainfile(filepath=str(dest/(name+'-working.blend')))
 scene=bpy.context.scene;src=bpy.data.objects[name+'_Source'];src.hide_render=True
 world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.55,.6,.7,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
 if not any(o.type=='LIGHT' and o.data.type=='SUN' for o in scene.objects):
  bpy.ops.object.light_add(type='SUN',location=(0,-10,60));sun=bpy.context.object;sun.rotation_euler=(.5,-.4,-.5);sun.data.energy=2
 scene.render.resolution_x=640;scene.render.resolution_y=800
 for lod in range(3):
  o=bpy.data.objects[name+'_LOD'+str(lod)];bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  # Collapse may move boundary points by millimetres. Clamp the derivative only.
  for v in o.data.vertices:
   v.co.x=max(-12.45,min(12.45,v.co.x));v.co.y=max(-12.45,min(12.45,v.co.y));v.co.z=max(0,min(56.95,v.co.z))
  if lod<2:
   mod=o.modifiers.new('Transferred source normals','DATA_TRANSFER');mod.object=src;mod.use_loop_data=True;mod.data_types_loops={'CUSTOM_NORMAL'};mod.loop_mapping='POLYINTERP_NEAREST'
   bpy.ops.object.modifier_apply(modifier=mod.name)
  if lod==1:
   for mat in o.data.materials:
    bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    keep=set()
    for socket in (bs.inputs['Base Color'],bs.inputs['Normal']):
     for link in socket.links:
      node=link.from_node
      if node.type=='TEX_IMAGE':keep.add(node)
      elif node.type=='NORMAL_MAP':
       for q in node.inputs['Color'].links:
        if q.from_node.type=='TEX_IMAGE':keep.add(q.from_node)
    for node in list(mat.node_tree.nodes):
     if node.type=='TEX_IMAGE' and node not in keep:mat.node_tree.nodes.remove(node)
    bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Roughness'].default_value=.48;bs.inputs['Metallic'].default_value=.65
  bpy.ops.export_scene.gltf(filepath=str(dest/('lod'+str(lod)+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_image_format='JPEG',export_jpeg_quality=88)
 scene.camera.data.lens=65
 cameras={'street':((53,-72,2),(0,0,19)),'elevated':((66,-80,65),(0,0,19)),'rear':((-60,75,36),(0,0,19))}
 for label in ('original','lod0','lod1','lod2'):
  for o in scene.objects:
   if o.type=='MESH':o.hide_render=True
  o=src if label=='original' else bpy.data.objects[name+'_LOD'+label[-1]];o.hide_render=False
  for angle,(eye,target) in cameras.items():
   scene.camera.location=eye;scene.camera.rotation_euler=(Vector(target)-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(dest/(label+'-'+angle+'.png'));bpy.ops.render.render(write_still=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(dest/(name+'-working.blend')))

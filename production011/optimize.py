import bpy, pathlib, json, math, time
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parent
SOURCES=ROOT.parent/'architecture010/source-originals'
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.resolution_x=640;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world.color=(.16,.16,.16)
scene.view_settings.view_transform='AgX'
def select(o):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
def render(o,path,eye,target):
 o.hide_render=False
 cam.location=eye;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
def tris(o):
 o.data.calc_loop_triangles();return len(o.data.loop_triangles)
report={}
for name,pattern in [('RAMPAGE','*rampage*.glb'),('ZELTAR','*zeltar*.glb')]:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 dest=ROOT/name;dest.mkdir(exist_ok=True)
 bpy.ops.import_scene.gltf(filepath=str(next(SOURCES.glob(pattern))))
 meshes=[o for o in scene.objects if o.type=='MESH']
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();src=bpy.context.object;src.name=name+'_Source'
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 bpy.context.view_layer.update()
 bounds=[src.matrix_world@Vector(v) for v in src.bound_box];mn=Vector([min(v[i] for v in bounds) for i in range(3)]);mx=Vector([max(v[i] for v in bounds) for i in range(3)])
 size=mx-mn;scale=min(24.4/size.x,24.4/size.y,56.8/size.z)
 src.scale*=scale;src.location=-Vector(((mn.x+mx.x)/2,(mn.y+mx.y)/2,mn.z))*scale
 bpy.context.view_layer.update();select(src);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);bpy.context.view_layer.update()
 original_textures=[]
 for mat in src.data.materials:
  if mat and mat.use_nodes:
   for node in mat.node_tree.nodes:
    if node.type=='TEX_IMAGE' and node.image:original_textures.append({'name':node.image.name,'size':list(node.image.size)})
 report[name]={'sourceTriangles':tris(src),'rawDimensions':list(size),'uniformScale':scale,'fittedDimensions':list(src.dimensions),'sourceTextures':original_textures,'levels':{}}
 report[name]['fittedBounds']=[list(src.matrix_world@Vector(v)) for v in src.bound_box]
 (ROOT/'metrics.json').write_text(json.dumps(report,indent=2));print('MODEL FIT',report[name],flush=True)
 bpy.ops.object.camera_add(location=(65,-85,40));cam=bpy.context.object;cam.data.lens=52;scene.camera=cam
 for loc,energy,sizeL in [((15,-30,65),22000,40),((-25,10,50),15000,30)]:
  bpy.ops.object.light_add(type='AREA',location=loc);lamp=bpy.context.object;lamp.data.energy=energy;lamp.data.shape='DISK';lamp.data.size=sizeL;lamp.rotation_euler=(Vector((0,0,25))-lamp.location).to_track_quat('-Z','Y').to_euler()
 cameras={'street':((53,-72,24),(0,0,26)),'elevated':((66,-80,75),(0,0,28)),'rear':((-60,75,40),(0,0,28))}
 for angle,(eye,target) in cameras.items():render(src,dest/('original-'+angle+'.png'),eye,target)
 src.hide_render=True
 for lod,target,tex in [(0,86000,1024),(1,12000,512),(2,1250,256)]:
  o=src.copy();o.data=src.data.copy();scene.collection.objects.link(o);o.name=name+'_LOD'+str(lod);o.hide_render=False
  select(o);mod=o.modifiers.new('Silhouette reduction','DECIMATE');mod.ratio=target/report[name]['sourceTriangles'];mod.use_collapse_triangulate=True
  start=time.time();bpy.ops.object.modifier_apply(modifier=mod.name)
  mats=[]
  for mat in o.data.materials:
   m=mat.copy();m.name='Architecture';mats.append(m)
   for node in m.node_tree.nodes:
    if node.type=='TEX_IMAGE' and node.image:
     image=node.image.copy();image.scale(tex,tex);image.pack();node.image=image
   if lod==2:
    for node in list(m.node_tree.nodes):
     if node.type=='TEX_IMAGE' and not any(link.to_socket.name=='Base Color' for link in node.outputs['Color'].links):m.node_tree.nodes.remove(node)
  o.data.materials.clear()
  for m in mats:o.data.materials.append(m)
  select(o);path=dest/('lod'+str(lod)+'.glb')
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_image_format='JPEG',export_jpeg_quality=88)
  report[name]['levels'][str(lod)]={'triangles':tris(o),'bytes':path.stat().st_size,'textureSize':tex,'materials':len(mats),'reductionSeconds':time.time()-start}
  for angle,(eye,tgt) in cameras.items():render(o,dest/('lod'+str(lod)+'-'+angle+'.png'),eye,tgt)
  o.hide_render=True
  (ROOT/'metrics.json').write_text(json.dumps(report,indent=2))
 bpy.ops.wm.save_as_mainfile(filepath=str(dest/(name+'-working.blend')))
(ROOT/'metrics.json').write_text(json.dumps(report,indent=2))

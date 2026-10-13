"""Software OpenGL previews of actual export geometry; not the Project 0 browser runtime."""
import sys,os,json,struct,io,pathlib,time
sys.path.insert(0,'/tmp/zeltar-render-deps')
import moderngl,numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=pathlib.Path(__file__).resolve().parents[1]
ctx=moderngl.create_standalone_context(backend='egl')
V='''#version 330
in vec3 pos;in vec3 norm;in vec2 uv;in vec3 color;
uniform mat4 mvp;uniform mat4 model;
out vec3 vpos;out vec3 vn;out vec2 vuv;out vec3 vc;
void main(){gl_Position=mvp*vec4(pos,1);vpos=(model*vec4(pos,1)).xyz;vn=mat3(model)*norm;vuv=uv;vc=color;}'''
PREFIX='''#version 330
in vec3 vpos;in vec3 vn;in vec2 vuv;in vec3 vc;
uniform sampler2D atlas;uniform float alpha;uniform int useMap;uniform float p0Time;uniform vec3 eye;
out vec4 outColor;
struct P0Surface {vec3 color;float alpha;vec3 emissive;float roughness;float metalness;vec3 normal;vec2 uv;vec3 position;vec3 world;vec3 view;};
'''
TAIL='''
void main(){P0Surface s;s.color=vc;s.alpha=alpha;s.emissive=vec3(0);s.roughness=.3;s.metalness=.4;s.normal=normalize(vn);s.uv=vuv;s.position=vpos;s.world=vpos;s.view=normalize(eye-vpos);
if(useMap==1)s.color*=texture(atlas,vuv).rgb;
p0Surface(s);
float shade=.65+.35*abs(dot(s.normal,normalize(vec3(1,2,1))));
outColor=vec4(pow(clamp(s.color*shade+s.emissive,0,1),vec3(1.0/2.2)),s.alpha);}
'''
programs={name:ctx.program(vertex_shader=V,fragment_shader=PREFIX+src+TAIL) for name,src in [('plain','void p0Surface(inout P0Surface s) {}'),('event',(ROOT/'exterior/event-horizon.glsl').read_text()),('neon',(ROOT/'exterior/racing-neon.glsl').read_text())]}
report={'renderer':ctx.info['GL_RENDERER'],'shaderCompile':{k:'passed (desktop GLSL wrapper)' for k in programs},'browserRuntime':False}
def perspective(fovy,aspect,near,far):
 f=1/np.tan(np.deg2rad(fovy)/2);return np.array([[f/aspect,0,0,0],[0,f,0,0],[0,0,(far+near)/(near-far),2*far*near/(near-far)],[0,0,-1,0]],np.float32)
def look(eye,target):
 e=np.array(eye,np.float32);f=np.array(target,np.float32)-e;f/=np.linalg.norm(f);s=np.cross(f,[0,1,0]);s/=np.linalg.norm(s);u=np.cross(s,f)
 m=np.eye(4,dtype=np.float32);m[:3,:3]=np.array([s,u,-f]);m[:3,3]=-m[:3,:3]@e;return m
white=ctx.texture((1,1),3,b'\xff\xff\xff')
def draw(meshes,cam,proj,w,h,bg,t=0):
 fbo=ctx.simple_framebuffer((w,h),components=4);fbo.use();fbo.clear(*bg,1);ctx.enable(moderngl.DEPTH_TEST);ctx.enable(moderngl.BLEND);ctx.blend_func=moderngl.SRC_ALPHA,moderngl.ONE_MINUS_SRC_ALPHA
 for obj in meshes:
  p=programs[obj.get('shader','plain')];model=obj.get('matrix',np.eye(4,dtype=np.float32));mvp=proj@cam@model
  for name,val in [('mvp',mvp.T.astype('f4').tobytes()),('model',model.T.astype('f4').tobytes())]:
   if name in p:p[name].write(val)
  for name,val in [('alpha',obj.get('alpha',1)),('useMap',int('texture' in obj)),('p0Time',t),('eye',(70.,44.,80.))]:
   if name in p:p[name].value=val
  obj.get('texture',white).use(0)
  if 'atlas' in p:p['atlas'].value=0
  attrs=[];buffers=[]
  for name,cols,a in [('pos',3,obj['positions']),('norm',3,obj['normals']),('uv',2,obj['uv']),('color',3,obj['colors'])]:
   if name in p:
    b=ctx.buffer(np.array(a,np.float32).tobytes());buffers.append(b);attrs.append((b,f'{cols}f',name))
  ib=ctx.buffer(np.array(obj['indices'],np.uint32).tobytes());vao=ctx.vertex_array(p,attrs,index_buffer=ib)
  ctx.depth_mask=obj.get('alpha',1)>=1;vao.render();ctx.depth_mask=True
  vao.release();ib.release()
  for b in buffers:b.release()
 img=Image.frombytes('RGBA',(w,h),fbo.read(components=4)).transpose(Image.Transpose.FLIP_TOP_BOTTOM);fbo.release();return img

def load_glb(level):
 data=(ROOT/'exterior'/f'lod{level}.glb').read_bytes();n=struct.unpack_from('<I',data,12)[0];j=json.loads(data[20:20+n]);binary=data[28+n:]
 def accessor(i):
  a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dt={5126:'<f4',5123:'<u2'}[a['componentType']];count={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']];return np.frombuffer(binary,dtype=dt,count=a['count']*count,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,count)
 iv=j['bufferViews'][j['images'][0]['bufferView']];im=Image.open(io.BytesIO(binary[iv['byteOffset']:iv['byteOffset']+iv['byteLength']])).convert('RGB');tex=ctx.texture(im.size,3,im.tobytes());tex.filter=(moderngl.LINEAR,moderngl.LINEAR)
 objects=[]
 for prim in j['meshes'][0]['primitives']:
  a=prim['attributes'];mat=j['materials'][prim['material']];name=mat['name'];
  o={'positions':accessor(a['POSITION']),'normals':accessor(a['NORMAL']),'uv':accessor(a['TEXCOORD_0']),'colors':accessor(a['COLOR_0']),'indices':accessor(prim['indices']).ravel(),'shader':{'Neon':'neon','EventDisplay':'event'}.get(name,'plain')}
  if name in ['Body','Glass']:o['texture']=tex
  if name=='Glass':o['alpha']=mat['pbrMetallicRoughness']['baseColorFactor'][3]
  objects.append(o)
 # transparent glass last, depth-tested against the structural frame.
 objects.sort(key=lambda o:o.get('alpha',1)<1)
 return objects
if __name__=='__main__':
 meshes=load_glb(0)
 views=[('front',(0,26,100)),('three-quarter',(70,42,85)),('back',(-65,39,-90)),('above',(50,94,60))]
 for name,eye in views:
  draw(meshes,look(eye,(0,27,0)),perspective(42,1,1,250),900,900,(.82,.86,.91),2).save(ROOT/'reports'/('tower-'+name+'.png'))
 frames=[draw(meshes,look((70,42,85),(0,27,0)),perspective(42,1,1,250),600,600,(.82,.86,.91),t/5).convert('RGB') for t in range(15)]
 frames[0].save(ROOT/'reports'/'event-horizon-preview.gif',save_all=True,append_images=frames[1:],duration=200,loop=0)
 for f in (ROOT/'reports').glob('*-scene.json'):
  d=json.loads(f.read_text());objects=[]
  if 'camera' not in d:continue
  for o in d['meshes']:
   n=len(o['positions'])//3
   objects.append({'positions':np.array(o['positions']).reshape(-1,3),'normals':np.array(o['normals']).reshape(-1,3),'uv':np.zeros((n,2)),'colors':np.array(o['colors']).reshape(-1,3)*o['color'] if o.get('colors') else np.tile(o['color'],(n,1)),'indices':o['indices'],'matrix':np.array(o['matrix'],np.float32).reshape(4,4).T})
  im=draw(objects,np.array(d['camera'],np.float32).reshape(4,4).T,np.array(d['projection'],np.float32).reshape(4,4).T,d['width'],d['height'],(.016,.043,.094))
  hud=Image.open(f.with_name(f.name.replace('-scene.json','-hud.png'))).convert('RGBA').resize(im.size,Image.Resampling.LANCZOS);im.alpha_composite(hud);im.save(f.with_name(f.name.replace('-scene.json','.png')))
 (ROOT/'reports'/'software-render-validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))

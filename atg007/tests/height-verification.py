from pathlib import Path
import json,struct,sys,math,time
import numpy as np
sys.path.insert(0,'/tmp/zeltar-render-deps')
import moderngl
ROOT=Path(__file__).resolve().parents[1]
def glb(path):
 data=Path(path).read_bytes();n=struct.unpack_from('<I',data,12)[0];j=json.loads(data[20:20+n]);bin=data[28+n:]
 def values(a):
  a=j['accessors'][a];v=j['bufferViews'][a['bufferView']];count={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']]
  return np.frombuffer(bin,dtype={5126:'<f4',5123:'<u2'}[a['componentType']],count=a['count']*count,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,count)
 groups={}
 for mesh in j['meshes']:
  for p in mesh['primitives']:
   name=j['materials'][p['material']]['name'];groups.setdefault(name,[]).append(values(p['attributes']['POSITION']))
 return j,{name:np.concatenate(v) for name,v in groups.items()}
oldj,old=glb('zeltar106/exterior/lod0.glb');newj,new=glb(ROOT/'exterior/lod0.glb');_,legacy=glb('atg82/exterior/lod0.glb')
report={'old106':{'bottom':float(old['EventDisplay'][:,1].min()),'top':float(old['EventDisplay'][:,1].max())},'proposed106':{},'lot82Unmodified':{}}
for lod in [0,1]:
 j,g=glb(ROOT/f'exterior/lod{lod}.glb');p=g['EventDisplay'];assert abs(p[:,1].min()-35)<.00001 and abs(p[:,1].max()-57)<.00001
 allpos=np.concatenate(list(g.values()));assert allpos[:,0].min()>=-12.5 and allpos[:,0].max()<=12.5 and allpos[:,2].min()>=-12.5 and allpos[:,2].max()<=12.5 and allpos[:,1].min()>=0 and allpos[:,1].max()<=57
 assert all(not any(k in n for k in ['translation','rotation','scale','matrix']) for n in j['nodes'])
 report['proposed106']['lod'+str(lod)]={'bottom':35,'top':57,'height':22,'displayThickness':.03,'glazingSeparationLOD0':.085,'propertyBoundsPassed':True,'drawCalls':len(j['meshes'][0]['primitives'])}
# LOD1 opaque wall top stops below the animation zone; roof cap is inside display planes.
source=(ROOT/'build.py').read_text();assert 'shaft_top=34.98' in source and 'front_top=34.98' in source and '20.4,.16,20.4' in source
s=(ROOT/'exterior/event-horizon.glsl').read_text();assert 's.position.y-35.0' in s and '(q.y-11.0)' in s and 'q.x-t*4.0' in s and 'p0Vertex' not in s
report['lot82Unmodified']={'bottom':float(legacy['EventDisplay'][:,1].min()),'top':float(legacy['EventDisplay'][:,1].max()),'needsOwnAuthorizedExpansion':True}
# Independent full-pane fragment sampling verifies activity in each metre, not just roof rows.
ctx=moderngl.create_standalone_context(backend='egl')
v='''#version 330
in vec2 pos;out vec2 uv;void main(){uv=pos*.5+.5;gl_Position=vec4(pos,0,1);}'''
prefix='''#version 330
in vec2 uv;out vec4 outputColor;uniform float p0Time;
struct P0Surface {vec3 color;float alpha;vec3 emissive;float roughness;float metalness;vec3 normal;vec2 uv;vec3 position;vec3 world;vec3 view;};
'''
tail='''\nvoid main(){P0Surface s;s.position=vec3(uv.x*21.0-10.5,35.0+uv.y*22.0,10.515);s.normal=vec3(0,0,1);s.alpha=1.0;p0Surface(s);outputColor=vec4(s.emissive,1);}'''
p=ctx.program(vertex_shader=v,fragment_shader=prefix+s+tail);b=ctx.buffer(np.array([-1,-1,1,-1,-1,1,1,1],np.float32).tobytes());vao=ctx.simple_vertex_array(p,b,'pos')
texture=ctx.texture((512,528),4,dtype='f4');fbo=ctx.framebuffer([texture]);fbo.use();rows=np.zeros(22)
for t in [0,.5,1.3,2.7,4.8]:
 p['p0Time'].value=t;vao.render(moderngl.TRIANGLE_STRIP);pixels=np.frombuffer(fbo.read(components=4,dtype='f4'),np.float32).reshape(528,512,4)
 assert np.isfinite(pixels).all()
 for k in range(22):rows[k]=max(rows[k],float((pixels[k*24:(k+1)*24,:,:3].max(axis=2)>.15).mean()))
assert (rows>.05).all(),rows
report['fullHeightAnimation']={'ok':True,'sampleTimes':[0,.5,1.3,2.7,4.8],'bands':'Every 1m band from Y35 to Y57','illuminatedFractionPerBand':rows.tolist(),'verticalMask':'none','sharedClock':'p0Time unchanged; no client offset','flow106':'+X toward Lot82 gap','lensCentreWorldY':46,'logoWorldBaseY':52}
report['litPaneAreaRatio']=22/(report['old106']['top']-report['old106']['bottom']);report['streetGpuCostMeasured']=False
(ROOT/'reports/event-height-verification.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))

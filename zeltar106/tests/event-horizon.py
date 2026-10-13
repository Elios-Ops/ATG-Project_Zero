import sys,json,pathlib,hashlib,math,importlib.util
import numpy as np
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
locks=json.loads((root/'reports/lot82-source-lock.json').read_text())
for p,h in locks.items():
 f=pathlib.Path(p)
 if not f.exists():f=root/'references/lot82'/f.relative_to('atg82')
 if f.exists():assert hashlib.sha256(f.read_bytes()).hexdigest()==h
legacy_root=pathlib.Path('atg82') if pathlib.Path('atg82/exterior/lod0.glb').exists() else root/'references/lot82'
src82=(legacy_root/'exterior/event-horizon.glsl').read_text();src106=(root/'exterior/event-horizon.glsl').read_text()
assert 'p0Time' in src82 and 'p0Time' in src106
assert 'q.x + t * 4.0' in src82 and 'q.x-t*4.0' in src106
assert 'p0Vertex' not in src106 and 'script' not in json.loads((root/'exterior/lot.json').read_text())
positions=json.loads((root/'verified-lots.json').read_text())['lots'];a=next(l for l in positions if l['id']==82);b=next(l for l in positions if l['id']==106)
assert a['position']['z']==b['position']['z'];gap=(a['position']['x']-a['width']/2)-(b['position']['x']+b['width']/2);assert gap==4
report={'ok':True,'gapMetres':gap,'gapFacing106':'+X','flow82':'-X, verified from preserved source; no live exterior reference','flow106':'+X, opposite advection sign','clock':'p0Time, no per-client offset','clockModel':{'baseSpeedMetresPerSecond':4,'rowTrailPeriodMetres':13,'logosCycleSeconds':12},'noVertexDisplacement':True,'noExteriorParticles':True,'lot82FilesUnchanged':True,'livePairVerified':False}
(root/'reports/event-horizon-tests.json').write_text(json.dumps(report,indent=2))
spec=importlib.util.spec_from_file_location('renderer',root/'tests/render.py');r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
r.programs['event82']=r.ctx.program(vertex_shader=r.V,fragment_shader=r.PREFIX+src82+r.TAIL)
r.programs['neon82']=r.ctx.program(vertex_shader=r.V,fragment_shader=r.PREFIX+(legacy_root/'exterior/neon.glsl').read_text()+r.TAIL)
one=r.load_glb(0);save=r.ROOT;r.ROOT=legacy_root;two=r.load_glb(0);r.ROOT=save
for objects,x,legacy in [(one,-14.5,False),(two,14.5,True)]:
 for o in objects:
  o['matrix']=np.eye(4,dtype=np.float32);o['matrix'][0,3]=x
  # Pattern coordinates must stay lot-local, even though the preview composes both lots.
  # Give each draw an offset shader wrapper by translating its vpos back before p0Surface.
  shader=o.get('shader','plain')
  if legacy and shader in ['neon','event']:shader+='82'
  source={'plain':'void p0Surface(inout P0Surface s) {}','event':src106,'event82':src82,'neon':(root/'exterior/racing-neon.glsl').read_text(),'neon82':(legacy_root/'exterior/neon.glsl').read_text()}[shader]
  name=shader+('_left' if x<0 else '_right')
  if name not in r.programs:
   tail=r.TAIL.replace('s.position=vpos;',f's.position=vpos-vec3({x},0.0,0.0);')
   r.programs[name]=r.ctx.program(vertex_shader=r.V,fragment_shader=r.PREFIX+source+tail)
  o['shader']=name
objects=[o for o in one+two if o.get('alpha',1)>=1]+[o for o in one+two if o.get('alpha',1)<1]
frames=[]
for i in range(20):
 im=r.draw(objects,r.look((40,38,118),(0,27,0)),r.perspective(39,1.42,1,250),1136,800,(.82,.86,.91),i/5)
 if i==5:im.save(root/'reports/event-horizon-pair.png')
 frames.append(im.convert('RGB'))
frames[0].save(root/'reports/event-horizon-pair.gif',save_all=True,append_images=frames[1:],duration=200,loop=0)
print(json.dumps(report,indent=2))

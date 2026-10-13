"""Original procedural architecture. No third-party models or textures."""
import json,struct,pathlib,io,math
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=pathlib.Path(__file__).parent
lots=json.loads((ROOT/'verified-lots.json').read_text())['lots'];lot=next(x for x in lots if x['id']==82)
assert (lot['width'],lot['depth'],lot['height'])==(25,25,57)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def atlas(n):
 im=Image.new('RGB',(n,n),(6,13,25));d=ImageDraw.Draw(im)
 for y in range(0,n,n//16):d.line((0,y,n,y),fill=(17,43,62),width=max(1,n//400))
 def text(y,t,size,c):
  f=ImageFont.truetype(font,size);box=d.textbbox((0,0),t,font=f);d.text(((n-box[2])/2,y),t,font=f,fill=c)
 text(int(n*.10),'ATG',int(n*.25),(26,239,255));text(int(n*.44),'ALL THINGS',int(n*.09),(220,237,255));text(int(n*.56),'GAMED',int(n*.12),(247,50,174));text(int(n*.79),'TRAIN • PLAY • REPLAY',int(n*.042),(203,219,241))
 d.rectangle((0,0,max(8,n//32),max(8,n//32)),fill=(255,255,255))
 b=io.BytesIO();im.save(b,format='PNG');return b.getvalue()
def glb(level):
 groups=[[] for _ in range(4 if level==0 else 2 if level==1 else 1)]
 def box(x,y,z,w,h,d,mat=0,color=(.08,.13,.22)):
  mat=mat if level==0 else (1 if mat==3 else 0) if level==1 else 0
  p=np.array([[x-w/2,y-h/2,z-d/2],[x+w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z-d/2],[x-w/2,y+h/2,z-d/2],[x-w/2,y-h/2,z+d/2],[x+w/2,y-h/2,z+d/2],[x+w/2,y+h/2,z+d/2],[x-w/2,y+h/2,z+d/2]],np.float32)
  faces=[([0,3,2,1],(0,0,-1)),([4,5,6,7],(0,0,1)),([0,4,7,3],(-1,0,0)),([1,2,6,5],(1,0,0)),([3,7,6,2],(0,1,0)),([0,1,5,4],(0,-1,0))]
  for ids,n in faces:groups[mat].append((p[ids],np.tile(n,(4,1)),np.full((4,2),.01,np.float32),np.tile(color,(4,1))))
 # hollow shell, open doorway and portal. No full-volume solid mass.
 box(0,.25,0,24.3,.3,24.3)
 for x in [-11.7,11.7]:box(x,28,0,.25,55,23.4,1,(.12,.25,.36))
 box(0,28,-11.7,23.4,55,.25,1,(.12,.25,.36))
 for x in [-7.5,7.5]:box(x,3,11.7,8.4,5.2,.25,1,(.12,.25,.36))
 box(0,30.6,11.7,23.4,49.6,.25,1,(.12,.25,.36))
 box(0,55.8,0,23.6,.35,23.6)
 # chamfer-like shoulders / crown fins; all in lot.
 for x in [-11.9,11.9]:
  for z in [-11.9,11.9]:
   box(x,28,z,.35,55.4,.35,0,(.35,.5,.65));box(x,28,z+.22,.08,55.2,.10,2,(.08,.94,1))
 for y in ([6,12,20,28,36,43,50,56.3] if level==0 else [6,28,43,56.3] if level==1 else [6,43,56.3]):
  for z in [-11.94,11.94]:box(0,y,z,24,.12,.12,2,(.04,.8,1))
  for x in [-11.94,11.94]:box(x,y,0,.12,.12,24,2,(.3,.08,1))
 if level<2:
  for x in ([-8,-4,0,4,8] if level==0 else [-6,6]):
   for z in [-11.86,11.86]:box(x,30,z,.07,49,.07,0,(.45,.55,.66))
  for z in ([-8,-4,0,4,8] if level==0 else [-6,6]):
   for x in [-11.86,11.86]:box(x,30,z,.07,49,.07,0,(.45,.55,.66))
 # 8cm behind 12.1cm thick upper glazing, horizontal animated marquee.
 for z in [-11.46,11.46]:box(0,49.3,z,23,.012+12.4,.035,3,(.04,.1,.18))
 for x in [-11.46,11.46]:box(x,49.3,0,.035,12.4,23,3,(.04,.1,.18))
 # entrance platform and luminous portal
 box(0,.5,10,8,.5,4,0,(.6,.65,.72))
 for x in [-3.2,3.2]:box(x,3.2,11.9,.25,5.5,.45,2,(1,.08,.65))
 box(0,5.9,11.4,7,.3,1.9,2,(.08,.95,1))
 box(0,8.5,11.91,10,4.4,.13,0)
 # signage as front-facing plane sharing Body atlas material.
 # box atlas UVs are generic: use a special plane with all atlas only for signage.
 p=np.array([[-5,6.3,12.0],[5,6.3,12.0],[5,10.7,12.0],[-5,10.7,12.0]],np.float32)
 groups[0].append((p,np.tile((0,0,1),(4,1)),np.array([[0,1],[1,1],[1,0],[0,0]],np.float32),np.ones((4,3))))
 if level==0:
  # Academy seen through lobby glass: platforms, safety rail and sloped tech plinths.
  for i,(x,z) in enumerate([(-8,8),(-8,3),(-8,-2),(-8,-7),(-3,-7),(2,-7),(7,-7),(7,-2),(7,3),(7,8),(2,8)]):
   box(x,1.25,z,3.5,.4,3.5,0,(.32,.42,.56));box(x,1.48,z,3.5,.06,3.5,2,(.04,.75,1) if i%3 else (1,.15,.55))
  for z in [-10.5,10.5]:box(0,1,z,20,.08,.12,2,(.1,.9,1))
 data=bytearray();views=[];acc=[]
 def put(b,target=None):
  while len(data)%4:data.append(0)
  v={'buffer':0,'byteOffset':len(data),'byteLength':len(b)}
  if target:v['target']=target
  views.append(v);data.extend(b);return len(views)-1
 def attr(a,typ):
  a=np.asarray(a,np.float32);v=put(a.tobytes(),34962);o={'bufferView':v,'componentType':5126,'count':len(a),'type':typ}
  if typ=='VEC3':o.update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
  acc.append(o);return len(acc)-1
 prim=[]
 for m,g in enumerate(groups):
  if not g:continue
  ps=np.concatenate([q[0] for q in g]);ns=np.concatenate([q[1] for q in g]);uv=np.concatenate([q[2] for q in g]);cs=np.concatenate([q[3] for q in g])
  # All non-sign parts use tiny neutral atlas patch, keeping brand plane legible.
  indices=np.array([i*4+j for i in range(len(g)) for j in [0,1,2,0,2,3]],np.uint16)
  v=put(indices.tobytes(),34963);acc.append({'bufferView':v,'componentType':5123,'count':len(indices),'type':'SCALAR'});idx=len(acc)-1
  prim.append({'attributes':{'POSITION':attr(ps,'VEC3'),'NORMAL':attr(ns,'VEC3'),'TEXCOORD_0':attr(uv,'VEC2'),'COLOR_0':attr(cs,'VEC3')},'indices':idx,'material':m})
 n=1024 if level==0 else 512 if level==1 else 256
 image=put(atlas(n));materials=[]
 names=['Body','Glass','Neon','EventDisplay'] if level==0 else ['Body','EventDisplay'] if level==1 else ['Body']
 for name in names:
  pbr={'baseColorFactor':[.8,.86,1,1],'metallicFactor':.4,'roughnessFactor':.32,'baseColorTexture':{'index':0}}
  mat={'name':name,'pbrMetallicRoughness':pbr,'doubleSided':True}
  if name=='Glass':pbr.update(baseColorFactor=[.5,.65,.8,.34],roughnessFactor=.12,metallicFactor=.15);mat['alphaMode']='BLEND'
  if name=='Neon':mat['emissiveFactor']=[.1,1,1];pbr.pop('baseColorTexture')
  if name=='EventDisplay':pbr.pop('baseColorTexture');mat['emissiveFactor']=[.04,.2,.3]
  materials.append(mat)
 doc={'asset':{'version':'2.0','generator':'ATG original procedural builder'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'ATG_Event_Horizon','mesh':0}],'meshes':[{'primitives':prim}],'materials':materials,'textures':[{'source':0}],'images':[{'bufferView':image,'mimeType':'image/png'}],'buffers':[{'byteLength':len(data)}],'bufferViews':views,'accessors':acc}
 j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);data+=b'\0'*((-len(data))%4)
 b=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(data))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(data),0x004e4942)+data
 (ROOT/'exterior'/f'lod{level}.glb').write_bytes(b)
 positions=np.concatenate([q[0] for g in groups for q in g]);tris=sum(len(g)*2 for g in groups)
 bounds=[positions.min(axis=0).tolist(),positions.max(axis=0).tolist()]
 assert positions[:,0].min()>=-12.5 and positions[:,0].max()<=12.5 and positions[:,2].min()>=-12.5 and positions[:,2].max()<=12.5 and positions[:,1].min()>=0 and positions[:,1].max()<=57
 budget=lot['budgets'][f'lod{level}'];assert tris<=budget['triangles'] and len(prim)<=budget['drawCalls'] and len(b)<=budget['fileBytes']
 return {'triangles':tris,'drawCalls':len(prim),'materials':len(materials),'textureSize':n,'bytes':len(b),'bounds':bounds,'budget':budget}
report={f'lod{i}':glb(i) for i in range(3)}
(ROOT/'reports'/'local-model-validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))

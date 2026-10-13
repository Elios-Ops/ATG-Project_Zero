"""Original procedural architecture. No third-party models or textures."""
import json,struct,pathlib,io,math
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=pathlib.Path(__file__).parent
lots=json.loads((ROOT/'verified-lots.json').read_text())['lots'];lot=next(x for x in lots if x['id']==106)
assert (lot['width'],lot['depth'],lot['height'])==(25,25,57)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def atlas(n):
 im=Image.new('RGB',(n,n),(6,13,25));d=ImageDraw.Draw(im)
 for y in range(0,n,n//16):d.line((0,y,n,y),fill=(17,43,62),width=max(1,n//400))
 def text(y,t,size,c):
  f=ImageFont.truetype(font,size);box=d.textbbox((0,0),t,font=f);d.text(((n-box[2])/2,y),t,font=f,fill=c)
 text(int(n*.10),'ATG',int(n*.25),(255,183,62));text(int(n*.44),'ALL THINGS',int(n*.09),(220,237,255));text(int(n*.56),'GAMED',int(n*.12),(93,218,255));text(int(n*.79),'ZELTAR / ZELPOD LAB',int(n*.042),(203,219,241))
 d.rectangle((0,0,max(8,n//32),max(8,n//32)),fill=(255,255,255))
 b=io.BytesIO();im.save(b,format='PNG');return b.getvalue()
def glb(level):
 groups=[[] for _ in range(4 if level==0 else 2 if level==1 else 1)]
 def box(x,y,z,w,h,d,mat=0,color=(.08,.13,.22)):
  mat=mat if level==0 else (1 if mat==3 else 0) if level==1 else 0
  p=np.array([[x-w/2,y-h/2,z-d/2],[x+w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z-d/2],[x-w/2,y+h/2,z-d/2],[x-w/2,y-h/2,z+d/2],[x+w/2,y-h/2,z+d/2],[x+w/2,y+h/2,z+d/2],[x-w/2,y+h/2,z+d/2]],np.float32)
  faces=[([0,3,2,1],(0,0,-1)),([4,5,6,7],(0,0,1)),([0,4,7,3],(-1,0,0)),([1,2,6,5],(1,0,0)),([3,7,6,2],(0,1,0)),([0,1,5,4],(0,-1,0))]
  for ids,n in faces:groups[mat].append((p[ids],np.tile(n,(4,1)),np.full((4,2),.01,np.float32),np.tile(color,(4,1))))
 # A narrower hollow glass shaft and stepped racing crown, distinct from tower 82.
 box(0,.35,0,24,.5,24)
 shaft_top=43.08 if level==1 else 55.8
 for x in [-10.7,10.7]:box(x,(1+shaft_top)/2,0,.20,shaft_top-1,21.4,1,(.13,.23,.34))
 box(0,(1+shaft_top)/2,-10.7,21.4,shaft_top-1,.2,1,(.13,.23,.34))
 for x in [-7,7]:box(x,3,10.7,7.6,5,.2,1,(.13,.23,.34))
 front_top=43.08 if level==1 else 56.0
 box(0,(7+front_top)/2,10.7,21.4,front_top-7,.2,1,(.13,.23,.34))
 for x in [-10.85,10.85]:
  for z in [-10.85,10.85]:
   box(x,28,z,.32,54.8,.32,0,(.22,.3,.4))
   box(x,28,z+.2,.07,54.8,.10,2,(1,.56,.05))
 # Split aerodynamic roof, twin engine cowls, and a lower boulevard canopy.
 box(0,55.8,0,22.1,.28,22.1)
 for x in [-6.3,6.3]:
  box(x,56.3,0,4,.9,17,0,(.14,.23,.36))
  box(x,56.8,0,4,.06,17,2,(.15,.85,1))
 for y in ([6,14,25,36,43,55.4] if level==0 else [6,25,43,55.4] if level==1 else [6,43,55.4]):
  for z in [-10.86,10.86]:box(0,y,z,21.7,.1,.1,2,(1,.55,.02))
  for x in [-10.86,10.86]:box(x,y,0,.1,.1,21.7,2,(.09,.88,1))
 if level<2:
  for x in ([-7,-3.5,0,3.5,7] if level==0 else [-5,5]):
   for z in [-10.82,10.82]:box(x,31,z,.06,49,.06,0,(.35,.45,.57))
 # Display is inside the glazing by 8.5cm, and uses position, not stripped UVs.
 for z in [-10.5,10.5]:box(0,49.3,z,21,.012+12.4,.03,3,(.04,.1,.18))
 for x in [-10.5,10.5]:box(x,49.3,0,.03,12.4,21,3,(.04,.1,.18))
 # Track-inspired entrance: twin engine nacelles, pit-lane stripes and a luminous gantry.
 box(0,.65,10,9,.4,4.1,0,(.24,.35,.46))
 for x in [-3.9,3.9]:
  box(x,3.1,11.15,.7,5.1,1.5,0,(.12,.2,.28))
  box(x,3.1,11.93,.36,4.5,.06,2,(1,.56,.05))
 box(0,5.8,11.0,8.5,.3,2.6,2,(.15,.86,1))
 box(0,8.7,10.97,10.5,4.4,.12,0)
 p=np.array([[-5.25,6.5,11.06],[5.25,6.5,11.06],[5.25,10.9,11.06],[-5.25,10.9,11.06]],np.float32)
 groups[0].append((p,np.tile((0,0,1),(4,1)),np.array([[0,1],[1,1],[1,0],[0,0]],np.float32),np.ones((4,3))))
 if level==0:
  for i in range(12):
   x=-4.1+i*.72
   box(x,.9,10.2,.35,.02,3.3,2,(1,.58,.06) if i%2==0 else (.12,.75,.9))
  # Racing ribbon climbs through the lower facade, without consuming the interior.
  for i in range(32):
   a=i*math.pi/8;radius=11.4
   box(radius*math.cos(a),12+i*.65,radius*math.sin(a),.7,.12,.7,2,(.15,.85,1))
  # Three pods on show in the ground-floor Design Lab.
  for x in [-6,0,6]:
   box(x,1.1,1,3,.3,4,0,(.2,.3,.4))
   for side in [-.7,.7]:
    box(x+side,1.8,1,.45,.5,2.4,0,(.3,.45,.55))
    box(x+side,1.8,-.25,.3,.3,.08,2,(1,.45,.04))
   box(x,1.65,1.5,.8,.65,1,1,(.2,.5,.7))
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
  if name=='Glass':pbr.update(baseColorFactor=[.5,.65,.8,.62],roughnessFactor=.12,metallicFactor=.15);mat['alphaMode']='BLEND'
  if name=='Neon':mat['emissiveFactor']=[.1,1,1];pbr.pop('baseColorTexture')
  if name=='EventDisplay':pbr.pop('baseColorTexture');mat['emissiveFactor']=[.04,.2,.3]
  materials.append(mat)
 doc={'asset':{'version':'2.0','generator':'ATG original procedural builder'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'ATG_ZEL_Tower_106','mesh':0}],'meshes':[{'primitives':prim}],'materials':materials,'textures':[{'source':0}],'images':[{'bufferView':image,'mimeType':'image/png'}],'buffers':[{'byteLength':len(data)}],'bufferViews':views,'accessors':acc}
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

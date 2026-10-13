import json, pathlib,struct,io,numpy as np
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parent
budgets={x['id']:x['budgets'] for x in json.loads((ROOT/'property-budgets.json').read_text())}
results={}
for name,lot in [('RAMPAGE',82),('ZELTAR',106)]:
 results[name]={}
 for lod in range(3):
  p=ROOT/name/('lod'+str(lod)+'.glb')
  if not p.exists():continue
  b=p.read_bytes();n,t=struct.unpack_from('<II',b,12);d=json.loads(b[20:20+n]);binary=b[28+n:]; budget=budgets[lot]['lod'+str(lod)]
  ps=[x for m in d.get('meshes',[]) for x in m['primitives']];tri=sum(d['accessors'][x.get('indices',x['attributes']['POSITION'])]['count']//3 for x in ps)
  textures=[]
  for im in d.get('images',[]):
   view=d['bufferViews'][im['bufferView']];off=view.get('byteOffset',0);image=Image.open(io.BytesIO(binary[off:off+view['byteLength']]));textures.append(list(image.size))
  positions=[d['accessors'][x['attributes']['POSITION']] for x in ps];mn=[min(a['min'][i] for a in positions) for i in range(3)];mx=[max(a['max'][i] for a in positions) for i in range(3)]
  errors=[]
  for metric,value in [('triangles',tri),('materials',len(d.get('materials',[]))),('drawCalls',len(ps)),('textures',len(textures)),('fileBytes',len(b))]:
   if value>budget[metric]:errors.append(metric+' exceeds budget')
  if any(max(s)>budget['maxTextureSize'] for s in textures):errors.append('texture dimensions exceed budget')
  texels=sum(w*h*4/3 for w,h in textures)
  if texels>budget['texels']:errors.append('mip-inclusive texels exceed budget')
  if mn[0]<-12.5001 or mx[0]>12.5001 or mn[2]<-12.5001 or mx[2]>12.5001 or mn[1]<-.0001 or mx[1]>57.0001:errors.append('property boundary violation')
  if lod==2 and (len(ps)!=1 or len(d.get('materials',[]))!=1):errors.append('LOD2 must have exactly one draw/material')
  results[name][str(lod)]={'triangles':tri,'fileBytes':len(b),'materials':len(d.get('materials',[])),'drawCalls':len(ps),'textureDimensions':textures,'texelsIncludingMips':texels,'bounds':{'min':mn,'max':mx},'extensions':d.get('extensionsUsed',[]),'errors':errors,'ok':not errors}
(ROOT/'local-validation.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))

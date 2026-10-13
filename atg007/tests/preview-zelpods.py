import sys,pathlib,json,numpy as np
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import render
from PIL import Image,ImageDraw,ImageFont
ROOT=pathlib.Path(__file__).resolve().parents[1]
font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
views=[('three-quarter',(2.65,1.95,3.1)),('front',(0,1.2,3.6)),('side',(3.8,1.2,.2)),('rear',(-2.4,1.5,-3.4)),('above',(.01,4,.1))]
for name in ['COMET','VIPER','TITAN']:
 data=json.loads((ROOT/'reports'/('model-'+name+'-scene.json')).read_text());objects=[]
 for o in data['meshes']:
  n=len(o['positions'])//3
  objects.append({'positions':np.array(o['positions']).reshape(-1,3),'normals':np.array(o['normals']).reshape(-1,3),'uv':np.zeros((n,2)),
   'colors':np.array(o['colors']).reshape(-1,3)*o['color'],'indices':o['indices']})
 for tag,eye in views:
  im=render.draw(objects,render.look(eye,(0,.4,0)),render.perspective(38,1.5,.05,30),1200,800,(.012,.025,.052))
  d=ImageDraw.Draw(im);d.text((40,30),'ALL THINGS GAMED  /  ZELTAR',font=ImageFont.truetype(font,21),fill=(84,222,242));d.text((40,62),name+'  /  '+tag.upper(),font=ImageFont.truetype(font,35),fill=(228,239,255))
  im.save(ROOT/'reports'/('ZelPod-'+name+'-'+tag+'.png'))
 # Inspect silhouette at the official guide's 64px size.
 black=[dict(o,colors=np.zeros_like(o['colors'])) for o in objects]
 render.draw(black,render.look((2.4,2.4,3.6),(0,.4,0)),render.perspective(38,1,.05,30),64,64,(.8,.8,.8)).save(ROOT/'reports'/('silhouette-'+name+'.png'))
 # Wireframe inspection of original mesh exports.
 render.ctx.wireframe=True
 render.draw(objects,render.look(views[0][1],(0,.4,0)),render.perspective(38,1.5,.05,30),1200,800,(.012,.025,.052)).save(ROOT/'reports'/('wireframe-'+name+'.png'))
 render.ctx.wireframe=False
# Three comparative full-scale views from exact runtime/model surfaces.
sheet=Image.new('RGB',(1800,700),(3,8,18));d=ImageDraw.Draw(sheet)
d.text((35,22),'ZELTAR  /  ORIGINAL ZELPOD FLEET',font=ImageFont.truetype(font,35),fill=(231,243,255))
for i,name in enumerate(['COMET','VIPER','TITAN']):
 im=Image.open(ROOT/'reports'/('ZelPod-'+name+'-three-quarter.png')).convert('RGB');im=im.crop((0,110,1200,800)).resize((600,345));sheet.paste(im,(i*600,120))
 d.text((i*600+30,90),name,font=ImageFont.truetype(font,30),fill=[(59,224,242),(186,157,255),(255,184,64)][i])
 d.text((i*600+30,495),['STREAMLINED • TWIN ENGINE','ANGULAR • COMPACT THRUSTERS','ARMORED • REINFORCED COCKPIT'][i],font=ImageFont.truetype(font,18),fill=(209,222,240))
 stats=json.loads((ROOT/'reports/zelpod-model-stats.json').read_text())[i]
 d.text((i*600+30,545),f"{stats['triangles']:,} triangles  /  {stats['bytes']/1024:.0f} KiB",font=ImageFont.truetype(font,19),fill=(126,156,186))
d.text((35,638),'Free paint, lighting and stabilizers  /  Original ATG geometry  /  Local review only',font=ImageFont.truetype(font,22),fill=(107,206,217))
sheet.save(ROOT/'reports/ZELTAR_ZelPod_Fleet_Preview.png')

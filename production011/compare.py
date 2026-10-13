from PIL import Image,ImageDraw,ImageFont
import pathlib,json
ROOT=pathlib.Path(__file__).resolve().parent
metrics=json.loads((ROOT/'metrics.json').read_text())
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
for name in ('RAMPAGE','ZELTAR'):
 out=Image.new('RGB',(1280,950),(16,20,29));d=ImageDraw.Draw(out)
 for row,angle in enumerate(('street','elevated')):
  for col,label in enumerate(('original','lod0','lod1','lod2')):
   im=Image.open(ROOT/name/(label+'-'+angle+'.png')).convert('RGB');im.thumbnail((320,400));x=col*320;y=row*460
   out.paste(im,(x,y+56));count=metrics[name]['sourceTriangles'] if label=='original' else metrics[name]['levels'][label[-1]]['triangles']
   d.text((x+8,y+5),label.upper()+' | '+format(count,','),font=font,fill=(230,237,245));d.text((x+8,y+29),angle+' — same camera',font=font,fill=(135,178,220))
 d.text((12,923),name+' — LOCAL CANDIDATES. Event Horizon integration blocked. Not approved for deployment.',font=font,fill=(255,177,100))
 out.save(ROOT/(name+'-LOD-comparison.png'))

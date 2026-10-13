from pathlib import Path
import json,hashlib,zipfile
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
# Interface sheet from the actual runtime HUD and model surfaces, not AI mockups.
im=Image.new('RGB',(1500,1240),(3,8,18));d=ImageDraw.Draw(im)
def text(x,y,t,size=25,color=(224,239,255)):d.text((x,y),t,font=ImageFont.truetype(font,size),fill=color)
text(30,22,'ZELTAR  /  ZELPOD DESIGN LAB & RACING',33)
for file,box,label in [('desktop-custom.png',(30,115,990,655),'ZELPOD DESIGN LAB  /  FREE CUSTOMIZATION'),('desktop-race.png',(30,730,490,989),'THREE LAPS  /  36 CHECKPOINTS'),('desktop-finish.png',(520,730,980,989),'TIMED RESULTS  /  POINTS & REPLAY'),('phone-lab.png',(1040,115,1430,959),'MOBILE DESIGN LAB')]:
 image=Image.open(ROOT/'reports'/file).convert('RGB');image=image.resize((box[2]-box[0],box[3]-box[1]),Image.Resampling.LANCZOS);im.paste(image,box[:2]);text(box[0],box[1]-35,label,19,(71,217,237))
text(30,1045,'COMET • VIPER • TITAN',31,(252,185,73))
text(30,1100,'Free paint, lighting and fins. Higher points reward lower adjusted race time.',22)
text(30,1150,'Actual-source local previews. No publication or live settings changes.',20,(133,166,196))
im.save(ROOT/'reports/ZELTAR_Interface_Preview.png')
# The model-only package retains original-source construction and exact exports.
with zipfile.ZipFile(ROOT.parent/'ZELTAR_Three_ZelPods_Models.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted((ROOT/'models').glob('*.glb')):z.write(p,'models/'+p.name)
 z.write(ROOT/'experience/zelpods.js','source/zelpods.js')
 z.write(ROOT/'reports/zelpod-model-stats.json','model-stats.json')
 for name in ['COMET','VIPER','TITAN']:z.write(ROOT/'reports'/('ZelPod-'+name+'-three-quarter.png'),'previews/'+name+'.png')
# Lock the exact proposed release, not reports or the preserved baseline.
files=[]
for folder in ['experience','exterior','models']:
 files.extend(p for p in (ROOT/folder).rglob('*') if p.is_file())
files.extend([ROOT/'experience.zip',ROOT/'proposed-game-settings.json'])
hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}
(ROOT/'release-hashes.json').write_text(json.dumps(hashes,indent=2))
print('Release hashes',len(hashes))

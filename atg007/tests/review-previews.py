import sys,pathlib,json,numpy as np
from PIL import Image,ImageDraw,ImageFont
sys.path.insert(0,str(pathlib.Path(__file__).parent));import render
ROOT=pathlib.Path(__file__).resolve().parents[1]
F='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def text(d,xy,t,n=22,c=(224,239,255)):d.text(xy,t,font=ImageFont.truetype(F,n),fill=c)
# Multiview review, clearly identified as a candidate rather than a final release.
sheet=Image.new('RGB',(1800,1450),(3,8,18));d=ImageDraw.Draw(sheet)
text(d,(30,20),'VIPER  /  HANDLING CLASS  /  DIRECTIVE 007 VISUAL CANDIDATE',30)
for i,(view,label) in enumerate([('three-quarter','THREE-QUARTER'),('front','FRONT / RECESSED INTAKES'),('side','SIDE / SPEAR & COMPACT ENGINES'),('rear','REAR / FOUR SWEPT FINS'),('above','ABOVE / MECHANICAL CONNECTIONS')]):
 x=(i%2)*900;y=90+(i//2)*420
 image=Image.open(ROOT/'reports'/('ZelPod-VIPER-'+view+'.png')).convert('RGB').crop((0,110,1200,800)).resize((900,390));sheet.paste(image,(x,y));text(d,(x+25,y+6),label,21,(145,241,45))
text(d,(935,1010),'2,868 triangles / 5 draw calls / 4 materials',23)
text(d,(935,1070),'332,992 byte plain GLB / no textures',21)
text(d,(935,1130),'Original handling, scoring and replay preserved',20)
text(d,(935,1190),'White armor + black chassis + electric green',20)
text(d,(30,1390),'Local 3D renders of the actual candidate geometry. Awaiting owner visual approval.',22,(126,167,191))
sheet.save(ROOT/'reports/VIPER_007_Multiview.png')
comparison=Image.new('RGB',(1800,850),(3,8,18));d=ImageDraw.Draw(comparison);text(d,(35,25),'VIPER  /  CURRENT GLB vs PROPOSED VISUAL CANDIDATE',31)
for i,(file,title) in enumerate([(pathlib.Path('zeltar106/reports/ZelPod-VIPER-three-quarter.png'),'CURRENT — DIRECTIVE 006'),(ROOT/'reports/ZelPod-VIPER-three-quarter.png','PROPOSED — DIRECTIVE 007')]):
 image=Image.open(file).convert('RGB').crop((0,110,1200,800)).resize((900,517));comparison.paste(image,(i*900,120));text(d,(i*900+30,90),title,24,(145,241,45))
text(d,(30,660),'976 triangles / simple housings / short nose',23)
text(d,(930,660),'2,868 triangles / layered housings / longer spear',23)
text(d,(30,715),'Single-color panels, blue canopy, two fins',22,(164,186,208))
text(d,(930,715),'Black-white livery, green rims, four swept fins',22,(164,186,208))
text(d,(30,792),'COMET and TITAN are unchanged. The candidate is not a finalized game asset.',22,(123,170,193))
comparison.save(ROOT/'reports/VIPER_007_Current_vs_Proposed.png')
# LOD images from the new geometry; LOD2 is intentionally static per Project 0.
for level in [0,1,2]:
 meshes=render.load_glb(level)
 render.draw(meshes,render.look((70,42,85),(0,28,0)),render.perspective(42,1,1,250),900,900,(.82,.86,.91),2).save(ROOT/'reports'/('Event_Horizon_007_LOD'+str(level)+'.png'))
height=Image.new('RGB',(1800,1100),(3,8,18));d=ImageDraw.Draw(height);text(d,(35,22),'EVENT HORIZON  /  LOT #106  /  FULL UPPER 22m',32)
for i,(path,label) in enumerate([(pathlib.Path('zeltar106/reports/tower-three-quarter.png'),'CURRENT  /  Y43.094–55.506m'),(ROOT/'reports/Event_Horizon_007_LOD0.png','PROPOSED  /  Y35–57m')]):
 image=Image.open(path).convert('RGB');height.paste(image,(i*900,95));text(d,(i*900+30,65),label,23,(135,238,49))
text(d,(35,1020),'LOD0 and LOD1: exact 22m display. Every 1m shader band shows animation. LOD2 remains static.',22)
text(d,(35,1060),'3cm display / 8.5cm behind LOD0 glazing / shared p0Time / all geometry inside Lot #106',21,(142,170,190))
height.save(ROOT/'reports/Event_Horizon_007_Height_Comparison.png')

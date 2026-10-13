"""Assemble RAMPAGE's Project 0 packages locally (nothing is uploaded).
  python rampage82/tools/build_package.py --fonts <dir with anton/ and oswald/> --lods <dir with lod0/1/2.glb> --out <dir>
Produces <out>/experience/ + experience.zip (the playable game) and <out>/exterior/ (LODs, lot.json, shaders, manifest).
Fonts: Anton and Oswald, SIL Open Font License 1.1 (github.com/google/fonts, ofl/anton and ofl/oswald), shipped as bitmap atlases with their OFL.txt.
Sounds: synthesised by make_sounds.py (no third-party audio)."""
import argparse, hashlib, json, os, shutil, subprocess, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
ap = argparse.ArgumentParser(); ap.add_argument('--fonts', required=True); ap.add_argument('--lods', required=True); ap.add_argument('--out', required=True)
a = ap.parse_args()
exp_src, exp_out, ext_out = os.path.join(ROOT, 'experience'), os.path.join(a.out, 'experience'), os.path.join(a.out, 'exterior')
for d in (exp_out, ext_out): shutil.rmtree(d, ignore_errors=True)
os.makedirs(os.path.join(exp_out, 'assets')); os.makedirs(ext_out)
for f in sorted(os.listdir(exp_src)):
    if f.endswith('.js') or f == 'experience.json': shutil.copy(os.path.join(exp_src, f), exp_out)
assets = os.path.join(exp_out, 'assets')
# fonts ship as pre-rendered bitmap atlases (packages accept no .ttf) together with their OFL licences
shutil.copy(os.path.join(a.fonts, 'anton', 'OFL.txt'), os.path.join(assets, 'OFL-Anton.txt'))
shutil.copy(os.path.join(a.fonts, 'oswald', 'OFL.txt'), os.path.join(assets, 'OFL-Oswald.txt'))
subprocess.run([sys.executable, os.path.join(HERE, 'make_font_atlas.py'), a.fonts, assets], check=True)
subprocess.run([sys.executable, os.path.join(HERE, 'make_sounds.py'), assets], check=True)
zpath = os.path.join(a.out, 'experience.zip')
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for base, _, files in os.walk(exp_out):
        for f in sorted(files): z.write(os.path.join(base, f), os.path.relpath(os.path.join(base, f), exp_out))
for f in ('lot.json', 'manifest.json', 'neon.glsl', 'glass.glsl', 'event-horizon.glsl'): shutil.copy(os.path.join(ROOT, 'exterior', f), ext_out)
for f in ('lod0.glb', 'lod1.glb', 'lod2.glb'): shutil.copy(os.path.join(a.lods, f), ext_out)
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
hashes = {os.path.relpath(os.path.join(b, f), a.out): sha(os.path.join(b, f)) for d in (exp_out, ext_out) for b, _, fs in os.walk(d) for f in sorted(fs)}
hashes['experience.zip'] = sha(zpath)
json.dump(hashes, open(os.path.join(a.out, 'release-hashes.json'), 'w'), indent=1)
print(json.dumps({'experience.zip': os.path.getsize(zpath), 'files': len(hashes)}))

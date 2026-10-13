"""RAMPAGE: SAVE LILLY — build the Project 0 experience package (nothing is uploaded).
  python savelilly82/tools/build_package.py --fonts <dir with anton/ and oswald/> --out <dir>
Regenerates the original assets (logo, sound effects, soundtrack, bitmap font atlases), copies the game modules
(never the test-only entries), and writes <out>/experience/ + <out>/experience.zip + <out>/package-hashes.json."""
import argparse, hashlib, json, os, shutil, subprocess, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); REPO = os.path.dirname(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--fonts', required=True); ap.add_argument('--out', required=True); ap.add_argument('--skip-assets', action='store_true')
a = ap.parse_args()
src, assets = os.path.join(ROOT, 'experience'), os.path.join(ROOT, 'experience', 'assets')
if not a.skip_assets:
    os.makedirs(assets, exist_ok=True)
    run = lambda *c: subprocess.run([sys.executable, *c], check=True)
    run(os.path.join(HERE, 'make_logo.py'), a.fonts, os.path.join(assets, 'logo.png'))
    run(os.path.join(HERE, 'make_sfx.py'), os.path.join(assets, 'sfx'))
    run(os.path.join(HERE, 'make_music.py'), os.path.join(assets, 'music'))
    run(os.path.join(REPO, 'rampage82', 'tools', 'make_font_atlas.py'), a.fonts, assets)
    shutil.copy(os.path.join(a.fonts, 'anton', 'OFL.txt'), os.path.join(assets, 'OFL-Anton.txt'))
    shutil.copy(os.path.join(a.fonts, 'oswald', 'OFL.txt'), os.path.join(assets, 'OFL-Oswald.txt'))
out = os.path.join(a.out, 'experience'); shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
for f in sorted(os.listdir(src)):
    if f.endswith('.js') and not f.startswith(('_', 'main-test')) or f == 'experience.json': shutil.copy(os.path.join(src, f), out)
shutil.copytree(assets, os.path.join(out, 'assets'))
zpath = os.path.join(a.out, 'experience.zip')
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for base, _, files in os.walk(out):
        for f in sorted(files): z.write(os.path.join(base, f), os.path.relpath(os.path.join(base, f), out))
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
hashes = {os.path.relpath(os.path.join(b, f), a.out): sha(os.path.join(b, f)) for b, _, fs in os.walk(out) for f in sorted(fs)}
hashes['experience.zip'] = sha(zpath)
json.dump(hashes, open(os.path.join(a.out, 'package-hashes.json'), 'w'), indent=1)
size = sum(os.path.getsize(os.path.join(b, f)) for b, _, fs in os.walk(out) for f in fs)
js = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out) if f.endswith('.js'))
print(json.dumps({'files': len(hashes) - 1, 'bytes': size, 'js_bytes': js, 'zip_bytes': os.path.getsize(zpath)}))

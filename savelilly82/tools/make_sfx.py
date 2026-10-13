"""RAMPAGE: SAVE LILLY — synthesise every sound effect (original: no samples, no third-party audio), as mono MP3s.
python savelilly82/tools/make_sfx.py <out_dir>      (needs numpy and the `lame` encoder)"""
import os, sys, subprocess, tempfile, wave
import numpy as np

SR = 32000
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(1982)

def t(d): return np.arange(int(SR * d)) / SR
def env(n, a=0.004, d=None, r=0.08, s=1.0):
    e = np.ones(n) * s; ia = max(1, min(n, int(SR * a))); e[:ia] = np.linspace(0, 1, ia) * (1 if s == 1 else 1)
    if d: idd = min(n - ia, int(SR * d)); e[ia:ia + idd] = np.linspace(1, s, idd)
    ir = max(1, min(n, int(SR * r))); e[-ir:] *= np.linspace(1, 0, ir) ** 1.5
    return e
def osc(freq, d, kind='sine', duty=0.5):
    n = int(SR * d); f = np.broadcast_to(np.asarray(freq, float), (n,)) if np.ndim(freq) == 0 else np.asarray(freq, float)[:n]
    ph = np.cumsum(f) / SR % 1.0
    if kind == 'sine': return np.sin(2 * np.pi * ph)
    if kind == 'square': return np.where(ph < duty, 1.0, -1.0) * 0.6
    if kind == 'saw': return (2 * ph - 1) * 0.7
    if kind == 'tri': return (2 * np.abs(2 * ph - 1) - 1)
def glide(f0, f1, d, curve=1.0): x = np.linspace(0, 1, int(SR * d)) ** curve; return f0 + (f1 - f0) * x
def noise(d): return rng.standard_normal(int(SR * d))
def lp(x, a):                                            # one-pole low-pass (a: 0..1, small = darker)
    y = np.zeros_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a * (v - acc); y[i] = acc
    return y
def hp(x, a): return x - lp(x, a)
def mix(*parts):
    n = max(int(SR * off) + len(p) for p, off in parts); y = np.zeros(n)
    for p, off in parts: o = int(SR * off); y[o:o + len(p)] += p
    return y
def note(n):                                             # 'A4' -> Hz
    names = {'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4, 'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'Bb': 1, 'B': 2}
    k = n[:-1]; o = int(n[-1]); return 440 * 2 ** ((names[k] + (o - 4) * 12) / 12)
def tune(seq, kind='square', dur=0.11, gap=0.0, duty=0.5, rel=0.06):
    out = []
    for n_ in seq:
        if isinstance(n_, tuple): n_, dd = n_
        else: dd = dur
        out.append(osc(note(n_), dd, kind, duty) * env(int(SR * dd), 0.003, r=rel) if n_ else np.zeros(int(SR * dd)))
        if gap: out.append(np.zeros(int(SR * gap)))
    return np.concatenate(out)
def reverb(x, wet=0.25):
    y = np.concatenate([x, np.zeros(int(SR * 0.4))])
    for dl, g in ((0.031, 0.5), (0.047, 0.42), (0.071, 0.35), (0.113, 0.25)):
        k = int(SR * dl); z = np.zeros_like(y); z[k:] = y[:-k] * g; y = y + z * wet
    return y
def save(name, y, gain=0.85):
    y = y / (np.abs(y).max() + 1e-9) * gain
    fd, wpath = tempfile.mkstemp(suffix='.wav'); os.close(fd)
    with wave.open(wpath, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes())
    subprocess.run(['lame', '--silent', '-m', 'm', '-b', '80', wpath, os.path.join(OUT, name + '.mp3')], check=True); os.remove(wpath)

# ---- the hero
save('jump', osc(glide(330, 880, 0.16, 0.7), 0.16, 'square', 0.25) * env(int(SR * .16), r=.06) * 0.7 + osc(glide(660, 1760, .16, .7), .16, 'sine') * env(int(SR * .16), r=.06) * 0.25, 0.5)
save('jumpBig', osc(glide(160, 620, 0.4, 0.6), 0.4, 'saw') * env(int(SR * .4), r=.2) * 0.5 + hp(noise(.4), .3) * env(int(SR * .4), .1, r=.25) * .3, 0.6)
save('land', lp(noise(.12), .12) * env(int(SR * .12), .001, r=.1) + osc(glide(140, 60, .12), .12) * env(int(SR * .12), r=.1) * .8, 0.5)
save('die', reverb(np.concatenate([osc(glide(880, 110, 0.7, 1.4), 0.7, 'square', .3) * env(int(SR * .7), r=.2) * .7, np.zeros(int(SR * .05)), tune(['E4', 'C4', 'A3'], 'square', .14)])), 0.6)
# ---- items
save('gear', reverb(tune([('E6', .05), ('B6', .16)], 'square', duty=.25, rel=.12), .2), 0.45)
save('keep', reverb(tune(['C6', 'E6', 'G6', 'C7'], 'tri', .07) + 0, .35), 0.55)
save('powerup', reverb(np.concatenate([tune(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 'square', .055, duty=.25), osc(note('C7'), .3, 'tri') * env(int(SR * .3), r=.25)]), .3), 0.6)
save('life', reverb(tune(['E5', 'G5', 'E6', 'C6', 'D6', 'G6'], 'square', .09, duty=.25), .25), 0.55)
save('score', tune([('A5', .04), ('E6', .07)], 'square', duty=.25), 0.35)
save('combo', tune([('A5', .04), ('E6', .04), ('A6', .1)], 'square', duty=.25), 0.4)
save('secret', reverb(tune(['G5', 'F#5', 'D#5', 'A4', 'G#4', 'E5', 'G#5', 'C6'], 'tri', .085), .4), 0.55)
save('checkpoint', reverb(mix((tune(['G5', 'D6'], 'square', .1, duty=.25), 0), (osc(note('G6'), .5, 'tri') * env(int(SR * .5), r=.4) * .5, .2)), .4), 0.5)
# ---- drums, smashing, the gauntlet
def clang(f, d=0.5, n=6):
    y = sum(osc(f * r, d) * env(int(SR * d), .001, r=d * .9) * (0.8 ** i) for i, r in enumerate([1, 2.76, 5.4, 8.93, 13.3, 19.6][:n]))
    return y
save('drumland', mix((clang(220, .35) * .6, 0), (lp(noise(.08), .3) * env(int(SR * .08), .001, r=.07), 0)), 0.45)
save('smash', reverb(mix((lp(noise(.5), .5) * env(int(SR * .5), .001, r=.45), 0), (clang(330, .6), 0), (osc(glide(120, 40, .3), .3) * env(int(SR * .3), r=.25) * 1.2, 0)), .3), 0.75)
save('throw', hp(noise(.35), .2) * np.sin(np.linspace(0, np.pi, int(SR * .35))) ** 2, 0.4)
# ---- the Warden
def roar(d=1.7, pitch=70):
    n = int(SR * d); x = np.linspace(0, 1, n)
    f = pitch * (1 + .25 * np.sin(2 * np.pi * 7 * x) * x) * (1 + .3 * np.sin(np.pi * x))
    body = osc(f, d, 'saw') + osc(f * 1.5, d, 'saw') * .5 + osc(f * 0.5, d, 'square') * .6
    grit = lp(noise(d), .25) * 1.6
    y = (body + grit) * env(n, .12, r=.6)
    y = lp(y, .35) + lp(hp(y, .05), .6) * .4
    return np.tanh(y * 1.8)
save('roar', reverb(roar(), .3), 0.85)
def thump(f=70, d=.22): return osc(glide(f, 35, d), d) * env(int(SR * d), .001, r=d * .8) * 1.4 + lp(noise(d), .08) * env(int(SR * d), .001, r=d * .6) * .6
save('pound', reverb(mix(*[(thump(), .0 + i * .18) for i in range(4)]), .2), 0.8)
save('slam', reverb(mix((osc(glide(90, 28, .9), .9) * env(int(SR * .9), .001, r=.8) * 2, 0), (lp(noise(1.0), .2) * env(int(SR * 1.0), .001, r=.9), 0), (clang(140, .7, 4) * .5, .02)), .35), 0.9)
save('crash', reverb(mix((osc(glide(70, 25, 1.6), 1.6) * env(int(SR * 1.6), .001, r=1.4) * 2, 0), (lp(noise(1.8), .35) * env(int(SR * 1.8), .001, r=1.6), 0), (clang(180, 1.2), .05), (clang(260, 1.0), .3)), .4), 0.95)
save('charge', osc(glide(120, 900, .95, 1.6), .95, 'saw') * env(int(SR * .95), .3, r=.08) * .6 + osc(glide(240, 1800, .95, 1.6), .95, 'square', .2) * env(int(SR * .95), .3, r=.08) * .3, 0.5)
save('beam', np.tanh((osc(260 + 30 * np.sin(np.linspace(0, 60, int(SR * .7))), .7, 'saw') + osc(1040, .7, 'square', .3) * .4 + hp(noise(.7), .5) * .3) * 2) * env(int(SR * .7), .01, r=.15), 0.6)
save('overload', reverb(mix((np.tanh(hp(noise(.9), .4) * 3) * env(int(SR * .9), .001, r=.7) * .6, 0), (osc(glide(60, 30, 1.0), 1.0) * env(int(SR * 1.0), .001, r=.9) * 1.5, .05), (osc(glide(1800, 200, .5), .5, 'saw') * env(int(SR * .5), r=.3) * .4, 0)), .35), 0.9)
# ---- machinery and hazards
save('steam', hp(noise(.8), .55) * env(int(SR * .8), .02, r=.4) * .7, 0.4)
save('crush', reverb(mix((thump(55, .3), 0), (clang(170, .45, 5) * .7, 0)), .2), 0.75)
save('clank', clang(520, .18, 4) * .7, 0.35)
save('laser', np.tanh(osc(220 * (1 + .1 * np.sin(np.linspace(0, 40, int(SR * .4)))), .4, 'saw') * 2) * env(int(SR * .4), .005, r=.12) + osc(1320, .4, 'sine') * env(int(SR * .4), r=.2) * .2, 0.4)
save('crumble', mix(*[(lp(noise(.08), .2 + .1 * rng.random()) * env(int(SR * .08), .001, r=.07) * (1 - i / 9), i * .045) for i in range(9)]), 0.55)
save('creak', osc(glide(140, 95, .5), .5, 'saw') * env(int(SR * .5), .05, r=.2) * .5 + osc(glide(282, 190, .5), .5, 'square', .1) * env(int(SR * .5), .05, r=.2) * .2, 0.35)
save('volt', np.tanh(hp(noise(.35), .6) * 4) * (np.sin(np.linspace(0, 90, int(SR * .35))) > 0) * env(int(SR * .35), .001, r=.15), 0.45)
save('alarm', np.concatenate([osc(520, .12, 'square') * env(int(SR * .12), r=.03), np.zeros(int(SR * .05)), osc(390, .12, 'square') * env(int(SR * .12), r=.03)]), 0.35)
save('jam', reverb(mix((osc(glide(300, 60, .8, .5), .8, 'saw') * env(int(SR * .8), .01, r=.3), 0), (lp(noise(.8), .4) * env(int(SR * .8), .01, r=.4) * .6, 0), (clang(240, .5), .6)), .3), 0.65)
# ---- Lilly's voice: a quick sung babble (no words: the text says them)
def babble(base=520, k=3):
    parts = []
    for i in range(k):
        f = base * (1 + .18 * rng.standard_normal()); d = .07 + .03 * rng.random()
        v = osc(glide(f, f * 1.12, d), d, 'tri') * env(int(SR * d), .005, r=.03) + osc(glide(f * 2, f * 2.2, d), d) * env(int(SR * d), .005, r=.03) * .3
        parts.append(v); parts.append(np.zeros(int(SR * .012)))
    return np.concatenate(parts)
save('lilly', reverb(babble(), .2), 0.42)
# ---- fanfares and menus
save('stage', reverb(mix((osc(note('D3'), 1.0, 'saw') * env(int(SR * 1), .02, r=.6), 0), (osc(note('A3'), 1.0, 'saw') * env(int(SR * 1), .02, r=.6), 0), (osc(note('D4'), 1.0, 'saw') * env(int(SR * 1), .02, r=.6) * .7, 0), (thump(60, .5), 0), (lp(noise(1), .1) * env(int(SR * 1), .3, r=.6) * .5, 0)), .45), 0.75)
save('clear', reverb(tune(['G4', 'C5', 'E5', 'G5', ('E5', .1), ('G5', .45)], 'square', .1, duty=.25, rel=.08), .35), 0.6)
save('gameover', reverb(tune([('C5', .25), ('G4', .25), ('E4', .25), ('A4', .18), ('B4', .18), ('A4', .18), ('G#4', .2), ('Bb4', .2), ('G#4', .2), ('G4', .6)], 'square', duty=.5, rel=.1), .4), 0.6)
save('rescue', reverb(mix((tune(['C5', 'E5', 'G5', ('C6', .3), ('A5', .12), ('C6', .12), ('D6', .7)], 'square', .12, duty=.25, rel=.1), 0), (tune([('C4', .36), ('G3', .36), ('A3', .24), ('F3', .24), ('G3', .7)], 'saw', rel=.15) * .5, 0)), .45), 0.7)
save('move', osc(880, .04, 'square', .25) * env(int(SR * .04), r=.02), 0.25)
save('select', tune([('A5', .05), ('E6', .1)], 'square', duty=.25), 0.4)
save('start', reverb(tune(['D5', 'A5', 'D6', ('F6', .25)], 'square', .07, duty=.25), .3), 0.55)
save('pause', tune([('E5', .06), ('A4', .09)], 'square', duty=.25), 0.35)
save('tick', osc(1320, .025, 'square', .25) * env(int(SR * .025), r=.01), 0.2)
print('sfx ->', OUT, len(os.listdir(OUT)), 'files')

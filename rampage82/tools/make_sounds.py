"""Synthesise RAMPAGE's original sound effects (mono 16-bit WAV, 22.05 kHz). No samples, no third-party audio.
python rampage82/tools/make_sounds.py <out_dir>"""
import sys, os, wave
import numpy as np

SR = 22050
OUT = sys.argv[1] if len(sys.argv) > 1 else 'rampage82/experience/assets'
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(82)

def t(d): return np.linspace(0, d, int(SR * d), endpoint=False)
def env(n, a=.005, r=.08):
    e = np.ones(n); ia, ir = min(n, int(SR * a)), min(n, int(SR * r))
    if ia: e[:ia] = np.linspace(0, 1, ia)
    if ir: e[-ir:] *= np.linspace(1, 0, ir)
    return e
def tone(f0, f1, d, wave_='sine', a=.005, r=.08):
    x = t(d); f = np.linspace(f0, f1, len(x)); ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) if wave_ == 'sine' else np.sign(np.sin(ph)) * .6 if wave_ == 'square' else (2 * (ph / (2 * np.pi) % 1) - 1) * .7
    return y * env(len(x), a, r)
def noise(d, lp=.2, a=.002, r=.1):
    y = rng.standard_normal(int(SR * d)); out = np.zeros_like(y); acc = 0.0
    for i, v in enumerate(y): acc += lp * (v - acc); out[i] = acc
    return out / (np.abs(out).max() + 1e-9) * env(len(y), a, r)
def mix(*parts):
    n = max(len(p) for p, _ in parts); y = np.zeros(n)
    for p, off in parts: o = int(SR * off); y[o:o + len(p)] += p[:max(0, n - o)]
    return y
def save(name, y, gain=.8):
    y = y / (np.abs(y).max() + 1e-9) * gain
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes())

save('jump', tone(260, 620, .16, 'square', r=.07) * .6 + tone(520, 1240, .16, 'sine', r=.07) * .4, .55)
save('land', noise(.12, .08, r=.1) * .8 + tone(120, 70, .12, 'sine', r=.1), .5)
save('checkpoint', mix((tone(660, 660, .14, 'square'), 0), (tone(990, 990, .22, 'square', r=.15), .11), (tone(1320, 1320, .3, 'sine', r=.25), .22)), .6)
save('hit', mix((noise(.25, .35, r=.2), 0), (tone(180, 60, .3, 'saw', r=.2), 0)), .7)
save('stage', mix((tone(110, 220, .7, 'saw', a=.05, r=.3), 0), (tone(165, 330, .7, 'saw', a=.05, r=.3), 0), (noise(.7, .03, a=.2, r=.4) * .4, 0)), .65)
save('warn', np.concatenate([tone(140, 140, .16, 'square', r=.05), np.zeros(int(SR * .08)), tone(140, 140, .16, 'square', r=.05)]), .55)
save('conquer', mix(*[(tone(f, f, .5 - .08 * i, 'square', r=.3) * .7 + tone(f * 2, f * 2, .5 - .08 * i, 'sine', r=.3) * .3, .12 * i)
                      for i, f in enumerate((392, 523, 659, 784))], (noise(1.0, .05, a=.3, r=.6) * .35, .2)), .7)
save('eliminated', mix((tone(400, 70, .9, 'saw', r=.5), 0), (noise(.9, .06, a=.05, r=.6) * .5, 0)), .65)
print('sounds ->', OUT, sorted(os.listdir(OUT)))

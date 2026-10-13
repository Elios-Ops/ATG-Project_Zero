"""RAMPAGE: SAVE LILLY — the soundtrack, composed and synthesised here (original; no samples). A small tracker:
lead (pulse with vibrato), bass, arpeggio, pad, and a drum kit with an industrial clank. Output: looping mono MP3s.
python savelilly82/tools/make_music.py <out_dir>"""
import os, sys, subprocess, tempfile, wave
import numpy as np

SR = 32000
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
NAMES = {'C': -9, 'C#': -8, 'Db': -8, 'D': -7, 'D#': -6, 'Eb': -6, 'E': -5, 'F': -4, 'F#': -3, 'Gb': -3, 'G': -2, 'G#': -1, 'Ab': -1, 'A': 0, 'A#': 1, 'Bb': 1, 'B': 2}
def hz(n): return 440 * 2 ** ((NAMES[n[:-1]] + (int(n[-1]) - 4) * 12) / 12)
CHORDS = {'m': (0, 3, 7), '': (0, 4, 7), '7': (0, 4, 7, 10), 'm7': (0, 3, 7, 10), 'sus': (0, 5, 7)}
def chord(name, octave=3):
    root = name[:2] if len(name) > 1 and name[1] in '#b' else name[0]; q = name[len(root):]
    f0 = hz(root + str(octave)); return [f0 * 2 ** (i / 12) for i in CHORDS[q]]

def lp(x, a):
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
def voice(f, d, kind, duty=0.5, vib=0.0, a=0.005, r=0.05, glide_from=None):
    n = max(1, int(SR * d)); tt = np.arange(n) / SR
    ff = np.full(n, f, float)
    if glide_from: k = np.minimum(1, tt / 0.04); ff = glide_from + (f - glide_from) * k
    if vib: ff *= 1 + vib * np.sin(2 * np.pi * 5.5 * tt) * np.minimum(1, tt / 0.15)
    ph = np.cumsum(ff) / SR % 1
    if kind == 'pulse': y = np.where(ph < duty, 1.0, -1.0)
    elif kind == 'saw': y = 2 * ph - 1
    elif kind == 'tri': y = 2 * np.abs(2 * ph - 1) - 1
    else: y = np.sin(2 * np.pi * ph)
    e = np.ones(n); ia = min(n, int(SR * a)); e[:ia] = np.linspace(0, 1, ia) if ia else 1
    ir = min(n, int(SR * r)); e[-ir:] *= np.linspace(1, 0, ir)
    return y * e
def drum(kind):
    if kind == 'k': d = .22; tt = np.arange(int(SR * d)) / SR; f = 45 + 110 * np.exp(-tt * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 14) * 1.3
    if kind == 's': d = .2; tt = np.arange(int(SR * d)) / SR; return (rng.standard_normal(len(tt)) * .7 + np.sin(2 * np.pi * 185 * tt) * .5) * np.exp(-tt * 18)
    if kind == 'h': d = .05; tt = np.arange(int(SR * d)) / SR; n = rng.standard_normal(len(tt)); return (n - lp(n, .5)) * np.exp(-tt * 70) * .45
    if kind == 'o': d = .18; tt = np.arange(int(SR * d)) / SR; n = rng.standard_normal(len(tt)); return (n - lp(n, .5)) * np.exp(-tt * 14) * .35
    if kind == 'c': d = .28; tt = np.arange(int(SR * d)) / SR; return sum(np.sin(2 * np.pi * 410 * r * tt) * .6 ** i for i, r in enumerate((1, 2.76, 5.4, 8.9))) * np.exp(-tt * 16) * .5   # anvil clank
    if kind == 'x': d = 1.2; tt = np.arange(int(SR * d)) / SR; n = rng.standard_normal(len(tt)); return (n - lp(n, .3)) * np.exp(-tt * 3) * .5    # crash
    return np.zeros(1)

def render(song):
    bpm, bars = song['bpm'], len(song['chords']); spb = 60 / bpm / 4                       # seconds per 16th
    total = bars * 16 * spb; n = int(SR * total) + SR * 2; out = {k: np.zeros(n) for k in ('lead', 'bass', 'arp', 'pad', 'drums')}
    def put(track, y, at): o = int(SR * at); out[track][o:o + len(y)] += y[:max(0, n - o)]
    # lead melody: list of bars, each a list of (note|None, sixteenths)
    prev = None
    for b, bar in enumerate(song['lead']):
        pos = 0
        for nt, d in bar:
            if nt: f = hz(nt); put('lead', voice(f, d * spb * 0.95, 'pulse', song.get('duty', .25), vib=.006 if d >= 4 else 0, r=.04, glide_from=prev if song.get('slide') and prev and d <= 2 else None), (b * 16 + pos) * spb); prev = f
            pos += d
    for b, ch in enumerate(song['chords']):
        tones = chord(ch, 2); root = tones[0]
        # bass
        for i, step in enumerate(song['bass']):
            if step is None: continue
            f = root * (2 if step == 'o' else 1) * (1.5 if step == '5' else 1)
            put('bass', voice(f, spb * 1.8, song.get('bassWave', 'saw'), r=.03), (b * 16 + i * (16 // len(song['bass']))) * spb)
        # arpeggio
        if song.get('arp'):
            up = [f * 4 for f in chord(ch, 3)]
            for i in range(16): put('arp', voice(up[i % len(up)] * (2 if (i // len(up)) % 2 else 1) / 2, spb * .9, 'pulse', .125, r=.02), (b * 16 + i) * spb)
        # pad
        if song.get('pad'):
            for f in chord(ch, 3): put('pad', (voice(f, 16 * spb, 'saw', a=.3, r=.4) + voice(f * 1.006, 16 * spb, 'saw', a=.3, r=.4)) * .5, b * 16 * spb)
        # drums
        pat = song['drums'][b % len(song['drums'])] if isinstance(song['drums'][0], list) else song['drums']
        for i, row in enumerate(pat):
            for kch in row: put('drums', drum(kch), (b * 16 + i) * spb)
    lead = lp(out['lead'], .5); bass = lp(out['bass'], .18); arp = lp(out['arp'], .4); pad = lp(out['pad'], .08)
    m = lead * .32 * song.get('leadGain', 1) + bass * .5 + arp * .1 + pad * .16 + out['drums'] * .42
    # small room so it is not dry
    y = m.copy()
    for dl, g in ((0.045, .3), (0.083, .22), (0.127, .15)):
        k = int(SR * dl); z = np.zeros_like(y); z[k:] = m[:-k] * g; y += z
    L = int(SR * total)
    if song.get('loop', True): y[:L // 64] += y[L:L + L // 64][:L // 64] * np.linspace(1, 0, L // 64)   # fold the tail into the start
    y = y[:L] if song.get('loop', True) else y[:L + SR]
    return np.tanh(y / (np.abs(y).max() + 1e-9) * 1.3) * .9
def save(name, y):
    fd, w = tempfile.mkstemp(suffix='.wav'); os.close(fd)
    with wave.open(w, 'wb') as f: f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((y * 32767).astype('<i2').tobytes())
    subprocess.run(['lame', '--silent', '-m', 'm', '-b', '96', w, os.path.join(OUT, name + '.mp3')], check=True); os.remove(w)
    print(name, f'{len(y) / SR:.1f}s')

K, S, H, O, C, X = 'k', 's', 'h', 'o', 'c', 'x'
ROCK = [[K, H], [H], [H], [H], [S, H], [H], [K, H], [H], [K, H], [H], [H], [K], [S, H], [H], [H], [O]]
ROCK_FILL = [[K, H], [H], [H], [H], [S, H], [H], [K, H], [H], [S], [S], [S], [S], [S, K], [S], [S, K], [S, X]]
MACH = [[K, H], [C], [H], [K], [S, H], [H], [C, H], [H], [K, H], [C], [H], [K], [S, H], [H], [C], [O]]
FAST = [[K, H], [H], [S, H], [H], [K, H], [H], [S, H], [K, H], [K, H], [H], [S, H], [H], [K, H], [H], [S, H], [O]]
HALF = [[K, X], [], [], [], [H], [], [], [], [S], [], [], [], [H], [], [K], []]

def bars(*b): return list(b)
SONGS = {
  'stage': {   # STAGE 1 — THE FOUNDRY (D minor, driving)
    'bpm': 150, 'duty': .25, 'chords': ['Dm', 'Bb', 'C', 'A', 'Dm', 'Bb', 'C', 'A', 'Gm', 'Dm', 'Bb', 'A', 'Dm', 'Bb', 'C', 'A'],
    'bass': ['r', 'r', 'o', 'r', 'r', 'r', 'o', 'r'], 'arp': True, 'drums': [ROCK, ROCK, ROCK, ROCK_FILL],
    'lead': bars(
      [('A4', 2), ('D5', 2), ('F5', 2), ('A5', 4), ('G5', 2), ('F5', 2), ('E5', 2)], [('F5', 4), ('D5', 4), ('Bb4', 4), ('D5', 4)],
      [('E5', 2), ('G5', 2), ('C6', 4), ('Bb5', 2), ('A5', 2), ('G5', 4)], [('A5', 6), ('E5', 2), ('C#5', 4), ('E5', 4)],
      [('A4', 2), ('D5', 2), ('F5', 2), ('A5', 4), ('G5', 2), ('F5', 2), ('A5', 2)], [('D6', 4), ('C6', 2), ('Bb5', 2), ('F5', 4), ('D5', 4)],
      [('E5', 2), ('F5', 2), ('G5', 2), ('C6', 2), ('E6', 4), ('D6', 2), ('C6', 2)], [('C#6', 8), ('A5', 4), (None, 4)],
      [('G5', 4), ('Bb5', 4), ('D6', 4), ('Bb5', 4)], [('A5', 4), ('F5', 4), ('D5', 8)],
      [('F5', 2), ('G5', 2), ('A5', 2), ('Bb5', 2), ('C6', 4), ('Bb5', 2), ('A5', 2)], [('A5', 4), ('G5', 2), ('F5', 2), ('E5', 4), ('C#5', 4)],
      [('D5', 4), ('F5', 4), ('A5', 4), ('D6', 4)], [('C6', 4), ('Bb5', 4), ('F5', 8)], [('G5', 4), ('A5', 4), ('Bb5', 4), ('C6', 4)], [('C#6', 4), ('E6', 4), ('A5', 8)]),
  },
  'machine': {   # STAGE 2 — THE MACHINE (E minor, mechanical)
    'bpm': 138, 'duty': .125, 'chords': ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'C', 'B', 'Am', 'Em', 'C', 'D', 'Am', 'Em', 'C', 'B'],
    'bass': ['r', 'r', 'r', 'o', 'r', 'r', 'r', 'o', 'r', 'r', 'r', 'o', 'r', '5', 'o', 'r'], 'bassWave': 'pulse', 'arp': True, 'drums': [MACH],
    'lead': bars(
      [('E5', 3), ('E5', 1), ('G5', 2), ('B5', 2), ('A5', 3), ('G5', 1), ('F#5', 4)], [('E5', 4), ('B4', 4), ('E5', 4), ('G5', 4)],
      [('C6', 3), ('B5', 1), ('A5', 2), ('G5', 2), ('E5', 8)], [('F#5', 4), ('A5', 4), ('D6', 4), ('C6', 4)],
      [('E5', 3), ('E5', 1), ('G5', 2), ('B5', 2), ('A5', 3), ('G5', 1), ('F#5', 4)], [('E5', 4), ('G5', 4), ('B5', 4), ('E6', 4)],
      [('D6', 2), ('C6', 2), ('B5', 2), ('A5', 2), ('G5', 4), ('E5', 4)], [('D#5', 8), ('F#5', 4), ('B5', 4)],
      [('A5', 4), ('C6', 4), ('E6', 6), ('D6', 2)], [('B5', 4), ('G5', 4), ('E5', 8)], [('E5', 2), ('G5', 2), ('C6', 4), ('B5', 4), ('A5', 4)], [('F#5', 8), ('A5', 8)],
      [('A5', 2), ('B5', 2), ('C6', 4), ('E6', 4), ('C6', 4)], [('B5', 8), ('G5', 8)], [('C6', 4), ('B5', 4), ('A5', 4), ('G5', 4)], [('F#5', 4), ('D#5', 4), ('B4', 8)]),
  },
  'ascent': {   # STAGE 3 — THE ASCENT (C minor, urgent)
    'bpm': 164, 'duty': .25, 'chords': ['Cm', 'Ab', 'Bb', 'G', 'Cm', 'Ab', 'Bb', 'G', 'Fm', 'Cm', 'Ab', 'G', 'Fm', 'Ab', 'Bb', 'G'],
    'bass': ['r', 'o', 'r', 'o', 'r', 'o', 'r', 'o'], 'arp': True, 'drums': [FAST, FAST, FAST, ROCK_FILL], 'slide': True,
    'lead': bars(
      [('G5', 2), ('C6', 2), ('Eb6', 2), ('G6', 2), ('F6', 2), ('Eb6', 2), ('D6', 2), ('C6', 2)], [('Eb6', 6), ('C6', 2), ('Ab5', 8)],
      [('Bb5', 2), ('D6', 2), ('F6', 2), ('Bb6', 2), ('Ab6', 2), ('G6', 2), ('F6', 4)], [('G6', 4), ('D6', 4), ('B5', 4), ('G5', 4)],
      [('G5', 2), ('C6', 2), ('Eb6', 2), ('G6', 2), ('F6', 2), ('Eb6', 2), ('D6', 2), ('C6', 2)], [('Ab6', 6), ('G6', 2), ('Eb6', 8)],
      [('F6', 2), ('Eb6', 2), ('D6', 2), ('Bb5', 2), ('C6', 2), ('D6', 2), ('Eb6', 4)], [('D6', 8), ('B5', 8)],
      [('Ab5', 4), ('C6', 4), ('F6', 4), ('Ab6', 4)], [('G6', 4), ('Eb6', 4), ('C6', 8)], [('Eb6', 4), ('C6', 4), ('Ab5', 4), ('C6', 4)], [('B5', 4), ('D6', 4), ('G6', 8)],
      [('F6', 4), ('Ab6', 4), ('C7', 8)], [('Bb6', 4), ('Ab6', 4), ('Eb6', 8)], [('F6', 4), ('G6', 4), ('Ab6', 4), ('Bb6', 4)], [('B6', 8), ('G6', 8)]),
  },
  'boss': {   # THE WARDEN (G minor, heavy)
    'bpm': 172, 'duty': .5, 'chords': ['Gm', 'Gm', 'Eb', 'F', 'Gm', 'Gm', 'Eb', 'D', 'Cm', 'Gm', 'Eb', 'D', 'Cm', 'Eb', 'F', 'D7'],
    'bass': ['r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'o', 'o'], 'pad': True, 'drums': [FAST, FAST, FAST, ROCK_FILL], 'leadGain': .9,
    'lead': bars(
      [('G4', 4), ('Bb4', 2), ('D5', 2), ('G5', 4), ('F#5', 4)], [('G5', 2), ('A5', 2), ('Bb5', 2), ('A5', 2), ('G5', 4), ('D5', 4)],
      [('Eb5', 4), ('G5', 4), ('Bb5', 4), ('G5', 4)], [('F5', 4), ('A5', 4), ('C6', 4), ('A5', 4)],
      [('G5', 4), ('Bb5', 2), ('D6', 2), ('G6', 4), ('F#6', 4)], [('G6', 2), ('F6', 2), ('D6', 2), ('Bb5', 2), ('G5', 8)],
      [('Eb6', 4), ('D6', 4), ('C6', 4), ('Bb5', 4)], [('A5', 4), ('F#5', 4), ('D5', 8)],
      [('C5', 4), ('Eb5', 4), ('G5', 4), ('C6', 4)], [('Bb5', 4), ('A5', 4), ('G5', 8)], [('G5', 4), ('Bb5', 4), ('Eb6', 4), ('D6', 4)], [('D6', 8), ('A5', 8)],
      [('C6', 4), ('Eb6', 4), ('G6', 8)], [('F6', 4), ('Eb6', 4), ('Bb5', 8)], [('A5', 4), ('C6', 4), ('F6', 4), ('Eb6', 4)], [('D6', 4), ('F#6', 4), ('A6', 8)]),
  },
  'title': {   # TITLE (A minor, heroic and dark)
    'bpm': 112, 'duty': .25, 'chords': ['Am', 'F', 'G', 'Em', 'Am', 'F', 'G', 'E', 'F', 'G', 'Am', 'Am', 'F', 'G', 'E', 'E7'],
    'bass': ['r', None, None, 'o', 'r', None, 'r', None], 'pad': True, 'drums': [HALF, HALF, HALF, ROCK_FILL],
    'lead': bars(
      [('E5', 8), ('A5', 4), ('B5', 4)], [('C6', 8), ('A5', 8)], [('B5', 4), ('D6', 4), ('G5', 8)], [('E5', 16)],
      [('E5', 8), ('A5', 4), ('B5', 4)], [('C6', 4), ('D6', 4), ('E6', 8)], [('D6', 4), ('C6', 4), ('B5', 4), ('D6', 4)], [('E6', 12), (None, 4)],
      [('F6', 8), ('E6', 4), ('D6', 4)], [('D6', 8), ('B5', 8)], [('C6', 4), ('B5', 4), ('A5', 8)], [('E5', 8), ('A5', 8)],
      [('C6', 8), ('A5', 4), ('C6', 4)], [('D6', 8), ('B5', 8)], [('E6', 4), ('D6', 4), ('B5', 4), ('G#5', 4)], [('E5', 12), (None, 4)]),
  },
  'victory': {   # VICTORY (C major fanfare, plays once)
    'bpm': 132, 'duty': .25, 'loop': False, 'chords': ['C', 'F', 'G', 'C', 'Am', 'F', 'G', 'C'],
    'bass': ['r', 'r', 'o', 'r', 'r', 'r', 'o', 'r'], 'pad': True, 'arp': True, 'drums': [ROCK, ROCK, ROCK, ROCK_FILL, ROCK, ROCK, ROCK, HALF],
    'lead': bars(
      [('G5', 2), ('C6', 2), ('E6', 4), ('G6', 8)], [('F6', 2), ('E6', 2), ('D6', 4), ('C6', 8)], [('D6', 4), ('G5', 4), ('B5', 4), ('D6', 4)], [('C6', 8), ('E6', 4), ('G6', 4)],
      [('A6', 4), ('E6', 4), ('C6', 8)], [('F6', 4), ('A6', 4), ('C7', 8)], [('B6', 4), ('G6', 4), ('D6', 4), ('B6', 4)], [('C7', 16)]),
  },
}
names = sys.argv[2:] or list(SONGS)
for n in names: save(n, render(SONGS[n]))

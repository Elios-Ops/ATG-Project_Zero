# ZELTAR — Lot #106 (exterior, LIVE since 2026-10-13)

**Status: published.** Submission 4979, live, version `4b00e51f7b5a8b94-7fc57247045560ac`. Lot #106 has no experience;
the racing game is not part of this release. Receipt: `reports/publish/zeltar-publish-2026-10-13.json`.

A silver racing tower by All Things Gamed, RAMPAGE's partner across the 4 m public gap. From the ground up:

- round stepped plinth with neon rings
- west ZelPod showroom (two pods on turntables, canopy, ZELTAR marquee, ATG plaque)
- a tapering shaft wrapped by a cyan racing-stripe helix, with four swept wing fins
- spinning galaxy displays on the west and east faces
- the Event Horizon (36–56 m)
- the crown spire and antennas (56.9 m)

## Production LODs (Blender 4.5 LTS, `tools/`)

| | Triangles | Draws | Materials | Textures | File |
|---|---:|---:|---|---:|---:|
| LOD0 | 10,662 / 87,500 | 4 / 14 | Armor, Neon, Glass, EventDisplay | 3 / 8 | 0.15 MB / 6.55 MB |
| LOD1 | 1,920 / 12,500 | 2 / 4 | Armor, EventDisplay | 2 / 2 | 0.03 MB / 1.31 MB |
| LOD2 | 128 / 1,330 | 1 / 1 | Armor | 1 / 1 | 0.01 MB / 0.28 MB |

Bounds are within ±12.19 m and ≤ 56.9 m. Official validation found 0 errors and 0 warnings at every level.

## Shaders (`exterior/*.glsl`, wired by `lot.json`)

- **event-horizon.glsl**: the pairing contract with RAMPAGE.
  - Shared `p0Time` and the same 35 m origin.
  - Energy flows **east** (`q.x - t*4`) toward the gap; RAMPAGE flows west.
  - Hue runs cyan↔magenta.
  - The east face wraps toward its centre.
  - Lensing crescents at local X +14.5 / Y 46, plus converging rings on the gap face and a parallax deep layer.
  - The 13–33 m displays show a slowly turning galaxy.
- **neon.glsl**: streaks rise up the fins; signage breathes; the showroom frame runs light toward the door. Everything stays under 3 flashes a second.
- **glass.glsl**: cyan Fresnel sheen.
- **Cost:** `tests/shader-check.cjs` in software measures Event Horizon 2.7–3.0×, neon 1.3×, glass 0.7×, against a 3× limit. This is the same as RAMPAGE's Event Horizon on the same machine (2.6–3.1×); the measurement is noisy.

## Build

```sh
ATG_FONTS=<fonts> Blender --background --factory-startup --python zeltar106-tower/tools/build_zeltar.py -- <ZELTAR_tower_v1.blend>
Blender --background <ZELTAR_tower_v1.blend> --python zeltar106-tower/tools/export_lods_zeltar.py -- <lods_out> <display_base.png>
python zeltar106-tower/tools/audit_glb.py <lods_out>
PLAYWRIGHT=<playwright module> node zeltar106-tower/tests/shader-check.cjs
```

The `.blend`, the GLBs and the reference renders stay private. The exporter maps every source material by its base
name (`EventDisplay.001` → `EventDisplay`). RAMPAGE's exporter lacked this mapping, so its main Event Horizon panes went out as Armor.
That needs a RAMPAGE LOD re-export and republish, which the owner must approve.

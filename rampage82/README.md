# RAMPAGE — Lot #82 (production v0.2 · release candidate 1 — see RELEASE_RC1.md)

**Status: local production build. Not published.** The live Lot #82 experience (ATG Gladiator Training Academy,
`8619fc7c57b6039b`) is untouched; replacing it needs the owner's explicit approval.

## The game — RAMPAGE: The Climb

A televised survival climb up the **inside** of the RAMPAGE tower. Players enter from the east ring road and race a
rising crimson **Surge** up a spiral gauntlet along the interior walls, through three stages, to a pad under the crown.

| Stage | Height | What's new |
|---|---|---|
| 1 · The Gate | 0–12 m | jumps, first sweeper, first laser, a crusher |
| 2 · The Shaft | 12–35 m | moving and crumbling plates, fire vents, lasers from the central mast |
| 3 · The Event Horizon | 35–53 m | everything at once beside the energy walls (the tower's display seen from inside) |

- **Controls** (2.5D tower climber): the camera stands on the tower's axis looking out. **A/D** run around the
  spiral, **W/S** toward/away from the wall, **Space** jumps, **R** retries, **I** invites. Phones: stick + JUMP/RETRY.
- **Survival**: the Surge starts 3 s after you move and speeds up per stage. Gold checkpoint gates **vent** it 7 m
  below you. A hazard hit staggers you back to the last safe pad (+3 s).
- **Score** (higher wins, compatible with the current points table): reaching the crown scores
  `100000 − round(100 × (time + 3 × hits))` (min 60,000); being caught scores your height in millimetres (max ~53,000),
  so every finisher outranks every non-finisher. Ranks: CHAMPION / GLADIATOR / CONQUEROR, or ROOKIE / CONTENDER / SURVIVOR.
- **Attract mode**: the title runs a live AI demo climb (the same autopilot the tests prove), so players see the route.
- **Multiplayer**: everyone climbs their own run; other players appear as glass contenders wherever they are.

Files: `experience/rules.js` (pure rules: course, physics, hazards, Surge, scoring, autopilot), `experience/game.js`
(world, lighting, hazard feedback, camera, HUD, finish celebration, Contenders' Wall notes, CONQUEROR), `experience/gladiator.js`
(the contender), `experience/hudfont.js` (bitmap OFL fonts), `experience/main.js` (entry), `experience/experience.json`.

## Exterior v2 — visual upgrade (Directive 011) · validated 2026-10-13, publish pending

- **Event Horizon repaired**: the four main panes used `EventDisplay.001`, which v1 shipped as plain Armor. The exporter
  now maps materials by base name, so the panes run `event-horizon.glsl` again (pairing with ZELTAR unchanged).
- **Three broadcast boards** on the faces away from ZELTAR. The atlas comes from `tools/make_display_atlas.py` and the shader is `board()` in `event-horizon.glsl`:
  - **+Z** (10 × 19.2 m, 13.6–32.8 m): the broadcast art, with LED rows and a sweep.
  - **east** (12 × 10 m, 23–33 m, above the chevron hood): cycles RAMPAGE → ENTER./SURVIVE./CONQUER. → countdown 3-2-1 → THE CLIMB BEGINS.
  - **rear** (10 × 19.2 m): cycles arena image → WARNING / THE SURGE IS RISING → RAMPAGE and the creed.
  - Every board dissolves between layers every 5 s, and nothing flashes faster than ~1 Hz.
- **Lighting and depth**:
  - framed boards (frames, wings, recessed backing, neon edges)
  - sloped orange strips on the pylon edges (none on the gap face)
  - an orange line along the Event Horizon's base on the E, N and S faces
- **Removed in export only**: the rear and east banners and their supports, which now sit behind the boards. The `.blend` is untouched.
- **Checks**:
  - audit: 19,992 / 3,866 / 119 triangles, ALL PASS
  - official validation: 0 errors and 0 warnings on every LOD
  - shader cost: Event Horizon 2.1–2.5×
  - `tests/display-preview.cjs` renders every board through the real shader

## The exterior — production LODs (v1, live until v2 is published)

Built from the approved C006 architecture by `tools/export_lods.py` (Blender 4.5 LTS). No decimation: LOD1 drops small
parts, LOD2 is a purpose-built silhouette shell. Materials and textures: a 64 px palette (base + glow map).

| | Triangles | Draws | Materials | Textures | File |
|---|---:|---:|---|---:|---:|
| LOD0 | 21,528 / 87,500 | 4 / 14 | Armor, Neon, Glass, EventDisplay | 3 / 8 | 1.72 MB / 6.55 MB |
| LOD1 | 3,762 / 12,500 | 2 / 4 | Armor, EventDisplay | 2 / 2 | 0.28 MB / 1.31 MB |
| LOD2 | 119 / 1,330 | 1 / 1 | Armor | 1 / 1 | 0.01 MB / 0.28 MB |

Shaders (`exterior/*.glsl`, wired by `lot.json`): **event-horizon.glsl** (westward energy on shared `p0Time` toward
ZELTAR, two-layer parallax, view-dependent warp, lensing crescents at local X −14.5 / Y 46, 12 s gladiator↔energy
dissolve on the +Z display, ticker), **neon.glsl** (pulses up the strips; signage breathes), **glass.glsl** (Fresnel sheen).
No vertex motion: bounds never change.

## Build and test (nothing here contacts Project 0)

```sh
node rampage82/tests/rules.test.mjs                               # course geometry, bots, Surge, scoring, determinism, autopilot
PLAYWRIGHT=<playwright module> node rampage82/tests/devkit-finish.cjs <out>   # REAL finish line in the dev kit (test-only autopilot entry)
PLAYWRIGHT=<playwright module> node rampage82/tests/devkit.cjs <out>          # official dev kit: start, play, results, retry, review, phone
PLAYWRIGHT=<playwright module> node rampage82/tests/devkit-attract.cjs <out>  # attract-mode demo climb screenshots
PLAYWRIGHT=<playwright module> node rampage82/tests/shader-check.cjs          # compile + time the lot shaders (P0Surface interface)
Blender --background RAMPAGE_C006_character.blend --python rampage82/tools/export_lods.py -- <lods_out> <display_art.png>
python rampage82/tools/audit_glb.py <lods_out>                    # budgets, bounds, extensions (from GET /api/agent/me)
python rampage82/tools/build_package.py --fonts <fonts> --lods <lods_out> --out <pkg>   # experience.zip + exterior/
```

Private inputs stay outside this repository: the C006 `.blend` and the built GLBs. The display art is original, rendered
from the game's own gladiator by `tools/render_poster.cjs`. Fonts come from Google Fonts (OFL 1.1) and ship as bitmap
atlases (`tools/make_font_atlas.py`, packages take no `.ttf`) with their licences.

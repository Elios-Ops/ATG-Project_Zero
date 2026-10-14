# RAMPAGE: SAVE LILLY — Meshy character production (Directive 020)

Branch `savelilly/meshy-characters`. The validated build with the built-in characters is tagged
`savelilly-v1-procedural` (commit `594c608`). The built-in characters (`experience/chars.js`) stay in the game: they load
automatically if the Meshy models cannot be loaded (or with the test option `procedural: true`).

## Sources (private, unchanged; SHA-256 recorded in `atg-local/savelilly/meshy/originals.sha256`)

| Character | Source GLB | Triangles | Skeleton | Clips in the file |
|---|---|---:|---|---|
| Jax | `Meshy_AI_Rigged_Hero_All_Animations.glb` | 12,425 | Meshy, 24 joints | Running, Walking, Hit_Reaction, Idle_9, Ladder_Climb_Loop, Regular_Jump, Victory_Fist_Pump |
| Lilly | `Meshy_AI_Rigged_Lilly_All_Animations.glb` | 10,181 | Meshy, 24 joints | Running, Walking, Cheer_with_Both_Hands, Idle_11 |
| The Warden | `Meshy_AI_The_Warden_16K_Triang_1013214904_texture.glb` | 16,291 | none (static) | none |

All the clips the game needs were in the files; no further exports were needed.

## Game-ready files (`experience/assets/chars/`, built privately; repository policy keeps binaries out of Git)

| File | Size | Triangles | Textures | Made by |
|---|---:|---:|---|---|
| `jax.glb` | 2.8 MB | 12,425 | 1024 px JPEG (from a 4096 px PNG) | `tools/glb_optimize.py`: only the texture bytes change; rig and clips are copied untouched (Meshy's 1-frame base clip removed) |
| `lilly.glb` | 2.2 MB | 10,181 | 1024 px JPEG | same |
| `warden.glb` | 3.1 MB | 16,112 | base colour 2048 px, metal-roughness 1024 px (JPEG) | `tools/rig_warden.py` (Blender 4.5) |

The Warden's Blender source is `atg-local/savelilly/meshy/warden/Warden_rig_v1.blend` (private).

## The Warden's rig (`tools/rig_warden.py`)

- **Skeleton:** 20 deforming bones plus a root: hips, spine, chest, neck, head and jaw; shoulder, upper arm, forearm (the gauntlet) and hand (the fist) on each side; thigh, shin and foot on each side.
- **Mesh:** the geometry, UVs, textures and ATG markings are the original Meshy model's, standing on the ground.
- **Skin weights:** spread along each limb chain by height, with soft blends at the elbows, knees, waist, neck and shoulders. Fists, feet and gauntlets are rigid; the jaw is the lower face.
- **Contact faces:** the fists were welded to the hips in the source mesh. The script removes 179 hidden contact faces there, so the arms lift cleanly instead of stretching spikes. Blender's automatic (bone-heat) weighting failed on this mesh, which is why the weights are computed this way.

| Clip | Length | Game use (timed to the boss fight) |
|---|---:|---|
| `idle` | 2.4 s loop | heavy breathing, hunched stance |
| `roar` | 2.5 s | stage intros and hurt: arms spread, roar, then a chest-pound (from 1.45 s, the stage `pound`) |
| `throw` | 0.9 s | drum throw: lift overhead for 0.55 s (the grab), hurl for 0.35 s |
| `slam` | 1.3 s | ground slam: arms rise for 0.9 s (the tell), slam for 0.4 s, crouch |
| `eye_attack` | 1.75 s | crimson eye beam: crouch and aim for 1.15 s, fire for 0.6 s (the cyber eye glows brighter) |
| `hurt` | 1.2 s | coupling overloaded: recoil and recover |
| `defeat` | 2.2 s | stagger and collapse onto his back |

## How the clips drive the game (`experience/meshychars.js`)

- **Jax:**
  - Idle → `Idle_9`.
  - Run → `Running`, sped up or slowed to match his running speed.
  - Jump and fall → `Regular_Jump`. Its built-in vertical root motion is removed so the physics moves him, and the clip time follows his air time (take-off into the tuck, then held).
  - Ladder → `Ladder_Climb_Loop`, paused while he holds still, back to the camera.
  - Hit and death → `Hit_Reaction`. Victory → `Victory_Fist_Pump`.
  - The Overdrive gauntlet is a glow on the right hand. A faint backlight keeps him readable against dark walls.
- **Lilly:**
  - Calling for help (held or caged) and cheering → `Cheer_with_Both_Hands`.
  - Running to Jax → `Running`. Jamming the presses → `Walking`. Idle and the hug → `Idle_11`.
- **The Warden:**
  - Stage modes and boss states map to his clips: grab and throw → `throw`, slam tell and strike → `slam`, beam → `eye_attack`, hurt → `hurt`, defeat → `defeat`, pound → `roar` from its chest-pound.
  - The drum he lifts sits between his actual fists.
  - The final fight opens with a new introduction: he drops onto his platform, roars in close-up, pounds his chest, and the camera pulls back to the arena.

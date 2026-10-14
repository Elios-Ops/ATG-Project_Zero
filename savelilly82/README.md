# RAMPAGE: SAVE LILLY — Lot #82 (All Things Gamed)

**Status: complete game, validated, not published.** Characters: the original Meshy Jax, Lilly and Warden (custom rig), see `CHARACTERS.md`; the built-in characters remain as the fallback. The live Lot #82 experience (ATG Gladiator Training Academy) is
unchanged. Publishing SAVE LILLY replaces it, so it needs the owner's approval. RAMPAGE: The Climb (`rampage82/`)
is kept as it was.

A cinematic arcade platform adventure in the spirit of the classic girder-climbing arcade games, in 2.5D, built for the
Project 0 runtime. **The Warden**, a cybernetic gorilla-ogre with one crimson eye, has taken **Lilly** to the top of his
fortress. **Jax**, a foundry runner with a mechanical gauntlet, has to climb up and bring her home.

## The game

| | |
|---|---|
| **STAGE 1 · THE FOUNDRY** | Six sloped girders zig-zag up the foundry wall. The Warden throws energy drums that roll downhill, drop to the girder below and sometimes ride a ladder down. Crimson drums that reach the crucible wake Volts, spark creatures that hunt along the girders and climb ladders. Also: a moving platform over a broken girder, steam vents and two Overdrive Gauntlets. |
| **STAGE 2 · THE MACHINE** | A long side-scrolling run through the machine hall: conveyors that carry you and the drums, hoppers dropping drums, a corridor of crushers under a catwalk that pushes you back, and a slag pit crossed on looping lifts (up, down and up again). Volts patrol the catwalks. At the end, three presses guard the exit lift; Lilly jams them for you. |
| **STAGE 3 · THE ASCENT** | A 70 m open-air shaft in a storm, with the crimson **Surge** rising behind you. At 15 m the route splits: ladders past timed laser gates on the left, collapsing plates with gears and a keepsake on the right. A cracked panel hides a secret 1UP. Near the summit the Warden hurls bouncing drums down the shaft. |
| **FINAL · THE WARDEN** | His platform hangs over the arena on four power couplings. Step on a coupling's glowing plate to overload it. Each one makes him angrier and adds an attack: rolling drums, bouncing drums, a slam that sends shockwaves along your tier (jump them), and the crimson eye's beam (jump it). After the second coupling, Lilly picks her lock and drops you an Overdrive Gauntlet. After the fourth, the platform gives way and he falls. Lilly breaks out of her cage, runs to Jax, and the fireworks start. |

**Systems**
- **Screens:** title with a live attract demo, main menu, stage select (practice), three difficulties (ROOKIE / NORMAL / RAMPAGE) and how to play.
- **Stage flow:** intro and outro cutscenes for every stage, a stage-clear tally, pause, game over with continue, and a results screen with ranks and replay.
- **Play:** lives, checkpoint beacons and an arcade bonus timer (when it runs out, the Warden gets angry).
- **Scoring:** gears (100), Lilly's keepsakes (3 per stage, 800 each), jumping drums (100, or 300 for two), smashing with the Overdrive Gauntlet (300 / 500), plus 1UPs and a secret.
- **The weekly table:** `p0.score()` posts the final score after a full START GAME run; `p0.table` is shown on the title screen.
- **Lilly** speaks in bubbles throughout and takes part in the story: she shouts warnings, jams the presses, drops the gauntlet and runs to Jax.
- **Other players** in the session appear as faint glass runners on the same stage.

**Controls:** A/D or ←/→ to run, W/S or ↑/↓ to climb, Space to jump (hold it for a higher jump), P to pause, R to retry. Controller: the stick runs and climbs, A jumps, START pauses. Phones: the city's stick to run and climb, plus an on-screen JUMP button.

## Code (`experience/`)

| File | What |
|---|---|
| `sim.js` | The rules as a pure, deterministic 60 Hz simulation, with no three.js and no p0: hero physics (coyote time, jump buffer, variable jump), ladders, every hazard, the stage Warden, the boss AI, items, checkpoints, lives and score. |
| `levels.js` | The four levels as data: platforms, ladders, hazards, items, checkpoints, spawners and camera. |
| `bot.js` | The autopilot. It plays a route and reacts to hazards: it jumps drums, Volts and shockwaves, and waits out vents, crushers and lasers. Used by the title's attract demo and by the tests. |
| `meshychars.js` | The Meshy characters and their animation clips (see `CHARACTERS.md`). |
| `chars.js` | The built-in procedural characters, used if the Meshy models cannot load. |
| `world.js` | The fortress: truss girders, catwalks, conveyors, lifts, crushers, lasers, vents, slag, the Surge, items, drums and Volts. Layered backdrops (sky shader, skyline, walls, gears, furnaces, scaffolds). Lights. |
| `fx.js` | Pooled particles: sparks, steam, Surge energy, fire, embers, smoke, dust and fireworks. |
| `hud.js` | Every screen and the HUD, drawn on one canvas texture with bitmap OFL fonts. |
| `game.js` | Flow, camera, cutscenes, input (keys, controller, touch), sound and the light version. |
| `main.js` | Entry point. |

Assets (generated, not committed; repository policy): `tools/make_logo.py` (logo), `tools/make_sfx.py` (41 sound effects),
`tools/make_music.py` (6 tracks: title, three stages, boss, victory), and `rampage82/tools/make_font_atlas.py` (Anton and Oswald,
SIL OFL 1.1, shipped as bitmap atlases with their licences). Everything is original: no samples, no third-party art, no
private Meshy assets.

## Build and test (nothing here contacts Project 0)

```sh
node savelilly82/tests/sim.test.mjs                 # every stage finishable by the autopilot, boss beatable, game over, respawn, determinism
python savelilly82/tools/build_package.py --fonts <fonts> --out <dir>      # assets + experience/ + experience.zip
PLAYWRIGHT=<module> node savelilly82/tests/devkit-run.cjs <out> --gpu --opts '{"stage":0,"autopilot":true}' --shots 5,10,20
PLAYWRIGHT=<module> node savelilly82/tests/devkit-run.cjs <out> --software --review --shots 5       # like the platform review
PLAYWRIGHT=<module> node savelilly82/tests/devkit-run.cjs <out> --gpu --script savelilly82/tests/showcase-entry.js   # the characters up close
```

`devkit-run.cjs` serves the experience to the official dev kit. With `--opts` it generates a test-only entry that is never
packaged: it can start a stage, let the autopilot play, or make the hero invincible. It can press keys (`--keys`), take
screenshots (`--shots`) and record video (`--video`).

## Known limitations

- **No human playtest.** Testing used the autopilot, scripted key presses in the official dev kit and headless simulation; difficulty was tuned from those numbers. A human playtest is still to do. The first stage is short for an expert: the autopilot finishes it in 13 s.
- **No saved progress.** The sandbox has no storage, so stage unlocks last for the visit (stage select is open to all). What lasts is the weekly score table.
- **No platform achievements.** `p0.items` needs items the owner creates first; ranks are shown in the game instead.
- **Cosmetic multiplayer.** Every player runs their own game; others appear as ghosts, with no co-op.
- **Audio is synthesised.** Levels were balanced numerically, not checked by ear.
- **Software renderer.** With the Meshy characters the light version averages about 24 fps (before: 26–31) and has a few long frames while a stage loads.

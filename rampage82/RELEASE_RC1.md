# RAMPAGE — Release Candidate 1 (Lot #82)

**Status: RELEASE CANDIDATE. Publication held for the owner's authorization.** Nothing has been published; the live
Academy (`8619fc7c57b6039b`) is untouched. Lots #106 and #154 untouched. No tokens or Attention spent.

## 1. What RC1 is

| Component | Package | Official validation (2026-10-13) |
|---|---|---|
| **Experience** — RAMPAGE: The Climb v0.2 | `experience.zip`, 20 files, 313 KB (233 KB zipped) | **ok**, 0 errors / warnings / findings, hash **`94e111fce7573c2f`** |
| **Exterior** — C006 architecture, LOD0/1/2 + `lot.json` + 3 shaders | `exterior/` | **ok**: LOD0, LOD1 and LOD2 each pass with 0 errors and 0 warnings |

Validator receipts are in `reports/rc1/`. The v0.1 run is also kept: its exterior passed, and its experience was refused because packages accept no `.ttf`. That refusal is fixed by shipping the fonts as bitmap atlases.

## 2. v0.2 — what changed since v0.1

- **Gladiator contender**: an original armoured figure (crested helmet, glowing visor, pauldron, round shield, short sword, leather skirt, cape). It has procedural run, jump, stagger and victory animation. Other players appear as glass contenders.
- **Lighting and atmosphere**:
  - point lights that follow you, the Surge and the next gate
  - fog that warms as the Surge nears
  - rising embers
  - light shafts from the crown
  - glowing frame bands
  - the Event Horizon energy walls inside stage 3
- **Hazard feedback**:
  - crushers paint the pad red as they drop
  - fire vents glow before they ignite
  - crumbling plates shake and flicker (~2 Hz)
  - lasers and sweepers have halos
  - first-stage coaching ("JUMP THE LASER AS IT SWEEPS PAST")
- **Checkpoint feedback**: gates light white, the Surge visibly drops, and a CHECKPOINT · SURGE VENTED banner and sound play.
- **Surge feedback**: a steady red glow rises from the bottom of the screen as it nears (continuous, never flashing), with distance warnings and a sound cue.
- **Finish line**: the crown spires ignite, the camera orbits the conqueror, and they raise their sword. The results screen shows the **CONQUEROR crest**, rank, time with penalties, score, best this visit, weekly place and leaders.
- **CONQUEROR achievement**: the crest is awarded in game now. The real Project 0 item is ready (`conqueror-item/` in the private release folder) and switches on by setting `ITEM_CONQUEROR` once the owner creates it.
- **Contenders' Wall** (`p0.notes`): players press N or tap NOTE to leave a word through the city's own window. The wall stands inside the east entrance, beside the glowing interior portal, and refreshes every minute.
- **Start at the entrance**: the climb begins on a pad just inside the east portal, the same door players see from the ring road.
- **Balance**: a 4th checkpoint mid-Event-Horizon.

  | Player type | Result |
  |---|---|
  | Perfect | Finishes in 46.8 s |
  | Careful (look-ahead autopilot) | Finishes in 118.9 s with 6 hits |
  | Reckless | Caught at 42.8 m |
  | Idle | Caught after 18 s |

- **Exterior entrance**: the four stepped chevrons above the portal light bottom-to-top (rising arrows), and the portal frame runs light down to the door. All effects stay under 3 flashes a second.
- **Promotional art**: the concept-image crop is **replaced** by original art rendered from the game's own gladiator (`tools/render_poster.cjs`). The publication-rights question is resolved by not using the concept image.

## 3. Final gameplay checks (official dev kit via Playwright; reports in the private release folder)

| Check | Result |
|---|---|
| Rules (`tests/rules.test.mjs`) | All pass: geometry, bots, Surge, scoring order, determinism, autopilot |
| Desktop 960×540 | Starts 4.2 s · 58 fps (p95 21 ms) · 0 errors · `devkit.review(14)` 58 fps, 0 errors |
| Phone 390×844 | Starts 3.8 s · 59 fps · 0 errors |
| Software renderer (review-like) | 50 fps · review 52 fps · 0 errors (light version chosen automatically) |
| Multiplayer + dropped connection | 4 players, the host migrates, the game hears `reconnect`, 0 errors |
| **Finish line (real game, autopilot entry)** | Reached the crown at 118.91 s · `p0.score(86309)` accepted (best 86,309, place 1) · celebration + results + notes + retry verified · 0 errors, 59 fps |
| Attract demo | Climbs to the crown at 60 fps, 0 errors |
| LOD audit (`tools/audit_glb.py`) | All budgets pass (21,528 / 3,762 / 119 triangles; 4 / 2 / 1 materials; max texture 1024 / 64 / 64 px) |
| Shader check (`tests/shader-check.cjs`) | All compile. Cost per full-screen pixel, software: Event Horizon 2.08×, neon 1.18×, glass 0.57× |

## 4. Rollback and recovery

The private release folder `rollback/` holds:
- the **exact live Academy package**, verified against the live `/source`
- the live game rules
- the never-published Academy-era exterior as a fallback
- a fresh read-only live snapshot
- `ROLLBACK.md` with step-by-step procedures

Exterior note: Lot #82 has no exterior today, and no documented call removes published LODs. Once the RAMPAGE exterior is live, rolling back means keeping it or publishing the fallback.

## 5. Remaining blockers and risks

| # | Item | Type |
|---|---|---|
| 1 | **Owner authorization to publish** (exterior and experience) | Blocker |
| 2 | Weekly table: the Academy's 98,942 is above any possible Climb finish (a perfect run scores ~95,300) | Launch timing (see §6) |
| 3 | Platform review: the shader cost is measured only at publish (validators don't report it). Ours is ≤ 2.1× per pixel in software, against a limit of 3×. | Risk: low |
| 4 | CONQUEROR item: needs the owner to create it (`POST /api/agent/items`, account change) | Optional |
| 5 | Real-account checks only possible after publish: notes writing (sign-in), weekly score persistence, guests' "sign in" path, two real clients | Post-launch smoke test |
| 6 | The Event Horizon pairing reads fully only once ZELTAR (#106) has its display. RAMPAGE's crescents stand alone until then. | Expected |
| 7 | Optional: make the lot box "subtle" so the tower reads without the outline (`POST /box`, account change) | Owner choice |

## 6. Recommended launch window

**Monday 2026-10-19, 00:00 UTC (the weekly reset)**:
1. **Sunday evening (UTC):** publish the **exterior** (no effect on scores). Poll its submission to `live` and check the street view.
2. **Monday 00:00–01:00 UTC:** publish the **experience** right after the reset, so RAMPAGE's first weekly table starts clean.
3. **Same hour:** run a smoke test with two real accounts plus a guest (enter, climb, finish, score, notes, reconnect).
4. **Keep the rollback package at hand.** If the review refuses a component, stop and report. Never re-submit blindly.

The game rules stay as they are (free, prize 0, top 3, higher points win, 10 s minimum), so no settings change is needed at launch.

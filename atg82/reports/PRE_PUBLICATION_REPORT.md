# Lot 82 — pre-publication report

**Status: built and tested locally; NOT PUBLISHED. No live property settings changed.**

Verified dimensions: **25 × 25 × 57 metres**, large tier. Lot 106 is west, separated by a 4m property gap. All geometry remains inside Lot 82.

Created: a hollow glass tower, ATG entrance/signage, three exterior GLBs, two shaders and `lot.json`; and a fully playable Training Academy with ten jump stages, two moving hazards, three checkpoints, an ordered finish, timing/fall penalties, medals, instant replay, original sound effects and weekly points-table integration. Future upper-floor volume is preserved.

| Model | Triangles / limit | Draw calls / limit | Materials / limit | Raw GLB size |
|---|---:|---:|---:|---:|
| LOD0 | 1,214 / 87,500 | 4 / 14 | 4 / 4 | 150.7 KiB |
| LOD1 | 590 / 12,500 | 2 / 4 | 2 / 2 | 73.0 KiB |
| LOD2 | 446 / 1,330 | 1 / 1 | 1 / 1 | 50.6 KiB |

## Passed checks

- Project 0 exterior validator: all three LODs accepted, **zero errors and warnings**. Bounds, texture sizes, animation restrictions and primitive/material budgets passed.
- Project 0 experience validator: **zero errors, warnings or findings**. Package contains 7 files, 49,554 bytes; bundled JavaScript 15,501 bytes. No external assets, network access, storage, code generation or forbidden imports.
- Headless physics: full course completion, checkpoint resets, three-second penalties, replay, hazard bounds, ordered-stage enforcement and frozen finish state.
- Local runtime harness: startup and HUD at 960×540, 390×844 and 800×600; full game-loop finish; one score submission; touch jump/retry; keyboard replay and reconnect.
- Official Project 0 dev kit, Chromium software rendering: desktop startup, simulated second visitor and reconnect; review-style 15-second run without errors or sandbox violations. Its initial review measured **51 FPS**, 14ms first frame and 65.7ms worst frame; the final corrected run is also recorded in `devkit-review.json`.
- Official dev-kit phone view: no errors, 52 FPS at the recorded sample.
- Full course completed in the official dev kit; **p0.score(98266) accepted**, best 98266, place 1 in its simulated leaderboard. Finish and scoring were tested in addition to the short random-input review. Keyboard replay was checked separately in the final browser smoke test, with reset position `(−8, 3.1, 8)`.
- Actual geometry rendered from front, three-quarter, back and above. Shader functions compiled in a software OpenGL wrapper. Model/source are original procedural work; no third-party game characters or advertising.

## Remaining limits and review

1. **Publication is waiting for Cody's explicit approval.** Proposed live game rules: free entry, zero token prize, higher points win and 10-second minimum. No box-setting change and no change to Lot 106.
2. The platform's publication review must still approve the exterior shaders' cost/content and both packages. The exterior preflight response does not expose a shader-cost measurement. Software shader compilation is not a substitute for that platform review.
3. Weekly leaderboard persistence and two real-account multiplayer should receive a live smoke test after approved publication. Pre-publication dev-kit tests use a simulated session/table.
4. The display band clears the nearby 35m hall envelopes, but another nearby block allows 53m and a tower 68m. This property cannot rise above every surrounding roof within its verified 57m cap. Neighbour envelope dimensions come from the current public city-layout generator and match the owned-lot API; actual neighbour roof meshes were not exhaustively measured.
5. Lot 106's opposing animation and the central illusion are a future phase. Nothing has been built or changed there.

The animated preview and stills use the actual exported geometry and shader functions with approximate software lighting. They are not photographs of a published lot.

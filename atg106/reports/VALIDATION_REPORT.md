# ATG Directive 004 — Lot 106 executive validation report

**Status: READY FOR OWNER REVIEW. NOT PUBLISHED.**

## Built

A distinct ATG glass tower with twin engine-inspired crown, amber/cyan structure, pit-lane entrance, Pod Racer signage and thin upper Event Horizon panels. The shell remains hollow for future expansion. The experience contains three original pods, five paint colours, three light colours and optional fins: **90 free configurations**, visible in a rotating Design Lab preview.

The Aurora Circuit is a three-lap time challenge with acceleration, braking, steering, charged boost, a smooth chase camera, 12 ordered gates per lap and forgiving radial barriers. Collisions add one second, limited by a 0.9-second penalty cooldown. The course uses a small kinematic model rather than a rigid-body engine. It is presented as an independent miniature race instance inside the permitted coordinate envelope; it need not occupy the tower's literal floor plan.

Points = `max(1, 100000 − round(100 × (race seconds + penalty seconds)))`. Higher scores win. Replay, return to Lab, visit personal best and the platform weekly table are implemented. No prize or purchase calls exist. Game settings are proposed only.

## Ownership, orientation and Event Horizon

The authenticated API confirms All Things Gamed owns **Lot 106: 25m X × 25m Z × 57m Y**, large tier, at `(-277.5, -115.5)`. Lot 82 is at `(-248.5, -115.5)`: 29m between centres, **4m between property edges**. Lot 106's +X face faces the gap. Both source GLBs have identity root transforms; flow direction was confirmed from the preserved 82 shader rather than assumed from building orientation.

Lot 82's approved shader advects toward −X. Lot 106 uses +X advection with the same documented **p0Time** clock, 4m/s base flow and matching row-dependent trail timing. A 12-second ATG logo cycle dissolves into the flow. A partial lensing crescent is clipped to our panes; only the shader's mathematics refers to a virtual centre in the gap. No vertex displacement, external particles or geometry occupy public space.

The upper display is approximately 43.1–55.5m, **8.5cm behind the LOD0 glass**. The LOD1 upper display replaces simplified glazing so opaque lower geometry cannot occlude it. LOD2 is a static silhouette. The paired preview uses the unchanged 82 source; **live paired synchronization cannot be verified while 82 has no live exterior reference**.

## Official validator results

Both Project 0 endpoints returned **HTTP 200, ok:true, zero errors and warnings**. The experience validator also returned no findings.

| Exterior | Triangles / limit | Draw calls / limit | Materials / limit | Raw GLB size |
|---|---:|---:|---:|---:|
| LOD0 | 1,526 / 87,500 | 4 / 14 | 4 / 4 | 181.9 KiB |
| LOD1 | 614 / 12,500 | 2 / 4 | 2 / 2 | 76.4 KiB |
| LOD2 | 518 / 1,330 | 1 / 1 | 1 / 1 | 57.6 KiB |

Geometry bounds: X −12 to +12m; Z −12 to +12.3m; Y 0.1 to 56.83m. All three exports satisfy their texture, file, material and animation budgets. Textures are embedded PNGs of 1024 / 512 / 256 pixels. LOD2 is exactly one primitive/material. No Draco, instancing extension, external assets, skins or animation clips are used in the exterior.

Experience package: **8 files, 60,681 bytes**, bundle 21,904 bytes. Only the platform-pinned THREE library and relative modules are imported. Original short WAVs supply effects. No external networking, storage, code generation, purchases or token-prize calls occur.

## Gameplay and performance checks

- All three pods finish 36 ordered gates in headless physics; clean bot runs are 23.9–26.8s. Braking, boost depletion/recovery, barriers, penalty scoring, shortcut prevention and immutable finish state pass.
- The actual game-loop harness passes pod selection, paint, lighting, fins, launch, HUD, full keyboard race, one score per finish, replay, return to Lab, reconnect and touch customization. Tested sizes: 960×540, 390×844 and 800×600. Track surfaces explicitly face upward.
- The official dev kit completes the full race and accepts **94,313 points, place 1** in its simulated weekly table. Keyboard replay, Lab return and simulated reconnect pass. This is not a live-player leaderboard claim.
- Final software-rendered review: **41.3 FPS**, first frame 3.7ms, worst measured frame 334.9ms. No errors or blocked sandbox requests. Phone sample: **56 FPS**, no errors. The full-playthrough sample recorded 51 FPS. These are software-renderer measurements, not a hardware-GPU benchmark or a 60 FPS guarantee.
- Both GLSL functions compile and link in a WebGL2 / GLSL ES 3.0 wrapper with empty compiler logs, and in the independent software OpenGL preview harness. Shared-clock direction, 4m gap, no vertex displacement and source immutability checks pass.
- Actual assets were inspected from front, three-quarter, back and above; LOD1 and LOD2 previews are included. Software previews have approximate lighting and are not images of a published lot.

## Commerce findings

The current p0.buy API can support future premium paint/skins, lighting and ATG trim. Permanent ownership can be restored through p0.purchases; checkout belongs to the platform. Cosmetic upgrades can remain performance-neutral. See COMMERCE_RESEARCH.md. **No sales UI, prices, purchase calls or charges are active.**

## Remaining issues and publication readiness

1. Owner approval is required before any Lot 106 publishing or settings request.
2. The platform must still perform publication/content and street-shader cost review. The GLB preflight response exposes model budgets but no measured platform shader-cost result; independent compiler tests are not a substitute.
3. Real city transparency/lighting, the live paired illusion, two real-account visitors and persistent weekly scoring still need a post-approval live smoke test.
4. The software review runs below 60 FPS and recorded a 334.9ms worst frame; it did not trip the watchdog. Hardware-GPU performance remains unmeasured.
5. Customization and this visit's best reset when the session ends; weekly scores persist through Project 0. The launch version is solo time racing with other players visible, not vehicle-contact multiplayer.

No blocking local validation error remains. The complete source, three GLBs, experience ZIP, asset hashes, proposed rules, commerce notes and deployment checklist are supplied for review.

**Authority lock:** no publish, building-status, box-setting, game-setting, purchase or spending call was made. API snapshots confirm Lots 82, 106 and 154 unchanged and Attention unchanged at 450.367. Lot 82's source hashes also match the initial lock.

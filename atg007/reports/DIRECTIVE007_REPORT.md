# ATG — Directive 007 Visual Review

Target: Lot #106 only. Date: 12 October 2026 UTC / 11 October Phoenix.
Status: Local candidates. STOP for owner visual approval. No publication or production integration.

## Event Horizon height verification

The previous Lot #106 EventDisplay bounds were Y43.09400177–55.50600052m (12.412m on the front/back panes; side panes were approximately 12.4m). The proposed display now occupies Y35–57m, exactly 22m, in both LOD0 and LOD1. All four display planes are 3cm thin, immediately inside the glass. LOD0 has 8.5cm clearance between the display's outer face and the glazing's inner face.

The shader's vertical origin changed from 43m to 35m. There is no vertical clipping mask; independent fragment sampling at five clock values found illuminated pixels in every 1m band from 35 to 57. Active fractions were approximately 16–26% per band across the sampled times. Thus the animation covers the complete upper section rather than a roof ribbon.

Glazing now reaches 57m. The opaque LOD1 wall terminates at 34.98m. The roof cap is inset inside the display planes and reaches no higher than 57m, avoiding an opaque cap cutting the last part of the display. Neon frame lines were repositioned around the new upper section. Interior volume remains hollow.

Shared p0Time, east/+X advection and 4m/s base speed are unchanged. Trails retain the same row-dependent 4–7m/s behavior and 13m period, and the ATG dissolve cycle remains 12 seconds. The proposed optical lens centre is world Y46m, with its mathematical gap-centre coordinate at local X+14.5m. It creates no geometry, particles or public-space object. Logo base Y52m fits within the display.

Property bounds pass for all LODs: X -12..12m, Z -12..12.3m, Y .1..57m. No box settings were changed. LOD2 remains static, as required by Project 0.

| Level | Triangles | Draw calls | Materials | Max texture | Display |
|---|---:|---:|---:|---:|---|
| LOD0 | 1,526 | 4 | 4 | 1024px | Animated Y35–57 behind glass |
| LOD1 | 614 | 2 | 2 | 512px | Animated Y35–57, simplified glazing |
| LOD2 | 518 | 1 | 1 | 256px | Static silhouette/color |

Evidence: event-height-verification.json, local-model-validation.json, server-exterior.json, WebGL shader validation, Event_Horizon_007_LOD*.png and height comparison.

## VIPER: reference versus current versus proposed

The supplied VIPER mood board is the approved visual reference for the Handling Class. It is not treated as a literal specification for race physics or real-world speed/weight. COMET's model and source are unchanged; this directive does not reassess its separate approved mood board. TITAN is unchanged and still awaits its own visual approval.

| Feature | Current Directive 006 GLB | Proposed candidate |
|---|---|---|
| Silhouette | Short central nose, engines nearly as long as body, broad/squat outline | Longer aggressive spear, engines set aft, pointed splitter/fairing echoes |
| Cockpit | Tall blue faceted wedge | Lower long dark canopy with white armor flanks, black brow and green seam rails |
| Engines | Simple octagonal cylinders, shallow end caps | Compact 16-sided housings, segmented white armor, exposed black ribs, recessed rotor intakes and rear exhaust collars |
| Fins/wings | Two simple triangular fins, broad flat outriggers | Four swept angular stabilizers, white inserts, green edge accents, connected pivots and rear wing arms |
| Mechanical connections | Simple crossmembers | Triangulated mounts, sleeves, crossmembers and visible green harness links |
| Surface detail | A few ribs and ring bands | Layered armor bands, cooling/mechanical gaps, fastener blocks and distinct intake/exhaust shapes |
| Materials | Uniform customizable body color; light blue canopy | Default black-and-white bodywork with electric-green lighting and dark canopy |
| Proportions | 1.745m long × 1.840m wide | 2.380m long × 1.742m wide; longer and narrower without changing the course |

The candidate retains stylized low-poly surfaces. It does not reproduce the mood board's photoreal reflections, weathering, fine decals, dense piping, transparent detailed cockpit interior or cinematic bloom. Meaningful silhouettes and mechanical structure were prioritized over those decorative details. Fin-edge graphics use baked vertex colors; they tint with paint rather than all following the light selector. Core lamps/intake/exhaust accents remain customizable.

The model is generated through the existing approved ATG original-surface pipeline. Plain glTF 2.0, metres, +Y up, +Z forward, embedded positions/normals/colors, no textures, Draco, meshopt, animations or skeleton. The GLB matches the isolated sandbox candidate's geometry and has passed independent Three r186 GLTFLoader reimport. It is labeled as a candidate; neither the original validated source nor the release package was overwritten.

| Model | Triangles | Draw calls | Materials | Raw GLB |
|---|---:|---:|---:|---:|
| Current VIPER | 976 | 5 | 4 | 117,108 bytes |
| Proposed VIPER | 2,868 | 5 | 4 | 332,992 bytes |

This is +1,892 triangles (2.94× total) and +215,884 raw bytes, with no added draw calls or textures. Geometry remains far below the official experience asset limit of 1M triangles/50MB per GLB. Those generous limits are not a performance guarantee; the deliberately smaller 5k local design ceiling also passes.

## Gameplay, mobile and sandbox validation

- The complete rules.js module is byte-identical to Directive 006, including all pod handling values, checkpoints, boost, barriers, time-to-points scoring and replay state.
- All three handling profiles complete three laps and 36 ordered checkpoints in deterministic tests. Braking, boost recovery, barrier penalties, no shortcuts and exactly-once completion pass.
- The actual candidate runtime completes the VIPER race via keyboard controls; score 97331 is submitted once in the deterministic harness. Replay, customization, Lab return and reconnect pass.
- The official Project 0 dev kit completes the revised VIPER race and accepts p0.score(93815), simulated best 93815, place 1. Replay and Lab return pass, with no errors. This is a mock platform result, not verification of the live weekly leaderboard.
- Mobile tests exercise the revised VIPER at 390×844: touch selection, paint/lights/fins, launch, stick key path, full race, touch boost/retry/Lab, table/reward handlers and the slow-frame resolution safeguard pass. Desktop 960×540 and odd-size 800×600 tests also pass.
- Both exterior GLSL files compile/link in WebGL2; the new shader also compiles in the local software OpenGL renderer. No shader errors or logs.
- Official Lot #106 exterior validator: HTTP200, ok:true, all three levels zero errors/warnings.
- Official candidate experience validator: HTTP200, ok:true, zero errors/warnings/findings; 11 files / 411,146 uncompressed bytes / 41,665 bundled JS bytes.
- The revised model has finite attributes/unit normals, correct front/scale, no export bounds discrepancy. Front, rear, side, above, three-quarter, wireframe and 64px silhouettes are provided. Model previews preceded isolated sandbox testing; this was not final production integration.

## Performance implications

Sequential same-browser software-rendered tests using Chromium SwiftShader. VIPER was explicitly selected in both releases. Desktop 960×540: six-second Lab and race samples. Phone viewport 390×844: five-second Lab and six-second race samples. Two visitors. No physical phone or hardware GPU was used.

| Sample | Current VIPER | Candidate VIPER |
|---|---:|---:|
| Desktop Lab | 41 FPS | 43 FPS |
| Desktop racing | 45 FPS | 43 FPS |
| Phone Lab | 52 FPS | 48 FPS |
| Phone racing | 55 FPS | 49 FPS |

The race samples show a small desktop decrease and approximately 11% phone-view decrease; no runtime/sandbox failure. The candidate desktop sample contained one 339.8ms worst frame. A separate full-race run measured 50FPS. These short, noisy software samples do not establish hardware performance or a statistical regression threshold. Actual-device testing remains necessary before final integration.

Five merged draw calls, four unlit/baked-shaded materials, no post-processing, shadow maps or particles, prewarming and the existing pixel-ratio fallback remain in place. Collision stays the validated center/radial model; the revised visual hull introduces no new collision physics. The model fits the miniature course and camera and remains below the checkpoint beam.

The enlarged EventDisplay has 1.77× its previous pane area, approximately 77% more potential fragment coverage. Geometry/draw counts are unchanged and shader ALU complexity is essentially unchanged. Actual street shader GPU cost is unmeasured; Project 0's publication renderer must eventually confirm the 3× plain-build / +4ms budget. LOD0 glazing attenuates the image; the simplified unglazed LOD1 display appears brighter in the local renders. Owner brightness review remains part of the façade visual approval.

## Corresponding work eventually required on Lot #82

No Lot #82 file, model, configuration, shader or live setting was modified. Its preserved current EventDisplay also spans approximately Y43.094–55.506m. Under separate authorization it will need:

1. Expand the thin display planes to Y35–57 (centre Y46, height22), maintaining its own glazing offsets and property bounds.
2. Extend glazing to57m and inset/rework the roof cap so it cannot hide the upper pane.
3. Terminate opaque LOD1 walls below35m; the current simplified walls can hide the behind-glass display. Retain correct shared material names.
4. Change its shader vertical origin from43m to35m while preserving WEST/-X flow (`q.x + t*4`) and shared p0Time, row-speed/13m trail period.
5. For the completed paired illusion, mirror the gap-facing side-coordinate wrap, align a complementary lens centre at world Y46/local X-14.5, and match the logo dissolve cadence if logo support is added. The preserved Lot #82 shader currently lacks Lot #106's lens/ATG logo additions.
6. Validate all three LODs/shaders, then check both towers together at matched world-clock times. The clock remains synchronized today, but the new and old vertical pattern origins are spatially misaligned until #82 is revised.

No live paired-tower render was attempted. The documented counterpart work is a recommendation, not authorization to change Lot #82.

## Owner decisions and status lock

1. Approve or revise this VIPER candidate's spear proportions, four-fin arrangement, black-white livery and green accents. The board's photoreal finish is deliberately approximated for the browser game.
2. Approve the Lot #106 full-height façade treatment, including glazing/roof adjustment and lens centre at Y46.
3. If desired, separately authorize matching Lot #82 work. TITAN still needs independent visual approval. COMET remains governed by its previously approved mood board and is unchanged here.

Final model integration and publication remain unapproved. No paid purchases, token/Attention spending, property/box setting changes or live replacements occurred. All 397 locked original files remain unchanged; account/lot comparison confirms Lots82/106/154 and Attention unchanged.

STOP FOR VISUAL APPROVAL. This review package is not a publish command or an approved release.

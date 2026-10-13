# ZELTAR — All Things Gamed / Lot #106

Directive 006: local review release. NOT PUBLISHED. No live settings changed.

ZELTAR is the game. ZelPod is the vehicle category. The ZEL Towers is the complex. ZelPod Design Lab is the free customization experience.

Read reports/VALIDATION_REPORT.md first. The report includes the exact authority boundary, validator results, model statistics, gameplay tests, performance comparison and remaining issues.

## Release contents

- experience.zip: validated deployable game, free customization and three-lap racing.
- experience/: complete readable JS/sounds and matching optional GLB assets.
- models/: COMET.glb, VIPER.glb, TITAN.glb. Same geometry as the runtime model source.
- exterior/: three LODs, manifest, lot.json and unchanged Event Horizon/neon shaders. Geometry preserved; local sign branding updated.
- reports/: three ZelPod view sets, interface previews, tests and official responses.
- tests/: reproducible model exporter, gameplay/regression/runtime/browser/preview tests.
- baseline/: preserved approved Pod Racer source/assets/ZIP for comparison ONLY. Never publish baseline files.
- release-hashes.json: SHA-256 for every proposed release file.
- proposed-game-settings.json: free entry, zero prize, top/highest points, 10-second minimum. Proposal only.

## Play locally

Unzip into a folder with the zeltar106/ directory. Run from its parent:

```sh
node zeltar106/dev-server.mjs
```

Open the official development kit:

https://project0.city/devkit?entry=http://localhost:5500/experience/main.js&width=25&depth=25&height=57&size=960x540

Controls: 1/2/3 choose COMET/VIPER/TITAN; C paint, L lights, F fins; Space launch. WASD/arrows drive; Shift boosts; R retries; B returns to the Lab; I invites; Esc exits. Phones use the Project 0 stick and the Lab/BOOST/RETRY/LAB buttons.

Higher points win: max(1,100000-round(100*(race seconds+penalty seconds))). Three laps, 36 ordered checkpoints; each barrier hit +1 second. All customization is free.

## Reproduce

```sh
node zeltar106/tests/rules.test.mjs
node zeltar106/tests/export-zelpods.mjs
node zeltar106/tests/models-and-regression.mjs
node zeltar106/tests/runtime.mjs
node zeltar106/tests/touch-runtime.mjs
python3 zeltar106/build.py
```

Pure geometry/regression tests use the included Three r186 vendor modules. Canvas tests require @napi-rs/canvas; browser tests require Playwright and a Chromium executable; render tests require moderngl, NumPy and Pillow with software EGL. Current environment paths are in those scripts and may need adjustment on another machine. Export tests use tests/zelpods-entry.mjs, a testing copy of experience/zelpods.js with only the Three import remapped; refresh it when the model source changes. Raw exports and runtime geometry are verified by independent GLTFLoader reimport.

The preview generator depicts exact runtime/model surfaces with approximate local lighting. It is not a screenshot of a published property. Current official specs are in guides/current-*.md. Three.js is MIT; see tests/vendor/THREE_LICENSE.txt. No other third-party art, models or sound is used.

Do not run publish or settings endpoints without explicit owner authorization.

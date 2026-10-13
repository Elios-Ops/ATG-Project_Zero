# ATG Pod Racer Gauntlet — Lot 106, Directive 004

**Local release for owner review. NOT PUBLISHED. No live property settings were changed. All customization is free; purchases are inactive.**

The ZIP extracts as `atg106/`. It contains an original hollow glass tower with racing-inspired crown, pit-lane entrance and eastbound Event Horizon display; plus a playable Design Lab and three-lap Aurora Circuit.

## Play locally

From the directory containing `atg106/`, with Node.js 20+:

```sh
node atg106/dev-server.mjs
```

Open the official Project 0 dev kit:

https://project0.city/devkit?entry=http://localhost:5500/experience/main.js&width=25&depth=25&height=57&size=960x540

Allow normal local-network access if the browser requests it. Nothing is published. Select Phone for its 390×844 view. The dev kit may show its own toolbar/HUD; the production manifest requests `ui: minimized`.

Lab controls: **1/2/3** select a pod; **C** cycles paint; **L** lighting; **F** fins; **Space** launches. Mouse/touch buttons also select every free option and launch.

Race controls: **W / up** accelerates; **S / down** brakes; **A/D / left/right** steers; **Shift** boosts; **R** retries; **B** returns to the Lab; **I** invites; **Esc** leaves. On phones use Project 0's stick and the BOOST, RETRY and LAB buttons. Race HUD controls are kept away from the default touch stick.

Finish all **36 ordered checkpoint gates over three laps**. Road barriers prevent shortcuts and add one second per collision, with a 0.9-second penalty cooldown. Boost uses a recovering energy meter. All three pods have modest handling/pace differences; all are free. This is a solo time challenge with other visitors visible, not a contact-racing simulation.

Scoring is transparent and higher-is-better:

`points = max(1, 100000 − round(100 × (race seconds + barrier penalty seconds)))`

The themed speed display is scaled for the miniature scene; timing uses simulation seconds. The finish screen shows adjusted time, points and this visit's best. Project 0 supplies the weekly table; guests receive a local result but need platform sign-in for persistent scores. There are no prize, purchase or local-storage calls.

## Rebuild and test

Run from the directory containing `atg106/`:

```sh
python -m pip install numpy Pillow
python atg106/build.py
node atg106/tests/rules.test.mjs
```

The baked sign uses the DejaVu Sans Bold font normally found at `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`; adjust that path on another OS.

Additional runtime/browser tests need Node packages `@napi-rs/canvas` and `playwright`, plus Chromium. Their paths in the test utilities reflect the build environment and can be adjusted for another machine. The runtime harness uses the official THREE r186 snapshot in `tests/vendor/`. The software preview tools require `moderngl`, `glcontext`, NumPy and Pillow; adjust their temporary dependency path if rerunning them elsewhere. THREE and DejaVu are used under their bundled/permissive licences; production imports THREE directly from Project 0.

## Package map

- `exterior/`: exactly the publishable three GLBs, lot.json, shaders and manifest.
- `experience/`, `experience.zip`: exactly the deployable Design Lab/race files and original short sounds.
- `reports/`: validator responses, measured dev-kit results, pure physics/runtime checks, boundary/clock tests and actual-asset software previews. Browser screenshots used internally are excluded.
- `references/lot82/`: read-only snapshot for the paired preview. Not for deployment.
- `COMMERCE_RESEARCH.md`: documented future cosmetic support; none is implemented as a sale.
- `proposed-game-settings.json`: prepared only, not applied.
- `DEPLOYMENT_CHECKLIST.md`: approval boundary and deployment/review steps.
- `release-hashes.json`: SHA-256 hashes for deployable files and the experience archive.

The black-hole effect is a pane-based optical suggestion: a clipped lensing crescent, opposing particle-like pixels and inward light flow. No physical object or particles occupy the public gap. Lot 82 has no live exterior reference at verification, so its direction was confirmed from its preserved validated GLB/shader source; live paired appearance is still a post-publication check. The two builds use the same p0Time clock without a per-client offset.

## Approval boundary

Preflight validation is not publication approval. Project 0 must still perform its publication/content/shader-performance review after the owner authorises a launch. Neither an API key nor automatic publishing code is included. Directive 004 made no publish, building-status, box, purchase or game-settings request.

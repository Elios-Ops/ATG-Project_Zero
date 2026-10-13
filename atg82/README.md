# ALL THINGS GAMED — Lot 82, release 1

**Built locally. Not published. No live lot, box, building-status, economy, entry-price or prize settings were changed.**

## What is included

- `exterior/`: three independently generated GLBs, `lot.json`, Event Horizon and neon shaders, and the proposed publish manifest.
- `experience/` and `experience.zip`: the playable Gladiator Training Academy. Ten jump stages, three checkpoints, two moving sweepers, an ordered finish, a timer, three-second fall penalties, gold/silver/bronze medals, replay, original short sounds, session personal best and Project 0 weekly leaderboard integration.
- `proposed-game-settings.json`: free entry, no token prize, higher points win, 10-second minimum. **Approval required before applying.**
- `reports/`: model/API validation, local game tests, official dev-kit results and software previews of the actual assets.
- `build.py`, `tests/`, `dev-server.mjs`: reproducible source and test utilities. The API key is not included.

## Verified property

The authenticated Project 0 API confirms Lot 82 belongs to All Things Gamed and measures **25m X × 25m Z × 57m Y**, floor origin at the lot centre. Lot 106 is 29m west: its centre is `(-277.5, -115.5)` versus `(-248.5, -115.5)` for 82. The property gap is 4m. The display moves toward negative X. There is no geometry in the gap or on Lot 106.

Model bounds: X ±12.15m, Z −12.15m to +12.35m, Y 0.1m to 56.36m. No exterior vertex animation changes these bounds.

The upper display spans approximately **43.1–55.5m**, 8cm behind the nearest glass inner surface. Shared `p0Time` synchronises the pixel marquee, illuminated fragments and trails. All four upper faces carry a display; the front/back lanes flow west. The lower academy occupies the lobby; the upper shell remains hollow for future vertical courses.

Project 0's public city-layout generator, checked against both owned-lot API coordinates, places the immediate north/south halls at 35m. The east block is allowed to reach 53m, and another nearby tower reaches 68m. Therefore the display clears the nearby 35m halls, but **a 57m property cannot rise above every surrounding roofline**. The survey describes allowed lot envelopes, not a measured audit of every neighbour's actual current GLB roof.

## Play locally

Requires Node.js 20+.

```sh
node dev-server.mjs
```

Then open Project 0's official dev kit:

https://project0.city/devkit?entry=http://localhost:5500/experience/main.js&width=25&depth=25&height=57&size=960x540

Allow the site's normal local-network access if your browser requests it. This loads local files and publishes nothing. Select Phone for the 390×844 test view. The dev kit may show its own HUD over the game; publishing uses the experience's `ui: minimized` preference.

Controls: WASD/arrows move; Space jumps; R restarts; I opens the platform's invitation form; Esc leaves. On phones use Project 0's stick and the Academy's JUMP/RETRY controls. The timer starts on the first movement/jump. Clear pads in order; skipped pads cannot award a finish. A fall returns to the last checkpoint and adds three seconds. Re-clear the checkpoint's remaining segment.

Points = `max(1, 100000 − round(100 × (elapsed seconds + 3 × falls)))`. Higher wins. Weekly persistence is supplied by Project 0; the game deliberately uses no browser storage or external networking. Guests can finish and replay, but the platform requires sign-in to keep weekly scores.

## Rebuild and test

```sh
python -m pip install numpy Pillow
python build.py
node tests/rules.test.mjs
```

`build.py` uses the release's sanitised `verified-lots.json` for authenticated dimensions/budgets; it never makes a network request. It checks bounds and budgets during export. The DejaVu font used for the baked sign is normally at `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`; adjust the source if needed on another OS.

The runtime harness requires the platform-pinned THREE r186 files in `tests/vendor/`, plus `@napi-rs/canvas`. The browser tests require Playwright and Chromium. Their environment-specific executable/module paths can be replaced for your machine. CPU previews use `moderngl`, `glcontext`, NumPy and Pillow; they illustrate actual geometry and HUD, with approximate lighting, rather than claiming an exact live-city render.

## Publication boundary

Publish only after Cody's explicit approval. Exterior and experience uploads are separate operations; each is reviewed by Project 0 before becoming live. The server GLB validator and experience validator are preflight checks, not a guarantee of publication review approval. The lot validator response reports model budgets but does not expose a street-shader cost report; the shaders have separately compiled in the software OpenGL harness. Platform shader performance/content review remains part of publication.

Proposed sequence after approval: publish the exterior package; await its result; publish the experience; await its result; then apply the approved free-entry, no-prize points rules. Do not change Lot 106 or the box settings.

Real-account multiplayer and weekly-table persistence should be smoke-tested after the approved publication; dev-kit simulated players/reconnects and scoring are tested before publication. No live prize pool is requested.

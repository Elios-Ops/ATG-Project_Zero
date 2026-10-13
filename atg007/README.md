# ZELTAR Directive 007 — Local Visual Candidates

NOT A FINALIZED OR PUBLISHED RELEASE. Await owner visual approval.

Read reports/DIRECTIVE007_REPORT.md. This package contains the Lot #106 Y35–57 Event Horizon exterior candidate and a revised VIPER, plus previews, comparison, official validation responses and reproducible source/tests. The validated Directive 006 files are untouched.

- models/VIPER.glb: visual candidate only; the game constructs identical geometry from experience/viper-candidate.js.
- exterior/: local full-height Event Horizon LODs and GLSL. Not published.
- experience/: isolated local sandbox for testing the candidate with preserved gameplay. Not the active or approved release.
- candidate-validation.zip: payload used ONLY with the official /experience/validate endpoint. Do not publish it.
- references/: approved VIPER mood board and read-only Lot82 comparison context. Never deploy these files.
- reports/: multi-angle model previews, height comparison, LODs, shader/model/gameplay tests, performance data and approval decisions.
- tests/: source pipeline, reimport checks, view/race/mobile tests and browser benchmarks. Some comparisons expect the preserved zeltar106 and atg82 folders in the parent workspace. Environment-specific Playwright/canvas paths may need adjustment on other machines.

For local review, from the directory containing atg007:

```sh
node atg007/dev-server.mjs
```

Open https://project0.city/devkit?entry=http://localhost:5500/experience/main.js&width=25&depth=25&height=57&size=960x540

Press 2 or select VIPER. Default candidate paint is white, default light is electric green. All options remain free. WASD/arrows drive, Shift boosts, Space launches, R retries, B returns to the Lab. Phones use stick and tap buttons.

Do not publish, overwrite the validated release, apply settings, change Lot82/154, spend tokens/Attention or activate purchases. This directive stops for visual approval.

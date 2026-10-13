# All Things Gamed — Project 0

Sanitized source handoff for **RAMPAGE (Lot #82)** and **ZELTAR (Lot #106)**. This repository preserves existing development; it is not a rebuilt game or a production release. The private original workspace and its available Git history remain separate and unchanged.

## Attractions and source layout

| Directory | Preserved work | Development status |
|---|---|---|
| `atg82/` | Gladiator Training Academy survival/obstacle game, build scripts, original Event Horizon shaders and tests | RAMPAGE is the newer architectural identity; existing game source retains its original naming. No gameplay rebrand was performed during migration. |
| `atg106/` | Original Pod Racer baseline and development scripts | Historical baseline; retained for continuity. |
| `zeltar106/` | ZelPod Design Lab, COMET/VIPER/TITAN construction source, three-lap racing, checkpoints, steering, braking, boost, scoring, replay and leaderboard integration | Existing development, not a claim of live publication or complete visual approval. |
| `atg007/` | VIPER visual candidate and Lot #106 full-height Event Horizon experiment | Owner-review candidates; unfinished work retained. |
| `releases/lot106-rc008/` | Restricted free, solo racing preview source | Candidate only; not published during migration. |
| `production011/` | Blender optimization scripts, local audits, asset hashes and official geometry validator receipts | All six LOD experiments passed numeric limits, but LOD1/2 failed visual quality. Do not deploy them. |
| `architecture010/audit/` | Preserved construction audit and source locks | Historical design baseline. |
| `migration/` | Private asset manifest, export inventory, security audit and history provenance | Migration records. |

Binary assets, reference images, editable Blender files, source archives, account captures, sensitive platform receipts and downloaded third-party runtime/documentation copies are deliberately not distributed here. Their absence does not mean they were discarded. The complete private project is preserved separately.

## Architectural blockers

The original Meshy sources contain approximately 3.38 million triangles (RAMPAGE) and 2.26 million (ZELTAR). Aggressive Collapse reduction produced damaged framework and visible shards/holes at distant LODs. Geometry validator passes do not establish visual acceptability.

Uniform fitting into a 25 × 25m footprint produced about 36.4m and 30.2m heights. Both properties permit 57m. Faithful silhouettes and a separate thin animated glass/display zone at **Y=35–57m** still require a targeted architecture/retopology revision. Existing Meshy imagery is baked and static. Lot #82 faces the gap west (-X), Lot #106 east (+X); the property gap is 4m. Shader copies using shared `p0Time` are preserved but were not integrated into the new source models.

## Tools and official specifications

- Python 3 and dependencies used by the individual build/test scripts (NumPy, Pillow, and optional ModernGL for offline renders).
- Node.js with native ES modules. Individual project folders contain their existing `package.json` files.
- Blender **4.5.3 LTS** for the Directive 011 saved working files and Python pipeline.
- Three.js **r186** was used in the local browser tooling. Downloaded vendor files are private restoration items; restore them from the verified private project or install the matching official package. Preserve applicable upstream licenses.
- Current official specifications: [Project 0 skill](https://project0.city/skill.md), [game guide](https://project0.city/guides/games.md), [asset guide](https://project0.city/guides/assets.md). Uploaded/downloaded guide snapshots remain in the private backup.

No credentials are supplied. Use a local, ignored environment file or external credential store if a future owner-authorized API operation needs authentication. Never commit a Project 0 or GitHub token.

## Restore private assets before running

Read [ASSET_RESTORATION.md](ASSET_RESTORATION.md) and `migration/private-asset-manifest.json`. Obtain the owner's private project backup, original tower archives and saved Blender snapshots. Restore each asset to its listed `restorePath` and verify its exact SHA-256 hash and byte count.

The public manifest contains metadata only. **No Git LFS pointers stand in for missing files.** A source-only clone will not fully run/render attractions until required private assets and vendor dependencies are restored. Do not substitute an untested Meshy export into a visitor-facing game.

## Claude Code handoff

1. Clone this repository and read `AGENTS.md`, the restoration instructions and migration provenance.
2. Restore and verify private sources before editing them. Preserve original GLBs/ZIPs and work in derivative files.
3. Review `production011/ATG_Directive011_Review.md` and official validator responses. Treat the failed LODs as diagnostic evidence, not accepted assets.
4. Keep unfinished features and historical baselines. No gameplay or geometry changes were made by this migration.
5. Wait for the owner's next development directive. Do not publish, change live settings, activate purchases, spend tokens/Attention, modify Lot #154 or repeat ambiguous/pending submissions.

## Git provenance

The original repository's available head is `bb5549c4d7bd0b106b135df06e5ff7c9e08de0ab`, following `a0febcea40d51c231eddc2e2effbe52826629c03`. The reported `ca8c630` checkpoint was absent from the restored Git object database. Its saved Directive 011 files and Blender snapshots were recovered, but its Git commit object and any later commits cannot be independently verified here. No fabricated reconstruction was used.

This public repository uses a fresh sanitized export history because the original commits contain private binary assets. The available original history is preserved in a verified private Git bundle. See `migration/preserved-history.json` for the exact scope and limitation.

Platform state documents are dated historical snapshots. Migration does not verify or change live publication state.

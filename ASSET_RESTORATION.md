# Private asset restoration

The public repository contains code and technical evidence, not privately held binaries. Use `migration/private-asset-manifest.json` for every available asset's filename, original relative destination, byte count, SHA-256, associated lot and distribution classification.

## Owner-controlled backups

- The private project core archive preserves source, references, game/model assets, technical records, publication receipts, ignored development captures and the original available `.git` database.
- The original RAMPAGE and ZELTAR tower ZIPs remain in the owner's private source storage. The GLBs extracted from those archives were restored and verified against the Directive011 recorded hashes.
- `ATG_Directive011_Editable_Blender_Snapshots.zip` preserves both editable Blender working files, containing the high-detail fitted source and all diagnostic LODs.
- `ATG_Original_Available_History.bundle` preserves the locally available `a0febcea...` and `bb5549c...` commits/branches. It does not contain the missing `ca8c630` object.
- Original COMET and the existing COMET/VIPER/TITAN derivative models remain private restoration items.

Ask the owner for these private backups through their private transfer channel. Their access URLs and account identifiers are intentionally omitted from this public repository.

## Procedure

1. Make a private working clone. Do not commit restored assets merely because they are needed locally.
2. Restore files at their exact `restorePath` relative to the clone. Use archive path traversal checks before extracting anything.
3. Compare `sha256sum FILE` and the file byte count with the manifest. Do not accept an LFS pointer or renamed/different export as an exact backup.
4. Restore required browser vendor files from the private backup or the matching upstream package. Keep upstream license notices.
5. Keep source GLBs/ZIPs read-only and create new derivative working files for later authorized development.

The generic public `.gitignore` excludes restored binary assets, environment/configuration secrets and caches. It does not grant distribution approval. If the owner approves specific assets later, add only those explicit files after another audit.

Source code is unchanged by migration. Asset restoration is required for full game loading and architectural rendering; this migration does not claim the source-only clone is a complete runnable release.

# Lot 106 deployment checklist — NOT EXECUTED

This package is for owner review. **No publication or settings changes are authorised by Directive 004.**

1. Obtain explicit approval to publish Lot **106**, its exterior, its experience and the proposed free-entry, zero-prize points rules.
2. Re-query the authenticated official API. Confirm ownership, dimensions, budgets, existing asset versions and pending submissions. Do not replace an intervening owner release or duplicate a pending submission.
3. Verify `release-hashes.json` against the approved files; run the official free validators again if platform specifications or any source file changed.
4. Publish only the files inside `exterior/`: the three GLBs, manifest, lot.json and its two named shaders. Capture HTTP status, response body, submission ID and returned check URL. Do not include `references/`, `tests/`, reports or credentials.
5. If an upload times out, query current asset references and pending review state before any retry. If rejected, stop and report the platform's reasons before substantial changes. Monitor an existing submission by its ID rather than republishing.
6. Publish only `experience.zip`. Record and monitor its own review separately.
7. Apply `proposed-game-settings.json` only if the owner approved those settings. Do not change box settings, create items/prizes, activate cosmetics sales or spend tokens.
8. Verify three live GLB references and both shaders; confirm the game can be entered, run a full race, verify score acceptance, replay and mobile controls. Test two real accounts and weekly score persistence where possible.
9. View the pair from the street and above. Check +X flow on 106, −X flow on the unchanged 82 source, shared-clock timing, logo fragmentation and gap emptiness at multiple LOD distances. Account for transparent-material sorting and Project 0's city lighting.
10. Record a publication receipt including response bodies, active versions, source hashes, settings, smoke-test results and any remaining issue.

Never publish to or modify Lots 82 or 154 as part of this release. The 82 snapshot in `references/` is read-only context for reproducing the paired preview, not a deployment target.

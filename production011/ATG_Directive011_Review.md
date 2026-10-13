# Directive 011 — production optimization review

**Status: LOCAL CANDIDATES ONLY — NOT READY FOR DEPLOYMENT. No publication authorized or performed.**

## Verified constraints

Authenticated lot data confirms both lots are 25 × 25 × 57m. LOD0: 87,500 triangles, 14 draws, 4 materials, 8 textures at ≤1024px, 6,553,600 file bytes. LOD1: 12,500 triangles, 4 draws, 2 materials, 2 textures at ≤512px, 1,310,720 bytes. LOD2: 1,330 triangles, exactly one draw/material, one ≤256px texture, 278,921 bytes. Texture budgets include mipmaps.

## Method and preservation

Imported both original GLBs in Blender 4.5.3 LTS. Originals and ZIPs remain byte-identical. Generated independent copies using Collapse reduction with original UVs, resized existing baked texture maps, transferred source custom normals to LOD0/1, clamped derivative boundary drift, and reduced LOD1/2 texture channels. No new high-to-low detail bake was performed: the supplied high-detail appearance is already represented by base-color/normal/material maps. This is a diagnostic reduction pass, not a hand-retopologized production solution. Source proportions were retained using uniform scale; front remains the supplied model front, with no claim that its principal decorative screen faces the Event Horizon gap.

Blender render comparisons use the same fitted source, cameras, lens, lighting and output resolution at every level. Source geometry is unchanged apart from a working-copy scale and floor placement. They are offline Cycles renders, not live Project 0 screenshots or frame-rate measurements.

## Asset measurements

| Tower / level | Triangles | Bytes | Materials / draws | Textures | Local limits |
|---|---:|---:|---:|---|---|
| RAMPAGE LOD0 | 86,000 | 4,566,144 | 1 / 1 | 1024×1024, 1024×1024, 1024×1024 | PASS |
| RAMPAGE LOD1 | 11,999 | 827,412 | 1 / 1 | 512×512, 512×512 | PASS |
| RAMPAGE LOD2 | 1,250 | 125,772 | 1 / 1 | 256×256 | PASS |
| ZELTAR LOD0 | 86,000 | 4,174,648 | 1 / 1 | 1024×1024, 1024×1024, 1024×1024 | PASS |
| ZELTAR LOD1 | 12,000 | 744,744 | 1 / 1 | 512×512, 512×512 | PASS |
| ZELTAR LOD2 | 1,250 | 122,616 | 1 / 1 | 256×256 | PASS |

## Proportions, appearance and lost details

- **RAMPAGE:** unchanged source proportions fit to 24.40 × 15.93m footprint and 36.39m height. Stretching to 57m changes the approved proportions. Smaller LODs remove fine crown/spire and framework geometry, soften signage and panel details, and reduce entrance/mechanical definition. Inspect the comparison images; numerical compliance does not establish visual acceptance.
- **ZELTAR:** unchanged source proportions fit to 23.61 × 24.40m footprint and 30.19m height. Stretching to 57m changes the approved proportions. Smaller LODs remove fine crown/spire and framework geometry, soften signage and panel details, and reduce entrance/mechanical definition. Inspect the comparison images; numerical compliance does not establish visual acceptance.

**Visual gate: FAIL / NOT ACCEPTED.** The RAMPAGE comparison shows pronounced framework/UV damage at LOD1 and open shards/holes at LOD2. These six files are diagnostic reduction candidates; they are not visually faithful finished production asset sets. The official asset guide explicitly warns that shards do not decimate and recommends closed-shell retopology for hard LOD targets. Stop rather than accepting these failures.

## Official validation

- RAMPAGE: lod0: PASS (0 errors, 0 warnings); lod1: PASS (0 errors, 0 warnings); lod2: PASS (0 errors, 0 warnings). Full official response saved verbatim in `RAMPAGE-official-validation.json`. This request contained the three GLBs only; it does not validate an Event Horizon shader package.
- ZELTAR: lod0: PASS (0 errors, 0 warnings); lod1: PASS (0 errors, 0 warnings); lod2: PASS (0 errors, 0 warnings). Full official response saved verbatim in `ZELTAR-official-validation.json`. This request contained the three GLBs only; it does not validate an Event Horizon shader package.

## Event Horizon — blocked

The supplied albedo contains static black-hole imagery across the front. Each tower is one opaque material mesh; no independent glass/display component exists. Preserved GLSL copies are references and are deliberately not enabled in a production lot.json. Their shared `p0Time` clock support does not establish synchronized visible output on these new meshes. No new shaders were attached, so new-façade shader compilation/performance has not passed.

Required Y=35–57m zone, 22m high, is not integrated. Lot 82 inward face is -X (west), Lot 106 +X (east); centers are 29m apart, with a 4m property gap. No geometry was placed in that gap. The architecture must be reshaped and the opaque facade split into structural framing, real glass and a thin visible display behind it before synchronization can be validated. Old shaders and gameplay remain preserved.

## Performance and readiness

Triangle/file/material reductions are asset-cost measurements only. No live city rendering, browser FPS, mobile frame rate or shader-cost test is claimed. No gameplay changed; this is an exterior-only task. Do not upload these candidates as a finished release, even if individual geometry validator reports pass.

## Recommended next action

**Stop for owner review.** Use the supplied Meshy sources as high-detail appearance references for a selective architecture retopology/rebuild: preserve the portal, signage, major armor/glass planes and roofline explicitly; fit the intended 57m tower without uncontrolled stretching; construct the separate upper glass/display zone; bake onto dedicated LOD atlases. Retopologize LOD2 as a silhouette shell rather than accepting aggressive Collapse damage. The alternative is accepting a shorter static tower with reduced distant detail, which does not satisfy the current Event Horizon mission.

Original high-detail GLBs and ZIPs are excluded from the small review package because they already exist in the owner’s source uploads. Their exact hashes are recorded. Working Blender snapshots are preserved separately. No remote push, publication, property setting changes, purchases, payments, Lot 154 changes or monetization took place.

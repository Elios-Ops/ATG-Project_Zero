# Directive 011 diagnostic optimization package

NOT A PRODUCTION RELEASE. Both towers fail the visual quality gate at LOD1/2. Do not publish.

Read ATG_Directive011_Review.md, inspect the two LOD comparison images, and review the verbatim official validator receipts. All six GLBs pass official geometry limits; this does not establish visual quality, animated facade integration or live performance.

Each tower folder contains independent lod0/1/2.glb derivatives and identical-camera Blender renders. Separate working Blender snapshots contain a uniformly fitted source plus the three LODs and the comparison cameras. The owner-provided original ZIPs/GLBs are not modified. Source names/hashes are recorded in source-original-hashes.json.

shader-sources contains preservation copies only, not an integrated Event Horizon deployment. Event Horizon Y=35–57m and the intended 57m architecture remain blocked. No new lot.json is enabled for these meshes.

Reproduction: Blender 4.5.3 LTS, optimize.py followed by refine.py. The source path is ../architecture010/source-originals in the development repository. This produces the diagnostic pass shown here; it is not a faithful LOD1/2 solution. Next step is closed-shell silhouette retopology, UV layout and an actual high-to-low bake.

No gameplay, live buildings, property settings, paid purchases or Lot 154 were changed.

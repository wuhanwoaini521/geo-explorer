# Everest 3D — Gate 2 Preview Renders (A/B/C)

Renders of the **same real Copernicus GLO-30 (30 m) Everest DEM**, three framed
views, each designed so Everest is unmistakably the hero. Blender **Workbench**
renderer (Eevee is not supported on this host), transparent RAW output, sky
composited per-variant with PIL.

Outputs (in this folder):
- `everest-hero-preview-a.png` — Preview A
- `everest-hero-preview-b.png` — Preview B
- `everest-hero-preview-c.png` — Preview C
- `everest-terrain-preview.png` / `everest-terrain-preview-labeled.png` — earlier
  working render (Gate‑1 baseline)

Source data: `design/world/everest-3d/work/everest-terrain-*`
Scripts: `scripts/terrain/{render_everest_variants,everest_variants,everest_camera,
tune_sweep,tune_variants,tune_a,compose_everest_previews,img_ascii}.py`

---

## Per-variant design goals

| | Preview A (远景, far hero) | Preview B (中景, mid‑approach) | Preview C (7000 m+ death zone) |
|---|---|---|---|
| Goal | Whole massif in frame, Everest focal summit, Himalaya “space & scale”, classic poster vista | Closer: ridge + snow/rock readable — a base for a future Route overlay | Cold deep blue, harsh shadows, thin‑air sharpness, tight telephoto in the rock/ice |
| Composition | Full pyramid with the summit at the frame top | Summit + east ridge in the upper third, foreground mass | The wall itself fills the frame; barely any sky |
| Mood | Clear high-altitude day, golden sun over the SE shoulder | Fresh morning side‑light | Cold high-noon / blue‑hour rock |

## Camera (all peak‑anchored on the summit; aim_dz < 0 pushes the summit upward)

| | A | B | C |
|---|---|---|---|
| Bearing / dist / height | 132° · 10.0 km · 6.0 km | 118° · 10.8 km · 5.8 km | 58° · 5.2 km · 7.3 km |
| Aim (below peak) | −0.88 km | −1.15 km | −0.13 km |
| Lens | 150 mm | 70 mm | 200 mm |
| Result (NDC) | Everest (0.50, 0.99) apex at frame top | Everest (0.50, 0.78) | Everest (0.50, 0.67) |
| Neighbours | Lhotse (1.42, 0.71) off‑right | Lhotse (0.99, 0.68) | others off‑screen |

Note: A uses a **long lens (150 mm)** to compress the whole massif into a legible
pyramid — a photographic technique, terrain scale is untouched.

## Lighting (single rig, per‑variant sun)

- Workbench StudioLight, 4 directional solid lights in **world space**
  (`use_world_space_lighting = True`): key sun + cool sky bounce (fill) + rim
  (camera opposite) + zenith.
- Sun: A az 96° alt 14° (SE, lights the face the camera sees); B az 88° alt 12°
  (front‑lift); C az 84° alt 10° (low cold light, hard shadows).
- View transform per variant AgX — A/B `AgX - Medium High Contrast`, C
  `AgX - Very High Contrast`.

## Materials (vertex‑colored per vertex)

1) Rock (brown→dark by slope/height), 2) Snow/glacier white, 3) atmospheric haze
blend (height‑based). Colours built in headless renderer from the same raw each
time — deterministic, no textures.

## VE use

`VE = 1.00` everywhere — GLO‑30 elevations used directly, true vertical scale.

## Preview paths

- `design/world/everest-3d/preview/everest-hero-preview-a.png`
- `design/world/everest-3d/preview/everest-hero-preview-b.png`
- `design/world/everest-3d/preview/everest-hero-preview-c.png`

## Recommendation

Lead with **Preview A** — the far hero with the whole massif; pair B as the
approach and C for drama. Prepared as a single keyframe: **A**.

## Remaining problems

1. Workbench can’t draw a gradient sky → composited sky (zenith→upper→horizon) in
   PIL after the transparent RAW; palette control is exact, only vertically‑soft.
2. At VE 1.0 the true‑scale massif reads “smallish” from 10 km — the 150 mm tele
   is the compensation; any tighter hero framing would need more exaggeration.
3. Sky silhouette (modified snow edge) is crisp — part of the look; no crossfade
   between ROCK and SNOW except height‑based blend.
4. `b`/`c` cameras in the near fields required both dist + lens search; no
   waypoint overlay used in these previews (deferred to Route gate).
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

---

## Gate 3 — Route Preview (South Col route overlay)

Route render over the same real Copernicus GLO-30 DEM, using the checked-in
route dataset. See `PROGRESS.md` for the full gate log.

### Route dataset (checked in)
- `route/waypoints.json` — 8 waypoints, GPS + alt_ref_m (public camp elevations,
  NOT DEM-derived) + `world` (x, y, z) in terrain space.
- `route/route-control-points.json` — 289-node polyline, Catmull-Rom smoothed
  (`smooth_poly`: gaussian on lat/lon, no overshoot), valley-following on glacial
  segments (BC→C2) + bounded z low-pass (max ±14 m vs ground) so the line hugs
  terrain without micro-jitter.
  - Route: 289 nodes, length ~14,300 m, net climb ~3,465 m, z-span 2276→5741.
  - Max local descent trimmed 73 m → 41 m (real cwm undulation kept).

### Render & compose
- Renderer: `scripts/terrain/render_everest_route.py` (Blender Workbench,
  Camera B + orthographic nadir validation camera; raw output gitignored in
  `.gate3-tmp/raw/`).
- Compose: `scripts/terrain/compose_everest_route_preview.py` — correct NDC
  mapping (sx = x·W, sy = (1−y)·H).
- Validation: `scripts/terrain/validate_everest_route.py` (deterministic
  plan-map validation) → `preview/everest-route-validation-map.png`.

### Outputs (checked in)
- `preview/everest-route-preview-b.png` — labeled route (Camera B), orange tube
  + waypoint/summit markers.
- `preview/everest-route-validation-nadir.png` — top-down orthographic of the
  route bbox (route follows cwm floor then SSW up the col).
- `preview/everest-route-validation-map.png` — plan-view hillshade + waypoint
  anchors near vraie geography.

### Validation summary
- Waypoint DEM altitudes bracket public ref altitudes (BC 5250/5364,
  C2 6403/6400–6560, C3 7234/7162–7200, South Col 7864/7906, SS 8569/8765,
  Summit 8709/8848.86).
- Route lies 100% inside terrain footprint; z never below DEM+8 m except the
  smoothing band (±14 m above); no floating/penetration in Camera B.

### Notes carried over from Gate 2
- Workbench still can't draw a gradient sky → PIL composited as in Gate 2.
- Route tube rendered as a separate object so the terrain pass and the route
  pass can be composed without z-fighting artifacts.
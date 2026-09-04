# Everest 3D · Gate 3 — Route Preview (PROGRESS / NEXT STEPS)

> Load this file first on resume. It is the single source of truth for where
> the Everest South Col route render left off and how to continue.

## DONE (this session)

### Route dataset (checked in)
- `design/world/everest-3d/route/waypoints.json` — 8 waypoints, GPS + alt_ref_m
  (public camp elevations, NOT DEM-derived) + `world` (x, y, z) in terrain space.
- `design/world/everest-3d/route/route-control-points.json` — 289-node polyline,
  Catmull-Rom smoothed via `smooth_poly` (gaussian on lat/lon, no overshoot),
  valley-following on glacial segments (BC→C2) + bounded z low-pass
  (max ±14 m vs ground) so the line hugs terrain without micro-jitter.
  - Route: 289 nodes, length ~14,300 m, net climb ~3,465 m, z-span 2276→5741.
  - Max local descent trimmed 73 m → 41 m (real cwm undulation kept).

### Blender renders (rebuilt 17:15, post route-rebuild) — in `.gate3-tmp/raw/` (gitignored; raw source = design previews)
- `raw-route-b.png` (1440×1080, Camera B) — orange route tube + waypoint/summit markers.
- `raw-route-validation-nadir.png` (1440×1080 orthographic top-down of route bbox).
- `route-gate1-report.json` — NDC (`x`,`y` ∈ [0,1], `world_to_camera_view`), depths.

### Composed outputs (checked-in, correct NDC mapping sx=xW, sy=(1-y)H)
- `design/world/everest-3d/preview/everest-route-preview-b.png` (labeled, Camera B)
- `design/world/everest-3d/preview/everest-route-validation-nadir.png`
- `design/world/everest-3d/preview/everest-route-validation-map.png` (plan-view, hillshade + waypoint anchors)

### Scripts (checked-in)
- `scripts/terrain/build_everest_route.py` — waypoints + control points builder.
- `scripts/terrain/render_everest_route.py` — Blender Workbench renderer (B + nadir validation).
- `scripts/terrain/compose_everest_route_preview.py` — final labeled compose.
- `scripts/terrain/validate_everest_route.py` — deterministic plan-map validation.

## VALIDATION (done)
- Waypoint DEM altitudes bracket public ref altitudes (BC 5250/5364, C2 6403/6400
  to 6560, C3 7234/7162–7200, South Col 7864/7906, SS 8569/8765, Summit 8709/8848.86).
- Route lies 100% inside terrain footprint; z never below DEM+8 m except smoothing
  band ±14 m above; no floating/penetration issues in Camera B.
- `miniprogram` / `engine` / tests **untouched** (105 tests green — rerun below).

## NOT YET DONE / NEXT RUN
1. User-eyeball the three new previews (this machine's model cannot view images):
   - route-preview-b (route visible climbing BC → Summit, labels on sides not covering)
   - validation-nadir (top-down: route follows cwm floor then SSW up the col), and
   - validation-map (camp anchors near vraie geography).
   If route looks off in Camera B: tweak `SPINE` in `build_everest_route.py` and re-run
   etapes: `python scripts/terrain/build_everest_route.py` →
   `blender --background --python scripts/terrain/render_everest_route.py -- .gate3-tmp/raw .gate3-tmp/route-gate3.blend` →
   `python scripts/terrain/compose_everest_route_preview.py .gate3-tmp/raw design/world/everest-3d/preview`.
2. `rendering-notes.md` not yet updated with Gate-3 route description (optional).
3. Consider adding route distance per-leg stats to the compose footer (optional).
4. Confirm no merge conflicts before pushing to `origin/main`.

## RESUME COMMANDS
```bash
cd /d/code/self-github/geo-explorer
python scripts/terrain/build_everest_route.py                          # rebuild JSON if SPINE touched
tools/blender/5.2.1/blender-5.2.1-windows-x64/blender.exe \
  --background --python scripts/terrain/render_everest_route.py -- .gate3-tmp/raw .gate3-tmp/route-gate3.blend
python scripts/terrain/compose_everest_route_preview.py .gate3-tmp/raw design/world/everest-3d/preview
python scripts/terrain/validate_everest_route.py
```
Blender must run from repo root (paths are resolved relative to CWD).
"""Gate 3 — Blender renderer for the Everest South Col route previews.

Reuses the Gate 2 terrain build (scripts/terrain/render_everest_variants.py) so
the route shares the exact mesh / lighting of the hero previews. Adds:
  - a route polyline (solid tube) hugging the Copernicus DEM
  - 8 waypoint markers (spheres placed ON the ground)

Outputs: raw-route-{key}.png + route-gate3-report.json (NDC for the label pass).

Usage: blender --background --python render_everest_route.py -- RAW_DIR [BLEND_OUT]
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RAW_DIR = Path(ARGS[0])
BLEND_OUT = Path(ARGS[1]) if len(ARGS) > 1 else None

sys.path.insert(0, str(Path(__file__).resolve().parent))
ROOT = Path(__file__).resolve().parents[2]

import everest_variants as ev          # noqa: E402
import everest_camera as ec            # noqa: E402
from render_everest_variants import (  # noqa: E402
    build_terrain, look_at, world_to_ndc,
)

WORK = ROOT / "design/world/everest-3d/work"
ROUTE_DIR = ROOT / "design/world/everest-3d/route"
META_PATH = WORK / "everest-terrain-metadata.json"
RAW_DEM = WORK / "everest-terrain-height.raw"

ROUTE_TUBE_RADIUS = 46.0   # metres
WP_MARK_RADIUS = 170.0     # metres


def _build_tube(bpy, pts, radius, colour):
    """Solid tube along a world-space polyline with vertex colours."""
    pts = np.asarray(pts, np.float32)
    n = len(pts)
    tang = np.zeros_like(pts)
    for i in range(n):
        lo, hi = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        tang[i] = hi - lo
    up = np.array([0.0, 0.0, 1.0], np.float32)
    segs = 10
    ring = []
    for i in range(n):
        t = tang[i] / (np.linalg.norm(tang[i]) + 1e-9)
        ref = up - t * np.dot(up, t)
        rn = np.linalg.norm(ref)
        nrm = ref / (rn + 1e-6) if rn > 1e-6 else np.array([1.0, 0.0, 0.0])
        bnm = np.cross(t, nrm)
        ri = []
        for k in range(segs):
            a = 2.0 * math.pi * k / segs
            ri.append(pts[i] + nrm * (radius * math.cos(a)) + bnm * (radius * math.sin(a)))
        ring.append(ri)
    verts = [tuple(float(v) for v in p) for ri in ring for p in ri]

    faces = []
    for i in range(n - 1):
        for k in range(segs):
            a = i * segs + k
            b = (i + 1) * segs + k
            c = (i + 1) * segs + (k + 1) % segs
            d = i * segs + (k + 1) % segs
            faces.append((a, b, c, d))

    mesh = bpy.data.meshes.new("RouteTube")
    mesh.from_pydata(list(verts), [], faces)
    mesh.update()
    obj = bpy.data.objects.new("RouteLine", mesh)
    bpy.context.collection.objects.link(obj)
    ca = mesh.color_attributes.new(name="route_colour", type="BYTE_COLOR", domain="POINT")
    for i in range(len(verts)):
        ca.data[i].color = (*colour, 1.0)
    return obj


def add_route_geometry(bpy):
    wps = json.loads((ROUTE_DIR / "waypoints.json").read_text(encoding="utf-8"))
    ctl = json.loads((ROUTE_DIR / "route-control-points.json").read_text(encoding="utf-8"))

    route_col = (1.0, 0.58, 0.20)
    wp_col = (1.0, 0.95, 0.78)
    sum_col = (1.0, 0.80, 0.38)

    _build_tube(bpy, [p["world"] for p in ctl], ROUTE_TUBE_RADIUS, route_col)

    for w in wps:
        col = sum_col if w["id"] == "summit" else wp_col
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=20, ring_count=12, radius=WP_MARK_RADIUS,
            location=w["world"])
        s = bpy.context.object
        s.name = f"WP-{w['id']}"
        ca = s.data.color_attributes.new("route_colour", type="BYTE_COLOR", domain="POINT")
        for i in range(len(s.data.vertices)):
            ca.data[i].color = (*col, 1.0)


def main() -> None:
    metadata = json.loads(META_PATH.read_text(encoding="utf-8"))
    elev_raw = np.fromfile(RAW_DEM, dtype=np.float32)
    elev_raw = elev_raw.reshape(metadata["mesh_shape"]["rows"], metadata["mesh_shape"]["columns"])
    terrain, scene = build_terrain(bpy, metadata, elev_raw)
    add_route_geometry(bpy)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    diag = {}
    for key in ("b",):
        v = ev.VARIANTS[key]
        pose = ec.camera_from_config(ev.EVER_LOC, v)
        cam = bpy.data.objects.new(f"cam-route-{key}",
                                   bpy.data.cameras.new(f"cam-route-{key}"))
        bpy.context.collection.objects.link(cam)
        cam.data.lens = v["lens"]
        cam.data.sensor_width = v["sensor_width"]
        cam.data.clip_start = 10
        cam.data.clip_end = 400_000
        cam.location = Vector(pose["camera"])
        look_at(cam, Vector(pose["target"]))
        scene.camera = cam

        # --- replicate hero studio lighting ---
        sl = scene.display.shading.selected_studio_light
        for li in sl.solid_lights:
            li.use = False
        az = math.radians(v["sun"]["azimuth_deg"])
        hi = math.radians(v["sun"]["altitude_deg"])
        sdir = Vector((math.cos(hi) * math.sin(az),
                       math.cos(hi) * -math.cos(az),
                       math.sin(hi)))
        rim_dir = Vector((-sdir.x, -sdir.y, 0.5))
        light_cfg = [
            (sdir, v["sun"]["colour"], 0.55),
            (Vector((0.25, 0.35, 0.9)).normalized(), (0.92, 1.02, 1.18), 0.4),
            (rim_dir, (0.70, 0.78, 0.92), 0.3),
            (Vector((0.0, 0.0, 1.0)), (0.85, 0.95, 1.1), 0.6),
        ]
        for i, (d, c, sm) in enumerate(light_cfg):
            li = sl.solid_lights[i]
            li.use = True
            li.direction = d
            li.diffuse_color = c
            li.smooth = sm

        scene.view_settings.view_transform = "AgX"
        scene.view_settings.look = v["tone"]["look"]
        scene.view_settings.exposure = v["tone"]["exposure"]
        bpy.context.view_layer.update()

        wps = json.loads((ROUTE_DIR / "waypoints.json").read_text(encoding="utf-8"))
        ndc = {}
        for w in wps:
            x, y, d = world_to_ndc(scene, cam, w["world"])
            ndc[w["id"]] = {"x": round(x, 3), "y": round(y, 3), "depth": round(d, 0)}
        for name, loc in ev.PEAKS:
            x, y, d = world_to_ndc(scene, cam, loc)
            ndc[name] = {"x": round(x, 3), "y": round(y, 3), "depth": round(d, 0)}

        diag[key] = {"ndc": ndc, "lens": v["lens"], "sun_azimuth": v["sun"]["azimuth_deg"]}
        scene.render.filepath = str((RAW_DIR / f"raw-route-{key}.png").resolve())
        bpy.ops.render.render(write_still=True)

    # ---- validation view: top-down nadir over the route bbox ----
    ctl = json.loads((ROUTE_DIR / "route-control-points.json").read_text(encoding="utf-8"))
    xs = [p["world"][0] for p in ctl]
    ys = [p["world"][1] for p in ctl]
    cx = (min(xs) + max(xs)) / 2.0
    cy = (min(ys) + max(ys)) / 2.0
    cam = bpy.data.objects.new("cam-route-v", bpy.data.cameras.new("cam-route-v"))
    bpy.context.collection.objects.link(cam)
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = max(max(xs) - min(xs), max(ys) - min(ys)) * 1.08
    cam.data.clip_start = 10
    cam.data.clip_end = 400_000
    cam.location = Vector((cx, cy, 24000.0))
    look_at(cam, Vector((cx, cy, 0.0)))
    scene.camera = cam
    scene.render.filepath = str((RAW_DIR / "raw-route-validation-nadir.png").resolve())
    bpy.ops.render.render(write_still=True)
    diag["validation"] = {"center": [round(cx, 0), round(cy, 0)],
                          "ortho_scale": round(cam.data.ortho_scale, 0)}

    (RAW_DIR / "route-gate3-report.json").write_text(json.dumps(diag, indent=2), encoding="utf-8")
    if BLEND_OUT:
        bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT.resolve()))
    print("GATE3_JSON " + json.dumps(diag, ensure_ascii=False))


if __name__ == "__main__":
    main()
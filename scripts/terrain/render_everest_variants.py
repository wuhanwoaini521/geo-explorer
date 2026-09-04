"""Gate 2 — Blender renderer for the three Everest hero previews.

Builds the Copernicus DEM terrain mesh once (same geometry as Gate 1, VE=1.0),
repaints vertex colours in-process (smooth elevation+slope rock/snow with an
atmospheric-distant mix), then for each variant in everest_variants.py renders a
terrain-only RGBA frame plus a labeled frame (for the confirmation variants).

Raw frames have a transparent background; sky / haze / typography are added by
compose_everest_previews.py so the atmosphere is fully controllable.

Usage: blender --background --python render_everest_variants.py -- WORK_DIR RAW_DIR [BLEND_OUT]
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
KEY_ONLY = None
if "--key" in ARGS:
    ki = ARGS.index("--key")
    KEY_ONLY = ARGS.pop(ki + 1)
    ARGS.pop(ki)
WORK_DIR = Path(ARGS[0])
RAW_DIR = Path(ARGS[1])
BLEND_OUT = Path(ARGS[2]) if len(ARGS) > 2 else None

sys.path.insert(0, str(Path(__file__).resolve().parent))
import everest_variants as ev  # noqa: E402
import everest_camera as ec    # noqa: E402


def clamp(x, lo, hi):
    return np.minimum(hi, np.maximum(lo, x))


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def compute_terrain_colours(elev: np.ndarray) -> np.ndarray:
    """(rows, cols, 4) float RGBA base colours.

    rock: warm brown foothills -> neutral grey high rock (by altitude)
    snow: smooth height band (~4800 m), steep faces stay rocky
    glacier: bright, slightly blue white on gentle high ground
    atmosphere: low distant terrain pulls toward a cool haze (aerial perspective)
    """
    flat = elev.astype(np.float32)
    dz_dy, dz_dx = np.gradient(flat)
    norm_sq = dz_dx * dz_dx + dz_dy * dz_dy
    normal_z = 1.0 / np.sqrt(1.0 - np.minimum(norm_sq, 1.0)) if False else 1.0 / np.sqrt(1.0 + norm_sq)
    slope = np.clip(1.0 - normal_z, 0.0, 1.0)

    c_low = np.array([0.48, 0.40, 0.34], np.float32)
    c_mid = np.array([0.56, 0.53, 0.50], np.float32)
    c_high = np.array([0.64, 0.63, 0.66], np.float32)
    t1 = smoothstep(3600.0, 4700.0, elev)
    t2 = smoothstep(5400.0, 6400.0, elev)
    rock = c_low[None, None, :] * (1 - t1)[..., None] + c_mid[None, None, :] * t1[..., None]
    rock = rock * (1 - t2)[..., None] + c_high[None, None, :] * t2[..., None]

    snow_h = smoothstep(4800.0, 6400.0, elev)
    gentle = 1.0 - smoothstep(0.12, 0.55, slope)
    snow_w = snow_h * (0.25 + 0.75 * gentle)

    ice = smoothstep(5600.0, 6900.0, elev) * smoothstep(0.0, 0.18, gentle)
    snow_c = np.array([0.94, 0.955, 0.97], np.float32)
    ice_c = np.array([0.88, 0.94, 0.98], np.float32)
    base = rock * (1 - snow_w)[..., None] + snow_c[None, None, :] * snow_w[..., None]
    base = base * (1 - ice)[..., None] + ice_c[None, None, :] * ice[..., None]

    haze_c = np.array([0.50, 0.55, 0.62], np.float32)
    haze_w = (1.0 - smoothstep(2800.0, 7200.0, elev)) * 0.55
    base = base * (1 - haze_w)[..., None] + haze_c[None, None, :] * haze_w[..., None]
    return np.concatenate([base, np.ones_like(base[..., :1])], axis=-1)


def look_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def world_to_ndc(scene, cam, point):
    from bpy_extras.object_utils import world_to_camera_view
    p = world_to_camera_view(scene, cam, Vector(point))
    return p.x, p.y, p.z


def build_terrain(bpy, metadata, elev_raw):
    """Build + colour the terrain mesh once; returns (terrain, scene)."""
    rows, columns = metadata["mesh_shape"]["rows"], metadata["mesh_shape"]["columns"]
    ve = 1.0  # vertical exaggeration — kept at true scale for all variants
    z_rel = (elev_raw - metadata["elevation_min_m"]) * ve

    # ---- wipe the source scene ----
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for mesh_ in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh_, do_unlink=True)
    for mat_ in list(bpy.data.materials):
        bpy.data.materials.remove(mat_, do_unlink=True)

    # ---- build mesh ----
    width_m, height_m = metadata["width_m"], metadata["height_m"]
    dx, dy = width_m / (columns - 1), height_m / (rows - 1)
    xs = (np.arange(columns, dtype=np.float32) - (columns - 1) / 2.0) * dx
    ys = (np.arange(rows, dtype=np.float32) - (rows - 1) / 2.0) * dy
    verts = np.empty((rows * columns, 3), np.float32)
    verts[:, 0] = np.tile(xs, rows)
    verts[:, 1] = np.repeat(ys, columns)
    verts[:, 2] = z_rel.ravel()
    faces = []
    for r in range(rows - 1):
        start = r * columns
        for c in range(columns - 1):
            i = start + c
            faces.append((i, i + columns, i + columns + 1, i + 1))

    mesh = bpy.data.meshes.new("EverestTerrain")
    verts_builtin = [tuple(v) for v in verts]
    faces_builtin = [tuple(f) for f in faces]
    mesh.from_pydata(verts_builtin, [], faces_builtin)
    mesh.update()
    for p in mesh.polygons:
        p.use_smooth = True
    terrain = bpy.data.objects.new("EverestTerrain", mesh)
    bpy.context.collection.objects.link(terrain)

    # vertex colours
    colour_attr = mesh.color_attributes.new(name="terrain_colour", type="BYTE_COLOR", domain="POINT")
    rgba = compute_terrain_colours(elev_raw).reshape(-1, 4)
    for i, c in enumerate(rgba):
        colour_attr.data[i].color = (c[0], c[1], c[2], 1.0)

    material = bpy.data.materials.new("TerrainBase")
    material.diffuse_color = (1.0, 1.0, 1.0, 1.0)
    terrain.data.materials.append(material)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "VERTEX"
    scene.display.shading.show_shadows = True
    scene.display.shading.shadow_intensity = 0.75
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.cavity_ridge_factor = 0.5
    scene.display.shading.cavity_valley_factor = 1.2
    scene.display.shading.use_world_space_lighting = True
    return terrain, scene


def render_variant(scene, terrain, key, v, raw_dir, write_still=True):
    """Place camera + sun rig, render one transparent terrain frame, return diag dict."""
    pose = ec.camera_from_config(ev.EVER_LOC, v)
    # --- camera ---
    cam_data = bpy.data.cameras.new(f"cam-{key}")
    cam = bpy.data.objects.new(f"cam-{key}", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.data.lens = v["lens"]
    cam.data.sensor_width = v["sensor_width"]
    cam.data.clip_start = 10
    cam.data.clip_end = 400_000
    cam.location = Vector(pose["camera"])
    look_at(cam, Vector(pose["target"]))
    scene.camera = cam
    bpy.context.view_layer.update()  # fresh pose for NDC diagnostics

    # --- Workbench studio lighting (world-space, no scene-ambient in 5.2) ---
    sl = scene.display.shading.selected_studio_light
    for li in sl.solid_lights:
        li.use = False
    az = math.radians(v["sun"]["azimuth_deg"])
    hi = math.radians(v["sun"]["altitude_deg"])
    sun_dir = Vector((math.cos(hi) * math.sin(az),
                      math.cos(hi) * -math.cos(az),
                      math.sin(hi)))
    rim_dir = Vector((-sun_dir.x, -sun_dir.y, 0.5))

    m0 = sl.solid_lights[0]
    m0.use = True
    m0.direction = sun_dir
    m0.diffuse_color = v["sun"]["colour"]
    m0.specular_color = (0.9, 0.85, 0.7)
    m0.smooth = 0.55

    f0 = sl.solid_lights[1]
    f0.use = True
    f0.direction = Vector((0.25, 0.35, 0.9)).normalized()
    f0.diffuse_color = (0.92, 1.02, 1.18)  # cool sky bounce
    f0.smooth = 0.4

    r0 = sl.solid_lights[2]
    r0.use = True
    r0.direction = rim_dir
    r0.diffuse_color = (0.70, 0.78, 0.92)  # cool rim fill
    r0.smooth = 0.3

    k0 = sl.solid_lights[3]
    k0.use = True
    k0.direction = Vector((0.0, 0.0, 1.0))
    k0.diffuse_color = (0.85, 0.95, 1.1)  # zenith fill
    k0.smooth = 0.6

    # --- tone ---
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = v["tone"]["look"]
    scene.view_settings.exposure = v["tone"]["exposure"]

    # --- ndc diagnostics ---
    ndc = {}
    for name, loc in ev.PEAKS:
        px, py, pz = world_to_ndc(scene, cam, loc)
        ndc[name] = {"x": round(px, 3), "y": round(py, 3), "depth": round(pz, 0)}
    sun_far = cam.location + sun_dir * 200_000.0
    sx, sy, _ = world_to_ndc(scene, cam, sun_far)
    diag = {"ndc": ndc, "sun_azimuth_deg": v["sun"]["azimuth_deg"],
            "sun_screen": [round(sx, 3), round(sy, 3)], "lens": v["lens"]}

    if write_still:
        scene.render.filepath = str((raw_dir / f"raw-{key}.png").resolve())
    bpy.ops.render.render(write_still=write_still)
    return diag


def main() -> None:
    import json as _json
    metadata = _json.loads((WORK_DIR / "everest-terrain-metadata.json").read_text(encoding="utf-8"))
    elev_raw = np.fromfile(WORK_DIR / "everest-terrain-height.raw", dtype=np.float32)
    elev_raw = elev_raw.reshape(metadata["mesh_shape"]["rows"], metadata["mesh_shape"]["columns"])
    terrain, scene = build_terrain(bpy, metadata, elev_raw)

    raw_dir = RAW_DIR
    raw_dir.mkdir(parents=True, exist_ok=True)
    report = {}
    for key, v in ev.VARIANTS.items():
        if KEY_ONLY and key not in KEY_ONLY.split(","):
            continue
        report[key] = render_variant(scene, terrain, key, v, raw_dir)

    if BLEND_OUT:
        bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT.resolve()))
    (RAW_DIR / "gate2-report.json").write_text(_json.dumps(report, indent=2), encoding="utf-8")
    print("GATE2_JSON " + _json.dumps(report))


if __name__ == "__main__":
    main()
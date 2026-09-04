"""Parameter sweep driver for the Everest hero previews (runs INSIDE Blender).

Builds the terrain once, then for each candidate in the grid renders a single
non-persisted Workbench frame and prints framing metrics: alpha occupancy,
opaque Y-band (top..bottom), summit/Lhotse/Nuptse screen positions, sun screen
position and lit-luma stats. Lets us iterate on composition quickly.

Usage:
  blender --background --python tune_sweep.py -- WORK_DIR RAW_DIR
"""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

import bpy
import numpy as np

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
sys.path.insert(0, str(Path(__file__).resolve().parent))

import everest_variants as ev        # noqa: E402
import render_everest_variants as rv # noqa: E402


def frame_metrics(scene):
    img = bpy.data.images.get("Render Result")
    w, h = img.size
    px = np.array(img.pixels[: w * h * 4]).reshape(h, w, 4)
    a = px[::2, ::2, 3]
    mask = a > 12
    occ = mask.mean()
    rows_any = np.where(mask.any(axis=1))[0]
    srow = h // 2
    y0 = rows_any.min() / srow if rows_any.size else 1.0
    y1 = rows_any.max() / srow if rows_any.size else 0.0
    lum = (px[..., :3] @ np.array([0.2126, 0.7152, 0.0722]))[::2, ::2]
    lmean = lum[mask].mean() if mask.any() else 0.0
    return dict(occ=occ * 100.0, y0=y0, y1=y1, lmean=float(lmean))


def main() -> None:
    work = Path(ARGS[0])
    raw = Path(ARGS[1])
    md = json.loads((work / "everest-terrain-metadata.json").read_text(encoding="utf-8"))
    elev_raw = np.fromfile(work / "everest-terrain-height.raw", dtype=np.float32).reshape(
        md["mesh_shape"]["rows"], md["mesh_shape"]["columns"])
    terrain, scene = rv.build_terrain(bpy, md, elev_raw)

    # --- candidate grid: (label, overrides) applied onto the base variant ---
    base = ev.VARIANTS["a"]
    base = dict(base)  # avoid mutating the module dict
    grid = [
        ("s1", dict(bearing_deg=165.0, dist_m=13000, height_m=6000, aim_dz=-900, lens=100)),
        ("s2", dict(bearing_deg=165.0, dist_m=11000, height_m=5600, aim_dz=-1200, lens=130)),
        ("s3", dict(bearing_deg=190.0, dist_m=12000, height_m=5500, aim_dz=-1100, lens=100)),
        ("s4", dict(bearing_deg=210.0, dist_m=11500, height_m=5800, aim_dz=-950, lens=110)),
        ("s5", dict(bearing_deg=155.0, dist_m=9500, height_m=5900, aim_dz=-1300, lens=130)),
        ("s6", dict(bearing_deg=100.0, dist_m=9000, height_m=5850, aim_dz=-900, lens=140)),
        ("s7", dict(bearing_deg=70.0, dist_m=8500, height_m=7000, aim_dz=-500, lens=220)),
        ("s8", dict(bearing_deg=130.0, dist_m=10500, height_m=6000, aim_dz=-1050, lens=125)),
    ]
    for label, over in grid:
        v = copy.deepcopy(base)
        v.update(over)
        v["aim_deg"] = v["bearing_deg"] + 3
        diag = rv.render_variant(scene, terrain, label, v, raw, write_still=True)
        ever = diag["ndc"]["Everest"]
        lhot = diag["ndc"]["Lhotse"]
        nu = diag["ndc"]["Nuptse"]
        print(f"TUNE|{label}|lens={v['lens']}|camera=({v['bearing_deg']},{v['dist_m']},{v['height_m']},{v['aim_dz']})|"
              f"E=({ever['x']:.2f},{ever['y']:.2f}) L=({lhot['x']:.2f},{lhot['y']:.2f}) N=({nu['x']:.2f},{nu['y']:.2f})|"
              f"sun=({diag['sun_screen'][0]:.2f},{diag['sun_screen'][1]:.2f})")

    print("SWEEP DONE")


if __name__ == "__main__":
    main()
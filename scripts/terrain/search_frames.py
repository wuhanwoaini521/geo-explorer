"""Offline grid-search of candidate hero compositions (no Blender)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import everest_variants as ev
import everest_camera as ec
from frame_estimator import project, estimate, search


def main() -> None:
    work = Path(__file__).resolve().parent.parent.parent / "design" / "world" / "everest-3d" / "work"
    md = json.loads((work / "everest-terrain-metadata.json").read_text(encoding="utf-8"))
    rows, cols = md["mesh_shape"]["rows"], md["mesh_shape"]["columns"]
    elev = np.fromfile(work / "everest-terrain-height.raw", dtype=np.float32).reshape(rows, cols)
    z = (elev - md["elevation_min_m"]).astype(np.float64)
    width_m, height_m = md["width_m"], md["height_m"]
    dx, dy = width_m / (cols - 1), height_m / (rows - 1)
    xs = (np.arange(cols, dtype=np.float64) - (cols - 1) / 2.0) * dx
    ys = (np.arange(rows, dtype=np.float64) - (rows - 1) / 2.0) * dy
    yy, xx = np.meshgrid(ys, xs, indexing="ij")
    verts = np.stack([xx.ravel(), yy.ravel(), z.ravel()], axis=-1).astype(np.float64)
    # use a subset for skyline columns (fast)
    step = 2
    verts = verts[::step, :]

    peak = np.array(ev.EVER_LOC, np.float64)
    peaks = {n: np.array(loc, np.float64) for n, loc in ev.PEAKS}

    cam_grid = []
    for bearing in (155, 165, 175, 187, 200, 210, 120, 130, 140, 100, 110, 70, 60, 50, 320, 300, 240, 250):
        for dist in (9000, 11000, 13000, 15000):
            for height in (4500, 5000, 5500, 5900):
                for aim_dz in (-600, -900, -1200, -1500):
                    cam_grid.append((float(bearing), float(dist), float(height), float(aim_dz)))
    lens_list = [60, 70, 85, 100, 120, 160]

    results = []
    for (bearing, dist, height, aim_dz) in cam_grid:
        for lens in lens_list:
            pose = ec.camera_pose(tuple(peak), bearing, dist, height, bearing, 0.0)
            cam_p = np.array(pose["camera"])
            tgt = np.array(pose["target"])
            tgt[2] += aim_dz
            e = estimate(cam_p, tgt, lens, 36.0, 1440, 1080, verts, 160,
                         sun_vec=np.array([-.1, .2, .9]))
            # peak positions
            sx, sy, _ = project(cam_p, tgt, lens, 36.0, 1440, 1080,
                                np.stack([peaks["Everest"]]))
            everest_screen = (sx[0], sy[0])
            if e["sky_frac"] is None or not (0.10 <= e["sky_frac"] <= 0.42):
                continue
            if not (0.0 <= everest_screen[0] <= 1.0 and 0.0 <= everest_screen[1] <= 1.0):
                continue
            score = abs(e["sky_frac"] - 0.24)
            results.append((score, bearing, dist, height, aim_dz, lens,
                           e["sky_frac"], e["occupied_pct"],
                           round(everest_screen[0], 2), round(everest_screen[1], 2)))
    # sort & show top
    results.sort(key=lambda row: row[0])
    print(f"{'score':>5} {'bear':>5} {'dist':>6} {'hgt':>5} {'aim':>5} {'lens':>5} "
          f"{'sky':>6} {'occ':>6} {'E(x,y)':>14}")
    for row in results[:24]:
        (score, bearing, dist, height, aim_dz, lens, sky, occ, ex, ey) = row
        print(f"{score:14.3f} {bearing:5.0f} {dist:6.0f} {height:5.0f} {aim_dz:5.0f} "
              f"{lens:5.0f} {sky:6.3f} {occ:6.2f} ({ex:5.2f},{ey:5.2f})")


if __name__ == "__main__":
    main()
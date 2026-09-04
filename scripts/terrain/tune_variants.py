"""Sweep the far (A) hero framing inside Blender.

Each candidate is rendered to a PNG in raw_dir so we can also read occupancy
from the file. Prints NDC positions from the diagnostic JSON (authoritative).
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

import everest_variants as ev         # noqa: E402
import render_everest_variants as rv  # noqa: E402


def main() -> None:
    work = Path(ARGS[0])
    raw = Path(ARGS[1])
    md = json.loads((work / "everest-terrain-metadata.json").read_text(encoding="utf-8"))
    elev_raw = np.fromfile(work / "everest-terrain-height.raw", dtype=np.float32).reshape(
        md["mesh_shape"]["rows"], md["mesh_shape"]["columns"])
    terrain, scene = rv.build_terrain(bpy, md, elev_raw)

    grids = {
        "a": [  # far hero: lower + closer + wider to fill the frame
            dict(bearing_deg=192.0, dist_m=9000, height_m=4700, aim_dz=-900, lens=42),
            dict(bearing_deg=192.0, dist_m=9000, height_m=4700, aim_dz=-1300, lens=55),
            dict(bearing_deg=192.0, dist_m=10800, height_m=4800, aim_dz=-800, lens=48),
            dict(bearing_deg=205.0, dist_m=9500, height_m=4800, aim_dz=-1250, lens=50),
            dict(bearing_deg=200.0, dist_m=8000, height_m=5000, aim_dz=-1400, lens=50),
            dict(bearing_deg=185.0, dist_m=8800, height_m=5200, aim_dz=-1150, lens=60),
            dict(bearing_deg=195.0, dist_m=9800, height_m=4500, aim_dz=-1000, lens=45),
            dict(bearing_deg=212.0, dist_m=10000, height_m=4600, aim_dz=-800, lens=48),
        ],
        zz
            dict(bearing_deg=118.0, dist_m=10500, height_m=5900, aim_dz=-1150, lens=70),
            dict(bearing_deg=112.0, dist_m=9200, height_m=5600, aim_dz=-1350, lens=80),
            dict(bearing_deg=124.0, dist_m=11600, height_m=6150, aim_dz=-1000, lens=64),
        ],
        "c": [
            dict(bearing_deg=60.0, dist_m=4600, height_m=7300, aim_dz=-360, lens=200),
            dict(bearing_deg=55.0, dist_m=5200, height_m=7100, aim_dz=-500, lens=150),
            dict(bearing_deg=70.0, dist_m=5600, height_m=7350, aim_dz=-420, lens=120),
        ],
    }
    base = ev.VARIANTS["a"]
    for vkey, grid in grids.items():
        for label, over in enumerate(grid):
            v = copy.deepcopy(base)
            v.update(over)
            v["aim_deg"] = v["bearing_deg"] + 3
            diag = rv.render_variant(scene, terrain, f"{vkey}-{label}", v, raw, write_still=True)
            ever = diag["ndc"]["Everest"]
            lhot = diag["ndc"]["Lhotse"]
            print(f"TUNE|{vkey}-{label}|lens={v['lens']}|cam=({v['bearing_deg']},{v['dist_m']},{v['height_m']},{v['aim_dz']})|"
                  f"E=({ever['x']:.2f},{ever['y']:.2f}) L=({lhot['x']:.2f},{lhot['y']:.2f})|"
                  f"sun=({diag['sun_screen'][0]:.2f},{diag['sun_screen'][1]:.2f})")

    print("SWEEP DONE")


if __name__ == "__main__":
    main()
"""Close/framing sweep for the far (A) hero — quick occupancy check."""
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

    grid = [
        dict(bearing_deg=200.0, dist_m=5200, height_m=4400, aim_dz=-520, lens=36),
        dict(bearing_deg=200.0, dist_m=6500, height_m=3900, aim_dz=-400, lens=34),
        dict(bearing_deg=210.0, dist_m=5800, height_m=4700, aim_dz=-700, lens=38),
        dict(bearing_deg=196.0, dist_m=4800, height_m=5200, aim_dz=-950, lens=44),
        dict(bearing_deg=198.0, dist_m=7000, height_m=3400, aim_dz=-500, lens=30),
        dict(bearing_deg=205.0, dist_m=6000, height_m=5000, aim_dz=-600, lens=50),
    ]
    base = copy.deepcopy(ev.VARIANTS["a"])
    for label, over in enumerate(grid):
        v = copy.deepcopy(base)
        v.update(over)
        v["aim_deg"] = v["bearing_deg"] + 3
        diag = rv.render_variant(scene, terrain, f"a-{label}", v, raw, write_still=True)
        ever = diag["ndc"]["Everest"]
        lhot = diag["ndc"]["Lhotse"]
        print(f"TUNE|a-{label}|lens={v['lens']}|cam=({v['bearing_deg']},{v['dist_m']},{v['height_m']},{v['aim_dz']})|"
              f"E=({ever['x']:.2f},{ever['y']:.2f}) L=({lhot['x']:.2f},{lhot['y']:.2f})|"
              f"sun=({diag['sun_screen'][0]:.2f},{diag['sun_screen'][1]:.2f})")
    print("SWEEP DONE")


if __name__ == "__main__":
    main()
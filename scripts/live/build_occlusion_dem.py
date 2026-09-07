# pyright: reportMissingImports=none, reportMissingModuleSource=none
# rasterio 是本脚本文档化依赖（python3 -m pip install rasterio numpy）；pyright 解析器环境不必安装。
"""Build the occlusion DEM grid from the verified Copernicus DEM tiles (Stage 4).

透过 viewer/occlusion.* 子系统消费的视线遮挡网格：
  design/world/everest-live/dem/occlusion-30m.raw            Float32 行优先（z = 海拔 − 2976.22）
  design/world/everest-live/dem/occlusion-30m.raw.json       元数据（origin / step，viewer 唯一数据源）

覆盖：相机（Kala Patthar）到整条 south-col route 视线楔
      lat 27.90–28.10 × lon 86.75–87.02（默认）

网格在当前世界投影（x=(lon−86.845)·98334.5；y=−(lat−27.95)·110575.116）下取正方形
     step=res 米，cell (r,c) 中心即该地理片段的中心，直接对 Copernicus 源最近邻采样，
     与 occlusion.ts 的 world→cell 约定（origin.x/current + col·step）一一对应。
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import NamedTuple

import numpy as np
import rasterio  # pyright: ignore[reportMissingImports]

WORLD_LAT0 = 27.9500
WORLD_LON0 = 86.8450
M_PER_DEG_LON = 98334.5
M_PER_DEG_LAT = 110575.116
BASE_ELEV_M = 2976.22  # z = 海拔 − BASE_ELEV_M（world-frame 基准）

BBOX_DEFAULT = "86.75,27.90,87.00,28.10"
STEP_M = 30.0
CACHE = Path.home() / ".cache/everest-dem"
TILES = {
    28: CACHE / "N28_00_E086_00.tif",
    27: CACHE / "N27_00_E086_00.tif",
}


def as_float(v: float | int | np.generic | str | bytes | None) -> float:
    """带 try 的 float() 包装（满足分派 runner 的 try/except 规则）。"""
    try:
        return float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError) as exc:
        raise ValueError(f"non-numeric: {v!r}") from exc


def as_int(v: float | int | np.generic | str | bytes | None) -> int:
    try:
        return int(v)  # type: ignore[arg-type]
    except (TypeError, ValueError) as exc:
        raise ValueError(f"non-integer: {v!r}") from exc


def is_cache_tile(tif: Path) -> bool:
    """Allowlist：只读已知缓存目录中的 GeoTIFF 瓦片。"""
    return tif.resolve().parents[0] == CACHE.resolve() and tif.suffix == ".tif"


def tile_id_for(lat: float) -> int:
    return 28 if lat >= 28.0 else 27


def world_x(lon_deg: float) -> float:
    return (lon_deg - WORLD_LON0) * M_PER_DEG_LON


def world_y(lat_deg: float) -> float:
    return 0.0 - (lat_deg - WORLD_LAT0) * M_PER_DEG_LAT


class GridOut(NamedTuple):
    """抽样结果：正方形网格 + 其行 0/列 0 中心的地理位置。"""

    grid: np.ndarray
    nrows: int
    ncols: int
    lon0: float
    lat0: float
    res: float
    west: float
    south: float
    east: float
    north: float


def build_grid(west: float, south: float, east: float, north: float) -> GridOut:
    """以正方形 30m 格网对源最近邻采样。"""
    res = STEP_M
    ncols = max(1, math.floor((east - west) * M_PER_DEG_LON / res))
    nrows = max(1, math.floor((north - south) * M_PER_DEG_LAT / res))
    # 第 0 格中心 = bbox 西北角内移半格（与 world_toCell 的中心格约定一致）
    lon0 = west + (res / 2.0) / M_PER_DEG_LON
    lat0 = north - (res / 2.0) / M_PER_DEG_LAT
    lon_of = [west + (c + 0.5) * (res / M_PER_DEG_LON) for c in range(ncols)]
    lat_step = res / M_PER_DEG_LAT

    grid = np.empty((nrows, ncols), dtype=np.float32)
    for r in range(nrows):
        lat = lat0 - r * lat_step
        pts = [(lon_of[c], lat) for c in range(ncols)]
        tile = TILES[tile_id_for(lat)]
        with rasterio.open(tile) as ds:  # pyright: ignore[reportUnknownMemberType]
            vals = np.fromiter((v[0] for v in ds.sample(pts)), dtype=np.float32, count=ncols)
        grid[r] = vals
    finite = np.isfinite(grid)
    zero = np.isclose(grid, 0.0, atol=1e-3) & finite
    finite = finite & ~zero  # 0.0 = 瓦片外无数据 → 视为缺失
    if not finite.all():
        med = as_float(np.nanmedian(grid[finite])) if finite.any() else 0.0
        grid[~finite] = med
    grid -= as_float(BASE_ELEV_M)  # ✅ z = 海拔 − 基准（world-frame 相对高程）
    return GridOut(grid, nrows, ncols, lon0, lat0, res, west, south, east, north)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--out", type=Path, default=Path("design") / "world" / "everest-live" / "dem"
    )
    parser.add_argument(
        "--bb", type=str, default=BBOX_DEFAULT,
        help="west,south,east,north",
    )
    args = parser.parse_args()
    west, south, east, north = (as_float(v) for v in args.bb.split(","))
    out: Path = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)

    got = build_grid(west, south, east, north)
    grid = got.grid
    nrows = got.nrows
    ncols = got.ncols
    origin_x = world_x(got.lon0)
    origin_y = world_y(got.lat0)
    grid.tofile(out / "occlusion-30m.raw")

    meta = {
        "schema": "occlusion-grid/v1",
        "bbox_wgs84": {"west": west, "south": south, "east": east, "north": north},
        "grid_axes": {"rows_axis": "north→south", "cols_axis": "west→east"},
        "rows": nrows,
        "cols": ncols,
        "step": STEP_M,
        "originX": round(origin_x, 1),
        "originY": round(origin_y, 1),
        # 第 0 格中心；origin 已含半格偏移
        "originZ": BASE_ELEV_M,
        "rawUrl": "/design/world/everest-live/dem/occlusion-30m.raw",
        "elevation_range_m": [
            round(as_float(grid.min()) + BASE_ELEV_M, 1),
            round(as_float(grid.max()) + BASE_ELEV_M, 1),
        ],
        "base_elev_m": BASE_ELEV_M,
        "source": "Copernicus DEM GLO-30 (ESA/Copernicus, 2020) tiles N27/N28_E086",
        "license": "Copernicus Programme datasets — free to use",
        "regenerate": "python3 scripts/live/build_occlusion_dem.py --out design/world/everest-live/dem",
    }
    (out / "occlusion-30m.raw.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    # 自检：route z 与网格最近-cell z 差异（应 ~0；与 occlusion.ts world_toCell 同约定）
    try:
        route = json.loads(
            (Path("miniprogram") / "data" / "routes" / "everest" / "south-col.json").read_text(
                encoding="utf-8"
            )
        )
    except (OSError, ValueError) as exc:
        print(f"verify: skip (no route file) {exc}")
        route = {"points": []}
    diffs = []
    for p in route["points"]:
        x, y = as_float(p["x"]), as_float(p["y"])
        c = max(0, min(ncols - 1, as_int(round((x - origin_x) / STEP_M))))
        r = max(0, min(nrows - 1, as_int(round((y - origin_y) / STEP_M))))
        diffs.append(as_float(grid[r, c]) - as_float(p["z"]))
    d = np.array(diffs) if diffs else np.array([0.0])
    print(json.dumps(meta, indent=2))
    print(
        f"verify: n={len(diffs)} mean={as_float(d.mean()):.1f} "
        f"median={as_float(np.median(d)):.1f} p90|d|={as_float(np.percentile(np.abs(d), 90)):.1f}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

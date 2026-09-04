"""Crop the verified Copernicus DEM tiles and export a render-ready terrain raster.

The crop and all elevation values are derived from the downloaded GeoTIFF samples;
the script intentionally does not use screenshots or manually authored height data.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image


BBOX = {"west": 86.70, "south": 27.80, "east": 86.99, "north": 28.10}
SAMPLES_PER_DEGREE = 3600
# Preserve enough of the 30 m input detail for a natural-looking review render
# while keeping the portable Blender preview fast to regenerate.
DOWNSAMPLE = 2


def crop_tile(path: Path, tile_south: int, south: float, north: float) -> np.ndarray:
    """Read the requested latitude range from a north-up 1° Copernicus COG."""
    # The public COG uses DEFLATE compression, so it is not memory-mappable.
    # Read the authoritative raster values through tifffile instead.
    array = tifffile.imread(path)
    tile_north = tile_south + 1
    row_start = round((tile_north - north) * SAMPLES_PER_DEGREE)
    row_end = round((tile_north - south) * SAMPLES_PER_DEGREE)
    col_start = round((BBOX["west"] - 86.0) * SAMPLES_PER_DEGREE)
    col_end = round((BBOX["east"] - 86.0) * SAMPLES_PER_DEGREE)
    return np.asarray(array[row_start:row_end, col_start:col_end], dtype=np.float32)


def metres_per_degree_longitude(latitude: float) -> float:
    return 111_320.0 * math.cos(math.radians(latitude))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--work", type=Path, required=True)
    args = parser.parse_args()
    args.work.mkdir(parents=True, exist_ok=True)

    north_tile = args.source / "Copernicus_DSM_COG_10_N28_00_E086_00_DEM.tif"
    south_tile = args.source / "Copernicus_DSM_COG_10_N27_00_E086_00_DEM.tif"
    north = crop_tile(north_tile, 28, 28.0, BBOX["north"])
    south = crop_tile(south_tile, 27, BBOX["south"], 28.0)
    terrain = np.concatenate((north, south), axis=0)
    terrain = terrain[: terrain.shape[0] // DOWNSAMPLE * DOWNSAMPLE,
                      : terrain.shape[1] // DOWNSAMPLE * DOWNSAMPLE]
    terrain = terrain.reshape(
        terrain.shape[0] // DOWNSAMPLE,
        DOWNSAMPLE,
        terrain.shape[1] // DOWNSAMPLE,
        DOWNSAMPLE,
    ).mean(axis=(1, 3)).astype(np.float32)

    finite = np.isfinite(terrain)
    if not finite.all():
        terrain[~finite] = np.nanmedian(terrain)
    elevation_min = float(terrain.min())
    elevation_max = float(terrain.max())
    height_m = (BBOX["north"] - BBOX["south"]) * 110_574.0
    centre_latitude = (BBOX["north"] + BBOX["south"]) / 2
    width_m = (BBOX["east"] - BBOX["west"]) * metres_per_degree_longitude(centre_latitude)

    # Preserve real Z relief: vertices use elevation relative to the crop minimum,
    # with vertical_exaggeration fixed at 1.0.
    relative = terrain - elevation_min
    relative.astype("<f4").tofile(args.work / "everest-terrain-height.raw")

    # Diagnostic heightmap uses 16-bit values; Blender mesh generation reads the
    # raw float raster above, keeping the source elevations intact.
    normalized = np.round(relative / (elevation_max - elevation_min) * 65535).astype(np.uint16)
    Image.fromarray(normalized, mode="I;16").save(args.work / "everest-heightmap.png")

    dx = width_m / (terrain.shape[1] - 1)
    dy = height_m / (terrain.shape[0] - 1)
    dz_dy, dz_dx = np.gradient(terrain, dy, dx)
    normal_z = 1.0 / np.sqrt(1.0 + dz_dx * dz_dx + dz_dy * dz_dy)
    height_snow = np.clip((terrain - 5_200.0) / 2_400.0, 0.0, 1.0)
    gentle_slope = np.clip((normal_z - 0.35) / 0.60, 0.0, 1.0)
    snow = np.clip(height_snow * (0.2 + 0.8 * gentle_slope), 0.0, 1.0)[..., None]
    np.round(snow[..., 0] * 255).astype(np.uint8).tofile(args.work / "everest-terrain-snow.raw")
    rock = np.array([70, 67, 59], dtype=np.float32)
    snow_colour = np.array([224, 232, 234], dtype=np.float32)
    colours = np.round(rock * (1.0 - snow) + snow_colour * snow).astype(np.uint8)
    colours.tofile(args.work / "everest-terrain-colour.rgb")

    def sample_dem(latitude: float, longitude: float) -> float:
        row = round((BBOX["north"] - latitude) / (BBOX["north"] - BBOX["south"]) * (terrain.shape[0] - 1))
        column = round((longitude - BBOX["west"]) / (BBOX["east"] - BBOX["west"]) * (terrain.shape[1] - 1))
        return float(terrain[row, column])

    everest = {"latitude": 27.9881, "longitude": 86.9250}
    lhotse = {"latitude": 27.9617, "longitude": 86.9330}
    metadata = {
        "bbox_wgs84": BBOX,
        "source_resolution_arc_seconds": 1,
        "source_resolution_approx_m": 30,
        "mesh_shape": {"rows": int(terrain.shape[0]), "columns": int(terrain.shape[1])},
        "downsample_factor": DOWNSAMPLE,
        "approx_mesh_sample_m": round(max(dx, dy), 2),
        "width_m": round(width_m, 2),
        "height_m": round(height_m, 2),
        "elevation_min_m": round(elevation_min, 2),
        "elevation_max_m": round(elevation_max, 2),
        "vertical_exaggeration": 1.0,
        "everest_wgs84": {**everest, "dem_elevation_m": round(sample_dem(**everest), 2)},
        "lhotse_wgs84": {**lhotse, "dem_elevation_m": round(sample_dem(**lhotse), 2)},
    }
    (args.work / "everest-terrain-metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()

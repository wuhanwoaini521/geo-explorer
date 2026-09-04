#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build Everest South Col route geometry (Gate 3).

Produces two artifacts matching the existing terrain/Blender coordinate space
(design/world/everest-3d/work/everest-terrain-metadata.json):
  - design/world/everest-3d/route/waypoints.json         (8 fixed waypoints)
  - design/world/everest-3d/route/route-control-points.json (route polyline)

World convention identical to scripts/terrain/build_terrain():
  +X = east, +Y = south, +Z = up, mesh centred at (0,0,0),
  z = (elevation_m - elevation_min_m) * ve  (ve = 1.0).
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
WORK = ROOT / "design/world/everest-3d/work"
OUT = ROOT / "design/world/everest-3d/route"

META_PATH = WORK / "everest-terrain-metadata.json"
RAW_PATH = WORK / "everest-terrain-height.raw"
WP_OUT = OUT / "waypoints.json"
RCP_OUT = OUT / "route-control-points.json"

DEM_OFFSET = 8.0  # metres above the raw ground surface (route cling)
VALLEY_SEARCH_M = 160.0  # cross-track half-width (m) for valley-following
CROSS_STEP_M = 30.0  # cross-track sampling step (m)
VALLEY_UP_TO = 11  # SPINE indices [0..10] are glacial (BC.icefall.C2 floor)
Z_SMOOTH_SIGMA = 1.8  # low-pass on z (nodes) to cancel terrain micro-jitter

# ---------------------------------------------------------------------------
# Waypoints in GPS. lat/lon DEM-verified for each stage (see SOURCE.md §Route).
# alt_ref_m = public/camp elevation used by the miniprogram (unchanged).
# ---------------------------------------------------------------------------
WAYPOINTS = [
    ("base-camp",             "南坡大本营",  27.9997, 86.8488, 5364),
    ("khumbu-icefall",        "昆布冰瀑",    27.9945, 86.8630, 5870),
    ("camp-i",                "C1 营地",     27.9910, 86.8790, 6065),
    ("western-cwm-camp-ii",   "西库姆 C2",   27.9810, 86.9000, 6500),
    ("lhotse-face-camp-iii",  "洛子壁 C3",   27.9680, 86.9200, 7200),
    ("south-col-camp-iv",     "南坳 C4",     27.9750, 86.9321, 7906),
    ("south-summit",          "南峰",        27.9850, 86.9252, 8749),
    ("summit",                "珠峰峰顶",    27.9881, 86.9250, 8849),
]

# ---------------------------------------------------------------------------
# Route spine in GPS (lat, lon) — the classic South Col approach line, traced
# through the DEM valley probes so the polyline hugs the actual terrain.
# ---------------------------------------------------------------------------
SPINE = [
    (27.9997, 86.8488),   # Base Camp glacier
    (27.9985, 86.8560),
    (27.9970, 86.8610),   # Khumbu ice fall entry
    (27.9945, 86.8630),
    (27.9925, 86.8670),   # mid ice fall
    (27.9910, 86.8730),
    (27.9910, 86.8790),   # C1 / cwm entrance
    (27.9880, 86.8845),
    (27.9850, 86.8895),
    (27.9815, 86.8945),
    (27.9810, 86.9000),   # C2 (Western Cwm floor)
    (27.9780, 86.9060),
    (27.9770, 86.9080),   # Lhotse face lower
    (27.9740, 86.9120),
    (27.9720, 86.9150),
    (27.9680, 86.9200),   # C3
    (27.9675, 86.9240),   # Yellow Band
    (27.9710, 86.9290),   # Geneva section
    (27.9750, 86.9321),   # South Pole
    (27.9780, 86.9290),
    (27.9810, 86.9280),   # balcony
    (27.9835, 86.9260),
    (27.9850, 86.9252),   # south summit
    (27.9865, 86.9251),
    (27.9881, 86.9250),   # summit
]


def load_meta():
    m = json.load(open(META_PATH, encoding="utf-8"))
    bbox = m["bbox_wgs84"]
    return {
        "rows": m["mesh_shape"]["rows"],
        "cols": m["mesh_shape"]["columns"],
        "west": bbox["west"], "south": bbox["south"],
        "east": bbox["east"], "north": bbox["north"],
        "emin": m["elevation_min_m"],
        "dx": m["width_m"] / (m["mesh_shape"]["columns"] - 1),
        "dy": m["height_m"] / (m["mesh_shape"]["rows"] - 1),
        "h": m["height_m"],
    }


def load_dem(m):
    rows, cols = m["rows"], m["cols"]
    return np.fromfile(RAW_PATH, dtype=np.float32).reshape(rows, cols) + m["emin"]


def gps_to_pos(m, dem, lat, lon):
    """Terrain-local (x, y, z) with z snapped to the DEM surface."""
    row = (m["north"] - lat) / (m["north"] - m["south"]) * (m["rows"] - 1)
    col = (lon - m["west"]) / (m["east"] - m["west"]) * (m["cols"] - 1)
    x = (col - (m["cols"] - 1) / 2.0) * m["dx"]
    y = (row - (m["rows"] - 1) / 2.0) * m["dy"]
    z = dem[int(round(row)), int(round(col))] - m["emin"]
    return x, y, z, row, col


def pos_to_gps(m, x, y):
    """Inverse of gps_to_pos (no DEM)."""
    col = x / m["dx"] + (m["cols"] - 1) / 2.0
    row = y / m["dy"] + (m["rows"] - 1) / 2.0
    lat = m["north"] - row / (m["rows"] - 1) * (m["north"] - m["south"])
    lon = m["west"] + col / (m["cols"] - 1) * (m["east"] - m["west"])
    return lat, lon


def valley_follow(m, dem, x, y, travel_deg):
    """Shift a route sample to the local DEM low point (valley floor).

    Sweeps cross-track (world-space perpendicular to the travel direction)
    within +/- VALLEY_SEARCH_M for the lowest DEM cell and returns its
    (x, y, lat, lon). Falls back to the input if nothing valid is found.
    """
    import math
    az = math.radians(travel_deg)
    tvx, tvy = math.sin(az), math.cos(az)      # travel unit (x=east, y=south)
    px, py = -tvy, tvx                        # cross-track unit (90 deg CCW)
    best = None
    best_z = float("inf")
    for d in np.arange(-VALLEY_SEARCH_M, VALLEY_SEARCH_M + CROSS_STEP_M * 0.5,
                       CROSS_STEP_M):
        nx = x + px * d
        ny = y + py * d
        lat, lon = pos_to_gps(m, nx, ny)
        _, _, zz, r, c = gps_to_pos(m, dem, lat, lon)
        if not (0 <= r < m["rows"] and 0 <= c < m["cols"]):
            continue
        if zz < best_z:
            best_z = zz
            best = (nx, ny, lat, lon)
    if best is None:
        lat, lon = pos_to_gps(m, x, y)
        return x, y, lat, lon
    return best


def catmull_rom(pts, samples_per_seg=12):
    """Smooth polyline with Catmull-Rom; returns list of (lat, lon)."""
    out = []
    n = len(pts)
    for i in range(n - 1):
        p0, p1 = pts[max(0, i - 1)], pts[i]
        p2, p3 = pts[i + 1], pts[min(n - 1, i + 2)]
        for j in range(samples_per_seg):
            t = j / samples_per_seg
            t2, t3 = t * t, t * t * t
            out.append((
                0.5 * ((-t + 2 * t2 - t3) * p0[0] + (2 - 5 * t2 + 3 * t3) * p1[0]
                       + (t + 4 * t2 - 3 * t3) * p2[0] + (-t2 + t3) * p3[0]),
                0.5 * ((-t + 2 * t2 - t3) * p0[1] + (2 - 5 * t2 + 3 * t3) * p1[1]
                       + (t + 4 * t2 - 3 * t3) * p2[1] + (-t2 + t3) * p3[1])))
    out.append(pts[-1])
    return out


def smooth_poly(pts, samples_per_seg=12, sigma=1.4):
    """Linear resample then Gaussian smoothing in lat/lon (no spline overshoot).

    Keeps the route strictly inside the traced corridor; a gentle 2-D gaussian
    of the lat/lon coordinates removes the zigzag caused by Catmull-Rom
    overshoot on sharp bends. Returns list of (lat, lon).
    """
    lin = []
    n = len(pts)
    for i in range(n - 1):
        p1, p2 = pts[i], pts[i + 1]
        for j in range(samples_per_seg):
            t = j / samples_per_seg
            lin.append((p1[0] + (p2[0] - p1[0]) * t,
                        p1[1] + (p2[1] - p1[1]) * t))
    lin.append(pts[-1])
    from scipy.ndimage import gaussian_filter1d
    la = np.array([p[0] for p in lin])
    lo = np.array([p[1] for p in lin])
    la = gaussian_filter1d(la, sigma, mode="nearest")
    lo = gaussian_filter1d(lo, sigma, mode="nearest")
    return [(float(a), float(b)) for a, b in zip(la, lo)]


def main():
    m = load_meta()
    dem = load_dem(m)

    wps = []
    for idx, (wid, label, lat, lon, ref) in enumerate(WAYPOINTS):
        x, y, z, _, _ = gps_to_pos(m, dem, lat, lon)
        wps.append({
            "index": idx,
            "id": wid,
            "label": label,
            "lat": lat,
            "lon": lon,
            "alt_ref_m": ref,
            "dem_m": round(float(z + m["emin"]), 1),
            "world": [round(float(x), 1), round(float(y), 1),
                       round(float(z + DEM_OFFSET), 1)],
            "ndc": None,
        })

    route = []
    # smooth samples with per-point spine-segment index (for valley-follow)
    spline = smooth_poly(SPINE, samples_per_seg=12, sigma=1.4)
    n_seg = len(SPINE) - 1
    per_seg = (len(spline) - 1) / n_seg
    xs, ys, lats, lons, segs = [], [], [], [], []
    for k, (lat, lon) in enumerate(spline):
        x, y, z, _, _ = gps_to_pos(m, dem, lat, lon)
        xs.append(x); ys.append(y); lats.append(lat); lons.append(lon)
        segs.append(int(k / per_seg))
    import math
    loc = []  # (x, y, lat, lon, z_terrain) after valley-following
    for k in range(len(spline)):
        x, y, z, _, _ = gps_to_pos(m, dem, lats[k], lons[k])
        if segs[k] < VALLEY_UP_TO:
            prevpi = max(k - 3, 0); nextpi = min(k + 3, len(spline) - 1)
            dlat = ys[nextpi] - ys[prevpi]
            dlon = xs[nextpi] - xs[prevpi]
            travel = math.atan2(dlon, -dlat) * 180.0 / math.pi
            x, y, lats[k], lons[k] = valley_follow(m, dem, x, y, travel)
            x, y, z, _, _ = gps_to_pos(m, dem, lats[k], lons[k])
        loc.append((x, y, lats[k], lons[k], z))

    # bounded z low-pass: cancel micro-jitter but stay glued to the ground
    from scipy.ndimage import gaussian_filter1d
    zt = np.array([row[4] for row in loc])
    zs = gaussian_filter1d(zt, sigma=Z_SMOOTH_SIGMA, mode="nearest")
    route = []
    for (x, y, lat, lon, z), sm in zip(loc, zs):
        zf = float(np.clip(sm, z, z + 14.0))  # lift never below ground, max +14 m
        route.append({"lat": round(float(lat), 6), "lon": round(float(lon), 6),
                      "world": [round(float(x), 1), round(float(y), 1),
                                 round(float(zf + DEM_OFFSET), 1)]})

    OUT.mkdir(parents=True, exist_ok=True)
    with open(WP_OUT, "w", encoding="utf-8") as f:
        json.dump(wps, f, ensure_ascii=False, indent=2)
    with open(RCP_OUT, "w", encoding="utf-8") as f:
        json.dump(route, f, ensure_ascii=False, indent=2)

    print(f"[build-route] waypoints={len(wps)} route_ctrl={len(route)}")
    for w in wps:
        print(f"  {w['id']:<24s} ref={w['alt_ref_m']:6d} dem={w['dem_m']:7.1f} "
              f"world=({w['world'][0]:6.0f},{w['world'][1]:6.0f},{w['world'][2]:6.0f})"
              )
    r0, rn = route[0]["world"][2], route[-1]["world"][2]
    print(f"  route z span {r0:6.0f} -> {rn:6.0f} m "
          f"(climb {rn - r0:+.0f} m over {len(route)} samples)")


if __name__ == "__main__":
    main()
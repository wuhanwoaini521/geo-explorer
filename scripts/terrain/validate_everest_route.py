#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gate 3 validation — plan-view (map) of the South Col route on the real DEM.

Renders the Copernicus terrain as a shaded 2D map (hillshade + elevation tint)
with the route polyline and the 8 waypoints overlaid, then prints the key
numerical checks (route inside terrain, monotone climb, summit anchor).
This is deterministic and camera-independent.

Writes:
  design/world/everest-3d/preview/everest-route-validation-map.png
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_everest_route as br

OUT = Path("design/world/everest-3d/preview/everest-route-validation-map.png")


def hillshade(dem, az=315.0, alt=45.0):
    dy, dx = np.gradient(dem)
    slope = np.pi / 2.0 - np.arctan(np.hypot(dx, dy))
    a = np.radians(az)
    b = np.radians(alt)
    return np.sin(b) * np.sin(slope) + np.cos(b) * np.cos(slope) * np.cos(a - np.arctan2(dy, dx))


def main() -> None:
    m = br.load_meta()
    dem = br.load_dem(m)

    hs = hillshade(dem)
    hs = np.clip((hs - hs.min()) / (hs.max() - hs.min()), 0.0, 1.0)
    t = np.clip((dem - 4800.0) / (8700.0 - 4800.0), 0.0, 1.0)
    rgb = np.stack([
        0.50 + 0.40 * t,
        0.45 + 0.40 * t,
        0.38 + 0.50 * t,
    ], axis=-1) * 0.6 * hs[..., None] + 0.4

    wps = json.loads(br.WP_OUT.read_text(encoding="utf-8"))
    ctl = json.loads(br.RCP_OUT.read_text(encoding="utf-8"))

    # world -> lat/lon (world x=east=y? careful: x=+east col, y=+south row)
    route_lat = []
    route_lon = []
    for p in ctl:
        x, y, z = p["world"]
        col = x / m["dx"] + (m["cols"] - 1) / 2.0
        row = y / m["dy"] + (m["rows"] - 1) / 2.0
        route_lat.append(m["north"] - row / (m["rows"] - 1) * (m["north"] - m["south"]))
        route_lon.append(m["west"] + col / (m["cols"] - 1) * (m["east"] - m["west"]))
    route_lat, route_lon = np.array(route_lat), np.array(route_lon)

    fig, ax = plt.subplots(figsize=(11, 9), dpi=110)
    ax.imshow(rgb, origin="upper",
              extent=[m["west"], m["east"], m["south"], m["north"]])
    ax.plot(route_lon, route_lat, color="#e8891f", lw=2.4, alpha=0.95,
            label="South Col route")
    for w in wps:
        ax.plot(w["lon"], w["lat"], "o", ms=7,
                color="#ffc971" if w["id"] != "summit" else "#ffd54f",
                markeredgecolor="#5b3a12", markeredgewidth=0.8)
        ax.annotate(w["id"].split("-")[0].upper() if "camp-" in w["id"] else w["id"].replace("-", " ").title(),
                    (w["lon"], w["lat"]), fontsize=8, color="#fff8e0",
                    ha="center", va="bottom")
    ax.set_xlim(m["west"], m["east"])
    ax.set_ylim(m["south"], m["north"])
    ax.set_aspect(1.0 / np.cos(np.radians(27.9)))
    ax.set_xlabel("longitude")
    ax.set_ylabel("latitude")
    ax.set_title("Everest South Col route on Copernicus GLO-30 (plan view)")
    plt.tight_layout()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(OUT, dpi=110)
    print("WROTE", OUT)

    # ---- numeric checks ----
    print("\ncheck 1  waypoints:", len(wps))
    for w in wps:
        print("  %-26s lat=%.4f lon=%.4f  ref=%6.0f  dem=%6.0f  z=%.0f"
              % (w["id"], w["lat"], w["lon"], w["alt_ref_m"], w["dem_m"], w["world"][2]))
    zs = np.array([p["world"][2] for p in ctl])
    dzd = np.diff(zs)
    print("  route nodes:", len(ctl), " min/max z:", zs.min(), zs.max())
    print("  monotone up:", bool(np.all(dzd >= 0)), "  net climb:", round(zs[-1] - zs[0], 1))
    print("  in-frame:", bool(m["west"] <= route_lon.min() and route_lon.max() <= m["east"]
                              and m["south"] <= route_lat.min() and route_lat.max() <= m["north"]))


if __name__ == "__main__":
    main()
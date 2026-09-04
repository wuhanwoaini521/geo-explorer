"""Gate 2 — shared variant config for the three Everest hero previews.

Coordinate space matches the terrain build: world +Z = up, +X = east, +Y = south.
Camera poses use the peak-anchored rig in everest_camera.py (bearing 0 = north,
90 = east, 180 = south, 270 = west). aim_dz = vertical offset of the aim point
relative to the peak (positive = aim above the summit → summit sits low in frame).

All camera heights are RELATIVE-to-peak offsets supplied in the peak-anchored
`height_m` as absolute elevations in the same mesh Z space.
"""
from __future__ import annotations

# Local coordinates in metres for key summits (x, y, z rel. to crop min).
EVER_LOC = (7867.0, -4213.0, 5733.0)     # lon 86.925, lat 27.9881, elev 8709
LHOTSE_LOC = (8655.0, -1291.0, 5431.0)   # south-east of Everest
NUPTSE_LOC = (4136.0, -330.0, 5221.0)    # south-west of Everest
CHANGTSE_LOC = (2850.0, -6870.0, 4760.0) # north of Everest

PEAKS = [
    ("Everest", EVER_LOC),
    ("Lhotse", LHOTSE_LOC),
    ("Nuptse", NUPTSE_LOC),
    ("Changtse", CHANGTSE_LOC),
]

VARIANTS = {
    # ---- Preview A : Hero 远景 ----
    # Real-world anchor: the classic view from the south-west, ~Kala Patthar level.
    # Camera SW of the summit (bearing 188), 10.6 km away, 5.6 km high. The whole
    # south-west face of the massif rises through the frame; Nuptse wall lower-left,
    # Lhotse peak right of Everest. Sun from the east lights the south-east faces.
    "a": {
        "title": "A - Hero far view",
        "lens": 150, "sensor_width": 36.0,
        "bearing_deg": 132.0, "dist_m": 10000.0, "height_m": 6000.0,
        "aim_deg": 135.0, "aim_d": 0.0, "aim_dz": -880.0,
        "sun": {"azimuth_deg": 96.0, "altitude_deg": 14.0, "intensity": 1.9,
                "colour": (1.08, 0.90, 0.72)},
        "sky": {"zenith": (0.13, 0.25, 0.56), "upper": (0.38, 0.59, 0.84),
                "horizon_day": (0.87, 0.87, 0.93), "horizon_warm": (1.10, 0.82, 0.62),
                "glow": 0.55, "horizon_frac": 0.55},
        "tone": {"look": "AgX - Medium High Contrast", "exposure": 0.16},
        "haze": 0.40,
    },
    # ---- B: 中景接近 ----
    # Approach from the south-east (the classic Lhotse/Western Cwm step): closer,
    # the east ridge + summit fills, snow/rock alternation readable for a Route
    # overlay later. Sun from the west-south-west gives side-light on the east side.
    "b": {
        "title": "B - Approach 中景接近",
        "lens": 70, "sensor_width": 36.0,
        "bearing_deg": 118.0, "dist_m": 10800.0, "height_m": 5800.0,
        "aim_deg": 121.0, "aim_d": 0.0, "aim_dz": -1150.0,
        "sun": {"azimuth_deg": 88.0, "altitude_deg": 12.0, "intensity": 1.8,
                "colour": (1.02, 0.93, 0.84)},
        "sky": {"zenith": (0.17, 0.31, 0.64), "upper": (0.44, 0.63, 0.89),
                "horizon_day": (0.92, 0.92, 0.95), "horizon_warm": (1.00, 0.84, 0.70),
                "glow": 0.6, "horizon_frac": 0.58},
        "tone": {"look": "AgX - Medium High Contrast", "exposure": 0.12},
        "haze": 0.30,
    },
    # ---- C: 高海拔冷峻 (death zone) ----
    # Taken "as if standing on the Coll at ~7400 m on the NE shoulder": deep cold
    # blue, harsh hard shadows, tight lens. Sun low from the east rakes the face.
    "c": {
        "title": "C - 高海拔冷峻",
        "lens": 200, "sensor_width": 36.0,
        "bearing_deg": 58.0, "dist_m": 5200.0, "height_m": 7300.0,
        "aim_deg": 61.0, "aim_d": 0.0, "aim_dz": -130.0,
        "sun": {"azimuth_deg": 84.0, "altitude_deg": 10.0, "intensity": 1.5,
                "colour": (1.05, 1.02, 1.00)},
        "sky": {"zenith": (0.035, 0.085, 0.36), "upper": (0.11, 0.22, 0.50),
                "horizon_day": (0.60, 0.60, 0.74), "horizon_warm": (0.98, 0.42, 0.30),
                "glow": 0.35, "horizon_frac": 0.42},
        "tone": {"look": "AgX - Very High Contrast", "exposure": -0.02},
        "haze": 0.06,
    },
}

OUTPUT = {
    "preview_dir": "design/world/everest-3d/preview",
    "raw_dir": ".gate2-tmp/raw",
    "base_name": "everest-hero-preview",
}
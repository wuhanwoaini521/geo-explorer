"""Shared camera math for the Everest hero previews.

World convention matches the terrain: +X = east, +Y = south, +Z = up.
Bearings are compass bearings measured clockwise from North (0 = N, 90 = E,
180 = S, 270 = W). The renders use the same file for repeatable framing.

Returns a dict with world-space positions so Blender Python can construct the
camera, and so the tune script can pre-verify framing before a full render.
"""
from __future__ import annotations

import math

NORTH = (0.0, -1.0, 0.0)
EAST = (1.0, 0.0, 0.0)


def sun_dir(azimuth_deg: float, altitude_deg: float) -> tuple[float, float, float]:
    """World unit vector pointing toward the sun (0 = N, 90 = E, 180 = S, 270 = W)."""
    az = math.radians(azimuth_deg)
    el = math.radians(altitude_deg)
    return (math.cos(el) * math.sin(az),
            math.cos(el) * -math.cos(az),
            math.sin(el))


def camera_pose(peak: tuple[float, float, float],
                bearing_deg: float, distance_m: float, height_m: float,
                aim_az_deg: float, aim_d: float, aim_dz_rel: float = 0.0) -> dict:
    """Compute camera + aim from a peak-anchored rig.

    peak        : (x, y, z) of the summit in mesh-local metres
    bearing_deg : compass bearing from peak toward camera (0=N,90=E,180=S,270=W)
    distance_m  : horizontal distance from peak to camera
    height_m    : absolute camera height (same space as peak z)
    aim_az_deg  : bearing toward the aim point on the ground seen from the peak
                  (usually 'forward along the view'), +180 = aim away from camera
    aim_d       : horizontal offset of the aim target from the peak
    Returns pose dict consumed by the render/tune scripts.
    """
    az = math.radians(bearing_deg)
    cam_x = peak[0] + distance_m * math.sin(az)
    cam_y = peak[1] - distance_m * math.cos(az)
    cam = (cam_x, cam_y, height_m)
    aaz = math.radians(aim_az_deg)
    tgt_x = peak[0] + aim_d * math.sin(aaz)
    tgt_y = peak[1] - aim_d * math.cos(aaz)
    target = (tgt_x, tgt_y, peak[2] + aim_dz_rel)
    return {"camera": cam, "target": target}


def camera_from_config(peak: tuple[float, float, float], cfg: dict) -> dict:
    """Derive concrete camera/target positions from a variant config."""
    return camera_pose(peak, cfg["bearing_deg"], cfg["dist_m"], cfg["height_m"],
                         cfg["aim_deg"], cfg.get("aim_d", 0.0), cfg.get("aim_dz", 0.0))
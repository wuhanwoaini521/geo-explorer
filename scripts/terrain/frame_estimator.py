"""Offline composition estimator for the Everest hero shots.

Projects the DEM grid into camera space (same convention as the Blender rig),
computes per-column skyline (topmost terrain screen y) and returns framing
metrics: terrain fraction, sky fraction, and sun screen position. Fast enough
to grid-search camera poses before touching Blender.
"""
from __future__ import annotations

import numpy as np

import everest_camera as ec


def look_basis(cam_pos, target):
    """Return (f, r, u): view-forward, right, up unit vectors (camera looks along f)."""
    f = np.asarray(target, np.float64) - np.asarray(cam_pos, np.float64)
    f = f / np.linalg.norm(f)
    up = np.array([0.0, 0.0, 1.0])
    r = np.cross(f, up)
    rn = np.linalg.norm(r)
    if rn < 1e-9:
        r = np.array([1.0, 0.0, 0.0])
    else:
        r = r / rn
    u = np.cross(r, f)
    return f, r, u


def project(cam_pos, target, lens, sensor_w, sw, sh, pts):
    """Project points to screen space (x 0..1 left-right, y 0..1 bottom-up)."""
    f, r, u = look_basis(cam_pos, target)
    d = np.asarray(pts, np.float64) - np.asarray(cam_pos, np.float64)
    zc = d @ f
    xc = d @ r
    yc = d @ u
    in_front = zc > 10.0
    tanh = (sensor_w / 2.0) / lens
    tanv = ((sensor_w * sh / sw) / 2.0) / lens
    sx = 0.5 + 0.5 * (xc / (zc * tanh))
    sy = 0.5 + 0.5 * (yc / (zc * tanv))
    return np.where(in_front, sx, np.nan), np.where(in_front, sy, np.nan), zc


def estimate(cam_pos, target, lens, sensor_w, sw, sh, verts, ncol=120, sun_vec=None):
    sx, sy, _ = project(cam_pos, target, lens, sensor_w, sw, sh, verts)
    inside = (sx >= 0) & (sx <= 1) & (sy >= 0) & (sy <= 1) & ~np.isnan(sy)
    syi = sy[inside]
    if not syi.size:
        return {"sky_frac": 1.0, "terrain_frac": 0.0, "occupied_pct": 0.0,
                "sun_screen": None}
    cols = np.clip(np.floor(sx[inside] * ncol).astype(int), 0, ncol - 1)
    skyline = np.zeros(ncol)
    for c in range(ncol):
        sel = cols == c
        if sel.any():
            skyline[c] = syi[sel].max()
    sky = float(1.0 - skyline.mean())
    occ = 100.0 * inside.sum() / len(verts)
    sun_screen = None
    if sun_vec is not None:
        sun_far = np.asarray(cam_pos, np.float64) + np.asarray(sun_vec) * 200000.0
        ssx, ssy, _ = project(cam_pos, target, lens, sensor_w, sw, sh, sun_far[None, :])
        sun_screen = (float(ssx[0]), float(ssy[0]))
    return {"sky_frac": sky, "terrain_frac": float(skyline.mean()),
            "occupied_pct": occ, "sun_screen": sun_screen}


def search(cam_grid, lens_list, peak_xy, verts, sun_vec=None, ncol=120):
    """cam_grid: list of (bearing_deg, dist_m, height_m, aim_dz, sensor/lens).
    Returns rows sorted by closeness to the target sky fraction."""
    out = []
    for (bearing, dist, height, aim_dz) in cam_grid:
        for lens in lens_list:
            pose = ec.camera_pose(peak_xy, bearing, dist, height, bearing)
            t = np.array(pose["target"])
            tgt = (t[0], t[1], t[2] + aim_dz)
            e = estimate(pose["camera"], tgt, lens, 36.0, 1440, 1080, verts, ncol, sun_vec)
            e.update(bearing=bearing, dist=dist, height=height, aim_dz=aim_dz, lens=lens)
            out.append(e)
    return out
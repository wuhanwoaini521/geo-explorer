"""Compose final Everest hero previews from transparent Workbench RAW renders.

Injects the per-variant sky (zenith -> upper -> horizon day/warm gradient) behind
the transparent terrain, adds a faint atmospheric haze lift on the lower terrain,
labels the key summits (Everest, Lhotse, Nuptse, Changtse) from the gate2 report
NDC, draws a variant header + footer caption, and writes the final preview PNGs.

Usage (host Python):
  python scripts/terrain/compose_everest_previews.py [RAW_DIR] [OUT_DIR] [--nolabels]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import everest_variants as ev  # noqa: E402

PREVIEW_DIR = "design/world/everest-3d/preview"
F_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
F_REG = r"C:\Windows\Fonts\arial.ttf"

META = {
    "a": ("PREVIEW A · Hero 远景", "whole massif, summit anchor, space & scale"),
    "b": ("PREVIEW B · 中景接近", "closer ridges — snow / rock for a future Route overlay"),
    "c": ("PREVIEW C · 7000 m+ DESATH ZONE", "cold thin air, hard light, deep edge"),
}


def _font(path: str, size: int):
    if Path(path).exists():
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def skyline(a: np.ndarray, fallback: float = 0.62) -> float:
    """Median skyline top row (frac from top) over columns that contain terrain."""
    h, _ = a.shape
    cols = np.where(a.any(axis=0))[0]
    if cols.size == 0:
        return fallback
    tops = [int(np.argmax(a[:, c])) for c in cols]
    return float(np.median(tops) / h)


def build_sky(w: int, h: int, horizon: float, sky: dict) -> np.ndarray:
    """(h,w,3) float sky: zenith->upper->horizon_day + warm horizon bloom + soft top aura."""
    y = np.linspace(0.0, 1.0, h)[:, None]              # 0 = frame top
    z = np.asarray(sky["zenith"], np.float64)
    up = np.asarray(sky["upper"], np.float64)
    hd = np.asarray(sky["horizon_day"], np.float64)
    hw = np.asarray(sky["horizon_warm"], np.float64)
    t = np.clip(y / max(horizon, 1e-4), 0.0, 1.25)

    col = np.zeros((h, w, 3), np.float64)
    col += up[None, None, :]
    col += (z - up)[None, None, :] * (np.clip(1.0 - t, 0.0, 1.0) ** 2.0)[:, :, None]
    g2 = np.clip(t - 0.55, 0.0, 1.0) / 0.45
    col += (hd - up)[None, None, :] * g2[:, :, None]
    warm = np.clip(1.0 - np.abs(t - 1.0) / 0.16, 0.0, 1.0) ** 1.5
    col += (hw - hd)[None, None, :] * (warm * 0.62)[:, :, None]

    yy = np.linspace(0, h - 1, h)[:, None]
    topbloom = np.clip(1.0 - yy / (h * 0.32), 0.0, 1.0) ** 2.2
    rightbias = np.clip((np.linspace(-1, 1, w)[None, :] + 0.7) / 1.2, 0.0, 1.0)
    col += np.asarray([1.18, 0.90, 0.70])[None, None, :] * (topbloom * rightbias * 0.20)[:, :, None]

    return np.clip(col, 0.0, 1.4)


def label_peaks(draw, W, H, ndc) -> None:
    s = max(int(H * 0.026), 24)
    f = _font(F_BOLD, s)
    fs = _font(F_REG, max(int(s * 0.78), 18))
    for name, p in ndc.items():
        sx = (p["x"] + 0.5) * W
        sy = (1.0 - p["y"]) * H
        if not (0.03 <= p["x"] <= 0.97 and 0.05 <= p["y"] <= 0.99):
            continue
        col = (255, 250, 238) if name == "Everest" else (226, 236, 250)
        draw.ellipse([sx - 3, sy - 3, sx + 3, sy + 3], fill=col, outline=(10, 14, 28))
        if name == "Everest":
            txt = "Everest 8,849 m"
            tx = sx + 14
        else:
            txt = name
            tx = sx + 10
        ty = max(sy - s * 1.5, s * 0.4)
        # leader line from the dot up to the label
        draw.line([(sx, sy), (tx, ty + s * 0.35)], fill=col)
        draw.text((tx, ty), txt, font=f if name == "Everest" else fs, fill=col)


def main() -> None:
    raw_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".gate2-tmp/raw")
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(PREVIEW_DIR)
    labels = "--nolabels" not in sys.argv
    out_dir.mkdir(parents=True, exist_ok=True)
    report = json.loads((raw_dir / "gate2-report.json").read_text(encoding="utf-8"))

    for key in ("a", "b", "c"):
        img = Image.open(raw_dir / f"raw-{key}.png").convert("RGBA")
        arr = np.asarray(img)
        a = arr[:, :, 3] > 8
        px = arr[:, :, :3].astype(np.float64) / 255.0
        H, W = a.shape
        v = ev.VARIANTS[key]
        horizon = skyline(a)
        sky = build_sky(W, H, horizon, v["sky"])

        out = np.where(a[:, :, None], px, sky)
        # atmospheric haze lift on lower terrain (blend toward pale horizon)
        row_t = np.linspace(0.0, 1.0, H)[:, None, None]
        haze = np.clip(row_t - 0.55, 0.0, 1.0) / 0.45 * (0.0 + v["haze"] * 0.5)
        pale = (np.asarray(v["sky"]["horizon_day"], np.float64) + np.asarray([0.5, 0.5, 0.6])) / 1.75
        out = out * (1.0 - haze) + pale[None, None, :] * haze

        im = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGB")
        d = ImageDraw.Draw(im)

        # header
        ft = _font(F_BOLD, int(H * 0.048))
        fsu = _font(F_REG, int(H * 0.024))
        d.text((int(W * 0.045), int(H * 0.045)), META[key][0], font=ft,
               fill=(255, 255, 255), stroke_width=2, stroke_fill=(8, 12, 28))
        d.text((int(W * 0.045), int(H * 0.105)), META[key][1], font=fsu,
               fill=(218, 226, 240), stroke_width=1, stroke_fill=(8, 12, 28))

        if labels:
            label_peaks(d, W, H, report[key]["ndc"])

        # footer
        d.text((int(W * 0.045), int(H * 0.955)),
               "Copernicus GLO-30 DEM · 30 m · vertical exaggeration 1.00 · Blender Workbench",
               font=fsu, fill=(205, 216, 235), stroke_width=1, stroke_fill=(8, 12, 28))

        path = out_dir / f"everest-hero-preview-{key}.png"
        im.save(str(path))
        print(f"WROTE {path}  (skyline horizon at y={horizon:.2f})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
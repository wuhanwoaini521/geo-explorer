"""Compose the final Everest South Col route preview from the Workbench raw.

Reuses the hero sky-builder; draws the route caption + labels the 8 waypoints
(short ids) and main summits from the route-gate3-report.json NDC.

Usage (host Python):
  python scripts/terrain/compose_everest_route_preview.py [RAW_DIR] [OUT] [--nolabels]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import everest_variants as ev  # noqa: E402
from compose_everest_previews import build_sky, skyline, _font, F_BOLD, F_REG  # noqa: E402

PREVIEW_DIR = Path("design/world/everest-3d/preview")
PREVIEW = PREVIEW_DIR

WP_SHORT = {
    "base-camp": "BC 大本营",
    "khumbu-icefall": "昆布冰瀑",
    "camp-i": "C1",
    "western-cwm-camp-ii": "西库姆 C2",
    "lhotse-face-camp-iii": "洛子壁 C3",
    "south-col-camp-iv": "南坳 C4",
    "south-summit": "南峰",
    "summit": "珠峰之巅",
}
WP_ALT = {
    "base-camp": "5,364 m",
    "khumbu-icefall": "5,870 m",
    "camp-i": "6,065 m",
    "western-cwm-camp-ii": "6,400 m",
    "lhotse-face-camp-iii": "7,162 m",
    "south-col-camp-iv": "7,906 m",
    "south-summit": "8,749 m",
    "summit": "8,849 m",
}


def label_wp(draw, W, H, report):
    """Draw a small dot + leader + short id for each visible waypoint."""
    s = max(int(H * 0.020), 20)
    f = _font(F_BOLD, s)
    fs = _font(F_REG, max(int(s * 0.72), 15))
    order = ["base-camp", "khumbu-icefall", "camp-i", "western-cwm-camp-ii",
             "lhotse-face-camp-iii", "south-col-camp-iv", "south-summit", "summit"]
    for key in order:
        p = report.get(key)
        if not p:
            continue
        sx = p["x"] * W
        sy = (1.0 - p["y"]) * H
        if not (0.04 <= p["x"] <= 0.97 and 0.06 <= p["y"] <= 0.985):
            continue
        is_summit = key == "summit"
        col = (255, 214, 130) if is_summit else (255, 246, 214)
        draw.ellipse([sx - 4, sy - 4, sx + 4, sy + 4], fill=col, outline=(20, 16, 8))
        txt = f"{WP_SHORT.get(key, key)}  {WP_ALT.get(key, '')}"
        tx = sx + 12 if sx < W * 0.86 else sx - 14 - s * (len(WP_SHORT.get(key, key)) + 6)
        ty = min(sy - s * 1.25, H - s * 2.2)
        if ty < s * 0.4:
            ty = sy + s * 0.5
        draw.line([(sx, sy), (tx, ty + s * 0.3)], fill=col, width=1)
        draw.text((tx, ty), txt, font=f if is_summit else fs, fill=col,
                  stroke_width=1, stroke_fill=(12, 16, 30))


def main() -> None:
    raw_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".gate3-tmp/raw")
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else PREVIEW
    labels_on = "--nolabels" not in sys.argv
    out_dir.mkdir(parents=True, exist_ok=True)
    report = json.loads((raw_dir / "route-gate3-report.json").read_text(encoding="utf-8"))

    key = "b"
    img = Image.open(raw_dir / f"raw-route-{key}.png").convert("RGBA")
    arr = np.asarray(img)
    a = arr[:, :, 3] > 8
    px = arr[:, :, :3].astype(np.float64) / 255.0
    H, W = a.shape
    v = ev.VARIANTS[key]
    horizon = skyline(a)
    sky = build_sky(W, H, horizon, v["sky"])

    out = np.where(a[:, :, None], px, sky)
    row_t = np.linspace(0.0, 1.0, H)[:, None, None]
    haze = np.clip(row_t - 0.55, 0.0, 1.0) / 0.45 * (0.0 + v["haze"] * 0.5)
    pale = (np.asarray(v["sky"]["horizon_day"], np.float64) + np.asarray([0.5, 0.5, 0.6])) / 1.75
    out = out * (1.0 - haze) + pale[None, None, :] * haze

    im = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGB")
    d = ImageDraw.Draw(im)

    ft = _font(F_BOLD, int(H * 0.052))
    fsu = _font(F_REG, int(H * 0.028))
    d.text((int(W * 0.045), int(H * 0.045)), "EVEREST SOUTH COL ROUTE · 珠峰南坡登顶路线",
           font=ft, fill=(255, 226, 150), stroke_width=2, stroke_fill=(12, 16, 30))
    d.text((int(W * 0.045), int(H * 0.108)),
           "BC → 昆布冰峰 → C1 → C2 西库姆 → C3 洛子壁 → 南坳 C4 → 南峰 → 峰顶  (8,848.86 m)",
           font=fsu, fill=(226, 234, 248), stroke_width=1, stroke_fill=(12, 16, 30))
    if labels_on:
        label_wp(d, W, H, report[key])

    fsu2 = _font(F_REG, int(H * 0.022))
    d.text((int(W * 0.045), int(H * 0.955)),
           "Copernicus GLO-30 DEM · route follows 8,48 m ground surface · Blender Workbench · Camera B",
           font=fsu2, fill=(200, 212, 232), stroke_width=1, stroke_fill=(12, 16, 30))

    path = out_dir / "everest-route-preview-b.png"
    im.save(str(path))
    print(f"WROTE {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
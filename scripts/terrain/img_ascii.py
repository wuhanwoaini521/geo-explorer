"""Analyze a rendered PNG: luminance ASCII map (poor-man's preview), stats, framing."""
from __future__ import annotations

import sys
import numpy as np
from PIL import Image

# Luminance ramp: dark->bright
RAMP = " .:-=+*#%@"
RAMP_COL = "@%#*+=-:. "


def to_luma(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def main() -> None:
    path = sys.argv[1]
    cols = int(sys.argv[2]) if len(sys.argv) > 2 else 72
    rows = int(sys.argv[3]) if len(sys.argv) > 3 else 40
    img_rgba = np.asarray(Image.open(path).convert("RGBA"), dtype=np.float32)
    img = img_rgba[..., :3]
    alpha = img_rgba[..., 3]
    h, w = img.shape[:2]
    # Opaque pixel occupancy / vertical band (terrain footprint in the frame)
    mask = alpha > 8
    occ = mask.mean()
    rows_any = np.where(mask.any(axis=1))[0]
    if rows_any.size:
        top_frac = rows_any.min() / h
        bot_frac = rows_any.max() / h
        print(f"occupancy_{occ*100:.1f}%  terrain band y={top_frac:.2f}..{bot_frac:.2f}")
    else:
        print("occupancy 0%  (fully transparent frame)")
    # Full-frame stats
    luma_full = to_luma(img)
    print(f"size: {w}x{h}")
    print(f"luma  min={luma_full.min():.2f} p05={np.percentile(luma_full,5):.2f} "
          f"mean={luma_full.mean():.2f} p95={np.percentile(luma_full,95):.2f} "
          f"max={luma_full.max():.2f}")
    # Split: sky (top 40%) vs terrain (bottom 60%) assuming camera looks slightly down
    top = luma_full[: int(h * 0.4)]
    bot = luma_full[int(h * 0.45):]
    print(f"sky-luma mean={top.mean():.2f}  terrain-luma mean={bot.mean():.2f}")
    # Color encoding (hue text) for sky region
    sky_rgb = img[: int(h * 0.35)].reshape(-1, 3).mean(axis=0)
    print(f"sky mean rgb = ({sky_rgb[0]:.0f},{sky_rgb[1]:.0f},{sky_rgb[2]:.0f})")

    # Downscale for ASCII
    small = np.asarray(Image.fromarray(img.astype(np.uint8)).resize((cols, rows), Image.LANCZOS),
                       dtype=np.float32)
    small = small[:, :, :3]
    luma = to_luma(small)
    mx = luma.max() if luma.max() > 0 else 1.0
    norm = (luma / mx).clip(0, 1)
    print("=" * cols)
    for r in range(rows):
        line = ""
        for c in range(cols):
            v = norm[r, c]
            idx = min(len(RAMP) - 1, int(v * (len(RAMP) - 1)))
            line += RAMP[idx]
        print(line)
    print("=" * cols)


if __name__ == "__main__":
    main()
"""Build small offline material maps for the WebGL globe.

The colour map remains the source of truth. The height map is deliberately a
low-amplitude relief cue (not a DEM replacement) and the specular map gives
water, land and ice different light responses.

standard 档位（2048）写进 miniprogram/assets/world/ 作为运行时贴图（JPEG）；
high 档位（4096）只写到 design/world/。

注意：high 档位的材质图是把 standard 的颜色栅格**放大**得到的，本身不携带
2048 之外的信息——这也是它在 Gate 2 被移出代码包的原因之一。
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.world_textures import (
    HIGH_SIZE,
    STANDARD_SIZE,
    color_raster,
    save_material,
)


def lon_distance(a: float, b: float) -> float:
    value = abs(a - b) % 360.0
    return min(value, 360.0 - value)


def ridge(lon: float, lat: float, center_lon: float, center_lat: float, lon_width: float, lat_width: float, strength: float) -> float:
    dx = lon_distance(lon, center_lon) / lon_width
    dy = (lat - center_lat) / lat_width
    return strength * math.exp(-(dx * dx + dy * dy) * 1.35)


def build_maps(size: int) -> None:
    source = color_raster(STANDARD_SIZE).resize(
        (size, size // 2), Image.Resampling.LANCZOS
    )
    pixels = source.load()
    width, height = source.size
    height_bytes = bytearray(width * height)
    specular_bytes = bytearray(width * height)

    for y in range(height):
        latitude = 90.0 - (y / max(1, height - 1)) * 180.0
        for x in range(width):
            longitude = (x / max(1, width - 1)) * 360.0 - 180.0
            red, green, blue = pixels[x, y]
            ocean = blue > red * 1.10 and blue > green * 1.02
            snow = (abs(latitude) > 58.0 and red + green + blue > 470) or (red > 175 and green > 185 and blue > 185)

            if ocean:
                base_height = 0.14
                specular = 0.63 + min(0.18, max(0.0, (blue - red) / 255.0) * 0.22)
            else:
                base_height = 0.26 + max(0.0, (green - red) / 255.0) * 0.05
                specular = 0.13
            if snow:
                specular = 0.30

            relief = 0.0
            # Himalaya + Tibetan Plateau: a broad plateau under a narrower ridge.
            relief += ridge(longitude, latitude, 86.0, 31.0, 18.0, 5.5, 0.38)
            relief += ridge(longitude, latitude, 86.0, 34.5, 24.0, 8.0, 0.19)
            relief += ridge(longitude, latitude, 84.0, 28.5, 12.0, 2.3, 0.16)
            # The long continental mountain systems keep the globe legible at a glance.
            relief += ridge(longitude, latitude, -72.0, -25.0, 7.0, 38.0, 0.20)
            relief += ridge(longitude, latitude, -112.0, 42.0, 10.0, 30.0, 0.16)
            relief += ridge(longitude, latitude, 10.0, 46.0, 17.0, 4.0, 0.10)
            relief += ridge(longitude, latitude, 38.0, 8.0, 13.0, 9.0, 0.09)
            # Very low-frequency variation prevents the bump map from looking like a
            # collection of identical synthetic blobs while retaining subtlety.
            regional = 0.018 * (math.sin(longitude * 0.17) + math.cos(latitude * 0.21))
            value = max(0.08, min(0.86, base_height + relief + regional))
            height_bytes[y * width + x] = int(round(value * 255.0))
            specular_bytes[y * width + x] = int(round(max(0.06, min(0.88, specular)) * 255.0))

    height_image = Image.frombytes("L", (width, height), bytes(height_bytes)).filter(ImageFilter.GaussianBlur(1.15))
    specular_image = Image.frombytes("L", (width, height), bytes(specular_bytes)).filter(ImageFilter.GaussianBlur(0.65))
    for name, image in (("globe-height", height_image), ("globe-specular", specular_image)):
        out = save_material(image, size, name)
        print(f"wrote {out} ({width}x{height})")


def main() -> None:
    build_maps(STANDARD_SIZE)
    build_maps(HIGH_SIZE)


if __name__ == "__main__":
    main()

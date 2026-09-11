"""Build a compact, offline equirectangular globe texture from Natural Earth GeoJSON.

The source is public-domain Natural Earth 1:110m country geometry.  The output is
deliberately dark and low-saturation so the map reads as an atlas texture rather
than a political map or a satellite photograph.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "artifacts" / "visual" / "_natural-earth-countries.geojson"
OUTPUT = ROOT / "miniprogram" / "assets" / "world" / "globe-texture.png"
WIDTH, HEIGHT = 1024, 512


def project(lon: float, lat: float) -> tuple[int, int]:
    x = round((lon + 180.0) / 360.0 * (WIDTH - 1))
    y = round((90.0 - lat) / 180.0 * (HEIGHT - 1))
    return x, y


def ring_points(ring: list[list[float]]) -> list[tuple[int, int]]:
    return [project(float(point[0]), float(point[1])) for point in ring]


def iter_rings(geometry: dict):
    kind = geometry.get("type")
    coordinates = geometry.get("coordinates", [])
    if kind == "Polygon":
        yield from coordinates
    elif kind == "MultiPolygon":
        for polygon in coordinates:
            yield from polygon


def ocean_color(y: int) -> tuple[int, int, int]:
    latitude = abs(90.0 - y / (HEIGHT - 1) * 180.0) / 90.0
    band = math.sin(y * 0.06) * 1.6 + math.sin(y * 0.19) * 0.8
    return (
        max(2, round(4 + 3 * (1 - latitude) + band)),
        max(11, round(25 + 12 * (1 - latitude) + band)),
        max(23, round(45 + 24 * (1 - latitude) + band * 1.5)),
    )


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing source: {SOURCE}")

    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    image = Image.new("RGB", (WIDTH, HEIGHT))
    pixels = image.load()
    for y in range(HEIGHT):
        base = ocean_color(y)
        for x in range(WIDTH):
            current = math.sin(x * 0.035 + y * 0.012) * 0.7
            pixels[x, y] = tuple(max(0, min(255, round(value + current))) for value in base)

    land_mask = Image.new("L", (WIDTH, HEIGHT), 0)
    land = Image.new("RGB", (WIDTH, HEIGHT), (30, 60, 57))
    land_pixels = land.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            noise = math.sin(x * 0.055) * 3.0 + math.sin(y * 0.11) * 2.0 + math.sin((x + y) * 0.021) * 2.5
            land_pixels[x, y] = (
                max(18, round(38 + noise)),
                max(36, round(73 + noise * 1.4)),
                max(32, round(64 + noise)),
            )

    mask_draw = ImageDraw.Draw(land_mask)
    outline_draw = ImageDraw.Draw(image)
    continent_tints = {
        "Africa": (50, 81, 62),
        "Asia": (43, 78, 69),
        "Europe": (48, 79, 75),
        "North America": (43, 74, 67),
        "South America": (45, 79, 59),
        "Oceania": (58, 83, 62),
        "Seven seas (open ocean)": (38, 67, 63),
    }

    for feature in data.get("features", []):
        geometry = feature.get("geometry") or {}
        tint = continent_tints.get(feature.get("properties", {}).get("CONTINENT"), (44, 76, 62))
        for ring in iter_rings(geometry):
            points = ring_points(ring)
            if len(points) < 3:
                continue
            mask_draw.polygon(points, fill=255)
            outline_draw.line(points + [points[0]], fill=(83, 126, 112), width=1)
            # A tiny regional tint makes the texture read as land cover without
            # turning political boundaries into the visual subject.
            ImageDraw.Draw(land).polygon(points, fill=tint)

    # Re-introduce low-amplitude terrain variation after the regional fills.
    # It is deliberately broad and quiet: enough to avoid flat vector blocks,
    # but not enough to imply a measured elevation model.
    for y in range(HEIGHT):
        for x in range(WIDTH):
            if land_mask.getpixel((x, y)) == 0:
                continue
            base = land_pixels[x, y]
            noise = math.sin(x * 0.055) * 2.4 + math.sin(y * 0.11) * 1.6 + math.sin((x + y) * 0.021) * 2.0
            land_pixels[x, y] = tuple(max(0, min(255, round(value + noise))) for value in base)

    image.paste(land, mask=land_mask)
    outline_draw = ImageDraw.Draw(image)
    for feature in data.get("features", []):
        for ring in iter_rings(feature.get("geometry") or {}):
            points = ring_points(ring)
            if len(points) >= 3:
                outline_draw.line(points + [points[0]], fill=(75, 116, 105), width=1)

    # Subtle latitude haze and a dark polar treatment help the same texture work
    # when warped into a sphere, without adding any runtime dependency.
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    overlay_pixels = overlay.load()
    for y in range(HEIGHT):
        latitude = abs(90.0 - y / (HEIGHT - 1) * 180.0) / 90.0
        alpha = round(max(0.0, latitude - 0.72) * 42)
        if alpha:
            for x in range(WIDTH):
                overlay_pixels[x, y] = (4, 16, 25, alpha)
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT, format="PNG", optimize=True)
    print(f"wrote {OUTPUT} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()

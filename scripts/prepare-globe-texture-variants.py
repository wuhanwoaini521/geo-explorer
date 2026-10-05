"""Create render-ready globe texture variants from the checked-in source.

standard 档位（2048）写进 miniprogram/assets/world/ 作为运行时贴图（WebP）；
high 档位（4096）只写到 design/world/，不进微信代码包（见 scripts/world_textures.py）。
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.world_textures import HIGH_SIZE, STANDARD_SIZE, color_raster, save_color


def main() -> None:
    for width in (STANDARD_SIZE, HIGH_SIZE):
        image = color_raster(width)
        out = save_color(image, width)
        print(f"wrote {out} ({width}x{width // 2})")


if __name__ == "__main__":
    main()

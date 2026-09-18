# -*- coding: utf-8 -*-
"""世界贴图的共享配方。

`design/world/globe-texture-realistic-seamless-source.png` 是本项目自产的等距矩形
颜色源图，所有颜色档位与材质图都由它派生。

产物分两层：

- **runtime 层**（`miniprogram/assets/world/`，进微信代码包）
  只有 standard 档位（2048），格式为 JPEG。
- **design 层**（`design/world/`，不进代码包）
  high 档位（4096），PNG。Gate 2 起不再随包分发：三张图合计约 12.6 MB，占改造前
  整包的 45%，且只有开发期 query `?texture=4096` 能触发，正式运行从不加载。
  运行时经由 `miniprogram/engine/globe-texture-source.ts` 解析档位；一旦配置远端
  基址（CDN / 微信云存储），high 档位会自动改用远端地址。
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DESIGN_WORLD = ROOT / "design" / "world"
RUNTIME_WORLD = ROOT / "media-remote" / "world"
WORLD_UI = ROOT / "miniprogram" / "assets" / "world"
COLOR_SOURCE = DESIGN_WORLD / "globe-texture-realistic-seamless-source.png"

STANDARD_SIZE = 2048
HIGH_SIZE = 4096

# 每个档位的锐化参数（与历史产物保持一致，改动会让已发布的贴图发生变化）
SHARPEN = {STANDARD_SIZE: (1.05, 28), HIGH_SIZE: (1.45, 22)}

# 运行时贴图统一使用 JPEG。PNG 对照片型内容几乎无法压缩（改造前 1748 KB/MP）。
COLOR_QUALITY = 85
MATERIAL_QUALITY = 90

OUTPUT_DIR = {STANDARD_SIZE: RUNTIME_WORLD, HIGH_SIZE: DESIGN_WORLD}


def color_raster(width: int) -> Image.Image:
    """派生指定档位的颜色贴图（Lanczos 重采样 + 轻度 unsharp）。"""
    if not COLOR_SOURCE.exists():
        raise SystemExit(f"missing color source: {COLOR_SOURCE}")
    source = Image.open(COLOR_SOURCE).convert("RGB")
    radius, percent = SHARPEN[width]
    resized = source.resize((width, width // 2), Image.Resampling.LANCZOS)
    return resized.filter(
        ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=3)
    )


def save_color(image: Image.Image, width: int) -> Path:
    if width == STANDARD_SIZE:
        path = RUNTIME_WORLD / f"globe-texture-realistic-{width}.jpg"
        image.save(path, "JPEG", quality=COLOR_QUALITY, optimize=True, progressive=True)
    else:
        path = DESIGN_WORLD / f"globe-texture-realistic-{width}.png"
        image.save(path, format="PNG", optimize=True)
    return path


def save_material(image: Image.Image, width: int, name: str) -> Path:
    if width == STANDARD_SIZE:
        path = RUNTIME_WORLD / f"{name}-{width}.jpg"
        image.save(path, "JPEG", quality=MATERIAL_QUALITY, optimize=True, progressive=True)
    else:
        path = DESIGN_WORLD / f"{name}-{width}.png"
        image.save(path, format="PNG", optimize=True)
    return path

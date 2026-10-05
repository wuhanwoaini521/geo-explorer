# -*- coding: utf-8 -*-
"""世界贴图的共享配方。

`design/world/globe-texture-realistic-seamless-source.png` 是本项目自产的等距矩形
颜色源图，所有颜色档位与材质图都由它派生。

产物分两层：

- **runtime 层**（`miniprogram/assets/world/`，进微信代码包）
  standard 颜色贴图（2048 WebP）与设备兼容回退（1536 JPEG）。
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
FALLBACK_SIZE = 1536
HIGH_SIZE = 4096

# 每个档位的锐化参数（与历史产物保持一致，改动会让已发布的贴图发生变化）
SHARPEN = {FALLBACK_SIZE: (1.05, 28), STANDARD_SIZE: (1.05, 28), HIGH_SIZE: (1.45, 22)}

# 2048×1024 分辨率不变；WebP q38 将产物稳定控制在 200 KB 内。
COLOR_QUALITY = 38
MATERIAL_QUALITY = 90

OUTPUT_DIR = {FALLBACK_SIZE: WORLD_UI, STANDARD_SIZE: WORLD_UI, HIGH_SIZE: DESIGN_WORLD}


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
    if width == FALLBACK_SIZE:
        path = WORLD_UI / f"globe-texture-realistic-{width}.jpg"
        image.save(path, "JPEG", quality=55, optimize=True, progressive=True)
    elif width == STANDARD_SIZE:
        path = WORLD_UI / f"globe-texture-realistic-{width}.webp"
        image.save(path, "WEBP", quality=COLOR_QUALITY, method=6)
    else:
        path = DESIGN_WORLD / f"globe-texture-realistic-{width}.png"
        image.save(path, format="PNG", optimize=True)
    return path


def save_remote_color(image: Image.Image, width: int) -> Path:
    """生成由 COS 承载的 JPEG 颜色贴图，供正式包的 WebGL/Canvas 使用。"""
    path = RUNTIME_WORLD / f"globe-texture-realistic-{width}.jpg"
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "JPEG", quality=72, optimize=True, progressive=True)
    return path


def save_material(image: Image.Image, width: int, name: str) -> Path:
    if width == STANDARD_SIZE:
        path = RUNTIME_WORLD / f"{name}-{width}.jpg"
        image.save(path, "JPEG", quality=MATERIAL_QUALITY, optimize=True, progressive=True)
    else:
        path = DESIGN_WORLD / f"{name}-{width}.png"
        image.save(path, format="PNG", optimize=True)
    return path

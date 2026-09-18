# -*- coding: utf-8 -*-
"""optimize-package-assets —— Gate 2 包体优化：把运行时的照片型资产压到移动端需要的尺寸。

为什么需要它
------------
改造前 `miniprogram/assets` 里 7 张 PNG 全部是照片型内容（地球颜色贴图、地貌渲染图），
PNG 对这类内容几乎无法压缩（1748 KB/MP）。同时 `assets/content/**` 是 1080 宽、
262–460 KB/MP 的高画质导出，明显超过移动端实际显示尺寸所需。

处理顺序（遵循“先尺寸、再格式、最后质量”）
------------------------------------------
1. 按真实显示尺寸 resize（`assets/content/**` 最长边 900px；地球贴图与
   everest 主视觉保持原生尺寸，因为它们在 3x 屏上按 1:1 采样，见下）；
2. PNG → JPEG（项目内所有 PNG 均无 alpha 通道，转换无透明度损失）；
3. 选定质量：颜色贴图 q85，灰度材质图 q90，内容照片 q80。

尺寸依据（3x 设备，开发者工具默认基准 750rpx = 1125 物理像素）
---------------------------------------------------------------
- 地球球体直径 ≈ `min(1125*0.45, 1350*0.5) * 2` ≈ 1012 px；2048 等距矩形贴图的
  可见半球宽 = 1024 px → 恰好 1:1。降到 1024 会变成 2:1 放大 ⇒ 保持 2048。
- `everest-expedition-hero-v1` 是全屏 TERRAIN 主视觉（1024×1536 原生），
  且会被相机 `viewZoom` 二次放大 ⇒ 保持原生。
- `live-a-kala-patthar` 是全屏 LIVE 实景（1080×1920 原生）⇒ 保持原生。
- `assets/content/**` 的真实显示场景：地点详情头图 1125×1035（上有 65%→100%
  不透明深色渐变遮罩）、知识详情配图 1035×600、知识卡片 540×390 ⇒ 最长边 900
  已覆盖最大无遮罩场景。

输入即“当前 git 跟踪的资产”
--------------------------
Python 连续两次有损编码会继续损失画质，**本脚本对同一份文件只应执行一次**；
优化前的原图可从 git 历史取回（`git show <rev>:miniprogram/assets/...`）。

用法
----
    python scripts/optimize-package-assets.py --dry-run    # 只报告，不写文件
    python scripts/optimize-package-assets.py             # 就地执行
"""

from __future__ import annotations

import argparse
import fnmatch
import os
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "media-remote"

# (glob, 输出格式, 质量, 最长边上限 / None = 保持原生)
RULES: list[tuple[str, str, int, int | None]] = [
    ("world/globe-texture-realistic-2048.png", "JPEG", 85, None),
    ("world/globe-height-2048.png", "JPEG", 90, None),
    ("world/globe-specular-2048.png", "JPEG", 90, None),
    ("world/everest-expedition-hero-v1.png", "JPEG", 85, None),
    ("content/*/*.jpg", "JPEG", 80, 900),
    ("content/*/*.jpeg", "JPEG", 80, 900),
    ("content/*/*.png", "JPEG", 80, 900),
    ("expeditions/*/*/*.jpg", "JPEG", 80, None),
]

EXT = {"JPEG": ".jpg"}


def rel(p: Path) -> str:
    return p.relative_to(ASSETS).as_posix()


def collect() -> list[tuple[Path, str, int, int | None]]:
    out: list[tuple[Path, str, int, int | None]] = []
    for pattern, fmt, quality, max_edge in RULES:
        for p in sorted(ASSETS.glob(pattern)):
            if p.is_file():
                out.append((p, fmt, quality, max_edge))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="只报告体积，不写文件")
    args = ap.parse_args()

    rows = collect()
    if not rows:
        print("no assets matched; nothing to do")
        return 0

    before_total = 0
    after_total = 0
    resized = 0

    print(f"{'file':52} {'before':>10} {'after':>10} {'size':>12} {'q':>3}  note")
    for path, fmt, quality, max_edge in rows:
        src_bytes = path.stat().st_size
        before_total += src_bytes

        im = Image.open(path)
        im = ImageOps.exif_transpose(im)
        ow, oh = im.size
        note = ""
        if max_edge and max(ow, oh) > max_edge:
            scale = max_edge / max(ow, oh)
            nw, nh = max(1, round(ow * scale)), max(1, round(oh * scale))
            im = im.resize((nw, nh), Image.LANCZOS)
            note = f"{ow}x{oh}->{nw}x{nh}"
            resized += 1
        else:
            note = f"{ow}x{oh} (原生)"

        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")

        out_path = path.with_suffix(EXT[fmt])
        buf_im = im
        # 先编码到内存，便于 dry-run 与失败回滚
        import io

        buf = io.BytesIO()
        if fmt == "JPEG":
            buf_im.save(buf, "JPEG", quality=quality, optimize=True, progressive=True)
        else:
            raise SystemExit(f"unsupported format {fmt}")
        data = buf.getvalue()
        after_total += len(data)

        print(
            f"{rel(path):52} {src_bytes/1024:9.1f}K {len(data)/1024:9.1f}K "
            f"{(len(data)-src_bytes)/1024:+11.1f}K {quality:3}  {note}"
        )

        if args.dry_run:
            continue

        if out_path != path:
            path.unlink()
        out_path.write_bytes(data)

    print("-" * 108)
    print(
        f"{len(rows)} files   before={before_total/1024:.1f} KB   "
        f"after={after_total/1024:.1f} KB   saved={(before_total-after_total)/1024:.1f} KB "
        f"({(1-after_total/before_total)*100:.1f}%)   resized={resized}"
    )
    if args.dry_run:
        print("(dry run — no files written)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

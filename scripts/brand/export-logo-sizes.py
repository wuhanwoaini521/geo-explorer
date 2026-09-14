#!/usr/bin/env python3
"""导出 Logo 尺寸组与头像裁切（幂等，可复跑）。

输入（用户提供，已入库）：
  logo-mark-1254.png    徽章版 = 正式 Logo（山/海/海沟 + 鲸，四方位菱形）
  logo-lockup-master-1254.png  带字标锁版（「山海探逸 / Geo Explorer」）

输出：logo-mark-{1024,512,144}.png、avatar-emblem-{1024,144}.png
用法：python3 scripts/brand/export-logo-sizes.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
LOGO = ROOT / "design" / "brand" / "logo"


def main() -> None:
    mark = Image.open(LOGO / "logo-mark-1254.png").convert("RGB")
    for s in (1024, 512, 144):
        mark.resize((s, s), Image.LANCZOS).save(LOGO / f"logo-mark-{s}.png")

    lockup = Image.open(LOGO / "logo-lockup-master-1254.png").convert("RGB")
    for s in (1024, 512, 144):
        lockup.resize((s, s), Image.LANCZOS).save(LOGO / f"logo-lockup-{s}.png")

    # 头像：按徽章深色边界居中裁切 + 14% 呼吸边（微信圆形遮罩只切到纸纹角落）
    a = np.asarray(mark.convert("L"))
    ys, xs = np.where(a < 120)
    cx, cy = (xs.min() + xs.max()) // 2, (ys.min() + ys.max()) // 2
    half = int(max(xs.max() - xs.min(), ys.max() - ys.min()) / 2 * 1.14)
    avatar = mark.crop((cx - half, cy - half, cx + half, cy + half)).resize((1024, 1024), Image.LANCZOS)
    avatar.save(LOGO / "avatar-emblem-1024.png")
    avatar.resize((144, 144), Image.LANCZOS).save(LOGO / "avatar-emblem-144.png")
    print(f"logo sizes + avatar exported → {LOGO}")


if __name__ == "__main__":
    main()

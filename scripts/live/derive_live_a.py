#!/usr/bin/env python3
"""Gate 3.3C · LIVE-A portrait derivative 生成（可复现管线，纯 PIL）。

输入：design/world/everest-live/raw/ 下的原始照片（gitignored，10MB 不进仓库）
  原始文件：Mount-Everest-from-Kala-Patthar_ORIGINAL.jpg
  原始分辨率：5848×4387（AR≈0.75）
  sha256：3692bb72fd9e5eaac41f4ef91e95f0921c2656040d42e79170bae5be1c7b3db3
  来源：Wikimedia Commons · File:Mount Everest from Kala Patthar.jpg
        CC BY-SA 4.0 · Matheus Hobold Sovernigo · 拍摄 2019-04-24

输出：
  design/world/everest-live/preview/live-crop-{a,b,c}.jpg
        —— 3 个 9:16 竖屏候选（开发比较，不全部进运行时）
  miniprogram/assets/expeditions/everest/live/live-a-kala-patthar.jpg
        —— 选定的运行时派生（crop-b 中心构图）
stdout 打印每个产物尺寸 / 字节 / sha256（供 MediaManifest provenance 引用）。

设计决策（对应 Gate §4/§5/§6）：
  - 不做「object-fit:cover + 随机中心裁」；焦点/缩放在本脚本显式化。
  - 9:16 竖屏窗口：宽 = 原高 × 9/16（≈2468px 水平带），竖直方向取全高，
    缩放至 1080×1920。三个候选只差水平采样带。
  - 选中 crop-b（焦点 x=0.5，构图重心居中；峰尖保持在中上部，上 1/3 天空供 Header）。
  - JPEG quality=84 一次性有损（不重复压缩超采样原图），体积控制在 ~250KB 级。
"""

import hashlib
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW_DIR = os.path.join(ROOT, "design", "world", "everest-live", "raw")
PREVIEW_DIR = os.path.join(ROOT, "design", "world", "everest-live", "preview")
OUT_DIR = os.path.join(ROOT, "miniprogram", "assets", "expeditions", "everest", "live")

ORIGINAL = "Mount-Everest-from-Kala-Patthar_ORIGINAL.jpg"
OUT_W, OUT_H = 1080, 1920
QUALITY = 80

# 水平采样带：左缘位置 = (原宽-窗口宽) * frac
CANDIDATES = [
    {"id": "a", "x0_frac": 0.30},
    {"id": "b", "x0_frac": 0.50},
    {"id": "c", "x0_frac": 0.70},
]
SELECTED = "b"


def sha256_of(path):
    try:
        with open(path, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()
    except OSError as exc:
        sys.exit(f"read failed: {path}: {exc}")


def make_dirs(root_dir):
    try:
        os.makedirs(root_dir, exist_ok=True)
    except OSError as exc:
        sys.exit(f"mkdir failed: {root_dir}: {exc}")


def save_jpeg(img, path):
    try:
        with open(path, "wb") as f:
            img.save(f, "JPEG", quality=QUALITY, optimize=True)
    except OSError as exc:
        sys.exit(f"write failed: {path}: {exc}")


def main():
    make_dirs(PREVIEW_DIR)
    make_dirs(OUT_DIR)
    src = os.path.join(RAW_DIR, ORIGINAL)
    if not os.path.exists(src):
        sys.exit(f"missing raw original: {src}")

    try:
        with Image.open(src) as imc:
            ow, oh = imc.size
            crop_w = int(round(oh * 9 / 16))
            print(f"original_size: {imc.size}, window: {crop_w}x{oh}")
            runtime = None
            for c in CANDIDATES:
                x0 = int(round((ow - crop_w) * c["x0_frac"]))
                box = (x0, 0, x0 + crop_w, oh)
                band = imc.crop(box).resize((OUT_W, OUT_H), Image.Resampling.LANCZOS)
                is_selected = c["id"] == SELECTED
                out = os.path.join(
                    OUT_DIR if is_selected else PREVIEW_DIR,
                    "live-a-kala-patthar.jpg"
                    if is_selected
                    else f"live-crop-{c['id']}.jpg",
                )
                save_jpeg(band, out)
                hsh = sha256_of(out)
                size = os.path.getsize(out)
                kind = "runtime" if is_selected else "preview"
                print(
                    f"  {kind} {c['id']:7s} x0={x0:5d} -> {out}\n"
                    f"          {band.size} {size:8d} B sha256={hsh}"
                )
                if is_selected:
                    runtime = out
            if runtime is None:
                raise RuntimeError("selected crop not produced")
            print(f"runtime -> {runtime}")
    except (OSError, RuntimeError) as exc:
        sys.exit(f"pipeline failed: {exc}")

    print("provenance: 原始大图 gitignored (design/world/everest-live/raw/).")


if __name__ == "__main__":
    main()

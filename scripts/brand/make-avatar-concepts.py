#!/usr/bin/env python3
"""生成小程序头像概念图（3 个方向 × 1024 master + 144 列表尺寸 + 明暗底对照页）。

素材全部来自项目现有资产（globe-texture-realistic-2048.png / globe-height-2048.png /
everest 渲染），不引入外部图片。输出 design/brand/avatar-concepts/。

用法：python3 scripts/brand/make-avatar-concepts.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[2]
WORLD = ROOT / "miniprogram" / "assets" / "world"
OUT = ROOT / "design" / "brand" / "avatar-concepts"
OUT.mkdir(parents=True, exist_ok=True)

SIZE = 1024
NAVY = (8, 20, 40, 255)        # 深空蓝（与 mariana 场景 #05182f 同族）
NAVY_2 = (14, 34, 66, 255)
ICE = (207, 224, 238)          # 冰白（RGB，使用时按需加 alpha）
AMBER = (232, 176, 106)        # 岩层橙（colorado 沙色）


def circle_mask(size: int, inset: int = 0) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.ellipse((inset, inset, size - inset, size - inset), fill=255)
    return m


def radial_bg(size: int, inner, outer) -> Image.Image:
    """径向渐变底色（中心亮 → 边缘暗）。"""
    bg = Image.new("RGBA", (size, size), outer)
    grad = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(grad)
    for r in range(size // 2, 0, -1):
        v = int(255 * (r / (size / 2)))
        d.ellipse((size // 2 - r, size // 2 - r, size // 2 + r, size // 2 + r), fill=255 - v)
    bg = Image.composite(Image.new("RGBA", (size, size), inner), bg, grad)
    return bg


# ---------------- 方案 A：垂直刻度地球（垂直探索轴 + 地球） ----------------
def concept_a() -> Image.Image:
    globe = Image.open(WORLD / "globe-texture-realistic-2048.png").convert("RGBA")
    # 取整颗地球（2:1 纹理按高度裁成正方形 → 全球经度范围），居中放置
    side = globe.height
    left = (globe.width - side) // 2
    tile = globe.crop((left, 0, left + side, side)).resize((760, 760), Image.LANCZOS)
    tile = ImageOps.colorize(
        ImageOps.grayscale(tile), black=(12, 28, 54), white=(110, 156, 205)
    ).convert("RGBA")
    tile.putalpha(circle_mask(tile.width, inset=4))

    img = radial_bg(SIZE, NAVY_2, NAVY)
    img.alpha_composite(tile, ((SIZE - 760) // 2, (SIZE - 760) // 2 + 40))
    d = ImageDraw.Draw(img)
    cx = SIZE // 2
    top, bottom = 138, SIZE - 150
    # 垂直刻度轴：叠在地球之上（半透明白），上端琥珀点=峰顶，下端冰白点=深渊
    d.line((cx, top, cx, bottom), fill=ICE + (210,), width=7)
    for t in range(13):
        y = top + t * ((bottom - top) / 12)
        half = 30 if t % 6 == 0 else 16
        d.line((cx - half, y, cx + half, y), fill=ICE + (185,), width=5)
    d.ellipse((cx - 19, top - 22, cx + 19, top + 16), fill=AMBER + (255,))
    d.ellipse((cx - 13, bottom - 13, cx + 13, bottom + 13), fill=ICE + (255,))
    return img


# ---------------- 方案 B：等高线徽章（地形数据同源） ----------------
def concept_b() -> Image.Image:
    import math
    img = radial_bg(SIZE, NAVY_2, NAVY)
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # 两组"山峰"的等高环（左高峰 + 右低峰），环间距随半径增大
    centers = [(SIZE * 0.42, SIZE * 0.56, 1.0), (SIZE * 0.70, SIZE * 0.62, 0.62)]
    for (ccx, ccy, scale) in centers:
        for i in range(7):
            r = (60 + i * 52) * scale
            squash = 0.78
            pts = []
            for a in range(0, 361, 6):
                rad = math.radians(a)
                wobble = 1 + 0.05 * math.sin(rad * 3 + i)
                pts.append((ccx + r * wobble * math.cos(rad), ccy + r * squash * wobble * math.sin(rad)))
            alpha = 150 - i * 14
            color = (AMBER + (max(40, alpha),)) if i < 2 else (ICE + (max(30, alpha),))
            d.line(pts, fill=color, width=5, joint="curve")
    # 汇合点的"峰顶"点
    d.ellipse((centers[0][0] - 14, centers[0][1] - 14, centers[0][0] + 14, centers[0][1] + 14), fill=AMBER + (255,))
    layer.putalpha(Image.composite(layer.getchannel("A"), Image.new("L", (SIZE, SIZE), 0), circle_mask(SIZE, inset=96)))
    img.alpha_composite(layer)
    d2 = ImageDraw.Draw(img)
    d2.ellipse((94, 94, SIZE - 94, SIZE - 94), outline=ICE + (130,), width=5)
    return img


# ---------------- 方案 C：峰顶 / 深渊 极简标识 ----------------
def concept_c() -> Image.Image:
    img = radial_bg(SIZE, NAVY_2, NAVY)
    d = ImageDraw.Draw(img)
    cx, base = SIZE // 2, int(SIZE * 0.62)
    # 山形（三角形雪峰）
    d.polygon([(cx - 300, base), (cx - 40, base - 330), (cx + 130, base)], fill=ICE + (255,))
    d.polygon([(cx + 60, base), (cx + 250, base - 210), (cx + 380, base)], fill=(150, 180, 210, 255))
    # 雪冠
    d.polygon([(cx - 40, base - 330), (cx + 24, base - 250), (cx - 104, base - 250)], fill=(255, 255, 255, 255))
    # 下方水线（深渊）
    import math
    for i, y in enumerate((base + 78, base + 122)):
        pts = [
            (cx - 320 + x, y + 16 * math.sin((x / 320) * math.pi * 2.2 + i * 0.9))
            for x in range(0, 641, 8)
        ]
        d.line(pts, fill=(110, 190, 230, 220), width=9, joint="curve")
    # 顶点标记点（探索者）
    d.ellipse((cx - 20, base - 372, cx + 20, base - 332), fill=AMBER + (255,))
    return img


def export(concept: Image.Image, name: str) -> None:
    concept.save(OUT / f"{name}-1024.png")
    small = concept.resize((144, 144), Image.LANCZOS)
    small.save(OUT / f"{name}-144.png")


concepts = {"a-vertical-globe": concept_a(), "b-contour-badge": concept_b(), "c-peak-abyss": concept_c()}
for name, img in concepts.items():
    export(img, name)

# 明暗底对照页（在微信列表里同时看）
sheet = Image.new("RGB", (3 * 300, 2 * 300), (245, 246, 248))
for i, (name, img) in enumerate(concepts.items()):
    preview = img.resize((220, 220), Image.LANCZOS)
    for row, bg in enumerate(((245, 246, 248), (32, 36, 42))):
        tile = Image.new("RGB", (300, 300), bg)
        tile.paste(preview, (40, 40), preview)
        sheet.paste(tile, (i * 300, row * 300))
sheet.save(OUT / "compare-light-dark.png")
print(f"written 3 concepts x (1024/144) + compare sheet → {OUT}")

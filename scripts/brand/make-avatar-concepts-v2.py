#!/usr/bin/env python3
"""头像概念 v2 —— 半地球 · 彩色版。

反馈修正：
  - 用真实彩色地球纹理（不再去色），地球辨识度优先；
  - 构图以「半个地球」为核心（穹顶状地平线）；
  - 保留产品语言：垂直刻度轴 / 山峰剪影 = 探索。

输出 design/brand/avatar-concepts/（v2- 前缀）+ v2-compare-light-dark.png
用法：python3 scripts/brand/make-avatar-concepts-v2.py
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[2]
WORLD = ROOT / "miniprogram" / "assets" / "world"
OUT = ROOT / "design" / "brand" / "avatar-concepts"
OUT.mkdir(parents=True, exist_ok=True)

SIZE = 1024
SPACE = (6, 16, 34)          # 深空底
ICE = (207, 224, 238)
AMBER = (232, 176, 106)
ATMO = (108, 178, 240)       # 大气蓝


def load_earth(target: int, lon_center: float, sat: float = 1.18, lat_top: float = 0.1667, lat_bottom: float = 0.6667) -> Image.Image:
    """从 2:1 等距圆柱纹理裁出「北纬60°–南纬30°」纬度带（非洲/欧洲居中），再放到正方形画布。"""
    tex_path = WORLD / "globe-texture-realistic-4096.png"
    if not tex_path.exists():
        tex_path = WORLD / "globe-texture-realistic-2048.png"
    tex = Image.open(tex_path).convert("RGB")
    tex = ImageEnhance.Color(tex).enhance(sat)
    tex = ImageEnhance.Contrast(tex).enhance(1.06)
    w, h = tex.size
    band_h = int(h * (lat_bottom - lat_top))
    top = int(h * lat_top)
    half = band_h // 2
    left = int(w * lon_center - half) % w
    if left + band_h <= w:
        tile = tex.crop((left, top, left + band_h, top + band_h))
    else:  # 跨经度接缝
        part1 = tex.crop((left, top, w, top + band_h))
        part2 = tex.crop((0, top, band_h - part1.width, top + band_h))
        tile = Image.new("RGB", (band_h, band_h))
        tile.paste(part1, (0, 0))
        tile.paste(part2, (part1.width, 0))
    return tile.resize((target, target), Image.LANCZOS)


def limb_shade(tile: Image.Image, light=(-0.35, -0.45)) -> Image.Image:
    """球面感：偏心径向明暗（limb darkening）+ 大气边缘光。"""
    n = tile.width
    shade = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(shade)
    cxl, cyl = n * (0.5 + light[0]), n * (0.5 + light[1])
    maxd = math.hypot(max(cxl, n - cxl), max(cyl, n - cyl))
    for r in range(int(maxd), 0, -2):
        v = int(52 + 203 * (1 - r / maxd) ** 1.6)
        d.ellipse((cxl - r, cyl - r, cxl + r, cyl + r), fill=v)
    shade = shade.filter(ImageFilter.GaussianBlur(n * 0.02))
    shaded = Image.composite(tile, ImageEnhance.Brightness(tile).enhance(0.42), shade)
    return shaded


def half_globe(earth: Image.Image, dome_width: int) -> Image.Image:
    """把正方形地球视图裁成「上半球穹顶」：上缘圆弧、下缘平直（地平线）。"""
    N = earth.width
    mask = Image.new("L", (N, N), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((0, 0, N - 1, N - 1), fill=255)       # 整圆
    d.rectangle((0, N // 2, N, N), fill=0)          # 抹掉下半 → 上穹顶
    dome = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    dome.paste(earth, (0, 0), mask)
    # 缩放到目标宽度（穹顶高 = 宽/2）
    target_h = dome_width // 2 * 2
    return dome.resize((dome_width, dome_width), Image.LANCZOS)


def stars(img: Image.Image, count: int = 90, seed: int = 7) -> None:
    import random
    rnd = random.Random(seed)
    d = ImageDraw.Draw(img)
    for _ in range(count):
        x, y = rnd.randint(0, SIZE), rnd.randint(0, int(SIZE * 0.55))
        r = rnd.choice((1, 1, 2, 2, 3))
        a = rnd.randint(70, 190)
        d.ellipse((x, y, x + r, y + r), fill=ICE + (a,))


# ---------------- D：半地球 · 地平线（彩色地球 + 星空） ----------------
def concept_d() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), SPACE + (255,))
    stars(img)
    dome_w = 960
    earth = limb_shade(load_earth(1024, lon_center=0.5))
    dome = half_globe(earth, dome_w)
    cx = SIZE // 2
    base_y = int(SIZE * 0.72)            # 地平线
    pos = (cx - dome_w // 2, base_y - dome_w // 2)
    # 大气弧光（贴合穹顶圆弧）
    arc = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(arc)
    R = dome_w // 2
    for i, (w, a) in enumerate(((26, 36), (14, 70), (7, 130))):
        rr = R + 4 + i * 5
        d.arc((cx - rr, base_y - rr, cx + rr, base_y + rr), 180, 360, fill=ATMO + (a,), width=w)
    img.alpha_composite(arc)
    img.alpha_composite(dome, pos)
    # 地平线 + 下方微光（让星球"落地"而不悬空）
    d2 = ImageDraw.Draw(img)
    d2.line((cx - R - 44, base_y + 4, cx + R + 44, base_y + 4), fill=ICE + (160,), width=4)
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        (cx - R - 120, base_y - 60, cx + R + 120, base_y + 150), fill=ATMO + (34,)
    )
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(40)))
    return img


# ---------------- E：半地球 + 垂直刻度轴（保留垂直探索语言） ----------------
def concept_e() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), SPACE + (255,))
    stars(img, count=70)
    dome_w = 920
    earth = limb_shade(load_earth(1024, lon_center=0.5))
    dome = half_globe(earth, dome_w)
    cx = SIZE // 2
    base_y = int(SIZE * 0.73)
    img.alpha_composite(dome, (cx - dome_w // 2, base_y - dome_w // 2))
    d = ImageDraw.Draw(img)
    top = 126
    R = dome_w // 2
    apex_y = base_y - R                      # 穹顶顶点
    # 穹顶之上：清晰刻度轴
    d.line((cx, top, cx, apex_y - 6), fill=ICE + (215,), width=7)
    for t in range(7):
        y = top + t * ((apex_y - 6 - top) / 6)
        half = 26 if t % 3 == 0 else 14
        d.line((cx - half, y, cx + half, y), fill=ICE + (190,), width=5)
    # 穿越地球段：淡线（保持"贯穿星球"的语义，但不压住大陆细节）
    d.line((cx, apex_y + 4, cx, base_y - 6), fill=ICE + (75,), width=5)
    d.ellipse((cx - 19, top - 22, cx + 19, top + 16), fill=AMBER + (255,))
    return img


# ---------------- F：半地球 + 山脊剪影（探索落在星球上） ----------------
def concept_f() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), SPACE + (255,))
    stars(img, count=70, seed=11)
    dome_w = 880
    earth = limb_shade(load_earth(1024, lon_center=0.5))
    dome = half_globe(earth, dome_w)
    cx = SIZE // 2
    base_y = int(SIZE * 0.63)
    img.alpha_composite(dome, (cx - dome_w // 2, base_y - dome_w // 2))
    d = ImageDraw.Draw(img)
    # 山脊剪影：基部在地平线下方，峰顶越过地平线、压在地球亮部上；
    # 近黑山体 + 雪线亮边（对深空底与彩色地球同时可读）
    ridge = [
        (SIZE * 0.04, base_y + 260), (SIZE * 0.18, base_y + 20), (SIZE * 0.28, base_y + 120),
        (SIZE * 0.42, base_y - 150), (SIZE * 0.53, base_y + 4), (SIZE * 0.64, base_y - 70),
        (SIZE * 0.76, base_y + 40), (SIZE * 0.90, base_y + 170), (SIZE * 0.98, base_y + 280),
    ]
    d.polygon(ridge, fill=(4, 10, 24, 255))
    d.line(ridge[1:7], fill=ICE + (215,), width=6, joint="curve")
    d.line([(SIZE * 0.42, base_y - 150), (SIZE * 0.47, base_y - 60)], fill=ICE + (150,), width=4)
    d.line((SIZE * 0.6, base_y + 8, SIZE * 0.6, base_y + 150), fill=ATMO + (80,), width=4)
    return img


def export(concept: Image.Image, name: str) -> None:
    concept.convert("RGBA").save(OUT / f"{name}-1024.png")
    concept.convert("RGBA").resize((144, 144), Image.LANCZOS).save(OUT / f"{name}-144.png")


concepts = {
    "v2-d-half-earth": concept_d(),
    "v2-e-half-earth-axis": concept_e(),
    "v2-f-half-earth-ridge": concept_f(),
}
for name, img in concepts.items():
    export(img, name)

sheet = Image.new("RGB", (len(concepts) * 300, 600), (245, 246, 248))
for i, (name, img) in enumerate(concepts.items()):
    preview = img.convert("RGBA").resize((220, 220), Image.LANCZOS)
    for row, bg in enumerate(((245, 246, 248), (32, 36, 42))):
        tile = Image.new("RGB", (300, 300), bg)
        tile.paste(preview, (40, 40), preview)
        sheet.paste(tile, (i * 300, row * 300))
sheet.save(OUT / "v2-compare-light-dark.png")


# 列表尺寸（144px）可读性对照：每个方案 144 实际像素，3x 放大展示
sheet144 = Image.new("RGB", (len(concepts) * 260, 260), (245, 246, 248))
for i, (name, img) in enumerate(concepts.items()):
    small = img.convert("RGBA").resize((144, 144), Image.LANCZOS)
    zoom = small.resize((216, 216), Image.NEAREST)
    tile = Image.new("RGB", (260, 260), (245, 246, 248))
    tile.paste(zoom, (22, 22), zoom)
    sheet144.paste(tile, (i * 260, 0))
sheet144.save(OUT / "v2-list-size-144.png")
print("v2 written →", OUT)

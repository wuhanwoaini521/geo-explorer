"""Create render-ready globe texture variants from the checked-in source.

The original 1024px image is kept as the audit baseline. The cleaned source
removes the duplicated vertical strip before the variants use Lanczos
resampling plus a restrained unsharp pass for a large partial globe.
"""

from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design" / "world" / "globe-texture-realistic-seamless-source.png"


def build_variant(source: Image.Image, width: int, sharpen_radius: float, sharpen_percent: int) -> None:
    height = width // 2
    resized = source.resize((width, height), Image.Resampling.LANCZOS)
    enhanced = resized.filter(
        ImageFilter.UnsharpMask(
            radius=sharpen_radius,
            percent=sharpen_percent,
            threshold=3,
        )
    )
    output = SOURCE.with_name(f"globe-texture-realistic-{width}.png")
    enhanced.save(output, format="PNG", optimize=True)
    print(f"wrote {output} ({width}x{height})")


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing source: {SOURCE}")
    source = Image.open(SOURCE).convert("RGB")
    build_variant(source, 2048, 1.05, 28)
    build_variant(source, 4096, 1.45, 22)


if __name__ == "__main__":
    main()

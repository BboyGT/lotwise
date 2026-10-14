#!/usr/bin/env python3
"""Generate PNG icons (192, 512, 180, 32) for PWA manifest from the Lotwise logo SVG."""
import cairosvg
from PIL import Image
import os
from pathlib import Path

PUBLIC_DIR = Path("/home/z/my-project/public")
SVG_PATH = PUBLIC_DIR / "logo.svg"

SIZES = [
    (192, "icon-192.png"),
    (512, "icon-512.png"),
    (180, "apple-touch-icon.png"),  # iOS
    (32, "favicon-32.png"),
    (16, "favicon-16.png"),
]

# Maskable icons need extra padding (safe zone ~80%)
MASKABLE_SIZES = [
    (192, "icon-192-maskable.png"),
    (512, "icon-512-maskable.png"),
]

def svg_to_png(svg_path: Path, out_path: Path, size: int):
    """Render SVG to PNG at given size."""
    cairosvg.svg2png(
        url=str(svg_path),
        write_to=str(out_path),
        output_width=size,
        output_height=size,
        background_color="#050608",
    )
    print(f"✓ {out_path.name} ({size}x{size})")

def make_maskable(src_png: Path, out_path: Path, size: int):
    """Create a maskable icon by placing the source on a larger canvas with padding."""
    # Maskable icons need ~10% padding on all sides for the safe zone
    canvas_size = size
    icon_size = int(size * 0.8)
    padding = (canvas_size - icon_size) // 2

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (5, 6, 8, 255))
    icon = Image.open(src_png).convert("RGBA").resize((icon_size, icon_size), Image.LANCZOS)
    canvas.paste(icon, (padding, padding), icon)
    canvas.save(out_path, "PNG", optimize=True)
    print(f"✓ {out_path.name} ({size}x{size}, maskable)")

def main():
    if not SVG_PATH.exists():
        print(f"✗ Source SVG not found: {SVG_PATH}")
        return

    # Generate plain PNG icons
    for size, name in SIZES:
        out_path = PUBLIC_DIR / name
        svg_to_png(SVG_PATH, out_path, size)

    # Generate maskable icons (for Android adaptive icons)
    for size, name in MASKABLE_SIZES:
        # First render at full size, then create maskable version
        tmp_path = PUBLIC_DIR / f"_tmp_{size}.png"
        svg_to_png(SVG_PATH, tmp_path, size)
        out_path = PUBLIC_DIR / name
        make_maskable(tmp_path, out_path, size)
        tmp_path.unlink()  # cleanup

    # Generate favicon.ico (multi-size ICO)
    favicon_32 = PUBLIC_DIR / "favicon-32.png"
    favicon_16 = PUBLIC_DIR / "favicon-16.png"
    if favicon_32.exists() and favicon_16.exists():
        ico_path = PUBLIC_DIR / "favicon.ico"
        img32 = Image.open(favicon_32)
        img16 = Image.open(favicon_16)
        img32.save(ico_path, format="ICO", sizes=[(32, 32), (16, 16)])
        print(f"✓ favicon.ico (multi-size)")

    print("\nAll icons generated in:", PUBLIC_DIR)

if __name__ == "__main__":
    main()

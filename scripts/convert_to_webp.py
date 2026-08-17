#!/usr/bin/env python3
"""Convert PNG/JPG originals to size-capped WebP and remove the originals.

Also downscales existing WebP files that exceed MAX_SIDE, so the site stays
well under the GitHub Pages size limit. EXIF data (incl. DateTimeOriginal,
used for sorting and showing the year) is preserved, and the original file
modification time is carried over to the output.
"""

import os
from pathlib import Path

from PIL import Image, ImageOps

IMAGES_DIR = Path("images")
CONVERT_EXTENSIONS = {".png", ".jpg", ".jpeg"}
IMAGE_EXTENSIONS = CONVERT_EXTENSIONS | {".webp"}
MAX_SIDE = 2400
QUALITY = 85
ORIENTATION_TAG = 0x0112


def get_exif_bytes(im: Image.Image) -> bytes | None:
    exif = im.getexif()
    if not len(exif):
        return None
    if ORIENTATION_TAG in exif:
        del exif[ORIENTATION_TAG]
    try:
        return exif.tobytes()
    except Exception:
        return None


def save_webp(im: Image.Image, out_path: Path) -> None:
    kwargs = {"quality": QUALITY, "method": 6}
    exif_bytes = get_exif_bytes(im)
    if exif_bytes:
        kwargs["exif"] = exif_bytes
    im.save(out_path, "WEBP", **kwargs)


def normalize(im: Image.Image) -> Image.Image:
    im = ImageOps.exif_transpose(im)
    if im.mode not in ("RGB", "RGBA", "L"):
        has_alpha = im.mode in ("P", "LA", "PA") or "A" in im.getbands()
        im = im.convert("RGBA" if has_alpha else "RGB")
    if max(im.size) > MAX_SIDE:
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    return im


def process_file(path: Path) -> str:
    """Convert/downscale one image. Returns a change description or ''.
    File modification time is preserved so date-based sorting stays stable."""
    stat = path.stat()
    mtime = stat.st_mtime

    with Image.open(path) as im:
        if getattr(im, "is_animated", False):
            return ""

        if path.suffix.lower() in CONVERT_EXTENSIONS:
            out_path = path.with_suffix(".webp")
            im = normalize(im)
            save_webp(im, out_path)
            os.utime(out_path, (mtime, mtime))
            path.unlink()
            return f"converted {path.name} -> {out_path.name} ({im.size[0]}x{im.size[1]})"

        if path.suffix.lower() == ".webp" and max(im.size) > MAX_SIDE:
            im = normalize(im)
            save_webp(im, path)
            os.utime(path, (mtime, mtime))
            return f"downscaled {path.name} to {im.size[0]}x{im.size[1]}"

    return ""


def main() -> None:
    converted = downscaled = 0
    for path in sorted(IMAGES_DIR.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        try:
            result = process_file(path)
        except Exception as e:
            print(f"! failed on {path}: {e}")
            continue
        if result:
            print(f"✓ {result}")
            if result.startswith("converted"):
                converted += 1
            else:
                downscaled += 1
    print(f"\nDone: {converted} converted, {downscaled} downscaled, 0 originals kept")


if __name__ == "__main__":
    main()

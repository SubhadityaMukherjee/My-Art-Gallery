#!/usr/bin/env python3
"""Convert PNG/JPG originals to size-capped WebP, remove the originals, and
maintain a mirrored tree of ~700px thumbnails under images/thumbs/ for the grid.

Oversized WebP files are also capped at MAX_SIDE, so the site stays well under
the GitHub Pages size limit. EXIF data (incl. DateTimeOriginal, used for
sorting and showing the year) is preserved on full-size images, and the
original file modification time is carried over to the output.
"""

import os
from pathlib import Path

from PIL import Image, ImageOps

IMAGES_DIR = Path("images")
THUMBS_DIR = IMAGES_DIR / "thumbs"
CONVERT_EXTENSIONS = {".png", ".jpg", ".jpeg"}
IMAGE_EXTENSIONS = CONVERT_EXTENSIONS | {".webp"}
MAX_SIDE = 2400
QUALITY = 85
THUMB_SIDE = 700
THUMB_QUALITY = 80
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


def process_file(path: Path) -> Path | None:
    """Convert/downscale one image, returning the final webp path.
    File modification time is preserved so date-based sorting stays stable."""
    stat = path.stat()
    mtime = stat.st_mtime

    im = Image.open(path)
    if getattr(im, "is_animated", False):
        im.close()
        return None

    try:
        if path.suffix.lower() in CONVERT_EXTENSIONS:
            out_path = path.with_suffix(".webp")
            im = normalize(im)
            save_webp(im, out_path)
            os.utime(out_path, (mtime, mtime))
            path.unlink()
            return out_path

        if path.suffix.lower() == ".webp" and max(im.size) > MAX_SIDE:
            im = normalize(im)
            save_webp(im, path)
            os.utime(path, (mtime, mtime))
            return path
    finally:
        im.close()

    return path


def ensure_thumb(src: Path) -> bool:
    """Create images/thumbs/<same path> at THUMB_SIDE. Returns True if written.
    Thumb mtime mirrors the source mtime, so staleness is detectable."""
    thumb = THUMBS_DIR / src.relative_to(IMAGES_DIR)
    src_mtime = int(src.stat().st_mtime)
    if thumb.exists() and int(thumb.stat().st_mtime) == src_mtime:
        return False

    with Image.open(src) as im:
        t = im.copy()
        t.thumbnail((THUMB_SIDE, THUMB_SIDE), Image.LANCZOS)
        thumb.parent.mkdir(parents=True, exist_ok=True)
        t.save(thumb, "WEBP", quality=THUMB_QUALITY, method=6)
    os.utime(thumb, (src_mtime, src_mtime))
    return True


def prune_stale_thumbs(valid_rel_paths: set) -> int:
    """Remove thumbs whose source image no longer exists."""
    removed = 0
    if not THUMBS_DIR.exists():
        return 0
    for thumb in THUMBS_DIR.rglob("*"):
        if not thumb.is_file():
            continue
        rel = thumb.relative_to(THUMBS_DIR)
        if rel not in valid_rel_paths:
            thumb.unlink()
            removed += 1
    return removed


def main() -> None:
    converted = 0
    thumbs = 0
    valid_rel_paths = set()

    for path in sorted(IMAGES_DIR.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        if THUMBS_DIR in path.parents:
            continue
        try:
            final = process_file(path)
            if final is None:
                continue
            valid_rel_paths.add(final.relative_to(IMAGES_DIR))
            if final != path:
                print(f"✓ converted {path.name} -> {final.name}")
                converted += 1
            if ensure_thumb(final):
                thumbs += 1
        except Exception as e:
            print(f"! failed on {path}: {e}")

    pruned = prune_stale_thumbs(valid_rel_paths)
    print(f"\nDone: {converted} converted, {thumbs} thumbs written, {pruned} stale thumbs pruned")


if __name__ == "__main__":
    main()

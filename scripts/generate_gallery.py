import json
from pathlib import Path
from datetime import datetime
from PIL import Image
from PIL.ExifTags import TAGS

IMAGES_DIR = Path("images")
OUTPUT_FILE = Path("data/gallery.json")

# Order for top-level categories (can be customized)
CATEGORY_ORDER = ["fanart", "concept_art", "character_design", "animals", "food", "random"]


def title_from_filename(filename: str) -> str:
    name = filename.rsplit(".", 1)[0]
    name = name.replace("_", " ")
    return name.strip().title()


def title_from_folder(folder: str) -> str:
    return folder.replace("_", " ").title()


def get_exif_date_taken(file_path: Path) -> float:
    """Extract EXIF DateTimeOriginal from image file, return timestamp or 0."""
    try:
        with Image.open(file_path) as img:
            exif_data = img._getexif()
            if exif_data:
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)
                    if tag == "DateTimeOriginal":
                        # Format: "YYYY:MM:DD HH:MM:SS"
                        dt = datetime.strptime(value, "%Y:%m:%d %H:%M:%S")
                        return dt.timestamp()
    except Exception:
        pass
    return 0


def get_image_files(directory: Path) -> list[Path]:
    """Get all image files in a directory, sorted by creation time (newest first)."""
    image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    images_files = [
        f for f in directory.iterdir() 
        if f.is_file() 
        and not f.name.startswith(".")
        and f.suffix.lower() in image_extensions
    ]
    
    # Try to get EXIF date, fall back to file ctime
    def get_sort_key(f: Path) -> float:
        exif_date = get_exif_date_taken(f)
        if exif_date > 0:
            return exif_date
        return f.stat().st_ctime
    
    images_files.sort(key=get_sort_key, reverse=True)
    return images_files


def build_category_structure(base_path: Path, parent_path: Path | None = None) -> dict | None:
    """
    Recursively build category structure.
    Returns a category dict with subcategories or images.
    """
    # Determine the relative path ID
    if parent_path is None:
        rel_path = base_path.relative_to(IMAGES_DIR)
        category_id = rel_path.name
    else:
        rel_path = base_path.relative_to(IMAGES_DIR)
        category_id = str(rel_path).replace("/", "::")

    # Get images in this directory
    images = get_image_files(base_path)
    
    # Build subcategories first
    subdirs = sorted([d for d in base_path.iterdir() if d.is_dir()])
    subcategories = []
    
    for subdir in subdirs:
        subcat = build_category_structure(subdir, base_path)
        if subcat:
            subcategories.append(subcat)
    
    # Only include this category if it has images or subcategories
    if not images and not subcategories:
        return None
    
    category = {
        "id": category_id,
        "title": title_from_folder(base_path.name),
    }
    
    if images:
        category["images"] = [
            {"file": f.name, "title": title_from_filename(f.name)} for f in images
        ]
    
    if subcategories:
        category["subcategories"] = subcategories
    
    return category


def sort_categories(categories: list) -> list:
    """Sort categories based on predefined order, then alphabetically."""
    def sort_key(cat):
        try:
            return (0, CATEGORY_ORDER.index(cat["id"]))
        except ValueError:
            return (1, cat["id"])
    
    # Sort this level
    sorted_cats = sorted(categories, key=sort_key)
    
    # Recursively sort subcategories
    for cat in sorted_cats:
        if "subcategories" in cat:
            cat["subcategories"] = sort_categories(cat["subcategories"])
    
    return sorted_cats


# Build the gallery structure recursively
gallery = {"categories": []}

# Process top-level directories
for item in sorted(IMAGES_DIR.iterdir()):
    if item.is_dir():
        category = build_category_structure(item)
        if category:
            gallery["categories"].append(category)

# Sort categories by predefined order
gallery["categories"] = sort_categories(gallery["categories"])

OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(gallery, f, indent=2, ensure_ascii=False)

print(f"✓ gallery.json generated with {len(gallery['categories'])} top-level categories")

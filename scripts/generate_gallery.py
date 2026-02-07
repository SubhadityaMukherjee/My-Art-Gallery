import json
from pathlib import Path

IMAGES_DIR = Path("images")
OUTPUT_FILE = Path("data/gallery.json")


def title_from_filename(filename: str) -> str:
    name = filename.rsplit(".", 1)[0]
    name = name.replace("_", " ")
    return name.strip().title()


def title_from_folder(folder: str) -> str:
    return folder.replace("_", " ").title()


gallery = {"categories": []}

for category_dir in sorted(IMAGES_DIR.iterdir()):
    if not category_dir.is_dir():
        continue

    # Sort images by creation time descending (newest first)
    images_files = [
        f for f in category_dir.iterdir() if f.is_file() and not f.name.startswith(".")
    ]
    images_files = [f for f in images_files if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif", ".webp"}]
    images_files.sort(key=lambda f: f.stat().st_ctime, reverse=True)

    images = [
        {"file": f.name, "title": title_from_filename(f.name)} for f in images_files
    ]

    if not images:
        continue

    gallery["categories"].append(
        {
            "id": category_dir.name,
            "title": title_from_folder(category_dir.name),
            "images": images,
        }
    )

OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(gallery, f, indent=2, ensure_ascii=False)

print(f"✓ gallery.json generated with {len(gallery['categories'])} categories")

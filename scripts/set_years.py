#!/usr/bin/env python3
"""One-off: stamp correct creation years into image EXIF (DateTimeOriginal).

Years sourced from the artist's archive (Archives/ART/MyArt/<year>/Decent/).
The value is embedded in the file itself so it survives git checkouts and
drives both the displayed year and per-section sorting in gallery.json.

Re-encodes WebP at quality 85 (same as the conversion pipeline).
"""

import os
from datetime import datetime
from pathlib import Path

from PIL import Image

IMAGES_DIR = Path("images")
DATETIME_TAG = 36867  # DateTimeOriginal

YEAR_MAP = {
    # 2021
    "fanart/Baby_Yoda.webp": 2021,
    "animals/Detective Feather.webp": 2021,
    "fanart/Percy jackson chosen.webp": 2021,
    # 2022
    "concept_art/Water diety.webp": 2022,
    "concept_art/dragon_lotus_music.webp": 2022,
    "animals/penguin.webp": 2022,
    # 2023
    "concept_art/Floaty cathedral lady.webp": 2023,
    "concept_art/Valentines_Day_Flowers.webp": 2023,
    "concept_art/Tree_Grandpa.webp": 2023,
    "concept_art/lotus.webp": 2023,
    "concept_art/tube.webp": 2023,
    "fanart/lily from modern family.webp": 2023,
    "fanart/niffler.webp": 2023,
    "fanart/Assassins_Creed_Egypt.webp": 2023,
    "animals/Cat and dog.webp": 2023,
    "animals/Ducky with a flower on her head.webp": 2023,
    "animals/Magic kitty.webp": 2023,
    "animals/Valentines day mice.webp": 2023,
    "food/Dim sum.webp": 2023,
    # 2024
    "concept_art/Lioness.webp": 2024,
    "animals/owl.webp": 2024,
    "concept_art/Huge flower and a girl painting it.webp": 2024,
    "concept_art/Girl with her tiny animal friends.webp": 2024,
    "concept_art/My grandmother.webp": 2024,
    "concept_art/Entry to Narnia.webp": 2024,
    "concept_art/boat_people.webp": 2024,
    "concept_art/dad_mask.webp": 2024,
    "concept_art/dragon_cafe_doodle.webp": 2024,
    "concept_art/dumplings.webp": 2024,
    "fanart/Mahabharata fanart.webp": 2024,
    "fanart/aranara.webp": 2024,
    "fanart/genshin zhongli.webp": 2024,
    "food/Ramen.webp": 2024,
    "food/oranges.webp": 2024,
    "animals/Christmas_Card.webp": 2024,
    # 2025
    "animals/Christmas_Card_25.webp": 2025,
    "animals/Golden retriever puppy with our peace lily.webp": 2025,
    "concept_art/A girl in a cacti garden.webp": 2025,
    "concept_art/Character_Practice.webp": 2025,
    "concept_art/Essence_Eater.webp": 2025,
    "concept_art/Mecha.webp": 2025,
    "concept_art/Muscle man.webp": 2025,
    "concept_art/Otters.webp": 2025,
    "concept_art/Ugh_That's_A_Huge_Bug.webp": 2025,
    "concept_art/The_Botherlands Concept map.webp": 2025,
    "fanart/2025_Art_Summary.webp": 2025,
    "fanart/Black myth wukong fanart.webp": 2025,
    "fanart/Black myth wukong and elden ring fanart.webp": 2025,
    "fanart/Elden ring + harry potter.webp": 2025,
    "fanart/finch fanart for my engagement.webp": 2025,
    "food/Mums_Birthday_Card_25.webp": 2025,
    "random/My Wedding_Card.webp": 2025,
    "fanart/Pokemon/Pokemon_And_The_House_Of_Hades.webp": 2025,
    # 2026
    "concept_art/Eclipse.webp": 2026,
    "concept_art/City_Dragons.webp": 2026,
    "concept_art/Pokopia.webp": 2026,
    "concept_art/Mini_Characters.webp": 2026,
    "concept_art/Seagull_Paniek.webp": 2026,
    "concept_art/Life_Is_Transient.webp": 2024,
    "fanart/soda_pop.webp": 2026,
    "fanart/A_Discovery_Of_Stitches.webp": 2026,
    "fanart/Sekiro fanart.webp": 2026,
    "fanart/Pokemon/PikaPi.webp": 2026,
    "fanart/Pokemon/Its_Cold_Today.webp": 2026,
    "fanart/Pokemon/Move, snorlax!.webp": 2026,
    "food/Shrimp ramen.webp": 2026,
    "doodles/Crumb.webp": 2026,
    "doodles/Forge.webp": 2026,
    "doodles/Ghost pokemon army.webp": 2026,
    "doodles/House_Of_Horus.webp": 2026,
    "doodles/Hoverboard.webp": 2026,
}


def stamp(path: Path, year: int) -> None:
    dt = datetime(year, 7, 1, 12, 0, 0)
    value = dt.strftime("%Y:%m:%d %H:%M:%S")

    with Image.open(path) as im:
        exif = im.getexif()
        exif[DATETIME_TAG] = value
        exif.get_ifd(0x8769)[DATETIME_TAG] = value
        data = exif.tobytes()

    tmp = path.with_suffix(".webp.tmp")
    with Image.open(path) as im:
        im.save(tmp, "WEBP", quality=85, method=6, exif=data)
    tmp.replace(path)
    os.utime(path, (dt.timestamp(), dt.timestamp()))


def read_back_year(path: Path) -> int | None:
    with Image.open(path) as im:
        exif = im._getexif()
    if not exif:
        return None
    for tag_id, value in exif.items():
        if TAGS_NAME.get(tag_id) == "DateTimeOriginal":
            return datetime.strptime(value, "%Y:%m:%d %H:%M:%S").year
    return None


from PIL.ExifTags import TAGS as TAGS_NAME  # noqa: E402


def main() -> None:
    stamped = failed = 0
    for rel, year in YEAR_MAP.items():
        path = IMAGES_DIR / rel
        if not path.exists():
            print(f"! missing file: {rel}")
            failed += 1
            continue
        stamp(path, year)
        got = read_back_year(path)
        if got == year:
            stamped += 1
        else:
            print(f"! verification failed: {rel} expected {year}, read {got}")
            failed += 1

    # Ensure every gallery image is covered
    on_disk = {
        str(p.relative_to(IMAGES_DIR))
        for p in IMAGES_DIR.rglob("*.webp")
        if "thumbs" not in p.parts
    }
    uncovered = sorted(on_disk - set(YEAR_MAP))
    if uncovered:
        print("! files not in YEAR_MAP:")
        for rel in uncovered:
            print(f"    {rel}")

    print(f"\nDone: {stamped} stamped, {failed} failed, {len(uncovered)} unmapped")


if __name__ == "__main__":
    main()

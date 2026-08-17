#!/usr/bin/env python3
"""Generate feed.xml (RSS 2.0) from data/gallery.json.

Run after generate_gallery.py — the CI workflow regenerates the feed
whenever artwork changes, so subscribers always see new pieces.
"""

import json
from datetime import datetime, timezone
from email.utils import format_datetime
from html import escape
from pathlib import Path
from urllib.parse import quote

SITE_URL = "https://subhadityamukherjee.github.io/My-Art-Gallery/"
OUTPUT_FILE = Path("feed.xml")
LIMIT = 30


def collect_items(categories):
    """Yield (cat_id, index_in_category, image_entry) for all artworks."""
    for cat in categories:
        for idx, img in enumerate(cat.get("images", [])):
            yield cat["id"], idx, img
        yield from collect_items(cat.get("subcategories", []))


def item_date(img):
    # EXIF stamps use mid-year placeholders (YYYY-07-01 12:00)
    return datetime(img.get("year", 2000), 7, 1, 12, 0, tzinfo=timezone.utc)


def build_item(cat_id, idx, img):
    cat_path = cat_id.replace("::", "/")
    link = f"{SITE_URL}#category={quote(cat_id, safe='')}&index={idx}"
    thumb = f"{SITE_URL}images/thumbs/{quote(cat_path)}/{quote(img['file'])}"

    description = f'<img src="{thumb}" alt="{escape(img["title"])}" />'
    if img.get("story"):
        description += f"<p>{escape(img['story'].strip())}</p>"

    return f"""    <item>
      <title>{escape(img["title"])}</title>
      <link>{escape(link)}</link>
      <guid isPermaLink="true">{escape(link)}</guid>
      <pubDate>{format_datetime(item_date(img))}</pubDate>
      <description>{escape(description)}</description>
    </item>"""


def main():
    gallery = json.loads(Path("data/gallery.json").read_text(encoding="utf-8"))

    items = sorted(collect_items(gallery["categories"]),
                   key=lambda t: item_date(t[2]), reverse=True)[:LIMIT]

    now = format_datetime(datetime.now(timezone.utc))
    body = "\n".join(build_item(*t) for t in items)

    feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Subhaditya Mukherjee — Art Portfolio</title>
    <link>{SITE_URL}</link>
    <atom:link href="{SITE_URL}feed.xml" rel="self" type="application/rss+xml" />
    <description>New illustration and concept art by Subhaditya Mukherjee.</description>
    <language>en</language>
    <lastBuildDate>{now}</lastBuildDate>
{body}
  </channel>
</rss>
"""

    OUTPUT_FILE.write_text(feed, encoding="utf-8")
    print(f"✓ feed.xml generated with {len(items)} items")


if __name__ == "__main__":
    main()

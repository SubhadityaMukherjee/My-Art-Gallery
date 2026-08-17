# My Art Gallery

Portfolio site hosted on GitHub Pages. Everything below is automated by CI
(`.github/workflows/generate-gallery.yml`) — you normally only ever touch the
`images/` folder and `data/featured.txt`.

## Adding artwork

1. Drop the image into `images/<category>/` (PNG or JPG, any size).
   A `.txt` file with the same name holds the story text (optional).
2. Push. CI converts the image to WebP (max 2400px), deletes the original,
   builds a ~700px thumbnail under `images/thumbs/`, and regenerates
   `data/gallery.json`.

Categories are the folders inside `images/`. Subfolders become subcategories.

## Editing the Featured strip

Edit `data/featured.txt` — one image path per line (relative to `images/`),
line order = display order, `#` lines are comments. Push to update.

## Regenerating locally

```
uv run python scripts/convert_to_webp.py     # WebP conversion + thumbnails
uv run python scripts/generate_gallery.py    # rebuild data/gallery.json
```

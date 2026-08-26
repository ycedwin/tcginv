# TCG inventory

Personal One Piece Card Game shelf. Edit stock in Google Sheets; the site reads it on every load.

| | URL |
| --- | --- |
| Live site | https://ycedwin.github.io/tcginv/ |
| Repo | https://github.com/ycedwin/tcginv |
| Edit sheet | https://docs.google.com/spreadsheets/d/13RjDz2IGcvSb8KrWYBPKKtT_ny63emMX2hxmUPxR_pg/edit?gid=0#gid=0 |

## Sheet columns

| Column | What it does |
| --- | --- |
| Card number | `op13-004` — set is already in the id |
| Rarity | `l` / `sr` / `r` / `uc` / `c` / `p` |
| Alternate | blank = normal. `y` = Alt. Other text (e.g. `jolly roger`) is shown as-is |
| Cost | what you paid. Empty or `0` shows as — |
| Sold | empty = in stock. A number = sold at that price |
| Thumbnail url | optional. Overrides the auto JP image |

Each row is one copy. Same card + same cost + same sold price stacks as qty. Different cost or sold price stays a separate lot.

Keep the sheet **Anyone with the link can view**. After edits, refresh the site. Google can cache for a minute or two.

Card images are remembered in the browser after the first successful load, so later visits skip the fallback hunt. Say when a thumbnail needs a refresh.

## Banner

- **designs** — unique cards
- **in stock** — copies with Sold empty
- **sold** — copies with a sold price
- **All shown** — no search/filter hiding cards

## Local

```bash
python3 -m http.server 8765
```

Open http://127.0.0.1:8765/

Optional photos without Bandai’s SAMPLE mark: drop `OP13-004.jpg` (or `.png` / `.webp`) in `thumbs/`.

```bash
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc shelf.js check.js
```

## Notes

Not affiliated with Bandai or the One Piece Card Game. Official JP digital images include Bandai’s SAMPLE mark.

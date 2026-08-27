# TCG inventory

Personal One Piece and Pokémon shelves. Edit stock in Google Sheets; the site reads it on every load.

| | URL |
| --- | --- |
| Live site | https://ycedwin.github.io/tcginv/ |
| Pokémon | https://ycedwin.github.io/tcginv/pkm.html |
| Repo | https://github.com/ycedwin/tcginv |
| OP sheet | https://docs.google.com/spreadsheets/d/13RjDz2IGcvSb8KrWYBPKKtT_ny63emMX2hxmUPxR_pg/edit?gid=0#gid=0 |
| PKM sheet | https://docs.google.com/spreadsheets/d/13RjDz2IGcvSb8KrWYBPKKtT_ny63emMX2hxmUPxR_pg/edit?gid=1049461967#gid=1049461967 |

## Sheet columns

| Column | What it does |
| --- | --- |
| Card number | `op13-004` — set is already in the id |
| Rarity | `l` / `sr` / `r` / `uc` / `c` / `p` |
| Parallel | blank = normal. `y` = Alt art. `jolly roger` = JR foil from [CardRush](https://www.cardrush-op.jp/product/) |
| Cost | what you paid. Empty or `0` shows as — |
| Condition | blank = no tag. `A` / `B` / `C` / `D` shows on the image (bottom left) |
| Sold | empty = in stock. A number = sold at that price |
| Thumbnail url | optional. Overrides the auto JP image |

Each row is one copy. Same card + same cost + same sold price + same condition stacks as qty. Different cost, sold price, or condition stays a separate lot.

## PKM tab

Same spreadsheet, tab **PKM**. Page: [pkm.html](https://ycedwin.github.io/tcginv/pkm.html).

| Column | What it does |
| --- | --- |
| Set | JP set code: `sv3`, `s10b`, `sv4a`. `promo` = SV-P. `old back` = 旧裏. `SoulSilver Collection` = L1 |
| Card number | `066/108`, `291/sv-p`, or `#067` for old-back dex numbers |
| Rarity | `C` / `R` / `RR` / `RRR` / `AR` / `SR` / `CHR` / … — blank = no tag |
| Cost(Yen) | yen in the sheet. The PKM page converts to HKD on display |
| Condition | blank = no tag. `A` / `B` / `C` / `D` |
| Sold | empty = in stock. A number = sold at that price |

Images come from [TCGdex](https://tcgdex.dev) JP art. If that file is missing, a few odd sets fall back to [Hareruya2](https://www.hareruya2.com/). Override anything with `thumbs/pkm/SV3-066.jpg`.

Newest sheet rows show first. The sort button cycles newest-first → card number A–Z → Z–A.

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

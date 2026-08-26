const OPShelf = (() => {
  const SHEET_ID = "13RjDz2IGcvSb8KrWYBPKKtT_ny63emMX2hxmUPxR_pg";
  const SHEET_GID = "0";
  const SHEET_EDIT = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
  const IMAGE_CDN = "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece";
  const RARITY_LABELS = {
    l: "Leader",
    sr: "Super Rare",
    r: "Rare",
    uc: "Uncommon",
    c: "Common",
    p: "Promo",
  };
  const RARITY_ORDER = ["l", "sr", "r", "uc", "c", "p"];

  function pick(row, ...keys) {
    for (const key of keys) {
      if (row[key] != null && row[key] !== "") return row[key];
      const found = Object.keys(row).find((name) => name.toLowerCase() === key.toLowerCase());
      if (found != null && row[found] !== "" && row[found] != null) return row[found];
    }
    return "";
  }

  function normalizeCardId(raw) {
    const text = String(raw || "").trim();
    const match = text.match(/^([a-z]+)(\d*)-(\d+)$/i);
    if (!match) return text.toUpperCase();
    return `${match[1].toUpperCase()}${match[2]}-${match[3].padStart(3, "0")}`;
  }

  function setCode(id) {
    const index = String(id).lastIndexOf("-");
    return index === -1 ? id : id.slice(0, index);
  }

  function parseAlternate(value) {
    if (value === true) return "Alt";
    if (value === false || value == null) return "";
    const text = String(value).trim();
    if (!text) return "";
    if (/^(y|yes|true|1|x|✓|✔)$/i.test(text)) return "Alt";
    return text;
  }

  function rarityLabel(rarity) {
    const key = String(rarity || "").trim().toLowerCase();
    if (RARITY_LABELS[key]) return key.toUpperCase();
    return String(rarity || "").toUpperCase() || "?";
  }

  function imageCandidates(card) {
    const urls = [];
    if (card.thumbnail) urls.push(card.thumbnail);
    urls.push(`thumbs/${card.id}.webp`, `thumbs/${card.id}.png`, `thumbs/${card.id}.jpg`);
    const base = `${IMAGE_CDN}/${card.set}/${card.id}`;
    if (card.alternate) urls.push(`${base}_p1_JP.webp`);
    urls.push(`${base}_JP.webp`);
    // ponytail: Bandai sets CORP=same-site so we proxy official JP art.
    urls.push(`https://wsrv.nl/?url=${encodeURIComponent(`www.onepiece-cardgame.com/images/cardlist/card/${card.id}.png`)}`);
    return [...new Set(urls)];
  }

  function parseNumber(value) {
    if (value === "" || value == null || value === false || value === true) return null;
    const num = Number(String(value).replace(/,/g, "").trim());
    return Number.isFinite(num) ? num : null;
  }

  function parseSold(value) {
    if (value === "" || value == null || value === false) return { sold: false, price: null };
    if (value === true) return { sold: true, price: null };
    const text = String(value).trim();
    if (!text) return { sold: false, price: null };
    const num = parseNumber(text);
    if (num != null) {
      if (num === 0) return { sold: false, price: null };
      return { sold: true, price: num };
    }
    if (/^(y|yes|true|sold|x|✓|✔|已售|售)$/i.test(text)) return { sold: true, price: null };
    return { sold: false, price: null };
  }

  function isSold(value) {
    return parseSold(value).sold;
  }

  function formatPrice(value) {
    if (value == null || value === "") return "—";
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) return "—";
    return Number.isInteger(num) ? String(num) : String(Math.round(num * 100) / 100);
  }

  function pickSold(row) {
    const direct = pick(row, "Sold", "Sold price", "Sold indicator", "sold_indicator", "Sold?");
    if (direct !== "") return direct;
    const found = Object.keys(row).find((name) => /\bsold\b/i.test(name));
    return found ? row[found] : "";
  }

  function finishCard(card) {
    card.remaining = card.sold ? 0 : card.quantity;
    card.status = card.sold ? "sold" : "in-stock";
    return card;
  }

  function groupRows(rows) {
    const map = new Map();
    for (const row of rows) {
      const raw = String(pick(row, "Card number", "card_number") || "").trim();
      if (!raw) continue;
      const id = normalizeCardId(raw);
      const rarity = String(pick(row, "Rarity") || "").trim();
      const alternate = parseAlternate(pick(row, "Alternate"));
      const thumbnail = String(pick(row, "Thumbnail url", "thumbnail_url") || "").trim();
      const cost = parseNumber(pick(row, "Cost")) || 0;
      const soldInfo = parseSold(pickSold(row));
      const key = [id, rarity.toLowerCase(), alternate.toLowerCase(), cost, soldInfo.sold ? (soldInfo.price ?? "sold") : "open"].join("|");
      const existing = map.get(key);
      if (existing) {
        existing.quantity += 1;
        if (!existing.thumbnail && thumbnail) existing.thumbnail = thumbnail;
        continue;
      }
      map.set(key, {
        id,
        set: setCode(id),
        raw,
        rarity,
        rarityKey: rarity.toLowerCase(),
        alternate,
        cost,
        soldPrice: soldInfo.price,
        thumbnail,
        quantity: 1,
        sold: soldInfo.sold,
      });
    }
    return [...map.values()].map(finishCard).sort((a, b) =>
      a.set.localeCompare(b.set, "en", { numeric: true })
      || a.id.localeCompare(b.id, "en", { numeric: true })
      || a.rarityKey.localeCompare(b.rarityKey)
      || a.alternate.localeCompare(b.alternate)
      || Number(a.sold) - Number(b.sold)
      || a.cost - b.cost
      || (a.soldPrice || 0) - (b.soldPrice || 0)
    );
  }

  function cellValue(cell) {
    if (!cell || cell.v == null) return "";
    return cell.v;
  }

  function parseGvizText(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Sheet response was not JSON");
    return JSON.parse(text.slice(start, end + 1));
  }

  function rowsFromGviz(json) {
    if (!json || json.status !== "ok" || !json.table) throw new Error("Sheet query failed");
    const cols = json.table.cols.map((col) => col.label || col.id);
    return (json.table.rows || []).map((row) => {
      const object = {};
      cols.forEach((label, i) => {
        object[label] = cellValue(row.c?.[i]);
      });
      return object;
    });
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (quoted && text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === "," && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && text[i + 1] === "\n") i += 1;
        row.push(cell);
        if (row.some((value) => value.trim())) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    row.push(cell);
    if (row.some((value) => String(value).trim())) rows.push(row);

    const [headers, ...records] = rows;
    if (!headers) return [];
    return records.map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])));
  }

  return {
    SHEET_ID,
    SHEET_GID,
    SHEET_EDIT,
    RARITY_ORDER,
    normalizeCardId,
    setCode,
    rarityLabel,
    parseAlternate,
    imageCandidates,
    parseSold,
    isSold,
    formatPrice,
    groupRows,
    parseGvizText,
    rowsFromGviz,
    parseCsv,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = OPShelf;

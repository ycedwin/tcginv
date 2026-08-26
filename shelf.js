const OPShelf = (() => {
  const SHEET_ID = "13RjDz2IGcvSb8KrWYBPKKtT_ny63emMX2hxmUPxR_pg";
  const SHEET_GID = "0";
  const SHEET_EDIT = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
  const IMAGE_CDN = "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece";
  const CARDRUSH_IMG = "https://www.cardrush-op.jp/data/cardrush-op/product";
  // ponytail: CardRush product IDs are not derived from card number.
  const JR_THUMBS = {
    "OP03-121": `${CARDRUSH_IMG}/PRB01-02_141.jpg`,
    "OP06-064": `${CARDRUSH_IMG}/PRB01-02_66.jpg`,
    "OP06-065": `${CARDRUSH_IMG}/PRB01-02_64.jpg`,
  };
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

  function parseParallel(value) {
    if (value === true) return { label: "Alt", parallel: true, jollyRoger: false };
    if (value === false || value == null) return { label: "", parallel: false, jollyRoger: false };
    const text = String(value).trim();
    if (!text) return { label: "", parallel: false, jollyRoger: false };
    const lower = text.toLowerCase();
    const jollyRoger = /jolly\s*roger|\bjr\b/.test(lower);
    const rest = lower.replace(/jolly\s*roger/g, " ").replace(/\bjr\b/g, " ");
    const parallel = /^(y|yes|true|1|x|✓|✔|p|alt|parallel)$/i.test(text)
      || /\b(y|yes|true|parallel|alt)\b/.test(rest);
    if (jollyRoger && parallel) return { label: "Jolly Roger · Alt", parallel: true, jollyRoger: true };
    if (jollyRoger) return { label: "Jolly Roger", parallel: false, jollyRoger: true };
    if (parallel) return { label: "Alt", parallel: true, jollyRoger: false };
    return { label: text, parallel: true, jollyRoger: false };
  }

  function parseAlternate(value) {
    return parseParallel(value).label;
  }

  function officialArt(id) {
    return `https://wsrv.nl/?url=${encodeURIComponent(`www.onepiece-cardgame.com/images/cardlist/card/${id}.png`)}`;
  }

  function imageCandidates(card) {
    const urls = [];
    if (card.thumbnail) urls.push(card.thumbnail);
    urls.push(`thumbs/${card.id}.webp`, `thumbs/${card.id}.png`, `thumbs/${card.id}.jpg`);
    const jr = card.jollyRoger || /jolly\s*roger|\bjr\b/i.test(card.alternate || "");
    const para = card.parallel || (!!card.alternate && !jr);
    if (jr && JR_THUMBS[card.id]) urls.push(JR_THUMBS[card.id]);
    const base = `${IMAGE_CDN}/${card.set}/${card.id}`;
    if (para) urls.push(`${base}_p1_JP.webp`);
    urls.push(`${base}_JP.webp`);
    urls.push(officialArt(card.id));
    return [...new Set(urls)];
  }

  function rarityLabel(rarity) {
    const key = String(rarity || "").trim().toLowerCase();
    if (RARITY_LABELS[key]) return key.toUpperCase();
    return String(rarity || "").toUpperCase() || "?";
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

  function parseCondition(value) {
    const text = String(value == null ? "" : value).trim().toUpperCase();
    if (!text) return "";
    const match = text.match(/^([ABCD])(?:[+-])?$/) || text.match(/\b([ABCD])\b/);
    return match ? match[1] : "";
  }

  function finishCard(card) {
    card.remaining = card.sold ? 0 : card.quantity;
    card.status = card.sold ? "sold" : "in-stock";
    return card;
  }

  function groupRows(rows) {
    const map = new Map();
    rows.forEach((row, index) => {
      const raw = String(pick(row, "Card number", "card_number") || "").trim();
      if (!raw) return;
      const id = normalizeCardId(raw);
      const rarity = String(pick(row, "Rarity") || "").trim();
      const parsed = parseParallel(pick(row, "Parallel", "Alternate"));
      const alternate = parsed.label;
      const condition = parseCondition(pick(row, "Condition", "Cond", "状態"));
      const thumbnail = String(pick(row, "Thumbnail url", "thumbnail_url") || "").trim();
      const cost = parseNumber(pick(row, "Cost")) || 0;
      const soldInfo = parseSold(pickSold(row));
      const key = [id, rarity.toLowerCase(), alternate.toLowerCase(), condition, cost, soldInfo.sold ? (soldInfo.price ?? "sold") : "open"].join("|");
      const existing = map.get(key);
      if (existing) {
        existing.quantity += 1;
        existing.added = index;
        if (!existing.thumbnail && thumbnail) existing.thumbnail = thumbnail;
        return;
      }
      map.set(key, {
        id,
        set: setCode(id),
        raw,
        rarity,
        rarityKey: rarity.toLowerCase(),
        alternate,
        parallel: parsed.parallel,
        jollyRoger: parsed.jollyRoger,
        condition,
        cost,
        soldPrice: soldInfo.price,
        thumbnail,
        quantity: 1,
        sold: soldInfo.sold,
        added: index,
      });
    });
    return [...map.values()].map(finishCard);
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
    parseParallel,
    imageCandidates,
    parseCondition,
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

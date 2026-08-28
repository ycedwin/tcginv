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
  // ponytail: official filenames are not always {id}.png; some promos need a scan URL.
  const ART_OVERRIDE = {
    "ST01-007": `https://wsrv.nl/?url=${encodeURIComponent("asia-tc.onepiece-cardgame.com/images/cardlist/card/ST01-007_p5.png")}`,
    "P-022": "https://i.ebayimg.com/images/g/O-4AAOSwjqRmSDcD/s-l960.webp",
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
    const special = /(^|\b)sp\b/.test(lower);
    const rest = lower.replace(/jolly\s*roger/g, " ").replace(/\bjr\b/g, " ").replace(/(^|\b)sp\b/g, " ");
    const parallel = /^(y|yes|true|1|x|✓|✔|p|alt|parallel)$/i.test(text)
      || /\b(y|yes|true|parallel|alt)\b/.test(rest);
    if (jollyRoger && parallel) return { label: "Jolly Roger · Alt", parallel: true, jollyRoger: true };
    if (jollyRoger) return { label: "Jolly Roger", parallel: false, jollyRoger: true };
    if (special) return { label: "SP", parallel: true, jollyRoger: false };
    if (parallel) return { label: "Alt", parallel: true, jollyRoger: false };
    return { label: text, parallel: true, jollyRoger: false };
  }

  function parseAlternate(value) {
    return parseParallel(value).label;
  }

  function parallelMark(alternate) {
    const text = String(alternate || "");
    if (text === "Alt") return "★";
    if (text === "Jolly Roger · Alt") return "Jolly Roger · ★";
    return text;
  }

  function officialArt(id) {
    return `https://wsrv.nl/?url=${encodeURIComponent(`www.onepiece-cardgame.com/images/cardlist/card/${id}.png`)}`;
  }

  function imageCandidates(card) {
    const urls = [];
    if (card.thumbnail) urls.push(card.thumbnail);
    urls.push(`thumbs/${card.id}.webp`, `thumbs/${card.id}.png`, `thumbs/${card.id}.jpg`);
    const jr = card.jollyRoger || /jolly\s*roger|\bjr\b/i.test(card.alternate || "");
    const sp = /\bsp\b/i.test(card.alternate || "");
    const para = card.parallel || (!!card.alternate && !jr);
    if (jr && JR_THUMBS[card.id]) urls.push(JR_THUMBS[card.id]);
    if (ART_OVERRIDE[card.id]) urls.push(ART_OVERRIDE[card.id]);
    const base = `${IMAGE_CDN}/${card.set}/${card.id}`;
    if (sp) {
      urls.push(`${base}_p2_JP.webp`);
      urls.push(`https://wsrv.nl/?url=${encodeURIComponent(`www.onepiece-cardgame.com/images/cardlist/card/${card.id}_p2.png`)}`);
    }
    if (para) urls.push(`${base}_p1_JP.webp`);
    urls.push(`${base}_JP.webp`);
    if (!ART_OVERRIDE[card.id]) urls.push(officialArt(card.id));
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

  function formatHkd(value) {
    const text = formatPrice(value);
    return text === "—" ? "—" : "HK$" + text;
  }

  // ponytail: sheet stays yen; 1 JPY = 0.05 HKD on the page.
  function formatHkdFromYen(value) {
    if (value == null || value === "") return "—";
    const yen = Number(value);
    if (!Number.isFinite(yen) || yen === 0) return "—";
    const hkd = Math.round(yen * 0.05);
    return "HK$" + (hkd > 0 ? hkd : 1);
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
      const thumbnail = pickThumbnail(row);
      const cost = parseNumber(pick(row, "Cost", "Cost(Yen)", "Cost (Yen)")) || 0;
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

  function parseThumbUrl(value) {
    const text = String(value == null ? "" : value).trim();
    const match = text.match(/https?:\/\/[^\s"'<>\\]+/i);
    return match ? match[0].replace(/[),]+$/, "") : "";
  }

  function pickThumbnail(row) {
    const named = pick(row, "Thumbnail url", "Thumbnail URL", "Thumbnail", "Thumb", "Image url");
    if (named) return parseThumbUrl(named);
    const found = Object.keys(row).find((name) => /thumbnail/i.test(String(name)));
    return parseThumbUrl(found ? row[found] : "");
  }

  function cellValue(cell) {
    if (!cell) return "";
    if (cell.v != null && cell.v !== "") return cell.v;
    if (cell.f) return cell.f;
    return cell.v == null ? "" : cell.v;
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
    parallelMark,
    imageCandidates,
    parseCondition,
    parseSold,
    pickSold,
    isSold,
    formatPrice,
    formatHkd,
    formatHkdFromYen,
    groupRows,
    pick,
    parseNumber,
    parseGvizText,
    rowsFromGviz,
    parseCsv,
  };
})();

const PkmShelf = (() => {
  const SHEET_ID = OPShelf.SHEET_ID;
  const SHEET_GID = "1049461967";
  const SHEET_EDIT = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
  const RARITY_ORDER = ["c", "u", "r", "rr", "rrr", "ar", "sr", "sar", "ur", "hr", "chr", "csr", "k"];
  const OFFICIAL_HOST = "https://www.pokemon-card.com";
  // ponytail: official filenames include an internal id, so this map is hand-resolved.
  const OFFICIAL = {
    "sv3|066/108": "/assets/images/card_images/large/SV3/043908_P_RIZADONEX.jpg",
    "s9|014/100": "/assets/images/card_images/large/S9/040916_P_RIZADONV.jpg",
    "m2|013/080": "/assets/images/card_images/large/M2/048353_P_MRIZADONXEX.jpg",
    "svk|001/044": "/assets/images/card_images/large/SVK/046072_P_KAGAYAKURIZADON.jpg",
    "sv4a|115/190": "/assets/images/card_images/large/SV4a/044638_P_RIZADONEX.jpg",
    "s8b|017/184": "/assets/images/card_images/large/S8b/040169_P_RIZADON.jpg",
    "s12a|013/172": "/assets/images/card_images/large/S12a/042274_P_RIZADONV.jpg",
    "s12a|014/172": "/assets/images/card_images/large/S12a/042275_P_RIZADONVSTAR.jpg",
    "sv5m|023/071": "/assets/images/card_images/large/SV5M/045240_P_PIKACHIXYUU.jpg",
    "sv4a|055/190": "/assets/images/card_images/large/SV4a/044578_P_PIKACHIXYUU.jpg",
    "sv2d|017/071": "/assets/images/card_images/large/SV2D/043153_P_PIKACHIXYUU.jpg",
    "s10a|014/071": "/assets/images/card_images/large/S10a/041533_P_PIKACHIXYUU.jpg",
    "mc|227/742": "/assets/images/card_images/large/MC/048943_P_PIKACHIXYUUEX.jpg",
    "sv2a|025/165": "/assets/images/card_images/large/SV2a/043346_P_PIKACHIXYUU.jpg",
    "s8b|045/184": "/assets/images/card_images/large/S8b/040197_P_PIKACHIXYUUV.jpg",
    "sm10a|009/054": "/assets/images/card_images/large/SM10a/036549_P_PIKACHUU.jpg",
    "sv8|033/106": "/assets/images/card_images/large/SV8/046373_P_PIKACHIXYUUEX.jpg",
    "s10a|023/071": "/assets/images/card_images/large/S10a/041542_P_GENGA.jpg",
    "m1l|065/063": "/assets/images/card_images/large/M1L/048422_P_FUSHIGISOU.jpg",
    "sv2a|184/165": "/assets/images/card_images/large/SV2a/043969_P_FUSHIGIBANAEX.jpg",
    "sv2a|166/165": "/assets/images/card_images/large/SV2a/043951_P_FUSHIGIDANE.jpg",
    "m1l|064/063": "/assets/images/card_images/large/M1L/048421_P_FUSHIGIDANE.jpg",
    "m1l|076/063": "/assets/images/card_images/large/M1L/048433_P_MFUSHIGIBANAEX.jpg",
    "s12a|054/172": "/assets/images/card_images/large/S12a/042315_P_MIXYUUVMAX.jpg",
    "s11|080/100": "/assets/images/card_images/large/S11/041884_P_GIRATEINAV.jpg",
    "s8b|101/184": "/assets/images/card_images/large/S8b/040250_P_BURAKKIVMAX.jpg",
    "m2a|210/193": "/assets/images/card_images/large/M2a/049970_P_NNOZEKUROMU.jpg",
    "m5|087/081": "/assets/images/card_images/large/M5/050307_P_YADORAN.jpg",
    "sv11b|161/086": "/assets/images/card_images/large/SV11B/047985_P_ZEKUROMUEX.jpg",
    "sv3a|071/062": "/assets/images/card_images/large/SV3a/044387_P_IBERUTARU.jpg",
    "s8|115/100": "/assets/images/card_images/large/S8/040113_T_PODDOTODENTOTOKON.jpg",
    "m3|107/080": "/assets/images/card_images/large/M3/050074_T_MEINOHAGEMASHI.jpg",
    "s8b|261/184": "/assets/images/card_images/large/S8b/041089_T_SAITOU.jpg",
    "mc|443/742": "/assets/images/card_images/large/MC/049159_P_GOSUTO.jpg",
    "sv4a|173/190": "/assets/images/card_images/large/SV4a/044696_T_SAKAKINOKARISUMA.jpg",
    "svjl|006/021": "/assets/images/card_images/large/SVJL/045806_P_RIZADONEX.jpg",
  };
  const HARERUYA_CDN = "https://www.hareruya2.com/cdn/shop/";
  // ponytail: Hareruya filenames include a shop suffix, so this map is search-resolved.
  const HARERUYA = {
    "smh|032/131": "products/d032131smh-2-8156744.jpg",
    "svd|034/139": "products/d034139svd-2-3672398.jpg",
    "sld|007/020": "products/vd007020sld-2-1014709.jpg",
    "sh|019/053": "products/v-019053sh-l-2-3925970.jpg",
    "sh|014/053": "products/v-014053sh-l-2-4695600.jpg",
    "mp1|006/023": "files/ex-006023mp1-1432706.webp",
    "sv-p|291/sv-p": "files/promo291sv-psv-p-1726857.webp",
    "oldback|#067": "products/op00-2-7948918.jpg",
    "oldback|067": "products/op00-2-7948918.jpg",
    "l1|031/070": "products/r031070l1-l-2-1098972.jpg",
  };
  const TCGPLAYER_IMG = "https://product-images.tcgplayer.com/fit-in/437x437";
  // ponytail: TCGplayer product IDs are not derived from set+number, so this map is search-resolved.
  const TCGPLAYER = {
    "m1l|001/063": 647110,
    "m1l|002/063": 647111,
    "m2|058/080": 655837,
    "m2a|044/193": 665715,
    "m2a|112/193": 665783,
    "m2a|126/193": 665797,
    "m2a|199/193": 665870,
    "m3|021/080": 674340,
    "m3|086/080": 674405,
    "m5|029/081": 695013,
    "mc|441/742": 669386,
  };

  function canonicalSet(raw) {
    const text = String(raw || "").trim();
    if (!text) return "";
    if (/^promo$/i.test(text)) return "SV-P";
    if (/^old\s*back$/i.test(text) || text === "旧裏") return "OldBack";
    if (/soul\s*silver/i.test(text) || text === "ソウルシルバーコレクション") return "L1";
    const match = text.match(/^([a-z]+)(\d*)([a-z]*)$/i);
    if (!match) return text.toUpperCase();
    const prefix = match[1].toUpperCase();
    const digits = match[2];
    let suffix = match[3];
    if (suffix.length === 1 && /[ab]/i.test(suffix)) suffix = suffix.toLowerCase();
    else suffix = suffix.toUpperCase();
    return prefix + digits + suffix;
  }

  function setVariants(setId) {
    const text = String(setId || "").trim();
    if (!text) return [];
    const match = text.match(/^([a-z]+)(\d*)([a-z]*)$/i);
    if (!match) return [...new Set([text, text.toUpperCase()])];
    const prefix = match[1].toUpperCase();
    const digits = match[2];
    const suffix = match[3];
    return [...new Set([
      text,
      prefix + digits + suffix,
      prefix + digits + suffix.toUpperCase(),
      prefix + digits + suffix.toLowerCase(),
      text.toUpperCase(),
    ])].filter(Boolean);
  }

  function seriesOf(setId) {
    const upper = String(setId || "").toUpperCase();
    if (upper.startsWith("SV")) return "SV";
    if (upper.startsWith("SM")) return "SM";
    if (upper.startsWith("S")) return "S";
    if (upper.startsWith("M")) return "M";
    return upper.slice(0, 2) || "SV";
  }

  function parseCollector(raw) {
    const text = String(raw || "").trim();
    if (!text) return { localId: "", number: "", raw: "" };
    const dex = text.match(/^#\s*(\d+)$/);
    if (dex) {
      const localId = dex[1].padStart(3, "0");
      return { localId, number: `#${localId}`, raw: text };
    }
    const promo = text.match(/^(\d+)\s*\/\s*sv-?p$/i);
    if (promo) {
      const localId = promo[1].padStart(3, "0");
      return { localId, number: `${localId}/SV-P`, raw: text };
    }
    const split = text.match(/^(\d+)\s*\/\s*(.+)$/);
    if (split) {
      const localId = split[1].padStart(3, "0");
      return { localId, number: `${localId}/${split[2]}`, raw: text };
    }
    const digits = text.match(/^(\d+)$/);
    if (digits) {
      const localId = digits[1].padStart(3, "0");
      return { localId, number: localId, raw: text };
    }
    return { localId: text.toUpperCase(), number: text, raw: text };
  }

  function rarityLabel(rarity) {
    return String(rarity || "").trim().toUpperCase();
  }

  function imageCandidates(card) {
    const urls = [];
    if (card.thumbnail) urls.push(card.thumbnail);
    const stem = `${card.set}-${card.localId}`;
    urls.push(`thumbs/pkm/${stem}.webp`, `thumbs/pkm/${stem}.jpg`);
    const officialPath = OFFICIAL[`${String(card.set).toLowerCase()}|${String(card.number).toLowerCase()}`]
      || OFFICIAL[`${String(card.set).toLowerCase()}|${String(card.raw).toLowerCase()}`];
    if (officialPath) urls.push(OFFICIAL_HOST + officialPath);
    const hareruyaPath = HARERUYA[`${String(card.set).toLowerCase()}|${String(card.number).toLowerCase()}`]
      || HARERUYA[`${String(card.set).toLowerCase()}|${String(card.raw).toLowerCase()}`];
    if (hareruyaPath) {
      urls.push(HARERUYA_CDN + hareruyaPath);
      urls.push(`https://wsrv.nl/?url=${encodeURIComponent("www.hareruya2.com/cdn/shop/" + hareruyaPath)}`);
    }
    for (const setId of setVariants(card.set)) {
      const series = seriesOf(setId);
      urls.push(`https://assets.tcgdex.net/ja/${series}/${setId}/${card.localId}/high.webp`);
    }
    const tcgId = TCGPLAYER[`${String(card.set).toLowerCase()}|${String(card.number).toLowerCase()}`]
      || TCGPLAYER[`${String(card.set).toLowerCase()}|${String(card.raw).toLowerCase()}`];
    if (tcgId) {
      urls.push(`${TCGPLAYER_IMG}/${tcgId}.jpg`);
      urls.push(`https://tcgplayer-cdn.tcgplayer.com/product/${tcgId}_in_1000x1000.jpg`);
    }
    return [...new Set(urls)];
  }

  function normCollector(value) {
    const text = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
    const split = text.match(/^0*(\d+)\/(.+)$/);
    if (split) return `${split[1].padStart(3, "0")}/${split[2]}`;
    const dex = text.match(/^#?0*(\d+)$/);
    if (dex) return dex[1].padStart(3, "0");
    return text;
  }

  function pickTcgplayerId(items, card) {
    const wantSet = String(card.set || "").toUpperCase().replace(/-/g, "");
    const wantNum = normCollector(card.number) || normCollector(card.raw);
    let loose = 0;
    for (let i = 0; i < (items || []).length; i += 1) {
      const item = items[i];
      const pid = Number(item.productId) || 0;
      if (!pid) continue;
      const code = String(item.setCode || "").toUpperCase().replace(/-/g, "");
      const num = normCollector((item.customAttributes || {}).number);
      if (num === wantNum && (code === wantSet || code.indexOf(wantSet) !== -1 || wantSet.indexOf(code) !== -1)) return pid;
      if (!loose && num === wantNum) loose = pid;
    }
    return loose;
  }

  function lookupTcgplayer(card) {
    if (typeof fetch !== "function") return Promise.resolve("");
    const q = encodeURIComponent(`${card.set} ${String(card.number || "").replace(/^#/, "")}`);
    const body = {
      algorithm: "sales_exp_fields_boosting",
      from: 0,
      size: 8,
      filters: { term: { productLineName: ["pokemon-japan"] }, range: {}, match: {} },
      listingSearch: { context: { cart: {} }, filters: { term: { sellerStatus: "Live", channelId: 0 } } },
      context: { cart: {}, shippingCountry: "US" },
      settings: { useFuzzySearch: true, didYouMean: {} },
      sort: {},
    };
    return fetch(`https://mp-search-api.tcgplayer.com/v1/search/request?q=${q}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((response) => (response.ok ? response.json() : null)).then((data) => {
      const items = data && data.results && data.results[0] && data.results[0].results;
      const pid = pickTcgplayerId(items, card);
      return pid ? `${TCGPLAYER_IMG}/${pid}.jpg` : "";
    }).catch(() => "");
  }

  function groupRows(rows) {
    const map = new Map();
    rows.forEach((row, index) => {
      const numberRaw = String(OPShelf.pick(row, "Card number", "card_number") || "").trim();
      const setRaw = String(OPShelf.pick(row, "Set", "Expansion", "パック") || "").trim();
      if (!numberRaw && !setRaw) return;
      const set = canonicalSet(setRaw);
      const parsed = parseCollector(numberRaw);
      if (!parsed.localId) return;
      const rarity = String(OPShelf.pick(row, "Rarity") || "").trim();
      const condition = OPShelf.parseCondition(OPShelf.pick(row, "Condition", "Cond", "状態"));
      const thumbnail = String(OPShelf.pick(row, "Thumbnail url", "thumbnail_url") || "").trim();
      const cost = OPShelf.parseNumber(OPShelf.pick(row, "Cost(Yen)", "Cost (Yen)", "Cost", "円")) || 0;
      const soldInfo = OPShelf.parseSold(OPShelf.pickSold(row));
      const id = `${set} ${parsed.number}`.trim();
      const key = [id, rarity.toLowerCase(), condition, cost, soldInfo.sold ? (soldInfo.price ?? "sold") : "open"].join("|");
      const existing = map.get(key);
      if (existing) {
        existing.quantity += 1;
        existing.added = index;
        if (!existing.thumbnail && thumbnail) existing.thumbnail = thumbnail;
        return;
      }
      map.set(key, {
        id,
        set,
        localId: parsed.localId,
        number: parsed.number,
        raw: parsed.raw || numberRaw,
        rarity,
        rarityKey: rarity.toLowerCase(),
        alternate: "",
        condition,
        cost,
        soldPrice: soldInfo.price,
        thumbnail,
        quantity: 1,
        sold: soldInfo.sold,
        added: index,
      });
    });
    return [...map.values()].map((card) => {
      card.remaining = card.sold ? 0 : card.quantity;
      card.status = card.sold ? "sold" : "in-stock";
      return card;
    });
  }

  return {
    SHEET_ID,
    SHEET_GID,
    SHEET_EDIT,
    RARITY_ORDER,
    canonicalSet,
    parseCollector,
    rarityLabel,
    imageCandidates,
    lookupTcgplayer,
    pickTcgplayerId,
    groupRows,
    parseCondition: OPShelf.parseCondition,
    parseSold: OPShelf.parseSold,
    isSold: OPShelf.isSold,
    formatPrice: OPShelf.formatPrice,
    formatHkd: OPShelf.formatHkd,
    formatHkdFromYen: OPShelf.formatHkdFromYen,
    rowsFromGviz: OPShelf.rowsFromGviz,
    parseCsv: OPShelf.parseCsv,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = OPShelf;
  module.exports.PkmShelf = PkmShelf;
}
if (typeof globalThis !== "undefined") {
  globalThis.OPShelf = OPShelf;
  globalThis.PkmShelf = PkmShelf;
}

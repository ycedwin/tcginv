function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: ${actual} !== ${expected}`);
}

function assertDeepEqual(actual, expected, label) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) throw new Error(`${label}: ${left} !== ${right}`);
}

assertEqual(OPShelf.normalizeCardId("op17-54"), "OP17-054", "pad card number");
assertEqual(OPShelf.normalizeCardId("p-088"), "P-088", "promo id");
assertEqual(OPShelf.normalizeCardId("prb02-017"), "PRB02-017", "prb id");
assertEqual(OPShelf.setCode("OP13-004"), "OP13", "set from id");
assertEqual(OPShelf.setCode("P-088"), "P", "promo set");
assertEqual(OPShelf.parseAlternate("y"), "Alt", "y is alt");
assertEqual(OPShelf.parseAlternate("yes"), "Alt", "yes is alt");
assertEqual(OPShelf.parseAlternate(""), "", "empty alt");
assertEqual(OPShelf.parseAlternate("jolly roger"), "jolly roger", "named alt");

const grouped = OPShelf.groupRows([
  { "Card number": "op14-014", Rarity: "r", Alternate: "", Cost: 0, "Thumbnail url": "" },
  { "Card number": "op14-014", Rarity: "r", Alternate: "", Cost: 0, "Thumbnail url": "" },
  { "Card number": "op14-014", Rarity: "r", Alternate: "", Cost: 0, "Thumbnail url": "" },
  { "Card number": "op14-014", Rarity: "r", Alternate: "", Cost: 0, "Thumbnail url": "" },
  { "Card number": "op14-014", Rarity: "r", Alternate: "", Cost: 0, "Thumbnail url": "" },
  { "Card number": "op03-121", Rarity: "c", Alternate: "jolly roger", Cost: 0, "Thumbnail url": "" },
  { "Card number": "", Rarity: "r", Alternate: "", Cost: 0, "Thumbnail url": "" },
]);
assertEqual(grouped.length, 2, "group count");
assertEqual(grouped.filter(function (card) { return card.id === "OP14-014"; })[0].quantity, 5, "qty");
assertEqual(grouped.filter(function (card) { return card.id === "OP14-014"; })[0].sold, false, "unsold");
assertEqual(grouped.filter(function (card) { return card.id === "OP14-014"; })[0].status, "in-stock", "in stock");
assertEqual(grouped.filter(function (card) { return card.id === "OP03-121"; })[0].alternate, "jolly roger", "alternate");

assertEqual(OPShelf.isSold(true), true, "checkbox true");
assertEqual(OPShelf.isSold("SOLD"), true, "sold text");
assertEqual(OPShelf.isSold(48), true, "sold price");
assertEqual(OPShelf.isSold(""), false, "empty not sold");
assertEqual(OPShelf.isSold("no"), false, "no");
assertEqual(OPShelf.parseSold(48).price, 48, "parse sold price");
assertEqual(OPShelf.formatPrice(48), "48", "format sold price");
assertEqual(OPShelf.formatPrice(0), "—", "format zero");

const lots = OPShelf.groupRows([
  { "Card number": "op13-004", Rarity: "l", Alternate: "", Cost: 10, Sold: "" },
  { "Card number": "op13-004", Rarity: "l", Alternate: "", Cost: 10, Sold: "" },
  { "Card number": "op13-004", Rarity: "l", Alternate: "", Cost: 20, Sold: "" },
  { "Card number": "op13-004", Rarity: "l", Alternate: "", Cost: 10, Sold: 30 },
  { "Card number": "op13-004", Rarity: "l", Alternate: "", Cost: 10, Sold: 45 },
  { "Card number": "op17-063", Rarity: "sr", Alternate: "", Cost: 8, Sold: "sold" },
]);
assertEqual(lots.length, 5, "split lots");
const openTen = lots.filter(function (card) { return card.id === "OP13-004" && card.cost === 10 && !card.sold; })[0];
const openTwenty = lots.filter(function (card) { return card.id === "OP13-004" && card.cost === 20 && !card.sold; })[0];
const soldThirty = lots.filter(function (card) { return card.soldPrice === 30; })[0];
const soldFortyFive = lots.filter(function (card) { return card.soldPrice === 45; })[0];
assertEqual(openTen.quantity, 2, "same cost stacks");
assertEqual(openTwenty.quantity, 1, "other cost is own lot");
assertEqual(soldThirty.sold, true, "sold lot");
assertEqual(soldThirty.cost, 10, "sold keeps cost");
assertEqual(soldFortyFive.quantity, 1, "different sold price is own lot");
assertEqual(lots.filter(function (card) { return card.id === "OP17-063"; })[0].status, "sold", "sold without price");

assertDeepEqual(
  OPShelf.imageCandidates({ id: "OP06-065", set: "OP06", alternate: "jolly roger", thumbnail: "" }),
  [
    "thumbs/OP06-065.webp",
    "thumbs/OP06-065.png",
    "thumbs/OP06-065.jpg",
    "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP06/OP06-065_p1_JP.webp",
    "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP06/OP06-065_JP.webp",
    "https://wsrv.nl/?url=www.onepiece-cardgame.com%2Fimages%2Fcardlist%2Fcard%2FOP06-065.png",
  ],
  "parallel art first"
);

assertDeepEqual(
  OPShelf.imageCandidates({ id: "SV8-001", set: "SV8", alternate: "", thumbnail: "" }, "pkm"),
  ["thumbs/SV8-001.webp", "thumbs/SV8-001.png", "thumbs/SV8-001.jpg"],
  "pkm skips OP art"
);

assertEqual(OPShelf.pageById("pkm").sheet, "pkm", "pkm page");
assertEqual(OPShelf.sheetQuery(OPShelf.pageById("pkm")), "sheet=pkm", "pkm query");

const gviz = OPShelf.parseGvizText('/*O_o*/\ncb({"status":"ok","table":{"cols":[{"id":"A","label":"Card number"},{"id":"B","label":"Rarity"}],"rows":[{"c":[{"v":"op13-004"},{"v":"l"}]}]}});');
assertDeepEqual(OPShelf.rowsFromGviz(gviz), [{ "Card number": "op13-004", Rarity: "l" }], "gviz rows");

const csv = OPShelf.parseCsv("Card number,Rarity,Alternate,Cost,Sold,Thumbnail url\nop17-063,sr,,0,y,\n");
assertEqual(csv[0]["Card number"], "op17-063", "csv parse");
assertEqual(csv[0].Sold, "y", "csv sold");

print("ok");

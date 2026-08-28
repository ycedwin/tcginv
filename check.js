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
assertEqual(OPShelf.parallelMark("Alt"), "★", "alt mark");
assertEqual(OPShelf.parallelMark("SP"), "SP", "sp mark stays");
assertEqual(OPShelf.parallelMark("Jolly Roger · Alt"), "Jolly Roger · ★", "jr alt mark");
assertEqual(OPShelf.parseAlternate(""), "", "empty alt");
assertEqual(OPShelf.parseAlternate("jolly roger"), "Jolly Roger", "jr label");
assertEqual(OPShelf.parseParallel("jolly roger, y").label, "Jolly Roger · Alt", "jr and parallel");
assertEqual(OPShelf.parseParallel("jolly roger, y").jollyRoger, true, "jr flag");
assertEqual(OPShelf.parseParallel("jolly roger, y").parallel, true, "parallel flag");

assertEqual(OPShelf.parseParallel("sp").label, "SP", "sp label");
assertEqual(OPShelf.parseParallel("sp").parallel, true, "sp is parallel");

const grouped = OPShelf.groupRows([
  { "Card number": "op14-014", Rarity: "r", Alternate: "", Cost: 0, "Thumbnail url": "" },
  { "Card number": "op14-014", Rarity: "r", Alternate: "", Cost: 0, "Thumbnail url": "" },
  { "Card number": "op14-014", Rarity: "r", Alternate: "", Cost: 0, "Thumbnail url": "" },
  { "Card number": "op14-014", Rarity: "r", Alternate: "", Cost: 0, "Thumbnail url": "" },
  { "Card number": "op14-014", Rarity: "r", Alternate: "", Cost: 0, "Thumbnail url": "" },
  { "Card number": "op03-121", Rarity: "c", Parallel: "jolly roger", Cost: 0, "Thumbnail url": "" },
  { "Card number": "", Rarity: "r", Alternate: "", Cost: 0, "Thumbnail url": "" },
]);
assertEqual(grouped.length, 2, "group count");
assertEqual(grouped.filter(function (card) { return card.id === "OP14-014"; })[0].quantity, 5, "qty");
assertEqual(grouped.filter(function (card) { return card.id === "OP14-014"; })[0].sold, false, "unsold");
assertEqual(grouped.filter(function (card) { return card.id === "OP14-014"; })[0].status, "in-stock", "in stock");
assertEqual(grouped.filter(function (card) { return card.id === "OP03-121"; })[0].alternate, "Jolly Roger", "alternate");
assertEqual(grouped.filter(function (card) { return card.id === "OP03-121"; })[0].jollyRoger, true, "jr from parallel col");
assertEqual(grouped[0].id, "OP14-014", "first lot keeps first-seen order");
assertEqual(grouped[1].added > grouped[0].added, true, "later row has higher added");

const newestFirst = OPShelf.groupRows([
  { "Card number": "op01-001", Rarity: "c" },
  { "Card number": "op02-002", Rarity: "c" },
  { "Card number": "op01-001", Rarity: "c" },
]).sort(function (a, b) { return b.added - a.added; });
assertEqual(newestFirst[0].id, "OP01-001", "latest add wins");
assertEqual(newestFirst[0].quantity, 2, "qty still stacks");

assertEqual(OPShelf.parseCondition("A"), "A", "cond A");
assertEqual(OPShelf.parseCondition("b"), "B", "cond b");
assertEqual(OPShelf.parseCondition(""), "", "empty cond");
assertEqual(OPShelf.parseCondition("A-"), "A", "cond A-");

const condLots = OPShelf.groupRows([
  { "Card number": "op13-004", Rarity: "l", Cost: 10, Condition: "A" },
  { "Card number": "op13-004", Rarity: "l", Cost: 10, Condition: "A" },
  { "Card number": "op13-004", Rarity: "l", Cost: 10, Condition: "C" },
]);
assertEqual(condLots.length, 2, "condition splits lots");
assertEqual(condLots.filter(function (card) { return card.condition === "A"; })[0].quantity, 2, "same condition stacks");
assertEqual(OPShelf.isSold("SOLD"), true, "sold text");
assertEqual(OPShelf.isSold(48), true, "sold price");
assertEqual(OPShelf.isSold(""), false, "empty not sold");
assertEqual(OPShelf.isSold("no"), false, "no");
assertEqual(OPShelf.parseSold(48).price, 48, "parse sold price");
assertEqual(OPShelf.formatPrice(48), "48", "format sold price");
assertEqual(OPShelf.formatPrice(0), "—", "format zero");
assertEqual(OPShelf.formatHkdFromYen(0), "—", "hkd zero");
assertEqual(OPShelf.formatHkdFromYen(200), "HK$10", "hkd from yen");
assertEqual(OPShelf.formatHkdFromYen(2500), "HK$125", "hkd 2500 yen");
assertEqual(OPShelf.formatHkd(180), "HK$180", "sold already hkd");

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
  OPShelf.imageCandidates({ id: "OP06-065", set: "OP06", alternate: "Jolly Roger", jollyRoger: true, parallel: false, thumbnail: "" }),
  [
    "thumbs/OP06-065.webp",
    "thumbs/OP06-065.png",
    "thumbs/OP06-065.jpg",
    "https://www.cardrush-op.jp/data/cardrush-op/product/PRB01-02_64.jpg",
    "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP06/OP06-065_JP.webp",
    "https://wsrv.nl/?url=www.onepiece-cardgame.com%2Fimages%2Fcardlist%2Fcard%2FOP06-065.png",
  ],
  "jr uses cardrush"
);

const st01 = OPShelf.imageCandidates({ id: "ST01-007", set: "ST01", alternate: "", jollyRoger: false, parallel: false, thumbnail: "" });
assertEqual(st01.some(function (url) { return /ST01-007_p5/.test(url); }), true, "st01-007 p5");
assertEqual(
  st01.findIndex(function (url) { return /ST01-007_p5/.test(url); })
    < st01.findIndex(function (url) { return /limitless/.test(url); }),
  true,
  "st01-007 p5 before limitless"
);

const p022 = OPShelf.imageCandidates({ id: "P-022", set: "P", alternate: "", jollyRoger: false, parallel: false, thumbnail: "" });
assertEqual(p022[0].indexOf("thumbs/") === 0, true, "p-022 thumbs first");
assertEqual(
  p022.some(function (url) { return url.indexOf("O-4AAOSwjqRmSDcD") !== -1; }),
  true,
  "p-022 ebay"
);
assertEqual(
  p022.findIndex(function (url) { return url.indexOf("O-4AAOSwjqRmSDcD") !== -1; })
    < p022.findIndex(function (url) { return /limitless/.test(url); }),
  true,
  "p-022 ebay before limitless"
);

const enelSp = OPShelf.imageCandidates({ id: "OP05-100", set: "OP05", alternate: "SP", parallel: true, jollyRoger: false, thumbnail: "" });
assertEqual(enelSp.some(function (url) { return /OP05-100_p2_JP/.test(url); }), true, "op05-100 sp p2");
assertEqual(
  enelSp.findIndex(function (url) { return /_p2_JP/.test(url); })
    < enelSp.findIndex(function (url) { return /_p1_JP/.test(url); }),
  true,
  "op05-100 sp p2 before p1"
);
assertEqual(OPShelf.groupRows([{ "Card number": "op05-100", Rarity: "sr", Parallel: "sp", "Cost(Yen)": 5000 }])[0].cost, 5000, "cost yen col");

assertEqual(PkmShelf.canonicalSet("sv3"), "SV3", "pkm set sv3");
assertEqual(PkmShelf.canonicalSet("s10b"), "S10b", "pkm set s10b");
assertEqual(PkmShelf.canonicalSet("svJL"), "SVJL", "pkm set svJL");
assertEqual(PkmShelf.canonicalSet("promo"), "SV-P", "pkm promo set");
assertEqual(PkmShelf.canonicalSet("old back"), "OldBack", "pkm old back set");
assertEqual(PkmShelf.canonicalSet("SoulSilver Collection"), "L1", "pkm soulsilver set");
assertEqual(PkmShelf.parseCollector("#067").localId, "067", "pkm dex num");
assertEqual(PkmShelf.parseCollector("#067").number, "#067", "pkm dex display");
assertEqual(PkmShelf.parseCollector("066/108").localId, "066", "pkm collector");
assertEqual(PkmShelf.parseCollector("066/108").number, "066/108", "pkm number");
assertEqual(PkmShelf.parseCollector("291/sv-p").localId, "291", "pkm promo num");
assertEqual(PkmShelf.parseCollector("291/sv-p").number, "291/SV-P", "pkm promo display");

const pkmLots = PkmShelf.groupRows([
  { Set: "sv3", "Card number": "066/108", Rarity: "RR", "Cost(Yen)": 200 },
  { Set: "sv3", "Card number": "066/108", Rarity: "RR", "Cost(Yen)": 200 },
  { Set: "sv3", "Card number": "066/108", Rarity: "SR", "Cost(Yen)": 200 },
  { Set: "s10b", "Card number": "010/071", Rarity: "R", "Cost(Yen)": 300 },
]);
assertEqual(pkmLots.length, 3, "pkm group count");
assertEqual(pkmLots.filter(function (card) { return card.id === "SV3 066/108" && card.rarity === "RR"; })[0].quantity, 2, "pkm stacks");
assertEqual(pkmLots.filter(function (card) { return card.rarity === "SR"; })[0].id, "SV3 066/108", "pkm rarity splits");

assertEqual(
  PkmShelf.imageCandidates({ set: "SV3", localId: "066", number: "066/108", thumbnail: "" })[0],
  "thumbs/pkm/SV3-066.webp",
  "pkm thumb first"
);
assertEqual(
  PkmShelf.imageCandidates({ set: "SVJL", localId: "006", number: "006/021", thumbnail: "" }).some(function (url) {
    return /SVJL\/045806/.test(url);
  }),
  true,
  "pkm svjl official"
);
assertEqual(
  PkmShelf.imageCandidates({ set: "SMH", localId: "032", number: "032/131", thumbnail: "" }).some(function (url) {
    return /hareruya2\.com\/cdn\/shop\/products\/d032131smh/.test(url);
  }),
  true,
  "pkm smh hareruya"
);
(function () {
  const urls = PkmShelf.imageCandidates({ set: "SMH", localId: "032", number: "032/131", thumbnail: "" });
  const official = urls.findIndex(function (url) { return /pokemon-card\.com/.test(url); });
  const hareruya = urls.findIndex(function (url) { return /hareruya2/.test(url); });
  const tcgdex = urls.findIndex(function (url) { return /tcgdex\.net/.test(url); });
  const tcgplayer = urls.findIndex(function (url) { return /tcgplayer/.test(url); });
  assertEqual(hareruya !== -1 && tcgdex !== -1 && hareruya < tcgdex, true, "pkm hareruya before tcgdex");
  assertEqual(tcgplayer === -1 || tcgdex < tcgplayer, true, "pkm tcgdex before tcgplayer");
  assertEqual(official === -1, true, "pkm smh has no official");
})();
assertEqual(
  PkmShelf.pickPricechartingPath("/game/pokemon-japanese-ruler-of-the-black-flame/charizard-ex-66", { set: "SV3", localId: "066" }),
  "/game/pokemon-japanese-ruler-of-the-black-flame/charizard-ex-66",
  "pkm pricecharting path"
);
assertEqual(
  PkmShelf.imageCandidates({ set: "SV-P", localId: "291", number: "291/SV-P", thumbnail: "" }).some(function (url) {
    return /promo291sv-psv-p/.test(url);
  }),
  true,
  "pkm promo hareruya"
);
assertEqual(
  PkmShelf.imageCandidates({ set: "M3", localId: "021", number: "021/080", thumbnail: "" }).some(function (url) {
    return /product-images\.tcgplayer\.com\/fit-in\/437x437\/674340/.test(url);
  }),
  true,
  "pkm tcgplayer m3"
);
assertEqual(
  PkmShelf.pickTcgplayerId(
    [{ productId: 1, setCode: "M2", customAttributes: { number: "058/080" } }],
    { set: "M2", number: "058/080" }
  ),
  1,
  "pkm tcgplayer pick"
);
assertEqual(
  PkmShelf.groupRows([{ Set: "old back", "Card number": "#067" }])[0].id,
  "OldBack #067",
  "pkm old back id"
);
assertEqual(
  PkmShelf.groupRows([{ Set: "SoulSilver Collection", "Card number": "031/070", Rarity: "R" }])[0].id,
  "L1 031/070",
  "pkm soulsilver id"
);
assertEqual(
  PkmShelf.imageCandidates({ set: "L1", localId: "031", number: "031/070", thumbnail: "" }).some(function (url) {
    return /r031070l1-l-2-1098972/.test(url);
  }),
  true,
  "pkm soulsilver hareruya"
);

const thumbRow = OPShelf.groupRows([
  { "Card number": "p-022", Rarity: "p", Thumbnail: "https://i.ebayimg.com/images/g/O-4AAOSwjqRmSDcD/s-l960.webp" },
])[0];
assertEqual(thumbRow.thumbnail.indexOf("O-4AAOSwjqRmSDcD") !== -1, true, "thumbnail col");
assertEqual(OPShelf.imageCandidates(thumbRow)[0], thumbRow.thumbnail, "sheet thumb first");
assertEqual(OPShelf.groupRows([{ "Card number": "st01-007", Thumbnail: "not a url" }])[0].thumbnail, "", "ignore non url");

const gvizThumb = OPShelf.rowsFromGviz(OPShelf.parseGvizText('/*O_o*/\ncb({"status":"ok","table":{"cols":[{"id":"A","label":"Card number"},{"id":"B","label":"Thumbnail"}],"rows":[{"c":[{"v":"p-022"},{"v":null,"f":"=IMAGE(\\"https://i.ebayimg.com/images/g/abc/s-l960.webp\\")"}]}]}});'));
assertEqual(gvizThumb[0].Thumbnail.indexOf("https://") === 0 || gvizThumb[0].Thumbnail.indexOf("IMAGE") !== -1, true, "gviz image formula");
assertEqual(OPShelf.groupRows(gvizThumb)[0].thumbnail.indexOf("https://i.ebayimg.com") === 0, true, "url from image formula");

const gviz = OPShelf.parseGvizText('/*O_o*/\ncb({"status":"ok","table":{"cols":[{"id":"A","label":"Card number"},{"id":"B","label":"Rarity"}],"rows":[{"c":[{"v":"op13-004"},{"v":"l"}]}]}});');
assertDeepEqual(OPShelf.rowsFromGviz(gviz), [{ "Card number": "op13-004", Rarity: "l" }], "gviz rows");

const csv = OPShelf.parseCsv("Card number,Rarity,Parallel,Cost,Sold,Thumbnail url\nop17-063,sr,,0,y,\n");
assertEqual(csv[0]["Card number"], "op17-063", "csv parse");
assertEqual(csv[0].Sold, "y", "csv sold");

print("ok");

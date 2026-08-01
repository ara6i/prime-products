import assert from "node:assert/strict";
import {
  isNotApplicableCategory,
  csvLine,
  normaliseTable,
  parseCsv,
  reconstructOcrTable,
  tableRows,
  toInputProducts,
} from "./lib";

const products = toInputProducts(parseCsv([
  "product_id,pdp_url,merchant,category",
  "dress-1,https://shop.example/dress-1,Example,dresses",
].join("\n")));
assert.deepEqual(products, [{ productId: "dress-1", pdpUrl: "https://shop.example/dress-1", merchant: "Example", category: "dresses" }]);
assert.equal(isNotApplicableCategory("handbag"), true);
assert.equal(isNotApplicableCategory("women's dress"), false);

const table = normaliseTable({
  headers: ["Size", "Bust (in)", "Waist (in)"],
  rows: [["S", "34", "26"], ["M", "36", "28"]],
  contextText: "Size guide",
});
assert.ok(table);
assert.deepEqual(tableRows(table), [
  { sizeValue: "S", measurements: { Size: "S", "Bust (in)": "34", "Waist (in)": "26" } },
  { sizeValue: "M", measurements: { Size: "M", "Bust (in)": "36", "Waist (in)": "28" } },
]);

const verticalHtmlTable = normaliseTable({
  headers: ["", "XXS", "", "XS", "S", "", "M"],
  rows: [
    ["Chest", "31.5 in", "", "33 in", "34.5 in", "", "36.5 in"],
    ["Waist", "24.5 in", "", "26 in", "27.5 in", "", "29.5 in"],
  ],
  contextText: "Measurements in inches",
});
assert.deepEqual(verticalHtmlTable?.headers, ["Size", "Chest", "Waist"]);
assert.deepEqual(verticalHtmlTable?.rows, [["XXS", "31.5 in", "24.5 in"], ["XS", "33 in", "26 in"], ["S", "34.5 in", "27.5 in"], ["M", "36.5 in", "29.5 in"]]);

const ocrTable = reconstructOcrTable([
  { text: "Size", x: 0.1, y: 0.8, width: 0.1, height: 0.03, confidence: 0.99 },
  { text: "Bust", x: 0.35, y: 0.8, width: 0.1, height: 0.03, confidence: 0.99 },
  { text: "Waist", x: 0.6, y: 0.8, width: 0.1, height: 0.03, confidence: 0.99 },
  { text: "S", x: 0.1, y: 0.7, width: 0.04, height: 0.03, confidence: 0.99 },
  { text: "34", x: 0.35, y: 0.7, width: 0.05, height: 0.03, confidence: 0.99 },
  { text: "26", x: 0.6, y: 0.7, width: 0.05, height: 0.03, confidence: 0.99 },
]);
assert.deepEqual(ocrTable?.headers, ["Size", "Bust", "Waist"]);
assert.deepEqual(ocrTable?.rows, [["S", "34", "26"]]);

const verticalOcrTable = reconstructOcrTable([
  { text: "XXS", x: 0.25, y: 0.8, width: 0.05, height: 0.03, confidence: 0.99 },
  { text: "XS", x: 0.42, y: 0.8, width: 0.04, height: 0.03, confidence: 0.99 },
  { text: "S", x: 0.58, y: 0.8, width: 0.03, height: 0.03, confidence: 0.99 },
  { text: "Chest", x: 0.05, y: 0.7, width: 0.1, height: 0.03, confidence: 0.99 },
  { text: "31.5", x: 0.25, y: 0.7, width: 0.05, height: 0.03, confidence: 0.99 },
  { text: "33", x: 0.42, y: 0.7, width: 0.04, height: 0.03, confidence: 0.99 },
  { text: "34.5", x: 0.58, y: 0.7, width: 0.05, height: 0.03, confidence: 0.99 },
  { text: "Waist", x: 0.05, y: 0.6, width: 0.1, height: 0.03, confidence: 0.99 },
  { text: "24.5", x: 0.25, y: 0.6, width: 0.05, height: 0.03, confidence: 0.99 },
  { text: "26", x: 0.42, y: 0.6, width: 0.04, height: 0.03, confidence: 0.99 },
  { text: "27.5", x: 0.58, y: 0.6, width: 0.05, height: 0.03, confidence: 0.99 },
]);
assert.deepEqual(verticalOcrTable?.headers, ["Size", "Chest", "Waist"]);
assert.deepEqual(verticalOcrTable?.rows, [["XXS", "31.5", "24.5"], ["XS", "33", "26"], ["S", "34.5", "27.5"]]);
assert.equal(csvLine({ second: "B", first: "A" }, ["first", "second"]), "A,B");

process.stdout.write("size-chart-scraper tests passed\n");

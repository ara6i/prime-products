export type InputProduct = {
  productId: string;
  pdpUrl: string;
  merchant: string;
  category: string;
};

export type ChartTable = {
  headers: string[];
  rows: string[][];
  contextText: string;
};

export type OcrWord = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

export type OcrTable = {
  headers: string[];
  rows: string[][];
  text: string;
};

const SIZE_HEADER = /^(size|sizes|us\s*size|uk\s*size|eu\s*size|international\s*size)$/i;
const MEASUREMENT_HEADER = /(bust|chest|waist|hip|hips|inseam|length|sleeve|shoulder|thigh|rise|foot\s*length|cm|inch|in\.)/i;
const NOT_APPLICABLE_CATEGORY = /(handbag|bag|purse|wallet|jewell?ry|earrings?|necklace|bracelet|ring)/i;

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length === 0) return [];

  const headers = rows[0]!.map(normalizeHeader);
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

export function toInputProducts(rows: Record<string, string>[]): InputProduct[] {
  return rows.map((row, index) => {
    const productId = get(row, "product_id", "productid", "id", "sku", "item_id");
    const pdpUrl = get(row, "pdp_url", "product_url", "url", "link", "deeplink", "deep_link");
    if (!productId || !pdpUrl) {
      throw new Error(`Input row ${index + 2} needs product_id (or id/sku) and pdp_url (or url/link).`);
    }
    return {
      productId,
      pdpUrl,
      merchant: get(row, "merchant", "retailer", "advertiser", "store"),
      category: get(row, "category", "product_type", "product_category"),
    };
  });
}

export function isNotApplicableCategory(category: string): boolean {
  return NOT_APPLICABLE_CATEGORY.test(category);
}

export function scopeFromText(text: string): "product_specific" | "brand_generic" | "unknown_scope" {
  const normalized = text.toLowerCase();
  if (/(this (item|product)|product measurements|style measurements)/.test(normalized)) return "product_specific";
  if (/(brand size guide|general size guide|size guide for all)/.test(normalized)) return "brand_generic";
  return "unknown_scope";
}

export function normaliseTable(table: ChartTable): ChartTable | null {
  const rawHeaders = table.headers.map(cleanCell);
  const rawRows = table.rows.map((row) => row.map(cleanCell));
  const vertical = normaliseVerticalHtmlTable(rawHeaders, rawRows, cleanCell(table.contextText));
  const headers = rawHeaders.filter(Boolean);
  const rows = rawRows
    .map((row) => row.map(cleanCell).filter((cell, index) => cell || index < headers.length))
    .filter((row) => row.some(Boolean));

  if (headers.length < 2 || rows.length < 1) return null;
  if (!headers.some((header) => SIZE_HEADER.test(header) || MEASUREMENT_HEADER.test(header))) return vertical;
  return { headers, rows, contextText: cleanCell(table.contextText) };
}

/** Transpose PDP tables that put sizes in the first row and measurements down the first column. */
function normaliseVerticalHtmlTable(headers: string[], rows: string[][], contextText: string): ChartTable | null {
  const sizeColumns = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => isSizeToken(header));
  if (sizeColumns.length < 3) return null;

  const measurements = rows.flatMap((row) => {
    const label = row[0] ?? "";
    if (!MEASUREMENT_HEADER.test(label)) return [];
    const values = sizeColumns.map(({ index }) => row[index] ?? "");
    return values.some(Boolean) ? [{ label, values }] : [];
  });
  if (!measurements.length) return null;
  return {
    headers: ["Size", ...measurements.map(({ label }) => label)],
    rows: sizeColumns.map(({ header }, sizeIndex) => [header, ...measurements.map(({ values }) => values[sizeIndex] ?? "")]),
    contextText,
  };
}

export function tableRows(table: ChartTable): Array<{ sizeValue: string; measurements: Record<string, string> }> {
  const normalised = normaliseTable(table);
  if (!normalised) return [];
  const sizeIndex = Math.max(0, normalised.headers.findIndex((header) => SIZE_HEADER.test(header)));
  return normalised.rows.map((row) => ({
    sizeValue: row[sizeIndex] || "",
    measurements: Object.fromEntries(
      normalised.headers.map((header, index) => [header, row[index] ?? ""]),
    ),
  }));
}

export function csvLine(fields: Record<string, string | number | undefined>, orderedKeys?: string[]): string {
  const values = orderedKeys ? orderedKeys.map((key) => fields[key]) : Object.values(fields);
  return values.map((value) => csvValue(value ?? "")).join(",");
}

export function csvValue(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Reconstructs an OCR chart conservatively. Values stay in `needs_review`
 * status because OCR cannot prove which product/scope a chart applies to.
 */
export function reconstructOcrTable(words: OcrWord[]): OcrTable | null {
  const usable = words
    .filter((word) => word.text.trim() && Number.isFinite(word.x) && Number.isFinite(word.y))
    .map((word) => ({ ...word, text: cleanCell(word.text), top: 1 - word.y - word.height, centerY: 1 - word.y - word.height / 2 }))
    .sort((left, right) => left.centerY - right.centerY || left.x - right.x);
  if (usable.length < 4) return null;

  const groups: Array<typeof usable> = [];
  for (const word of usable) {
    const current = groups.at(-1);
    const currentCenter = current ? current.reduce((total, item) => total + item.centerY, 0) / current.length : 0;
    const tolerance = Math.max(0.018, word.height * 1.7);
    if (current && Math.abs(word.centerY - currentCenter) <= tolerance) current.push(word);
    else groups.push([word]);
  }

  const rows = groups
    .map((group) => group.sort((left, right) => left.x - right.x))
    .filter((group) => group.length >= 2);
  const headerIndex = rows.findIndex((row) => row.some((word) => SIZE_HEADER.test(word.text)) && row.some((word) => MEASUREMENT_HEADER.test(word.text)));
  const text = groups.map((group) => group.sort((left, right) => left.x - right.x).map((word) => word.text).join(" | ")).join("\n");
  if (headerIndex < 0) return reconstructVerticalOcrTable(rows, text);

  const headerWords = rows[headerIndex]!;
  const headers = headerWords.map((word) => word.text);
  const dataRows = rows.slice(headerIndex + 1).map((row) => {
    const cells = new Array(headers.length).fill("") as string[];
    for (const word of row) {
      const nearest = nearestIndex(word.x + word.width / 2, headerWords.map((header) => header.x + header.width / 2));
      cells[nearest] = cleanCell(`${cells[nearest]} ${word.text}`);
    }
    return cells;
  }).filter((row) => row.filter(Boolean).length >= 2);

  if (!dataRows.length) return null;
  return {
    headers,
    rows: dataRows,
    text,
  };
}

/**
 * Handles charts that put sizes across the top and measurements down the
 * left—the layout used by the Cinq a Sept PDP chart. It transposes that visual
 * grid into ordinary `Size, Chest, Waist, ...` CSV rows.
 */
function reconstructVerticalOcrTable(rows: OcrWord[][], text: string): OcrTable | null {
  const headerIndex = rows.findIndex((row, index) => {
    const next = rows[index + 1];
    return Boolean(next && row.length >= 3 && row.filter((word) => isSizeToken(word.text)).length >= 3 && MEASUREMENT_HEADER.test(next[0]?.text ?? ""));
  });
  if (headerIndex < 0) return null;

  const sizeHeaders = rows[headerIndex]!;
  const measurements: Array<{ name: string; values: string[] }> = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const firstNumber = row.findIndex((word) => /\d/.test(word.text));
    if (firstNumber <= 0) {
      if (measurements.length) break;
      continue;
    }
    const label = row.slice(0, firstNumber).map((word) => word.text).join(" ");
    if (!MEASUREMENT_HEADER.test(label)) {
      if (measurements.length) break;
      continue;
    }
    const values = new Array(sizeHeaders.length).fill("") as string[];
    for (const word of row.slice(firstNumber)) {
      const index = nearestIndex(word.x + word.width / 2, sizeHeaders.map((header) => header.x + header.width / 2));
      values[index] = cleanCell(`${values[index]} ${word.text}`);
    }
    measurements.push({ name: label, values });
  }
  if (!measurements.length) return null;
  return {
    headers: ["Size", ...measurements.map((measurement) => measurement.name)],
    rows: sizeHeaders.map((size, index) => [size.text, ...measurements.map((measurement) => measurement.values[index] ?? "")]),
    text,
  };
}

function isSizeToken(value: string): boolean {
  return /^(?:XXS|XS|S|M|L|XL|XXL|XXXL|0{1,2}|[2-9]|1[0-9]|2[0-9])$/i.test(value.trim());
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/^_|_$/g, "");
}

function get(row: Record<string, string>, ...names: string[]): string {
  for (const name of names) if (row[name]) return row[name]!;
  return "";
}

function cleanCell(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

function nearestIndex(value: number, candidates: number[]): number {
  return candidates.reduce((best, candidate, index) => Math.abs(candidate - value) < Math.abs(candidates[best]! - value) ? index : best, 0);
}

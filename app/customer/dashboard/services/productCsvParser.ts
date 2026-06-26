import type {
  CustomerImportedProduct,
  CustomerImportedVariant,
  CustomerProductCsvParseResult,
  CustomerProductSelectionState,
} from "../types/products";

const emptyParseResult: CustomerProductCsvParseResult = {
  products: [],
  defaultStates: {},
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeBoolean(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["true", "yes", "1", "active", "published", "live", "on", "included"].includes(normalized)) return true;
  if (["false", "no", "0", "draft", "archived", "off", "disabled", "notincluded"].includes(normalized)) return false;
  return null;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "product";
}

function parseNumber(value: string): number {
  const parsed = Number.parseInt(value.replace(/,/g, "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);

  return rows;
}

function cellValue(row: string[], headerMap: Map<string, number>, candidates: string[]): string {
  for (const candidate of candidates) {
    const index = headerMap.get(normalizeHeader(candidate));
    if (typeof index === "number") {
      return row[index]?.trim() ?? "";
    }
  }

  return "";
}

function deriveCollection(row: string[], headerMap: Map<string, number>, type: string, tags: string[]): string {
  const explicitCollection = cellValue(row, headerMap, ["Collection", "Collections", "Collection Title"]);
  if (explicitCollection) return explicitCollection;

  const productCategory = cellValue(row, headerMap, [
    "Product Category",
    "Category",
    "Google Shopping / Google Product Category",
    "Google Shopping Product Category",
  ]);
  if (productCategory) {
    const parts = productCategory.split(">").map((part) => part.trim()).filter(Boolean);
    return parts[parts.length - 1] ?? productCategory;
  }

  return type || tags[0] || "Uncategorized";
}

function deriveVariantTitle(selectedOptions: CustomerImportedVariant["selectedOptions"], sku: string): string {
  const optionTitle = selectedOptions
    .map((option) => option.value)
    .filter(Boolean)
    .join(" / ");

  return optionTitle || sku || "Default variant";
}

function productDefaultState(row: string[], headerMap: Map<string, number>, hasInventory: boolean): CustomerProductSelectionState {
  const currentCycleCell = cellValue(row, headerMap, ["Current cycle", "Current Cycle", "Selection"]);
  const currentStorefrontCell = cellValue(row, headerMap, ["Current storefront", "Current Storefront", "Live"]);
  const statusCell = cellValue(row, headerMap, ["Status", "Published", "Published At", "Published Scope"]);

  const parsedCycle = normalizeBoolean(currentCycleCell);
  const parsedStorefront = normalizeBoolean(currentStorefrontCell);
  const parsedStatus = normalizeBoolean(statusCell);
  const currentCycle = parsedCycle ?? parsedStorefront ?? parsedStatus ?? hasInventory;
  const currentStorefront = currentCycle && hasInventory && (parsedStorefront ?? parsedStatus ?? false);

  return { currentCycle, currentStorefront };
}

function mergeDefaultState(
  current: CustomerProductSelectionState,
  next: CustomerProductSelectionState,
): CustomerProductSelectionState {
  return {
    currentCycle: current.currentCycle || next.currentCycle,
    currentStorefront: current.currentStorefront || next.currentStorefront,
  };
}

export function parseProductCsv(input: string): CustomerProductCsvParseResult {
  const rows = parseCsvRows(input);
  if (rows.length < 2) return emptyParseResult;

  const headers = rows[0] ?? [];
  const headerMap = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
  const products = new Map<string, CustomerImportedProduct>();
  const defaultStates: Record<string, CustomerProductSelectionState> = {};
  const variantIds = new Set<string>();

  let lastHandle = "";
  let lastTitle = "";
  let lastType = "";
  let lastImage = "";
  let lastCollection = "";
  let lastTags: string[] = [];

  rows.slice(1).forEach((row, rowIndex) => {
    const rawTitle = cellValue(row, headerMap, ["Title", "Product Title", "Name"]);
    const rawHandle = cellValue(row, headerMap, ["Handle", "Product Handle", "Slug"]);
    const title = rawTitle || lastTitle;
    const handle = rawHandle || lastHandle || slugify(title);

    if (!title && !handle) return;

    const productId = cellValue(row, headerMap, ["Product ID", "Product Id", "ID"]) || handle;
    const type = cellValue(row, headerMap, ["Type", "Product Type"]) || lastType;
    const image = cellValue(row, headerMap, ["Image Src", "Image", "Product Image", "Variant Image"]) || lastImage;
    const tags = parseTags(cellValue(row, headerMap, ["Tags", "Product Tags"]));
    const mergedTags = tags.length > 0 ? tags : lastTags;
    const collection = deriveCollection(row, headerMap, type, mergedTags) || lastCollection;
    const productKey = handle || productId || slugify(title);

    lastHandle = handle;
    lastTitle = title;
    lastType = type;
    lastImage = image;
    lastCollection = collection;
    lastTags = mergedTags;

    if (!products.has(productKey)) {
      products.set(productKey, {
        id: productId,
        handle: productKey,
        title: title || productKey,
        image,
        collection,
        type,
        tags: mergedTags,
        variants: [],
      });
    }

    const product = products.get(productKey);
    if (!product) return;

    if (!product.image && image) product.image = image;
    if (!product.collection && collection) product.collection = collection;
    if (!product.type && type) product.type = type;
    if (product.tags.length === 0 && mergedTags.length > 0) product.tags = mergedTags;

    const sku = cellValue(row, headerMap, ["Variant SKU", "SKU", "Sku"]);
    const variantImage = cellValue(row, headerMap, ["Variant Image", "Image Src", "Image"]) || image;
    const inventoryQuantity = parseNumber(cellValue(row, headerMap, [
      "Variant Inventory Qty",
      "Variant Inventory Quantity",
      "Inventory",
      "Inventory Quantity",
      "Quantity",
    ]));
    const selectedOptions = [1, 2, 3]
      .map((optionIndex) => {
        const name = cellValue(row, headerMap, [`Option${optionIndex} Name`, `Option ${optionIndex} Name`]);
        const value = cellValue(row, headerMap, [`Option${optionIndex} Value`, `Option ${optionIndex} Value`]);
        return name && value ? { name, value } : null;
      })
      .filter((option): option is CustomerImportedVariant["selectedOptions"][number] => Boolean(option));

    const variantId =
      cellValue(row, headerMap, ["Variant ID", "Variant Id"]) ||
      sku ||
      `${productKey}-${rowIndex + 1}`;
    const uniqueVariantId = `${productKey}:${variantId}`;

    if (!variantIds.has(uniqueVariantId)) {
      variantIds.add(uniqueVariantId);
      product.variants.push({
        id: variantId,
        title: deriveVariantTitle(selectedOptions, sku),
        sku,
        image: variantImage,
        inventoryQuantity,
        selectedOptions,
      });
    }

    const nextDefaultState = productDefaultState(row, headerMap, inventoryQuantity > 0);
    defaultStates[productKey] = defaultStates[productKey]
      ? mergeDefaultState(defaultStates[productKey], nextDefaultState)
      : nextDefaultState;
  });

  const parsedProducts = Array.from(products.values())
    .map((product) => ({
      ...product,
      variants: product.variants.length > 0
        ? product.variants
        : [{
            id: `${product.handle}:default`,
            title: "Default variant",
            sku: "",
            image: product.image,
            inventoryQuantity: 0,
            selectedOptions: [],
          }],
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  parsedProducts.forEach((product) => {
    if (!defaultStates[product.handle]) {
      const hasInventory = product.variants.some((variant) => variant.inventoryQuantity > 0);
      defaultStates[product.handle] = { currentCycle: hasInventory, currentStorefront: false };
    }
  });

  return {
    products: parsedProducts,
    defaultStates,
  };
}

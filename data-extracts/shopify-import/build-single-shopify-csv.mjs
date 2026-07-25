import fs from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("data-extracts/shopify-import");
const rawPath = process.env.SHOPIFY_RAW_PATH
  ? path.resolve(process.env.SHOPIFY_RAW_PATH)
  : path.join(outputDir, "demo-products-raw.json");
const outputPath = process.env.SHOPIFY_OUTPUT_PATH
  ? path.resolve(process.env.SHOPIFY_OUTPUT_PATH)
  : path.join(outputDir, "prime-products-shopify-import.csv");
const configuredInventoryQty = Number.parseInt(process.env.SHOPIFY_INVENTORY_QTY || "100", 10);
const inventoryQty = Number.isFinite(configuredInventoryQty) && configuredInventoryQty >= 0
  ? configuredInventoryQty
  : 100;

const headers = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Product Category",
  "Type",
  "Tags",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Option2 Name",
  "Option2 Value",
  "Option3 Name",
  "Option3 Value",
  "Variant SKU",
  "Variant Grams",
  "Variant Inventory Tracker",
  "Variant Inventory Qty",
  "Variant Inventory Policy",
  "Variant Fulfillment Service",
  "Variant Price",
  "Variant Compare At Price",
  "Variant Requires Shipping",
  "Variant Taxable",
  "Variant Barcode",
  "Image Src",
  "Image Position",
  "Image Alt Text",
  "Gift Card",
  "SEO Title",
  "SEO Description",
  "Google Shopping / Google Product Category",
  "Google Shopping / Gender",
  "Google Shopping / Age Group",
  "Google Shopping / MPN",
  "Google Shopping / Condition",
  "Google Shopping / Custom Product",
  "Google Shopping / Custom Label 0",
  "Google Shopping / Custom Label 1",
  "Google Shopping / Custom Label 2",
  "Google Shopping / Custom Label 3",
  "Google Shopping / Custom Label 4",
  "Variant Image",
  "Variant Weight Unit",
  "Variant Tax Code",
  "Cost per item",
  "Status",
];

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180) || "product";
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function csvCell(value) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function unique(values) {
  const seen = new Set();
  const result = [];
  for (const value of values.flat(Infinity)) {
    const stringValue = clean(value);
    if (!stringValue || seen.has(stringValue)) continue;
    seen.add(stringValue);
    result.push(stringValue);
  }
  return result;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getRowsFromGuide(guide) {
  const rows = asArray(guide?.rows);
  if (!rows.length) return [];
  return rows.filter((row) => {
    if (Array.isArray(row)) return row.some((cell) => clean(cell));
    if (row && typeof row === "object") return Object.values(row).some((cell) => clean(cell));
    return clean(row);
  });
}

function getHeadersFromGuide(guide, rows) {
  const explicitHeaders = asArray(guide?.headers).map(clean).filter(Boolean);
  if (explicitHeaders.length) return explicitHeaders;
  const first = rows[0];
  if (first && typeof first === "object" && !Array.isArray(first)) {
    return Object.keys(first).map(clean).filter(Boolean);
  }
  return [];
}

function rowCell(row, header, index) {
  if (Array.isArray(row)) return clean(row[index]);
  if (row && typeof row === "object") return clean(row[header]);
  return clean(row);
}

function renderGuideTable(guide) {
  const rows = getRowsFromGuide(guide);
  const headersForRows = getHeadersFromGuide(guide, rows);
  if (!rows.length || !headersForRows.length) return "";

  const title = escapeHtml(guide?.title || "Size Guide");
  const subtitle = guide?.subtitle ? `<p>${escapeHtml(guide.subtitle)}</p>` : "";
  const thead = `<thead><tr>${headersForRows.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map((row) => `<tr>${headersForRows.map((header, index) => `<td>${escapeHtml(rowCell(row, header, index))}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  return `<div class="primestyle-size-guide"><h3>${title}</h3>${subtitle}<table>${thead}${tbody}</table></div>`;
}

function renderSizeGuides(product) {
  const guides = [];
  const primary = product.size_guide;
  const matcher = primary?.matcherGuide;
  const primaryHtml = renderGuideTable(primary);
  const matcherHtml = renderGuideTable(matcher);

  if (primaryHtml) guides.push(primaryHtml);
  if (matcherHtml && matcherHtml !== primaryHtml) guides.push(matcherHtml);

  const measureItems = asArray(primary?.howToMeasure)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  if (measureItems) {
    guides.push(`<div class="primestyle-measure-guide"><h3>How to measure</h3><ul>${measureItems}</ul></div>`);
  }

  return guides.join("");
}

function productImages(product) {
  return unique([
    asArray(product.gallery),
    asArray(product.image_urls),
    asArray(product.variant_image_urls),
    asArray(product.color_variants).flatMap((variant) => asArray(variant?.images)),
    asArray(product.variants).flatMap((variant) => asArray(variant?.images)),
  ]).filter((url) => /^https?:\/\//i.test(url));
}

function productSizes(product) {
  const guideRows = getRowsFromGuide(product.size_guide?.matcherGuide || product.size_guide);
  const guideHeaders = getHeadersFromGuide(product.size_guide?.matcherGuide || product.size_guide, guideRows);
  const guideSizeHeader = guideHeaders.find((header) => /^(size|standard)$/i.test(header));
  const guideSizes = guideSizeHeader ? guideRows.map((row, index) => rowCell(row, guideSizeHeader, index)) : [];

  return unique([
    asArray(product.sizes),
    asArray(product.variant_sizes),
    guideSizes,
    asArray(product.variants).flatMap((variant) => asArray(variant?.sizes).map((size) => size?.name || size?.size || size?.label)),
  ]);
}

function isSingleColorName(name) {
  const normalized = clean(name).toLowerCase();
  return normalized && !["default", "default title", "one size", "standard"].includes(normalized);
}

function variantRows(product, handle, skuCounts) {
  const variants = asArray(product.variants);
  const fallbackSizes = productSizes(product);
  const hasMultipleColors = variants.length > 1 || variants.some((variant) => isSingleColorName(variant?.name));
  const rows = [];
  function uniqueSku(baseSku, color, size, index) {
    const baseValue = baseSku
      ? `${baseSku}-${color || "default"}-${size || "one-size"}`
      : `${handle}-${color || "default"}-${size || "one-size"}-${index + 1}`;
    const base = slugify(baseValue).toUpperCase();
    let candidate = base;
    let count = skuCounts.get(base) || 0;
    while (skuCounts.has(candidate)) {
      count += 1;
      candidate = `${base}-${count + 1}`;
    }
    skuCounts.set(base, count);
    skuCounts.set(candidate, 1);
    return candidate;
  }

  function makeRow({ color, size, source, variantImage, index }) {
    const option1Name = hasMultipleColors ? "Color" : "Size";
    const option1Value = hasMultipleColors ? clean(color || "Default") : clean(size || "One Size");
    const option2Name = hasMultipleColors ? "Size" : "";
    const option2Value = hasMultipleColors ? clean(size || "One Size") : "";
    const price = Number(source?.price ?? product.price ?? 0);
    const compareAt = Number(product.original_price ?? 0);
    const grams = gramsFromSource(source);
    return {
      "Option1 Name": option1Name,
      "Option1 Value": option1Value || "One Size",
      "Option2 Name": option2Name,
      "Option2 Value": option2Value,
      "Variant SKU": uniqueSku(source?.sku, color, size, index),
      "Variant Grams": grams,
      "Variant Inventory Tracker": "shopify",
      "Variant Inventory Qty": inventoryQtyFromSource(product, source),
      "Variant Inventory Policy": "deny",
      "Variant Fulfillment Service": "manual",
      "Variant Price": price.toFixed(2),
      "Variant Compare At Price": compareAt > price ? compareAt.toFixed(2) : "",
      "Variant Requires Shipping": "TRUE",
      "Variant Taxable": "TRUE",
      "Variant Barcode": clean(source?.barcode),
      "Variant Image": variantImage || "",
      "Variant Weight Unit": "lb",
      "Status": "active",
    };
  }

  if (variants.length) {
    variants.forEach((variant) => {
      const color = clean(variant?.name || product.color || "Default");
      const variantImage = asArray(variant?.images).find((url) => /^https?:\/\//i.test(url)) || "";
      const sizes = asArray(variant?.sizes).length ? asArray(variant.sizes) : fallbackSizes.map((name) => ({ name }));
      if (sizes.length) {
        sizes.forEach((sizeSource, index) => {
          rows.push(makeRow({ color, size: sizeSource?.name || sizeSource?.size || sizeSource?.label, source: sizeSource, variantImage, index }));
        });
      } else {
        rows.push(makeRow({ color, size: "One Size", source: {}, variantImage, index: rows.length }));
      }
    });
  } else {
    const sizes = fallbackSizes.length ? fallbackSizes : ["One Size"];
    sizes.forEach((size, index) => {
      rows.push(makeRow({ color: "", size, source: {}, variantImage: "", index }));
    });
  }

  return rows;
}

function gramsFromSource(source) {
  const rawWeight = Number(source?.weight);
  if (!Number.isFinite(rawWeight) || rawWeight <= 0) return 0;
  const unit = clean(source?.weight_unit).toLowerCase();
  if (unit === "kg") return Math.round(rawWeight * 1000);
  if (unit === "lb" || unit === "lbs") return Math.round(rawWeight * 453.59237);
  if (unit === "oz") return Math.round(rawWeight * 28.3495);
  return Math.round(rawWeight);
}

function inventoryQtyFromSource(product, source) {
  const explicitQty = Number(source?.inventory ?? source?.inventoryQuantity ?? source?.quantity);
  if (Number.isFinite(explicitQty) && explicitQty >= 0) return Math.round(explicitQty);

  const availability = clean(source?.availability ?? source?.available ?? product?.stock_status).toLowerCase();
  if (
    availability === "false"
    || availability.includes("out")
    || availability.includes("unavailable")
    || availability.includes("sold out")
  ) {
    return 0;
  }

  return inventoryQty;
}

function googleCategory(product) {
  const category = `${product.category || ""} ${product.subcategory || ""}`.toLowerCase();
  if (/shoe|sneaker|sandal/.test(category)) return "Apparel & Accessories > Shoes";
  if (/bag|backpack/.test(category)) return "Apparel & Accessories > Handbags, Wallets & Cases";
  if (/belt/.test(category)) return "Apparel & Accessories > Clothing Accessories > Belts";
  if (/sunglass|eyewear/.test(category)) return "Apparel & Accessories > Clothing Accessories > Sunglasses";
  if (/hat|cap/.test(category)) return "Apparel & Accessories > Clothing Accessories > Hats";
  if (/jewel|bracelet|ring|earring|pendant|necklace/.test(category)) return "Apparel & Accessories > Jewelry";
  return "Apparel & Accessories > Clothing";
}

function productType(product) {
  return clean(product.subcategory || product.category || "Demo Product");
}

function tags(product) {
  return unique([
    "PrimeStyleAI Demo",
    "PrimeStyleAI Import",
    product.category,
    product.subcategory,
    product.gender,
    asArray(product.tags),
    asArray(product.badges),
  ]).join(", ");
}

function bodyHtml(product) {
  const description = clean(product.description || product.short_description);
  const material = clean(product.material || product.fabric_details);
  const sizes = productSizes(product);
  const guideHtml = renderSizeGuides(product);
  const parts = [];
  if (description) parts.push(`<p>${escapeHtml(description)}</p>`);
  if (material) parts.push(`<p><strong>Material:</strong> ${escapeHtml(material)}</p>`);
  if (sizes.length) parts.push(`<p><strong>Available sizes:</strong> ${escapeHtml(sizes.join(", "))}</p>`);
  if (guideHtml) parts.push(guideHtml);
  return parts.join("\n");
}

function baseProductFields(product, handle) {
  const title = clean(product.name || product.title || handle);
  const category = googleCategory(product);
  return {
    Handle: handle,
    Title: title,
    "Body (HTML)": bodyHtml(product),
    Vendor: clean(product.brand || "PrimeStyleAI"),
    "Product Category": category,
    Type: productType(product),
    Tags: tags(product),
    Published: "TRUE",
    "Gift Card": "FALSE",
    "SEO Title": title,
    "SEO Description": clean(product.short_description || product.description).slice(0, 320),
    "Google Shopping / Google Product Category": category,
    "Google Shopping / Gender": clean(product.gender || "unisex").toLowerCase(),
    "Google Shopping / Age Group": "adult",
    "Google Shopping / Condition": "new",
    "Google Shopping / Custom Product": "TRUE",
    "Google Shopping / Custom Label 0": "PrimeStyleAI Demo",
  };
}

function blankRow() {
  return Object.fromEntries(headers.map((header) => [header, ""]));
}

const products = JSON.parse(await fs.readFile(rawPath, "utf8"));
const rows = [];
const summary = [];
const globalSkuCounts = new Map();

for (const product of products) {
  const handle = slugify(product.handle || product.product_id || product._id || product.name);
  const title = clean(product.name || handle);
  const images = productImages(product);
  const productFields = baseProductFields(product, handle);
  const variants = variantRows(product, handle, globalSkuCounts);

  variants.forEach((variant, index) => {
    const row = { ...blankRow(), Handle: handle, ...variant };
    if (index === 0) Object.assign(row, productFields);
    if (index === 0 && images[0]) {
      row["Image Src"] = images[0];
      row["Image Position"] = 1;
      row["Image Alt Text"] = title;
    }
    rows.push(row);
  });

  images.slice(1).forEach((image, imageIndex) => {
    rows.push({
      ...blankRow(),
      Handle: handle,
      "Image Src": image,
      "Image Position": imageIndex + 2,
      "Image Alt Text": title,
    });
  });

  summary.push({
    handle,
    title,
    variants: variants.length,
    images: images.length,
    sizes: productSizes(product).length,
    hasGuide: Boolean(renderSizeGuides(product)),
  });
}

const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n") + "\n";
await fs.writeFile(outputPath, csv, "utf8");

const emptyGuideProducts = summary.filter((item) => !item.hasGuide);
const noImageProducts = summary.filter((item) => item.images === 0);
const noVariantProducts = summary.filter((item) => item.variants === 0);
const maxVariants = Math.max(...summary.map((item) => item.variants));

console.log(JSON.stringify({
  outputPath,
  rows: rows.length,
  products: summary.length,
  variantRows: summary.reduce((sum, item) => sum + item.variants, 0),
  imageRows: rows.filter((row) => row["Image Src"]).length,
  maxVariants,
  emptyGuideProducts,
  noImageProducts,
  noVariantProducts,
}, null, 2));

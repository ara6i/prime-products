import fs from "node:fs/promises";
import path from "node:path";
import { LOCAL_UNIFORM_DEMO_PRODUCTS } from "../../app/demo/products/utils/localDemoProducts";

const outputDir = path.resolve("data-extracts/shopify-import");
const existingSummaryPath = path.join(outputDir, "uniform-products-summary.csv");
const existingShopifyPath = path.join(outputDir, "uniform-products-shopify-import.csv");

const shopifyOutputPath = path.join(outputDir, "uniform-products-missing-shopify-import.csv");
const inventoryOutputPath = path.join(outputDir, "uniform-products-missing-inventory-100.csv");
const summaryOutputPath = path.join(outputDir, "uniform-products-missing-summary.csv");
const sizeGuidesOutputPath = path.join(outputDir, "uniform-products-missing-size-guides.csv");

const inventoryQty = 100;
const locationName = "28171 Westfield drive";

const inventoryHeaders = [
  "Handle",
  "Title",
  "Option1 Name",
  "Option1 Value",
  "Option2 Name",
  "Option2 Value",
  "Option3 Name",
  "Option3 Value",
  "SKU",
  "Location",
  "Bin name",
  "Incoming (not editable)",
  "Unavailable (not editable)",
  "Committed (not editable)",
  "Available (not editable)",
  "On hand (current)",
  "On hand (new)",
];

const summaryHeaders = [
  "Handle",
  "Title",
  "ProductID",
  "Category",
  "Subcategory",
  "Gender",
  "Variants",
  "Images",
  "InventoryPerVariant",
  "Status",
];

const sizeGuideHeaders = [
  "Handle",
  "Product ID",
  "Title",
  "Brand",
  "Category",
  "Size System",
  "Available Sizes",
  "Size Guide Title",
  "Size Guide JSON",
  "Size Guide HTML",
];

function clean(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function slugify(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180) || "product";
}

function csvCell(value: unknown): string {
  const stringValue = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function escapeHtml(value: unknown): string {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unique(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values.flat(Infinity)) {
    const stringValue = clean(value);
    if (!stringValue || seen.has(stringValue)) continue;
    seen.add(stringValue);
    result.push(stringValue);
  }
  return result;
}

function csv(rows: Array<Record<string, unknown>>, headers: string[]): string {
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n") + "\n";
}

async function readHeaders(filePath: string): Promise<string[]> {
  const text = await fs.readFile(filePath, "utf8");
  return text.split(/\r?\n/, 1)[0].split(",");
}

async function readExistingProductIds(): Promise<Set<string>> {
  const text = await fs.readFile(existingSummaryPath, "utf8");
  const ids = new Set<string>();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(",");
  const productIdIndex = headers.indexOf("ProductID");
  if (productIdIndex < 0) return ids;
  for (const line of lines.slice(1)) {
    const columns = line.split(",");
    const id = clean(columns[productIdIndex]);
    if (id) ids.add(id);
  }
  return ids;
}

function sizeGuideHtml(product: (typeof LOCAL_UNIFORM_DEMO_PRODUCTS)[number]): string {
  const guide = product.size_guide as {
    title?: string;
    subtitle?: string;
    headers?: string[];
    rows?: Array<Record<string, string>>;
    howToMeasure?: string[];
  } | null | undefined;
  if (!guide?.headers?.length || !guide.rows?.length) return "";
  const headerHtml = guide.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const rowHtml = guide.rows
    .map((row) => `<tr>${guide.headers!.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`)
    .join("");
  const subtitle = guide.subtitle ? `<p>${escapeHtml(guide.subtitle)}</p>` : "";
  const table = `<div class="primestyle-size-guide"><h3>${escapeHtml(guide.title || "Size Guide")}</h3>${subtitle}<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowHtml}</tbody></table></div>`;
  const measures = (guide.howToMeasure ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const measureGuide = measures ? `<div class="primestyle-measure-guide"><h3>How to measure</h3><ul>${measures}</ul></div>` : "";
  return `${table}\n${measureGuide}`;
}

function bodyHtml(product: (typeof LOCAL_UNIFORM_DEMO_PRODUCTS)[number]): string {
  const parts = [
    product.description ? `<p>${escapeHtml(product.description)}</p>` : "",
    product.material ? `<p><strong>Material:</strong> ${escapeHtml(product.material)}</p>` : "",
    product.sizes?.length ? `<p><strong>Available sizes:</strong> ${escapeHtml(product.sizes.join(", "))}</p>` : "",
    sizeGuideHtml(product),
  ].filter(Boolean);
  return parts.join("\n");
}

function allImages(product: (typeof LOCAL_UNIFORM_DEMO_PRODUCTS)[number]): string[] {
  return unique([
    (product.variants ?? []).flatMap((variant) => variant.images ?? []),
    product.gallery ?? [],
    product.image_urls ?? [],
  ]).filter((url) => /^https?:\/\//i.test(url));
}

function exportGender(): string {
  return "unisex";
}

function exportTags(product: (typeof LOCAL_UNIFORM_DEMO_PRODUCTS)[number]): string {
  return unique([
    "PrimeStyleAI Demo",
    "Uniform",
    "Medical Scrub Set",
    "Healthcare Workwear",
    "SDK Test",
    "Unisex",
    (product.tags ?? []).filter((tag) => clean(tag).toLowerCase() !== "women"),
  ]).join(", ");
}

function googleGender(gender: unknown): string {
  const normalized = clean(gender).toLowerCase();
  if (normalized === "women" || normalized === "female") return "female";
  if (normalized === "men" || normalized === "male") return "male";
  return "unisex";
}

function skuFor(title: string, color: string, size: string): string {
  return `PSAI-${slugify(title).toUpperCase()}-${slugify(color).toUpperCase()}-${slugify(size).toUpperCase()}`;
}

function blankRow(headers: string[]): Record<string, string> {
  return Object.fromEntries(headers.map((header) => [header, ""]));
}

async function main(): Promise<void> {
  const existingIds = await readExistingProductIds();
  const shopifyHeaders = await readHeaders(existingShopifyPath);
  const products = LOCAL_UNIFORM_DEMO_PRODUCTS.filter((product) => {
    const id = clean(product.product_id || product._id);
    return id && !existingIds.has(id);
  });

  const shopifyRows: Array<Record<string, unknown>> = [];
  const inventoryRows: Array<Record<string, unknown>> = [];
  const summaryRows: Array<Record<string, unknown>> = [];
  const sizeGuideRows: Array<Record<string, unknown>> = [];

  for (const product of products) {
    const title = clean(product.name);
    const handle = slugify(title);
    const images = allImages(product);
    const variants = product.variants ?? [];
    const gender = exportGender();
    const category = "Uniforms";
    const subcategory = clean(product.subcategory || "Medical Uniforms");
    const tags = exportTags(product);

    let variantIndex = 0;
    for (const variant of variants) {
      const color = clean(variant.name || product.color || "Default");
      const variantImage = (variant.images ?? []).find((url) => /^https?:\/\//i.test(url)) || images[0] || "";
      for (const size of variant.sizes ?? []) {
        const sizeName = clean(size.name || "One Size");
        const sku = skuFor(title, color, sizeName);
        const price = Number(size.price ?? product.price ?? 0);
        const row = {
          ...blankRow(shopifyHeaders),
          Handle: handle,
          "Option1 Name": "Color",
          "Option1 Value": color,
          "Option2 Name": "Size",
          "Option2 Value": sizeName,
          "Variant SKU": sku,
          "Variant Grams": "650",
          "Variant Inventory Tracker": "shopify",
          "Variant Inventory Qty": String(inventoryQty),
          "Variant Inventory Policy": "deny",
          "Variant Fulfillment Service": "manual",
          "Variant Price": price.toFixed(2),
          "Variant Compare At Price": (price + 12).toFixed(2),
          "Variant Requires Shipping": "TRUE",
          "Variant Taxable": "TRUE",
          "Image Src": variantIndex === 0 && images[0] ? images[0] : "",
          "Image Position": variantIndex === 0 && images[0] ? "1" : "",
          "Image Alt Text": variantIndex === 0 && images[0] ? title : "",
          "Variant Image": variantImage,
          "Variant Weight Unit": "g",
          Status: "active",
        };
        if (variantIndex === 0) {
          Object.assign(row, {
            Title: title,
            "Body (HTML)": bodyHtml(product),
            Vendor: clean(product.brand || "PrimeStyleAI"),
            "Product Category": "Apparel & Accessories > Clothing > Uniforms",
            Type: subcategory,
            Tags: tags,
            Published: "TRUE",
            "Gift Card": "FALSE",
            "SEO Title": title,
            "SEO Description": clean(product.short_description || product.description).slice(0, 320),
            "Google Shopping / Google Product Category": "Apparel & Accessories > Clothing > Uniforms",
            "Google Shopping / Gender": googleGender(gender),
            "Google Shopping / Age Group": "adult",
            "Google Shopping / Condition": "new",
            "Google Shopping / Custom Product": "TRUE",
            "Google Shopping / Custom Label 0": "PrimeStyleAI Uniform Demo",
          });
        }
        shopifyRows.push(row);
        inventoryRows.push({
          Handle: handle,
          Title: variantIndex === 0 ? title : "",
          "Option1 Name": "Color",
          "Option1 Value": color,
          "Option2 Name": "Size",
          "Option2 Value": sizeName,
          "Option3 Name": "",
          "Option3 Value": "",
          SKU: sku,
          Location: locationName,
          "On hand (new)": inventoryQty,
        });
        variantIndex += 1;
      }
    }

    images.slice(1).forEach((image, imageIndex) => {
      shopifyRows.push({
        ...blankRow(shopifyHeaders),
        Handle: handle,
        "Image Src": image,
        "Image Position": String(imageIndex + 2),
        "Image Alt Text": title,
      });
    });

    summaryRows.push({
      Handle: handle,
      Title: title,
      ProductID: product.product_id,
      Category: category,
      Subcategory: subcategory,
      Gender: gender,
      Variants: variantIndex,
      Images: images.length,
      InventoryPerVariant: inventoryQty,
      Status: product.stock_status || "InStock",
    });

    sizeGuideRows.push({
      Handle: handle,
      "Product ID": product.product_id,
      Title: title,
      Brand: product.brand || "PrimeStyleAI",
      Category: subcategory || category,
      "Size System": product.size_system || "US",
      "Available Sizes": (product.sizes ?? []).join(" | "),
      "Size Guide Title": (product.size_guide as { title?: string } | undefined)?.title || "Medical Scrub Uniform Size Guide",
      "Size Guide JSON": JSON.stringify(product.size_guide ?? null),
      "Size Guide HTML": sizeGuideHtml(product),
    });
  }

  await fs.writeFile(shopifyOutputPath, csv(shopifyRows, shopifyHeaders), "utf8");
  await fs.writeFile(inventoryOutputPath, csv(inventoryRows, inventoryHeaders), "utf8");
  await fs.writeFile(summaryOutputPath, csv(summaryRows, summaryHeaders), "utf8");
  await fs.writeFile(sizeGuidesOutputPath, csv(sizeGuideRows, sizeGuideHeaders), "utf8");

  console.log(JSON.stringify({
    missingProducts: products.length,
    shopifyOutputPath,
    shopifyRows: shopifyRows.length,
    inventoryOutputPath,
    inventoryRows: inventoryRows.length,
    summaryOutputPath,
    summaryRows: summaryRows.length,
    sizeGuidesOutputPath,
    sizeGuideRows: sizeGuideRows.length,
    products: summaryRows.map((row) => row.ProductID),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

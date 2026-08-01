#!/usr/bin/env npx tsx
/**
 * Read-only exporter for the exact MyAIFitting AI Stylist RAG catalog scope.
 * It selects only direct retailer productUrl values; affiliateUrl is never
 * read, exported, opened, or followed.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { csvLine } from "./lib";

const BACKEND_ENV = "/Users/arashsn/Projects/PrimeStyleAI/primeStyleAI-backend/.env";
const DATABASE = "primestyleai_test_lab";
const COLLECTION = "style_rag_products";
const USER_ID = "myaifitting-ai-stylist-test";
const SIZABLE_SLOTS = new Set(["top", "bottom", "dress", "outerwear", "shoe"]);
const OUTPUT_HEADERS = [
  "product_id", "pdp_url", "merchant", "merchant_domain", "category", "subcategory", "slot", "garment_type", "gender", "brand", "availability", "price", "rag_size_guide_status",
];

type RagProduct = {
  sourceProductId: string;
  productUrl: string | null;
  merchantName: string | null;
  merchantDomain: string | null;
  category: string | null;
  subcategory: string | null;
  slot: string | null;
  garmentType: string | null;
  gender: string | null;
  brand: string | null;
  availability: string | null;
  price: number | null;
  sizeGuideStatus: string | null;
};

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  dotenv.config({ path: options.envPath, quiet: true });
  const uri = process.env.TEST_LAB_MONGODB_URI || process.env.TEST_LAB_MONGO_URI;
  if (!uri) throw new Error("Missing TEST_LAB_MONGODB_URI or TEST_LAB_MONGO_URI in the backend environment file.");

  const connection = await mongoose.createConnection(uri, { dbName: DATABASE }).asPromise();
  try {
    if (!connection.db) throw new Error("Test-lab MongoDB connection has no database handle.");
    const collection = connection.db.collection<RagProduct>(COLLECTION);
    const documents = await collection.find(eligibleRagQuery(), {
      projection: {
        sourceProductId: 1, productUrl: 1, merchantName: 1, merchantDomain: 1,
        category: 1, subcategory: 1, slot: 1, garmentType: 1, gender: 1,
        brand: 1, availability: 1, price: 1, sizeGuideStatus: 1,
      },
    }).sort({ merchantName: 1, slot: 1, title: 1 }).toArray();

    const candidates: RagProduct[] = documents.flatMap((document) => {
      const productUrl = cleanDirectRetailerUrl(document.productUrl);
      if (!document.sourceProductId || !document.slot || !SIZABLE_SLOTS.has(document.slot) || !productUrl) return [];
      return [{ ...document, productUrl }];
    });
    const merchantCandidates = options.merchant
      ? candidates.filter((product) => product.merchantName === options.merchant)
      : candidates;
    const selected = roundRobinByMerchant(merchantCandidates, options.count);
    if (!selected.length) throw new Error("No direct retailer PDP URLs matched the eligible AI Stylist RAG scope.");

    await mkdir(path.dirname(options.output), { recursive: true });
    const rows = [OUTPUT_HEADERS.join(","), ...selected.map((product) => csvLine({
      product_id: product.sourceProductId,
      pdp_url: product.productUrl!,
      merchant: product.merchantName ?? "",
      merchant_domain: product.merchantDomain ?? "",
      category: product.category ?? "",
      subcategory: product.subcategory ?? "",
      slot: product.slot ?? "",
      garment_type: product.garmentType ?? "",
      gender: product.gender ?? "",
      brand: product.brand ?? "",
      availability: product.availability ?? "",
      price: product.price ?? "",
      rag_size_guide_status: product.sizeGuideStatus ?? "",
    }, OUTPUT_HEADERS))];
    await writeFile(options.output, `${rows.join("\n")}\n`);
    const byMerchant = Object.fromEntries(selected.map((product) => product.merchantName || "Unknown").sort().map((merchant) => [merchant, selected.filter((product) => (product.merchantName || "Unknown") === merchant).length]));
    process.stdout.write(`Exported ${selected.length} direct AI Stylist RAG PDPs to ${options.output}\n${JSON.stringify({ byMerchant })}\n`);
  } finally {
    await connection.close();
  }
}

function eligibleRagQuery(): Record<string, unknown> {
  return {
    userId: USER_ID,
    hiddenFromCatalog: true,
    aiStylistRagReady: true,
    qualityStatus: "accepted",
    "imageVerification.status": "accepted",
    availability: { $ne: "OutOfStock" },
    price: { $gt: 0 },
    "enrichmentConfidence.overall": { $gte: 0.8 },
    "enrichmentConfidence.gender": { $gte: 0.8 },
    "enrichmentConfidence.slot": { $gte: 0.8 },
    "enrichmentConfidence.garmentType": { $gte: 0.8 },
    "enrichmentConfidence.color": { $gte: 0.8 },
    "enrichmentConfidence.formality": { $gte: 0.8 },
    "enrichmentConfidence.occasions": { $gte: 0.8 },
    "enrichmentConfidence.imageQuality": { $gte: 0.8 },
  };
}

function cleanDirectRetailerUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!(url.protocol === "http:" || url.protocol === "https:") || /(^|\.)linksynergy\.com$/i.test(url.hostname) || url.searchParams.has("murl")) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/^(partnerid|cm_mmc|utm_.+)$/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function roundRobinByMerchant(products: RagProduct[], count: number): RagProduct[] {
  const merchants = new Map<string, RagProduct[]>();
  const seenUrls = new Set<string>();
  for (const product of products) {
    if (seenUrls.has(product.productUrl!)) continue;
    seenUrls.add(product.productUrl!);
    const merchant = product.merchantName || "Unknown";
    merchants.set(merchant, [...(merchants.get(merchant) ?? []), product]);
  }
  const selected: RagProduct[] = [];
  while (selected.length < count) {
    let added = false;
    for (const productList of merchants.values()) {
      const next = productList.shift();
      if (!next) continue;
      selected.push(next);
      added = true;
      if (selected.length >= count) break;
    }
    if (!added) break;
  }
  return selected;
}

function parseArguments(args: string[]): { count: number; output: string; envPath: string; merchant?: string } {
  const value = (name: string): string | undefined => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write("Usage: npx tsx scripts/size-chart-scraper/export-ai-stylist-rag-pilot.ts --output /absolute/path/rag-pdps.csv [--count 50] [--merchant 'Cinq à Sept'] [--env /path/to/backend/.env]\n");
    process.exit(0);
  }
  const output = value("--output");
  if (!output) throw new Error("--output is required.");
  const count = Number(value("--count") ?? 50);
  if (!Number.isInteger(count) || count < 1 || count > 500) throw new Error("--count must be an integer from 1 to 500.");
  return { count, output: path.resolve(output), envPath: path.resolve(value("--env") ?? BACKEND_ENV), merchant: value("--merchant") };
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

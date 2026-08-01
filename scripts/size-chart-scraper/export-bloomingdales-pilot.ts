#!/usr/bin/env npx tsx
/**
 * Read-only exporter for the isolated Bloomingdale's Rakuten FTP collection.
 * It does not write to MongoDB, open, follow, or export affiliate URLs.
 * It reads the existing `murl` parameter locally solely to recover the
 * first-party Bloomingdale's PDP URL already embedded in the FTP record.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { csvLine } from "./lib";

const BACKEND_ENV = "/Users/arashsn/Projects/PrimeStyleAI/primeStyleAI-backend/.env";
const COLLECTION = "bloomingdales_ftp_products";
const DATABASE = "primestyleai_test_lab";
const OUTPUT_HEADERS = ["product_id", "pdp_url", "merchant", "category", "gender", "subcategory", "brand", "availability", "is_on_sale", "effective_price"];

type FtpProduct = {
  sourceProductId: string;
  affiliateUrl: string | null;
  title: string | null;
  brand: string | null;
  gender: string | null;
  category: string | null;
  subcategory: string | null;
  availability: string | null;
  isOnSale: boolean | null;
  effectivePrice: number | null;
};

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  dotenv.config({ path: options.envPath, quiet: true });
  const uri = process.env.TEST_LAB_MONGODB_URI || process.env.TEST_LAB_MONGO_URI;
  if (!uri) throw new Error("Missing TEST_LAB_MONGODB_URI or TEST_LAB_MONGO_URI in the backend environment file.");

  const connection = await mongoose.createConnection(uri, { dbName: DATABASE }).asPromise();
  try {
    if (!connection.db) throw new Error("Test-lab MongoDB connection has no database handle.");
    const collection = connection.db.collection<FtpProduct>(COLLECTION);
    const cursor = collection.find(
      { category: options.category, availability: "in-stock", affiliateUrl: { $type: "string" } },
      { projection: { sourceProductId: 1, affiliateUrl: 1, title: 1, brand: 1, gender: 1, category: 1, subcategory: 1, availability: 1, isOnSale: 1, effectivePrice: 1 } },
    ).sort({ isOnSale: -1, effectivePrice: 1 }).batchSize(200);

    const seenUrls = new Set<string>();
    const rows: string[] = [OUTPUT_HEADERS.join(",")];
    for await (const product of cursor) {
      const pdpUrl = bloomingdalesPdpUrl(product.affiliateUrl);
      if (!pdpUrl || seenUrls.has(pdpUrl)) continue;
      seenUrls.add(pdpUrl);
      rows.push(csvLine({
        product_id: product.sourceProductId,
        pdp_url: pdpUrl,
        merchant: "Bloomingdale's",
        category: product.category ?? "",
        gender: product.gender ?? "",
        subcategory: product.subcategory ?? "",
        brand: product.brand ?? "",
        availability: product.availability ?? "",
        is_on_sale: String(Boolean(product.isOnSale)),
        effective_price: product.effectivePrice ?? "",
      }, OUTPUT_HEADERS));
      if (rows.length - 1 >= options.count) break;
    }

    if (rows.length === 1) throw new Error(`No Bloomingdale's PDP links found for category ${JSON.stringify(options.category)}.`);
    await mkdir(path.dirname(options.output), { recursive: true });
    await writeFile(options.output, `${rows.join("\n")}\n`);
    process.stdout.write(`Exported ${rows.length - 1} unique Bloomingdale's PDPs to ${options.output}\n`);
  } finally {
    await connection.close();
  }
}

function bloomingdalesPdpUrl(affiliateUrl: string | null): string | null {
  if (!affiliateUrl) return null;
  try {
    const embedded = new URL(affiliateUrl).searchParams.get("murl");
    if (!embedded) return null;
    const pdp = new URL(embedded);
    if (!(pdp.protocol === "https:" && /(^|\.)bloomingdales\.com$/i.test(pdp.hostname))) return null;
    pdp.searchParams.delete("PartnerID");
    pdp.searchParams.delete("cm_mmc");
    return pdp.toString();
  } catch {
    return null;
  }
}

function parseArguments(args: string[]): { count: number; category: string; output: string; envPath: string } {
  const value = (name: string): string | undefined => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write("Usage: npx tsx scripts/size-chart-scraper/export-bloomingdales-pilot.ts --output /absolute/path/bloomingdales-50.csv [--count 50] [--category Clothing] [--env /path/to/backend/.env]\n");
    process.exit(0);
  }
  const output = value("--output");
  if (!output) throw new Error("--output is required.");
  const count = Number(value("--count") ?? 50);
  if (!Number.isInteger(count) || count < 1 || count > 500) throw new Error("--count must be an integer from 1 to 500.");
  return {
    count,
    category: value("--category") ?? "Clothing",
    output: path.resolve(output),
    envPath: path.resolve(value("--env") ?? BACKEND_ENV),
  };
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

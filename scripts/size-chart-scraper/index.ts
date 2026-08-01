#!/usr/bin/env npx tsx
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import puppeteer, { type Browser, type Page } from "puppeteer";
import {
  type ChartTable,
  type InputProduct,
  type OcrWord,
  csvLine,
  isNotApplicableCategory,
  normaliseTable,
  parseCsv,
  reconstructOcrTable,
  scopeFromText,
  tableRows,
  toInputProducts,
} from "./lib";

const execFileAsync = promisify(execFile);
const OUTPUT_HEADERS = [
  "product_id", "merchant", "input_url", "canonical_url", "category", "status", "source_type", "table_index", "size_value", "measurements_json", "chart_headers_json", "evidence_path", "image_url", "ocr_text", "confidence", "message",
];

type Options = {
  input: string;
  output: string;
  evidenceDir: string;
  limit?: number;
  delayMs: number;
  headful: boolean;
  ocr: boolean;
  proxyServer?: string;
  proxyUsername?: string;
  proxyPassword?: string;
};

type ScrapeResult = {
  product: InputProduct;
  canonicalUrl: string;
  status: "extracted" | "image_chart_needs_review" | "not_found" | "blocked_or_captcha" | "not_applicable" | "failed";
  sourceType: "product_specific" | "brand_generic" | "unknown_scope" | "not_applicable";
  tables: ChartTable[];
  evidencePath: string;
  imageUrl: string;
  ocrText: string;
  message: string;
};

type LocalOcrResult = {
  text: string;
  table: ChartTable | null;
};

async function main(): Promise<void> {
  await loadLocalProxyEnvironment();
  const options = parseArguments(process.argv.slice(2));
  const products = toInputProducts(parseCsv(await readFile(options.input, "utf8")))
    .map((product) => ({ ...product, pdpUrl: resolveInputUrl(product.pdpUrl, options.input) }))
    .slice(0, options.limit);
  if (!products.length) throw new Error("The input CSV has no product rows.");

  await mkdir(options.evidenceDir, { recursive: true });
  const browser = await puppeteer.launch({
    headless: !options.headful,
    executablePath: await resolveBrowserExecutable(),
    defaultViewport: { width: 1440, height: 1300 },
    args: options.proxyServer ? [`--proxy-server=${options.proxyServer}`] : [],
  });
  const output: string[] = [OUTPUT_HEADERS.join(",")];

  try {
    for (const [index, product] of products.entries()) {
      process.stderr.write(`[${index + 1}/${products.length}] ${product.productId}\n`);
      const result = await scrapeProduct(browser, product, options);
      output.push(...resultToCsvRows(result));
      if (index < products.length - 1 && options.delayMs > 0) await pause(options.delayMs);
    }
  } finally {
    await browser.close();
  }

  await writeFile(options.output, `${output.join("\n")}\n`);
  process.stderr.write(`Wrote ${output.length - 1} result rows to ${options.output}\n`);
}

async function scrapeProduct(browser: Browser, product: InputProduct, options: Options): Promise<ScrapeResult> {
  const evidencePath = await createEvidenceDirectory(options.evidenceDir, product.productId, product.pdpUrl);
  if (isNotApplicableCategory(product.category)) {
    return baseResult(product, evidencePath, "not_applicable", "not_applicable", "Category has no wearable measurement chart requirement.");
  }

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(35_000);
  page.setDefaultTimeout(8_000);
  await page.setUserAgent("PrimeStyleAI-SizeChartResearch/0.1 (+contact: data@primestyle.ai)");
  if (options.proxyUsername && options.proxyPassword) {
    await page.authenticate({ username: options.proxyUsername, password: options.proxyPassword });
  }
  try {
    const response = await page.goto(product.pdpUrl, { waitUntil: "domcontentloaded" });
    await pause(700);
    const status = response?.status() ?? 0;
    const canonicalUrl = page.url();
    if (status === 401 || status === 403 || await isBlocked(page)) {
      return { ...baseResult(product, evidencePath, "blocked_or_captcha", "unknown_scope", `Stopped safely after retailer response ${status || "blocked page"}.`), canonicalUrl };
    }

    const clickResult = await clickSizeGuide(page);
    if (clickResult.clicked) await pause(700);
    const tables = await extractTables(page);
    const imageUrl = await findChartImage(page);
    const screenshotPath = path.join(evidencePath, "chart.png");
    await captureChart(page, screenshotPath);
    const chartContext = await extractVisibleChartContext(page);
    const contextText = `${tables.map((table) => table.contextText).join(" ")} ${chartContext}`;
    const sourceType = scopeFromText(contextText);

    const manifest = {
      productId: product.productId,
      inputUrl: product.pdpUrl,
      canonicalUrl,
      retrievedAt: new Date().toISOString(),
      clickedControl: clickResult.controlText,
      imageUrl,
      chartContext,
      tableCount: tables.length,
      tables,
    };
    await writeFile(path.join(evidencePath, "manifest.json"), JSON.stringify(manifest, null, 2));

    if (tables.length) return { product, canonicalUrl, status: "extracted", sourceType, tables, evidencePath, imageUrl, ocrText: "", message: "Structured size chart extracted." };
    if (imageUrl || clickResult.clicked) {
      const ocr = options.ocr ? await runLocalOcr(screenshotPath) : { text: "", table: null };
      return { product, canonicalUrl, status: "image_chart_needs_review", sourceType, tables: ocr.table ? [ocr.table] : [], evidencePath, imageUrl, ocrText: ocr.text, message: ocr.text ? "Image chart OCR captured; review before importing." : "Image or visual chart captured; OCR disabled or unavailable." };
    }
    return { ...baseResult(product, evidencePath, "not_found", "unknown_scope", "No visible Size Guide or Size Chart control found."), canonicalUrl };
  } catch (error) {
    return { ...baseResult(product, evidencePath, "failed", "unknown_scope", error instanceof Error ? error.message : "Unexpected scraper failure."), canonicalUrl: page.url() };
  } finally {
    await page.close();
  }
}

function baseResult(product: InputProduct, evidencePath: string, status: ScrapeResult["status"], sourceType: ScrapeResult["sourceType"], message: string): ScrapeResult {
  return { product, canonicalUrl: "", status, sourceType, tables: [], evidencePath, imageUrl: "", ocrText: "", message };
}

function resultToCsvRows(result: ScrapeResult): string[] {
  const shared = {
    product_id: result.product.productId,
    merchant: result.product.merchant,
    input_url: result.product.pdpUrl,
    canonical_url: result.canonicalUrl,
    category: result.product.category,
    status: result.status,
    source_type: result.sourceType,
    evidence_path: result.evidencePath,
    image_url: result.imageUrl,
    ocr_text: result.ocrText,
    message: result.message,
  };
  const rows = result.tables.flatMap((table, tableIndex) => tableRows(table).map((row) => csvLine({
    ...shared,
    table_index: tableIndex,
    size_value: row.sizeValue,
    measurements_json: JSON.stringify(row.measurements),
    chart_headers_json: JSON.stringify(table.headers),
    confidence: result.status === "extracted" ? 0.9 : 0.55,
  }, OUTPUT_HEADERS)));
  return rows.length ? rows : [csvLine({ ...shared, table_index: "", size_value: "", measurements_json: "", chart_headers_json: "", confidence: "" }, OUTPUT_HEADERS)];
}

async function extractTables(page: Page): Promise<ChartTable[]> {
  const frames = page.frames();
  const allTables = await Promise.all(frames.map((frame) => frame.evaluate(() => {
    return [...document.querySelectorAll("table")].filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 2 && rect.height > 2;
    }).map((table) => {
      const sourceRows = [...table.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("th, td")].map((cell) => cell.textContent?.replace(/\s+/g, " ").trim() ?? ""));
      const explicitHeaders = [...table.querySelectorAll("thead tr")].at(-1)?.querySelectorAll("th, td");
      const headers = explicitHeaders ? [...explicitHeaders].map((cell) => cell.textContent?.replace(/\s+/g, " ").trim() ?? "") : sourceRows.shift() ?? [];
      if (explicitHeaders && sourceRows.length && sourceRows[0]!.join("|") === headers.join("|")) sourceRows.shift();
      const context = table.closest("[role=dialog], dialog, [aria-modal=true], .modal, .drawer, .size-guide, .size-chart") ?? table.parentElement;
      return { headers, rows: sourceRows, contextText: context?.textContent?.slice(0, 5000) ?? "" };
    });
  })));
  return allTables.flat().map(normaliseTable).filter((table): table is ChartTable => Boolean(table));
}

async function clickSizeGuide(page: Page): Promise<{ clicked: boolean; controlText: string }> {
  return page.evaluate(() => {
    const matcher = /\b(size\s*(guide|chart)|fit\s*guide|sizing)\b/i;
    const candidates = [...document.querySelectorAll("a, button, [role=button], summary")]
      .filter((element) => matcher.test(element.textContent ?? "") || matcher.test(element.getAttribute("aria-label") ?? ""))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 2 && rect.height > 2;
      });
    const candidate = candidates[0] as HTMLElement | undefined;
    if (!candidate) return { clicked: false, controlText: "" };
    candidate.scrollIntoView({ block: "center" });
    candidate.click();
    return { clicked: true, controlText: (candidate.innerText || candidate.getAttribute("aria-label") || "").trim() };
  });
}

async function findChartImage(page: Page): Promise<string> {
  return page.evaluate(() => {
    const roots = [...document.querySelectorAll("[role=dialog], dialog, [aria-modal=true], .modal, .drawer, .size-guide, .size-chart")];
    for (const root of roots) {
      const style = window.getComputedStyle(root);
      const rect = root.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || rect.width < 3 || rect.height < 3) continue;
      const label = root.textContent ?? "";
      if (!/size|fit|measurement/i.test(label)) continue;
      const image = root.querySelector<HTMLImageElement>("img[src]");
      if (image?.src) return image.src;
    }
    return "";
  });
}

async function extractVisibleChartContext(page: Page): Promise<string> {
  return page.evaluate(() => {
    const roots = [...document.querySelectorAll("[role=dialog], dialog, [aria-modal=true], .modal, .drawer, .size-guide, .size-chart")];
    const root = roots.find((candidate) => {
      const style = window.getComputedStyle(candidate);
      const rect = candidate.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width >= 3 && rect.height >= 3 && /size|fit|measurement/i.test(candidate.textContent ?? "");
    });
    return root?.textContent?.replace(/\s+/g, " ").slice(0, 5000) ?? "";
  });
}

async function captureChart(page: Page, screenshotPath: string): Promise<void> {
  const roots = await page.$$("dialog[open], [role=dialog], [aria-modal=true], .modal, .drawer, .size-guide, .size-chart");
  for (const root of roots) {
    if (!(await root.boundingBox())) continue;
    try {
      await root.screenshot({ path: screenshotPath });
      return;
    } catch {
      // A dynamic dialog can detach between detection and capture. Use another
      // visible chart root or the current viewport rather than failing the PDP.
    }
  }
  await page.screenshot({ path: screenshotPath, fullPage: false });
}

async function isBlocked(page: Page): Promise<boolean> {
  const text = await page.evaluate(() => document.body.innerText.slice(0, 10000));
  return /(captcha|access denied|unusual traffic|verify you are human|robot check)/i.test(text);
}

async function runLocalOcr(imagePath: string): Promise<LocalOcrResult> {
  if (process.platform !== "darwin") return { text: "", table: null };
  try {
    const binary = await ensureAppleVisionBinary();
    const { stdout } = await execFileAsync(binary, [imagePath], { timeout: 45_000, maxBuffer: 4 * 1024 * 1024 });
    const words = JSON.parse(stdout) as OcrWord[];
    const table = reconstructOcrTable(words);
    return { text: table?.text ?? words.map((word) => word.text).join("\n"), table: table ? { headers: table.headers, rows: table.rows, contextText: "OCR image chart" } : null };
  } catch (error) {
    process.stderr.write(`Local OCR skipped: ${error instanceof Error ? error.message : "unknown error"}\n`);
    return { text: "", table: null };
  }
}

async function ensureAppleVisionBinary(): Promise<string> {
  const source = path.join(process.cwd(), "scripts/size-chart-scraper/apple-vision-ocr.swift");
  const sourceHash = createHash("sha256").update(await readFile(source)).digest("hex").slice(0, 12);
  const binary = path.join(tmpdir(), `primestyle-size-chart-ocr-${sourceHash}`);
  try { await access(binary); return binary; } catch { /* Compile below. */ }
  await execFileAsync("swiftc", [source, "-o", binary], { timeout: 90_000, maxBuffer: 4 * 1024 * 1024 });
  return binary;
}

async function resolveBrowserExecutable(): Promise<string | undefined> {
  const configured = process.env.SIZE_CHART_BROWSER_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = [
    configured,
    process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined,
    process.platform === "darwin" ? "/Applications/Chromium.app/Contents/MacOS/Chromium" : undefined,
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Keep checking explicit/installed browser paths. Puppeteer remains the fallback.
    }
  }
  return undefined;
}

async function createEvidenceDirectory(base: string, productId: string, url: string): Promise<string> {
  const safeId = productId.replaceAll(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "unknown-product";
  const suffix = createHash("sha256").update(url).digest("hex").slice(0, 10);
  const destination = path.join(base, `${safeId}-${suffix}`);
  await mkdir(destination, { recursive: true });
  return destination;
}

function parseArguments(args: string[]): Options {
  const take = (name: string): string | undefined => {
    const position = args.indexOf(name);
    return position >= 0 ? args[position + 1] : undefined;
  };
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write("Usage: npx tsx scripts/size-chart-scraper/index.ts --input products.csv --output size-charts.csv [--evidence-dir artifacts/size-charts] [--limit 20] [--delay-ms 1200] [--no-ocr] [--headful]\n");
    process.exit(0);
  }
  const input = take("--input");
  const output = take("--output");
  if (!input || !output) throw new Error("--input and --output are required. Run with --help for usage.");
  const limitText = take("--limit");
  const delayText = take("--delay-ms");
  const limit = limitText ? Number(limitText) : undefined;
  const delayMs = delayText ? Number(delayText) : 1200;
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) throw new Error("--limit must be a positive integer.");
  if (!Number.isFinite(delayMs) || delayMs < 0) throw new Error("--delay-ms must be zero or higher.");
  return {
    input: path.resolve(input),
    output: path.resolve(output),
    evidenceDir: path.resolve(take("--evidence-dir") ?? "artifacts/size-chart-scraper"),
    limit,
    delayMs,
    headful: args.includes("--headful"),
    ocr: !args.includes("--no-ocr"),
    proxyServer: process.env.PROXY_SELLER_PROXY_SERVER,
    proxyUsername: process.env.PROXY_SELLER_PROXY_USERNAME,
    proxyPassword: process.env.PROXY_SELLER_PROXY_PASSWORD,
  };
}

async function loadLocalProxyEnvironment(): Promise<void> {
  const envPath = path.resolve(".env.local");
  let contents: string;
  try {
    contents = await readFile(envPath, "utf8");
  } catch {
    return;
  }
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator);
    if (key.startsWith("PROXY_SELLER_")) {
      process.env[key] ??= line.slice(separator + 1);
    }
  }
}

function resolveInputUrl(value: string, inputPath: string): string {
  if (/^(https?|file):\/\//i.test(value)) return value;
  return pathToFileURL(path.resolve(path.dirname(inputPath), value)).toString();
}

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const ROOT = process.cwd();
const REPORT_DIR = path.resolve(
  ROOT,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const SOURCE_MANIFEST = path.join(
  REPORT_DIR,
  "cj-manual-refinement-sources/manifest.json",
);
const DECISIONS_PATH = path.resolve(
  ROOT,
  "scripts/ai-stylist/cj-manual-refinement-source-decisions.json",
);
const OUTPUT_DIR = path.join(REPORT_DIR, "cj-manual-gemini-batch");
const JOB_PATH = path.join(OUTPUT_DIR, "job.json");
const REQUEST_MANIFEST_PATH = path.join(OUTPUT_DIR, "request-manifest.json");
const BACKEND_ENV_PATH = path.resolve(ROOT, "../primeStyleAI-backend/.env");
const MODEL =
  process.env.AI_STYLIST_GEMINI_BATCH_MODEL ||
  "gemini-3-pro-image-preview";
const MAX_INLINE_BYTES = 20 * 1024 * 1024;

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function parseEnvFile(raw) {
  const parsed = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function getApiKey() {
  const direct =
    process.env.SIZING_LAB_GEMINI_API_KEY ||
    process.env.TEST_LAB_GOOGLE_API_KEY ||
    process.env.TEST_LAB_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (direct) return direct;
  if (!existsSync(BACKEND_ENV_PATH)) {
    throw new Error("Gemini environment file is unavailable.");
  }
  const env = parseEnvFile(readFileSync(BACKEND_ENV_PATH, "utf8"));
  const apiKey =
    env.SIZING_LAB_GEMINI_API_KEY ||
    env.TEST_LAB_GOOGLE_API_KEY ||
    env.TEST_LAB_GEMINI_API_KEY ||
    env.GEMINI_API_KEY ||
    env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is unavailable.");
  return apiKey;
}

function buildPrompt(product) {
  return [
    `Create one source-faithful ecommerce catalog image of the exact ${product.garmentType} shown in the supplied source.`,
    `The reserved product color is ${product.color}. Preserve that exact color, the material texture, stitching, panel geometry, hardware, collar, placket, pockets, hem, sole, toe shape, and all visible proportions.`,
    "Reconstruct only small portions hidden by the model, hanger, magazine, or styling prop, using visible product evidence. Do not redesign, recolor, slim, widen, lengthen, shorten, modernize, or add or remove product details.",
    "Remove the person, body, hands, other garments, hanger, props, supplier text, watermarks, and background. Show exactly one complete product, centered and fully visible, using the source's most informative front or three-quarter orientation.",
    "Use a plain pure-white ecommerce studio background with a minimal natural contact shadow. Keep edges clean and preserve crisp product detail. No human, mannequin, logo, invented label, caption, border, UI, or decorative set.",
    "If the source cannot support exact identity, do not invent missing design elements.",
  ].join(" ");
}

if (existsSync(JOB_PATH)) {
  const existing = readJson(JOB_PATH);
  throw new Error(
    `A batch record already exists (${existing.name || "unknown job"}). Refusing to submit a duplicate.`,
  );
}

const sourceManifest = readJson(SOURCE_MANIFEST);
const decisions = readJson(DECISIONS_PATH);
const readyIds = new Set(
  decisions.decisions
    .filter((item) => item.decision === "gemini-ready")
    .map((item) => item.productId),
);
const selected = sourceManifest.products.filter((product) =>
  readyIds.has(product.productId),
);

if (selected.length !== decisions.summary.geminiReady || selected.length !== 22) {
  throw new Error(
    `Source gate mismatch: expected 22 Gemini-ready records, found ${selected.length}.`,
  );
}
if (new Set(selected.map((item) => item.productId)).size !== selected.length) {
  throw new Error("Duplicate product identity detected inside the Gemini-ready batch.");
}

const requestManifest = selected.map((product) => ({
  index: product.index,
  productId: product.productId,
  sku: product.sku,
  title: product.title,
  garmentType: product.garmentType,
  color: product.color,
  localPath: product.localPath,
  sourceSha256: product.sha256,
  sourceBytes: product.bytes,
  prompt: buildPrompt(product),
}));

const requests = selected.map((product) => {
  const imagePath = path.resolve(ROOT, product.localPath);
  const data = readFileSync(imagePath).toString("base64");
  return {
    contents: [
      {
        role: "user",
        parts: [
          { text: buildPrompt(product) },
          {
            inlineData: {
              mimeType: product.contentType || "image/jpeg",
              data,
            },
          },
        ],
      },
    ],
    metadata: {
      productId: product.productId,
      sourceIndex: String(product.index),
    },
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      temperature: 0.1,
      topP: 0.8,
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "2K",
      },
    },
  };
});

const estimatedInlineBytes = Buffer.byteLength(JSON.stringify(requests));
if (estimatedInlineBytes >= MAX_INLINE_BYTES) {
  throw new Error(
    `Inline batch is ${estimatedInlineBytes} bytes and exceeds the guarded 20 MB limit.`,
  );
}

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(
  REQUEST_MANIFEST_PATH,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      model: MODEL,
      requestCount: requestManifest.length,
      estimatedInlineBytes,
      requests: requestManifest,
    },
    null,
    2,
  )}\n`,
);

const ai = new GoogleGenAI({ apiKey: getApiKey() });
const batch = await ai.batches.create({
  model: MODEL,
  src: requests,
  config: {
    displayName: `mens-cj-source-faithful-${new Date().toISOString().slice(0, 10)}`,
  },
});

const jobRecord = {
  submittedAt: new Date().toISOString(),
  localOnly: true,
  name: batch.name,
  displayName: batch.displayName,
  model: batch.model || MODEL,
  state: batch.state,
  createTime: batch.createTime,
  updateTime: batch.updateTime,
  requestCount: selected.length,
  estimatedInlineBytes,
  requestManifest: path.relative(ROOT, REQUEST_MANIFEST_PATH),
};
writeFileSync(JOB_PATH, `${JSON.stringify(jobRecord, null, 2)}\n`);
console.log(JSON.stringify(jobRecord, null, 2));

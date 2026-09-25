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
const OUTPUT_DECISIONS = path.resolve(
  ROOT,
  "scripts/ai-stylist/cj-manual-gemini-output-decisions.json",
);
const FIRST_REQUEST_MANIFEST = path.join(
  REPORT_DIR,
  "cj-manual-gemini-batch/request-manifest.json",
);
const RECOVERY_REQUEST_MANIFEST = path.join(
  REPORT_DIR,
  "cj-manual-gemini-recovery-batch/request-manifest.json",
);
const OUTPUT_DIR = path.join(REPORT_DIR, "cj-manual-gemini-repair-batch");
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

const itemCorrections = {
  "2505250900531609500":
    "Reconstruct the complete standalone short-sleeve sage textured knit polo, including its lower hem, from the visible product evidence. Remove the entire person and every trace of neck, skin, trousers, bag, flowers, furniture, floor and room.",
  "2505140753031625700":
    "Show exactly one single coffee-brown and taupe suede penny loafer in a clean three-quarter view. Do not show a pair. Do not preserve or recreate the source-photo panel, worn feet, legs, inset, split layout, border or collage.",
  "2502280543221601200":
    "Show the complete warm-ivory high-rise double-pleat straight trouser alone from waistband through both hems. Remove the entire person and every trace of legs, shoes, green boxes, furniture, floor and room.",
};

function buildPrompt(product) {
  return [
    `Repair the failed catalog extraction for the exact ${product.garmentType} in the supplied source.`,
    `The reserved product color is ${product.color}. Preserve the exact product identity, color, material texture, stitching, panel geometry, hardware, collar, placket, pockets, waistband, pleats, hem, sole, toe shape and proportions supported by the source.`,
    itemCorrections[product.productId],
    "OUTPUT ONLY ONE ISOLATED PRODUCT ON A PLAIN PURE-WHITE BACKGROUND. The image must not contain any human body, neck, hands, legs, other garments, footwear, bag, furniture, plants, flowers, room, floor, rug, boxes, supplier text, caption, watermark, border, inset image, secondary panel, duplicate product, split image or collage.",
    "Use a minimal natural contact shadow only. Center the full product and keep every edge visible. Do not redesign, recolor, slim, widen, lengthen, shorten, modernize, add details or remove product details.",
    "Return a single ecommerce product photograph, not a lifestyle photograph and not a comparison board.",
  ].join(" ");
}

if (existsSync(JOB_PATH)) {
  const existing = readJson(JOB_PATH);
  throw new Error(
    `A repair batch record already exists (${existing.name || "unknown job"}). Refusing to submit a duplicate.`,
  );
}

const sourceManifest = readJson(SOURCE_MANIFEST);
const decisions = readJson(OUTPUT_DECISIONS);
const firstRequests = readJson(FIRST_REQUEST_MANIFEST);
const recoveryRequests = readJson(RECOVERY_REQUEST_MANIFEST);
const repairIds = new Set(
  decisions.decisions
    .filter((item) => item.decision === "regenerate")
    .map((item) => item.productId),
);
const firstIds = new Set(firstRequests.requests.map((item) => item.productId));
const recoveryIds = new Set(
  recoveryRequests.requests.map((item) => item.productId),
);
const selected = sourceManifest.products.filter((product) =>
  repairIds.has(product.productId),
);

if (selected.length !== 3 || repairIds.size !== 3) {
  throw new Error(
    `Repair gate mismatch: expected three rejected outputs, found ${selected.length}.`,
  );
}
if (new Set(selected.map((item) => item.productId)).size !== selected.length) {
  throw new Error("Duplicate product identity detected inside the repair batch.");
}
for (const product of selected) {
  if (!firstIds.has(product.productId)) {
    throw new Error(`Repair ID ${product.productId} was not in the failed first batch.`);
  }
  if (recoveryIds.has(product.productId)) {
    throw new Error(`Repair ID ${product.productId} collides with the recovery batch.`);
  }
  if (!itemCorrections[product.productId]) {
    throw new Error(`Missing item-specific correction for ${product.productId}.`);
  }
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
  priorFailure: decisions.decisions.find(
    (item) => item.productId === product.productId,
  )?.reason,
  prompt: buildPrompt(product),
}));

const requests = selected.map((product) => ({
  contents: [
    {
      role: "user",
      parts: [
        { text: buildPrompt(product) },
        { text: "AUTHORITATIVE PRODUCT SOURCE:" },
        {
          inlineData: {
            mimeType: product.contentType || "image/jpeg",
            data: readFileSync(path.resolve(ROOT, product.localPath)).toString(
              "base64",
            ),
          },
        },
      ],
    },
  ],
  metadata: {
    productId: product.productId,
    sourceIndex: String(product.index),
    repairAttempt: "1",
  },
  config: {
    responseModalities: ["TEXT", "IMAGE"],
    temperature: 0.05,
    topP: 0.7,
    imageConfig: { aspectRatio: "1:1", imageSize: "2K" },
  },
}));

const estimatedInlineBytes = Buffer.byteLength(JSON.stringify(requests));
if (estimatedInlineBytes >= MAX_INLINE_BYTES) {
  throw new Error(
    `Repair batch is ${estimatedInlineBytes} bytes and exceeds the guarded 20 MB limit.`,
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
      excludedNonFailedFirstBatchIds: [...firstIds].filter(
        (productId) => !repairIds.has(productId),
      ),
      excludedRecoveryBatchIds: [...recoveryIds],
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
    displayName: `mens-cj-output-repair-${new Date().toISOString().slice(0, 10)}`,
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

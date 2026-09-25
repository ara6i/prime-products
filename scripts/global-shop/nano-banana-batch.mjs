import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { SHOP_PRODUCTS, validateProducts } from "./nano-banana-products.mjs";

const ROOT = process.cwd();
const RUN_DIR = path.join(
  ROOT,
  "output/reports/global-shop-nano-banana-v4-20260923",
);
const PUBLIC_DIR = path.join(ROOT, "public/media/global-shop/showcase-v4");
const JOB_PATH = path.join(RUN_DIR, "masters-job.json");
const MANIFEST_PATH = path.join(RUN_DIR, "masters-request-manifest.json");
const STATUS_PATH = path.join(RUN_DIR, "masters-status.json");
const REFERENCE_DIR = path.join(RUN_DIR, "photography-references");
const BACKEND_ENV_PATH = path.resolve(ROOT, "../primeStyleAI-backend/.env");
const MODEL = process.env.GLOBAL_SHOP_GEMINI_MODEL || "gemini-3-pro-image";
const MODE = process.argv[2] || "prepare";
const MAX_INLINE_BYTES = 18 * 1024 * 1024;

const SOURCE_REFERENCES = {
  women: path.join(
    ROOT,
    "references/zara-pdp-photography/women-camel-striped-blazer/08-product-front.jpg",
  ),
  men: path.join(
    ROOT,
    "references/zara-pdp-photography/men-sand-suit-blazer/09-product-front.jpg",
  ),
};

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
  const countRule =
    product.type === "shoe" || product.slug.includes("hoop-set")
      ? "Show exactly one matching pair, arranged naturally as a single product listing."
      : "Show exactly one product.";
  const shapeRule =
    product.type === "top"
      ? "The garment must read immediately as a real wearable top, with anatomically plausible sleeves, collar, shoulders, openings, seams and hem."
      : product.type === "bottom"
        ? "The garment must read immediately as a real wearable bottom, with a correct waistband, rise, leg or skirt construction, and complete hem."
        : "Use physically plausible retail construction, scale, materials, seams and hardware.";
  return [
    "Create an original, photorealistic luxury-fashion ecommerce product photograph.",
    `Product: ${product.name}, for the ${product.gender} collection.`,
    `Primary color and finish: ${product.color}.`,
    product.design,
    countRule,
    shapeRule,
    "PRODUCT-ONLY FRONT MASTER: center the complete product in a straight-on or best canonical catalog front view on a seamless warm-white studio background. Keep every sleeve, hem, toe, handle, strap and edge fully visible with 10 to 12 percent breathing room on all sides. Use restrained neutral studio lighting, crisp true material texture, subtle natural contact shadow, accurate premium construction and disciplined high-fashion catalog spacing.",
    "The supplied Zara image is a photography-reference only for clean background, neutral lighting, breathing room, scale and disciplined product presentation. Do not copy its garment design, labels, branding or exact details. The new product must follow the original product specification above.",
    "ABSOLUTE EXCLUSIONS: no person, no model, no face, no skin, no hands, no feet, no body parts, no hanger, no visible or invisible mannequin, no dress form, no stand, no props, no extra products, no collage, no split screen, no text, no letters, no price, no labels, no logos, no watermark, no border, no dramatic color cast, no neon color, no malformed construction, no cropped edges.",
    "Output only the single finished 4:5 catalog photograph.",
  ].join(" ");
}

async function prepareReferenceImages() {
  mkdirSync(REFERENCE_DIR, { recursive: true });
  const prepared = {};
  for (const [gender, source] of Object.entries(SOURCE_REFERENCES)) {
    if (!existsSync(source)) throw new Error(`Missing reference: ${source}`);
    const destination = path.join(REFERENCE_DIR, `${gender}-product-style.webp`);
    if (!existsSync(destination)) {
      await sharp(source)
        .resize({ width: 480, height: 720, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 72 })
        .toFile(destination);
    }
    prepared[gender] = destination;
  }
  return prepared;
}

function requestFor(product, referencePath) {
  return {
    contents: [
      {
        role: "user",
        parts: [
          { text: buildPrompt(product) },
          { text: "PHOTOGRAPHY STYLE REFERENCE ONLY — do not copy the pictured product:" },
          {
            inlineData: {
              mimeType: "image/webp",
              data: readFileSync(referencePath).toString("base64"),
            },
          },
        ],
      },
    ],
    metadata: {
      slug: product.slug,
      gender: product.gender,
      type: product.type,
      view: "product-front",
    },
    config: {
      responseModalities: ["IMAGE"],
      temperature: 0.25,
      topP: 0.8,
      imageConfig: {
        aspectRatio: "4:5",
        imageSize: "2K",
      },
    },
  };
}

function extractImage(response) {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini returned no image.");
  }
  return Buffer.from(imagePart.inlineData.data, "base64");
}

async function createManifest() {
  validateProducts();
  const references = await prepareReferenceImages();
  const requests = SHOP_PRODUCTS.map((product) => ({
    product,
    prompt: buildPrompt(product),
    request: requestFor(product, references[product.gender]),
  }));
  const requestBytes = Buffer.byteLength(
    JSON.stringify(requests.map((item) => item.request)),
  );
  if (requestBytes >= MAX_INLINE_BYTES) {
    throw new Error(`Inline batch is ${requestBytes} bytes, above the safety limit.`);
  }
  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(
    MANIFEST_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        model: MODEL,
        phase: "isolated-product-masters",
        requestCount: requests.length,
        aspectRatio: "4:5",
        resolution: "2K",
        estimatedBatchOutputCostUsd: 1.34,
        fullPlannedImageCount: 182,
        estimatedFullBatchOutputCostUsd: 12.19,
        estimatedInlineBytes: requestBytes,
        products: requests.map(({ product, prompt }) => ({ ...product, prompt })),
      },
      null,
      2,
    )}\n`,
  );
  return { requests, requestBytes };
}

async function submit() {
  if (existsSync(JOB_PATH)) {
    const existing = JSON.parse(readFileSync(JOB_PATH, "utf8"));
    throw new Error(
      `A masters batch already exists (${existing.name || "unknown"}); refusing duplicate spend.`,
    );
  }
  const { requests, requestBytes } = await createManifest();
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const batch = await ai.batches.create({
    model: MODEL,
    src: requests.map((item) => item.request),
    config: {
      displayName: `global-shop-v4-masters-${new Date().toISOString().slice(0, 10)}`,
    },
  });
  const job = {
    submittedAt: new Date().toISOString(),
    name: batch.name,
    displayName: batch.displayName,
    model: batch.model || MODEL,
    state: batch.state,
    createTime: batch.createTime,
    updateTime: batch.updateTime,
    requestCount: SHOP_PRODUCTS.length,
    estimatedInlineBytes: requestBytes,
    estimatedBatchOutputCostUsd: 1.34,
    slugs: SHOP_PRODUCTS.map((product) => product.slug),
  };
  writeFileSync(JOB_PATH, `${JSON.stringify(job, null, 2)}\n`);
  console.log(JSON.stringify(job, null, 2));
}

async function poll() {
  if (!existsSync(JOB_PATH)) throw new Error("No masters batch has been submitted.");
  const job = JSON.parse(readFileSync(JOB_PATH, "utf8"));
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const batch = await ai.batches.get({ name: job.name });
  const inlinedResponses = batch.dest?.inlinedResponses || [];
  const saved = [];
  const failures = [];
  if (batch.state === "JOB_STATE_SUCCEEDED") {
    if (inlinedResponses.length !== SHOP_PRODUCTS.length) {
      throw new Error(
        `Batch returned ${inlinedResponses.length}/${SHOP_PRODUCTS.length} responses.`,
      );
    }
    for (const [index, item] of inlinedResponses.entries()) {
      const product = SHOP_PRODUCTS[index];
      if (item.error) {
        failures.push({ slug: product.slug, error: item.error });
        continue;
      }
      const directory = path.join(PUBLIC_DIR, product.gender, product.slug);
      const destination = path.join(directory, "01-product-front.png");
      mkdirSync(directory, { recursive: true });
      if (!existsSync(destination)) {
        await sharp(extractImage(item.response)).png().toFile(destination);
      }
      const metadata = await sharp(destination).metadata();
      saved.push({
        slug: product.slug,
        path: path.relative(ROOT, destination),
        width: metadata.width,
        height: metadata.height,
      });
    }
  }
  const status = {
    checkedAt: new Date().toISOString(),
    name: batch.name,
    state: batch.state,
    error: batch.error || null,
    responseCount: inlinedResponses.length,
    savedCount: saved.length,
    failures,
    saved,
  };
  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
  console.log(JSON.stringify(status, null, 2));
}

async function main() {
  if (MODE === "prepare") {
    const { requestBytes } = await createManifest();
    console.log(
      JSON.stringify(
        {
          prepared: SHOP_PRODUCTS.length,
          model: MODEL,
          requestBytes,
          manifest: path.relative(ROOT, MANIFEST_PATH),
          estimatedBatchOutputCostUsd: 1.34,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (MODE === "submit-masters") return submit();
  if (MODE === "poll-masters") return poll();
  throw new Error(`Unknown mode: ${MODE}`);
}

await main();

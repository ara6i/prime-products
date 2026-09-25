import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { SHOP_PRODUCTS } from "./nano-banana-products.mjs";

const ROOT = process.cwd();
const RUN_DIR = path.join(
  ROOT,
  "output/reports/global-shop-nano-banana-v4-20260923/master-repair-02",
);
const PUBLIC_DIR = path.join(ROOT, "public/media/global-shop/showcase-v4");
const JOB_PATH = path.join(RUN_DIR, "job.json");
const STATUS_PATH = path.join(RUN_DIR, "status.json");
const MODEL = process.env.GLOBAL_SHOP_GEMINI_MODEL || "gemini-3-pro-image";
const BACKEND_ENV_PATH = path.resolve(ROOT, "../primeStyleAI-backend/.env");
const MODE = process.argv[2] || "prepare";

const REPAIRS = [
  {
    slug: "women-stone-woven-mini-tote",
    correction:
      "The bag must have exactly two short rounded top handles, both visibly and physically connected to the bag body. It has no shoulder strap and no crossbody strap. No detached or floating strap, handle, shadow fragment, reflection or ghost shape anywhere in the background.",
  },
  {
    slug: "men-warm-grey-soft-weekender",
    correction:
      "The weekender must have exactly two leather carry handles, both visibly and physically connected to the bag hardware. It has no shoulder strap and no crossbody strap. No detached or floating strap, handle, shadow fragment, reflection or ghost shape anywhere in the background.",
  },
].map((repair) => {
  const product = SHOP_PRODUCTS.find((candidate) => candidate.slug === repair.slug);
  if (!product) throw new Error(`Missing repair product ${repair.slug}`);
  return { ...repair, product };
});

function parseEnvFile(raw) {
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [key, value];
      }),
  );
}

function getApiKey() {
  const direct =
    process.env.SIZING_LAB_GEMINI_API_KEY ||
    process.env.TEST_LAB_GOOGLE_API_KEY ||
    process.env.TEST_LAB_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (direct) return direct;
  if (!existsSync(BACKEND_ENV_PATH)) throw new Error("Gemini environment file is unavailable.");
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

function masterPath(product) {
  return path.join(
    PUBLIC_DIR,
    product.gender,
    product.slug,
    "01-product-front.png",
  );
}

async function prepareReferences() {
  mkdirSync(path.join(RUN_DIR, "references"), { recursive: true });
  for (const repair of REPAIRS) {
    const source = path.join(
      ROOT,
      repair.product.gender === "women"
        ? "references/zara-pdp-photography/women-camel-striped-blazer/08-product-front.jpg"
        : "references/zara-pdp-photography/men-sand-suit-blazer/09-product-front.jpg",
    );
    if (!existsSync(source)) throw new Error(`Missing photography reference: ${source}`);
    const destination = path.join(RUN_DIR, "references", `${repair.product.gender}-style.webp`);
    if (!existsSync(destination)) {
      await sharp(source)
        .resize({ width: 480, height: 720, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 72 })
        .toFile(destination);
    }
    repair.referencePath = destination;
  }
}

function buildPrompt(repair) {
  return [
    `Create a new original photorealistic ecommerce master for ${repair.product.name}.`,
    `Primary color and finish: ${repair.product.color}. ${repair.product.design}`,
    repair.correction,
    "Show one physically plausible real retail product in a straight-on catalog view on a seamless warm-white background. Center the complete product with generous breathing room, restrained neutral light and a minimal natural contact shadow.",
    "The supplied image is a photography-style reference only for neutral lighting and disciplined spacing. Do not copy its garment or branding.",
    "No person, body part, mannequin, prop, text, label, logo, watermark, duplicate product, collage, border, or cropped edge.",
    "Return only one corrected 4:5 product photograph.",
  ].join(" ");
}

function requestFor(repair) {
  return {
    contents: [
      {
        role: "user",
        parts: [
          { text: buildPrompt(repair) },
          { text: "PHOTOGRAPHY STYLE REFERENCE ONLY:" },
          {
            inlineData: {
              mimeType: "image/webp",
              data: readFileSync(repair.referencePath).toString("base64"),
            },
          },
        ],
      },
    ],
    metadata: { slug: repair.slug, phase: "master-repair-02" },
    config: {
      responseModalities: ["IMAGE"],
      temperature: 0.1,
      topP: 0.7,
      imageConfig: { aspectRatio: "4:5", imageSize: "2K" },
    },
  };
}

function extractImage(response) {
  const image = response?.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data,
  );
  if (!image?.inlineData?.data) throw new Error("Gemini returned no repair image.");
  return Buffer.from(image.inlineData.data, "base64");
}

async function prepare() {
  await prepareReferences();
  mkdirSync(RUN_DIR, { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    requestCount: REPAIRS.length,
    estimatedBatchOutputCostUsd: 0.134,
    repairs: REPAIRS.map((repair) => ({
      slug: repair.slug,
      correction: repair.correction,
      prompt: buildPrompt(repair),
    })),
  };
  writeFileSync(
    path.join(RUN_DIR, "request-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return REPAIRS.map(requestFor);
}

async function submit() {
  if (existsSync(JOB_PATH)) {
    const existing = JSON.parse(readFileSync(JOB_PATH, "utf8"));
    throw new Error(`Repair job ${existing.name || "unknown"} already exists; refusing duplicate spend.`);
  }
  const requests = await prepare();
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const batch = await ai.batches.create({
    model: MODEL,
    src: requests,
    config: { displayName: "global-shop-v4-master-repair-02" },
  });
  const job = {
    submittedAt: new Date().toISOString(),
    name: batch.name,
    displayName: batch.displayName,
    model: batch.model || MODEL,
    state: batch.state,
    requestCount: REPAIRS.length,
    estimatedBatchOutputCostUsd: 0.134,
    slugs: REPAIRS.map((repair) => repair.slug),
  };
  writeFileSync(JOB_PATH, `${JSON.stringify(job, null, 2)}\n`);
  console.log(JSON.stringify(job, null, 2));
}

async function poll() {
  if (!existsSync(JOB_PATH)) throw new Error("No repair batch has been submitted.");
  const job = JSON.parse(readFileSync(JOB_PATH, "utf8"));
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const batch = await ai.batches.get({ name: job.name });
  const responses = batch.dest?.inlinedResponses || [];
  const saved = [];
  if (batch.state === "JOB_STATE_SUCCEEDED") {
    if (responses.length !== REPAIRS.length) {
      throw new Error(`Repair batch returned ${responses.length}/${REPAIRS.length}.`);
    }
    mkdirSync(path.join(RUN_DIR, "candidates"), { recursive: true });
    for (const [index, item] of responses.entries()) {
      if (item.error) throw new Error(JSON.stringify(item.error));
      const destination = path.join(RUN_DIR, "candidates", `${REPAIRS[index].slug}.png`);
      if (!existsSync(destination)) {
        await sharp(extractImage(item.response)).png().toFile(destination);
      }
      saved.push(path.relative(ROOT, destination));
    }
  }
  const status = {
    checkedAt: new Date().toISOString(),
    state: batch.state,
    error: batch.error || null,
    responseCount: responses.length,
    saved,
  };
  writeFileSync(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
  console.log(JSON.stringify(status, null, 2));
}

function promote() {
  const promoted = [];
  const rejectedDir = path.join(RUN_DIR, "rejected-originals");
  mkdirSync(rejectedDir, { recursive: true });
  for (const repair of REPAIRS) {
    const candidate = path.join(RUN_DIR, "candidates", `${repair.slug}.png`);
    if (!existsSync(candidate)) throw new Error(`Missing approved candidate ${candidate}`);
    const target = masterPath(repair.product);
    const rejected = path.join(rejectedDir, `${repair.slug}.png`);
    if (!existsSync(rejected)) copyFileSync(target, rejected);
    copyFileSync(candidate, target);
    promoted.push(path.relative(ROOT, target));
  }
  console.log(JSON.stringify({ promoted }, null, 2));
}

if (MODE === "prepare") {
  await prepare();
  console.log(JSON.stringify({ prepared: REPAIRS.length }, null, 2));
} else if (MODE === "submit") {
  await submit();
} else if (MODE === "poll") {
  await poll();
} else if (MODE === "promote") {
  promote();
} else {
  throw new Error(`Unknown mode: ${MODE}`);
}

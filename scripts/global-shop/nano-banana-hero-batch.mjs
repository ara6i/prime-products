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
  "output/reports/global-shop-nano-banana-v4-20260923/heroes",
);
const REFERENCE_DIR = path.join(RUN_DIR, "references");
const CANDIDATE_DIR = path.join(RUN_DIR, "candidates");
const PUBLIC_DIR = path.join(ROOT, "public/media/global-shop/showcase-v4/hero");
const JOB_PATH = path.join(RUN_DIR, "job.json");
const STATUS_PATH = path.join(RUN_DIR, "status.json");
const MODEL = process.env.GLOBAL_SHOP_GEMINI_MODEL || "gemini-3-pro-image";
const BACKEND_ENV_PATH = path.resolve(ROOT, "../primeStyleAI-backend/.env");
const MODE = process.argv[2] || "prepare";

const HERO_PRODUCT_SLUGS = [
  "women-camel-pinstripe-tailored-blazer",
  "women-dusty-blue-silk-poplin-shirt",
  "women-stone-woven-mini-tote",
  "men-espresso-double-breasted-blazer",
  "men-charcoal-pleated-trouser",
  "men-oxblood-penny-loafer",
];

const HEROES = [
  {
    id: "desktop",
    filename: "collection-desktop.png",
    aspectRatio: "16:9",
    composition:
      "Create a wide desktop composition. Keep the entire left 34 percent quiet warm-white negative space for page copy. Arrange the six complete products across the right 66 percent in a clean, architectural editorial rhythm, using subtle depth and shadows without hiding or cropping any product. The outermost products must stay comfortably inside the frame so a responsive cover never cuts a sleeve, hem, handle, toe or edge.",
  },
  {
    id: "mobile",
    filename: "collection-mobile.png",
    aspectRatio: "4:5",
    composition:
      "Create a portrait mobile composition designed independently, not a crop of the desktop image. Keep the upper 28 percent quiet warm-white negative space for page copy. Arrange the six complete products in a balanced two-level editorial composition below, with comfortable side margins and no product touching the frame.",
  },
];

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

function heroProducts() {
  return HERO_PRODUCT_SLUGS.map((slug) => {
    const product = SHOP_PRODUCTS.find((candidate) => candidate.slug === slug);
    if (!product) throw new Error(`Missing hero product ${slug}`);
    return product;
  });
}

function buildPrompt(hero, products) {
  return [
    "Create an original garment-only luxury-fashion ecommerce landing banner using the exact six products supplied as references.",
    `Products: ${products.map((product) => product.name).join(", ")}.`,
    hero.composition,
    "Preserve each product's exact color, silhouette, material, proportions, pattern and hardware. Use a calm warm-white and pale-stone studio environment, restrained neutral lighting, disciplined European editorial spacing and soft physically plausible shadows. The overall palette should feel sophisticated and wearable: camel, dusty blue, stone, espresso, charcoal and oxblood.",
    "Show products only. No people, models, faces, skin, hands, feet, body parts, mannequins, dress forms, hangers, racks, text, letters, logos, labels, watermark, collage borders, retail props, neon colors, duplicate products, invented products, floating fragments or malformed construction.",
    "Every product must remain recognizable, complete and uncropped. Return only one finished photorealistic banner.",
  ].join(" ");
}

async function prepare() {
  mkdirSync(REFERENCE_DIR, { recursive: true });
  const products = heroProducts();
  const references = [];
  for (const product of products) {
    const source = path.join(
      ROOT,
      "public/media/global-shop/showcase-v4",
      product.gender,
      product.slug,
      "01-product-front.png",
    );
    if (!existsSync(source)) throw new Error(`Missing approved hero reference: ${source}`);
    const destination = path.join(REFERENCE_DIR, `${product.slug}.webp`);
    await sharp(source)
      .resize({ width: 640, height: 800, fit: "contain", background: "#f7f6f3" })
      .webp({ quality: 84 })
      .toFile(destination);
    references.push(destination);
  }
  const requests = HEROES.map((hero) => ({
    contents: [
      {
        role: "user",
        parts: [
          { text: buildPrompt(hero, products) },
          ...references.flatMap((reference, index) => [
            { text: `AUTHORITATIVE PRODUCT REFERENCE ${index + 1} OF ${references.length}:` },
            {
              inlineData: {
                mimeType: "image/webp",
                data: readFileSync(reference).toString("base64"),
              },
            },
          ]),
        ],
      },
    ],
    metadata: { hero: hero.id },
    config: {
      responseModalities: ["IMAGE"],
      temperature: 0.25,
      topP: 0.78,
      imageConfig: { aspectRatio: hero.aspectRatio, imageSize: "2K" },
    },
  }));
  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(
    path.join(RUN_DIR, "request-manifest.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        model: MODEL,
        requestCount: requests.length,
        estimatedBatchOutputCostUsd: 0.134,
        heroes: HEROES.map((hero) => ({ ...hero, prompt: buildPrompt(hero, products) })),
      },
      null,
      2,
    )}\n`,
  );
  return requests;
}

async function submit() {
  if (existsSync(JOB_PATH)) {
    const existing = JSON.parse(readFileSync(JOB_PATH, "utf8"));
    throw new Error(`Hero batch ${existing.name || "unknown"} already exists; refusing duplicate spend.`);
  }
  const requests = await prepare();
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const batch = await ai.batches.create({
    model: MODEL,
    src: requests,
    config: { displayName: "global-shop-v4-heroes" },
  });
  const job = {
    submittedAt: new Date().toISOString(),
    name: batch.name,
    displayName: batch.displayName,
    model: batch.model || MODEL,
    state: batch.state,
    requestCount: HEROES.length,
    estimatedBatchOutputCostUsd: 0.134,
  };
  writeFileSync(JOB_PATH, `${JSON.stringify(job, null, 2)}\n`);
  console.log(JSON.stringify(job, null, 2));
}

function extractImage(response) {
  const image = response?.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
  if (!image?.inlineData?.data) throw new Error("Gemini returned no hero image.");
  return Buffer.from(image.inlineData.data, "base64");
}

async function poll() {
  if (!existsSync(JOB_PATH)) throw new Error("No hero batch has been submitted.");
  const job = JSON.parse(readFileSync(JOB_PATH, "utf8"));
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const batch = await ai.batches.get({ name: job.name });
  const responses = batch.dest?.inlinedResponses || [];
  const saved = [];
  if (batch.state === "JOB_STATE_SUCCEEDED") {
    if (responses.length !== HEROES.length) throw new Error(`Hero batch returned ${responses.length}/${HEROES.length}.`);
    mkdirSync(CANDIDATE_DIR, { recursive: true });
    for (const [index, item] of responses.entries()) {
      if (item.error) throw new Error(JSON.stringify(item.error));
      const destination = path.join(CANDIDATE_DIR, HEROES[index].filename);
      if (!existsSync(destination)) await sharp(extractImage(item.response)).png().toFile(destination);
      const metadata = await sharp(destination).metadata();
      saved.push({ path: path.relative(ROOT, destination), width: metadata.width, height: metadata.height });
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
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const promoted = [];
  for (const hero of HEROES) {
    const source = path.join(CANDIDATE_DIR, hero.filename);
    if (!existsSync(source)) throw new Error(`Missing approved hero: ${source}`);
    const destination = path.join(PUBLIC_DIR, hero.filename);
    copyFileSync(source, destination);
    promoted.push(path.relative(ROOT, destination));
  }
  console.log(JSON.stringify({ promoted }, null, 2));
}

if (MODE === "prepare") {
  const requests = await prepare();
  console.log(JSON.stringify({ prepared: requests.length, estimatedBatchOutputCostUsd: 0.134 }, null, 2));
} else if (MODE === "submit") {
  await submit();
} else if (MODE === "poll") {
  await poll();
} else if (MODE === "promote") {
  promote();
} else {
  throw new Error(`Unknown mode: ${MODE}`);
}

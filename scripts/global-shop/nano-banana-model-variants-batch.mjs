import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { SHOP_PRODUCTS, validateProducts } from "./nano-banana-products.mjs";

const ROOT = process.cwd();
const RUN_DIR = path.join(
  ROOT,
  "output/reports/global-shop-nano-banana-v4-20260923/model-variants",
);
const PUBLIC_DIR = path.join(ROOT, "public/media/global-shop/showcase-v4");
const REFERENCE_DIR = path.join(RUN_DIR, "references");
const CANDIDATE_DIR = path.join(RUN_DIR, "candidates");
const JOBS_PATH = path.join(RUN_DIR, "jobs.json");
const STATUS_PATH = path.join(RUN_DIR, "status.json");
const MANIFEST_PATH = path.join(RUN_DIR, "request-manifest.json");
const MODEL = process.env.GLOBAL_SHOP_GEMINI_MODEL || "gemini-3-pro-image";
const BACKEND_ENV_PATH = path.resolve(ROOT, "../primeStyleAI-backend/.env");
const MAX_INLINE_BYTES = 17 * 1024 * 1024;
const MODE = process.argv[2] || "prepare";

const VIEWS = [
  {
    id: "model-three-quarter",
    filename: "04-model-three-quarter.png",
    instruction:
      "Create a front three-quarter model view with a calm direct gaze and subtle asymmetry in the stance. Keep the complete product clearly readable and use a different pose from the lead.",
  },
  {
    id: "model-back",
    filename: "05-model-back.png",
    instruction:
      "Create a rear or rear-three-quarter model view that clearly reveals how the exact product looks from behind while retaining a natural editorial posture.",
  },
  {
    id: "model-movement",
    filename: "06-model-movement.png",
    instruction:
      "Create a full or nearly full editorial movement view: a controlled step, turn, or natural fabric motion. Keep anatomy realistic and the product unobstructed rather than theatrical.",
  },
  {
    id: "model-crop",
    filename: "07-model-crop.png",
    instruction:
      "Create a closer garment-focused or product-focused model crop that shows construction, material and fit on the body while preserving enough context to read the item immediately.",
  },
  {
    id: "model-alternate",
    filename: "09-model-alternate.png",
    instruction:
      "Create a distinct alternate full editorial pose with clean modern energy and a different camera height or body angle from the lead, still prioritizing the exact product.",
  },
];

const STYLE_REFERENCES = {
  women: {
    "model-three-quarter": "references/zara-pdp-photography/women-camel-striped-blazer/02-model-front.jpg",
    "model-back": "references/zara-pdp-photography/women-camel-striped-blazer/03-model-back.jpg",
    "model-movement": "references/zara-pdp-photography/women-camel-striped-blazer/06-model-styled-full.jpg",
    "model-crop": "references/zara-pdp-photography/women-camel-striped-blazer/04-model-front-close.jpg",
    "model-alternate": "references/zara-pdp-photography/women-camel-striped-blazer/05-model-styled-angle.jpg",
  },
  men: {
    "model-three-quarter": "references/zara-pdp-photography/men-sand-suit-blazer/02-model-front.jpg",
    "model-back": "references/zara-pdp-photography/men-sand-suit-blazer/04-model-back.jpg",
    "model-movement": "references/zara-pdp-photography/men-sand-suit-blazer/03-model-full-alternate.jpg",
    "model-crop": "references/zara-pdp-photography/men-sand-suit-blazer/06-model-mid-front.jpg",
    "model-alternate": "references/zara-pdp-photography/men-sand-suit-blazer/08-model-chest-close.jpg",
  },
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

function publicProductPath(product, filename) {
  return path.join(PUBLIC_DIR, product.gender, product.slug, filename);
}

function usageInstruction(product, view) {
  if (product.type === "top") {
    return view.id === "model-back"
      ? "The exact top must be visible from shoulders through its complete back hem and both sleeves, with rear seams and proportions matching the supplied rear product reference."
      : "The exact top is the hero piece, fully visible from collar and shoulders through both sleeves and hem. Pair it only with one simple tonal neutral bottom.";
  }
  if (product.type === "bottom") {
    return view.id === "model-back"
      ? "The exact bottom must be visible from its rear waistband through both complete hems, with the rear fit and construction matching the supplied rear product reference."
      : "The exact bottom is the hero piece, visible from waistband through complete hem or hems. Pair it only with one simple tucked ivory, stone or muted-grey top.";
  }
  if (product.type === "shoe") {
    return view.id === "model-crop"
      ? "Frame from below the knee to the ground so the exact matching pair of shoes is large, sharp and fully visible on both feet in a natural stance."
      : "Use a full-length or nearly full-length model composition with the exact matching pair of shoes clearly visible and unobstructed on both feet; all clothing is quiet and neutral.";
  }
  if (product.type === "bag") {
    return "The model carries the exact bag naturally by its real handles or strap construction. Keep its complete silhouette, attachments and hardware unobstructed and prominent; never invent an additional handle or strap.";
  }
  if (product.slug.includes("hoop")) {
    return "Both exact earrings must remain visible and match the authoritative reference. Use a polished head-and-upper-torso editorial portrait, turning the head only enough to reveal the pair.";
  }
  if (product.slug.includes("scarf")) {
    return "The exact scarf remains the hero, worn naturally at the neck or over the shoulders while preserving its burgundy color, ivory-taupe linework and rolled edges.";
  }
  if (product.slug.includes("sunglasses")) {
    return "The exact sunglasses remain clearly visible on the face, preserving the rectangular frame, tobacco tortoiseshell pattern and smoke lenses in a refined upper-body portrait.";
  }
  return "The exact watch remains clearly visible on the wrist, preserving the round brushed-silver case, ivory dial without text and burgundy leather strap in a natural upper-body composition.";
}

function buildPrompt(product, view) {
  return [
    `Create another photograph in the same PDP series for the exact ${product.name}.`,
    "The first supplied image is the authoritative product front, the second is its authoritative product rear or alternate, and the third is the authoritative lead model image. Preserve both the exact product identity and the exact adult model identity across the series.",
    `Product color and construction: ${product.color}. ${product.design}`,
    usageInstruction(product, view),
    view.instruction,
    "The fourth supplied image is photography-language reference only. Use disciplined modern European high-fashion ecommerce framing, restrained editorial confidence, neutral color grading, natural skin and fabric texture, uncluttered composition and believable contemporary styling. Do not copy its model, garment, setting, pose, or branding.",
    "Use realistic adult anatomy, hands and feet. Preserve the product's exact color, proportions, silhouette, pattern, material, weave, seams, hardware, sole, straps and construction. Do not redesign, recolor, lengthen, shorten, slim, widen, add or remove product details.",
    "Keep supporting clothes restrained in ivory, stone, taupe, camel or muted grey. Avoid black/navy dominance, neon color, multiple competing bright colors, extreme baggy clothing and overly skinny styling.",
    "No text, logo, label, watermark, collage, duplicate product, extra limbs, extra fingers, fused anatomy, detached accessory, floating handle, malformed garment, cropped hero product, or artificial plastic skin.",
    "Return only one finished 4:5 photorealistic editorial PDP photograph.",
  ].join(" ");
}

async function resizeReference(source, destination, width, height, quality) {
  if (!existsSync(source)) throw new Error(`Missing approved reference: ${source}`);
  await sharp(source)
    .resize({ width, height, fit: "contain", background: "#f7f6f3" })
    .webp({ quality })
    .toFile(destination);
}

async function prepareReferences() {
  mkdirSync(REFERENCE_DIR, { recursive: true });
  const products = {};
  for (const product of SHOP_PRODUCTS) {
    const directory = path.join(REFERENCE_DIR, product.slug);
    mkdirSync(directory, { recursive: true });
    const front = path.join(directory, "front.webp");
    const back = path.join(directory, "back.webp");
    const model = path.join(directory, "model.webp");
    await resizeReference(publicProductPath(product, "01-product-front.png"), front, 720, 900, 84);
    await resizeReference(publicProductPath(product, "02-product-back.png"), back, 720, 900, 84);
    await resizeReference(publicProductPath(product, "03-model-front.png"), model, 720, 900, 84);
    products[product.slug] = { front, back, model };
  }
  const styles = {};
  for (const [gender, viewRefs] of Object.entries(STYLE_REFERENCES)) {
    styles[gender] = {};
    for (const [viewId, relativePath] of Object.entries(viewRefs)) {
      const destination = path.join(REFERENCE_DIR, `${gender}-${viewId}-style.webp`);
      await resizeReference(path.join(ROOT, relativePath), destination, 360, 540, 68);
      styles[gender][viewId] = destination;
    }
  }
  return { products, styles };
}

function requestFor(item) {
  const productRefs = item.references;
  return {
    contents: [
      {
        role: "user",
        parts: [
          { text: item.prompt },
          { text: "AUTHORITATIVE PRODUCT FRONT:" },
          { inlineData: { mimeType: "image/webp", data: readFileSync(productRefs.front).toString("base64") } },
          { text: "AUTHORITATIVE PRODUCT REAR OR ALTERNATE:" },
          { inlineData: { mimeType: "image/webp", data: readFileSync(productRefs.back).toString("base64") } },
          { text: "AUTHORITATIVE MODEL IDENTITY AND PDP LEAD:" },
          { inlineData: { mimeType: "image/webp", data: readFileSync(productRefs.model).toString("base64") } },
          { text: "PHOTOGRAPHY LANGUAGE REFERENCE ONLY:" },
          { inlineData: { mimeType: "image/webp", data: readFileSync(item.styleReference).toString("base64") } },
        ],
      },
    ],
    metadata: {
      slug: item.product.slug,
      gender: item.product.gender,
      type: item.product.type,
      view: item.view.id,
    },
    config: {
      responseModalities: ["IMAGE"],
      temperature: 0.25,
      topP: 0.78,
      imageConfig: { aspectRatio: "4:5", imageSize: "2K" },
    },
  };
}

async function prepare() {
  validateProducts();
  const refs = await prepareReferences();
  const items = SHOP_PRODUCTS.flatMap((product) =>
    VIEWS.map((view) => ({
      product,
      view,
      prompt: buildPrompt(product, view),
      references: refs.products[product.slug],
      styleReference: refs.styles[product.gender][view.id],
    })),
  ).map((item) => ({ ...item, request: requestFor(item) }));
  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(
    MANIFEST_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        model: MODEL,
        phase: "model-pdp-variants",
        requestCount: items.length,
        estimatedBatchOutputCostUsd: Number((items.length * 0.067).toFixed(3)),
        requests: items.map((item) => ({
          slug: item.product.slug,
          view: item.view.id,
          filename: item.view.filename,
          prompt: item.prompt,
        })),
      },
      null,
      2,
    )}\n`,
  );
  return items;
}

function chunkItems(items) {
  const chunks = [];
  let current = [];
  let bytes = 2;
  for (const item of items) {
    const itemBytes = Buffer.byteLength(JSON.stringify(item.request)) + 1;
    if (itemBytes >= MAX_INLINE_BYTES) throw new Error(`${item.product.slug}/${item.view.id} is too large.`);
    if (current.length && bytes + itemBytes >= MAX_INLINE_BYTES) {
      chunks.push(current);
      current = [];
      bytes = 2;
    }
    current.push(item);
    bytes += itemBytes;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

async function submit() {
  if (existsSync(JOBS_PATH)) {
    const existing = JSON.parse(readFileSync(JOBS_PATH, "utf8"));
    throw new Error(`Variant jobs already exist (${existing.jobs?.length || 0}); refusing duplicate spend.`);
  }
  const items = await prepare();
  const chunks = chunkItems(items);
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const jobs = [];
  for (const [index, chunk] of chunks.entries()) {
    const batch = await ai.batches.create({
      model: MODEL,
      src: chunk.map((item) => item.request),
      config: { displayName: `global-shop-v4-model-variants-${String(index + 1).padStart(2, "0")}` },
    });
    jobs.push({
      name: batch.name,
      displayName: batch.displayName,
      model: batch.model || MODEL,
      state: batch.state,
      submittedAt: new Date().toISOString(),
      requests: chunk.map((item) => ({
        slug: item.product.slug,
        view: item.view.id,
        filename: item.view.filename,
      })),
    });
  }
  writeFileSync(JOBS_PATH, `${JSON.stringify({ jobs }, null, 2)}\n`);
  console.log(JSON.stringify({ submittedJobs: jobs.length, requestCount: items.length, estimatedBatchOutputCostUsd: 6.7, jobs }, null, 2));
}

function extractImage(response) {
  const image = response?.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
  if (!image?.inlineData?.data) throw new Error("Gemini returned no image.");
  return Buffer.from(image.inlineData.data, "base64");
}

async function poll() {
  if (!existsSync(JOBS_PATH)) throw new Error("No model variant batches have been submitted.");
  const manifest = JSON.parse(readFileSync(JOBS_PATH, "utf8"));
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const statuses = [];
  for (const job of manifest.jobs) {
    const batch = await ai.batches.get({ name: job.name });
    const responses = batch.dest?.inlinedResponses || [];
    const failures = [];
    const saved = [];
    if (batch.state === "JOB_STATE_SUCCEEDED") {
      if (responses.length !== job.requests.length) throw new Error(`${job.name} returned ${responses.length}/${job.requests.length}.`);
      for (const [index, item] of responses.entries()) {
        const request = job.requests[index];
        if (item.error) {
          failures.push({ ...request, error: item.error });
          continue;
        }
        const directory = path.join(CANDIDATE_DIR, request.slug);
        const destination = path.join(directory, request.filename);
        mkdirSync(directory, { recursive: true });
        if (!existsSync(destination)) await sharp(extractImage(item.response)).png().toFile(destination);
        saved.push(path.relative(ROOT, destination));
      }
    }
    statuses.push({
      name: batch.name,
      state: batch.state,
      error: batch.error || null,
      requestCount: job.requests.length,
      responseCount: responses.length,
      failures,
      saved,
    });
  }
  const status = {
    checkedAt: new Date().toISOString(),
    complete: statuses.every((item) => item.state === "JOB_STATE_SUCCEEDED"),
    savedCount: statuses.reduce((sum, item) => sum + item.saved.length, 0),
    statuses,
  };
  writeFileSync(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
  console.log(JSON.stringify(status, null, 2));
}

function promote() {
  const promoted = [];
  for (const product of SHOP_PRODUCTS) {
    for (const view of VIEWS) {
      const source = path.join(CANDIDATE_DIR, product.slug, view.filename);
      if (!existsSync(source)) throw new Error(`Missing approved candidate: ${source}`);
      const destination = publicProductPath(product, view.filename);
      renameSync(source, destination);
      promoted.push(path.relative(ROOT, destination));
    }
  }
  console.log(JSON.stringify({ promotedCount: promoted.length, promoted }, null, 2));
}

if (MODE === "prepare") {
  const items = await prepare();
  console.log(JSON.stringify({ prepared: items.length, estimatedBatchOutputCostUsd: 6.7, manifest: path.relative(ROOT, MANIFEST_PATH) }, null, 2));
} else if (MODE === "submit") {
  await submit();
} else if (MODE === "poll") {
  await poll();
} else if (MODE === "promote") {
  promote();
} else {
  throw new Error(`Unknown mode: ${MODE}`);
}

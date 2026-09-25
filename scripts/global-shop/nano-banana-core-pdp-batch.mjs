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
  "output/reports/global-shop-nano-banana-v4-20260923/core-pdp",
);
const PUBLIC_DIR = path.join(ROOT, "public/media/global-shop/showcase-v4");
const JOBS_PATH = path.join(RUN_DIR, "jobs.json");
const STATUS_PATH = path.join(RUN_DIR, "status.json");
const MANIFEST_PATH = path.join(RUN_DIR, "request-manifest.json");
const REFERENCE_DIR = path.join(RUN_DIR, "references");
const CANDIDATE_DIR = path.join(RUN_DIR, "candidates");
const MODEL = process.env.GLOBAL_SHOP_GEMINI_MODEL || "gemini-3-pro-image";
const BACKEND_ENV_PATH = path.resolve(ROOT, "../primeStyleAI-backend/.env");
const MAX_INLINE_BYTES = 17 * 1024 * 1024;
const MODE = process.argv[2] || "prepare";

const VIEWS = [
  { id: "product-back", filename: "02-product-back.png", kind: "product" },
  { id: "model-front", filename: "03-model-front.png", kind: "model" },
  { id: "detail", filename: "08-detail.png", kind: "detail" },
];

const STYLE_REFERENCES = {
  women: {
    product: "references/zara-pdp-photography/women-camel-striped-blazer/09-product-back.jpg",
    model: "references/zara-pdp-photography/women-camel-striped-blazer/01-model-full-front.jpg",
    detail: "references/zara-pdp-photography/women-camel-striped-blazer/07-model-detail.jpg",
  },
  men: {
    product: "references/zara-pdp-photography/men-sand-suit-blazer/09-product-front.jpg",
    model: "references/zara-pdp-photography/men-sand-suit-blazer/01-model-full-front.jpg",
    detail: "references/zara-pdp-photography/men-sand-suit-blazer/07-model-garment-detail.jpg",
  },
};

const MODEL_IDENTITIES = [
  "an adult woman with warm olive skin, a precise dark-brown collarbone bob, and composed angular features",
  "an adult woman with fair freckled skin, a soft copper chin-length bob, and understated natural makeup",
  "an adult Black woman with deep brown skin, close-cropped natural hair, and refined sculptural features",
  "an adult East Asian woman with a glossy black blunt bob and a calm editorial expression",
  "an adult Mediterranean woman with medium skin, dark shoulder-length curls, and strong brows",
  "an adult South Asian woman with warm brown skin and sleek dark hair tied low",
  "an adult Black woman with rich brown skin and long fine braids gathered neatly behind her shoulders",
  "an adult woman with pale skin, a clean platinum pixie cut, and minimal makeup",
  "an adult Middle Eastern woman with warm beige skin and short softly waved dark hair",
  "an adult Latina woman with medium tan skin and a smooth dark jaw-length bob",
  "an adult man with medium olive skin, short dark wavy hair, and clean-shaven refined features",
  "an adult Black man with deep brown skin, closely cropped hair, and a composed expression",
  "an adult East Asian man with fair skin and neat short black hair with a soft side part",
  "an adult man with fair freckled skin, short auburn hair, and clean understated grooming",
  "an adult South Asian man with warm brown skin, short textured black hair, and light stubble",
  "an adult Mediterranean man with olive skin, short dark curls, and a clean-shaven jaw",
  "an adult Black man with dark skin, a precise low fade, and minimal facial hair",
  "an adult man with pale skin, short sandy hair, and subtle natural freckles",
  "an adult Middle Eastern man with warm tan skin, cropped dark hair, and light neat stubble",
  "an adult Latino man with medium skin, short straight dark hair, and clean-shaven features",
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

function masterPath(product) {
  return path.join(
    PUBLIC_DIR,
    product.gender,
    product.slug,
    "01-product-front.png",
  );
}

function stylePrompt() {
  return [
    "Use the second supplied image only as a photography-language reference: disciplined modern European high-fashion ecommerce composition, restrained editorial confidence, neutral color grade, natural skin and fabric texture, uncluttered framing, and premium but believable styling.",
    "Do not copy its garment, model identity, pose, setting, branding, or exact composition.",
  ].join(" ");
}

function productBackPrompt(product) {
  const position = product.type === "shoe" ? "rear three-quarter product view" : "true rear product view";
  return [
    `Create the ${position} of the exact ${product.name} shown in the authoritative first reference.`,
    `It is ${product.color}. ${product.design}`,
    "Preserve the exact color, proportions, material, weave, seams, pattern, hardware, panel geometry, sole, straps, fastenings, and design identity. Infer only physically necessary rear construction.",
    "PRODUCT ONLY on a seamless warm-white studio background. Center the complete product with every edge fully visible and 10 to 12 percent breathing room. Match the master image scale, neutral lighting, shadow softness and color accuracy.",
    "No person, model, face, skin, body part, hanger, mannequin, stand, prop, detached strap, floating fragment, duplicate product, collage, text, label, logo, watermark, border, or cropped edge.",
    stylePrompt(),
    "Return only one finished 4:5 ecommerce product photograph.",
  ].join(" ");
}

function modelUsage(product) {
  if (product.type === "top") {
    return "The model wears the exact top as the unmistakable hero piece, fully visible from collar and shoulders through sleeves and hem. Style it with one simple tonal neutral bottom that does not cover the product.";
  }
  if (product.type === "bottom") {
    return "The model wears the exact bottom as the unmistakable hero piece, fully visible from waistband through both complete hems. Style it with one simple tucked ivory or stone top and restrained neutral footwear.";
  }
  if (product.type === "shoe") {
    return "The model wears the exact matching pair of shoes. Use a full-length standing composition with both shoes clearly visible and unobstructed, plus simple refined neutral garments that remain secondary.";
  }
  if (product.type === "bag") {
    return "The model carries the exact bag naturally in the hand or on the shoulder according to its construction. Keep the complete bag, handles, attachments, and silhouette unobstructed and visually prominent; clothing is quiet and neutral.";
  }
  return product.slug.includes("hoop")
    ? "The model wears the exact matching earrings. Frame from upper torso to head so both earrings are clearly visible, while maintaining a polished editorial portrait with a simple neutral top."
    : product.slug.includes("scarf")
      ? "The model wears the exact scarf loosely at the neck over a simple neutral outfit, preserving the original motif, edges and burgundy color with the whole scarf treatment readable."
      : product.slug.includes("sunglasses")
        ? "The model wears the exact sunglasses in a clean upper-body portrait; preserve the frame shape, tortoiseshell pattern and smoke lenses without hiding the product."
        : "The model wears the exact watch on a clearly visible wrist in a composed three-quarter upper-body pose; preserve the case, dial and burgundy strap while keeping the look natural.";
}

function modelFrontPrompt(product, identity) {
  return [
    `Create the primary model-worn PDP photograph for the exact ${product.name} shown in the authoritative first reference.`,
    `Model: ${identity}. The model is unquestionably an adult and appears only for this product's PDP series.`,
    modelUsage(product),
    "Preserve the product's exact color, proportions, silhouette, construction, material, seams, pattern, sole, straps, hardware and distinguishing details from the authoritative product reference. Do not redesign it, recolor it, add branding, or substitute another item.",
    "Use a confident natural straight-on or subtly three-quarter stance, refined contemporary styling, realistic anatomy and hands, and a clean pale neutral studio or minimal architectural setting. Favor clear product reading over theatrical art direction. The product must not be cropped.",
    stylePrompt(),
    "No text, labels, logos, watermark, collage, duplicate product, malformed anatomy, extra fingers, extra limbs, detached accessories, garish color grade, black or navy styling dominance, extreme baggy silhouette, or overly skinny styling.",
    "Return only one finished 4:5 photorealistic editorial PDP photograph.",
  ].join(" ");
}

function detailSubject(product) {
  if (product.type === "top" || product.type === "bottom") {
    return "Show a macro composition of the defining fabric texture plus one precise construction junction such as lapel, collar, waistband, pleat, seam, cuff, pocket or hem.";
  }
  if (product.type === "shoe") {
    return "Show a macro composition of the upper material, stitching, edge finish and sole or heel construction.";
  }
  if (product.type === "bag") {
    return "Show a macro composition of the main material, edge finishing, stitching and one real attachment or hardware junction.";
  }
  return "Show a macro composition of the exact material finish and the product's defining construction or hardware detail.";
}

function detailPrompt(product) {
  return [
    `Create a photorealistic material and construction close-up of the exact ${product.name} shown in the authoritative first reference.`,
    detailSubject(product),
    "Preserve the exact color, material, pattern, finish, stitch scale, edge treatment and hardware identity. The crop must still clearly belong to this product, not a generic material sample.",
    "Use soft directional studio light, true-to-life texture, shallow but controlled depth of field, and restrained luxury ecommerce art direction on a warm neutral background.",
    stylePrompt(),
    "No person, skin, hand, body part, model, text, label, logo, watermark, collage, split screen, unrelated object, malformed material, invented motif, or garish color cast.",
    "Return only one finished 4:5 macro PDP photograph.",
  ].join(" ");
}

function buildPrompt(product, view, identity) {
  if (view.id === "product-back") return productBackPrompt(product);
  if (view.id === "model-front") return modelFrontPrompt(product, identity);
  return detailPrompt(product);
}

async function prepareReferences() {
  mkdirSync(REFERENCE_DIR, { recursive: true });
  const masters = {};
  for (const product of SHOP_PRODUCTS) {
    const source = masterPath(product);
    if (!existsSync(source)) throw new Error(`Missing approved master: ${source}`);
    const destination = path.join(REFERENCE_DIR, `${product.slug}-master.webp`);
    await sharp(source)
      .resize({ width: 900, height: 1125, fit: "contain", background: "#f7f6f3" })
      .webp({ quality: 86 })
      .toFile(destination);
    masters[product.slug] = destination;
  }
  const styles = {};
  for (const [gender, refs] of Object.entries(STYLE_REFERENCES)) {
    styles[gender] = {};
    for (const [kind, relativePath] of Object.entries(refs)) {
      const source = path.join(ROOT, relativePath);
      if (!existsSync(source)) throw new Error(`Missing style reference: ${source}`);
      const destination = path.join(REFERENCE_DIR, `${gender}-${kind}-style.webp`);
      await sharp(source)
        .resize({ width: 420, height: 630, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 70 })
        .toFile(destination);
      styles[gender][kind] = destination;
    }
  }
  return { masters, styles };
}

function requestFor(item) {
  return {
    contents: [
      {
        role: "user",
        parts: [
          { text: item.prompt },
          { text: "AUTHORITATIVE PRODUCT IDENTITY REFERENCE:" },
          {
            inlineData: {
              mimeType: "image/webp",
              data: readFileSync(item.masterReference).toString("base64"),
            },
          },
          { text: "PHOTOGRAPHY LANGUAGE REFERENCE ONLY:" },
          {
            inlineData: {
              mimeType: "image/webp",
              data: readFileSync(item.styleReference).toString("base64"),
            },
          },
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
      temperature: item.view.kind === "model" ? 0.35 : 0.15,
      topP: item.view.kind === "model" ? 0.82 : 0.72,
      imageConfig: { aspectRatio: "4:5", imageSize: "2K" },
    },
  };
}

async function prepare() {
  validateProducts();
  const refs = await prepareReferences();
  const items = SHOP_PRODUCTS.flatMap((product, productIndex) =>
    VIEWS.map((view) => {
      const prompt = buildPrompt(product, view, MODEL_IDENTITIES[productIndex]);
      return {
        product,
        view,
        prompt,
        masterReference: refs.masters[product.slug],
        styleReference: refs.styles[product.gender][view.kind],
      };
    }),
  ).map((item) => ({ ...item, request: requestFor(item) }));
  mkdirSync(RUN_DIR, { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    phase: "core-pdp-views",
    requestCount: items.length,
    estimatedBatchOutputCostUsd: Number((items.length * 0.067).toFixed(3)),
    requests: items.map((item) => ({
      slug: item.product.slug,
      view: item.view.id,
      filename: item.view.filename,
      prompt: item.prompt,
    })),
  };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  return items;
}

function chunkItems(items) {
  const chunks = [];
  let current = [];
  let bytes = 2;
  for (const item of items) {
    const itemBytes = Buffer.byteLength(JSON.stringify(item.request)) + 1;
    if (itemBytes >= MAX_INLINE_BYTES) {
      throw new Error(`${item.product.slug}/${item.view.id} exceeds the inline safety limit.`);
    }
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
    throw new Error(`Core PDP jobs already exist (${existing.jobs?.length || 0}); refusing duplicate spend.`);
  }
  const items = await prepare();
  const chunks = chunkItems(items);
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const jobs = [];
  for (const [chunkIndex, chunk] of chunks.entries()) {
    const batch = await ai.batches.create({
      model: MODEL,
      src: chunk.map((item) => item.request),
      config: {
        displayName: `global-shop-v4-core-pdp-${String(chunkIndex + 1).padStart(2, "0")}`,
      },
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
  console.log(
    JSON.stringify(
      {
        submittedJobs: jobs.length,
        requestCount: items.length,
        estimatedBatchOutputCostUsd: Number((items.length * 0.067).toFixed(3)),
        jobs,
      },
      null,
      2,
    ),
  );
}

function extractImage(response) {
  const image = response?.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data,
  );
  if (!image?.inlineData?.data) throw new Error("Gemini returned no image.");
  return Buffer.from(image.inlineData.data, "base64");
}

async function poll() {
  if (!existsSync(JOBS_PATH)) throw new Error("No core PDP batches have been submitted.");
  const manifest = JSON.parse(readFileSync(JOBS_PATH, "utf8"));
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const statuses = [];
  for (const job of manifest.jobs) {
    const batch = await ai.batches.get({ name: job.name });
    const responses = batch.dest?.inlinedResponses || [];
    const failures = [];
    const saved = [];
    if (batch.state === "JOB_STATE_SUCCEEDED") {
      if (responses.length !== job.requests.length) {
        throw new Error(`${job.name} returned ${responses.length}/${job.requests.length}.`);
      }
      for (const [index, item] of responses.entries()) {
        const request = job.requests[index];
        if (item.error) {
          failures.push({ ...request, error: item.error });
          continue;
        }
        const directory = path.join(CANDIDATE_DIR, request.slug);
        const destination = path.join(directory, request.filename);
        mkdirSync(directory, { recursive: true });
        if (!existsSync(destination)) {
          await sharp(extractImage(item.response)).png().toFile(destination);
        }
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
      const destination = path.join(
        PUBLIC_DIR,
        product.gender,
        product.slug,
        view.filename,
      );
      renameSync(source, destination);
      promoted.push(path.relative(ROOT, destination));
    }
  }
  console.log(JSON.stringify({ promotedCount: promoted.length, promoted }, null, 2));
}

if (MODE === "prepare") {
  const items = await prepare();
  console.log(
    JSON.stringify(
      {
        prepared: items.length,
        estimatedBatchOutputCostUsd: Number((items.length * 0.067).toFixed(3)),
        manifest: path.relative(ROOT, MANIFEST_PATH),
      },
      null,
      2,
    ),
  );
} else if (MODE === "submit") {
  await submit();
} else if (MODE === "poll") {
  await poll();
} else if (MODE === "promote") {
  promote();
} else {
  throw new Error(`Unknown mode: ${MODE}`);
}

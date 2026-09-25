import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
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
const FIRST_REPAIR_DECISIONS = path.resolve(
  ROOT,
  "scripts/ai-stylist/cj-manual-gemini-repair-output-decisions.json",
);
const FIRST_REQUEST_MANIFEST = path.join(
  REPORT_DIR,
  "cj-manual-gemini-batch/request-manifest.json",
);
const RECOVERY_REQUEST_MANIFEST = path.join(
  REPORT_DIR,
  "cj-manual-gemini-recovery-batch/request-manifest.json",
);
const FIRST_REPAIR_REQUEST_MANIFEST = path.join(
  REPORT_DIR,
  "cj-manual-gemini-repair-batch/request-manifest.json",
);
const OUTPUT_DIR = path.join(REPORT_DIR, "cj-manual-gemini-repair2-batch");
const JOB_PATH = path.join(OUTPUT_DIR, "job.json");
const REQUEST_MANIFEST_PATH = path.join(OUTPUT_DIR, "request-manifest.json");
const BACKEND_ENV_PATH = path.resolve(ROOT, "../primeStyleAI-backend/.env");
const MODEL =
  process.env.AI_STYLIST_GEMINI_BATCH_MODEL ||
  "gemini-3-pro-image-preview";
const MAX_INLINE_BYTES = 20 * 1024 * 1024;

const sourceOverrides = {
  "2505250900531609500": [
    {
      path: "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913/cj-manual-refinement-sources/11-2505250900531609500-exact-page-clean-composite.webp",
      mimeType: "image/webp",
      label:
        "Exact-page product board. Use only the middle light sage-green FRONT polo. Ignore the caramel polo, the bottom back view, all text, symbols and labels.",
    },
  ],
  "2505140753031625700": [1, 2, 3].map((angle) => ({
    path: `output/reports/ai-stylist-mens-global-unique-visual-v16-20260913/cj-manual-refinement-sources/21-2505140753031625700-exact-page-angle-${angle}.webp`,
    mimeType: "image/webp",
    label: `Exact-page same-product loafer angle ${angle}. Use it only as construction and color evidence; exclude the wearer, the other shoe and the room.`,
  })),
  "2502280543221601200": [
    {
      path: "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913/cj-manual-refinement-sources/27-2502280543221601200-exact-page-angle-1.webp",
      mimeType: "image/webp",
      label:
        "Exact-page same-product white trouser front angle 1. Use the trouser only; exclude the wearer and scene.",
    },
    {
      path: "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913/cj-manual-refinement-sources/27-2502280543221601200-exact-page-angle-2.webp",
      mimeType: "image/webp",
      label:
        "Exact-page same-product white trouser front angle 2. Use the trouser only; exclude the wearer and scene.",
    },
    {
      path: "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913/cj-manual-refinement-sources/27-2502280543221601200-exact-page-angle-3.jpg",
      mimeType: "image/jpeg",
      label:
        "Exact-page same-product white trouser construction angle 3. Use the trouser only; exclude the wearer and scene.",
    },
  ],
};

const prompts = {
  "2505250900531609500": [
    "Create one ecommerce catalog image of the exact LIGHT SAGE-GREEN FRONT POLO shown in the middle of the supplied vertical product board.",
    "Crop conceptually to that middle front garment only. Do not use the caramel polo above it and do not use the green back view below it.",
    "Preserve its loose-but-controlled short-sleeve knit silhouette, pointed flat collar, three-button placket, dropped shoulder, textured towel-like knit, ribbed sleeve cuffs and ribbed straight hem.",
    "Remove the small black neck label; it is not part of the visible front product design.",
    "Return exactly one complete front-facing sage polo centered on pure white. No person, second garment, back view, text, care icons, logo, label, border, panel, inset, collage, floor, wall, architecture, plants or shadow scene.",
  ].join(" "),
  "2505140753031625700": [
    "Create one ecommerce catalog image of exactly ONE SINGLE LEFT-FOOT LOAFER reconstructed from the supplied same-product angles.",
    "Preserve the coffee-brown smooth-leather quarters and apron border, taupe suede vamp, coffee-brown penny strap with its narrow slot, almond-square toe, dark low stacked heel, slim black rubber outsole and visible matching stitching.",
    "Use a clean three-quarter front view with the toe pointing toward the lower right. Keep the shoe empty: no foot, sock or trouser inside it.",
    "Return exactly one complete loafer centered on pure white. No shoe pair, duplicate, second shoe, foot, leg, trouser, rug, chair, furniture, room, panel, inset, split image, border or collage.",
  ].join(" "),
  "2502280543221601200": [
    "Create one ecommerce catalog image of the exact WARM-IVORY TROUSER reconstructed from the supplied same-product white-trouser angles.",
    "Show the garment alone from a straight front view: full waistband through both complete cuffed hems. Preserve the high rise, extended waistband tab and button, belt loops, adjustable side tabs, double forward pleats on both sides, zip fly, clean center creases, controlled straight-tapered legs and turn-up cuffs.",
    "The waistband must be naturally closed and empty; the legs must hang symmetrically with a small gap between them. Do not invent a belt, elastic waist or cargo pockets.",
    "Return exactly one complete warm-ivory trouser centered on pure white. No human body, shirt, hands, skin, socks, shoes, boxes, furniture, wall, room, floor, panel, inset, split image, border or collage.",
  ].join(" "),
};

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

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

if (existsSync(JOB_PATH)) {
  const existing = readJson(JOB_PATH);
  throw new Error(
    `A second-repair batch record already exists (${existing.name || "unknown job"}). Refusing to submit a duplicate.`,
  );
}

const sourceManifest = readJson(SOURCE_MANIFEST);
const repairDecisions = readJson(FIRST_REPAIR_DECISIONS);
const firstRequests = readJson(FIRST_REQUEST_MANIFEST);
const recoveryRequests = readJson(RECOVERY_REQUEST_MANIFEST);
const firstRepairRequests = readJson(FIRST_REPAIR_REQUEST_MANIFEST);
const repairIds = new Set(
  repairDecisions.decisions
    .filter((item) => item.decision === "regenerate-again")
    .map((item) => item.productId),
);
const selected = sourceManifest.products.filter((product) =>
  repairIds.has(product.productId),
);
const firstIds = new Set(firstRequests.requests.map((item) => item.productId));
const recoveryIds = new Set(
  recoveryRequests.requests.map((item) => item.productId),
);
const firstRepairIds = new Set(
  firstRepairRequests.requests.map((item) => item.productId),
);

if (repairIds.size !== 3 || selected.length !== 3) {
  throw new Error(
    `Second-repair gate mismatch: expected three visually rejected identities, found ${selected.length}.`,
  );
}
if (new Set(selected.map((item) => item.productId)).size !== selected.length) {
  throw new Error("Duplicate identity detected inside the second-repair batch.");
}

const prepared = selected.map((product) => {
  if (!firstIds.has(product.productId) || !firstRepairIds.has(product.productId)) {
    throw new Error(
      `Second-repair ID ${product.productId} was not present in both prior guarded requests.`,
    );
  }
  if (recoveryIds.has(product.productId)) {
    throw new Error(
      `Second-repair ID ${product.productId} collides with the recovery batch.`,
    );
  }
  const sources = sourceOverrides[product.productId];
  if (!sources?.length || !prompts[product.productId]) {
    throw new Error(`Missing second-repair sources or prompt for ${product.productId}.`);
  }
  const resolvedSources = sources.map((source) => {
    const absolutePath = path.resolve(ROOT, source.path);
    if (!existsSync(absolutePath)) {
      throw new Error(`Second-repair source is missing: ${source.path}`);
    }
    const buffer = readFileSync(absolutePath);
    return { ...source, absolutePath, buffer, sha256: sha256(buffer) };
  });
  return { product, sources: resolvedSources, prompt: prompts[product.productId] };
});

const requestManifest = prepared.map(({ product, sources, prompt }) => ({
  index: product.index,
  productId: product.productId,
  sku: product.sku,
  title: product.title,
  garmentType: product.garmentType,
  color: product.color,
  priorFailure: repairDecisions.decisions.find(
    (item) => item.productId === product.productId,
  )?.reason,
  prompt,
  sources: sources.map((source) => ({
    localPath: source.path,
    mimeType: source.mimeType,
    bytes: source.buffer.length,
    sha256: source.sha256,
    label: source.label,
  })),
}));

const requests = prepared.map(({ product, sources, prompt }) => ({
  contents: [
    {
      role: "user",
      parts: [
        { text: prompt },
        ...sources.flatMap((source) => [
          { text: source.label },
          {
            inlineData: {
              mimeType: source.mimeType,
              data: source.buffer.toString("base64"),
            },
          },
        ]),
      ],
    },
  ],
  metadata: {
    productId: product.productId,
    sourceIndex: String(product.index),
    repairAttempt: "2",
  },
  config: {
    responseModalities: ["TEXT", "IMAGE"],
    temperature: 0,
    topP: 0.55,
    imageConfig: {
      aspectRatio: product.productKind === "shoe" ? "4:3" : "3:4",
      imageSize: "2K",
    },
  },
}));

const estimatedInlineBytes = Buffer.byteLength(JSON.stringify(requests));
if (estimatedInlineBytes >= MAX_INLINE_BYTES) {
  throw new Error(
    `Second-repair batch is ${estimatedInlineBytes} bytes and exceeds the guarded 20 MB limit.`,
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
      excludedFirstBatchPassIds: [...firstIds].filter(
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
    displayName: `mens-cj-output-repair2-${new Date().toISOString().slice(0, 10)}`,
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

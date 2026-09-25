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

const ROOT = process.cwd();
const SOURCE_PATH = path.join(
  ROOT,
  "public/media/partner-landing/merchant-network/studio-jacket-cobalt.png",
);
const OUTPUT_DIR = path.join(
  ROOT,
  "output/reports/arc-jacket-turnaround-v1/raw",
);
const BACKEND_ENV_PATH = path.resolve(ROOT, "../primeStyleAI-backend/.env");
const MODEL = process.env.ARC_JACKET_GEMINI_MODEL || "gemini-3-pro-image";
const requestedView = process.argv[2] || "all";
const force = process.argv.includes("--force");

const VIEWS = [
  {
    id: "left",
    filename: "arc-jacket-cobalt-left.png",
    instruction:
      "Show the jacket in a strict left profile: the garment has rotated exactly 90 degrees counter-clockwise from the front reference. Only the jacket's left side profile is visible. The center-front zipper should sit at the far right silhouette edge and must not read as a frontal view.",
  },
  {
    id: "back",
    filename: "arc-jacket-cobalt-back.png",
    instruction:
      "Show the jacket in a strict straight rear view after a 180-degree rotation. No front zipper or zipper pull is visible. Preserve the same sculpted collar, cropped ribbed hem, balloon sleeves, cobalt fabric, ivory curved side panels and coral piping as a physically coherent continuation around the back.",
  },
  {
    id: "right",
    filename: "arc-jacket-cobalt-right.png",
    instruction:
      "Show the jacket in a strict right profile: the garment has rotated exactly 90 degrees clockwise from the front reference. Only the jacket's right side profile is visible. The center-front zipper should sit at the far left silhouette edge and must not read as a frontal view.",
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

function promptFor(view) {
  return [
    "Edit the authoritative product reference into one technically useful ecommerce turnaround image of the exact same jacket.",
    view.instruction,
    "Identity lock: this is the identical cropped cobalt-blue jacket, with the identical tall structured collar, silver center-front zipper, coral-red zipper pull, cobalt outer shell, warm-ivory curved inset panels edged with thin coral piping, voluminous balloon sleeves, gathered cobalt cuffs, and wide ribbed cobalt hem.",
    "Preserve its exact proportions, seam placement, panel geometry, sleeve volume, collar height, fabric finish, colors, hardware scale and construction. Do not simplify, embellish, restyle, lengthen, slim, mirror, or substitute the garment.",
    "Present the jacket alone, suspended naturally as if worn by an invisible neutral torso. Use an orthographic catalog camera at the garment's mid-height with no perspective distortion. Center it at the same scale as the reference and keep every edge fully visible with even breathing room.",
    "Use a uniform very light neutral studio background and a faint grounding shadow only. Do not add a person, body, skin, face, hands, hanger, mannequin, stand, labels, branding, text, watermark, duplicate garment, collage, props, or a second angle.",
    "Return only one square photorealistic product image.",
  ].join(" ");
}

function extractImage(response) {
  const imagePart = response?.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data,
  );
  if (!imagePart?.inlineData?.data) {
    const message = response?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join(" ");
    throw new Error(message || "Gemini returned no image.");
  }
  return Buffer.from(imagePart.inlineData.data, "base64");
}

async function referencePart() {
  const reference = await sharp(SOURCE_PATH)
    .resize({ width: 1400, height: 1400, fit: "contain" })
    .png()
    .toBuffer();
  return {
    inlineData: {
      mimeType: "image/png",
      data: reference.toString("base64"),
    },
  };
}

if (!existsSync(SOURCE_PATH)) throw new Error(`Missing jacket source: ${SOURCE_PATH}`);
mkdirSync(OUTPUT_DIR, { recursive: true });

const selectedViews =
  requestedView === "all"
    ? VIEWS
    : VIEWS.filter((view) => view.id === requestedView);
if (!selectedViews.length) {
  throw new Error(`Unknown view "${requestedView}". Use all, left, back, or right.`);
}

const frontDestination = path.join(OUTPUT_DIR, "arc-jacket-cobalt-front.png");
if (!existsSync(frontDestination)) copyFileSync(SOURCE_PATH, frontDestination);

const manifest = {
  generatedAt: new Date().toISOString(),
  model: MODEL,
  source: path.relative(ROOT, SOURCE_PATH),
  preservedFront: path.relative(ROOT, frontDestination),
  views: VIEWS.map((view) => ({
    id: view.id,
    filename: view.filename,
    prompt: promptFor(view),
  })),
};
writeFileSync(
  path.join(OUTPUT_DIR, "generation-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

const ai = new GoogleGenAI({ apiKey: getApiKey() });
const reference = await referencePart();

for (const view of selectedViews) {
  const destination = path.join(OUTPUT_DIR, view.filename);
  if (existsSync(destination) && !force) {
    console.log(`Kept ${path.relative(ROOT, destination)}`);
    continue;
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: promptFor(view) },
          { text: "AUTHORITATIVE PRODUCT IDENTITY REFERENCE:" },
          reference,
        ],
      },
    ],
    config: {
      responseModalities: ["IMAGE"],
      temperature: 0.12,
      topP: 0.7,
      imageConfig: { aspectRatio: "1:1", imageSize: "2K" },
    },
  });

  await sharp(extractImage(response)).png().toFile(destination);
  console.log(`Generated ${path.relative(ROOT, destination)}`);
}

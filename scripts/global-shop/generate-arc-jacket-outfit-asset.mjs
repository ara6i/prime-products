import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const ROOT = process.cwd();
const BACKEND_ENV_PATH = path.resolve(ROOT, "../primeStyleAI-backend/.env");
const MODEL = process.env.ARC_OUTFIT_GEMINI_MODEL || "gemini-3.1-flash-image";
const BASE_DIR = path.join(
  ROOT,
  "public/media/global-shop/arc-jacket-demo-v1/outfits",
);

const ASSETS = {
  "look-02-top": {
    file: "look-02/oatmeal-knit-polo.png",
    description:
      "a refined oatmeal and warm-stone short-sleeve knitted Johnny-collar polo shirt, substantial fine-gauge knit, open collar with no buttons, controlled relaxed straight fit, ribbed cuffs and hem",
  },
  "look-02-bottom": {
    file: "look-02/sand-tapered-chinos.png",
    description:
      "men's sand and light-taupe tapered chinos, clean flat front, medium rise, controlled straight-to-tapered leg, matte cotton twill, discreet side pockets, no pleats and no cargo pockets",
  },
  "look-02-shoes": {
    file: "look-02/chocolate-suede-sneakers.png",
    description:
      "a matching pair of minimalist chocolate-brown suede court sneakers, low profile, tonal laces, slim gum outsole, premium understated construction",
  },
  "look-03-top": {
    file: "look-03/black-mock-neck.png",
    description:
      "a men's black long-sleeve mock-neck top, substantial compact jersey, clean collar, controlled regular fit, straight hem, minimal and refined",
  },
  "look-03-bottom": {
    file: "look-03/black-tapered-tech-trousers.png",
    description:
      "men's black tapered technical trousers, flat front, medium rise, clean controlled leg, matte stretch twill, subtle concealed zip pockets, no pleats and no cargo pockets",
  },
  "look-03-shoes": {
    file: "look-03/black-minimal-sneakers.png",
    description:
      "a matching pair of minimalist black leather low-top sneakers, tonal laces, slim black rubber outsole, clean panels with no branding",
  },
  "look-04-top": {
    file: "look-04/pale-blue-oxford-shirt.png",
    description:
      "a men's pale sky-blue Oxford shirt, long sleeves, button-down collar, clean regular fit, substantial cotton texture, straight untucked hem, no chest logo",
  },
  "look-04-bottom": {
    file: "look-04/navy-tapered-chinos.png",
    description:
      "men's rich navy tapered chinos, flat front, medium rise, clean side pockets, crisp cotton twill, controlled straight-to-tapered leg, no pleats",
  },
  "look-04-shoes": {
    file: "look-04/oxblood-penny-loafers.png",
    description:
      "a matching pair of oxblood polished-leather penny loafers, refined almond toe, low stacked heel, classic penny strap, modern slim sole",
  },
  "look-05-top": {
    file: "look-05/heather-grey-hoodie.png",
    description:
      "a men's light heather-grey pullover hoodie, substantial loopback cotton, structured hood, clean kangaroo pocket, controlled relaxed fit, ribbed cuffs and hem, no drawstring logo",
  },
  "look-05-bottom": {
    file: "look-05/black-tapered-cargo-trousers.png",
    description:
      "men's black tapered utility trousers, clean flat front, controlled leg, matte technical fabric, two slim low-profile thigh pockets integrated into the side seams, no bulky cargo volume",
  },
  "look-05-shoes": {
    file: "look-05/ivory-trainers.png",
    description:
      "a matching pair of modern ivory and warm-white trainers, sculpted but restrained sole, layered tonal panels, clean premium athletic shape with no branding",
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

function promptFor(description) {
  return [
    `Create ONE isolated menswear ecommerce catalog asset: ${description}.`,
    "Styling context only: this item will later be paired with a vivid cobalt-blue cropped technical bomber jacket with warm-ivory curved panels and a restrained coral accent. DO NOT RENDER THE JACKET OR ANY OTHER GARMENT; render only the single requested product.",
    "Front-facing or natural three-quarter catalog view as appropriate, perfectly centered, entire item visible with generous clear padding, realistic construction and premium fabric texture, soft even studio lighting.",
    "OUTPUT ONLY THE PRODUCT AGAINST ONE PERFECTLY FLAT SOLID CHROMA-KEY GREEN #00FF00 BACKGROUND. The green must cover every background pixel uniformly: no checkerboard, no gradient, no floor, no horizon, no cast shadow and no green reflection on the product. No model, person, skin, mannequin, hanger, rack, room, props, text, letters, logos, labels, watermark, border, card, duplicate item or invented accessory. Do not crop any edge.",
    "Masculine modern styling with controlled proportions: never skinny, never oversized, never baggy. Square 1:1 image.",
  ].join(" ");
}

const assetId = process.argv[2];
const asset = ASSETS[assetId];
if (!asset) {
  throw new Error(`Choose one asset: ${Object.keys(ASSETS).join(", ")}`);
}

const destination = path.join(BASE_DIR, asset.file);
if (existsSync(destination) && process.env.ARC_OUTFIT_FORCE !== "1") {
  throw new Error(`Refusing duplicate generation; asset already exists: ${destination}`);
}

const ai = new GoogleGenAI({ apiKey: getApiKey() });
const response = await ai.models.generateContent({
  model: MODEL,
  contents: [{ text: promptFor(asset.description) }],
  config: {
    responseModalities: ["IMAGE"],
    temperature: 0.28,
    topP: 0.82,
    imageConfig: { aspectRatio: "1:1", imageSize: "2K" },
  },
});
const imagePart = response.candidates?.[0]?.content?.parts?.find(
  (part) => part.inlineData?.data,
);
if (!imagePart?.inlineData?.data) {
  throw new Error("Gemini returned no image.");
}

mkdirSync(path.dirname(destination), { recursive: true });
writeFileSync(destination, Buffer.from(imagePart.inlineData.data, "base64"));
const keyedDestination = `${destination}.alpha.png`;
execFileSync("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-i",
  destination,
  "-vf",
  "colorkey=0x00ff00:0.32:0.08,format=rgba",
  keyedDestination,
]);
renameSync(keyedDestination, destination);
console.log(JSON.stringify({ assetId, destination, model: MODEL }));

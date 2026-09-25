import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const root = process.cwd();
const mediaRoot = path.join(root, "public/media/global-shop/arc-jacket-demo-v1");
const outfitRoot = path.join(mediaRoot, "outfits");
const resultRoot = path.join(mediaRoot, "results");
const model = process.env.ARC_OUTFIT_GEMINI_MODEL || "gemini-3.1-flash-image";

const looks = {
  "look-01": [
    "City Clean",
    "look-01/white-heavyweight-tee.png",
    "look-01/deep-navy-tapered-tech-trousers.png",
    "look-01/white-leather-sneakers.png",
    "white heavyweight tee, deep navy tapered trousers, white leather sneakers",
  ],
  "look-02": [
    "Weekend Cream",
    "look-02/oatmeal-knit-polo.png",
    "look-02/sand-tapered-chinos.png",
    "look-02/chocolate-suede-sneakers.png",
    "oatmeal knit polo, sand chinos, chocolate suede sneakers",
  ],
  "look-03": [
    "Night Signal",
    "look-03/black-mock-neck.png",
    "look-03/black-tapered-tech-trousers.png",
    "look-03/black-minimal-sneakers.png",
    "black mock neck, black tapered technical trousers, black minimal sneakers",
  ],
  "look-04": [
    "Modern Prep",
    "look-04/pale-blue-oxford-shirt.png",
    "look-04/navy-tapered-chinos.png",
    "look-04/oxblood-penny-loafers.png",
    "pale blue Oxford shirt, navy chinos, oxblood penny loafers",
  ],
  "look-05": [
    "Sport Utility",
    "look-05/heather-grey-hoodie.png",
    "look-05/black-tapered-cargo-trousers.png",
    "look-05/ivory-trainers.png",
    "heather-grey hoodie, low-profile black cargo trousers, ivory trainers",
  ],
};

function parseEnv(raw) {
  return Object.fromEntries(
    raw.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!match || line.trimStart().startsWith("#")) return [];
      return [[match[1], match[2].replace(/^['"]|['"]$/g, "")]];
    }),
  );
}

function apiKey() {
  const names = [
    "SIZING_LAB_GEMINI_API_KEY",
    "TEST_LAB_GOOGLE_API_KEY",
    "TEST_LAB_GEMINI_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
  ];
  for (const name of names) if (process.env[name]) return process.env[name];
  const envPath = path.resolve(root, "../primeStyleAI-backend/.env");
  const env = existsSync(envPath) ? parseEnv(readFileSync(envPath, "utf8")) : {};
  for (const name of names) if (env[name]) return env[name];
  throw new Error("Gemini API key is unavailable.");
}

function imagePart(file) {
  return {
    inlineData: {
      mimeType: "image/png",
      data: readFileSync(file).toString("base64"),
    },
  };
}

const lookId = process.argv[2];
const look = looks[lookId];
if (!look) throw new Error(`Choose one look: ${Object.keys(looks).join(", ")}`);

const [label, top, bottom, shoes, styling] = look;
const destination = path.join(resultRoot, `${lookId}.png`);
if (existsSync(destination) && process.env.ARC_OUTFIT_FORCE !== "1") {
  throw new Error(`Refusing duplicate generation: ${destination}`);
}

const prompt = [
  "Use case: identity-preserve virtual try-on result for a fashion commerce demo.",
  `Edit Image 1 so the same man wears the complete ${label} outfit: ${styling}.`,
  "Image 1 is the immutable person, pose, framing, lighting, and background reference. Image 2 is the exact pinned cobalt Arc Jacket. Images 3, 4, and 5 are the exact top, trousers, and shoes.",
  "Preserve Image 1's face, identity, hair, facial hair, skin tone, body proportions, hands, straight front-facing pose, full-body crop, warm off-white studio background, and soft lighting. It must look like the next frame from the same catalog photo session.",
  "Reproduce the Arc Jacket exactly: vivid cobalt-blue technical fabric, warm-ivory curved chest and sleeve panels, restrained coral zipper pull, cropped waist, same collar and cuffs. Wear it naturally open so the top remains visible. Do not feminize, lengthen, recolor, simplify, or redesign it.",
  "Match each companion garment's exact color, silhouette, material, and construction. Masculine modern proportions: tailored and comfortable, never skinny, oversized, or baggy. Realistic layering and folds; both matching shoes fully visible.",
  "Output one polished photorealistic 2:3 full-body ecommerce image only. No text, logo, watermark, props, extra garments, duplicated limbs, cropped feet, changed background, or comparison layout.",
].join(" ");

const ai = new GoogleGenAI({ apiKey: apiKey() });
const response = await ai.models.generateContent({
  model,
  contents: [{
    role: "user",
    parts: [
      imagePart(path.join(mediaRoot, "model-source.png")),
      imagePart(path.join(root, "public/media/partner-landing/merchant-network/studio-jacket-cobalt.png")),
      imagePart(path.join(outfitRoot, top)),
      imagePart(path.join(outfitRoot, bottom)),
      imagePart(path.join(outfitRoot, shoes)),
      { text: prompt },
    ],
  }],
  config: {
    responseModalities: ["IMAGE"],
    temperature: 0.18,
    topP: 0.78,
    imageConfig: { aspectRatio: "2:3", imageSize: "2K" },
  },
});

const image = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
if (!image?.inlineData?.data) throw new Error("Gemini returned no image.");
mkdirSync(resultRoot, { recursive: true });
writeFileSync(destination, Buffer.from(image.inlineData.data, "base64"));
console.log(JSON.stringify({ lookId, destination, model }));

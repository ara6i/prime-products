import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/genai";

const BACKEND_ENV_PATH = path.resolve(
  process.cwd(),
  "../primeStyleAI-backend/.env",
);
const OUTPUT_DIR = path.resolve(
  process.cwd(),
  "public/images/pdp-studio/home",
);
const MODEL = "gemini-3.1-flash-image";

const ASSETS = [
  {
    filename: "brand-workbench-v6.png",
    aspectRatio: "21:9",
    banner: true,
    prompt:
      "Create an original ultra-wide hero asset for PrimeStyleAI, a fashion ecommerce product-photo studio. Premium photorealistic editorial product photography, not an abstract illustration. Keep the entire left 58 percent pure white and completely empty for interface copy. On the right 42 percent, show only two large, instantly recognizable fashion products: a cobalt-blue tailored women's blazer on an invisible torso form and an ivory silk blouse arranged as a refined flat lay, with one professional camera lens placed between them. The three subjects should fill the right side vertically, stay centered in one horizontal band, and remain fully visible in a shallow banner crop. White and cobalt palette, controlled studio lighting, crisp fabric texture, subtle shadows, sophisticated luxury-fashion quality. No extra garments, no people, no faces, no hands, no shoes, no handbags, no hats, no cosmetics, no text, no letters, no logos, no UI screenshot, no watermark.",
  },
  {
    filename: "workflow-background-removal-v3.png",
    aspectRatio: "16:9",
    prompt:
      "Create an original high-end fashion ecommerce feature image that clearly communicates background removal. A cobalt-blue tailored women's blazer floats front-facing with no person and no visible mannequin. Behind it, a pale grey photography backdrop is visibly peeling and lifting away while the blazer remains perfectly isolated with a precise clean cutout edge and natural soft shadow on white. The action must be immediately understandable without text. Premium photorealistic studio product photography, crisp fabric weave, accurate sleeves and lapels, sophisticated white and cobalt palette, generous breathing room, 2K detail. No people, no faces, no hands, no shoes, no handbags, no hats, no cosmetics, no text, no logos, no UI, no watermark.",
  },
  {
    filename: "workflow-ai-backgrounds-v3.png",
    aspectRatio: "16:9",
    prompt:
      "Create an original high-end fashion ecommerce feature image that clearly communicates AI-generated backgrounds. Center a cobalt-blue satin midi dress on an invisible dress form with no head, body, arms, or legs. Around the dress, a clean pale-blue editorial set appears as layered paper arches and soft studio shadow planes, making it obvious that a new environment has been generated around the unchanged garment. Premium photorealistic fashion product photography, realistic satin texture, complete dress fully visible, elegant white and cobalt palette, crisp 2K quality. No people, no faces, no hands, no shoes, no handbags, no hats, no cosmetics, no text, no logos, no UI screenshot, no watermark.",
  },
  {
    filename: "workflow-batch-v3.png",
    aspectRatio: "16:9",
    prompt:
      "Create an original high-end fashion ecommerce feature image that clearly communicates batch editing. Arrange six consistent square studio product photographs in a precise two-by-three grid, each showing one different garment with no model: a cobalt blazer, ivory blouse, navy trousers, pale-blue pleated skirt, cream knit sweater, and cobalt scarf. Every garment uses the same clean white background, lighting, scale, crop, and soft shadow, showing that a whole catalog was standardized together. Premium photorealistic apparel photography, crisp fabric detail, refined white and cobalt palette, sharp 2K quality. No people, no faces, no hands, no shoes, no handbags, no hats, no cosmetics, no text, no logos, no UI frame, no watermark.",
  },
  {
    filename: "workflow-retouch-v3.png",
    aspectRatio: "16:9",
    prompt:
      "Create an original high-end fashion ecommerce feature image that clearly communicates garment retouching. Show a close but fully readable cobalt-blue silk blouse on white. One half has subtle wrinkles, lint, and an uneven highlight; the other half is immaculate, smooth, color-corrected, and crisply detailed, with a restrained translucent circular inspection lens crossing the boundary. The improvement must be obvious without exaggeration or text. Premium photorealistic apparel photography, realistic silk and stitching, refined white and cobalt palette, controlled soft light, sharp 2K detail. No people, no faces, no hands, no shoes, no handbags, no hats, no cosmetics, no text, no logos, no UI, no watermark.",
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

function getGeminiApiKey() {
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

function buildConfig(aspectRatio) {
  return {
    responseModalities: ["TEXT", "IMAGE"],
    temperature: 0.55,
    topP: 0.9,
    imageConfig: {
      aspectRatio,
      imageSize: "2K",
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  };
}

function extractImage(response) {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => Boolean(part.inlineData?.data));
  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini returned no image.");
  }
  return Buffer.from(imagePart.inlineData.data, "base64");
}

async function generateAsset(ai, asset) {
  const request = {
    model: MODEL,
    contents: [{ text: asset.prompt }],
    config: buildConfig(asset.aspectRatio),
  };

  const response = await ai.models.generateContent(request);

  const destination = path.join(OUTPUT_DIR, asset.filename);
  const generatedImage = extractImage(response);
  let outputImage = generatedImage;
  if (asset.banner) {
    const imageBand = await sharp(generatedImage)
      .resize(2752, 440, { fit: "cover", position: "center" })
      .png()
      .toBuffer();
    outputImage = await sharp({
      create: {
        width: 4128,
        height: 440,
        channels: 4,
        background: "#ffffff",
      },
    })
      .composite([{ input: imageBand, left: 976, top: 0 }])
      .png()
      .toBuffer();
  }
  writeFileSync(destination, outputImage);
  console.log(`Generated ${path.relative(process.cwd(), destination)}`);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

for (const asset of ASSETS) {
  const destination = path.join(OUTPUT_DIR, asset.filename);
  if (existsSync(destination)) {
    console.log(`Kept ${path.relative(process.cwd(), destination)}`);
    continue;
  }
  await generateAsset(ai, asset);
}

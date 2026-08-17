import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const MODEL = "veo-3.1-lite-generate-preview";
const DURATION_SECONDS = 8;
const RESOLUTION = "1080p";
const MAX_GENERATION_COST_USD = 0.64;

const projectRoot = process.cwd();
const backendEnvPath = path.resolve(
  projectRoot,
  "../primeStyleAI-backend/.env",
);
const sourcePath = path.resolve(
  projectRoot,
  "public/media/partner-landing/merchant-tryon-phone-model-landmarks-full-source.png",
);
const outputDirectory = path.resolve(
  projectRoot,
  "public/media/partner-landing",
);
const outputPath = path.join(
  outputDirectory,
  "merchant-tryon-phone-model-landmarks-veo-lite-1080p.mp4",
);
const metadataPath = path.join(
  outputDirectory,
  "merchant-tryon-phone-model-landmarks-veo-lite-1080p.json",
);

const prompt = `
Create a locked eight-second UI animation from this exact 16:9 retail artwork. Keep the camera and the complete artwork perfectly still.

Inside the large white Virtual Try-On interface on the far right, the upper product-preview area contains a small lime-green virtual mannequin. Add a subtle cyan technical sizing overlay only to that small mannequin: tiny glowing points at the head, neck, shoulders, elbows, wrists, center torso, waist, and hips, connected with thin translucent lines. Make only the cyan points pulse gently in sequence. The mannequin itself and every other pixel remain still.

Keep the cyan overlay entirely inside the mannequin preview area. Do not place it on the large shopper, thumbnails, text, icons, button, product cards, or background. Return to the same glow state at the end for a seamless loop. No camera motion, no new text, no scene change, no watermark, and no other animation.
`.trim();

function parseEnvFile(raw) {
  const parsed = {};
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
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

  if (!existsSync(backendEnvPath)) {
    throw new Error(
      "The existing PrimeStyleAI backend Gemini configuration is unavailable.",
    );
  }

  const environment = parseEnvFile(readFileSync(backendEnvPath, "utf8"));
  const apiKey =
    environment.SIZING_LAB_GEMINI_API_KEY ||
    environment.TEST_LAB_GOOGLE_API_KEY ||
    environment.TEST_LAB_GEMINI_API_KEY ||
    environment.GEMINI_API_KEY ||
    environment.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("The existing PrimeStyleAI Gemini API key is unavailable.");
  }
  return apiKey;
}

async function generate(ai) {
  if (existsSync(outputPath)) {
    throw new Error(
      `Refusing to spend again because ${path.basename(outputPath)} already exists.`,
    );
  }

  const imageBytes = readFileSync(sourcePath).toString("base64");
  let operation = await ai.models.generateVideos({
    model: MODEL,
    prompt,
    image: { imageBytes, mimeType: "image/png" },
    config: {
      numberOfVideos: 1,
      durationSeconds: DURATION_SECONDS,
      aspectRatio: "16:9",
      resolution: RESOLUTION,
      personGeneration: "allow_adult",
    },
  });

  console.log(
    JSON.stringify({
      phase: "submitted",
      operation: operation.name || null,
      model: MODEL,
      maximumCostUsd: MAX_GENERATION_COST_USD,
    }),
  );

  let poll = 0;
  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    operation = await ai.operations.getVideosOperation({ operation });
    poll += 1;
    console.log(
      JSON.stringify({ phase: "processing", poll, done: Boolean(operation.done) }),
    );
  }

  if (operation.error) {
    throw new Error(`Veo generation failed: ${JSON.stringify(operation.error)}`);
  }

  const generatedVideo = operation.response?.generatedVideos?.[0]?.video;
  if (!generatedVideo) {
    const reasons = operation.response?.raiMediaFilteredReasons ?? [];
    throw new Error(`Veo returned no video. ${reasons.join(" ")}`.trim());
  }

  await mkdir(outputDirectory, { recursive: true });
  await ai.files.download({ file: generatedVideo, downloadPath: outputPath });
  const metadata = {
    model: MODEL,
    durationSeconds: DURATION_SECONDS,
    resolution: RESOLUTION,
    aspectRatio: "16:9",
    maximumGenerationCostUsd: MAX_GENERATION_COST_USD,
    operation: operation.name || null,
    source: path.relative(projectRoot, sourcePath),
    output: path.relative(projectRoot, outputPath),
    createdAt: new Date().toISOString(),
    prompt,
  };
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ phase: "complete", ...metadata, prompt: undefined }));
}

const ai = new GoogleGenAI({ apiKey: getApiKey() });
const model = await ai.models.get({ model: MODEL });
console.log(
  JSON.stringify({
    phase: "verified",
    model: model.name || MODEL,
    durationSeconds: DURATION_SECONDS,
    resolution: RESOLUTION,
    aspectRatio: "16:9",
    maximumCostUsd: MAX_GENERATION_COST_USD,
  }),
);

if (process.argv.includes("--confirm-paid-generation")) {
  await generate(ai);
} else {
  console.log(
    JSON.stringify({
      phase: "dry-run",
      paidGenerationStarted: false,
      requiredFlag: "--confirm-paid-generation",
    }),
  );
}

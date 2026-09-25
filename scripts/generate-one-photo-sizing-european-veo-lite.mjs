import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const MODEL = "veo-3.1-lite-generate-preview";
const DURATION_SECONDS = 8;
const RESOLUTION = "1080p";
const MAX_GENERATION_COST_USD = 0.64;

const projectRoot = process.cwd();
const backendEnvPath = path.resolve(projectRoot, "../primeStyleAI-backend/.env");
const outputDirectory = path.resolve(
  projectRoot,
  "public/media/partner-landing/merchant-network/one-photo-sizing",
);
const sourcePath = path.join(
  outputDirectory,
  "one-photo-sizing-storyboard-european-v2.png",
);
const outputPath = path.join(
  outputDirectory,
  "one-photo-sizing-european-veo-lite-1080p-v2.mp4",
);
const metadataPath = path.join(
  outputDirectory,
  "one-photo-sizing-european-veo-lite-1080p-v2.json",
);

const prompt = `
Animate this exact vertical AI fashion-sizing storyboard as a premium, subtle 8-second landing-page loop. Keep the 9:16 camera completely locked: no pan, zoom, tilt, reframing, crop, or scene change. Preserve the adult woman's identity, face, long dark-blonde hair, sunglasses, ivory cropped blazer, black bodysuit, burgundy gloves, dark-indigo jeans, burgundy boots, body proportions, background, lighting, colors, five close-up panels, five black label bars, all existing label text, and the white hand-sketched arrows exactly.

The adult woman remains in the same standing pose with restrained realistic fashion-film motion: soft breathing, one natural blink, a tiny confident head adjustment, a very small sunglasses adjustment by the raised gloved hand, and minimal hair and fabric movement. Keep her anatomy, hands, face, clothing fit, and boots stable.

Synchronize each close-up panel with its real garment area: the sunglasses crop follows the tiny sunglasses adjustment; the blazer crop shows minimal fabric movement; the glove crop shows a slight finger flex; the jeans-waist crop shows subtle breathing; the boot crop remains planted with only a tiny natural weight shift. The five panels stay fixed in position and size.

Animate only the existing white sketch arrows with an elegant hand-drawn trace: each arrow briefly redraws along its existing path in order from 1 through 5, then settles back to the exact original line. Keep every black label bar completely stationary, sharp, and readable. Preserve these five labels verbatim without changing, retyping, morphing, or adding characters: 1. SUNGLASSES · 52 MM; 2. BLAZER · S / EU 36; 3. GLOVES · SIZE 7; 4. JEANS · W27 / L31; 5. BOOTS · EU 39.

The first and last frame must match in pose, camera, panel positions, text, arrow positions, and lighting for a seamless loop. No dialogue, audio-driven action, new text, new logos, new boxes, additional measurements, interface changes, or watermark.

Avoid changed identity, changed clothing, altered or misspelled text, moving labels, drifting panels, arrows pointing to wrong items, warped hands, extra fingers, duplicate limbs, transformed garments, moving background, flicker, aggressive motion, camera movement, blur, watermark, or signature.
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

async function verifyModel(ai) {
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing source image: ${sourcePath}`);
  }
  const model = await ai.models.get({ model: MODEL });
  console.log(
    JSON.stringify({
      phase: "verified",
      model: model.name || MODEL,
      durationSeconds: DURATION_SECONDS,
      resolution: RESOLUTION,
      aspectRatio: "9:16",
      maximumCostUsd: MAX_GENERATION_COST_USD,
      source: path.relative(projectRoot, sourcePath),
    }),
  );
}

async function generate(ai) {
  if (existsSync(outputPath) || existsSync(metadataPath)) {
    throw new Error(
      `Refusing to spend again because a v2 Veo output already exists.`,
    );
  }

  const imageBytes = readFileSync(sourcePath).toString("base64");
  let operation = await ai.models.generateVideos({
    model: MODEL,
    prompt,
    image: {
      imageBytes,
      mimeType: "image/png",
    },
    config: {
      numberOfVideos: 1,
      durationSeconds: DURATION_SECONDS,
      aspectRatio: "9:16",
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
      JSON.stringify({
        phase: "processing",
        poll,
        done: Boolean(operation.done),
      }),
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
    aspectRatio: "9:16",
    maximumGenerationCostUsd: MAX_GENERATION_COST_USD,
    operation: operation.name || null,
    source: path.relative(projectRoot, sourcePath),
    output: path.relative(projectRoot, outputPath),
    createdAt: new Date().toISOString(),
    prompt,
  };
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify({
      phase: "complete",
      ...metadata,
      prompt: undefined,
    }),
  );
}

const ai = new GoogleGenAI({ apiKey: getApiKey() });
await verifyModel(ai);

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

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
  "public/media/partner-landing/merchant-tryon-ai-sizing-mobile-landmarks-source.png",
);
const outputDirectory = path.resolve(
  projectRoot,
  "public/media/partner-landing",
);
const outputPath = path.join(
  outputDirectory,
  "merchant-tryon-ai-sizing-mobile-landmarks-veo-lite-1080p.mp4",
);
const metadataPath = path.join(
  outputDirectory,
  "merchant-tryon-ai-sizing-mobile-landmarks-veo-lite-1080p.json",
);

const prompt = `
Animate this exact portrait PrimeStyleAI virtual-fitting artwork as a premium, subtle 8-second mobile background loop. Keep the vertical 9:16 camera completely locked: no pan, zoom, tilt, reframing, or crop. Preserve the woman's identity, face, green sunglasses, green beanie, lime puffer jacket, orange inner layer, teal phone, hands, black shoulder strap, floating garment cards, glass-atrium background, lighting, colors, and every existing UI word exactly.

The woman remains in the same pose and calmly uses her phone with only restrained natural motion: soft breathing, one very small head adjustment, a slight blink, tiny thumb movement, and minimal fabric movement. Her anatomy, hands, phone, clothing, and face must stay stable and realistic.

Add a polished AI body-analysis visualization only on the real woman in the foreground. Show small luminous cyan-teal landmark nodes precisely anchored to her visible body: face contour and temples, neck, both shoulders, elbows, wrists, finger/phone contact points, sternum, jacket side seams, and visible hip line. Connect the main anatomical nodes with very thin translucent cyan lines. The landmarks must remain locked to her moving anatomy without slipping, drifting, multiplying, or appearing on the product cards or the model inside the white try-on interface. Use gentle sequential scan pulses and subtle node glows; keep the effect technical, elegant, and readable rather than flashy.

The first and last frame must return to the same pose, camera, landmark positions, glow intensity, and garment-card positions so the clip can repeat continuously without a noticeable jump. No dialogue, captions, new text, new logos, camera effects, or scene changes. Keep all existing interface cards crisp and stationary.

Avoid warped hands, duplicate limbs, changed face, changed clothing, missing phone, moving UI cards, altered or misspelled text, landmark dots on the wrong person or on UI imagery, drifting points, random particles, full-screen grid, heavy holograms, flicker, camera movement, excessive motion, watermark, or signature.
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
  const model = await ai.models.get({ model: MODEL });
  console.log(
    JSON.stringify({
      phase: "verified",
      model: model.name || MODEL,
      durationSeconds: DURATION_SECONDS,
      resolution: RESOLUTION,
      aspectRatio: "9:16",
      maximumCostUsd: MAX_GENERATION_COST_USD,
    }),
  );
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
    throw new Error(
      `Veo generation failed: ${JSON.stringify(operation.error)}`,
    );
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
  await writeFile(
    metadataPath,
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );
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

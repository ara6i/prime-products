import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

const MODEL = "veo-3.1-lite-generate-preview";
const DURATION_SECONDS = 8;
const RESOLUTION = "1080p";
const MAX_GENERATION_COST_USD = 0.64;

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();
const backendEnvPath = path.resolve(projectRoot, "../primeStyleAI-backend/.env");
const originalSourcePath = path.resolve(
  projectRoot,
  "public/media/partner-landing/merchant-network/supplier-catalog-veo-fast-source-4k-v1.png",
);
const outputDirectory = path.resolve(
  projectRoot,
  "public/media/partner-landing/merchant-network",
);
const sourcePath = path.join(
  outputDirectory,
  "supplier-catalog-veo-lite-color-gate-source-1080p-v2.png",
);
const originalOutputPath = path.join(
  outputDirectory,
  "supplier-catalog-veo-lite-color-gate-1080p-v2-original.mp4",
);
const outputPath = path.join(
  outputDirectory,
  "supplier-catalog-veo-lite-color-gate-1080p-v2.mp4",
);
const metadataPath = path.join(
  outputDirectory,
  "supplier-catalog-veo-lite-color-gate-1080p-v2.json",
);

const prompt = `
Create a clean, locked-camera SaaS interface animation from this exact artwork.

ONLY THE PRODUCT CARDS MOVE. The product cards continuously glide from LEFT TO RIGHT in three tight horizontal rows. Every card begins fully GRAYSCALE and softly faded on the left. Each card moves toward the single thin vertical blue line. The exact same unchanged card crosses directly through that blue line. At the precise instant the card crosses the line, ONLY its color and clarity change: grayscale becomes the original full color and faded becomes sharp. The same card then continues moving a short distance to the right in full color.

This is strictly a color-state reveal at the blue boundary. It is NOT a product transformation. A gray dress must remain the identical dress after crossing. A gray shoe must remain the identical shoe. A gray necklace must remain the identical necklace. Preserve every product, silhouette, card shape, layout, placeholder line, scale, perspective, and shadow exactly. Do not change one product into another. Do not change any color except by revealing the matching original product color after it crosses the line.

Keep the cards close together around the line, like a continuous catalog conveyor. Several cards visibly cross during the clip. Repopulate the left edge with the same gray cards while colored cards exit at the right so the motion feels like a seamless infinite loop.

The camera and background are completely static. Keep exactly ONE simple, thin, straight, uninterrupted blue vertical line with rounded ends. The line never moves, bends, widens, splits, glows, pulses, or duplicates. Preserve the clean white background and subtle pale-blue waves. No people. No camera motion. No zoom. No reframing. No new objects. No labels or readable text. Do not invent letters, numbers, prices, logos, badges, icons, or UI copy. No morphing, warping, flickering, flashing, extra lines, or color changes before the card crosses the blue line.

The opening and ending compositions should match closely for a smooth website loop.
`.trim();

const negativePrompt = [
  "product morphing",
  "different product after crossing",
  "changing product shape",
  "new products",
  "new objects",
  "people",
  "readable text",
  "fake text",
  "letters",
  "numbers",
  "prices",
  "logos",
  "badges",
  "camera movement",
  "zoom",
  "reframing",
  "duplicate blue line",
  "extra blue line",
  "bent blue line",
  "moving blue line",
  "color on left side",
  "grayscale on right side",
  "warped cards",
  "flicker",
  "flashing",
  "large gaps",
].join(", ");

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
    throw new Error("The PrimeStyleAI backend Gemini configuration is unavailable.");
  }
  const environment = parseEnvFile(readFileSync(backendEnvPath, "utf8"));
  const apiKey =
    environment.SIZING_LAB_GEMINI_API_KEY ||
    environment.TEST_LAB_GOOGLE_API_KEY ||
    environment.TEST_LAB_GEMINI_API_KEY ||
    environment.GEMINI_API_KEY ||
    environment.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("The PrimeStyleAI Gemini API key is unavailable.");
  return apiKey;
}

async function writeMetadata(fields) {
  await writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        model: MODEL,
        durationSeconds: DURATION_SECONDS,
        resolution: RESOLUTION,
        aspectRatio: "16:9",
        maximumGenerationCostUsd: MAX_GENERATION_COST_USD,
        source: path.relative(projectRoot, sourcePath),
        originalOutput: path.relative(projectRoot, originalOutputPath),
        output: path.relative(projectRoot, outputPath),
        prompt,
        negativePrompt,
        ...fields,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function prepareSource() {
  if (!existsSync(originalSourcePath)) {
    throw new Error(`Missing approved source artwork: ${originalSourcePath}`);
  }
  await mkdir(outputDirectory, { recursive: true });
  await sharp(originalSourcePath)
    .resize({ width: 1920, height: 1080, fit: "fill", kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.55, m1: 0.45, m2: 1.25 })
    .png({ compressionLevel: 9 })
    .toFile(sourcePath);
}

function refuseDuplicateSpend() {
  const existing = [metadataPath, originalOutputPath, outputPath].filter(existsSync);
  if (existing.length) {
    throw new Error(`Refusing a duplicate paid generation: ${existing.join(", ")}`);
  }
}

async function generate(ai) {
  refuseDuplicateSpend();
  await prepareSource();

  const sourceBytes = readFileSync(sourcePath).toString("base64");
  const sourceImage = { imageBytes: sourceBytes, mimeType: "image/png" };
  const reservedAt = new Date().toISOString();
  await writeMetadata({
    status: "submission-reserved",
    operation: null,
    reservedAt,
    note: "One explicitly approved paid Veo Lite attempt. Never resubmit automatically.",
  });

  let operation;
  try {
    operation = await ai.models.generateVideos({
      model: MODEL,
      prompt,
      image: sourceImage,
      config: {
        numberOfVideos: 1,
        durationSeconds: DURATION_SECONDS,
        aspectRatio: "16:9",
        resolution: RESOLUTION,
        lastFrame: sourceImage,
      },
    });
  } catch (error) {
    await writeMetadata({
      status: "submission-error",
      operation: null,
      reservedAt,
      failedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      note: "No automatic retry was made.",
    });
    throw error;
  }

  const operationName = operation.name || null;
  await writeMetadata({
    status: "submitted",
    operation: operationName,
    reservedAt,
    submittedAt: new Date().toISOString(),
  });
  console.log(JSON.stringify({ phase: "submitted", model: MODEL }));

  let poll = 0;
  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    operation = await ai.operations.getVideosOperation({ operation });
    poll += 1;
    console.log(JSON.stringify({ phase: "processing", poll }));
  }

  if (operation.error) {
    await writeMetadata({
      status: "generation-error",
      operation: operationName,
      reservedAt,
      failedAt: new Date().toISOString(),
      error: operation.error,
      note: "No automatic retry was made.",
    });
    throw new Error(`Veo generation failed: ${JSON.stringify(operation.error)}`);
  }

  const generatedVideo = operation.response?.generatedVideos?.[0]?.video;
  if (!generatedVideo) {
    const reasons = operation.response?.raiMediaFilteredReasons ?? [];
    await writeMetadata({
      status: "no-video",
      operation: operationName,
      reservedAt,
      failedAt: new Date().toISOString(),
      reasons,
      note: "No automatic retry was made.",
    });
    throw new Error(`Veo returned no video. ${reasons.join(" ")}`.trim());
  }

  await ai.files.download({ file: generatedVideo, downloadPath: originalOutputPath });
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    originalOutputPath,
    "-map",
    "0:v:0",
    "-c:v",
    "copy",
    "-an",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  await writeMetadata({
    status: "complete",
    operation: operationName,
    reservedAt,
    completedAt: new Date().toISOString(),
  });
  console.log(
    JSON.stringify({
      phase: "complete",
      model: MODEL,
      output: path.relative(projectRoot, outputPath),
    }),
  );
}

const ai = new GoogleGenAI({ apiKey: getApiKey() });
const model = await ai.models.get({ model: MODEL });
console.log(JSON.stringify({ phase: "verified", model: model.name || MODEL }));

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

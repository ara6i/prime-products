import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

const MODEL = "veo-3.1-fast-generate-preview";
const DURATION_SECONDS = 8;
const RESOLUTION = "4k";
const MAX_GENERATION_COST_USD = 2.4;

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();
const backendEnvPath = path.resolve(projectRoot, "../primeStyleAI-backend/.env");
const originalSourcePath =
  "/Users/arashsn/.codex/generated_images/01a03a04-ba19-75c1-8c82-d74c1f9725ab/exec-ab69c7ff-376a-4192-a19b-55f588c6f0ec.png";
const outputDirectory = path.resolve(
  projectRoot,
  "public/media/partner-landing/merchant-network",
);
const sourcePath = path.join(
  outputDirectory,
  "supplier-catalog-veo-fast-source-4k-v1.png",
);
const originalOutputPath = path.join(
  outputDirectory,
  "supplier-catalog-veo3-fast-native-4k-v3-original.mp4",
);
const outputPath = path.join(
  outputDirectory,
  "supplier-catalog-veo3-fast-native-4k-v3.mp4",
);
const metadataPath = path.join(
  outputDirectory,
  "supplier-catalog-veo3-fast-native-4k-v3.json",
);

const prompt = `
Locked-off front-facing premium fashion SaaS interface animation. Only the horizontal product listing cards move. Create a dense three-row flow: pale grayscale cards on the left slide steadily right, reach the thin cobalt-blue vertical divider, cross it, and instantly transition to vivid full color exactly at the boundary, then continue only a short distance on the right. At least eight cards visibly cross during the clip. Keep cards tightly grouped around the divider and continuously repopulate the nearby left side with grayscale cards while colored cards leave the nearby right cluster.

Keep the divider perfectly static as one thin, straight, uninterrupted vertical blue line with rounded ends. Keep the white background, pale blue wave glow, product designs, card geometry, shadows, and abstract UI strokes fixed and sharp. Keep the camera locked with no pan, zoom, tilt, crop, or reframing. Preserve one divider only. Preserve the products without morphing. The final frame matches the starting composition for a seamless website loop.
`.trim();

const negativePrompt = [
  "badge",
  "icon",
  "logo",
  "circle on divider",
  "square on divider",
  "duplicate divider",
  "bent divider",
  "branching line",
  "people",
  "new objects",
  "camera movement",
  "zoom",
  "product morphing",
  "card warping",
  "text mutation",
  "flicker",
  "empty product flow",
  "large gaps between cards",
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
    .resize({ width: 3840, height: 2160, fit: "fill", kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.7, m1: 0.5, m2: 1.5 })
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
    note: "One approved paid attempt only. Do not resubmit automatically.",
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
        negativePrompt,
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

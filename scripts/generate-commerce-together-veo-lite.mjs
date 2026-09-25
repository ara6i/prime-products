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
const BACKGROUND_COLOR = "#fbf4ea";

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();
const backendEnvPath = path.resolve(
  projectRoot,
  "../primeStyleAI-backend/.env",
);
const outputDirectory = path.resolve(
  projectRoot,
  "public/media/partner-landing/merchant-network",
);
const artworkPath = path.join(
  outputDirectory,
  "commerce-together-editorial-wide.webp",
);
const sourcePath = path.join(
  outputDirectory,
  "commerce-together-editorial-wide-veo-source.png",
);
const originalOutputPath = path.join(
  outputDirectory,
  "commerce-together-editorial-veo-lite-1080p-original.mp4",
);
const outputPath = path.join(
  outputDirectory,
  "commerce-together-editorial-veo-lite-1080p.mp4",
);
const metadataPath = path.join(
  outputDirectory,
  "commerce-together-editorial-veo-lite-1080p.json",
);

const prompt = `
Animate this exact premium fashion-commerce editorial artwork with a completely locked camera. No pan, zoom, tilt, reframing, cropping, or camera shake. Preserve the warm ivory background, generous empty center, all four separated groups of adults, every person's identity and outfit, every garment, shopping bag, tablet, clothing rack, folded textile, shipping box, handheld gimbal, sweater, and every soft contact shadow. The central negative space must remain empty and visually quiet for live website headline text.

Use only subtle, realistic micro-movements for the four connected-commerce roles:
- Upper-left merchants: a tiny tablet swipe and glance, a small hanger or rack adjustment, and very gentle fabric movement.
- Upper-right customers: one or two slow natural steps, a brief glance at the phone, and a soft shopping-bag and clothing swing.
- Lower-left suppliers: a small garment handoff or inspection gesture while the folded textiles stay neatly stacked, the hanging garment moves slightly, and the shipping box remains stationary.
- Lower-right influencers: a tiny controlled gimbal lift or tilt while the presenter subtly turns and presents the sweater, with a slight natural sweater-hem sway.

Add only small breathing, blinking, head turns, and weight shifts. Keep everyone in their original area and preserve the exact number of people. Motion must be calm, refined, believable, and suitable behind website copy. The opening and ending composition should be nearly identical so the eight-second clip loops unobtrusively.

Do not add, remove, duplicate, replace, or relocate people or props. No new objects. No person crosses into the empty center. No morphing, face drift, identity change, wardrobe change, warped hands, extra fingers, distorted limbs, floating objects, sliding feet, broken physics, text, signs, logos, subtitles, watermarks, dialogue, or camera effects.
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

async function prepareSource() {
  if (!existsSync(artworkPath)) {
    throw new Error(`Missing source artwork: ${artworkPath}`);
  }

  await mkdir(outputDirectory, { recursive: true });
  await sharp(artworkPath)
    .resize({
      width: 1920,
      height: 1080,
      fit: "contain",
      background: BACKGROUND_COLOR,
      withoutEnlargement: false,
    })
    .png({ compressionLevel: 9 })
    .toFile(sourcePath);

  console.log(
    JSON.stringify({
      phase: "source-prepared",
      source: path.relative(projectRoot, sourcePath),
      width: 1920,
      height: 1080,
    }),
  );
}

async function verifyModel(ai) {
  const model = await ai.models.get({ model: MODEL });
  console.log(
    JSON.stringify({
      phase: "verified",
      model: model.name || MODEL,
      durationSeconds: DURATION_SECONDS,
      resolution: RESOLUTION,
      maximumCostUsd: MAX_GENERATION_COST_USD,
    }),
  );
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
        ...fields,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function refuseSecondAttempt() {
  const existing = [metadataPath, originalOutputPath, outputPath].filter(existsSync);
  if (existing.length > 0) {
    throw new Error(
      `Refusing a second paid attempt because a generation record already exists: ${existing.join(
        ", ",
      )}`,
    );
  }
}

async function stripAudioAndOptimize() {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    originalOutputPath,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

async function generate(ai) {
  refuseSecondAttempt();

  const reservedAt = new Date().toISOString();
  await writeMetadata({
    status: "submission-reserved",
    operation: null,
    reservedAt,
    note: "Do not submit again automatically. This file is the one-attempt cost lock.",
  });

  const imageBytes = readFileSync(sourcePath).toString("base64");
  let operation;
  try {
    operation = await ai.models.generateVideos({
      model: MODEL,
      prompt,
      image: {
        imageBytes,
        mimeType: "image/png",
      },
      config: {
        numberOfVideos: 1,
        durationSeconds: DURATION_SECONDS,
        aspectRatio: "16:9",
        resolution: RESOLUTION,
        personGeneration: "allow_adult",
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
  console.log(
    JSON.stringify({
      phase: "submitted",
      operation: operationName,
      model: MODEL,
      maximumCostUsd: MAX_GENERATION_COST_USD,
    }),
  );

  let poll = 0;
  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    operation = await ai.operations.getVideosOperation({ operation });
    poll += 1;
    if (poll === 1 || poll % 3 === 0 || operation.done) {
      await writeMetadata({
        status: operation.done ? "processed" : "processing",
        operation: operationName,
        reservedAt,
        poll,
        updatedAt: new Date().toISOString(),
      });
    }
    console.log(
      JSON.stringify({
        phase: "processing",
        poll,
        done: Boolean(operation.done),
      }),
    );
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
      status: "no-video-returned",
      operation: operationName,
      reservedAt,
      failedAt: new Date().toISOString(),
      filteredReasons: reasons,
      note: "No automatic retry was made.",
    });
    throw new Error(`Veo returned no video. ${reasons.join(" ")}`.trim());
  }

  await ai.files.download({
    file: generatedVideo,
    downloadPath: originalOutputPath,
  });
  await stripAudioAndOptimize();

  const completedAt = new Date().toISOString();
  await writeMetadata({
    status: "complete",
    operation: operationName,
    reservedAt,
    completedAt,
  });
  console.log(
    JSON.stringify({
      phase: "complete",
      operation: operationName,
      model: MODEL,
      output: path.relative(projectRoot, outputPath),
      completedAt,
    }),
  );
}

await prepareSource();
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

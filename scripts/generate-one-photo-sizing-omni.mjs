import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const MODEL = "gemini-omni-1.1-flash";
const DURATION = "8s";
const RESOLUTION = "720p";
const MAX_GENERATION_COST_USD = 0.8;
const currentSdkRequire = createRequire(
  "/tmp/primestyleai-omni-genai-sdk/package.json",
);
const { GoogleGenAI } = currentSdkRequire("@google/genai");

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
  "one-photo-sizing-european-omni-720p-v1.mp4",
);
const metadataPath = path.join(
  outputDirectory,
  "one-photo-sizing-european-omni-720p-v1.json",
);

const prompt = `
[# Sources <FIRST_FRAME>@Image1] Use Image1 as the exact immutable starting frame and exact layout reference.

Create one continuous, locked-camera, seamless 8-second fashion-sizing interface loop. Animate ONLY the photographic pixels strictly inside the five existing white rectangular close-up boxes. Every pixel outside those five box interiors must remain frozen and identical to Image1 in every frame.

The central full-body woman must remain a completely static photograph: no breathing, blinking, head motion, hand motion, hair motion, fabric motion, body motion, boot motion, camera motion, or lighting change on the central figure. The architectural background must remain completely static.

Keep all five white box borders, all five black label bars, all label text, all white hand-drawn arrows, and their positions perfectly static, continuously visible, sharp, and unchanged for the entire video. Never animate, brighten, pulse, glow, shine, redraw, fade, remove, distort, or move any border, label, or arrow. Preserve every label exactly: 1. SUNGLASSES · 52 MM; 2. BLAZER · S / EU 36; 3. GLOVES · SIZE 7; 4. JEANS · W27 / L31; 5. BOOTS · EU 39.

Animate only the imagery inside each box:
1. Sunglasses box: one restrained blink and a tiny realistic sunglasses adjustment.
2. Blazer box: subtle natural ivory-fabric movement at the lapel.
3. Gloves box: one small realistic finger flex in the burgundy glove.
4. Jeans box: a subtle natural waistband and denim shift.
5. Boots box: clearly visible but elegant ankle movement, with the burgundy boot making one small heel-to-toe adjustment and returning to its starting position.

The five box interiors must stay filled and visible in every frame. They may not fade, become translucent, disappear, transform into empty background, change size, or move. Motion must begin and end on the exact same interior images for a seamless loop.

No audio, dialogue, camera movement, zoom, scene change, new text, new graphics, new boxes, glow, light sweep, pulsing border, particles, watermark, or signature. Avoid changed identity, changed wardrobe, altered labels, misspelled text, moving arrows, moving central model, disappearing boxes, glowing panels, warped hands, duplicate limbs, or transformed garments.
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

function findVideoOutput(interaction) {
  if (interaction.output_video) return interaction.output_video;
  if (interaction.outputVideo) return interaction.outputVideo;

  const outputs = interaction.outputs || interaction.steps || [];
  const stack = [...outputs];
  while (stack.length) {
    const value = stack.shift();
    if (!value || typeof value !== "object") continue;
    if (value.type === "video" && (value.data || value.uri)) return value;
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) stack.push(...child);
      else if (child && typeof child === "object") stack.push(child);
    }
  }
  return null;
}

async function saveVideo(ai, videoOutput) {
  if (videoOutput.data) {
    await writeFile(outputPath, Buffer.from(videoOutput.data, "base64"));
    return;
  }

  if (!videoOutput.uri) {
    throw new Error("Omni returned a video without inline data or a URI.");
  }

  const match = videoOutput.uri.match(/files\/([^/:?]+)/);
  if (!match) throw new Error("Omni returned an unrecognized video URI.");
  const name = `files/${match[1]}`;

  while (true) {
    const file = await ai.files.get({ name });
    const state = file.state?.name || file.state;
    console.log(JSON.stringify({ phase: "processing", state }));
    if (state === "ACTIVE") break;
    if (state === "FAILED") throw new Error("Omni video processing failed.");
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }

  await ai.files.download({ file: videoOutput, downloadPath: outputPath });
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
      duration: DURATION,
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
      "Refusing to spend again because the Omni v1 output or metadata already exists.",
    );
  }

  const imageData = readFileSync(sourcePath).toString("base64");
  console.log(
    JSON.stringify({
      phase: "submitting",
      model: MODEL,
      duration: DURATION,
      resolution: RESOLUTION,
      maximumCostUsd: MAX_GENERATION_COST_USD,
    }),
  );

  const interaction = await ai.interactions.create({
    model: MODEL,
    input: [
      { type: "image", data: imageData, mime_type: "image/png" },
      { type: "text", text: prompt },
    ],
    response_format: {
      type: "video",
      aspect_ratio: "9:16",
      duration: DURATION,
      delivery: "uri",
    },
    generation_config: {
      video_config: { task: "image_to_video" },
    },
    background: false,
    store: true,
    stream: false,
  });

  const videoOutput = findVideoOutput(interaction);
  if (!videoOutput) {
    throw new Error(
      `Omni returned no video. Status: ${interaction.status || "unknown"}`,
    );
  }

  await mkdir(outputDirectory, { recursive: true });
  await saveVideo(ai, videoOutput);

  const metadata = {
    model: MODEL,
    duration: DURATION,
    resolution: RESOLUTION,
    aspectRatio: "9:16",
    maximumGenerationCostUsd: MAX_GENERATION_COST_USD,
    interactionId: interaction.id || null,
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

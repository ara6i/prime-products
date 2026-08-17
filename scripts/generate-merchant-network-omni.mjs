import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const MODEL = "gemini-omni-flash-preview";
const DURATION = "8s";
const RESOLUTION = "720p";
const MAX_GENERATION_COST_USD = 0.8;
const currentSdkRequire = createRequire(
  "/tmp/primestyleai-omni-genai-sdk/package.json",
);
const { GoogleGenAI } = currentSdkRequire("@google/genai");

const projectRoot = process.cwd();
const backendEnvPath = path.resolve(
  projectRoot,
  "../primeStyleAI-backend/.env",
);
const sourcePath = path.resolve(
  projectRoot,
  "public/media/partner-landing/merchant-network/merchant-network-people-logo-hero-v8-scattered-source.png",
);
const outputDirectory = path.resolve(
  projectRoot,
  "public/media/partner-landing/merchant-network",
);
const outputPath = path.join(
  outputDirectory,
  "merchant-network-people-logo-hero-v9-omni-flash-720p.mp4",
);
const metadataPath = path.join(
  outputDirectory,
  "merchant-network-people-logo-hero-v9-omni-flash-720p.json",
);

const prompt = `
[# Sources <FIRST_FRAME>@Image1] Use Image1 as the exact starting frame.

Create one continuous, unbroken, locked-camera 8-second shot with no cuts, pan, zoom, tilt, crop, or reframing. Animate only the adults and their carried objects. They walk naturally upward toward the two open entrances. Additional adults keep walking in from the bottom and far-right edges and join their matching colored groups, so scattered arrivals remain visible throughout.

The complete ivory floor INSIDE the blue building must stay perfectly empty in every frame. Nobody and nothing may cross either entrance threshold. Immediately before a person reaches an entrance, that person, their object, and their shadow smoothly disappear completely. Never show a person, head, body, prop, bag, cart, shadow, silhouette, or ghost inside the building. Never accumulate people at the top.

Keep the blue building perfectly rigid and identical. Preserve the warm background, four role colors, props, realistic 3D style, right-weighted composition, and large empty left side. End with approximately the starting crowd positions for a seamless loop. No text, words, letters, brand name, sign, title, caption, visible watermark, dialogue, headscarf, hijab, veil, new architecture, or scene change.
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

async function generate(ai) {
  if (existsSync(outputPath) || existsSync(metadataPath)) {
    throw new Error(
      "Refusing to spend again because the Omni output or metadata already exists.",
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
      aspect_ratio: "16:9",
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
    aspectRatio: "16:9",
    maximumGenerationCostUsd: MAX_GENERATION_COST_USD,
    interactionId: interaction.id || null,
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

if (process.argv.includes("--confirm-paid-generation")) {
  await generate(ai);
} else {
  console.log(
    JSON.stringify({
      phase: "dry-run",
      paidGenerationStarted: false,
      model: MODEL,
      duration: DURATION,
      resolution: RESOLUTION,
      maximumCostUsd: MAX_GENERATION_COST_USD,
      output: path.relative(projectRoot, outputPath),
      requiredFlag: "--confirm-paid-generation",
    }),
  );
}

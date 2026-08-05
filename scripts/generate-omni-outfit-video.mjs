import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MODEL = "gemini-omni-flash-preview";
const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";
const projectRoot = process.cwd();
const backendEnvPath = path.resolve(projectRoot, "../primeStyleAI-backend/.env");
const outputDirectory = path.resolve(projectRoot, "public/media/partner-landing");
const outputPath = path.join(outputDirectory, "creator-longhair-omni.mp4");
const metadataPath = path.join(outputDirectory, "creator-longhair-omni.json");

const referencePaths = [1, 2, 3, 4, 5].map((index) =>
  path.resolve(projectRoot, `public/images/ai-stylist/creator-longhair-outfit-${index}.png`),
);

const prompt = `
[# References <IMAGE_REF_0>@Image1 <IMAGE_REF_1>@Image2 <IMAGE_REF_2>@Image3 <IMAGE_REF_3>@Image4 <IMAGE_REF_4>@Image5]

Create a polished 10-second vertical 9:16 fashion creator reel featuring exactly the same adult woman shown in all five reference images. Preserve her facial identity, warm light-olive skin tone, long dark-brown wavy hair, orange hoop earrings, body proportions, and age consistently in every shot. Each reference is a distinct approved outfit: preserve the garment silhouettes, vivid colors, accessories, and footwear accurately.

[0-2s] Full-body editorial reveal in outfit <IMAGE_REF_0>. She takes one confident step toward camera against a bright cobalt-blue studio set.
[2-4s] A fluid half-turn creates a clean match cut into outfit <IMAGE_REF_1> against a soft lavender set; the pleated skirt moves naturally.
[4-6s] Match cut into outfit <IMAGE_REF_2> against a warm peach-and-tangerine geometric set; she makes a relaxed runway pivot.
[6-8s] Match cut into outfit <IMAGE_REF_3> against a fresh mint set; she adjusts the handbag and gives a subtle confident glance.
[8-10s] Match cut into outfit <IMAGE_REF_4> against a light sky-blue set; finish with a full-body hero pose and gentle skirt movement.

Premium photorealistic fashion campaign, crisp softbox lighting, natural fabric physics, clean modern happy colors, smooth camera movement, and polished creator energy. Keep the woman fully visible from the top of her hair to both shoes in every shot. Do not crop her feet. No extra people, no identity changes, no duplicate limbs, no warped hands, no garment changes within a shot, no text, no subtitles, no logos, and no dialogue. Add a light upbeat instrumental fashion beat. Use the given images as references for video generation; do not use them as literal initial frames.
`.trim();

function parseEnv(source) {
  const values = new Map();
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }
  return values;
}

async function getApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;

  const env = parseEnv(await readFile(backendEnvPath, "utf8"));
  const apiKey = env.get("GEMINI_API_KEY") || env.get("GOOGLE_API_KEY");
  if (!apiKey) throw new Error(`No Gemini API key found in ${backendEnvPath}`);
  return apiKey;
}

async function apiRequest(apiKey, endpoint, options = {}) {
  const separator = endpoint.includes("?") ? "&" : "?";
  const response = await fetch(`${API_ROOT}${endpoint}${separator}key=${encodeURIComponent(apiKey)}`, options);
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      detail = `${detail}: ${errorBody.error?.status || "API_ERROR"} ${errorBody.error?.message || ""}`.trim();
    } catch {
      // Keep the HTTP status when Google does not return JSON.
    }
    throw new Error(detail);
  }
  return response;
}

async function verifyModelAccess(apiKey) {
  const response = await apiRequest(apiKey, "/models");
  const data = await response.json();
  const available = data.models?.some((model) => model.name === `models/${MODEL}`) ?? false;
  console.log(JSON.stringify({ phase: "model-check", model: MODEL, available }));
  if (!available) throw new Error(`${MODEL} is not listed for the configured backend key.`);
}

function findVideoOutput(value) {
  if (!value || typeof value !== "object") return null;
  if (value.type === "video" && (value.uri || value.data)) return value;
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const entry of child) {
        const match = findVideoOutput(entry);
        if (match) return match;
      }
    } else if (child && typeof child === "object") {
      const match = findVideoOutput(child);
      if (match) return match;
    }
  }
  return null;
}

async function generateVideo(apiKey) {
  const images = await Promise.all(
    referencePaths.map(async (referencePath) => ({
      type: "image",
      data: (await readFile(referencePath)).toString("base64"),
      mime_type: "image/png",
    })),
  );

  console.log(JSON.stringify({ phase: "submit", model: MODEL, references: images.length, aspectRatio: "9:16" }));
  const response = await apiRequest(apiKey, "/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      input: [...images, { type: "text", text: prompt }],
      response_format: { type: "video", delivery: "uri", aspect_ratio: "9:16" },
      generation_config: { video_config: { task: "reference_to_video" } },
      background: false,
      stream: false,
    }),
  });
  const interaction = await response.json();
  const video = findVideoOutput(interaction);
  if (!video) {
    throw new Error(`Omni interaction ${interaction.id || "unknown"} returned no video output.`);
  }

  await mkdir(outputDirectory, { recursive: true });

  if (video.data) {
    await writeFile(outputPath, Buffer.from(video.data, "base64"));
  } else {
    const fileId = video.uri.match(/files\/([^/:?]+)/)?.[1];
    if (!fileId) throw new Error(`Could not resolve the Omni file ID from ${video.uri}`);

    for (let attempt = 1; attempt <= 120; attempt += 1) {
      const statusResponse = await apiRequest(apiKey, `/files/${fileId}`);
      const status = await statusResponse.json();
      console.log(JSON.stringify({ phase: "file-status", attempt, state: status.state || "UNKNOWN" }));
      if (status.state === "FAILED") throw new Error(`Omni output file ${fileId} failed processing.`);
      if (status.state === "ACTIVE") break;
      if (attempt === 120) throw new Error(`Timed out waiting for Omni output file ${fileId}.`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const downloadResponse = await apiRequest(apiKey, `/files/${fileId}:download?alt=media`);
    await writeFile(outputPath, Buffer.from(await downloadResponse.arrayBuffer()));
  }

  const metadata = {
    model: interaction.model || MODEL,
    interactionId: interaction.id || null,
    status: interaction.status || "completed",
    references: referencePaths.map((referencePath) => path.relative(projectRoot, referencePath)),
    output: path.relative(projectRoot, outputPath),
    createdAt: new Date().toISOString(),
  };
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ phase: "complete", ...metadata }));
}

const apiKey = await getApiKey();
await verifyModelAccess(apiKey);
if (!process.argv.includes("--verify-only")) await generateVideo(apiKey);

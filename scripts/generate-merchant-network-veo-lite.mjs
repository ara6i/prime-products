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
  "public/media/partner-landing/merchant-network/merchant-network-people-logo-hero-v8-scattered-source.png",
);
const outputDirectory = path.resolve(
  projectRoot,
  "public/media/partner-landing/merchant-network",
);
const outputPath = path.join(
  outputDirectory,
  "merchant-network-people-logo-hero-v8-veo-lite-1080p.mp4",
);
const metadataPath = path.join(
  outputDirectory,
  "merchant-network-people-logo-hero-v8-veo-lite-1080p.json",
);

const prompt = `
Animate this exact PrimeStyleAI merchant-network artwork as one realistic, premium commercial scene. Keep the elevated three-quarter isometric camera completely locked: no pan, no zoom, no tilt, no reframing, and no crop. The complete pointed top of the blue PrimeStyleAI building must remain visible with generous safe space above it for the entire video. The blue logo-shaped building stays perfectly rigid and unchanged as architecture.

The entire open ivory interior of the blue building is empty in the first frame and MUST remain completely empty in every frame. No person, head, body, prop, bag, cart, shadow, silhouette, or ghost may ever appear or remain inside the building. Adults approaching the two lower entrances dissolve smoothly to transparent over about half a second immediately BEFORE crossing either threshold. Their props and shadows dissolve with them. They do not walk into the interior and they never accumulate at the top.

All adults walk naturally and continuously upward along their existing four separated color lanes into the two open lower entrances of the building. Preserve every role and color exactly:
- light-blue suppliers roll the wholesale garment rack and carry apparel cartons, fabric rolls, and manifests;
- teal fashion merchants roll clothing racks and retail tables with folded denim and shirts while carrying tablets, POS tools, hangers, and apparel stock;
- orange creators carry cameras, gimbals, tripods, and the ring light;
- pink customers carry shopping bags.

Keep all of the scattered additional adults already visible around the lower and far-right edges. Throughout the clip, at least twelve loosely spaced incoming adults must remain visible outside the organized lanes. They walk naturally from the outer bottom and right edges toward the appropriate color group, then merge into the matching lane without cutting across another lane. New arrivals enter by walking in from beyond the frame, never by suddenly materializing. Preserve the four readable role lanes while maintaining the surrounding flow of independent arrivals.

Use believable walking cycles, weight transfer, arm swing, cloth movement, rolling wheels, gently swinging bags, consistent contact shadows, and correct object physics. Leaders disappear at the entrance boundary while replacements arrive from the outer edges, creating a continuous-flow composition suitable for endless website looping. Keep approximately the same overall crowd density and matching subject positions at the beginning and end so the loop restart is unobtrusive.

Preserve adult faces, limbs, clothing colors, props, garment shapes, building geometry, warm ivory background, and long soft shadows. No hijab, no headscarf, no veil, and no covered-hair styling; all women have visible natural hair. No words, labels, signs, UI, subtitles, logos beyond the building shape, dialogue, or camera effects.
`.trim();

const negativePrompt = [
  "cropped building tip",
  "cropped people",
  "camera movement",
  "zoom",
  "pan",
  "tilt",
  "building deformation",
  "logo deformation",
  "people walking backward",
  "people crossing between color lanes",
  "teleporting people",
  "appearing from nowhere",
  "crowd pileup",
  "person inside building",
  "people remaining inside building",
  "people accumulating at top",
  "shadow inside building",
  "prop inside building",
  "ghost person",
  "empty outer edges",
  "only four central lines",
  "sliding feet",
  "floating objects",
  "warped hands",
  "duplicate limbs",
  "headscarf",
  "hijab",
  "veil",
  "text",
  "watermark",
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
  if (!apiKey)
    throw new Error("The existing PrimeStyleAI Gemini API key is unavailable.");
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
    aspectRatio: "16:9",
    maximumGenerationCostUsd: MAX_GENERATION_COST_USD,
    operation: operation.name || null,
    source: path.relative(projectRoot, sourcePath),
    output: path.relative(projectRoot, outputPath),
    createdAt: new Date().toISOString(),
    prompt,
    negativePrompt,
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
      negativePrompt: undefined,
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

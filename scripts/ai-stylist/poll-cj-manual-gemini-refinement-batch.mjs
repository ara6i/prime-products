import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const ROOT = process.cwd();
const runDirArgument = process.argv
  .find((value) => value.startsWith("--run-dir="))
  ?.slice("--run-dir=".length);
const OUTPUT_DIR = path.resolve(
  ROOT,
  runDirArgument ||
    "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913/cj-manual-gemini-batch",
);
const JOB_PATH = path.join(OUTPUT_DIR, "job.json");
const REQUEST_MANIFEST_PATH = path.join(OUTPUT_DIR, "request-manifest.json");
const STATUS_PATH = path.join(OUTPUT_DIR, "status.json");
const RESULT_MANIFEST_PATH = path.join(OUTPUT_DIR, "result-manifest.json");
const RAW_DIR = path.join(OUTPUT_DIR, "raw");
const BACKEND_ENV_PATH = path.resolve(ROOT, "../primeStyleAI-backend/.env");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function parseEnvFile(raw) {
  const parsed = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
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
  if (!existsSync(BACKEND_ENV_PATH)) {
    throw new Error("Gemini environment file is unavailable.");
  }
  const env = parseEnvFile(readFileSync(BACKEND_ENV_PATH, "utf8"));
  const apiKey =
    env.SIZING_LAB_GEMINI_API_KEY ||
    env.TEST_LAB_GOOGLE_API_KEY ||
    env.TEST_LAB_GEMINI_API_KEY ||
    env.GEMINI_API_KEY ||
    env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is unavailable.");
  return apiKey;
}

function extensionForMime(mimeType = "") {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

const jobRecord = readJson(JOB_PATH);
const requestManifest = readJson(REQUEST_MANIFEST_PATH);
const ai = new GoogleGenAI({ apiKey: getApiKey() });
const batch = await ai.batches.get({ name: jobRecord.name });
const inlineResponses = batch.dest?.inlinedResponses || [];
const status = {
  checkedAt: new Date().toISOString(),
  name: batch.name,
  displayName: batch.displayName,
  model: batch.model || jobRecord.model,
  state: batch.state,
  createTime: batch.createTime,
  updateTime: batch.updateTime,
  endTime: batch.endTime,
  requestCount: requestManifest.requestCount,
  responseCount: inlineResponses.length,
  error: batch.error || null,
};
writeFileSync(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);

if (batch.state !== "JOB_STATE_SUCCEEDED") {
  console.log(JSON.stringify(status, null, 2));
  process.exitCode = batch.state === "JOB_STATE_FAILED" ? 1 : 0;
} else {
  if (inlineResponses.length !== requestManifest.requests.length) {
    throw new Error(
      `Completed batch returned ${inlineResponses.length} responses for ${requestManifest.requests.length} requests.`,
    );
  }

  mkdirSync(RAW_DIR, { recursive: true });
  const results = inlineResponses.map((item, position) => {
    const request = requestManifest.requests[position];
    const parts = item.response?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part) => part.inlineData?.data);
    const textPart = parts.find((part) => typeof part.text === "string");
    let outputPath = null;
    let outputMimeType = null;
    if (imagePart?.inlineData?.data) {
      outputMimeType = imagePart.inlineData.mimeType || "image/jpeg";
      const extension = extensionForMime(outputMimeType);
      const filename = `${String(request.index).padStart(2, "0")}-${request.productId}-gemini.${extension}`;
      const destination = path.join(RAW_DIR, filename);
      writeFileSync(destination, Buffer.from(imagePart.inlineData.data, "base64"));
      outputPath = path.relative(ROOT, destination);
    }
    return {
      index: request.index,
      productId: request.productId,
      sourcePath: request.localPath,
      sourceSha256: request.sourceSha256,
      outputPath,
      outputMimeType,
      text: textPart?.text || null,
      metadata: item.metadata || null,
      error: item.error || null,
    };
  });

  const resultManifest = {
    completedAt: new Date().toISOString(),
    localOnly: true,
    name: batch.name,
    model: batch.model || jobRecord.model,
    state: batch.state,
    requested: requestManifest.requests.length,
    withImage: results.filter((item) => item.outputPath).length,
    withError: results.filter((item) => item.error).length,
    results,
  };
  writeFileSync(
    RESULT_MANIFEST_PATH,
    `${JSON.stringify(resultManifest, null, 2)}\n`,
  );
  console.log(JSON.stringify(resultManifest, null, 2));
}

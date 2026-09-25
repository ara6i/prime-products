import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import sharp from "sharp";

const ROOT = process.cwd();
const MODE = process.argv[2] || "download-extract";
const PIPELINE = process.argv[3] || "core-pdp";
const BASE_DIR = path.join(
  ROOT,
  "output/reports/global-shop-nano-banana-v4-20260923",
  PIPELINE,
);
const JOBS_PATH = path.join(BASE_DIR, "jobs.json");
const RAW_DIR = path.join(BASE_DIR, "streamed-responses");
const OUTPUT_DIR = path.join(BASE_DIR, "candidates");
const STATUS_PATH = path.join(BASE_DIR, "streamed-extraction-status.json");
const BACKEND_ENV_PATH = path.resolve(ROOT, "../primeStyleAI-backend/.env");

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
  if (!existsSync(BACKEND_ENV_PATH)) throw new Error("Gemini environment file is unavailable.");
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

function getJobs() {
  if (!existsSync(JOBS_PATH)) throw new Error(`Missing jobs file: ${JOBS_PATH}`);
  return JSON.parse(readFileSync(JOBS_PATH, "utf8")).jobs || [];
}

async function downloadJob(job, index, apiKey) {
  mkdirSync(RAW_DIR, { recursive: true });
  const destination = path.join(
    RAW_DIR,
    `job-${String(index + 1).padStart(2, "0")}.json`,
  );
  if (existsSync(destination) && statSync(destination).size > 1024) {
    return { path: destination, bytes: statSync(destination).size, kept: true };
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${job.name}`,
    { headers: { "x-goog-api-key": apiKey } },
  );
  if (!response.ok || !response.body) {
    throw new Error(`Batch download failed (${response.status}): ${await response.text()}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
  return {
    path: destination,
    bytes: statSync(destination).size,
    kept: false,
    contentLength: response.headers.get("content-length"),
  };
}

async function extractJob(job, rawPath) {
  const filter = [
    "select(",
    "  (.[0] | length) >= 10",
    "  and (",
    '    (.[0][0] == "metadata" and .[0][1] == "output" and .[0][2] == "inlinedResponses" and .[0][3] == "inlinedResponses")',
    '    or (.[0][0] == "dest" and .[0][1] == "inlinedResponses")',
    "  )",
    '  and .[0][-2] == "inlineData"',
    '  and .[0][-1] == "data"',
    "  and (.[1] | type) == \"string\"",
    ") | .[1]",
  ].join(" ");
  const jq = spawn("/usr/bin/jq", ["--stream", "-r", filter, rawPath], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const exitPromise = new Promise((resolve, reject) => {
    jq.on("error", reject);
    jq.on("close", resolve);
  });
  let stderr = "";
  jq.stderr.setEncoding("utf8");
  jq.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const lines = readline.createInterface({ input: jq.stdout, crlfDelay: Infinity });
  const saved = [];
  let index = 0;
  for await (const line of lines) {
    if (!line) continue;
    const request = job.requests[index];
    if (!request) {
      jq.kill();
      throw new Error(`Batch response contains more images than the ${job.requests.length} requests.`);
    }
    const directory = path.join(OUTPUT_DIR, request.slug);
    const destination = path.join(directory, request.filename);
    mkdirSync(directory, { recursive: true });
    if (!existsSync(destination)) {
      await sharp(Buffer.from(line, "base64")).png().toFile(destination);
    }
    const metadata = await sharp(destination).metadata();
    saved.push({
      ...request,
      path: path.relative(ROOT, destination),
      width: metadata.width,
      height: metadata.height,
    });
    index += 1;
  }
  const exitCode = await exitPromise;
  if (exitCode !== 0) throw new Error(`jq extraction failed (${exitCode}): ${stderr}`);
  if (saved.length !== job.requests.length) {
    throw new Error(`Extracted ${saved.length}/${job.requests.length} images from ${job.name}.`);
  }
  return saved;
}

async function download() {
  const jobs = getJobs();
  const apiKey = getApiKey();
  const downloads = [];
  for (const [index, job] of jobs.entries()) {
    downloads.push(await downloadJob(job, index, apiKey));
  }
  console.log(
    JSON.stringify(
      {
        downloadedJobs: downloads.length,
        totalBytes: downloads.reduce((sum, item) => sum + item.bytes, 0),
        downloads: downloads.map((item) => ({
          ...item,
          path: path.relative(ROOT, item.path),
        })),
      },
      null,
      2,
    ),
  );
  return downloads;
}

async function status() {
  const jobs = getJobs();
  const apiKey = getApiKey();
  const statuses = [];
  for (const job of jobs) {
    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/${job.name}`,
    );
    url.searchParams.set(
      "fields",
      "name,done,error",
    );
    const response = await fetch(url, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (!response.ok) {
      throw new Error(`Batch status failed (${response.status}): ${await response.text()}`);
    }
    if (!response.body) throw new Error("Batch status response has no body.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let prefix = "";
    while (prefix.length < 512 * 1024) {
      const { done, value } = await reader.read();
      if (done) break;
      prefix += decoder.decode(value, { stream: true });
      if (/"state"\s*:\s*"[^"]+"/.test(prefix)) break;
    }
    await reader.cancel();
    const done = prefix.match(/"done"\s*:\s*(true|false)/)?.[1] === "true";
    const state = done ? "BATCH_STATE_SUCCEEDED" : "BATCH_STATE_RUNNING";
    const createTime = undefined;
    const updateTime = undefined;
    const endTime = undefined;
    const errorMessage = prefix.match(/"message"\s*:\s*"([^"]+)"/)?.[1];
    statuses.push({
      name: job.name,
      state,
      createTime,
      updateTime,
      endTime,
      error: errorMessage || null,
    });
  }
  console.log(JSON.stringify({ pipeline: PIPELINE, statuses }, null, 2));
}

async function extract({ removeRaw = false } = {}) {
  const jobs = getJobs();
  const results = [];
  for (const [index, job] of jobs.entries()) {
    const rawPath = path.join(
      RAW_DIR,
      `job-${String(index + 1).padStart(2, "0")}.json`,
    );
    if (!existsSync(rawPath)) throw new Error(`Missing streamed response: ${rawPath}`);
    const saved = await extractJob(job, rawPath);
    results.push({ name: job.name, saved });
    if (removeRaw) unlinkSync(rawPath);
  }
  const status = {
    extractedAt: new Date().toISOString(),
    pipeline: PIPELINE,
    jobCount: results.length,
    savedCount: results.reduce((sum, item) => sum + item.saved.length, 0),
    rawResponsesRemoved: removeRaw,
    jobs: results,
  };
  writeFileSync(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
  console.log(JSON.stringify(status, null, 2));
}

if (MODE === "status") {
  await status();
} else if (MODE === "download") {
  await download();
} else if (MODE === "extract") {
  await extract();
} else if (MODE === "download-extract") {
  await download();
  await extract({ removeRaw: true });
} else {
  throw new Error(`Unknown mode: ${MODE}`);
}

#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, appendFile, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const valueAfter = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const BASE_URL = valueAfter("--base-url", "http://127.0.0.1:3001");
const BUCKET = valueAfter("--bucket", process.env.PRIMESTYLE_WEAR_S3_BUCKET || "primestyleai-wear3d-921049726279-us-east-1");
const REGION = valueAfter("--region", process.env.PRIMESTYLE_WEAR_S3_REGION || "us-east-1");
const VERSION = valueAfter("--version", process.env.PRIMESTYLE_WEAR_ARTIFACT_VERSION || "wear-blender-canonical-v1-20260908");
const PREFIX = valueAfter("--prefix", `processed/${VERSION}`);
const LIMIT = Number(valueAfter("--limit", "0"));
const START_AFTER = valueAfter("--start-after", "");
const UPLOAD = args.has("--upload");
const MANIFEST_ONLY = args.has("--manifest-only");
const REQUIRED = [
  "front-2d.json",
  "side-2d.json",
  "model.glb",
  "scene.blend",
  "metadata.json",
  "render.png",
  "camera-yaw-left-12.png",
  "camera-yaw-right-12.png",
  "camera-pitch-up-6.png",
  "camera-roll-right-3.png",
  "camera-side-left-90.png",
  "camera-side-right-90.png",
];
const checkpointPath = path.join(ROOT, ".local-ml", "wear-side-selector", `${VERSION}-checkpoint.jsonl`);
const manifestPath = path.join(ROOT, ".local-ml", "wear-side-selector", `${VERSION}-artifact-manifest.jsonl`);

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function sha256(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function completedIds() {
  if (!(await exists(checkpointPath))) return new Set();
  const lines = (await readFile(checkpointPath, "utf8")).split("\n").filter(Boolean);
  return new Set(lines.flatMap((line) => {
    try {
      const row = JSON.parse(line);
      return row.ok === true && row.version === VERSION && (!UPLOAD || row.uploaded === true) ? [row.scanId] : [];
    } catch {
      return [];
    }
  }));
}

async function compactManifest() {
  if (!(await exists(manifestPath))) return 0;
  const records = new Map();
  for (const line of (await readFile(manifestPath, "utf8")).split("\n").filter(Boolean)) {
    const record = JSON.parse(line);
    if (record.version === VERSION && typeof record.scanId === "string") records.set(record.scanId, record);
  }
  const ordered = [...records.values()].sort((left, right) => left.scanId.localeCompare(right.scanId));
  await writeFile(manifestPath, ordered.map((record) => JSON.stringify(record)).join("\n") + (ordered.length ? "\n" : ""), { mode: 0o600 });
  return ordered.length;
}

function awsArgs(source, destination) {
  const output = ["s3", "cp", source, destination, "--region", REGION, "--only-show-errors"];
  if (process.env.PRIMESTYLE_WEAR_S3_PROFILE) output.push("--profile", process.env.PRIMESTYLE_WEAR_S3_PROFILE);
  return output;
}

async function upload(file, key) {
  await execFileAsync("aws", awsArgs(file, `s3://${BUCKET}/${key}`), {
    cwd: ROOT,
    timeout: 900_000,
    maxBuffer: 2 * 1024 * 1024,
  });
}

async function render(scanId) {
  const response = await fetch(`${BASE_URL}/api/try-on-test/sizing-lab/sdk-wear/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scanId }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `Blender failed for ${scanId}.`);
  return payload;
}

async function artifactManifest(scanId, rendered) {
  const directory = path.join(ROOT, ".local-ml", "wear-sdk-heldout", "blender", scanId.toLowerCase());
  const files = {};
  for (const name of REQUIRED) {
    const file = path.join(directory, name);
    if (!(await exists(file))) throw new Error(`Missing required artifact ${name} for ${scanId}.`);
    const info = await stat(file);
    files[name] = { bytes: info.size, sha256: await sha256(file), key: `${PREFIX}/people/${scanId}/${name}` };
  }
  const sourceDirectory = path.join(ROOT, ".local-ml", "wear-mesh-overlay", "dynamic-sources", scanId.toLowerCase());
  const sourceFiles = (await readdir(sourceDirectory)).filter((name) => /\.(?:ply\.gz|lnd)$/i.test(name));
  const source = {};
  for (const name of sourceFiles) {
    const file = path.join(sourceDirectory, name);
    source[name] = { bytes: (await stat(file)).size, sha256: await sha256(file) };
  }
  if (!Object.keys(source).some((name) => name.endsWith(".ply.gz"))) throw new Error(`Source PLY hash is unavailable for ${scanId}.`);
  return {
    schema: "wear-blender-s3-artifact-v1",
    version: VERSION,
    scanId,
    generatedAt: new Date().toISOString(),
    source,
    artifacts: files,
    proof: {
      generator: rendered.metadata?.generator,
      geometry: rendered.metadata?.geometry,
      truthBoundary: rendered.metadata?.truthBoundary,
    },
  };
}

async function main() {
  const catalogResponse = await fetch(`${BASE_URL}/api/try-on-test/wear-side-selector/candidates`, { cache: "no-store" });
  const catalog = await catalogResponse.json();
  if (!catalogResponse.ok || catalog.personCount !== 4324 || catalog.sourceRecordCount !== 4326 || catalog.excludedPersonCount !== 2) {
    throw new Error("Expected the frozen 4,324-of-4,326 WEAR catalog before batching.");
  }
  if (MANIFEST_ONLY) {
    const records = await compactManifest();
    if (UPLOAD && records) await upload(manifestPath, `${PREFIX}/artifact-manifest.jsonl`);
    process.stdout.write(JSON.stringify({ manifestOnly: true, records, uploaded: UPLOAD }) + "\n");
    return;
  }
  const completed = await completedIds();
  let people = catalog.people;
  if (START_AFTER) people = people.filter((person) => person.scanId.localeCompare(START_AFTER) > 0);
  people = people.filter((person) => !completed.has(person.scanId));
  if (LIMIT > 0) people = people.slice(0, LIMIT);
  process.stdout.write(JSON.stringify({
    version: VERSION,
    destination: `s3://${BUCKET}/${PREFIX}/`,
    upload: UPLOAD,
    catalogPeople: catalog.personCount,
    alreadyCompleted: completed.size,
    scheduled: people.length,
    exclusions: catalog.exclusions,
  }) + "\n");

  for (let index = 0; index < people.length; index += 1) {
    const { scanId } = people[index];
    try {
      const rendered = await render(scanId);
      const record = await artifactManifest(scanId, rendered);
      const localManifest = path.join(ROOT, ".local-ml", "wear-sdk-heldout", "blender", scanId.toLowerCase(), "artifact-manifest.json");
      await writeFile(localManifest, JSON.stringify(record, null, 2) + "\n", { mode: 0o600 });
      if (UPLOAD) {
        for (const [name, info] of Object.entries(record.artifacts)) {
          await upload(path.join(ROOT, ".local-ml", "wear-sdk-heldout", "blender", scanId.toLowerCase(), name), info.key);
        }
        await upload(localManifest, `${PREFIX}/people/${scanId}/artifact-manifest.json`);
      }
      await appendFile(manifestPath, JSON.stringify(record) + "\n", { mode: 0o600 });
      await appendFile(checkpointPath, JSON.stringify({
        ok: true,
        scanId,
        version: VERSION,
        uploaded: UPLOAD,
        completedAt: new Date().toISOString(),
      }) + "\n", { mode: 0o600 });
      process.stdout.write(`[${index + 1}/${people.length}] ${scanId} complete${UPLOAD ? " + uploaded" : ""}\n`);
    } catch (error) {
      await appendFile(checkpointPath, JSON.stringify({
        ok: false,
        scanId,
        version: VERSION,
        error: error instanceof Error ? error.message : String(error),
        failedAt: new Date().toISOString(),
      }) + "\n", { mode: 0o600 });
      process.stderr.write(`[${index + 1}/${people.length}] ${scanId} failed: ${error.message}\n`);
    }
  }
  await compactManifest();
  if (UPLOAD && await exists(manifestPath)) {
    await upload(manifestPath, `${PREFIX}/artifact-manifest.jsonl`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

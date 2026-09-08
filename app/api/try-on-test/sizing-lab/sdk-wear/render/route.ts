import { access, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import {
  loadWearSourceManifestRecord,
  loadWearSourcePair,
} from "@/app/api/try-on-test/wear-mesh-overlay/_lib/metricAsset";
import { wearSideCatalogPerson } from "@/app/api/try-on-test/wear-side-selector/_lib/catalog";
import { heldoutWearPerson } from "../_lib/heldout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const renderPromises = new Map<string, Promise<WearBlenderMetadata>>();
// A comparison reads artifact URLs after both render requests resolve. Keeping
// only two bodies allowed a third in-flight selection to prune one of those
// files between the JSON response and the browser fetch, producing a transient
// 404. Keep a small working set of recent comparison pairs instead.
const MAX_CACHED_BODIES = 24;
const PREBUILT_BUCKET = process.env.PRIMESTYLE_WEAR_S3_BUCKET ?? "primestyleai-wear3d-921049726279-us-east-1";
const PREBUILT_REGION = process.env.PRIMESTYLE_WEAR_S3_REGION ?? "us-east-1";
const PREBUILT_VERSION = process.env.PRIMESTYLE_WEAR_ARTIFACT_VERSION ?? "wear-blender-canonical-v1-20260908";

interface WearBlenderMetadata {
  scanId: string;
  source: string;
  truthBoundary: string;
  generator: { application: string; version: string; headless: boolean; pythonApi: boolean };
  geometry: { originalFaces: number; browserFaces: number; browserVertices: number };
  renderSchemaVersion: number;
  cameraCards: Array<{
    id: string;
    file: string;
    yawDeg: number;
    pitchDeg: number;
    rollDeg: number;
    lensMm: number;
    projection: string;
    knownTransform: boolean;
  }>;
}

const CAMERA_FILES = [
  "render.png",
  "camera-yaw-left-12.png",
  "camera-yaw-right-12.png",
  "camera-pitch-up-6.png",
  "camera-roll-right-3.png",
  "camera-side-left-90.png",
  "camera-side-right-90.png",
] as const;

function outputDirectory(scanId: string) {
  return path.join(process.cwd(), ".local-ml", "wear-sdk-heldout", "blender", scanId.toLowerCase());
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function cachedMetadata(scanId: string) {
  const directory = outputDirectory(scanId);
  const required = ["model.glb", "scene.blend", "metadata.json", "front-2d.json", "side-2d.json", ...CAMERA_FILES];
  if (!(await Promise.all(required.map((name) => exists(path.join(directory, name))))).every(Boolean)) return null;
  try {
    const metadata = JSON.parse(await readFile(path.join(directory, "metadata.json"), "utf8")) as WearBlenderMetadata;
    return metadata.scanId === scanId
      && metadata.generator?.application === "Blender"
      && metadata.generator.headless
      && metadata.renderSchemaVersion === 8
      && metadata.cameraCards?.every((card) => card.knownTransform)
      ? metadata
      : null;
  } catch {
    return null;
  }
}

async function restorePrebuiltArtifact(scanId: string) {
  if (process.env.PRIMESTYLE_WEAR_USE_PREBUILT_S3 !== "1") return null;
  const temporaryDirectory = path.join(
    process.cwd(),
    ".local-ml",
    "wear-sdk-heldout",
    "s3-restore",
    `${scanId.toLowerCase()}-${process.pid}-${Date.now()}`,
  );
  const prefix = `s3://${PREBUILT_BUCKET}/processed/${PREBUILT_VERSION}/people/${scanId}`;
  const aws = (source: string, destination: string) => {
    const args = ["s3", "cp", source, destination, "--region", PREBUILT_REGION, "--only-show-errors"];
    if (process.env.PRIMESTYLE_WEAR_S3_PROFILE) args.push("--profile", process.env.PRIMESTYLE_WEAR_S3_PROFILE);
    return args;
  };
  await mkdir(temporaryDirectory, { recursive: true });
  try {
    const manifestFile = path.join(temporaryDirectory, "artifact-manifest.json");
    try {
      await execFileAsync("aws", aws(`${prefix}/artifact-manifest.json`, manifestFile), {
        cwd: process.cwd(), timeout: 120_000, maxBuffer: 2 * 1024 * 1024,
      });
    } catch {
      return null;
    }
    const manifest = JSON.parse(await readFile(manifestFile, "utf8")) as {
      schema?: string;
      version?: string;
      scanId?: string;
      artifacts?: Record<string, { sha256?: string }>;
    };
    if (manifest.schema !== "wear-blender-s3-artifact-v1" || manifest.version !== PREBUILT_VERSION || manifest.scanId !== scanId) {
      throw new Error(`Prebuilt artifact manifest is invalid for ${scanId}.`);
    }
    const required = ["model.glb", "scene.blend", "metadata.json", "front-2d.json", "side-2d.json", ...CAMERA_FILES];
    for (const name of required) {
      const expected = manifest.artifacts?.[name]?.sha256;
      if (!expected) throw new Error(`Prebuilt checksum is missing for ${scanId}/${name}.`);
      const destination = path.join(temporaryDirectory, name);
      await execFileAsync("aws", aws(`${prefix}/${name}`, destination), {
        cwd: process.cwd(), timeout: 900_000, maxBuffer: 2 * 1024 * 1024,
      });
      const actual = createHash("sha256").update(await readFile(destination)).digest("hex");
      if (actual !== expected) throw new Error(`Prebuilt checksum failed for ${scanId}/${name}.`);
    }
    const finalDirectory = outputDirectory(scanId);
    await mkdir(finalDirectory, { recursive: true });
    await Promise.all(required.map((name) => copyFile(path.join(temporaryDirectory, name), path.join(finalDirectory, name))));
    return cachedMetadata(scanId);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function blenderBinary() {
  const candidates = [
    process.env.PRIMESTYLE_BLENDER_BIN,
    "/Applications/Blender.app/Contents/MacOS/Blender",
    "/usr/local/bin/blender",
    "/usr/bin/blender",
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return "blender";
}

async function pruneWearBlenderCache(currentScanId: string) {
  const cacheRoot = path.join(process.cwd(), ".local-ml", "wear-sdk-heldout", "blender");
  const protectedDirectories = new Set(
    [currentScanId, ...renderPromises.keys()].map((scanId) => scanId.toLowerCase()),
  );
  const entries = await readdir(cacheRoot, { withFileTypes: true });
  const candidates = await Promise.all(entries
    .filter((entry) => entry.isDirectory() && !protectedDirectories.has(entry.name))
    .map(async (entry) => ({
      name: entry.name,
      modified: (await stat(path.join(cacheRoot, entry.name))).mtimeMs,
    })));
  const unprotectedToKeep = Math.max(0, MAX_CACHED_BODIES - protectedDirectories.size);
  candidates.sort((left, right) => right.modified - left.modified);
  await Promise.all(candidates.slice(unprotectedToKeep).map((entry) => (
    rm(path.join(cacheRoot, entry.name), { recursive: true, force: true })
  )));
}

async function renderWearScan(scanId: string, heightCm: number, weightKg: number) {
  const cached = await cachedMetadata(scanId);
  if (cached) return cached;
  const restored = await restorePrebuiltArtifact(scanId);
  if (restored) return restored;
  if (process.env.PRIMESTYLE_WEAR_REQUIRE_PREBUILT_S3 === "1") {
    throw new Error(`The prebuilt S3 mesh artifact is not ready for ${scanId} yet.`);
  }

  const root = process.cwd();
  const source = await loadWearSourcePair(scanId);
  const finalDirectory = outputDirectory(scanId);
  const temporaryDirectory = path.join(
    root,
    ".local-ml",
    "wear-sdk-heldout",
    "blender-tmp",
    `${scanId.toLowerCase()}-${process.pid}-${Date.now()}`,
  );
  await mkdir(temporaryDirectory, { recursive: true });
  try {
    const sourceRecord = await loadWearSourceManifestRecord(scanId);
    if (!sourceRecord) throw new Error(`Source manifest record is missing for ${scanId}.`);
    const teacherRecordPath = path.join(temporaryDirectory, "teacher-record.json");
    const originalSource = sourceRecord.source && typeof sourceRecord.source === "object"
      ? sourceRecord.source as Record<string, unknown>
      : {};
    await writeFile(teacherRecordPath, JSON.stringify({
      ...sourceRecord,
      source: {
        ...originalSource,
        mesh: source.meshPath,
        landmarks: source.landmarkPath,
      },
    }));
    await execFileAsync(
      await blenderBinary(),
      [
        "--background",
        "--factory-startup",
        "--python",
        path.join(root, "scripts", "local-ml", "render_sdk_wear_blender.py"),
        "--",
        "--scan-id",
        scanId,
        "--mesh-gz",
        source.meshPath,
        "--landmarks",
        source.landmarkPath,
        "--teacher-record",
        teacherRecordPath,
        "--height-cm",
        String(heightCm),
        "--weight-kg",
        String(weightKg),
        "--output-dir",
        temporaryDirectory,
      ],
      { cwd: root, timeout: 600_000, maxBuffer: 4 * 1024 * 1024 },
    );
    const metadata = JSON.parse(await readFile(path.join(temporaryDirectory, "metadata.json"), "utf8")) as WearBlenderMetadata;
    if (metadata.scanId !== scanId || metadata.generator?.application !== "Blender" || metadata.generator.headless !== true) {
      throw new Error("The generated artifacts did not prove headless Blender use.");
    }
    await mkdir(finalDirectory, { recursive: true });
    await Promise.all(["model.glb", "scene.blend", "metadata.json", "front-2d.json", "side-2d.json", ...CAMERA_FILES].map((name) => (
      copyFile(path.join(temporaryDirectory, name), path.join(finalDirectory, name))
    )));
    await pruneWearBlenderCache(scanId).catch((error) => {
      console.warn("Could not prune the generated WEAR Blender cache.", error);
    });
    return metadata;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export async function POST(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "WEAR Blender rendering is private Test Lab only." }, { status: 403 });
  }
  try {
    const body = await request.json() as { scanId?: unknown };
    const scanId = typeof body.scanId === "string" ? body.scanId.toUpperCase() : "";
    const person = await heldoutWearPerson(scanId) ?? await wearSideCatalogPerson(scanId);
    if (!person) return NextResponse.json({ error: "Choose a valid WEAR standing scan." }, { status: 404 });

    const cached = await cachedMetadata(scanId);
    let promise = renderPromises.get(scanId);
    if (!cached && !promise) {
      promise = renderWearScan(scanId, person.heightCm, person.weightKg).finally(() => renderPromises.delete(scanId));
      renderPromises.set(scanId, promise);
    }
    const metadata = cached ?? await promise!;
    const revision = Date.now();
    const base = `/api/try-on-test/sizing-lab/sdk-wear/artifact?scanId=${encodeURIComponent(scanId)}`;
    return NextResponse.json({
      ok: true,
      cached: Boolean(cached),
      metadata,
      artifacts: {
        glbUrl: `${base}&kind=glb&v=${revision}`,
        pngUrl: `${base}&kind=png&v=${revision}`,
        blendUrl: `${base}&kind=blend&v=${revision}`,
        front2dUrl: `${base}&kind=front-2d&v=${revision}`,
        side2dUrl: `${base}&kind=side-2d&v=${revision}`,
        cameraCards: Object.fromEntries(metadata.cameraCards.map((card) => [
          card.id,
          `${base}&kind=${encodeURIComponent(`camera-${card.id}`)}&v=${revision}`,
        ])),
      },
    });
  } catch (error) {
    console.error("[sdk-wear] Blender render failed", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Blender could not render this WEAR scan.",
    }, { status: 500 });
  }
}

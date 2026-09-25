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
type RenderProfile = "full" | "browser-comparison";

const renderPromises = new Map<string, Promise<WearBlenderMetadata>>();
// A comparison reads artifact URLs after both render requests resolve. Keeping
// only two bodies allowed a third in-flight selection to prune one of those
// files between the JSON response and the browser fetch, producing a transient
// 404. Keep a small working set of recent comparison pairs instead.
const MAX_CACHED_BODIES = 14;
const PREBUILT_BUCKET = process.env.PRIMESTYLE_WEAR_S3_BUCKET ?? "primestyleai-wear3d-921049726279-us-east-1";
const PREBUILT_REGION = process.env.PRIMESTYLE_WEAR_S3_REGION ?? "us-east-1";
const PREBUILT_VERSION = process.env.PRIMESTYLE_WEAR_CROSS_SECTION_ARTIFACT_VERSION
  ?? "wear-blender-cross-sections-v2-20260921";
const COMPARISON_PREBUILT_VERSION = process.env.PRIMESTYLE_WEAR_COMPARISON_ARTIFACT_VERSION
  ?? "wear-blender-browser-comparison-v1-20260921";

interface WearBlenderMetadata {
  scanId: string;
  source: string;
  truthBoundary: string;
  generator: { application: string; version: string; headless: boolean; pythonApi: boolean };
  renderProfile?: RenderProfile;
  geometry: { originalFaces: number; browserFaces: number; browserVertices: number };
  renderSchemaVersion: number;
  crossSections?: Array<{
    row: "waist" | "hips";
    heightCm: number;
    straightABWidthCm: number;
    frontCurvedABCm: number;
    backCurvedBACm: number;
    meshCircumferenceCm: number;
    pointA: number[];
    pointB: number[];
    loopPointCount: number;
    source: string;
  }>;
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

function outputDirectory(scanId: string, profile: RenderProfile) {
  const directory = profile === "browser-comparison" ? "blender-comparison" : "blender";
  return path.join(process.cwd(), ".local-ml", "wear-sdk-heldout", directory, scanId.toLowerCase());
}

function artifactVersion(profile: RenderProfile) {
  return profile === "browser-comparison" ? COMPARISON_PREBUILT_VERSION : PREBUILT_VERSION;
}

function requiredFiles(profile: RenderProfile): readonly string[] {
  return profile === "browser-comparison"
    ? ["model.glb", "metadata.json"]
    : ["model.glb", "scene.blend", "metadata.json", "front-2d.json", "side-2d.json", ...CAMERA_FILES];
}

function awsCopyArguments(source: string, destination: string) {
  const args = ["s3", "cp", source, destination, "--region", PREBUILT_REGION, "--only-show-errors"];
  if (process.env.PRIMESTYLE_WEAR_S3_PROFILE) args.push("--profile", process.env.PRIMESTYLE_WEAR_S3_PROFILE);
  return args;
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function cachedMetadata(scanId: string, profile: RenderProfile) {
  const directory = outputDirectory(scanId, profile);
  const required = requiredFiles(profile);
  if (!(await Promise.all(required.map((name) => exists(path.join(directory, name))))).every(Boolean)) return null;
  try {
    const metadata = JSON.parse(await readFile(path.join(directory, "metadata.json"), "utf8")) as WearBlenderMetadata;
    const profileMatches = profile === "browser-comparison"
      ? metadata.renderProfile === "browser-comparison"
      : metadata.renderProfile == null || metadata.renderProfile === "full";
    return metadata.scanId === scanId
      && metadata.generator?.application === "Blender"
      && metadata.generator.headless
      && metadata.renderSchemaVersion === 10
      && metadata.crossSections?.length === 2
      && profileMatches
      && (profile === "browser-comparison" || metadata.cameraCards?.every((card) => card.knownTransform))
      ? metadata
      : null;
  } catch {
    return null;
  }
}

async function restorePrebuiltArtifact(scanId: string, profile: RenderProfile) {
  // The verified private S3 package is the normal web-host source. Set the
  // variable to 0 only on a workstation that intentionally rebuilds in Blender.
  if (process.env.PRIMESTYLE_WEAR_USE_PREBUILT_S3 === "0") return null;
  const temporaryDirectory = path.join(
    process.cwd(),
    ".local-ml",
    "wear-sdk-heldout",
    "s3-restore",
    `${scanId.toLowerCase()}-${process.pid}-${Date.now()}`,
  );
  const version = artifactVersion(profile);
  const prefix = `s3://${PREBUILT_BUCKET}/processed/${version}/people/${scanId}`;
  await mkdir(temporaryDirectory, { recursive: true });
  try {
    const manifestFile = path.join(temporaryDirectory, "artifact-manifest.json");
    try {
      await execFileAsync("aws", awsCopyArguments(`${prefix}/artifact-manifest.json`, manifestFile), {
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
    if (manifest.schema !== "wear-blender-s3-artifact-v1" || manifest.version !== version || manifest.scanId !== scanId) {
      throw new Error(`Prebuilt artifact manifest is invalid for ${scanId}.`);
    }
    const required = requiredFiles(profile);
    await Promise.all(required.map(async (name) => {
      const expected = manifest.artifacts?.[name]?.sha256;
      if (!expected) throw new Error(`Prebuilt checksum is missing for ${scanId}/${name}.`);
      const destination = path.join(temporaryDirectory, name);
      await execFileAsync("aws", awsCopyArguments(`${prefix}/${name}`, destination), {
        cwd: process.cwd(), timeout: 900_000, maxBuffer: 2 * 1024 * 1024,
      });
      const actual = createHash("sha256").update(await readFile(destination)).digest("hex");
      if (actual !== expected) throw new Error(`Prebuilt checksum failed for ${scanId}/${name}.`);
    }));
    const finalDirectory = outputDirectory(scanId, profile);
    await mkdir(finalDirectory, { recursive: true });
    await Promise.all(required.map((name) => copyFile(path.join(temporaryDirectory, name), path.join(finalDirectory, name))));
    return cachedMetadata(scanId, profile);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function persistGeneratedArtifact(scanId: string, directory: string, profile: RenderProfile) {
  if (process.env.PRIMESTYLE_WEAR_PERSIST_GENERATED_S3 === "0") return;
  const required = requiredFiles(profile);
  const version = artifactVersion(profile);
  const artifacts: Record<string, { bytes: number; sha256: string; key: string }> = {};
  for (const name of required) {
    const filePath = path.join(directory, name);
    const file = await readFile(filePath);
    artifacts[name] = {
      bytes: file.length,
      sha256: createHash("sha256").update(file).digest("hex"),
      key: `processed/${version}/people/${scanId}/${name}`,
    };
  }
  const manifestPath = path.join(directory, "artifact-manifest.json");
  await writeFile(manifestPath, JSON.stringify({
    schema: "wear-blender-s3-artifact-v1",
    version,
    scanId,
    generatedAt: new Date().toISOString(),
    artifacts,
  }));
  for (const [name, artifact] of Object.entries({
    ...Object.fromEntries(required.map((name) => [name, artifacts[name]!])),
    "artifact-manifest.json": { key: `processed/${version}/people/${scanId}/artifact-manifest.json` },
  })) {
    await execFileAsync("aws", awsCopyArguments(path.join(directory, name), `s3://${PREBUILT_BUCKET}/${artifact.key}`), {
      cwd: process.cwd(), timeout: 900_000, maxBuffer: 2 * 1024 * 1024,
    });
  }
}

async function reuseFullArtifactForComparison(scanId: string) {
  const fullMetadata = await cachedMetadata(scanId, "full")
    ?? await restorePrebuiltArtifact(scanId, "full");
  if (!fullMetadata) return null;

  const sourceDirectory = outputDirectory(scanId, "full");
  const comparisonDirectory = outputDirectory(scanId, "browser-comparison");
  await mkdir(comparisonDirectory, { recursive: true });
  await copyFile(path.join(sourceDirectory, "model.glb"), path.join(comparisonDirectory, "model.glb"));
  await writeFile(path.join(comparisonDirectory, "metadata.json"), JSON.stringify({
    ...fullMetadata,
    renderProfile: "browser-comparison",
    cameraCards: [],
  }, null, 2));
  await persistGeneratedArtifact(scanId, comparisonDirectory, "browser-comparison").catch((error) => {
    console.warn(`Could not save the reused ${scanId} comparison package to S3.`, error);
  });
  return cachedMetadata(scanId, "browser-comparison");
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

async function pruneWearBlenderCache(currentScanId: string, profile: RenderProfile) {
  const directory = profile === "browser-comparison" ? "blender-comparison" : "blender";
  const cacheRoot = path.join(process.cwd(), ".local-ml", "wear-sdk-heldout", directory);
  const protectedDirectories = new Set(
    [currentScanId, ...[...renderPromises.keys()]
      .filter((key) => key.startsWith(`${profile}:`))
      .map((key) => key.slice(profile.length + 1))]
      .map((scanId) => scanId.toLowerCase()),
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

async function renderWearScan(scanId: string, heightCm: number, weightKg: number, profile: RenderProfile) {
  const cached = await cachedMetadata(scanId, profile);
  if (cached) return cached;
  const restored = await restorePrebuiltArtifact(scanId, profile);
  if (restored) return restored;
  if (profile === "browser-comparison") {
    const reused = await reuseFullArtifactForComparison(scanId);
    if (reused) return reused;
  }
  if (process.env.PRIMESTYLE_WEAR_REQUIRE_PREBUILT_S3 === "1") {
    throw new Error(`The prebuilt S3 mesh artifact is not ready for ${scanId} yet.`);
  }

  const root = process.cwd();
  const source = await loadWearSourcePair(scanId);
  const finalDirectory = outputDirectory(scanId, profile);
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
    const blenderResult = await execFileAsync(
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
        "--render-profile",
        profile,
      ],
      { cwd: root, timeout: 600_000, maxBuffer: 4 * 1024 * 1024 },
    );
    const metadataPath = path.join(temporaryDirectory, "metadata.json");
    if (!(await exists(metadataPath))) {
      const blenderOutput = `${blenderResult.stderr}\n${blenderResult.stdout}`;
      const closedSectionFailure = blenderOutput.match(
        /No closed torso cross-section was found for (waist|hips) at ([0-9.]+) cm\./,
      );
      if (closedSectionFailure) {
        const [, row, height] = closedSectionFailure;
        throw new Error(
          `${scanId} cannot be shown because its real mesh has no complete closed ${row} curve at the recorded ${height} cm level.`,
        );
      }
      throw new Error(`${scanId} did not produce a complete Blender browser body.`);
    }
    const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as WearBlenderMetadata;
    if (metadata.scanId !== scanId || metadata.generator?.application !== "Blender" || metadata.generator.headless !== true) {
      throw new Error("The generated artifacts did not prove headless Blender use.");
    }
    await mkdir(finalDirectory, { recursive: true });
    await Promise.all(requiredFiles(profile).map((name) => (
      copyFile(path.join(temporaryDirectory, name), path.join(finalDirectory, name))
    )));
    await persistGeneratedArtifact(scanId, finalDirectory, profile).catch((error) => {
      console.warn(`Could not save the generated ${scanId} Blender package to S3.`, error);
    });
    await pruneWearBlenderCache(scanId, profile).catch((error) => {
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
    const body = await request.json() as { scanId?: unknown; profile?: unknown };
    const scanId = typeof body.scanId === "string" ? body.scanId.toUpperCase() : "";
    const profile: RenderProfile = body.profile === "browser-comparison" ? "browser-comparison" : "full";
    const person = await heldoutWearPerson(scanId) ?? await wearSideCatalogPerson(scanId);
    if (!person) return NextResponse.json({ error: "Choose a valid WEAR standing scan." }, { status: 404 });

    const promiseKey = `${profile}:${scanId}`;
    const cached = await cachedMetadata(scanId, profile);
    let promise = renderPromises.get(promiseKey);
    if (!cached && !promise) {
      promise = renderWearScan(scanId, person.heightCm, person.weightKg, profile).finally(() => renderPromises.delete(promiseKey));
      renderPromises.set(promiseKey, promise);
    }
    const metadata = cached ?? await promise!;
    const revision = Date.now();
    const base = `/api/try-on-test/sizing-lab/sdk-wear/artifact?scanId=${encodeURIComponent(scanId)}&profile=${profile}`;
    return NextResponse.json({
      ok: true,
      cached: Boolean(cached),
      metadata,
      artifacts: {
        glbUrl: `${base}&kind=glb&v=${revision}`,
        pngUrl: profile === "full" ? `${base}&kind=png&v=${revision}` : undefined,
        blendUrl: profile === "full" ? `${base}&kind=blend&v=${revision}` : undefined,
        front2dUrl: profile === "full" ? `${base}&kind=front-2d&v=${revision}` : undefined,
        side2dUrl: profile === "full" ? `${base}&kind=side-2d&v=${revision}` : undefined,
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

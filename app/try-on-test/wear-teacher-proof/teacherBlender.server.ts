import "server-only";

import { access, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { loadWearSourcePair } from "@/app/api/try-on-test/wear-mesh-overlay/_lib/metricAsset";
import { getTeacherProofPerson } from "./teacherProof.server";
import type { TeacherBlenderMetadata, TeacherBlenderResponse } from "./teacherProof.types";

const execFileAsync = promisify(execFile);
const renderPromises = new Map<string, Promise<TeacherBlenderMetadata>>();
const MAX_CACHED_RAW_BODIES = 2;
const SOURCE_MANIFEST = path.join(
  ".local-ml",
  "wear3d-v6-audit",
  "source-manifest-standing-a.jsonl",
);

export const TEACHER_CAMERA_FILES = [
  "render.png",
  "camera-yaw-left-12.png",
  "camera-yaw-right-12.png",
  "camera-pitch-up-6.png",
  "camera-roll-right-3.png",
] as const;

export function teacherBlenderDirectory(scanId: string) {
  return path.join(
    process.cwd(),
    ".local-ml",
    "wear-teacher-proof",
    "blender",
    scanId.toLowerCase(),
  );
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
  const directory = teacherBlenderDirectory(scanId);
  const required = ["model.glb", "scene.blend", "metadata.json", ...TEACHER_CAMERA_FILES];
  if (!(await Promise.all(required.map((name) => exists(path.join(directory, name))))).every(Boolean)) return null;
  try {
    const metadata = JSON.parse(await readFile(path.join(directory, "metadata.json"), "utf8")) as TeacherBlenderMetadata;
    return metadata.scanId === scanId
      && metadata.generator?.application === "Blender"
      && metadata.generator.headless === true
      && metadata.renderSchemaVersion === 4
      && metadata.cameraCards?.every((card) => card.knownTransform)
      ? metadata
      : null;
  } catch {
    return null;
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

async function pruneTeacherBlenderCache(currentScanId: string) {
  const cacheRoot = path.join(process.cwd(), ".local-ml", "wear-teacher-proof", "blender");
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
  const unprotectedToKeep = Math.max(0, MAX_CACHED_RAW_BODIES - protectedDirectories.size);
  candidates.sort((left, right) => right.modified - left.modified);
  await Promise.all(candidates.slice(unprotectedToKeep).map((entry) => (
    rm(path.join(cacheRoot, entry.name), { recursive: true, force: true })
  )));
}

async function buildTeacherBlenderScan(scanId: string, heightCm: number, weightKg: number) {
  const cached = await cachedMetadata(scanId);
  if (cached) return cached;

  const root = process.cwd();
  const source = await loadWearSourcePair(scanId);
  const finalDirectory = teacherBlenderDirectory(scanId);
  const temporaryDirectory = path.join(
    root,
    ".local-ml",
    "wear-teacher-proof",
    "blender-tmp",
    `${scanId.toLowerCase()}-${process.pid}-${Date.now()}`,
  );
  await mkdir(temporaryDirectory, { recursive: true });
  try {
    const sourceRecord = (await readFile(path.join(root, SOURCE_MANIFEST), "utf8"))
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((record) => record.scan_id === scanId);
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
    const execution = await execFileAsync(
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
    const metadataPath = path.join(temporaryDirectory, "metadata.json");
    if (!(await exists(metadataPath))) {
      const diagnostic = [execution.stderr, execution.stdout]
        .filter(Boolean)
        .join("\n")
        .slice(-4000)
        .trim();
      throw new Error(
        `Blender exited without metadata for ${scanId}.${diagnostic ? `\n${diagnostic}` : ""}`,
      );
    }
    const metadata = JSON.parse(
      await readFile(metadataPath, "utf8"),
    ) as TeacherBlenderMetadata;
    if (
      metadata.scanId !== scanId
      || metadata.generator?.application !== "Blender"
      || metadata.generator.headless !== true
    ) {
      throw new Error("The generated teacher artifacts did not prove headless Blender use.");
    }
    await mkdir(finalDirectory, { recursive: true });
    await Promise.all(["model.glb", "scene.blend", "metadata.json", ...TEACHER_CAMERA_FILES].map((name) => (
      copyFile(path.join(temporaryDirectory, name), path.join(finalDirectory, name))
    )));
    await pruneTeacherBlenderCache(scanId).catch((error) => {
      console.warn("Could not prune the generated WEAR teacher Blender cache.", error);
    });
    return metadata;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export async function renderTeacherBlenderScan(scanId: string): Promise<TeacherBlenderResponse | null> {
  const person = await getTeacherProofPerson(scanId);
  if (!person) return null;
  const cached = await cachedMetadata(scanId);
  let promise = renderPromises.get(scanId);
  if (!cached && !promise) {
    promise = buildTeacherBlenderScan(scanId, person.heightCm, person.weightKg)
      .finally(() => renderPromises.delete(scanId));
    renderPromises.set(scanId, promise);
  }
  const metadata = cached ?? await promise!;
  const revision = Date.now();
  const base = `/api/try-on-test/wear-teacher-proof/artifact?scanId=${encodeURIComponent(scanId)}`;
  return {
    ok: true,
    cached: Boolean(cached),
    metadata,
    artifacts: {
      glbUrl: `${base}&kind=glb&v=${revision}`,
      pngUrl: `${base}&kind=png&v=${revision}`,
      blendUrl: `${base}&kind=blend&v=${revision}`,
      cameraCards: Object.fromEntries(metadata.cameraCards.map((card) => [
        card.id,
        `${base}&kind=${encodeURIComponent(`camera-${card.id}`)}&v=${revision}`,
      ])),
    },
  };
}

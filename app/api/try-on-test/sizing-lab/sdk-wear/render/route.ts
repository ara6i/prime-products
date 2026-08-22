import { access, copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { loadWearSourcePair } from "@/app/api/try-on-test/wear-mesh-overlay/_lib/metricAsset";
import { heldoutWearPerson } from "../_lib/heldout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const renderPromises = new Map<string, Promise<WearBlenderMetadata>>();

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
  const required = ["model.glb", "scene.blend", "metadata.json", ...CAMERA_FILES];
  if (!(await Promise.all(required.map((name) => exists(path.join(directory, name))))).every(Boolean)) return null;
  try {
    const metadata = JSON.parse(await readFile(path.join(directory, "metadata.json"), "utf8")) as WearBlenderMetadata;
    return metadata.scanId === scanId
      && metadata.generator?.application === "Blender"
      && metadata.generator.headless
      && metadata.renderSchemaVersion === 3
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

async function renderWearScan(scanId: string, heightCm: number, weightKg: number) {
  const cached = await cachedMetadata(scanId);
  if (cached) return cached;

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
    await Promise.all(["model.glb", "scene.blend", "metadata.json", ...CAMERA_FILES].map((name) => (
      copyFile(path.join(temporaryDirectory, name), path.join(finalDirectory, name))
    )));
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
    const person = await heldoutWearPerson(scanId);
    if (!person) return NextResponse.json({ error: "Choose a valid held-out WEAR scan." }, { status: 404 });

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

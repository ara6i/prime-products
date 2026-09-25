import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const builds = new Map<string, Promise<Record<string, unknown>>>();
const PHOTO_OUTLINE_SCHEMA_VERSION = 2;
const SAFE_PHOTO_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
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

function validOutline(value: unknown): value is number[][] {
  return Array.isArray(value)
    && value.length >= 3
    && value.length <= 20_000
    && value.every((point) => (
      Array.isArray(point)
      && point.length >= 2
      && point.slice(0, 2).every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate) && coordinate >= -10 && coordinate <= 10)
    ));
}

async function buildPhotoMesh(key: string, heightCm: number, outline: number[][]) {
  const root = process.cwd();
  const outputDirectory = path.join(root, ".local-ml", "wear-side-selector", "photo-2d", key);
  const outputPath = path.join(outputDirectory, "photo-2d.json");
  if (await exists(outputPath)) return JSON.parse(await readFile(outputPath, "utf8")) as Record<string, unknown>;
  await mkdir(outputDirectory, { recursive: true });
  const specPath = path.join(outputDirectory, "spec.json");
  await writeFile(specPath, JSON.stringify({ heightCm, outline }));
  await execFileAsync(
    await blenderBinary(),
    [
      "--background",
      "--factory-startup",
      "--python",
      path.join(root, "scripts", "local-ml", "blender_build_outline_2d_mesh.py"),
      "--",
      "--spec",
      specPath,
      "--output-dir",
      outputDirectory,
    ],
    { cwd: root, timeout: 180_000, maxBuffer: 2 * 1024 * 1024 },
  );
  return JSON.parse(await readFile(outputPath, "utf8")) as Record<string, unknown>;
}

export async function POST(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "Blender photo meshes are private Test Lab only." }, { status: 403 });
  }
  try {
    const body = await request.json() as { heightCm?: unknown; outline?: unknown; photoId?: unknown };
    const heightCm = typeof body.heightCm === "number" ? body.heightCm : Number.NaN;
    const photoId = typeof body.photoId === "string" && SAFE_PHOTO_ID.test(body.photoId)
      ? body.photoId
      : null;
    if (!(heightCm >= 120 && heightCm <= 230) || !validOutline(body.outline)) {
      return NextResponse.json({ error: "Choose a valid measured photo outline." }, { status: 400 });
    }
    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ renderSchemaVersion: PHOTO_OUTLINE_SCHEMA_VERSION, heightCm, outline: body.outline }))
      .digest("hex")
      .slice(0, 24);
    // Saved Test Lab models use a stable private cache key. This lets the test
    // server serve a previously verified Blender artifact without requiring
    // Blender to be installed on every web host.
    const cacheKey = photoId ? `saved-${photoId}` : fingerprint;
    const outputPath = path.join(process.cwd(), ".local-ml", "wear-side-selector", "photo-2d", cacheKey, "photo-2d.json");
    const cached = await exists(outputPath);
    if (cached) {
      const mesh = JSON.parse(await readFile(outputPath, "utf8")) as Record<string, unknown>;
      return NextResponse.json({ ok: true, cached: true, cacheKey, mesh });
    }
    let promise = builds.get(cacheKey);
    if (!promise) {
      promise = buildPhotoMesh(cacheKey, heightCm, body.outline).finally(() => builds.delete(cacheKey));
      builds.set(cacheKey, promise);
    }
    const mesh = await promise;
    return NextResponse.json({ ok: true, cached, cacheKey, mesh });
  } catch (error) {
    console.error("[wear-side-selector] Blender photo 2D mesh failed", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Blender could not build the photo 2D mesh.",
    }, { status: 500 });
  }
}

import { access, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const SAFE_PHOTO_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SAFE_IMAGE_URL = /^\/try-on-test\/sizing-lab\/[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png)$/;
type PhotoId = string;

function isPhotoId(value: unknown): value is PhotoId {
  return typeof value === "string" && SAFE_PHOTO_ID.test(value);
}

function isSafeImageUrl(value: unknown): value is string {
  return typeof value === "string" && SAFE_IMAGE_URL.test(value);
}

async function resolveBlenderBinary() {
  const candidates = [
    process.env.PRIMESTYLE_BLENDER_BIN,
    "/Applications/Blender.app/Contents/MacOS/Blender",
    "/usr/local/bin/blender",
    "/usr/bin/blender",
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next fixed location. User input never controls this path.
    }
  }
  return "blender";
}

export async function POST(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json(
      { error: "Blender mesh generation is available only inside Test Lab." },
      { status: 403 },
    );
  }

  let photoId: PhotoId;
  let imageUrl: string;
  try {
    const body = await request.json() as { photoId?: unknown; imageUrl?: unknown };
    if (!isPhotoId(body.photoId) || !isSafeImageUrl(body.imageUrl)) throw new Error("Unknown photo.");
    photoId = body.photoId;
    imageUrl = body.imageUrl;
  } catch {
    return NextResponse.json({ error: "Choose a supported private Test Lab photo." }, { status: 400 });
  }

  const startedAt = Date.now();
  const root = process.cwd();
  const blenderBinary = await resolveBlenderBinary();
  const pythonBinary = path.join(
    /* turbopackIgnore: true */ root,
    ".local-ml",
    "venvs",
    "sam-3d-body",
    "bin",
    "python",
  );
  const imagePath = path.join(
    /* turbopackIgnore: true */ root,
    "public",
    ...imageUrl.split("/").filter(Boolean),
  );
  const maskScriptPath = path.join(
    /* turbopackIgnore: true */ root,
    "scripts",
    "local-ml",
    "build_photo_body_masks.py",
  );
  const outlineScriptPath = path.join(
    /* turbopackIgnore: true */ root,
    "scripts",
    "local-ml",
    "build_visible_mask_mesh.py",
  );
  const scriptPath = path.join(
    /* turbopackIgnore: true */ root,
    "scripts",
    "local-ml",
    "blender_build_visible_2d_mesh.py",
  );
  const artifactPath = path.join(
    /* turbopackIgnore: true */ root,
    ".local-ml",
    "wear-mesh-overlay",
    "blender-mesh",
    `${photoId}.json`,
  );

  try {
    await access(imagePath);
    await access(pythonBinary);
    await execFileAsync(
      pythonBinary,
      [maskScriptPath, "--photo-id", photoId, "--photo-path", imagePath],
      { cwd: root, timeout: 240_000, maxBuffer: 2 * 1024 * 1024 },
    );
    await execFileAsync(
      pythonBinary,
      [
        outlineScriptPath,
        "--photo-id",
        photoId,
        "--photo-path",
        imagePath,
        "--grid-step",
        "24",
        "--boundary-step",
        "12",
      ],
      { cwd: root, timeout: 90_000, maxBuffer: 2 * 1024 * 1024 },
    );
    const { stdout } = await execFileAsync(
      blenderBinary,
      [
        "--background",
        "--factory-startup",
        "--python",
        scriptPath,
        "--",
        "--photo",
        photoId,
        "--grid-step",
        "24",
      ],
      {
        cwd: root,
        timeout: 180_000,
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    const artifact = JSON.parse(await readFile(artifactPath, "utf8")) as {
      blenderApiUsed?: boolean;
      generator?: { application?: string; version?: string; headless?: boolean };
    };
    if (
      artifact.blenderApiUsed !== true
      || artifact.generator?.application !== "Blender"
      || artifact.generator.headless !== true
    ) {
      throw new Error("The generated artifact did not prove headless Blender API use.");
    }
    const resultLine = stdout
      .split("\n")
      .find((line) => line.startsWith("BLENDER_MESH_RESULT="));
    return NextResponse.json({
      ok: true,
      photoId,
      durationMs: Date.now() - startedAt,
      execution: "Blender headless Python API",
      result: resultLine?.slice("BLENDER_MESH_RESULT=".length) ?? null,
      artifact,
    });
  } catch (error) {
    console.error("[wear-mesh-overlay] Blender generation failed", error);
    return NextResponse.json(
      {
        error: "Blender could not generate this private mesh. The previous artifact was not replaced.",
      },
      { status: 500 },
    );
  }
}

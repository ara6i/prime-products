import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse, type NextRequest } from "next/server";
import { isSiteAuthEnabled, SITE_AUTH_COOKIE_NAME, verifySiteSessionToken } from "@/app/shared/auth/siteSession";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MODEL_VERSION = "height-depth-pro-dense-field-v8";
const MODEL_DIRECTORY = path.join(tmpdir(), "primestyle-blind-scale-v8");
const DEPTH_DIRECTORY = path.join(tmpdir(), "primestyle-depth-pro-cache-v3");

interface Point { x: number; y: number }
interface CameraInput {
  focalXPx?: number;
  focalYPx?: number;
  principalPointXPx?: number;
  principalPointYPx?: number;
  cameraPitchDeg?: number;
  cameraRollDeg?: number;
  cameraYawDeg?: number;
  personDistanceM?: number;
  personReferenceYPx?: number;
  geometryQuality?: "pass" | "check" | "reject";
}
interface SegmentInput { id?: string; start?: Point; end?: Point }
interface RequestBody {
  imageDataUrl?: string;
  depthCacheKey?: string;
  modelKey?: string;
  imageWidth?: number;
  imageHeight?: number;
  heightCm?: number;
  top?: Point;
  bottom?: Point;
  camera?: CameraInput;
  segments?: SegmentInput[];
}

export async function POST(request: NextRequest) {
  if (!(await hasSizingLabAccess(request))) {
    return NextResponse.json({ ok: false, error: "Sizing Lab is not available for this host." }, { status: 403 });
  }

  const body = await request.json() as RequestBody;
  const segments = parseSegments(body.segments ?? []);
  if (!segments) {
    return NextResponse.json({ ok: false, error: "Blind-scale query segments are invalid." }, { status: 400 });
  }

  const suppliedModelKey = validHash(body.modelKey) ? body.modelKey! : null;
  let modelKey = suppliedModelKey;
  let imageHash: string;
  let freezeArgs: string[] = [];
  let image: Buffer | null = null;
  let extension = "jpg";

  if (suppliedModelKey) {
    const modelPath = path.join(MODEL_DIRECTORY, `${suppliedModelKey}.json`);
    if (!existsSync(modelPath)) {
      return NextResponse.json({ ok: false, error: "Frozen blind scale expired; freeze it again." }, { status: 409 });
    }
    const frozen = JSON.parse(await readFile(modelPath, "utf8")) as { imageHash?: string };
    if (!validHash(frozen.imageHash)) {
      return NextResponse.json({ ok: false, error: "Frozen blind scale is corrupt." }, { status: 500 });
    }
    imageHash = frozen.imageHash!;
  } else {
    const parsed = body.imageDataUrl ? parseDataUrl(body.imageDataUrl) : null;
    const suppliedDepthKey = validHash(body.depthCacheKey) ? body.depthCacheKey! : null;
    if ((!parsed && !suppliedDepthKey) || !isFiniteFreezeRequest(body)) {
      return NextResponse.json({ ok: false, error: "Image, yellow height line, known height, and Apple camera geometry are required." }, { status: 400 });
    }
    if (parsed) {
      image = Buffer.from(parsed.base64, "base64");
      extension = parsed.extension;
      if (image.length > MAX_IMAGE_BYTES) {
        return NextResponse.json({ ok: false, error: "Image exceeds the 15 MB local test limit." }, { status: 413 });
      }
      imageHash = createHash("sha256").update(image).digest("hex");
    } else {
      imageHash = suppliedDepthKey!;
    }
    const camera = body.camera!;
    const modelInputs = {
      version: MODEL_VERSION,
      imageHash,
      imageWidth: body.imageWidth,
      imageHeight: body.imageHeight,
      heightCm: body.heightCm,
      top: body.top,
      bottom: body.bottom,
      camera,
    };
    modelKey = createHash("sha256").update(JSON.stringify(modelInputs)).digest("hex");
    freezeArgs = [
      "--image-width", String(body.imageWidth),
      "--image-height", String(body.imageHeight),
      "--height-cm", String(body.heightCm),
      "--top", String(body.top!.x), String(body.top!.y),
      "--bottom", String(body.bottom!.x), String(body.bottom!.y),
      "--focal-x", String(camera.focalXPx),
      "--focal-y", String(camera.focalYPx),
      "--principal-x", String(camera.principalPointXPx),
      "--principal-y", String(camera.principalPointYPx),
      "--camera-pitch", String(camera.cameraPitchDeg ?? 0),
      "--camera-roll", String(camera.cameraRollDeg ?? 0),
      "--camera-yaw", String(camera.cameraYawDeg ?? 0),
      "--person-distance", String(camera.personDistanceM),
      "--person-reference-y", String(camera.personReferenceYPx),
      "--geometry-quality", camera.geometryQuality!,
    ];
  }

  const depthPath = path.join(DEPTH_DIRECTORY, `${imageHash}.npz`);
  if (!image && !existsSync(depthPath)) {
    return NextResponse.json({ ok: false, error: "Depth cache expired; resend the source image." }, { status: 409 });
  }
  const modelPath = path.join(MODEL_DIRECTORY, `${modelKey}.json`);
  const tempDirectory = await mkdtemp(path.join(tmpdir(), "primestyle-blind-scale-"));
  const imagePath = image ? path.join(tempDirectory, `input.${extension}`) : depthPath;
  try {
    if (image) await writeFile(imagePath, image);
    await mkdir(MODEL_DIRECTORY, { recursive: true });
    const python = process.env.DEPTH_PRO_PYTHON ?? "/Users/arashsn/.codex/runtime/geocalib-venv/bin/python";
    const runtimeDirectory = process.env.DEPTH_PRO_RUNTIME ?? "/Users/arashsn/.codex/runtime/ml-depth-pro";
    const script = path.resolve(/* turbopackIgnore: true */ process.cwd(), "scripts/blind_scale_field.py");
    const segmentArgs = segments.flatMap((segment) => [
      "--segment", segment.id,
      String(segment.start.x), String(segment.start.y),
      String(segment.end.x), String(segment.end.y),
    ]);
    const { stdout } = await execFileAsync(python, [
      script,
      imagePath,
      "--cache-path", depthPath,
      "--model-path", modelPath,
      "--model-key", modelKey!,
      ...freezeArgs,
      ...segmentArgs,
    ], { cwd: runtimeDirectory, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
    const result = JSON.parse(stdout.trim()) as Record<string, unknown>;
    if (!existsSync(modelPath)) throw new Error("Blind scale model did not freeze.");
    const frozen = JSON.parse(await readFile(modelPath, "utf8")) as Record<string, unknown>;
    if (frozen.imageHash !== imageHash) {
      await writeFile(modelPath, JSON.stringify({ ...frozen, imageHash }));
    }
    return NextResponse.json({ ok: true, result: { ...result, modelKey, depthCacheKey: imageHash } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Blind scale failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function parseSegments(segments: SegmentInput[]): Array<{ id: string; start: Point; end: Point }> | null {
  if (!Array.isArray(segments) || segments.length > 8) return null;
  const parsed = segments.map((segment, index) => ({
    id: typeof segment.id === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(segment.id) ? segment.id : `segment-${index + 1}`,
    start: segment.start!,
    end: segment.end!,
  }));
  return parsed.every((segment) => isFinitePoint(segment.start) && isFinitePoint(segment.end)) ? parsed : null;
}

function isFiniteFreezeRequest(body: RequestBody): boolean {
  const camera = body.camera;
  return Number.isFinite(body.imageWidth) && Number(body.imageWidth) >= 100 && Number(body.imageWidth) <= 20_000
    && Number.isFinite(body.imageHeight) && Number(body.imageHeight) >= 100 && Number(body.imageHeight) <= 20_000
    && Number.isFinite(body.heightCm) && Number(body.heightCm) > 50 && Number(body.heightCm) < 260
    && isFinitePoint(body.top) && isFinitePoint(body.bottom)
    && Boolean(camera)
    && [camera?.focalXPx, camera?.focalYPx].every((value) => Number.isFinite(value) && Number(value) > 100)
    && [camera?.principalPointXPx, camera?.principalPointYPx].every(Number.isFinite)
    && Number.isFinite(camera?.personDistanceM) && Number(camera?.personDistanceM) > 0
    && Number.isFinite(camera?.personReferenceYPx)
    && ["pass", "check", "reject"].includes(camera?.geometryQuality ?? "");
}

function isFinitePoint(point: Point | undefined): point is Point {
  return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
}

function validHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function parseDataUrl(value: string): { base64: string; extension: string } | null {
  const match = value.match(/^data:image\/(png|jpe?g|webp);base64,([a-zA-Z0-9+/=\s]+)$/);
  if (!match) return null;
  return { base64: match[2].replace(/\s/g, ""), extension: match[1] === "jpeg" ? "jpg" : match[1] };
}

async function hasSizingLabAccess(request: NextRequest): Promise<boolean> {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return false;
  if (!isSiteAuthEnabled()) return true;
  const token = request.cookies.get(SITE_AUTH_COOKIE_NAME)?.value ?? "";
  return token ? Boolean(await verifySiteSessionToken(token)) : false;
}

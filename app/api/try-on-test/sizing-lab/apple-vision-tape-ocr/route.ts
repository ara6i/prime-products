import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse, type NextRequest } from "next/server";
import { isSiteAuthEnabled, SITE_AUTH_COOKIE_NAME, verifySiteSessionToken } from "@/app/shared/auth/siteSession";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import {
  buildTapeTickFallbackDetections,
  buildTapeVisionCalibration,
  type RawTapeVisionDetection,
  type TapeVisionUnit,
} from "@/app/try-on-test/sizing-lab/lib/tapeVision";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const CACHE_DIRECTORY = path.join(tmpdir(), "primestyle-apple-vision-tape-ocr-v7");
const BINARY_PATH = path.join(tmpdir(), "primestyle-apple-vision-tape-ocr-runner-v4");
let compilePromise: Promise<void> | null = null;

interface RequestBody {
  imageDataUrl?: string;
  cacheKey?: string;
  imageWidth?: number;
  imageHeight?: number;
  hintX?: number;
  unit?: TapeVisionUnit;
}

interface VisionOutput {
  imageWidth: number;
  imageHeight: number;
  hintX: number;
  centerLineSlope: number;
  centerLineIntercept: number;
  detections: RawTapeVisionDetection[];
  centerXByY?: number[];
  tapeLineScoreByY?: number[];
  tapeVisibilityByY?: number[];
}

interface TapeRectification {
  sourceImageWidth: number;
  sourceImageHeight: number;
  stripWidth: number;
  centerXByY: number[];
  ocrCenterXByY?: number[];
  tapeLineScoreByY: number[];
  tapeVisibilityByY: number[];
}

export async function POST(request: NextRequest) {
  if (!(await hasSizingLabAccess(request))) {
    return NextResponse.json({ ok: false, error: "Sizing Lab is not available for this host." }, { status: 403 });
  }

  const body = await request.json() as RequestBody;
  const parsed = body.imageDataUrl ? parseDataUrl(body.imageDataUrl) : null;
  const suppliedCacheKey = typeof body.cacheKey === "string" && /^[a-f0-9]{64}$/.test(body.cacheKey)
    ? body.cacheKey
    : null;
  if ((!parsed && !suppliedCacheKey) || !isFiniteRequest(body)) {
    return NextResponse.json({ ok: false, error: "A valid image, image size, and tape X hint are required." }, { status: 400 });
  }

  const image = parsed ? Buffer.from(parsed.base64, "base64") : null;
  if (image && image.length > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, error: "Image exceeds the 15 MB local test limit." }, { status: 413 });
  }

  const started = performance.now();
  const imageHash = image ? createHash("sha256").update(image).digest("hex") : suppliedCacheKey!;
  const hintX = Number(body.hintX);
  const unit = body.unit!;
  const ocrHintX = Math.round(hintX / 4) * 4;
  const cachePath = path.join(CACHE_DIRECTORY, `${imageHash}-${ocrHintX}-${unit}.json`);
  if (!image && !existsSync(cachePath)) {
    return NextResponse.json({ ok: false, error: "Tape OCR cache expired; resend the image." }, { status: 409 });
  }

  let cacheHit = existsSync(cachePath);
  let vision: VisionOutput;
  const tempDirectory = await mkdtemp(path.join(tmpdir(), "primestyle-apple-vision-tape-ocr-"));
  try {
    if (cacheHit) {
      vision = JSON.parse(await readFile(cachePath, "utf8")) as VisionOutput;
    } else {
      if (!image || !parsed) throw new Error("Tape OCR image cache is unavailable.");
      const imagePath = path.join(tempDirectory, `input.${parsed.extension}`);
      await writeFile(imagePath, image);
      await ensureVisionBinary();
      let ocrImagePath = imagePath;
      let ocrHint = ocrHintX;
      let rectification: TapeRectification | null = null;
      const modeArguments: string[] = [];
      const rectifiedPath = path.join(tempDirectory, "rectified-tape.png");
      const rectificationPath = path.join(tempDirectory, "rectified-tape.json");
      const python = process.env.DEPTH_PRO_PYTHON ?? "/Users/arashsn/.codex/runtime/geocalib-venv/bin/python";
      const rectifier = path.resolve(/* turbopackIgnore: true */ process.cwd(), "scripts/rectify_tape_for_ocr.py");
      try {
        const rectifierArguments = [
          rectifier,
          imagePath,
          "--hint-x", String(ocrHintX),
          "--output", rectifiedPath,
          "--map-output", rectificationPath,
        ];
        if (unit === "in") rectifierArguments.push("--straight-center");
        await execFileAsync(python, rectifierArguments, { timeout: 20_000, maxBuffer: 2 * 1024 * 1024 });
        rectification = JSON.parse(await readFile(rectificationPath, "utf8")) as TapeRectification;
        if (!validRectification(rectification, Number(body.imageWidth), Number(body.imageHeight))) {
          rectification = null;
        } else {
          ocrImagePath = rectifiedPath;
          ocrHint = rectification.stripWidth / 2;
          modeArguments.push("rectified");
        }
      } catch {
        rectification = null;
      }
      const { stdout } = await execFileAsync(BINARY_PATH, [ocrImagePath, String(ocrHint), ...modeArguments], {
        timeout: 45_000,
        maxBuffer: 4 * 1024 * 1024,
      });
      const rawVision = JSON.parse(stdout.trim()) as VisionOutput;
      if (rectification) {
        const ocrCenters = rectification.ocrCenterXByY ?? rectification.centerXByY;
        const firstCenter = rectification.centerXByY[0]!;
        const lastCenter = rectification.centerXByY[rectification.centerXByY.length - 1]!;
        const centerLineSlope = (lastCenter - firstCenter) / Math.max(1, rectification.centerXByY.length - 1);
        vision = {
          imageWidth: Number(body.imageWidth),
          imageHeight: Number(body.imageHeight),
          hintX: ocrHintX,
          centerLineSlope,
          centerLineIntercept: firstCenter,
          detections: rawVision.detections.map((detection) => ({
            ...detection,
            x: centerAtY(ocrCenters, detection.y)
              + (detection.x - (rectification!.stripWidth / 2)),
          })),
          centerXByY: rectification.centerXByY,
          tapeLineScoreByY: rectification.tapeLineScoreByY,
          tapeVisibilityByY: rectification.tapeVisibilityByY,
        };
      } else {
        vision = rawVision;
      }
      await mkdir(CACHE_DIRECTORY, { recursive: true });
      await writeFile(cachePath, JSON.stringify(vision));
      cacheHit = false;
    }

    let pathResult = buildTapeVisionCalibration(vision.detections, ocrHintX, unit);
    if (vision.centerXByY && vision.tapeLineScoreByY) {
      const tickDetections = buildTapeTickFallbackDetections({
        detections: vision.detections,
        centerXByY: vision.centerXByY,
        lineScoreByY: vision.tapeLineScoreByY,
        visibilityByY: vision.tapeVisibilityByY,
        unit,
      });
      if (tickDetections.length) {
        const mappedResult = buildTapeVisionCalibration(tickDetections, ocrHintX, unit);
        if (mappedResult.ok && (unit === "in" || !pathResult.ok)) {
          pathResult = mappedResult;
          pathResult.calibration.model = unit === "in"
            ? "Apple Vision OCR + projective tape map"
            : "Apple Vision OCR + OpenCV tape ticks";
        }
      }
    }
    if (!pathResult.ok) {
      return NextResponse.json({ ok: false, error: pathResult.error }, { status: 422 });
    }
    return NextResponse.json({
      ok: true,
      result: {
        ...pathResult.calibration,
        cacheKey: imageHash,
        visualHintX: ocrHintX,
        cacheHit,
        elapsedMs: Math.round(performance.now() - started),
        centerLineSlope: vision.centerLineSlope,
        centerLineIntercept: vision.centerLineIntercept,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apple Vision tape OCR failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function validRectification(rectification: TapeRectification, imageWidth: number, imageHeight: number): boolean {
  return rectification.sourceImageWidth === imageWidth
    && rectification.sourceImageHeight === imageHeight
    && Number.isFinite(rectification.stripWidth)
    && rectification.stripWidth >= 24
    && rectification.centerXByY.length === imageHeight
    && (rectification.ocrCenterXByY == null || rectification.ocrCenterXByY.length === imageHeight)
    && rectification.tapeLineScoreByY.length === imageHeight
    && rectification.tapeVisibilityByY.length === imageHeight
    && rectification.centerXByY.every(Number.isFinite)
    && (rectification.ocrCenterXByY == null || rectification.ocrCenterXByY.every(Number.isFinite))
    && rectification.tapeLineScoreByY.every(Number.isFinite)
    && rectification.tapeVisibilityByY.every((value) => value === 0 || value === 1);
}

function centerAtY(centers: number[], y: number): number {
  const low = Math.max(0, Math.min(centers.length - 1, Math.floor(y)));
  const high = Math.max(0, Math.min(centers.length - 1, Math.ceil(y)));
  if (low === high) return centers[low]!;
  return centers[low]! + ((centers[high]! - centers[low]!) * (y - low));
}

async function ensureVisionBinary(): Promise<void> {
  const sourcePath = path.resolve(/* turbopackIgnore: true */ process.cwd(), "scripts/apple_vision_tape_ocr.swift");
  const [sourceInfo, binaryInfo] = await Promise.all([
    stat(sourcePath),
    stat(BINARY_PATH).catch(() => null),
  ]);
  if (binaryInfo && binaryInfo.mtimeMs >= sourceInfo.mtimeMs) return;
  if (!compilePromise) {
    compilePromise = execFileAsync("/usr/bin/xcrun", ["swiftc", sourcePath, "-O", "-o", BINARY_PATH], {
      timeout: 60_000,
      maxBuffer: 2 * 1024 * 1024,
    }).then(() => undefined).finally(() => {
      compilePromise = null;
    });
  }
  await compilePromise;
}

function isFiniteRequest(body: RequestBody): boolean {
  return Number.isFinite(body.imageWidth) && Number(body.imageWidth) >= 100 && Number(body.imageWidth) <= 20_000
    && Number.isFinite(body.imageHeight) && Number(body.imageHeight) >= 100 && Number(body.imageHeight) <= 20_000
    && Number.isFinite(body.hintX) && Number(body.hintX) >= 0 && Number(body.hintX) <= Number(body.imageWidth)
    && (body.unit === "cm" || body.unit === "in");
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

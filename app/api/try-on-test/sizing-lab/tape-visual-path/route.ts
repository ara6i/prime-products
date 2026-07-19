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
const CACHE_DIRECTORY = path.join(tmpdir(), "primestyle-tape-visual-path-v1");

interface RequestBody {
  imageDataUrl?: string;
  cacheKey?: string;
  imageWidth?: number;
  imageHeight?: number;
  hintX?: number;
  unit?: "cm" | "in";
}

interface TapeRectification {
  sourceImageWidth: number;
  sourceImageHeight: number;
  centerXByY: number[];
  tapeVisibilityByY: number[];
}

interface TapeVisualCache {
  imageWidth: number;
  imageHeight: number;
  hintX: number;
  centerXByY: number[];
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
    return NextResponse.json({ ok: false, error: "A valid image, image size, and manual tape X hint are required." }, { status: 400 });
  }

  const image = parsed ? Buffer.from(parsed.base64, "base64") : null;
  if (image && image.length > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, error: "Image exceeds the 15 MB local test limit." }, { status: 413 });
  }

  const imageHash = image ? createHash("sha256").update(image).digest("hex") : suppliedCacheKey!;
  if (suppliedCacheKey && suppliedCacheKey !== imageHash) {
    return NextResponse.json({ ok: false, error: "The manual tape image does not match the frozen Apple/Depth Pro model." }, { status: 409 });
  }

  const started = performance.now();
  const hintX = Number(body.hintX);
  const roundedHintX = Math.round(hintX / 4) * 4;
  const unit = body.unit!;
  const cachePath = path.join(CACHE_DIRECTORY, `${imageHash}-${roundedHintX}-${unit}.json`);
  if (!image && !existsSync(cachePath)) {
    return NextResponse.json({ ok: false, error: "Manual colour-path cache expired; resend the image." }, { status: 409 });
  }

  let cacheHit = existsSync(cachePath);
  let visual: TapeVisualCache;
  const tempDirectory = await mkdtemp(path.join(tmpdir(), "primestyle-tape-visual-path-"));
  try {
    if (cacheHit) {
      visual = JSON.parse(await readFile(cachePath, "utf8")) as TapeVisualCache;
    } else {
      if (!image || !parsed) throw new Error("Manual tape image is unavailable.");
      const imagePath = path.join(tempDirectory, `input.${parsed.extension}`);
      const rectifiedPath = path.join(tempDirectory, "visual-tape-strip.png");
      const mapPath = path.join(tempDirectory, "visual-tape-map.json");
      await writeFile(imagePath, image);
      const python = process.env.DEPTH_PRO_PYTHON ?? "/Users/arashsn/.codex/runtime/geocalib-venv/bin/python";
      const script = path.resolve(/* turbopackIgnore: true */ process.cwd(), "scripts/rectify_tape_for_ocr.py");
      const args = [
        script,
        imagePath,
        "--hint-x", String(roundedHintX),
        "--output", rectifiedPath,
        "--map-output", mapPath,
      ];
      if (unit === "in") args.push("--straight-center");
      await execFileAsync(python, args, { timeout: 20_000, maxBuffer: 2 * 1024 * 1024 });
      const rectification = JSON.parse(await readFile(mapPath, "utf8")) as TapeRectification;
      if (!validRectification(rectification, Number(body.imageWidth), Number(body.imageHeight))) {
        throw new Error("The colour-only tape path is invalid.");
      }
      visual = {
        imageWidth: Number(body.imageWidth),
        imageHeight: Number(body.imageHeight),
        hintX: roundedHintX,
        centerXByY: rectification.centerXByY,
        tapeVisibilityByY: rectification.tapeVisibilityByY,
      };
      await mkdir(CACHE_DIRECTORY, { recursive: true });
      await writeFile(cachePath, JSON.stringify(visual));
      cacheHit = false;
    }

    const visibleRows = visual.tapeVisibilityByY.flatMap((visible, y) => visible === 1 ? [y] : []);
    return NextResponse.json({
      ok: true,
      result: {
        cacheKey: imageHash,
        visualHintX: roundedHintX,
        visibleTopYPx: visibleRows[0] ?? null,
        visibleBottomYPx: visibleRows.at(-1) ?? null,
        visibleRowCount: visibleRows.length,
        source: "manual-colour-path-no-ocr",
        cacheHit,
        elapsedMs: Math.round(performance.now() - started),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Manual colour-only tape detection failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function validRectification(value: TapeRectification, imageWidth: number, imageHeight: number): boolean {
  return value.sourceImageWidth === imageWidth
    && value.sourceImageHeight === imageHeight
    && Array.isArray(value.centerXByY)
    && Array.isArray(value.tapeVisibilityByY)
    && value.centerXByY.length === imageHeight
    && value.tapeVisibilityByY.length === imageHeight
    && value.centerXByY.every(Number.isFinite)
    && value.tapeVisibilityByY.every((entry) => entry === 0 || entry === 1);
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

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse, type NextRequest } from "next/server";
import { isSiteAuthEnabled, SITE_AUTH_COOKIE_NAME, verifySiteSessionToken } from "@/app/shared/auth/siteSession";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const DEPTH_DIRECTORY = path.join(tmpdir(), "primestyle-depth-pro-cache-v3");
const POSE_DIRECTORY = path.join(tmpdir(), "primestyle-apple-vision-pose3d-cache");
const TAPE_DIRECTORY = path.join(tmpdir(), "primestyle-apple-vision-tape-ocr-v7");
const MANUAL_TAPE_DIRECTORY = path.join(tmpdir(), "primestyle-tape-visual-path-v1");

interface Point { x: number; y: number }
interface SegmentInput { id?: string; start?: Point; end?: Point }
interface TargetProjectionInput {
  id?: string;
  anchor?: Point;
  targetCm?: number;
  direction?: -1 | 1;
}
interface RequestBody {
  cacheKey?: string;
  heightCm?: number;
  tapeHintX?: number;
  tapeUnit?: "cm" | "in";
  visualSource?: "manual-color-only" | "ocr-cache";
  segments?: SegmentInput[];
  targetProjections?: TargetProjectionInput[];
}

interface TapeVisualCache {
  imageWidth?: number;
  imageHeight?: number;
  hintX?: number;
  centerLineSlope?: number;
  centerLineIntercept?: number;
  centerXByY?: number[];
  tapeVisibilityByY?: number[];
  detections?: Array<{
    x?: number;
    y?: number;
    confidence?: number;
  }>;
}

interface TapeVisualPath {
  imageWidth: number;
  imageHeight: number;
  centerXByY: number[];
  tapeVisibilityByY: number[];
  pathEvidence: "colour-mask" | "ocr-position-only";
}

export async function POST(request: NextRequest) {
  if (!(await hasSizingLabAccess(request))) {
    return NextResponse.json({ ok: false, error: "Sizing Lab is not available for this host." }, { status: 403 });
  }

  const body = await request.json() as RequestBody;
  const segments = parseSegments(body.segments ?? []);
  const targetProjections = parseTargetProjections(body.targetProjections ?? []);
  if (!validHash(body.cacheKey)
    || !Number.isFinite(body.heightCm) || Number(body.heightCm) <= 50 || Number(body.heightCm) >= 260
    || !Number.isFinite(body.tapeHintX)
    || (body.tapeUnit !== "cm" && body.tapeUnit !== "in")
    || !segments
    || !targetProjections) {
    return NextResponse.json({ ok: false, error: "Apple/Depth Pro tape inputs are invalid." }, { status: 400 });
  }

  const cacheKey = body.cacheKey;
  const depthPath = path.join(DEPTH_DIRECTORY, `${cacheKey}.npz`);
  const posePath = path.join(POSE_DIRECTORY, `${cacheKey}.json`);
  const visualSource = body.visualSource === "manual-color-only" ? "manual-color-only" : "ocr-cache";
  const tapePath = await findTapeCache(cacheKey, Number(body.tapeHintX), body.tapeUnit, visualSource);
  if (!existsSync(depthPath) || !existsSync(posePath) || !tapePath) {
    return NextResponse.json({
      ok: false,
      error: "Run Apple Vision 3D, Depth Pro, and the tape detector first; one local cache is missing.",
    }, { status: 409 });
  }

  const started = performance.now();
  const tempDirectory = await mkdtemp(path.join(tmpdir(), "primestyle-apple-fused-tape-"));
  try {
    const cached = JSON.parse(await readFile(/* turbopackIgnore: true */ tapePath, "utf8")) as TapeVisualCache;
    const visual = normalizeTapeVisualCache(cached);
    if (!visual) {
      throw new Error("The tape support-path cache is invalid. Retry the tape scan.");
    }
    // The Python scale process receives only tape-location geometry. When the
    // pale tape has no usable colour mask, OCR box positions may locate its
    // center line, but OCR text/values and expected lengths are always removed.
    const visualPath = path.join(tempDirectory, "visual-path.json");
    await writeFile(visualPath, JSON.stringify({
      imageWidth: visual.imageWidth,
      imageHeight: visual.imageHeight,
      centerXByY: visual.centerXByY,
      tapeVisibilityByY: visual.tapeVisibilityByY,
    }));

    const python = process.env.DEPTH_PRO_PYTHON ?? "/Users/arashsn/.codex/runtime/geocalib-venv/bin/python";
    const script = path.join(process.cwd(), "scripts", "apple_fused_tape_scale.py");
    const segmentArgs = segments.flatMap((segment) => [
      "--segment", segment.id,
      String(segment.start.x), String(segment.start.y),
      String(segment.end.x), String(segment.end.y),
    ]);
    const targetArgs = targetProjections.flatMap((target) => [
      "--target", target.id,
      String(target.anchor.x), String(target.anchor.y),
      String(target.targetCm), String(target.direction),
    ]);
    const { stdout } = await execFileAsync(python, [
      script,
      "--depth-cache", depthPath,
      "--pose-cache", posePath,
      "--visual-path", visualPath,
      "--height-cm", String(body.heightCm),
      ...segmentArgs,
      ...targetArgs,
    ], { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 });
    const result = JSON.parse(stdout.trim());
    return NextResponse.json({
      ok: true,
      result: {
        ...result,
        visualSource,
        pathEvidence: visual.pathEvidence,
        cacheKey,
        elapsedMs: Math.round(performance.now() - started),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apple/Depth Pro tape fusion failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

async function findTapeCache(
  cacheKey: string,
  hintX: number,
  unit: "cm" | "in",
  visualSource: "manual-color-only" | "ocr-cache",
): Promise<string | null> {
  const directory = visualSource === "manual-color-only" ? MANUAL_TAPE_DIRECTORY : TAPE_DIRECTORY;
  const exactHint = Math.round(hintX / 4) * 4;
  const exact = path.join(directory, `${cacheKey}-${exactHint}-${unit}.json`);
  if (existsSync(exact)) return exact;
  const names = await readdir(directory).catch(() => [] as string[]);
  const candidates = names.flatMap((name): Array<{ path: string; delta: number }> => {
    const match = name.match(new RegExp(`^${cacheKey}-(\\d+)-${unit}\\.json$`));
    if (!match) return [];
    return [{ path: path.join(directory, name), delta: Math.abs(Number(match[1]) - hintX) }];
  }).sort((left, right) => left.delta - right.delta);
  return candidates[0]?.path ?? null;
}

function normalizeTapeVisualCache(value: TapeVisualCache): TapeVisualPath | null {
  const imageWidth = Number(value.imageWidth);
  const imageHeight = Number(value.imageHeight);
  if (!Number.isInteger(imageWidth) || imageWidth < 100
    || !Number.isInteger(imageHeight) || imageHeight < 100) return null;

  if (Array.isArray(value.centerXByY)
    && Array.isArray(value.tapeVisibilityByY)
    && value.centerXByY.length === imageHeight
    && value.tapeVisibilityByY.length === imageHeight
    && value.centerXByY.every(Number.isFinite)
    && value.tapeVisibilityByY.every((entry) => entry === 0 || entry === 1)) {
    return {
      imageWidth,
      imageHeight,
      centerXByY: value.centerXByY,
      tapeVisibilityByY: value.tapeVisibilityByY,
      pathEvidence: "colour-mask",
    };
  }

  const hintX = Number(value.hintX);
  const maximumHintDelta = Math.max(60, imageWidth * 0.04);
  const detections = (value.detections ?? []).flatMap((detection) => {
    const x = Number(detection.x);
    const y = Number(detection.y);
    const confidence = Number(detection.confidence);
    if (!Number.isFinite(x) || !Number.isFinite(y)
      || x < 0 || x >= imageWidth || y < 0 || y >= imageHeight
      || !Number.isFinite(confidence) || confidence < 0.4
      || (Number.isFinite(hintX) && Math.abs(x - hintX) > maximumHintDelta)) return [];
    return [{ x, y }];
  }).sort((left, right) => left.y - right.y);
  if (detections.length < 8) return null;

  // Trim the outer two percent so one false OCR box cannot invent a much
  // longer visible tape. Values are never inspected here—positions only.
  const lower = detections[Math.floor(detections.length * 0.02)]!;
  const upper = detections[Math.min(detections.length - 1, Math.ceil(detections.length * 0.98) - 1)]!;
  const visibleTopY = Math.max(0, Math.floor(lower.y));
  const visibleBottomY = Math.min(imageHeight - 1, Math.ceil(upper.y));
  if (visibleBottomY - visibleTopY < imageHeight * 0.25) return null;

  let slope = Number(value.centerLineSlope);
  let intercept = Number(value.centerLineIntercept);
  if (!Number.isFinite(slope) || !Number.isFinite(intercept) || Math.abs(slope) > 0.25) {
    const meanY = detections.reduce((sum, point) => sum + point.y, 0) / detections.length;
    const meanX = detections.reduce((sum, point) => sum + point.x, 0) / detections.length;
    const denominator = detections.reduce((sum, point) => sum + ((point.y - meanY) ** 2), 0);
    if (denominator <= 1) return null;
    slope = detections.reduce((sum, point) => sum + ((point.y - meanY) * (point.x - meanX)), 0) / denominator;
    intercept = meanX - (slope * meanY);
  }
  if (!Number.isFinite(slope) || !Number.isFinite(intercept) || Math.abs(slope) > 0.25) return null;

  // Follow slow visible bends using OCR box *positions* only. The numeric text
  // is never inspected. A local median offset from the robust global line is
  // intentionally smoother than individual glyph boxes, which sit on either
  // side of the tape centre.
  const centerXByY = buildPositionOnlyCenterPath(
    detections,
    imageWidth,
    imageHeight,
    slope,
    intercept,
  );
  const tapeVisibilityByY = Array.from({ length: imageHeight }, (_, y) => (
    y >= visibleTopY && y <= visibleBottomY ? 1 : 0
  ));
  return {
    imageWidth,
    imageHeight,
    centerXByY,
    tapeVisibilityByY,
    pathEvidence: "ocr-position-only",
  };
}

function buildPositionOnlyCenterPath(
  detections: Array<{ x: number; y: number }>,
  imageWidth: number,
  imageHeight: number,
  slope: number,
  intercept: number,
): number[] {
  const binHeight = Math.max(6, Math.round(imageHeight / 500));
  const bins = new Map<number, Array<{ x: number; y: number }>>();
  for (const point of detections) {
    const key = Math.round(point.y / binHeight);
    const group = bins.get(key) ?? [];
    group.push(point);
    bins.set(key, group);
  }
  const knots = [...bins.values()].map((group) => {
    const y = median(group.map((point) => point.y));
    const rawOffset = median(group.map((point) => point.x - (intercept + (slope * point.y))));
    return { y, offset: Math.max(-48, Math.min(48, rawOffset)) };
  }).sort((left, right) => left.y - right.y);
  if (knots.length < 3) {
    return Array.from({ length: imageHeight }, (_, y) => (
      Math.max(0, Math.min(imageWidth - 1, intercept + (slope * y)))
    ));
  }
  const smoothed = knots.map((knot, index) => {
    const local = knots.slice(Math.max(0, index - 2), Math.min(knots.length, index + 3));
    return { y: knot.y, offset: median(local.map((candidate) => candidate.offset)) };
  });
  let rightIndex = 1;
  return Array.from({ length: imageHeight }, (_, y) => {
    while (rightIndex < smoothed.length - 1 && y > smoothed[rightIndex]!.y) rightIndex += 1;
    const left = smoothed[Math.max(0, rightIndex - 1)]!;
    const right = smoothed[rightIndex]!;
    const span = right.y - left.y;
    const progress = span <= 1e-6 ? 0 : Math.max(0, Math.min(1, (y - left.y) / span));
    const offset = left.offset + ((right.offset - left.offset) * progress);
    return Math.max(0, Math.min(imageWidth - 1, intercept + (slope * y) + offset));
  });
}

function median(values: number[]): number {
  const ordered = values.slice().sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? ((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2
    : (ordered[middle] ?? 0);
}

function parseSegments(segments: SegmentInput[]): Array<{ id: string; start: Point; end: Point }> | null {
  if (!Array.isArray(segments) || segments.length < 1 || segments.length > 8) return null;
  const parsed = segments.map((segment, index) => ({
    id: typeof segment.id === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(segment.id)
      ? segment.id
      : `segment-${index + 1}`,
    start: segment.start!,
    end: segment.end!,
  }));
  return parsed.every((segment) => isFinitePoint(segment.start) && isFinitePoint(segment.end)) ? parsed : null;
}

function parseTargetProjections(targets: TargetProjectionInput[]): Array<{
  id: string;
  anchor: Point;
  targetCm: number;
  direction: -1 | 1;
}> | null {
  if (!Array.isArray(targets) || targets.length > 3) return null;
  const parsed = targets.map((target, index) => ({
    id: typeof target.id === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(target.id)
      ? target.id
      : `target-${index + 1}`,
    anchor: target.anchor!,
    targetCm: Number(target.targetCm),
    direction: target.direction === -1 ? -1 as const : 1 as const,
  }));
  return parsed.every((target) => (
    isFinitePoint(target.anchor)
    && Number.isFinite(target.targetCm)
    && target.targetCm > 0
    && target.targetCm <= 150
  )) ? parsed : null;
}

function isFinitePoint(point: Point | undefined): point is Point {
  return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
}

function validHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

async function hasSizingLabAccess(request: NextRequest): Promise<boolean> {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return false;
  if (!isSiteAuthEnabled()) return true;
  const token = request.cookies.get(SITE_AUTH_COOKIE_NAME)?.value ?? "";
  return token ? Boolean(await verifySiteSessionToken(token)) : false;
}

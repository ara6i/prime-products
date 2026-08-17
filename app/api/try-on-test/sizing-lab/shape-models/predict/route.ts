import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import {
  meshShapeProviderLabel,
  type MeshShapePreview,
  type MeshProjectedPhotoEdge,
  type MeshShapePredictionResponse,
  type MeshShapePredictionRow,
  type MeshShapeProviderId,
} from "@/app/try-on-test/sizing-lab/lib/meshShapeProviders";
import { runCachedLocalInference } from "../../_lib/localInferenceScheduler";
import { resolveMeshShapeProvider } from "../providerStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_MASK_BYTES = 4 * 1024 * 1024;
const VALID_PROVIDERS = new Set<MeshShapeProviderId>(["sam-3d-body", "shapy"]);
const VALID_ROWS = new Set(["waist", "trouserWaist", "hips"]);
const VALID_EDGE_ROWS = new Set(["neck", "chest", "underbust", "waist", "hips"]);

interface ShapeModelRequestRow {
  kind?: string;
  yNorm?: number;
  leftXNorm?: number;
  rightXNorm?: number;
  centerXNorm?: number;
  heightFromFloorCm?: number | null;
}

interface ShapeModelRequest {
  mode?: "shape" | "photo-edges";
  provider?: string;
  imageDataUrl?: string;
  maskDataUrl?: string | null;
  imageWidth?: number;
  imageHeight?: number;
  heightCm?: number;
  cameraIntrinsics?: {
    focalXPx?: number;
    focalYPx?: number;
    principalPointXPx?: number;
    principalPointYPx?: number;
  } | null;
  sourceImageKey?: string;
  geometryKey?: string;
  rows?: ShapeModelRequestRow[];
  edgeRows?: ShapeModelRequestRow[];
  personBoxPx?: [number, number, number, number];
}

export async function POST(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json(
      { ok: false, error: "Shape models are available only on local and test-lab hosts." },
      { status: 403 },
    );
  }

  let body: ShapeModelRequest;
  try {
    body = await request.json() as ShapeModelRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const providerId = VALID_PROVIDERS.has(body.provider as MeshShapeProviderId)
    ? body.provider as MeshShapeProviderId
    : null;
  if (!providerId || !validRequest(body)) {
    return NextResponse.json(
      {
        ok: false,
        error: body.mode === "photo-edges"
          ? "A provider, source image, known height, and valid photo edge rows are required."
          : "A provider, source image, known height, and all three saved body rows are required.",
      },
      { status: 400 },
    );
  }
  const imageMatch = body.imageDataUrl!.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,([\s\S]+)$/);
  if (!imageMatch) {
    return NextResponse.json({ ok: false, error: "The source photo must be a base64 image data URL." }, { status: 400 });
  }
  const imageBuffer = Buffer.from(imageMatch[1]!, "base64");
  const imageBytes = imageBuffer.length;
  if (imageBytes > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, error: "Image exceeds the 15 MB local test limit." }, { status: 413 });
  }
  if (body.maskDataUrl) {
    const maskMatch = body.maskDataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,([\s\S]+)$/);
    if (!maskMatch) {
      return NextResponse.json({ ok: false, error: "The body mask must be a base64 image data URL." }, { status: 400 });
    }
    if (Buffer.from(maskMatch[1]!, "base64").length > MAX_MASK_BYTES) {
      return NextResponse.json({ ok: false, error: "Body mask exceeds the 4 MB local test limit." }, { status: 413 });
    }
  }

  const resolved = resolveMeshShapeProvider(providerId);
  if (!resolved?.status.available || !resolved.execution) {
    return NextResponse.json(
      { ok: false, error: resolved?.status.reason ?? "This shape provider is not configured." },
      { status: 409 },
    );
  }

  const started = performance.now();
  try {
    const imageHash = createHash("sha256").update(imageBuffer).digest("hex");
    const depthProCachePath = path.join(tmpdir(), "primestyle-depth-pro-cache-v3", `${imageHash}.npz`);
    const depthProCacheStat = await stat(depthProCachePath).catch(() => null);
    const depthProCacheFingerprint = depthProCacheStat
      ? `${depthProCacheStat.size}-${Math.round(depthProCacheStat.mtimeMs)}`
      : "no-depth-profile";
    const inferenceKey = createHash("sha256")
      .update("shape-model-v6-projected-photo-edges")
      .update(providerId)
      .update(imageMatch[1]!)
      .update(body.maskDataUrl ?? "")
      .update(depthProCacheFingerprint)
      .update(JSON.stringify({
        imageWidth: body.imageWidth,
        imageHeight: body.imageHeight,
        heightCm: body.heightCm,
        cameraIntrinsics: body.cameraIntrinsics,
        mode: body.mode,
        rows: body.rows,
        edgeRows: body.edgeRows,
        personBoxPx: body.personBoxPx,
      }))
      .digest("hex");
    const inference = await runCachedLocalInference<{
      rows?: MeshShapePredictionRow[];
      projectedEdgeRows?: MeshProjectedPhotoEdge[];
      meshPreview?: unknown;
      personBoxPx?: unknown;
      maskConditioned?: unknown;
      depthProfileConditioned?: unknown;
      cameraIntrinsicsSource?: unknown;
      sliceAlignmentSource?: unknown;
      warning?: string;
    }>({
      key: `shape-model:${inferenceKey}`,
      label: meshShapeProviderLabel(providerId),
      cacheGroup: "shape-model-results",
      cacheTtlMs: 15 * 60_000,
      cacheMaxEntries: 3,
      task: async () => {
        const tempDirectory = await mkdtemp(path.join(tmpdir(), `primestyle-${providerId}-shape-`));
        const requestPath = path.join(tempDirectory, "request.json");
        try {
          await writeFile(requestPath, JSON.stringify({
            ...body,
            depthProCachePath: depthProCacheStat ? depthProCachePath : null,
          }));
          const { stdout } = await execFileAsync(
            resolved.execution!.command,
            [...resolved.execution!.args, requestPath],
            {
              env: { ...process.env, ...resolved.execution!.environment },
              timeout: 240_000,
              maxBuffer: 16 * 1024 * 1024,
            },
          );
          return JSON.parse(stdout.trim()) as {
            rows?: MeshShapePredictionRow[];
            projectedEdgeRows?: MeshProjectedPhotoEdge[];
            meshPreview?: unknown;
            personBoxPx?: unknown;
            maskConditioned?: unknown;
            depthProfileConditioned?: unknown;
            cameraIntrinsicsSource?: unknown;
            sliceAlignmentSource?: unknown;
            warning?: string;
          };
        } finally {
          await rm(tempDirectory, { recursive: true, force: true });
        }
      },
    });
    const parsed = inference.value;
    const edgeOnly = body.mode === "photo-edges";
    const rows = edgeOnly ? [] : validatePredictionRows(parsed.rows);
    if (!rows) throw new Error("The shape runner did not return one valid waist, trouser-waist, and hip slice.");
    const projectedEdgeRows = validateProjectedEdgeRows(parsed.projectedEdgeRows);
    if (edgeOnly && !projectedEdgeRows) {
      throw new Error("Meta did not return valid projected body edges for this photo.");
    }
    const personBoxPx = validatePersonBox(parsed.personBoxPx);
    const meshPreview = validateMeshPreview(parsed.meshPreview);
    const response: MeshShapePredictionResponse = {
      ok: true,
      provider: providerId,
      providerLabel: meshShapeProviderLabel(providerId),
      sourceImageKey: body.sourceImageKey!,
      geometryKey: body.geometryKey!,
      elapsedMs: Math.round(performance.now() - started),
      rows,
      meshPreview: meshPreview ?? undefined,
      projectedEdgeRows: projectedEdgeRows ?? undefined,
      personBoxPx: personBoxPx ?? undefined,
      maskConditioned: parsed.maskConditioned === true,
      depthProfileConditioned: parsed.depthProfileConditioned === true,
      cameraIntrinsicsSource: parsed.cameraIntrinsicsSource === "apple-vision" ? "apple-vision" : "meta-default",
      sliceAlignmentSource: parsed.sliceAlignmentSource === "mask-projected-red-row"
        ? "mask-projected-red-row"
        : "legacy-row-height",
      warning: typeof parsed.warning === "string" ? parsed.warning.slice(0, 500) : undefined,
    };
    return NextResponse.json(response, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = compactShapeModelError(error, providerId);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function compactShapeModelError(error: unknown, providerId: MeshShapeProviderId): string {
  const candidate = error as { stderr?: unknown; message?: unknown } | null;
  const stderr = typeof candidate?.stderr === "string" ? candidate.stderr : "";
  const diagnostic = stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("File ") && line !== "Traceback (most recent call last):")
    .at(-1);
  if (diagnostic) return diagnostic.slice(0, 500);
  if (error instanceof Error && error.message) return error.message.slice(0, 500);
  return `${meshShapeProviderLabel(providerId)} failed.`;
}

function validatePersonBox(value: unknown): [number, number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 4 || !value.every((item) => Number.isFinite(item))) return null;
  const box = value.map(Number) as [number, number, number, number];
  return box[2] > box[0] && box[3] > box[1] ? box : null;
}

function validateMeshPreview(value: unknown): MeshShapePreview | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<MeshShapePreview>;
  if (
    !Number.isInteger(candidate.vertexCount)
    || !Number.isInteger(candidate.triangleCount)
    || Number(candidate.vertexCount) < 100
    || Number(candidate.vertexCount) > 50_000
    || Number(candidate.triangleCount) < 100
    || Number(candidate.triangleCount) > 100_000
    || !Array.isArray(candidate.verticesM)
    || !Array.isArray(candidate.triangleIndices)
    || candidate.verticesM.length !== Number(candidate.vertexCount) * 3
    || candidate.triangleIndices.length !== Number(candidate.triangleCount) * 3
    || candidate.verticesM.some((item) => !Number.isFinite(item) || Math.abs(item) > 5)
    || candidate.triangleIndices.some((item) => !Number.isInteger(item) || item < 0 || item >= Number(candidate.vertexCount))
  ) return null;
  return candidate as MeshShapePreview;
}

function validRequest(body: ShapeModelRequest): boolean {
  if (!body.imageDataUrl || body.imageDataUrl.length < 100) return false;
  if (!Number.isFinite(body.imageWidth) || Number(body.imageWidth) <= 0) return false;
  if (!Number.isFinite(body.imageHeight) || Number(body.imageHeight) <= 0) return false;
  if (!Number.isFinite(body.heightCm) || Number(body.heightCm) < 100 || Number(body.heightCm) > 250) return false;
  if (!body.sourceImageKey || body.sourceImageKey.length > 4_000) return false;
  if (!body.geometryKey || body.geometryKey.length > 20_000) return false;
  if (body.mode != null && body.mode !== "shape" && body.mode !== "photo-edges") return false;
  if (body.personBoxPx != null && !validatePersonBox(body.personBoxPx)) return false;
  if (body.cameraIntrinsics != null) {
    const camera = body.cameraIntrinsics;
    if (
      !Number.isFinite(camera.focalXPx)
      || !Number.isFinite(camera.focalYPx)
      || !Number.isFinite(camera.principalPointXPx)
      || !Number.isFinite(camera.principalPointYPx)
      || Number(camera.focalXPx) <= 0
      || Number(camera.focalYPx) <= 0
    ) return false;
  }
  if (body.mode === "photo-edges") {
    if (!Array.isArray(body.edgeRows) || body.edgeRows.length < 2 || body.edgeRows.length > 5) return false;
    const edgeKinds = new Set<string>();
    for (const row of body.edgeRows) {
      if (!row.kind || !VALID_EDGE_ROWS.has(row.kind) || edgeKinds.has(row.kind)) return false;
      if (!Number.isFinite(row.yNorm) || Number(row.yNorm) < 0 || Number(row.yNorm) > 1) return false;
      if (!Number.isFinite(row.leftXNorm) || Number(row.leftXNorm) < 0 || Number(row.leftXNorm) > 1) return false;
      if (!Number.isFinite(row.rightXNorm) || Number(row.rightXNorm) < 0 || Number(row.rightXNorm) > 1) return false;
      if (Number(row.rightXNorm) <= Number(row.leftXNorm)) return false;
      if (row.centerXNorm != null && (!Number.isFinite(row.centerXNorm) || Number(row.centerXNorm) < 0 || Number(row.centerXNorm) > 1)) return false;
      edgeKinds.add(row.kind);
    }
    return edgeKinds.size === body.edgeRows.length;
  }
  if (!Array.isArray(body.rows) || body.rows.length !== 3) return false;
  const kinds = new Set<string>();
  for (const row of body.rows) {
    if (!row.kind || !VALID_ROWS.has(row.kind) || kinds.has(row.kind)) return false;
    if (!Number.isFinite(row.yNorm) || Number(row.yNorm) < 0 || Number(row.yNorm) > 1) return false;
    if (!Number.isFinite(row.leftXNorm) || Number(row.leftXNorm) < 0 || Number(row.leftXNorm) > 1) return false;
    if (!Number.isFinite(row.rightXNorm) || Number(row.rightXNorm) < 0 || Number(row.rightXNorm) > 1) return false;
    if (Number(row.rightXNorm) <= Number(row.leftXNorm)) return false;
    if (row.heightFromFloorCm != null && (!Number.isFinite(row.heightFromFloorCm) || Number(row.heightFromFloorCm) < 0)) return false;
    kinds.add(row.kind);
  }
  return kinds.size === 3;
}

function validateProjectedEdgeRows(rows: MeshProjectedPhotoEdge[] | undefined): MeshProjectedPhotoEdge[] | null {
  if (rows == null) return null;
  if (!Array.isArray(rows) || rows.length < 2 || rows.length > 5) return null;
  const seen = new Set<string>();
  for (const row of rows) {
    if (!VALID_EDGE_ROWS.has(row.kind) || seen.has(row.kind)) return null;
    if (row.source !== "meta-sam-3d-body-mesh") return null;
    if (!Number.isFinite(row.yNorm) || row.yNorm < 0 || row.yNorm > 1) return null;
    if (!Number.isFinite(row.leftXNorm) || row.leftXNorm < 0 || row.leftXNorm > 1) return null;
    if (!Number.isFinite(row.rightXNorm) || row.rightXNorm < 0 || row.rightXNorm > 1) return null;
    if (row.rightXNorm <= row.leftXNorm) return null;
    if (!Number.isInteger(row.slicePointCount) || row.slicePointCount < 8 || row.slicePointCount > 2_000) return null;
    if (!Number.isFinite(row.alignmentErrorPx) || Math.abs(row.alignmentErrorPx) > 500) return null;
    seen.add(row.kind);
  }
  return rows;
}

function validatePredictionRows(rows: MeshShapePredictionRow[] | undefined): MeshShapePredictionRow[] | null {
  if (!Array.isArray(rows) || rows.length !== 3) return null;
  const seen = new Set<string>();
  for (const row of rows) {
    if (!VALID_ROWS.has(row.kind) || seen.has(row.kind)) return null;
    if (!Number.isFinite(row.superellipseExponent) || row.superellipseExponent < 1.2 || row.superellipseExponent > 4) return null;
    if (!Number.isFinite(row.meshPerimeterCm) || row.meshPerimeterCm <= 0) return null;
    if (!Number.isFinite(row.meshBreadthCm) || row.meshBreadthCm <= 0) return null;
    if (!Number.isFinite(row.meshDepthCm) || row.meshDepthCm <= 0) return null;
    if (!Number.isInteger(row.slicePointCount) || row.slicePointCount < 8) return null;
    if (!Number.isFinite(row.sliceHeightFromFloorCm) || row.sliceHeightFromFloorCm <= 0) return null;
    if (row.shapeEvidence != null && !validShapeEvidence(row.shapeEvidence)) return null;
    if (row.depthProfileEvidence != null && !validDepthProfileEvidence(row.depthProfileEvidence)) return null;
    if (
      !Array.isArray(row.sliceLoopM)
      || row.sliceLoopM.length < 8
      || row.sliceLoopM.length > 1_000
      || row.sliceLoopM.some((point) => (
        !Array.isArray(point)
        || point.length !== 3
        || point.some((coordinate) => !Number.isFinite(coordinate) || Math.abs(coordinate) > 5)
      ))
    ) return null;
    seen.add(row.kind);
  }
  return seen.size === 3 ? rows : null;
}

function validDepthProfileEvidence(value: MeshShapePredictionRow["depthProfileEvidence"]): boolean {
  if (!value || value.source !== "depth-pro-front-surface") return false;
  if (
    !Array.isArray(value.xNorm)
    || !Array.isArray(value.depthM)
    || value.xNorm.length !== value.depthM.length
    || value.xNorm.length < 31
    || value.xNorm.length > 121
    || value.xNorm.some((item) => !Number.isFinite(item) || Math.abs(item) > 1)
    || value.depthM.some((item) => !Number.isFinite(item) || item <= 0.05 || item > 20)
    || !Number.isFinite(value.sampleCoverage)
    || value.sampleCoverage < 0
    || value.sampleCoverage > 1
    || !Number.isFinite(value.heightScaleFactor)
    || value.heightScaleFactor < 0.45
    || value.heightScaleFactor > 2.2
    || !Number.isFinite(value.rawPredictedHeightM)
    || value.rawPredictedHeightM <= 0
    || value.rawPredictedHeightM > 5
    || !Number.isFinite(value.focalPx)
    || value.focalPx <= 0
  ) return false;
  return true;
}

function validShapeEvidence(value: MeshShapePredictionRow["shapeEvidence"]): boolean {
  if (!value) return false;
  if (value.source !== "canonical-neutral-nearby-slices" && value.source !== "posed-nearby-slices-fallback") return false;
  if (
    !Array.isArray(value.offsetsCm)
    || !Array.isArray(value.exponents)
    || !Array.isArray(value.acceptedExponents)
    || value.offsetsCm.length < 3
    || value.offsetsCm.length > 9
    || value.exponents.length !== value.offsetsCm.length
    || value.acceptedExponents.length < 3
    || value.acceptedExponents.length > value.exponents.length
    || value.offsetsCm.some((item) => !Number.isFinite(item) || Math.abs(item) > 10)
    || value.exponents.some((item) => !Number.isFinite(item) || item < 1.2 || item > 4)
    || value.acceptedExponents.some((item) => !Number.isFinite(item) || item < 1.2 || item > 4)
    || !Number.isFinite(value.exponentSpread)
    || value.exponentSpread < 0
    || value.exponentSpread > 3
    || !Number.isFinite(value.medianFitError)
    || value.medianFitError < 0
    || value.medianFitError > 2
    || !Number.isFinite(value.stability)
    || value.stability < 0
    || value.stability > 1
  ) return false;
  return true;
}

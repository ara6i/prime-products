import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CHECKPOINT_ROOT = ".local-ml/checkpoints/wear3d-waist-hips-v8-fresh-mask-h100-20260825";
const MODEL_FILE = "model.onnx";
const CURRENT_LIMIT = "Private waist/hip research model. V8 failed the fixed 448-person benchmark, so release, publishing, and SDK use remain blocked.";
const RUNTIME_FILE = "runtime.json";
const TRAIN = { subjects: 3_451, records: 31_059 };
const VALIDATION = { subjects: 427, records: 427 };
const MODEL_INPUT_WIDTH = 96;
const MODEL_INPUT_HEIGHT = 128;
const SOURCE_MASK_WIDTH = 192;
const SOURCE_MASK_HEIGHT = 256;
const CANONICAL_BODY_HEIGHT = 237;
const CANONICAL_BODY_MAX_WIDTH = 182;

type Gender = "female" | "male";
type RowName = "neck" | "chest" | "underbust" | "waist" | "hips";

interface FreshPredictBody {
  maskDataUrl?: string;
  heightCm?: number;
  weightKg?: number;
  gender?: Gender;
  landmarks?: Array<{ x?: number; y?: number; visibility?: number }>;
}

interface FreshRuntimeManifest {
  schemaVersion: "wear3d-waist-hips-v2-onnx-runtime/v1";
  modelVersion: string;
  modelSha256: string;
  imageSize: [number, number];
  sourceTrainingMaskSize: [number, number];
  profileFields: string[];
  targetSchema: string[];
  targetCount: number;
  outputsPhysicalValues: true;
  bestEpoch: number;
  bestValidationLoss: number;
  qualityGates: {
    beatsMeanBaseline: boolean;
    rows: { waist: boolean; hips: boolean };
    validationReadyFor448Benchmark: boolean;
  };
  validationMetrics: {
    rows?: Partial<Record<RowName, {
      yPixels?: { mae?: number };
      edgePixels?: { mae?: number };
      widthCm?: { mae?: number };
      depthCm?: { mae?: number };
      tapeCm?: { mae?: number; p95?: number; maximum?: number };
      shapeCoordinate?: { rSquared?: number; betweenPersonVarianceRatio?: number };
    }>>;
  };
  syntheticWearValidationCompleted: boolean;
  realPhotoValidated: boolean;
  sdkReady: boolean;
  sealed448SubjectsUsedForTraining: number;
  importantLimit: string;
}

interface MaskPlane {
  data: Uint8Array;
  width: number;
  height: number;
}

interface BoundingBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface CanonicalMask {
  data: Uint8Array;
  modelInput: Float32Array;
  source: MaskPlane;
  box: BoundingBox;
  offsetX: number;
  offsetY: number;
  targetWidth: number;
  targetHeight: number;
  scaleX: number;
  scaleY: number;
  foregroundPixels: number;
  removedForegroundPixels: number;
}

const ROWS: Array<[RowName, string, string]> = [
  ["waist", "Natural waist", "#f59e0b"],
  ["hips", "Hips", "#ec4899"],
];

let cachedRuntime: { modifiedMs: number; manifest: FreshRuntimeManifest } | null = null;
let cachedSession: {
  modifiedMs: number;
  session: import("onnxruntime-node").InferenceSession;
} | null = null;

function checkpointRoot() {
  const configured = process.env.WEAR_V8_MODEL_DIR?.trim();
  return configured || path.join(process.cwd(), DEFAULT_CHECKPOINT_ROOT);
}

function checkpointPath(fileName: string) {
  return path.join(/* turbopackIgnore: true */ checkpointRoot(), fileName);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finiteValue(value: unknown): number | null {
  return finite(value) ? value : null;
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function dataUrlBuffer(value: string): Buffer {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,([\s\S]+)$/.exec(value);
  if (!match?.[1]) throw new Error("The body mask must be a base64 image data URL.");
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.byteLength > 8 * 1024 * 1024) throw new Error("The body mask is too large.");
  return buffer;
}

async function loadRuntimeManifest() {
  const filePath = checkpointPath(RUNTIME_FILE);
  const fileStat = await stat(filePath);
  if (cachedRuntime?.modifiedMs === fileStat.mtimeMs) return cachedRuntime.manifest;
  const manifest = JSON.parse(await readFile(filePath, "utf8")) as FreshRuntimeManifest;
  if (
    manifest.schemaVersion !== "wear3d-waist-hips-v2-onnx-runtime/v1"
    || manifest.imageSize?.[0] !== MODEL_INPUT_WIDTH
    || manifest.imageSize?.[1] !== MODEL_INPUT_HEIGHT
    || manifest.sourceTrainingMaskSize?.[0] !== SOURCE_MASK_WIDTH
    || manifest.sourceTrainingMaskSize?.[1] !== SOURCE_MASK_HEIGHT
    || manifest.profileFields?.join("|") !== "height_cm|weight_kg|bmi|gender_female|gender_male"
    || manifest.targetCount !== 150
    || manifest.targetSchema?.length !== 150
    || manifest.outputsPhysicalValues !== true
    || manifest.sealed448SubjectsUsedForTraining !== 0
    || manifest.sdkReady !== false
  ) {
    throw new Error("The private V8 waist/hip ONNX package is incomplete or incompatible.");
  }
  cachedRuntime = { modifiedMs: fileStat.mtimeMs, manifest };
  return manifest;
}

async function loadSession() {
  const filePath = checkpointPath(MODEL_FILE);
  const fileStat = await stat(filePath);
  if (cachedSession?.modifiedMs === fileStat.mtimeMs) return cachedSession.session;
  const ort = await import("onnxruntime-node");
  const session = await ort.InferenceSession.create(filePath, {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });
  if (
    session.inputNames.join("|") !== "silhouette|profile"
    || session.outputNames.join("|") !== "targets"
  ) {
    throw new Error("The fresh ONNX tensor contract changed.");
  }
  cachedSession = { modifiedMs: fileStat.mtimeMs, session };
  return session;
}

async function decodeMask(maskDataUrl: string): Promise<MaskPlane> {
  const decoded = await sharp(dataUrlBuffer(maskDataUrl))
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (decoded.info.width < 32 || decoded.info.height < 32) {
    throw new Error("The body mask is too small.");
  }
  if (decoded.info.width * decoded.info.height > 1_500_000) {
    throw new Error("The body mask has too many pixels.");
  }
  const data = new Uint8Array(decoded.info.width * decoded.info.height);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = decoded.data[index * decoded.info.channels]! >= 128 ? 255 : 0;
  }
  return { data, width: decoded.info.width, height: decoded.info.height };
}

function largestConnectedSilhouette(source: MaskPlane) {
  const visited = new Uint8Array(source.data.length);
  const queue = new Int32Array(source.data.length);
  let best = new Int32Array(0);
  let foregroundPixels = 0;

  for (let start = 0; start < source.data.length; start += 1) {
    if (source.data[start]! < 128) continue;
    foregroundPixels += 1;
    if (visited[start]) continue;
    let read = 0;
    let write = 1;
    queue[0] = start;
    visited[start] = 1;
    while (read < write) {
      const current = queue[read++]!;
      const x = current % source.width;
      const y = Math.floor(current / source.width);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x + 1 < source.width ? current + 1 : -1,
        y > 0 ? current - source.width : -1,
        y + 1 < source.height ? current + source.width : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || visited[neighbor] || source.data[neighbor]! < 128) continue;
        visited[neighbor] = 1;
        queue[write++] = neighbor;
      }
    }
    if (write > best.length) best = queue.slice(0, write);
  }

  if (best.length < 200) throw new Error("The photo did not produce one usable full-body silhouette.");
  const cleaned = new Uint8Array(source.data.length);
  let left = source.width;
  let top = source.height;
  let right = -1;
  let bottom = -1;
  for (const index of best) {
    cleaned[index] = 255;
    const x = index % source.width;
    const y = Math.floor(index / source.width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return {
    cleaned: { data: cleaned, width: source.width, height: source.height },
    box: { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 },
    foregroundPixels,
    keptPixels: best.length,
  };
}

async function canonicalizeMask(source: MaskPlane): Promise<CanonicalMask> {
  const largest = largestConnectedSilhouette(source);
  const box = largest.box;
  const scale = Math.min(CANONICAL_BODY_HEIGHT / box.height, CANONICAL_BODY_MAX_WIDTH / box.width);
  const targetWidth = Math.max(1, Math.round(box.width * scale));
  const targetHeight = Math.max(1, Math.round(box.height * scale));
  const offsetX = Math.floor((SOURCE_MASK_WIDTH - targetWidth) / 2);
  const offsetY = Math.floor((SOURCE_MASK_HEIGHT - targetHeight) / 2);
  const output = new Uint8Array(SOURCE_MASK_WIDTH * SOURCE_MASK_HEIGHT);

  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    const sourceY = Math.min(box.bottom, box.top + Math.floor(((targetY + 0.5) / targetHeight) * box.height));
    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const sourceX = Math.min(box.right, box.left + Math.floor(((targetX + 0.5) / targetWidth) * box.width));
      if (largest.cleaned.data[sourceY * source.width + sourceX]! >= 128) {
        output[(offsetY + targetY) * SOURCE_MASK_WIDTH + offsetX + targetX] = 255;
      }
    }
  }

  const resized = await sharp(Buffer.from(output), {
    raw: { width: SOURCE_MASK_WIDTH, height: SOURCE_MASK_HEIGHT, channels: 1 },
  })
    .greyscale()
    .resize(MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT, { kernel: sharp.kernel.linear })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const modelInput = new Float32Array(MODEL_INPUT_WIDTH * MODEL_INPUT_HEIGHT);
  for (let index = 0; index < modelInput.length; index += 1) {
    modelInput[index] = resized.data[index * resized.info.channels]! / 255;
  }

  return {
    data: output,
    modelInput,
    source,
    box,
    offsetX,
    offsetY,
    targetWidth,
    targetHeight,
    scaleX: targetWidth / box.width,
    scaleY: targetHeight / box.height,
    foregroundPixels: largest.foregroundPixels,
    removedForegroundPixels: largest.foregroundPixels - largest.keptPixels,
  };
}

function canonicalPointToPhoto(mask: CanonicalMask, xNorm: number, yNorm: number) {
  const canonicalX = clamp(xNorm) * (SOURCE_MASK_WIDTH - 1);
  const canonicalY = clamp(yNorm) * (SOURCE_MASK_HEIGHT - 1);
  const sourceX = mask.box.left + (canonicalX - mask.offsetX) / mask.scaleX;
  const sourceY = mask.box.top + (canonicalY - mask.offsetY) / mask.scaleY;
  return {
    x: clamp(sourceX / Math.max(1, mask.source.width - 1)),
    y: clamp(sourceY / Math.max(1, mask.source.height - 1)),
  };
}

function buildProfile(body: FreshPredictBody) {
  if (!finite(body.heightCm) || body.heightCm < 100 || body.heightCm > 240) {
    throw new Error("Height must be between 100 and 240 cm.");
  }
  if (!finite(body.weightKg) || body.weightKg < 25 || body.weightKg > 300) {
    throw new Error("Weight must be between 25 and 300 kg.");
  }
  if (body.gender !== "female" && body.gender !== "male") throw new Error("Gender is required.");
  const bmi = body.weightKg / ((body.heightCm / 100) ** 2);
  return {
    bmi,
    normalized: [
      (body.heightCm - 170) / 20,
      (body.weightKg - 70) / 25,
      (bmi - 24) / 8,
      body.gender === "female" ? 1 : 0,
      body.gender === "male" ? 1 : 0,
    ],
  };
}

function warningsForPhoto(body: FreshPredictBody, mask: CanonicalMask) {
  const warnings = [
    "This is a normal-photo transfer test; the H100 validation used synthetic WEAR silhouettes.",
  ];
  if (mask.box.top <= 1) warnings.push("The head touches the top edge. Retake with the full head visible.");
  if (mask.box.bottom >= mask.source.height - 2) warnings.push("The feet touch the bottom edge. Leave space below both feet.");
  if (mask.box.height / mask.source.height < 0.62) warnings.push("The person is small in the photo. Move closer while keeping the full body visible.");
  if (mask.removedForegroundPixels / Math.max(1, mask.foregroundPixels) > 0.03) {
    warnings.push("Disconnected mask pieces were removed before ONNX inference.");
  }
  if (Array.isArray(body.landmarks) && body.landmarks.length === 33) {
    const leftShoulder = body.landmarks[11];
    const rightShoulder = body.landmarks[12];
    const leftWrist = body.landmarks[15];
    const rightWrist = body.landmarks[16];
    if (
      finite(leftShoulder?.y) && finite(leftWrist?.y) && leftWrist.y < leftShoulder.y + 0.1
      || finite(rightShoulder?.y) && finite(rightWrist?.y) && rightWrist.y < rightShoulder.y + 0.1
    ) {
      warnings.push("At least one hand is raised; V8 learned a neutral standing A-pose.");
    }
  }
  return warnings;
}

function responseError(error: unknown, status = 400) {
  return NextResponse.json({
    ok: false,
    error: error instanceof Error ? error.message : "Private V8 ONNX inference failed.",
  }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return responseError(new Error("This model is available only inside Test Lab."), 403);
  }
  try {
    const [manifest] = await Promise.all([
      loadRuntimeManifest(),
      stat(checkpointPath(MODEL_FILE)),
    ]);
    return NextResponse.json({
      ok: true,
      modelVersion: manifest.modelVersion,
      modelSha256: manifest.modelSha256,
      targetCount: manifest.targetCount,
      bestEpoch: manifest.bestEpoch,
      bestValidationLoss: manifest.bestValidationLoss,
      train: TRAIN,
      validation: VALIDATION,
      qualityGates: manifest.qualityGates,
      syntheticWearValidated: manifest.syntheticWearValidationCompleted,
      realPhotoValidated: manifest.realPhotoValidated,
      sdkReady: manifest.sdkReady,
      sealedTestSubjectsUsed: manifest.sealed448SubjectsUsedForTraining,
      importantLimit: CURRENT_LIMIT,
      benchmark448: {
        completed: true,
        people: 448,
        passed: false,
        rows: { waist: false, hips: false },
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return responseError(error, 409);
  }
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return responseError(new Error("This model is available only inside Test Lab."), 403);
  }
  try {
    const body = await request.json() as FreshPredictBody;
    if (!body.maskDataUrl) throw new Error("A MediaPipe full-body mask is required.");
    const [manifest, session, decodedMask] = await Promise.all([
      loadRuntimeManifest(),
      loadSession(),
      decodeMask(body.maskDataUrl),
    ]);
    const canonical = await canonicalizeMask(decodedMask);
    const profile = buildProfile(body);
    const ort = await import("onnxruntime-node");
    const inferenceStartedAt = performance.now();
    const output = await session.run({
      silhouette: new ort.Tensor("float32", canonical.modelInput, [1, 1, MODEL_INPUT_HEIGHT, MODEL_INPUT_WIDTH]),
      profile: new ort.Tensor("float32", Float32Array.from(profile.normalized), [1, 5]),
    });
    const targetTensor = output.targets;
    if (!targetTensor || targetTensor.data.length !== manifest.targetCount) {
      throw new Error("V8 returned an incompatible target tensor.");
    }
    const targets = Float32Array.from(targetTensor.data as Float32Array);
    const targetIndex = new Map(manifest.targetSchema.map((key, index) => [key, index]));
    const target = (key: string) => {
      const index = targetIndex.get(key);
      return index == null ? null : finiteValue(targets[index]);
    };
    const inferenceMs = performance.now() - inferenceStartedAt;

    const rows = ROWS.map(([kind, label, color]) => {
      const yNorm = target(`row.${kind}.y_norm`);
      const leftXNorm = target(`row.${kind}.left_x_norm`);
      const rightXNorm = target(`row.${kind}.right_x_norm`);
      const validLine = yNorm != null && leftXNorm != null && rightXNorm != null && rightXNorm > leftXNorm;
      const normalizedLine = validLine ? {
        left: { x: clamp(leftXNorm), y: clamp(yNorm) },
        right: { x: clamp(rightXNorm), y: clamp(yNorm) },
      } : null;
      return {
        kind,
        label,
        color,
        yNorm,
        leftXNorm,
        rightXNorm,
        line: normalizedLine ? {
          canonical: normalizedLine,
          photo: {
            left: canonicalPointToPhoto(canonical, normalizedLine.left.x, normalizedLine.left.y),
            right: canonicalPointToPhoto(canonical, normalizedLine.right.x, normalizedLine.right.y),
          },
        } : null,
        widthCm: target(`row.${kind}.width_cm`),
        depthCm: target(`row.${kind}.depth_cm`),
        depthWidthRatio: target(`row.${kind}.depth_width_ratio`),
        tapeCm: target(`tape.${kind}.circumference_cm`),
        shape: Array.from({ length: 32 }, (_, point) => ({
          x: target(`row.${kind}.shape.${String(point).padStart(2, "0")}.x`),
          depth: target(`row.${kind}.shape.${String(point).padStart(2, "0")}.depth`),
        })).filter((point): point is { x: number; depth: number } => point.x != null && point.depth != null),
        syntheticValidation: (() => {
          const metrics = manifest.validationMetrics.rows?.[kind];
          return metrics ? {
            yPixelMaeAt256: metrics.yPixels?.mae,
            edgePixelMaeAt192: metrics.edgePixels?.mae,
            widthCmMae: metrics.widthCm?.mae,
            depthCmMae: metrics.depthCm?.mae,
            tapeCmMae: metrics.tapeCm?.mae,
            tapeP95Cm: metrics.tapeCm?.p95,
            tapeWorstCm: metrics.tapeCm?.maximum,
            shapeRSquared: metrics.shapeCoordinate?.rSquared,
          } : null;
        })(),
      };
    });
    const ratios = manifest.targetSchema
      .filter((key) => key.startsWith("ratio."))
      .map((key) => ({ key, value: target(key) }));
    const camera = Object.fromEntries(manifest.targetSchema
      .filter((key) => key.startsWith("camera."))
      .map((key) => [key.slice("camera.".length), target(key)]));

    const canonicalPng = await sharp(Buffer.from(canonical.data), {
      raw: { width: SOURCE_MASK_WIDTH, height: SOURCE_MASK_HEIGHT, channels: 1 },
    }).png().toBuffer();
    const warnings = warningsForPhoto(body, canonical);

    return NextResponse.json({
      ok: true,
      model: {
        version: manifest.modelVersion,
        sha256: manifest.modelSha256,
        targetCount: manifest.targetCount,
        bestEpoch: manifest.bestEpoch,
        bestValidationLoss: manifest.bestValidationLoss,
        train: TRAIN,
        validation: VALIDATION,
        qualityGates: manifest.qualityGates,
        syntheticWearValidated: manifest.syntheticWearValidationCompleted,
        realPhotoValidated: manifest.realPhotoValidated,
        sealedTestSubjectsUsed: manifest.sealed448SubjectsUsedForTraining,
        sdkReady: manifest.sdkReady,
        importantLimit: CURRENT_LIMIT,
      },
      inputContract: {
        usedByOnnx: ["canonical front silhouette", "height", "weight", "BMI", "female flag", "male flag"],
        usedBeforeOnnx: ["MediaPipe segmentation", "largest connected body cleanup", "canonical framing"],
        notUsedByOnnx: ["raw RGB", "saved tape answers", "Apple Vision measurements", "Depth Pro measurements", "old V6/V7 predictions"],
        cameraHandling: "V8 predicts diagnostic camera corrections; Apple Vision and Depth Pro are applied only afterward as a labeled comparison stage.",
      },
      profile: {
        heightCm: body.heightCm,
        weightKg: body.weightKg,
        bmi: Number(profile.bmi.toFixed(2)),
        gender: body.gender,
      },
      preprocessing: {
        rawMaskSize: [canonical.source.width, canonical.source.height],
        canonicalMaskSize: [SOURCE_MASK_WIDTH, SOURCE_MASK_HEIGHT],
        modelInputSize: [MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT],
        sourceBodyBox: canonical.box,
        canonicalBodyBox: {
          left: canonical.offsetX,
          top: canonical.offsetY,
          right: canonical.offsetX + canonical.targetWidth - 1,
          bottom: canonical.offsetY + canonical.targetHeight - 1,
          width: canonical.targetWidth,
          height: canonical.targetHeight,
        },
        removedForegroundPixels: canonical.removedForegroundPixels,
        warnings: [
          "Private V8 research model: hips passed the 427-person validation gate and waist did not; both rows failed the later fixed 448-person benchmark.",
          "The 448 people were excluded from V8 training and checkpoint selection, but their labels were already opened during older model testing, so this is a fixed benchmark rather than a pristine final test.",
          ...warnings,
        ],
        quality: warnings.length === 1 ? "transfer-test" : "review",
      },
      canonicalMaskDataUrl: `data:image/png;base64,${canonicalPng.toString("base64")}`,
      rows,
      ratios,
      camera,
      timing: {
        inferenceMs: Number(inferenceMs.toFixed(2)),
        totalMs: Number((performance.now() - startedAt).toFixed(2)),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return responseError(error);
  }
}

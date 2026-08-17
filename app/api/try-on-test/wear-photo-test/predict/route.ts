import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { measureMaskWidthAtY } from "@/app/try-on-test/sizing-lab/lib/bodyMaskGeometry";
import type { PoseResult } from "@/app/try-on-test/sizing-lab/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHECKPOINT_ROOT = ".local-ml/checkpoints/wear3d-standing-a-v5-all-targets-20260814";
const MODEL_FILE = "model.onnx";
const MODEL_DATA_FILE = "model.onnx.data";
const RUNTIME_FILE = "runtime.json";
const BODY_MASK_WIDTH = 192;
const BODY_MASK_HEIGHT = 256;
const CANONICAL_BODY_HEIGHT = 237;
const CANONICAL_BODY_MAX_WIDTH = 182;

type Gender = "female" | "male";

interface PredictBody {
  maskDataUrl?: string;
  heightCm?: number;
  weightKg?: number;
  gender?: Gender;
  landmarks?: Array<{ x?: number; y?: number; visibility?: number }>;
}

interface RuntimeManifest {
  schemaVersion: number;
  modelVersion: string;
  targetKeys: string[];
  structuredKeys: string[];
  structuredMean: number[];
  structuredStd: number[];
  targetMean: number[];
  targetStd: number[];
  imageSize: [number, number];
  trainingPose: string;
  maskCleanup: string;
  syntheticCandidatePassed: boolean;
  sdkReady: boolean;
  split: { train: number; validation: number; test: number };
  keyMeasurements: Record<string, { mae?: number; median_absolute_error?: number; count?: number }>;
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
  source: MaskPlane;
  box: BoundingBox;
  offsetX: number;
  offsetY: number;
  targetWidth: number;
  targetHeight: number;
  scaleX: number;
  scaleY: number;
  removedForegroundPixels: number;
  originalForegroundPixels: number;
}

interface RowPoint {
  x: number;
  y: number;
}

interface RowEdgeCandidate {
  source: "trained-model" | "mediapipe-torso-fallback" | "mediapipe-torso-mask";
  canonical: { left: RowPoint; right: RowPoint };
  photo: { left: RowPoint; right: RowPoint };
}

interface PredictionRow {
  kind: string;
  label: string;
  color: string;
  edgeSource: "trained-model" | "mediapipe-torso-fallback";
  canonical: { left: RowPoint; right: RowPoint };
  photo: { left: RowPoint; right: RowPoint };
  edgeCandidates: {
    wear: RowEdgeCandidate;
    visible: RowEdgeCandidate | null;
  };
}

let cachedRuntime: { modifiedMs: number; manifest: RuntimeManifest } | null = null;
let cachedSession: {
  modifiedMs: number;
  session: import("onnxruntime-node").InferenceSession;
} | null = null;

function checkpointPath(fileName: string) {
  return path.join(/* turbopackIgnore: true */ process.cwd(), CHECKPOINT_ROOT, fileName);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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
  const manifest = JSON.parse(await readFile(filePath, "utf8")) as RuntimeManifest;
  const targetCount = manifest.targetKeys?.length ?? 0;
  if (
    manifest.schemaVersion !== 1
    || manifest.modelVersion !== "wear3d-standing-a-v5-all-targets-20260814"
    || manifest.imageSize?.[0] !== BODY_MASK_WIDTH
    || manifest.imageSize?.[1] !== BODY_MASK_HEIGHT
    || manifest.structuredKeys?.length !== 4
    || manifest.structuredMean?.length !== 4
    || manifest.structuredStd?.length !== 4
    || manifest.targetMean?.length !== targetCount
    || manifest.targetStd?.length !== targetCount
  ) {
    throw new Error("The local WEAR runtime package is incomplete or incompatible.");
  }
  cachedRuntime = { modifiedMs: fileStat.mtimeMs, manifest };
  return manifest;
}

async function loadSession() {
  const filePath = checkpointPath(MODEL_FILE);
  const fileStat = await stat(filePath);
  await stat(checkpointPath(MODEL_DATA_FILE));
  if (cachedSession?.modifiedMs === fileStat.mtimeMs) return cachedSession.session;
  const ort = await import("onnxruntime-node");
  const session = await ort.InferenceSession.create(filePath, {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });
  cachedSession = { modifiedMs: fileStat.mtimeMs, session };
  return session;
}

async function decodeMask(maskDataUrl: string): Promise<MaskPlane> {
  const decoded = await sharp(dataUrlBuffer(maskDataUrl))
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (decoded.info.width < 32 || decoded.info.height < 32) throw new Error("The body mask is too small.");
  if (decoded.info.width * decoded.info.height > 1_500_000) throw new Error("The body mask has too many pixels.");
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

  if (best.length < 200) throw new Error("MediaPipe did not produce a usable connected body silhouette.");
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
  const box = {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  };
  return {
    cleaned: { data: cleaned, width: source.width, height: source.height },
    box,
    foregroundPixels,
    keptPixels: best.length,
  };
}

function canonicalizeMask(source: MaskPlane): CanonicalMask {
  const largest = largestConnectedSilhouette(source);
  const box = largest.box;
  const scale = Math.min(CANONICAL_BODY_HEIGHT / box.height, CANONICAL_BODY_MAX_WIDTH / box.width);
  const targetWidth = Math.max(1, Math.round(box.width * scale));
  const targetHeight = Math.max(1, Math.round(box.height * scale));
  const offsetX = Math.floor((BODY_MASK_WIDTH - targetWidth) / 2);
  const offsetY = Math.floor((BODY_MASK_HEIGHT - targetHeight) / 2);
  const output = new Uint8Array(BODY_MASK_WIDTH * BODY_MASK_HEIGHT);

  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    const sourceY = Math.min(box.bottom, box.top + Math.floor(((targetY + 0.5) / targetHeight) * box.height));
    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const sourceX = Math.min(box.right, box.left + Math.floor(((targetX + 0.5) / targetWidth) * box.width));
      if (largest.cleaned.data[sourceY * source.width + sourceX]! >= 128) {
        output[(offsetY + targetY) * BODY_MASK_WIDTH + offsetX + targetX] = 255;
      }
    }
  }

  return {
    data: output,
    source,
    box,
    offsetX,
    offsetY,
    targetWidth,
    targetHeight,
    scaleX: targetWidth / box.width,
    scaleY: targetHeight / box.height,
    removedForegroundPixels: largest.foregroundPixels - largest.keptPixels,
    originalForegroundPixels: largest.foregroundPixels,
  };
}

function canonicalPointToPhoto(mask: CanonicalMask, x: number, y: number) {
  const sourceX = mask.box.left + (x - mask.offsetX) / mask.scaleX;
  const sourceY = mask.box.top + (y - mask.offsetY) / mask.scaleY;
  return {
    x: clamp(sourceX / Math.max(1, mask.source.width - 1)),
    y: clamp(sourceY / Math.max(1, mask.source.height - 1)),
  };
}

function sourcePointToCanonical(mask: CanonicalMask, x: number, y: number) {
  return {
    x: clamp((mask.offsetX + (x - mask.box.left) * mask.scaleX) / (BODY_MASK_WIDTH - 1)),
    y: clamp((mask.offsetY + (y - mask.box.top) * mask.scaleY) / (BODY_MASK_HEIGHT - 1)),
  };
}

function poseForTorsoSlices(body: PredictBody, mask: CanonicalMask): PoseResult | null {
  if (!Array.isArray(body.landmarks) || body.landmarks.length !== 33) return null;
  return {
    landmarks: body.landmarks.map((landmark) => ({
      x: finite(landmark.x) ? landmark.x : 0,
      y: finite(landmark.y) ? landmark.y : 0,
      z: 0,
      visibility: finite(landmark.visibility) ? landmark.visibility : 0,
    })),
    mask: Uint8ClampedArray.from(mask.source.data),
    maskWidth: mask.source.width,
    maskHeight: mask.source.height,
    maskSource: "pose",
  };
}

function torsoCenterXNorm(pose: PoseResult, sourceY: number) {
  const leftShoulder = pose.landmarks[11];
  const rightShoulder = pose.landmarks[12];
  const leftHip = pose.landmarks[23];
  const rightHip = pose.landmarks[24];
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 0.5;
  const shoulderX = (leftShoulder.x + rightShoulder.x) / 2;
  const hipX = (leftHip.x + rightHip.x) / 2;
  const shoulderY = ((leftShoulder.y + rightShoulder.y) / 2) * pose.maskHeight;
  const hipY = ((leftHip.y + rightHip.y) / 2) * pose.maskHeight;
  const torsoFraction = clamp((sourceY - shoulderY) / Math.max(1, hipY - shoulderY));
  return shoulderX + (hipX - shoulderX) * torsoFraction;
}

function torsoOnlyRunAtCanonicalY(body: PredictBody, mask: CanonicalMask, canonicalY: number) {
  const pose = poseForTorsoSlices(body, mask);
  if (!pose) return null;
  const sourceY = clamp(
    mask.box.top + (canonicalY - mask.offsetY) / mask.scaleY,
    0,
    mask.source.height - 1,
  );
  const measured = measureMaskWidthAtY(
    pose,
    mask.source.width,
    mask.source.height,
    1,
    sourceY / mask.source.height,
    torsoCenterXNorm(pose, sourceY),
    3,
    {
      excludeLimbs: true,
      segmentMode: "center-walk",
      exclusionMode: "limb-capsules",
    },
  );
  if (!measured) return null;
  return {
    sourceY,
    left: clamp(measured.leftXNorm * mask.source.width, 0, mask.source.width - 1),
    right: clamp(measured.rightXNorm * mask.source.width, 0, mask.source.width - 1),
  };
}

function buildProfile(body: PredictBody, manifest: RuntimeManifest) {
  if (!finite(body.heightCm) || body.heightCm < 100 || body.heightCm > 240) {
    throw new Error("Height must be between 100 and 240 cm.");
  }
  if (!finite(body.weightKg) || body.weightKg < 25 || body.weightKg > 300) {
    throw new Error("Weight must be between 25 and 300 kg.");
  }
  if (body.gender !== "female" && body.gender !== "male") throw new Error("Gender is required.");
  const bmi = body.weightKg / ((body.heightCm / 100) ** 2);
  const nativeValues = [body.heightCm, body.weightKg, bmi, body.gender === "female" ? 1 : 0];
  const normalized = nativeValues.map((value, index) => (
    (value - manifest.structuredMean[index]!) / manifest.structuredStd[index]!
  ));
  return { bmi, nativeValues, normalized };
}

function targetValue(targets: Float32Array, manifest: RuntimeManifest, key: string) {
  const index = manifest.targetKeys.indexOf(key);
  if (index < 0) return null;
  return targets[index]! * manifest.targetStd[index]! + manifest.targetMean[index]!;
}

function photoWarnings(body: PredictBody, mask: CanonicalMask) {
  const warnings: string[] = [];
  if (mask.box.top <= 1) warnings.push("The head touches the top edge. Use a photo with the full head visible.");
  if (mask.box.bottom >= mask.source.height - 2) warnings.push("The feet touch the bottom edge. Leave space below both feet.");
  const bodyHeightFraction = mask.box.height / mask.source.height;
  if (bodyHeightFraction < 0.62) warnings.push("The person is small in the photo. Move closer while keeping the full body visible.");
  const foregroundFraction = mask.originalForegroundPixels / (mask.source.width * mask.source.height);
  if (foregroundFraction > 0.48) warnings.push("The body mask covers too much of the image. Use a cleaner background and more space around the body.");
  if (mask.removedForegroundPixels / Math.max(1, mask.originalForegroundPixels) > 0.03) {
    warnings.push("Extra disconnected mask pieces were removed before inference.");
  }
  const landmarks = body.landmarks;
  if (Array.isArray(landmarks) && landmarks.length === 33) {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    if (
      finite(leftShoulder?.y) && finite(leftWrist?.y) && leftWrist.y < leftShoulder.y + 0.1
      || finite(rightShoulder?.y) && finite(rightWrist?.y) && rightWrist.y < rightShoulder.y + 0.1
    ) {
      warnings.push("At least one hand is raised. The model was trained on a neutral standing A-pose.");
    }
    const visibleAnkles = [landmarks[27], landmarks[28]].filter((point) => finite(point?.visibility) && point.visibility >= 0.45);
    if (visibleAnkles.length < 2) warnings.push("Both ankles were not confidently detected.");
  }
  return warnings;
}

function photoQuality(warnings: string[]): "good" | "review" | "retake" {
  const requiresRetake = warnings.some((warning) => (
    warning.startsWith("The head touches")
    || warning.startsWith("The feet touch")
    || warning.startsWith("At least one hand is raised")
    || warning.startsWith("Both ankles were not")
  ));
  if (requiresRetake) return "retake";
  return warnings.length === 0 ? "good" : "review";
}

const MEASUREMENTS = [
  ["chest", "Chest", "measurements_mm.chest_circumference_mm"],
  ["underbust", "Under-bust", "measurements_mm.underbust_circumference_mm"],
  ["waist", "Natural waist", "measurements_mm.waist_circumference_mm"],
  ["hips", "Hips", "measurements_mm.hip_circumference_mm"],
  ["neck", "Neck base", "measurements_mm.neck_base_circumference_mm"],
  ["shoulder", "Shoulder breadth", "measurements_mm.shoulder_breadth_mm"],
  ["arm", "Shoulder to wrist", "measurements_mm.arm_length_shoulder_to_wrist_mm"],
  ["armscye", "Armscye", "measurements_mm.armscye_circumference_mm"],
  ["thigh", "Thigh", "measurements_mm.thigh_circumference_mm"],
] as const;

const ROWS = [
  ["neck", "Neck", "#14b8a6"],
  ["chest", "Chest", "#2563eb"],
  ["underbust", "Under-bust", "#8b5cf6"],
  ["waist", "Natural waist", "#f59e0b"],
  ["hips", "Hips", "#ec4899"],
] as const;

const SEGMENTS = [
  ["shoulders", "Shoulders", "#06b6d4", 2],
  ["left_sleeve", "Left sleeve", "#22c55e", 3],
  ["right_sleeve", "Right sleeve", "#22c55e", 3],
  ["left_inseam", "Left inseam", "#ef4444", 2],
  ["right_inseam", "Right inseam", "#ef4444", 2],
] as const;

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ ok: false, error: "This model test is available only inside Test Lab." }, { status: 403 });
  }
  try {
    const [manifest] = await Promise.all([
      loadRuntimeManifest(),
      stat(checkpointPath(MODEL_FILE)),
      stat(checkpointPath(MODEL_DATA_FILE)),
    ]);
    return NextResponse.json({
      ok: true,
      modelVersion: manifest.modelVersion,
      targetCount: manifest.targetKeys.length,
      syntheticCandidatePassed: manifest.syntheticCandidatePassed,
      sdkReady: manifest.sdkReady,
      split: manifest.split,
      importantLimit: manifest.importantLimit,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "The local WEAR checkpoint is unavailable.",
    }, { status: 409 });
  }
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ ok: false, error: "This model test is available only inside Test Lab." }, { status: 403 });
  }
  try {
    const body = await request.json() as PredictBody;
    if (!body.maskDataUrl) throw new Error("A MediaPipe body mask is required.");
    const [manifest, session, decodedMask] = await Promise.all([
      loadRuntimeManifest(),
      loadSession(),
      decodeMask(body.maskDataUrl),
    ]);
    const canonical = canonicalizeMask(decodedMask);
    const profile = buildProfile(body, manifest);
    const ort = await import("onnxruntime-node");
    const bodyMask = new Float32Array(canonical.data.length);
    for (let index = 0; index < canonical.data.length; index += 1) {
      bodyMask[index] = canonical.data[index]! / 255;
    }
    const inferenceStartedAt = performance.now();
    const output = await session.run({
      body_mask: new ort.Tensor("float32", bodyMask, [1, 1, BODY_MASK_HEIGHT, BODY_MASK_WIDTH]),
      profile: new ort.Tensor("float32", Float32Array.from(profile.normalized), [1, 4]),
    });
    const targetTensor = output.targets;
    if (!targetTensor || targetTensor.data.length !== manifest.targetKeys.length) {
      throw new Error("The model returned an incompatible output tensor.");
    }
    const targetData = Float32Array.from(targetTensor.data as Float32Array);
    const inferenceMs = performance.now() - inferenceStartedAt;

    const measurements = MEASUREMENTS
      .filter(([kind]) => kind !== "underbust" || body.gender === "female")
      .map(([kind, label, key]) => ({
        kind,
        label,
        key,
        valueCm: Number((targetValue(targetData, manifest, key) ?? 0).toFixed(2)),
        syntheticMaeCm: manifest.keyMeasurements[key]?.mae ?? null,
        syntheticTestCount: manifest.keyMeasurements[key]?.count ?? null,
      }));

    const rows = ROWS
      .filter(([kind]) => kind !== "underbust" || body.gender === "female")
      .flatMap<PredictionRow>(([kind, label, color]) => {
        const yNorm = targetValue(targetData, manifest, `row.${kind}.y_norm`);
        if (!finite(yNorm)) return [];
        const y = clamp(yNorm) * (BODY_MASK_HEIGHT - 1);
        const visibleRun = torsoOnlyRunAtCanonicalY(body, canonical, y);
        const visibleEdge = visibleRun ? {
          source: "mediapipe-torso-mask" as const,
          canonical: {
            left: sourcePointToCanonical(canonical, visibleRun.left, visibleRun.sourceY),
            right: sourcePointToCanonical(canonical, visibleRun.right, visibleRun.sourceY),
          },
          photo: {
            left: {
              x: visibleRun.left / Math.max(1, canonical.source.width - 1),
              y: visibleRun.sourceY / Math.max(1, canonical.source.height - 1),
            },
            right: {
              x: visibleRun.right / Math.max(1, canonical.source.width - 1),
              y: visibleRun.sourceY / Math.max(1, canonical.source.height - 1),
            },
          },
        } : null;
        const learnedLeftXNorm = targetValue(targetData, manifest, `row.${kind}.left_x_norm`);
        const learnedRightXNorm = targetValue(targetData, manifest, `row.${kind}.right_x_norm`);
        if (
          finite(learnedLeftXNorm)
          && finite(learnedRightXNorm)
          && learnedRightXNorm - learnedLeftXNorm >= 0.04
        ) {
          const canonicalLeft = { x: clamp(learnedLeftXNorm), y: clamp(yNorm) };
          const canonicalRight = { x: clamp(learnedRightXNorm), y: clamp(yNorm) };
          return [{
            kind,
            label,
            color,
            edgeSource: "trained-model",
            canonical: { left: canonicalLeft, right: canonicalRight },
            photo: {
              left: canonicalPointToPhoto(
                canonical,
                canonicalLeft.x * (BODY_MASK_WIDTH - 1),
                canonicalLeft.y * (BODY_MASK_HEIGHT - 1),
              ),
              right: canonicalPointToPhoto(
                canonical,
                canonicalRight.x * (BODY_MASK_WIDTH - 1),
                canonicalRight.y * (BODY_MASK_HEIGHT - 1),
              ),
            },
            edgeCandidates: {
              wear: {
                source: "trained-model" as const,
                canonical: { left: canonicalLeft, right: canonicalRight },
                photo: {
                  left: canonicalPointToPhoto(
                    canonical,
                    canonicalLeft.x * (BODY_MASK_WIDTH - 1),
                    canonicalLeft.y * (BODY_MASK_HEIGHT - 1),
                  ),
                  right: canonicalPointToPhoto(
                    canonical,
                    canonicalRight.x * (BODY_MASK_WIDTH - 1),
                    canonicalRight.y * (BODY_MASK_HEIGHT - 1),
                  ),
                },
              },
              visible: visibleEdge,
            },
          }];
        }
        if (!visibleRun || !visibleEdge) return [];
        const canonicalLeft = visibleEdge.canonical.left;
        const canonicalRight = visibleEdge.canonical.right;
        return [{
          kind,
          label,
          color,
          edgeSource: "mediapipe-torso-fallback",
          canonical: { left: canonicalLeft, right: canonicalRight },
          photo: visibleEdge.photo,
          edgeCandidates: {
            wear: {
              source: "mediapipe-torso-fallback" as const,
              canonical: visibleEdge.canonical,
              photo: visibleEdge.photo,
            },
            visible: visibleEdge,
          },
        }];
      });

    const segments = SEGMENTS.flatMap(([kind, label, color, pointCount]) => {
      const canonicalPoints = Array.from({ length: pointCount }, (_, pointIndex) => {
        const x = targetValue(targetData, manifest, `segment.${kind}.${pointIndex}.x`);
        const y = targetValue(targetData, manifest, `segment.${kind}.${pointIndex}.y`);
        if (!finite(x) || !finite(y)) return null;
        return { x: clamp(x), y: clamp(y) };
      });
      if (canonicalPoints.some((point) => point === null)) return [];
      const points = canonicalPoints as Array<{ x: number; y: number }>;
      return [{
        kind,
        label,
        color,
        canonical: points,
        photo: points.map((point) => canonicalPointToPhoto(
          canonical,
          point.x * (BODY_MASK_WIDTH - 1),
          point.y * (BODY_MASK_HEIGHT - 1),
        )),
      }];
    });

    const landmarkNames = manifest.targetKeys.flatMap((key) => (
      key.startsWith("landmark.") && key.endsWith(".x")
        ? [key.slice("landmark.".length, -".x".length)]
        : []
    ));
    const landmarks = landmarkNames.flatMap((name) => {
      const x = targetValue(targetData, manifest, `landmark.${name}.x`);
      const y = targetValue(targetData, manifest, `landmark.${name}.y`);
      if (!finite(x) || !finite(y)) return [];
      const canonicalPoint = { x: clamp(x), y: clamp(y) };
      return [{
        name,
        canonical: canonicalPoint,
        photo: canonicalPointToPhoto(
          canonical,
          canonicalPoint.x * (BODY_MASK_WIDTH - 1),
          canonicalPoint.y * (BODY_MASK_HEIGHT - 1),
        ),
      }];
    });

    const canonicalPng = await sharp(Buffer.from(canonical.data), {
      raw: { width: BODY_MASK_WIDTH, height: BODY_MASK_HEIGHT, channels: 1 },
    }).png().toBuffer();
    const warnings = photoWarnings(body, canonical);
    const allPredictions = manifest.targetKeys.map((key, index) => ({
      key,
      value: Number((targetData[index]! * manifest.targetStd[index]! + manifest.targetMean[index]!).toFixed(5)),
      unit: key.startsWith("measurements_mm.")
        || key.startsWith("extracted_standing_mm.")
        || key.endsWith(".visible_width_cm")
        || key.endsWith(".depth_cm")
        ? "cm"
        : "normalized",
    }));

    return NextResponse.json({
      ok: true,
      model: {
        version: manifest.modelVersion,
        targetCount: manifest.targetKeys.length,
        trainingPose: manifest.trainingPose,
        syntheticCandidatePassed: manifest.syntheticCandidatePassed,
        sdkReady: manifest.sdkReady,
        split: manifest.split,
        importantLimit: manifest.importantLimit,
      },
      inputContract: {
        usedByModel: ["cleaned front body mask", "height", "weight", "BMI", "gender"],
        notUsedByModel: ["face identity", "background", "photo colors", "MediaPipe landmarks"],
        usedAfterPrediction: [
          "MediaPipe landmarks isolate visible torso-only mask edges for the comparison mode",
          "MediaPipe torso edges remain the safety fallback if a trained WEAR row edge is invalid",
        ],
      },
      profile: {
        heightCm: body.heightCm,
        weightKg: body.weightKg,
        bmi: Number(profile.bmi.toFixed(2)),
        gender: body.gender,
      },
      preprocessing: {
        rawMaskSize: [canonical.source.width, canonical.source.height],
        canonicalMaskSize: [BODY_MASK_WIDTH, BODY_MASK_HEIGHT],
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
        warnings,
        quality: photoQuality(warnings),
      },
      canonicalMaskDataUrl: `data:image/png;base64,${canonicalPng.toString("base64")}`,
      measurements,
      rows,
      segments,
      landmarks,
      allPredictions,
      timing: {
        inferenceMs: Number(inferenceMs.toFixed(2)),
        totalMs: Number((performance.now() - startedAt).toFixed(2)),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "The WEAR photo test failed.",
    }, { status: 400 });
  }
}

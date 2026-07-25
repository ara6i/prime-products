import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { measureMaskWidthAtY } from "@/app/try-on-test/sizing-lab/lib/bodyMaskGeometry";
import {
  LOCAL_ML_CHECKPOINT_RELATIVE_PATH,
  LOCAL_ML_MODEL_VERSION,
  WEAR_ABSOLUTE_DEPTH_MODEL_VERSION,
  WEAR_ABSOLUTE_DEPTH_RELATIVE_PATH,
  WEAR_DIRECT_DEPTH_MODEL_VERSION,
  WEAR_DIRECT_DEPTH_RELATIVE_PATH,
  WEAR_ROW_PRIOR_MODEL_VERSION,
  WEAR_ROW_PRIOR_RELATIVE_PATH,
  WEAR_SHAPE_EXPONENT_MODEL_VERSION,
  WEAR_SHAPE_EXPONENT_RELATIVE_PATH,
  type LocalMlNormalizedRowPrediction,
  type LocalMlPredictionResponse,
  type LocalMlWearAbsoluteDepthModel,
  type LocalMlWearDirectDepthCohort,
  type LocalMlWearReferenceCohort,
  type LocalMlWearShapeExponentModel,
} from "@/app/try-on-test/sizing-lab/lib/localMlSizing";
import type { PoseResult } from "@/app/try-on-test/sizing-lab/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INPUT_SIZE = 384;
const RGB_MEAN = [0.485, 0.456, 0.406];
const RGB_STD = [0.229, 0.224, 0.225];
const ROWS = ["waist", "trouserWaist", "hips"] as const;

let cachedSession: {
  modifiedMs: number;
  session: import("onnxruntime-node").InferenceSession;
} | null = null;

interface WearRowPriorDefinition {
  definition: string;
  sampleCount: number;
  surveyCount: number;
  genderCounts: Partial<Record<"male" | "female", number>>;
  validationMode: string;
  coefficients: number[];
  normalization: {
    heightMean: number;
    heightStd: number;
    bmiMean: number;
    bmiStd: number;
  };
  outputMin: number;
  outputMax: number;
  validationMaeAt170Cm: number;
  validationP90At170Cm: number;
  referenceCohorts?: Array<Omit<LocalMlWearReferenceCohort, "genderMatched">>;
}

interface WearRowPriorModel {
  version: string;
  depthReady: false;
  endpointSource: string;
  featureNames: string[];
  rows: Record<(typeof ROWS)[number], WearRowPriorDefinition>;
}

interface WearDirectDepthRowDefinition {
  measurement: string;
  cohorts: Array<Omit<LocalMlWearDirectDepthCohort, "measurement">>;
}

interface WearDirectDepthModel {
  version: string;
  method: string;
  heightBinCm: number;
  bmiBin: number;
  minPeople: number;
  rows: Record<(typeof ROWS)[number], WearDirectDepthRowDefinition>;
}

interface WearAbsoluteDepthArtifact {
  version: string;
  method: string;
  formula: string;
  rows: Record<(typeof ROWS)[number], LocalMlWearAbsoluteDepthModel>;
}

interface WearShapeExponentArtifact {
  version: string;
  method: string;
  formula: string;
  rows: Partial<Record<(typeof ROWS)[number], LocalMlWearShapeExponentModel>>;
  unavailableRows?: Partial<Record<(typeof ROWS)[number], { label: string; reason: string }>>;
}

let cachedWearRowPrior: {
  modifiedMs: number;
  model: WearRowPriorModel;
} | null = null;

let cachedWearDirectDepth: {
  modifiedMs: number;
  model: WearDirectDepthModel;
} | null = null;

let cachedWearAbsoluteDepth: {
  modifiedMs: number;
  model: WearAbsoluteDepthArtifact;
} | null = null;

let cachedWearShapeExponent: {
  modifiedMs: number;
  model: WearShapeExponentArtifact;
} | null = null;

interface PredictBody {
  imageDataUrl?: string;
  maskDataUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  heightCm?: number;
  weightKg?: number;
  gender?: "male" | "female";
  landmarks?: Array<{ x?: number; y?: number; visibility?: number }>;
}

function dataUrlBuffer(value: string, label: string): Buffer {
  const match = /^data:[^;]+;base64,([\s\S]+)$/.exec(value);
  if (!match?.[1]) throw new Error(`${label} must be a base64 data URL.`);
  return Buffer.from(match[1], "base64");
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

async function optionalStat(filePath: string) {
  try {
    return await stat(filePath);
  } catch {
    return null;
  }
}

async function loadSession(checkpointPath: string) {
  const checkpointStat = await stat(checkpointPath);
  if (cachedSession?.modifiedMs === checkpointStat.mtimeMs) return cachedSession.session;
  const ort = await import("onnxruntime-node");
  const session = await ort.InferenceSession.create(checkpointPath, {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });
  cachedSession = { modifiedMs: checkpointStat.mtimeMs, session };
  return session;
}

async function loadWearRowPrior(modelPath: string): Promise<WearRowPriorModel> {
  const modelStat = await stat(modelPath);
  if (cachedWearRowPrior?.modifiedMs === modelStat.mtimeMs) return cachedWearRowPrior.model;
  const model = JSON.parse(await readFile(modelPath, "utf8")) as WearRowPriorModel;
  if (
    model.version !== WEAR_ROW_PRIOR_MODEL_VERSION
    || !model.rows
    || ROWS.some((kind) => !model.rows[kind] || model.rows[kind].coefficients.length !== 6)
  ) {
    throw new Error("The WEAR 1D row checkpoint is invalid or incompatible.");
  }
  cachedWearRowPrior = { modifiedMs: modelStat.mtimeMs, model };
  return model;
}

async function loadWearDirectDepth(modelPath: string): Promise<WearDirectDepthModel> {
  const modelStat = await stat(modelPath);
  if (cachedWearDirectDepth?.modifiedMs === modelStat.mtimeMs) return cachedWearDirectDepth.model;
  const model = JSON.parse(await readFile(modelPath, "utf8")) as WearDirectDepthModel;
  if (
    model.version !== WEAR_DIRECT_DEPTH_MODEL_VERSION
    || model.heightBinCm !== 5
    || model.bmiBin !== 2
    || !model.rows
    || ROWS.some((kind) => !model.rows[kind]?.cohorts?.length)
  ) {
    throw new Error("The direct WEAR depth cohort checkpoint is invalid or incompatible.");
  }
  cachedWearDirectDepth = { modifiedMs: modelStat.mtimeMs, model };
  return model;
}

async function loadWearAbsoluteDepth(modelPath: string): Promise<WearAbsoluteDepthArtifact> {
  const modelStat = await stat(modelPath);
  if (cachedWearAbsoluteDepth?.modifiedMs === modelStat.mtimeMs) return cachedWearAbsoluteDepth.model;
  const model = JSON.parse(await readFile(modelPath, "utf8")) as WearAbsoluteDepthArtifact;
  if (
    model.version !== WEAR_ABSOLUTE_DEPTH_MODEL_VERSION
    || !model.rows
    || ROWS.some((kind) => {
      const row = model.rows[kind];
      return !row
        || !row.featureNames?.length
        || !finite(row.interceptCm)
        || !finite(row.validationMaeCm)
        || row.featureNames.some((feature) => !finite(row.featureCenters[feature]) || !finite(row.coefficients[feature]));
    })
  ) {
    throw new Error("The WEAR absolute-depth checkpoint is invalid or incompatible.");
  }
  cachedWearAbsoluteDepth = { modifiedMs: modelStat.mtimeMs, model };
  return model;
}

async function loadWearShapeExponent(modelPath: string): Promise<WearShapeExponentArtifact> {
  const modelStat = await stat(modelPath);
  if (cachedWearShapeExponent?.modifiedMs === modelStat.mtimeMs) return cachedWearShapeExponent.model;
  const model = JSON.parse(await readFile(modelPath, "utf8")) as WearShapeExponentArtifact;
  if (
    model.version !== WEAR_SHAPE_EXPONENT_MODEL_VERSION
    || !model.rows?.waist
    || !model.rows?.hips
    || ([model.rows.waist, model.rows.hips] as LocalMlWearShapeExponentModel[]).some((row) => (
      !row.featureNames?.length
      || !finite(row.interceptPosition)
      || !finite(row.minimumExponent)
      || !finite(row.maximumExponent)
      || row.minimumExponent >= row.maximumExponent
      || !finite(row.validationMaeCm)
      || row.featureNames.some((feature) => (
        !finite(row.featureCenters[feature])
        || !finite(row.featureScales[feature])
        || row.featureScales[feature]! <= 0
        || !finite(row.coefficients[feature])
      ))
    ))
  ) {
    throw new Error("The WEAR shape-exponent checkpoint is invalid or incompatible.");
  }
  cachedWearShapeExponent = { modifiedMs: modelStat.mtimeMs, model };
  return model;
}

async function imageTensorData(imageDataUrl: string, maskDataUrl: string): Promise<Float32Array> {
  const image = await sharp(dataUrlBuffer(imageDataUrl, "imageDataUrl"))
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: "fill" })
    .removeAlpha()
    .toColorspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = await sharp(dataUrlBuffer(maskDataUrl, "maskDataUrl"))
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: "fill", kernel: "nearest" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (image.info.channels < 3 || mask.info.channels < 1) throw new Error("Could not create RGB + mask model input.");

  const planeSize = INPUT_SIZE * INPUT_SIZE;
  const output = new Float32Array(planeSize * 4);
  for (let pixel = 0; pixel < planeSize; pixel++) {
    for (let channel = 0; channel < 3; channel++) {
      const value = image.data[pixel * image.info.channels + channel]! / 255;
      output[channel * planeSize + pixel] = (value - RGB_MEAN[channel]!) / RGB_STD[channel]!;
    }
    output[3 * planeSize + pixel] = mask.data[pixel * mask.info.channels]! / 255;
  }
  return output;
}

function structuredTensorData(body: PredictBody): Float32Array {
  if (!finite(body.heightCm) || body.heightCm <= 0 || !finite(body.weightKg) || body.weightKg <= 0) {
    throw new Error("Valid height and weight are required.");
  }
  if (body.gender !== "male" && body.gender !== "female") throw new Error("Gender must be male or female.");
  if (!Array.isArray(body.landmarks) || body.landmarks.length !== 33) throw new Error("Exactly 33 MediaPipe landmarks are required.");
  const values: number[] = [];
  for (const landmark of body.landmarks) {
    values.push(
      finite(landmark.x) ? landmark.x : 0,
      finite(landmark.y) ? landmark.y : 0,
      finite(landmark.visibility) ? landmark.visibility : 0,
    );
  }
  const heightM = body.heightCm / 100;
  const bmi = body.weightKg / (heightM * heightM);
  values.push(body.heightCm / 200, body.weightKg / 150, bmi / 50, body.gender === "male" ? 1 : 0);
  return Float32Array.from(values);
}

interface MaskPlane {
  data: Buffer;
  width: number;
  height: number;
  top: number;
  bottom: number;
}

interface ArmCapsule {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  radius: number;
}

async function decodeMask(maskDataUrl: string): Promise<MaskPlane> {
  const mask = await sharp(dataUrlBuffer(maskDataUrl, "maskDataUrl"))
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: "fill", kernel: "nearest" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rowCounts = Array.from({ length: mask.info.height }, (_, y) => {
    let count = 0;
    for (let x = 0; x < mask.info.width; x++) {
      if (mask.data[y * mask.info.width + x]! >= 96) count += 1;
    }
    return count;
  });
  const top = rowCounts.findIndex((count) => count >= 4);
  let bottom = -1;
  for (let y = rowCounts.length - 1; y >= 0; y -= 1) {
    if (rowCounts[y]! >= 4) {
      bottom = y;
      break;
    }
  }
  if (top < 0 || bottom <= top + 20) throw new Error("MediaPipe mask has no usable head-to-foot span.");
  return { data: mask.data, width: mask.info.width, height: mask.info.height, top, bottom };
}

function buildArmCapsules(body: PredictBody, mask: MaskPlane): ArmCapsule[] {
  if (!Array.isArray(body.landmarks) || body.landmarks.length !== 33) return [];
  const capsules: ArmCapsule[] = [];
  const add = (
    fromIndex: number,
    toIndex: number,
    radiusScale: number,
    minimumRadius: number,
    maximumRadius: number,
  ) => {
    const from = body.landmarks![fromIndex];
    const to = body.landmarks![toIndex];
    if (!from || !to || !finite(from.x) || !finite(from.y) || !finite(to.x) || !finite(to.y)) return;
    const x0 = from.x * mask.width;
    const y0 = from.y * mask.height;
    const x1 = to.x * mask.width;
    const y1 = to.y * mask.height;
    const length = Math.hypot(x1 - x0, y1 - y0);
    capsules.push({
      x0,
      y0,
      x1,
      y1,
      radius: clamp(length * radiusScale, minimumRadius, maximumRadius),
    });
  };
  add(11, 13, 0.10, 6, 22);
  add(13, 15, 0.12, 7, 24);
  add(15, 17, 0.18, 7, 28);
  add(15, 19, 0.18, 7, 28);
  add(15, 21, 0.18, 7, 28);
  add(12, 14, 0.10, 6, 22);
  add(14, 16, 0.12, 7, 24);
  add(16, 18, 0.18, 7, 28);
  add(16, 20, 0.18, 7, 28);
  add(16, 22, 0.18, 7, 28);
  return capsules;
}

function armCrossSectionAtY(capsule: ArmCapsule, y: number) {
  const deltaY = capsule.y1 - capsule.y0;
  const t = Math.abs(deltaY) > 0.001
    ? clamp((y - capsule.y0) / deltaY, 0, 1)
    : 0.5;
  const centerX = capsule.x0 + (capsule.x1 - capsule.x0) * t;
  const centerY = capsule.y0 + deltaY * t;
  const verticalDistance = Math.abs(y - centerY);
  if (verticalDistance > capsule.radius) return null;
  const halfWidth = Math.sqrt(Math.max(0, capsule.radius ** 2 - verticalDistance ** 2));
  return { centerX, left: centerX - halfWidth, right: centerX + halfWidth };
}

function trimArmPixelsFromTorsoSegment(
  body: PredictBody,
  mask: MaskPlane,
  targetY: number,
  centerX: number,
  segment: { left: number; right: number },
) {
  let left = segment.left;
  let right = segment.right;
  for (const capsule of buildArmCapsules(body, mask)) {
    const crossSection = armCrossSectionAtY(capsule, targetY);
    if (!crossSection) continue;
    if (crossSection.right < left - 2 || crossSection.left > right + 2) continue;
    if (crossSection.centerX > centerX + 4) {
      right = Math.min(right, crossSection.left - 1);
    } else if (crossSection.centerX < centerX - 4) {
      left = Math.max(left, crossSection.right + 1);
    }
  }
  return right - left >= 8 ? { left, right } : segment;
}

function centralTorsoMaskSegment(
  body: PredictBody,
  mask: MaskPlane,
  targetY: number,
  centerXNorm: number,
) {
  if (!Array.isArray(body.landmarks) || body.landmarks.length !== 33) return null;
  const pose: PoseResult = {
    landmarks: body.landmarks.map((landmark) => ({
      x: finite(landmark.x) ? landmark.x : 0,
      y: finite(landmark.y) ? landmark.y : 0,
      z: 0,
      visibility: finite(landmark.visibility) ? landmark.visibility : 0,
    })),
    mask: Uint8ClampedArray.from(mask.data),
    maskWidth: mask.width,
    maskHeight: mask.height,
    maskSource: "pose",
  };
  const measured = measureMaskWidthAtY(
    pose,
    mask.width,
    mask.height,
    1,
    clamp(targetY / mask.height, 0, 1),
    clamp(centerXNorm, 0, 1),
    3,
    {
      excludeLimbs: true,
      segmentMode: "center-walk",
      exclusionMode: "limb-capsules",
    },
  );
  if (!measured) return null;
  const measuredSegment = {
    left: measured.leftXNorm * mask.width,
    right: measured.rightXNorm * mask.width,
  };
  const cleanedSegment = trimArmPixelsFromTorsoSegment(
    body,
    mask,
    targetY,
    clamp(centerXNorm, 0, 1) * mask.width,
    measuredSegment,
  );
  return {
    left: cleanedSegment.left,
    right: cleanedSegment.right,
    y: Math.round(targetY),
  };
}

function wearFeatureVector(body: PredictBody, row: WearRowPriorDefinition): number[] {
  if (!finite(body.heightCm) || !finite(body.weightKg) || !body.gender) throw new Error("Height, weight, and gender are required.");
  const heightM = body.heightCm / 100;
  const bmi = body.weightKg / (heightM * heightM);
  const heightZ = (body.heightCm - row.normalization.heightMean) / row.normalization.heightStd;
  const bmiZ = (bmi - row.normalization.bmiMean) / row.normalization.bmiStd;
  const isMale = body.gender === "male" ? 1 : 0;
  return [1, heightZ, bmiZ, isMale, heightZ * bmiZ, isMale * bmiZ];
}

function closestWearReferenceCohort(
  body: PredictBody,
  row: WearRowPriorDefinition,
): LocalMlWearReferenceCohort | undefined {
  if (!finite(body.heightCm) || !finite(body.weightKg) || !body.gender || !row.referenceCohorts?.length) {
    return undefined;
  }
  const bodyBmi = body.weightKg / ((body.heightCm / 100) ** 2);
  const sameGender = row.referenceCohorts.filter((cohort) => cohort.gender === body.gender);
  const candidates = sameGender.length ? sameGender : row.referenceCohorts;
  const selected = candidates.reduce((best, cohort) => {
    const distance = ((cohort.averageHeightCm - body.heightCm!) / 5) ** 2
      + ((cohort.averageBmi - bodyBmi) / 2) ** 2;
    const bestDistance = ((best.averageHeightCm - body.heightCm!) / 5) ** 2
      + ((best.averageBmi - bodyBmi) / 2) ** 2;
    return distance < bestDistance ? cohort : best;
  });
  return {
    ...selected,
    genderMatched: selected.gender === body.gender,
  };
}

function directWearDepthCohort(
  body: PredictBody,
  kind: (typeof ROWS)[number],
  model: WearDirectDepthModel,
): LocalMlWearDirectDepthCohort | undefined {
  if (!finite(body.heightCm) || !finite(body.weightKg) || !body.gender) return undefined;
  const bmi = body.weightKg / ((body.heightCm / 100) ** 2);
  const heightCenter = Math.floor(body.heightCm / model.heightBinCm + 0.5) * model.heightBinCm;
  const bmiCenter = Math.floor(bmi / model.bmiBin + 0.5) * model.bmiBin;
  const selected = model.rows[kind].cohorts.find((cohort) => (
    cohort.gender === body.gender
    && Math.abs(((cohort.heightMinCm + cohort.heightMaxCm) / 2) - heightCenter) < 0.001
    && Math.abs(((cohort.bmiMin + cohort.bmiMax) / 2) - bmiCenter) < 0.001
  ));
  return selected ? { ...selected, measurement: model.rows[kind].measurement } : undefined;
}

async function predictWearRowPrior(
  body: PredictBody,
  maskDataUrl: string,
  model: WearRowPriorModel,
  depthModel: WearDirectDepthModel,
  absoluteDepthModel?: WearAbsoluteDepthArtifact,
  shapeExponentModel?: WearShapeExponentArtifact,
): Promise<LocalMlNormalizedRowPrediction[]> {
  const mask = await decodeMask(maskDataUrl);
  const hipLandmarks = [body.landmarks?.[23], body.landmarks?.[24]]
    .filter((landmark): landmark is NonNullable<typeof landmark> => Boolean(landmark && finite(landmark.x)));
  const centerXNorm = hipLandmarks.length
    ? hipLandmarks.reduce((sum, landmark) => sum + (landmark.x ?? 0.5), 0) / hipLandmarks.length
    : 0.5;

  return ROWS.map((kind) => {
    const row = model.rows[kind];
    const features = wearFeatureVector(body, row);
    const rawFraction = row.coefficients.reduce((sum, coefficient, index) => sum + coefficient * features[index]!, 0);
    const bodyFraction = clamp(rawFraction, row.outputMin, row.outputMax);
    const targetY = mask.top + bodyFraction * (mask.bottom - mask.top);
    const segment = centralTorsoMaskSegment(body, mask, targetY, centerXNorm);
    if (!segment || segment.right <= segment.left) throw new Error(`MediaPipe mask has no usable ${kind} body segment.`);
    const genderIsRepresented = (row.genderCounts[body.gender!] ?? 0) > 0;
    const confidence = clamp((1 - row.validationP90At170Cm / 12) * (genderIsRepresented ? 1 : 0.55), 0.25, 0.9);
    return {
      kind,
      yNorm: segment.y / (mask.height - 1),
      leftXNorm: segment.left / (mask.width - 1),
      rightXNorm: segment.right / (mask.width - 1),
      heightFromFloorCm: (1 - bodyFraction) * body.heightCm!,
      depthRatio: null,
      confidence,
      trainingSamples: row.sampleCount,
      trainingSurveys: row.surveyCount,
      trainingGenderCounts: row.genderCounts,
      validationMode: row.validationMode,
      validationMaeAt170Cm: row.validationMaeAt170Cm,
      validationP90At170Cm: row.validationP90At170Cm,
      definition: row.definition,
      rowFormula: {
        featureNames: model.featureNames,
        featureValues: features,
        coefficients: row.coefficients,
        rawBodyFraction: rawFraction,
        activeBodyFraction: bodyFraction,
        outputMin: row.outputMin,
        outputMax: row.outputMax,
        maskTopNorm: mask.top / Math.max(1, mask.height - 1),
        maskBottomNorm: mask.bottom / Math.max(1, mask.height - 1),
      },
      // Explanation-only evidence. It never changes bodyFraction or targetY.
      referenceCohort: closestWearReferenceCohort(body, row),
      wearDepthCohort: directWearDepthCohort(body, kind, depthModel),
      wearAbsoluteDepthModel: absoluteDepthModel?.rows[kind],
      wearShapeExponentModel: shapeExponentModel?.rows[kind],
    };
  });
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ ok: false, error: "Local ML is available only on local and test-lab hosts." }, { status: 403 });
  }
  try {
    const body = await request.json() as PredictBody;
    if (!body.imageDataUrl || !body.maskDataUrl || !finite(body.imageWidth) || !finite(body.imageHeight)) {
      throw new Error("Image, mask, and original dimensions are required.");
    }
    const checkpointPath = path.join(/* turbopackIgnore: true */ process.cwd(), LOCAL_ML_CHECKPOINT_RELATIVE_PATH);
    const wearRowPriorPath = path.join(/* turbopackIgnore: true */ process.cwd(), WEAR_ROW_PRIOR_RELATIVE_PATH);
    const wearDirectDepthPath = path.join(/* turbopackIgnore: true */ process.cwd(), WEAR_DIRECT_DEPTH_RELATIVE_PATH);
    const wearAbsoluteDepthPath = path.join(/* turbopackIgnore: true */ process.cwd(), WEAR_ABSOLUTE_DEPTH_RELATIVE_PATH);
    const wearShapeExponentPath = path.join(/* turbopackIgnore: true */ process.cwd(), WEAR_SHAPE_EXPONENT_RELATIVE_PATH);
    const [checkpointStat, wearRowPriorStat, wearDirectDepthStat, wearAbsoluteDepthStat, wearShapeExponentStat] = await Promise.all([
      optionalStat(checkpointPath),
      optionalStat(wearRowPriorPath),
      optionalStat(wearDirectDepthPath),
      optionalStat(wearAbsoluteDepthPath),
      optionalStat(wearShapeExponentPath),
    ]);
    if (!checkpointStat && !wearRowPriorStat) {
      return NextResponse.json({
        ok: false,
        error: "No local ML checkpoint exists yet. Train the WEAR row prior or front-multitask-v1 first.",
      }, { status: 409 });
    }

    const structuredData = structuredTensorData(body);
    if (!checkpointStat && wearRowPriorStat) {
      if (!wearDirectDepthStat) throw new Error("The direct WEAR depth cohort checkpoint is missing.");
      const [model, depthModel, absoluteDepthModel, shapeExponentModel] = await Promise.all([
        loadWearRowPrior(wearRowPriorPath),
        loadWearDirectDepth(wearDirectDepthPath),
        wearAbsoluteDepthStat ? loadWearAbsoluteDepth(wearAbsoluteDepthPath) : Promise.resolve(undefined),
        wearShapeExponentStat ? loadWearShapeExponent(wearShapeExponentPath) : Promise.resolve(undefined),
      ]);
      const rows = await predictWearRowPrior(
        body,
        body.maskDataUrl,
        model,
        depthModel,
        absoluteDepthModel,
        shapeExponentModel,
      );
      const response: LocalMlPredictionResponse = {
        ok: true,
        modelVersion: model.version,
        modelStage: "wear-1d-row-prior",
        depthReady: false,
        endpointSource: "mediapipe-central-torso-mask",
        checkpointFingerprint: `${wearRowPriorStat.size}-${Math.round(wearRowPriorStat.mtimeMs)}:${wearDirectDepthStat.size}-${Math.round(wearDirectDepthStat.mtimeMs)}:${wearAbsoluteDepthStat ? `${wearAbsoluteDepthStat.size}-${Math.round(wearAbsoluteDepthStat.mtimeMs)}` : "no-absolute-depth"}:${wearShapeExponentStat ? `${wearShapeExponentStat.size}-${Math.round(wearShapeExponentStat.mtimeMs)}` : "no-shape-exponent"}`,
        elapsedMs: Math.round(performance.now() - startedAt),
        rows,
      };
      return NextResponse.json(response, { headers: { "cache-control": "no-store" } });
    }

    if (!checkpointStat) {
      throw new Error("The full local ONNX checkpoint is unavailable.");
    }

    const ort = await import("onnxruntime-node");
    const [session, imageData] = await Promise.all([
      loadSession(checkpointPath),
      imageTensorData(body.imageDataUrl, body.maskDataUrl),
    ]);
    const outputs = await session.run({
      image: new ort.Tensor("float32", imageData, [1, 4, INPUT_SIZE, INPUT_SIZE]),
      structured: new ort.Tensor("float32", structuredData, [1, structuredData.length]),
    });
    const prediction = outputs.prediction ?? Object.values(outputs)[0];
    if (!prediction || prediction.data.length < 15) throw new Error("Checkpoint returned an invalid prediction tensor.");
    const values = Array.from(prediction.data, Number);
    const rows: LocalMlNormalizedRowPrediction[] = ROWS.map((kind, index) => ({
      kind,
      yNorm: values[index * 3]!,
      leftXNorm: values[index * 3 + 1]!,
      rightXNorm: values[index * 3 + 2]!,
      depthRatio: values[9 + index]!,
      confidence: values[12 + index]!,
    }));
    if (rows.some((row) => Object.values(row).some((value) => typeof value === "number" && !Number.isFinite(value)))) {
      throw new Error("Checkpoint returned non-finite values.");
    }

    const response: LocalMlPredictionResponse = {
      ok: true,
      modelVersion: LOCAL_ML_MODEL_VERSION,
      modelStage: "front-multitask-3d",
      depthReady: true,
      endpointSource: "local-ml",
      checkpointFingerprint: `${checkpointStat.size}-${Math.round(checkpointStat.mtimeMs)}`,
      elapsedMs: Math.round(performance.now() - startedAt),
      rows,
    };
    return NextResponse.json(response, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Local ML prediction failed.",
    }, { status: 400 });
  }
}

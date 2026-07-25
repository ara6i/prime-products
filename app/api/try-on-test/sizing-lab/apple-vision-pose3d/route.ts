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
import { runCachedLocalInference } from "../_lib/localInferenceScheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const CACHE_DIRECTORY = path.join(tmpdir(), "primestyle-apple-vision-pose3d-cache");
const BINARY_PATH = path.join(tmpdir(), "primestyle-apple-vision-pose3d");
let compilePromise: Promise<void> | null = null;

type BodyRowName = "waist" | "trouserWaist" | "hips";

interface BodyRow {
  name: BodyRowName;
  y: number;
  leftX: number;
  rightX: number;
}

interface RequestBody {
  imageDataUrl?: string;
  cacheKey?: string;
  imageWidth?: number;
  imageHeight?: number;
  heightCm?: number;
  rows?: BodyRow[];
}

interface VisionJoint {
  name: string;
  imagePoint: { x: number; y: number };
  cameraRelativePosition: number[][];
}

interface VisionOutput {
  bodyHeightM: number;
  heightEstimation: number;
  cameraOriginMatrix?: number[][];
  joints: VisionJoint[];
}

interface ProjectedJoint {
  name: string;
  xPx: number;
  yPx: number;
  xM: number;
  yM: number;
  zM: number;
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
    return NextResponse.json({ ok: false, error: "A valid image, image size, known height, and body rows are required." }, { status: 400 });
  }

  const image = parsed ? Buffer.from(parsed.base64, "base64") : null;
  if (image && image.length > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, error: "Image exceeds the 15 MB local test limit." }, { status: 413 });
  }

  const started = performance.now();
  const imageHash = image ? createHash("sha256").update(image).digest("hex") : suppliedCacheKey!;
  const cachePath = path.join(CACHE_DIRECTORY, `${imageHash}.json`);
  if (!image && !existsSync(cachePath)) {
    return NextResponse.json({ ok: false, error: "Apple Vision cache expired; resend the image." }, { status: 409 });
  }

  let cacheHit = existsSync(cachePath);
  let vision: VisionOutput;
  const tempDirectory = await mkdtemp(path.join(tmpdir(), "primestyle-apple-vision-pose3d-"));
  try {
    if (cacheHit) {
      vision = JSON.parse(await readFile(cachePath, "utf8")) as VisionOutput;
    } else {
      if (!image || !parsed) throw new Error("Apple Vision image cache is unavailable.");
      const imagePath = path.join(tempDirectory, `input.${parsed.extension}`);
      await writeFile(imagePath, image);
      const inference = await runCachedLocalInference<{ vision: VisionOutput; reusedDiskCache: boolean }>({
        key: `apple-vision-pose:v2:${imageHash}`,
        label: "Apple Vision 3D",
        cacheGroup: "apple-vision-pose-results",
        cacheTtlMs: 15 * 60_000,
        cacheMaxEntries: 8,
        task: async () => {
          if (existsSync(cachePath)) {
            return {
              vision: JSON.parse(await readFile(cachePath, "utf8")) as VisionOutput,
              reusedDiskCache: true,
            };
          }
          await ensureVisionBinary();
          const { stdout } = await execFileAsync(BINARY_PATH, [imagePath], {
            timeout: 30_000,
            maxBuffer: 2 * 1024 * 1024,
          });
          const generatedVision = JSON.parse(stdout.trim()) as VisionOutput;
          await mkdir(CACHE_DIRECTORY, { recursive: true });
          await writeFile(cachePath, JSON.stringify(generatedVision));
          return { vision: generatedVision, reusedDiskCache: false };
        },
      });
      vision = inference.value.vision;
      cacheHit = inference.cacheHit || inference.value.reusedDiskCache;
    }

    const result = buildBodyScaleResult(
      vision,
      Number(body.imageWidth),
      Number(body.imageHeight),
      Number(body.heightCm),
      body.rows ?? [],
    );
    return NextResponse.json({
      ok: true,
      result: {
        ...result,
        model: "Apple Vision VNDetectHumanBodyPose3DRequest",
        cacheKey: imageHash,
        cacheHit,
        elapsedMs: Math.round(performance.now() - started),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apple Vision 3D failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function buildBodyScaleResult(
  vision: VisionOutput,
  imageWidth: number,
  imageHeight: number,
  heightCm: number,
  rows: BodyRow[],
) {
  const joints = vision.joints.flatMap((joint): ProjectedJoint[] => {
    const translation = joint.cameraRelativePosition?.[3];
    const values = [
      joint.imagePoint?.x,
      joint.imagePoint?.y,
      translation?.[0],
      translation?.[1],
      translation?.[2],
    ];
    if (!values.every(Number.isFinite) || Number(translation?.[2]) <= 0.1) return [];
    return [{
      name: joint.name,
      xPx: joint.imagePoint.x * imageWidth,
      yPx: (1 - joint.imagePoint.y) * imageHeight,
      xM: translation![0]!,
      yM: translation![1]!,
      zM: translation![2]!,
    }];
  });
  if (joints.length < 10) throw new Error(`Apple Vision returned only ${joints.length} usable 3D joints.`);

  const horizontalFit = fitLine(joints.map((joint) => ({ x: joint.xM / joint.zM, y: joint.xPx })));
  const verticalFit = fitLine(joints.map((joint) => ({ x: -joint.yM / joint.zM, y: joint.yPx })));
  if (!horizontalFit || !verticalFit || horizontalFit.slope <= 0 || verticalFit.slope <= 0) {
    throw new Error("Apple Vision camera projection could not be solved.");
  }

  const referenceHeightM = Number(vision.bodyHeightM);
  if (!Number.isFinite(referenceHeightM) || referenceHeightM <= 0) {
    throw new Error("Apple Vision returned an invalid body height reference.");
  }
  const heightScaleFactor = heightCm / (referenceHeightM * 100);
  const anchors = buildDepthAnchors(joints);
  const solvedRows = rows.map((row) => {
    const rawDepthM = interpolateDepth(anchors, row.y);
    const bodyDepthM = rawDepthM * heightScaleFactor;
    const pixelSpan = Math.abs(row.rightX - row.leftX);
    const cmPerPx = bodyDepthM / horizontalFit.slope * 100;
    return {
      ...row,
      pixelSpan,
      bodyDepthM,
      cmPerPx,
      frontPlaneWidthCm: pixelSpan * cmPerPx,
    };
  });

  const focalMismatchPct = Math.abs(horizontalFit.slope - verticalFit.slope)
    / ((horizontalFit.slope + verticalFit.slope) / 2) * 100;
  const normalizedRmsePct = Math.max(horizontalFit.rmse / imageWidth, verticalFit.rmse / imageHeight) * 100;
  const geometryQuality = focalMismatchPct <= 10 && normalizedRmsePct <= 2
    ? "pass"
    : focalMismatchPct <= 20 && normalizedRmsePct <= 4
      ? "check"
      : "reject";
  const root = joints.find((joint) => joint.name === "human_root_3D") ?? joints[0]!;
  const cameraOrientation = estimateCameraOrientation(vision.cameraOriginMatrix);
  const skeletonJoints = joints.map((joint) => ({
    name: joint.name,
    xPx: joint.xPx,
    yPx: joint.yPx,
    xM: (joint.xM - root.xM) * heightScaleFactor,
    yM: (joint.yM - root.yM) * heightScaleFactor,
    zM: (joint.zM - root.zM) * heightScaleFactor,
  }));

  return {
    heightSource: vision.heightEstimation === 0 ? "reference-rescaled" : "measured-rescaled",
    referenceBodyHeightM: referenceHeightM,
    inputHeightCm: heightCm,
    heightScaleFactor,
    jointCount: joints.length,
    estimatedFocalXPx: horizontalFit.slope,
    estimatedFocalYPx: verticalFit.slope,
    principalPointXPx: horizontalFit.intercept,
    principalPointYPx: verticalFit.intercept,
    reprojectionRmseXPx: horizontalFit.rmse,
    reprojectionRmseYPx: verticalFit.rmse,
    focalMismatchPct,
    normalizedRmsePct,
    geometryQuality,
    bodyDistanceM: root.zM * heightScaleFactor,
    bodyReferenceXPx: root.xPx,
    bodyReferenceYPx: root.yPx,
    ...cameraOrientation,
    joints: skeletonJoints,
    rows: solvedRows,
  };
}

function estimateCameraOrientation(matrix: number[][] | undefined): {
  estimatedCameraPitchDeg: number;
  estimatedCameraRollDeg: number;
  estimatedCameraYawDeg: number;
} {
  const columns = matrix?.slice(0, 3).map((column) => column.slice(0, 3));
  if (!columns || columns.length !== 3 || columns.some((column) => column.length !== 3 || column.some((value) => !Number.isFinite(value)))) {
    return { estimatedCameraPitchDeg: 0, estimatedCameraRollDeg: 0, estimatedCameraYawDeg: 0 };
  }
  // Swift serializes simd_float4x4 as columns. The prior implementation read
  // those arrays as rows, turning body yaw into camera pitch. Vision's local Y
  // axis is the detected person's up direction in camera coordinates; for an
  // upright capture it is the available gravity/camera-tilt estimate.
  const up = columns[1]!;
  const forward = columns[2]!;
  const radiansToDegrees = 180 / Math.PI;
  const pitch = Math.atan2(-up[2]!, Math.hypot(up[0]!, up[1]!));
  const roll = Math.atan2(up[0]!, up[1]!);
  const yaw = Math.atan2(forward[0]!, forward[2]!);
  return {
    estimatedCameraPitchDeg: pitch * radiansToDegrees,
    estimatedCameraRollDeg: roll * radiansToDegrees,
    estimatedCameraYawDeg: yaw * radiansToDegrees,
  };
}

function buildDepthAnchors(joints: ProjectedJoint[]): Array<{ y: number; z: number }> {
  const byName = new Map(joints.map((joint) => [joint.name, joint]));
  const groups = [
    ["human_top_head_3D"],
    ["human_center_shoulder_3D"],
    ["human_spine_3D"],
    ["human_root_3D", "human_left_hip_3D", "human_right_hip_3D"],
    ["human_left_knee_3D", "human_right_knee_3D"],
    ["human_left_ankle_3D", "human_right_ankle_3D"],
  ];
  return groups.flatMap((names): Array<{ y: number; z: number }> => {
    const group = names.flatMap((name) => byName.has(name) ? [byName.get(name)!] : []);
    if (!group.length) return [];
    return [{
      y: group.reduce((sum, joint) => sum + joint.yPx, 0) / group.length,
      z: group.reduce((sum, joint) => sum + joint.zM, 0) / group.length,
    }];
  }).sort((a, b) => a.y - b.y);
}

function interpolateDepth(anchors: Array<{ y: number; z: number }>, y: number): number {
  if (!anchors.length) throw new Error("Apple Vision returned no body-depth anchors.");
  if (anchors.length === 1) return anchors[0]!.z;
  let left = anchors[0]!;
  let right = anchors[1]!;
  if (y >= anchors[anchors.length - 1]!.y) {
    left = anchors[anchors.length - 2]!;
    right = anchors[anchors.length - 1]!;
  } else {
    for (let index = 1; index < anchors.length; index += 1) {
      if (y <= anchors[index]!.y) {
        left = anchors[index - 1]!;
        right = anchors[index]!;
        break;
      }
    }
  }
  const span = right.y - left.y;
  const t = Math.abs(span) < 1e-6 ? 0 : (y - left.y) / span;
  return left.z + (right.z - left.z) * t;
}

function fitLine(points: Array<{ x: number; y: number }>): { slope: number; intercept: number; rmse: number } | null {
  if (points.length < 3) return null;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (denominator <= 1e-9) return null;
  const slope = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / denominator;
  const intercept = meanY - slope * meanX;
  const rmse = Math.sqrt(points.reduce((sum, point) => {
    const residual = point.y - (slope * point.x + intercept);
    return sum + residual ** 2;
  }, 0) / points.length);
  return { slope, intercept, rmse };
}

async function ensureVisionBinary(): Promise<void> {
  const sourcePath = path.resolve(/* turbopackIgnore: true */ process.cwd(), "scripts/apple_vision_pose3d_test.swift");
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
    && Number.isFinite(body.heightCm) && Number(body.heightCm) > 50 && Number(body.heightCm) < 260
    && Array.isArray(body.rows) && body.rows.length > 0
    && body.rows.every((row) => [row.y, row.leftX, row.rightX].every(Number.isFinite));
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

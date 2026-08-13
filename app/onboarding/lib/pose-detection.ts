"use client";

import type {
  BodyLandmarkPoint,
  BodyLandmarks,
} from "../types";

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1800;
const MEDIAPIPE_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const XNNPACK_STARTUP_MESSAGE =
  "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.";

type PoseLandmarkerInstance = Awaited<
  ReturnType<typeof import("@mediapipe/tasks-vision").PoseLandmarker.createFromOptions>
>;

let poseLandmarkerPromise: Promise<PoseLandmarkerInstance> | null = null;

async function withBenignXnnpackNoticeSuppressed<T>(
  task: () => Promise<T> | T,
): Promise<T> {
  const originalConsoleError = console.error;
  const filteredConsoleError = (...args: unknown[]) => {
    if (
      args.length === 1 &&
      typeof args[0] === "string" &&
      args[0].trim() === XNNPACK_STARTUP_MESSAGE
    ) {
      return;
    }
    originalConsoleError(...args);
  };
  console.error = filteredConsoleError;
  try {
    return await task();
  } finally {
    if (console.error === filteredConsoleError) {
      console.error = originalConsoleError;
    }
  }
}

function getPoseLandmarker(): Promise<PoseLandmarkerInstance> {
  if (!poseLandmarkerPromise) {
    poseLandmarkerPromise = withBenignXnnpackNoticeSuppressed(async () => {
      const { FilesetResolver, PoseLandmarker } =
        await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: POSE_MODEL },
        runningMode: "IMAGE",
        numPoses: 1,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
    }).catch((error) => {
      poseLandmarkerPromise = null;
      throw error;
    });
  }
  return poseLandmarkerPromise;
}

/**
 * Start loading MediaPipe before the user chooses a photo. This keeps the
 * visible landmark pass near the SDK's warmed ~200 ms path without blocking
 * the screen if the model is not cached yet.
 */
export function prewarmSizingPhotoAnalyzer(): void {
  void getPoseLandmarker().catch(() => {
    // analyzeSizingPhoto surfaces a useful error if the later explicit run
    // also fails. Prewarming must never block the sizing screen.
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("We could not read this image."));
    image.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("We could not read this image."));
    reader.readAsDataURL(file);
  });
}

async function normalizePhoto(file: File): Promise<{
  dataUrl: string;
  image: HTMLImageElement;
}> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use a JPG, PNG, or WebP photo.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Choose a photo smaller than 12 MB.");
  }

  const sourceUrl = await fileToDataUrl(file);
  const sourceImage = await loadImage(sourceUrl);
  const longestEdge = Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight);
  const scale = Math.min(1, MAX_IMAGE_EDGE / longestEdge);
  const width = Math.max(1, Math.round(sourceImage.naturalWidth * scale));
  const height = Math.max(1, Math.round(sourceImage.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Photo processing is unavailable in this browser.");
  }
  context.drawImage(sourceImage, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
  return { dataUrl, image: await loadImage(dataUrl) };
}

function point(
  landmarks: Array<{ x: number; y: number; visibility?: number }>,
  index: number,
): BodyLandmarkPoint {
  const value = landmarks[index];
  if (!value) throw new Error("The full body was not detected.");
  return {
    x: value.x,
    y: value.y,
    ...(typeof value.visibility === "number"
      ? { visibility: value.visibility }
      : {}),
  };
}

/**
 * Keep MyAIFitting aligned with the SDK profile-photo gate.
 *
 * MediaPipe often gives ankles a modest visibility score when trousers cover
 * the joint, even though the legs and feet are clearly present. The SDK uses
 * a deliberately tolerant 0.08 threshold, requires three of four knee/ankle
 * points, and checks the shoulder-to-ankle span instead of rejecting the whole
 * image because one covered joint has low confidence.
 */
function ensureUsableStandingPose(body: BodyLandmarks) {
  const isUsable = (point: BodyLandmarkPoint) =>
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    !(point.x < 0.001 && point.y < 0.001) &&
    (point.visibility ?? 1) >= 0.08;

  const lowerBodyPoints = [
    body.leftKnee,
    body.rightKnee,
    body.leftAnkle,
    body.rightAnkle,
  ];
  const usableLowerBodyCount = lowerBodyPoints.filter(isUsable).length;
  const shoulderYs = [body.leftShoulder, body.rightShoulder]
    .filter(isUsable)
    .map((point) => point.y);
  const ankleYs = [body.leftAnkle, body.rightAnkle]
    .filter(isUsable)
    .map((point) => point.y);
  const verticalSpan =
    shoulderYs.length > 0 && ankleYs.length > 0
      ? Math.max(...ankleYs) - Math.min(...shoulderYs)
      : 0;

  if (usableLowerBodyCount < 3 || verticalSpan <= 0.32) {
    throw new Error(
      "We need a clear head-to-toe photo. Step back and keep both feet visible.",
    );
  }
}

/**
 * MediaPipe writes this successful CPU initialization notice to stderr.
 * Next.js dev mode promotes that console.error call into its red issue overlay
 * and points at landmarker.detect(), even though detection completes normally.
 * Suppress only the exact benign startup notice and preserve every real error.
 */
async function detectPose(image: HTMLImageElement) {
  return withBenignXnnpackNoticeSuppressed(async () => {
    const landmarker = await getPoseLandmarker();
    return landmarker.detect(image);
  });
}

export async function analyzeSizingPhoto(file: File): Promise<{
  dataUrl: string;
  landmarks: BodyLandmarks;
}> {
  const { dataUrl, image } = await normalizePhoto(file);
  const result = await detectPose(image);
  const raw = result.landmarks?.[0];
  if (!raw || raw.length < 29) {
    throw new Error(
      "No full standing pose was found. Use a front-facing head-to-toe photo.",
    );
  }

  const landmarks: BodyLandmarks = {
    nose: point(raw, 0),
    leftShoulder: point(raw, 11),
    rightShoulder: point(raw, 12),
    leftElbow: point(raw, 13),
    rightElbow: point(raw, 14),
    leftWrist: point(raw, 15),
    rightWrist: point(raw, 16),
    leftHip: point(raw, 23),
    rightHip: point(raw, 24),
    leftKnee: point(raw, 25),
    rightKnee: point(raw, 26),
    leftAnkle: point(raw, 27),
    rightAnkle: point(raw, 28),
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
  };

  ensureUsableStandingPose(landmarks);
  return { dataUrl, landmarks };
}

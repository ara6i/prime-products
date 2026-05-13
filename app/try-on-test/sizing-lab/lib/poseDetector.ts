/**
 * MediaPipe BlazePose wrapper for the AI Sizing Lab.
 * - Loads PoseLandmarker from CDN (same bundle the SDK uses).
 * - Returns 33 landmarks AND a 0..255 body segmentation mask.
 * - Browser-only (uses CDN dynamic import).
 */

import type { PoseResult } from "../types";

const POSE_LANDMARK_COUNT = 33;

/* eslint-disable @typescript-eslint/no-explicit-any */
let landmarker: any = null;
let loadingPromise: Promise<void> | null = null;

async function loadMediaPipe(): Promise<void> {
  if (landmarker) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const vision = await import(
      /* webpackIgnore: true */
      // @ts-ignore dynamic CDN import
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33/vision_bundle.mjs"
    );
    const { FilesetResolver, PoseLandmarker } = vision;
    const fileset = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33/wasm"
    );
    landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      numPoses: 1,
      // Enable segmentation mask output — that's what gives us the
      // outer-silhouette width per Y-row instead of relying on
      // bone-to-bone hip landmarks.
      outputSegmentationMasks: true,
    });
  })();
  return loadingPromise;
}

/** Load an HTMLImageElement from a string URL. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without CORS
      const img2 = new Image();
      img2.onload = () => resolve(img2);
      img2.onerror = () => reject(new Error("Failed to load image"));
      img2.src = src;
    };
    img.src = src;
  });
}

/** Read the segmentation mask back out of MediaPipe's MPMask wrapper. */
async function extractMask(mpMask: any): Promise<{ data: Uint8ClampedArray; width: number; height: number } | null> {
  if (!mpMask) return null;
  const w: number = mpMask.width;
  const h: number = mpMask.height;
  // MediaPipe's segmentation mask is a float32 [0..1] array — convert to 0..255.
  let raw: Float32Array | null = null;
  try {
    raw = mpMask.getAsFloat32Array() as Float32Array;
  } catch {
    return null;
  }
  if (!raw || raw.length !== w * h) return null;
  const out = new Uint8ClampedArray(w * h);
  for (let i = 0; i < raw.length; i++) {
    out[i] = Math.round(raw[i]! * 255);
  }
  return { data: out, width: w, height: h };
}

/** Detect 33-point pose + 0..255 body mask. Returns null on failure. */
export async function detectPoseAndMask(imageSrc: string): Promise<PoseResult | null> {
  try {
    await loadMediaPipe();
    const img = await loadImage(imageSrc);
    const result = landmarker.detect(img);
    if (!result?.landmarks?.length || result.landmarks[0].length < POSE_LANDMARK_COUNT) {
      return null;
    }
    const raw = result.landmarks[0] as Array<{ x: number; y: number; z?: number; visibility?: number }>;
    const landmarks = raw.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z ?? 0,
      visibility: p.visibility ?? 0,
    }));

    // segmentationMasks is an array (one per pose). Take the first.
    const mpMask = result.segmentationMasks?.[0] ?? null;
    const mask = mpMask ? await extractMask(mpMask) : null;

    return {
      landmarks,
      mask: mask?.data ?? null,
      maskWidth: mask?.width ?? 0,
      maskHeight: mask?.height ?? 0,
    };
  } catch (err) {
    console.error("[SizingLab] Pose detection failed:", err);
    return null;
  }
}

/** BlazePose landmark indices we use. */
export const POSE_IDX = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

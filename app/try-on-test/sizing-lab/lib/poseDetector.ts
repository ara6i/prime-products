/**
 * MediaPipe BlazePose wrapper for the AI Sizing Lab.
 * - Loads PoseLandmarker from CDN (same bundle the SDK uses).
 * - Returns 33 landmarks and, when requested, a 0..255 body segmentation mask.
 * - Browser-only (uses CDN dynamic import).
 */

import type { PoseResult } from "../types";

const POSE_LANDMARK_COUNT = 33;

/* eslint-disable @typescript-eslint/no-explicit-any */
let landmarkerWithMask: any = null;
let landmarkerWithoutMask: any = null;
let loadingPromiseWithMask: Promise<void> | null = null;
let loadingPromiseWithoutMask: Promise<void> | null = null;

async function loadMediaPipe(includeMask: boolean): Promise<any> {
  if (includeMask && landmarkerWithMask) return landmarkerWithMask;
  if (!includeMask && landmarkerWithoutMask) return landmarkerWithoutMask;
  const existing = includeMask ? loadingPromiseWithMask : loadingPromiseWithoutMask;
  if (existing) return existing;
  const loadingPromise = (async () => {
    const vision = await import(
      /* webpackIgnore: true */
      // @ts-expect-error dynamic CDN import
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33/vision_bundle.mjs"
    );
    const { FilesetResolver, PoseLandmarker } = vision;
    const fileset = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33/wasm"
    );
    const landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      numPoses: 1,
      outputSegmentationMasks: includeMask,
    });
    if (includeMask) landmarkerWithMask = landmarker;
    else landmarkerWithoutMask = landmarker;
    return landmarker;
  })();
  if (includeMask) loadingPromiseWithMask = loadingPromise;
  else loadingPromiseWithoutMask = loadingPromise;
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

/** Detect 33-point pose and optionally a 0..255 body mask. Returns null on failure. */
export async function detectPoseAndMask(imageSrc: string, options: { includeMask?: boolean } = {}): Promise<PoseResult | null> {
  try {
    const includeMask = options.includeMask ?? true;
    const landmarker = await loadMediaPipe(includeMask);
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

    // segmentationMasks is only requested for lab visual/mask paths.
    const mpMask = includeMask ? result.segmentationMasks?.[0] ?? null : null;
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

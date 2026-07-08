/**
 * MediaPipe Image Segmenter wrapper for the AI Sizing Lab.
 *
 * Uses Google's SelfieMulticlass model:
 * 0 background, 1 hair, 2 body-skin, 3 face-skin, 4 clothes, 5 others.
 *
 * The measurement mask keeps body-skin + clothes + ambiguous on-person
 * pixels. Pose landmarks are still used separately for row cleanup and scale.
 */

const TASKS_VERSION = "0.10.33";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";

const FALLBACK_LABELS = ["background", "hair", "body-skin", "face-skin", "clothes", "others"];
const KEEP_LABELS = new Set([
  "body",
  "body-skin",
  "body_skin",
  "body skin",
  "skin",
  "clothes",
  "clothing",
  "others",
  "other",
  "accessories",
]);
const FALLBACK_KEEP_INDEXES = new Set([2, 4, 5]);

export interface SegmenterMeasurementMask {
  mask: Uint8ClampedArray;
  width: number;
  height: number;
  labels: string[];
  elapsedMs: number;
}

export interface SegmenterBackgroundRemoval {
  imageDataUrl: string;
  width: number;
  height: number;
  labels: string[];
  elapsedMs: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let segmenter: any = null;
let loadingPromise: Promise<void> | null = null;

async function loadImageSegmenter(): Promise<void> {
  if (segmenter) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const vision = await import(
      /* webpackIgnore: true */
      `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/vision_bundle.mjs`
    );
    const { FilesetResolver, ImageSegmenter } = vision;
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    segmenter = await ImageSegmenter.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });
  })();
  return loadingPromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      const retry = new Image();
      retry.onload = () => resolve(retry);
      retry.onerror = () => reject(new Error("Failed to load image for MediaPipe Image Segmenter"));
      retry.src = src;
    };
    img.src = src;
  });
}

function getLabels(): string[] {
  try {
    const labels = segmenter?.getLabels?.();
    if (Array.isArray(labels) && labels.length) return labels.map(String);
  } catch {
    // Use documented label order below.
  }
  return FALLBACK_LABELS;
}

function getCategoryMaskData(categoryMask: any): { data: Uint8Array; width: number; height: number } | null {
  if (!categoryMask) return null;
  const width = Number(categoryMask.width);
  const height = Number(categoryMask.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  try {
    const data = categoryMask.getAsUint8Array?.() as Uint8Array | undefined;
    if (data && data.length === width * height) return { data, width, height };
  } catch {
    return null;
  }
  return null;
}

function keepIndexesForLabels(labels: string[]): Set<number> {
  const keep = new Set<number>();
  labels.forEach((label, index) => {
    if (KEEP_LABELS.has(label.trim().toLowerCase())) keep.add(index);
  });
  return keep.size ? keep : FALLBACK_KEEP_INDEXES;
}

function personIndexesForLabels(labels: string[]): Set<number> {
  const person = new Set<number>();
  labels.forEach((label, index) => {
    const normalized = label.trim().toLowerCase();
    if (normalized !== "background" && normalized !== "bg") person.add(index);
  });
  return person.size ? person : new Set([1, 2, 3, 4, 5]);
}

function parseHexColor(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return [248, 250, 252];
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

export async function detectSegmenterMeasurementMask(imageSrc: string): Promise<SegmenterMeasurementMask | null> {
  const startedAt = performance.now();
  try {
    await loadImageSegmenter();
    const img = await loadImage(imageSrc);
    const result = segmenter.segment(img);
    const category = getCategoryMaskData(result?.categoryMask);
    if (!category) return null;

    const labels = getLabels();
    const keepIndexes = keepIndexesForLabels(labels);
    const mask = new Uint8ClampedArray(category.data.length);
    for (let i = 0; i < category.data.length; i++) {
      mask[i] = keepIndexes.has(category.data[i]!) ? 255 : 0;
    }

    return {
      mask,
      width: category.width,
      height: category.height,
      labels,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    console.error("[SizingLab] Image segmentation failed:", error);
    return null;
  }
}

export async function removeBackgroundWithSegmenter(
  imageSrc: string,
  backgroundColor = "#f8fafc",
): Promise<SegmenterBackgroundRemoval | null> {
  const startedAt = performance.now();
  try {
    await loadImageSegmenter();
    const img = await loadImage(imageSrc);
    const result = segmenter.segment(img);
    const category = getCategoryMaskData(result?.categoryMask);
    if (!category) return null;

    const labels = getLabels();
    const personIndexes = personIndexesForLabels(labels);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const [bgR, bgG, bgB] = parseHexColor(backgroundColor);

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceCtx = sourceCanvas.getContext("2d");
    if (!sourceCtx) return null;
    sourceCtx.drawImage(img, 0, 0, width, height);
    const sourceData = sourceCtx.getImageData(0, 0, width, height);

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = width;
    outputCanvas.height = height;
    const outputCtx = outputCanvas.getContext("2d");
    if (!outputCtx) return null;
    const outputData = outputCtx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      const maskY = Math.min(category.height - 1, Math.floor((y / height) * category.height));
      for (let x = 0; x < width; x++) {
        const maskX = Math.min(category.width - 1, Math.floor((x / width) * category.width));
        const maskIndex = category.data[maskY * category.width + maskX]!;
        const offset = (y * width + x) * 4;
        if (personIndexes.has(maskIndex)) {
          outputData.data[offset] = sourceData.data[offset]!;
          outputData.data[offset + 1] = sourceData.data[offset + 1]!;
          outputData.data[offset + 2] = sourceData.data[offset + 2]!;
          outputData.data[offset + 3] = 255;
        } else {
          outputData.data[offset] = bgR;
          outputData.data[offset + 1] = bgG;
          outputData.data[offset + 2] = bgB;
          outputData.data[offset + 3] = 255;
        }
      }
    }

    outputCtx.putImageData(outputData, 0, 0);
    return {
      imageDataUrl: outputCanvas.toDataURL("image/png"),
      width,
      height,
      labels,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    console.error("[SizingLab] Segmenter background removal failed:", error);
    return null;
  }
}

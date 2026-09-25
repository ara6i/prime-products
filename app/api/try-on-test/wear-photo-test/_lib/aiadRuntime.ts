import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import * as ort from "onnxruntime-node";
import sharp from "sharp";
import { AIAD_FRAMING_REVISION, AIAD_GUIDE_SOURCE, AIAD_HEIGHT, AIAD_LEVELS, AIAD_MEASURES, AIAD_WIDTH, aiadGuideLines, aiadProfile, canonicalizeAiadMask, cleanAiadMask, type AiadProfile } from "@/app/try-on-test/wear-photo-test/aiadPreprocessing";
import type { AiadGeometryLevel, FreshGeometryPrediction, FreshGeometryRow } from "@/app/try-on-test/wear-photo-test/freshGeometryTypes";
import { aiadSegmentationAvailable } from "./aiadSegmentation";
import { aiadCameraStatus } from "./aiadCamera";

export const AIAD_VERSION = "aiad-wear-student-2d-v1";
export const AIAD_SHA256 = "71420375dc581b79fd93feffceb6dd7e81ab6bd66d0991ddc31e558dc2de8a10";
export const AIAD_LIMIT = "Private transfer test of Aiad's frozen package. His helper supplies six fixed-stature silhouette guides; his ONNX separately predicts tape, width/depth, uncertainty and shape code. Manual edits and our optional camera tools do not change his original model outputs.";
const USB_MODEL_DIR = "/Volumes/PrimeStorage/PrimeStyleAI-model-artifacts/aiad/wear-student-2d-v1/onnx";

export function aiadModelDirectory() {
  return process.env.WEAR_AIAD_MODEL_DIR ?? (process.platform === "darwin" && existsSync(USB_MODEL_DIR) ? USB_MODEL_DIR : path.join(process.cwd(), ".local-ml", AIAD_VERSION, "onnx"));
}

type SessionCache = { signature: string; promise: Promise<ort.InferenceSession>; tail: Promise<unknown>; pending: number };
const processState = globalThis as typeof globalThis & { __wearAiadSession?: SessionCache };

async function sessionCache() {
  const modelPath = path.join(aiadModelDirectory(), "wear_student_ensemble.onnx");
  const info = await stat(modelPath).catch(() => { throw new Error("Aiad's private ONNX artifact is not installed on this server. Configure WEAR_AIAD_MODEL_DIR."); });
  if (info.size !== 453294167) throw new Error("Aiad model file size differs from the verified handoff.");
  const signature = `${modelPath}:${info.mtimeMs}:${info.size}`;
  if (processState.__wearAiadSession && processState.__wearAiadSession.signature !== signature) throw new Error("The model changed while the server was running. Restart this test service to load a newly verified artifact.");
  if (!processState.__wearAiadSession) {
    const promise = (async () => {
      const hash = createHash("sha256");
      for await (const chunk of createReadStream(modelPath)) hash.update(chunk);
      if (hash.digest("hex") !== AIAD_SHA256) throw new Error("Aiad ONNX checksum failed. No inference was run.");
      const session = await ort.InferenceSession.create(modelPath, { executionProviders: ["cpu"], intraOpNumThreads: 2, interOpNumThreads: 1 });
      if (session.inputNames.join(",") !== "silhouette,profile" || session.outputNames.join(",") !== "circumference_cm,sigma_cm,per_level_cm,shape_code") {
        await session.release();
        throw new Error("Unexpected Aiad ONNX input/output schema.");
      }
      return session;
    })();
    processState.__wearAiadSession = { signature, promise, tail: Promise.resolve(), pending: 0 };
    void promise.catch(() => { if (processState.__wearAiadSession?.promise === promise) delete processState.__wearAiadSession; });
  }
  return processState.__wearAiadSession!;
}

export async function aiadStatus() {
  const cache = await sessionCache();
  await cache.promise;
  return { ok: true, modelVersion: AIAD_VERSION, modelSha256: AIAD_SHA256, targetCount: 34, sealedTestSubjectsUsed: 0, sdkReady: false, importantLimit: AIAD_LIMIT, checksumVerified: true, ensembleSize: 4, referenceSegmenterAvailable: aiadSegmentationAvailable(),
    camera: await aiadCameraStatus() };
}

export async function runAiadTensors(silhouette: Float32Array, profile: Float32Array) {
  if (silhouette.length !== 256 * 192 || profile.length !== 5) throw new Error("Invalid Aiad tensor size.");
  const cache = await sessionCache();
  if (cache.pending >= 4) throw new Error("The Aiad CPU inference queue is busy. Wait for the current test to finish.");
  cache.pending++;
  const previous = cache.tail;
  let unlock!: () => void;
  cache.tail = new Promise<void>((resolve) => { unlock = resolve; });
  try {
    await previous;
    const session = await cache.promise;
    const start = performance.now();
    const output = await session.run({ silhouette: new ort.Tensor("float32", silhouette, [1, 1, AIAD_HEIGHT, AIAD_WIDTH]), profile: new ort.Tensor("float32", profile, [1, 5]) });
    const result = {} as Record<"circumference_cm" | "sigma_cm" | "per_level_cm" | "shape_code", number[]>;
    for (const [name, count] of [["circumference_cm", 6], ["sigma_cm", 6], ["per_level_cm", 12], ["shape_code", 10]] as const) {
      const tensor = output[name];
      const values = tensor ? Array.from(tensor.data as Float32Array) : [];
      if (tensor?.dims.join(",") !== `1,${count}` || values.length !== count || values.some((value) => !Number.isFinite(value))) throw new Error(`Invalid Aiad output: ${name}.`);
      if (name !== "shape_code" && values.some((value) => value <= 0)) throw new Error(`Non-positive Aiad physical output: ${name}.`);
      result[name] = values;
    }
    return { ...result, inferenceMs: performance.now() - start };
  } finally { cache.pending--; unlock(); }
}

export function parseAiadMaskDataUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 3_000_000) throw new Error("Send one PNG silhouette smaller than 2 MB.");
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw new Error("A PNG body mask is required; RGB is segmented before ONNX.");
  return Buffer.from(match[1]!, "base64");
}

export async function predictAiad(maskPng: Buffer, profile: AiadProfile, segmentation: NonNullable<FreshGeometryPrediction["aiad"]>["segmentation"] = "mediapipe-photo"): Promise<FreshGeometryPrediction> {
  const start = performance.now();
  const normalizedProfile = aiadProfile(profile);
  const { data, info } = await sharp(maskPng, { limitInputPixels: segmentation === "aiad-rembg-photo" ? 25_000_000 : 2_000_000 }).flatten({ background: "black" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const clean = segmentation === "aiad-rembg-photo" ? { mask: Uint8Array.from(data, (value) => Number(value > 127)), removedPixels: 0 } : cleanAiadMask(data, info.width, info.height);
  const canonical = canonicalizeAiadMask(clean.mask, info.width, info.height);
  const outputs = await runAiadTensors(canonical.tensor, normalizedProfile.tensor);
  const guides = aiadGuideLines(canonical, profile.heightCm);
  const measurements = AIAD_MEASURES.map((kind, i) => ({ kind, valueCm: kind === "underbust" && profile.gender === "male" ? null : outputs.circumference_cm[i]!, sigmaCm: kind === "underbust" && profile.gender === "male" ? null : outputs.sigma_cm[i]! }));
  const definitions = { neck: ["Neck", "#8b5cf6"], shoulder: ["Shoulder", "#0e7490"], chest: ["Chest / bust", "#06b6d4"], underbust: ["Under-bust", "#f59e0b"], waist: ["Waist", "#2563eb"], hips: ["Hips", "#db2777"] } as const;
  const levels: AiadGeometryLevel[] = AIAD_LEVELS.map((kind, index) => {
    const guide = guides.find((row) => row.kind === kind)!;
    const widthCm = outputs.per_level_cm[index * 2]!, depthCm = outputs.per_level_cm[index * 2 + 1]!;
    return { kind, label: definitions[kind][0], color: definitions[kind][1], line: guide.line, endpoints: guide.endpoints, widthCm, depthCm, depthWidthRatio: depthCm / widthCm, tapeCm: measurements.find((m) => m.kind === kind)?.valueCm ?? null };
  });
  // Keep the older model's five-row contract untouched. Aiad's complete six
  // levels live in aiad.levels and are displayed by the Aiad workbench.
  const rows: FreshGeometryRow[] = levels.flatMap((level) => level.kind === "shoulder" || (level.kind === "underbust" && profile.gender === "male") ? [] : [{
    ...level, kind: level.kind, yNorm: level.line?.canonical.left.y ?? null,
    leftXNorm: level.line?.canonical.left.x ?? null, rightXNorm: level.line?.canonical.right.x ?? null,
    shape: [], syntheticValidation: null,
  }]);
  const tape = (kind: typeof AIAD_MEASURES[number]) => measurements.find((m) => m.kind === kind)?.valueCm ?? null;
  const ratios = ([['waist', 'hips'], ['chest', 'waist'], ['chest', 'hips'], ['neck', 'waist'], ['underbust', 'chest']] as const).map(([a, b]) => ({ key: `ratio.tape.${a}_${b}`, value: tape(a) != null && tape(b) != null ? tape(a)! / tape(b)! : null }));
  const warnings = [AIAD_LIMIT, "Original guides follow Aiad's row_endpoints helper: fixed height fractions plus torso silhouette edges, not learned tape locations. Keep them unedited when judging his package; manual and camera comparisons are separate.", "Depth and shape are inferred from one front silhouette. Estimated uncertainty is not a guaranteed error bound.", segmentation === "aiad-rembg-photo" ? "Photo segmentation uses Aiad\'s reference rembg u2net_human_seg and cleanup. Line heights still use fixed stature fractions." : segmentation === "mediapipe-photo" ? "This app uses its existing MediaPipe segmentation, not Aiad's rembg segmenter. Real-photo integration accuracy has not yet been established." : "This test thresholds the existing WEAR render; it is not an end-to-end real-photo benchmark and may differ from Aiad's original mask-based report."];
  if (canonical.cropped) warnings.push("The canonical frame clipped the silhouette horizontally. Review arms and body coverage.");
  const canonicalPng = await sharp(canonical.mask, { raw: { width: AIAD_WIDTH, height: AIAD_HEIGHT, channels: 1 } }).png().toBuffer();
  return { ok: true,
    model: { version: AIAD_VERSION, sha256: AIAD_SHA256, targetCount: 34, bestEpoch: null, bestValidationLoss: null, train: null, validation: null, qualityGates: {}, syntheticWearValidated: false, realPhotoValidated: false, sealedTestSubjectsUsed: 0, sdkReady: false, importantLimit: AIAD_LIMIT },
    inputContract: { usedByOnnx: ["canonical front silhouette [1,1,256,192]", "height, weight, BMI, female/male flags [1,5]"], usedBeforeOnnx: [segmentation, "largest component, fill holes, 5x5 close", "Aiad canonical framing and profile normalization"], notUsedByOnnx: ["tape answers", "3D mesh or depth labels", "old V6/V7 predictions", "Apple Vision", "Depth Pro", "guide positions or manual line edits"], cameraHandling: "Optional post-ONNX width comparison. Tape and shape code are unchanged." },
    profile: { ...profile, bmi: normalizedProfile.bmi },
    preprocessing: { rawMaskSize: [info.width, info.height], canonicalMaskSize: [AIAD_WIDTH, AIAD_HEIGHT], modelInputSize: [AIAD_WIDTH, AIAD_HEIGHT], sourceBodyBox: canonical.sourceBox, canonicalBodyBox: canonical.canonicalBox, removedForegroundPixels: clean.removedPixels, warnings, quality: "transfer-test", framingRevision: AIAD_FRAMING_REVISION },
    canonicalMaskDataUrl: `data:image/png;base64,${canonicalPng.toString("base64")}`, rows, ratios, camera: {},
    aiad: { ensembleSize: 4, segmentation, lineSource: "height-fraction-guide", guideSource: AIAD_GUIDE_SOURCE, levels, maskFill: canonical.fill, measurements, shoulder: { widthCm: outputs.per_level_cm[2]!, depthCm: outputs.per_level_cm[3]! }, shapeCode: outputs.shape_code },
    timing: { inferenceMs: outputs.inferenceMs, totalMs: performance.now() - start } };
}

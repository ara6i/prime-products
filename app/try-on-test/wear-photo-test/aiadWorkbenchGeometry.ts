import { AIAD_LEVELS } from "./aiadPreprocessing";
import type { AiadGeometryLevel, FreshGeometryLineOverride, FreshGeometryLineOverrideMap, FreshGeometryPrediction } from "./freshGeometryTypes";

export type AiadCameraMode = "raw" | "apple" | "apple-depth";
export type AiadRowKind = AiadGeometryLevel["kind"];
export type AiadLineMap = Partial<Record<AiadRowKind, FreshGeometryLineOverride>>;
export type AiadDepthEdit = { type: "cm" | "ratio"; value: number };
export type AiadDepthEdits = Partial<Record<AiadRowKind, AiadDepthEdit>>;
export type AiadCameraSnapshot = { lines: AiadLineMap; prediction: FreshGeometryPrediction };
export type AiadCameraCache = Partial<Record<Exclude<AiadCameraMode, "raw">, AiadCameraSnapshot>>;

export const AIAD_MODE_LABELS: Record<AiadCameraMode, string> = {
  raw: "Aiad", apple: "Apple Vision", "apple-depth": "Apple + Depth Pro",
};
export const AIAD_ROW_ORDER: AiadRowKind[] = ["waist", "hips", "chest", "underbust", "shoulder", "neck"];
export const clampAiad = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const positive = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;

export function aiadSourceLevels(prediction: FreshGeometryPrediction): AiadGeometryLevel[] {
  if (prediction.aiad?.levels) return prediction.aiad.levels;
  // Older saved reports retain their original data. Do not manufacture a
  // shoulder guide when the old adapter saved only its model width/depth.
  return AIAD_LEVELS.flatMap<AiadGeometryLevel>((kind) => {
    const row = prediction.rows.find((item) => item.kind === kind);
    if (row) return [{ ...row, endpoints: null }];
    const shoulder = prediction.aiad?.shoulder;
    return kind === "shoulder" && shoulder ? [{ kind, label: "Shoulder", color: "#0e7490", ...shoulder,
      depthWidthRatio: shoulder.depthCm / shoulder.widthCm, tapeCm: null, line: null, endpoints: null }] : [];
  });
}

export function aiadLines(prediction: FreshGeometryPrediction): AiadLineMap {
  return Object.fromEntries(aiadSourceLevels(prediction).flatMap((row) => row.line ? [[row.kind, {
    leftX: Math.min(row.line.photo.left.x, row.line.photo.right.x),
    rightX: Math.max(row.line.photo.left.x, row.line.photo.right.x),
    y: (row.line.photo.left.y + row.line.photo.right.y) / 2,
  }]] : []));
}

/** The existing camera APIs accept five named rows, not a shoulder row. */
export function aiadCameraLineOverrides(lines: AiadLineMap, prediction: FreshGeometryPrediction): FreshGeometryLineOverrideMap {
  return Object.fromEntries(prediction.rows.flatMap((row) => lines[row.kind] && row.line ? [[row.kind, lines[row.kind]]] : []));
}

export function aiadLinesKey(lines: AiadLineMap) {
  return AIAD_ROW_ORDER.map((kind) => {
    const line = lines[kind];
    return line ? `${kind}:${line.leftX.toFixed(6)}:${line.rightX.toFixed(6)}:${line.y.toFixed(6)}` : kind;
  }).join("|");
}

export function sameAiadLine(left: FreshGeometryLineOverride | undefined, right: FreshGeometryLineOverride | undefined) {
  if (!left && !right) return true;
  return !!left && !!right && Math.abs(left.leftX - right.leftX) < 0.000001
    && Math.abs(left.rightX - right.rightX) < 0.000001 && Math.abs(left.y - right.y) < 0.000001;
}

export function resizeAiadLine(line: FreshGeometryLineOverride, span: number): FreshGeometryLineOverride {
  const safeSpan = clampAiad(span, 0.01, 0.99);
  const leftX = clampAiad((line.leftX + line.rightX - safeSpan) / 2, 0.005, 0.995 - safeSpan);
  return { ...line, leftX, rightX: leftX + safeSpan };
}

export function dragAiadLine(line: FreshGeometryLineOverride, part: "move" | "left" | "right", dx: number, dy: number): FreshGeometryLineOverride {
  if (part === "left") return { ...line, leftX: clampAiad(line.leftX + dx, 0.005, line.rightX - 0.01) };
  if (part === "right") return { ...line, rightX: clampAiad(line.rightX + dx, line.leftX + 0.01, 0.995) };
  const span = line.rightX - line.leftX;
  const leftX = clampAiad(line.leftX + dx, 0.005, 0.995 - span);
  return { leftX, rightX: leftX + span, y: clampAiad(line.y + dy, 0.005, 0.995) };
}

/** Never mutate or rescale the frozen tape heads. A preview is not a new ONNX prediction. */
export function aiadGeometryPreview(
  prediction: FreshGeometryPrediction,
  lines: AiadLineMap,
  mode: AiadCameraMode,
  cache: AiadCameraCache,
  depthEdits: AiadDepthEdits,
) {
  const originalLines = aiadLines(prediction);
  return aiadSourceLevels(prediction).map((row) => {
    const raw = prediction.cameraFusion?.rows.find((item) => item.kind === row.kind);
    const rawWidthCm = raw?.rawWidthCm ?? row.widthCm;
    const rawDepthCm = raw?.rawDepthCm ?? row.depthCm;
    const snapshot = mode === "raw" ? undefined : cache[mode];
    const calibration = snapshot?.prediction.cameraFusion?.rows.find((item) => item.kind === row.kind);
    let source: AiadCameraMode = "raw";
    let referenceWidth = rawWidthCm;
    let referenceLine = originalLines[row.kind];
    if (mode === "apple-depth" && positive(calibration?.depthProWidthCm)) {
      source = "apple-depth";
      referenceWidth = calibration.depthProWidthCm;
      referenceLine = snapshot?.lines[row.kind];
    } else if (mode !== "raw" && positive(calibration?.appleVisionWidthCm)) {
      source = "apple";
      referenceWidth = calibration.appleVisionWidthCm;
      referenceLine = snapshot?.lines[row.kind];
    }
    const line = lines[row.kind];
    const referenceSpan = referenceLine ? referenceLine.rightX - referenceLine.leftX : 0;
    const span = line ? line.rightX - line.leftX : 0;
    // Local span scaling is explicitly provisional. Moving a row alone does
    // not invent a new body width or a new tape prediction.
    const widthCm = positive(referenceWidth) && referenceSpan > 0 && span > 0
      ? referenceWidth * span / referenceSpan : referenceWidth;
    const learnedRatio = positive(rawDepthCm) && positive(rawWidthCm)
      ? rawDepthCm / rawWidthCm : positive(row.depthWidthRatio) ? row.depthWidthRatio : null;
    const edit = depthEdits[row.kind];
    const depthCm = edit?.type === "cm" ? edit.value
      : widthCm != null ? widthCm * (edit?.type === "ratio" ? edit.value : learnedRatio ?? 0) : null;
    return {
      kind: row.kind, label: row.label, color: row.color, line,
      widthCm, depthCm: positive(depthCm) ? depthCm : null,
      ratio: positive(widthCm) && positive(depthCm) ? depthCm / widthCm : null,
      rawWidthCm, rawDepthCm, tapeCm: row.tapeCm, source, originalEndpoints: row.endpoints,
      manualDepth: !!edit,
      scaledPreview: !sameAiadLine(referenceLine, line),
      lineEdited: !sameAiadLine(originalLines[row.kind], line),
      fallback: mode !== source,
    };
  });
}

export type AiadGeometryPreviewRow = ReturnType<typeof aiadGeometryPreview>[number];

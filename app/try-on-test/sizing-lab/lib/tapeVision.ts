export interface TapeVisionPoint {
  x: number;
  y: number;
}

export interface RawTapeVisionDetection extends TapeVisionPoint {
  value: number;
  confidence: number;
  raw: string;
}

export type TapeVisionDetection = RawTapeVisionDetection;
export type TapeVisionUnit = "cm" | "in";

export interface TapeVisionCalibration {
  model:
    | "Apple Vision VNRecognizeTextRequest"
    | "Apple Vision OCR + OpenCV tape ticks"
    | "Apple Vision OCR + projective tape map";
  unit: TapeVisionUnit;
  detections: TapeVisionDetection[];
  direction: -1 | 1;
  minValue: number;
  maxValue: number;
  minY: number;
  maxY: number;
  cacheKey?: string;
  cacheHit?: boolean;
  elapsedMs?: number;
}

export type TapeVisionPathResult =
  | { ok: true; calibration: TapeVisionCalibration }
  | { ok: false; error: string };

export interface TapeVisionSnapResult {
  start: TapeVisionPoint;
  end: TapeVisionPoint;
  startValue: number;
  endValue: number;
}

export interface TapeVisionHiddenInterval extends TapeVisionSnapResult {
  id: string;
}

export interface TapeTickFallbackInput {
  detections: RawTapeVisionDetection[];
  centerXByY: number[];
  lineScoreByY: number[];
  visibilityByY?: number[];
  unit: TapeVisionUnit;
}

interface PathState {
  score: number;
  previous: number;
  nodeCount: number;
  coverage: number;
}

const MAX_EXTRAPOLATION_PX = 500;

export function buildTapeVisionCalibration(
  rawDetections: RawTapeVisionDetection[],
  hintX: number,
  unit: TapeVisionUnit,
): TapeVisionPathResult {
  const limits = pathLimits(unit);
  const usable = deduplicateDetections(rawDetections)
    .filter((detection) => Number.isFinite(detection.x)
      && Number.isFinite(detection.y)
      && Number.isFinite(detection.value)
      && detection.value >= 0
      && detection.value <= limits.maximumValue
      && Math.abs(detection.x - hintX) <= 190)
    .sort((first, second) => first.y - second.y);
  if (usable.length < limits.minimumNodes) {
    return { ok: false, error: "Apple Vision could not read enough printed tape labels." };
  }

  const descending = longestMonotonicTapePath(usable, -1, unit);
  const ascending = longestMonotonicTapePath(usable, 1, unit);
  const best = pathRank(descending) >= pathRank(ascending) ? descending : ascending;
  if (best.length < limits.minimumNodes) {
    return { ok: false, error: "Printed labels did not form one reliable tape sequence." };
  }
  const coverage = Math.abs(best[best.length - 1]!.value - best[0]!.value);
  if (coverage < limits.minimumCoverage) {
    return { ok: false, error: "The readable tape span is too short for a position-aware ruler." };
  }

  const first = best[0]!;
  const last = best[best.length - 1]!;
  const direction = Math.sign(last.value - first.value) as -1 | 1;
  return {
    ok: true,
    calibration: {
      model: "Apple Vision VNRecognizeTextRequest",
      unit,
      detections: best,
      direction,
      minValue: Math.min(...best.map((detection) => detection.value)),
      maxValue: Math.max(...best.map((detection) => detection.value)),
      minY: first.y,
      maxY: last.y,
    },
  };
}

export function tapeValueAtY(calibration: TapeVisionCalibration, y: number): number | null {
  const detections = calibration.detections;
  if (detections.length < 2) return null;
  const first = detections[0]!;
  const second = detections[1]!;
  const penultimate = detections[detections.length - 2]!;
  const last = detections[detections.length - 1]!;
  if (y < first.y) {
    return first.y - y <= MAX_EXTRAPOLATION_PX
      ? interpolateValueByY(first, second, y)
      : null;
  }
  if (y > last.y) {
    return y - last.y <= MAX_EXTRAPOLATION_PX
      ? interpolateValueByY(penultimate, last, y)
      : null;
  }
  for (let index = 0; index < detections.length - 1; index += 1) {
    const left = detections[index]!;
    const right = detections[index + 1]!;
    if (y < left.y || y > right.y) continue;
    return interpolateValueByY(left, right, y);
  }
  return null;
}

export function measureTapeVisionCm(
  calibration: TapeVisionCalibration,
  start: TapeVisionPoint,
  end: TapeVisionPoint,
): { cm: number; startValue: number; endValue: number } | null {
  const startValue = tapeValueAtY(calibration, start.y);
  const endValue = tapeValueAtY(calibration, end.y);
  if (startValue == null || endValue == null) return null;
  return {
    cm: Math.abs(endValue - startValue) * (calibration.unit === "in" ? 2.54 : 1),
    startValue,
    endValue,
  };
}

export function buildTapeVisionSnap(
  calibration: TapeVisionCalibration,
  currentStart: TapeVisionPoint,
  currentEnd: TapeVisionPoint,
  intervalInTapeUnits: number,
): TapeVisionSnapResult | null {
  if (!Number.isFinite(intervalInTapeUnits) || intervalInTapeUnits <= 0) return null;
  const rawStartValue = tapeValueAtY(calibration, currentStart.y);
  if (rawStartValue == null) return null;
  const startValue = Math.round(rawStartValue);
  const startPoint = tapePointAtValue(calibration, startValue);
  if (!startPoint) return null;
  const requestedYDirection = currentEnd.y >= currentStart.y ? 1 : -1;
  const directions = [requestedYDirection, -requestedYDirection];
  for (const yDirection of directions) {
    const endValue = startValue + (calibration.direction * yDirection * intervalInTapeUnits);
    const end = tapePointAtValue(calibration, endValue);
    if (!end) continue;
    return {
      start: startPoint,
      end,
      startValue,
      endValue,
    };
  }
  return null;
}

export function buildTapeVisionHiddenIntervals(
  calibration: TapeVisionCalibration,
  intervalInTapeUnits = 10,
  count = 4,
): TapeVisionHiddenInterval[] {
  if (!Number.isFinite(intervalInTapeUnits) || intervalInTapeUnits <= 0 || count <= 0) return [];
  const alignedStarts: number[] = [];
  if (calibration.direction === 1) {
    const first = Math.ceil(calibration.minValue / intervalInTapeUnits) * intervalInTapeUnits;
    const last = Math.floor((calibration.maxValue - intervalInTapeUnits) / intervalInTapeUnits) * intervalInTapeUnits;
    for (let value = first; value <= last + 1e-6; value += intervalInTapeUnits) alignedStarts.push(value);
  } else {
    const first = Math.floor(calibration.maxValue / intervalInTapeUnits) * intervalInTapeUnits;
    const last = Math.ceil((calibration.minValue + intervalInTapeUnits) / intervalInTapeUnits) * intervalInTapeUnits;
    for (let value = first; value >= last - 1e-6; value -= intervalInTapeUnits) alignedStarts.push(value);
  }
  if (alignedStarts.length < count) return [];
  const chosenStarts = Array.from({ length: count }, (_, index) => (
    alignedStarts[Math.round((index * (alignedStarts.length - 1)) / Math.max(1, count - 1))]!
  ));
  const intervals: TapeVisionHiddenInterval[] = [];
  for (let index = 0; index < chosenStarts.length; index += 1) {
    const currentStartValue = chosenStarts[index]!;
    const currentEndValue = currentStartValue + (calibration.direction * intervalInTapeUnits);
    if (currentStartValue < calibration.minValue || currentStartValue > calibration.maxValue
      || currentEndValue < calibration.minValue || currentEndValue > calibration.maxValue) break;
    const start = tapePointAtValue(calibration, currentStartValue);
    const end = tapePointAtValue(calibration, currentEndValue);
    if (!start || !end) break;
    intervals.push({
      id: `hidden-${index + 1}`,
      start,
      end,
      startValue: currentStartValue,
      endValue: currentEndValue,
    });
  }
  return intervals;
}

export function buildTapeTickFallbackDetections({
  detections,
  centerXByY,
  lineScoreByY,
  visibilityByY,
  unit,
}: TapeTickFallbackInput): RawTapeVisionDetection[] {
  if (unit === "in") {
    const projectiveDetections = buildProjectiveTapeDetections(detections, centerXByY, visibilityByY);
    if (projectiveDetections.length) return projectiveDetections;
  }

  const pair = findTapeAnchorPair(detections, unit);
  if (!pair || centerXByY.length !== lineScoreByY.length || lineScoreByY.length < 100) return [];
  const [first, second] = pair;
  const valueSpan = second.value - first.value;
  const ySpan = second.y - first.y;
  const direction = Math.sign(valueSpan / ySpan) as -1 | 1;
  const startingStep = Math.abs(ySpan / valueSpan);
  const anchorY = strongestLineNear(lineScoreByY, first.y, startingStep * 0.55);
  const generated: RawTapeVisionDetection[] = [{
    value: first.value,
    x: centerAtY(centerXByY, anchorY),
    y: anchorY,
    confidence: 0.99,
    raw: "OpenCV tape tick",
  }];

  for (const yDirection of [-1, 1] as const) {
    let y = anchorY;
    let value = first.value;
    let step = startingStep;
    const maximumSteps = unit === "in" ? 100 : yDirection === -1 ? 5 : 250;
    for (let count = 0; count < maximumSteps; count += 1) {
      const predictedY = y + (yDirection * step);
      if (predictedY < 1 || predictedY >= lineScoreByY.length - 1) break;
      if (visibilityByY && !hasTapeVisibilityNear(visibilityByY, predictedY, Math.max(4, step * 0.7))) break;
      const detectedY = closestLinePeak(lineScoreByY, predictedY, Math.max(2.5, step * 0.38));
      const detectedStep = Math.abs(detectedY - y);
      const nextY = detectedStep < startingStep * 0.62 || detectedStep > startingStep * 1.42
        ? Math.round(predictedY)
        : detectedY;
      const observedStep = Math.abs(nextY - y);
      y = nextY;
      value += direction * yDirection;
      if (value < 0 || value > pathLimits(unit).maximumValue) break;
      step = (step * 0.88) + (observedStep * 0.12);
      generated.push({
        value,
        x: centerAtY(centerXByY, y),
        y,
        confidence: 0.99,
        raw: "OpenCV tape tick",
      });
    }
  }
  generated.sort((left, right) => left.y - right.y);

  const pairStillMatches = [first, second].every((anchor) => {
    const nearest = generated.reduce((best, candidate) => (
      Math.abs(candidate.y - anchor.y) < Math.abs(best.y - anchor.y) ? candidate : best
    ));
    return Math.abs(nearest.y - anchor.y) <= startingStep * 0.65
      && Math.abs(nearest.value - anchor.value) <= 1;
  });
  return pairStillMatches ? generated : [];
}

interface ProjectiveTapeModel {
  a: number;
  b: number;
  c: number;
}

/**
 * A straight tape is a straight 3D line, so its printed values follow a 1D
 * projective transform in the photo. Fitting that transform to several OCR
 * labels is much safer than greedily following dark rows, which can latch onto
 * digits instead of whole-inch marks. This map is proof/handle evidence only;
 * it is never passed into the blind body-scale model.
 */
function buildProjectiveTapeDetections(
  detections: RawTapeVisionDetection[],
  centerXByY: number[],
  visibilityByY?: number[],
): RawTapeVisionDetection[] {
  const candidates = deduplicateDetections(detections)
    .filter((detection) => detection.confidence >= 0.45
      && detection.value >= 0
      && detection.value <= pathLimits("in").maximumValue
      && isCompleteMultiDigitLabel(detection))
    .sort((left, right) => left.y - right.y);
  if (candidates.length < 4 || centerXByY.length < 100) return [];

  let best: { model: ProjectiveTapeModel; support: RawTapeVisionDetection[]; score: number } | null = null;
  for (let first = 0; first < candidates.length - 2; first += 1) {
    for (let second = first + 1; second < candidates.length - 1; second += 1) {
      for (let third = second + 1; third < candidates.length; third += 1) {
        const seed = [candidates[first]!, candidates[second]!, candidates[third]!];
        if (new Set(seed.map((point) => point.value)).size < 3) continue;
        const model = fitProjectiveTapeModel(seed);
        if (!model || !isPlausibleProjectiveTapeModel(model, candidates, centerXByY.length)) continue;
        const support = projectiveModelSupport(model, candidates);
        const distinctValues = new Set(support.map((point) => point.value));
        if (distinctValues.size < 4) continue;
        const coverage = Math.max(...distinctValues) - Math.min(...distinctValues);
        if (coverage < 10) continue;
        const rmse = projectiveRmse(model, support);
        const score = (distinctValues.size * 10_000) + (coverage * 100) - (rmse * 10);
        if (!best || score > best.score) best = { model, support, score };
      }
    }
  }
  if (!best) return [];

  // Refit all inliers and reject any OCR labels that move outside the final
  // tolerance. Two iterations are enough for this three-parameter model.
  let model = best.model;
  let support = best.support;
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const refined = fitProjectiveTapeModel(support);
    if (!refined || !isPlausibleProjectiveTapeModel(refined, support, centerXByY.length)) break;
    model = refined;
    support = projectiveModelSupport(model, candidates);
  }
  if (new Set(support.map((point) => point.value)).size < 4 || projectiveRmse(model, support) > 3) return [];

  const derivative = model.a - (model.b * model.c);
  const supportedValues = support.map((point) => point.value);
  const minimumSupportedValue = Math.ceil(Math.min(...supportedValues));
  const maximumValue = Math.floor(Math.max(...supportedValues));
  if (minimumSupportedValue >= maximumValue || Math.abs(derivative) < 1e-6) return [];

  const generated: RawTapeVisionDetection[] = [];
  // Values below the OCR-supported range may be projected only while the
  // coloured tape is independently visible at that row. This prevents a
  // mathematically plausible projective fit from inventing a 0 mark on the
  // floor after the physical tape has ended.
  const minimumCandidateValue = visibilityByY ? 0 : minimumSupportedValue;
  for (let value = minimumCandidateValue; value <= maximumValue; value += 1) {
    const y = projectTapeY(model, value);
    if (!Number.isFinite(y) || y < 1 || y >= centerXByY.length - 1) continue;
    if (value < minimumSupportedValue
      && (!visibilityByY || !hasTapeVisibilityNear(visibilityByY, y, 12))) continue;
    generated.push({
      value,
      x: centerAtY(centerXByY, y),
      y,
      confidence: 0.99,
      raw: "Projective tape map",
    });
  }
  return generated.sort((left, right) => left.y - right.y);
}

function hasTapeVisibilityNear(signal: number[], centerY: number, radius: number): boolean {
  const left = clampInteger(Math.floor(centerY - radius), 0, signal.length - 1);
  const right = clampInteger(Math.ceil(centerY + radius), 0, signal.length - 1);
  let visible = 0;
  for (let y = left; y <= right; y += 1) {
    if (signal[y]! >= 0.5) visible += 1;
  }
  return visible / Math.max(1, right - left + 1) >= 0.35;
}

function fitProjectiveTapeModel(points: RawTapeVisionDetection[]): ProjectiveTapeModel | null {
  if (points.length < 3) return null;
  const normal = Array.from({ length: 3 }, () => [0, 0, 0]);
  const target = [0, 0, 0];
  for (const point of points) {
    const row = [point.value, 1, -point.value * point.y];
    for (let column = 0; column < 3; column += 1) {
      target[column]! += row[column]! * point.y;
      for (let inner = 0; inner < 3; inner += 1) {
        normal[column]![inner]! += row[column]! * row[inner]!;
      }
    }
  }
  const solved = solveThreeByThree(normal, target);
  if (!solved || solved.some((value) => !Number.isFinite(value))) return null;
  return { a: solved[0]!, b: solved[1]!, c: solved[2]! };
}

function solveThreeByThree(matrix: number[][], target: number[]): number[] | null {
  const rows = matrix.map((row, index) => [...row, target[index]!]);
  for (let pivot = 0; pivot < 3; pivot += 1) {
    let bestRow = pivot;
    for (let row = pivot + 1; row < 3; row += 1) {
      if (Math.abs(rows[row]![pivot]!) > Math.abs(rows[bestRow]![pivot]!)) bestRow = row;
    }
    if (Math.abs(rows[bestRow]![pivot]!) < 1e-10) return null;
    [rows[pivot], rows[bestRow]] = [rows[bestRow]!, rows[pivot]!];
    const divisor = rows[pivot]![pivot]!;
    for (let column = pivot; column < 4; column += 1) rows[pivot]![column]! /= divisor;
    for (let row = 0; row < 3; row += 1) {
      if (row === pivot) continue;
      const factor = rows[row]![pivot]!;
      for (let column = pivot; column < 4; column += 1) {
        rows[row]![column]! -= factor * rows[pivot]![column]!;
      }
    }
  }
  return rows.map((row) => row[3]!);
}

function projectTapeY(model: ProjectiveTapeModel, value: number): number {
  const denominator = (model.c * value) + 1;
  if (Math.abs(denominator) < 1e-9) return Number.NaN;
  return ((model.a * value) + model.b) / denominator;
}

function projectiveModelSupport(
  model: ProjectiveTapeModel,
  candidates: RawTapeVisionDetection[],
): RawTapeVisionDetection[] {
  return candidates.filter((point) => Math.abs(projectTapeY(model, point.value) - point.y) <= 4);
}

function projectiveRmse(model: ProjectiveTapeModel, points: RawTapeVisionDetection[]): number {
  if (!points.length) return Number.POSITIVE_INFINITY;
  const squaredError = points.reduce((sum, point) => {
    const error = projectTapeY(model, point.value) - point.y;
    return sum + (error * error);
  }, 0);
  return Math.sqrt(squaredError / points.length);
}

function isPlausibleProjectiveTapeModel(
  model: ProjectiveTapeModel,
  points: RawTapeVisionDetection[],
  imageHeight: number,
): boolean {
  const derivative = model.a - (model.b * model.c);
  if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-6) return false;
  for (const value of [0, 25, 50, 75, 99]) {
    if (Math.abs((model.c * value) + 1) < 0.2) return false;
  }
  const localSteps = points.map((point) => {
    const denominator = (model.c * point.value) + 1;
    return Math.abs(derivative / (denominator * denominator));
  });
  const sortedSteps = localSteps.sort((left, right) => left - right);
  const medianStep = sortedSteps[Math.floor(sortedSteps.length / 2)]!;
  if (medianStep < 20 || medianStep > 75) return false;
  return points.every((point) => {
    const predicted = projectTapeY(model, point.value);
    return Number.isFinite(predicted) && predicted >= -imageHeight * 0.25 && predicted <= imageHeight * 1.25;
  });
}

export function tapePointAtValue(
  calibration: TapeVisionCalibration,
  value: number,
): TapeVisionPoint | null {
  const detections = calibration.detections;
  if (detections.length < 2) return null;
  const first = detections[0]!;
  const second = detections[1]!;
  const penultimate = detections[detections.length - 2]!;
  const last = detections[detections.length - 1]!;
  const valueBeforeFirst = (value - first.value) * calibration.direction < 0;
  const valueAfterLast = (value - last.value) * calibration.direction > 0;
  if (valueBeforeFirst) return interpolatePointByValue(first, second, value, MAX_EXTRAPOLATION_PX);
  if (valueAfterLast) return interpolatePointByValue(penultimate, last, value, MAX_EXTRAPOLATION_PX);
  for (let index = 0; index < detections.length - 1; index += 1) {
    const first = detections[index]!;
    const second = detections[index + 1]!;
    const low = Math.min(first.value, second.value);
    const high = Math.max(first.value, second.value);
    if (value < low || value > high) continue;
    return interpolatePointByValue(first, second, value);
  }
  return null;
}

function interpolateValueByY(first: TapeVisionDetection, second: TapeVisionDetection, y: number): number {
  const span = second.y - first.y;
  if (Math.abs(span) < 1e-9) return first.value;
  return first.value + ((second.value - first.value) * ((y - first.y) / span));
}

function interpolatePointByValue(
  first: TapeVisionDetection,
  second: TapeVisionDetection,
  value: number,
  maximumExtrapolationPx?: number,
): TapeVisionPoint | null {
  const valueSpan = second.value - first.value;
  if (Math.abs(valueSpan) < 1e-9) return { x: first.x, y: first.y };
  const ratio = (value - first.value) / valueSpan;
  const point = {
    x: first.x + ((second.x - first.x) * ratio),
    y: first.y + ((second.y - first.y) * ratio),
  };
  if (maximumExtrapolationPx != null) {
    const nearestY = Math.abs(point.y - first.y) <= Math.abs(point.y - second.y) ? first.y : second.y;
    if (Math.abs(point.y - nearestY) > maximumExtrapolationPx) return null;
  }
  return point;
}

function deduplicateDetections(detections: RawTapeVisionDetection[]): RawTapeVisionDetection[] {
  const unambiguous = detections.filter((detection) => detection.value >= 10 || !detections.some((candidate) => (
    candidate !== detection
      && candidate.value >= 10
      && candidate.confidence >= detection.confidence - 0.2
      && Math.abs(candidate.y - detection.y) <= 4
      && Math.abs(candidate.x - detection.x) <= 30
  )));
  const kept: RawTapeVisionDetection[] = [];
  for (const detection of [...unambiguous].sort((first, second) => second.confidence - first.confidence)) {
    const duplicate = kept.some((candidate) => candidate.value === detection.value
      && Math.abs(candidate.y - detection.y) <= 26
      && Math.abs(candidate.x - detection.x) <= 30);
    if (!duplicate) kept.push(detection);
  }
  return kept;
}

function findTapeAnchorPair(
  detections: RawTapeVisionDetection[],
  unit: TapeVisionUnit,
): [RawTapeVisionDetection, RawTapeVisionDetection] | null {
  const limits = pathLimits(unit);
  const minimumPixelsPerUnit = limits.minimumPixelsPerUnit;
  const maximumPixelsPerUnit = limits.maximumPixelsPerUnit;
  const maximumValueSpan = unit === "cm" ? 40 : 25;
  const preferredPixelsPerUnit = limits.preferredPixelsPerUnit;
  const usable = deduplicateDetections(detections)
    .filter((detection) => detection.confidence >= 0.45 && detection.value >= 0 && detection.value <= limits.maximumValue)
    .sort((left, right) => left.y - right.y);
  let best: { pair: [RawTapeVisionDetection, RawTapeVisionDetection]; score: number } | null = null;
  for (let firstIndex = 0; firstIndex < usable.length - 1; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < usable.length; secondIndex += 1) {
      const first = usable[firstIndex]!;
      const second = usable[secondIndex]!;
      const valueSpan = Math.abs(second.value - first.value);
      const ySpan = Math.abs(second.y - first.y);
      if (valueSpan < 3 || valueSpan > maximumValueSpan || ySpan < 20) continue;
      const pixelsPerUnit = ySpan / valueSpan;
      if (pixelsPerUnit < minimumPixelsPerUnit || pixelsPerUnit > maximumPixelsPerUnit) continue;
      const valuePerPixel = (second.value - first.value) / (second.y - first.y);
      const supported = usable.filter((candidate) => {
        const predictedValue = first.value + ((candidate.y - first.y) * valuePerPixel);
        return Math.abs(predictedValue - candidate.value) <= 1;
      });
      const completeLabelSupport = unit === "in"
        ? supported.filter(isCompleteMultiDigitLabel).length
        : 0;
      const score = (Math.min(valueSpan, 20) * 4)
        // A low-confidence misread far down the tape can create a plausible
        // but completely wrong cm spacing. Prefer two clear printed anchors;
        // OpenCV then follows the intervening physical tick rows.
        + ((first.confidence + second.confidence) * 40)
        + (supported.length * 12)
        + (completeLabelSupport * 100)
        - Math.abs(pixelsPerUnit - preferredPixelsPerUnit);
      if (!best || score > best.score) best = { pair: [first, second], score };
    }
  }
  return best?.pair ?? null;
}

function isCompleteMultiDigitLabel(detection: RawTapeVisionDetection): boolean {
  const raw = detection.raw.trim();
  return /^(?:[1-9][0-9]{1,2})$/.test(raw) && Number(raw) === detection.value;
}

function strongestLineNear(signal: number[], centerY: number, radius: number): number {
  const left = Math.max(1, Math.floor(centerY - radius));
  const right = Math.min(signal.length - 2, Math.ceil(centerY + radius));
  let best = clampInteger(Math.round(centerY), left, right);
  for (let y = left; y <= right; y += 1) {
    if (signal[y]! > signal[best]!) best = y;
  }
  return best;
}

function closestLinePeak(signal: number[], predictedY: number, radius: number): number {
  const left = Math.max(1, Math.floor(predictedY - radius));
  const right = Math.min(signal.length - 2, Math.ceil(predictedY + radius));
  const peaks: number[] = [];
  for (let y = left; y <= right; y += 1) {
    if (signal[y]! >= signal[y - 1]! && signal[y]! >= signal[y + 1]!) peaks.push(y);
  }
  if (!peaks.length) return clampInteger(Math.round(predictedY), left, right);
  return peaks.reduce((best, candidate) => {
    const candidateDistance = Math.abs(candidate - predictedY);
    const bestDistance = Math.abs(best - predictedY);
    if (candidateDistance < bestDistance - 0.01) return candidate;
    if (Math.abs(candidateDistance - bestDistance) <= 0.01 && signal[candidate]! > signal[best]!) return candidate;
    return best;
  });
}

function centerAtY(centers: number[], y: number): number {
  const low = clampInteger(Math.floor(y), 0, centers.length - 1);
  const high = clampInteger(Math.ceil(y), 0, centers.length - 1);
  if (low === high) return centers[low]!;
  const ratio = y - low;
  return centers[low]! + ((centers[high]! - centers[low]!) * ratio);
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function longestMonotonicTapePath(
  detections: RawTapeVisionDetection[],
  direction: -1 | 1,
  unit: TapeVisionUnit,
): TapeVisionDetection[] {
  const limits = pathLimits(unit);
  const states: PathState[] = detections.map((detection) => ({
    score: 1 + detection.confidence,
    previous: -1,
    nodeCount: 1,
    coverage: 0,
  }));
  for (let currentIndex = 0; currentIndex < detections.length; currentIndex += 1) {
    const current = detections[currentIndex]!;
    for (let previousIndex = 0; previousIndex < currentIndex; previousIndex += 1) {
      const previous = detections[previousIndex]!;
      const ySpan = current.y - previous.y;
      const valueStep = (current.value - previous.value) * direction;
      if (ySpan < limits.minimumYSpan || valueStep < 1 || valueStep > limits.maximumValueStep) continue;
      const pixelsPerUnit = ySpan / valueStep;
      if (pixelsPerUnit < limits.minimumPixelsPerUnit || pixelsPerUnit > limits.maximumPixelsPerUnit) continue;
      if (Math.abs(current.x - previous.x) > 18 + (ySpan * 0.1)) continue;
      const previousState = states[previousIndex]!;
      const candidateScore = previousState.score
        + (valueStep * 4)
        + current.confidence
        - ((valueStep - 1) * 0.3)
        - (Math.abs(pixelsPerUnit - limits.preferredPixelsPerUnit) * 0.01);
      if (candidateScore <= states[currentIndex]!.score) continue;
      states[currentIndex] = {
        score: candidateScore,
        previous: previousIndex,
        nodeCount: previousState.nodeCount + 1,
        coverage: previousState.coverage + valueStep,
      };
    }
  }

  let bestIndex = 0;
  for (let index = 1; index < states.length; index += 1) {
    const state = states[index]!;
    const bestState = states[bestIndex]!;
    const rank = state.coverage * 10 + state.nodeCount + state.score * 0.01;
    const bestRank = bestState.coverage * 10 + bestState.nodeCount + bestState.score * 0.01;
    if (rank > bestRank) bestIndex = index;
  }
  const path: TapeVisionDetection[] = [];
  for (let index = bestIndex; index >= 0; index = states[index]!.previous) {
    path.push(detections[index]!);
    if (states[index]!.previous < 0) break;
  }
  return path.reverse();
}

function pathLimits(unit: TapeVisionUnit): {
  maximumValue: number;
  minimumNodes: number;
  minimumCoverage: number;
  minimumYSpan: number;
  maximumValueStep: number;
  minimumPixelsPerUnit: number;
  maximumPixelsPerUnit: number;
  preferredPixelsPerUnit: number;
} {
  return unit === "cm"
    ? {
        maximumValue: 250,
        minimumNodes: 8,
        minimumCoverage: 35,
        minimumYSpan: 4,
        maximumValueStep: 12,
        minimumPixelsPerUnit: 5,
        // Full-resolution phone photos can exceed 30 pixels per printed
        // centimetre. Sequence consistency still rejects isolated OCR noise.
        maximumPixelsPerUnit: 80,
        preferredPixelsPerUnit: 25,
      }
    : {
        maximumValue: 99,
        minimumNodes: 10,
        minimumCoverage: 15,
        minimumYSpan: 20,
        maximumValueStep: 12,
        minimumPixelsPerUnit: 20,
        maximumPixelsPerUnit: 75,
        preferredPixelsPerUnit: 45,
      };
}

function pathRank(path: TapeVisionDetection[]): number {
  if (!path.length) return 0;
  const coverage = Math.abs(path[path.length - 1]!.value - path[0]!.value);
  return coverage * 10 + path.length;
}

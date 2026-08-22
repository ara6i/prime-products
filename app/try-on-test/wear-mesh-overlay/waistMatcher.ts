import {
  horizontalBodyInterval,
  outlineBounds,
  polylinePerimeter,
  type Point2,
} from "./geometry";

export const WAIST_SLICE_OFFSETS = [-0.04, -0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.04] as const;

export interface OutlineMeasurementSpace {
  points: readonly Point2[];
  statureCm: number;
  yAxis: "down" | "up";
  imageWidthPx?: number;
  imageHeightPx?: number;
}

export interface WaistBandDescriptor {
  centreHeightFractionFromFeet: number;
  offsets: number[];
  widthsBodyHeight: number[];
  widthsCmEquivalent: number[];
}

export interface GeometryOnlyWaistCandidate {
  scanId: string;
  heightCm: number;
  weightKg: number;
  descriptor: WaistBandDescriptor;
}

export interface RankedWaistCandidate {
  rank: number;
  scanId: string;
  heightCm: number;
  weightKg: number;
  meanAbsoluteWidthErrorBodyHeight: number;
  meanAbsoluteWidthErrorCmEquivalent: number;
  similarityWeight: number;
  descriptor: WaistBandDescriptor;
}

export interface GeometryOnlyDualViewCandidate {
  scanId: string;
  heightCm: number;
  weightKg: number;
  front: WaistBandDescriptor;
  side: WaistBandDescriptor;
}

export interface RankedDualViewCandidate {
  rank: number;
  scanId: string;
  heightCm: number;
  weightKg: number;
  frontErrorBodyHeight: number;
  sideErrorBodyHeight: number;
  frontShapeErrorBodyHeight: number;
  sideShapeErrorBodyHeight: number;
  frontRegionalErrorBodyHeight: number;
  sideRegionalErrorBodyHeight: number;
  worstViewErrorBodyHeight: number;
  combinedErrorBodyHeight: number;
  similarityWeight: number;
}

export interface WaistHipShapeRow {
  breadthCm: number;
  depthCm: number;
  breadthBodyHeight: number;
  depthBodyHeight: number;
}

export interface GeometryOnlyWaistHipCandidate {
  scanId: string;
  heightCm: number;
  weightKg: number;
  rows: { waist: WaistHipShapeRow; hips: WaistHipShapeRow };
}

export interface WaistHipShapeQuery {
  waist: { breadthCm: number; depthCm: number; breadthBodyHeight: number; depthBodyHeight: number };
  hips: { breadthCm: number; depthCm: number; breadthBodyHeight: number; depthBodyHeight: number };
}

export interface RankedWaistHipCandidate extends GeometryOnlyWaistHipCandidate {
  rank: number;
  waistFrontErrorBodyHeight: number;
  waistSideErrorBodyHeight: number;
  hipsFrontErrorBodyHeight: number;
  hipsSideErrorBodyHeight: number;
  meanErrorBodyHeight: number;
  worstErrorBodyHeight: number;
  combinedErrorBodyHeight: number;
  similarityWeight: number;
}

export interface RankedBodyPartShapeCandidate extends GeometryOnlyWaistHipCandidate {
  rank: number;
  rowKey: "waist" | "hips";
  frontErrorCm: number;
  sideErrorCm: number;
  meanErrorCm: number;
  worstErrorCm: number;
  combinedErrorCm: number;
  similarityWeight: number;
}

function mean(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function centreIndex(descriptor: WaistBandDescriptor) {
  let selected = 0;
  for (let index = 1; index < descriptor.offsets.length; index += 1) {
    if (Math.abs(descriptor.offsets[index]!) < Math.abs(descriptor.offsets[selected]!)) selected = index;
  }
  return selected;
}

/**
 * Compares the local waist curve after removing its centre width. This makes
 * the inward/outward change above and below the waist count separately from
 * the absolute body size.
 */
function localShapeError(query: WaistBandDescriptor, candidate: WaistBandDescriptor) {
  const queryCentre = query.widthsBodyHeight[centreIndex(query)]!;
  const candidateCentre = candidate.widthsBodyHeight[centreIndex(candidate)]!;
  return mean(query.widthsBodyHeight.map((value, index) => (
    Math.abs(
      (value - queryCentre)
      - (candidate.widthsBodyHeight[index]! - candidateCentre),
    )
  )));
}

function widestHorizontalInterval(points: readonly Point2[], y: number) {
  const intersections: number[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const [ax, ay] = points[index]!;
    const [bx, by] = points[(index + 1) % points.length]!;
    if (!((ay <= y && by > y) || (by <= y && ay > y))) continue;
    intersections.push(ax + (y - ay) / (by - ay) * (bx - ax));
  }
  intersections.sort((left, right) => left - right);
  let widest: { left: number; right: number } | null = null;
  for (let index = 0; index + 1 < intersections.length; index += 2) {
    const interval = { left: intersections[index]!, right: intersections[index + 1]! };
    if (!widest || interval.right - interval.left > widest.right - widest.left) widest = interval;
  }
  return widest;
}

export function widthAtHeightFraction(
  space: OutlineMeasurementSpace,
  heightFractionFromFeet: number,
): { widthBodyHeight: number; widthCmEquivalent: number } | null {
  const bounds = outlineBounds(space.points);
  if (!bounds || !(space.statureCm > 0)) return null;
  const bodyHeight = bounds.maximumY - bounds.minimumY;
  if (!(bodyHeight > 0)) return null;
  const clamped = Math.min(1, Math.max(0, heightFractionFromFeet));
  const y = space.yAxis === "down"
    ? bounds.maximumY - clamped * bodyHeight
    : bounds.minimumY + clamped * bodyHeight;
  const centreX = (bounds.minimumX + bounds.maximumX) / 2;
  // A side photo can have long forward arms that move the whole-outline centre
  // away from the torso. Prefer the centre-containing interval, then the widest
  // visible interval at that anatomical row.
  const interval = horizontalBodyInterval(space.points, y, centreX)
    ?? widestHorizontalInterval(space.points, y);
  if (!interval) return null;

  const widthScale = space.imageWidthPx ?? 1;
  const heightScale = space.imageHeightPx ?? 1;
  const bodyHeightScaled = bodyHeight * heightScale;
  const widthScaled = (interval.right - interval.left) * widthScale;
  if (!(bodyHeightScaled > 0) || !(widthScaled > 0)) return null;
  const widthBodyHeight = widthScaled / bodyHeightScaled;
  return {
    widthBodyHeight,
    widthCmEquivalent: widthBodyHeight * space.statureCm,
  };
}

/**
 * Finds the visible natural-waist candidate without using tape, depth, a saved
 * row, or a WEAR answer. The front outline is sampled only in the anatomical
 * waist band and the narrowest smoothed run is selected.
 */
export function locateVisibleWaistFraction(space: OutlineMeasurementSpace) {
  let best: { fraction: number; width: number } | null = null;
  for (let step = 0; step <= 30; step += 1) {
    const fraction = 0.54 + step * 0.004;
    const samples = [-0.004, 0, 0.004]
      .map((offset) => widthAtHeightFraction(space, fraction + offset)?.widthBodyHeight)
      .filter((value): value is number => value != null);
    if (samples.length !== 3) continue;
    const smoothedWidth = mean(samples);
    if (!best || smoothedWidth < best.width) best = { fraction, width: smoothedWidth };
  }
  return best?.fraction ?? null;
}

export function buildWaistBandDescriptor(
  space: OutlineMeasurementSpace,
  centreHeightFractionFromFeet: number,
  offsets: readonly number[] = WAIST_SLICE_OFFSETS,
): WaistBandDescriptor | null {
  const samples = offsets.map((offset) => widthAtHeightFraction(
    space,
    centreHeightFractionFromFeet + offset,
  ));
  if (samples.some((sample) => sample == null)) return null;
  return {
    centreHeightFractionFromFeet,
    offsets: [...offsets],
    widthsBodyHeight: samples.map((sample) => sample!.widthBodyHeight),
    widthsCmEquivalent: samples.map((sample) => sample!.widthCmEquivalent),
  };
}

/** Tape/depth/circumference are intentionally absent from this signature. */
export function rankWaistCandidates(
  query: WaistBandDescriptor,
  candidates: readonly GeometryOnlyWaistCandidate[],
  topK = 5,
): RankedWaistCandidate[] {
  const compared = candidates
    .filter((candidate) => candidate.descriptor.widthsBodyHeight.length === query.widthsBodyHeight.length)
    .map((candidate) => {
      const normalizedErrors = query.widthsBodyHeight.map((value, index) => (
        Math.abs(value - candidate.descriptor.widthsBodyHeight[index]!)
      ));
      const centimetreErrors = query.widthsCmEquivalent.map((value, index) => (
        Math.abs(value - candidate.descriptor.widthsCmEquivalent[index]!)
      ));
      return {
        scanId: candidate.scanId,
        heightCm: candidate.heightCm,
        weightKg: candidate.weightKg,
        descriptor: candidate.descriptor,
        meanAbsoluteWidthErrorBodyHeight: mean(normalizedErrors),
        meanAbsoluteWidthErrorCmEquivalent: mean(centimetreErrors),
      };
    })
    .sort((left, right) => (
      left.meanAbsoluteWidthErrorBodyHeight - right.meanAbsoluteWidthErrorBodyHeight
      || left.scanId.localeCompare(right.scanId)
    ))
    .slice(0, Math.max(1, topK));

  const rawWeights = compared.map((candidate) => (
    Math.exp(-candidate.meanAbsoluteWidthErrorBodyHeight / 0.012)
  ));
  const weightTotal = rawWeights.reduce((sum, value) => sum + value, 0) || 1;
  return compared.map((candidate, index) => ({
    rank: index + 1,
    ...candidate,
    similarityWeight: rawWeights[index]! / weightTotal,
  }));
}

export function weightedMean(
  ranked: readonly RankedWaistCandidate[],
  valueForScan: (scanId: string) => number | null,
) {
  const available = ranked
    .map((candidate) => ({ candidate, value: valueForScan(candidate.scanId) }))
    .filter((item): item is { candidate: RankedWaistCandidate; value: number } => (
      item.value != null && Number.isFinite(item.value)
    ));
  const totalWeight = available.reduce((sum, item) => sum + item.candidate.similarityWeight, 0);
  if (!(totalWeight > 0)) return null;
  return available.reduce(
    (sum, item) => sum + item.value * item.candidate.similarityWeight,
    0,
  ) / totalWeight;
}

/**
 * Front and side receive equal weight. Each view compares both absolute width
 * and the nine-level local waist curve. A worst-view term prevents a very good
 * front match from hiding a poor side match (or the reverse). No measurement
 * label can enter this rank.
 */
export function rankDualViewCandidates(
  queryFront: WaistBandDescriptor,
  querySide: WaistBandDescriptor,
  candidates: readonly GeometryOnlyDualViewCandidate[],
  topK = 5,
): RankedDualViewCandidate[] {
  const ranked = candidates.map((candidate) => {
    if (
      candidate.front.widthsBodyHeight.length !== queryFront.widthsBodyHeight.length
      || candidate.side.widthsBodyHeight.length !== querySide.widthsBodyHeight.length
    ) return null;
    const frontErrorBodyHeight = mean(queryFront.widthsBodyHeight.map((value, index) => (
      Math.abs(value - candidate.front.widthsBodyHeight[index]!)
    )));
    const sideErrorBodyHeight = mean(querySide.widthsBodyHeight.map((value, index) => (
      Math.abs(value - candidate.side.widthsBodyHeight[index]!)
    )));
    const frontShapeErrorBodyHeight = localShapeError(queryFront, candidate.front);
    const sideShapeErrorBodyHeight = localShapeError(querySide, candidate.side);
    const frontRegionalErrorBodyHeight = frontErrorBodyHeight * 0.75 + frontShapeErrorBodyHeight * 0.25;
    const sideRegionalErrorBodyHeight = sideErrorBodyHeight * 0.75 + sideShapeErrorBodyHeight * 0.25;
    const worstViewErrorBodyHeight = Math.max(frontRegionalErrorBodyHeight, sideRegionalErrorBodyHeight);
    return {
      scanId: candidate.scanId,
      heightCm: candidate.heightCm,
      weightKg: candidate.weightKg,
      frontErrorBodyHeight,
      sideErrorBodyHeight,
      frontShapeErrorBodyHeight,
      sideShapeErrorBodyHeight,
      frontRegionalErrorBodyHeight,
      sideRegionalErrorBodyHeight,
      worstViewErrorBodyHeight,
      combinedErrorBodyHeight: (
        frontRegionalErrorBodyHeight * 0.4
        + sideRegionalErrorBodyHeight * 0.4
        + worstViewErrorBodyHeight * 0.2
      ),
    };
  }).filter((value): value is NonNullable<typeof value> => value != null)
    .sort((left, right) => (
      left.combinedErrorBodyHeight - right.combinedErrorBodyHeight
      || left.scanId.localeCompare(right.scanId)
    ))
    .slice(0, Math.max(1, topK));
  const rawWeights = ranked.map((candidate) => Math.exp(-candidate.combinedErrorBodyHeight / 0.012));
  const totalWeight = rawWeights.reduce((sum, value) => sum + value, 0) || 1;
  return ranked.map((candidate, index) => ({
    rank: index + 1,
    ...candidate,
    similarityWeight: rawWeights[index]! / totalWeight,
  }));
}

/**
 * Ranks exact WEAR waist + hip breadth/depth geometry. Height and weight are
 * deliberately absent: callers may filter a cohort first or search all
 * same-gender people. Tape and circumference cannot enter this function.
 */
export function rankWaistHipShapeCandidates(
  query: WaistHipShapeQuery,
  candidates: readonly GeometryOnlyWaistHipCandidate[],
  topK = 10,
): RankedWaistHipCandidate[] {
  const ranked = candidates.map((candidate) => {
    const errors = {
      waistFrontErrorBodyHeight: Math.abs(
        query.waist.breadthBodyHeight - candidate.rows.waist.breadthBodyHeight,
      ),
      waistSideErrorBodyHeight: Math.abs(
        query.waist.depthBodyHeight - candidate.rows.waist.depthBodyHeight,
      ),
      hipsFrontErrorBodyHeight: Math.abs(
        query.hips.breadthBodyHeight - candidate.rows.hips.breadthBodyHeight,
      ),
      hipsSideErrorBodyHeight: Math.abs(
        query.hips.depthBodyHeight - candidate.rows.hips.depthBodyHeight,
      ),
    };
    const values = Object.values(errors);
    const meanErrorBodyHeight = mean(values);
    const worstErrorBodyHeight = Math.max(...values);
    return {
      ...candidate,
      ...errors,
      meanErrorBodyHeight,
      worstErrorBodyHeight,
      combinedErrorBodyHeight: meanErrorBodyHeight * 0.8 + worstErrorBodyHeight * 0.2,
    };
  }).sort((left, right) => (
    left.combinedErrorBodyHeight - right.combinedErrorBodyHeight
    || left.scanId.localeCompare(right.scanId)
  )).slice(0, Math.max(1, topK));

  const rawWeights = ranked.map((candidate) => Math.exp(-candidate.combinedErrorBodyHeight / 0.008));
  const totalWeight = rawWeights.reduce((sum, value) => sum + value, 0) || 1;
  return ranked.map((candidate, index) => ({
    rank: index + 1,
    ...candidate,
    similarityWeight: rawWeights[index]! / totalWeight,
  }));
}

/**
 * Finds the closest physical front breadth + side depth for one body part.
 * The optional height/weight cohort is applied by the caller. Tape,
 * circumference and the other body part cannot affect this rank.
 */
export function rankBodyPartShapeCandidates(
  query: { breadthCm: number; depthCm: number },
  candidates: readonly GeometryOnlyWaistHipCandidate[],
  rowKey: "waist" | "hips",
  topK = 10,
): RankedBodyPartShapeCandidate[] {
  const ranked = candidates.map((candidate) => {
    const row = candidate.rows[rowKey];
    const frontErrorCm = Math.abs(query.breadthCm - row.breadthCm);
    const sideErrorCm = Math.abs(query.depthCm - row.depthCm);
    const meanErrorCm = (frontErrorCm + sideErrorCm) / 2;
    const worstErrorCm = Math.max(frontErrorCm, sideErrorCm);
    return {
      ...candidate,
      rowKey,
      frontErrorCm,
      sideErrorCm,
      meanErrorCm,
      worstErrorCm,
      combinedErrorCm: meanErrorCm * 0.8 + worstErrorCm * 0.2,
    };
  }).sort((left, right) => (
    left.combinedErrorCm - right.combinedErrorCm
    || left.scanId.localeCompare(right.scanId)
  )).slice(0, Math.max(1, topK));

  const rawWeights = ranked.map((candidate) => Math.exp(-candidate.combinedErrorCm / 1.25));
  const totalWeight = rawWeights.reduce((sum, value) => sum + value, 0) || 1;
  return ranked.map((candidate, index) => ({
    rank: index + 1,
    ...candidate,
    similarityWeight: rawWeights[index]! / totalWeight,
  }));
}

export function resampleClosedContour(
  contour: readonly Point2[],
  targetCount = 32,
): Point2[] {
  if (contour.length < 3 || targetCount < 3) return [];
  const segmentLengths = contour.map((point, index) => {
    const next = contour[(index + 1) % contour.length]!;
    return Math.hypot(next[0] - point[0], next[1] - point[1]);
  });
  const total = segmentLengths.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return [];
  const output: Point2[] = [];
  for (let sample = 0; sample < targetCount; sample += 1) {
    let remaining = total * sample / targetCount;
    let segment = 0;
    while (segment < segmentLengths.length - 1 && remaining > segmentLengths[segment]!) {
      remaining -= segmentLengths[segment]!;
      segment += 1;
    }
    const start = contour[segment]!;
    const end = contour[(segment + 1) % contour.length]!;
    const length = segmentLengths[segment]!;
    const progress = length > 0 ? remaining / length : 0;
    output.push([
      start[0] + (end[0] - start[0]) * progress,
      start[1] + (end[1] - start[1]) * progress,
    ]);
  }
  return output;
}

export function resizeClosedShapePerimeter(input: {
  contour: readonly Point2[];
  targetBreadthCm: number;
  targetDepthCm: number;
}) {
  const { contour, targetBreadthCm, targetDepthCm } = input;
  if (contour.length < 3 || !(targetBreadthCm > 0) || !(targetDepthCm > 0)) return null;
  const xs = contour.map((point) => point[0]);
  const ys = contour.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sourceBreadth = maxX - minX;
  const sourceDepth = maxY - minY;
  if (!(sourceBreadth > 0) || !(sourceDepth > 0)) return null;
  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;
  const resized = contour.map(([x, y]) => [
    (x - centreX) * targetBreadthCm / sourceBreadth,
    (y - centreY) * targetDepthCm / sourceDepth,
  ] as Point2);
  return polylinePerimeter(resized);
}

export type Point2 = readonly [number, number];

export interface NormalizedLine {
  left: number;
  right: number;
  y: number;
}

export interface OutlineBounds {
  minimumX: number;
  maximumX: number;
  minimumY: number;
  maximumY: number;
}

export function pairsFromFlat(values: readonly number[]): Point2[] {
  const points: Point2[] = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    points.push([values[index]!, values[index + 1]!]);
  }
  return points;
}

export function outlineBounds(points: readonly Point2[]): OutlineBounds | null {
  if (points.length === 0) return null;
  let minimumX = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let minimumY = Number.POSITIVE_INFINITY;
  let maximumY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of points) {
    minimumX = Math.min(minimumX, x);
    maximumX = Math.max(maximumX, x);
    minimumY = Math.min(minimumY, y);
    maximumY = Math.max(maximumY, y);
  }
  if (![minimumX, maximumX, minimumY, maximumY].every(Number.isFinite)) return null;
  return { minimumX, maximumX, minimumY, maximumY };
}

/**
 * Finds the visible body interval containing the supplied centre point.
 *
 * A photo row may cross left arm, torso, and right arm. Taking the outermost
 * intersections would silently include the arms. Polygon intersections come
 * in inside/outside pairs; the torso is the interval that contains bodyCentreX.
 */
export function horizontalBodyInterval(
  points: readonly Point2[],
  y: number,
  bodyCentreX: number,
): { left: number; right: number; intersections: number[] } | null {
  if (points.length < 3) return null;
  const intersections: number[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const [ax, ay] = points[index]!;
    const [bx, by] = points[(index + 1) % points.length]!;
    const crosses = (ay <= y && by > y) || (by <= y && ay > y);
    if (!crosses) continue;
    const progress = (y - ay) / (by - ay);
    intersections.push(ax + progress * (bx - ax));
  }
  intersections.sort((left, right) => left - right);
  for (let index = 0; index + 1 < intersections.length; index += 2) {
    const left = intersections[index]!;
    const right = intersections[index + 1]!;
    if (left <= bodyCentreX && bodyCentreX <= right) {
      return { left, right, intersections };
    }
  }
  return null;
}

export function rowYFromMetricHeight(
  bodyBounds: OutlineBounds,
  rowHeightCm: number,
  statureCm: number,
): number {
  const bodyHeight = bodyBounds.maximumY - bodyBounds.minimumY;
  const fractionFromFloor = statureCm > 0 ? rowHeightCm / statureCm : 0;
  return bodyBounds.maximumY - Math.min(1, Math.max(0, fractionFromFloor)) * bodyHeight;
}

/** Flat known-height scale. This is intentionally not a camera correction. */
export function heightScaledLineWidthCm(
  line: NormalizedLine,
  imageWidthPx: number,
  imageHeightPx: number,
  bodyBounds: OutlineBounds,
  statureCm: number,
): number | null {
  const bodyHeightPx = (bodyBounds.maximumY - bodyBounds.minimumY) * imageHeightPx;
  const lineWidthPx = Math.abs(line.right - line.left) * imageWidthPx;
  if (!(bodyHeightPx > 0) || !(lineWidthPx >= 0) || !(statureCm > 0)) return null;
  return lineWidthPx * statureCm / bodyHeightPx;
}

/**
 * Measures any free A-B segment on the visible photo mesh with one known-height
 * scale. X and Y are converted to image pixels before the Euclidean distance is
 * calculated, so diagonal rulers are not distorted by the image aspect ratio.
 * This is deliberately a flat-photo estimate, not a camera/depth correction.
 */
export function heightScaledDistanceCm(
  a: Point2,
  b: Point2,
  imageWidthPx: number,
  imageHeightPx: number,
  bodyBounds: OutlineBounds,
  statureCm: number,
): number | null {
  const bodyHeightPx = (bodyBounds.maximumY - bodyBounds.minimumY) * imageHeightPx;
  const distancePx = Math.hypot(
    (b[0] - a[0]) * imageWidthPx,
    (b[1] - a[1]) * imageHeightPx,
  );
  if (!(bodyHeightPx > 0) || !(distancePx >= 0) || !(statureCm > 0)) return null;
  return distancePx * statureCm / bodyHeightPx;
}

export function polylinePerimeter(points: readonly Point2[]): number | null {
  if (points.length < 3) return null;
  let perimeter = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [ax, ay] = points[index]!;
    const [bx, by] = points[(index + 1) % points.length]!;
    perimeter += Math.hypot(bx - ax, by - ay);
  }
  return Number.isFinite(perimeter) ? perimeter : null;
}

/**
 * Transfers one real WEAR cross-section to a new front breadth.
 * The learned/recorded depth is kept fixed; only the left-right coordinates
 * of the real closed contour are scaled. The result is calibrated so the
 * untouched contour exactly equals the independent recorded WEAR tape value.
 */
export function transferClosedContourCircumferenceCm(input: {
  normalizedContour: readonly Point2[];
  sourceBreadthCm: number;
  sourceDepthCm: number;
  targetBreadthCm: number;
  recordedCircumferenceCm: number;
}): number | null {
  const {
    normalizedContour,
    sourceBreadthCm,
    sourceDepthCm,
    targetBreadthCm,
    recordedCircumferenceCm,
  } = input;
  if (
    normalizedContour.length < 3
    || !(sourceBreadthCm > 0)
    || !(sourceDepthCm > 0)
    || !(targetBreadthCm > 0)
    || !(recordedCircumferenceCm > 0)
  ) return null;

  const source = normalizedContour.map(([x, depth]) => (
    [x * sourceBreadthCm / 2, depth * sourceDepthCm / 2] as Point2
  ));
  const target = normalizedContour.map(([x, depth]) => (
    [x * targetBreadthCm / 2, depth * sourceDepthCm / 2] as Point2
  ));
  const sourcePerimeter = polylinePerimeter(source);
  const targetPerimeter = polylinePerimeter(target);
  if (!(sourcePerimeter && targetPerimeter)) return null;
  return targetPerimeter * recordedCircumferenceCm / sourcePerimeter;
}

export function signedDifferenceLabel(valueCm: number): string {
  if (Math.abs(valueCm) < 0.05) return "same visible width";
  return valueCm > 0
    ? `${valueCm.toFixed(1)} cm wider`
    : `${Math.abs(valueCm).toFixed(1)} cm smaller`;
}

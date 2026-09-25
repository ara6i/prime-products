export interface CrossSectionPoint {
  x: number;
  depth: number;
}

/**
 * Walk the closed 32-point cross-section after scaling it to a physical width
 * and depth. This mirrors the perimeter calculation used by the WEAR training
 * code; it is a geometry diagnostic, not the model's direct tape head.
 */
export function crossSectionPerimeterCm(
  shape: CrossSectionPoint[],
  widthCm: number | null | undefined,
  depthCm: number | null | undefined,
): number | null {
  if (
    shape.length < 3
    || typeof widthCm !== "number"
    || !Number.isFinite(widthCm)
    || widthCm <= 0
    || typeof depthCm !== "number"
    || !Number.isFinite(depthCm)
    || depthCm <= 0
    || shape.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.depth))
  ) return null;

  const xs = shape.map((point) => point.x);
  const depths = shape.map((point) => point.depth);
  const xCenter = (Math.max(...xs) + Math.min(...xs)) / 2;
  const depthCenter = (Math.max(...depths) + Math.min(...depths)) / 2;
  const xHalf = Math.max((Math.max(...xs) - Math.min(...xs)) / 2, 0.0001);
  const depthHalf = Math.max((Math.max(...depths) - Math.min(...depths)) / 2, 0.0001);
  const points = shape.map((point) => ({
    x: ((point.x - xCenter) / xHalf) * widthCm / 2,
    depth: ((point.depth - depthCenter) / depthHalf) * depthCm / 2,
  }));

  return points.reduce((perimeter, point, index) => {
    const next = points[(index + 1) % points.length]!;
    return perimeter + Math.hypot(next.x - point.x, next.depth - point.depth);
  }, 0);
}

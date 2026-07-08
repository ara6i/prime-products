/**
 * Mask-width scanning: given the segmentation mask and a Y-coord (px),
 * find the actual outer-silhouette width of the body at that row.
 *
 * This is the "real" hip / waist width — the breadth visible in the
 * photo, INCLUDING soft tissue. Replaces the bone-to-bone hip landmark
 * with the real flesh-to-flesh width.
 */

/**
 * Scan the mask at a single Y row. Returns the leftmost and rightmost
 * pixel with body content (mask value >= threshold). Returns null if
 * the row is empty.
 */
export function scanMaskRowWidth(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  y: number,
  threshold = 64,
): { leftX: number; rightX: number; widthPx: number } | null {
  const row = Math.max(0, Math.min(height - 1, Math.round(y)));
  let leftX = -1;
  let rightX = -1;
  const rowStart = row * width;
  for (let x = 0; x < width; x++) {
    if (mask[rowStart + x]! >= threshold) {
      if (leftX === -1) leftX = x;
      rightX = x;
    }
  }
  if (leftX === -1) return null;
  return { leftX, rightX, widthPx: rightX - leftX + 1 };
}

/**
 * Find the CENTRAL BODY width at a given row by walking outward from a
 * known body-center x (e.g. the hip-midpoint landmark). Stops at the
 * first horizontal gap of `gapTolerance` consecutive empty pixels.
 *
 * Naturally excludes arms / hands hanging next to the torso — at hip
 * level the arm pixels are separated from the body silhouette by
 * a thin gap, and this walker won't cross it.
 */
/** Rectangular region (in mask pixel coords) to treat as "not body". */
export interface ExclusionBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function isInsideAnyBox(x: number, y: number, boxes: ExclusionBox[]): boolean {
  for (const b of boxes) {
    if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return true;
  }
  return false;
}

export function scanMaskBodyAtRow(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  y: number,
  centerX: number,
  threshold = 64,
  gapTolerance = 4,
  exclusions: ExclusionBox[] = [],
): { leftX: number; rightX: number; widthPx: number } | null {
  const row = Math.max(0, Math.min(height - 1, Math.round(y)));
  const rowStart = row * width;
  const cx = Math.max(0, Math.min(width - 1, Math.round(centerX)));

  const isBody = (x: number): boolean => {
    if (isInsideAnyBox(x, row, exclusions)) return false;
    return mask[rowStart + x]! >= threshold;
  };

  // Seed: find a body pixel near center.
  let seed = -1;
  for (let dx = 0; dx <= 10; dx++) {
    const r = Math.min(width - 1, cx + dx);
    if (isBody(r)) { seed = r; break; }
    const l = Math.max(0, cx - dx);
    if (isBody(l)) { seed = l; break; }
  }
  if (seed < 0) return null;

  // Walk left
  let leftX = seed;
  let gap = 0;
  for (let x = seed - 1; x >= 0; x--) {
    if (isBody(x)) {
      leftX = x;
      gap = 0;
    } else {
      gap++;
      if (gap >= gapTolerance) break;
    }
  }

  // Walk right
  let rightX = seed;
  gap = 0;
  for (let x = seed + 1; x < width; x++) {
    if (isBody(x)) {
      rightX = x;
      gap = 0;
    } else {
      gap++;
      if (gap >= gapTolerance) break;
    }
  }

  return { leftX, rightX, widthPx: rightX - leftX + 1 };
}

/**
 * Median width across a small Y band (±bandPx rows) centered on (centerX, centerY).
 * Uses `scanMaskBodyAtRow` so arms are excluded. Returns null if no row hits body.
 */
export function scanMaskBandWidth(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  centerY: number,
  centerX: number,
  bandPx = 3,
  threshold = 64,
  exclusions: ExclusionBox[] = [],
): { widthPx: number; centerX: number; leftX: number; rightX: number } | null {
  const rows: Array<{ widthPx: number; centerX: number; leftX: number; rightX: number }> = [];
  for (let dy = -bandPx; dy <= bandPx; dy++) {
    const row = scanMaskBodyAtRow(mask, width, height, centerY + dy, centerX, threshold, 4, exclusions);
    if (row) {
      rows.push({
        widthPx: row.widthPx,
        centerX: (row.leftX + row.rightX) / 2,
        leftX: row.leftX,
        rightX: row.rightX,
      });
    }
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => a.widthPx - b.widthPx);
  return rows[Math.floor(rows.length / 2)]!;
}

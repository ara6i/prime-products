export const SDK_WEAR_PARTS = ["neck", "chest", "underbust", "waist", "hips"] as const;
export type SdkWearPart = typeof SDK_WEAR_PARTS[number];

export interface SdkWearRow {
  frontWidthCm: number;
  depthCm: number;
  heightFractionFromFeet: number | null;
  heightFromFloorCm?: number | null;
  yNorm: number;
  leftXNorm?: number;
  rightXNorm?: number;
  contour32Normalized: number[][];
  geometryValid: boolean;
  quality: { rawSliceClosed: boolean; perimeterConsistentWithTape: boolean };
}

export interface SdkWearPerson {
  scanId: string;
  subjectId: string;
  role: "test";
  viewId: "front-50";
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
  imagePath: string | null;
  renderSize: number;
  rows: Partial<Record<SdkWearPart, SdkWearRow | null>>;
  landmarks2d: Record<string, { visible?: boolean; x?: number; y?: number }>;
  segments: Record<string, unknown>;
  revealOnly: {
    measurementsCm: Record<string, number>;
    extractedStandingCm: Record<string, number>;
    rowTapeAndCircumferenceCm: Record<string, { tape: number | null; geometryPerimeter: number | null }>;
  };
}

export interface SdkWearQuery {
  outline: number[][];
  rowWidths: Partial<Record<SdkWearPart, { frontWidthCm: number; heightFractionFromFeet: number }>>;
  heightCm?: number;
}

export interface SdkWearIndex {
  schemaVersion: string;
  status: string;
  releaseApproved: false;
  canonicalView: "front-50";
  personCount: number;
  expectedPersonCount: 448;
  ranking: { profile: { gender: "exact"; heightCm: number; weightKg: number }; frontWidthMaxDifferenceCm: number };
  parts: SdkWearPart[];
  people: SdkWearPerson[];
}

export interface SdkWearMatch {
  rank: number;
  scanId: string;
  subjectId: string;
  imageUrl: string | null;
  heightCm: number;
  weightKg: number;
  profileWindow: { heightCm: number | null; weightKg: number | null; tier: "strict" | "expanded" };
  frontWidthCm: number;
  frontWidthDifferenceCm: number;
  shapeDifference: number;
  mesh: { outline: number[][]; triangles: number[][]; vertices: number[][] };
  revealOnly: SdkWearPerson["revealOnly"];
}

export interface SdkWearPartResult {
  part: SdkWearPart;
  status: "matched" | "estimated" | "unavailable";
  selected: SdkWearMatch | null;
  candidates: SdkWearMatch[];
  estimate: { circumferenceCm: number | null; confidence: "low" | "medium"; reason: string } | null;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.POSITIVE_INFINITY;
}

function resampleClosed(points: number[][], count = 64): number[][] {
  if (points.length < 3) return points;
  const distances = [0];
  for (let i = 1; i <= points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i % points.length]!;
    distances.push(distances[i - 1]! + Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!));
  }
  const perimeter = distances[distances.length - 1]!;
  if (!(perimeter > 0)) return points;
  return Array.from({ length: count }, (_, index) => {
    const target = perimeter * index / count;
    let segment = 0;
    while (segment + 1 < distances.length && distances[segment + 1]! < target) segment += 1;
    const start = points[segment % points.length]!;
    const end = points[(segment + 1) % points.length]!;
    const span = distances[segment + 1]! - distances[segment]! || 1;
    const t = (target - distances[segment]!) / span;
    return [start[0]! + (end[0]! - start[0]!) * t, start[1]! + (end[1]! - start[1]!) * t];
  });
}

export function fixedTopologyMesh(outline: number[][], count = 64) {
  const ring = resampleClosed(outline, count);
  const centre = ring.reduce(([x, y], [px, py]) => [x + px / count, y + py / count], [0, 0]);
  return {
    outline: ring,
    triangles: ring.map((_, index) => [count, index, (index + 1) % count]),
    vertices: [...ring, centre],
  };
}

function candidateShape(row: SdkWearRow | null | undefined) {
  return row?.contour32Normalized?.length ? row.contour32Normalized : [];
}

function bodyOutline(person: SdkWearPerson) {
  const points: Array<[number, number]> = [
    [0.47, 0.04], [0.53, 0.04], [0.57, 0.10], [0.58, 0.15],
  ];
  const profile: Array<[number, SdkWearPart | null, number]> = [
    [0.18, null, 0.22], [0.22, "chest", 0.25], [0.30, "chest", 0.23],
    [0.38, "underbust", 0.20], [0.46, "waist", 0.18], [0.52, "hips", 0.25],
    [0.60, "hips", 0.27], [0.72, null, 0.18], [0.88, null, 0.12], [0.98, null, 0.10],
  ];
  for (const [y, part, fallback] of profile) {
    const row = part ? person.rows[part] : null;
    const width = row?.frontWidthCm && person.heightCm > 0 ? Math.min(0.58, row.frontWidthCm / person.heightCm) : fallback;
    points.push([0.5 + width / 2, y]);
  }
  const right = [...points].reverse();
  return [...points, ...right.map(([x, y]) => [1 - x, y] as [number, number])];
}

/** Browser-safe front mesh derived only from the WEAR visible-row geometry. */
export function visibleWearMesh(person: SdkWearPerson) {
  return fixedTopologyMesh(bodyOutline(person));
}

function shapeDifference(query: SdkWearQuery, candidate: SdkWearPerson, _part: SdkWearPart, queryWidth: number, row: SdkWearRow) {
  // The query is a front silhouette, while the WEAR row is a cross-section.
  // Do not compare those different point sets as if they were the same contour.
  // Compare their known-height width ratios instead; this keeps shape ranking
  // honest and leaves tape/circumference strictly outside the rank.
  const qWidthRatio = queryWidth / Math.max(1, query.heightCm ?? candidate.heightCm);
  const wearWidthRatio = row.frontWidthCm / Math.max(1, candidate.heightCm);
  const contourSignal = candidateShape(row).length ? 0 : 0.25;
  return contourSignal + Math.abs(qWidthRatio - wearWidthRatio) * 10;
}

function makeMatch(person: SdkWearPerson, part: SdkWearPart, query: SdkWearQuery, width: number, tier: SdkWearMatch["profileWindow"]) : SdkWearMatch | null {
  const row = person.rows[part];
  if (!row || !finite(row.frontWidthCm)) return null;
  const difference = Math.abs(width - row.frontWidthCm);
  return {
    rank: 0,
    scanId: person.scanId,
    subjectId: person.subjectId,
    imageUrl: `/api/try-on-test/sizing-lab/sdk-wear/asset?scanId=${encodeURIComponent(person.scanId)}`,
    heightCm: person.heightCm,
    weightKg: person.weightKg,
    profileWindow: tier,
    frontWidthCm: row.frontWidthCm,
    frontWidthDifferenceCm: difference,
    shapeDifference: shapeDifference(query, person, part, width, row),
    mesh: fixedTopologyMesh(bodyOutline(person)),
    revealOnly: person.revealOnly,
  };
}

export function rankSdkWearPart(index: SdkWearIndex, query: SdkWearQuery, part: SdkWearPart, heightCm: number, weightKg: number, gender: string, options: { strictOnly?: boolean; excludeScanId?: string } = {}): SdkWearPartResult {
  const width = query.rowWidths[part]?.frontWidthCm;
  if (!finite(width)) return { part, status: "unavailable", selected: null, candidates: [], estimate: null };
  const windows = options.strictOnly ? [1] : [1, 2, 3, 5, 8, 12, 20, Number.POSITIVE_INFINITY];
  let matches: SdkWearMatch[] = [];
  let usedWindow = 1;
  let passedWidthGate = false;
  for (const window of windows) {
    const profile = index.people.filter((person) => person.scanId !== options.excludeScanId && person.gender === gender && Math.abs(person.heightCm - heightCm) <= window && Math.abs(person.weightKg - weightKg) <= window);
    const ranked = profile.map((person) => makeMatch(person, part, query, width, { heightCm: Number.isFinite(window) ? window : null, weightKg: Number.isFinite(window) ? window : null, tier: window === 1 ? "strict" : "expanded" })).filter((item): item is SdkWearMatch => Boolean(item));
    const gated = ranked.filter((item) => item.frontWidthDifferenceCm <= 1.27);
    if (options.strictOnly && !gated.length) {
      matches = [];
    } else {
      matches = (gated.length ? gated : ranked).sort((a, b) => (a.shapeDifference + a.frontWidthDifferenceCm) - (b.shapeDifference + b.frontWidthDifferenceCm)).slice(0, 5);
    }
    if (gated.length) { usedWindow = window; passedWidthGate = true; break; }
    if (matches.length) usedWindow = window;
  }
  if (!matches.length) return { part, status: "unavailable", selected: null, candidates: [], estimate: null };
  matches.forEach((item, index) => { item.rank = index + 1; item.profileWindow = { ...item.profileWindow, heightCm: Number.isFinite(usedWindow) ? usedWindow : null, weightKg: Number.isFinite(usedWindow) ? usedWindow : null }; });
  const selected = matches[0]!;
  const revealValues = matches
    .map((item) => item.revealOnly.rowTapeAndCircumferenceCm[part]?.tape)
    .filter((value): value is number => finite(value));
  const weightedCircumference = revealValues.length
    ? revealValues.reduce((sum, value, index) => sum + value / (index + 1), 0) / revealValues.reduce((sum, _value, index) => sum + 1 / (index + 1), 0)
    : null;
  return {
    part,
    status: passedWidthGate ? "matched" : "estimated",
    selected,
    candidates: matches,
    estimate: weightedCircumference != null ? { circumferenceCm: weightedCircumference, confidence: passedWidthGate ? "medium" : "low", reason: passedWidthGate ? "Nearest held-out WEAR front meshes; tape revealed only after ranking." : "No candidate passed the ½-inch front-width gate; this is a low-confidence weighted estimate after ranking." } : null,
  };
}

export function buildQueryFromMask(mask: Uint8ClampedArray | null, maskWidth: number, maskHeight: number, heightCm: number): SdkWearQuery | null {
  if (!mask || maskWidth < 2 || maskHeight < 2 || !(heightCm > 0)) return null;
  const left: number[][] = [];
  const right: number[][] = [];
  for (let y = 0; y < maskHeight; y += 2) {
    let min = maskWidth;
    let max = -1;
    for (let x = 0; x < maskWidth; x += 1) {
      if ((mask[y * maskWidth + x] ?? 0) > 32) { min = Math.min(min, x); max = Math.max(max, x); }
    }
    if (max >= min) {
      left.push([min / maskWidth, y / maskHeight]);
      right.push([max / maskWidth, y / maskHeight]);
    }
  }
  if (left.length < 8) return null;
  const outline = [...left, ...right.reverse()];
  const top = Math.min(...outline.map((point) => point[1]!));
  const bottom = Math.max(...outline.map((point) => point[1]!));
  const span = bottom - top || 1;
  const normalized = outline.map(([x, y]) => [x, (y - top) / span]);
  const bodyMinX = Math.min(...left.map(([x]) => x));
  const bodyMaxX = Math.max(...right.map(([x]) => x));
  const bodyCentreX = (bodyMinX + bodyMaxX) / 2;
  const centralRunWidth = (targetY: number) => {
    const targetPx = Math.round(targetY * maskHeight);
    const rows: number[] = [];
    for (let y = Math.max(0, targetPx - Math.round(maskHeight * 0.012)); y <= Math.min(maskHeight - 1, targetPx + Math.round(maskHeight * 0.012)); y += 1) {
      const runs: Array<[number, number]> = [];
      let start = -1;
      for (let x = 0; x <= maskWidth; x += 1) {
        const on = x < maskWidth && (mask[y * maskWidth + x] ?? 0) > 32;
        if (on && start < 0) start = x;
        if ((!on || x === maskWidth) && start >= 0) {
          const end = x - 1;
          if (end - start >= 3) runs.push([start, end]);
          start = -1;
        }
      }
      if (runs.length) {
        const central = runs.find(([a, b]) => bodyCentreX >= a / maskWidth && bodyCentreX <= b / maskWidth)
          ?? runs.sort((a, b) => Math.abs((a[0] + a[1]) / 2 - bodyCentreX * maskWidth) - Math.abs((b[0] + b[1]) / 2 - bodyCentreX * maskWidth))[0];
        if (central) rows.push(central[1] - central[0] + 1);
      }
    }
    if (!rows.length) return null;
    rows.sort((a, b) => a - b);
    return rows[Math.floor(rows.length / 2)]!;
  };
  const widthAt = (fraction: number) => {
    const target = 1 - fraction;
    const widthPx = centralRunWidth(target * span + top);
    if (widthPx == null) return null;
    return { frontWidthCm: (widthPx / maskWidth) * heightCm, heightFractionFromFeet: fraction };
  };
  const rowWidths: SdkWearQuery["rowWidths"] = {};
  const fractions: Record<SdkWearPart, number> = { neck: 0.83, chest: 0.69, underbust: 0.62, waist: 0.54, hips: 0.42 };
  for (const part of SDK_WEAR_PARTS) {
    const row = widthAt(fractions[part]);
    if (row) rowWidths[part] = row;
  }
  return { outline: normalized, rowWidths, heightCm };
}

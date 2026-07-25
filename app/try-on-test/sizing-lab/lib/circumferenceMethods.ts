export type CircumferenceMethod =
  | "ramanujan-1"
  | "ramanujan-2"
  | "exact-ellipse"
  | "rms-ellipse"
  | "capsule"
  | "superellipse"
  | "meta-3d-contour"
  | "real-3d-contour";

export interface CircumferenceMethodOption {
  value: CircumferenceMethod;
  label: string;
  simpleDescription: string;
  formula: string;
  available: boolean;
}

export const CIRCUMFERENCE_METHOD_OPTIONS: CircumferenceMethodOption[] = [
  {
    value: "ramanujan-1",
    label: "Ramanujan I · current",
    simpleDescription: "A very accurate shortcut for an oval. This is the current Test Lab answer.",
    formula: "C ≈ π[3(a+b) − √((3a+b)(a+3b))]",
    available: true,
  },
  {
    value: "ramanujan-2",
    label: "Ramanujan II",
    simpleDescription: "A second, slightly more accurate oval shortcut.",
    formula: "h=(a−b)²/(a+b)²; C ≈ π(a+b)[1+3h/(10+√(4−3h))]",
    available: true,
  },
  {
    value: "exact-ellipse",
    label: "Exact ellipse integral",
    simpleDescription: "Numerically walks around the oval. Exact for an ellipse, not automatically exact for a body.",
    formula: "C = 4∫₀^(π/2) √(a²sin²θ+b²cos²θ) dθ",
    available: true,
  },
  {
    value: "rms-ellipse",
    label: "RMS ellipse",
    simpleDescription: "A simpler oval estimate. It is less accurate and is here for comparison.",
    formula: "C ≈ 2π√((a²+b²)/2)",
    available: true,
  },
  {
    value: "capsule",
    label: "Capsule / stadium",
    simpleDescription: "Pretends the body slice has two round ends and two straighter sides.",
    formula: "C = π·minor diameter + 2(major diameter − minor diameter)",
    available: true,
  },
  {
    value: "superellipse",
    label: "Superellipse · adjustable",
    simpleDescription: "Lets you make the slice more pinched, oval, or boxy with the n control.",
    formula: "x=a·cos^(2/n)θ; y=b·sin^(2/n)θ; walk around the curve",
    available: true,
  },
  {
    value: "meta-3d-contour",
    label: "Meta 3D contour · no ellipse",
    simpleDescription: "Keeps Meta's predicted cross-section outline, resizes it to the chosen breadth and depth, then walks around it.",
    formula: "Scale Meta slice X to breadth and Z to depth; C = sum of distances around the scaled slice",
    available: true,
  },
  {
    value: "real-3d-contour",
    label: "Real 3D contour · needs 3D scan",
    simpleDescription: "Would walk around the person’s real 3D body slice. A front photo plus width/depth is not enough.",
    formula: "C = sum of distances around the measured 3D cross-section",
    available: false,
  },
];

function validDiameters(widthCm: number, depthCm: number): boolean {
  return Number.isFinite(widthCm) && Number.isFinite(depthCm) && widthCm > 0 && depthCm > 0;
}

function ellipseAxes(widthCm: number, depthCm: number): { a: number; b: number } {
  return { a: widthCm / 2, b: depthCm / 2 };
}

function ramanujanOne(widthCm: number, depthCm: number): number {
  const { a, b } = ellipseAxes(widthCm, depthCm);
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

function ramanujanTwo(widthCm: number, depthCm: number): number {
  const { a, b } = ellipseAxes(widthCm, depthCm);
  const h = ((a - b) ** 2) / ((a + b) ** 2);
  return Math.PI * (a + b) * (1 + ((3 * h) / (10 + Math.sqrt(4 - 3 * h))));
}

function exactEllipse(widthCm: number, depthCm: number): number {
  const { a, b } = ellipseAxes(widthCm, depthCm);
  const steps = 1024;
  const interval = (Math.PI / 2) / steps;
  let weightedSum = 0;
  for (let index = 0; index <= steps; index += 1) {
    const theta = index * interval;
    const value = Math.sqrt((a * Math.sin(theta)) ** 2 + (b * Math.cos(theta)) ** 2);
    const weight = index === 0 || index === steps ? 1 : index % 2 === 0 ? 2 : 4;
    weightedSum += weight * value;
  }
  return 4 * ((interval / 3) * weightedSum);
}

function rmsEllipse(widthCm: number, depthCm: number): number {
  const { a, b } = ellipseAxes(widthCm, depthCm);
  return 2 * Math.PI * Math.sqrt(((a * a) + (b * b)) / 2);
}

function capsule(widthCm: number, depthCm: number): number {
  const majorDiameter = Math.max(widthCm, depthCm);
  const minorDiameter = Math.min(widthCm, depthCm);
  return Math.PI * minorDiameter + 2 * (majorDiameter - minorDiameter);
}

function superellipse(widthCm: number, depthCm: number, exponent: number): number {
  const { a, b } = ellipseAxes(widthCm, depthCm);
  const safeExponent = Math.min(4, Math.max(1.2, exponent));
  const steps = 1024;
  let quarterLength = 0;
  let previousX = a;
  let previousY = 0;
  for (let index = 1; index <= steps; index += 1) {
    const theta = (Math.PI / 2) * (index / steps);
    const x = a * Math.pow(Math.max(0, Math.cos(theta)), 2 / safeExponent);
    const y = b * Math.pow(Math.max(0, Math.sin(theta)), 2 / safeExponent);
    quarterLength += Math.hypot(x - previousX, y - previousY);
    previousX = x;
    previousY = y;
  }
  return quarterLength * 4;
}

export type BodyContourPoint = readonly [number, number, number];

/**
 * Walk around a predicted horizontal 3D slice after independently locking its
 * image-horizontal span to breadthCm and its camera-depth span to depthCm.
 * The slice shape stays Meta-owned; no ellipse or superellipse is introduced.
 */
export function calculateScaledBodyContourCircumferenceCm(
  points: readonly BodyContourPoint[],
  breadthCm: number,
  depthCm: number,
): number | null {
  if (!validDiameters(breadthCm, depthCm) || points.length < 8) return null;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    if (!point || point.length !== 3 || point.some((value) => !Number.isFinite(value))) return null;
    minX = Math.min(minX, point[0]);
    maxX = Math.max(maxX, point[0]);
    minZ = Math.min(minZ, point[2]);
    maxZ = Math.max(maxZ, point[2]);
  }
  const sourceBreadthM = maxX - minX;
  const sourceDepthM = maxZ - minZ;
  if (sourceBreadthM <= 1e-6 || sourceDepthM <= 1e-6) return null;
  const breadthScale = (breadthCm / 100) / sourceBreadthM;
  const depthScale = (depthCm / 100) / sourceDepthM;
  let perimeterM = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    perimeterM += Math.hypot(
      (next[0] - current[0]) * breadthScale,
      (next[2] - current[2]) * depthScale,
    );
  }
  const perimeterCm = perimeterM * 100;
  return Number.isFinite(perimeterCm) && perimeterCm > 0 ? perimeterCm : null;
}

export function calculateCircumferenceCm(
  widthCm: number,
  depthCm: number,
  method: CircumferenceMethod,
  superellipseExponent = 2.5,
): number | null {
  if (!validDiameters(widthCm, depthCm)) return null;
  switch (method) {
    case "ramanujan-1":
      return ramanujanOne(widthCm, depthCm);
    case "ramanujan-2":
      return ramanujanTwo(widthCm, depthCm);
    case "exact-ellipse":
      return exactEllipse(widthCm, depthCm);
    case "rms-ellipse":
      return rmsEllipse(widthCm, depthCm);
    case "capsule":
      return capsule(widthCm, depthCm);
    case "superellipse":
      return superellipse(widthCm, depthCm, superellipseExponent);
    case "meta-3d-contour":
      return null;
    case "real-3d-contour":
      return null;
  }
}

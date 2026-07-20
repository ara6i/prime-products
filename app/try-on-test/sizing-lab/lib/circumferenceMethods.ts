export type CircumferenceMethod =
  | "ramanujan-1"
  | "ramanujan-2"
  | "exact-ellipse"
  | "rms-ellipse"
  | "capsule"
  | "superellipse"
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
    case "real-3d-contour":
      return null;
  }
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { estimateDepthRatioFromTable, type DepthRatioTableRowKind } from "../app/try-on-test/sizing-lab/lib/depthRatioTable";
import { ellipseCircumferenceCm } from "../app/try-on-test/sizing-lab/lib/waistFormula";

interface HoldoutCase {
  name: string;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  heightCm: number;
  weightKg: number;
  gender: "male" | "female";
  rows: Array<{ name: DepthRatioTableRowKind; y: number; leftX: number; rightX: number }>;
  knownRatios: Record<DepthRatioTableRowKind, number>;
  targetCircumferencesCm: Record<DepthRatioTableRowKind, number>;
}

interface AppleResponse {
  ok?: boolean;
  error?: string;
  result?: {
    geometryQuality: "pass" | "check" | "reject";
    bodyDistanceM: number;
    rows: Array<{ name: DepthRatioTableRowKind; frontPlaneWidthCm: number }>;
  };
}

const root = process.cwd();
const cases: HoldoutCase[] = [
  {
    name: "Shane 2",
    imagePath: path.join(root, "public/try-on-test/sizing-lab/shane-2-height-proof.jpg"),
    imageWidth: 4032,
    imageHeight: 3024,
    heightCm: 170.18,
    weightKg: 73.48,
    gender: "male",
    rows: [
      { name: "waist", y: 1358, leftX: 1919, rightX: 2238 },
      { name: "trouserWaist", y: 1576, leftX: 1896, rightX: 2235 },
      { name: "hips", y: 1698, leftX: 1886, rightX: 2247 },
    ],
    knownRatios: { waist: 0.724, trouserWaist: 0.682, hips: 0.641 },
    targetCircumferencesCm: { waist: 93.98, trouserWaist: 97.79, hips: 102 },
  },
  {
    name: "Nadia",
    imagePath: path.join(root, "public/try-on-test/sizing-lab/nadia-front.jpg"),
    imageWidth: 3072,
    imageHeight: 4080,
    heightCm: 163,
    weightKg: 62,
    gender: "female",
    rows: [
      { name: "waist", y: 1733, leftX: 1406, rightX: 1901 },
      { name: "trouserWaist", y: 1959, leftX: 1333, rightX: 1989 },
      { name: "hips", y: 2185, leftX: 1311, rightX: 2001 },
    ],
    knownRatios: { waist: 0.681, trouserWaist: 0.706, hips: 0.683 },
    targetCircumferencesCm: { waist: 73, trouserWaist: 98, hips: 102 },
  },
];

async function main() {
  for (const holdout of cases) {
    const image = await readFile(holdout.imagePath);
    const response = await fetch("http://localhost:3000/api/try-on-test/sizing-lab/apple-vision-pose3d", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      imageDataUrl: `data:image/jpeg;base64,${image.toString("base64")}`,
      imageWidth: holdout.imageWidth,
      imageHeight: holdout.imageHeight,
      heightCm: holdout.heightCm,
      rows: holdout.rows,
    }),
    });
    const apple = await response.json() as AppleResponse;
    if (!response.ok || !apple.ok || !apple.result) {
      throw new Error(`${holdout.name}: ${apple.error ?? `Apple API ${response.status}`}`);
    }

    const widths = Object.fromEntries(apple.result.rows.map((row) => [row.name, row.frontPlaneWidthCm])) as Record<DepthRatioTableRowKind, number>;
    const bmi = holdout.weightKg / ((holdout.heightCm / 100) ** 2);
    console.log(`\n${holdout.name} · Apple geometry ${apple.result.geometryQuality} · distance ${apple.result.bodyDistanceM.toFixed(2)} m · BMI ${bmi.toFixed(1)}`);
    for (const row of holdout.rows) {
      const formula = estimateDepthRatioFromTable({
      rowKind: row.name,
      gender: holdout.gender,
      bmi,
      heightCm: holdout.heightCm,
      waistWidthCm: widths.waist,
      trouserWidthCm: widths.trouserWaist,
      hipWidthCm: widths.hips,
      });
      if (!formula) throw new Error(`${holdout.name} ${row.name}: formula unavailable`);
      const known = holdout.knownRatios[row.name];
      const delta = formula.depthRatio - known;
      const insideP90 = Math.abs(delta) <= formula.validationP90AbsError;
      const circumference = ellipseCircumferenceCm(widths[row.name], widths[row.name] * formula.depthRatio);
      const circumferenceDelta = circumference - holdout.targetCircumferencesCm[row.name];
      console.log(
        `${row.name.padEnd(14)} width ${widths[row.name].toFixed(2).padStart(6)} cm · ratio ${formula.depthRatio.toFixed(3)} vs ${known.toFixed(3)} (${delta >= 0 ? "+" : ""}${delta.toFixed(3)}) · circumference ${circumference.toFixed(2)} cm (${circumferenceDelta >= 0 ? "+" : ""}${circumferenceDelta.toFixed(2)} cm) · ${insideP90 ? "inside validation P90" : "outside validation P90"}`,
      );
    }
  }
}

void main();

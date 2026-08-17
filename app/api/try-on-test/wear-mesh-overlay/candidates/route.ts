import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEIGHT_TOLERANCE_CM = 1;
const WEIGHT_TOLERANCE_KG = 1;

interface ModelRecord {
  scanId: string;
  gender: string;
  heightCm: number;
  weightKg: number;
  color: string;
  file: string;
  measurementsCm: {
    chest: number;
    waist: number;
    hips: number;
  };
}

interface ManifestRecord {
  scan_id: string;
  gender: string;
  height_cm: number;
  weight_kg: number;
  measurements_mm?: Record<string, number | null>;
}

const COLORS = ["#38bdf8", "#f59e0b", "#a78bfa", "#22c55e", "#fb7185", "#2dd4bf", "#f97316", "#60a5fa"];
let corpusPromise: Promise<ModelRecord[]> | null = null;

function measurementCm(record: ManifestRecord, key: string) {
  const value = record.measurements_mm?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value / 10 : 0;
}

async function loadCorpus() {
  if (corpusPromise) return corpusPromise;
  corpusPromise = readFile(path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ".local-ml",
    "wear3d-v6-audit",
    "source-manifest-standing-a.jsonl",
  ), "utf8").then((source) => source.split("\n")
    .filter(Boolean)
    .map((line, index) => {
      const record = JSON.parse(line) as ManifestRecord;
      return {
        scanId: record.scan_id,
        gender: record.gender,
        heightCm: record.height_cm,
        weightKg: record.weight_kg,
        color: COLORS[index % COLORS.length]!,
        file: "",
        measurementsCm: {
          chest: measurementCm(record, "chest_circumference_mm"),
          waist: measurementCm(record, "waist_circumference_mm"),
          hips: measurementCm(record, "hip_circumference_mm"),
        },
      } satisfies ModelRecord;
    }));
  return corpusPromise;
}

function finiteNumber(value: string | null) {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json(
      { error: "WEAR mesh matching is available only inside Test Lab." },
      { status: 403 },
    );
  }

  const parameters = new URL(request.url).searchParams;
  const heightCm = finiteNumber(parameters.get("heightCm"));
  const weightKg = finiteNumber(parameters.get("weightKg"));
  const gender = parameters.get("gender")?.trim().toLowerCase();
  if (heightCm == null || weightKg == null || !["female", "male"].includes(gender ?? "")) {
    return NextResponse.json(
      { error: "The strict search requires gender, heightCm, and weightKg." },
      { status: 400 },
    );
  }

  try {
    const models = await loadCorpus();
    const epsilon = 1e-9;
    const matches = models
      .filter((model) => model.gender.toLowerCase() === gender)
      .map((model) => ({
        ...model,
        heightDeltaCm: Math.round(Math.abs(model.heightCm - heightCm) * 1000) / 1000,
        weightDeltaKg: Math.round(Math.abs(model.weightKg - weightKg) * 1000) / 1000,
      }))
      .filter(
        (model) => model.heightDeltaCm <= HEIGHT_TOLERANCE_CM + epsilon
          && model.weightDeltaKg <= WEIGHT_TOLERANCE_KG + epsilon,
      )
      .sort((left, right) => {
        const leftDistance = Math.hypot(left.heightDeltaCm, left.weightDeltaKg);
        const rightDistance = Math.hypot(right.heightDeltaCm, right.weightDeltaKg);
        return leftDistance - rightDistance || left.scanId.localeCompare(right.scanId);
      })
      .map((model, indexPosition) => ({ ...model, cohortPosition: indexPosition + 1 }));

    return NextResponse.json({
      query: { gender, heightCm, weightKg },
      rules: {
        sameGender: true,
        maximumHeightDifferenceCm: HEIGHT_TOLERANCE_CM,
        maximumWeightDifferenceKg: WEIGHT_TOLERANCE_KG,
        inclusive: true,
        fallbackOutsideLimits: false,
      },
      eligibleCount: matches.length,
      matches,
      ordering: "profile distance only; choose and inspect overlays before transferring any measurement",
      shapeRankingComplete: false,
      measurementsUsage: "revealed for Test Lab display only after strict filtering",
    });
  } catch {
    return NextResponse.json(
      { error: "The private WEAR mesh cohort is unavailable on this machine." },
      { status: 404 },
    );
  }
}

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESULT_FILE = path.join(
  ".local-ml",
  "checkpoints",
  "wear3d-fresh-v1-full-runpod-h100-20260824",
  "sealed-448-result.json",
);
const EXPECTED_PEOPLE = 448;
const EXPECTED_MODEL_SHA256 = "7c503d50f3b0d0d207806e55214ced4d6031c59975ace3d9dfe0d20c39b90000";

interface SealedPerson {
  scanId: string;
  subjectId: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
  imagePath: string;
  meanTapeErrorCm: number | null;
  meanLineErrorPixels: number | null;
  rows: Record<string, unknown>;
  ratios: Record<string, unknown>;
  camera: Record<string, unknown>;
}

interface SealedResult {
  schemaVersion: "wear3d-fresh-sealed-448-result/v1";
  state: "completed";
  completedAt: string;
  finalTest: true;
  weightsFrozenBeforeLabelsOpened: true;
  usedForTraining: false;
  usedForValidationSelection: false;
  tuningAfterThisResultForbidden: true;
  model: {
    version: string;
    sha256: string;
    targetCount: number;
    bestEpoch: number;
    bestValidationLoss: number;
  };
  cohort: {
    people: number;
    records: number;
    uniquePeople: number;
    role: "test-only";
    views: Record<string, number>;
    women: number;
    men: number;
    indexSha256: string;
  };
  input: Record<string, unknown>;
  timing: Record<string, unknown>;
  metrics: Record<string, unknown>;
  gates: Record<string, unknown>;
  people: SealedPerson[];
}

let cachedResult: { modifiedMs: number; result: SealedResult } | null = null;

function resultPath() {
  return path.join(/* turbopackIgnore: true */ process.cwd(), RESULT_FILE);
}

async function loadResult() {
  const filePath = resultPath();
  const fileStat = await stat(filePath);
  if (cachedResult?.modifiedMs === fileStat.mtimeMs) return cachedResult.result;
  const result = JSON.parse(await readFile(filePath, "utf8")) as SealedResult;
  if (
    result.schemaVersion !== "wear3d-fresh-sealed-448-result/v1"
    || result.state !== "completed"
    || result.finalTest !== true
    || result.weightsFrozenBeforeLabelsOpened !== true
    || result.usedForTraining !== false
    || result.usedForValidationSelection !== false
    || result.tuningAfterThisResultForbidden !== true
    || result.model?.sha256 !== EXPECTED_MODEL_SHA256
    || result.cohort?.people !== EXPECTED_PEOPLE
    || result.cohort?.uniquePeople !== EXPECTED_PEOPLE
    || result.people?.length !== EXPECTED_PEOPLE
    || new Set(result.people.map((person) => person.scanId)).size !== EXPECTED_PEOPLE
  ) {
    throw new Error("The fresh 448-person final-test result failed its integrity contract.");
  }
  cachedResult = { modifiedMs: fileStat.mtimeMs, result };
  return result;
}

function imageUrl(scanId: string) {
  return `/api/try-on-test/sizing-lab/sdk-wear/asset?scanId=${encodeURIComponent(scanId)}`;
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({
      ok: false,
      error: "The fresh 448-person result is available only inside Test Lab.",
    }, { status: 403 });
  }
  try {
    const result = await loadResult();
    const scanId = new URL(request.url).searchParams.get("scanId")?.trim();
    if (scanId) {
      const person = result.people.find((candidate) => candidate.scanId === scanId);
      if (!person) {
        return NextResponse.json({ ok: false, error: "Choose a valid fresh 448 test person." }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        finalTest: true,
        model: result.model,
        person: { ...person, imageUrl: imageUrl(person.scanId), imagePath: undefined },
      }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({
      ok: true,
      finalTest: true,
      completedAt: result.completedAt,
      weightsFrozenBeforeLabelsOpened: result.weightsFrozenBeforeLabelsOpened,
      usedForTraining: result.usedForTraining,
      usedForValidationSelection: result.usedForValidationSelection,
      tuningAfterThisResultForbidden: result.tuningAfterThisResultForbidden,
      model: result.model,
      cohort: result.cohort,
      input: result.input,
      timing: result.timing,
      metrics: result.metrics,
      gates: result.gates,
      people: result.people.map((person) => ({
        scanId: person.scanId,
        subjectId: person.subjectId,
        gender: person.gender,
        heightCm: person.heightCm,
        weightKg: person.weightKg,
        meanTapeErrorCm: person.meanTapeErrorCm,
        meanLineErrorPixels: person.meanLineErrorPixels,
        imageUrl: imageUrl(person.scanId),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "The fresh 448-person result is unavailable.",
    }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }
}

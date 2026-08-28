import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import type {
  V8BenchmarkPersonDetail,
  V8BenchmarkPersonRow,
  V8BenchmarkRowName,
  V8BenchmarkSummary,
} from "@/app/try-on-test/wear-photo-test/v8Benchmark448Types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESULT_FILE = path.join(
  ".local-ml",
  "checkpoints",
  "wear3d-waist-hips-v8-fresh-mask-h100-20260825",
  "benchmark-448-result.json",
);
const EXPECTED_PEOPLE = 448;
const EXPECTED_MODEL_SHA256 = "ccb8f0071eaab12ae07f28bcc65e771973653d680d0a4ac24f789226cbf02e68";
const ROWS: V8BenchmarkRowName[] = ["waist", "hips"];

interface BenchmarkFile extends Omit<V8BenchmarkSummary, "ok" | "benchmark" | "people"> {
  schemaVersion: "wear3d-waist-hips-v2-benchmark-448/v1";
  state: "completed";
  people: Array<Omit<V8BenchmarkPersonDetail, "imageUrl" | "meanTapeErrorCm" | "meanLineErrorPixels" | "worstTapeErrorCm"> & {
    imagePath: string;
  }>;
}

let cachedResult: { modifiedMs: number; result: BenchmarkFile } | null = null;

function resultPath() {
  return path.join(/* turbopackIgnore: true */ process.cwd(), RESULT_FILE);
}

function imageUrl(scanId: string) {
  return `/api/try-on-test/sizing-lab/sdk-wear/asset?scanId=${encodeURIComponent(scanId)}`;
}

function finiteValues(values: Array<number | undefined>) {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function personScores(rows: Record<V8BenchmarkRowName, V8BenchmarkPersonRow>) {
  const tapeErrors = finiteValues(ROWS.map((row) => rows[row]?.errors.tapeCm));
  const lineErrors = finiteValues(ROWS.map((row) => rows[row]?.errors.edgePixels));
  return {
    meanTapeErrorCm: mean(tapeErrors),
    meanLineErrorPixels: mean(lineErrors),
    worstTapeErrorCm: tapeErrors.length ? Math.max(...tapeErrors) : null,
  };
}

function listPerson(person: BenchmarkFile["people"][number]) {
  return {
    scanId: person.scanId,
    subjectId: person.subjectId,
    gender: person.gender,
    heightCm: person.heightCm,
    weightKg: person.weightKg,
    ...personScores(person.rows),
    imageUrl: imageUrl(person.scanId),
  };
}

async function loadResult() {
  const filePath = resultPath();
  const fileStat = await stat(filePath);
  if (cachedResult?.modifiedMs === fileStat.mtimeMs) return cachedResult.result;
  const result = JSON.parse(await readFile(filePath, "utf8")) as BenchmarkFile;
  if (
    result.schemaVersion !== "wear3d-waist-hips-v2-benchmark-448/v1"
    || result.state !== "completed"
    || result.model?.sha256 !== EXPECTED_MODEL_SHA256
    || result.cohort?.people !== EXPECTED_PEOPLE
    || result.cohort?.uniquePeople !== EXPECTED_PEOPLE
    || result.cohort?.role !== "test-only"
    || result.cohort?.views?.["front-50"] !== EXPECTED_PEOPLE
    || result.people?.length !== EXPECTED_PEOPLE
    || new Set(result.people.map((person) => person.scanId)).size !== EXPECTED_PEOPLE
    || result.provenance?.usedForTraining !== false
    || result.provenance?.usedForValidationSelection !== false
    || result.provenance?.previousWeightsUsed !== false
    || result.provenance?.teacherInputsReadOnly !== true
  ) {
    throw new Error("The V8 448-person benchmark failed its integrity contract.");
  }
  cachedResult = { modifiedMs: fileStat.mtimeMs, result };
  return result;
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({
      ok: false,
      error: "The V8 448-person benchmark is available only inside Test Lab.",
    }, { status: 403 });
  }

  try {
    const result = await loadResult();
    const scanId = new URL(request.url).searchParams.get("scanId")?.trim();
    if (scanId) {
      const person = result.people.find((candidate) => candidate.scanId === scanId);
      if (!person) {
        return NextResponse.json({ ok: false, error: "Choose a valid V8 benchmark person." }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        benchmark: true,
        model: result.model,
        person: {
          scanId: person.scanId,
          subjectId: person.subjectId,
          gender: person.gender,
          heightCm: person.heightCm,
          weightKg: person.weightKg,
          rows: person.rows,
          ...personScores(person.rows),
          imageUrl: imageUrl(person.scanId),
        },
      }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({
      ok: true,
      benchmark: true,
      completedAt: result.completedAt,
      model: result.model,
      cohort: result.cohort,
      input: result.input,
      timing: result.timing,
      metrics: result.metrics,
      gates: result.gates,
      provenance: result.provenance,
      people: result.people.map(listPerson),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "The V8 448-person benchmark is unavailable.",
    }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }
}

import { createReadStream } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import readline from "node:readline";
import { promisify } from "node:util";
import { SDK_WEAR_PARTS, type SdkWearPart } from "@/app/try-on-test/sizing-lab/sdkWearMatcher";
import type {
  WearArtifactReference,
  WearFrontCandidate,
  WearFrontRing,
  WearFrontWinner,
  WearRankingMode,
  WearSideCatalogPerson,
} from "@/app/try-on-test/wear-side-selector/types";

const execFileAsync = promisify(execFile);
const BUCKET = process.env.PRIMESTYLE_WEAR_S3_BUCKET ?? "primestyleai-wear3d-921049726279-us-east-1";
const REGION = process.env.PRIMESTYLE_WEAR_S3_REGION ?? "us-east-1";
const MANIFEST_KEY = process.env.PRIMESTYLE_WEAR_SIDE_MANIFEST_KEY
  ?? "processed/wear3d-standing-a-v3-20260813/render-manifest-all.jsonl";
export const WEAR_CATALOG_VERSION = "wear3d-standing-a-v3-20260813";
export const WEAR_ARTIFACT_VERSION = process.env.PRIMESTYLE_WEAR_ARTIFACT_VERSION
  ?? "wear-blender-canonical-v1-20260908";
const EXPECTED_STANDING_PEOPLE = 4_326;
const MAX_TOLERANCE = 10;
export const FRONT_TORSO_PARTS: readonly SdkWearPart[] = ["chest", "underbust", "waist", "hips"];
export const WEAR_RANKING_MODES: readonly WearRankingMode[] = ["overall", ...SDK_WEAR_PARTS];

type ManifestRow = {
  accepted?: boolean;
  mesh_width_mm?: unknown;
  visible_width_mm?: unknown;
  mesh_depth_mm?: unknown;
  mesh_section_perimeter_mm?: unknown;
  tape_calibrated_depth_mm?: unknown;
  slice_reconstructed?: unknown;
  slice_height_mm?: unknown;
  measurement_circumference_mm?: unknown;
};

type ManifestRecord = {
  scan_id?: unknown;
  subject_id?: unknown;
  gender?: unknown;
  height_cm?: unknown;
  weight_kg?: unknown;
  role?: unknown;
  rows?: Partial<Record<SdkWearPart, ManifestRow>>;
};

export interface WearSideQuery {
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
  rowWidths: Partial<Record<SdkWearPart, number>>;
  excludeScanId: string;
}

interface RankedInternal {
  person: WearSideCatalogPerson;
  publicCandidate: WearFrontCandidate;
}

export interface WearRankedResult {
  rings: WearFrontRing[];
  globalFrontWinner: WearFrontWinner | null;
  candidateCount: number;
  overallRows: SdkWearPart[];
  internalById: Map<string, WearSideCatalogPerson>;
}

let catalogPromise: Promise<WearSideCatalogPerson[]> | null = null;

function finite(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function awsArguments(source: string, destination: string) {
  const args = ["s3", "cp", source, destination, "--region", REGION, "--only-show-errors"];
  const profile = process.env.PRIMESTYLE_WEAR_S3_PROFILE;
  if (profile) args.push("--profile", profile);
  return args;
}

async function cachedManifestPath() {
  const filePath = path.join(process.cwd(), ".local-ml", "wear-side-selector", "source", "render-manifest-all.jsonl");
  if (await exists(filePath)) return filePath;
  await mkdir(path.dirname(filePath), { recursive: true });
  await execFileAsync("aws", awsArguments(`s3://${BUCKET}/${MANIFEST_KEY}`, filePath), {
    cwd: process.cwd(),
    timeout: 240_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (!(await exists(filePath))) throw new Error("The full WEAR standing manifest was not downloaded from S3.");
  return filePath;
}

function compactRow(row: ManifestRow | undefined, heightCm: number) {
  if (!row?.accepted) return null;
  const widthMm = finite(row.mesh_width_mm) ?? finite(row.visible_width_mm);
  const depthMm = finite(row.mesh_depth_mm);
  const heightMm = finite(row.slice_height_mm);
  if (widthMm == null || depthMm == null || widthMm <= 0 || depthMm <= 0) return null;
  const tapeMm = finite(row.measurement_circumference_mm);
  const meshPerimeterMm = finite(row.mesh_section_perimeter_mm);
  const tapeCalibratedDepthMm = finite(row.tape_calibrated_depth_mm);
  return {
    frontWidthCm: Math.round(widthMm * 1000) / 10_000,
    sideDepthCm: Math.round(depthMm * 1000) / 10_000,
    meshPerimeterCm: meshPerimeterMm == null ? null : Math.round(meshPerimeterMm * 1000) / 10_000,
    tapeCalibratedDepthCm: tapeCalibratedDepthMm == null ? null : Math.round(tapeCalibratedDepthMm * 1000) / 10_000,
    sliceReconstructed: row.slice_reconstructed === true,
    heightFractionFromFeet: heightMm == null ? null : Math.round((heightMm / 10 / heightCm) * 1_000_000) / 1_000_000,
    tapeCm: tapeMm == null ? null : Math.round(tapeMm * 100) / 1000,
  };
}

async function readCatalog() {
  const manifestPath = await cachedManifestPath();
  const input = createReadStream(manifestPath, { encoding: "utf8" });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  const people: WearSideCatalogPerson[] = [];
  const seen = new Set<string>();
  let sourceRecordCount = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    sourceRecordCount += 1;
    const record = JSON.parse(line) as ManifestRecord;
    const scanId = typeof record.scan_id === "string" ? record.scan_id : "";
    const gender = record.gender === "female" || record.gender === "male" ? record.gender : null;
    const heightCm = finite(record.height_cm);
    const weightKg = finite(record.weight_kg);
    const role = record.role === "train" || record.role === "validation" || record.role === "test" ? record.role : null;
    if (!/^(?:IT|NA|NL)-\d{4}-A$/.test(scanId) || seen.has(scanId) || !gender || heightCm == null || weightKg == null || !role) continue;
    const rows = Object.fromEntries(SDK_WEAR_PARTS.flatMap((part) => {
      const row = compactRow(record.rows?.[part], heightCm);
      return row ? [[part, row]] : [];
    })) as WearSideCatalogPerson["rows"];
    if (Object.keys(rows).length < 2) continue;
    people.push({
      scanId,
      subjectId: typeof record.subject_id === "string" ? record.subject_id : scanId.replace(/-A$/, ""),
      gender,
      heightCm,
      weightKg,
      role,
      rows,
    });
    seen.add(scanId);
  }
  if (sourceRecordCount !== EXPECTED_STANDING_PEOPLE) {
    throw new Error(`Full WEAR manifest integrity check failed: ${sourceRecordCount} of ${EXPECTED_STANDING_PEOPLE} standing records.`);
  }
  return people.sort((left, right) => left.scanId.localeCompare(right.scanId));
}

export function loadWearSideCatalog() {
  if (!catalogPromise) {
    catalogPromise = readCatalog().catch((error) => {
      catalogPromise = null;
      throw error;
    });
  }
  return catalogPromise;
}

export async function wearSideCatalogPerson(scanId: string) {
  if (!/^(?:IT|NA|NL)-\d{4}-A$/.test(scanId)) return null;
  return (await loadWearSideCatalog()).find((person) => person.scanId === scanId) ?? null;
}

export function artifactReference(scanId: string, availableViews: readonly ("front" | "side")[]): WearArtifactReference {
  return {
    scanId,
    catalogVersion: WEAR_CATALOG_VERSION,
    artifactVersion: WEAR_ARTIFACT_VERSION,
    availableViews,
  };
}

function exactRing(heightDifferenceCm: number, weightDifferenceKg: number) {
  const profileDifference = Math.max(Math.abs(heightDifferenceCm), Math.abs(weightDifferenceKg));
  if (profileDifference > MAX_TOLERANCE + 1e-9) return null;
  return Math.max(1, Math.ceil(profileDifference - 1e-9));
}

function compareOverall(left: WearFrontCandidate, right: WearFrontCandidate) {
  return (left.overallMeanGapCm ?? Number.POSITIVE_INFINITY) - (right.overallMeanGapCm ?? Number.POSITIVE_INFINITY)
    || (left.overallWorstGapCm ?? Number.POSITIVE_INFINITY) - (right.overallWorstGapCm ?? Number.POSITIVE_INFINITY)
    || left.profileDifference - right.profileDifference
    || left.scanId.localeCompare(right.scanId);
}

function comparePart(part: SdkWearPart) {
  return (left: WearFrontCandidate, right: WearFrontCandidate) => (
    (left.frontDifferenceCmByPart[part] ?? Number.POSITIVE_INFINITY)
      - (right.frontDifferenceCmByPart[part] ?? Number.POSITIVE_INFINITY)
    || left.profileDifference - right.profileDifference
    || left.scanId.localeCompare(right.scanId)
  );
}

export function rankWearSideCandidates(
  people: readonly WearSideCatalogPerson[],
  query: WearSideQuery,
): WearRankedResult {
  const overallRows = FRONT_TORSO_PARTS.filter((part) => Number.isFinite(query.rowWidths[part]));
  if (overallRows.length < 2) throw new Error("Overall torso ranking requires at least two input torso rows.");

  // This phase reads only profile and front width. Side depth and recorded tape stay server-side.
  const ranked: RankedInternal[] = people.flatMap((person) => {
    if (person.gender !== query.gender || person.scanId === query.excludeScanId) return [];
    const heightDifferenceCm = person.heightCm - query.heightCm;
    const weightDifferenceKg = person.weightKg - query.weightKg;
    const ring = exactRing(heightDifferenceCm, weightDifferenceKg);
    if (ring == null) return [];
    const frontWidthCmByPart = Object.fromEntries(SDK_WEAR_PARTS.flatMap((part) => {
      const width = person.rows[part]?.frontWidthCm;
      return typeof width === "number" ? [[part, width]] : [];
    })) as Partial<Record<SdkWearPart, number>>;
    const frontDifferenceCmByPart = Object.fromEntries(SDK_WEAR_PARTS.flatMap((part) => {
      const inputWidth = query.rowWidths[part];
      const candidateWidth = frontWidthCmByPart[part];
      return typeof inputWidth === "number" && typeof candidateWidth === "number"
        ? [[part, Math.abs(candidateWidth - inputWidth)]]
        : [];
    })) as Partial<Record<SdkWearPart, number>>;
    const hasFixedOverallRows = overallRows.every((part) => typeof frontDifferenceCmByPart[part] === "number");
    const overallDifferences = hasFixedOverallRows ? overallRows.map((part) => frontDifferenceCmByPart[part]!) : [];
    const profileDifference = Math.max(Math.abs(heightDifferenceCm), Math.abs(weightDifferenceKg));
    return [{
      person,
      publicCandidate: {
        scanId: person.scanId,
        gender: person.gender,
        heightCm: person.heightCm,
        weightKg: person.weightKg,
        ring,
        heightDifferenceCm,
        weightDifferenceKg,
        profileDifference,
        frontWidthCmByPart,
        frontDifferenceCmByPart,
        overallMeanGapCm: overallDifferences.length
          ? overallDifferences.reduce((sum, value) => sum + value, 0) / overallDifferences.length
          : null,
        overallWorstGapCm: overallDifferences.length ? Math.max(...overallDifferences) : null,
        overallRowsCompared: overallDifferences.length,
        overallCoverage: `${overallDifferences.length}/${overallRows.length}`,
        artifact: artifactReference(person.scanId, ["front", "side"]),
      },
    }];
  });

  const rings = Array.from({ length: MAX_TOLERANCE }, (_, index): WearFrontRing => {
    const ring = index + 1;
    const ringCandidates = ranked
      .filter((candidate) => candidate.publicCandidate.ring === ring)
      .map((candidate) => candidate.publicCandidate);
    const leaderboards = Object.fromEntries(WEAR_RANKING_MODES.map((mode) => {
      const ordered = mode === "overall"
        ? ringCandidates.filter((candidate) => candidate.overallMeanGapCm != null).sort(compareOverall)
        : ringCandidates.filter((candidate) => candidate.frontDifferenceCmByPart[mode] != null).sort(comparePart(mode));
      return [mode, { mode, candidateIds: ordered.map((candidate) => candidate.scanId) }];
    })) as WearFrontRing["leaderboards"];
    return {
      ring,
      label: ring === 1 ? "0 to ±1" : `>${ring - 1} to ±${ring}`,
      lowerExclusive: ring - 1,
      upperInclusive: ring,
      candidateCount: ringCandidates.length,
      candidates: ringCandidates.sort((left, right) => left.scanId.localeCompare(right.scanId)),
      leaderboards,
    };
  });

  const ringWinners = rings.flatMap((ring) => {
    const winnerId = ring.leaderboards.overall.candidateIds[0];
    const candidate = ring.candidates.find((entry) => entry.scanId === winnerId);
    return candidate ? [candidate] : [];
  }).sort(compareOverall);
  const best = ringWinners[0] ?? null;
  const globalFrontWinner = best && best.overallMeanGapCm != null && best.overallWorstGapCm != null
    ? {
      scanId: best.scanId,
      ring: best.ring,
      overallMeanGapCm: best.overallMeanGapCm,
      overallWorstGapCm: best.overallWorstGapCm,
      overallRowsCompared: best.overallRowsCompared,
    }
    : null;

  return {
    rings,
    globalFrontWinner,
    candidateCount: ranked.length,
    overallRows,
    internalById: new Map(ranked.map(({ person }) => [person.scanId, person])),
  };
}

export async function loadWearInput(scanId: string) {
  const person = await wearSideCatalogPerson(scanId);
  if (!person) return null;
  return {
    person,
    rowWidths: Object.fromEntries(SDK_WEAR_PARTS.flatMap((part) => {
      const row = person.rows[part];
      return row ? [[part, row.frontWidthCm]] : [];
    })) as Partial<Record<SdkWearPart, number>>,
  };
}

export const wearSideCatalogMetadata = {
  sourceRecordCount: EXPECTED_STANDING_PEOPLE,
  source: `s3://${BUCKET}/${MANIFEST_KEY}`,
  rawMeshSource: `s3://${BUCKET}/raw/WEAR3DDATA/**/*.ply.gz`,
  exclusions: [
    "NL-5419-A: missing gender, height, and weight profile metadata.",
    "NL-6289-A: missing gender, height, and weight profile metadata.",
  ],
};

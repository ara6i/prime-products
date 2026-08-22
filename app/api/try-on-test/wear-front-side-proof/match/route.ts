import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { pairsFromFlat, type Point2 } from "@/app/try-on-test/wear-mesh-overlay/geometry";
import {
  buildWaistBandDescriptor,
  locateVisibleWaistFraction,
  rankBodyPartShapeCandidates,
  resampleClosedContour,
  resizeClosedShapePerimeter,
  type GeometryOnlyWaistHipCandidate,
} from "@/app/try-on-test/wear-mesh-overlay/waistMatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEIGHT_TOLERANCE_CM = 1;
const WEIGHT_TOLERANCE_KG = 1;
const FRONT_WIDTH_MAX_ERROR_CM = 2.54 / 2;
const ADAPTIVE_PROFILE_WINDOWS_CM = [1, 2, 3, 5, 8, 12, 20, Infinity] as const;
const SAFE_PHOTO_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const CROSS_SECTION_PARTS = ["neck", "chest", "underbust", "waist", "hips"] as const;
type CrossSectionPart = (typeof CROSS_SECTION_PARTS)[number];
const LANDMARK_LENGTH_PARTS = [
  "shoulders",
  "left_upper_arm",
  "right_upper_arm",
  "left_forearm",
  "right_forearm",
  "left_sleeve",
  "right_sleeve",
  "left_thigh",
  "right_thigh",
  "left_lower_leg",
  "right_lower_leg",
  "left_foot",
  "right_foot",
  "left_inseam",
  "right_inseam",
] as const;
type LandmarkLengthPart = (typeof LANDMARK_LENGTH_PARTS)[number];

const LANDMARK_PART_DEFINITIONS: Record<Exclude<LandmarkLengthPart, "left_inseam" | "right_inseam">, {
  label: string;
  userPoints: string[];
  source: string;
}> = {
  shoulders: { label: "Shoulders", userPoints: ["left-acromion", "right-acromion"], source: "Acromion to Acromion" },
  left_upper_arm: { label: "Left upper arm", userPoints: ["left-acromion", "left-olecranon"], source: "Acromion to elbow" },
  right_upper_arm: { label: "Right upper arm", userPoints: ["right-acromion", "right-olecranon"], source: "Acromion to elbow" },
  left_forearm: { label: "Left forearm", userPoints: ["left-olecranon", "left-wrist"], source: "Elbow to wrist" },
  right_forearm: { label: "Right forearm", userPoints: ["right-olecranon", "right-wrist"], source: "Elbow to wrist" },
  left_sleeve: { label: "Left sleeve", userPoints: ["left-acromion", "left-olecranon", "left-wrist"], source: "Acromion to wrist via elbow" },
  right_sleeve: { label: "Right sleeve", userPoints: ["right-acromion", "right-olecranon", "right-wrist"], source: "Acromion to wrist via elbow" },
  left_thigh: { label: "Left thigh", userPoints: ["left-hip", "left-knee"], source: "Hip to knee pose proxy" },
  right_thigh: { label: "Right thigh", userPoints: ["right-hip", "right-knee"], source: "Hip to knee pose proxy" },
  left_lower_leg: { label: "Left lower leg", userPoints: ["left-knee", "left-ankle"], source: "Knee to ankle" },
  right_lower_leg: { label: "Right lower leg", userPoints: ["right-knee", "right-ankle"], source: "Knee to ankle" },
  left_foot: { label: "Left foot", userPoints: ["left-heel", "left-big-toe-tip"], source: "Heel to toe" },
  right_foot: { label: "Right foot", userPoints: ["right-heel", "right-big-toe-tip"], source: "Heel to toe" },
};

interface MeshAsset {
  imageSize: [number, number];
  outline: number[];
}
interface SearchRow {
  breadthCm: number;
  depthCm: number;
  breadthBodyHeight: number;
  depthBodyHeight: number;
  heightFractionFromFeet: number | null;
  contour32Normalized: Point2[];
  quality: {
    eligibleForCircumferenceShapeMatch: boolean;
    rawSliceClosed: boolean;
    perimeterConsistentWithTape: boolean;
    perimeterDeltaPercent: number | null;
    maximumAllowedDeltaPercent: number;
  };
  revealedAfterRank: { recordedTapeCm: number | null };
}
interface IndexedLandmarkSegment {
  lengthBodyHeight: number;
  source: string;
}
interface SearchPerson extends GeometryOnlyWaistHipCandidate {
  subjectId: string;
  gender: string;
  rows: { waist: SearchRow; hips: SearchRow } & Partial<Record<CrossSectionPart, SearchRow>>;
  landmarkSegments?: Partial<Record<LandmarkLengthPart, IndexedLandmarkSegment>>;
}
interface ShapeSearchIndex {
  personCount: number;
  rejectedCount: number;
  parts?: Partial<Record<CrossSectionPart, { candidateCount: number; mode: string }>>;
  landmarkParts?: Partial<Record<LandmarkLengthPart, { candidateCount: number; mode: string }>>;
  people: SearchPerson[];
}
interface UserPosePoint {
  name: string;
  xPx: number;
  yPx: number;
  score: number;
}
interface UserPoseAsset { mhr70?: UserPosePoint[] }
interface RigidCameraSolution {
  canonicalBreadthCm: number;
  canonicalDepthCm: number;
  circumferenceCm: number;
  frontReprojectionCm: number;
  sideReprojectionCm: number;
  solverResidualCm: number;
}
interface RigidCameraReport {
  status: "accepted-angle-only" | "rejected";
  method: string;
  inputs: Record<string, string | number | boolean | string[]>;
  transform: {
    type: string;
    localVertexWarpUsed: boolean;
    nonUniformStretchUsed: boolean;
    meshVerticesModified: boolean;
  };
  angleValidation: {
    status: "accepted" | "rejected";
    gate: string;
    maximumReferenceYawStdDeg: number;
    frontSideOrthogonalityErrorDeg: number;
    views: Record<string, {
      medianYawDeg: number;
      yawStandardDeviationDeg: number;
      yawMinDeg: number;
      yawMaxDeg: number;
      medianRollDeg: number;
      medianHeldOutLandmarkResidualCm: number;
    }>;
  };
  shapeValidation: { status: "rejected"; reason: string };
  measurementEffect: {
    observedFrontSpanCmEquivalent: number;
    observedSideSpanCmEquivalent: number;
    frontYawDeg: number;
    sideYawDeg: number;
    candidateSolutions: Record<string, RigidCameraSolution>;
  };
  honestBoundary: string;
}

function median(values: readonly number[]) {
  const sorted = [...values].filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function rankCrossSectionCandidates(
  people: readonly SearchPerson[],
  part: CrossSectionPart,
  breadthCm: number,
  depthCm: number,
) {
  const compared = people.flatMap((person) => {
    const row = person.rows[part];
    if (!row || !Number.isFinite(row.breadthCm) || !Number.isFinite(row.depthCm)) return [];
    const frontErrorCm = Math.abs(breadthCm - row.breadthCm);
    const sideErrorCm = Math.abs(depthCm - row.depthCm);
    const combinedErrorCm = (frontErrorCm + sideErrorCm) / 2;
    return [{
      scanId: person.scanId,
      heightCm: person.heightCm,
      weightKg: person.weightKg,
      frontErrorCm,
      sideErrorCm,
      combinedErrorCm,
      wearSourceBreadthCm: row.breadthCm,
      wearSourceDepthCm: row.depthCm,
      wearTapeCmRevealedAfterRank: row.revealedAfterRank.recordedTapeCm,
      shape32: resampleClosedContour(row.contour32Normalized, 32),
      rowHeightFractionFromFeet: row.heightFractionFromFeet,
    }];
  }).sort((left, right) => (
    left.combinedErrorCm - right.combinedErrorCm
    || Math.max(left.frontErrorCm, left.sideErrorCm) - Math.max(right.frontErrorCm, right.sideErrorCm)
    || left.scanId.localeCompare(right.scanId)
  ));
  const scale = Math.max(0.25, compared[0]?.combinedErrorCm ?? 1);
  const rawWeights = compared.map((candidate) => Math.exp(-candidate.combinedErrorCm / scale));
  const totalWeight = rawWeights.reduce((sum, value) => sum + value, 0) || 1;
  return compared.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    similarityWeight: rawWeights[index]! / totalWeight,
  }));
}

function pointDistance(points: readonly UserPosePoint[]) {
  return points.slice(1).reduce((length, point, index) => {
    const previous = points[index]!;
    return length + Math.hypot(point.xPx - previous.xPx, point.yPx - previous.yPx);
  }, 0);
}

async function loadUserLandmarkLengths(
  overlayRoot: string,
  photoId: string,
  mesh: MeshAsset,
  statureCm: number,
) {
  const posePath = path.join(overlayRoot, "anatomical", `${photoId}-sapiens2.json`);
  const pose = JSON.parse(await readFile(posePath, "utf8")) as UserPoseAsset;
  const points = new Map((pose.mhr70 ?? []).flatMap((point) => (
    Number.isFinite(point.xPx) && Number.isFinite(point.yPx) && Number.isFinite(point.score) && point.score >= .45
      ? [[point.name, point] as const]
      : []
  )));
  const outline = pairsFromFlat(mesh.outline);
  const vertical = outline.map(([, y]) => y);
  const bodyHeightPx = Math.max(...vertical) - Math.min(...vertical);
  if (!(bodyHeightPx > 0) || !(statureCm > 0)) throw new Error("The user mesh has no valid known-height scale.");
  const cmPerPixel = statureCm / bodyHeightPx;
  const result: Partial<Record<LandmarkLengthPart, {
    label: string;
    source: string;
    lengthCm: number;
    lengthBodyHeight: number;
  }>> = {};
  for (const [part, definition] of Object.entries(LANDMARK_PART_DEFINITIONS) as Array<[
    Exclude<LandmarkLengthPart, "left_inseam" | "right_inseam">,
    (typeof LANDMARK_PART_DEFINITIONS)[Exclude<LandmarkLengthPart, "left_inseam" | "right_inseam">]
  ]>) {
    const segment = definition.userPoints.map((name) => points.get(name));
    if (segment.some((point) => point == null)) continue;
    const lengthPx = pointDistance(segment as UserPosePoint[]);
    if (!(lengthPx > 0)) continue;
    result[part] = {
      label: definition.label,
      source: `User Sapiens2 points: ${definition.source}`,
      lengthCm: lengthPx * cmPerPixel,
      lengthBodyHeight: lengthPx / bodyHeightPx,
    };
  }
  return result;
}

function rankLandmarkLengthCandidates(
  people: readonly SearchPerson[],
  part: LandmarkLengthPart,
  userLengthCm: number,
) {
  const compared = people.flatMap((person) => {
    const source = person.landmarkSegments?.[part];
    if (!source || !Number.isFinite(source.lengthBodyHeight) || source.lengthBodyHeight <= 0) return [];
    const wearLengthCm = source.lengthBodyHeight * person.heightCm;
    const differenceCm = userLengthCm - wearLengthCm;
    return [{
      scanId: person.scanId,
      heightCm: person.heightCm,
      weightKg: person.weightKg,
      userLengthCm,
      wearLengthCm,
      differenceCm,
      absoluteErrorCm: Math.abs(differenceCm),
      source: source.source,
    }];
  }).sort((left, right) => (
    left.absoluteErrorCm - right.absoluteErrorCm
    || left.scanId.localeCompare(right.scanId)
  ));
  const scale = Math.max(.25, compared[0]?.absoluteErrorCm ?? 1);
  const weights = compared.map((candidate) => Math.exp(-candidate.absoluteErrorCm / scale));
  const totalWeight = weights.reduce((total, value) => total + value, 0) || 1;
  return compared.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    similarityWeight: weights[index]! / totalWeight,
  }));
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "The front + side proof is available only inside Test Lab." }, { status: 403 });
  }
  const parameters = new URL(request.url).searchParams;
  const heightCm = Number(parameters.get("heightCm") ?? 168);
  const weightKg = Number(parameters.get("weightKg") ?? 70.8);
  const gender = parameters.get("gender")?.toLowerCase() ?? "female";
  const searchMode = parameters.get("cohort") === "all" ? "all" : "strict";
  const photoId = parameters.get("photoId") ?? "delaram";
  const sidePhotoId = parameters.get("sidePhotoId") ?? "delaram-side";
  // This is an experimental correction to the user's visible front/side
  // measurements only. WEAR source geometry is never modified.
  const requestedSubjectAdjustmentCm = Number(parameters.get("subjectAdjustmentCm") ?? 0);
  const subjectAdjustmentCm = Number.isFinite(requestedSubjectAdjustmentCm)
    ? Math.max(-10, Math.min(0, requestedSubjectAdjustmentCm))
    : 0;
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || !["female", "male"].includes(gender)) {
    return NextResponse.json({ error: "Valid heightCm, weightKg, and gender are required." }, { status: 400 });
  }
  if (!SAFE_PHOTO_ID.test(photoId) || !SAFE_PHOTO_ID.test(sidePhotoId)) {
    return NextResponse.json({ error: "Choose a supported private front and side photo pair." }, { status: 400 });
  }

  const overlayRoot = path.join(process.cwd(), ".local-ml", "wear-mesh-overlay");
  try {
    const cameraFitPromise: Promise<RigidCameraReport | null> = photoId === "delaram" && sidePhotoId === "delaram-side"
      ? readFile(path.join(overlayRoot, "rigid-camera-fit", "index.json"), "utf8").then((value) => JSON.parse(value) as RigidCameraReport)
      : Promise.resolve(null);
    const [frontMesh, sideMesh, cameraFit, shapeIndex] = await Promise.all([
      readFile(path.join(overlayRoot, "blender-mesh", `${photoId}.json`), "utf8").then((value) => JSON.parse(value) as MeshAsset),
      readFile(path.join(overlayRoot, "blender-mesh", `${sidePhotoId}.json`), "utf8").then((value) => JSON.parse(value) as MeshAsset),
      cameraFitPromise,
      readFile(path.join(overlayRoot, "all-wear-shape-index.json"), "utf8").then((value) => JSON.parse(value) as ShapeSearchIndex),
    ]);
    const userLandmarkLengths: Partial<Record<LandmarkLengthPart, {
      label: string;
      source: string;
      lengthCm: number;
      lengthBodyHeight: number;
    }>> = await loadUserLandmarkLengths(overlayRoot, photoId, frontMesh, heightCm)
      .catch(() => ({}));
    const frontSpace = {
      points: pairsFromFlat(frontMesh.outline),
      statureCm: heightCm,
      yAxis: "down" as const,
      imageWidthPx: frontMesh.imageSize[0],
      imageHeightPx: frontMesh.imageSize[1],
    };
    const waistFraction = locateVisibleWaistFraction(frontSpace);
    if (waistFraction == null) throw new Error("The front visible waist could not be located.");
    const queryFront = buildWaistBandDescriptor(frontSpace, waistFraction);
    const sideSpace = {
      points: pairsFromFlat(sideMesh.outline),
      statureCm: heightCm,
      yAxis: "down" as const,
      imageWidthPx: sideMesh.imageSize[0],
      imageHeightPx: sideMesh.imageSize[1],
    };
    const querySide = buildWaistBandDescriptor(sideSpace, waistFraction);
    if (!queryFront || !querySide) throw new Error("Five front and side waist slices could not be measured.");
    const allGenderPeople = shapeIndex.people.filter((person) => person.gender === gender);
    const eligiblePeople = allGenderPeople.filter((person) => (
      searchMode === "all"
      || (
        Math.abs(person.heightCm - heightCm) <= HEIGHT_TOLERANCE_CM + 1e-9
        && Math.abs(person.weightKg - weightKg) <= WEIGHT_TOLERANCE_KG + 1e-9
      )
    ));
    if (!allGenderPeople.length) throw new Error("No WEAR bodies have valid geometry for this gender.");
    const hipReliablePeople = eligiblePeople.filter((person) => (
      person.rows.hips.quality?.eligibleForCircumferenceShapeMatch === true
    ));
    const hasUsableRow = (person: SearchPerson, row: "waist" | "hips") => {
      const geometry = person.rows[row];
      return Number.isFinite(geometry.breadthCm)
        && Number.isFinite(geometry.depthCm)
        && geometry.contour32Normalized.length >= 3;
    };
    const hipComparisonPeople = eligiblePeople.filter((person) => hasUsableRow(person, "hips"));
    const allUsableWaistPeople = allGenderPeople.filter((person) => hasUsableRow(person, "waist"));
    const allUsableHipPeople = allGenderPeople.filter((person) => hasUsableRow(person, "hips"));
    if (!allUsableWaistPeople.length || !allUsableHipPeople.length) {
      throw new Error("No WEAR bodies have usable waist and hip geometry.");
    }
    // The strict ±1 cm / ±1 kg group remains strict. When none of its loops
    // passes the independent circumference-certification check, we still allow
    // its exact PLY breadth/depth shape to be compared in private Test Lab.
    // This prevents a missing circumference certificate from hiding an
    // otherwise valid strict mesh while keeping the fallback explicit.
    const hipEligiblePeople = hipReliablePeople.length ? hipReliablePeople : hipComparisonPeople;

    // WEAR supplies the maximum-hip anatomical row. Delaram's own visible
    // outline supplies the breadth and depth at that row.
    const hipFractionPeople = hipEligiblePeople.length
      ? hipEligiblePeople
      : allUsableHipPeople;
    const hipFraction = median(hipFractionPeople.map((person) => person.rows.hips.heightFractionFromFeet ?? Number.NaN));
    if (hipFraction == null) throw new Error("The WEAR maximum-hip plane is unavailable.");
    const queryHipFront = buildWaistBandDescriptor(frontSpace, hipFraction, [0]);
    const queryHipSide = buildWaistBandDescriptor(sideSpace, hipFraction, [0]);
    if (!queryHipFront || !queryHipSide) throw new Error("Delaram's visible hip row could not be measured.");

    const centreSliceIndex = queryFront.offsets.reduce((selected, offset, index) => (
      Math.abs(offset) < Math.abs(queryFront.offsets[selected]!) ? index : selected
    ), 0);
    const targetBreadthCm = Math.max(0.01, queryFront.widthsCmEquivalent[centreSliceIndex]! + subjectAdjustmentCm);
    const targetDepthCm = Math.max(0.01, querySide.widthsCmEquivalent[centreSliceIndex]! + subjectAdjustmentCm);
    const targetHipBreadthCm = Math.max(0.01, queryHipFront.widthsCmEquivalent[0]! + subjectAdjustmentCm);
    const targetHipDepthCm = Math.max(0.01, queryHipSide.widthsCmEquivalent[0]! + subjectAdjustmentCm);

    const rowFractions = Object.fromEntries(CROSS_SECTION_PARTS.map((part) => {
      if (part === "waist") return [part, waistFraction];
      if (part === "hips") return [part, hipFraction];
      const fraction = median(allGenderPeople.map((person) => (
        person.rows[part]?.heightFractionFromFeet ?? Number.NaN
      )));
      return [part, fraction];
    })) as Record<CrossSectionPart, number | null>;

    const partQueries = Object.fromEntries(CROSS_SECTION_PARTS.flatMap((part) => {
      const fraction = rowFractions[part];
      if (fraction == null) return [];
      const front = buildWaistBandDescriptor(frontSpace, fraction, [0]);
      const side = buildWaistBandDescriptor(sideSpace, fraction, [0]);
      if (!front || !side) return [];
      return [[part, {
        heightFractionFromFeet: fraction,
        targetBreadthCm: Math.max(0.01, front.widthsCmEquivalent[0]! + subjectAdjustmentCm),
        targetDepthCm: Math.max(0.01, side.widthsCmEquivalent[0]! + subjectAdjustmentCm),
      }]];
    })) as Partial<Record<CrossSectionPart, {
      heightFractionFromFeet: number;
      targetBreadthCm: number;
      targetDepthCm: number;
    }>>;

    const bodyPartMatches = Object.fromEntries(CROSS_SECTION_PARTS.flatMap((part) => {
      const query = partQueries[part];
      if (!query) return [];
      const windows = searchMode === "all" ? [Infinity] : ADAPTIVE_PROFILE_WINDOWS_CM;
      let selected: ReturnType<typeof rankCrossSectionCandidates> = [];
      let selectedWindow: number | null = null;
      let gateSatisfied = false;
      let comparisonCount = 0;
      let reliableCount = 0;
      for (const window of windows) {
        const profilePeople = (Number.isFinite(window)
          ? allGenderPeople.filter((person) => (
            Math.abs(person.heightCm - heightCm) <= window + 1e-9
            && Math.abs(person.weightKg - weightKg) <= window + 1e-9
          ))
          : allGenderPeople).filter((person) => person.rows[part] != null);
        if (!profilePeople.length) continue;
        comparisonCount = profilePeople.length;
        const reliable = profilePeople.filter((person) => (
          person.rows[part]?.quality?.eligibleForCircumferenceShapeMatch === true
        ));
        reliableCount = reliable.length;
        const ranked = rankCrossSectionCandidates(
          reliable.length ? reliable : profilePeople,
          part,
          query.targetBreadthCm,
          query.targetDepthCm,
        );
        const qualified = ranked.filter((candidate) => candidate.frontErrorCm <= FRONT_WIDTH_MAX_ERROR_CM + 1e-9);
        selected = (qualified.length ? qualified : ranked).slice(0, 5);
        selectedWindow = Number.isFinite(window) ? window : null;
        gateSatisfied = qualified.length > 0;
        if (qualified.length) break;
      }
      if (!selected.length) return [];
      return [[part, {
        label: part === "underbust" ? "Under-bust" : part === "hips" ? "Hips" : part[0]!.toUpperCase() + part.slice(1),
        mode: "front + side cross-section",
        query,
        candidateCount: shapeIndex.parts?.[part]?.candidateCount ?? allGenderPeople.filter((person) => person.rows[part]).length,
        comparisonCount,
        reliableCount,
        profileWindowCm: selectedWindow,
        frontWidthGateSatisfied: gateSatisfied,
        bestScanId: selected[0]?.scanId ?? null,
        candidateScanIds: selected.map((candidate) => candidate.scanId),
        candidates: selected,
      }]];
    })) as Partial<Record<CrossSectionPart, {
      label: string;
      mode: string;
      query: { heightFractionFromFeet: number; targetBreadthCm: number; targetDepthCm: number };
      candidateCount: number;
      comparisonCount: number;
      reliableCount: number;
      profileWindowCm: number | null;
      frontWidthGateSatisfied: boolean;
      bestScanId: string | null;
      candidateScanIds: string[];
      candidates: ReturnType<typeof rankCrossSectionCandidates>;
    }>>;

    // These are a separate group from neck/chest/waist/hip cross-sections.
    // They compare visible front landmark lengths only, never circumference,
    // depth, tape, or an invented 3D body path.
    const landmarkMatches = Object.fromEntries(LANDMARK_LENGTH_PARTS.map((part) => {
      const user = userLandmarkLengths[part];
      const label = part.replaceAll("_", " ");
      if (!user) {
        return [part, {
          label,
          mode: "visible front landmark length",
          candidateCount: shapeIndex.landmarkParts?.[part]?.candidateCount ?? 0,
          unavailable: part.endsWith("inseam")
            ? "The user pose has no real crotch landmark. Inseam is not guessed from the hip."
            : "The required user landmark was not reliable in this photo.",
          candidates: [],
        }];
      }
      const windows = searchMode === "all" ? [Infinity] : ADAPTIVE_PROFILE_WINDOWS_CM;
      let selected: ReturnType<typeof rankLandmarkLengthCandidates> = [];
      let selectedWindow: number | null = null;
      let gateSatisfied = false;
      let comparisonCount = 0;
      for (const window of windows) {
        const profilePeople = Number.isFinite(window)
          ? allGenderPeople.filter((person) => (
            Math.abs(person.heightCm - heightCm) <= window + 1e-9
            && Math.abs(person.weightKg - weightKg) <= window + 1e-9
          ))
          : allGenderPeople;
        const ranked = rankLandmarkLengthCandidates(profilePeople, part, user.lengthCm);
        if (!ranked.length) continue;
        comparisonCount = ranked.length;
        const qualified = ranked.filter((candidate) => candidate.absoluteErrorCm <= FRONT_WIDTH_MAX_ERROR_CM + 1e-9);
        selected = (qualified.length ? qualified : ranked).slice(0, 5);
        selectedWindow = Number.isFinite(window) ? window : null;
        gateSatisfied = qualified.length > 0;
        if (qualified.length) break;
      }
      return [part, {
        label,
        mode: "visible front landmark length",
        candidateCount: shapeIndex.landmarkParts?.[part]?.candidateCount ?? 0,
        comparisonCount,
        profileWindowCm: selectedWindow,
        lengthGateSatisfied: gateSatisfied,
        query: user,
        bestScanId: selected[0]?.scanId ?? null,
        candidateScanIds: selected.map((candidate) => candidate.scanId),
        candidates: selected,
      }];
    })) as Partial<Record<LandmarkLengthPart, {
      label: string;
      mode: string;
      candidateCount: number;
      comparisonCount?: number;
      profileWindowCm?: number | null;
      lengthGateSatisfied?: boolean;
      unavailable?: string;
      query?: { label: string; source: string; lengthCm: number; lengthBodyHeight: number };
      bestScanId?: string | null;
      candidateScanIds?: string[];
      candidates: ReturnType<typeof rankLandmarkLengthCandidates>;
    }>>;

    // Waist and hips are deliberately ranked independently. First use the
    // ±1 cm / ±1 kg cohort. If no candidate's front width is within half an
    // inch, expand the height/weight window progressively. WEAR geometry is
    // never altered; only the user's photo query is compared differently.
    const adaptiveRank = (
      rowKey: "waist" | "hips",
      breadthCm: number,
      depthCm: number,
    ) => {
      const windows = searchMode === "all" ? [Infinity] : ADAPTIVE_PROFILE_WINDOWS_CM;
      let fallback: {
        ranking: ReturnType<typeof rankBodyPartShapeCandidates>;
        profilePeople: SearchPerson[];
        comparisonPeople: SearchPerson[];
        reliableCount: number;
        profileWindowCm: number | null;
      } | null = null;
      for (const window of windows) {
        const profilePeople = (Number.isFinite(window)
          ? allGenderPeople.filter((person) => (
            Math.abs(person.heightCm - heightCm) <= window + 1e-9
            && Math.abs(person.weightKg - weightKg) <= window + 1e-9
          ))
          : allGenderPeople);
        const reliablePeople = profilePeople.filter((person) => (
          person.rows[rowKey].quality?.eligibleForCircumferenceShapeMatch === true
        ));
        const comparisonPeople = profilePeople.filter((person) => hasUsableRow(person, rowKey));
        if (!comparisonPeople.length) continue;
        const rankPeople = reliablePeople.length ? reliablePeople : comparisonPeople;
        const ranking = rankBodyPartShapeCandidates(
          { breadthCm, depthCm },
          rankPeople,
          rowKey,
          Math.max(5, rankPeople.length),
        );
        const frontQualified = ranking.filter((candidate) => candidate.frontErrorCm <= FRONT_WIDTH_MAX_ERROR_CM + 1e-9);
        const profileWindowCm = Number.isFinite(window) ? window : null;
        const current = { ranking: frontQualified.slice(0, 5), profilePeople, comparisonPeople, reliableCount: reliablePeople.length, profileWindowCm };
        if (!fallback) fallback = { ...current, ranking: ranking.slice(0, 5) };
        if (frontQualified.length) return { ...current, frontWidthGateSatisfied: true, adaptiveProfileExpansionUsed: Number.isFinite(window) && window > HEIGHT_TOLERANCE_CM };
      }
      if (fallback) return { ...fallback, frontWidthGateSatisfied: false, adaptiveProfileExpansionUsed: false };
      throw new Error(`No usable WEAR ${rowKey} meshes were found.`);
    };
    const waistAdaptive = adaptiveRank("waist", targetBreadthCm, targetDepthCm);
    const hipAdaptive = adaptiveRank("hips", targetHipBreadthCm, targetHipDepthCm);
    const frozenWaistRanking = waistAdaptive.ranking;
    const frozenHipRanking = hipAdaptive.ranking;
    const peopleByScan = new Map(allGenderPeople.map((person) => [person.scanId, person]));
    const waistRankByScan = new Map(frozenWaistRanking.map((candidate) => [candidate.scanId, candidate]));
    const hipRankByScan = new Map(frozenHipRanking.map((candidate) => [candidate.scanId, candidate]));
    const rankedScanIds = [...new Set([
      ...frozenWaistRanking.map((candidate) => candidate.scanId),
      ...frozenHipRanking.map((candidate) => candidate.scanId),
    ])];
    const predictions = rankedScanIds.map((scanId, unionIndex) => {
      // Measurement labels are accessed only after the geometry-only rank has
      // been frozen above.
      const person = peopleByScan.get(scanId)!;
      const waistMatch = waistRankByScan.get(scanId) ?? null;
      const hipMatch = hipRankByScan.get(scanId) ?? null;
      const contour32 = resampleClosedContour(person.rows.waist.contour32Normalized, 32);
      const hipContour32 = resampleClosedContour(person.rows.hips.contour32Normalized, 32);
      const rawCircumferenceCm = resizeClosedShapePerimeter({
        contour: contour32,
        targetBreadthCm,
        targetDepthCm,
      });
      const rawHipCircumferenceCm = resizeClosedShapePerimeter({
        contour: hipContour32,
        targetBreadthCm: targetHipBreadthCm,
        targetDepthCm: targetHipDepthCm,
      });
      const cameraSolution = cameraFit?.measurementEffect.candidateSolutions[scanId] ?? null;
      const frontErrorCm = waistMatch?.frontErrorCm ?? hipMatch?.frontErrorCm ?? Number.NaN;
      const sideErrorCm = waistMatch?.sideErrorCm ?? hipMatch?.sideErrorCm ?? Number.NaN;
      const combinedErrorCm = waistMatch?.combinedErrorCm ?? hipMatch?.combinedErrorCm ?? Number.NaN;
      return {
        rank: unionIndex + 1,
        scanId,
        heightCm: person.heightCm,
        weightKg: person.weightKg,
        rows: person.rows,
        waistRank: waistMatch?.rank ?? null,
        hipRank: hipMatch?.rank ?? null,
        frontErrorCm,
        sideErrorCm,
        combinedErrorCm,
        frontErrorBodyHeight: frontErrorCm / heightCm,
        sideErrorBodyHeight: sideErrorCm / heightCm,
        frontShapeErrorBodyHeight: frontErrorCm / heightCm,
        sideShapeErrorBodyHeight: sideErrorCm / heightCm,
        frontRegionalErrorBodyHeight: frontErrorCm / heightCm,
        sideRegionalErrorBodyHeight: sideErrorCm / heightCm,
        worstViewErrorBodyHeight: Math.max(frontErrorCm, sideErrorCm) / heightCm,
        combinedErrorBodyHeight: combinedErrorCm / heightCm,
        similarityWeight: (waistMatch?.similarityWeight ?? 0) + (hipMatch?.similarityWeight ?? 0),
        predictedCircumferenceCm: rawCircumferenceCm,
        predictedHipCircumferenceCm: rawHipCircumferenceCm,
        rawCircumferenceCm,
        rawHipCircumferenceCm,
        cameraCorrectedBreadthCm: cameraSolution?.canonicalBreadthCm ?? null,
        cameraCorrectedDepthCm: cameraSolution?.canonicalDepthCm ?? null,
        shape32: contour32,
        hipShape32: hipContour32,
        wearSourceBreadthCm: person.rows.waist.breadthCm,
        wearSourceDepthCm: person.rows.waist.depthCm,
        wearWaistHeightFractionFromFeet: person.rows.waist.heightFractionFromFeet ?? waistFraction,
        wearHipHeightFractionFromFeet: person.rows.hips.heightFractionFromFeet ?? hipFraction,
        wearHipBreadthCm: person.rows.hips.breadthCm,
        wearHipDepthCm: person.rows.hips.depthCm,
        wearTapeCmRevealedAfterRank: person.rows.waist.revealedAfterRank.recordedTapeCm,
        wearHipTapeCmRevealedAfterRank: person.rows.hips.revealedAfterRank.recordedTapeCm,
        frontWidthsCm: [person.rows.waist.breadthCm, person.rows.hips.breadthCm],
        sideDepthsCm: [person.rows.waist.depthCm, person.rows.hips.depthCm],
      };
    });
    const predictionsByScan = new Map(predictions.map((candidate) => [candidate.scanId, candidate]));
    const weightedPrediction = (
      ranked: typeof frozenWaistRanking,
      key: "predictedCircumferenceCm" | "predictedHipCircumferenceCm",
    ) => {
      const neighbours = ranked.slice(0, Math.min(3, ranked.length));
      const weight = neighbours.reduce((sum, candidate) => (
        sum + (predictionsByScan.get(candidate.scanId)?.[key] == null ? 0 : candidate.similarityWeight)
      ), 0);
      if (!(weight > 0)) return null;
      return neighbours.reduce((sum, candidate) => (
        sum + (predictionsByScan.get(candidate.scanId)?.[key] ?? 0) * candidate.similarityWeight
      ), 0) / weight;
    };
    const predictedCircumferenceCm = weightedPrediction(frozenWaistRanking, "predictedCircumferenceCm");
    const predictedHipCircumferenceCm = weightedPrediction(frozenHipRanking, "predictedHipCircumferenceCm");
    const rawPredictedCircumferenceCm = predictedCircumferenceCm;
    const effectivePeopleCount = new Set([
      ...waistAdaptive.profilePeople.map((person) => person.scanId),
      ...hipAdaptive.profilePeople.map((person) => person.scanId),
    ]).size;
    return NextResponse.json({
      schemaVersion: "wear-front-side-blind-proof/v6",
      privateTestLabOnly: true,
      releaseApproved: false,
      query: { photoId, sidePhotoId, gender, heightCm, weightKg, searchMode, subjectAdjustmentCm },
      inputs: {
        frontPhotoId: photoId,
        sidePhotoId,
        subjectTapeUsed: false,
        appleUsed: false,
        depthProUsed: false,
        gpuUsed: false,
        wearRigidCameraFitUsed: false,
      },
      cameraFit: cameraFit ? {
          ...cameraFit,
          measurementEffect: {
            ...cameraFit.measurementEffect,
            weightedCorrectedBreadthCm: null,
            weightedCorrectedDepthCm: null,
            rawPredictedCircumferenceCm,
            correctedPredictedCircumferenceCm: predictedCircumferenceCm,
            circumferenceChangeCm: null,
          },
        } : null,
      geometry: {
        waistHeightFractionFromFeet: waistFraction,
        front: queryFront,
        side: querySide,
        targetBreadthCm,
        targetDepthCm,
        subjectAdjustmentCm,
        hips: {
          heightFractionFromFeet: hipFraction,
          targetBreadthCm: targetHipBreadthCm,
          targetDepthCm: targetHipDepthCm,
          source: "WEAR cohort maximum-hip row; selected subject visible front and side outlines",
        },
      },
      bodyPartMatches,
      landmarkMatches,
      ranking: {
        searchMode,
        eligibleCandidateCount: effectivePeopleCount,
        waistReliableCandidateCount: waistAdaptive.reliableCount,
        hipReliableCandidateCount: hipAdaptive.reliableCount,
        waistComparisonCandidateCount: waistAdaptive.comparisonPeople.length,
        hipComparisonCandidateCount: hipAdaptive.comparisonPeople.length,
        waistComparisonOnlyFallbackUsed: waistAdaptive.reliableCount === 0,
        hipComparisonOnlyFallbackUsed: hipAdaptive.reliableCount === 0,
        strictCandidateCount: eligiblePeople.length,
        fullValidGeometryCount: shapeIndex.personCount,
        excludedInvalidGeometryCount: shapeIndex.rejectedCount,
        sliceCountPerView: queryFront.offsets.length,
        comparisonCount: 2,
        predictionNeighbourCount: 3,
        frozenBeforeMeasurementReveal: true,
        optionalProfileGate: searchMode === "strict"
          ? {
            firstHeightToleranceCm: HEIGHT_TOLERANCE_CM,
            firstWeightToleranceKg: WEIGHT_TOLERANCE_KG,
            adaptiveWindowsCm: ADAPTIVE_PROFILE_WINDOWS_CM.filter(Number.isFinite),
            frontWidthMaximumErrorCm: FRONT_WIDTH_MAX_ERROR_CM,
          }
          : null,
        adaptiveProfileExpansionUsed: waistAdaptive.adaptiveProfileExpansionUsed || hipAdaptive.adaptiveProfileExpansionUsed,
        waistProfileWindowCm: waistAdaptive.profileWindowCm,
        hipProfileWindowCm: hipAdaptive.profileWindowCm,
        waistFrontWidthGateSatisfied: waistAdaptive.frontWidthGateSatisfied,
        hipFrontWidthGateSatisfied: hipAdaptive.frontWidthGateSatisfied,
        frontWidthMaximumErrorCm: FRONT_WIDTH_MAX_ERROR_CM,
        forbiddenInputs: ["subject tape", "WEAR tape", "circumference", "saved lines"],
        qualityGate: "raw closed loop plus mesh/tape perimeter agreement within 2%; tape excludes bad geometry but never ranks people",
        matchingStrategy: "each anatomical cross-section selects its own nearest WEAR person",
        waistCandidateScanIds: frozenWaistRanking.map((candidate) => candidate.scanId),
        hipCandidateScanIds: frozenHipRanking.map((candidate) => candidate.scanId),
        bestWaistScanId: frozenWaistRanking[0]?.scanId ?? null,
        bestHipScanId: frozenHipRanking[0]?.scanId ?? null,
      },
      prediction: {
        method: "rank waist and hips separately by physical front breadth plus side depth; use each part's three nearest WEAR 32-point shapes",
        predictedCircumferenceCm,
        predictedHipCircumferenceCm,
        rawPredictedCircumferenceCm,
        predictions,
      },
      selectedWearSideProjection: null,
      limitations: [
        "Matching the same front width and side depth does not mathematically guarantee the same circumference; cross-section shape still matters.",
        "The centimetre scale is still a known-height photo estimate, not independently proven A-B ground truth.",
        "The outline measures tight clothing, not a guaranteed naked-body surface.",
        "This first blind person is evidence, not production validation.",
      ],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[wear-front-side-proof] failed", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "The front + side proof is unavailable.",
    }, { status: 404 });
  }
}

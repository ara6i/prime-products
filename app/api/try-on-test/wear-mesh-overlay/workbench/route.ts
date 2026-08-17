import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { loadMetricAsset } from "../_lib/metricAsset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_PHOTO_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

interface PhotoMatch {
  photoId: string;
  candidates?: Array<{
    scanId: string;
    overlayEvidence?: string;
  }>;
}

interface MatchIndex {
  schemaVersion?: string;
  generatedAt?: string;
  status?: string;
  cohort?: unknown;
  rankingInputs?: unknown;
  forbiddenRankingInputs?: unknown;
  scoreDefinition?: unknown;
  conclusion?: unknown;
  excludedPhotos?: unknown;
  photos?: PhotoMatch[];
  evidence?: unknown;
  caveats?: unknown;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json(
      { error: "The WEAR measurement workbench is available only inside Test Lab." },
      { status: 403 },
    );
  }

  const parameters = new URL(request.url).searchParams;
  const photoId = parameters.get("photo") ?? "delaram";
  const requestedScanId = parameters.get("scan");
  if (!SAFE_PHOTO_ID.test(photoId)) {
    return NextResponse.json({ error: "Unknown private Test Lab photo." }, { status: 400 });
  }

  const root = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ".local-ml",
    "wear-mesh-overlay",
  );
  const matchDirectory = path.join(root, "matches-v3");
  const diagnosticOverlayDirectory = path.join(root, "matches-v2", "overlays");

  try {
    const matchIndex = await readJson<MatchIndex>(path.join(matchDirectory, "index.json"));
    const photoMatch = (matchIndex.photos ?? []).find((photo) => photo.photoId === photoId);
    const rankedScanIds = (photoMatch?.candidates ?? []).map((candidate) => candidate.scanId);
    const scanId = requestedScanId ?? rankedScanIds[0];
    if (!scanId) return NextResponse.json({ error: "Choose a WEAR body first." }, { status: 400 });
    const { metric, mesh2d } = await loadMetricAsset(scanId);
    let normalizedOverlay: Record<string, unknown> | null = null;
    const overlayName = `${photoId}--${scanId.toLowerCase()}.json`;
    try {
      normalizedOverlay = await readJson<Record<string, unknown>>(
        path.join(diagnosticOverlayDirectory, overlayName),
      );
    } catch {
      normalizedOverlay = null;
    }

    return NextResponse.json({
      privateTestLabOnly: true,
      releaseApproved: false,
      photoId,
      scanId,
      match: {
        schemaVersion: matchIndex.schemaVersion,
        generatedAt: matchIndex.generatedAt,
        status: matchIndex.status,
        cohort: matchIndex.cohort,
        rankingInputs: matchIndex.rankingInputs,
        forbiddenInputs: matchIndex.forbiddenRankingInputs,
        scoreDefinition: matchIndex.scoreDefinition,
        conclusion: matchIndex.conclusion,
        excludedPhotos: matchIndex.excludedPhotos,
        photo: photoMatch ?? { photoId, candidates: [] },
        evidence: matchIndex.evidence,
        caveats: matchIndex.caveats,
      },
      metric,
      mesh2d,
      normalizedOverlay,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[wear-mesh-overlay] workbench asset failed", error);
    return NextResponse.json(
      { error: "The private WEAR metric workbench assets are unavailable on this machine." },
      { status: 404 },
    );
  }
}

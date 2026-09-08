import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { SDK_WEAR_PARTS } from "@/app/try-on-test/sizing-lab/sdkWearMatcher";
import type { WearRankingMode, WearRevealResponse } from "@/app/try-on-test/wear-side-selector/types";
import { artifactReference, loadWearSideCatalog } from "../_lib/catalog";
import { evaluateSideAndTape, oracleWinner } from "../_lib/evaluation";
import { loadFrozenWearRun, markFrozenWearRunRevealed } from "../_lib/runStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMode(value: unknown): value is WearRankingMode {
  return value === "overall" || SDK_WEAR_PARTS.includes(value as never);
}

function stringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value as string[]
    : null;
}

export async function POST(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "WEAR Side Picker is private Test Lab only." }, { status: 403 });
  }
  try {
    const body = await request.json() as {
      runId?: unknown;
      ring?: unknown;
      mode?: unknown;
      displayedCandidateIds?: unknown;
      selectedScanId?: unknown;
    };
    const runId = typeof body.runId === "string" ? body.runId : "";
    const ring = typeof body.ring === "number" ? body.ring : Number(body.ring);
    const displayedCandidateIds = stringArray(body.displayedCandidateIds);
    const selectedScanId = typeof body.selectedScanId === "string" ? body.selectedScanId : "";
    if (!runId || !Number.isInteger(ring) || ring < 1 || ring > 10 || !isMode(body.mode)) {
      return NextResponse.json({ error: "A valid frozen run, ring, and leaderboard mode are required." }, { status: 400 });
    }
    if (!displayedCandidateIds?.length || displayedCandidateIds.length > 100 || new Set(displayedCandidateIds).size !== displayedCandidateIds.length) {
      return NextResponse.json({ error: "Displayed candidates must be a unique non-empty leaderboard prefix." }, { status: 400 });
    }
    if (!displayedCandidateIds.includes(selectedScanId)) {
      return NextResponse.json({ error: "Select one complete person from the displayed candidates." }, { status: 400 });
    }

    const run = await loadFrozenWearRun(runId);
    const frozenRing = run.rings.find((item) => item.ring === ring);
    if (!frozenRing) return NextResponse.json({ error: "The requested ring is not part of this run." }, { status: 400 });
    const frozenOrder = frozenRing.leaderboards[body.mode].candidateIds;
    const exactPrefix = displayedCandidateIds.every((scanId, index) => frozenOrder[index] === scanId);
    if (!exactPrefix) {
      return NextResponse.json({ error: "Displayed candidates do not match the frozen leaderboard order." }, { status: 409 });
    }

    const people = await loadWearSideCatalog();
    const personById = new Map(people.map((person) => [person.scanId, person]));
    const input = personById.get(run.inputScanId);
    if (!input) throw new Error("The frozen input person is no longer in the catalog.");
    const candidates = displayedCandidateIds.map((scanId) => personById.get(scanId));
    if (candidates.some((candidate) => !candidate)) throw new Error("A frozen candidate is no longer in the catalog.");
    const evaluations = candidates.map((candidate) => evaluateSideAndTape(input, candidate!));
    await markFrozenWearRunRevealed(run, {
      ring,
      mode: body.mode,
      displayedCandidateIds,
      selectedScanId,
    });
    const response: WearRevealResponse = {
      ok: true,
      runId,
      ring,
      mode: body.mode,
      displayedCandidateIds,
      selectedScanId,
      globalFrontWinner: run.globalFrontWinner,
      oracleSideWinnerScanId: oracleWinner(evaluations, "side"),
      oracleTapeWinnerScanId: oracleWinner(evaluations, "tape"),
      candidates: evaluations,
      inputSideArtifact: artifactReference(input.scanId, ["front", "side"]),
      validationBoundary: "Side and tape truth was opened only after the frozen candidate prefix and the user selection were validated. Oracle winners are validation-only.",
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Hidden evaluation could not be revealed." }, { status: 400 });
  }
}

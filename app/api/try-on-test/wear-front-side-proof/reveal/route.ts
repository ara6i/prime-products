import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import type { WearRevealResponse } from "@/app/try-on-test/wear-side-selector/types";
import { artifactReference, loadWearSideCatalog } from "@/app/api/try-on-test/wear-side-selector/_lib/catalog";
import { evaluateSideAndTape, oracleWinner } from "@/app/api/try-on-test/wear-side-selector/_lib/evaluation";
import { loadFrozenWearRun, markFrozenWearRunRevealed } from "@/app/api/try-on-test/wear-side-selector/_lib/runStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value as string[] : null;
}

export async function POST(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "WEAR matching is private Test Lab only." }, { status: 403 });
  }
  try {
    const body = await request.json() as {
      runId?: unknown;
      tolerance?: unknown;
      displayedCandidateIds?: unknown;
      selectedScanId?: unknown;
    };
    const runId = typeof body.runId === "string" ? body.runId : "";
    const tolerance = typeof body.tolerance === "number" ? body.tolerance : Number(body.tolerance);
    const displayedCandidateIds = stringArray(body.displayedCandidateIds);
    const selectedScanId = typeof body.selectedScanId === "string" ? body.selectedScanId : "";
    if (!runId || !Number.isInteger(tolerance) || tolerance < 0 || tolerance > 10) {
      return NextResponse.json({ error: "A valid run and ±0 to ±10 scenario are required." }, { status: 400 });
    }
    if (!displayedCandidateIds?.length || displayedCandidateIds.length > 10 || new Set(displayedCandidateIds).size !== displayedCandidateIds.length) {
      return NextResponse.json({ error: "The displayed list must contain one to ten unique people." }, { status: 400 });
    }
    if (!displayedCandidateIds.includes(selectedScanId)) {
      return NextResponse.json({ error: "Choose one person from the displayed side bodies." }, { status: 400 });
    }

    const run = await loadFrozenWearRun(runId);
    const scenario = run.rings.find((item) => item.ring === tolerance);
    if (!scenario) return NextResponse.json({ error: "This scenario is not part of the frozen run." }, { status: 400 });
    const frozenOrder = scenario.leaderboards.overall.candidateIds;
    if (!displayedCandidateIds.every((scanId, index) => frozenOrder[index] === scanId)) {
      return NextResponse.json({ error: "The displayed people no longer match the frozen front ranking." }, { status: 409 });
    }

    const people = await loadWearSideCatalog();
    const personById = new Map(people.map((person) => [person.scanId, person]));
    const input = personById.get(run.inputScanId);
    if (!input) throw new Error("The selected WEAR person is no longer in the catalog.");
    const candidates = displayedCandidateIds.map((scanId) => personById.get(scanId));
    if (candidates.some((candidate) => !candidate)) throw new Error("A displayed WEAR person is no longer in the catalog.");
    const evaluations = candidates.map((candidate) => evaluateSideAndTape(input, candidate!, ["waist", "hips"]));
    await markFrozenWearRunRevealed(run, {
      ring: tolerance,
      mode: "overall",
      displayedCandidateIds,
      selectedScanId,
    });
    const response: WearRevealResponse = {
      ok: true,
      runId,
      ring: tolerance,
      mode: "overall",
      displayedCandidateIds,
      selectedScanId,
      globalFrontWinner: run.globalFrontWinner,
      oracleSideWinnerScanId: oracleWinner(evaluations, "side"),
      oracleTapeWinnerScanId: oracleWinner(evaluations, "tape"),
      candidates: evaluations,
      inputSideArtifact: artifactReference(input.scanId, ["front", "side"]),
      validationBoundary: "The ten front candidates were frozen first. Only after the user chose a side body were waist and hip side depth and recorded tape opened.",
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Tape comparison could not be opened." }, { status: 400 });
  }
}

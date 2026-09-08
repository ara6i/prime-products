import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WearFrontRing, WearFrontWinner } from "@/app/try-on-test/wear-side-selector/types";
import { WEAR_ARTIFACT_VERSION, WEAR_CATALOG_VERSION } from "./catalog";

const RUN_TTL_MS = 2 * 60 * 60 * 1000;

export interface FrozenWearRun {
  runId: string;
  createdAt: string;
  expiresAt: string;
  inputScanId: string;
  catalogVersion: string;
  artifactVersion: string;
  rings: WearFrontRing[];
  globalFrontWinner: WearFrontWinner | null;
  reveal?: {
    revealedAt: string;
    ring: number;
    mode: string;
    displayedCandidateIds: string[];
    selectedScanId: string;
  };
}

function runDirectory() {
  return path.join(process.cwd(), ".local-ml", "wear-side-selector", "runs");
}

function validatedRunId(runId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId)) {
    throw new Error("Invalid ranking run ID.");
  }
  return runId;
}

export async function createFrozenWearRun(input: {
  inputScanId: string;
  rings: WearFrontRing[];
  globalFrontWinner: WearFrontWinner | null;
}) {
  const runId = randomUUID();
  const createdAt = new Date();
  const run: FrozenWearRun = {
    runId,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + RUN_TTL_MS).toISOString(),
    inputScanId: input.inputScanId,
    catalogVersion: WEAR_CATALOG_VERSION,
    artifactVersion: WEAR_ARTIFACT_VERSION,
    rings: input.rings,
    globalFrontWinner: input.globalFrontWinner,
  };
  await mkdir(runDirectory(), { recursive: true, mode: 0o700 });
  await writeFile(path.join(runDirectory(), `${runId}.json`), JSON.stringify(run), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  return run;
}

export async function loadFrozenWearRun(runId: string) {
  const safeRunId = validatedRunId(runId);
  let run: FrozenWearRun;
  try {
    run = JSON.parse(await readFile(path.join(runDirectory(), `${safeRunId}.json`), "utf8")) as FrozenWearRun;
  } catch {
    throw new Error("Ranking run was not found. Run the front ranking again.");
  }
  if (run.runId !== safeRunId || run.catalogVersion !== WEAR_CATALOG_VERSION || run.artifactVersion !== WEAR_ARTIFACT_VERSION) {
    throw new Error("Ranking run version no longer matches the active WEAR catalog and artifacts.");
  }
  if (Date.parse(run.expiresAt) <= Date.now()) throw new Error("Ranking run expired. Run the front ranking again.");
  return run;
}

export async function markFrozenWearRunRevealed(
  run: FrozenWearRun,
  reveal: Omit<NonNullable<FrozenWearRun["reveal"]>, "revealedAt">,
) {
  const updated: FrozenWearRun = {
    ...run,
    reveal: { ...reveal, revealedAt: new Date().toISOString() },
  };
  await writeFile(path.join(runDirectory(), `${validatedRunId(run.runId)}.json`), JSON.stringify(updated), {
    encoding: "utf8",
    mode: 0o600,
  });
  return updated;
}

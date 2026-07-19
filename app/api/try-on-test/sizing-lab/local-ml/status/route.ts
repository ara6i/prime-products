import { existsSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import {
  LOCAL_ML_CHECKPOINT_RELATIVE_PATH,
  LOCAL_ML_MODEL_VERSION,
  WEAR_DIRECT_DEPTH_RELATIVE_PATH,
  WEAR_ROW_PRIOR_MODEL_VERSION,
  WEAR_ROW_PRIOR_RELATIVE_PATH,
  type LocalMlModelStatusResponse,
} from "@/app/try-on-test/sizing-lab/lib/localMlSizing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ ok: false, error: "Local ML is available only on local and test-lab hosts." }, { status: 403 });
  }
  const checkpointPath = path.join(/* turbopackIgnore: true */ process.cwd(), LOCAL_ML_CHECKPOINT_RELATIVE_PATH);
  const rowPriorPath = path.join(/* turbopackIgnore: true */ process.cwd(), WEAR_ROW_PRIOR_RELATIVE_PATH);
  const directDepthCohortPath = path.join(/* turbopackIgnore: true */ process.cwd(), WEAR_DIRECT_DEPTH_RELATIVE_PATH);
  const fullCheckpointReady = existsSync(checkpointPath);
  const rowPriorReady = existsSync(rowPriorPath);
  const directDepthCohortReady = existsSync(directDepthCohortPath);
  const checkpointReady = fullCheckpointReady || (rowPriorReady && directDepthCohortReady);
  const response: LocalMlModelStatusResponse = {
    ok: true,
    localOnly: true,
    modelVersion: fullCheckpointReady ? LOCAL_ML_MODEL_VERSION : WEAR_ROW_PRIOR_MODEL_VERSION,
    checkpointReady,
    rowPriorReady,
    directDepthCohortReady,
    fullCheckpointReady,
    activeStage: fullCheckpointReady ? "front-multitask-3d" : rowPriorReady && directDepthCohortReady ? "wear-1d-row-prior" : null,
    checkpointPath: LOCAL_ML_CHECKPOINT_RELATIVE_PATH,
    rowPriorPath: WEAR_ROW_PRIOR_RELATIVE_PATH,
    directDepthCohortPath: WEAR_DIRECT_DEPTH_RELATIVE_PATH,
    trainingManifestPath: ".local-ml/data/manifest.jsonl",
    message: fullCheckpointReady
      ? "Full local photo + 3D checkpoint found. Rows, endpoints, and depth can run locally."
      : rowPriorReady && directDepthCohortReady
        ? "WEAR 1D row model and direct measured depth cohorts are ready. Rows come from the row model; body depth comes from the median of real people in the matching gender, height, and BMI box. No depth regression is used."
        : rowPriorReady
          ? "The WEAR row model exists, but the direct measured depth cohort checkpoint is missing."
        : "Training scaffold is ready, but no checkpoint exists yet. Add reviewed labels and future 3D-derived samples, then train locally.",
  };
  return NextResponse.json(response, { headers: { "cache-control": "no-store" } });
}

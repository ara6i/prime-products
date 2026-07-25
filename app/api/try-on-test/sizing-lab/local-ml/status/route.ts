import { existsSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import {
  LOCAL_ML_CHECKPOINT_RELATIVE_PATH,
  LOCAL_ML_MODEL_VERSION,
  WEAR_ABSOLUTE_DEPTH_RELATIVE_PATH,
  WEAR_DIRECT_DEPTH_RELATIVE_PATH,
  WEAR_ROW_PRIOR_MODEL_VERSION,
  WEAR_ROW_PRIOR_RELATIVE_PATH,
  WEAR_SHAPE_EXPONENT_RELATIVE_PATH,
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
  const absoluteDepthModelPath = path.join(/* turbopackIgnore: true */ process.cwd(), WEAR_ABSOLUTE_DEPTH_RELATIVE_PATH);
  const shapeExponentModelPath = path.join(/* turbopackIgnore: true */ process.cwd(), WEAR_SHAPE_EXPONENT_RELATIVE_PATH);
  const fullCheckpointReady = existsSync(checkpointPath);
  const rowPriorReady = existsSync(rowPriorPath);
  const directDepthCohortReady = existsSync(directDepthCohortPath);
  const absoluteDepthModelReady = existsSync(absoluteDepthModelPath);
  const shapeExponentModelReady = existsSync(shapeExponentModelPath);
  const checkpointReady = fullCheckpointReady || (rowPriorReady && directDepthCohortReady);
  const response: LocalMlModelStatusResponse = {
    ok: true,
    localOnly: true,
    modelVersion: fullCheckpointReady ? LOCAL_ML_MODEL_VERSION : WEAR_ROW_PRIOR_MODEL_VERSION,
    checkpointReady,
    rowPriorReady,
    directDepthCohortReady,
    absoluteDepthModelReady,
    shapeExponentModelReady,
    fullCheckpointReady,
    activeStage: fullCheckpointReady ? "front-multitask-3d" : rowPriorReady && directDepthCohortReady ? "wear-1d-row-prior" : null,
    checkpointPath: LOCAL_ML_CHECKPOINT_RELATIVE_PATH,
    rowPriorPath: WEAR_ROW_PRIOR_RELATIVE_PATH,
    directDepthCohortPath: WEAR_DIRECT_DEPTH_RELATIVE_PATH,
    absoluteDepthModelPath: WEAR_ABSOLUTE_DEPTH_RELATIVE_PATH,
    shapeExponentModelPath: WEAR_SHAPE_EXPONENT_RELATIVE_PATH,
    trainingManifestPath: ".local-ml/data/manifest.jsonl",
    message: fullCheckpointReady
      ? "Full local photo + 3D checkpoint found. Rows, endpoints, and depth can run locally."
      : rowPriorReady && directDepthCohortReady
        ? absoluteDepthModelReady
          ? shapeExponentModelReady
            ? "WEAR 1D rows and absolute depth are ready. The separate waist/hip shape experiment is available; trouser shape stays manual because no safe same-level training triplet exists."
            : "WEAR 1D rows are ready. Compare photo width + cohort ratio with photo width + the separate WEAR-only absolute-depth formula. The optional shape model is missing."
          : "WEAR 1D rows and direct measured depth cohorts are ready. The optional absolute-depth formula is missing."
        : rowPriorReady
          ? "The WEAR row model exists, but the direct measured depth cohort checkpoint is missing."
        : "Training scaffold is ready, but no checkpoint exists yet. Add reviewed labels and future 3D-derived samples, then train locally.",
  };
  return NextResponse.json(response, { headers: { "cache-control": "no-store" } });
}

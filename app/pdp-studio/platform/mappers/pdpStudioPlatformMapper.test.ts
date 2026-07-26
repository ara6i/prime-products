import assert from "node:assert/strict";
import test from "node:test";
import { mapPdpStudioJob } from "./pdpStudioPlatformMapper";
import type { PdpStudioJob } from "../types/pdpStudioPlatform";

test("job mapper clamps provider progress and normalizes output names", () => {
  const input = {
    id: "job-1",
    parentJobId: null,
    sequence: null,
    toolId: "resize",
    status: "running",
    progress: { stage: "", percent: 160 },
    inputAssetIds: [],
    referenceAssetIds: [],
    outputs: [
      {
        id: "asset-1",
        source: "generated",
        resourceType: "image",
        url: "https://example.test/signed",
        mimeType: "image/png",
        bytes: 12,
        width: 100,
        height: 100,
        durationSeconds: null,
        originalName: null,
        createdAt: new Date(0).toISOString(),
      },
    ],
    prompt: null,
    options: {},
    useBrandKit: false,
    provider: "sharp",
    model: "sharp-local",
    idempotencyId: "idempotency",
    error: null,
    attemptCount: 1,
    cancelRequested: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    startedAt: new Date(0).toISOString(),
    completedAt: null,
  } satisfies PdpStudioJob;

  const mapped = mapPdpStudioJob(input);
  assert.equal(mapped.progress.percent, 100);
  assert.equal(mapped.progress.stage, "Processing");
  assert.equal(mapped.outputs[0]?.originalName, "PDP Studio asset");
});

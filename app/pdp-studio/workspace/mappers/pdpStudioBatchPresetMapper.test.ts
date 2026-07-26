import assert from "node:assert/strict";
import test from "node:test";
import { mapPdpStudioBatchPreset } from "./pdpStudioBatchPresetMapper";

test("Batch maps deterministic presets to their real processors", () => {
  assert.deepEqual(mapPdpStudioBatchPreset("transparent-cutout"), {
    toolId: "background-remover",
    options: {},
  });
  assert.deepEqual(mapPdpStudioBatchPreset("soft-shadow"), {
    toolId: "ai-shadows",
    options: {},
  });
});

test("Batch maps scene presets to Gemini background processing", () => {
  const mapped = mapPdpStudioBatchPreset("warm-plinth");
  assert.equal(mapped.toolId, "ai-backgrounds");
  assert.equal(mapped.options.background, "warm-plinth");
  assert.match(mapped.prompt ?? "", /warm plinth/);
});

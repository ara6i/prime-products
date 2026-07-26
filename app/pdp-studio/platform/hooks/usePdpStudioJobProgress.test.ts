import assert from "node:assert/strict";
import test from "node:test";
import { isPdpStudioTerminalJobStatus } from "./usePdpStudioJobProgress";

test("job progress hook stops only for terminal backend states", () => {
  assert.equal(isPdpStudioTerminalJobStatus("queued"), false);
  assert.equal(isPdpStudioTerminalJobStatus("running"), false);
  assert.equal(isPdpStudioTerminalJobStatus("succeeded"), true);
  assert.equal(isPdpStudioTerminalJobStatus("failed"), true);
  assert.equal(isPdpStudioTerminalJobStatus("cancelled"), true);
});

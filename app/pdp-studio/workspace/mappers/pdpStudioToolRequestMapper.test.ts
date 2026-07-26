import assert from "node:assert/strict";
import test from "node:test";
import { mapPdpStudioToolOptions } from "./pdpStudioToolRequestMapper";
import type { PdpStudioToolDefinition } from "../types";

test("tool mapper sends typed provider options and persisted Brand Kit choice", () => {
  const tool = {
    id: "studio-shot",
    label: "Studio Shot",
    description: "",
    icon: "camera",
    mode: "studio-shot",
    href: "/pdp-studio/tools/studio-shot",
    group: "all",
    outputCount: 1,
  } satisfies PdpStudioToolDefinition;

  const mapped = mapPdpStudioToolOptions(tool, {
    "Output size": "portrait-3-4",
    "Brand style": "use-brand-kit",
  });

  assert.deepEqual(mapped.options, {
    outputSize: "portrait-3-4",
    brandStyle: "use-brand-kit",
    aspectRatio: "3:4",
    outputCount: 1,
  });
  assert.equal(mapped.useBrandKit, true);
});

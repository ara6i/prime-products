import { describe, expect, it } from "vitest";
import { mapAiBackgroundJobOptions } from "./aiBackgroundJobMapper";

describe("AI Background job mapper", () => {
  it.each([
    ["standard", "1K"],
    ["advanced", "2K"],
    ["premium", "4K"],
  ] as const)("maps %s quality to %s", (quality, imageSize) => {
    expect(
      mapAiBackgroundJobOptions({
        mode: "preset",
        modelPreset: "v3",
        quality,
        aspectRatio: "1:1",
        presetId: "trending:spring",
      }),
    ).toEqual({
      mode: "preset",
      modelPreset: "v3",
      imageSize,
      aspectRatio: "1:1",
      presetId: "trending:spring",
    });
  });

  it("omits blank optional assisted fields", () => {
    expect(
      mapAiBackgroundJobOptions({
        mode: "assisted",
        modelPreset: "studio",
        quality: "advanced",
        aspectRatio: "3:2",
        surface: " limestone plinth ",
        environment: " ",
      }),
    ).toEqual({
      mode: "assisted",
      modelPreset: "studio",
      imageSize: "2K",
      aspectRatio: "3:2",
      surface: "limestone plinth",
    });
  });
});

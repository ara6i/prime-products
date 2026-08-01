import { describe, expect, it } from "vitest";
import {
  AI_BACKGROUND_AVAILABLE_PRESETS,
  AI_BACKGROUND_PRESET_GROUPS,
  AI_BACKGROUND_PRESETS,
  AI_BACKGROUND_UNIQUE_ASSETS,
} from "./aiBackgroundPresets";
import { AI_BACKGROUND_ASSET_MANIFEST } from "./aiBackgroundAssetManifest";
import { AI_BACKGROUND_GENERATED_RESULTS } from "./aiBackgroundGeneratedResults";

describe("AI Background preset catalog", () => {
  it("matches the audited 160-slot, 152-asset catalog", () => {
    expect(AI_BACKGROUND_PRESETS).toHaveLength(160);
    expect(AI_BACKGROUND_UNIQUE_ASSETS).toHaveLength(152);
    expect(
      new Set(AI_BACKGROUND_PRESETS.map((preset) => preset.assetKey)).size,
    ).toBe(152);
  });

  it("preserves every audited category count", () => {
    expect(
      Object.fromEntries(
        AI_BACKGROUND_PRESET_GROUPS.map((group) => [
          group.label,
          group.presets.length,
        ]),
      ),
    ).toEqual({
      Trending: 8,
      Mood: 19,
      Countertop: 8,
      Plant: 6,
      Texture: 4,
      Mountain: 9,
      Event: 12,
      "Holiday season": 3,
      Interior: 3,
      Accessories: 3,
      Surface: 18,
      Flower: 4,
      "A window on": 11,
      Creative: 4,
      "Sci-Fi Worlds": 4,
      Backdrop: 8,
      Fabric: 18,
      Water: 18,
    });
  });

  it("has one complete manifest entry for every unique asset", () => {
    expect(AI_BACKGROUND_ASSET_MANIFEST).toHaveLength(152);
    expect(
      new Set(AI_BACKGROUND_ASSET_MANIFEST.map((entry) => entry.filename)).size,
    ).toBe(152);
    for (const entry of AI_BACKGROUND_ASSET_MANIFEST) {
      expect(entry.prompt.trim().length).toBeGreaterThan(40);
      expect(entry.minimumWidth).toBe(1024);
      expect(entry.minimumHeight).toBe(1024);
      expect(entry.generationSurface).toBe("signed-in-chatgpt-browser");
    }
  });

  it("publishes only generated thumbnails while retaining the future catalog", () => {
    const generatedAssetKeys = Object.keys(AI_BACKGROUND_GENERATED_RESULTS);
    expect(generatedAssetKeys.length).toBeGreaterThanOrEqual(3);
    expect(AI_BACKGROUND_AVAILABLE_PRESETS.length).toBeGreaterThanOrEqual(
      generatedAssetKeys.length,
    );
    expect(
      AI_BACKGROUND_AVAILABLE_PRESETS.every(
        (preset) => AI_BACKGROUND_GENERATED_RESULTS[preset.assetKey],
      ),
    ).toBe(true);
    expect(
      AI_BACKGROUND_ASSET_MANIFEST.filter(
        (entry) => entry.integration === "integrated",
      ),
    ).toHaveLength(generatedAssetKeys.length);
  });
});

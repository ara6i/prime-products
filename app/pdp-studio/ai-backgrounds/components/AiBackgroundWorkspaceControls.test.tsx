import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AI_BACKGROUND_AVAILABLE_PRESETS } from "../data/aiBackgroundPresets";
import type { AiBackgroundsWorkspaceController } from "../hooks/useAiBackgroundsWorkspace";
import { AiBackgroundAssetPicker } from "./AiBackgroundAssetPicker";
import { AiBackgroundCustomPanel } from "./AiBackgroundCustomPanel";
import { AiBackgroundRail } from "./AiBackgroundRail";

function controller(
  overrides: Partial<AiBackgroundsWorkspaceController>,
): AiBackgroundsWorkspaceController {
  return {
    customOpen: false,
    customTab: "manual",
    search: "",
    modelPreset: "v3",
    selectedPresetId: null,
    busy: false,
    filteredGroups: [],
    reference: null,
    imageDescription: "",
    surface: "",
    environment: "",
    manualPrompt: "",
    setCustomOpen: vi.fn(),
    setCustomTab: vi.fn(),
    setSearch: vi.fn(),
    setModelPreset: vi.fn(),
    setImageDescription: vi.fn(),
    setSurface: vi.fn(),
    setEnvironment: vi.fn(),
    setManualPrompt: vi.fn(),
    openAssetPicker: vi.fn(),
    runGeneration: vi.fn(),
    canGenerateCustom: vi.fn(() => false),
    generateCustom: vi.fn(),
    resetEditor: vi.fn(),
    ...overrides,
  } as unknown as AiBackgroundsWorkspaceController;
}

describe("AI Background workspace controls", () => {
  it("renders highlighted preset search results and submits the registered preset id", () => {
    const runGeneration = vi.fn();
    const matches = AI_BACKGROUND_AVAILABLE_PRESETS.filter((preset) =>
      preset.label.toLowerCase().includes("marble"),
    );

    render(
      <AiBackgroundRail
        ui={controller({
          search: "marble",
          filteredGroups: [
            {
              id: "search-results",
              label: "Search results",
              presets: matches,
            },
          ],
          runGeneration,
        })}
      />,
    );

    expect(screen.getAllByText(/marble/i).length).toBeGreaterThan(0);
    expect(document.querySelectorAll("mark").length).toBe(matches.length);

    fireEvent.click(
      screen.getAllByRole("button", {
        name: matches[0]!.label,
      })[0]!,
    );
    expect(runGeneration).toHaveBeenCalledWith("preset", {
      presetId: matches[0]!.id,
    });
  });

  it("keeps custom generation disabled until the active mode is valid", () => {
    const generateCustom = vi.fn();
    const { rerender } = render(
      <AiBackgroundCustomPanel
        ui={controller({
          customTab: "manual",
          canGenerateCustom: vi.fn(() => false),
          generateCustom,
        })}
      />,
    );

    expect(
      screen
        .getByRole("button", { name: "Generate images" })
        .hasAttribute("disabled"),
    ).toBe(true);

    rerender(
      <AiBackgroundCustomPanel
        ui={controller({
          customTab: "manual",
          manualPrompt: "A warm limestone gallery",
          canGenerateCustom: vi.fn(() => true),
          generateCustom,
        })}
      />,
    );

    const generateButton = screen.getByRole("button", {
      name: "Generate images",
    });
    expect(generateButton.hasAttribute("disabled")).toBe(false);
    fireEvent.click(generateButton);
    expect(generateCustom).toHaveBeenCalledOnce();
  });

  it("switches private-library tabs and selects a real asset", () => {
    const setAssetTab = vi.fn();
    const selectAsset = vi.fn();
    const asset = {
      id: "asset-1",
      url: "https://res.cloudinary.com/example/image/upload/asset-1.jpg",
      resourceType: "image",
      source: "upload",
      originalName: "blue-shirt.jpg",
    };

    render(
      <AiBackgroundAssetPicker
        ui={controller({
          assetPickerOpen: true,
          assetPickerPurpose: "source",
          assetTab: "all",
          assetQuery: "",
          editorOpen: false,
          source: null,
          assets: [asset] as never,
          assetsLoading: false,
          assetsError: null,
          assetsHasMore: false,
          setAssetPickerOpen: vi.fn(),
          setAssetTab,
          setAssetQuery: vi.fn(),
          selectLocalFile: vi.fn(),
          selectAsset,
          confirmAssetSelection: vi.fn(),
          loadMoreAssets: vi.fn(),
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Generated images" }));
    expect(setAssetTab).toHaveBeenCalledWith("generated");

    fireEvent.click(screen.getByRole("button", { name: "blue-shirt.jpg" }));
    expect(selectAsset).toHaveBeenCalledWith(asset);
  });
});

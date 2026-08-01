import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AiBackgroundsWorkspaceController } from "../hooks/useAiBackgroundsWorkspace";
import { AiBackgroundModelMenu } from "./AiBackgroundModelMenu";
import { AiBackgroundQualityMenu } from "./AiBackgroundQualityMenu";

function controller(
  overrides: Partial<AiBackgroundsWorkspaceController>,
): AiBackgroundsWorkspaceController {
  return {
    modelPreset: "v3",
    quality: "standard",
    setModelPreset: vi.fn(),
    setQuality: vi.fn(),
    ...overrides,
  } as unknown as AiBackgroundsWorkspaceController;
}

describe("AI Background selectors", () => {
  it("renders all captured model options and selects one", () => {
    const setModelPreset = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <AiBackgroundModelMenu
        ui={controller({ setModelPreset })}
        open
        onOpenChange={onOpenChange}
      />,
    );

    const options = screen.getAllByRole("menuitemradio");
    expect(options).toHaveLength(4);
    fireEvent.click(options[0]!);
    expect(setModelPreset).toHaveBeenCalledWith("studio-hd");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders all quality tiers without credit claims", () => {
    const setQuality = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <AiBackgroundQualityMenu
        ui={controller({ setQuality })}
        open
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.queryByText(/credit/i)).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Premium/i }));
    expect(setQuality).toHaveBeenCalledWith("premium");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

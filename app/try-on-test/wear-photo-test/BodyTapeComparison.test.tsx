// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BodyTapeComparison } from "./BodyTapeComparison";
import type { ProductSizeInput } from "./productSizeImpact";

const actuals = { waist: 99, hips: 113, chest: 106 };
const input: ProductSizeInput = {
  person: { label: "Shahnaz 2", gender: "female", heightCm: 159 }, model: { version: "aiad-fixture", sha256: "fixture-only" },
  actuals, predicted: { waist: 102.3, hips: 111.5, chest: 116.7, neck: 45.4, underbust: 95.9, thigh: 63 }, deductionCm: 0,
};
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("plain-English real-tape comparison", () => {
  it("shows real tape, model and signed errors without opening an accordion or calling an API", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<BodyTapeComparison input={input} actuals={actuals} personLabel="Shahnaz 2 · female · 159 cm" />);
    const waist = within(screen.getByTestId("tape-comparison-waist"));
    expect(waist.getByText("99")).toBeTruthy();
    expect(waist.getByText("102.3")).toBeTruthy();
    expect(waist.getByText("+3.3 cm")).toBeTruthy();
    expect(waist.getByText("Model is too high")).toBeTruthy();
    expect(within(screen.getByTestId("tape-comparison-hips")).getByText("−1.5 cm")).toBeTruthy();
    expect(screen.getByTestId("body-tape-comparison").closest("details")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls out the biggest error and scores only parts with both numbers", () => {
    render(<BodyTapeComparison input={input} actuals={actuals} personLabel="Shahnaz 2" />);
    expect(screen.getByTestId("biggest-tape-error").textContent).toBe("Chest / bust: 10.7 cm too high");
    expect(screen.getByText("0 of 3 measured parts within 1.27 cm")).toBeTruthy();
    expect(screen.getAllByText("Outside goal")).toHaveLength(3);
    expect(screen.getAllByText("Not checked")).toHaveLength(3);
    expect(screen.getByText(/not counted as correct or incorrect/)).toBeTruthy();
  });

  it("shows stored tape before inference and does not invent a model prediction", () => {
    render(<BodyTapeComparison input={null} actuals={{ waist: 94, hips: 103.5, chest: 101 }} personLabel="Shane" />);
    expect(screen.getByRole("heading", { name: "Real tape vs model · Shane" })).toBeTruthy();
    expect(within(screen.getByTestId("tape-comparison-waist")).getByText("94")).toBeTruthy();
    expect(screen.queryByTestId("biggest-tape-error")).toBeNull();
    expect(screen.getAllByText("Not checked")).toHaveLength(6);
    expect(screen.getByRole("status").textContent).toContain("Run the selected model");
  });

  it("updates immediately when real tape changes and clears old errors for a different person", () => {
    const view = render(<BodyTapeComparison input={input} actuals={actuals} personLabel="Shahnaz 2" />);
    view.rerender(<BodyTapeComparison input={input} actuals={{ ...actuals, waist: 102.3 }} personLabel="Shahnaz 2" />);
    expect(within(screen.getByTestId("tape-comparison-waist")).getByText("0 cm")).toBeTruthy();
    view.rerender(<BodyTapeComparison input={null} actuals={{ waist: 94 }} personLabel="Shane" />);
    expect(screen.queryByText("+3.3 cm")).toBeNull();
    expect(screen.queryByText("116.7")).toBeNull();
    expect(screen.queryByTestId("biggest-tape-error")).toBeNull();
  });

  it("does not rewrite the original errors for a product-only clothing experiment", () => {
    render(<BodyTapeComparison input={{ ...input, deductionCm: 4 }} actuals={actuals} personLabel="Shahnaz 2" />);
    expect(within(screen.getByTestId("tape-comparison-waist")).getByText("+3.3 cm")).toBeTruthy();
    expect(input.predicted.waist).toBe(102.3);
    expect(actuals.waist).toBe(99);
  });

  it("keeps missing references and a pending prediction clearly unscored", () => {
    const view = render(<BodyTapeComparison input={input} actuals={{}} personLabel="Upload" />);
    expect(screen.getByRole("status").textContent).toContain("No matching real-tape checks");
    expect(screen.queryByTestId("biggest-tape-error")).toBeNull();
    view.rerender(<BodyTapeComparison input={null} actuals={actuals} personLabel="Upload" pending />);
    expect(screen.getByRole("status").textContent).toContain("model is running");
    expect(screen.getAllByText("Not checked")).toHaveLength(6);
  });
});

// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductSizeImpactPanel } from "./ProductSizeImpactPanel";
import { PRODUCT_GARMENT_GROUPS, selectedPersonSizeInput, type ProductGarmentGroupId, type ProductSizeInput, type ProductSizeResult } from "./productSizeImpact";
import { workbenchFixture } from "./aiadWorkbench.testFixtures";

type RequestBody = ProductSizeInput & { garmentGroupId: ProductGarmentGroupId };
function input(label = "Shahnaz 2", gender: "female" | "male" = "female", version = "Aiad fixture") {
  const prediction = workbenchFixture(); prediction.profile.gender = gender; prediction.model.version = version;
  return selectedPersonSizeInput(prediction, { waist: 99, hips: 113 }, label)!;
}
function result(request: RequestBody): ProductSizeResult {
  const group = PRODUCT_GARMENT_GROUPS.find(item => item.id === request.garmentGroupId)!;
  return { ok: true, schema: "wear-selected-person-size-impact-v2", person: request.person, model: request.model,
    inputs: { predicted: request.predicted, actuals: request.actuals, deductionCm: request.deductionCm },
    catalog: { sha256: "fixture", snapshotAt: "2026-09-01", country: "US", seed: "fixture",
      group: { id: request.garmentGroupId, label: group.label, gender: group.gender, products: 100 } },
    counts: { total: 100, same: 100, up: 0, down: 0, changed_unordered: 0, lost_recommendation: 0, gained_recommendation: 0,
      both_unavailable: 0, missingActual: 0, missingPrediction: 0, unsupported: 0, predictedAvailable: 100,
      bothRecommended: 100, referenceRecommended: 100, modelUnavailableOnReference: 0, missingPredictionOnReference: 0,
      samePct: 100, changedPct: 0, changedOrLostPct: 0, correctPct: 100, largerPct: 0, smallerPct: 0,
      changedUnorderedPct: 0, modelUnavailablePct: 0, pairedCoveragePct: 100, changedOrUnavailablePct: 0 },
    products: Array.from({ length: 100 }, (_, index) => ({ id: `fixture:${index}`, title: `${request.person.label} item ${index}`, category: group.label, supplier: "fixture",
      predictedSize: request.model.version.includes("V8") ? "L" : "M", referenceSize: "M", outcome: "same", step: 0,
      predictionReason: null, referenceReason: null, issues: [], warnings: [], basis: "body", stockSizes: ["S", "M", "L"],
      chartOnlySizes: [], stockOnlySizes: [], tapeFields: ["waist", "hips"], ignoredFields: [], charts: [], missingActual: [], missingPrediction: [] })),
    cameraAppliedToTape: false, sourceDataModified: false,
  };
}
beforeEach(() => vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => ({ ok: true, json: async () => result(JSON.parse(String(options.body))) }))));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("real product size-impact table", () => {
  it("runs only on click and compares Aiad and V8 against the same 100-product group", async () => {
    render(<ProductSizeImpactPanel inputs={{ aiad: input(), v8: input("Shahnaz 2", "female", "Legacy V8") }} personLabel="Shahnaz 2" gender="female" />);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Compare 100 Women’s pants/ }));
    await screen.findByText("Shahnaz 2 item 0");
    expect(fetch).toHaveBeenCalledTimes(2);
    const sent = vi.mocked(fetch).mock.calls.map(call => JSON.parse(String(call[1]!.body)) as RequestBody);
    expect(sent.every(body => body.garmentGroupId === "female-pants" && body.person.label === "Shahnaz 2")).toBe(true);
    expect(screen.getByRole("columnheader", { name: "Real tape → size" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Aiad tape → size impact" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "V8 tape → size impact" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Commercial garment-size percentages" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Correct size" })).toBeTruthy();
    expect(screen.getAllByText("100.0%").length).toBeGreaterThan(0);
  });

  it("switches among the qualified 100-product garment groups", async () => {
    render(<ProductSizeImpactPanel inputs={{ aiad: input(), v8: null }} personLabel="Shahnaz 2" gender="female" />);
    fireEvent.change(screen.getByRole("combobox", { name: "Product garment group" }), { target: { value: "female-dresses" } });
    fireEvent.click(screen.getByRole("button", { name: /Compare 100 Women’s dresses/ }));
    await screen.findByText("Shahnaz 2 item 0");
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]![1]!.body)).garmentGroupId).toBe("female-dresses");
  });

  it("cancels an old person request and never displays it under another person", async () => {
    let finish!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    const view = render(<ProductSizeImpactPanel inputs={{ aiad: input(), v8: null }} personLabel="Shahnaz 2" gender="female" />);
    fireEvent.click(screen.getByRole("button", { name: /Compare 100 Women’s pants/ }));
    const oldSignal = vi.mocked(fetch).mock.calls[0]![1]!.signal!;
    view.rerender(<ProductSizeImpactPanel inputs={{ aiad: input("Shane", "male"), v8: null }} personLabel="Shane" gender="male" />);
    expect(oldSignal.aborted).toBe(true);
    await act(async () => finish({ ok: true, json: async () => result({ ...input(), garmentGroupId: "female-pants" }) } as Response));
    expect(screen.queryByText("Shahnaz 2 item 0")).toBeNull();
  });

  it("invalidates old results when real tape changes without automatically rerunning", async () => {
    const aiad = input();
    const view = render(<ProductSizeImpactPanel inputs={{ aiad, v8: null }} personLabel="Shahnaz 2" gender="female" />);
    fireEvent.click(screen.getByRole("button", { name: /Compare 100 Women’s pants/ }));
    await screen.findByText("Shahnaz 2 item 0");
    view.rerender(<ProductSizeImpactPanel inputs={{ aiad: { ...aiad, actuals: { ...aiad.actuals, waist: 90 } }, v8: null }} personLabel="Shahnaz 2" gender="female" />);
    expect(screen.queryByText("Shahnaz 2 item 0")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("waits for a model and keeps clothing sensitivity explicitly opt in", async () => {
    const view = render(<ProductSizeImpactPanel inputs={{ aiad: null, v8: null }} personLabel="Upload" gender="female" />);
    expect((screen.getByRole("button", { name: /Compare 100 Women’s pants/ }) as HTMLButtonElement).disabled).toBe(true);
    view.rerender(<ProductSizeImpactPanel inputs={{ aiad: { ...input(), actuals: {} }, v8: null }} personLabel="Upload" gender="female" />);
    expect(screen.getByText(/No real tape is stored/)).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "Product-size clothing sensitivity" }), { target: { value: "2" } });
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Compare 100 Women’s pants/ }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]![1]!.body)).deductionCm).toBe(2);
  });
});

// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiadPhotoWorkbench } from "./AiadPhotoWorkbench";
import type { AiadCameraMode } from "./aiadWorkbenchGeometry";
import { cameraFixture, workbenchFixture } from "./aiadWorkbench.testFixtures";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
  });
  Element.prototype.setPointerCapture = vi.fn();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function fixtureView(calibrate = vi.fn(async () => cameraFixture().prediction)) {
  const prediction = workbenchFixture();
  function TestEditor() {
    const [mode, setMode] = useState<AiadCameraMode>("raw");
    return <AiadPhotoWorkbench prediction={prediction} imageUrl="/front-fixture.png" imageSize={{ width: 1200, height: 1600 }} actuals={{ waist: 84, hips: 106 }} cameraMode={mode} onCameraModeChange={setMode} onCalibrate={calibrate} />;
  }
  return { ...render(<TestEditor />), prediction, calibrate };
}

describe("Aiad full-screen line editor", () => {
  it("updates width and inferred depth while the mouse is down, never the tape", () => {
    const { container, prediction, calibrate } = fixtureView();
    const overlay = screen.getByTestId("aiad-line-overlay");
    vi.spyOn(overlay, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000, toJSON() {} });
    const edge = container.querySelector('[data-row-kind="waist"] [data-drag-mode="right"]')!;
    fireEvent.pointerDown(edge, { clientX: 650, clientY: 500, pointerId: 1, button: 0 });
    fireEvent.pointerMove(overlay, { clientX: 750, clientY: 500, pointerId: 1 });
    expect(screen.getByTestId("aiad-width-waist").textContent).toBe("40.0 cm");
    expect(screen.getByTestId("aiad-depth-waist").textContent).toBe("32.0 cm");
    expect(screen.getByTestId("aiad-tape-waist").textContent).toContain("85.00");
    expect(prediction.rows[3]!.widthCm).toBe(30);
    expect(calibrate).not.toHaveBeenCalled();
    expect(overlay.querySelectorAll("circle")).toHaveLength(0);
    fireEvent.pointerUp(overlay, { pointerId: 1 });
  });

  it("keeps depth edits through fullscreen, escape and reopen, and supports reset", () => {
    fixtureView();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Waist depth in cm" }), { target: { value: "28" } });
    expect(screen.getByTestId("aiad-depth-waist").textContent).toBe("28.0 cm");
    fireEvent.click(screen.getByRole("button", { name: "Open full screen" }));
    const dialog = screen.getByRole("dialog", { name: "Aiad full-screen measurement editor" });
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getAllByTestId("aiad-photo-workbench")).toHaveLength(1);
    expect(screen.getByTestId("aiad-depth-waist").textContent).toBe("28.0 cm");
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(document.body.style.overflow).not.toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Open full screen" }));
    expect(screen.getByTestId("aiad-depth-waist").textContent).toBe("28.0 cm");
    fireEvent.click(screen.getByRole("button", { name: "Reset all edits" }));
    expect(screen.getByTestId("aiad-depth-waist").textContent).toBe("24.0 cm");
    expect(screen.getByTestId("aiad-tape-waist").textContent).toContain("85.00");
  });

  it("switches camera modes while keeping manual depth separate and raw tape fixed", async () => {
    const { calibrate } = fixtureView();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Waist depth in cm" }), { target: { value: "28" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Apple + Depth Pro" })));
    expect(screen.getByTestId("aiad-width-waist").textContent).toBe("32.0 cm");
    expect(screen.getByTestId("aiad-depth-waist").textContent).toBe("28.0 cm");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Apple Vision" })));
    expect(screen.getByTestId("aiad-width-waist").textContent).toBe("33.0 cm");
    fireEvent.click(screen.getByRole("button", { name: "Aiad" }));
    expect(screen.getByTestId("aiad-width-waist").textContent).toBe("30.0 cm");
    expect(screen.getByTestId("aiad-tape-waist").textContent).toContain("85.00");
    expect(calibrate).toHaveBeenCalledTimes(1);
  });

  it("shows a camera error without removing the photo, controls or raw predictions", async () => {
    fixtureView(vi.fn().mockRejectedValue(new Error("Worker offline")));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Apple Vision" })));
    expect(screen.getByRole("alert").textContent).toContain("Worker offline");
    expect(screen.getByRole("button", { name: "Retry camera" })).toBeTruthy();
    expect(screen.getByTestId("aiad-width-waist").textContent).toBe("30.0 cm");
    fireEvent.change(screen.getByRole("slider", { name: "Waist A-to-B span" }), { target: { value: "40" } });
    expect(screen.getByTestId("aiad-width-waist").textContent).toBe("40.0 cm");
    expect(screen.getByAltText("Front photo for Aiad measurement editing")).toBeTruthy();
  });

  it("shows Aiad's shoulder guide and restores original outputs after a manual comparison", () => {
    const { container } = fixtureView();
    expect(container.querySelectorAll("g[data-row-kind]")).toHaveLength(6);
    expect(screen.getByTestId("aiad-review-mode").textContent).toBe("Original Aiad");
    fireEvent.click(screen.getByRole("button", { name: "Shoulder" }));
    expect(screen.getByTestId("aiad-selected-width").textContent).toBe("40.0cm");
    expect(screen.getByTestId("aiad-guide-provenance").textContent).toContain("Aiad’s original row_endpoints helper");
    expect(screen.getByTestId("aiad-selected-tape").textContent).toBe("Not provided for this row");
    fireEvent.change(screen.getByRole("slider", { name: "Shoulder A-to-B span" }), { target: { value: "40" } });
    expect(screen.getByTestId("aiad-review-mode").textContent).toBe("Our comparison");
    expect(screen.getByTestId("aiad-guide-provenance").textContent).toContain("your manual edit");
    fireEvent.click(screen.getByRole("button", { name: "Restore Aiad original" }));
    expect(screen.getByTestId("aiad-review-mode").textContent).toBe("Original Aiad");
    expect(screen.getByTestId("aiad-selected-width").textContent).toBe("40.0cm");
  });
});

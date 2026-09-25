import { describe, expect, it } from "vitest";
import { aiadCameraLineOverrides, aiadGeometryPreview, aiadLines, aiadSourceLevels, dragAiadLine, resizeAiadLine } from "./aiadWorkbenchGeometry";
import { cameraFixture, workbenchFixture } from "./aiadWorkbench.testFixtures";

describe("Aiad manual geometry never changes model outputs", () => {
  it("updates span-scaled width and ratio depth immediately, keeping raw tape immutable", () => {
    const prediction = workbenchFixture();
    const original = structuredClone(prediction);
    prediction.rows.forEach(Object.freeze); Object.freeze(prediction.rows); Object.freeze(prediction);
    const lines = aiadLines(prediction);
    lines.waist = { ...lines.waist!, rightX: .8 };
    const waist = aiadGeometryPreview(prediction, lines, "raw", {}, {}).find((row) => row.kind === "waist")!;
    expect(waist.widthCm).toBeCloseTo(45);
    expect(waist.depthCm).toBeCloseTo(36);
    expect(waist.tapeCm).toBe(85);
    expect(waist.scaledPreview).toBe(true);
    expect(prediction).toEqual(original);
  });

  it("does not invent a different width or tape from only moving the line vertically", () => {
    const prediction = workbenchFixture(); const lines = aiadLines(prediction);
    lines.waist = { ...lines.waist!, y: .6 };
    const waist = aiadGeometryPreview(prediction, lines, "raw", {}, {}).find((row) => row.kind === "waist")!;
    expect(waist.widthCm).toBeCloseTo(30);
    expect(waist.tapeCm).toBe(85);
    expect(waist.line?.y).toBe(.6);
    expect(waist.lineEdited).toBe(true);
  });

  it("selects independent Apple/Depth Pro scales without confusing them with raw Aiad", () => {
    const prediction = workbenchFixture(); const lines = aiadLines(prediction); const snapshot = cameraFixture();
    const cache = { apple: snapshot, "apple-depth": snapshot };
    expect(aiadGeometryPreview(prediction, lines, "raw", cache, {}).find((row) => row.kind === "waist")!.widthCm).toBeCloseTo(30);
    expect(aiadGeometryPreview(prediction, lines, "apple", cache, {}).find((row) => row.kind === "waist")!.widthCm).toBeCloseTo(33);
    expect(aiadGeometryPreview(prediction, lines, "apple-depth", cache, {}).find((row) => row.kind === "waist")!.widthCm).toBeCloseTo(32);
  });

  it("marks Depth Pro's Apple fallback, and uses the original guide scale for raw fallback", () => {
    const prediction = workbenchFixture(); const lines = aiadLines(prediction); const snapshot = cameraFixture(33, null);
    let waist = aiadGeometryPreview(prediction, lines, "apple-depth", { "apple-depth": snapshot }, {}).find((row) => row.kind === "waist")!;
    expect(waist.source).toBe("apple"); expect(waist.fallback).toBe(true);
    snapshot.prediction.cameraFusion!.rows[3]!.appleVisionWidthCm = null;
    lines.waist = { ...lines.waist!, rightX: .8 };
    snapshot.lines = structuredClone(lines);
    waist = aiadGeometryPreview(prediction, lines, "apple-depth", { "apple-depth": snapshot }, {}).find((row) => row.kind === "waist")!;
    expect(waist.source).toBe("raw"); expect(waist.widthCm).toBeCloseTo(45);
  });

  it("keeps manual cm depth fixed, while manual ratio follows the changing width", () => {
    const prediction = workbenchFixture(); const lines = aiadLines(prediction);
    lines.waist = { ...lines.waist!, rightX: .8 };
    expect(aiadGeometryPreview(prediction, lines, "raw", {}, { waist: { type: "cm", value: 25 } }).find((row) => row.kind === "waist")!.depthCm).toBe(25);
    expect(aiadGeometryPreview(prediction, lines, "raw", {}, { waist: { type: "ratio", value: .9 } }).find((row) => row.kind === "waist")!.depthCm).toBeCloseTo(40.5);
    expect(prediction.rows[3]!.depthCm).toBe(24);
  });

  it("keeps all six supplied guides, but sends only supported rows to the camera adapter", () => {
    const prediction = workbenchFixture(); const lines = aiadLines(prediction);
    expect(Object.keys(lines)).toHaveLength(6);
    expect(lines.shoulder).toBeTruthy();
    expect(Object.keys(aiadCameraLineOverrides(lines, prediction))).not.toContain("shoulder");
    const shoulder = aiadGeometryPreview(prediction, lines, "apple-depth", { "apple-depth": cameraFixture() }, {}).find((row) => row.kind === "shoulder")!;
    expect(shoulder.widthCm).toBe(40); expect(shoulder.depthCm).toBe(20);
    expect(shoulder.source).toBe("raw"); expect(shoulder.fallback).toBe(true); expect(shoulder.tapeCm).toBeNull();
  });

  it("does not invent absent guides or lose original width/depth in older saved reports", () => {
    const prediction = workbenchFixture(); delete prediction.aiad!.levels;
    expect(aiadSourceLevels(prediction).find((row) => row.kind === "shoulder")!.line).toBeNull();
    const shoulder = aiadGeometryPreview(prediction, aiadLines(prediction), "raw", {}, {}).find((row) => row.kind === "shoulder")!;
    expect(shoulder.widthCm).toBe(40); expect(shoulder.lineEdited).toBe(false);
  });

  it("keeps drag and resize coordinates in bounds without flipping A/B", () => {
    const line = { leftX: .35, rightX: .65, y: .5 };
    expect(dragAiadLine(line, "move", 1, 1)).toEqual({ leftX: .695, rightX: .995, y: .995 });
    expect(dragAiadLine(line, "left", 1, 0).leftX).toBe(.64);
    expect(dragAiadLine(line, "right", -1, 0).rightX).toBe(.36);
    const resized = resizeAiadLine(line, 2);
    expect(resized.leftX).toBeCloseTo(.005); expect(resized.rightX).toBeCloseTo(.995);
  });
});

// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FreshGeometryPrediction } from "./freshGeometryTypes";
import { aiadLines } from "./aiadWorkbenchGeometry";
import { cameraFixture, workbenchFixture } from "./aiadWorkbench.testFixtures";
import { useAiadCameraComparison } from "./useAiadCameraComparison";

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Aiad camera request coordination", () => {
  it("coalesces rapid edits into one latest-endpoint request", async () => {
    const calibrate = vi.fn(async () => cameraFixture().prediction);
    const { result } = renderHook(() => useAiadCameraComparison(calibrate));
    const first = aiadLines(workbenchFixture());
    const latest = { ...first, waist: { ...first.waist!, rightX: .75 } };
    act(() => { result.current.request("apple", first); result.current.request("apple", latest); });
    expect(calibrate).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(350); });
    expect(calibrate).toHaveBeenCalledTimes(1);
    expect(calibrate).toHaveBeenCalledWith("apple", latest);
    expect(result.current.cache.apple?.lines).toEqual(latest);
  });

  it("serializes camera work and ignores a response made obsolete by a newer drag", async () => {
    const resolve: Array<(value: FreshGeometryPrediction) => void> = [];
    const calibrate = vi.fn(() => new Promise<FreshGeometryPrediction>((done) => resolve.push(done)));
    const { result } = renderHook(() => useAiadCameraComparison(calibrate));
    const first = aiadLines(workbenchFixture()); const latest = { ...first, waist: { ...first.waist!, y: .65 } };
    act(() => result.current.request("apple", first, true));
    act(() => result.current.request("apple", latest, true));
    expect(calibrate).toHaveBeenCalledTimes(1);
    await act(async () => resolve[0]!(cameraFixture(99).prediction));
    expect(result.current.cache.apple).toBeUndefined();
    expect(calibrate).toHaveBeenCalledTimes(2);
    await act(async () => resolve[1]!(cameraFixture(34).prediction));
    expect(result.current.cache.apple?.lines).toEqual(latest);
    expect(result.current.cache.apple?.prediction.cameraFusion?.rows[3]?.appleVisionWidthCm).toBe(34);
    expect(result.current.busyMode).toBeNull();
  });

  it("switches to raw immediately and discards the unfinished camera response", async () => {
    let resolve!: (value: FreshGeometryPrediction) => void;
    const calibrate = vi.fn(() => new Promise<FreshGeometryPrediction>((done) => { resolve = done; }));
    const { result } = renderHook(() => useAiadCameraComparison(calibrate)); const lines = aiadLines(workbenchFixture());
    act(() => result.current.request("apple-depth", lines, true));
    act(() => result.current.request("raw", lines, true));
    expect(result.current.busyMode).toBeNull();
    await act(async () => resolve(cameraFixture().prediction));
    expect(result.current.cache).toEqual({});
  });

  it("retains both camera modes for instant switching without another model request", async () => {
    const calibrate = vi.fn(async () => cameraFixture().prediction);
    const { result } = renderHook(() => useAiadCameraComparison(calibrate)); const lines = aiadLines(workbenchFixture());
    await act(async () => result.current.request("apple-depth", lines, true));
    act(() => result.current.request("apple", lines, true));
    act(() => result.current.request("raw", lines, true));
    act(() => result.current.request("apple-depth", lines, true));
    expect(calibrate).toHaveBeenCalledTimes(1);
    expect(result.current.cache.apple).toBeTruthy(); expect(result.current.cache["apple-depth"]).toBeTruthy();
  });

  it("exposes failure and allows an explicit retry", async () => {
    const calibrate = vi.fn().mockRejectedValueOnce(new Error("Worker offline")).mockResolvedValueOnce(cameraFixture().prediction);
    const { result } = renderHook(() => useAiadCameraComparison(calibrate)); const lines = aiadLines(workbenchFixture());
    await act(async () => result.current.request("apple", lines, true));
    expect(result.current.errors.apple).toBe("Worker offline");
    await act(async () => result.current.request("apple", lines, true, true));
    expect(result.current.errors.apple).toBeUndefined(); expect(result.current.cache.apple).toBeTruthy();
  });
});

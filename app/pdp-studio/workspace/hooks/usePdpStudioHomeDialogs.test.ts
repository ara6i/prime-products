import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadPdpStudioAsset } from "../../platform/services/pdpStudioAssetService";
import { createPdpStudioToolJob } from "../../platform/services/pdpStudioJobService";
import type { PdpStudioJob } from "../../platform/types/pdpStudioPlatform";
import { usePdpStudioHomeDialogs } from "./usePdpStudioHomeDialogs";

const watch = vi.fn();
const stop = vi.fn();
const setJob = vi.fn();

vi.mock("../../platform/hooks/usePdpStudioJobProgress", () => ({
  usePdpStudioJobProgress: () => ({
    job: null,
    elapsedSeconds: 0,
    setJob,
    watch,
    stop,
  }),
}));

vi.mock("../../platform/services/pdpStudioAssetService", () => ({
  uploadPdpStudioAsset: vi.fn(),
}));

vi.mock("../../platform/services/pdpStudioJobService", () => ({
  cancelPdpStudioJob: vi.fn(),
  createPdpStudioToolJob: vi.fn(),
  retryPdpStudioJob: vi.fn(),
}));

const queuedJob: PdpStudioJob = {
  id: "job-1",
  parentJobId: null,
  sequence: null,
  toolId: "recolor",
  status: "queued",
  progress: { stage: "Queued", percent: 0 },
  inputAssetIds: ["asset-shopify-1"],
  referenceAssetIds: [],
  outputs: [],
  prompt: null,
  options: {},
  useBrandKit: false,
  provider: "gemini",
  model: null,
  idempotencyId: "request-1",
  error: null,
  attemptCount: 0,
  cancelRequested: false,
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
  startedAt: null,
  completedAt: null,
};

describe("usePdpStudioHomeDialogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createPdpStudioToolJob).mockResolvedValue(queuedJob);
  });

  it("opens a tool with a selected private asset and reuses its id", async () => {
    const { result } = renderHook(() => usePdpStudioHomeDialogs());

    act(() => {
      result.current.openAiTool("recolor", {
        assetId: "asset-shopify-1",
        name: "front-view.jpg",
        previewUrl: "https://example.com/front-view.jpg",
      });
    });

    expect(result.current.activeToolId).toBe("recolor");
    expect(result.current.selectedImage?.assetId).toBe("asset-shopify-1");

    await act(async () => {
      await result.current.generatePreview();
    });

    expect(uploadPdpStudioAsset).not.toHaveBeenCalled();
    expect(createPdpStudioToolJob).toHaveBeenCalledWith(
      "recolor",
      expect.objectContaining({
        inputAssetIds: ["asset-shopify-1"],
        referenceAssetIds: [],
      }),
    );
    expect(watch).toHaveBeenCalledWith(queuedJob);
  });
});

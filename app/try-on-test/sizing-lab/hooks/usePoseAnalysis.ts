"use client";

import { useCallback, useState } from "react";
import { detectPoseAndMask } from "../lib/poseDetector";
import type { PoseResult } from "../types";

type Status = "idle" | "loading" | "ready" | "error";

export function usePoseAnalysis() {
  const [status, setStatus] = useState<Status>("idle");
  const [pose, setPose] = useState<PoseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  const analyze = useCallback(async (
    imageUrl: string,
    refine?: (result: PoseResult) => Promise<PoseResult | null>,
    options: { includeMask?: boolean } = {},
  ): Promise<PoseResult | null> => {
    setStatus("loading");
    setError(null);
    setPose(null);
    const t0 = performance.now();
    try {
      const rawResult = await detectPoseAndMask(imageUrl, { includeMask: options.includeMask ?? true });
      const dt = performance.now() - t0;
      setElapsedMs(Math.round(dt));
      if (!rawResult) {
        setError("MediaPipe returned no usable landmarks");
        setStatus("error");
        return null;
      }
      const result = refine ? await refine(rawResult) : rawResult;
      if (!result) {
        setError("MediaPipe returned no usable measurement mask");
        setStatus("error");
        return null;
      }
      setPose(result);
      setStatus("ready");
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pose detection failed");
      setStatus("error");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setPose(null);
    setError(null);
    setElapsedMs(0);
  }, []);

  return { status, pose, error, elapsedMs, analyze, reset };
}

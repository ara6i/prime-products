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

  const analyze = useCallback(async (imageUrl: string) => {
    setStatus("loading");
    setError(null);
    setPose(null);
    const t0 = performance.now();
    try {
      const result = await detectPoseAndMask(imageUrl);
      const dt = performance.now() - t0;
      setElapsedMs(Math.round(dt));
      if (!result) {
        setError("MediaPipe returned no usable landmarks");
        setStatus("error");
        return;
      }
      setPose(result);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pose detection failed");
      setStatus("error");
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

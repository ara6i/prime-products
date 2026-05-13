"use client";

import { useMemo } from "react";
import { computeTrouserWaist } from "../lib/waistFormula";
import type { MetricsInput, PoseResult, WaistTrace } from "../types";

export function useWaistCalculation(
  pose: PoseResult | null,
  imageWidth: number,
  imageHeight: number,
  metrics: MetricsInput,
): WaistTrace | null {
  return useMemo(() => {
    if (!pose) return null;
    if (!imageWidth || !imageHeight) return null;
    if (!metrics.heightCm || !metrics.weightKg) return null;
    return computeTrouserWaist(
      pose,
      imageWidth,
      imageHeight,
      metrics.heightCm,
      metrics.weightKg,
      metrics.gender,
    );
  }, [pose, imageWidth, imageHeight, metrics.heightCm, metrics.weightKg, metrics.gender]);
}

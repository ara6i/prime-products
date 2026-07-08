"use client";

import { useMemo } from "react";
import { computeTrouserWaist } from "../lib/waistFormula";
import type { MeasurementMaskMode, MetricsInput, PoseResult, WaistTrace } from "../types";

export function useWaistCalculation(
  pose: PoseResult | null,
  imageWidth: number,
  imageHeight: number,
  metrics: MetricsInput,
  sidePose: PoseResult | null = null,
  sideImageWidth = 0,
  sideImageHeight = 0,
  maskMode: MeasurementMaskMode = "ignore-arms",
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
      sidePose,
      sideImageWidth,
      sideImageHeight,
      maskMode,
    );
  }, [pose, imageWidth, imageHeight, metrics.heightCm, metrics.weightKg, metrics.gender, sidePose, sideImageWidth, sideImageHeight, maskMode]);
}

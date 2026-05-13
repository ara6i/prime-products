"use client";

import { useEffect, useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/app/shared/components/ui/button";
import { ImageUploader } from "./components/ImageUploader";
import { MetricsForm } from "./components/MetricsForm";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { ResultCard } from "./components/ResultCard";
import { FormulaPanel } from "./components/FormulaPanel";
import { LandmarkTable } from "./components/LandmarkTable";
import { MaskPreview } from "./components/MaskPreview";
import { HipsCard } from "./components/HipsCard";
import { computeHips } from "./lib/hipsFormula";
import { useImageInput } from "./hooks/useImageInput";
import { usePoseAnalysis } from "./hooks/usePoseAnalysis";
import { useWaistCalculation } from "./hooks/useWaistCalculation";
import type { MetricsInput } from "./types";

const DEFAULT_METRICS: MetricsInput = {
  heightCm: 178,
  weightKg: 80,
  gender: "male",
  unitSystem: "metric",
  braSize: null,
};

export function SizingLabPage() {
  const image = useImageInput();
  const pose = usePoseAnalysis();
  const [metrics, setMetrics] = useState<MetricsInput>(DEFAULT_METRICS);
  const [showMask, setShowMask] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);

  // Reset pose when image cleared
  useEffect(() => {
    if (!image.state.previewUrl) pose.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image.state.previewUrl]);

  const trace = useWaistCalculation(
    pose.pose,
    image.state.width,
    image.state.height,
    metrics,
  );

  // Backend-style hip computation for BOTH genders, sharing the
  // waist trace's cmPerPx so the scale matches.
  const hipsTrace = trace && pose.pose
    ? computeHips(
        pose.pose,
        image.state.width,
        image.state.height,
        metrics.heightCm,
        metrics.weightKg,
        metrics.gender,
        trace.cmPerPx,
      )
    : null;

  const canAnalyze = !!image.state.previewUrl && pose.status !== "loading";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-6 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">AI Sizing Lab</h1>
        <p className="text-sm text-text-secondary">
          Upload a photo, enter height + weight, and watch every step of the
          trouser-waist computation — landmarks, segmentation mask, z-depth,
          ellipse perimeter, and the direct weight lever.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ImageUploader
          previewUrl={image.state.previewUrl}
          onSelect={image.selectFile}
          onClear={image.clear}
          width={image.state.width}
          height={image.state.height}
        />
        <MetricsForm metrics={metrics} onChange={setMetrics} />
      </section>

      <section className="flex items-center gap-3">
        <Button
          onClick={() => image.state.previewUrl && pose.analyze(image.state.previewUrl)}
          disabled={!canAnalyze}
          className="inline-flex items-center gap-2"
        >
          {pose.status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running MediaPipe…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Analyze
            </>
          )}
        </Button>
        {pose.status === "ready" && (
          <span className="text-xs text-text-secondary">
            Detected in {pose.elapsedMs} ms · {pose.pose?.landmarks.length} landmarks · mask{" "}
            {pose.pose?.mask ? `${pose.pose.maskWidth}×${pose.pose.maskHeight}` : "n/a"}
          </span>
        )}
        {pose.status === "error" && (
          <span className="text-xs text-red-600">Error: {pose.error}</span>
        )}
      </section>

      {pose.status === "ready" && (
        <section className="flex items-center gap-4 text-xs">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={showMask} onChange={(e) => setShowMask(e.target.checked)} />
            Mask overlay
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={showLandmarks} onChange={(e) => setShowLandmarks(e.target.checked)} />
            Landmark overlay
          </label>
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Preview</h3>
          {image.state.previewUrl ? (
            <PreviewCanvas
              imageUrl={image.state.previewUrl}
              imageWidth={image.state.width}
              imageHeight={image.state.height}
              pose={pose.pose}
              showMask={showMask}
              showLandmarks={showLandmarks}
            />
          ) : (
            <p className="text-sm text-text-secondary py-8 text-center">Upload an image to see the overlay.</p>
          )}
        </div>
        <div className="space-y-5">
          <ResultCard trace={trace} />
          <HipsCard trace={hipsTrace} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <LandmarkTable pose={pose.pose} />
        <MaskPreview pose={pose.pose} trace={trace} />
      </section>

      <section>
        <FormulaPanel trace={trace} />
      </section>
    </main>
  );
}

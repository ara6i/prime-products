"use client";

import { useCallback } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/shared/components/ui/button";
import { ImageUploadCard } from "./components/ImageUploadCard";
import { DemoProductPicker } from "./components/DemoProductPicker";
import { PromptEditor } from "./components/PromptEditor";
import { LiveTimer } from "./components/LiveTimer";
import { ResultDisplay } from "./components/ResultDisplay";
import { HistoryList } from "./components/HistoryList";
import { ModelSelector } from "./components/ModelSelector";
import { SizingSetupPanel } from "./components/SizingSetupPanel";
import { SizingResultPanel } from "./components/SizingResultPanel";
import { FormulaReferencePanel } from "./components/FormulaReferencePanel";
import { useTryOnTest } from "./hooks/useTryOnTest";
import { useTryOnSizing } from "./hooks/useTryOnSizing";
import { TRY_ON_TEST_CONFIG } from "./lib/config";
import type { DemoLabProductApplyData } from "./lib/demoProducts";
import { describeRunPhase, isLivePhase } from "./lib/runPhase";

export function TryOnTestPage() {
  const { model, garment, stopwatch, prompt, history, modelSelection, submission, canSubmit, run } = useTryOnTest();
  const sizing = useTryOnSizing(TRY_ON_TEST_CONFIG);
  const isLive = isLivePhase(submission.phase);
  const sizingBusy = sizing.status === "sizing" || sizing.status === "previewing";
  const controlsDisabled = isLive || sizingBusy;
  const { applyProductSetup } = sizing;
  const { selectImageUrl } = garment;

  const buildSizing = useCallback(async () => {
    try {
      await sizing.prepare({ modelImage: model.state.dataUri });
      toast.success("Sizing and prompt preview built");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sizing failed");
    }
  }, [model.state.dataUri, sizing]);

  const runWithSizing = useCallback(async () => {
    if (!canSubmit) return;
    try {
      const runData = await sizing.prepare({ modelImage: model.state.dataUri });
      await run(runData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Try-on failed");
    }
  }, [canSubmit, model.state.dataUri, run, sizing]);

  const applyDemoProduct = useCallback(
    async (data: DemoLabProductApplyData) => {
      applyProductSetup(data.product);
      if (!data.imageUrl) throw new Error("Selected product has no image");
      await selectImageUrl(data.imageUrl, data.imageName);
      toast.success(data.hasSizeGuide ? "Demo product loaded" : "Demo product loaded with default chart");
    },
    [applyProductSetup, selectImageUrl],
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Try-On Test Lab</h1>
        <p className="text-sm text-text-secondary">
          Submit a model photo, product image, user sizing data, and a manual size chart. The lab runs AI sizing first,
          previews the backend-built try-on prompt, then sends the same sizing context into try-on.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ImageUploadCard
          label="Model photo"
          hint="Full-body customer photo"
          previewUrl={model.state.previewUrl}
          isCompressing={model.state.isCompressing}
          bytes={model.state.bytes}
          onSelect={model.selectFile}
          onClear={model.clear}
        />
        <div className="flex flex-col gap-4">
          <ImageUploadCard
            label="Garment"
            hint="Product image — flat lay or model-worn"
            previewUrl={garment.state.previewUrl}
            isCompressing={garment.state.isCompressing}
            bytes={garment.state.bytes}
            onSelect={garment.selectFile}
            onClear={garment.clear}
          />
          <DemoProductPicker baseUrl={TRY_ON_TEST_CONFIG.baseUrl} disabled={controlsDisabled} onApply={applyDemoProduct} />
        </div>
      </section>

      <SizingSetupPanel sizing={sizing} disabled={controlsDisabled} onBuild={buildSizing} />

      <section className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <ModelSelector
            value={modelSelection.modelId}
            onChange={modelSelection.setModelId}
            disabled={isLive}
            entry={modelSelection.entry}
          />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <PromptEditor
            value={prompt.customPrompt}
            onChange={prompt.setCustomPrompt}
            useDefault={prompt.useDefault}
            onToggleUseDefault={prompt.setUseDefault}
            disabled={controlsDisabled}
            acceptsPrompt={modelSelection.entry.acceptsPrompt}
          />
        </div>
      </section>

      <SizingResultPanel prepared={sizing.prepared} />

      <section className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-5">
        <ResultDisplay
          modelPreviewUrl={model.state.previewUrl}
          garmentPreviewUrl={garment.state.previewUrl}
          resultImageUrl={submission.result?.imageUrl ?? null}
          phase={submission.phase}
        />
        <div className="flex flex-col gap-4">
          <LiveTimer elapsedMs={stopwatch.elapsedMs} phase={submission.phase} timings={submission.timings} />
          <Button type="button" onClick={runWithSizing} disabled={!canSubmit || sizingBusy} size="2xl" className="w-full text-sm">
            <Play className="size-4" />
            {sizingBusy ? "Building sizing..." : describeRunPhase(submission.phase)}
          </Button>
          {submission.errorMessage && submission.phase === "error" && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{submission.errorMessage}</p>
          )}
        </div>
      </section>

      <section>
        <HistoryList entries={history.entries} onClear={history.clear} />
      </section>

      <FormulaReferencePanel />
    </div>
  );
}

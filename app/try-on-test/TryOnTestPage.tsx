"use client";

import { Play } from "lucide-react";
import { Button } from "@/app/shared/components/ui/button";
import { ImageUploadCard } from "./components/ImageUploadCard";
import { PromptEditor } from "./components/PromptEditor";
import { LiveTimer } from "./components/LiveTimer";
import { ResultDisplay } from "./components/ResultDisplay";
import { HistoryList } from "./components/HistoryList";
import { ModelSelector } from "./components/ModelSelector";
import { useTryOnTest } from "./hooks/useTryOnTest";
import { describeRunPhase, isLivePhase } from "./lib/runPhase";

export function TryOnTestPage() {
  const { model, garment, stopwatch, prompt, history, modelSelection, submission, canSubmit, run } = useTryOnTest();
  const isLive = isLivePhase(submission.phase);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Try-On Test Lab</h1>
        <p className="text-sm text-text-secondary">
          Submit a model photo, a garment, and (optionally) a custom prompt. Times every leg of the pipeline so you can
          measure how prompt content affects Gemini latency.
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
        <ImageUploadCard
          label="Garment"
          hint="Product image — flat lay or model-worn"
          previewUrl={garment.state.previewUrl}
          isCompressing={garment.state.isCompressing}
          bytes={garment.state.bytes}
          onSelect={garment.selectFile}
          onClear={garment.clear}
        />
      </section>

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
            disabled={isLive}
            acceptsPrompt={modelSelection.entry.acceptsPrompt}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-5">
        <ResultDisplay
          modelPreviewUrl={model.state.previewUrl}
          garmentPreviewUrl={garment.state.previewUrl}
          resultImageUrl={submission.result?.imageUrl ?? null}
          phase={submission.phase}
        />
        <div className="flex flex-col gap-4">
          <LiveTimer elapsedMs={stopwatch.elapsedMs} phase={submission.phase} timings={submission.timings} />
          <Button type="button" onClick={run} disabled={!canSubmit} size="2xl" className="w-full text-sm">
            <Play className="size-4" />
            {describeRunPhase(submission.phase)}
          </Button>
          {submission.errorMessage && submission.phase === "error" && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{submission.errorMessage}</p>
          )}
        </div>
      </section>

      <section>
        <HistoryList entries={history.entries} onClear={history.clear} />
      </section>
    </div>
  );
}

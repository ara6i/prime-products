"use client";

import { useState, useCallback } from "react";
import { StepSelector } from "./StepSelector";
import { ResultPanel } from "./ResultPanel";
import { SelectionPanel } from "./SelectionPanel";
import { CatalogPanel } from "./CatalogPanel";
import { useTryOn, estimateTokenCost } from "@/app/try-on/hooks/useTryOn";
import { MODEL_IMAGES } from "@/app/try-on/data/models";
import type { Step, TryOnProductDetail } from "@/app/try-on/types";

export function TryOnContent() {
  const [activeStep, setActiveStep] = useState<Step>("choose-model");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [uploadedModelUrl, setUploadedModelUrl] = useState<string | null>(null);
  const [tryOnProductIds, setTryOnProductIds] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<TryOnProductDetail[]>([]);

  const { status, resultImageUrl, error, generate, reset } = useTryOn();

  const modelImageUrl =
    uploadedModelUrl ??
    (selectedModelId ? MODEL_IMAGES[selectedModelId] : undefined);

  const handleModelSelect = useCallback((id: string) => {
    setSelectedModelId(id);
    setUploadedModelUrl(null);
  }, []);

  const handleUploadedModelSelect = useCallback((url: string) => {
    setUploadedModelUrl(url);
    setSelectedModelId(null);
  }, []);

  const handleToggleTryOn = useCallback(
    (
      productId: string,
      details?: TryOnProductDetail,
    ) => {
      setTryOnProductIds((prev) => {
        if (prev.includes(productId)) {
          return prev.filter((id) => id !== productId);
        }
        return [...prev, productId];
      });
      setSelectedProducts((prev) => {
        if (prev.some((product) => product.id === productId)) {
          return prev.filter((product) => product.id !== productId);
        }
        return details ? [...prev, details] : prev;
      });
    },
    [],
  );

  const handleGenerate = useCallback(() => {
    if (!modelImageUrl || selectedProducts.length === 0) return;
    generate({ modelImage: modelImageUrl, garments: selectedProducts });
  }, [modelImageUrl, selectedProducts, generate]);

  const handleRefresh = useCallback(() => {
    reset();
    setSelectedModelId(null);
    setUploadedModelUrl(null);
    setActiveStep("choose-model");
  }, [reset]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[0.833vw] self-stretch">
      <div className="flex min-h-0 flex-1 gap-[0.625vw] self-stretch">
        <div className="flex w-[44.5%] shrink-0 flex-col gap-[0.625vw] overflow-hidden">
          <StepSelector activeStep={activeStep} onStepChange={setActiveStep} />
          <ResultPanel
            hasModel={!!modelImageUrl}
            activeStep={activeStep}
            modelImageUrl={modelImageUrl}
            selectedItemCount={tryOnProductIds.length}
            selectedProducts={selectedProducts}
            tryOnStatus={status}
            resultImageUrl={resultImageUrl}
            tryOnError={error}
            tokenCost={estimateTokenCost(tryOnProductIds.length)}
            onUploadClick={() => setActiveStep("choose-model")}
            onChooseModelClick={() => setActiveStep("choose-model")}
            onGenerate={handleGenerate}
            onRefresh={handleRefresh}
          />
        </div>

        <SelectionPanel
          selectedModelId={selectedModelId}
          onModelSelect={handleModelSelect}
          onUploadedModelSelect={handleUploadedModelSelect}
          className={activeStep !== "choose-model" ? "hidden" : undefined}
        />
        <CatalogPanel
          tryOnProductIds={tryOnProductIds}
          onToggleTryOn={handleToggleTryOn}
          previewImageUrl={resultImageUrl ?? modelImageUrl}
          onGenerate={handleGenerate}
          onChooseModel={() => setActiveStep("choose-model")}
          className={activeStep !== "try-on" ? "hidden" : undefined}
        />
      </div>
    </div>
  );
}

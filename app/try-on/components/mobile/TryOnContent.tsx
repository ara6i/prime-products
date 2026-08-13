"use client";

import { useState, useCallback } from "react";
import { MobileModelPicker } from "./MobileModelPicker";
import { MobileTryOnWorkspace } from "./MobileTryOnWorkspace";
import { ViewPiecesSheet } from "./ViewPiecesSheet";
import { useTryOn } from "@/app/try-on/hooks/useTryOn";
import { useCatalogPanel } from "@/app/try-on/hooks/useCatalogPanel";
import { uploadPhoto } from "@/app/try-on/services/vto.service";
import { MODEL_IMAGES } from "@/app/try-on/data/models";
import type {
  Step,
  SelectionTab,
  TryOnProductDetail,
} from "@/app/try-on/types";

export function TryOnContent() {
  const [activeStep, setActiveStep] = useState<Step>("choose-model");
  const [selectionTab, setSelectionTab] =
    useState<SelectionTab>("choose-model");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [previewModelId, setPreviewModelId] = useState<string | null>(null);
  const [uploadedModelUrl, setUploadedModelUrl] = useState<string | null>(null);
  const [tryOnProductIds, setTryOnProductIds] = useState<string[]>([]);
  const [showViewPiecesSheet, setShowViewPiecesSheet] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<TryOnProductDetail[]>([]);

  const { status, resultImageUrl, error, generate, reset } = useTryOn();

  const { sentinelRef: catalogSentinelRef, ...catalog } = useCatalogPanel({
    tryOnProductIds,
  });

  const modelImageUrl =
    uploadedModelUrl ??
    (selectedModelId ? MODEL_IMAGES[selectedModelId] : undefined);

  const handleModelSelect = useCallback((id: string) => {
    setSelectedModelId(id);
    setUploadedModelUrl(null);
    setUploadedFileName(null);
  }, []);

  const handleUploadFileSelect = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadedFileName(file.name);
      setUploadedModelUrl(null);
      try {
        const url = await uploadPhoto(file);
        setUploadedModelUrl(url);
        setSelectedModelId(null);
      } catch {
        setUploadedFileName(null);
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  const handleClearUpload = useCallback(() => {
    setUploadedModelUrl(null);
    setUploadedFileName(null);
  }, []);

  const handleSaveUploadedModel = useCallback(() => {
    setActiveStep("try-on");
  }, []);

  const handleSavePreviewModel = useCallback(() => {
    if (!previewModelId) return;
    handleModelSelect(previewModelId);
    setActiveStep("try-on");
  }, [previewModelId, handleModelSelect]);

  const handleStepChange = useCallback(
    (step: Step) => {
      if (step === "choose-model") {
        setPreviewModelId(selectedModelId);
        setSelectionTab("choose-model");
      }
      setActiveStep(step);
    },
    [selectedModelId],
  );

  const handleToggleTryOn = useCallback(
    (productId: string, details?: TryOnProductDetail) => {
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

  const handleRemovePiece = useCallback((productId: string) => {
    setTryOnProductIds((prev) => prev.filter((id) => id !== productId));
    setSelectedProducts((prev) =>
      prev.filter((product) => product.id !== productId),
    );
  }, []);

  const handleGenerate = useCallback(() => {
    if (!modelImageUrl || selectedProducts.length === 0) return;
    generate({ modelImage: modelImageUrl, garments: selectedProducts });
  }, [modelImageUrl, selectedProducts, generate]);

  const handleRefresh = useCallback(() => {
    reset();
    setSelectedModelId(null);
    setPreviewModelId(null);
    setUploadedModelUrl(null);
    setUploadedFileName(null);
    setSelectionTab("choose-model");
    setActiveStep("choose-model");
  }, [reset]);

  const isTryOnStep = activeStep === "try-on";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 self-stretch">
      {isTryOnStep ? (
        modelImageUrl ? (
          <MobileTryOnWorkspace
            modelImageUrl={modelImageUrl}
            selectedProducts={selectedProducts}
            tryOnProductIds={tryOnProductIds}
            tryOnStatus={status}
            resultImageUrl={resultImageUrl}
            tryOnError={error}
            catalog={catalog}
            catalogSentinelRef={catalogSentinelRef}
            onRefresh={handleRefresh}
            onChooseModel={() => handleStepChange("choose-model")}
            onViewPieces={() => setShowViewPiecesSheet(true)}
            onToggleTryOn={handleToggleTryOn}
            onGenerate={handleGenerate}
          />
        ) : (
          <MobileModelPicker
            activeSource={selectionTab}
            onSourceChange={setSelectionTab}
            previewModelId={previewModelId}
            onPreviewModelSelect={setPreviewModelId}
            onSaveModel={handleSavePreviewModel}
            onFileSelect={handleUploadFileSelect}
            isUploading={isUploading}
            uploadedFileName={uploadedFileName}
            onClearUpload={handleClearUpload}
            onSaveUploadedModel={handleSaveUploadedModel}
            canSaveUpload={!!uploadedModelUrl && !isUploading}
          />
        )
      ) : (
        <MobileModelPicker
          activeSource={selectionTab}
          onSourceChange={setSelectionTab}
          previewModelId={previewModelId}
          onPreviewModelSelect={setPreviewModelId}
          onSaveModel={handleSavePreviewModel}
          onFileSelect={handleUploadFileSelect}
          isUploading={isUploading}
          uploadedFileName={uploadedFileName}
          onClearUpload={handleClearUpload}
          onSaveUploadedModel={handleSaveUploadedModel}
          canSaveUpload={!!uploadedModelUrl && !isUploading}
        />
      )}

      <ViewPiecesSheet
        isOpen={showViewPiecesSheet}
        onClose={() => setShowViewPiecesSheet(false)}
        pieces={selectedProducts}
        onRemovePiece={handleRemovePiece}
      />
    </div>
  );
}

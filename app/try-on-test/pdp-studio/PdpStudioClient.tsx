"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Cpu,
  ImageIcon,
  Loader2,
  MessageSquareText,
  PackageSearch,
  Play,
  Search,
  Shirt,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/shared/components/ui/dropdown-menu";
import { cn } from "@/app/shared/lib/utils";
import { ImageUploadCard } from "../components/ImageUploadCard";
import { LiveTimer } from "../components/LiveTimer";
import { ResultDisplay } from "../components/ResultDisplay";
import { useImageFile } from "../hooks/useImageFile";
import { useStopwatch } from "../hooks/useStopwatch";
import { useTryOnSubmission } from "../hooks/useTryOnSubmission";
import { canSubmitTryOn } from "../lib/canSubmit";
import { fetchDemoProductOptions, type DemoLabProductOption } from "../lib/demoProducts";
import { TRY_ON_TEST_CONFIG } from "../lib/config";
import { getModelEntry, TRY_ON_MODELS, type TryOnModelEntry, type TryOnModelId } from "../lib/models";
import { describeRunPhase, isLivePhase } from "../lib/runPhase";

const PDP_STUDIO_MODELS = TRY_ON_MODELS.filter((model) => model.family === "gemini" || model.family === "openai");
const PDP_STUDIO_API_CONFIG = {
  ...TRY_ON_TEST_CONFIG,
  apiKey:
    process.env.NEXT_PUBLIC_PRIMESTYLE_TEST_LAB_API_KEY ??
    process.env.NEXT_PUBLIC_TEST_LAB_API_KEY ??
    TRY_ON_TEST_CONFIG.apiKey,
  apiPrefix: "/api/test-lab/sdk-mirror",
} as const;
const DEFAULT_PDP_GEMINI_MODEL: TryOnModelId = "gemini-3-pro-image-preview";

export function PdpStudioClient() {
  const photo = useImageFile("Photo input");
  const cloth = useImageFile("Cloth input");
  const stopwatch = useStopwatch();
  const submission = useTryOnSubmission(PDP_STUDIO_API_CONFIG);
  const [selectedModelId, setSelectedModelId] = useState<TryOnModelId>(DEFAULT_PDP_GEMINI_MODEL);
  const [prompt, setPrompt] = useState("");
  const [products, setProducts] = useState<DemoLabProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [applyingProductId, setApplyingProductId] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDemoProductOptions(TRY_ON_TEST_CONFIG.baseUrl)
      .then((items) => {
        if (!cancelled) setProducts(items);
      })
      .catch((error) => {
        if (!cancelled) setProductError(error instanceof Error ? error.message : "Failed to load demo products.");
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );
  const selectedModel = useMemo(() => getModelEntry(selectedModelId), [selectedModelId]);
  const promptToSend = prompt.trim();
  const promptInvalid = promptToSend.length === 0;
  const isLive = isLivePhase(submission.phase);
  const canGenerate = canSubmitTryOn({
    modelDataUri: photo.state.dataUri,
    garmentDataUri: cloth.state.dataUri,
    isModelCompressing: photo.state.isCompressing,
    isGarmentCompressing: cloth.state.isCompressing || !!applyingProductId,
    isCustomPromptInvalid: promptInvalid,
    phase: submission.phase,
  });

  const visibleProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      [product.name, product.brand, product.category].some((value) => value.toLowerCase().includes(query)),
    );
  }, [productSearch, products]);

  const applyProductImage = async (product: DemoLabProductOption) => {
    setSelectedProductId(product.id);
    setProductDropdownOpen(false);

    if (!product.imageUrl) {
      setProductError(`${product.name} does not have an image.`);
      return;
    }

    setProductError(null);
    setApplyingProductId(product.id);
    try {
      await cloth.selectImageUrl(product.imageUrl, `${product.name || "demo-product"}.jpg`);
    } catch (error) {
      setProductError(error instanceof Error ? error.message : "Failed to select product image.");
    } finally {
      setApplyingProductId(null);
    }
  };

  const generateTryOn = async () => {
    if (!photo.state.dataUri || !cloth.state.dataUri) {
      toast.error("Add both photo and cloth images first.");
      return;
    }
    if (!promptToSend) {
      toast.error("Write a prompt before generating.");
      return;
    }
    if (!canGenerate) return;

    submission.reset();
    stopwatch.start();

    try {
      await submission.run({
        modelImage: photo.state.dataUri,
        garmentImage: cloth.state.dataUri,
        customPrompt: promptToSend,
        model: selectedModelId,
        productTitle: selectedProduct?.name,
      });
      stopwatch.stop();
      toast.success("PDP try-on generated");
    } catch (error) {
      stopwatch.stop();
      toast.error(error instanceof Error ? error.message : "Try-on failed");
    }
  };

  return (
    <div className="mt-6 grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <ImageUploadCard
            label="Photo input"
            hint="Upload customer or model photo"
            previewUrl={photo.state.previewUrl}
            isCompressing={photo.state.isCompressing}
            bytes={photo.state.bytes}
            onSelect={photo.selectFile}
            onClear={photo.clear}
          />
          {photo.state.error ? <p className="mt-2 text-xs font-medium text-red-600">{photo.state.error}</p> : null}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <ImageUploadCard
            label="Cloth input"
            hint="Upload cloth image or select demo product"
            previewUrl={cloth.state.previewUrl}
            isCompressing={cloth.state.isCompressing || !!applyingProductId}
            bytes={cloth.state.bytes}
            onSelect={cloth.selectFile}
            onClear={cloth.clear}
          />
          {cloth.state.error ? <p className="mt-2 text-xs font-medium text-red-600">{cloth.state.error}</p> : null}

          <div className="relative mt-4 rounded-xl border border-gray-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <Shirt className="h-4 w-4 text-brand-blue" aria-hidden />
                Demo product image
              </span>
              <span className="text-xs text-slate-400">
                {loadingProducts ? "Loading" : `${products.length} products`}
              </span>
            </div>

            <div className="relative">
              <button
                type="button"
                disabled={loadingProducts || isLive}
                onClick={() => setProductDropdownOpen((open) => !open)}
                className="flex h-14 w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 text-left transition-colors hover:border-brand-blue/60 disabled:cursor-wait disabled:opacity-60"
                aria-expanded={productDropdownOpen}
              >
                <ProductThumb product={selectedProduct} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-950">
                    {selectedProduct?.name ?? (loadingProducts ? "Loading products..." : "Select product image")}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {selectedProduct?.category || "Choose from your full demo catalog"}
                  </span>
                </span>
                {loadingProducts ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-blue" aria-hidden />
                ) : (
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                      productDropdownOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                )}
              </button>

              {productDropdownOpen ? (
                <div className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-30 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-slate-950/10">
                  <label className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                    <Search className="h-4 w-4 text-slate-400" aria-hidden />
                    <input
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                      placeholder="Search products..."
                      className="h-9 min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                    />
                  </label>
                  <div className="max-h-80 overflow-y-auto p-1">
                    {visibleProducts.length ? (
                      visibleProducts.map((product) => {
                        const selected = product.id === selectedProductId;
                        const applying = applyingProductId === product.id;
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => applyProductImage(product)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                              selected ? "bg-brand-blue/10 text-brand-blue" : "hover:bg-gray-50",
                            )}
                          >
                            <ProductThumb product={product} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-950">{product.name}</span>
                              <span className="block truncate text-xs text-slate-500">
                                {product.category || product.brand || "Demo product"}
                              </span>
                            </span>
                            {applying ? (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-blue" aria-hidden />
                            ) : selected ? (
                              <Check className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden />
                            ) : null}
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
                        <PackageSearch className="h-4 w-4" aria-hidden />
                        No products match your search.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {productError ? (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{productError}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="block rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <MessageSquareText className="h-4 w-4 text-brand-blue" aria-hidden />
            Prompt
          </span>
          <PdpStudioModelPicker
            value={selectedModelId}
            entry={selectedModel}
            disabled={isLive}
            onChange={setSelectedModelId}
          />
        </div>
        <input
          type="text"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Write the PDP prompt..."
          className="mt-3 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-slate-950 outline-none transition-colors focus:border-brand-blue"
        />
        <p className="mt-2 text-xs text-slate-500">{selectedModel.description}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-[1fr_320px]">
        <ResultDisplay
          modelPreviewUrl={photo.state.previewUrl}
          garmentPreviewUrl={cloth.state.previewUrl}
          resultImageUrl={submission.result?.imageUrl ?? null}
          phase={submission.phase}
        />
        <div className="flex flex-col gap-4">
          <LiveTimer elapsedMs={stopwatch.elapsedMs} phase={submission.phase} timings={submission.timings} />
          <button
            type="button"
            onClick={generateTryOn}
            disabled={!canGenerate}
            className={cn(
              "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition-colors",
              canGenerate ? "bg-brand-blue hover:bg-brand-blue-dark" : "cursor-not-allowed bg-slate-300",
            )}
          >
            {isLive ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            {describeRunPhase(submission.phase) === "Run try-on" ? "Generate PDP try-on" : describeRunPhase(submission.phase)}
          </button>
          {submission.errorMessage && submission.phase === "error" ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{submission.errorMessage}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ProductThumb({ product }: { product: DemoLabProductOption | null }) {
  if (!product?.imageUrl) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-slate-400">
        <ImageIcon className="h-4 w-4" aria-hidden />
      </span>
    );
  }

  return (
    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={product.imageUrl} alt="" className="h-full w-full object-contain" />
    </span>
  );
}

function PdpStudioModelPicker({
  value,
  entry,
  disabled,
  onChange,
}: {
  value: TryOnModelId;
  entry: TryOnModelEntry;
  disabled: boolean;
  onChange: (next: TryOnModelId) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm font-semibold text-slate-950 outline-none transition-colors hover:border-brand-blue/60 focus-visible:border-brand-blue disabled:cursor-wait disabled:opacity-60 md:w-[360px]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Cpu className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden />
            <span className="min-w-0 truncate">{entry.label}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        avoidCollisions={false}
        className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-2xl border-gray-200 bg-white p-1 text-slate-950"
      >
        {PDP_STUDIO_MODELS.map((model) => {
          const selected = model.id === value;
          return (
            <DropdownMenuItem
              key={model.id}
              onSelect={() => onChange(model.id)}
              className={cn(
                "items-start justify-between gap-3 rounded-xl px-3 py-2 hover:bg-gray-50 focus:bg-gray-50",
                selected && "bg-brand-blue/10 text-brand-blue",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{model.label}</span>
                <span className="block truncate text-xs text-slate-500">
                  {model.family === "openai" ? "OpenAI" : "Gemini"} · {model.status}
                </span>
              </span>
              {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" aria-hidden /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

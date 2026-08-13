"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  List,
  LoaderCircle,
  RotateCcw,
  Shirt,
  X,
} from "lucide-react";
import type {
  IntelligentOutfit,
  StylistTryOnBatchState,
} from "@/app/ai-stylist/types";

interface StylistTryOnBatchViewProps {
  batch: StylistTryOnBatchState;
  outfits: IntelligentOutfit[];
  onBack: () => void;
  onReset: () => void;
}

function terminal(status: StylistTryOnBatchState["status"]): boolean {
  return status === "completed" || status === "partial" || status === "failed";
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatProductPrice(
  price: number | undefined,
  currency = "USD",
): string {
  if (typeof price !== "number" || !Number.isFinite(price)) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

function OutfitLoadingPreview({
  outfit,
}: {
  outfit: IntelligentOutfit | undefined;
}) {
  const items = outfit?.items.slice(0, 4) ?? [];

  return (
    <>
      <div
        className="absolute inset-0 grid min-w-0 gap-2 p-5 opacity-70 blur-[2px]"
        style={{
          gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))`,
        }}
        aria-hidden="true"
      >
        {items.length ? (
          items.map((item) => (
            <div
              key={item.styleRagId}
              className="flex min-w-0 items-center justify-center overflow-hidden rounded-xl bg-white/65"
            >
              {/* Product images are dynamic affiliate/CDN URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.cutoutImageUrl ?? item.imageUrl}
                alt=""
                className="h-full w-full object-contain p-2"
              />
            </div>
          ))
        ) : (
          <div className="rounded-xl bg-[#e4e2e8]" />
        )}
      </div>
    </>
  );
}

export function StylistTryOnBatchView({
  batch,
  outfits,
  onBack,
  onReset,
}: StylistTryOnBatchViewProps) {
  const outfitsById = new Map(outfits.map((outfit) => [outfit.id, outfit]));
  const finishedCount = batch.jobs.filter(
    (job) => job.status === "failed" || job.status === "completed",
  ).length;
  const completedCount = batch.jobs.filter(
    (job) => job.status === "completed",
  ).length;
  const isTerminal = terminal(batch.status);
  const allTryOnsGenerated =
    batch.jobs.length > 0 && finishedCount === batch.jobs.length;
  const showCompletedState = isTerminal || allTryOnsGenerated;
  const [now, setNow] = useState(() => Date.now());
  const [detailsOutfitId, setDetailsOutfitId] = useState<string | null>(null);
  const startedAt =
    batch.startedAt ??
    batch.jobs.find((job) => job.startedAt)?.startedAt ??
    now;
  const rawFinishedAt = allTryOnsGenerated
    ? Math.max(
        ...batch.jobs.map((job) => job.finishedAt ?? now),
      )
    : null;
  const elapsed = (rawFinishedAt ?? batch.finishedAt ?? now) - startedAt;

  useEffect(() => {
    if (showCompletedState) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [showCompletedState]);

  useEffect(() => {
    if (!detailsOutfitId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailsOutfitId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailsOutfitId]);

  const detailsJob = detailsOutfitId
    ? batch.jobs.find((job) => job.outfitId === detailsOutfitId)
    : undefined;
  const detailsOutfit = detailsOutfitId
    ? outfitsById.get(detailsOutfitId)
    : undefined;
  const detailProducts =
    detailsOutfit?.items.map((item) => ({
      id: item.styleRagId,
      name: item.title,
      brand: item.brand ?? item.merchantName,
      category: item.slot,
      imageUrl: item.cutoutImageUrl ?? item.imageUrl,
      price: item.price,
      currency: item.currency,
      recommendedSize: item.recommendedSize,
      sizeStatus: item.sizeStatus,
    })) ??
    detailsJob?.products?.map((item) => ({
      id: item.styleRagId ?? item.id,
      name: item.name,
      brand: item.brand ?? "",
      category: item.category,
      imageUrl: item.imageUrl ?? "",
      price: item.price,
      currency: item.currency ?? "USD",
      recommendedSize: item.recommendedSize,
      sizeStatus: item.sizeStatus,
    })) ??
    [];

  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-white"
      data-testid="stylist-tryon-batch"
    >
      <div className="shrink-0 border-b border-[#e4e2e8] px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#24212c]">
              {showCompletedState
                ? completedCount === batch.jobs.length
                  ? `Your ${batch.jobs.length} try-on${
                      batch.jobs.length === 1 ? "" : "s"
                    } ${batch.jobs.length === 1 ? "is" : "are"} ready`
                  : "Your try-on batch finished"
                : `Generating ${batch.jobs.length} try-ons in parallel`}
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#77737f]">
              {showCompletedState
                ? `${completedCount} of ${batch.jobs.length} outfits rendered successfully.`
                : "All results will appear together when every try-on is ready."}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#fff1b8] px-3 py-1.5 text-xs font-semibold text-[#9b6700]">
            {batch.tokenCost} tokens
          </span>
        </div>

        {!showCompletedState && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-[#77737f]">
              <span>
                {finishedCount} of {batch.jobs.length} rendered
              </span>
              <span className="tabular-nums">{formatElapsed(elapsed)} elapsed</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eceaf0]">
              <div
                className="h-full w-full origin-left rounded-full bg-[#7258fa] transition-transform duration-500 motion-reduce:transition-none"
                style={{
                  transform: `scaleX(${
                    batch.jobs.length
                      ? finishedCount / batch.jobs.length
                      : 0
                  })`,
                }}
              />
            </div>
          </div>
        )}

        {batch.error && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {batch.error}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {batch.jobs.map((job, index) => {
            const outfit = outfitsById.get(job.outfitId);
            const displayImageUrl =
              job.discStatus === "completed" && job.discImageUrl
                ? job.discImageUrl
                : job.imageUrl;
            const ready =
              showCompletedState &&
              job.status === "completed" &&
              displayImageUrl;
            const isGeneratingCard = !showCompletedState;
            const jobStartedAt = job.startedAt ?? startedAt;
            const jobElapsed = (job.finishedAt ?? now) - jobStartedAt;
            return (
              <article
                key={job.outfitId}
                aria-busy={isGeneratingCard}
                className="overflow-hidden rounded-2xl border border-[#dedde3] bg-white"
              >
                <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-[#f4f4f2]">
                  {ready ? (
                    <>
                      {/* Provider images are dynamic Cloudinary URLs. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayImageUrl}
                        alt={`${job.label} virtual try-on`}
                        className="h-full w-full object-contain object-center"
                      />
                      <a
                        href={displayImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${job.label} try-on`}
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-[#5945cb] shadow-sm hover:bg-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      {job.discStatus === "processing" && (
                        <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-[#5f5a68] shadow-sm">
                          <LoaderCircle className="h-3 w-3 animate-spin text-[#7258fa]" />
                          Preparing disc
                        </span>
                      )}
                    </>
                  ) : showCompletedState && job.status === "failed" ? (
                    <div className="px-5 text-center">
                      <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
                      <p className="mt-2 text-xs font-semibold text-red-700">
                        This outfit could not be rendered
                      </p>
                      <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-[#77737f]">
                        {job.error ?? "The provider returned an error."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <OutfitLoadingPreview outfit={outfit} />
                      <div className="relative z-10 mx-5 rounded-2xl bg-white/85 px-4 py-3 text-center shadow-sm backdrop-blur-sm">
                        <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#7258fa] motion-reduce:animate-none" />
                        <p
                          className="mt-2 text-xs font-semibold text-[#5f5a68]"
                          aria-live="polite"
                        >
                          {batch.status === "starting"
                            ? "Creating job"
                            : `Generating · ${formatElapsed(jobElapsed)}`}
                        </p>
                      </div>
                    </>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-[#5945cb] shadow-sm">
                    {index + 1} of {batch.jobs.length}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="truncate text-sm font-semibold text-[#24212c]">
                    {job.label}
                  </h3>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-1 text-[11px] text-[#77737f]">
                      <Shirt className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {outfit?.items.length ?? job.products?.length ?? 0} real
                        catalog pieces
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setDetailsOutfitId(job.outfitId)}
                      className="flex shrink-0 items-center gap-1 rounded-full border border-[#ded8ff] px-2.5 py-1 text-[10px] font-semibold text-[#5945cb] transition-colors hover:bg-[#f3f0ff]"
                    >
                      <List className="h-3 w-3" />
                      View products
                    </button>
                  </div>
                  {job.discStatus === "failed" && (
                    <p className="mt-1 text-[10px] text-amber-700">
                      Try-on ready · disc cleanup unavailable
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {detailsJob && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stylist-products-title"
        >
          <button
            type="button"
            aria-label="Close product details"
            onClick={() => setDetailsOutfitId(null)}
            className="absolute inset-0 bg-[#17141f]/35 backdrop-blur-[2px]"
          />
          <section className="relative z-10 flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e8e6ec] px-5 py-4">
              <div>
                <h3
                  id="stylist-products-title"
                  className="text-base font-semibold text-[#24212c]"
                >
                  Products used
                </h3>
                <p className="mt-1 text-xs text-[#77737f]">
                  {detailsJob.label} · {detailProducts.length}{" "}
                  {detailProducts.length === 1 ? "piece" : "pieces"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close product details"
                onClick={() => setDetailsOutfitId(null)}
                className="rounded-full border border-[#e4e2e8] p-2 text-[#5f5a68] transition-colors hover:bg-[#f4f3f6]"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
              {detailProducts.length ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {detailProducts.map((product) => (
                    <article
                      key={product.id}
                      className="flex min-w-0 gap-3 rounded-2xl border border-[#e4e2e8] p-3"
                    >
                      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f5f4f7]">
                        {product.imageUrl ? (
                          // Product images are dynamic affiliate/CDN URLs.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-contain p-1.5"
                          />
                        ) : null}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-[#8b8792]">
                          {product.category}
                        </span>
                        <h4 className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-[#24212c]">
                          {product.name}
                        </h4>
                        {product.brand && (
                          <p className="mt-1 truncate text-[11px] text-[#77737f]">
                            {product.brand}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] font-semibold text-[#5945cb]">
                          {product.recommendedSize
                            ? `Your size: ${product.recommendedSize}`
                            : product.sizeStatus === "not-needed"
                              ? "No size needed"
                              : "Size recommendation unavailable"}
                        </p>
                        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                          <span className="text-xs font-semibold text-[#24212c]">
                            {formatProductPrice(
                              product.price,
                              product.currency,
                            )}
                          </span>
                          <a
                            href={`/shop/ai-stylist/product/${encodeURIComponent(product.id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-[#2154ef] px-3 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[#1947d6]"
                          >
                            Details
                            <ExternalLink className="size-3" aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-[#f5f4f7] px-4 py-8 text-center text-xs text-[#77737f]">
                  Product details are unavailable for this older session.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {showCompletedState && (
        <div className="flex shrink-0 items-center gap-2 border-t border-[#e4e2e8] bg-white px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-full border border-[#7258fa] px-4 py-2.5 text-xs font-semibold text-[#5945cb] hover:bg-[#f3f0ff]"
          >
            Back to outfits
          </button>
          <button
            type="button"
            onClick={onReset}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#2154ef] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1947d6]"
          >
            <RotateCcw className="h-4 w-4" />
            Start over
          </button>
        </div>
      )}
    </div>
  );
}

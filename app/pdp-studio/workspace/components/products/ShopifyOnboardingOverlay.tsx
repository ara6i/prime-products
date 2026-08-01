"use client";

import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface ShopifyOnboardingOverlayProps {
  open: boolean;
  ready: boolean;
  error: string | null;
  productCount: number;
  productImages: string[];
  storeName: string;
  tourStep: number;
  onTourStepChange: (step: number) => void;
  onRetry: () => void;
  onClose: () => void;
}

const TOUR_CONTENT = [
  {
    title: "Publish listing images directly",
    description:
      "Choose a Shopify product, create or import its visuals, then publish only after an explicit review.",
  },
  {
    title: "Build a complete product image set",
    description:
      "Use your synced listing images as the source for model shots, studio scenes, detail edits, and video.",
  },
  {
    title: "Manage variants at scale",
    description:
      "Keep the product and variant context beside every image so color and material updates stay organized.",
  },
  {
    title: "Keep product metadata attached",
    description:
      "Imported media retains its Shopify product link, making search, reuse, and publishing traceable.",
  },
] as const;

export function ShopifyOnboardingOverlay({
  open,
  ready,
  error,
  productCount,
  productImages,
  storeName,
  tourStep,
  onTourStepChange,
  onRetry,
  onClose,
}: ShopifyOnboardingOverlayProps) {
  if (!open) return null;
  const isRetrieval = tourStep === 0;
  const tour = TOUR_CONTENT[Math.max(0, tourStep - 1)];
  const isLastTourStep = tourStep === TOUR_CONTENT.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopify setup"
      className="fixed inset-0 z-[650] grid place-items-center bg-[#111827]/55 p-3 backdrop-blur-sm"
    >
      <div className="relative grid h-[min(46rem,calc(100vh-1.5rem))] w-full max-w-[70rem] overflow-hidden rounded-[1.5rem] border border-white/20 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.3)] md:grid-cols-[1.05fr_1fr]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Shopify setup"
          className="absolute right-4 top-4 z-20 grid size-9 place-items-center rounded-full border border-[var(--color-pdp-rule)] bg-white text-[var(--color-pdp-ink)] shadow-sm transition hover:bg-[var(--color-pdp-surface-soft)]"
        >
          <PdpStudioUiIcon name="close" size={17} />
        </button>

        <div className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#eef5ff_0%,#f8fbff_46%,#e4efff_100%)] p-8 md:block">
          <div className="absolute -left-20 -top-24 size-64 rounded-full bg-[#8eb8ff]/25 blur-3xl" />
          <div className="absolute -bottom-20 right-0 size-72 rounded-full bg-[#c9dcff]/45 blur-3xl" />
          <div className="relative grid h-full grid-cols-2 gap-3 overflow-hidden rounded-[1.25rem] border border-white/80 bg-white/55 p-3 shadow-inner">
            {(productImages.length ? productImages : Array(6).fill(null)).map(
              (image, index) => (
                <div
                  key={image || `placeholder-${index}`}
                  className="grid min-h-0 place-items-center overflow-hidden rounded-xl border border-white/80 bg-white shadow-sm"
                >
                  {image ? (
                    // Shopify CDN hosts are merchant-specific, so a native image
                    // keeps the catalog compatible without a global allow-list.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt=""
                      className="size-full object-contain"
                    />
                  ) : (
                    <PdpStudioUiIcon
                      name={index % 2 ? "image" : "product"}
                      size={32}
                      className="text-[#93add7]"
                    />
                  )}
                </div>
              ),
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col bg-white px-6 pb-6 pt-16 sm:px-10 sm:pb-10 md:px-12 md:pt-12">
          {isRetrieval ? (
            <>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-pdp-accent)]">
                {storeName}
              </span>
              <h2 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em]">
                {error
                  ? "Store sync needs attention"
                  : ready
                    ? "Your store is ready"
                    : "Retrieving store info…"}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-[var(--color-pdp-muted)]">
                {error ??
                  "We are connecting the installed Shopify app and loading the live catalog into this Space."}
              </p>
              <div className="mt-8 grid gap-3">
                <SetupRow label="Install Shopify app" state="complete" />
                <SetupRow
                  label="Sync products"
                  state={error ? "error" : ready ? "complete" : "loading"}
                  detail={ready ? `${productCount} loaded` : undefined}
                />
                <SetupRow
                  label="Read product metadata"
                  state={ready ? "complete" : "pending"}
                />
                <SetupRow
                  label="Prepare PDP Studio Space"
                  state={ready ? "complete" : "pending"}
                />
              </div>
              <div className="mt-auto flex justify-end pt-8">
                <PdpStudioButton
                  type="button"
                  disabled={!ready && !error}
                  onClick={() => (error ? onRetry() : onTourStepChange(1))}
                  className="min-w-40"
                >
                  {error ? "Try again" : "Continue"}
                </PdpStudioButton>
              </div>
            </>
          ) : tour ? (
            <>
              <span className="text-xs font-medium text-[var(--color-pdp-muted)]">
                Step {tourStep}/{TOUR_CONTENT.length}
              </span>
              <h2 className="mt-3 max-w-md text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em]">
                {tour.title}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-[var(--color-pdp-muted)]">
                {tour.description}
              </p>
              <div className="mt-8 rounded-2xl border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)] p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-white text-[var(--color-pdp-accent)] shadow-sm">
                    <PdpStudioUiIcon
                      name={
                        tourStep === 1
                          ? "shopify"
                          : tourStep === 2
                            ? "sparkles"
                            : tourStep === 3
                              ? "layers"
                              : "image"
                      }
                      size={22}
                    />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      Connected to {storeName}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-pdp-muted)]">
                      {productCount} products available in PDP Studio
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-auto flex justify-end gap-3 pt-8">
                <PdpStudioButton
                  type="button"
                  variant="secondary"
                  onClick={() => onTourStepChange(tourStep - 1)}
                  className="min-w-32"
                >
                  Previous
                </PdpStudioButton>
                <PdpStudioButton
                  type="button"
                  onClick={() =>
                    isLastTourStep
                      ? onClose()
                      : onTourStepChange(tourStep + 1)
                  }
                  className="min-w-36"
                >
                  {isLastTourStep ? "Open products" : "Next"}
                </PdpStudioButton>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SetupRow({
  label,
  state,
  detail,
}: {
  label: string;
  state: "complete" | "loading" | "pending" | "error";
  detail?: string;
}) {
  return (
    <div
      className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 ${
        state === "complete"
          ? "border-[var(--color-pdp-accent)] bg-[var(--color-pdp-accent-soft)]"
          : state === "error"
            ? "border-red-200 bg-red-50"
          : "border-[var(--color-pdp-rule)] bg-white"
      }`}
    >
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
          state === "complete"
            ? "bg-[var(--color-pdp-accent)] text-white"
            : state === "error"
              ? "bg-red-100 text-red-700"
            : state === "loading"
              ? "border-2 border-[var(--color-pdp-accent)] border-r-transparent"
              : "bg-[var(--color-pdp-surface-soft)] text-[var(--color-pdp-muted)]"
        } ${state === "loading" ? "animate-spin" : ""}`}
      >
        {state === "complete" ? (
          <PdpStudioUiIcon name="check" size={13} weight="bold" />
        ) : state === "error" ? (
          <PdpStudioUiIcon name="close" size={13} weight="bold" />
        ) : state === "pending" ? (
          "·"
        ) : null}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      {detail ? (
        <span className="text-xs font-medium text-[var(--color-pdp-accent)]">
          {detail}
        </span>
      ) : null}
    </div>
  );
}

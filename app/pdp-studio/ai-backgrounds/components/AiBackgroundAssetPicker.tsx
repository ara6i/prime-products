"use client";

import Image from "next/image";
import type { ChangeEvent, DragEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import type { AiBackgroundsWorkspaceController } from "../hooks/useAiBackgroundsWorkspace";
import type { AiBackgroundAssetTab } from "../types/aiBackgrounds";
import { PdpStudioButton } from "../../workspace/components/shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../../workspace/components/shared/PdpStudioUiIcon";

const TABS: readonly { id: AiBackgroundAssetTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "uploads", label: "Uploads" },
  { id: "generated", label: "Generated images" },
  { id: "shopify", label: "Shopify products" },
];

interface AiBackgroundAssetPickerProps {
  ui: AiBackgroundsWorkspaceController;
}

export function AiBackgroundAssetPicker({
  ui,
}: AiBackgroundAssetPickerProps) {
  const selected =
    ui.assetPickerPurpose === "reference" ? ui.reference : ui.source;
  const title =
    ui.assetPickerPurpose === "source"
      ? "Choose a product image"
      : ui.assetPickerPurpose === "reference"
        ? "Choose a background reference"
        : "Insert an image";

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0];
    if (file) ui.selectLocalFile(file);
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files).find((candidate) =>
      ["image/png", "image/jpeg", "image/webp"].includes(candidate.type),
    );
    if (file) ui.selectLocalFile(file);
  }

  return (
    <Dialog
      open={ui.assetPickerOpen}
      onOpenChange={(open) => {
        if (!open && ui.editorOpen) ui.setAssetPickerOpen(false);
      }}
    >
      <DialogContent
        showCloseButton={ui.editorOpen}
        className="flex !h-[min(84vh,48rem)] !w-[min(94vw,68rem)] !max-w-none flex-col gap-0 overflow-hidden rounded-[1rem] border-[var(--color-pdp-rule)] bg-white p-0 text-[var(--color-pdp-ink)]"
        overlayClassName="bg-[var(--color-pdp-ink)]/30 backdrop-blur-sm"
      >
        <header className="border-b border-[var(--color-pdp-rule)] px-6 pt-5">
          <DialogTitle className="text-[1.125rem] font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-1 text-[0.8125rem] text-[var(--color-pdp-muted)]">
            Upload a new image or reuse a private image from your Space.
          </DialogDescription>
          <nav className="mt-5 flex gap-5" aria-label="Image library">
            {TABS.map((tab) => (
              <PdpStudioButton
                key={tab.id}
                type="button"
                variant="ghost"
                onClick={() => ui.setAssetTab(tab.id)}
                className={[
                  "min-h-10 rounded-none border-b-2 px-0 text-[0.8125rem] font-medium",
                  ui.assetTab === tab.id
                    ? "border-[var(--color-pdp-accent)] text-[var(--color-pdp-ink)]"
                    : "border-transparent text-[var(--color-pdp-muted)]",
                ].join(" ")}
              >
                {tab.label}
              </PdpStudioButton>
            ))}
          </nav>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <label className="relative mb-4 block">
            <PdpStudioUiIcon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-pdp-muted)]"
            />
            <input
              type="search"
              value={ui.assetQuery}
              onChange={(event) => ui.setAssetQuery(event.target.value)}
              placeholder={
                ui.assetPickerPurpose === "reference"
                  ? "Search generated inspiration"
                  : "Search your images"
              }
              className="h-10 w-full rounded-[0.625rem] border border-[var(--color-pdp-rule)] bg-white pl-9 pr-3 text-[0.75rem] outline-none placeholder:text-[var(--color-pdp-muted)] focus:border-[var(--color-pdp-accent)] focus:ring-2 focus:ring-[var(--color-pdp-accent-soft)]"
            />
          </label>

          <label
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className="flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-[0.75rem] border border-dashed border-[var(--color-pdp-rule-strong)] bg-[var(--color-pdp-surface-soft)] px-5 text-center transition hover:border-[var(--color-pdp-accent)] hover:bg-[var(--color-pdp-accent-soft)]"
          >
            <span className="grid size-9 place-items-center rounded-full bg-white text-[var(--color-pdp-accent)] shadow-sm">
              <PdpStudioUiIcon name="upload" size={17} />
            </span>
            <span className="text-[0.8125rem] font-medium">
              Upload an image{" "}
              <span className="font-normal text-[var(--color-pdp-muted)]">
                or drop it here
              </span>
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          {ui.assetsError ? (
            <p
              role="alert"
              className="mt-4 rounded-[0.625rem] bg-red-50 px-4 py-3 text-[0.75rem] text-red-700"
            >
              {ui.assetsError}
            </p>
          ) : null}

          {ui.assetsLoading && ui.assets.length === 0 ? (
            <div className="grid min-h-64 place-items-center text-[0.8125rem] text-[var(--color-pdp-muted)]">
              Loading your private images…
            </div>
          ) : ui.assets.length ? (
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {ui.assets.map((asset) => {
                const active = selected?.asset?.id === asset.id;
                return (
                  <PdpStudioButton
                    key={asset.id}
                    type="button"
                    variant="ghost"
                    aria-pressed={active}
                    onClick={() => ui.selectAsset(asset)}
                    className={[
                      "group relative aspect-square h-auto min-h-0 overflow-hidden rounded-[0.7rem] border bg-[var(--color-pdp-surface-soft)] p-0",
                      active
                        ? "border-2 border-[var(--color-pdp-accent)]"
                        : "border-[var(--color-pdp-rule)]",
                    ].join(" ")}
                  >
                    <Image
                      src={asset.url}
                      alt={asset.originalName ?? "PDP Studio image"}
                      fill
                      unoptimized
                      sizes="12rem"
                      className="object-contain"
                    />
                    {active ? (
                      <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[var(--color-pdp-accent)] text-white">
                        <PdpStudioUiIcon name="check" size={13} weight="bold" />
                      </span>
                    ) : null}
                  </PdpStudioButton>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center text-center">
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-full bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
                  <PdpStudioUiIcon
                    name={ui.assetTab === "shopify" ? "shopify" : "image"}
                    size={19}
                  />
                </span>
                <p className="mt-3 text-[0.875rem] font-medium">
                  No images in this collection
                </p>
                <p className="mt-1 text-[0.75rem] text-[var(--color-pdp-muted)]">
                  Upload an image above or choose another tab.
                </p>
              </div>
            </div>
          )}

          {ui.assetsHasMore ? (
            <div className="mt-5 text-center">
              <PdpStudioButton
                type="button"
                variant="outline"
                disabled={ui.assetsLoading}
                onClick={() => void ui.loadMoreAssets()}
              >
                {ui.assetsLoading ? "Loading…" : "Load more"}
              </PdpStudioButton>
            </div>
          ) : null}
        </div>

        <footer className="flex min-h-16 items-center justify-between border-t border-[var(--color-pdp-rule)] px-6">
          <span className="max-w-[60%] truncate text-[0.75rem] text-[var(--color-pdp-muted)]">
            {selected ? selected.name : "Select one image"}
          </span>
          {ui.assetPickerPurpose !== "insert" ? (
            <PdpStudioButton
              type="button"
              disabled={!selected}
              onClick={ui.confirmAssetSelection}
              className="min-w-32"
            >
              Use this image
            </PdpStudioButton>
          ) : null}
        </footer>
      </DialogContent>
    </Dialog>
  );
}

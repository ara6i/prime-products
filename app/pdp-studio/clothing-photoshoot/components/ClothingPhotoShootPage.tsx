"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Check, ChevronDown, Download, Loader2, Plus, UploadCloud, X } from "lucide-react";
import type { PdpStudioUser } from "../../shared/pdpStudioAuthService";
import type {
  PdpStudioBrandStylePreset,
  PdpStudioClothingPhotoShootGenerateResult,
  PdpStudioPhotoShootPreset,
  PdpStudioPhotoShootView,
  PdpStudioQualityPreset,
  PdpStudioSizePreset,
} from "../../types";
import { PdpStudioAuthModal } from "../../components/PdpStudioAuthModal";
import { PdpStudioIcon } from "../../components/PdpStudioIcon";
import { useClothingPhotoShootUi } from "../hooks/useClothingPhotoShootUi";

type PickerVariant = "model" | "background" | "pose";

export function ClothingPhotoShootPage({
  user,
  view,
}: {
  user: PdpStudioUser | null;
  view: PdpStudioPhotoShootView;
}) {
  const needsAuth = !user;
  const ui = useClothingPhotoShootUi(view);

  const picker =
    ui.activePicker === "model"
      ? {
          title: "Select model",
          description: "Choose the model base for the clothing photoshoot.",
          items: view.models,
          selectedId: ui.selectedModelId,
          variant: "model" as const,
          customLabel: "Upload",
          onSelect: (id: string) => {
            ui.setSelectedModelId(id);
          },
        }
      : ui.activePicker === "background"
        ? {
            title: "Select background",
            description: "Pick the photoshoot setting used behind the model.",
            items: view.backgrounds,
            selectedId: ui.selectedBackgroundId,
            variant: "background" as const,
            customLabel: "Prompt",
            onSelect: (id: string) => {
              ui.setSelectedBackgroundId(id);
            },
          }
        : ui.activePicker === "pose"
          ? {
              title: "Select pose",
              description: "Choose the model pose before generation.",
              items: view.poses,
              selectedId: ui.selectedPoseId,
              variant: "pose" as const,
              customLabel: "Random",
              onSelect: (id: string) => {
                ui.setSelectedPoseId(id);
              },
            }
          : null;

  return (
    <main data-pdp-studio className="min-h-[100dvh] bg-[var(--color-pdp-paper)] p-2 font-[family-name:var(--font-pdp-body)] text-[var(--color-pdp-ink)] sm:p-3">
      <div className={needsAuth ? "pointer-events-none select-none blur-[1px]" : ""}>
        <div className="relative flex min-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)] shadow-[var(--shadow-pdp-popover)] sm:min-h-[calc(100dvh-1.5rem)] lg:flex-row">
          <aside className="order-2 flex max-h-[45dvh] w-full shrink-0 flex-col overflow-y-auto border-t border-[var(--color-pdp-rule)] bg-white p-4 lg:order-1 lg:max-h-none lg:max-w-[330px] lg:border-r lg:border-t-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1 text-lg font-medium">
                  Clothing photoshoot
                  <ChevronDown className="h-4 w-4 text-black/45" aria-hidden />
                </div>
              </div>
              <span className="rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-orange-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-pdp-orange)]">Live</span>
            </div>

            <label
              htmlFor="pdp-studio-garment-upload"
              className="mt-5 flex h-24 cursor-pointer items-center justify-center gap-3 rounded-[var(--radius-pdp-lg)] border border-dashed border-[var(--color-pdp-rule-strong)] bg-[var(--color-pdp-paper)] px-3 text-sm font-medium text-[var(--color-pdp-muted)] transition-colors hover:border-[var(--color-pdp-accent)] hover:bg-[var(--color-pdp-accent-soft)]"
            >
              {ui.garmentImageDataUri ? (
                <>
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-rule)] bg-white">
                    <Image src={ui.garmentImageDataUri} alt="" fill unoptimized sizes="64px" className="object-contain" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[var(--color-pdp-ink)]">{ui.garmentFileName || "Clothing image"}</span>
                    <span className="mt-1 block text-xs font-medium text-[var(--color-pdp-accent)]">Change image</span>
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" aria-hidden />
                  <span>
                    Drop cloth image or <span className="text-[var(--color-pdp-accent)]">select image</span>
                  </span>
                </>
              )}
            </label>
            <input
              id="pdp-studio-garment-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                void ui.selectGarmentFile(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />

            <div className="mt-5 grid grid-cols-2 gap-2">
              <PrimaryPickerCard
                label="Model"
                item={ui.selectedModel}
                variant="model"
                active={ui.activePicker === "model"}
                onClick={() => ui.openPicker("model")}
              />
              <PrimaryPickerCard
                label="Pose"
                item={ui.selectedPose}
                variant="pose"
                active={ui.activePicker === "pose"}
                onClick={() => ui.openPicker("pose")}
              />
            </div>

            <div className="mt-2 space-y-2">
              <ControlRow label="Quality" value={ui.quality} supportingValue={ui.selectedQuality?.label} active={ui.activePicker === "quality"} onClick={() => ui.openPicker("quality")} />
              <SelectionRow label="Background" item={ui.selectedBackground} variant="background" active={ui.activePicker === "background"} onClick={() => ui.openPicker("background")} />
              <ControlRow label="Size" value={ui.size} active={ui.activePicker === "size"} onClick={() => ui.openPicker("size")} />
              <ControlRow label="Brand style" value={ui.brandStyle} active={ui.activePicker === "brand"} onClick={() => ui.openPicker("brand")} />
            </div>

            <textarea
              value={ui.prompt}
              onChange={(event) => ui.setPrompt(event.target.value)}
              placeholder="Describe the image you want (optional)"
              className="mt-4 min-h-[96px] resize-none rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] px-3 py-3 text-sm text-[var(--color-pdp-ink)] outline-none placeholder:text-[var(--color-pdp-muted)] focus:border-[var(--color-pdp-accent)] focus:ring-2 focus:ring-[var(--color-pdp-accent-soft)]"
            />

            <button
              type="button"
              disabled={needsAuth || !ui.canGenerate}
              onClick={() => void ui.generatePhotoShoot()}
              className={`mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-pdp-md)] text-sm font-medium transition-colors ${
                needsAuth || !ui.canGenerate
                  ? "cursor-not-allowed bg-[var(--color-pdp-accent)] text-white opacity-45"
                  : "bg-[var(--color-pdp-accent)] text-white hover:bg-[var(--color-pdp-accent-hover)]"
              }`}
            >
              {ui.isGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {ui.isGenerating ? "Generating..." : "Generate 1 image"}
            </button>
            {ui.generationError ? (
              <p className="mt-3 rounded-lg border border-[#ffd3d3] bg-[#fff7f7] px-3 py-2 text-xs font-medium text-[#b42318]">
                {ui.generationError}
              </p>
            ) : null}
          </aside>

          {picker ? (
            <PickerPanel
              title={picker.title}
              description={picker.description}
              items={picker.items}
              selectedId={picker.selectedId}
              variant={picker.variant}
              customLabel={picker.customLabel}
              onSelect={picker.onSelect}
              onClose={ui.closePicker}
            />
          ) : null}

          {ui.activePicker === "quality" ? (
            <QualityPickerPanel
              items={view.qualities}
              selectedId={ui.selectedQualityId}
              onSelect={ui.setSelectedQualityId}
              onClose={ui.closePicker}
            />
          ) : null}

          {ui.activePicker === "size" ? (
            <SizePickerPanel
              items={view.sizes}
              selectedId={ui.selectedSizeId}
              onSelect={ui.setSelectedSizeId}
              onClose={ui.closePicker}
            />
          ) : null}

          {ui.activePicker === "brand" ? (
            <BrandStylePickerPanel
              items={view.brandStyles}
              selectedId={ui.selectedBrandStyleId}
              onSelect={ui.setSelectedBrandStyleId}
              onClose={ui.closePicker}
            />
          ) : null}

          <section className="relative order-1 flex min-h-[52dvh] min-w-0 flex-1 px-4 py-12 lg:order-[3] lg:min-h-[520px] lg:px-10 lg:py-14">
            <Link
              href="/pdp-studio"
              aria-label="Close clothing photoshoot"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-pdp-rule)] bg-white text-[var(--color-pdp-ink)] shadow-[var(--shadow-pdp-card)] transition-colors hover:bg-[var(--color-pdp-surface-soft)]"
            >
              <X className="h-5 w-5" aria-hidden />
            </Link>

            <TransformationWorkspace
              assets={view.previewAssets}
              results={ui.generatedResults}
              size={ui.selectedSize}
              isGenerating={ui.isGenerating}
              elapsedSeconds={ui.generationElapsedSeconds}
              selectedModel={ui.selectedModel?.label ?? "Avery"}
              selectedBackground={ui.selectedBackground?.label ?? "Random"}
              selectedPose={ui.selectedPose?.label ?? "Random"}
            />
          </section>
        </div>
      </div>

      {needsAuth ? <PdpStudioAuthModal /> : null}
    </main>
  );
}

function PrimaryPickerCard({
  label,
  item,
  variant,
  active,
  onClick,
}: {
  label: string;
  item?: PdpStudioPhotoShootPreset;
  variant: PickerVariant;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[var(--radius-pdp-md)] border p-2 text-center transition-colors ${
        active ? "border-[var(--color-pdp-accent)] bg-[var(--color-pdp-accent-soft)] ring-2 ring-[var(--color-pdp-accent-border)]" : "border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] hover:border-[var(--color-pdp-rule-strong)] hover:bg-white"
      }`}
    >
      <AssetThumb item={item} variant={variant} size="small" />
      <p className="mt-2 text-sm font-medium text-[var(--color-pdp-ink)]">{label}</p>
      <p className="truncate text-xs text-[var(--color-pdp-muted)]">{item?.label ?? "Select"}</p>
    </button>
  );
}

function SelectionRow({
  label,
  item,
  variant,
  active,
  onClick,
}: {
  label: string;
  item?: PdpStudioPhotoShootPreset;
  variant: PickerVariant;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-full items-center justify-between gap-3 rounded-[var(--radius-pdp-md)] border px-3 text-left text-sm transition-colors ${
        active ? "border-[var(--color-pdp-accent)] bg-[var(--color-pdp-accent-soft)]" : "border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] hover:border-[var(--color-pdp-rule-strong)] hover:bg-white"
      }`}
    >
      <span className="font-medium text-[var(--color-pdp-ink)]">{label}</span>
      <span className="flex min-w-0 items-center gap-2 text-[var(--color-pdp-muted)]">
        <span className="truncate">{item?.label ?? "Select"}</span>
        <span className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-[var(--color-pdp-rule)]">
          <AssetThumb item={item} variant={variant} size="tiny" />
        </span>
      </span>
    </button>
  );
}

function PickerPanel({
  title,
  description,
  items,
  selectedId,
  variant,
  customLabel,
  onSelect,
  onClose,
}: {
  title: string;
  description: string;
  items: PdpStudioPhotoShootPreset[];
  selectedId: string;
  variant: PickerVariant;
  customLabel: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const panelWidthClass = variant === "background" ? "lg:w-[700px]" : variant === "model" ? "lg:w-[760px]" : "lg:w-[720px]";
  const gridClass = variant === "background" ? "lg:grid-cols-4" : variant === "model" ? "lg:grid-cols-2" : "lg:grid-cols-3";

  return (
    <div
      role="dialog"
      aria-label={title}
      className={`absolute inset-x-3 bottom-3 z-[80] max-h-[70dvh] overflow-y-auto rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-white p-4 shadow-[var(--shadow-pdp-overlay)] lg:bottom-auto lg:inset-x-auto lg:left-[344px] lg:top-[74px] lg:max-h-[calc(100dvh-118px)] ${panelWidthClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-[var(--color-pdp-ink)]">{title}</h2>
          <p className="mt-1 text-xs text-[var(--color-pdp-muted)]">{description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-pdp-rule)] text-[var(--color-pdp-ink-soft)] hover:bg-[var(--color-pdp-surface-soft)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className={`mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 ${gridClass}`}>
        <button
          type="button"
          className="rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] p-2 text-left transition-colors hover:border-[var(--color-pdp-accent)] hover:bg-white"
        >
          <div
            className={`flex items-center justify-center rounded-md border border-dashed border-[var(--color-pdp-rule-strong)] bg-white text-[var(--color-pdp-accent)] ${
              variant === "background" ? "aspect-[1.7]" : "aspect-[3/4]"
            }`}
          >
            <Plus className="h-7 w-7" aria-hidden />
          </div>
          <p className="mt-2 truncate text-sm font-medium text-[var(--color-pdp-ink)]">{customLabel}</p>
        </button>

        {items.map((item) => {
          const selected = item.id === selectedId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`relative rounded-[var(--radius-pdp-md)] border bg-white p-2 text-left transition-colors ${
                selected ? "border-[var(--color-pdp-accent)] ring-2 ring-[var(--color-pdp-accent-border)]" : "border-[var(--color-pdp-rule)] hover:border-[var(--color-pdp-rule-strong)]"
              }`}
            >
              {selected ? (
                <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-pdp-accent)] text-white shadow-sm">
                  <Check className="h-4 w-4" aria-hidden />
                </span>
              ) : null}
              <AssetThumb item={item} variant={variant} size="large" />
              <p className="mt-2 truncate text-sm font-medium text-[var(--color-pdp-ink)]">{item.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ControlPickerShell({
  title,
  description,
  widthClass,
  onClose,
  children,
}: {
  title: string;
  description: string;
  widthClass: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
      className={`absolute inset-x-3 bottom-3 z-[80] max-h-[70dvh] overflow-y-auto rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-white p-4 shadow-[var(--shadow-pdp-overlay)] lg:bottom-auto lg:inset-x-auto lg:left-[344px] lg:top-[74px] lg:max-h-[calc(100dvh-118px)] ${widthClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-[var(--color-pdp-ink)]">{title}</h2>
          <p className="mt-1 text-xs text-[var(--color-pdp-muted)]">{description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-pdp-rule)] text-[var(--color-pdp-ink-soft)] hover:bg-[var(--color-pdp-surface-soft)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {children}
    </div>
  );
}

function QualityPickerPanel({
  items,
  selectedId,
  onSelect,
  onClose,
}: {
  items: PdpStudioQualityPreset[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <ControlPickerShell title="Select quality" description="Choose the render quality for this generation." widthClass="lg:w-[520px]" onClose={onClose}>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const selected = item.id === selectedId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex w-full gap-3 rounded-lg border bg-white p-2 text-left transition-colors ${
                selected ? "border-[#2154ef] ring-2 ring-[#bed6ff]" : "border-[#d8e2ff] hover:border-[#aebfff]"
              }`}
            >
              <div className="relative h-[138px] w-[100px] shrink-0 overflow-hidden rounded-md border border-[#d8e2ff] bg-[#f8faff]">
                {item.assetUrl ? <Image src={item.assetUrl} alt="" fill unoptimized sizes="140px" className="object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1 py-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-black/84">{item.label}</p>
                  <span className="rounded bg-[#f0ebff] px-1.5 py-0.5 text-[10px] font-bold text-[#6d4aff]">{item.badge}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-black/52">{item.resolution} resolution</p>
                <div className="mt-2 space-y-1">
                  {item.details.map((detail) => (
                    <p key={detail} className="text-xs font-medium text-black/48">
                      {detail}
                    </p>
                  ))}
                </div>
              </div>
              <span
                className={`mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                  selected ? "border-[#5e70ff] bg-[#5e70ff] text-white" : "border-[#b9c2d8] text-transparent"
                }`}
              >
                <Check className="h-4 w-4" aria-hidden />
              </span>
            </button>
          );
        })}
      </div>
    </ControlPickerShell>
  );
}

function SizePickerPanel({
  items,
  selectedId,
  onSelect,
  onClose,
}: {
  items: PdpStudioSizePreset[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <ControlPickerShell title="Select size" description="Choose the output aspect ratio." widthClass="lg:w-[570px]" onClose={onClose}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const selected = item.id === selectedId;
          const widthDominant = item.aspectWidth >= item.aspectHeight;
          const previewStyle = widthDominant
            ? { width: `${Math.min(116, 62 * (item.aspectWidth / item.aspectHeight))}px`, height: "62px" }
            : { width: "62px", height: `${Math.min(116, 62 * (item.aspectHeight / item.aspectWidth))}px` };

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`relative rounded-lg border bg-white p-2 text-left transition-colors ${
                selected ? "border-[#2154ef] ring-2 ring-[#bed6ff]" : "border-[#d8e2ff] hover:border-[#aebfff]"
              }`}
            >
              {selected ? (
                <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#5e70ff] text-white shadow-sm">
                  <Check className="h-4 w-4" aria-hidden />
                </span>
              ) : null}
              <div className="flex h-[136px] items-center justify-center rounded-md border border-[#d8e2ff] bg-[#f5f7fb]">
                <div className="rounded-md border border-[#c8d1e6] bg-white shadow-[0_4px_14px_rgba(20,31,58,0.08)]" style={previewStyle} />
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-black/82">{item.label}</p>
            </button>
          );
        })}
      </div>
    </ControlPickerShell>
  );
}

function BrandStylePickerPanel({
  items,
  selectedId,
  onSelect,
  onClose,
}: {
  items: PdpStudioBrandStylePreset[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <ControlPickerShell title="Select brand style" description="Choose how much brand styling to apply." widthClass="lg:w-[480px]" onClose={onClose}>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const selected = item.id === selectedId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border bg-white p-4 text-left transition-colors ${
                selected ? "border-[#2154ef] ring-2 ring-[#bed6ff]" : "border-[#d8e2ff] hover:border-[#aebfff]"
              }`}
            >
              <span>
                <span className="block text-sm font-semibold text-black/84">{item.label}</span>
                <span className="mt-1 block text-xs font-medium text-black/48">{item.description}</span>
              </span>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                  selected ? "border-[#5e70ff] bg-[#5e70ff] text-white" : "border-[#b9c2d8] text-transparent"
                }`}
              >
                <Check className="h-4 w-4" aria-hidden />
              </span>
            </button>
          );
        })}
      </div>
    </ControlPickerShell>
  );
}

function ControlRow({
  label,
  value,
  supportingValue,
  active,
  onClick,
}: {
  label: string;
  value: string;
  supportingValue?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-pdp-md)] border px-3 text-left text-sm transition-colors ${
        active ? "border-[var(--color-pdp-accent)] bg-[var(--color-pdp-accent-soft)]" : "border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] hover:border-[var(--color-pdp-rule-strong)] hover:bg-white"
      }`}
    >
      <span className="font-medium text-[var(--color-pdp-ink)]">{label}</span>
      <span className="flex min-w-0 items-center gap-2 text-[var(--color-pdp-muted)]">
        {supportingValue ? <span className="truncate">{supportingValue}</span> : null}
        <span className={value.length <= 2 ? "rounded bg-white px-2 py-1 font-medium text-[var(--color-pdp-accent)]" : "truncate text-[var(--color-pdp-ink-soft)]"}>{value}</span>
      </span>
    </button>
  );
}

function TransformationWorkspace({
  assets,
  results,
  size,
  isGenerating,
  elapsedSeconds,
  selectedModel,
  selectedBackground,
  selectedPose,
}: {
  assets: PdpStudioPhotoShootView["previewAssets"];
  results: PdpStudioClothingPhotoShootGenerateResult[];
  size?: PdpStudioSizePreset;
  isGenerating: boolean;
  elapsedSeconds: number;
  selectedModel: string;
  selectedBackground: string;
  selectedPose: string;
}) {
  const hasResults = results.length > 0 || isGenerating;
  const resultStyle: CSSProperties = {
    aspectRatio: size ? `${size.aspectWidth} / ${size.aspectHeight}` : "2 / 3",
  };

  if (hasResults) {
    return (
      <div className="w-full">
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isGenerating ? <LoadingResultTile assets={assets} elapsedSeconds={elapsedSeconds} style={resultStyle} /> : null}
          {results.map((result) => (
            <GeneratedResultTile key={result.id} result={result} style={resultStyle} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex w-full max-w-[680px] flex-col items-center">
        <div className="relative aspect-[16/9] w-full max-w-[720px] overflow-hidden rounded-lg bg-white">
          <Image
            src={assets.compositeAssetUrl}
            alt=""
            fill
            priority
            unoptimized
            sizes="720px"
            className="object-contain"
          />
        </div>
        <p className="mt-8 max-w-[470px] text-center text-lg font-medium leading-6 text-black/48">
          Visualize your clothing on a real-looking model and see your product come to life
        </p>
        <div className="mt-5 grid w-full max-w-[520px] grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <PreviewSummary label="Model" value={selectedModel} />
          <PreviewSummary label="Background" value={selectedBackground} />
          <PreviewSummary label="Pose" value={selectedPose} />
        </div>
      </div>
    </div>
  );
}

function LoadingResultTile({
  assets,
  elapsedSeconds,
  style,
}: {
  assets: PdpStudioPhotoShootView["previewAssets"];
  elapsedSeconds: number;
  style: CSSProperties;
}) {
  const progress = Math.min(92, 12 + elapsedSeconds * 4);

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#d8e2ff] bg-white shadow-[0_18px_60px_rgba(33,84,239,0.12)]" style={style}>
      <Image
        src={assets.compositeAssetUrl}
        alt=""
        fill
        unoptimized
        sizes="420px"
        className="scale-110 object-cover blur-lg saturate-90"
      />
      <div className="absolute inset-0 bg-white/28" />
      <div className="absolute inset-x-5 bottom-5">
        <div className="h-1 overflow-hidden rounded-full bg-white/72 shadow-sm">
          <div className="h-full rounded-full bg-[#2154ef] transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-3xl font-semibold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.38)]">{elapsedSeconds}s</p>
      </div>
    </div>
  );
}

function GeneratedResultTile({
  result,
  style,
}: {
  result: PdpStudioClothingPhotoShootGenerateResult;
  style: CSSProperties;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-[#d8e2ff] bg-white shadow-[0_18px_60px_rgba(33,84,239,0.12)]" style={style}>
      <Image src={result.image.dataUri} alt="" fill unoptimized sizes="420px" className="object-contain" />
      <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <a
          href={result.image.dataUri}
          download={`pdp-studio-${result.id}.png`}
          aria-label="Download generated image"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#19191b] shadow-sm hover:bg-[#f8faff]"
        >
          <Download className="h-4 w-4" aria-hidden />
        </a>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-3 pb-3 pt-10 opacity-0 transition-opacity group-hover:opacity-100">
        <p className="text-xs font-semibold text-white">{(result.latencyMs / 1000).toFixed(1)}s</p>
      </div>
    </div>
  );
}

function AssetThumb({
  item,
  variant,
  size,
}: {
  item?: PdpStudioPhotoShootPreset;
  variant: PickerVariant;
  size: "tiny" | "small" | "large";
}) {
  const sizeClass =
    size === "tiny"
      ? "h-full w-full"
      : size === "small"
        ? "mx-auto h-[96px] w-[96px]"
        : variant === "background"
          ? "aspect-[1.7] w-full"
          : "aspect-[3/4] w-full";
  const imageSizes = size === "large" ? (variant === "background" ? "170px" : variant === "model" ? "360px" : "220px") : "96px";
  const objectFitClass = item?.thumbnailFit === "contain" ? "object-contain" : "object-cover";
  const imageStyle: CSSProperties = {
    objectPosition: item?.thumbnailObjectPosition ?? "50% 50%",
    transform: item?.thumbnailScale && item.thumbnailScale !== 1 ? `scale(${item.thumbnailScale})` : undefined,
  };

  if (item?.assetUrl) {
    return (
      <div className={`relative overflow-hidden rounded-md border border-[#d8e2ff] bg-[#f8faff] ${sizeClass}`}>
        <Image src={item.assetUrl} alt="" fill unoptimized sizes={imageSizes} className={objectFitClass} style={imageStyle} />
      </div>
    );
  }

  if (variant === "background") {
    return <div className={`flex items-center justify-center rounded-md border border-[#d8e2ff] ${item?.previewTone ?? "bg-[#f8faff]"} ${sizeClass}`} />;
  }

  if (variant === "pose") {
    return (
      <div className={`flex items-center justify-center rounded-md border border-[#d8e2ff] bg-[#f8faff] ${sizeClass}`}>
        <PoseMockup poseId={item?.id ?? "front-standing"} />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-md border border-[#d8e2ff] ${item?.previewTone ?? "bg-[#eef2ff]"} ${sizeClass}`}>
      <PdpStudioIcon name="model" className="h-8 w-8 text-[#2154ef]" />
    </div>
  );
}

function PoseMockup({ poseId }: { poseId: string }) {
  const bodyRotate = poseId === "walking" ? "-8deg" : poseId === "three-quarter" ? "8deg" : "0deg";
  const leftArmRotate = poseId === "walking" ? "-25deg" : poseId === "front-standing" ? "12deg" : "35deg";
  const rightArmRotate = poseId === "walking" ? "25deg" : poseId === "front-standing" ? "-12deg" : "-35deg";

  return (
    <div className="relative h-20 w-16" style={{ transform: `rotate(${bodyRotate})` }}>
      <div className="absolute left-5 top-0 h-6 w-6 rounded-full bg-[#e2b994]" />
      <div className="absolute left-4 top-7 h-9 w-8 rounded-lg bg-[#2154ef]" />
      <div className="absolute left-0 top-8 h-2 w-6 rounded bg-[#2154ef]" style={{ transform: `rotate(${leftArmRotate})` }} />
      <div className="absolute right-0 top-8 h-2 w-6 rounded bg-[#2154ef]" style={{ transform: `rotate(${rightArmRotate})` }} />
      <div className="absolute bottom-0 left-4 h-8 w-2 rounded bg-[#6a7f9f]" />
      <div className="absolute bottom-0 right-5 h-8 w-2 rounded bg-[#6a7f9f]" />
    </div>
  );
}

function PreviewSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d8e2ff] bg-white px-3 py-2 text-center">
      <p className="text-xs font-medium text-black/42">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-black/78">{value}</p>
    </div>
  );
}

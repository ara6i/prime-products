"use client";

import type { ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import {
  getPdpStudioQualityLabel,
  getPdpStudioSizeLabel,
  PDP_STUDIO_HOME_TOOL_DIALOGS,
  PDP_STUDIO_QUALITY_OPTIONS,
  PDP_STUDIO_SIZE_OPTIONS,
} from "../../../data/pdpStudioHomeDialogData";
import type { PdpStudioToolDefinition } from "../../../types";
import type {
  PdpStudioGenerationQuality,
  PdpStudioGenerationSize,
  PdpStudioHomeAiToolId,
  PdpStudioHomeToolDialogDefinition,
  PdpStudioToolDialogPanel,
} from "../../../types/homeToolDialog";
import { PdpStudioButton } from "../../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../../shared/PdpStudioUiIcon";

interface PdpStudioAiToolDialogProps {
  activeToolId: PdpStudioHomeAiToolId | null;
  activePanel: PdpStudioToolDialogPanel;
  quality: PdpStudioGenerationQuality;
  size: PdpStudioGenerationSize;
  brandEnabled: boolean;
  brandDescription: string;
  prompt: string;
  selectedImage: { name: string; previewUrl: string } | null;
  previewMessage: string | null;
  tools: PdpStudioToolDefinition[];
  onOpenChange: (open: boolean) => void;
  onSwitchTool: (toolId: PdpStudioHomeAiToolId) => void;
  onTogglePanel: (
    panel: Exclude<PdpStudioToolDialogPanel, null>,
  ) => void;
  onClosePanel: () => void;
  onQualityChange: (quality: PdpStudioGenerationQuality) => void;
  onSizeChange: (size: PdpStudioGenerationSize) => void;
  onBrandEnabledChange: (enabled: boolean) => void;
  onBrandDescriptionChange: (description: string) => void;
  onPromptChange: (prompt: string) => void;
  onSelectFile: (file: File | null) => void;
  onGenerate: () => void;
}

const SUPPORTED_TOOL_IDS = new Set<PdpStudioHomeAiToolId>([
  "product-staging",
  "ghost-mannequin",
  "product-beautifier",
  "flat-lay",
]);

function ToolSettingButton({
  label,
  value,
  badge,
  active,
  onClick,
}: {
  label: string;
  value: string;
  badge?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${label} ${value}`}
      aria-expanded={active}
      onClick={onClick}
      className={[
        "flex min-h-[3.25rem] w-full items-center gap-3 rounded-[0.625rem] border px-3 text-left outline-none transition",
        active
          ? "border-[var(--color-pdp-accent)] bg-[var(--color-pdp-accent-soft)]"
          : "border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)] hover:border-[var(--color-pdp-rule-strong)]",
      ].join(" ")}
    >
      <span className="text-[0.8125rem] font-medium text-[var(--color-pdp-ink)]">
        {label}
      </span>
      <span className="ml-auto truncate text-[0.8125rem] text-[var(--color-pdp-muted)]">
        {value}
      </span>
      {badge ? (
        <span className="rounded-[0.35rem] bg-white px-2 py-1 text-[0.6875rem] font-semibold text-[var(--color-pdp-ink)] shadow-sm">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function ToolSwitcherPanel({
  tools,
  onSwitchTool,
}: {
  tools: PdpStudioToolDefinition[];
  onSwitchTool: (toolId: PdpStudioHomeAiToolId) => void;
}) {
  const recent = (
    [
      "product-staging",
      "flat-lay",
      "product-beautifier",
      "ghost-mannequin",
    ] satisfies PdpStudioHomeAiToolId[]
  ).map((id) => PDP_STUDIO_HOME_TOOL_DIALOGS[id]);

  return (
    <div
      role="dialog"
      aria-label="Choose AI tool"
      className="absolute left-4 top-[3.75rem] z-30 w-[min(45rem,calc(100vw-5rem))] overflow-hidden rounded-[0.875rem] border border-[var(--color-pdp-rule)] bg-white p-4 shadow-[0_22px_65px_rgba(17,24,39,0.18)]"
    >
      <h3 className="text-[0.75rem] font-semibold text-[var(--color-pdp-muted)]">
        Recently used
      </h3>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {recent.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSwitchTool(tool.id)}
            className="flex min-h-[4.5rem] flex-col items-start justify-between rounded-[0.625rem] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)] p-3 text-left transition hover:border-[var(--color-pdp-accent)]"
          >
            <PdpStudioUiIcon
              name={tool.icon}
              size={18}
              className="text-[var(--color-pdp-accent)]"
            />
            <span className="text-[0.75rem] font-medium">{tool.label}</span>
          </button>
        ))}
      </div>

      <h3 className="mt-5 text-[0.75rem] font-semibold text-[var(--color-pdp-muted)]">
        All tools
      </h3>
      <div className="mt-2 grid max-h-[17rem] grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
        {tools.map((tool) =>
          SUPPORTED_TOOL_IDS.has(tool.id as PdpStudioHomeAiToolId) ? (
            <button
              key={tool.id}
              type="button"
              onClick={() =>
                onSwitchTool(tool.id as PdpStudioHomeAiToolId)
              }
              className="flex min-h-11 items-center gap-2 rounded-[0.5rem] px-2.5 text-left text-[0.75rem] font-medium hover:bg-[var(--color-pdp-surface-soft)]"
            >
              <PdpStudioUiIcon name={tool.icon} size={17} />
              <span className="truncate">{tool.label}</span>
            </button>
          ) : (
            <Link
              key={tool.id}
              href={tool.href}
              className="flex min-h-11 items-center gap-2 rounded-[0.5rem] px-2.5 text-left text-[0.75rem] font-medium hover:bg-[var(--color-pdp-surface-soft)]"
            >
              <PdpStudioUiIcon name={tool.icon} size={17} />
              <span className="truncate">{tool.label}</span>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}

function QualityPanel({
  quality,
  onChange,
}: {
  quality: PdpStudioGenerationQuality;
  onChange: (quality: PdpStudioGenerationQuality) => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Select quality"
      className="absolute left-[18rem] top-[11.5rem] z-30 w-[min(36rem,calc(100vw-21rem))] rounded-[0.875rem] border border-[var(--color-pdp-rule)] bg-white p-3 shadow-[0_22px_65px_rgba(17,24,39,0.18)]"
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {PDP_STUDIO_QUALITY_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={[
              "rounded-[0.7rem] border p-3 text-left transition",
              quality === option.id
                ? "border-[var(--color-pdp-accent)] bg-[var(--color-pdp-accent-soft)]"
                : "border-[var(--color-pdp-rule)] hover:border-[var(--color-pdp-rule-strong)]",
            ].join(" ")}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-[0.8125rem] font-semibold">
                {option.label}
              </span>
              <span className="rounded bg-[var(--color-pdp-surface-soft)] px-1.5 py-0.5 text-[0.625rem] font-semibold text-[var(--color-pdp-muted)]">
                {option.tier}
              </span>
            </span>
            <span className="mt-3 block text-[1.125rem] font-semibold text-[var(--color-pdp-accent)]">
              {option.resolution}
            </span>
            <ul className="mt-2 grid gap-1 text-[0.6875rem] leading-4 text-[var(--color-pdp-muted)]">
              {option.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

function SizePanel({
  size,
  onChange,
}: {
  size: PdpStudioGenerationSize;
  onChange: (size: PdpStudioGenerationSize) => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Select size"
      className="absolute left-[18rem] top-[15rem] z-30 w-[min(31rem,calc(100vw-21rem))] rounded-[0.875rem] border border-[var(--color-pdp-rule)] bg-white p-3 shadow-[0_22px_65px_rgba(17,24,39,0.18)]"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PDP_STUDIO_SIZE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={[
              "grid min-h-[5.75rem] place-items-center rounded-[0.625rem] border p-2 text-center transition",
              size === option.id
                ? "border-[var(--color-pdp-accent)] bg-[var(--color-pdp-accent-soft)]"
                : "border-[var(--color-pdp-rule)] hover:border-[var(--color-pdp-rule-strong)]",
            ].join(" ")}
          >
            <span>
              <span className="mx-auto block h-7 w-9 rounded-[0.2rem] border-2 border-current text-[var(--color-pdp-muted)]" />
              <span className="mt-2 block text-[0.6875rem] font-medium">
                {option.id === "original"
                  ? option.label
                  : `${option.label} (${option.ratio})`}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BrandPanel({
  enabled,
  description,
  onEnabledChange,
  onDescriptionChange,
}: {
  enabled: boolean;
  description: string;
  onEnabledChange: (enabled: boolean) => void;
  onDescriptionChange: (description: string) => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Brand style"
      className="absolute left-[18rem] top-[18.5rem] z-30 w-[min(30rem,calc(100vw-21rem))] rounded-[0.875rem] border border-[var(--color-pdp-rule)] bg-white p-4 shadow-[0_22px_65px_rgba(17,24,39,0.18)]"
    >
      <label className="flex items-center gap-3 text-[0.8125rem] font-semibold">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onEnabledChange(!enabled)}
          className={[
            "relative h-6 w-11 rounded-full transition",
            enabled
              ? "bg-[var(--color-pdp-accent)]"
              : "bg-[var(--color-pdp-rule-strong)]",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition",
              enabled ? "left-[1.375rem]" : "left-0.5",
            ].join(" ")}
          />
        </button>
        Apply brand style
      </label>
      <textarea
        value={description}
        disabled={!enabled}
        onChange={(event) => onDescriptionChange(event.target.value)}
        placeholder="Describe your brand's mood, colors and the overall look you want for your visuals."
        className="mt-4 min-h-[7rem] w-full resize-none rounded-[0.625rem] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-3 text-[0.75rem] outline-none placeholder:text-[var(--color-pdp-muted)] focus:border-[var(--color-pdp-accent)] disabled:bg-[var(--color-pdp-surface-soft)]"
      />
      <p className="mt-2 text-[0.6875rem] leading-4 text-[var(--color-pdp-muted)]">
        We&apos;ll use it to tailor the AI visuals you create. Changes stay
        local in this UI build.
      </p>
    </div>
  );
}

function ToolExample({
  tool,
  selectedImage,
  previewMessage,
}: {
  tool: PdpStudioHomeToolDialogDefinition;
  selectedImage: { name: string; previewUrl: string } | null;
  previewMessage: string | null;
}) {
  if (selectedImage) {
    return (
      <div className="grid place-items-center text-center">
        <div className="relative aspect-square w-[min(42vw,23rem)] overflow-hidden rounded-[1rem] border border-[var(--color-pdp-rule)] bg-white shadow-[var(--shadow-pdp-card)]">
          <Image
            src={selectedImage.previewUrl}
            alt={selectedImage.name}
            fill
            unoptimized
            className="object-contain"
          />
        </div>
        <p className="mt-5 max-w-[31rem] text-[0.875rem] leading-6 text-[var(--color-pdp-muted)]">
          {previewMessage ?? "Your image is ready for this generation setup."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid place-items-center text-center">
      <div className="relative aspect-[3/2] w-[min(52vw,35rem)] overflow-hidden rounded-[0.875rem] bg-white">
        <Image
          src={tool.illustrationImage}
          alt=""
          fill
          priority
          sizes="35rem"
          className="object-contain"
        />
      </div>
      <p className="mt-8 max-w-[35rem] text-[1rem] leading-6 text-[var(--color-pdp-muted)]">
        {tool.description}
      </p>
    </div>
  );
}

export function PdpStudioAiToolDialog({
  activeToolId,
  activePanel,
  quality,
  size,
  brandEnabled,
  brandDescription,
  prompt,
  selectedImage,
  previewMessage,
  tools,
  onOpenChange,
  onSwitchTool,
  onTogglePanel,
  onClosePanel,
  onQualityChange,
  onSizeChange,
  onBrandEnabledChange,
  onBrandDescriptionChange,
  onPromptChange,
  onSelectFile,
  onGenerate,
}: PdpStudioAiToolDialogProps) {
  const tool = activeToolId
    ? PDP_STUDIO_HOME_TOOL_DIALOGS[activeToolId]
    : null;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSelectFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  if (!tool) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid !z-[400] !h-[min(88vh,52rem)] !w-[min(94vw,88rem)] !max-w-none grid-cols-[19rem_minmax(0,1fr)] gap-0 overflow-hidden rounded-[1rem] border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] p-0 text-[var(--color-pdp-ink)]"
        overlayClassName="!z-[300] bg-[var(--color-pdp-ink)]/25 backdrop-blur-sm"
        onPointerDownOutside={onClosePanel}
      >
        <DialogTitle className="sr-only">{tool.label}</DialogTitle>
        <DialogDescription className="sr-only">
          Configure a local UI preview for {tool.label}.
        </DialogDescription>

        <aside className="relative z-20 border-r border-[var(--color-pdp-rule)] bg-white p-4">
          <button
            type="button"
            aria-label="Switch AI tool"
            aria-expanded={activePanel === "tool"}
            onClick={() => onTogglePanel("tool")}
            className="flex min-h-11 w-full items-center gap-2 rounded-[0.625rem] px-1 text-left text-[1rem] font-semibold outline-none hover:text-[var(--color-pdp-accent)]"
          >
            <PdpStudioUiIcon
              name={tool.icon}
              size={19}
              className="text-[var(--color-pdp-accent)]"
            />
            <span className="truncate">{tool.label}</span>
            <PdpStudioUiIcon name="chevron" size={14} className="ml-auto" />
          </button>

          <label className="mt-6 grid min-h-[5rem] cursor-pointer place-items-center rounded-[0.625rem] border border-dashed border-[var(--color-pdp-rule-strong)] bg-[var(--color-pdp-surface-soft)] px-4 text-center transition hover:border-[var(--color-pdp-accent)] hover:bg-[var(--color-pdp-accent-soft)]">
            <span className="text-[0.75rem] font-medium text-[var(--color-pdp-muted)]">
              <PdpStudioUiIcon
                name="upload"
                size={17}
                className="mr-2 inline text-[var(--color-pdp-accent)]"
              />
              {selectedImage ? selectedImage.name : "Drop a file or select an image"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          <div className="mt-5 grid gap-2">
            <ToolSettingButton
              label="Quality"
              value={getPdpStudioQualityLabel(quality)}
              badge={quality === "standard" ? "1K" : quality === "advanced" ? "2K" : "4K+"}
              active={activePanel === "quality"}
              onClick={() => onTogglePanel("quality")}
            />
            <ToolSettingButton
              label="Size"
              value={getPdpStudioSizeLabel(size)}
              active={activePanel === "size"}
              onClick={() => onTogglePanel("size")}
            />
            <ToolSettingButton
              label="Brand style"
              value={brandEnabled ? "On" : "Off"}
              active={activePanel === "brand"}
              onClick={() => onTogglePanel("brand")}
            />
          </div>

          <textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="Describe the image you want (optional)"
            className="mt-5 min-h-[8.5rem] w-full resize-none rounded-[0.625rem] border border-[var(--color-pdp-rule)] bg-white p-3 text-[0.75rem] leading-5 outline-none placeholder:text-[var(--color-pdp-muted)] focus:border-[var(--color-pdp-accent)]"
          />

          <PdpStudioButton
            type="button"
            disabled={!selectedImage}
            onClick={onGenerate}
            className="mt-5 w-full"
          >
            Generate 1 image
          </PdpStudioButton>
        </aside>

        <main className="relative grid min-w-0 place-items-center overflow-hidden bg-[var(--color-pdp-surface-soft)] p-12">
          <ToolExample
            tool={tool}
            selectedImage={selectedImage}
            previewMessage={previewMessage}
          />
        </main>

        <button
          type="button"
          aria-label="Close dialog"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-40 grid size-9 place-items-center rounded-full border border-[var(--color-pdp-rule)] bg-white text-[var(--color-pdp-ink)] shadow-sm transition hover:bg-[var(--color-pdp-surface-soft)]"
        >
          <PdpStudioUiIcon name="close" size={17} />
        </button>

        {activePanel === "tool" ? (
          <ToolSwitcherPanel tools={tools} onSwitchTool={onSwitchTool} />
        ) : null}
        {activePanel === "quality" ? (
          <QualityPanel
            quality={quality}
            onChange={(nextQuality) => {
              onQualityChange(nextQuality);
              onClosePanel();
            }}
          />
        ) : null}
        {activePanel === "size" ? (
          <SizePanel
            size={size}
            onChange={(nextSize) => {
              onSizeChange(nextSize);
              onClosePanel();
            }}
          />
        ) : null}
        {activePanel === "brand" ? (
          <BrandPanel
            enabled={brandEnabled}
            description={brandDescription}
            onEnabledChange={onBrandEnabledChange}
            onDescriptionChange={onBrandDescriptionChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

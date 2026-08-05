"use client";

import type { useToolWorkspaceUi } from "../../hooks/useToolWorkspaceUi";
import type { PdpStudioToolDefinition } from "../../types";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUploadZone } from "../shared/PdpStudioUploadZone";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";
import { ToolOptionGroups } from "./ToolOptionGroups";

type ToolUi = ReturnType<typeof useToolWorkspaceUi>;

interface ToolControlPanelProps {
  tool: PdpStudioToolDefinition;
  ui: ToolUi;
}

export function ToolControlPanel({ tool, ui }: ToolControlPanelProps) {
  const showPrimaryUpload = !["text-generator", "chooser"].includes(tool.mode);
  const missingRequiredInput =
    showPrimaryUpload && ui.primaryFiles.length === 0 && !ui.sourceAsset
      ? "Add the image you want to process."
      : tool.mode === "dual-upload" &&
          !tool.referenceUploadsOptional &&
          ui.secondaryFiles.length === 0
        ? "Add at least one real product photo to enable generation."
        : null;
  const isBusy =
    ui.previewState === "working" || ui.previewState === "uploading";

  return (
    <aside className="grid min-w-0 content-start gap-5 overflow-hidden rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-4 shadow-[var(--shadow-pdp-card)] sm:p-5">
      <div>
        <span className="inline-flex rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-orange-soft)] px-[var(--space-pdp-sm)] py-[var(--space-pdp-2xs)] text-[var(--text-pdp-xs)] font-medium text-[var(--color-pdp-orange)]">
          Private processing
        </span>
        <p className="mt-[var(--space-pdp-sm)] text-[var(--text-pdp-xs)] leading-relaxed text-[var(--color-pdp-muted)]">
          Inputs and results are stored as authenticated assets in your Space.
        </p>
      </div>

      {showPrimaryUpload ? (
        <div className="grid gap-[var(--space-pdp-sm)]">
          {ui.sourceAsset ? (
            <div className="flex items-center gap-[var(--space-pdp-sm)] rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-accent-border)] bg-[var(--color-pdp-accent-soft)] p-[var(--space-pdp-sm)] text-[var(--text-pdp-xs)] text-[var(--color-pdp-ink-soft)]">
              <PdpStudioUiIcon name="shopify" size={16} />
              <span className="min-w-0 flex-1 truncate">Using the selected Shopify product image</span>
            </div>
          ) : null}
          <PdpStudioUploadZone
            id={`${tool.id}-primary-upload`}
            label={
              ui.sourceAsset
                ? "Replace the selected product image"
                : tool.uploadLabel ?? "Add an image"
            }
            files={ui.primaryFiles}
            multiple={tool.acceptsMultiple}
            onFiles={ui.addPrimaryFiles}
          />
        </div>
      ) : null}

      {tool.mode === "dual-upload" ? (
        <PdpStudioUploadZone
          id={`${tool.id}-secondary-upload`}
          label={`${tool.secondaryUploadLabel ?? "Add reference images"} ${
            tool.referenceUploadsOptional ? "(optional)" : "(required)"
          }`}
          files={ui.secondaryFiles}
          multiple
          onFiles={ui.addSecondaryFiles}
        />
      ) : null}

      {tool.options?.length ? (
        <ToolOptionGroups
          options={tool.options}
          selectedOptions={ui.selectedOptions}
          onSelect={ui.selectOption}
        />
      ) : null}

      {tool.promptLabel ? (
        <label className="grid gap-[var(--space-pdp-xs)]">
          <span className="text-[var(--text-pdp-xs)] font-medium text-[var(--color-pdp-ink-soft)]">
            {tool.promptLabel}{" "}
            <span className="font-normal text-[var(--color-pdp-muted)]">
              (optional)
            </span>
          </span>
          <textarea
            value={ui.prompt}
            onChange={(event) => ui.setPrompt(event.target.value)}
            placeholder="Leave blank to use the recommended default"
            className="min-h-[7rem] resize-y rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] p-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-ink)] outline outline-2 outline-transparent placeholder:text-[var(--color-pdp-muted)] focus-visible:outline-[var(--color-pdp-focus)]"
          />
        </label>
      ) : null}

      {ui.error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-pdp-sm)] bg-red-50 p-[var(--space-pdp-sm)] text-[var(--text-pdp-xs)] leading-relaxed text-red-700"
        >
          {ui.error}
        </p>
      ) : null}

      <PdpStudioButton
        type="button"
        disabled={!ui.canPreview}
        onClick={() => void ui.runPreview()}
        className="w-full gap-[var(--space-pdp-xs)]"
      >
        <PdpStudioUiIcon
          name={
            ui.previewState === "working" || ui.previewState === "uploading"
              ? "more"
              : "sparkles"
          }
        />
        {ui.previewState === "uploading"
          ? "Uploading securely…"
          : ui.previewState === "working"
            ? "Processing…"
            : `Generate ${tool.outputCount ?? 1} ${
                tool.outputCount === 2
                  ? "images"
                  : tool.id === "video-generator"
                    ? "video"
                    : "image"
              }`}
      </PdpStudioButton>
      {missingRequiredInput && !isBusy ? (
        <p
          role="status"
          className="text-[var(--text-pdp-xs)] font-medium leading-relaxed text-[var(--color-pdp-ink-soft)]"
        >
          {missingRequiredInput}
        </p>
      ) : null}

      {ui.job &&
      (ui.job.status === "queued" || ui.job.status === "running") ? (
        <PdpStudioButton
          type="button"
          variant="outline"
          onClick={() => void ui.cancel()}
        >
          Cancel
        </PdpStudioButton>
      ) : null}
      {ui.job &&
      (ui.job.status === "failed" || ui.job.status === "cancelled") ? (
        <PdpStudioButton
          type="button"
          variant="outline"
          onClick={() => void ui.retry()}
        >
          Retry
        </PdpStudioButton>
      ) : null}
    </aside>
  );
}

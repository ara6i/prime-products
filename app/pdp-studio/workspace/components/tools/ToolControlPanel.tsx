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
  const unverifiedPostUpload = tool.mode === "upload";

  return (
    <aside className="grid content-start gap-[var(--space-pdp-lg)] rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-lg)]">
      <div>
        <span className="inline-flex rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-warning-soft)] px-[var(--space-pdp-sm)] py-[var(--space-pdp-2xs)] text-[var(--text-pdp-xs)] font-semibold text-[var(--color-pdp-warning)]">
          UI preview
        </span>
        <p className="mt-[var(--space-pdp-sm)] text-[var(--text-pdp-xs)] leading-relaxed text-[var(--color-pdp-muted)]">
          Files stay in this browser tab. No generation or upload request is sent.
        </p>
      </div>

      {showPrimaryUpload ? (
        <PdpStudioUploadZone
          id={`${tool.id}-primary-upload`}
          label={tool.uploadLabel ?? "Add an image"}
          files={ui.primaryFiles}
          multiple={tool.acceptsMultiple}
          onFiles={ui.addPrimaryFiles}
        />
      ) : null}

      {tool.mode === "dual-upload" ? (
        <PdpStudioUploadZone
          id={`${tool.id}-secondary-upload`}
          label={tool.secondaryUploadLabel ?? "Add reference images"}
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
          <span className="text-[var(--text-pdp-xs)] font-semibold text-[var(--color-pdp-ink-soft)]">
            {tool.promptLabel}
          </span>
          <textarea
            value={ui.prompt}
            onChange={(event) => ui.setPrompt(event.target.value)}
            placeholder={tool.promptLabel}
            className="min-h-[7rem] resize-y rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] p-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-ink)] outline outline-2 outline-transparent placeholder:text-[var(--color-pdp-muted)] focus-visible:outline-[var(--color-pdp-focus)]"
          />
        </label>
      ) : null}

      {unverifiedPostUpload && ui.primaryFiles.length ? (
        <p className="rounded-[var(--radius-pdp-sm)] bg-[var(--color-pdp-warning-soft)] p-[var(--space-pdp-sm)] text-[var(--text-pdp-xs)] leading-relaxed text-[var(--color-pdp-warning)]">
          The audit could not verify this tool’s post-upload controls. This screen stops at the truthful upload state.
        </p>
      ) : null}

      <PdpStudioButton
        type="button"
        disabled={!ui.canPreview || unverifiedPostUpload}
        onClick={() => void ui.runPreview()}
        className="w-full gap-[var(--space-pdp-xs)]"
      >
        <PdpStudioUiIcon name={ui.previewState === "working" ? "more" : "sparkles"} />
        {ui.previewState === "working"
          ? "Preparing preview…"
          : unverifiedPostUpload
            ? "Post-upload controls not audited"
            : `Preview ${tool.outputCount ?? 1} ${tool.outputCount === 2 ? "images" : "image"}`}
      </PdpStudioButton>
    </aside>
  );
}

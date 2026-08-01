import Image from "next/image";
import type { useToolWorkspaceUi } from "../../hooks/useToolWorkspaceUi";
import type { PdpStudioToolDefinition } from "../../types";
import { PDP_STUDIO_TOOL_ASSETS } from "../../data/pdpStudioToolAssets";
import { PdpStudioGenerationProgressCard } from "../shared/PdpStudioGenerationProgress";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

type ToolUi = ReturnType<typeof useToolWorkspaceUi>;

interface ToolPreviewCanvasProps {
  tool: PdpStudioToolDefinition;
  ui: ToolUi;
}

export function ToolPreviewCanvas({ tool, ui }: ToolPreviewCanvasProps) {
  const output = ui.job?.outputs[0] ?? null;
  const previewImage =
    output?.resourceType === "image"
      ? output.url
      : ui.primaryFiles[0]?.previewUrl ?? PDP_STUDIO_TOOL_ASSETS[tool.id];

  return (
    <section className="relative min-h-[34rem] overflow-hidden rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)]">
      <div className="absolute inset-x-0 top-0 z-[var(--z-pdp-raised)] flex items-center justify-between border-b border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] px-[var(--space-pdp-md)] py-[var(--space-pdp-sm)]">
        <div>
          <h2 className="text-[var(--text-pdp-sm)] font-bold">Preview canvas</h2>
          <p className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
            {tool.defaultSize ?? "Original size"}
          </p>
        </div>
        <span className="rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-accent-soft)] px-[var(--space-pdp-sm)] py-[var(--space-pdp-2xs)] text-[var(--text-pdp-xs)] font-semibold text-[var(--color-pdp-accent)]">
          {ui.job?.status ?? "Ready"}
        </span>
      </div>

      <div className="absolute inset-0 grid place-items-center px-[var(--space-pdp-xl)] pb-[var(--space-pdp-xl)] pt-[5rem]">
        {ui.previewState === "working" || ui.previewState === "uploading" ? (
          <PdpStudioGenerationProgressCard
            imageUrl={previewImage}
            imageAlt={`${tool.label} processing preview`}
            className="max-w-[30rem]"
            stage={
              ui.previewState === "uploading"
                ? "Uploading private assets"
                : ui.job?.progress.stage ?? "Preparing generation"
            }
            percent={
              ui.previewState === "uploading"
                ? 8
                : ui.job?.progress.percent ?? 0
            }
            elapsedSeconds={ui.elapsedSeconds}
            status={
              ui.previewState === "uploading"
                ? "uploading"
                : ui.job?.status ?? "running"
            }
          />
        ) : (
          <figure className="w-full max-w-[30rem]">
            <div className="relative aspect-square overflow-hidden rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)]">
              <Image
                src={previewImage}
                alt={`${tool.label} example`}
                fill
                unoptimized={Boolean(output || ui.primaryFiles[0])}
                sizes="30rem"
                className="object-contain p-[var(--space-pdp-lg)]"
                priority
              />
              {output?.resourceType === "video" ? (
                <video
                  src={output.url}
                  controls
                  className="absolute inset-0 size-full object-contain"
                />
              ) : null}
              {ui.previewState === "ready" && output ? (
                <div className="absolute inset-x-[var(--space-pdp-md)] bottom-[var(--space-pdp-md)] rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-sm)] shadow-[var(--shadow-pdp-card)]">
                  <p className="flex items-center gap-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)] font-semibold text-[var(--color-pdp-success)]">
                    <PdpStudioUiIcon name="check" />
                    Generation complete
                  </p>
                  <p className="mt-[var(--space-pdp-2xs)] text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
                    Job {ui.previewId.slice(0, 8)} ·{" "}
                    {ui.job?.model ?? ui.job?.provider}
                  </p>
                  <a
                    href={output.url}
                    download={output.originalName ?? undefined}
                    className="mt-2 inline-flex text-[var(--text-pdp-xs)] font-semibold text-[var(--color-pdp-accent)] hover:underline"
                  >
                    Download result
                  </a>
                </div>
              ) : null}
            </div>
            <figcaption className="mt-[var(--space-pdp-sm)] text-center text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
              {output
                ? "Authenticated generated asset"
                : ui.primaryFiles[0]
                  ? "Selected input image"
                  : `${tool.label} before and after example`}
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}

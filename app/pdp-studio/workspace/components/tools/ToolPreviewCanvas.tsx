import Image from "next/image";
import type { useToolWorkspaceUi } from "../../hooks/useToolWorkspaceUi";
import type { PdpStudioToolDefinition } from "../../types";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

type ToolUi = ReturnType<typeof useToolWorkspaceUi>;

interface ToolPreviewCanvasProps {
  tool: PdpStudioToolDefinition;
  ui: ToolUi;
}

export function ToolPreviewCanvas({ tool, ui }: ToolPreviewCanvasProps) {
  const previewImage = ui.primaryFiles[0]?.previewUrl ?? "/images/products/product-3.png";

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
          Local state
        </span>
      </div>

      <div className="absolute inset-0 grid place-items-center px-[var(--space-pdp-xl)] pb-[var(--space-pdp-xl)] pt-[5rem]">
        {ui.previewState === "working" ? (
          <div className="text-center" aria-live="polite">
            <span className="mx-auto grid size-[3.5rem] animate-pulse place-items-center rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
              <PdpStudioUiIcon name="sparkles" />
            </span>
            <p className="mt-[var(--space-pdp-md)] text-[var(--text-pdp-sm)] font-semibold">Preparing the interface preview</p>
          </div>
        ) : (
          <figure className="w-full max-w-[30rem]">
            <div className="relative aspect-square overflow-hidden rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)]">
              <Image
                src={previewImage}
                alt=""
                fill
                unoptimized={Boolean(ui.primaryFiles[0])}
                sizes="30rem"
                className="object-contain p-[var(--space-pdp-lg)]"
                priority
              />
              {ui.previewState === "ready" ? (
                <div className="absolute inset-x-[var(--space-pdp-md)] bottom-[var(--space-pdp-md)] rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-sm)] shadow-[var(--shadow-pdp-card)]">
                  <p className="flex items-center gap-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)] font-semibold text-[var(--color-pdp-success)]">
                    <PdpStudioUiIcon name="check" />
                    UI preview ready
                  </p>
                  <p className="mt-[var(--space-pdp-2xs)] text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
                    No image was generated. Preview ID {ui.previewId.slice(0, 8)}.
                  </p>
                </div>
              ) : null}
            </div>
            <figcaption className="mt-[var(--space-pdp-sm)] text-center text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
              {ui.primaryFiles[0] ? "Selected local image" : "Project-owned placeholder product image"}
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}

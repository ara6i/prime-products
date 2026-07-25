"use client";

import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface BrandAssetsPanelProps {
  notice: string;
  onNotice: (notice: string) => void;
}

const ASSET_GROUPS = [
  ["Logos", "Add logo files or create a logo with AI.", "brand"],
  ["Colors", "Define reusable brand colors.", "palette"],
  ["Fonts", "Define reusable brand fonts.", "text"],
  ["Models", "Save custom models that represent the brand.", "model"],
  ["Cutouts", "Reuse product cutouts across the workspace.", "image"],
  ["Text layers", "Save text content and styling.", "text"],
  ["Backgrounds", "Save reusable background images.", "image"],
  ["AI Backgrounds", "Save prompts that adapt to each product.", "sparkles"],
] as const;

export function BrandAssetsPanel({ notice, onNotice }: BrandAssetsPanelProps) {
  return (
    <div className="grid gap-[var(--space-pdp-xl)]">
      <section>
        <h2 className="text-[var(--text-pdp-lg)] font-bold">Quick start</h2>
        <div className="mt-[var(--space-pdp-md)] grid gap-[var(--space-pdp-sm)] md:grid-cols-[1.2fr_0.9fr_0.8fr]">
          {[
            ["Import from website", "Gather a logo, colors, and fonts from a URL.", "brand"],
            ["Create logo with AI", "Open the Logo creation workflow.", "sparkles"],
            ["Add a custom font", "Preview a reusable brand font.", "text"],
          ].map(([title, description, icon]) => (
            <PdpStudioButton
              key={title}
              type="button"
              variant="ghost"
              onClick={() => onNotice(`${title} is not connected in UI preview mode.`)}
              className="h-auto min-h-[8rem] flex-col items-start justify-end gap-[var(--space-pdp-xs)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-lg)] text-left text-[var(--color-pdp-ink)] hover:bg-[var(--color-pdp-surface-soft)]"
            >
              <PdpStudioUiIcon name={icon as "brand" | "sparkles" | "text"} className="text-[var(--color-pdp-accent)]" />
              <span className="text-[var(--text-pdp-md)] font-bold">{title}</span>
              <span className="whitespace-normal text-[var(--text-pdp-xs)] font-normal leading-relaxed text-[var(--color-pdp-muted)]">{description}</span>
            </PdpStudioButton>
          ))}
        </div>
        {notice ? (
          <p role="status" className="mt-[var(--space-pdp-sm)] rounded-[var(--radius-pdp-sm)] bg-[var(--color-pdp-warning-soft)] p-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-warning)]">
            {notice}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="text-[var(--text-pdp-lg)] font-bold">Reusable assets</h2>
        <div className="mt-[var(--space-pdp-md)] grid gap-[var(--space-pdp-sm)] sm:grid-cols-2 xl:grid-cols-4">
          {ASSET_GROUPS.map(([title, description, icon]) => (
            <article key={title} className="flex min-h-[11rem] flex-col rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-md)]">
              <span className="grid size-[2.5rem] place-items-center rounded-[var(--radius-pdp-sm)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
                <PdpStudioUiIcon name={icon} />
              </span>
              <h3 className="mt-[var(--space-pdp-md)] text-[var(--text-pdp-md)] font-bold">{title}</h3>
              <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-xs)] leading-relaxed text-[var(--color-pdp-muted)]">{description}</p>
              <PdpStudioButton type="button" variant="ghost" onClick={() => onNotice(`${title} editing is local-only in this preview.`)} className="mt-auto w-fit bg-transparent px-0 text-[var(--color-pdp-accent)]">
                Add preview
              </PdpStudioButton>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

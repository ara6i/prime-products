"use client";

import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface BrandAssetsPanelProps {
  notice: string;
  onNotice: (notice: string) => void;
}

const ASSET_GROUPS = [
  ["Logos", "Add a logo to keep your brand consistent across designs.", "brand"],
  ["Colors", "Add the colors your brand uses most.", "palette"],
  ["Fonts", "Add custom fonts for your brand.", "text"],
  ["Models", "Save models that represent your brand.", "model"],
  ["Cutouts", "Save product cutouts to reuse in designs.", "image"],
  ["Text layers", "Save reusable text and styling.", "text"],
  ["Backgrounds", "Save backgrounds for quick access.", "image"],
  ["AI Backgrounds", "Save AI background prompts for your products.", "sparkles"],
] as const;

export function BrandAssetsPanel({ notice, onNotice }: BrandAssetsPanelProps) {
  return (
    <div className="grid gap-10">
      <section>
        <h2 className="text-base font-semibold">Quick start</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            ["Import from website", "Add your logo, colors and fonts directly from your website.", "brand"],
            ["Create logo with AI", "Logos made effortlessly with our AI logo maker.", "sparkles"],
            ["Add your custom font", "Upload your unique font to use it across all your designs.", "text"],
          ].map(([title, description, icon]) => (
            <PdpStudioButton
              key={title}
              type="button"
              variant="ghost"
              onClick={() => onNotice(`${title} is not connected in UI preview mode.`)}
              className="h-auto min-h-[7rem] flex-col items-start justify-start gap-2 border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-4 text-left text-[var(--color-pdp-ink)] hover:bg-[var(--color-pdp-surface-soft)]"
            >
              <PdpStudioUiIcon name={icon as "brand" | "sparkles" | "text"} className="text-[var(--color-pdp-accent)]" />
              <span className="text-sm font-semibold">{title}</span>
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

      <section className="grid gap-8">
        <h2 className="sr-only">Brand assets</h2>
        <div className="grid gap-8">
          {ASSET_GROUPS.map(([title, description, icon]) => (
            <article key={title} className="border-b border-[var(--color-pdp-rule)] pb-8 last:border-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-[var(--color-pdp-muted)]">{description}</p>
                </div>
                <PdpStudioButton type="button" variant="outline" onClick={() => onNotice(`${title} editing is local-only in this preview.`)}>
                  <PdpStudioUiIcon name="plus" size={16} />
                  Add
                </PdpStudioButton>
              </div>
              {title === "Logos" ? (
                <button
                  type="button"
                  onClick={() => onNotice("Logo upload is local-only in this preview.")}
                  className="mt-4 grid min-h-36 w-full place-items-center rounded-xl border border-dashed border-[var(--color-pdp-rule-strong)] bg-[var(--color-pdp-surface)] text-sm text-[var(--color-pdp-muted)] hover:bg-[var(--color-pdp-surface-soft)]"
                >
                  <span className="grid gap-2 text-center">
                    <PdpStudioUiIcon name={icon} className="mx-auto text-[var(--color-pdp-accent)]" />
                    Drop a logo here or browse files
                  </span>
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

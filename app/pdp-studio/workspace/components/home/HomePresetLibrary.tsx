"use client";

import type { PdpStudioAuditCatalog } from "../../types";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioPresetGrid } from "../shared/PdpStudioPresetGrid";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface HomePresetLibraryProps {
  catalog: PdpStudioAuditCatalog;
  showMore: boolean;
  selectedPresetId: string;
  onShowMore: (show: boolean) => void;
  onSelectPreset: (id: string) => void;
  onOpenCustomSize: () => void;
}

function PresetPills({
  title,
  items,
}: {
  title: string;
  items: PdpStudioAuditCatalog["marketplacePresets"];
}) {
  return (
    <section>
      <h2 className="text-[var(--text-pdp-md)] font-semibold">{title}</h2>
      <div className="mt-[var(--space-pdp-sm)] flex flex-wrap gap-[var(--space-pdp-xs)]">
        {items.map((item) => (
          <PdpStudioButton
            key={item.id}
            type="button"
            variant="ghost"
            className="min-h-[2.25rem] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] px-[var(--space-pdp-sm)] text-[var(--text-pdp-xs)] text-[var(--color-pdp-ink-soft)] hover:bg-[var(--color-pdp-surface-soft)]"
          >
            {item.label}
          </PdpStudioButton>
        ))}
      </div>
    </section>
  );
}

export function HomePresetLibrary({
  catalog,
  showMore,
  selectedPresetId,
  onShowMore,
  onSelectPreset,
  onOpenCustomSize,
}: HomePresetLibraryProps) {
  const visibleCollections = showMore ? catalog.backgrounds : catalog.backgrounds.slice(0, 3);

  return (
    <div className="grid gap-8">
      {visibleCollections.map((collection) => (
        <section key={collection.id}>
          <div className="flex items-center justify-between gap-[var(--space-pdp-sm)]">
            <h2 className="text-[1rem] font-semibold">{collection.label}</h2>
          </div>
          <div className="mt-3.5">
            <PdpStudioPresetGrid
              items={collection.items}
              selectedId={selectedPresetId}
              onSelect={onSelectPreset}
              dense
            />
          </div>
        </section>
      ))}

      <PdpStudioButton
        type="button"
        variant="ghost"
        onClick={() => onShowMore(!showMore)}
        className="w-fit gap-1.5 border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)] font-medium"
      >
        {showMore ? "Show fewer collections" : "Show all collections"}
        <PdpStudioUiIcon name="chevron" className={showMore ? "rotate-180" : ""} />
      </PdpStudioButton>

      {showMore ? (
        <>
          <PresetPills title="Marketplace outputs" items={catalog.marketplacePresets} />
          <PresetPills title="Social outputs" items={catalog.socialPresets} />
          <section>
            <h2 className="text-[var(--text-pdp-md)] font-semibold">Blank canvas</h2>
            <div className="mt-[var(--space-pdp-sm)] grid grid-cols-2 gap-[var(--space-pdp-sm)] sm:grid-cols-4">
              {catalog.blankCanvases.map((item) => (
                <PdpStudioButton
                  key={item.id}
                  type="button"
                  variant="ghost"
                  onClick={item.label === "Custom size" ? onOpenCustomSize : undefined}
                  className="min-h-[6rem] flex-col gap-[var(--space-pdp-xs)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)] hover:bg-[var(--color-pdp-surface-soft)]"
                >
                  <PdpStudioUiIcon name="design" className="text-[var(--color-pdp-accent)]" />
                  {item.label}
                </PdpStudioButton>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

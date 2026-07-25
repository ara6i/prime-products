"use client";

import type { PdpStudioAuditCatalog } from "../../types";
import { useBatchWorkspaceUi } from "../../hooks/useBatchWorkspaceUi";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioPageHeader } from "../shared/PdpStudioPageHeader";
import { PdpStudioPresetGrid } from "../shared/PdpStudioPresetGrid";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";
import { PdpStudioUploadZone } from "../shared/PdpStudioUploadZone";

interface BatchWorkspaceProps {
  catalog: PdpStudioAuditCatalog;
}

export function BatchWorkspace({ catalog }: BatchWorkspaceProps) {
  const ui = useBatchWorkspaceUi();
  const essentials = catalog.backgrounds.find((group) => group.id === "essentials");
  const studio = catalog.backgrounds.find((group) => group.id === "studio");

  return (
    <div className="grid gap-[var(--space-pdp-xl)]">
      <PdpStudioPageHeader
        title="Batch"
        description="Prepare one background choice for a group of product images. This UI accepts local previews only and does not process or export files."
        actions={
          <PdpStudioButton type="button" disabled={!ui.files.length}>
            <PdpStudioUiIcon name="play" />
            Preview batch setup
          </PdpStudioButton>
        }
      />

      <section className="grid gap-[var(--space-pdp-md)] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-lg)]">
          <PdpStudioUploadZone
            id="pdp-batch-upload"
            label="Drop images or select up to 12 preview files"
            files={ui.files}
            multiple
            onFiles={ui.addFiles}
          />
          <div className="mt-[var(--space-pdp-md)] flex flex-wrap gap-[var(--space-pdp-xs)]">
            <PdpStudioButton type="button" variant="outline" disabled>
              <PdpStudioUiIcon name="upload" />
              Import images
            </PdpStudioButton>
            <PdpStudioButton type="button" variant="outline" disabled>
              <PdpStudioUiIcon name="folder" />
              Import a folder
            </PdpStudioButton>
          </div>
        </div>

        <aside className="rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-accent-soft)] p-[var(--space-pdp-lg)]">
          <span className="text-[var(--text-pdp-xs)] font-semibold text-[var(--color-pdp-accent)]">Batch capacity</span>
          <p className="mt-[var(--space-pdp-xs)] font-[family-name:var(--font-pdp-mono)] text-[var(--text-pdp-xl)] font-bold">250 images</p>
          <p className="mt-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] leading-relaxed text-[var(--color-pdp-ink-soft)]">
            Max supports up to 250 images; Pro supports up to 50. No plan enforcement is active in this preview.
          </p>
        </aside>
      </section>

      {essentials ? (
        <section>
          <h2 className="text-[var(--text-pdp-lg)] font-bold">Essentials</h2>
          <div className="mt-[var(--space-pdp-md)]">
            <PdpStudioPresetGrid items={essentials.items} selectedId={ui.selectedBackground} onSelect={ui.setSelectedBackground} dense />
          </div>
        </section>
      ) : null}

      {studio ? (
        <section>
          <h2 className="text-[var(--text-pdp-lg)] font-bold">Studio backgrounds</h2>
          <div className="mt-[var(--space-pdp-md)]">
            <PdpStudioPresetGrid items={studio.items} selectedId={ui.selectedBackground} onSelect={ui.setSelectedBackground} dense />
          </div>
        </section>
      ) : null}
    </div>
  );
}

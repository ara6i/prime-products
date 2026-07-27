"use client";

import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import type { useBrandKitUi } from "../../hooks/useBrandKitUi";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

type BrandUi = ReturnType<typeof useBrandKitUi>;

interface BrandInfoPanelProps {
  ui: BrandUi;
}

export function BrandInfoPanel({ ui }: BrandInfoPanelProps) {
  return (
    <section className="max-w-[52rem] rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-lg)]">
      <div className="grid gap-[var(--space-pdp-md)]">
        <label className="grid gap-[var(--space-pdp-xs)]">
          <Label>Brand name</Label>
          <Input value={ui.brandInfo.name} onChange={(event) => ui.setField("name", event.target.value)} className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)]" />
        </label>
        <label className="grid gap-[var(--space-pdp-xs)]">
          <Label>Brand description</Label>
          <textarea
            value={ui.brandInfo.description}
            onChange={(event) => ui.setField("description", event.target.value)}
            className="min-h-[7rem] resize-y rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] p-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] outline outline-2 outline-transparent focus-visible:outline-[var(--color-pdp-focus)]"
          />
          <span className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">Used to tailor generated visual direction.</span>
        </label>
        <div className="grid gap-[var(--space-pdp-md)] md:grid-cols-2">
          <label className="grid gap-[var(--space-pdp-xs)]">
            <Label>Website</Label>
            <Input value={ui.brandInfo.website} onChange={(event) => ui.setField("website", event.target.value)} className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)]" />
          </label>
          <label className="grid gap-[var(--space-pdp-xs)]">
            <Label>Instagram handle</Label>
            <Input value={ui.brandInfo.instagram} onChange={(event) => ui.setField("instagram", event.target.value)} className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)]" />
          </label>
        </div>
        <label className="grid gap-[var(--space-pdp-xs)]">
          <Label>Brand style · optional</Label>
          <textarea
            value={ui.brandInfo.style}
            onChange={(event) => ui.setField("style", event.target.value)}
            className="min-h-[7rem] resize-y rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] p-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] outline outline-2 outline-transparent focus-visible:outline-[var(--color-pdp-focus)]"
          />
        </label>
      </div>
      <div className="mt-[var(--space-pdp-lg)] flex items-center gap-[var(--space-pdp-sm)]">
        <PdpStudioButton type="button" onClick={ui.savePreview}>
          Save preview
        </PdpStudioButton>
        {ui.saved ? (
          <span role="status" className="flex items-center gap-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)] font-semibold text-[var(--color-pdp-success)]">
            <PdpStudioUiIcon name="check" />
            Saved in this tab
          </span>
        ) : null}
      </div>
    </section>
  );
}

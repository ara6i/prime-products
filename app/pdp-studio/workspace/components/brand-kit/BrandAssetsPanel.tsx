"use client";

import Image from "next/image";
import { useState } from "react";
import type { useBrandKitUi } from "../../hooks/useBrandKitUi";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface BrandAssetsPanelProps {
  ui: ReturnType<typeof useBrandKitUi>;
}

export function BrandAssetsPanel({ ui }: BrandAssetsPanelProps) {
  const [color, setColor] = useState("#2154ef");
  const [font, setFont] = useState("");
  return (
    <div className="grid max-w-[60rem] gap-8">
      <section className="rounded-2xl border border-[var(--color-pdp-rule)] bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Logos</h2>
            <p className="mt-1 text-sm text-[var(--color-pdp-muted)]">Private logo assets available to eligible generators.</p>
          </div>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-pdp-rule)] px-3 text-sm font-medium hover:bg-[var(--color-pdp-surface-soft)]">
            <PdpStudioUiIcon name="plus" size={16} />
            Add logo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) void ui.addLogo(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
        {ui.logos.length ? (
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {ui.logos.map((asset) => (
              <div key={asset.id} className="relative aspect-square overflow-hidden rounded-xl border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)]">
                <Image src={asset.url} alt="" fill unoptimized sizes="140px" className="object-contain p-3" />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-[var(--color-pdp-rule-strong)] p-8 text-center text-sm text-[var(--color-pdp-muted)]">
            No logos saved yet.
          </p>
        )}
        {ui.assetNotice ? (
          <p role="status" className="mt-[var(--space-pdp-sm)] rounded-[var(--radius-pdp-sm)] bg-[var(--color-pdp-warning-soft)] p-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-warning)]">
            {ui.assetNotice}
          </p>
        ) : null}
      </section>

      <section className="grid gap-5 rounded-2xl border border-[var(--color-pdp-rule)] bg-white p-5 md:grid-cols-2">
        <div>
          <h2 className="text-base font-semibold">Colors</h2>
          <div className="mt-3 flex gap-2">
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="size-10 rounded border border-[var(--color-pdp-rule)]" />
            <PdpStudioButton type="button" variant="outline" onClick={() => ui.addColor(color)}>Add color</PdpStudioButton>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {ui.colors.map((value) => <span key={value} title={value} className="size-9 rounded-full border border-[var(--color-pdp-rule)]" style={{ backgroundColor: value }} />)}
          </div>
        </div>
        <div>
          <h2 className="text-base font-semibold">Fonts</h2>
          <div className="mt-3 flex gap-2">
            <input value={font} onChange={(event) => setFont(event.target.value)} placeholder="Font family" className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--color-pdp-rule)] px-3 text-sm" />
            <PdpStudioButton type="button" variant="outline" onClick={() => { ui.addFont(font); setFont(""); }}>Add font</PdpStudioButton>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {ui.fonts.map((value) => <span key={value} className="rounded-full bg-[var(--color-pdp-surface-soft)] px-3 py-1.5 text-sm">{value}</span>)}
          </div>
        </div>
        <div className="md:col-span-2">
          <PdpStudioButton type="button" disabled={ui.saving} onClick={() => void ui.save()}>
            {ui.saving ? "Saving…" : "Save assets"}
          </PdpStudioButton>
          {ui.error ? <p role="alert" className="mt-3 text-sm text-red-700">{ui.error}</p> : null}
        </div>
      </section>
    </div>
  );
}

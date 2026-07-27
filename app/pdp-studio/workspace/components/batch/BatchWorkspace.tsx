"use client";

import Image from "next/image";
import { useState } from "react";
import type { PdpStudioAuditCatalog } from "../../types";
import { useBatchWorkspaceUi } from "../../hooks/useBatchWorkspaceUi";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";
import { HomeUpgradeBanner } from "../home/HomeUpgradeBanner";

interface BatchWorkspaceProps {
  catalog: PdpStudioAuditCatalog;
}

export function BatchWorkspace({ catalog }: BatchWorkspaceProps) {
  const ui = useBatchWorkspaceUi();
  const [showUpgrade, setShowUpgrade] = useState(true);
  const essentials = catalog.backgrounds.find((group) => group.id === "sell-ready");
  const studio = catalog.backgrounds.find((group) => group.id === "studio-scenes");

  return (
    <div className="grid gap-8 py-6">
      {showUpgrade ? <HomeUpgradeBanner onDismiss={() => setShowUpgrade(false)} /> : null}

      <section className="rounded-2xl border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-2">
        <label
          htmlFor="pdp-batch-upload"
          className="grid min-h-[22rem] cursor-pointer place-items-center rounded-xl border border-dashed border-[var(--color-pdp-rule-strong)] px-6 py-10 text-center transition-colors hover:bg-[var(--color-pdp-surface-soft)]"
        >
          <input
            id="pdp-batch-upload"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => ui.addFiles(Array.from(event.target.files ?? []))}
          />
          <div>
            <div className="relative mx-auto h-24 w-72">
              <Image
                src="/images/pdp-studio/batch-upload.webp"
                alt=""
                fill
                sizes="288px"
                className="object-contain"
              />
            </div>
            <h2 className="mt-5 text-xl font-semibold">Edit up to 250 images at once</h2>
            <p className="mt-2 text-sm text-[var(--color-pdp-muted)]">
              Drag and drop images or a folder on this page.
            </p>
            {ui.files.length ? (
              <p className="mt-2 text-xs font-medium text-[var(--color-pdp-accent)]">
                {ui.files.length} image{ui.files.length === 1 ? "" : "s"} ready
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <PdpStudioButton type="button">
                <PdpStudioUiIcon name="upload" />
                Import images
              </PdpStudioButton>
              <PdpStudioButton type="button" variant="outline">
                <PdpStudioUiIcon name="folder" />
                Import folder
              </PdpStudioButton>
            </div>
          </div>
        </label>
      </section>

      {essentials ? (
        <BatchPresetRow
          title="Essentials"
          items={essentials.items}
          selectedId={ui.selectedBackground}
          onSelect={ui.setSelectedBackground}
        />
      ) : null}

      {studio ? (
        <BatchPresetRow
          title="Studio"
          items={studio.items}
          selectedId={ui.selectedBackground}
          onSelect={ui.setSelectedBackground}
        />
      ) : null}
    </div>
  );
}

function BatchPresetRow({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: PdpStudioAuditCatalog["backgrounds"][number]["items"];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={selectedId === item.id}
            onClick={() => onSelect(item.id)}
            className="w-36 shrink-0 text-left"
          >
            <span
              className={[
                "relative block aspect-square overflow-hidden rounded-xl border-2 bg-[var(--color-pdp-surface-soft)]",
                selectedId === item.id
                  ? "border-[var(--color-pdp-accent)]"
                  : "border-transparent",
              ].join(" ")}
            >
              {item.image ? (
                <Image src={item.image} alt="" fill sizes="144px" className="object-cover" />
              ) : null}
            </span>
            <span className="mt-2 block truncate text-sm">{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

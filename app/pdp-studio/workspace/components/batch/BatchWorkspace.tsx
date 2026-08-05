"use client";

import Image from "next/image";
import { useState } from "react";
import type { PdpStudioAuditCatalog } from "../../types";
import { useBatchWorkspaceUi } from "../../hooks/useBatchWorkspaceUi";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioPageHeader } from "../shared/PdpStudioPageHeader";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";
import { HomeUpgradeBanner } from "../home/HomeUpgradeBanner";
import { pdpStudioBatchDownloadUrl } from "../../../platform/services/pdpStudioBatchService";

interface BatchWorkspaceProps {
  catalog: PdpStudioAuditCatalog;
}

export function BatchWorkspace({ catalog }: BatchWorkspaceProps) {
  const ui = useBatchWorkspaceUi();
  const [showUpgrade, setShowUpgrade] = useState(true);
  const essentials = catalog.backgrounds.find((group) => group.id === "sell-ready");
  const studio = catalog.backgrounds.find((group) => group.id === "studio-scenes");

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 pb-10">
      <PdpStudioPageHeader
        title="Batch editor"
        description="Apply one workflow to a large product set, review every result, then export together."
      />
      {showUpgrade ? <HomeUpgradeBanner onDismiss={() => setShowUpgrade(false)} /> : null}
      {ui.error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ui.error}</p> : null}

      <section className="rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-2 shadow-[var(--shadow-pdp-card)]">
        <label
          htmlFor="pdp-batch-upload"
          className="grid min-h-[20rem] cursor-pointer place-items-center rounded-[var(--radius-pdp-lg)] border border-dashed border-[var(--color-pdp-rule-strong)] bg-[var(--color-pdp-paper)] px-4 py-8 text-center transition-colors hover:border-[var(--color-pdp-accent)] hover:bg-[var(--color-pdp-accent-soft)] sm:min-h-[22rem] sm:px-6 sm:py-10"
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
            <div className="relative mx-auto h-20 w-full max-w-72 sm:h-24">
              <Image
                src="/images/pdp-studio/batch-upload.webp"
                alt=""
                fill
                sizes="288px"
                className="object-contain"
              />
            </div>
            <h2 className="mt-5 text-xl font-medium">Edit up to 250 images at once</h2>
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
      <section className="rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-white p-5 shadow-[var(--shadow-pdp-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-medium">Process this batch</h2><p className="mt-1 text-sm text-[var(--color-pdp-muted)]">Uploads are private. Each image becomes a tracked child job.</p></div><PdpStudioButton type="button" disabled={!ui.files.length||ui.busy||ui.batch?.status==="running"} onClick={()=>void ui.runBatch()}>{ui.busy?`Uploading ${ui.uploadProgress}%`:`Run ${ui.files.length||""} images`}</PdpStudioButton></div>
        {ui.batch?<div className="mt-5 rounded-2xl border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">{ui.batch.name}</p><p className="text-xs text-[var(--color-pdp-muted)]">{ui.batch.status.replace("_"," ")} · {ui.batch.progress.completed}/{ui.batch.progress.total}</p></div><span className="text-lg font-semibold text-[var(--color-pdp-accent)]">{ui.batch.progress.percent}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[var(--color-pdp-accent)] transition-all" style={{width:`${ui.batch.progress.percent}%`}}/></div><div className="mt-4 flex flex-wrap gap-2">{["queued","running"].includes(ui.batch.status)?<PdpStudioButton variant="outline" onClick={()=>void ui.cancel()}>Cancel</PdpStudioButton>:null}{ui.batch.failedCount?<PdpStudioButton variant="outline" onClick={()=>void ui.retry()}>Retry failed</PdpStudioButton>:null}{ui.batch.succeededCount?<a href={pdpStudioBatchDownloadUrl(ui.batch.id)} className="inline-flex h-10 items-center rounded-xl bg-[#315EF5] px-4 text-sm font-medium text-white">Download ZIP</a>:null}</div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ui.batch.items.map(item=><div key={item.id} className="rounded-xl bg-white p-3 text-xs"><p className="font-medium">{item.progress.stage}</p><p className="mt-1 text-[var(--color-pdp-muted)]">{item.status} · {item.progress.percent}%</p></div>)}</div></div>:null}
      </section>
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
    <section className="rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-4 shadow-[var(--shadow-pdp-card)] sm:p-5">
      <h2 className="text-base font-medium">{title}</h2>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={selectedId === item.id}
            onClick={() => onSelect(item.id)}
            className="w-32 shrink-0 rounded-[var(--radius-pdp-lg)] p-1 text-left outline-none transition-colors hover:bg-[var(--color-pdp-surface-soft)] focus-visible:ring-2 focus-visible:ring-[var(--color-pdp-focus)] sm:w-36"
          >
            <span
              className={[
                "relative block aspect-square overflow-hidden rounded-[var(--radius-pdp-md)] border-2 bg-[var(--color-pdp-surface-soft)]",
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

"use client";

import Image from "next/image";
import type { PdpStudioAuditCatalog } from "../../types";
import { useBatchWorkspaceUi } from "../../hooks/useBatchWorkspaceUi";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface BatchWorkspaceProps {
  catalog: PdpStudioAuditCatalog;
}

export function BatchWorkspace({ catalog }: BatchWorkspaceProps) {
  const ui = useBatchWorkspaceUi();
  const essentials = catalog.backgrounds.find((group) => group.id === "sell-ready");
  const studio = catalog.backgrounds.find((group) => group.id === "studio-scenes");

  return (
    <div className="grid gap-8 py-6">
      <section className="rounded-2xl border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-2">
        <label
          htmlFor="pdp-batch-upload"
          className="grid min-h-[22rem] cursor-pointer place-items-center rounded-xl border border-dashed border-[var(--color-pdp-rule-strong)] px-6 py-10 text-center transition-colors hover:bg-[var(--color-pdp-surface-soft)]"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            ui.addFiles(
              Array.from(event.dataTransfer.files).filter((file) =>
                file.type.startsWith("image/"),
              ),
            );
          }}
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
              Drag and drop images here, or choose image files.
            </p>
            {ui.files.length ? (
              <p className="mt-2 text-xs font-medium text-[var(--color-pdp-accent)]">
                {ui.files.length} image{ui.files.length === 1 ? "" : "s"} ready
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <PdpStudioButton asChild>
                <span>
                  <PdpStudioUiIcon name="upload" />
                  Choose images
                </span>
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

      {ui.files.length || ui.batch ? (
        <section className="rounded-2xl border border-[var(--color-pdp-rule)] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Batch queue</h2>
              <p className="mt-1 text-sm text-[var(--color-pdp-muted)]">
                {ui.batch
                  ? `${ui.batch.progress.completed} of ${ui.batch.progress.total} complete`
                  : `${ui.files.length} private uploads ready`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ui.state === "processing" && ui.batch ? (
                <PdpStudioButton type="button" variant="outline" onClick={() => void ui.cancel()}>
                  Cancel
                </PdpStudioButton>
              ) : null}
              {ui.batch?.failedCount ? (
                <PdpStudioButton type="button" variant="outline" onClick={() => void ui.retryFailed()}>
                  Retry failed
                </PdpStudioButton>
              ) : null}
              {ui.downloadUrl && ui.batch?.succeededCount ? (
                <PdpStudioButton asChild variant="outline">
                  <a href={ui.downloadUrl}>
                    <PdpStudioUiIcon name="download" />
                    Download ZIP
                  </a>
                </PdpStudioButton>
              ) : null}
              {ui.files.length ? (
                <PdpStudioButton
                  type="button"
                  disabled={!ui.canProcess}
                  onClick={() => void ui.processBatch()}
                >
                  <PdpStudioUiIcon name="batch" />
                  {ui.state === "uploading"
                    ? "Uploading…"
                    : ui.state === "processing"
                      ? "Processing…"
                      : `Process ${ui.files.length} images`}
                </PdpStudioButton>
              ) : null}
            </div>
          </div>

          {ui.batch ? (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-pdp-rule)]">
              <span
                className="block h-full rounded-full bg-[var(--color-pdp-accent)] transition-[width]"
                style={{ width: `${ui.batch.progress.percent}%` }}
              />
            </div>
          ) : null}
          {ui.error ? (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {ui.error}
            </p>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {(ui.batch?.items ?? ui.files).map((item, index) => {
              const output = "outputs" in item ? item.outputs[0] : null;
              const source = output?.url ?? ("previewUrl" in item ? item.previewUrl : ui.files[index]?.previewUrl);
              return (
                <figure key={item.id} className="min-w-0">
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)]">
                    {source ? (
                      <Image src={source} alt="" fill unoptimized sizes="160px" className="object-contain" />
                    ) : null}
                    {"status" in item ? (
                      <span className="absolute bottom-2 left-2 rounded bg-white/95 px-2 py-1 text-[0.625rem] font-medium shadow-sm">
                        {item.status}
                      </span>
                    ) : null}
                  </div>
                  <figcaption className="mt-1 truncate text-xs text-[var(--color-pdp-muted)]">
                    {"name" in item ? item.name : `Image ${index + 1}`}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
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

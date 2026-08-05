"use client";

import Image from "next/image";
import Link from "next/link";
import type { ChangeEvent } from "react";
import type {
  PdpStudioAsset,
  PdpStudioJob,
} from "../../../platform/types/pdpStudioPlatform";
import {
  type PdpStudioLibraryTab,
  usePdpStudioAssetLibrary,
} from "../../hooks/usePdpStudioAssetLibrary";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

const TABS: Array<{ id: PdpStudioLibraryTab; label: string }> = [
  { id: "uploads", label: "Uploads" },
  { id: "products", label: "Shopify products" },
  { id: "generated", label: "Generated images" },
];

export function HomeAssetLibrary() {
  const ui = usePdpStudioAssetLibrary();

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    void ui.upload(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  return (
    <section className="rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-4 shadow-[var(--shadow-pdp-card)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--color-pdp-muted)]">Your content</p>
          <h2 className="mt-1 text-[1.125rem] font-medium tracking-[-0.025em]">Image library</h2>
          <p className="mt-1 text-[0.8125rem] text-[var(--color-pdp-muted)]">
            Private uploads, connected products, and persisted generations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer">
            <span className="inline-flex min-h-[var(--size-pdp-control)] items-center gap-2 rounded-[var(--radius-pdp-sm)] bg-[var(--color-pdp-accent)] px-[var(--space-pdp-md)] text-[var(--text-pdp-sm)] font-semibold text-white">
              <PdpStudioUiIcon name="upload" size={17} />
              {ui.working ? "Working…" : "Upload"}
            </span>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              disabled={ui.working}
              className="sr-only"
              onChange={selectFiles}
            />
          </label>
          <PdpStudioButton
            type="button"
            variant="outline"
            disabled={ui.loading}
            onClick={() => void ui.refresh()}
          >
            Refresh
          </PdpStudioButton>
        </div>
      </div>

      <div className="mt-5 flex gap-5 border-b border-[var(--color-pdp-rule)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={ui.tab === tab.id}
            onClick={() => ui.setTab(tab.id)}
            className={[
              "border-b-2 px-0 pb-3 text-[0.8125rem] font-medium",
              ui.tab === tab.id
                ? "border-[var(--color-pdp-accent)] text-[var(--color-pdp-ink)]"
                : "border-transparent text-[var(--color-pdp-muted)]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {ui.error ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {ui.error}
        </p>
      ) : null}

      {ui.loading ? (
        <div className="grid min-h-48 place-items-center text-sm text-[var(--color-pdp-muted)]">
          Loading private library…
        </div>
      ) : ui.tab === "products" ? (
        ui.connection?.connected ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {ui.products.map((product) => (
              <Link
                key={product.id}
                href="/pdp-studio/products"
                className="overflow-hidden rounded-xl border border-[var(--color-pdp-rule)] bg-white"
              >
                <span className="relative block aspect-square bg-[var(--color-pdp-surface-soft)]">
                  {product.featuredImage ? (
                    <Image
                      src={product.featuredImage}
                      alt=""
                      fill
                      unoptimized
                      sizes="240px"
                      className="object-contain"
                    />
                  ) : null}
                </span>
                <span className="block truncate px-3 py-2 text-xs font-medium">
                  {product.title}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyLibrary
            text="Connect Shopify to browse live product images."
            action={<Link href="/pdp-studio/products" className="font-semibold text-[var(--color-pdp-accent)]">Connect Shopify</Link>}
          />
        )
      ) : (
        <AssetGrid
          assets={ui.tab === "uploads" ? ui.uploads : ui.generated}
          emptyText={
            ui.tab === "uploads"
              ? "Private uploads will appear here."
              : "Completed generation outputs will appear here."
          }
          working={ui.working}
          onRemove={ui.remove}
        />
      )}

      <RecentJobs jobs={ui.jobs} />
    </section>
  );
}

function AssetGrid({
  assets,
  emptyText,
  working,
  onRemove,
}: {
  assets: PdpStudioAsset[];
  emptyText: string;
  working: boolean;
  onRemove: (assetId: string) => Promise<void>;
}) {
  if (!assets.length) return <EmptyLibrary text={emptyText} />;
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {assets.map((asset) => (
        <article
          key={asset.id}
          className="group overflow-hidden rounded-xl border border-[var(--color-pdp-rule)] bg-white"
        >
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="relative block aspect-square bg-[var(--color-pdp-surface-soft)]"
          >
            {asset.resourceType === "image" ? (
              <Image
                src={asset.url}
                alt=""
                fill
                unoptimized
                sizes="240px"
                className="object-contain"
              />
            ) : (
              <span className="grid h-full place-items-center text-[var(--color-pdp-accent)]">
                <PdpStudioUiIcon name="video" size={28} />
              </span>
            )}
          </a>
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-xs">
              {asset.originalName || "PDP Studio asset"}
            </span>
            <button
              type="button"
              disabled={working}
              onClick={() => void onRemove(asset.id)}
              className="text-xs text-[var(--color-pdp-muted)] hover:text-red-700"
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptyLibrary({
  text,
  action,
}: {
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-48 place-items-center text-center text-sm text-[var(--color-pdp-muted)]">
      <div>
        <p>{text}</p>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}

function RecentJobs({ jobs }: { jobs: PdpStudioJob[] }) {
  if (!jobs.length) return null;
  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold">Recent processing</h3>
      <div className="mt-3 grid gap-2">
        {jobs.slice(0, 5).map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-3 rounded-lg border border-[var(--color-pdp-rule)] bg-white px-3 py-2 text-xs"
          >
            <span className="min-w-0 flex-1 truncate">{job.toolId}</span>
            <span className="text-[var(--color-pdp-muted)]">
              {job.progress.stage}
            </span>
            <span
              className={
                job.status === "failed"
                  ? "text-red-700"
                  : job.status === "succeeded"
                    ? "text-emerald-700"
                    : "text-[var(--color-pdp-accent)]"
              }
            >
              {job.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

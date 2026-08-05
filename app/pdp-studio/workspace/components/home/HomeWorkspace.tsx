"use client";

import Image from "next/image";
import Link from "next/link";
import type { PdpStudioAuditCatalog } from "../../types";
import { usePdpStudioHomeDialogs } from "../../hooks/usePdpStudioHomeDialogs";
import { usePdpStudioHomeUi } from "../../hooks/usePdpStudioHomeUi";
import { HomeUpgradeBanner } from "./HomeUpgradeBanner";
import { HomeWorkflowCards } from "./HomeWorkflowCards";
import { HomeToolGrid } from "./HomeToolGrid";
import { HomePresetLibrary } from "./HomePresetLibrary";
import { PdpStudioCustomSizeDialog } from "./PdpStudioCustomSizeDialog";
import { PdpStudioInlineToolDialogs } from "../shared/PdpStudioInlineToolDialogs";
import { HomeAssetLibrary } from "./HomeAssetLibrary";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface HomeWorkspaceProps {
  catalog: PdpStudioAuditCatalog;
}

export function HomeWorkspace({ catalog }: HomeWorkspaceProps) {
  const ui = usePdpStudioHomeUi();
  const dialogs = usePdpStudioHomeDialogs();

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-[var(--color-pdp-muted)]">Home · Overview</p>
          <h1 className="mt-2 text-[var(--text-pdp-xl)] font-medium leading-none tracking-[-0.045em]">Creative overview</h1>
          <p className="mt-3 max-w-2xl text-[0.8125rem] leading-6 text-[var(--color-pdp-muted)]">Create, improve, and organize every product visual from one workspace.</p>
        </div>
        <Link href="/pdp-studio/ai-tools" className="inline-flex min-h-[var(--size-pdp-control)] items-center justify-center gap-2 self-start rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-accent)] px-5 text-[0.8125rem] font-medium text-white shadow-[0_0.75rem_2rem_rgb(47_91_234_/_0.2)] transition hover:bg-[var(--color-pdp-accent-hover)] sm:self-auto">
          Explore AI tools <PdpStudioUiIcon name="arrow" size={15} />
        </Link>
      </header>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
        <section className="min-w-0 rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-4 shadow-[var(--shadow-pdp-card)] sm:p-5 lg:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--color-pdp-muted)]">Quick creation</p>
              <h2 className="mt-1 text-[1.125rem] font-medium tracking-[-0.025em]">What do you want to create?</h2>
            </div>
            <span className="hidden rounded-full bg-[var(--color-pdp-accent-soft)] px-3 py-1 text-[0.6875rem] font-medium text-[var(--color-pdp-accent)] sm:inline-flex">Private workspace</span>
          </div>
          <HomeToolGrid
            tools={catalog.tools}
            onOpenImageLibrary={dialogs.openImageLibrary}
            onOpenAiTool={dialogs.openAiTool}
          />
        </section>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
          <article className="relative isolate flex min-h-36 min-w-0 flex-col overflow-hidden rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-accent-border)] bg-[var(--color-pdp-surface-blue)] p-5 shadow-[var(--shadow-pdp-card)]">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[64%]" aria-hidden>
              <Image
                src="/images/pdp-studio/home/prime/right-workflows.webp"
                alt=""
                fill
                priority
                sizes="(max-width: 1023px) 50vw, 22rem"
                className="object-cover object-right"
              />
            </div>
            <div className="relative z-10 flex h-full w-[45%] min-w-28 flex-col">
              <span className="grid size-9 place-items-center rounded-full bg-[var(--color-pdp-accent)] text-white"><PdpStudioUiIcon name="sparkles" size={17} /></span>
              <p className="mt-auto text-[2rem] font-medium leading-none tracking-[-0.05em]">26</p>
              <p className="mt-1 text-[0.75rem] leading-4 text-[var(--color-pdp-muted)]">Creative workflows</p>
            </div>
          </article>
          <article className="relative isolate flex min-h-36 min-w-0 flex-col overflow-hidden rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-orange-border)] bg-white p-5 shadow-[var(--shadow-pdp-card)]">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[64%]" aria-hidden>
              <Image
                src="/images/pdp-studio/home/prime/right-batch.webp"
                alt=""
                fill
                priority
                sizes="(max-width: 1023px) 50vw, 22rem"
                className="object-cover object-right"
              />
            </div>
            <div className="relative z-10 flex h-full w-[45%] min-w-28 flex-col">
              <span className="grid size-9 place-items-center rounded-full bg-[var(--color-pdp-orange-soft)] text-[var(--color-pdp-orange)]"><PdpStudioUiIcon name="batch" size={17} /></span>
              <p className="mt-auto text-[2rem] font-medium leading-none tracking-[-0.05em]">250</p>
              <p className="mt-1 text-[0.75rem] leading-4 text-[var(--color-pdp-muted)]">Images per batch</p>
            </div>
          </article>
        </div>

        <section className="min-w-0 rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-4 shadow-[var(--shadow-pdp-card)] sm:p-5 lg:col-span-8">
          <HomeWorkflowCards
            visible={ui.showWorkflowCards}
            onVisibleChange={ui.setShowWorkflowCards}
          />
        </section>

        {ui.showUpgradeBanner ? (
          <div className="lg:col-span-4">
            <HomeUpgradeBanner onDismiss={() => ui.setShowUpgradeBanner(false)} />
          </div>
        ) : null}

        <section className="rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-4 shadow-[var(--shadow-pdp-card)] sm:p-5 lg:col-span-12">
          <div className="mb-6">
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--color-pdp-muted)]">Reusable looks</p>
            <h2 className="mt-1 text-[1.125rem] font-medium tracking-[-0.025em]">Backgrounds and output presets</h2>
          </div>
          <HomePresetLibrary
            catalog={catalog}
            showMore={ui.showMore}
            selectedPresetId={ui.selectedPresetId}
            onShowMore={ui.setShowMore}
            onSelectPreset={ui.setSelectedPresetId}
            onOpenCustomSize={() => ui.setCustomSizeOpen(true)}
          />
        </section>

        <div className="lg:col-span-12"><HomeAssetLibrary /></div>
      </div>

      <PdpStudioCustomSizeDialog
        open={ui.customSizeOpen}
        width={ui.customWidth}
        height={ui.customHeight}
        onOpenChange={ui.setCustomSizeOpen}
        onWidthChange={ui.setCustomWidth}
        onHeightChange={ui.setCustomHeight}
      />

      <PdpStudioInlineToolDialogs
        dialogs={dialogs}
        tools={catalog.tools}
      />
    </div>
  );
}

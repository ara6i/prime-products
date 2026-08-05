"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/app/shared/components/ui/input";
import { useContentLibraryUi } from "../../hooks/useContentLibraryUi";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";
import { HomeUpgradeBanner } from "../home/HomeUpgradeBanner";
import { PdpStudioPageHeader } from "../shared/PdpStudioPageHeader";

interface ContentLibraryWorkspaceProps {
  kind: "design" | "template";
}

export function ContentLibraryWorkspace({ kind }: ContentLibraryWorkspaceProps) {
  const ui = useContentLibraryUi(kind);
  const [showUpgrade, setShowUpgrade] = useState(true);
  const plural = kind === "design" ? "Designs" : "Templates";
  const itemLabel = kind === "design" ? "design" : "template";

  return (
    <div className="grid gap-6 pb-10">
      <PdpStudioPageHeader
        title={plural}
        description={kind === "design" ? "Organize reusable product compositions for your Space." : "Build repeatable layouts for faster catalog production."}
      />
      <div className="flex flex-wrap justify-end gap-2">
            {kind === "design" ? (
              null
            ) : null}
            <PdpStudioButton type="button" onClick={() => ui.setDialog("item")}>
              <PdpStudioUiIcon name="plus" />
              Create new
            </PdpStudioButton>
      </div>
      {showUpgrade ? <HomeUpgradeBanner onDismiss={() => setShowUpgrade(false)} /> : null}

      {ui.error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ui.error}</p> : null}
      {ui.loading ? <div className="grid min-h-72 place-items-center rounded-[var(--radius-pdp-xl)] bg-white text-sm text-[var(--color-pdp-muted)]">Loading {plural.toLowerCase()}…</div> : ui.items.length ? (
        <div className="grid gap-[var(--space-pdp-sm)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ui.items.map((item) => (
            <article key={item.id} className="rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-md)] shadow-[var(--shadow-pdp-card)]">
              <button type="button" onClick={() => void ui.open(item)} className="block w-full text-left">
              <div className="grid aspect-[4/3] place-items-center rounded-[var(--radius-pdp-md)] bg-[var(--color-pdp-surface-soft)] text-[var(--color-pdp-accent)]">
                <PdpStudioUiIcon name={kind === "design" ? "design" : "template"} />
              </div>
              <h2 className="mt-[var(--space-pdp-sm)] truncate text-[var(--text-pdp-sm)] font-medium">{item.name}</h2>
              <p className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">Updated {new Date(item.updatedAt).toLocaleDateString()}</p>
              </button>
              <button type="button" onClick={() => void ui.remove(item)} className="mt-3 text-xs font-medium text-red-600">Delete</button>
            </article>
          ))}
        </div>
      ) : (
        <section className="grid min-h-[24rem] place-items-center rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-6 text-center shadow-[var(--shadow-pdp-card)] sm:p-[var(--space-pdp-xl)]">
          <div>
            <span className="mx-auto grid size-[3.5rem] place-items-center rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
              <PdpStudioUiIcon name={kind === "design" ? "design" : "template"} />
            </span>
            <h2 className="mt-[var(--space-pdp-md)] text-[var(--text-pdp-lg)] font-medium">No {plural.toLowerCase()} yet</h2>
            <p className="mt-[var(--space-pdp-xs)] max-w-[50ch] text-[var(--text-pdp-sm)] leading-6 text-[var(--color-pdp-muted)]">
              {kind === "design"
                ? "The designs you and other Space members create will appear here. Get started by creating your first design."
                : "Turn any design into a template from its menu. Your Space templates will appear here."}
            </p>
            <PdpStudioButton type="button" onClick={() => ui.setDialog("item")} className="mt-[var(--space-pdp-md)]">
              {kind === "design" ? "Create a design in PrimeStyleAI's Space" : "What is a Template?"}
            </PdpStudioButton>
          </div>
        </section>
      )}

      <Dialog open={Boolean(ui.dialog)} onOpenChange={(open) => !open && ui.setDialog(null)}>
        <DialogContent className="max-w-[min(92vw,28rem)] rounded-[var(--radius-pdp-lg)] border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-pdp-lg)]">
              New {itemLabel}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
              {kind === "design" ? "Create a persisted editable canvas." : "Create a reusable persisted template."}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={ui.name}
            onChange={(event) => ui.setName(event.target.value)}
            placeholder={`${itemLabel} name`}
            className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)]"
          />
          <DialogFooter>
            <PdpStudioButton type="button" disabled={!ui.name.trim()} onClick={() => void ui.createItem()}>
              Create
            </PdpStudioButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import { Input } from "@/app/shared/components/ui/input";
import { useContentLibraryUi } from "../../hooks/useContentLibraryUi";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioPageHeader } from "../shared/PdpStudioPageHeader";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface ContentLibraryWorkspaceProps {
  kind: "design" | "template";
}

export function ContentLibraryWorkspace({ kind }: ContentLibraryWorkspaceProps) {
  const ui = useContentLibraryUi();
  const plural = kind === "design" ? "Designs" : "Templates";
  const itemLabel = kind === "design" ? "design" : "template";

  return (
    <div className="grid gap-[var(--space-pdp-xl)]">
      <PdpStudioPageHeader
        title={plural}
        description={
          kind === "design"
            ? "Designs created by you or other Space members appear in this shared library."
            : "Templates are reusable designs that Space members can apply to multiple images."
        }
        actions={
          <>
            {kind === "design" ? (
              <PdpStudioButton type="button" variant="outline" onClick={() => ui.setDialog("folder")}>
                <PdpStudioUiIcon name="folder" />
                New folder
              </PdpStudioButton>
            ) : null}
            <PdpStudioButton type="button" onClick={() => ui.setDialog("item")}>
              <PdpStudioUiIcon name="plus" />
              New {itemLabel}
            </PdpStudioButton>
          </>
        }
      />

      {ui.items.length ? (
        <div className="grid gap-[var(--space-pdp-sm)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ui.items.map((item) => (
            <article key={item} className="rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-md)]">
              <div className="grid aspect-[4/3] place-items-center rounded-[var(--radius-pdp-md)] bg-[var(--color-pdp-surface-soft)] text-[var(--color-pdp-accent)]">
                <PdpStudioUiIcon name={kind === "design" ? "design" : "template"} />
              </div>
              <h2 className="mt-[var(--space-pdp-sm)] truncate text-[var(--text-pdp-sm)] font-bold">{item}</h2>
              <p className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">Local UI preview</p>
            </article>
          ))}
        </div>
      ) : (
        <section className="grid min-h-[28rem] place-items-center rounded-[var(--radius-pdp-lg)] border border-dashed border-[var(--color-pdp-rule-strong)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-xl)] text-center">
          <div>
            <span className="mx-auto grid size-[3.5rem] place-items-center rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
              <PdpStudioUiIcon name={kind === "design" ? "design" : "template"} />
            </span>
            <h2 className="mt-[var(--space-pdp-md)] text-[var(--text-pdp-lg)] font-bold">No {plural.toLowerCase()} yet</h2>
            <p className="mt-[var(--space-pdp-xs)] max-w-[50ch] text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
              Create a local preview item to verify the library layout. Nothing will be saved to an account.
            </p>
            <PdpStudioButton type="button" onClick={() => ui.setDialog("item")} className="mt-[var(--space-pdp-md)]">
              Create a {itemLabel}
            </PdpStudioButton>
          </div>
        </section>
      )}

      <Dialog open={Boolean(ui.dialog)} onOpenChange={(open) => !open && ui.setDialog(null)}>
        <DialogContent className="max-w-[min(92vw,28rem)] rounded-[var(--radius-pdp-lg)] border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-pdp-lg)]">
              New {ui.dialog === "folder" ? "folder" : itemLabel}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
              This creates an in-memory preview only.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={ui.name}
            onChange={(event) => ui.setName(event.target.value)}
            placeholder={`${ui.dialog === "folder" ? "Folder" : itemLabel} name`}
            className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)]"
          />
          <DialogFooter>
            <PdpStudioButton type="button" disabled={!ui.name.trim()} onClick={ui.createItem}>
              Create preview
            </PdpStudioButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

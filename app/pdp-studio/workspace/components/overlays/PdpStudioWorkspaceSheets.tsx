"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/shared/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/app/shared/components/ui/tabs";
import type { PdpStudioOverlayId } from "../../types";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface PdpStudioWorkspaceSheetsProps {
  activeOverlay: PdpStudioOverlayId | null;
  onClose: () => void;
}

function ActivityContent() {
  const [markedRead, setMarkedRead] = useState(false);
  return (
    <div className="flex min-h-0 flex-1 flex-col p-[var(--space-pdp-md)]">
      <div className="flex items-center justify-between gap-[var(--space-pdp-sm)]">
        <p className="text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">Space edits and comments appear here.</p>
        <PdpStudioButton type="button" variant="ghost" onClick={() => setMarkedRead(true)} className="bg-transparent text-[var(--color-pdp-accent)]">
          Mark all as read
        </PdpStudioButton>
      </div>
      <div className="grid flex-1 place-items-center py-[var(--space-pdp-2xl)] text-center">
        <div>
          <span className="mx-auto grid size-[3rem] place-items-center rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
            <PdpStudioUiIcon name={markedRead ? "check" : "activity"} />
          </span>
          <h3 className="mt-[var(--space-pdp-md)] text-[var(--text-pdp-md)] font-bold">
            {markedRead ? "Everything is read" : "No activity yet"}
          </h3>
          <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
            New edits and comments from Space members will show here.
          </p>
        </div>
      </div>
    </div>
  );
}

function HelpContent() {
  const [tab, setTab] = useState("home");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1">
        <TabsList className="border-b border-[var(--color-pdp-rule)] px-[var(--space-pdp-md)]">
          {["Home", "Messages", "Help"].map((label) => (
            <TabsTrigger
              key={label}
              value={label.toLowerCase()}
              className="min-h-[var(--size-pdp-control)] px-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)]"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="p-[var(--space-pdp-md)]">
          {tab === "home" ? (
            <div className="grid gap-[var(--space-pdp-md)]">
              <div className="rounded-[var(--radius-pdp-lg)] bg-[var(--color-pdp-accent-soft)] p-[var(--space-pdp-lg)]">
                <h3 className="text-[var(--text-pdp-lg)] font-bold">How can we help?</h3>
                <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-ink-soft)]">
                  Browse setup guides or start a support conversation.
                </p>
              </div>
              {["Getting started with PDP Studio", "AI credits and Batch exports", "Plans and billing", "Brand Kit and templates"].map((item) => (
                <PdpStudioButton key={item} type="button" variant="ghost" className="justify-between border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)]">
                  {item}
                  <PdpStudioUiIcon name="arrow" />
                </PdpStudioButton>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center py-[var(--space-pdp-2xl)] text-center">
              <div>
                <PdpStudioUiIcon name={tab === "messages" ? "activity" : "help"} className="mx-auto text-[var(--color-pdp-accent)]" />
                <h3 className="mt-[var(--space-pdp-md)] text-[var(--text-pdp-md)] font-bold">
                  {tab === "messages" ? "No support messages" : "Help center preview"}
                </h3>
                <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
                  External support is not connected in this UI-only build.
                </p>
              </div>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}

export function PdpStudioWorkspaceSheets({
  activeOverlay,
  onClose,
}: PdpStudioWorkspaceSheetsProps) {
  const activityOpen = activeOverlay === "activity";
  const helpOpen = activeOverlay === "help";
  const open = activityOpen || helpOpen;

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-[min(94vw,28rem)] gap-0 border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-0 text-[var(--color-pdp-ink)]"
      >
        <SheetHeader className="border-b border-[var(--color-pdp-rule)] p-[var(--space-pdp-md)]">
          <SheetTitle className="text-[var(--text-pdp-lg)]">{activityOpen ? "Activity" : "Support"}</SheetTitle>
          <SheetDescription className="sr-only">
            {activityOpen ? "PDP Studio activity panel" : "PDP Studio help and support panel"}
          </SheetDescription>
        </SheetHeader>
        {activityOpen ? <ActivityContent /> : <HelpContent />}
      </SheetContent>
    </Sheet>
  );
}

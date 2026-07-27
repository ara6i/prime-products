"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import type { PdpStudioOverlayId } from "../../types";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface PdpStudioWorkspaceDialogsProps {
  activeOverlay: PdpStudioOverlayId | null;
  onClose: () => void;
  onOpenOverlay: (overlay: PdpStudioOverlayId) => void;
}

function ApiDialogContent() {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-[var(--text-pdp-lg)]">
          Chat about Enterprise integrations
        </DialogTitle>
        <DialogDescription className="text-[var(--text-pdp-sm)] leading-6 text-[var(--color-pdp-muted)]">
          Connect to one powerful API and gain access to our best in class image
          editing solutions and supercharge your workflows.
        </DialogDescription>
      </DialogHeader>
      <PdpStudioButton type="button" disabled className="w-full">
        Generate my API key
      </PdpStudioButton>
      <div className="grid gap-[var(--space-pdp-sm)]">
        {[
          "Integrate PrimeStyleAI into your product",
          "Add the API to your internal image-editing process",
          "API Documentation",
          "Talk to Sales",
        ].map((item) => (
          <div key={item} className="flex items-center gap-[var(--space-pdp-sm)] rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-rule)] p-[var(--space-pdp-md)]">
            <span className="grid size-[2.5rem] shrink-0 place-items-center rounded-[var(--radius-pdp-sm)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
              <PdpStudioUiIcon name="api" />
            </span>
            <span className="text-[var(--text-pdp-sm)] font-medium">{item}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const ACCOUNT_PREFERENCES = ["Profile", "Billing", "Usage", "Sign out"] as const;
const SPACE_PREFERENCES = ["Space details", "Members", "Billing", "Usage", "Settings"] as const;

const EXPORT_FORMATS = [
  ["Best for image", "PrimeStyleAI saves in .jpg for smaller files, or .png for images with transparency"],
  [".png", "Bigger file size, transparency is saved"],
  [".jpg", "Smaller file size, transparency is not saved"],
  [".webp", "Smaller file size, transparency is saved"],
  [".avif", "Best compression, transparency is saved"],
] as const;

function PreferenceToggle({
  label,
  description,
  defaultChecked = true,
}: {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="relative h-5 w-9 shrink-0 rounded-full bg-[var(--color-pdp-rule-strong)] transition-colors peer-checked:bg-[var(--color-pdp-accent)] after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4" />
      <span>
        <span className="block text-[0.875rem] font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[0.75rem] text-[var(--color-pdp-muted)]">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function SettingsPreferences() {
  return (
    <div className="grid gap-9 pb-10">
      <section>
        <h2 className="text-[1.25rem] font-semibold">Default export</h2>
        <div className="mt-6 rounded-xl bg-[var(--color-pdp-surface-soft)] p-6">
          <h3 className="text-[0.875rem] font-medium">Download file format</h3>
          <fieldset className="mt-3 grid gap-3">
            <legend className="sr-only">Download file format</legend>
            {EXPORT_FORMATS.map(([format, description], index) => (
              <label key={format} className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="pdp-export-format"
                  defaultChecked={index === 0}
                  className="mt-0.5 size-5 accent-[var(--color-pdp-accent)]"
                />
                <span>
                  <span className="block text-[0.875rem] font-medium">{format}</span>
                  <span className="mt-0.5 block text-[0.75rem] leading-4 text-[var(--color-pdp-muted)]">
                    {description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="mt-5 border-t border-[var(--color-pdp-rule)] pt-5">
            <PreferenceToggle label="Keep original file name" />
          </div>
        </div>
      </section>
      <section>
        <h2 className="text-[1.25rem] font-semibold">Editing</h2>
        <div className="mt-6 rounded-xl bg-[var(--color-pdp-surface-soft)] p-6">
          <PreferenceToggle
            label="Enable automatic regeneration"
            description="For AI Backgrounds and AI Shadows"
          />
        </div>
      </section>
      <section>
        <h2 className="text-[1.25rem] font-semibold">Content control</h2>
        <div className="mt-6 grid gap-4 rounded-xl bg-[var(--color-pdp-surface-soft)] p-6">
          <PreferenceToggle label="New designs private" defaultChecked={false} />
          <PreferenceToggle label="Show Space templates only" defaultChecked={false} />
          <PreferenceToggle label="Block export in Space" defaultChecked={false} />
        </div>
      </section>
    </div>
  );
}

function PreferencesDialogContent() {
  const [active, setActive] = useState("Settings");
  return (
    <div className="grid h-full min-h-0 grid-cols-[17.5rem_minmax(0,1fr)]">
      <DialogTitle className="sr-only">Preferences</DialogTitle>
      <DialogDescription className="sr-only">Account and Space preferences.</DialogDescription>
      <aside className="min-h-0 overflow-y-auto border-r border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)] px-6 py-7">
        <nav>
          <p className="px-3 text-[0.8125rem] text-[var(--color-pdp-muted)]">Account</p>
          <div className="mt-2 grid gap-0.5">
            {ACCOUNT_PREFERENCES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActive(item)}
              className={[
                  "min-h-9 rounded-lg px-3 text-left text-[0.875rem]",
                active === item
                    ? "bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)]"
                  : "text-[var(--color-pdp-ink-soft)] hover:bg-[var(--color-pdp-surface-soft)]",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
          </div>
          <p className="mt-8 flex items-center gap-2 px-3 text-[0.8125rem] font-medium text-[var(--color-pdp-muted)]">
            <PdpStudioUiIcon name="chevron" size={13} />
            PrimeStyleAI&apos;s Space
          </p>
          <div className="mt-2 grid gap-0.5">
            {SPACE_PREFERENCES.map((item) => (
              <button
                key={`space-${item}`}
                type="button"
                onClick={() => setActive(item)}
                className={[
                  "min-h-9 rounded-lg px-3 text-left text-[0.875rem]",
                  active === item
                    ? "bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)] shadow-sm"
                    : "text-[var(--color-pdp-ink-soft)] hover:bg-[var(--color-pdp-surface)]",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>
        </nav>
      </aside>
      <section className="min-h-0 overflow-y-auto px-16 py-10">
        {active === "Settings" ? (
          <SettingsPreferences />
        ) : (
          <>
            <h2 className="text-[1.25rem] font-semibold">{active}</h2>
            <div className="mt-6 rounded-xl bg-[var(--color-pdp-surface-soft)] p-6 text-[0.875rem] text-[var(--color-pdp-muted)]">
              {active} settings are represented as a UI-only preview.
            </div>
          </>
        )}
      </section>
      <DialogClose
        aria-label="Close preferences"
        className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)] shadow-sm hover:bg-[var(--color-pdp-surface-soft)]"
      >
        <PdpStudioUiIcon name="close" size={18} />
      </DialogClose>
    </div>
  );
}

function SpaceDialogContent({
  onOpenOverlay,
}: {
  onOpenOverlay: (overlay: PdpStudioOverlayId) => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-[var(--text-pdp-lg)]">Primestyleai’s Space</DialogTitle>
        <DialogDescription className="text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
          Private workspace · only yours
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-[var(--space-pdp-xs)]">
        <PdpStudioButton asChild type="button" variant="ghost" className="justify-start border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)]">
          <Link href="/pdp-studio/preferences">
            <PdpStudioUiIcon name="settings" />
            Manage Space
          </Link>
        </PdpStudioButton>
        <PdpStudioButton type="button" variant="ghost" onClick={() => onOpenOverlay("mobile-login")} className="justify-start border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)]">
          <PdpStudioUiIcon name="profile" />
          Log in to mobile app
        </PdpStudioButton>
        <PdpStudioButton asChild type="button" variant="ghost" className="justify-start border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)]">
          <Link href="/pdp-studio/preferences">
            <PdpStudioUiIcon name="profile" />
            Open Profile
          </Link>
        </PdpStudioButton>
        <PdpStudioButton type="button" variant="ghost" disabled className="justify-start border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-muted)]">
          <PdpStudioUiIcon name="plus" />
          Create a Space · preview only
        </PdpStudioButton>
        <PdpStudioButton type="button" variant="ghost" disabled className="justify-start border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-muted)]">
          <PdpStudioUiIcon name="profile" />
          Sign out · preview only
        </PdpStudioButton>
      </div>
    </>
  );
}

function MobileLoginContent() {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-[var(--text-pdp-lg)]">Log in to mobile app</DialogTitle>
        <DialogDescription className="text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
          The QR surface is a non-functional UI preview and carries no sign-in token.
        </DialogDescription>
      </DialogHeader>
      <div className="mx-auto grid aspect-square w-[min(62vw,15rem)] place-items-center rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)] text-[var(--color-pdp-accent)]">
        <PdpStudioUiIcon name="profile" size={56} />
      </div>
      <PdpStudioButton type="button" variant="ghost" disabled className="w-full border border-[var(--color-pdp-rule)] bg-transparent text-[var(--color-pdp-muted)]">
        View login details instead · preview only
      </PdpStudioButton>
    </>
  );
}

export function PdpStudioWorkspaceDialogs({
  activeOverlay,
  onClose,
  onOpenOverlay,
}: PdpStudioWorkspaceDialogsProps) {
  const open =
    activeOverlay === "api" ||
    activeOverlay === "preferences" ||
    activeOverlay === "space" ||
    activeOverlay === "mobile-login";
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className={[
          "rounded-[var(--radius-pdp-lg)] border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] p-0 text-[var(--color-pdp-ink)]",
          activeOverlay === "preferences"
            ? "z-[601] h-[calc(100dvh-8rem)] max-h-none max-w-none overflow-hidden rounded-xl sm:max-w-none"
            : "max-w-[min(92vw,34rem)] p-6",
        ].join(" ")}
        style={
          activeOverlay === "preferences"
            ? {
                width: "calc(100vw - 8rem)",
                maxWidth: "none",
                zIndex: 601,
              }
            : undefined
        }
        showCloseButton={activeOverlay !== "preferences"}
        overlayClassName={
          activeOverlay === "preferences"
            ? "!z-[600] bg-black/45 backdrop-blur-[1px]"
            : undefined
        }
      >
        {activeOverlay === "api" ? <ApiDialogContent /> : null}
        {activeOverlay === "preferences" ? <PreferencesDialogContent /> : null}
        {activeOverlay === "space" ? <SpaceDialogContent onOpenOverlay={onOpenOverlay} /> : null}
        {activeOverlay === "mobile-login" ? <MobileLoginContent /> : null}
      </DialogContent>
    </Dialog>
  );
}

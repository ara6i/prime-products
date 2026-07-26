"use client";

import Image from "next/image";
import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import type { PdpStudioAuditCatalog } from "../../types";
import { usePreferencesWorkspaceUi } from "../../hooks/usePreferencesWorkspaceUi";
import { PreferenceNavigation } from "./PreferenceNavigation";
import { PreferenceCard, SavedIndicator } from "./PreferencePrimitives";
import { PdpStudioButton } from "../shared/PdpStudioButton";

interface PreferencesWorkspaceProps {
  catalog: PdpStudioAuditCatalog;
}

export function PreferencesWorkspace({ catalog }: PreferencesWorkspaceProps) {
  const ui = usePreferencesWorkspaceUi();

  return (
    <div className="grid gap-[var(--space-pdp-xl)]">
      <p className="max-w-[65ch] text-[var(--text-pdp-sm)] leading-relaxed text-[var(--color-pdp-muted)]">
        Manage your account identity and default PDP Studio Space.
      </p>
      <div className="grid items-start gap-[var(--space-pdp-md)] lg:grid-cols-[15rem_minmax(0,1fr)]">
        <PreferenceNavigation sections={catalog.preferenceSections} activeSection={ui.activeSection} onSelect={ui.setActiveSection} />
        {ui.activeSection === "account-profile" ? (
          <PreferenceCard title="Profile" description="Your account name, email, and private profile photo.">
            <div className="grid gap-5">
              <div className="flex items-center gap-4">
                <div className="relative grid size-20 place-items-center overflow-hidden rounded-full bg-[var(--color-pdp-accent-soft)] text-xl font-semibold text-[var(--color-pdp-accent)]">
                  {ui.photo ? <Image src={ui.photo.url} alt="" fill unoptimized sizes="80px" className="object-cover" /> : ui.displayName.charAt(0).toUpperCase()}
                </div>
                <label className="cursor-pointer rounded-lg border border-[var(--color-pdp-rule)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-pdp-surface-soft)]">
                  Change photo
                  <input type="file" accept="image/*" className="sr-only" onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void ui.uploadPhoto(file);
                    event.currentTarget.value = "";
                  }} />
                </label>
              </div>
              <label className="grid gap-2">
                <Label>Display name</Label>
                <Input value={ui.displayName} onChange={(event) => ui.setDisplayName(event.target.value)} />
              </label>
              <label className="grid gap-2">
                <Label>Email</Label>
                <Input value={ui.email} disabled />
              </label>
              <div className="flex items-center gap-3">
                <PdpStudioButton type="button" disabled={ui.saving} onClick={() => void ui.save("account-profile")}>{ui.saving ? "Saving…" : "Save profile"}</PdpStudioButton>
                <SavedIndicator visible={ui.savedSection === "account-profile"} />
              </div>
              {ui.error ? <p role="alert" className="text-sm text-red-700">{ui.error}</p> : null}
            </div>
          </PreferenceCard>
        ) : (
          <PreferenceCard title="Space details" description="The default private Space used for assets and jobs.">
            <div className="grid gap-5">
              <label className="grid gap-2">
                <Label>Space name</Label>
                <Input value={ui.spaceName} onChange={(event) => ui.setSpaceName(event.target.value)} />
              </label>
              <div className="flex items-center gap-3">
                <PdpStudioButton type="button" disabled={ui.saving} onClick={() => void ui.save("space-details")}>{ui.saving ? "Saving…" : "Save Space"}</PdpStudioButton>
                <SavedIndicator visible={ui.savedSection === "space-details"} />
              </div>
              {ui.error ? <p role="alert" className="text-sm text-red-700">{ui.error}</p> : null}
            </div>
          </PreferenceCard>
        )}
      </div>
    </div>
  );
}

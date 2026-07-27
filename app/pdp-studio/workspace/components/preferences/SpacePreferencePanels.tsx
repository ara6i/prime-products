"use client";

import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import type { usePreferencesWorkspaceUi } from "../../hooks/usePreferencesWorkspaceUi";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PreferenceCard, SavedIndicator, ToggleRow } from "./PreferencePrimitives";

type PreferencesUi = ReturnType<typeof usePreferencesWorkspaceUi>;

function SpaceSettings({ ui }: { ui: PreferencesUi }) {
  return (
    <PreferenceCard title="Space settings" description="Default export, editing behavior, and content-control rules.">
      <div className="grid gap-[var(--space-pdp-md)]">
        <label className="grid max-w-[26rem] gap-[var(--space-pdp-xs)]">
          <Label>Default export</Label>
          <select value={ui.exportFormat} onChange={(event) => ui.setExportFormat(event.target.value)} className="h-[var(--size-pdp-control)] rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] px-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] outline outline-2 outline-transparent focus-visible:outline-[var(--color-pdp-focus)]">
            {["Best for image", "PNG", "JPG", "WebP", "AVIF"].map((format) => <option key={format}>{format}</option>)}
          </select>
          <span className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
            PNG and AVIF preserve transparency; JPG creates smaller opaque files.
          </span>
        </label>
        <ToggleRow label="Keep original file name" description="Retain the source name when exporting." checked={ui.toggles.keepFilename} onToggle={() => ui.toggle("keepFilename")} />
        <ToggleRow label="Automatic AI regeneration" description="Automatically regenerate AI Backgrounds and AI Shadows." checked={ui.toggles.autoRegenerate} onToggle={() => ui.toggle("autoRegenerate")} />
        <ToggleRow label="Make new designs private" description="Only the creator can see a new design until it is shared." checked={ui.toggles.privateDesigns} onToggle={() => ui.toggle("privateDesigns")} />
        <ToggleRow label="Show Space templates only" description="Hide templates that were not created by Space members." checked={ui.toggles.spaceTemplatesOnly} onToggle={() => ui.toggle("spaceTemplatesOnly")} />
        <ToggleRow label="Block export in Space" description="Admins can prevent all Space members from exporting." checked={ui.toggles.blockExports} onToggle={() => ui.toggle("blockExports")} />
        <div className="flex items-center gap-[var(--space-pdp-sm)]">
          <PdpStudioButton type="button" onClick={() => ui.save("space-settings")}>Save settings</PdpStudioButton>
          <SavedIndicator visible={ui.savedSection === "space-settings"} />
        </div>
      </div>
    </PreferenceCard>
  );
}

export function SpacePreferencePanels({
  section,
  ui,
}: {
  section: string;
  ui: PreferencesUi;
}) {
  if (section === "space-settings") return <SpaceSettings ui={ui} />;

  if (section === "space-members") {
    return (
      <PreferenceCard title="Members" description="Search members, invite people, and review admin roles.">
        <div className="flex flex-col gap-[var(--space-pdp-md)] sm:flex-row">
          <Input placeholder="Search Space members" className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)]" />
          <PdpStudioButton type="button" disabled>Invite people · preview only</PdpStudioButton>
        </div>
        <div className="mt-[var(--space-pdp-md)] flex items-center justify-between rounded-[var(--radius-pdp-md)] bg-[var(--color-pdp-surface-soft)] p-[var(--space-pdp-md)]">
          <div>
            <p className="text-[var(--text-pdp-sm)] font-semibold">PrimeStyleAI</p>
            <p className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">admin@primestyleai.com</p>
          </div>
          <span className="rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-accent-soft)] px-[var(--space-pdp-sm)] py-[var(--space-pdp-2xs)] text-[var(--text-pdp-xs)] font-semibold text-[var(--color-pdp-accent)]">Admin</span>
        </div>
      </PreferenceCard>
    );
  }

  if (section === "space-details") {
    return (
      <PreferenceCard title="Space details" description="Manage the shared Space identity.">
        <div className="grid gap-[var(--space-pdp-md)]">
          <label className="grid gap-[var(--space-pdp-xs)]">
            <Label>Space name</Label>
            <Input value={ui.spaceName} onChange={(event) => ui.setSpaceName(event.target.value)} className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)]" />
          </label>
          <label className="grid gap-[var(--space-pdp-xs)]">
            <Label>Space description</Label>
            <textarea value={ui.spaceDescription} onChange={(event) => ui.setSpaceDescription(event.target.value)} className="min-h-[7rem] resize-y rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] p-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] outline outline-2 outline-transparent focus-visible:outline-[var(--color-pdp-focus)]" />
          </label>
          <div className="flex items-center gap-[var(--space-pdp-sm)]">
            <PdpStudioButton type="button" onClick={() => ui.save("space-details")}>Save details</PdpStudioButton>
            <SavedIndicator visible={ui.savedSection === "space-details"} />
          </div>
        </div>
      </PreferenceCard>
    );
  }

  return (
    <PreferenceCard title={section === "space-billing" ? "Space billing" : "Space usage"} description="This panel is a UI-only representation of the audited Space controls.">
      <div className="rounded-[var(--radius-pdp-md)] bg-[var(--color-pdp-accent-soft)] p-[var(--space-pdp-lg)]">
        <p className="text-[var(--text-pdp-xl)] font-bold">{section === "space-billing" ? "Free Space" : "18 AI credits · 26 exports"}</p>
        <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
          {section === "space-billing" ? "Upgrade controls are disabled in UI preview mode." : "Sample values renew August 24."}
        </p>
      </div>
    </PreferenceCard>
  );
}

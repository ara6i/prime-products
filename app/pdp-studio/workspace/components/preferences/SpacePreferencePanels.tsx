"use client";

import { useState } from "react";

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
            <option value="png">PNG</option><option value="jpeg">JPG</option><option value="webp">WebP</option>
          </select>
          <span className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
            PNG and AVIF preserve transparency; JPG creates smaller opaque files.
          </span>
        </label>
        <label className="grid max-w-[26rem] gap-1"><Label>Export quality · {ui.exportQuality}%</Label><input type="range" min="1" max="100" value={ui.exportQuality} onChange={event=>ui.setExportQuality(Number(event.target.value))} className="accent-[var(--color-pdp-accent)]"/></label>
        <ToggleRow label="Content safety" description="Apply the configured provider safety policies to generation jobs." checked={ui.toggles.contentSafety} onToggle={() => ui.toggle("contentSafety")} />
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
    const InviteMembers = () => {
      const [email,setEmail]=useState(""); const [role,setRole]=useState("editor"); const [notice,setNotice]=useState("");
      return <><div className="flex flex-col gap-2 sm:flex-row"><Input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Member email" className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)]"/><select value={role} onChange={e=>setRole(e.target.value)} className="h-[var(--size-pdp-control)] rounded-xl border border-[var(--color-pdp-rule)] bg-white px-3 text-sm"><option value="admin">Admin</option><option value="editor">Editor</option><option value="reviewer">Reviewer</option><option value="viewer">Viewer</option></select><PdpStudioButton disabled={!email.trim()} onClick={async()=>{const result=await ui.invite(email,role);if(result)setNotice(`Invitation created for ${result.email}. It expires ${new Date(result.expiresAt).toLocaleDateString()}.`);setEmail("")}}>Invite</PdpStudioButton></div>{notice?<p className="mt-2 text-xs text-[var(--color-pdp-success)]">{notice}</p>:null}</>;
    };
    return (
      <PreferenceCard title="Members" description="Search members, invite people, and review admin roles.">
        <InviteMembers />
        <div className="mt-4 grid gap-2">{ui.members.map(member=><div key={member.accountId} className="flex items-center justify-between rounded-[var(--radius-pdp-md)] bg-[var(--color-pdp-surface-soft)] p-[var(--space-pdp-md)]"><div><p className="text-sm font-medium">{member.name}</p><p className="text-xs text-[var(--color-pdp-muted)]">{member.email}</p></div><span className="rounded-full bg-[var(--color-pdp-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--color-pdp-accent)]">{member.role}</span></div>)}</div>
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
    <PreferenceCard title={section === "space-billing" ? "Space billing" : "Space usage"} description="Live workspace limits and immutable usage data.">
      <div className="rounded-[var(--radius-pdp-md)] bg-[var(--color-pdp-accent-soft)] p-[var(--space-pdp-lg)]">
        <p className="text-[var(--text-pdp-xl)] font-medium">{section === "space-billing" ? `${ui.billing?.plan ?? "free"} Space` : `${ui.usage?.credits.used ?? 0} AI credits · ${ui.usage?.exports.used ?? 0} exports`}</p>
        <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
          {section === "space-billing" ? (ui.billing?.checkoutReady ? "Checkout is configured." : "Checkout stays disabled until all six Lemon Squeezy variants are configured.") : "Usage is read from the workspace ledger."}
        </p>
      </div>
    </PreferenceCard>
  );
}

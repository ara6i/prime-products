"use client";

import type { PdpStudioAuditCatalog } from "../../types";
import { usePreferencesWorkspaceUi } from "../../hooks/usePreferencesWorkspaceUi";
import { PdpStudioPageHeader } from "../shared/PdpStudioPageHeader";
import { AccountPreferencePanels } from "./AccountPreferencePanels";
import { PreferenceNavigation } from "./PreferenceNavigation";
import { SpacePreferencePanels } from "./SpacePreferencePanels";

interface PreferencesWorkspaceProps {
  catalog: PdpStudioAuditCatalog;
}

export function PreferencesWorkspace({ catalog }: PreferencesWorkspaceProps) {
  const ui = usePreferencesWorkspaceUi();
  const accountSection = ui.activeSection.startsWith("account-");

  return (
    <div className="grid gap-8 pb-10">
      <PdpStudioPageHeader
        title="Preferences"
        description="Account identity, billing, usage, Space members, export defaults, and content controls."
      />
      <div className="grid items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <PreferenceNavigation sections={catalog.preferenceSections} activeSection={ui.activeSection} onSelect={ui.setActiveSection} />
        {accountSection ? (
          <AccountPreferencePanels section={ui.activeSection} ui={ui} plans={catalog.plans} />
        ) : (
          <SpacePreferencePanels section={ui.activeSection} ui={ui} />
        )}
      </div>
    </div>
  );
}

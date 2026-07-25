import { PreferencesWorkspace } from "../workspace/components/preferences/PreferencesWorkspace";
import { PdpStudioAppShell } from "../workspace/components/shell/PdpStudioAppShell";
import { loadPdpStudioPageContext } from "../workspace/services/loadPdpStudioPageContext";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Preferences · PDP Studio",
};

export default async function PdpStudioPreferencesPage() {
  const { user, view } = await loadPdpStudioPageContext();
  return (
    <PdpStudioAppShell user={user} view={view}>
      <PreferencesWorkspace catalog={view.catalog} />
    </PdpStudioAppShell>
  );
}

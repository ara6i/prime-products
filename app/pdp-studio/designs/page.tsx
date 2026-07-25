import { ContentLibraryWorkspace } from "../workspace/components/library/ContentLibraryWorkspace";
import { PdpStudioAppShell } from "../workspace/components/shell/PdpStudioAppShell";
import { loadPdpStudioPageContext } from "../workspace/services/loadPdpStudioPageContext";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Designs · PDP Studio",
};

export default async function PdpStudioDesignsPage() {
  const { user, view } = await loadPdpStudioPageContext();
  return (
    <PdpStudioAppShell user={user} view={view}>
      <ContentLibraryWorkspace kind="design" />
    </PdpStudioAppShell>
  );
}

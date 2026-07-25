import { BatchWorkspace } from "../workspace/components/batch/BatchWorkspace";
import { PdpStudioAppShell } from "../workspace/components/shell/PdpStudioAppShell";
import { loadPdpStudioPageContext } from "../workspace/services/loadPdpStudioPageContext";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Batch · PDP Studio",
};

export default async function PdpStudioBatchPage() {
  const { user, view } = await loadPdpStudioPageContext();
  return (
    <PdpStudioAppShell user={user} view={view}>
      <BatchWorkspace catalog={view.catalog} />
    </PdpStudioAppShell>
  );
}

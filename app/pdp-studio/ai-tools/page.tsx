import { AiToolsWorkspace } from "../workspace/components/ai-tools/AiToolsWorkspace";
import { PdpStudioAppShell } from "../workspace/components/shell/PdpStudioAppShell";
import { loadPdpStudioPageContext } from "../workspace/services/loadPdpStudioPageContext";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Tools · PDP Studio",
};

export default async function PdpStudioAiToolsPage() {
  const { user, view } = await loadPdpStudioPageContext();
  return (
    <PdpStudioAppShell user={user} view={view}>
      <AiToolsWorkspace catalog={view.catalog} />
    </PdpStudioAppShell>
  );
}

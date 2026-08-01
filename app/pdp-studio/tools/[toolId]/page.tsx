import { notFound } from "next/navigation";
import { PdpStudioAppShell } from "../../workspace/components/shell/PdpStudioAppShell";
import { ToolWorkspace } from "../../workspace/components/tools/ToolWorkspace";
import { loadPdpStudioPageContext } from "../../workspace/services/loadPdpStudioPageContext";
import { getPdpStudioToolDefinition } from "../../workspace/services/pdpStudioUiService";
import { AiBackgroundsWorkspace } from "../../ai-backgrounds/components/AiBackgroundsWorkspace";
import { PhotoEditorWorkspace } from "../../photo-editor/components/PhotoEditorWorkspace";

interface PdpStudioToolPageProps {
  params: Promise<{ toolId: string }>;
}

export const dynamic = "force-dynamic";

export default async function PdpStudioToolPage({
  params,
}: PdpStudioToolPageProps) {
  const { toolId } = await params;
  const [{ user, view }, tool] = await Promise.all([
    loadPdpStudioPageContext(),
    getPdpStudioToolDefinition(toolId),
  ]);

  if (!tool) notFound();

  if (tool.id === "ai-backgrounds") {
    return <AiBackgroundsWorkspace />;
  }

  if (tool.id === "retouch" || tool.id === "background-remover") {
    return <PhotoEditorWorkspace tool={tool.id} />;
  }

  return (
    <PdpStudioAppShell user={user} view={view}>
      <ToolWorkspace tool={tool} catalog={view.catalog} />
    </PdpStudioAppShell>
  );
}

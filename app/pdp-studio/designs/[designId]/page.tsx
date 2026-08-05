import { PdpStudioEditorWorkspace } from "../../editor/components/PdpStudioEditorWorkspace";
import { PdpStudioAppShell } from "../../workspace/components/shell/PdpStudioAppShell";
import { loadPdpStudioPageContext } from "../../workspace/services/loadPdpStudioPageContext";
export const dynamic="force-dynamic";
export default async function PdpStudioDesignEditorPage({params}:{params:Promise<{designId:string}>}){const [{designId},{user,view}]=await Promise.all([params,loadPdpStudioPageContext()]);return <PdpStudioAppShell user={user} view={view}><PdpStudioEditorWorkspace designId={designId}/></PdpStudioAppShell>}

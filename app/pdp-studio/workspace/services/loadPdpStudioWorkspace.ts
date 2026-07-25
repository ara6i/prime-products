import { mapPdpStudioWorkspaceView } from "../mappers/pdpStudioWorkspaceMapper";
import { getPdpStudioAuditCatalog } from "./pdpStudioUiService";
import type { PdpStudioWorkspaceView } from "../types";

export async function loadPdpStudioWorkspace(): Promise<PdpStudioWorkspaceView> {
  const catalog = await getPdpStudioAuditCatalog();
  return mapPdpStudioWorkspaceView(catalog);
}

import { PDP_STUDIO_AUDIT_CATALOG } from "../data/pdpStudioAuditData";
import type { PdpStudioAuditCatalog, PdpStudioToolDefinition, PdpStudioToolId } from "../types";

export async function getPdpStudioAuditCatalog(): Promise<PdpStudioAuditCatalog> {
  return PDP_STUDIO_AUDIT_CATALOG;
}

export async function getPdpStudioToolDefinition(
  toolId: string,
): Promise<PdpStudioToolDefinition | null> {
  const catalog = await getPdpStudioAuditCatalog();
  return catalog.tools.find((tool) => tool.id === (toolId as PdpStudioToolId)) ?? null;
}

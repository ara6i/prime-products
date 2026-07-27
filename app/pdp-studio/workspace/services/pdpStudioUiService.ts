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

export interface PdpStudioPreviewResult {
  id: string;
  createdAt: string;
  mode: "ui-preview";
}

export async function previewPdpStudioToolConfiguration(): Promise<PdpStudioPreviewResult> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 450);
  });
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    mode: "ui-preview",
  };
}

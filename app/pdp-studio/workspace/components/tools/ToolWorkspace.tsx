"use client";

import type {
  PdpStudioAuditCatalog,
  PdpStudioToolDefinition,
} from "../../types";
import { useToolWorkspaceUi } from "../../hooks/useToolWorkspaceUi";
import { PdpStudioPageHeader } from "../shared/PdpStudioPageHeader";
import { PdpStudioToolCard } from "../shared/PdpStudioToolCard";
import { ToolControlPanel } from "./ToolControlPanel";
import { ToolPreviewCanvas } from "./ToolPreviewCanvas";

interface ToolWorkspaceProps {
  tool: PdpStudioToolDefinition;
  catalog: PdpStudioAuditCatalog;
}

export function ToolWorkspace({ tool, catalog }: ToolWorkspaceProps) {
  const ui = useToolWorkspaceUi(tool);

  if (tool.mode === "chooser") {
    const creationTools = catalog.tools.filter(
      (item) => item.group === "create" && item.id !== tool.id,
    );
    return (
      <div className="grid gap-[var(--space-pdp-xl)]">
        <PdpStudioPageHeader title={tool.label} description={tool.description} />
        <div className="grid gap-[var(--space-pdp-sm)] sm:grid-cols-2 xl:grid-cols-3">
          {creationTools.map((item) => (
            <PdpStudioToolCard key={item.id} tool={item} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-[var(--space-pdp-xl)]">
      <PdpStudioPageHeader title={tool.label} description={tool.description} />
      <div className="grid items-start gap-[var(--space-pdp-md)] xl:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]">
        <ToolControlPanel tool={tool} ui={ui} />
        <ToolPreviewCanvas tool={tool} ui={ui} />
      </div>
    </div>
  );
}

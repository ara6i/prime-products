"use client";

import type { ReactNode } from "react";
import type {
  PdpStudioAuditCatalog,
  PdpStudioToolId,
} from "../../types";
import {
  isPdpStudioHomeAiToolId,
  isPdpStudioInlineToolId,
} from "../../data/pdpStudioInlineTools";
import { useAiToolsCatalogUi } from "../../hooks/useAiToolsCatalogUi";
import { usePdpStudioHomeDialogs } from "../../hooks/usePdpStudioHomeDialogs";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioInlineToolDialogs } from "../shared/PdpStudioInlineToolDialogs";
import { PdpStudioToolCard } from "../shared/PdpStudioToolCard";
import { AiToolsChooserDialog } from "./AiToolsChooserDialog";

interface AiToolsWorkspaceProps {
  catalog: PdpStudioAuditCatalog;
}

interface ToolSectionProps {
  title: string;
  tools: PdpStudioAuditCatalog["tools"];
  action?: ReactNode;
  onActivateTool: (toolId: PdpStudioToolId) => void;
}

function ToolSection({
  title,
  tools,
  action,
  onActivateTool,
}: ToolSectionProps) {
  return (
    <section className="min-w-0 rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-4 shadow-[var(--shadow-pdp-card)] sm:p-6">
      <div className="flex min-h-8 items-center justify-between gap-4">
        <h2 className="text-[1rem] font-medium text-[var(--color-pdp-ink)]">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {tools.map((tool) => (
          <PdpStudioToolCard
            key={tool.id}
            tool={tool}
            onActivate={
              isPdpStudioInlineToolId(tool.id)
                ? () => onActivateTool(tool.id)
                : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}

export function AiToolsWorkspace({ catalog }: AiToolsWorkspaceProps) {
  const ui = useAiToolsCatalogUi();
  const dialogs = usePdpStudioHomeDialogs();
  const byId = new Map(catalog.tools.map((tool) => [tool.id, tool]));
  const recentlyUsed = [
    "product-fixer",
    "ai-images",
    "ai-fashion-models",
    "ghost-mannequin",
  ].flatMap((id) => {
    const tool = byId.get(id as PdpStudioAuditCatalog["tools"][number]["id"]);
    return tool ? [tool] : [];
  });
  const createTools = catalog.tools.filter((tool) => tool.group === "create");
  const allTools = catalog.tools.filter((tool) => tool.group === "all");
  const activateInlineTool = (toolId: PdpStudioToolId) => {
    if (toolId === "ai-images") {
      ui.openChooser();
      return;
    }

    if (toolId === "background-remover") {
      dialogs.openImageLibrary("background-remover");
      return;
    }

    if (isPdpStudioHomeAiToolId(toolId)) {
      dialogs.openAiTool(toolId);
    }
  };

  return (
    <>
      <div className="grid gap-5 pb-10">
        <ToolSection
          title="Recently used"
          tools={recentlyUsed}
          onActivateTool={activateInlineTool}
        />
        <ToolSection
          title="Create images with AI"
          tools={createTools}
          onActivateTool={activateInlineTool}
          action={
            <PdpStudioButton
              type="button"
              variant="ghost"
              onClick={ui.openChooser}
              className="min-h-8 rounded-[0.5rem] bg-[var(--color-pdp-accent-soft)] px-3 text-[0.8125rem] font-medium text-[var(--color-pdp-accent-strong)] hover:bg-[var(--color-pdp-accent-soft)]"
            >
              See all
            </PdpStudioButton>
          }
        />
        <ToolSection
          title="All tools"
          tools={allTools}
          onActivateTool={activateInlineTool}
        />
      </div>

      <AiToolsChooserDialog
        open={ui.chooserOpen}
        tools={createTools}
        onOpenChange={ui.setChooserOpen}
        onActivateTool={activateInlineTool}
      />

      <PdpStudioInlineToolDialogs dialogs={dialogs} tools={catalog.tools} />
    </>
  );
}

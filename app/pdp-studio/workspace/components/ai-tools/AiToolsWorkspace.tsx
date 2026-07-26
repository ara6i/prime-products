"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { PdpStudioAuditCatalog } from "../../types";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioToolCard } from "../shared/PdpStudioToolCard";

interface AiToolsWorkspaceProps {
  catalog: PdpStudioAuditCatalog;
}

interface ToolSectionProps {
  title: string;
  tools: PdpStudioAuditCatalog["tools"];
  action?: ReactNode;
}

function ToolSection({
  title,
  tools,
  action,
}: ToolSectionProps) {
  return (
    <section className="min-w-0">
      <div className="flex min-h-8 items-center justify-between gap-4">
        <h2 className="text-[1rem] font-semibold text-[var(--color-pdp-ink)]">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <PdpStudioToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
}

export function AiToolsWorkspace({ catalog }: AiToolsWorkspaceProps) {
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
  return (
    <div className="grid gap-12 pb-16">
        <ToolSection
          title="Recently used"
          tools={recentlyUsed}
        />
        <ToolSection
          title="Create images with AI"
          tools={createTools}
          action={
            <PdpStudioButton
              asChild
              variant="ghost"
              className="min-h-8 rounded-[0.5rem] bg-[var(--color-pdp-accent-soft)] px-3 text-[0.8125rem] font-medium text-[var(--color-pdp-accent-strong)] hover:bg-[var(--color-pdp-accent-soft)]"
            >
              <Link href="/pdp-studio/tools/ai-images">See all</Link>
            </PdpStudioButton>
          }
        />
        <ToolSection
          title="All tools"
          tools={allTools}
        />
      </div>
  );
}

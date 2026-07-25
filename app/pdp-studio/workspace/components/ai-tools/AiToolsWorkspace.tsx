"use client";

import { Input } from "@/app/shared/components/ui/input";
import type { PdpStudioAuditCatalog } from "../../types";
import { useAiToolsCatalogUi } from "../../hooks/useAiToolsCatalogUi";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioPageHeader } from "../shared/PdpStudioPageHeader";
import { PdpStudioToolCard } from "../shared/PdpStudioToolCard";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface AiToolsWorkspaceProps {
  catalog: PdpStudioAuditCatalog;
}

function ToolSection({
  title,
  tools,
}: {
  title: string;
  tools: PdpStudioAuditCatalog["tools"];
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-[var(--space-pdp-sm)]">
        <h2 className="text-[var(--text-pdp-lg)] font-bold">{title}</h2>
        <span className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">{tools.length} tools</span>
      </div>
      <div className="mt-[var(--space-pdp-md)] grid gap-[var(--space-pdp-sm)] sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <PdpStudioToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
}

export function AiToolsWorkspace({ catalog }: AiToolsWorkspaceProps) {
  const ui = useAiToolsCatalogUi(catalog.tools);
  const recentlyUsed = catalog.tools.filter((tool) =>
    ["ai-fashion-models", "product-staging", "background-remover"].includes(tool.id),
  );
  const createTools = catalog.tools.filter((tool) => tool.group === "create");
  const allTools = catalog.tools.filter((tool) => tool.group === "all");

  return (
    <div className="grid gap-[var(--space-pdp-xl)]">
      <PdpStudioPageHeader
        title="AI Tools"
        description="Choose one focused product-imagery workflow. Every audited entry point is represented; generation remains disconnected except for the existing clothing photoshoot."
      />

      <ToolSection title="Recently used" tools={recentlyUsed} />
      <ToolSection title="Create images with AI" tools={createTools} />
      <ToolSection title="All tools" tools={allTools} />

      <section className="rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-lg)]">
        <div className="flex flex-col gap-[var(--space-pdp-md)] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[var(--text-pdp-lg)] font-bold">What do you need?</h2>
            <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
              Filter all audited creation and editing workflows.
            </p>
          </div>
          <div className="relative w-full lg:max-w-[24rem]">
            <PdpStudioUiIcon name="search" className="absolute left-[var(--space-pdp-sm)] top-1/2 -translate-y-1/2 text-[var(--color-pdp-muted)]" />
            <Input
              value={ui.query}
              onChange={(event) => ui.setQuery(event.target.value)}
              placeholder="Search AI tools"
              className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] pl-[2.75rem] text-[var(--text-pdp-sm)]"
            />
          </div>
        </div>
        <div className="mt-[var(--space-pdp-md)] flex flex-wrap gap-[var(--space-pdp-xs)]">
          {(["all", "create", "editing"] as const).map((group) => (
            <PdpStudioButton
              key={group}
              type="button"
              variant="ghost"
              data-active={ui.group === group}
              onClick={() => ui.setGroup(group)}
              className="min-h-[2.25rem] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] capitalize text-[var(--color-pdp-ink-soft)] data-[active=true]:border-[var(--color-pdp-accent)] data-[active=true]:bg-[var(--color-pdp-accent-soft)] data-[active=true]:text-[var(--color-pdp-accent)]"
            >
              {group}
            </PdpStudioButton>
          ))}
        </div>
        <div className="mt-[var(--space-pdp-md)] grid gap-[var(--space-pdp-sm)] sm:grid-cols-2 xl:grid-cols-4">
          {ui.filteredTools.map((tool) => (
            <PdpStudioToolCard key={tool.id} tool={tool} compact />
          ))}
        </div>
      </section>
    </div>
  );
}

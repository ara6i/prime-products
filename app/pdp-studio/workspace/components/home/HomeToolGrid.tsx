import Link from "next/link";
import type {
  PdpStudioToolDefinition,
  PdpStudioToolId,
} from "../../types";
import type {
  PdpStudioHomeAiToolId,
  PdpStudioImageLibrarySource,
} from "../../types/homeToolDialog";
import { isPdpStudioHomeAiToolId } from "../../data/pdpStudioInlineTools";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface HomeToolGridProps {
  tools: PdpStudioToolDefinition[];
  onOpenImageLibrary: (source: PdpStudioImageLibrarySource) => void;
  onOpenAiTool: (toolId: PdpStudioHomeAiToolId) => void;
}

interface HomeLauncherContentProps {
  label: string;
  icon: PdpStudioToolDefinition["icon"] | "upload" | "template";
  featured: boolean;
  badge?: string;
}

function HomeLauncherContent({
  label,
  icon,
  featured,
  badge,
}: HomeLauncherContentProps) {
  return (
    <>
      <span
        className={[
          "grid size-12 shrink-0 place-items-center rounded-[var(--radius-pdp-xs)] border",
          featured
            ? "border-transparent bg-[var(--color-pdp-accent)] text-white"
            : "border-[var(--color-pdp-rule)] bg-white text-[var(--color-pdp-ink)]",
        ].join(" ")}
      >
        <PdpStudioUiIcon name={icon} size={19} weight="regular" />
      </span>
      <span className="min-w-0 truncate">{label}</span>
      {badge ? (
        <span className="absolute right-1.5 top-1 rounded border border-[var(--color-pdp-rule)] bg-white px-1 py-px text-[0.5625rem] font-medium text-[var(--color-pdp-accent)]">
          {badge}
        </span>
      ) : null}
    </>
  );
}

export function HomeToolGrid({
  tools,
  onOpenImageLibrary,
  onOpenAiTool,
}: HomeToolGridProps) {
  const byId = new Map(tools.map((tool) => [tool.id, tool]));
  const launchers = [
    {
      id: "start-photo",
      label: "Start from a photo",
      icon: "upload" as const,
      featured: true,
      action: "image-library" as const,
    },
    ...([
      "background-remover",
      "ai-fashion-models",
      "product-staging",
      "ghost-mannequin",
      "product-beautifier",
      "flat-lay",
    ] satisfies PdpStudioToolId[]).flatMap((id) => {
      const tool = byId.get(id);
      return tool
        ? [{
            id: tool.id,
            label: tool.label,
            href: tool.href,
            icon: tool.icon,
            featured: false,
            badge: tool.badge,
            action:
              id === "background-remover"
                ? ("image-library" as const)
                : id === "ai-fashion-models"
                  ? ("link" as const)
                  : ("ai-tool" as const),
          }]
        : [];
    }),
    {
      id: "all-tools",
      label: "See all tools…",
      href: "/pdp-studio/ai-tools",
      icon: "template" as const,
      featured: false,
      action: "link" as const,
    },
  ];

  const launcherClassName = (featured: boolean) =>
    [
      "group relative flex min-h-[4.125rem] min-w-0 items-center justify-start gap-3 rounded-[var(--radius-pdp-sm)] border px-2 py-2 text-[0.75rem] font-medium outline-none transition-[background-color,border-color] duration-[var(--dur-pdp-short)]",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pdp-focus)]",
      featured
        ? "border-[var(--color-pdp-accent)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent-strong)] hover:bg-[var(--color-pdp-accent-soft)]"
        : "border-transparent bg-[var(--color-pdp-surface-soft)] text-[var(--color-pdp-ink)] hover:border-[var(--color-pdp-rule-strong)] hover:bg-[var(--color-pdp-surface-soft)]",
    ].join(" ");

  return (
    <section aria-label="Quick tools">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {launchers.map((tool) => {
          const content = (
            <HomeLauncherContent
              label={tool.label}
              icon={tool.icon}
              featured={tool.featured}
              badge={"badge" in tool ? tool.badge : undefined}
            />
          );

          if (tool.action === "link" && "href" in tool) {
            return (
              <PdpStudioButton
                key={tool.id}
                asChild
                variant="ghost"
                className={launcherClassName(tool.featured)}
              >
                <Link href={tool.href}>{content}</Link>
              </PdpStudioButton>
            );
          }

          return (
            <PdpStudioButton
              key={tool.id}
              type="button"
              variant="ghost"
              className={launcherClassName(tool.featured)}
              onClick={() => {
                const toolId = tool.id as PdpStudioToolId;

                if (tool.action === "image-library") {
                  onOpenImageLibrary(
                    toolId === "background-remover"
                      ? "background-remover"
                      : "start-photo",
                  );
                  return;
                }

                if (
                  tool.action === "ai-tool" &&
                  isPdpStudioHomeAiToolId(toolId)
                ) {
                  onOpenAiTool(toolId);
                }
              }}
            >
              {content}
            </PdpStudioButton>
          );
        })}
      </div>
    </section>
  );
}

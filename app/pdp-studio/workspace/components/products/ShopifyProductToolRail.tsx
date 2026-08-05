import Link from "next/link";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";
import type { ShopifyProductWorkspacePanel } from "../../hooks/useShopifyProductWorkspace";
import type {
  PdpStudioToolDefinition,
  PdpStudioToolId,
  PdpStudioUiIconName,
} from "../../types";

interface ShopifyProductToolRailProps {
  activePanel: ShopifyProductWorkspacePanel;
  tools: PdpStudioToolDefinition[];
  launchingToolId: string | null;
  onPanelChange: (panel: ShopifyProductWorkspacePanel) => void;
  onLaunchTool: (tool: PdpStudioToolDefinition) => void;
}

type RailAction =
  | {
      id: string;
      label: string;
      icon: PdpStudioUiIconName;
      href: string;
    }
  | {
      id: string;
      label: string;
      icon: PdpStudioUiIconName;
      toolId: PdpStudioToolId;
    }
  | {
      id: ShopifyProductWorkspacePanel;
      label: string;
      icon: PdpStudioUiIconName;
      panel: ShopifyProductWorkspacePanel;
    };

const CREATIVE_ACTIONS: RailAction[] = [
  { id: "templates", label: "Templates", icon: "template", href: "/pdp-studio/templates" },
  { id: "resize", label: "Resize", icon: "resize", toolId: "resize" },
  { id: "background", label: "Background", icon: "image", toolId: "ai-backgrounds" },
  { id: "shadows", label: "AI Shadows", icon: "ai-shadows", toolId: "ai-shadows" },
  { id: "tools", label: "AI Tools", icon: "ai", panel: "tools" },
];

const CONTENT_ACTIONS: RailAction[] = [
  { id: "images", label: "Images", icon: "image", panel: "images" },
  { id: "shopify", label: "Shopify", icon: "shopify", panel: "shopify" },
];

export function ShopifyProductToolRail({
  activePanel,
  tools,
  launchingToolId,
  onPanelChange,
  onLaunchTool,
}: ShopifyProductToolRailProps) {
  const renderAction = (item: RailAction) => {
    const selected = "panel" in item && activePanel === item.panel;
    const sharedClassName = `group min-h-[3.55rem] min-w-[4.4rem] shrink-0 gap-1 rounded-[0.85rem] px-1 py-1.5 text-[0.625rem] font-medium transition lg:min-h-[4.25rem] lg:w-full lg:min-w-0 lg:py-2 ${
      selected
        ? "bg-[var(--color-pdp-ink)] text-white shadow-[0_0.55rem_1.5rem_rgb(17_24_39_/_0.16)]"
        : "text-[var(--color-pdp-ink-soft)] hover:bg-[var(--color-pdp-surface-soft)] hover:text-[var(--color-pdp-ink)]"
    }`;

    if ("href" in item) {
      return (
        <PdpStudioButton key={item.id} asChild variant="nav" size="nav" className={sharedClassName}>
          <Link href={item.href}>
            <PdpStudioUiIcon name={item.icon} size={19} />
            <span>{item.label}</span>
          </Link>
        </PdpStudioButton>
      );
    }

    if ("toolId" in item) {
      const tool = tools.find((candidate) => candidate.id === item.toolId);
      if (!tool) return null;
      const launching = launchingToolId === tool.id;
      return (
        <PdpStudioButton
          key={item.id}
          type="button"
          variant="nav"
          size="nav"
          disabled={Boolean(launchingToolId)}
          onClick={() => onLaunchTool(tool)}
          className={sharedClassName}
        >
          <PdpStudioUiIcon name={item.icon} size={19} />
          <span>{launching ? "Opening…" : item.label}</span>
        </PdpStudioButton>
      );
    }

    return (
      <PdpStudioButton
        key={item.id}
        type="button"
        variant="nav"
        size="nav"
        aria-pressed={selected}
        onClick={() => onPanelChange(item.panel)}
        className={sharedClassName}
      >
        <PdpStudioUiIcon name={item.icon} size={19} />
        <span>{item.label}</span>
      </PdpStudioButton>
    );
  };

  return (
    <aside className="order-3 z-20 flex h-[4.75rem] w-full shrink-0 items-center border-t border-[var(--color-pdp-rule)] bg-white px-2 py-2 lg:order-1 lg:h-auto lg:w-[5.75rem] lg:flex-col lg:border-r lg:border-t-0 lg:px-2 lg:py-3">
      <Link
        href="/pdp-studio"
        aria-label="PDP Studio Home"
        className="hidden size-10 place-items-center rounded-full bg-[var(--color-pdp-accent)] text-sm font-semibold text-white shadow-[0_0.55rem_1.5rem_rgb(47_91_234_/_0.22)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-pdp-focus)] lg:grid"
      >
        P
      </Link>

      <nav aria-label="Product workspace actions" className="flex w-full items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mt-6 lg:flex-col lg:overflow-visible">
        {CREATIVE_ACTIONS.map(renderAction)}
        <span className="mx-1 h-8 w-px shrink-0 bg-[var(--color-pdp-rule)] lg:my-1 lg:h-px lg:w-10" aria-hidden />
        {CONTENT_ACTIONS.map(renderAction)}
      </nav>
    </aside>
  );
}

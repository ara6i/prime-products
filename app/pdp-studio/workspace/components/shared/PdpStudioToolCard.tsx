import Image from "next/image";
import Link from "next/link";
import { PDP_STUDIO_TOOL_ASSETS } from "../../data/pdpStudioToolAssets";
import type { PdpStudioToolDefinition } from "../../types";
import { PdpStudioButton } from "./PdpStudioButton";
import { PdpStudioUiIcon } from "./PdpStudioUiIcon";

interface PdpStudioToolCardProps {
  tool: PdpStudioToolDefinition;
  onActivate?: () => void;
}

export function PdpStudioToolCard({
  tool,
  onActivate,
}: PdpStudioToolCardProps) {
  const image = PDP_STUDIO_TOOL_ASSETS[tool.id];
  const className =
    "group relative flex h-20 w-full min-w-0 items-center justify-start gap-3 overflow-hidden rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-2 text-left text-[var(--color-pdp-ink)] outline-none transition-[border-color,background-color] duration-[var(--dur-pdp-short)] ease-[var(--ease-pdp-out)] hover:border-[var(--color-pdp-rule-strong)] hover:bg-[var(--color-pdp-surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pdp-focus)]";

  const content = (
    <>
      <div className="min-w-0 flex-1 px-2">
        <h3 className="truncate text-[0.875rem] font-normal leading-tight">
          {tool.label}
        </h3>
        {tool.badge ? (
          <span className="mt-1 inline-flex rounded border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] px-1 py-px text-[0.5625rem] font-medium text-[var(--color-pdp-accent)]">
            {tool.badge}
          </span>
        ) : null}
      </div>

      <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-[0.5rem] bg-[var(--color-pdp-surface-soft)]">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="64px"
            className="object-cover transition-transform duration-[var(--dur-pdp-short)] ease-[var(--ease-pdp-out)] group-hover:scale-[1.03]"
          />
        ) : (
          <PdpStudioUiIcon
            name={tool.icon}
            size={23}
            className="text-[var(--color-pdp-ink-soft)]"
          />
        )}
      </div>
    </>
  );

  if (onActivate) {
    return (
      <PdpStudioButton
        type="button"
        variant="ghost"
        onClick={onActivate}
        className={className}
      >
        {content}
      </PdpStudioButton>
    );
  }

  return (
    <Link href={tool.href} className={className}>
      {content}
    </Link>
  );
}

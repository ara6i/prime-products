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
    "group relative flex min-h-24 w-full min-w-0 items-center justify-start gap-3 overflow-hidden rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-2.5 text-left text-[var(--color-pdp-ink)] shadow-[var(--shadow-pdp-card)] outline-none transition-[transform,border-color,box-shadow] duration-[var(--dur-pdp-short)] ease-[var(--ease-pdp-out)] hover:-translate-y-0.5 hover:border-[var(--color-pdp-accent-border)] hover:shadow-[var(--shadow-pdp-popover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pdp-focus)]";

  const content = (
    <>
      <div className="min-w-0 flex-1 px-2">
        <h3 className="truncate text-[0.875rem] font-medium leading-tight">
          {tool.label}
        </h3>
        {tool.badge ? (
          <span className="mt-1 inline-flex rounded border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] px-1 py-px text-[0.5625rem] font-medium text-[var(--color-pdp-accent)]">
            {tool.badge}
          </span>
        ) : null}
      </div>

      <div className="relative grid size-[4.5rem] shrink-0 place-items-center overflow-hidden rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-accent-border)] bg-[var(--color-pdp-surface-blue)]">
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

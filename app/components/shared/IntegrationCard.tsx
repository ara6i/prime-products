import Image from "next/image";
import Link from "next/link";
import { cn } from "@/app/shared/lib/utils";
import { ArrowRightIcon, INTEGRATION_ICONS } from "./icons";
import type { IntegrationMethod } from "../../types/landing";

type Size = "compact" | "full";

interface IntegrationCardProps {
  method: IntegrationMethod;
  size?: Size;
  className?: string;
}

export function IntegrationCard({ method, size = "full", className }: IntegrationCardProps) {
  const soon = !!method.comingSoon;
  const isCompact = size === "compact";
  const Icon = method.id === "shopify" ? null : INTEGRATION_ICONS[method.id];

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-white transition-all duration-300",
        isCompact ? "gap-2.5 p-4" : "gap-4 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        soon
          ? "border-text-primary/6 opacity-75"
          : "border-text-primary/8 hover:-translate-y-1 hover:border-brand-blue/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)]",
        className
      )}
    >
      <span
        className={cn(
          "absolute inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-[0.08em]",
          isCompact ? "right-3 top-3 px-2 py-0.5 text-[9px]" : "right-4 top-4 px-2.5 py-1 text-[10px]",
          soon ? "bg-surface-segment text-text-hint" : "bg-status-success/10 text-status-success"
        )}
      >
        {!soon ? <span className="h-1 w-1 rounded-full bg-status-success" /> : null}
        {soon ? "Coming soon" : "Available"}
      </span>

      <IntegrationIcon id={method.id} Icon={Icon} soon={soon} compact={isCompact} />

      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "font-mono uppercase tracking-[0.14em]",
            isCompact ? "text-[10px]" : "text-[11px]",
            soon ? "text-text-hint" : "text-brand-blue"
          )}
        >
          {method.label}
        </span>
        <h3
          className={cn(
            "font-semibold leading-tight tracking-[-0.01em] text-text-primary",
            isCompact ? "text-sm" : "text-lg"
          )}
        >
          {method.title}
        </h3>
      </div>

      {!isCompact ? (
        <p className="text-sm leading-[1.6] text-text-body">{method.body}</p>
      ) : null}

      {!isCompact ? (
        soon ? (
          <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-text-hint">
            Notify me
          </span>
        ) : (
          <Link
            href={method.docsHref}
            className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue transition-colors hover:text-brand-blue-dark"
          >
            View docs
            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )
      ) : null}
    </article>
  );
}

function IntegrationIcon({
  id,
  Icon,
  soon,
  compact,
}: {
  id: IntegrationMethod["id"];
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> | null;
  soon: boolean;
  compact: boolean;
}) {
  const boxClass = cn(
    "flex shrink-0 items-center justify-center rounded-xl transition-colors",
    compact ? "h-9 w-9" : "h-12 w-12",
    soon
      ? "bg-surface-segment text-text-hint"
      : "bg-brand-blue-pale text-brand-blue-dark group-hover:bg-brand-blue group-hover:text-white"
  );

  if (id === "shopify") {
    return (
      <div className={cn(boxClass, !soon && "bg-white group-hover:bg-white")}>
        <Image
          src="/images/landing/ps/shopify-glyph.svg"
          alt="Shopify"
          width={compact ? 22 : 28}
          height={compact ? 22 : 28}
          className={cn("object-contain", soon && "grayscale opacity-60")}
        />
      </div>
    );
  }

  return (
    <div className={boxClass}>
      {Icon ? <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} /> : null}
    </div>
  );
}

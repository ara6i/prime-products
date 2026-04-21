import { cn } from "@/app/shared/lib/utils";

type Variant = "active" | "suspended" | "uninstalled" | "archived" | "draft" | "neutral";

const palette: Record<Variant, { bg: string; text: string; dot: string }> = {
  active: {
    bg: "bg-admin-status-active-bg",
    text: "text-admin-status-active-text",
    dot: "bg-admin-status-active-text",
  },
  suspended: {
    bg: "bg-admin-status-suspended-bg",
    text: "text-admin-status-suspended-text",
    dot: "bg-admin-status-suspended-text",
  },
  uninstalled: {
    bg: "bg-admin-status-uninstalled-bg",
    text: "text-admin-status-uninstalled-text",
    dot: "bg-admin-status-uninstalled-text",
  },
  archived: {
    bg: "bg-admin-status-uninstalled-bg",
    text: "text-admin-status-uninstalled-text",
    dot: "bg-admin-status-uninstalled-text",
  },
  draft: {
    bg: "bg-surface-warning-light",
    text: "text-warning-text",
    dot: "bg-warning-text",
  },
  neutral: {
    bg: "bg-admin-muted",
    text: "text-text-body",
    dot: "bg-text-hint",
  },
};

interface Props {
  status: string;
  className?: string;
  size?: "sm" | "md";
}

function resolve(status: string): Variant {
  const s = status.toLowerCase();
  if (s === "active") return "active";
  if (s === "suspended") return "suspended";
  if (s === "uninstalled") return "uninstalled";
  if (s === "archived") return "archived";
  if (s === "draft") return "draft";
  return "neutral";
}

export function StatusPill({ status, className, size = "md" }: Props) {
  const v = resolve(status);
  const p = palette[v];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.313vw] rounded-full font-medium capitalize whitespace-nowrap",
        p.bg,
        p.text,
        size === "md"
          ? "px-[0.625vw] py-[0.208vw] text-admin-xs max-lg:px-2.5 max-lg:py-1 max-lg:text-[11px] max-lg:gap-1.5"
          : "px-[0.521vw] py-[0.156vw] text-[0.573vw] max-lg:px-2 max-lg:py-0.5 max-lg:text-[10px] max-lg:gap-1",
        className,
      )}
    >
      <span className={cn("w-[0.313vw] h-[0.313vw] rounded-full max-lg:w-1.5 max-lg:h-1.5", p.dot)} />
      {status}
    </span>
  );
}

type SourceVariant = "shopify" | "sdk";

interface SourceBadgeProps {
  source: SourceVariant;
  className?: string;
}

const sourcePalette: Record<SourceVariant, { bg: string; text: string; label: string }> = {
  shopify: {
    bg: "bg-admin-source-shopify-bg",
    text: "text-admin-source-shopify-text",
    label: "Shopify",
  },
  sdk: {
    bg: "bg-admin-source-sdk-bg",
    text: "text-admin-source-sdk-text",
    label: "SDK",
  },
};

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const p = sourcePalette[source];
  return (
    <span
      className={cn(
        "inline-flex items-center px-[0.625vw] py-[0.208vw] rounded-[0.313vw] text-admin-xs font-medium",
        "max-lg:px-2 max-lg:py-0.5 max-lg:text-[11px] max-lg:rounded-md",
        p.bg,
        p.text,
        className,
      )}
    >
      {p.label}
    </span>
  );
}

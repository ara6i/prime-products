import type { ComponentProps } from "react";
import { Button } from "@/app/shared/components/ui/button";
import { cn } from "@/app/shared/lib/utils";

type SharedButtonProps = ComponentProps<typeof Button>;

export function PdpStudioButton({ className, variant = "primary", ...props }: SharedButtonProps) {
  return (
    <Button
      variant={variant}
      className={cn(
        "min-h-[var(--size-pdp-control)] rounded-[var(--radius-pdp-sm)] px-[var(--space-pdp-md)] text-[var(--text-pdp-sm)] font-semibold",
        "whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pdp-focus)]",
        "active:translate-y-px",
        variant === "primary" &&
          "bg-[var(--color-pdp-accent)] text-[var(--color-pdp-accent-ink)] hover:bg-[var(--color-pdp-accent-hover)]",
        className,
      )}
      {...props}
    />
  );
}

import type { ReactNode } from "react";
import { cn } from "@/app/shared/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  bodyClassName?: string;
  headerClassName?: string;
}

export function Card({
  children,
  className,
  title,
  description,
  action,
  bodyClassName,
  headerClassName,
}: Props) {
  return (
    <section
      className={cn(
        "bg-admin-surface-card rounded-[var(--radius-admin-card)] shadow-admin-card",
        "max-lg:rounded-2xl",
        className,
      )}
    >
      {(title || action || description) && (
        <header
          className={cn(
            "flex items-start justify-between gap-[var(--spacing-admin-gap-md)]",
            "px-[var(--spacing-admin-card)] pt-[var(--spacing-admin-card)]",
            "max-lg:px-5 max-lg:pt-5",
            headerClassName,
          )}
        >
          <div className="flex flex-col min-w-0">
            {title && (
              <h3 className="text-admin-base font-semibold text-text-primary leading-tight tracking-tight max-lg:text-base">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-admin-xs text-text-hint mt-[0.208vw] max-lg:text-xs max-lg:mt-1">
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex items-center shrink-0">{action}</div>}
        </header>
      )}
      <div
        className={cn(
          "px-[var(--spacing-admin-card)] py-[var(--spacing-admin-card)] max-lg:px-5 max-lg:py-5",
          (title || action || description) && "pt-[var(--spacing-admin-gap-md)] max-lg:pt-4",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

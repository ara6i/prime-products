import type { ReactNode } from "react";
import { cn } from "@/app/shared/lib/utils";

interface CustomerDashboardCardProps {
  children: ReactNode;
  id?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function CustomerDashboardCard({
  children,
  id,
  title,
  description,
  action,
  className,
  bodyClassName,
}: CustomerDashboardCardProps) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-customer-card border border-customer-border bg-customer-card shadow-customer-card",
        className,
      )}
    >
      {title ? (
        <div className="flex items-start justify-between gap-[var(--spacing-customer-gap-md)] px-[var(--spacing-customer-card)] pt-[var(--spacing-customer-card)]">
          <div className="min-w-0">
            <h2 className="text-customer-xl font-semibold tracking-[-0.03em] text-text-primary max-lg:text-[5vw]">
              {title}
            </h2>
            {description ? (
              <p className="mt-[0.208vw] text-customer-sm text-text-body max-lg:mt-[1vw] max-lg:text-[3.2vw]">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}

      <div
        className={cn(
          title ? "p-[var(--spacing-customer-card)]" : "p-[var(--spacing-customer-card)]",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

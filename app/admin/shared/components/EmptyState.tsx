import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-[2.083vw] text-center max-lg:py-10">
      {icon && (
        <div className="mb-[var(--spacing-admin-gap-md)] flex h-[2.5vw] w-[2.5vw] items-center justify-center rounded-full bg-admin-muted text-text-hint max-lg:mb-3 max-lg:h-12 max-lg:w-12">
          {icon}
        </div>
      )}
      <div className="text-admin-base font-semibold text-text-primary max-lg:text-base">
        {title}
      </div>
      {description && (
        <div className="mt-[var(--spacing-admin-gap-sm)] max-w-[24vw] text-admin-sm text-text-body max-lg:mt-2 max-lg:text-sm max-lg:max-w-xs">
          {description}
        </div>
      )}
      {action && (
        <div className="mt-[var(--spacing-admin-gap-md)] max-lg:mt-4">{action}</div>
      )}
    </div>
  );
}

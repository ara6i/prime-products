interface CustomerDashboardEmptyStateProps {
  title: string;
  description?: string;
}

export function CustomerDashboardEmptyState({ title, description }: CustomerDashboardEmptyStateProps) {
  return (
    <div className="flex min-h-[8.333vw] flex-col items-center justify-center rounded-[0.833vw] border border-dashed border-customer-border bg-customer-soft/70 px-[var(--spacing-customer-card)] py-[var(--spacing-customer-gap-lg)] text-center max-lg:min-h-[34vw] max-lg:rounded-[4vw]">
      <p className="text-customer-sm font-semibold text-text-primary max-lg:text-[3.6vw]">{title}</p>
      {description ? (
        <p className="mt-[0.313vw] max-w-[24vw] text-customer-xs leading-[1.6] text-text-body max-lg:mt-[1.5vw] max-lg:max-w-none max-lg:text-[3vw]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

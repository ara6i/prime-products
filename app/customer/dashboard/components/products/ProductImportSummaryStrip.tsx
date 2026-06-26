import type { CustomerProductImportSummary } from "../../types/products";

interface ProductImportSummaryStripProps {
  summary: CustomerProductImportSummary;
  fileName: string;
}

export function ProductImportSummaryStrip({ summary, fileName }: ProductImportSummaryStripProps) {
  const items = [
    { label: "Products", value: summary.productCount },
    { label: "Variants", value: summary.variantCount },
    { label: "Current", value: summary.currentCycleCount },
    { label: "Live", value: summary.liveCount },
  ];

  return (
    <div className="flex flex-wrap items-center gap-[var(--spacing-customer-gap-sm)] max-lg:gap-[2vw]">
      {items.map((item) => (
        <div
          key={item.label}
          className="inline-flex items-baseline gap-[0.313vw] rounded-full border border-customer-border bg-customer-soft px-[0.729vw] py-[0.365vw] max-lg:gap-[1.5vw] max-lg:px-[3vw] max-lg:py-[1.6vw]"
        >
          <span className="text-customer-xs font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.5vw]">
            {item.label}
          </span>
          <span className="text-customer-sm font-semibold tabular-nums text-text-primary max-lg:text-[3.2vw]">
            {item.value.toLocaleString()}
          </span>
        </div>
      ))}
      {fileName ? (
        <span className="min-w-0 truncate text-customer-xs font-medium text-customer-muted max-lg:w-full max-lg:text-[2.8vw]">
          {fileName}
        </span>
      ) : null}
    </div>
  );
}

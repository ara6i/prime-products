import Link from "next/link";
import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { CatalogIcon, ArrowRightIcon } from "@/app/shared/components/icons";
import type { SizeChartSummary, StoreSource } from "@/app/admin/shared/types";

interface Props {
  charts: SizeChartSummary[];
  source: StoreSource;
  storeId: string;
}

export function SizeChartsList({ charts, source, storeId }: Props) {
  if (charts.length === 0) {
    return (
      <Card
        title="Size charts"
        description="CSV uploads saved as structured size templates"
      >
        <EmptyState
          icon={<CatalogIcon size={24} className="!w-[1.25vw] !h-[1.25vw]" color="currentColor" />}
          title="No size charts uploaded yet"
          description="Charts appear here as soon as the merchant uploads a CSV from the Shopify admin app."
        />
      </Card>
    );
  }

  return (
    <Card
      title="Size charts"
      description={`${charts.length} ${charts.length === 1 ? "chart" : "charts"} uploaded`}
      bodyClassName="!pt-0 !p-0"
    >
      <table className="w-full text-left">
        <thead>
          <tr className="border-t border-admin-border-soft bg-admin-muted/40">
            <th className="py-[var(--spacing-admin-gap-md)] pl-[var(--spacing-admin-card)] pr-[var(--spacing-admin-gap-md)] text-[0.625vw] font-semibold tracking-[0.06em] text-text-hint uppercase">
              Name
            </th>
            <th className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)] text-[0.625vw] font-semibold tracking-[0.06em] text-text-hint uppercase">
              Gender
            </th>
            <th className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)] text-[0.625vw] font-semibold tracking-[0.06em] text-text-hint uppercase">
              Unit
            </th>
            <th className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)] text-[0.625vw] font-semibold tracking-[0.06em] text-text-hint uppercase text-right">
              Columns
            </th>
            <th className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)] text-[0.625vw] font-semibold tracking-[0.06em] text-text-hint uppercase text-right">
              Rows
            </th>
            <th className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)] text-[0.625vw] font-semibold tracking-[0.06em] text-text-hint uppercase text-right">
              Products
            </th>
            <th className="py-[var(--spacing-admin-gap-md)] pl-[var(--spacing-admin-gap-md)] pr-[var(--spacing-admin-card)] text-[0.625vw] font-semibold tracking-[0.06em] text-text-hint uppercase text-right">
              Updated
            </th>
            <th className="pr-[var(--spacing-admin-card)]" />
          </tr>
        </thead>
        <tbody>
          {charts.map((c) => (
            <tr
              key={c.id}
              className="border-t border-admin-border-soft hover:bg-admin-row-hover transition-colors group"
            >
              <td className="py-[var(--spacing-admin-gap-md)] pl-[var(--spacing-admin-card)] pr-[var(--spacing-admin-gap-md)]">
                <Link
                  href={`/admin/stores/${source}/${storeId}/size-charts/${c.id}`}
                  className="text-admin-sm font-medium text-text-primary hover:text-brand-blue transition-colors"
                >
                  {c.name}
                </Link>
              </td>
              <td className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)] text-admin-sm text-text-body capitalize">
                {c.gender}
              </td>
              <td className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)] text-admin-sm text-text-body uppercase">
                {c.unit}
              </td>
              <td className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)] text-admin-sm text-text-body text-right tabular-nums">
                {c.columnCount}
              </td>
              <td className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)] text-admin-sm text-text-body text-right tabular-nums">
                {c.rowCount}
              </td>
              <td className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)] text-admin-sm text-text-body text-right tabular-nums">
                {c.assignedProductCount || "—"}
              </td>
              <td className="py-[var(--spacing-admin-gap-md)] pl-[var(--spacing-admin-gap-md)] pr-[var(--spacing-admin-gap-md)] text-admin-sm text-text-body text-right tabular-nums">
                {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "—"}
              </td>
              <td className="pr-[var(--spacing-admin-card)]">
                <Link
                  href={`/admin/stores/${source}/${storeId}/size-charts/${c.id}`}
                  className="inline-flex items-center text-text-hint group-hover:text-brand-blue transition-colors"
                  aria-label="View chart"
                >
                  <ArrowRightIcon
                    size={14}
                    className="!w-[0.729vw] !h-[0.729vw]"
                    color="currentColor"
                  />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

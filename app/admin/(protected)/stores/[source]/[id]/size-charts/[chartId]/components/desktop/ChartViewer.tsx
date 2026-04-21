import { Card } from "@/app/admin/shared/components/Card";
import type { SizeChartDetail, SizeChartSection } from "@/app/admin/shared/types";

interface Props {
  chart: SizeChartDetail;
}

function ChartTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-[0.521vw] border border-admin-border-soft">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-admin-muted/60">
            {headers.map((h) => (
              <th
                key={h}
                className="py-[var(--spacing-admin-gap-sm)] px-[var(--spacing-admin-gap-md)] text-[0.625vw] font-semibold tracking-[0.06em] text-text-hint uppercase border-b border-admin-border-soft whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-admin-row-hover transition-colors">
              {headers.map((_, i) => (
                <td
                  key={i}
                  className="py-[var(--spacing-admin-gap-sm)] px-[var(--spacing-admin-gap-md)] text-admin-sm text-text-primary border-b border-admin-border-soft last:border-b-0 tabular-nums"
                >
                  {row[i] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[0.156vw] rounded-[0.521vw] bg-admin-muted/60 px-[0.938vw] py-[0.521vw]">
      <span className="text-[0.625vw] font-semibold tracking-[0.06em] text-text-hint uppercase">
        {label}
      </span>
      <span className="text-admin-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}

export function ChartViewer({ chart }: Props) {
  return (
    <div className="flex flex-col gap-[var(--spacing-admin-gap-lg)]">
      <Card>
        <div className="flex items-center gap-[var(--spacing-admin-gap-md)] flex-wrap">
          <MetaPill label="Gender" value={chart.gender} />
          <MetaPill label="Unit" value={chart.unit.toUpperCase()} />
          <MetaPill label="Columns" value={String(chart.headers.length)} />
          <MetaPill label="Rows" value={String(chart.rows.length)} />
          <MetaPill label="Status" value={chart.status} />
          <MetaPill
            label="Updated"
            value={chart.updatedAt ? new Date(chart.updatedAt).toLocaleDateString() : "—"}
          />
        </div>
      </Card>

      {chart.sections && chart.sections.length > 0 ? (
        chart.sections.map((section: SizeChartSection) => (
          <Card
            key={section.name}
            title={section.name}
            description={`${section.rows.length} rows · ${section.headers.length} columns`}
          >
            <ChartTable headers={section.headers} rows={section.rows} />
          </Card>
        ))
      ) : (
        <Card
          title="Rows"
          description={`${chart.rows.length} rows · ${chart.headers.length} columns`}
        >
          <ChartTable headers={chart.headers} rows={chart.rows} />
        </Card>
      )}

      <Card
        title="Assignment"
        description="Which Shopify products this chart applies to"
      >
        <div className="grid grid-cols-[8vw_1fr] gap-y-[var(--spacing-admin-gap-md)] gap-x-[var(--spacing-admin-gap-lg)]">
          <span className="text-admin-xs font-medium text-text-hint uppercase tracking-wider">
            Product types
          </span>
          <div className="flex flex-wrap gap-[0.313vw]">
            {chart.appliesTo.productTypes.length === 0 ? (
              <span className="text-admin-sm text-text-hint">—</span>
            ) : (
              chart.appliesTo.productTypes.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-[0.313vw] bg-admin-muted px-[0.521vw] py-[0.156vw] text-admin-xs text-text-body"
                >
                  {t}
                </span>
              ))
            )}
          </div>

          <span className="text-admin-xs font-medium text-text-hint uppercase tracking-wider">
            Collections
          </span>
          <div className="flex flex-wrap gap-[0.313vw]">
            {chart.appliesTo.collections.length === 0 ? (
              <span className="text-admin-sm text-text-hint">—</span>
            ) : (
              chart.appliesTo.collections.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center rounded-[0.313vw] bg-admin-muted px-[0.521vw] py-[0.156vw] text-admin-xs text-text-body font-mono"
                >
                  {c}
                </span>
              ))
            )}
          </div>

          <span className="text-admin-xs font-medium text-text-hint uppercase tracking-wider">
            Tags
          </span>
          <div className="flex flex-wrap gap-[0.313vw]">
            {chart.appliesTo.tags.length === 0 ? (
              <span className="text-admin-sm text-text-hint">—</span>
            ) : (
              chart.appliesTo.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-[0.313vw] bg-admin-muted px-[0.521vw] py-[0.156vw] text-admin-xs text-text-body"
                >
                  {t}
                </span>
              ))
            )}
          </div>

          <span className="text-admin-xs font-medium text-text-hint uppercase tracking-wider">
            Vendor
          </span>
          <span className="text-admin-sm text-text-primary">
            {chart.appliesTo.vendor ?? "—"}
          </span>

          <span className="text-admin-xs font-medium text-text-hint uppercase tracking-wider">
            Product overrides
          </span>
          <div className="flex flex-wrap gap-[0.313vw]">
            {chart.productOverrides.length === 0 ? (
              <span className="text-admin-sm text-text-hint">—</span>
            ) : (
              chart.productOverrides.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center rounded-[0.313vw] bg-brand-blue-pale px-[0.521vw] py-[0.156vw] text-admin-xs text-brand-blue font-mono"
                >
                  {p}
                </span>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

import { Card } from "@/app/admin/shared/components/Card";
import type { SizeChartDetail, SizeChartSection } from "@/app/admin/shared/types";

interface Props {
  chart: SizeChartDetail;
}

function ChartTableMobile({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-light">
            {headers.map((h) => (
              <th
                key={h}
                className="py-2 px-3 text-[11px] font-semibold text-text-primary uppercase tracking-wider border border-admin-border whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {headers.map((_, i) => (
                <td
                  key={i}
                  className="py-2 px-3 text-xs text-text-primary border border-admin-border whitespace-nowrap"
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

export function ChartViewerMobile({ chart }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Card title="Metadata">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-text-hint">Gender</div>
            <div className="text-text-primary capitalize mt-0.5">{chart.gender}</div>
          </div>
          <div>
            <div className="text-text-hint">Unit</div>
            <div className="text-text-primary uppercase mt-0.5">{chart.unit}</div>
          </div>
          <div>
            <div className="text-text-hint">Status</div>
            <div className="text-text-primary capitalize mt-0.5">{chart.status}</div>
          </div>
          <div>
            <div className="text-text-hint">Updated</div>
            <div className="text-text-primary mt-0.5">
              {chart.updatedAt ? new Date(chart.updatedAt).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>
      </Card>

      {chart.sections && chart.sections.length > 0 ? (
        chart.sections.map((s: SizeChartSection) => (
          <Card key={s.name} title={s.name}>
            <ChartTableMobile headers={s.headers} rows={s.rows} />
          </Card>
        ))
      ) : (
        <Card title="Rows">
          <ChartTableMobile headers={chart.headers} rows={chart.rows} />
        </Card>
      )}
    </div>
  );
}

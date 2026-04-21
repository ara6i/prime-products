import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";

interface Props {
  hourHistogram: number[];
  weekdayHistogram: number[];
  title?: string;
  description?: string;
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HourHeatmapCard({
  hourHistogram,
  weekdayHistogram,
  title = "Peak activity",
  description = "When customers try-on most",
}: Props) {
  const hourMax = Math.max(...hourHistogram, 1);
  const wdMax = Math.max(...weekdayHistogram, 1);
  const total = hourHistogram.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <Card title={title} description={description}>
        <EmptyState title="Not enough data yet" />
      </Card>
    );
  }

  return (
    <Card title={title} description={description}>
      <div className="flex flex-col gap-[var(--spacing-admin-gap-lg)]">
        {/* Hour of day (24 bars) */}
        <div>
          <div className="flex items-center justify-between mb-[var(--spacing-admin-gap-sm)]">
            <span className="text-admin-xs font-medium text-text-hint uppercase tracking-wider">
              Hour of day (0–23, local time)
            </span>
          </div>
          <div className="flex items-end gap-[0.156vw] h-[3.125vw] max-lg:h-16">
            {hourHistogram.map((count, h) => {
              const pct = (count / hourMax) * 100;
              return (
                <div
                  key={h}
                  className="flex-1 flex flex-col items-center gap-[0.104vw] group"
                  title={`${String(h).padStart(2, "0")}:00 — ${count.toLocaleString()}`}
                >
                  <div className="w-full flex-1 flex items-end">
                    <span
                      className="w-full rounded-t-[0.104vw] transition-all group-hover:opacity-80"
                      style={{
                        height: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                        background: count > 0 ? "var(--admin-chart-1)" : "var(--admin-map-fill)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-[0.208vw] text-[0.573vw] text-text-hint max-lg:text-[10px]">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>
        </div>

        {/* Day of week (7 bars) */}
        <div>
          <div className="flex items-center justify-between mb-[var(--spacing-admin-gap-sm)]">
            <span className="text-admin-xs font-medium text-text-hint uppercase tracking-wider">
              Day of week
            </span>
          </div>
          <div className="grid grid-cols-7 gap-[0.313vw] max-lg:gap-1">
            {weekdayHistogram.map((count, d) => {
              const pct = (count / wdMax) * 100;
              return (
                <div key={d} className="flex flex-col items-center gap-[0.208vw]">
                  <div
                    className="w-full h-[2.083vw] rounded-[0.313vw] relative overflow-hidden bg-admin-muted max-lg:h-10 max-lg:rounded-md"
                    title={`${weekdayLabels[d]} — ${count.toLocaleString()}`}
                  >
                    <span
                      className="absolute inset-x-0 bottom-0 rounded-b-[0.313vw] max-lg:rounded-b-md"
                      style={{
                        height: `${Math.max(pct, count > 0 ? 6 : 0)}%`,
                        background: "var(--admin-chart-2)",
                      }}
                    />
                  </div>
                  <span className="text-[0.573vw] text-text-hint max-lg:text-[10px]">
                    {weekdayLabels[d]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

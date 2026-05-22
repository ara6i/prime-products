import type { CSSProperties } from "react";
import { CustomerDashboardCard } from "./CustomerDashboardCard";
import { CustomerDashboardEmptyState } from "./CustomerDashboardEmptyState";

interface PeakActivityCardProps {
  hourHistogram: number[];
  weekdayHistogram: number[];
}

interface ActivityBarStyle extends CSSProperties {
  "--customer-activity-height": string;
  "--customer-activity-color": string;
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getBarHeight(count: number, max: number, minimum: number): string {
  if (count <= 0 || max <= 0) return "0%";
  return `${Math.max((count / max) * 100, minimum)}%`;
}

function getActivityBarStyle(count: number, max: number, color: string, minimum: number): ActivityBarStyle {
  return {
    "--customer-activity-height": getBarHeight(count, max, minimum),
    "--customer-activity-color": count > 0 ? color : "var(--customer-surface-soft)",
  };
}

export function PeakActivityCard({ hourHistogram, weekdayHistogram }: PeakActivityCardProps) {
  const hourTotal = hourHistogram.reduce((sum, count) => sum + count, 0);
  const hourMax = Math.max(...hourHistogram, 1);
  const weekdayMax = Math.max(...weekdayHistogram, 1);

  return (
    <CustomerDashboardCard title="Peak activity" description="When customers try-on most">
      {hourTotal === 0 ? (
        <CustomerDashboardEmptyState title="Not enough data yet" />
      ) : (
        <div className="flex flex-col gap-[var(--spacing-customer-gap-lg)]">
          <div>
            <div className="mb-[var(--spacing-customer-gap-sm)] flex items-center justify-between">
              <span className="text-customer-xs font-medium uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.8vw]">
                Hour of day (0-23, local time)
              </span>
            </div>
            <div className="flex h-[3.125vw] items-end gap-[0.156vw] max-lg:h-[16vw] max-lg:gap-[0.7vw]">
              {hourHistogram.map((count, hour) => (
                <div
                  key={hour}
                  className="group flex flex-1 flex-col items-center gap-[0.104vw]"
                  title={`${String(hour).padStart(2, "0")}:00 - ${count.toLocaleString()}`}
                >
                  <div className="flex w-full flex-1 items-end">
                    <span
                      className="block h-[var(--customer-activity-height)] w-full rounded-t-[0.104vw] bg-[var(--customer-activity-color)] transition-opacity group-hover:opacity-80 max-lg:rounded-t-[0.6vw]"
                      style={getActivityBarStyle(count, hourMax, "var(--brand-blue)", 4)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-[0.208vw] flex justify-between text-[0.573vw] text-customer-muted max-lg:mt-[1vw] max-lg:text-[2.8vw]">
              <span>00</span>
              <span>06</span>
              <span>12</span>
              <span>18</span>
              <span>23</span>
            </div>
          </div>

          <div>
            <div className="mb-[var(--spacing-customer-gap-sm)] flex items-center justify-between">
              <span className="text-customer-xs font-medium uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.8vw]">
                Day of week
              </span>
            </div>
            <div className="grid grid-cols-7 gap-[0.313vw] max-lg:gap-[1.2vw]">
              {weekdayHistogram.map((count, index) => (
                <div key={weekdayLabels[index] ?? index} className="flex flex-col items-center gap-[0.208vw] max-lg:gap-[1vw]">
                  <div
                    className="relative h-[2.083vw] w-full overflow-hidden rounded-[0.313vw] bg-customer-soft max-lg:h-[10vw] max-lg:rounded-[1.6vw]"
                    title={`${weekdayLabels[index] ?? index} - ${count.toLocaleString()}`}
                  >
                    <span
                      className="absolute inset-x-0 bottom-0 block h-[var(--customer-activity-height)] rounded-b-[0.313vw] bg-[var(--customer-activity-color)] max-lg:rounded-b-[1.6vw]"
                      style={getActivityBarStyle(count, weekdayMax, "var(--customer-chart-primary)", 6)}
                    />
                  </div>
                  <span className="text-[0.573vw] text-customer-muted max-lg:text-[2.8vw]">
                    {weekdayLabels[index] ?? ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </CustomerDashboardCard>
  );
}

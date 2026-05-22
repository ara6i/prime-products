import { formatMs, formatRps } from "../lib/formatters";
import type { CapacityTimelinePoint } from "../types";

interface RunTimelineProps {
  points: CapacityTimelinePoint[];
}

export function RunTimeline({ points }: RunTimelineProps) {
  const visiblePoints = points.slice(-24);
  const maxRps = Math.max(...visiblePoints.map((point) => point.rps), 1);

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Live timing</p>
        <h2 className="mt-1 text-xl font-semibold text-text-primary">Throughput timeline</h2>
        <p className="mt-1 text-sm text-text-secondary">Each bar is a recent sample of requests per second with P95 latency below.</p>
      </div>

      {visiblePoints.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-text-secondary">
          Timeline starts after the first sample.
        </div>
      ) : (
        <div className="mt-6 flex h-56 items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          {visiblePoints.map((point) => {
            const heightPercent = Math.max((point.rps / maxRps) * 100, 4);
            return (
              <div key={`${point.elapsedMs}-${point.completed}`} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <div
                  className="w-full rounded-t-xl bg-brand-blue transition-all"
                  style={{ height: `${heightPercent}%` }}
                  title={`${formatRps(point.rps)} · P95 ${formatMs(point.p95Ms)}`}
                />
                <span className="hidden text-[10px] text-text-secondary md:block">{Math.round(point.elapsedMs / 1000)}s</span>
              </div>
            );
          })}
        </div>
      )}

      {visiblePoints.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <TimelineNote label="Latest RPS" value={formatRps(visiblePoints.at(-1)?.rps ?? 0)} />
          <TimelineNote label="Latest P95" value={formatMs(visiblePoints.at(-1)?.p95Ms ?? 0)} />
          <TimelineNote label="Completed" value={(visiblePoints.at(-1)?.completed ?? 0).toLocaleString("en-US")} />
        </div>
      )}
    </section>
  );
}

interface TimelineNoteProps {
  label: string;
  value: string;
}

function TimelineNote({ label, value }: TimelineNoteProps) {
  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-3">
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className="mt-1 font-semibold text-text-primary">{value}</p>
    </div>
  );
}

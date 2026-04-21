"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card } from "@/app/admin/shared/components/Card";
import { CheckSquare, RefreshCw, Check } from "lucide-react";

interface Props {
  acceptanceRate: number | null; // 0..100
  followingSuggestion: number | null;
  changedAfterTryOn: number | null;
  mismatchReductionPct: number | null;
}

export function SizeAlignmentCard({
  acceptanceRate,
  followingSuggestion,
  changedAfterTryOn,
  mismatchReductionPct,
}: Props) {
  const safe = acceptanceRate ?? 0;
  const data =
    safe > 0
      ? [
          { name: "Following", value: safe },
          { name: "Not", value: 100 - safe },
        ]
      : [{ name: "empty", value: 1 }];

  return (
    <Card title="Size Alignment" description="Users who followed the AI size recommendation">
      <div className="flex items-center gap-[var(--spacing-admin-gap-lg)] max-lg:gap-5">
        <div className="relative shrink-0" style={{ width: "9vw", height: "9vw" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="96%"
                startAngle={90}
                endAngle={-270}
                stroke="var(--admin-surface-card)"
                strokeWidth={2}
                paddingAngle={safe > 0 && safe < 100 ? 1 : 0}
              >
                {safe > 0 ? (
                  <>
                    <Cell fill="var(--admin-chart-2)" />
                    <Cell fill="var(--admin-map-fill)" />
                  </>
                ) : (
                  <Cell fill="var(--admin-map-fill)" />
                )}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-admin-2xl font-semibold text-text-primary tabular-nums leading-none">
              {acceptanceRate !== null ? `${Math.round(acceptanceRate)}%` : "—"}
            </span>
            <span className="text-[0.625vw] text-text-hint mt-[0.208vw] max-lg:text-[10px]">
              Selected the
            </span>
            <span className="text-[0.625vw] text-text-hint max-lg:text-[10px]">
              recommended size
            </span>
          </div>
        </div>

        <ul className="flex-1 flex flex-col gap-[var(--spacing-admin-gap-md)] min-w-0">
          <Row
            label="Users following size suggestion"
            value={followingSuggestion !== null ? `${Math.round(followingSuggestion)}%` : "—"}
            icon={<CheckSquare className="!w-[0.938vw] !h-[0.938vw] text-accent-purple-text max-lg:!w-4 max-lg:!h-4" strokeWidth={1.8} />}
            iconBg="bg-accent-purple-light"
          />
          <Row
            label="Users changed size after try-on"
            value={changedAfterTryOn !== null ? `${Math.round(changedAfterTryOn)}%` : "—"}
            icon={<RefreshCw className="!w-[0.938vw] !h-[0.938vw] text-warning-text max-lg:!w-4 max-lg:!h-4" strokeWidth={1.8} />}
            iconBg="bg-surface-warning-light"
          />
          <Row
            label="Size mismatch rate reduced"
            value={mismatchReductionPct !== null ? `${mismatchReductionPct.toFixed(0)}%` : "—"}
            icon={<Check className="!w-[0.938vw] !h-[0.938vw] text-admin-status-active-text max-lg:!w-4 max-lg:!h-4" strokeWidth={1.8} />}
            iconBg="bg-admin-status-active-bg"
            valueAccent="good"
          />
        </ul>
      </div>
    </Card>
  );
}

function Row({
  label,
  value,
  icon,
  iconBg,
  valueAccent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  valueAccent?: "good" | "bad";
}) {
  const accent =
    valueAccent === "good"
      ? "text-admin-status-active-text"
      : valueAccent === "bad"
        ? "text-admin-status-suspended-text"
        : "text-text-primary";
  return (
    <li className="flex items-center gap-[var(--spacing-admin-gap-md)]">
      <span
        className={`flex h-[1.667vw] w-[1.667vw] shrink-0 items-center justify-center rounded-full ${iconBg} max-lg:h-8 max-lg:w-8`}
      >
        {icon}
      </span>
      <span className="text-admin-sm text-text-body flex-1 leading-snug max-lg:text-sm">
        {label}
      </span>
      <span
        className={`text-admin-base font-semibold tabular-nums ${accent} max-lg:text-base`}
      >
        {value}
      </span>
    </li>
  );
}

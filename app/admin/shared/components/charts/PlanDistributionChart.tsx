"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PlanDistribution } from "@/app/admin/shared/types";

interface Props {
  data: PlanDistribution[];
}

const COLORS = [
  "var(--admin-chart-1)",
  "var(--admin-chart-2)",
  "var(--admin-chart-3)",
  "var(--admin-chart-4)",
  "var(--admin-chart-5)",
];

export function PlanDistributionChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-admin-sm text-text-hint">
        No plan data yet.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-[var(--spacing-admin-gap-lg)] h-full">
      <div className="relative flex-shrink-0" style={{ width: "9vw", height: "9vw" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="95%"
              stroke="var(--admin-surface-card)"
              strokeWidth={2}
              paddingAngle={1}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--admin-surface-card)",
                border: "1px solid var(--admin-border)",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "var(--admin-shadow-elevated)",
              }}
              formatter={(value, name) => {
                const v = Number(value) || 0;
                return [`${v.toLocaleString()} (${Math.round((v / total) * 100)}%)`, String(name ?? "")];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-admin-2xl font-semibold text-text-primary leading-none">
            {total.toLocaleString()}
          </span>
          <span className="text-admin-xs text-text-hint mt-[0.208vw]">Total</span>
        </div>
      </div>

      <ul className="flex-1 flex flex-col gap-[var(--spacing-admin-gap-sm)] min-w-0">
        {data.map((item, i) => {
          const pct = Math.round((item.count / total) * 100);
          return (
            <li key={item.name} className="flex items-center gap-[var(--spacing-admin-gap-sm)]">
              <span
                className="h-[0.521vw] w-[0.521vw] rounded-full shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="text-admin-sm text-text-primary capitalize truncate flex-1">
                {item.label}
              </span>
              <span className="text-admin-sm text-text-body tabular-nums">
                {item.count.toLocaleString()}
              </span>
              <span className="text-admin-xs text-text-hint tabular-nums w-[2.5vw] text-right">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

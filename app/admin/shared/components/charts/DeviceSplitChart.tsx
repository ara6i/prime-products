"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { BehaviorDeviceSlice } from "@/app/admin/shared/types";

interface Props {
  data: BehaviorDeviceSlice[];
}

const deviceColors: Record<string, string> = {
  mobile: "var(--admin-chart-1)",
  desktop: "var(--admin-chart-2)",
  tablet: "var(--admin-chart-4)",
  unknown: "var(--admin-chart-5)",
};

export function DeviceSplitChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-admin-sm text-text-hint">
        No device data yet.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-[var(--spacing-admin-gap-lg)] h-full">
      <div className="relative shrink-0" style={{ width: "8vw", height: "8vw" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="device"
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="94%"
              stroke="var(--admin-surface-card)"
              strokeWidth={2}
              paddingAngle={1}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={deviceColors[d.device] ?? deviceColors.unknown!} />
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
              formatter={(value, name) => [
                `${(Number(value) || 0).toLocaleString()} (${Math.round(((Number(value) || 0) / total) * 100)}%)`,
                String(name ?? ""),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex-1 flex flex-col gap-[var(--spacing-admin-gap-sm)] min-w-0">
        {data.map((d) => {
          const pct = Math.round((d.count / total) * 100);
          return (
            <li key={d.device} className="flex items-center gap-[0.417vw]">
              <span
                className="h-[0.521vw] w-[0.521vw] rounded-full shrink-0"
                style={{ background: deviceColors[d.device] ?? deviceColors.unknown! }}
              />
              <span className="text-admin-sm text-text-primary capitalize truncate flex-1">
                {d.device}
              </span>
              <span className="text-admin-sm text-text-body tabular-nums">
                {d.count.toLocaleString()}
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

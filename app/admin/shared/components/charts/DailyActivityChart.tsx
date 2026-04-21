"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BehaviorDailyPoint } from "@/app/admin/shared/types";

interface Props {
  data: BehaviorDailyPoint[];
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DailyActivityChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="activityInitiated" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--admin-chart-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--admin-chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="activityCompleted" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--admin-chart-3)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--admin-chart-3)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border-soft)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateLabel}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--text-hint)" }}
          minTickGap={28}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--text-hint)" }}
          width={28}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ stroke: "var(--admin-border)", strokeWidth: 1 }}
          contentStyle={{
            background: "var(--admin-surface-card)",
            border: "1px solid var(--admin-border)",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "var(--admin-shadow-elevated)",
          }}
          labelFormatter={(label) => formatDateLabel(String(label))}
          formatter={(value, name) => [
            (Number(value) || 0).toLocaleString(),
            String(name) === "initiated" ? "Started" : String(name) === "completed" ? "Completed" : String(name),
          ]}
        />
        <Area
          type="monotone"
          dataKey="initiated"
          stroke="var(--admin-chart-1)"
          strokeWidth={2}
          fill="url(#activityInitiated)"
        />
        <Area
          type="monotone"
          dataKey="completed"
          stroke="var(--admin-chart-3)"
          strokeWidth={2}
          fill="url(#activityCompleted)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

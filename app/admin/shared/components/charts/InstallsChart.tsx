"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyPoint } from "@/app/admin/shared/types";

interface Props {
  data: MonthlyPoint[];
}

function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  if (!yearStr || !monthStr) return monthKey;
  const d = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "short" });
}

export function InstallsChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border-soft)" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonthLabel}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--text-hint)" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--text-hint)" }}
          width={28}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "var(--admin-row-hover)" }}
          contentStyle={{
            background: "var(--admin-surface-card)",
            border: "1px solid var(--admin-border)",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "var(--admin-shadow-elevated)",
          }}
          labelFormatter={(label) => formatMonthLabel(String(label))}
          formatter={(value) => [(Number(value) || 0).toLocaleString(), "Installs"]}
        />
        <Bar dataKey="installs" fill="var(--admin-chart-2)" radius={[3, 3, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

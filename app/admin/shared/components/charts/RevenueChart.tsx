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

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export function RevenueChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--admin-chart-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--admin-chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border-soft)" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonthLabel}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--text-hint)" }}
        />
        <YAxis
          tickFormatter={formatCurrency}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--text-hint)" }}
          width={44}
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
          labelFormatter={(label) => formatMonthLabel(String(label))}
          formatter={(value) => [formatCurrency(Number(value) || 0), "Revenue"]}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--admin-chart-1)"
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

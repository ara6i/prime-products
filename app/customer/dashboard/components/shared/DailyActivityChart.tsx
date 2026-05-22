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
import { CustomerDashboardCard } from "./CustomerDashboardCard";
import { CustomerDashboardEmptyState } from "./CustomerDashboardEmptyState";
import type { CustomerDashboardDailyPoint } from "../../types";

interface DailyActivityChartProps {
  data: CustomerDashboardDailyPoint[];
}

function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function hasChartData(data: CustomerDashboardDailyPoint[]): boolean {
  return data.some((point) => point.initiated > 0 || point.completed > 0 || point.failed > 0);
}

export function DailyActivityChart({ data }: DailyActivityChartProps) {
  return (
    <CustomerDashboardCard
      title="Try-on activity"
      description="Last 30 days"
      bodyClassName="h-[13.542vw] max-lg:h-[62vw]"
    >
      {!hasChartData(data) ? (
        <CustomerDashboardEmptyState title="No try-on activity yet" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--customer-chart-grid)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--customer-chart-axis)" }}
              minTickGap={28}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--customer-chart-axis)" }}
              width={28}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--customer-border-strong)", strokeWidth: 1 }}
              contentStyle={{
                background: "var(--customer-surface-card)",
                border: "1px solid var(--customer-border)",
                borderRadius: "0.833vw",
                color: "var(--text-primary)",
                boxShadow: "var(--customer-shadow-card)",
                fontSize: 12,
              }}
              labelFormatter={(label) => formatDateLabel(String(label))}
              formatter={(value, name) => [
                (Number(value) || 0).toLocaleString(),
                String(name) === "initiated" ? "Started" : String(name) === "completed" ? "Completed" : "Failed",
              ]}
            />
            <Area
              type="monotone"
              dataKey="initiated"
              stroke="var(--brand-blue)"
              strokeWidth={2}
              fill="var(--customer-chart-soft)"
              fillOpacity={0.58}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="var(--customer-success-text)"
              strokeWidth={2}
              fill="var(--customer-success-bg)"
              fillOpacity={0.42}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </CustomerDashboardCard>
  );
}

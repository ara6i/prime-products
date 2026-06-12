"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TryOnChartProps {
  data: Array<{ date: string; label: string; completed: number; initiated: number }>;
}

interface InstallChartProps {
  data: Array<{ label: string; installs: number }>;
}

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const tooltipStyle = {
  background: "var(--customer-surface-card)",
  border: "1px solid var(--customer-border)",
  borderRadius: "0.833vw",
  color: "var(--text-primary)",
  boxShadow: "var(--customer-shadow-card)",
  fontSize: 12,
};

export function TryOnAreaChart({ data }: TryOnChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
        <CartesianGrid stroke="var(--customer-chart-grid)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => data.find((point) => point.date === value)?.label ?? dateLabel(String(value))}
          axisLine={false}
          tickLine={false}
          minTickGap={28}
          tick={{ fontSize: 11, fill: "var(--customer-chart-axis)" }}
        />
        <YAxis hide allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(label) => data.find((point) => point.date === label)?.label ?? dateLabel(String(label))}
          formatter={(value, name) => [
            Number(value).toLocaleString("en-US"),
            String(name) === "completed" ? "Completed" : "Started",
          ]}
        />
        <Area
          type="monotone"
          dataKey="initiated"
          stroke="var(--brand-blue)"
          strokeWidth={2}
          fill="var(--customer-chart-soft)"
          fillOpacity={0.42}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="completed"
          stroke="var(--customer-success-text)"
          strokeWidth={2}
          fill="var(--customer-success-bg)"
          fillOpacity={0.36}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function InstallBarChart({ data }: InstallChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    visualInstalls: item.installs > 0 ? item.installs : 1,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--customer-chart-axis)" }}
        />
        <YAxis hide allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(_, __, item) => [Number(item.payload.installs).toLocaleString("en-US"), "Installs"]} />
        <Bar dataKey="visualInstalls" radius={[12, 12, 12, 12]} isAnimationActive={false}>
          {chartData.map((item) => (
            <Cell key={item.label} fill="var(--brand-blue)" opacity={item.installs > 0 ? 0.9 : 0.12} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

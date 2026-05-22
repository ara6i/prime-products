"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CustomerDashboardEmptyState } from "./CustomerDashboardEmptyState";
import type { CustomerDashboardDeviceSlice } from "../../types";

interface DeviceSplitChartProps {
  data: CustomerDashboardDeviceSlice[];
}

const deviceColors: Record<string, string> = {
  mobile: "var(--brand-blue)",
  desktop: "var(--customer-chart-primary)",
  tablet: "var(--customer-chart-secondary)",
  unknown: "var(--customer-chart-control)",
};

function getDeviceColor(device: string): string {
  return deviceColors[device] ?? deviceColors.unknown!;
}

export function DeviceSplitChart({ data }: DeviceSplitChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return <CustomerDashboardEmptyState title="No device data yet." />;
  }

  return (
    <div className="flex h-full items-center gap-[var(--spacing-customer-gap-lg)] max-lg:flex-col max-lg:items-stretch max-lg:gap-[4vw]">
      <div className="relative h-[8.333vw] w-[8.333vw] shrink-0 max-lg:mx-auto max-lg:h-[42vw] max-lg:w-[42vw]">
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
              stroke="var(--customer-surface-card)"
              strokeWidth={2}
              paddingAngle={1}
            >
              {data.map((item) => (
                <Cell key={item.device} fill={getDeviceColor(item.device)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--customer-surface-card)",
                border: "1px solid var(--customer-border)",
                borderRadius: "0.833vw",
                color: "var(--text-primary)",
                boxShadow: "var(--customer-shadow-card)",
                fontSize: 12,
              }}
              formatter={(value, name) => [
                `${(Number(value) || 0).toLocaleString()} (${Math.round(((Number(value) || 0) / total) * 100)}%)`,
                String(name ?? ""),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-customer-gap-sm)]">
        {data.map((item) => {
          const percent = Math.round((item.count / total) * 100);

          return (
            <li key={item.device} className="flex items-center gap-[0.417vw] max-lg:gap-[2vw]">
              <span
                className="h-[0.521vw] w-[0.521vw] shrink-0 rounded-full max-lg:h-[2.5vw] max-lg:w-[2.5vw]"
                style={{ background: getDeviceColor(item.device) }}
              />
              <span className="flex-1 truncate text-customer-sm capitalize text-text-primary max-lg:text-[3.4vw]">
                {item.device}
              </span>
              <span className="text-customer-sm tabular-nums text-text-body max-lg:text-[3.4vw]">
                {item.count.toLocaleString()}
              </span>
              <span className="w-[2.5vw] text-right text-customer-xs tabular-nums text-customer-muted max-lg:w-[11vw] max-lg:text-[3vw]">
                {percent}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

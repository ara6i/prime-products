"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import type { SizeChartSummary } from "@/app/admin/shared/types";

interface Props {
  charts: SizeChartSummary[];
}

const genderColors: Record<string, string> = {
  male: "var(--admin-chart-1)",
  female: "var(--admin-chart-5)",
  unisex: "var(--admin-chart-2)",
};

export function SizeChartsSummary({ charts }: Props) {
  if (charts.length === 0) {
    return (
      <Card title="Size chart coverage" description="Distribution across uploads">
        <EmptyState title="No size charts uploaded yet" />
      </Card>
    );
  }

  const genderCounts = charts.reduce<Record<string, number>>((acc, c) => {
    const key = c.gender || "unisex";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const genderData = Object.entries(genderCounts).map(([gender, count]) => ({
    name: gender,
    value: count,
    color: genderColors[gender] ?? "var(--admin-chart-4)",
  }));

  // Top 6 charts by row count
  const rowData = [...charts]
    .sort((a, b) => b.rowCount - a.rowCount)
    .slice(0, 6)
    .map((c) => ({
      name: c.name.length > 14 ? `${c.name.slice(0, 13)}…` : c.name,
      rows: c.rowCount,
    }));

  const totalCharts = charts.length;

  return (
    <Card
      title="Size chart coverage"
      description={`${totalCharts} uploaded · by gender and rows`}
      bodyClassName="h-[11vw] max-lg:h-auto"
    >
      <div className="grid grid-cols-[7vw_1fr] gap-[var(--spacing-admin-gap-lg)] h-full max-lg:grid-cols-1 max-lg:gap-4">
        {/* Gender donut */}
        <div className="flex flex-col h-full max-lg:h-40">
          <div className="relative flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="92%"
                  stroke="var(--admin-surface-card)"
                  strokeWidth={2}
                  paddingAngle={1}
                >
                  {genderData.map((g, i) => (
                    <Cell key={i} fill={g.color} />
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
                    `${(Number(value) || 0).toLocaleString()} chart${(Number(value) || 0) === 1 ? "" : "s"}`,
                    String(name ?? ""),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-admin-xl font-semibold text-text-primary leading-none">
                {totalCharts}
              </span>
              <span className="text-[0.573vw] text-text-hint mt-[0.208vw] max-lg:text-[10px]">
                charts
              </span>
            </div>
          </div>
          <ul className="flex items-center justify-center gap-[0.521vw] flex-wrap mt-[var(--spacing-admin-gap-sm)] max-lg:gap-2 max-lg:mt-2">
            {genderData.map((g) => (
              <li key={g.name} className="flex items-center gap-[0.208vw]">
                <span
                  className="h-[0.417vw] w-[0.417vw] rounded-full max-lg:h-1.5 max-lg:w-1.5"
                  style={{ background: g.color }}
                />
                <span className="text-admin-xs text-text-body capitalize max-lg:text-[11px]">
                  {g.name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rows per chart */}
        <div className="flex flex-col h-full">
          <span className="text-admin-xs text-text-hint mb-[var(--spacing-admin-gap-sm)] max-lg:text-[11px] max-lg:mb-2">
            Rows per chart (top 6)
          </span>
          <div className="flex-1 min-h-[8vw] max-lg:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rowData}
                layout="vertical"
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
              >
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--text-hint)" }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--text-body)" }}
                  width={80}
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
                  formatter={(value) => [(Number(value) || 0).toLocaleString(), "rows"]}
                />
                <Bar dataKey="rows" fill="var(--admin-chart-1)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}

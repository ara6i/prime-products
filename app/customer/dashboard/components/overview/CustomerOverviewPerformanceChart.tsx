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
import type { CustomerOverviewChartPoint } from "../../types/overview";

interface CustomerOverviewPerformanceChartProps {
  data: CustomerOverviewChartPoint[];
}

export function CustomerOverviewPerformanceChart({ data }: CustomerOverviewPerformanceChartProps) {
  return (
    <section className="rounded-[24px] border border-customer-border bg-customer-card p-5 shadow-[0_16px_44px_rgba(33,84,239,0.06)]">
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-text-primary">Try-on performance</h2>
        <p className="mt-1 text-sm text-customer-muted">Started vs completed sessions</p>
      </div>

      <div className="mt-4 h-[270px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-[18px] bg-customer-blue text-sm text-text-body">
            Waiting for activity
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 0, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="var(--customer-chart-grid)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--customer-chart-axis)" }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--customer-chart-axis)" }} />
              <Tooltip
                cursor={{ fill: "rgba(31,31,27,0.04)" }}
                contentStyle={{
                  background: "var(--customer-surface-card)",
                  border: "1px solid var(--customer-border)",
                  borderRadius: 14,
                  boxShadow: "0 16px 44px rgba(33,84,239,0.12)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="completed" name="Completed" fill="var(--brand-blue)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="initiated" name="Started" fill="#8DB4FF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

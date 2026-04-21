"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DecisionConversionPoint } from "@/app/admin/shared/types";

interface Props {
  data: DecisionConversionPoint[];
  controlAvailable: boolean;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ConversionImpactChart({ data, controlAvailable }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="deTreat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--admin-chart-2)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--admin-chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border-soft)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
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
          labelFormatter={(l) => fmtDate(String(l))}
          formatter={(v, n) => [
            (Number(v) || 0).toLocaleString(),
            n === "treatment" ? "With Decision Engine" : "Control",
          ]}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: "var(--text-body)" }}
          formatter={(value) =>
            value === "treatment" ? "With Decision Engine" : "Control"
          }
        />
        <Area
          type="monotone"
          dataKey="treatment"
          stroke="var(--admin-chart-2)"
          strokeWidth={2}
          fill="url(#deTreat)"
        />
        {controlAvailable ? (
          <Line
            type="monotone"
            dataKey="control"
            stroke="var(--text-hint)"
            strokeWidth={2}
            dot={false}
          />
        ) : (
          <Line
            type="monotone"
            dataKey="control"
            stroke="var(--admin-border)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/app/admin/shared/components/Card";

interface Props {
  used: number;
  remaining: number;
  plan: string;
}

export function TryOnsGauge({ used, remaining, plan }: Props) {
  const total = used + remaining;
  const percentUsed = total > 0 ? Math.round((used / total) * 100) : 0;

  const data =
    total === 0
      ? [{ name: "Unused", value: 1 }]
      : [
          { name: "Used", value: used },
          { name: "Remaining", value: remaining },
        ];

  const colors =
    total === 0
      ? ["var(--admin-muted)"]
      : ["var(--admin-chart-1)", "var(--admin-map-fill)"];

  return (
    <Card title="Try-on credits" description={`${plan} plan`} bodyClassName="h-[11vw] max-lg:h-56">
      <div className="flex items-center gap-[var(--spacing-admin-gap-lg)] h-full max-lg:gap-5">
        <div className="relative shrink-0" style={{ width: "9vw", height: "9vw" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius="68%"
                outerRadius="95%"
                startAngle={90}
                endAngle={-270}
                stroke="var(--admin-surface-card)"
                strokeWidth={2}
                paddingAngle={total === 0 ? 0 : 1}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              {total > 0 && (
                <Tooltip
                  contentStyle={{
                    background: "var(--admin-surface-card)",
                    border: "1px solid var(--admin-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: "var(--admin-shadow-elevated)",
                  }}
                  formatter={(value) => [(Number(value) || 0).toLocaleString(), "try-ons"]}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-admin-2xl font-semibold text-text-primary leading-none tabular-nums">
              {percentUsed}%
            </span>
            <span className="text-admin-xs text-text-hint mt-[0.208vw]">used</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-[var(--spacing-admin-gap-md)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[0.417vw]">
              <span className="h-[0.521vw] w-[0.521vw] rounded-full bg-brand-blue" />
              <span className="text-admin-sm text-text-body">Used</span>
            </div>
            <span className="text-admin-sm font-medium text-text-primary tabular-nums">
              {used.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[0.417vw]">
              <span className="h-[0.521vw] w-[0.521vw] rounded-full bg-admin-map-fill" />
              <span className="text-admin-sm text-text-body">Remaining</span>
            </div>
            <span className="text-admin-sm font-medium text-text-primary tabular-nums">
              {remaining.toLocaleString()}
            </span>
          </div>
          <div className="pt-[var(--spacing-admin-gap-sm)] border-t border-admin-border-soft flex items-center justify-between">
            <span className="text-admin-xs text-text-hint uppercase tracking-wider">Total</span>
            <span className="text-admin-base font-semibold text-text-primary tabular-nums">
              {total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

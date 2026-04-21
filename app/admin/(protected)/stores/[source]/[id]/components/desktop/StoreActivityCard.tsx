import { Card } from "@/app/admin/shared/components/Card";

interface Props {
  installedAt: string;
  lastUsedAt: string | null;
  tryOnsUsed: number;
  tryOnsRemaining: number;
  plan: string;
}

// Rough monthly price lookup by plan name — kept simple on purpose.
const PLAN_PRICES_USD: Record<string, number> = {
  free: 0,
  starter: 49,
  pro: 149,
  enterprise: 499,
};

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)));
}

function humanDaysAgo(date: Date | null): string {
  if (!date) return "Never";
  const now = new Date();
  const days = daysBetween(date, now);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-[var(--spacing-admin-gap-sm)] border-b border-admin-border-soft last:border-0">
      <span className="text-admin-xs text-text-hint uppercase tracking-wider">{label}</span>
      <span className="flex items-baseline gap-[0.313vw]">
        <span className="text-admin-sm font-semibold text-text-primary tabular-nums">{value}</span>
        {hint && <span className="text-[0.625vw] text-text-hint">{hint}</span>}
      </span>
    </div>
  );
}

export function StoreActivityCard({
  installedAt,
  lastUsedAt,
  tryOnsUsed,
  tryOnsRemaining,
  plan,
}: Props) {
  const now = new Date();
  const installDate = new Date(installedAt);
  const lastUseDate = lastUsedAt ? new Date(lastUsedAt) : null;

  const daysInstalled = Math.max(1, daysBetween(installDate, now));
  const avgPerDay = tryOnsUsed / daysInstalled;
  const totalQuota = tryOnsUsed + tryOnsRemaining;

  const monthlyPrice = PLAN_PRICES_USD[plan.toLowerCase()] ?? null;
  const estMonthly = monthlyPrice === null ? null : monthlyPrice;
  const costPerTryOn =
    monthlyPrice !== null && monthlyPrice > 0 && tryOnsUsed > 0
      ? (monthlyPrice * Math.max(1, daysInstalled / 30)) / tryOnsUsed
      : null;

  const daysSinceLastUse = lastUseDate ? daysBetween(lastUseDate, now) : null;

  return (
    <Card title="Activity at a glance" description="Business-level snapshot">
      <div className="flex flex-col">
        <Row
          label="Total try-ons"
          value={tryOnsUsed.toLocaleString()}
          hint={`of ${totalQuota.toLocaleString()} quota`}
        />
        <Row
          label="Avg per day"
          value={avgPerDay < 1 ? avgPerDay.toFixed(2) : avgPerDay.toFixed(1)}
          hint={`since install · ${daysInstalled} ${daysInstalled === 1 ? "day" : "days"}`}
        />
        <Row
          label="Last activity"
          value={humanDaysAgo(lastUseDate)}
          hint={lastUseDate ? lastUseDate.toLocaleDateString() : undefined}
        />
        <Row
          label="Install date"
          value={installDate.toLocaleDateString()}
          hint={`${daysInstalled} ${daysInstalled === 1 ? "day" : "days"} tenure`}
        />
        <Row label="Plan" value={plan.charAt(0).toUpperCase() + plan.slice(1)} />
        {estMonthly !== null && (
          <Row
            label="Est. monthly"
            value={`$${estMonthly.toLocaleString()}`}
            hint={monthlyPrice === 0 ? "free tier" : "plan price"}
          />
        )}
        {costPerTryOn !== null && (
          <Row label="Cost / try-on" value={`$${costPerTryOn.toFixed(2)}`} />
        )}
      </div>

      {daysSinceLastUse !== null && daysSinceLastUse > 14 && (
        <div className="mt-[var(--spacing-admin-gap-md)] rounded-[0.417vw] bg-surface-warning-light border border-warning-text/20 px-[var(--spacing-admin-gap-md)] py-[0.521vw] text-admin-xs text-warning-text">
          ⚠ Inactive for {daysSinceLastUse} days — consider reaching out to the merchant.
        </div>
      )}
    </Card>
  );
}

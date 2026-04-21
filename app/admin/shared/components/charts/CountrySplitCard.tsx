import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import type { BehaviorCountrySlice } from "@/app/admin/shared/types";

interface Props {
  countries: BehaviorCountrySlice[];
  title?: string;
  description?: string;
}

function flagFromIso2(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "";
  const base = 0x1f1a5;
  const codePoints = Array.from(iso2.toUpperCase()).map((c) => base + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function CountrySplitCard({
  countries,
  title = "Customer countries",
  description = "Where try-ons happen",
}: Props) {
  const total = countries.reduce((sum, c) => sum + c.count, 0);

  if (total === 0) {
    return (
      <Card title={title} description={description}>
        <EmptyState title="No geo data yet" />
      </Card>
    );
  }

  const top = countries.slice(0, 6);

  return (
    <Card
      title={title}
      description={`${countries.length} ${countries.length === 1 ? "country" : "countries"}`}
      bodyClassName="!p-0 !pt-0"
    >
      <ul className="divide-y divide-admin-border-soft">
        {top.map((g) => {
          const pct = Math.round((g.count / total) * 100);
          return (
            <li
              key={g.iso2}
              className="flex items-center gap-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-card)] py-[var(--spacing-admin-gap-md)]"
            >
              <span className="text-admin-lg leading-none max-lg:text-xl">
                {flagFromIso2(g.iso2)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-admin-sm font-medium text-text-primary truncate">{g.name}</div>
                <div className="h-[0.208vw] rounded-full bg-admin-muted overflow-hidden mt-[0.208vw] max-lg:h-1 max-lg:mt-1">
                  <span
                    className="block h-full bg-brand-blue rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-end tabular-nums">
                <span className="text-admin-sm font-medium text-text-primary">
                  {g.count.toLocaleString()}
                </span>
                <span className="text-admin-xs text-text-hint">{pct}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

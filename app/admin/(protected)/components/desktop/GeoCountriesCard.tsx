import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import type { GeoPoint } from "@/app/admin/shared/types";

interface Props {
  data: GeoPoint[];
}

function flagFromIso2(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "";
  const base = 0x1f1a5;
  const codePoints = Array.from(iso2.toUpperCase()).map((c) => base + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function GeoCountriesCard({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card title="Merchants by country" description="Derived from shop timezone">
        <EmptyState title="No geographic data yet" />
      </Card>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const top = data.slice(0, 8);

  return (
    <Card
      title="Merchants by country"
      description={`${data.length} ${data.length === 1 ? "country" : "countries"} · ${total.toLocaleString()} merchants`}
      bodyClassName="!pt-0 !p-0"
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
                <div className="text-admin-sm font-medium text-text-primary truncate">
                  {g.name}
                </div>
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

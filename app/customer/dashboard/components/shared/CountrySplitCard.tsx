import type { CSSProperties } from "react";
import { CustomerDashboardCard } from "./CustomerDashboardCard";
import { CustomerDashboardEmptyState } from "./CustomerDashboardEmptyState";
import type { CustomerDashboardCountrySlice } from "../../types";
import { flagFromIso2 } from "../../utils/geo";

interface CountrySplitCardProps {
  countries: CustomerDashboardCountrySlice[];
  title?: string;
  description?: string;
}

interface CountryBarStyle extends CSSProperties {
  "--customer-country-width": string;
}

function getCountryBarStyle(percent: number): CountryBarStyle {
  return { "--customer-country-width": `${percent}%` };
}

export function CountrySplitCard({
  countries,
  title = "Customer countries",
  description = "Where try-ons happen",
}: CountrySplitCardProps) {
  const total = countries.reduce((sum, country) => sum + country.count, 0);

  return (
    <CustomerDashboardCard
      title={title}
      description={total > 0 ? `${countries.length} ${countries.length === 1 ? "country" : "countries"}` : description}
      bodyClassName={total > 0 ? "!p-0 !pt-[var(--spacing-customer-card)]" : undefined}
    >
      {total === 0 ? (
        <CustomerDashboardEmptyState title="No geo data yet" />
      ) : (
        <ul className="divide-y divide-customer-border">
          {countries.map((country) => {
            const percent = Math.round((country.count / total) * 100);

            return (
              <li
                key={country.iso2}
                className="flex items-center gap-[var(--spacing-customer-gap-md)] px-[var(--spacing-customer-card)] py-[var(--spacing-customer-gap-md)]"
              >
                <span className="text-customer-lg leading-none max-lg:text-[5vw]">
                  {flagFromIso2(country.iso2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-customer-sm font-medium text-text-primary max-lg:text-[3.4vw]">
                    {country.name}
                  </div>
                  <div className="mt-[0.208vw] h-[0.208vw] overflow-hidden rounded-full bg-customer-soft max-lg:mt-[1vw] max-lg:h-[1vw]">
                    <span
                      className="block h-full rounded-full bg-brand-blue [width:var(--customer-country-width)]"
                      style={getCountryBarStyle(percent)}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end tabular-nums">
                  <span className="text-customer-sm font-medium text-text-primary max-lg:text-[3.4vw]">
                    {country.count.toLocaleString()}
                  </span>
                  <span className="text-customer-xs text-customer-muted max-lg:text-[3vw]">{percent}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CustomerDashboardCard>
  );
}

import type { StatCard } from "@/app/landing/types";

interface StatsSectionProps {
  stats: StatCard[];
}

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <section className="flex flex-col gap-12 px-7 py-16">
      <div className="flex flex-col gap-2">
        <h2 className="text-[32px] font-bold leading-[48px] text-text-primary">
          Trusted by style lovers worldwide
        </h2>
        <p className="text-[20px] leading-[34px] text-text-body">
          Real users. Real outfits. Real results.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex w-full flex-col gap-8 overflow-hidden rounded-[20px] bg-gradient-to-r from-brand-blue-pale to-[#eff5ff] px-6 py-8"
          >
            <div className="flex items-baseline gap-1">
              <span className="text-[32px] font-bold leading-[48px] text-text-primary">
                {stat.number}
              </span>
              <span className="text-base font-bold leading-[26px] text-text-body">{stat.label}</span>
            </div>
            <p className="text-base leading-[26px] text-catalog-section-text">{stat.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

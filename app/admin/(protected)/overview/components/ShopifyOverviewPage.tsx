import Link from "next/link";
import { ArrowUpRight, CalendarDays, Search } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import type { OverviewMetric, ShopifyDashboardRange, ShopifyDashboardView } from "../types";
import { InstallBarChart, TryOnAreaChart } from "./OverviewCharts";

interface ShopifyOverviewPageProps {
  view: ShopifyDashboardView;
}

const ranges: Array<{ value: ShopifyDashboardRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "range", label: "Range" },
];

const navItems = [
  { label: "Overview", href: "/admin" },
  { label: "Analytics", href: "/admin/monitoring/behavior" },
  { label: "Finance", href: "/admin/revenue" },
  { label: "Customers", href: "/admin/customers/shopify" },
];

const toneClasses: Record<NonNullable<OverviewMetric["tone"]>, string> = {
  blue: "bg-brand-blue/10 text-brand-blue",
  green: "bg-customer-success-bg text-customer-success-text",
  yellow: "bg-customer-warning-bg text-customer-warning-text",
  purple: "bg-violet-100 text-violet-700",
};

const mapBucketClasses = [
  "fill-customer-soft",
  "fill-brand-blue/20",
  "fill-brand-blue/35",
  "fill-brand-blue/55",
  "fill-brand-blue/80",
] as const;

function MetricBlock({ metric }: { metric: OverviewMetric }) {
  return (
    <div>
      <div className="flex items-center gap-[0.521vw] max-lg:gap-[2vw]">
        <p className="text-[clamp(12px,0.72vw,14px)] font-semibold text-text-primary max-lg:text-[3.2vw]">{metric.label}</p>
        {metric.trend ? (
          <span className={`rounded-full px-[0.417vw] py-[0.156vw] text-[clamp(10px,0.58vw,12px)] font-semibold max-lg:px-[2vw] max-lg:py-[0.8vw] max-lg:text-[2.6vw] ${toneClasses[metric.tone ?? "blue"]}`}>
            {metric.trend}
          </span>
        ) : null}
      </div>
      <p className="mt-[0.729vw] text-[clamp(34px,2.25vw,46px)] font-semibold leading-none text-text-primary max-lg:mt-[3vw] max-lg:text-[9vw]">{metric.value}</p>
      <p className="mt-[0.365vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:mt-[1.5vw] max-lg:text-[3.2vw]">{metric.helper}</p>
    </div>
  );
}

function RangeTabs({ active }: { active: ShopifyDashboardRange }) {
  return (
    <div className="flex rounded-full bg-customer-soft p-[0.208vw] max-lg:p-[1vw]">
      {ranges.map((range) => {
        const selected = range.value === active;
        return (
          <Link
            key={range.value}
            href={`/admin?range=${range.value}`}
            className={`rounded-full px-[0.833vw] py-[0.365vw] text-[clamp(11px,0.68vw,13px)] font-medium transition max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[3vw] ${selected ? "bg-customer-card text-text-primary shadow-customer-card" : "text-customer-muted hover:text-text-primary"}`}
          >
            {range.label}
          </Link>
        );
      })}
    </div>
  );
}

function ShellNav() {
  return (
    <div className="flex items-center justify-between gap-[1vw] max-lg:flex-col max-lg:items-stretch max-lg:gap-[4vw]">
      <div>
        <p className="text-[clamp(13px,0.78vw,15px)] font-semibold uppercase tracking-[0.16em] text-brand-blue max-lg:text-[3vw]">PrimeStyleAI</p>
        <h2 className="mt-[0.208vw] text-[clamp(24px,1.55vw,32px)] font-semibold text-text-primary max-lg:text-[6vw]">Shopify Overview</h2>
      </div>
      <nav className="flex min-w-[24vw] justify-center rounded-full bg-customer-card p-[0.208vw] shadow-customer-card max-lg:min-w-0 max-lg:overflow-x-auto max-lg:p-[1vw]">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-[1.146vw] py-[0.521vw] text-[clamp(12px,0.72vw,14px)] font-medium max-lg:px-[4vw] max-lg:py-[2vw] max-lg:text-[3.2vw] ${item.href === "/admin" ? "bg-customer-soft text-text-primary" : "text-customer-muted"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center justify-end gap-[0.625vw] max-lg:hidden">
        <Button type="button" variant="ghost" size="icon-sm" title="Search overview" className="rounded-full bg-customer-card shadow-customer-card">
          <Search className="h-[0.938vw] w-[0.938vw]" />
        </Button>
      </div>
    </div>
  );
}

function CalendarCard({ value }: { value: string }) {
  const days = Array.from({ length: 35 }, (_, index) => index + 1);
  return (
    <div className="grid grid-cols-7 gap-[0.313vw] max-lg:gap-[1.3vw]">
      {days.map((day) => {
        const highlighted = [13, 14, 15, 16, 17, 18, 19].includes(day);
        return (
          <span
            key={day}
            className={`flex aspect-square items-center justify-center rounded-[0.521vw] text-[clamp(10px,0.58vw,12px)] max-lg:rounded-[2.4vw] max-lg:text-[2.8vw] ${highlighted ? "bg-brand-blue text-white" : "bg-customer-soft text-customer-muted"}`}
          >
            {day <= 31 ? day : ""}
          </span>
        );
      })}
      <div className="col-span-7 mt-[0.521vw] flex items-center justify-between rounded-[0.833vw] bg-customer-soft px-[0.833vw] py-[0.625vw] max-lg:mt-[2vw] max-lg:rounded-[4vw] max-lg:px-[4vw] max-lg:py-[3vw]">
        <span className="text-[clamp(22px,1.55vw,30px)] font-semibold text-text-primary max-lg:text-[7vw]">{value}</span>
        <CalendarDays className="h-[1.042vw] w-[1.042vw] text-brand-blue max-lg:h-[5vw] max-lg:w-[5vw]" />
      </div>
    </div>
  );
}

function TopProducts({ view }: { view: ShopifyDashboardView }) {
  return (
    <section className="rounded-[1.042vw] bg-customer-card p-[1.042vw] shadow-customer-card max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <div className="mb-[0.833vw] flex items-center justify-between max-lg:mb-[3vw]">
        <h3 className="text-[clamp(15px,0.94vw,18px)] font-semibold text-text-primary max-lg:text-[4vw]">Top products</h3>
        <span className="rounded-full bg-customer-soft px-[0.625vw] py-[0.26vw] text-[clamp(11px,0.64vw,12px)] text-customer-muted max-lg:px-[3vw] max-lg:py-[1vw] max-lg:text-[2.8vw]">Shopify</span>
      </div>
      <div className="space-y-[0.625vw] max-lg:space-y-[3vw]">
        {view.topProducts.length > 0 ? view.topProducts.map((product) => (
          <div key={product.title} className="grid grid-cols-[1fr_auto] items-center gap-[0.833vw] max-lg:gap-[3vw]">
            <div className="min-w-0">
              <p className="truncate text-[clamp(12px,0.72vw,14px)] font-medium text-text-primary max-lg:text-[3.2vw]">{product.title}</p>
              <p className="mt-[0.156vw] truncate text-[clamp(10px,0.6vw,12px)] text-customer-muted max-lg:text-[2.8vw]">{product.meta}</p>
            </div>
            <span className={`rounded-[0.625vw] px-[0.729vw] py-[0.521vw] text-[clamp(15px,0.94vw,18px)] font-semibold max-lg:rounded-[3vw] max-lg:px-[3vw] max-lg:py-[2vw] max-lg:text-[4vw] ${toneClasses[product.accent]}`}>{product.value}</span>
          </div>
        )) : (
          <p className="rounded-[0.833vw] bg-customer-soft p-[1vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:rounded-[4vw] max-lg:p-[4vw] max-lg:text-[3.2vw]">No product activity yet.</p>
        )}
      </div>
    </section>
  );
}

function DeviceSplit({ view }: { view: ShopifyDashboardView }) {
  return (
    <section className="rounded-[1.042vw] bg-customer-card p-[1.042vw] shadow-customer-card max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <h3 className="text-[clamp(15px,0.94vw,18px)] font-semibold text-text-primary max-lg:text-[4vw]">Device split</h3>
      <div className="mt-[1.146vw] flex min-h-[8.5vw] items-end justify-center max-lg:mt-[4vw] max-lg:min-h-[34vw]">
        {view.deviceBubbles.length > 0 ? view.deviceBubbles.slice(0, 3).map((device, index) => (
          <div
            key={device.label}
            className={`flex items-center justify-center rounded-full text-center font-semibold ${toneClasses[device.tone]}`}
            style={{
              width: `${Math.max(4.2, 5.3 + device.percent / 12)}vw`,
              height: `${Math.max(4.2, 5.3 + device.percent / 12)}vw`,
              marginLeft: index === 0 ? 0 : "-0.7vw",
            }}
          >
            <span className="text-[clamp(15px,1.05vw,20px)] max-lg:text-[4vw]">{device.percent}%</span>
          </div>
        )) : null}
      </div>
      <div className="mt-[0.833vw] flex flex-wrap gap-[0.521vw] max-lg:mt-[4vw] max-lg:gap-[2vw]">
        {view.deviceBubbles.map((device) => (
          <span key={device.label} className="rounded-full bg-customer-soft px-[0.625vw] py-[0.26vw] text-[clamp(11px,0.64vw,12px)] capitalize text-customer-muted max-lg:px-[3vw] max-lg:py-[1vw] max-lg:text-[2.8vw]">
            {device.label}: {device.value}
          </span>
        ))}
      </div>
    </section>
  );
}

function ImpressionsMap({ view }: { view: ShopifyDashboardView }) {
  return (
    <section className="grid grid-cols-[1fr_10vw] gap-[1vw] rounded-[1.042vw] bg-customer-card p-[1.042vw] shadow-customer-card max-lg:grid-cols-1 max-lg:gap-[4vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <div>
        <div className="mb-[0.625vw] flex items-start justify-between max-lg:mb-[3vw]">
          <div>
            <h3 className="text-[clamp(15px,0.94vw,18px)] font-semibold text-text-primary max-lg:text-[4vw]">Impressions</h3>
            <p className="mt-[0.208vw] text-[clamp(11px,0.64vw,12px)] text-customer-muted max-lg:text-[2.8vw]">Try-on starts worldwide</p>
          </div>
          <p className="text-[clamp(28px,1.85vw,36px)] font-semibold leading-none text-text-primary max-lg:text-[8vw]">{view.impressions.value}</p>
        </div>
        <svg viewBox={`0 0 ${view.map.width} ${view.map.height}`} className="h-[12.5vw] w-full max-lg:h-[48vw]" role="img" aria-label="Impressions by country">
          {view.map.countries.map((country) => (
            <path key={country.numeric} d={country.path} className={mapBucketClasses[country.bucket]} stroke="var(--customer-surface-card)" strokeWidth="0.75" />
          ))}
        </svg>
      </div>
      <div className="space-y-[0.521vw] max-lg:space-y-[2vw]">
        {view.countries.map((country) => (
          <div key={country.iso2} className="flex items-center justify-between gap-[0.521vw] rounded-[0.625vw] bg-customer-soft px-[0.625vw] py-[0.417vw] max-lg:rounded-[3vw] max-lg:px-[3vw] max-lg:py-[2vw]">
            <span className="truncate text-[clamp(11px,0.64vw,12px)] text-text-body max-lg:text-[3vw]">{country.label}</span>
            <span className="text-[clamp(11px,0.64vw,12px)] font-semibold text-text-primary max-lg:text-[3vw]">{country.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ShopifyOverviewPage({ view }: ShopifyOverviewPageProps) {
  return (
    <section className="space-y-[1.042vw] rounded-[1.563vw] bg-customer-soft p-[1.042vw] max-lg:space-y-[4vw] max-lg:rounded-[6vw] max-lg:p-[3vw]">
      <ShellNav />

      <div className="grid grid-cols-[1.5fr_0.75fr] gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
        <section className="rounded-[1.042vw] bg-customer-card p-[1.042vw] shadow-customer-card max-lg:rounded-[5vw] max-lg:p-[4vw]">
          <div className="flex items-start justify-between gap-[1vw] max-lg:gap-[4vw]">
            <MetricBlock metric={view.revenue} />
            <RangeTabs active={view.range} />
          </div>
          <div className="mt-[1.146vw] grid grid-cols-[1fr_9vw] gap-[1vw] max-lg:mt-[4vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
            <div className="h-[13.5vw] max-lg:h-[58vw]">
              <TryOnAreaChart data={view.revenueSeries} />
            </div>
            <CalendarCard value={view.revenue.value} />
          </div>
        </section>

        <section className="rounded-[1.042vw] bg-customer-card p-[1.042vw] shadow-customer-card max-lg:rounded-[5vw] max-lg:p-[4vw]">
          <div className="flex items-start justify-between">
            <MetricBlock metric={view.installs} />
            <RangeTabs active={view.range} />
          </div>
          <div className="mt-[1.146vw] h-[13.5vw] max-lg:mt-[4vw] max-lg:h-[58vw]">
            <InstallBarChart data={view.installSeries} />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-[0.75fr_0.75fr_1.5fr] gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
        <TopProducts view={view} />
        <DeviceSplit view={view} />
        <ImpressionsMap view={view} />
      </div>

      <div className="grid grid-cols-4 gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
        {[view.tryOns, view.impressions, view.revenue, view.installs].map((metric) => (
          <article key={metric.label} className="rounded-[1.042vw] bg-customer-card p-[1.042vw] shadow-customer-card max-lg:rounded-[5vw] max-lg:p-[4vw]">
            <div className="flex items-start justify-between gap-[1vw]">
              <MetricBlock metric={metric} />
              <ArrowUpRight className="h-[1.042vw] w-[1.042vw] text-customer-muted max-lg:h-[5vw] max-lg:w-[5vw]" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import Link from "next/link";
import {
  Activity,
  CalendarDays,
  CircleDollarSign,
  Globe2,
  MousePointerClick,
  Sparkles,
  Store,
  Trophy,
} from "lucide-react";
import { flagFromIso2 } from "@/app/customer/dashboard/utils/geo";
import type { OverviewMetric, ShopifyDashboardRange, ShopifyDashboardView } from "../types";
import { InstallBarChart, TryOnAreaChart } from "./OverviewCharts";

interface ShopifyOverviewPageProps {
  view: ShopifyDashboardView;
}

const ranges: Array<{ value: ShopifyDashboardRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "range", label: "90 days" },
];

const toneClasses: Record<NonNullable<OverviewMetric["tone"]>, string> = {
  blue: "bg-brand-blue/10 text-brand-blue",
  green: "bg-blue-50 text-blue-700",
  yellow: "bg-sky-50 text-sky-700",
  purple: "bg-white text-slate-700 ring-1 ring-blue-100",
};

const toneDotClasses: Record<NonNullable<OverviewMetric["tone"]>, string> = {
  blue: "bg-brand-blue",
  green: "bg-blue-500",
  yellow: "bg-sky-500",
  purple: "bg-blue-300",
};

const mapBucketClasses = [
  "fill-slate-100",
  "fill-brand-blue/20",
  "fill-brand-blue/35",
  "fill-brand-blue/55",
  "fill-brand-blue/80",
] as const;

function buildDashboardHref({
  tryOnRange,
  installRange,
  date,
}: {
  tryOnRange: ShopifyDashboardRange;
  installRange: ShopifyDashboardRange;
  date?: string | null;
}) {
  const params = new URLSearchParams({ tryOnRange, installRange });
  if (date && tryOnRange === "today") params.set("date", date);
  return `/admin?${params.toString()}`;
}

function toDateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addUtcDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function selectedCalendarDates(view: ShopifyDashboardView, baseDate: Date) {
  const selected = new Set<string>();
  const end = view.selectedDate ? new Date(`${view.selectedDate}T00:00:00.000Z`) : baseDate;
  const days = view.tryOnRange === "today" ? 1 : view.tryOnRange === "week" ? 7 : view.tryOnRange === "range" ? 90 : 30;

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    selected.add(toDateKey(addUtcDays(end, -offset)));
  }

  return selected;
}

function RangeTabs({
  active,
  target,
  view,
}: {
  active: ShopifyDashboardRange;
  target: "tryOns" | "installs";
  view: ShopifyDashboardView;
}) {
  return (
    <div className="flex rounded-full border border-white/70 bg-white/70 p-[0.208vw] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_34px_rgba(15,30,55,0.06)] backdrop-blur max-lg:p-[1vw]">
      {ranges.map((range) => {
        const selected = range.value === active;
        const href = buildDashboardHref({
          tryOnRange: target === "tryOns" ? range.value : view.tryOnRange,
          installRange: target === "installs" ? range.value : view.installRange,
          date: view.selectedDate,
        });
        return (
          <Link
            key={range.value}
            href={href}
            className={`rounded-full px-[0.833vw] py-[0.365vw] text-[clamp(11px,0.68vw,13px)] font-semibold transition max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[3vw] ${
              selected ? "bg-brand-blue text-white shadow-[0_10px_28px_rgba(44,123,255,0.24)]" : "text-customer-muted hover:text-brand-blue"
            }`}
          >
            {range.label}
          </Link>
        );
      })}
    </div>
  );
}

function HeroStat({ metric, label }: { metric: OverviewMetric; label?: string }) {
  return (
    <div className="rounded-[1.146vw] border border-blue-100 bg-white/88 p-[0.938vw] text-text-primary shadow-[0_18px_55px_rgba(44,123,255,0.10)] backdrop-blur max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[clamp(11px,0.66vw,13px)] font-semibold uppercase tracking-[0.14em] text-brand-blue/70 max-lg:text-[2.8vw]">
          {label ?? metric.label}
        </p>
        {metric.trend ? (
          <span className="rounded-full bg-brand-blue/10 px-[0.521vw] py-[0.208vw] text-[clamp(10px,0.58vw,12px)] font-semibold text-brand-blue max-lg:px-[2.5vw] max-lg:py-[1vw] max-lg:text-[2.6vw]">
            {metric.trend}
          </span>
        ) : null}
      </div>
      <p className="mt-[0.729vw] text-[clamp(34px,2.35vw,48px)] font-semibold leading-none tracking-[-0.04em] max-lg:mt-[3vw] max-lg:text-[10vw]">
        {metric.value}
      </p>
      <p className="mt-[0.417vw] text-[clamp(11px,0.66vw,13px)] leading-relaxed text-text-body max-lg:mt-[1.5vw] max-lg:text-[3vw]">{metric.helper}</p>
    </div>
  );
}

function MetricCard({ metric, icon }: { metric: OverviewMetric; icon: React.ReactNode }) {
  const tone = metric.tone ?? "blue";

  return (
    <article className="group relative overflow-hidden rounded-[1.146vw] border border-white/75 bg-white/82 p-[1.042vw] shadow-[0_20px_70px_rgba(23,37,65,0.08)] backdrop-blur transition-transform hover:-translate-y-0.5 max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <div className="absolute -right-[2vw] -top-[2vw] h-[5vw] w-[5vw] rounded-full bg-brand-blue/10 blur-2xl transition-opacity group-hover:opacity-80 max-lg:hidden" aria-hidden />
      <div className="relative flex items-start justify-between gap-[1vw]">
        <div className="min-w-0">
          <div className="flex items-center gap-[0.521vw] max-lg:gap-[2vw]">
            <span className={`h-[0.521vw] w-[0.521vw] rounded-full max-lg:h-[2vw] max-lg:w-[2vw] ${toneDotClasses[tone]}`} />
            <p className="text-[clamp(11px,0.66vw,13px)] font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.8vw]">{metric.label}</p>
          </div>
          <p className="mt-[0.729vw] text-[clamp(30px,2vw,42px)] font-semibold leading-none tracking-[-0.04em] text-text-primary max-lg:mt-[3vw] max-lg:text-[8vw]">{metric.value}</p>
          <p className="mt-[0.417vw] text-[clamp(12px,0.72vw,14px)] leading-relaxed text-text-body max-lg:mt-[1.5vw] max-lg:text-[3.2vw]">{metric.helper}</p>
        </div>
        <div className={`flex h-[2.5vw] w-[2.5vw] shrink-0 items-center justify-center rounded-[0.833vw] max-lg:h-[11vw] max-lg:w-[11vw] max-lg:rounded-[4vw] ${toneClasses[tone]}`}>
          {icon}
        </div>
      </div>
      {metric.trend ? (
        <div className="relative mt-[1.042vw] inline-flex rounded-full bg-customer-soft px-[0.625vw] py-[0.26vw] text-[clamp(11px,0.64vw,12px)] font-semibold text-text-body max-lg:mt-[4vw] max-lg:px-[3vw] max-lg:py-[1vw] max-lg:text-[2.8vw]">
          {metric.trend} vs previous window
        </div>
      ) : null}
    </article>
  );
}

function CalendarCard({ value, view }: { value: string; view: ShopifyDashboardView }) {
  const baseDate = view.selectedDate ? new Date(`${view.selectedDate}T00:00:00.000Z`) : new Date();
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const selectedDates = selectedCalendarDates(view, baseDate);
  const cells = Array.from({ length: 35 }, (_, index) => {
    const day = index - firstWeekday + 1;
    if (day < 1 || day > daysInMonth) return null;
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { day, date };
  });

  return (
    <div className="rounded-[1.042vw] border border-white/80 bg-white/78 p-[0.729vw] shadow-[0_16px_48px_rgba(23,37,65,0.07)] backdrop-blur max-lg:rounded-[5vw] max-lg:p-[3vw]">
      <div className="grid grid-cols-7 gap-[0.313vw] max-lg:gap-[1.3vw]">
        {cells.map((cell, index) => {
          if (!cell) {
            return <span key={`empty-${index}`} className="aspect-square" />;
          }
          const highlighted = selectedDates.has(cell.date);
          const exactDay = cell.date === view.selectedDate || (view.selectedDate === null && cell.date === toDateKey(baseDate));
          return (
            <Link
              key={cell.date}
              href={buildDashboardHref({ tryOnRange: "today", installRange: view.installRange, date: cell.date })}
              className={`flex aspect-square items-center justify-center rounded-[0.521vw] text-[clamp(10px,0.58vw,12px)] font-semibold max-lg:rounded-[2.4vw] max-lg:text-[2.8vw] ${
                exactDay ? "bg-brand-blue text-white shadow-[0_8px_18px_rgba(44,123,255,0.22)]" : highlighted ? "bg-brand-blue/16 text-brand-blue" : "bg-slate-100/80 text-customer-muted"
              }`}
            >
              {cell.day}
            </Link>
          );
        })}
      </div>
      <div className="mt-[0.729vw] flex items-center justify-between rounded-[0.833vw] bg-brand-blue px-[0.833vw] py-[0.625vw] text-white shadow-[0_12px_26px_rgba(44,123,255,0.20)] max-lg:mt-[3vw] max-lg:rounded-[4vw] max-lg:px-[4vw] max-lg:py-[3vw]">
        <div>
          <p className="text-[clamp(10px,0.58vw,12px)] font-semibold uppercase tracking-[0.12em] text-blue-100 max-lg:text-[2.6vw]">Selected</p>
          <span className="text-[clamp(20px,1.35vw,28px)] font-semibold max-lg:text-[6vw]">{value}</span>
        </div>
        <CalendarDays className="h-[1.042vw] w-[1.042vw] text-white max-lg:h-[5vw] max-lg:w-[5vw]" />
      </div>
    </div>
  );
}

function TopMerchants({ view }: { view: ShopifyDashboardView }) {
  return (
    <section className="rounded-[1.146vw] border border-white/75 bg-white/82 p-[1.042vw] shadow-[0_20px_70px_rgba(23,37,65,0.08)] backdrop-blur max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <div className="mb-[0.833vw] flex items-center justify-between max-lg:mb-[3vw]">
        <div>
          <h3 className="text-[clamp(16px,1vw,20px)] font-semibold text-text-primary max-lg:text-[4.4vw]">Top merchants</h3>
          <p className="mt-[0.208vw] text-[clamp(11px,0.64vw,12px)] text-customer-muted max-lg:text-[2.8vw]">Ranked by try-on momentum</p>
        </div>
        <Trophy className="h-[1.25vw] w-[1.25vw] text-brand-blue max-lg:h-[6vw] max-lg:w-[6vw]" />
      </div>
      <div className="space-y-[0.625vw] max-lg:space-y-[3vw]">
        {view.topMerchants.length > 0 ? view.topMerchants.map((merchant, index) => (
          <div key={merchant.title} className="grid grid-cols-[2.3vw_1fr_auto] items-center gap-[0.833vw] rounded-[0.833vw] bg-slate-50/80 px-[0.729vw] py-[0.625vw] max-lg:grid-cols-[9vw_1fr_auto] max-lg:gap-[3vw] max-lg:rounded-[4vw] max-lg:px-[3vw] max-lg:py-[3vw]">
            <span className="flex h-[2.3vw] w-[2.3vw] items-center justify-center rounded-full bg-white text-[clamp(12px,0.72vw,14px)] font-semibold text-customer-muted shadow-sm max-lg:h-[9vw] max-lg:w-[9vw] max-lg:text-[3.2vw]">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[clamp(12px,0.72vw,14px)] font-semibold text-text-primary max-lg:text-[3.2vw]">{merchant.title}</p>
              <p className="mt-[0.156vw] truncate text-[clamp(10px,0.6vw,12px)] text-customer-muted max-lg:text-[2.8vw]">{merchant.meta}</p>
            </div>
            <span className={`rounded-[0.625vw] px-[0.729vw] py-[0.521vw] text-[clamp(15px,0.94vw,18px)] font-semibold max-lg:rounded-[3vw] max-lg:px-[3vw] max-lg:py-[2vw] max-lg:text-[4vw] ${toneClasses[merchant.accent]}`}>{merchant.value}</span>
          </div>
        )) : (
          <p className="rounded-[0.833vw] bg-slate-50 p-[1vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:rounded-[4vw] max-lg:p-[4vw] max-lg:text-[3.2vw]">No merchant try-ons yet.</p>
        )}
      </div>
    </section>
  );
}

function DeviceSplit({ view }: { view: ShopifyDashboardView }) {
  return (
    <section className="rounded-[1.146vw] border border-white/75 bg-white/82 p-[1.042vw] shadow-[0_20px_70px_rgba(23,37,65,0.08)] backdrop-blur max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[clamp(16px,1vw,20px)] font-semibold text-text-primary max-lg:text-[4.4vw]">Device split</h3>
          <p className="mt-[0.208vw] text-[clamp(11px,0.64vw,12px)] text-customer-muted max-lg:text-[2.8vw]">Where shoppers start</p>
        </div>
        <SmartphoneIcon />
      </div>
      <div className="mt-[1.146vw] flex min-h-[8.5vw] items-end justify-center max-lg:mt-[4vw] max-lg:min-h-[34vw]">
        {view.deviceBubbles.length > 0 ? view.deviceBubbles.slice(0, 3).map((device, index) => (
          <div
            key={device.label}
            className={`flex items-center justify-center rounded-full text-center font-semibold shadow-[0_16px_38px_rgba(23,37,65,0.10)] ${toneClasses[device.tone]}`}
            style={{
              width: `${Math.max(4.2, 5.3 + device.percent / 12)}vw`,
              height: `${Math.max(4.2, 5.3 + device.percent / 12)}vw`,
              marginLeft: index === 0 ? 0 : "-0.7vw",
            }}
          >
            <span className="text-[clamp(15px,1.05vw,20px)] max-lg:text-[4vw]">{device.percent}%</span>
          </div>
        )) : (
          <p className="text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:text-[3.2vw]">No device data yet.</p>
        )}
      </div>
      <div className="mt-[0.833vw] flex flex-wrap gap-[0.521vw] max-lg:mt-[4vw] max-lg:gap-[2vw]">
        {view.deviceBubbles.map((device) => (
          <span key={device.label} className="rounded-full bg-slate-50 px-[0.625vw] py-[0.26vw] text-[clamp(11px,0.64vw,12px)] capitalize text-customer-muted max-lg:px-[3vw] max-lg:py-[1vw] max-lg:text-[2.8vw]">
            {device.label}: {device.value}
          </span>
        ))}
      </div>
    </section>
  );
}

function SmartphoneIcon() {
  return (
    <div className="flex h-[2.5vw] w-[2.5vw] items-center justify-center rounded-[0.833vw] bg-brand-blue/10 text-brand-blue max-lg:h-[11vw] max-lg:w-[11vw] max-lg:rounded-[4vw]">
      <Activity className="h-[1.15vw] w-[1.15vw] max-lg:h-[5vw] max-lg:w-[5vw]" />
    </div>
  );
}

function ImpressionsMap({ view }: { view: ShopifyDashboardView }) {
  return (
    <section className="grid grid-cols-[1fr_11vw] gap-[1vw] rounded-[1.146vw] border border-white/75 bg-white/82 p-[1.042vw] shadow-[0_20px_70px_rgba(23,37,65,0.08)] backdrop-blur max-lg:grid-cols-1 max-lg:gap-[4vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <div>
        <div className="mb-[0.625vw] flex items-start justify-between max-lg:mb-[3vw]">
          <div>
            <h3 className="text-[clamp(16px,1vw,20px)] font-semibold text-text-primary max-lg:text-[4.4vw]">Global demand</h3>
            <p className="mt-[0.208vw] text-[clamp(11px,0.64vw,12px)] text-customer-muted max-lg:text-[2.8vw]">Try-on starts by country</p>
          </div>
          <p className="text-[clamp(30px,2vw,40px)] font-semibold leading-none tracking-[-0.04em] text-text-primary max-lg:text-[8vw]">{view.impressions.value}</p>
        </div>
        <svg viewBox={`0 0 ${view.map.width} ${view.map.height}`} className="h-[12.5vw] w-full drop-shadow-[0_12px_28px_rgba(23,37,65,0.10)] max-lg:h-[48vw]" role="img" aria-label="Impressions by country">
          {view.map.countries.map((country, index) => (
            <path
              key={`${country.numeric}-${country.iso2 ?? "unknown"}-${index}`}
              d={country.path}
              className={`${mapBucketClasses[country.bucket]} transition-all hover:fill-brand-blue hover:opacity-90`}
              stroke="white"
              strokeWidth={country.count > 0 ? "0.9" : "0.45"}
            >
              <title>{`${country.name}: ${country.count.toLocaleString("en-US")} try-on starts`}</title>
            </path>
          ))}
        </svg>
      </div>
      <div className="space-y-[0.521vw] max-lg:space-y-[2vw]">
        {view.countries.length ? view.countries.map((country) => (
          <div key={country.iso2} className="flex items-center justify-between gap-[0.521vw] rounded-[0.625vw] bg-slate-50 px-[0.625vw] py-[0.417vw] max-lg:rounded-[3vw] max-lg:px-[3vw] max-lg:py-[2vw]">
            <span className="flex min-w-0 items-center gap-[0.365vw] max-lg:gap-[1.5vw]">
              <span className="text-[clamp(13px,0.78vw,15px)] leading-none max-lg:text-[3.4vw]">{flagFromIso2(country.iso2)}</span>
              <span className="truncate text-[clamp(11px,0.64vw,12px)] text-text-body max-lg:text-[3vw]">{country.label}</span>
            </span>
            <span className="text-[clamp(11px,0.64vw,12px)] font-semibold text-text-primary max-lg:text-[3vw]">{country.count}</span>
          </div>
        )) : (
          <p className="rounded-[0.625vw] bg-slate-50 px-[0.625vw] py-[0.417vw] text-[clamp(11px,0.64vw,12px)] text-customer-muted max-lg:rounded-[3vw] max-lg:px-[3vw] max-lg:py-[2vw] max-lg:text-[3vw]">No country data yet.</p>
        )}
      </div>
    </section>
  );
}

function FunnelGrid({ view }: { view: ShopifyDashboardView }) {
  if (!view.installFunnel.length) return null;

  return (
    <div className="mt-[1vw] grid grid-cols-2 gap-[0.625vw] max-lg:mt-[4vw] max-lg:gap-[2vw]">
      {view.installFunnel.map((item) => (
        <div key={item.label} className="rounded-[0.833vw] border border-white/75 bg-white/70 px-[0.729vw] py-[0.625vw] shadow-[0_12px_30px_rgba(23,37,65,0.05)] max-lg:rounded-[3vw] max-lg:px-[3vw] max-lg:py-[2.5vw]">
          <p className="text-[clamp(10px,0.6vw,12px)] font-semibold uppercase tracking-[0.08em] text-customer-muted max-lg:text-[2.8vw]">{item.label}</p>
          <p className="mt-[0.313vw] text-[clamp(18px,1.25vw,24px)] font-semibold tracking-[-0.03em] text-text-primary max-lg:mt-[1vw] max-lg:text-[5vw]">{item.value}</p>
          <p className="mt-[0.208vw] text-[clamp(11px,0.64vw,12px)] text-text-body max-lg:mt-[1vw] max-lg:text-[3vw]">{item.helper}</p>
        </div>
      ))}
    </div>
  );
}

export function ShopifyOverviewPage({ view }: ShopifyOverviewPageProps) {
  return (
    <section className="relative overflow-hidden rounded-[1.875vw] border border-blue-100 bg-[radial-gradient(circle_at_12%_8%,rgba(44,123,255,0.18),transparent_27%),radial-gradient(circle_at_86%_4%,rgba(125,190,255,0.20),transparent_25%),linear-gradient(135deg,#FFFFFF_0%,#F2F8FF_46%,#FFFFFF_100%)] p-[1.146vw] shadow-[0_30px_110px_rgba(44,123,255,0.13)] max-lg:rounded-[7vw] max-lg:p-[3vw]">
      <div className="pointer-events-none absolute -right-[7vw] top-[5vw] h-[18vw] w-[18vw] rounded-full bg-brand-blue/12 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-[9vw] left-[16vw] h-[16vw] w-[16vw] rounded-full bg-sky-200/45 blur-3xl" aria-hidden />

      <div className="relative space-y-[1.146vw] max-lg:space-y-[4vw]">
        <section className="relative overflow-hidden rounded-[1.563vw] border border-blue-100 bg-[radial-gradient(circle_at_16%_10%,rgba(44,123,255,0.20),transparent_28%),radial-gradient(circle_at_76%_8%,rgba(148,206,255,0.28),transparent_24%),linear-gradient(135deg,#FFFFFF_0%,#EEF6FF_56%,#FFFFFF_100%)] p-[1.25vw] text-text-primary shadow-[0_26px_90px_rgba(44,123,255,0.14)] max-lg:rounded-[6vw] max-lg:p-[5vw]">
          <div className="absolute right-[2vw] top-[1.5vw] hidden h-[8vw] w-[8vw] rotate-12 rounded-[2vw] border border-blue-100 bg-white/55 lg:block" aria-hidden />
          <div className="relative grid gap-[1.25vw] xl:grid-cols-[minmax(0,1.2fr)_minmax(460px,0.8fr)] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-[0.521vw] rounded-full border border-blue-100 bg-white/80 px-[0.729vw] py-[0.365vw] text-[clamp(11px,0.66vw,13px)] font-semibold uppercase tracking-[0.16em] text-brand-blue max-lg:gap-[2vw] max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[2.8vw]">
                <Sparkles className="h-[0.833vw] w-[0.833vw] text-brand-blue max-lg:h-[4vw] max-lg:w-[4vw]" />
                PrimeStyleAI command room
              </div>
              <h1 className="mt-[1.042vw] max-w-[58vw] text-[clamp(42px,3.8vw,76px)] font-semibold leading-[0.93] tracking-[-0.065em] max-lg:mt-[4vw] max-lg:max-w-none max-lg:text-[12vw]">
                Shopify growth, try-ons, and demand in one live cockpit.
              </h1>
              <div className="mt-[1.25vw] flex flex-wrap gap-[0.625vw] max-lg:mt-[5vw] max-lg:gap-[2vw]">
                <span className="rounded-full bg-white/82 px-[0.729vw] py-[0.313vw] text-[clamp(11px,0.66vw,13px)] font-semibold text-text-body ring-1 ring-blue-100 max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[2.8vw]">Try-ons: {view.tryOnRangeLabel}</span>
                <span className="rounded-full bg-white/82 px-[0.729vw] py-[0.313vw] text-[clamp(11px,0.66vw,13px)] font-semibold text-text-body ring-1 ring-blue-100 max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[2.8vw]">Installs: {view.installRangeLabel}</span>
                <span className="rounded-full bg-brand-blue px-[0.729vw] py-[0.313vw] text-[clamp(11px,0.66vw,13px)] font-semibold text-white shadow-[0_10px_26px_rgba(44,123,255,0.22)] max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[2.8vw]">Shopify only</span>
              </div>
            </div>

            <div className="grid gap-[0.833vw] sm:grid-cols-2 max-lg:gap-[3vw]">
              <HeroStat metric={view.revenue} label="Monthly billing" />
              <HeroStat metric={view.tryOns} label="Completed try-ons" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-4 gap-[0.938vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
          <MetricCard metric={view.revenue} icon={<CircleDollarSign className="h-[1.15vw] w-[1.15vw] max-lg:h-[5vw] max-lg:w-[5vw]" />} />
          <MetricCard metric={view.tryOns} icon={<MousePointerClick className="h-[1.15vw] w-[1.15vw] max-lg:h-[5vw] max-lg:w-[5vw]" />} />
          <MetricCard metric={view.installs} icon={<Store className="h-[1.15vw] w-[1.15vw] max-lg:h-[5vw] max-lg:w-[5vw]" />} />
          <MetricCard metric={view.impressions} icon={<Globe2 className="h-[1.15vw] w-[1.15vw] max-lg:h-[5vw] max-lg:w-[5vw]" />} />
        </div>

        <div className="grid grid-cols-[1.45fr_0.85fr] gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
          <section className="rounded-[1.25vw] border border-white/75 bg-white/82 p-[1.042vw] shadow-[0_20px_70px_rgba(23,37,65,0.08)] backdrop-blur max-lg:rounded-[5vw] max-lg:p-[4vw]">
            <div className="flex items-start justify-between gap-[1vw] max-lg:flex-col max-lg:gap-[3vw]">
              <div>
                <p className="text-[clamp(11px,0.66vw,13px)] font-semibold uppercase tracking-[0.14em] text-brand-blue max-lg:text-[2.8vw]">Try-on performance</p>
                <h2 className="mt-[0.313vw] text-[clamp(24px,1.55vw,32px)] font-semibold tracking-[-0.04em] text-text-primary max-lg:text-[6vw]">Started vs completed</h2>
              </div>
              <RangeTabs active={view.tryOnRange} target="tryOns" view={view} />
            </div>
            <div className="mt-[1.146vw] grid grid-cols-[1fr_10vw] gap-[1vw] max-lg:mt-[4vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
              <div className="h-[16vw] rounded-[1.042vw] bg-[linear-gradient(180deg,#FFFFFF_0%,#F6FAFF_100%)] p-[0.625vw] max-lg:h-[62vw] max-lg:rounded-[4vw] max-lg:p-[2vw]">
                <TryOnAreaChart data={view.revenueSeries} />
              </div>
              <CalendarCard value={view.tryOns.value} view={view} />
            </div>
          </section>

          <section className="rounded-[1.25vw] border border-white/75 bg-white/82 p-[1.042vw] shadow-[0_20px_70px_rgba(23,37,65,0.08)] backdrop-blur max-lg:rounded-[5vw] max-lg:p-[4vw]">
            <div className="flex items-start justify-between gap-[1vw] max-lg:flex-col max-lg:gap-[3vw]">
              <div>
                <p className="text-[clamp(11px,0.66vw,13px)] font-semibold uppercase tracking-[0.14em] text-brand-blue max-lg:text-[2.8vw]">Merchant acquisition</p>
                <h2 className="mt-[0.313vw] text-[clamp(24px,1.55vw,32px)] font-semibold tracking-[-0.04em] text-text-primary max-lg:text-[6vw]">Installs funnel</h2>
              </div>
              <RangeTabs active={view.installRange} target="installs" view={view} />
            </div>
            <div className="mt-[1.146vw] h-[13.5vw] rounded-[1.042vw] bg-[linear-gradient(180deg,#FFFFFF_0%,#F6FAFF_100%)] p-[0.625vw] max-lg:mt-[4vw] max-lg:h-[58vw] max-lg:rounded-[4vw] max-lg:p-[2vw]">
              <InstallBarChart data={view.installSeries} />
            </div>
            <FunnelGrid view={view} />
          </section>
        </div>

        <div className="grid grid-cols-[0.78fr_0.78fr_1.44fr] gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
          <TopMerchants view={view} />
          <DeviceSplit view={view} />
          <ImpressionsMap view={view} />
        </div>
      </div>
    </section>
  );
}

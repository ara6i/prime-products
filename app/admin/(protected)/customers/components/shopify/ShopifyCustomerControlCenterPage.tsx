"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Power,
  RotateCcw,
  Save,
} from "lucide-react";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/shared/components/ui";
import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import { flagFromIso2 } from "@/app/customer/dashboard/utils/geo";
import { CustomerWorldMapInteractive } from "@/app/customer/dashboard/components/shared/CustomerWorldMapInteractive";
import { TryOnAreaChart } from "../../../overview/components/OverviewCharts";
import { useShopifyCustomerControlCenter } from "../../hooks/useShopifyCustomerControlCenter";
import type {
  ShopifyBehaviorAnalyticsRaw,
  ShopifyBillingAutomationTestPayload,
  ShopifyBillingOverridePayload,
  ShopifyControlCenterRaw,
  ShopifyControlCenterView,
  ShopifyMetricCard,
  ShopifyRevenueAnalyticsRaw,
  ShopifyUsageLimitsPayload,
} from "../../types";

interface ShopifyCustomerControlCenterPageProps {
  initialView: ShopifyControlCenterView;
  initialControlCenter: ShopifyControlCenterRaw;
  initialBehavior: ShopifyBehaviorAnalyticsRaw | null;
  initialRevenue: ShopifyRevenueAnalyticsRaw | null;
  initialDateRange: { from: string; to: string };
}

interface MetricGridProps {
  cards: ShopifyMetricCard[];
}

function MetricGrid({ cards }: MetricGridProps) {
  return (
    <div className="grid grid-cols-4 gap-[0.833vw] max-lg:grid-cols-2 max-lg:gap-[3vw]">
      {cards.map((card) => (
        <div key={`${card.label}-${card.value}`} className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
          <p className="text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted max-lg:text-[2.8vw]">{card.label}</p>
          <p className="mt-[0.521vw] truncate text-[clamp(18px,1.15vw,23px)] font-semibold text-text-primary max-lg:mt-[2vw] max-lg:text-[4.6vw]">{card.value}</p>
          <p className="mt-[0.208vw] truncate text-[clamp(12px,0.72vw,14px)] text-text-body max-lg:mt-[1vw] max-lg:text-[3vw]">{card.helper}</p>
        </div>
      ))}
    </div>
  );
}

function SmallRows({ rows }: { rows: Array<{ label: string; value: string; helper?: string }> }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card max-lg:rounded-[5vw]">
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`} className="grid grid-cols-[minmax(11vw,0.7fr)_1fr] gap-[1vw] border-b border-customer-border px-[1.042vw] py-[0.729vw] last:border-b-0 max-lg:grid-cols-1 max-lg:gap-[1vw] max-lg:px-[4vw] max-lg:py-[3vw]">
          <div>
            <p className="text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted max-lg:text-[2.8vw]">{row.label}</p>
            {row.helper ? <p className="mt-[0.156vw] text-[clamp(11px,0.68vw,13px)] text-text-body max-lg:text-[2.8vw]">{row.helper}</p> : null}
          </div>
          <p className="break-words text-[clamp(13px,0.78vw,15px)] text-text-primary max-lg:text-[3.4vw]">{row.value}</p>
        </div>
      ))}
    </div>
  );
}

const customerToneClasses = {
  blue: "bg-brand-blue/10 text-brand-blue",
  green: "bg-customer-success-bg text-customer-success-text",
  yellow: "bg-customer-warning-bg text-customer-warning-text",
  purple: "bg-accent-purple/15 text-accent-purple",
} as const;

function CustomerMetricBlock({ card }: { card: ShopifyMetricCard }) {
  return (
    <div>
      <p className="text-[clamp(12px,0.72vw,14px)] font-semibold text-text-primary max-lg:text-[3.2vw]">{card.label}</p>
      <p className="mt-[0.729vw] text-[clamp(34px,2.25vw,46px)] font-semibold leading-none text-text-primary max-lg:mt-[3vw] max-lg:text-[9vw]">{card.value}</p>
      <p className="mt-[0.365vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:mt-[1.5vw] max-lg:text-[3.2vw]">{card.helper}</p>
    </div>
  );
}

function CustomerCalendarSummary({ view }: { view: ShopifyControlCenterView }) {
  return (
    <div className="grid min-w-[10.5rem] grid-cols-2 gap-[0.417vw] max-lg:min-w-0 max-lg:gap-[2vw]">
      {[
        { label: "Status", value: view.statusLabel },
        { label: "Trial ends", value: view.trial.endsAtLabel },
        { label: "Due date", value: view.currentPeriodEndLabel },
        { label: "Range", value: view.analytics.rangeLabel },
      ].map((item) => (
        <div key={item.label} className="min-h-[4.1rem] rounded-[0.729vw] bg-customer-soft px-[0.729vw] py-[0.625vw] max-lg:min-h-0 max-lg:rounded-[3.5vw] max-lg:px-[3vw] max-lg:py-[2.5vw]">
          <p className="text-[clamp(9px,0.55vw,11px)] font-semibold uppercase leading-[1.35] tracking-[0.08em] text-customer-muted max-lg:text-[2.6vw]">{item.label}</p>
          <p className="mt-[0.208vw] break-words text-[clamp(11px,0.68vw,13px)] font-semibold leading-snug text-text-primary max-lg:text-[3vw]">{item.value}</p>
        </div>
      ))}
      <div className="col-span-2 mt-[0.104vw] flex items-center justify-between rounded-[0.833vw] bg-customer-soft px-[0.833vw] py-[0.625vw] max-lg:mt-[1vw] max-lg:rounded-[4vw] max-lg:px-[4vw] max-lg:py-[3vw]">
        <span className="text-[clamp(22px,1.55vw,30px)] font-semibold text-text-primary max-lg:text-[7vw]">{view.analytics.behaviorCards[1]?.value ?? "0"}</span>
        <CalendarDays className="h-[1.042vw] w-[1.042vw] text-brand-blue max-lg:h-[5vw] max-lg:w-[5vw]" />
      </div>
    </div>
  );
}

function DateRangeControls({ initialDateRange }: { initialDateRange: { from: string; to: string } }) {
  const [from, setFrom] = useState(initialDateRange.from);
  const [to, setTo] = useState(initialDateRange.to);

  const applyRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!from || !to || to < from) return;
    const url = new URL(window.location.href);
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    window.location.href = url.toString();
  };

  const resetRange = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("from");
    url.searchParams.delete("to");
    window.location.href = url.toString();
  };

  return (
    <form onSubmit={applyRange} className="flex flex-wrap items-end gap-[0.521vw] rounded-[1.042vw] bg-customer-card p-[0.625vw] shadow-customer-card max-lg:gap-[2vw] max-lg:rounded-[5vw] max-lg:p-[3vw]">
      <div>
        <Label htmlFor="shopify-analytics-from" className="text-[clamp(10px,0.6vw,12px)] font-semibold uppercase tracking-[0.08em] text-customer-muted max-lg:text-[2.8vw]">From</Label>
        <Input id="shopify-analytics-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-[0.208vw] h-[2.188vw] w-[8.6vw] rounded-full bg-customer-soft text-[clamp(11px,0.68vw,13px)] max-lg:h-[10vw] max-lg:w-full max-lg:text-[3vw]" />
      </div>
      <div>
        <Label htmlFor="shopify-analytics-to" className="text-[clamp(10px,0.6vw,12px)] font-semibold uppercase tracking-[0.08em] text-customer-muted max-lg:text-[2.8vw]">To</Label>
        <Input id="shopify-analytics-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-[0.208vw] h-[2.188vw] w-[8.6vw] rounded-full bg-customer-soft text-[clamp(11px,0.68vw,13px)] max-lg:h-[10vw] max-lg:w-full max-lg:text-[3vw]" />
      </div>
      <Button type="submit" disabled={!from || !to || to < from} className="h-[2.188vw] px-[0.833vw] text-[clamp(11px,0.68vw,13px)] max-lg:h-[10vw] max-lg:px-[4vw] max-lg:text-[3vw]">
        Apply
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" title="Reset date range" onClick={resetRange} className="h-[2.188vw] w-[2.188vw] rounded-full max-lg:h-[10vw] max-lg:w-[10vw]">
        <RotateCcw className="h-[0.833vw] w-[0.833vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
      </Button>
    </form>
  );
}

function RankedRows({
  title,
  badge,
  rows,
  empty,
}: {
  title: string;
  badge: string;
  rows: ShopifyControlCenterView["analytics"]["topProducts"];
  empty: string;
}) {
  return (
    <section className="rounded-[1.042vw] bg-customer-card p-[1.042vw] shadow-customer-card max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <div className="mb-[0.833vw] flex items-center justify-between max-lg:mb-[3vw]">
        <h3 className="text-[clamp(15px,0.94vw,18px)] font-semibold text-text-primary max-lg:text-[4vw]">{title}</h3>
        <span className="rounded-full bg-customer-soft px-[0.625vw] py-[0.26vw] text-[clamp(11px,0.64vw,12px)] text-customer-muted max-lg:px-[3vw] max-lg:py-[1vw] max-lg:text-[2.8vw]">{badge}</span>
      </div>
      <div className="space-y-[0.625vw] max-lg:space-y-[3vw]">
        {rows.length > 0 ? rows.map((row) => (
          <div key={`${row.title}-${row.meta}`} className="grid grid-cols-[1fr_auto] items-center gap-[0.833vw] max-lg:gap-[3vw]">
            <div className="min-w-0">
              <p className="truncate text-[clamp(12px,0.72vw,14px)] font-medium text-text-primary max-lg:text-[3.2vw]">{row.title}</p>
              <p className="mt-[0.156vw] truncate text-[clamp(10px,0.6vw,12px)] text-customer-muted max-lg:text-[2.8vw]">{row.meta}</p>
            </div>
            <span className={`rounded-[0.625vw] px-[0.729vw] py-[0.521vw] text-[clamp(15px,0.94vw,18px)] font-semibold max-lg:rounded-[3vw] max-lg:px-[3vw] max-lg:py-[2vw] max-lg:text-[4vw] ${customerToneClasses[row.accent]}`}>{row.value}</span>
          </div>
        )) : (
          <p className="rounded-[0.833vw] bg-customer-soft p-[1vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:rounded-[4vw] max-lg:p-[4vw] max-lg:text-[3.2vw]">{empty}</p>
        )}
      </div>
    </section>
  );
}

function CustomerDeviceSplit({ view }: { view: ShopifyControlCenterView }) {
  return (
    <section className="rounded-[1.042vw] bg-customer-card p-[1.042vw] shadow-customer-card max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <h3 className="text-[clamp(15px,0.94vw,18px)] font-semibold text-text-primary max-lg:text-[4vw]">Device split</h3>
      <div className="mt-[1.146vw] flex min-h-[8.5vw] items-end justify-center max-lg:mt-[4vw] max-lg:min-h-[34vw]">
        {view.analytics.deviceBubbles.length > 0 ? view.analytics.deviceBubbles.map((device, index) => (
          <div
            key={device.label}
            className={`flex items-center justify-center rounded-full text-center font-semibold ${customerToneClasses[device.tone]}`}
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
        {view.analytics.deviceBubbles.map((device) => (
          <span key={device.label} className="rounded-full bg-customer-soft px-[0.625vw] py-[0.26vw] text-[clamp(11px,0.64vw,12px)] text-customer-muted max-lg:px-[3vw] max-lg:py-[1vw] max-lg:text-[2.8vw]">
            {device.label}: {device.value}
          </span>
        ))}
      </div>
    </section>
  );
}

function CustomerFunnel({ view }: { view: ShopifyControlCenterView }) {
  return (
    <section className="rounded-[1.042vw] bg-customer-card p-[1.042vw] shadow-customer-card max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <h3 className="text-[clamp(15px,0.94vw,18px)] font-semibold text-text-primary max-lg:text-[4vw]">Try-on funnel</h3>
      <div className="mt-[1.042vw] space-y-[0.625vw] max-lg:mt-[4vw] max-lg:space-y-[3vw]">
        {view.analytics.funnel.length > 0 ? view.analytics.funnel.map((item) => (
          <div key={item.step}>
            <div className="flex items-center justify-between gap-[1vw]">
              <span className="truncate text-[clamp(12px,0.72vw,14px)] text-text-body max-lg:text-[3.2vw]">{item.step}</span>
              <span className="text-[clamp(12px,0.72vw,14px)] font-semibold text-text-primary max-lg:text-[3.2vw]">{item.count}</span>
            </div>
            <div className="mt-[0.313vw] h-[0.417vw] overflow-hidden rounded-full bg-customer-soft max-lg:mt-[1.5vw] max-lg:h-[2vw]">
              <div className="h-full rounded-full bg-brand-blue" style={{ width: `${item.percent}%` }} />
            </div>
          </div>
        )) : (
          <p className="text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:text-[3.2vw]">No funnel data yet.</p>
        )}
      </div>
    </section>
  );
}

function CustomerCountryMap({ view }: { view: ShopifyControlCenterView }) {
  return (
    <section className="grid grid-cols-[1fr_10vw] gap-[1vw] rounded-[1.042vw] bg-customer-card p-[1.042vw] shadow-customer-card max-lg:grid-cols-1 max-lg:gap-[4vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <div>
        <div className="mb-[0.625vw] flex items-start justify-between max-lg:mb-[3vw]">
          <div>
            <h3 className="text-[clamp(15px,0.94vw,18px)] font-semibold text-text-primary max-lg:text-[4vw]">Customer countries</h3>
            <p className="mt-[0.208vw] text-[clamp(11px,0.64vw,12px)] text-customer-muted max-lg:text-[2.8vw]">Where this store&apos;s try-ons happen</p>
          </div>
          <p className="text-[clamp(28px,1.85vw,36px)] font-semibold leading-none text-text-primary max-lg:text-[8vw]">{view.analytics.behaviorCards[0]?.value ?? "0"}</p>
        </div>
        {view.analytics.map ? (
          <CustomerWorldMapInteractive
            width={view.analytics.map.width}
            height={view.analytics.map.height}
            countries={view.analytics.map.countries}
          />
        ) : (
          <div className="grid h-[12.5vw] place-items-center rounded-[0.833vw] bg-customer-soft text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:h-[48vw] max-lg:rounded-[4vw] max-lg:text-[3.2vw]">No map data yet.</div>
        )}
      </div>
      <div className="space-y-[0.521vw] max-lg:space-y-[2vw]">
        {view.analytics.countrySplit.length > 0 ? view.analytics.countrySplit.map((country) => (
          <div key={`${country.iso2}-${country.name}`} className="flex items-center justify-between gap-[0.521vw] rounded-[0.625vw] bg-customer-soft px-[0.625vw] py-[0.417vw] max-lg:rounded-[3vw] max-lg:px-[3vw] max-lg:py-[2vw]">
            <span className="flex min-w-0 items-center gap-[0.365vw] max-lg:gap-[1.5vw]">
              <span className="text-[clamp(13px,0.78vw,15px)] leading-none max-lg:text-[3.4vw]">{flagFromIso2(country.iso2)}</span>
              <span className="truncate text-[clamp(11px,0.64vw,12px)] text-text-body max-lg:text-[3vw]">{country.name}</span>
            </span>
            <span className="text-[clamp(11px,0.64vw,12px)] font-semibold text-text-primary max-lg:text-[3vw]">{country.count.toLocaleString("en-US")}</span>
          </div>
        )) : (
          <p className="rounded-[0.625vw] bg-customer-soft px-[0.625vw] py-[0.521vw] text-[clamp(11px,0.64vw,12px)] text-customer-muted max-lg:rounded-[3vw] max-lg:px-[3vw] max-lg:py-[2vw] max-lg:text-[3vw]">No countries yet.</p>
        )}
      </div>
    </section>
  );
}

function BillingOverrideForm({
  view,
  isSaving,
  onSubmit,
}: {
  view: ShopifyControlCenterView;
  isSaving: boolean;
  onSubmit: (payload: ShopifyBillingOverridePayload) => Promise<void>;
}) {
  const allowedPlans = ["pilot", "free", "custom"];
  const normalizePlan = (value: string) => {
    const normalized = value.trim().toLowerCase();
    return allowedPlans.includes(normalized) ? normalized : "custom";
  };
  const [plan, setPlan] = useState(normalizePlan(view.billingFormDefaults.plan));
  const [productCount, setProductCount] = useState(String(view.billingFormDefaults.selectedProductCount));
  const [tryOns, setTryOns] = useState(String(view.billingFormDefaults.requestedTryOns));
  const [effectiveMode, setEffectiveMode] = useState<"current" | "next_cycle">("current");
  const [scheduledEffectiveAt, setScheduledEffectiveAt] = useState(view.billingFormDefaults.scheduledEffectiveAt);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(view.billingFormDefaults.currentPeriodEnd);
  const [usageBillingEnabled, setUsageBillingEnabled] = useState(view.billingFormDefaults.billingUsageEnabled);
  const [autoRefillEnabled, setAutoRefillEnabled] = useState(view.billingFormDefaults.billingAutoRefillEnabled);
  const [reason, setReason] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit({
      plan: plan.trim() || "custom",
      selectedProductCount: Math.max(0, Math.floor(Number(productCount) || 0)),
      requestedTryOns: Math.max(0, Math.floor(Number(tryOns) || 0)),
      effectiveMode,
      reason,
      scheduledEffectiveAt: scheduledEffectiveAt || null,
      currentPeriodEnd: currentPeriodEnd || null,
      billingUsageEnabled: usageBillingEnabled,
      billingAutoRefillEnabled: autoRefillEnabled,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <div className="flex flex-wrap items-center justify-between gap-[1vw]">
        <div>
          <h3 className="text-[clamp(17px,1.05vw,21px)] font-semibold text-text-primary max-lg:text-[4.4vw]">Billing and plan controls</h3>
          <p className="mt-[0.208vw] text-[clamp(12px,0.72vw,14px)] text-text-body max-lg:text-[3vw]">Change this merchant&apos;s PrimeStyleAI plan, billing totals, product count, try-on package, and due dates.</p>
        </div>
        <select
          value={effectiveMode}
          onChange={(event) => setEffectiveMode(event.target.value === "next_cycle" ? "next_cycle" : "current")}
          className="h-[2.292vw] rounded-full border border-customer-border bg-customer-soft px-[0.833vw] text-[clamp(12px,0.72vw,14px)] text-text-primary outline-none max-lg:h-[9vw] max-lg:px-[3vw] max-lg:text-[3.2vw]"
        >
          <option value="current">Apply current</option>
          <option value="next_cycle">Schedule next cycle</option>
        </select>
      </div>

      <div className="mt-[1.042vw] grid grid-cols-3 gap-[0.833vw] max-lg:mt-[4vw] max-lg:grid-cols-1 max-lg:gap-[3vw]">
        <div>
          <Label htmlFor="shopify-plan" className="text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:text-[3vw]">Plan</Label>
          <select
            id="shopify-plan"
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
            className="mt-[0.313vw] h-[2.5vw] w-full rounded-[0.833vw] border border-customer-border bg-customer-card px-3 text-sm text-text-primary outline-none focus:border-transparent focus:ring-2 focus:ring-brand-blue max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]"
          >
            {allowedPlans.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="shopify-products" className="text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:text-[3vw]">Product count</Label>
          <Input id="shopify-products" type="number" min={0} value={productCount} onChange={(event) => setProductCount(event.target.value)} className="mt-[0.313vw] h-[2.5vw] rounded-[0.833vw] max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]" />
        </div>
        <div>
          <Label htmlFor="shopify-tryons" className="text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:text-[3vw]">Try-on pack</Label>
          <Input id="shopify-tryons" type="number" min={0} value={tryOns} onChange={(event) => setTryOns(event.target.value)} className="mt-[0.313vw] h-[2.5vw] rounded-[0.833vw] max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]" />
        </div>
        <div>
          <Label htmlFor="shopify-current-period" className="text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:text-[3vw]">Current due date</Label>
          <Input id="shopify-current-period" type="date" value={currentPeriodEnd} onChange={(event) => setCurrentPeriodEnd(event.target.value)} className="mt-[0.313vw] h-[2.5vw] rounded-[0.833vw] max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]" />
        </div>
        <div>
          <Label htmlFor="shopify-scheduled-date" className="text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:text-[3vw]">Next plan date</Label>
          <Input id="shopify-scheduled-date" type="date" value={scheduledEffectiveAt} onChange={(event) => setScheduledEffectiveAt(event.target.value)} className="mt-[0.313vw] h-[2.5vw] rounded-[0.833vw] max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]" />
        </div>
        <div>
          <Label htmlFor="shopify-billing-reason" className="text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:text-[3vw]">Reason</Label>
          <Input id="shopify-billing-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Support case, contract, correction" className="mt-[0.313vw] h-[2.5vw] rounded-[0.833vw] max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]" />
        </div>
      </div>

      <div className="mt-[0.833vw] flex flex-wrap items-center justify-between gap-[1vw] max-lg:mt-[4vw] max-lg:gap-[3vw]">
        <div className="flex flex-wrap items-center gap-[1vw] text-[clamp(12px,0.72vw,14px)] text-text-body max-lg:gap-[4vw] max-lg:text-[3.2vw]">
          <label className="flex items-center gap-[0.417vw] max-lg:gap-[2vw]">
            <input type="checkbox" checked={usageBillingEnabled} onChange={(event) => setUsageBillingEnabled(event.target.checked)} />
            Usage billing
          </label>
          <label className="flex items-center gap-[0.417vw] max-lg:gap-[2vw]">
            <input type="checkbox" checked={autoRefillEnabled} onChange={(event) => setAutoRefillEnabled(event.target.checked)} />
            Auto refill
          </label>
        </div>
        <Button type="submit" disabled={isSaving} className="h-[2.292vw] px-[1.042vw] text-[clamp(13px,0.78vw,15px)] font-semibold max-lg:h-[10vw] max-lg:px-[5vw] max-lg:text-[3.3vw]">
          <Save className="h-[0.833vw] w-[0.833vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
          Save billing
        </Button>
      </div>
    </form>
  );
}

function UsageControls({
  view,
  isSaving,
  onSubmit,
  onResetMapping,
}: {
  view: ShopifyControlCenterView;
  isSaving: boolean;
  onSubmit: (payload: ShopifyUsageLimitsPayload) => Promise<void>;
  onResetMapping: () => Promise<void>;
}) {
  const [remaining, setRemaining] = useState(String(view.usageFormDefaults.tryOnsRemaining));
  const [used, setUsed] = useState(String(view.usageFormDefaults.tryOnsUsed));
  const [grant, setGrant] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit({
      tryOnsRemaining: Math.max(0, Math.floor(Number(remaining) || 0)),
      tryOnsUsed: Math.max(0, Math.floor(Number(used) || 0)),
      grantTryOns: grant.trim() ? Math.max(0, Math.floor(Number(grant) || 0)) : undefined,
      reason,
    });
  };

  return (
    <div className="grid grid-cols-[1fr_0.8fr] gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
      <form onSubmit={handleSubmit} className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
        <h3 className="text-[clamp(17px,1.05vw,21px)] font-semibold text-text-primary max-lg:text-[4.4vw]">Try-on usage</h3>
        <p className="mt-[0.208vw] text-[clamp(12px,0.72vw,14px)] text-text-body max-lg:text-[3vw]">Set exact counters or grant extra support credits.</p>

        <div className="mt-[1.042vw] grid grid-cols-2 gap-[0.833vw] max-lg:mt-[4vw] max-lg:grid-cols-1 max-lg:gap-[3vw]">
          <div>
            <Label htmlFor="shopify-remaining" className="text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:text-[3vw]">Remaining</Label>
            <Input id="shopify-remaining" type="number" min={0} value={remaining} onChange={(event) => setRemaining(event.target.value)} className="mt-[0.313vw] h-[2.5vw] rounded-[0.833vw] max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]" />
          </div>
          <div>
            <Label htmlFor="shopify-used" className="text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:text-[3vw]">Used</Label>
            <Input id="shopify-used" type="number" min={0} value={used} onChange={(event) => setUsed(event.target.value)} className="mt-[0.313vw] h-[2.5vw] rounded-[0.833vw] max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]" />
          </div>
          <div>
            <Label htmlFor="shopify-grant" className="text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:text-[3vw]">Grant extra</Label>
            <Input id="shopify-grant" type="number" min={0} value={grant} onChange={(event) => setGrant(event.target.value)} placeholder="Optional" className="mt-[0.313vw] h-[2.5vw] rounded-[0.833vw] max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]" />
          </div>
          <div>
            <Label htmlFor="shopify-usage-reason" className="text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:text-[3vw]">Reason</Label>
            <Input id="shopify-usage-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Credit, correction, support" className="mt-[0.313vw] h-[2.5vw] rounded-[0.833vw] max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]" />
          </div>
        </div>

        <div className="mt-[0.833vw] flex justify-end max-lg:mt-[4vw]">
          <Button type="submit" disabled={isSaving} className="h-[2.292vw] px-[1.042vw] text-[clamp(13px,0.78vw,15px)] font-semibold max-lg:h-[10vw] max-lg:px-[5vw] max-lg:text-[3.3vw]">
            <Save className="h-[0.833vw] w-[0.833vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
            Save usage
          </Button>
        </div>
      </form>

      <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
        <h3 className="text-[clamp(17px,1.05vw,21px)] font-semibold text-text-primary max-lg:text-[4.4vw]">Operations</h3>
        <p className="mt-[0.208vw] text-[clamp(12px,0.72vw,14px)] text-text-body max-lg:text-[3vw]">{view.profile.helper}</p>
        <div className="mt-[1.042vw] grid gap-[0.625vw] max-lg:mt-[4vw] max-lg:gap-[2.5vw]">
          <Button type="button" variant="ghost" disabled={isSaving} onClick={() => void onResetMapping()} className="h-[2.292vw] justify-start rounded-full text-[clamp(13px,0.78vw,15px)] max-lg:h-[10vw] max-lg:text-[3.3vw]">
            <RotateCcw className="h-[0.833vw] w-[0.833vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
            Reset size mapping
          </Button>
        </div>
      </section>
    </div>
  );
}

function BillingAutomationControls({
  view,
  isSaving,
  onSubmit,
}: {
  view: ShopifyControlCenterView;
  isSaving: boolean;
  onSubmit: (payload: ShopifyBillingAutomationTestPayload) => Promise<void>;
}) {
  const [reason, setReason] = useState("Admin automation test");
  const [selectedAction, setSelectedAction] = useState<ShopifyBillingAutomationTestPayload["action"]>("usage_50");
  const actions: Array<{ label: string; helper: string; action: ShopifyBillingAutomationTestPayload["action"] }> = [
    { label: "Set usage to 50%", helper: "Sends the 50% usage email if it has not been sent.", action: "usage_50" },
    { label: "Set usage to 80%", helper: "Sends the 80% usage email if it has not been sent.", action: "usage_80" },
    { label: "Send trial ending soon", helper: "Sets the trial end date into the warning window and sends the reminder email.", action: "trial_ending_soon" },
    { label: "Expire trial", helper: "Ends the free trial and sends the trial-ended email.", action: "expire_trial" },
    { label: "Reset emails", helper: "Clears sent timestamps so alerts can be tested again.", action: "reset_emails" },
    { label: "Restart trial", helper: "Restarts the visible test trial with 20 try-ons.", action: "restart_trial" },
  ];
  const selectedAutomation = actions.find((item) => item.action === selectedAction) ?? actions[0];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit({ action: selectedAction, reason });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <div className="flex flex-wrap items-start justify-between gap-[1vw] max-lg:gap-[3vw]">
        <div>
          <h3 className="text-[clamp(17px,1.05vw,21px)] font-semibold text-text-primary max-lg:text-[4.4vw]">Email automation test lab</h3>
          <p className="mt-[0.208vw] text-[clamp(12px,0.72vw,14px)] text-text-body max-lg:text-[3vw]">Choose a test state, then save.</p>
        </div>
        <span className={`rounded-full px-[0.729vw] py-[0.313vw] text-[clamp(11px,0.68vw,13px)] font-semibold max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[2.8vw] ${view.trial.canUseStorefront ? "bg-customer-success-bg text-customer-success-text" : "bg-customer-danger-bg text-customer-danger-text"}`}>
          {view.trial.statusLabel}
        </span>
      </div>

      <div className="mt-[1.042vw] grid grid-cols-3 gap-[0.833vw] max-lg:mt-[4vw] max-lg:grid-cols-1 max-lg:gap-[3vw]">
        <div>
          <Label htmlFor="shopify-automation-reason" className="text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:text-[3vw]">Reason</Label>
          <Input id="shopify-automation-reason" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-[0.313vw] h-[2.5vw] rounded-[0.833vw] max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]" />
        </div>
        <SmallRows
          rows={[
            { label: "Trial started", value: view.trial.startedAtLabel },
            { label: "Trial ends", value: view.trial.endsAtLabel },
            { label: "Trial warning", value: view.trial.endingSoonEmailLabel },
            { label: "Trial email", value: view.trial.expiredEmailLabel },
          ]}
        />
        <div className="grid gap-[0.521vw] max-lg:gap-[2vw]">
          <div>
            <Label htmlFor="shopify-automation-action" className="text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:text-[3vw]">Automation</Label>
            <select
              id="shopify-automation-action"
              value={selectedAction}
              onChange={(event) => setSelectedAction(event.target.value as ShopifyBillingAutomationTestPayload["action"])}
              className="mt-[0.313vw] h-[2.5vw] w-full rounded-[0.833vw] border border-customer-border bg-customer-card px-3 text-sm text-text-primary outline-none focus:border-transparent focus:ring-2 focus:ring-brand-blue max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]"
            >
              {actions.map((item) => (
                <option key={item.action} value={item.action}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="mt-[0.313vw] text-[clamp(11px,0.68vw,13px)] text-text-body max-lg:mt-[1vw] max-lg:text-[2.8vw]">
              {selectedAutomation.helper}
            </p>
          </div>
          <Button
            type="submit"
            variant={selectedAction === "expire_trial" ? "outline-dark" : "primary"}
            disabled={isSaving}
            className="h-[2.292vw] justify-center rounded-[0.833vw] px-[0.833vw] text-[clamp(13px,0.78vw,15px)] font-semibold max-lg:h-[10vw] max-lg:rounded-[4vw] max-lg:px-[4vw] max-lg:text-[3.3vw]"
          >
            <Save className="h-[0.833vw] w-[0.833vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}

function StoreAccessControls({
  view,
  isSaving,
  onSetStatus,
}: {
  view: ShopifyControlCenterView;
  isSaving: boolean;
  onSetStatus: (status: "active" | "suspended") => Promise<void>;
}) {
  const isActive = view.status === "active";

  return (
    <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <div className="flex flex-wrap items-center justify-between gap-[1vw] max-lg:gap-[3vw]">
        <div>
          <h3 className="text-[clamp(17px,1.05vw,21px)] font-semibold text-text-primary max-lg:text-[4.4vw]">Store access</h3>
          <p className="mt-[0.208vw] text-[clamp(12px,0.72vw,14px)] text-text-body max-lg:text-[3vw]">Control whether this Shopify merchant can use PrimeStyleAI storefront services.</p>
        </div>
        <span className={`rounded-full px-[0.729vw] py-[0.313vw] text-[clamp(11px,0.68vw,13px)] font-semibold max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[2.8vw] ${isActive ? "bg-customer-success-bg text-customer-success-text" : "bg-customer-warning-bg text-customer-warning-text"}`}>
          {view.statusLabel}
        </span>
      </div>

      <div className="mt-[1.042vw] flex flex-wrap gap-[0.625vw] max-lg:mt-[4vw] max-lg:gap-[2vw]">
        <Button
          type="button"
          disabled={isSaving || isActive}
          onClick={() => void onSetStatus("active")}
          className="h-[2.292vw] px-[1.042vw] text-[clamp(13px,0.78vw,15px)] font-semibold max-lg:h-[10vw] max-lg:px-[5vw] max-lg:text-[3.3vw]"
        >
          <Power className="h-[0.833vw] w-[0.833vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
          Activate store
        </Button>
        <Button
          type="button"
          variant="outline-dark"
          disabled={isSaving || !isActive}
          onClick={() => void onSetStatus("suspended")}
          className="h-[2.292vw] px-[1.042vw] text-[clamp(13px,0.78vw,15px)] font-semibold max-lg:h-[10vw] max-lg:px-[5vw] max-lg:text-[3.3vw]"
        >
          <Power className="h-[0.833vw] w-[0.833vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
          Suspend store
        </Button>
      </div>
    </section>
  );
}

function StyleMatchControls({
  view,
  isSaving,
  onUpdateStyleMatch,
}: {
  view: ShopifyControlCenterView;
  isSaving: boolean;
  onUpdateStyleMatch: (enabled: boolean) => Promise<void>;
}) {
  return (
    <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <div className="flex flex-wrap items-center justify-between gap-[1vw] max-lg:gap-[3vw]">
        <div>
          <h3 className="text-[clamp(17px,1.05vw,21px)] font-semibold text-text-primary max-lg:text-[4.4vw]">Style RAG</h3>
          <p className="mt-[0.208vw] text-[clamp(12px,0.72vw,14px)] text-text-body max-lg:text-[3vw]">
            {view.styleMatch.helper}
          </p>
        </div>
        <span className={`rounded-full px-[0.729vw] py-[0.313vw] text-[clamp(11px,0.68vw,13px)] font-semibold max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[2.8vw] ${view.styleMatch.enabled ? "bg-customer-success-bg text-customer-success-text" : "bg-customer-soft text-customer-muted"}`}>
          {view.styleMatch.enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <div className="mt-[1.042vw] flex flex-wrap gap-[0.625vw] max-lg:mt-[4vw] max-lg:gap-[2vw]">
        <Button
          type="button"
          disabled={isSaving || !view.styleMatch.canUpdate}
          variant={view.styleMatch.enabled ? "outline-dark" : "primary"}
          onClick={() => void onUpdateStyleMatch(!view.styleMatch.enabled)}
          className="h-[2.292vw] px-[1.042vw] text-[clamp(13px,0.78vw,15px)] font-semibold max-lg:h-[10vw] max-lg:px-[5vw] max-lg:text-[3.3vw]"
        >
          <Power className="h-[0.833vw] w-[0.833vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
          {view.styleMatch.enabled ? "Disable RAG" : "Enable RAG"}
        </Button>
      </div>
    </section>
  );
}

function AnalyticsPanel({ view, initialDateRange }: { view: ShopifyControlCenterView; initialDateRange: { from: string; to: string } }) {
  const [sessions, tryOns, completion, sizeAcceptance] = view.analytics.behaviorCards;
  const [paidRevenue, tryOnRevenue, conversion, refundRate] = view.analytics.revenueCards;

  return (
    <section className="space-y-[1.042vw] rounded-[1.563vw] bg-customer-soft p-[1.042vw] max-lg:space-y-[4vw] max-lg:rounded-[6vw] max-lg:p-[3vw]">
      <div className="flex items-center justify-between gap-[1vw] max-lg:flex-col max-lg:items-stretch max-lg:gap-[4vw]">
        <div>
          <p className="text-[clamp(13px,0.78vw,15px)] font-semibold uppercase tracking-[0.16em] text-brand-blue max-lg:text-[3vw]">Shopify customer analytics</p>
          <h2 className="mt-[0.208vw] text-[clamp(24px,1.55vw,32px)] font-semibold text-text-primary max-lg:text-[6vw]">{view.storeName}</h2>
        </div>
        <DateRangeControls initialDateRange={initialDateRange} />
      </div>

      <div className="grid grid-cols-[1.5fr_0.75fr] gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
        <section className="rounded-[1.042vw] bg-customer-card p-[1.042vw] shadow-customer-card max-lg:rounded-[5vw] max-lg:p-[4vw]">
          <div className="flex items-start justify-between gap-[1vw] max-lg:gap-[4vw]">
            <CustomerMetricBlock card={tryOns ?? { label: "Try-ons", value: "0", helper: "0 started" }} />
            <span className="rounded-full bg-customer-soft px-[0.833vw] py-[0.365vw] text-[clamp(11px,0.68vw,13px)] font-medium text-customer-muted max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[3vw]">Last {view.analytics.rangeLabel}</span>
          </div>
          <div className="mt-[1.146vw] grid grid-cols-[minmax(0,1fr)_minmax(10.5rem,12vw)] gap-[1vw] max-lg:mt-[4vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
            <div className="h-[13.5vw] max-lg:h-[58vw]">
              <TryOnAreaChart data={view.analytics.dailyActivity} />
            </div>
            <CustomerCalendarSummary view={view} />
          </div>
        </section>

        <section className="rounded-[1.042vw] bg-customer-card p-[1.042vw] shadow-customer-card max-lg:rounded-[5vw] max-lg:p-[4vw]">
          <div className="flex items-start justify-between gap-[1vw]">
            <CustomerMetricBlock card={paidRevenue ?? { label: "Paid revenue", value: "$0", helper: "0 paid orders" }} />
            <ArrowUpRight className="h-[1.042vw] w-[1.042vw] text-customer-muted max-lg:h-[5vw] max-lg:w-[5vw]" />
          </div>
          <div className="mt-[1.042vw] grid gap-[0.625vw] max-lg:mt-[4vw] max-lg:gap-[3vw]">
            {[tryOnRevenue, conversion, refundRate].filter(Boolean).map((card) => (
              <div key={card!.label} className="rounded-[0.833vw] bg-customer-soft px-[0.833vw] py-[0.625vw] max-lg:rounded-[4vw] max-lg:px-[4vw] max-lg:py-[3vw]">
                <p className="text-[clamp(11px,0.64vw,12px)] text-customer-muted max-lg:text-[2.8vw]">{card!.label}</p>
                <p className="mt-[0.156vw] text-[clamp(16px,1vw,20px)] font-semibold text-text-primary max-lg:text-[4.2vw]">{card!.value}</p>
                <p className="mt-[0.104vw] truncate text-[clamp(11px,0.64vw,12px)] text-text-body max-lg:text-[2.8vw]">{card!.helper}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-[0.75fr_0.75fr_0.75fr] gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
        <RankedRows title="Top products" badge="Try-ons" rows={view.analytics.topProducts} empty="No product try-ons yet." />
        <CustomerDeviceSplit view={view} />
        <CustomerFunnel view={view} />
      </div>

      <div className="grid grid-cols-[0.75fr_1.5fr] gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
        <RankedRows title="Revenue products" badge="Paid" rows={view.analytics.revenueProducts} empty="No attributed product revenue yet." />
        <CustomerCountryMap view={view} />
      </div>

      <div className="grid grid-cols-4 gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
        {[sessions, tryOns, completion, sizeAcceptance].filter(Boolean).map((card) => (
          <article key={card!.label} className="rounded-[1.042vw] bg-customer-card p-[1.042vw] shadow-customer-card max-lg:rounded-[5vw] max-lg:p-[4vw]">
            <div className="flex items-start justify-between gap-[1vw]">
              <CustomerMetricBlock card={card!} />
              <ArrowUpRight className="h-[1.042vw] w-[1.042vw] text-customer-muted max-lg:h-[5vw] max-lg:w-[5vw]" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsPanel({
  view,
  customer,
}: {
  view: ShopifyControlCenterView;
  customer: ReturnType<typeof useShopifyCustomerControlCenter>;
}) {
  return (
    <div className="space-y-[1.042vw] max-lg:space-y-[4vw]">
      <MetricGrid cards={view.summaryCards} />

      <div className="grid grid-cols-[1fr_0.7fr] gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
        <StoreAccessControls
          view={view}
          isSaving={customer.isSaving}
          onSetStatus={customer.setStatus}
        />
        <StyleMatchControls
          view={view}
          isSaving={customer.isSaving}
          onUpdateStyleMatch={customer.updateStyleMatch}
        />
      </div>

      <SmallRows
        rows={[
          { label: "Plan", value: view.planLabel, helper: "Current billing plan" },
          { label: "Subscription", value: view.subscriptionLabel },
          { label: "Due date", value: view.currentPeriodEndLabel },
          { label: "Size profile", value: view.profile.label, helper: view.profile.helper },
        ]}
      />

      <MetricGrid cards={view.billingCards} />
      <BillingOverrideForm
        key={`${view.billingFormDefaults.plan}-${view.billingFormDefaults.selectedProductCount}-${view.billingFormDefaults.requestedTryOns}-${view.billingFormDefaults.currentPeriodEnd}-${view.billingFormDefaults.scheduledEffectiveAt}`}
        view={view}
        isSaving={customer.isSaving}
        onSubmit={customer.updateBilling}
      />

      <MetricGrid cards={view.usageCards} />
      <MetricGrid cards={view.trialCards} />
      <BillingAutomationControls
        view={view}
        isSaving={customer.isSaving}
        onSubmit={customer.runAutomationTest}
      />
      <UsageControls
        key={`${view.usageFormDefaults.tryOnsRemaining}-${view.usageFormDefaults.tryOnsUsed}`}
        view={view}
        isSaving={customer.isSaving}
        onSubmit={customer.updateUsage}
        onResetMapping={customer.resetSizeGuideMapping}
      />

      <section className="space-y-[0.625vw] max-lg:space-y-[3vw]">
        <h3 className="text-[clamp(17px,1.05vw,21px)] font-semibold text-text-primary max-lg:text-[4.4vw]">Technical details</h3>
        <SmallRows rows={view.technicalRows} />
      </section>
    </div>
  );
}

export function ShopifyCustomerControlCenterPage({
  initialView,
  initialControlCenter,
  initialBehavior,
  initialRevenue,
  initialDateRange,
}: ShopifyCustomerControlCenterPageProps) {
  const customer = useShopifyCustomerControlCenter(
    initialView,
    initialControlCenter,
    initialBehavior,
    initialRevenue,
  );
  const { view } = customer;

  return (
    <section className="space-y-[1.042vw] max-lg:space-y-[4vw]">
      <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card px-[1.25vw] py-[1.042vw] max-lg:rounded-[5vw] max-lg:px-[4vw] max-lg:py-[4vw]">
        <div className="flex flex-wrap items-start justify-between gap-[1vw] max-lg:gap-[4vw]">
          <div className="flex min-w-0 items-start gap-[0.833vw] max-lg:gap-[3vw]">
            <Button asChild variant="ghost" size="icon-sm" title="Back to Shopify customers" className="h-[2.083vw] w-[2.083vw] rounded-full max-lg:h-[10vw] max-lg:w-[10vw]">
              <Link href="/admin/customers/shopify">
                <ArrowLeft className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
              </Link>
            </Button>
            <div className="min-w-0">
              <p className="text-[clamp(12px,0.72vw,14px)] font-semibold uppercase tracking-[0.16em] text-brand-blue max-lg:text-[3vw]">Shopify customer</p>
              <h2 className="mt-[0.25vw] truncate text-[clamp(26px,1.65vw,32px)] font-semibold leading-tight text-text-primary max-lg:mt-[1vw] max-lg:text-[6vw]">{view.storeName}</h2>
              <p className="mt-[0.208vw] truncate text-[clamp(13px,0.78vw,15px)] text-text-body max-lg:text-[3.2vw]">{view.websiteDomain} · {view.ownerEmail}</p>
              {view.websiteDomain !== view.shopDomain ? (
                <p className="mt-[0.156vw] truncate text-[clamp(11px,0.68vw,13px)] text-customer-muted max-lg:text-[2.8vw]">Shopify domain: {view.shopDomain}</p>
              ) : null}
            </div>
          </div>
        </div>

        {customer.error || customer.notice ? (
          <div className="mt-[0.833vw] rounded-[0.833vw] border border-customer-border bg-customer-soft px-[0.833vw] py-[0.625vw] text-[clamp(12px,0.72vw,14px)] max-lg:mt-[3vw] max-lg:rounded-[4vw] max-lg:px-[4vw] max-lg:py-[3vw] max-lg:text-[3.2vw]">
            {customer.error ? <p className="font-semibold text-customer-danger-text">{customer.error}</p> : null}
            {customer.notice ? <p className="font-semibold text-brand-blue">{customer.notice}</p> : null}
          </div>
        ) : null}
      </div>

      <Tabs defaultValue="analytics" className="gap-[1.042vw] max-lg:gap-[4vw]">
        <TabsList className="flex-wrap gap-[0.417vw] rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[0.417vw] max-lg:gap-[2vw] max-lg:rounded-[5vw] max-lg:p-[2vw]">
          {[
            { value: "analytics", label: "Analytics" },
            { value: "settings", label: "Settings" },
          ].map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="rounded-full border-0 px-[0.833vw] py-[0.417vw] text-[clamp(12px,0.72vw,14px)] data-[state=active]:bg-brand-blue data-[state=active]:text-white max-lg:px-[3vw] max-lg:py-[2vw] max-lg:text-[3.2vw]">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="analytics">
          <AnalyticsPanel view={view} initialDateRange={initialDateRange} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsPanel view={view} customer={customer} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

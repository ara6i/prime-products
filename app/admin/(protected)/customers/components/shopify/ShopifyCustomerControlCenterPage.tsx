"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RotateCcw,
  Save,
} from "lucide-react";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/shared/components/ui";
import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
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

function BillingOverrideForm({
  view,
  isSaving,
  onSubmit,
}: {
  view: ShopifyControlCenterView;
  isSaving: boolean;
  onSubmit: (payload: ShopifyBillingOverridePayload) => Promise<void>;
}) {
  const [plan, setPlan] = useState(view.billingFormDefaults.plan);
  const [productCount, setProductCount] = useState(String(view.billingFormDefaults.selectedProductCount));
  const [tryOns, setTryOns] = useState(String(view.billingFormDefaults.requestedTryOns));
  const [effectiveMode, setEffectiveMode] = useState<"current" | "next_cycle">("current");
  const [scheduledEffectiveAt, setScheduledEffectiveAt] = useState(view.billingFormDefaults.scheduledEffectiveAt);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(view.billingFormDefaults.currentPeriodEnd);
  const [usageBillingEnabled, setUsageBillingEnabled] = useState(view.billingFormDefaults.billingUsageEnabled);
  const [autoRefillEnabled, setAutoRefillEnabled] = useState(view.billingFormDefaults.billingAutoRefillEnabled);
  const [reason, setReason] = useState("");
  const knownPlans = ["custom", "pilot", "free", "starter", "growth", "pro", "scale", "cancelled"];
  const planOptions = knownPlans.includes(plan) ? knownPlans : [plan, ...knownPlans];

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
            className="mt-[0.313vw] h-[2.5vw] w-full rounded-[0.833vw] border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-brand-blue max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]"
          >
            {planOptions.map((option) => (
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
        <span className={`rounded-full px-[0.729vw] py-[0.313vw] text-[clamp(11px,0.68vw,13px)] font-semibold max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[2.8vw] ${view.trial.canUseStorefront ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
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
              className="mt-[0.313vw] h-[2.5vw] w-full rounded-[0.833vw] border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-brand-blue max-lg:mt-[1vw] max-lg:h-[10vw] max-lg:rounded-[4vw]"
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

function AnalyticsPanel({ view }: { view: ShopifyControlCenterView }) {
  return (
    <div className="space-y-[1.042vw] max-lg:space-y-[4vw]">
      <MetricGrid cards={view.analytics.behaviorCards} />
      <MetricGrid cards={view.analytics.revenueCards} />
      <div className="grid grid-cols-3 gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
        <SmallRows rows={view.analytics.funnel.map((item) => ({ label: item.label, value: item.value }))} />
        <SmallRows rows={view.analytics.topProducts.map((item) => ({ label: item.label, value: item.value, helper: item.helper }))} />
        <SmallRows rows={view.analytics.topRevenueProducts.map((item) => ({ label: item.label, value: item.value, helper: item.helper }))} />
      </div>
    </div>
  );
}

export function ShopifyCustomerControlCenterPage({
  initialView,
  initialControlCenter,
  initialBehavior,
  initialRevenue,
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
              <p className="mt-[0.208vw] truncate text-[clamp(13px,0.78vw,15px)] text-text-body max-lg:text-[3.2vw]">{view.shopDomain} · {view.ownerEmail}</p>
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

      <MetricGrid cards={view.summaryCards} />

      <Tabs defaultValue="overview" className="gap-[1.042vw] max-lg:gap-[4vw]">
        <TabsList className="flex-wrap gap-[0.417vw] rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[0.417vw] max-lg:gap-[2vw] max-lg:rounded-[5vw] max-lg:p-[2vw]">
          {["overview", "billing", "usage", "analytics"].map((tab) => (
            <TabsTrigger key={tab} value={tab} className="rounded-full border-0 px-[0.833vw] py-[0.417vw] text-[clamp(12px,0.72vw,14px)] capitalize data-[state=active]:bg-brand-blue data-[state=active]:text-white max-lg:px-[3vw] max-lg:py-[2vw] max-lg:text-[3.2vw]">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-[1.042vw] max-lg:space-y-[4vw]">
          <div className="grid grid-cols-[1fr_0.8fr] gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
            <MetricGrid cards={view.billingCards.slice(0, 4)} />
            <SmallRows
              rows={[
                { label: "Plan", value: view.planLabel, helper: "Current billing plan" },
                { label: "Due date", value: view.currentPeriodEndLabel },
                { label: "Size profile", value: view.profile.label, helper: view.profile.helper },
              ]}
            />
          </div>
          <SmallRows rows={view.technicalRows} />
        </TabsContent>

        <TabsContent value="billing" className="space-y-[1.042vw] max-lg:space-y-[4vw]">
          <MetricGrid cards={view.billingCards} />
          <BillingOverrideForm
            key={`${view.billingFormDefaults.plan}-${view.billingFormDefaults.selectedProductCount}-${view.billingFormDefaults.requestedTryOns}-${view.billingFormDefaults.currentPeriodEnd}-${view.billingFormDefaults.scheduledEffectiveAt}`}
            view={view}
            isSaving={customer.isSaving}
            onSubmit={customer.updateBilling}
          />
        </TabsContent>

        <TabsContent value="usage" className="space-y-[1.042vw] max-lg:space-y-[4vw]">
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
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsPanel view={view} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleIcon,
  Globe2Icon,
  Loader2Icon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import { cn } from "@/app/shared/lib/utils";
import type { useCustomerProductAutoDetectRequest } from "../../hooks/useCustomerProductAutoDetectRequest";
import { normalizeCustomerAutoDetectWebsiteUrl } from "../../mappers/productAutoDetectMapper";
import type {
  CustomerProductAutoDetectActivity,
  CustomerProductAutoDetectCategory,
} from "../../types/products";

interface ProductAutoDetectPanelProps {
  autoDetect: ReturnType<typeof useCustomerProductAutoDetectRequest>;
}

type VisibleStage = "website" | "categories" | "preparing";

const WIZARD_STEPS = [
  { id: "website", label: "Website", detail: "Confirm access" },
  { id: "prepare", label: "Prepare", detail: "Find catalog areas" },
  { id: "categories", label: "Categories", detail: "Choose product areas" },
] as const;

function sourceWebsiteGroup(category: CustomerProductAutoDetectCategory): string | null {
  const parts = String(category.sourceLabel ?? "")
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2];
  return null;
}

function activityLabel(activity: CustomerProductAutoDetectActivity) {
  if (activity.type === "category_found") return "Category found";
  if (activity.type === "route_found") return "Route checked";
  if (activity.type === "product_found") return "Product found";
  if (activity.type === "warning") return "Needs review";
  if (activity.type === "settings_saved") return "Choices saved";
  return activity.message;
}

export function ProductAutoDetectPanel({ autoDetect }: ProductAutoDetectPanelProps) {
  const [showAdvancedCategories, setShowAdvancedCategories] = useState(true);
  const [isStartingProducts, setIsStartingProducts] = useState(false);
  const websiteError = autoDetect.touched.websiteUrl ? (autoDetect.errors.websiteUrl ?? "") : "";
  const authorizationError = autoDetect.touched.authorized ? (autoDetect.errors.authorized ?? "") : "";
  const isPreparing = autoDetect.status === "preflight_running";
  const selectedCategories = autoDetect.categories.filter((category) => category.selected);
  const hasCategories = autoDetect.categories.length > 0;
  const visibleStage: VisibleStage = isPreparing ? "preparing" : hasCategories ? "categories" : "website";
  const activeStepIndex = visibleStage === "website" ? 0 : visibleStage === "preparing" ? 1 : 2;
  const visibleAdvancedCategories = showAdvancedCategories ? autoDetect.categories : autoDetect.categories.slice(0, 8);

  function updateCategory(categoryId: string, patch: Partial<Pick<CustomerProductAutoDetectCategory, "selected" | "mappedCategory">>) {
    autoDetect.updateCategory(categoryId, patch);
  }

  async function checkWebsite() {
    const started = await autoDetect.startPreflight();
    if (started) {
      setShowAdvancedCategories(true);
    }
  }

  async function findProducts() {
    if (selectedCategories.length === 0) return;
    setIsStartingProducts(true);
    const saved = await autoDetect.saveSettings();
    if (saved) {
      await autoDetect.startImport();
    }
    setIsStartingProducts(false);
  }

  function startOver() {
    setShowAdvancedCategories(true);
    autoDetect.resetDetection();
  }

  return (
    <section className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-customer-card text-text-primary">
      <header
        className={cn(
          "border-b border-customer-border bg-gradient-to-br from-white via-customer-blue/45 to-customer-card px-5 dark:from-slate-950 dark:via-blue-950/30 dark:to-slate-950 max-lg:px-4",
          visibleStage === "categories" ? "py-3" : "py-4 max-lg:py-3",
        )}
      >
        {visibleStage !== "categories" ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-white px-3 py-1 text-xs font-semibold text-brand-blue shadow-sm dark:bg-slate-900">
                <SparklesIcon className="h-3.5 w-3.5" aria-hidden />
                Auto Detect
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-text-primary">Build your product list</h3>
              <p className="mt-1 text-sm text-customer-muted">One step at a time. Nothing goes live before review.</p>
            </div>
            <StatusBadge status={autoDetect.status} />
          </div>
        ) : null}

        <div className={cn("grid grid-cols-3 gap-1.5 rounded-2xl border border-customer-border bg-customer-card/75 p-1.5", visibleStage === "categories" ? "mt-0" : "mt-3")}>
          {WIZARD_STEPS.map((step, index) => (
            <StepCard
              key={step.id}
              index={index + 1}
              label={step.label}
              status={index < activeStepIndex ? "complete" : index === activeStepIndex ? "active" : "queued"}
            />
          ))}
        </div>
      </header>

      <div className="min-h-0 overflow-y-auto px-5 py-4 max-lg:px-4">
        {visibleStage === "website" ? (
          <WebsiteStep
            websiteUrl={autoDetect.values.websiteUrl}
            authorized={autoDetect.values.authorized}
            websiteError={websiteError}
            authorizationError={authorizationError}
            disabled={isPreparing}
            onWebsiteBlur={() => {
              autoDetect.setWebsiteUrl(normalizeCustomerAutoDetectWebsiteUrl(autoDetect.values.websiteUrl));
              autoDetect.markTouched("websiteUrl");
            }}
            onAuthorizedBlur={() => autoDetect.markTouched("authorized")}
            onWebsiteChange={autoDetect.setWebsiteUrl}
            onAuthorizedChange={autoDetect.setAuthorized}
          />
        ) : null}

        {visibleStage === "preparing" ? (
          <PrepareStep activity={autoDetect.activity} />
        ) : null}

        {visibleStage === "categories" ? (
          <CategoryStep
            visibleCategories={visibleAdvancedCategories}
            showAdvanced={showAdvancedCategories}
            onToggleAdvanced={() => setShowAdvancedCategories((value) => !value)}
            onUpdateCategory={updateCategory}
          />
        ) : null}

        {autoDetect.errorMessage ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-customer-danger-text/20 bg-customer-danger-bg px-4 py-3 text-sm font-semibold text-customer-danger-text">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {autoDetect.errorMessage}
          </div>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-customer-border bg-customer-card px-5 pb-5 pt-3 max-lg:px-4 max-lg:pb-6">
        {visibleStage === "preparing" ? (
          <div className="text-sm text-customer-muted">Preparing catalog areas...</div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {visibleStage === "website" ? (
            <Button type="button" onClick={checkWebsite} disabled={isPreparing} className="h-10 px-4 text-sm !text-white">
              {isPreparing ? "Checking..." : "Check website"}
            </Button>
          ) : null}

          {visibleStage === "preparing" ? (
            <Button type="button" disabled className="h-10 px-4 text-sm disabled:!text-customer-muted">
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Checking website
            </Button>
          ) : null}

          {visibleStage === "categories" ? (
            <>
              <Button type="button" variant="outline" onClick={startOver} className="h-10 px-4 text-sm">
                Start over
              </Button>
              <Button
                type="button"
                onClick={findProducts}
                disabled={isStartingProducts || selectedCategories.length === 0}
                className="h-10 px-4 text-sm !text-white disabled:!text-customer-muted"
              >
                {isStartingProducts ? "Starting..." : "Find products"}
              </Button>
            </>
          ) : null}
        </div>
      </footer>
    </section>
  );
}

function WebsiteStep({
  websiteUrl,
  authorized,
  websiteError,
  authorizationError,
  disabled,
  onWebsiteBlur,
  onAuthorizedBlur,
  onWebsiteChange,
  onAuthorizedChange,
}: {
  websiteUrl: string;
  authorized: boolean;
  websiteError: string;
  authorizationError: string;
  disabled: boolean;
  onWebsiteBlur: () => void;
  onAuthorizedBlur: () => void;
  onWebsiteChange: (value: string) => void;
  onAuthorizedChange: (value: boolean) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="rounded-2xl border border-customer-border bg-customer-soft p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue text-white">
            <Globe2Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-text-primary">Website</p>
            <p className="text-sm text-customer-muted">Use the verified domain, or test another public URL locally.</p>
          </div>
        </div>

        <input
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          value={websiteUrl}
          onBlur={onWebsiteBlur}
          onChange={(event) => onWebsiteChange(event.target.value)}
          placeholder="gaala.com"
          disabled={disabled}
          className="h-12 w-full rounded-2xl border border-customer-border bg-customer-card px-4 text-sm font-semibold text-text-primary outline-none transition-colors placeholder:text-customer-muted focus:border-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
        />
        {websiteError ? <p className="mt-2 text-xs font-semibold text-customer-danger-text">{websiteError}</p> : null}

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-customer-border bg-customer-card p-4 transition-colors hover:border-brand-blue/40">
          <input
            type="checkbox"
            checked={authorized}
            onBlur={onAuthorizedBlur}
            onChange={(event) => onAuthorizedChange(event.target.checked)}
            disabled={disabled}
            className="mt-1 h-4 w-4 shrink-0 accent-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <ShieldCheckIcon className="h-4 w-4 text-brand-blue" aria-hidden />
              I own or manage this website.
            </span>
            <span className="mt-1 block text-xs leading-5 text-customer-muted">
              PrimeStyleAI only reads public catalog data. Private stock needs visible site data or a later upload.
            </span>
            {authorizationError ? (
              <span className="mt-2 block text-xs font-semibold text-customer-danger-text">{authorizationError}</span>
            ) : null}
          </span>
        </label>
      </div>

      <div className="rounded-2xl border border-customer-border bg-customer-card p-5">
        <p className="text-sm font-semibold text-text-primary">What happens next</p>
        <div className="mt-4 grid gap-3">
          <SideStep number="1" title="Find catalog areas" detail="Categories, collections, and product-list pages." />
          <SideStep number="2" title="You choose" detail="Keep the original website categories or map them." />
          <SideStep number="3" title="Review products" detail="Products appear one by one before activation." />
        </div>
      </div>
    </div>
  );
}

function PrepareStep({ activity }: { activity: CustomerProductAutoDetectActivity[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="rounded-2xl border border-customer-border bg-customer-soft p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-white">
            <Loader2Icon className="h-6 w-6 animate-spin" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-semibold text-text-primary">Preparing catalog areas</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-customer-muted">
              This step only finds product areas. Product details, variants, inventory, and public size guides are collected after you choose categories.
            </p>
          </div>
        </div>

        <ActivityList activity={activity} />
      </div>

      <div className="rounded-2xl border border-customer-border bg-customer-card p-5">
        <p className="text-sm font-semibold text-text-primary">Current step</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-brand-blue">2 / 3</p>
        <p className="mt-2 text-sm leading-6 text-customer-muted">Finding the category structure first keeps product review cleaner.</p>
      </div>
    </div>
  );
}

function CategoryStep({
  visibleCategories,
  showAdvanced,
  onToggleAdvanced,
  onUpdateCategory,
}: {
  visibleCategories: CustomerProductAutoDetectCategory[];
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onUpdateCategory: (categoryId: string, patch: Partial<Pick<CustomerProductAutoDetectCategory, "selected">>) => void;
}) {
  return (
    <div className="grid gap-4">
      <button
        type="button"
        onClick={onToggleAdvanced}
        className="flex w-full items-center justify-between rounded-2xl border border-customer-border bg-customer-soft px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-brand-blue/40"
      >
        Review and map categories
        {showAdvanced ? <ChevronUpIcon className="h-4 w-4" aria-hidden /> : <ChevronDownIcon className="h-4 w-4" aria-hidden />}
      </button>

      <div className={cn("grid overflow-hidden pb-3 transition-[max-height,opacity] duration-200", showAdvanced ? "max-h-[calc(88dvh-19rem)] opacity-100 max-lg:max-h-[calc(90dvh-21rem)]" : "max-h-0 opacity-0")}>
        <div className="min-h-0 overflow-y-auto rounded-2xl border border-customer-border">
          {visibleCategories.map((category) => {
            const websiteGroup = sourceWebsiteGroup(category);
            return (
              <div
                key={category.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-customer-border bg-customer-soft px-4 py-3 last:border-b-0 max-md:grid-cols-[auto_minmax(0,1fr)]"
              >
                <input
                  type="checkbox"
                  checked={category.selected}
                  onChange={(event) => onUpdateCategory(category.id, { selected: event.target.checked })}
                  className="h-4 w-4 accent-brand-blue"
                />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-semibold text-text-primary">{category.sourceLabel || "Untitled category"}</p>
                    {websiteGroup ? (
                      <span className="shrink-0 rounded-full bg-customer-card px-2 py-0.5 text-[0.68rem] font-semibold text-brand-blue">
                        {websiteGroup}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-customer-muted">{category.sourcePath || category.sourceUrl}</p>
                </div>
                <span className="rounded-full bg-customer-card px-3 py-1 text-xs font-semibold text-customer-muted max-md:col-span-2 max-md:w-fit">
                  {category.selected ? "Included" : "Skipped"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReturnType<typeof useCustomerProductAutoDetectRequest>["status"] }) {
  const copy = {
    idle: "Ready",
    preflight_running: "Checking",
    settings_required: "Needs choices",
    settings_ready: "Ready",
    import_running: "Finding products",
    ready: "Complete",
    failed: "Error",
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        status === "failed"
          ? "bg-customer-danger-bg text-customer-danger-text"
          : status === "ready"
            ? "bg-customer-success-bg text-customer-success-text"
            : "bg-customer-blue text-brand-blue",
      )}
    >
      {status === "preflight_running" || status === "import_running" ? (
        <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : null}
      {copy}
    </span>
  );
}

function StepCard({
  index,
  label,
  status,
}: {
  index: number;
  label: string;
  status: "queued" | "active" | "complete";
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl px-2.5 py-2 transition-colors",
        status === "complete"
          ? "bg-customer-success-bg/60"
          : status === "active"
            ? "bg-customer-blue"
            : "bg-transparent",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold",
            status === "complete"
              ? "bg-customer-success-bg text-customer-success-text"
              : status === "active"
                ? "bg-brand-blue text-white"
                : "bg-customer-card text-customer-muted",
          )}
        >
          {status === "complete" ? <CheckCircle2Icon className="h-3 w-3" aria-hidden /> : index}
        </span>
        <span className="truncate text-xs font-semibold text-text-primary max-sm:hidden">{label}</span>
      </div>
    </div>
  );
}

function SideStep({ number, title, detail }: { number: string; title: string; detail: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-customer-border bg-customer-soft p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-semibold text-white">{number}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-text-primary">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-customer-muted">{detail}</span>
      </span>
    </div>
  );
}

function ActivityList({ activity }: { activity: CustomerProductAutoDetectActivity[] }) {
  const visibleActivity = activity.slice(0, 8);

  return (
    <div className="mt-5 rounded-2xl border border-customer-border bg-customer-card p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-customer-muted">Live activity</p>
        <span className="rounded-full bg-customer-blue px-2 py-1 text-[0.7rem] font-semibold text-brand-blue">Live</span>
      </div>

      {visibleActivity.length > 0 ? (
        <div className="max-h-[17rem] overflow-y-auto pr-1">
          <div className="grid gap-2">
            {visibleActivity.map((item) => (
              <div key={item.id} className="flex gap-2 rounded-xl bg-customer-soft px-3 py-2">
                <CircleIcon
                  className={cn(
                    "mt-1 h-2.5 w-2.5 shrink-0 fill-current",
                    item.level === "error" ? "text-customer-danger-text" : item.level === "warn" ? "text-amber-500" : "text-brand-blue",
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-text-primary">{activityLabel(item)}</p>
                  {item.detail ? <p className="mt-0.5 truncate text-xs text-customer-muted">{item.detail}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          <SkeletonLine />
          <SkeletonLine short />
          <SkeletonLine />
        </div>
      )}
    </div>
  );
}

function SkeletonLine({ short = false }: { short?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-customer-soft px-3 py-3">
      <span className="h-2.5 w-2.5 rounded-full bg-brand-blue/30" />
      <span className={cn("h-2 rounded-full bg-customer-border", short ? "w-1/2" : "w-3/4")} />
    </div>
  );
}

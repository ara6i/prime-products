import type {
  AdminCustomerDetailRaw,
  AdminCustomerSource,
  AdminCustomerStoreRaw,
  AdminCustomersResponse,
  CustomerDetailField,
  CustomerDetailSection,
  CustomerDetailView,
  CustomerListItem,
  CustomerStatCard,
  CustomersViewModel,
} from "../types";

const sourceLabels: Record<AdminCustomerSource, string> = {
  sdk: "SDK",
  shopify: "Shopify",
};

function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number") return "Not tracked";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBoolean(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not available";
}

function formatCurrency(value: number | null | undefined, currency = "USD"): string {
  if (typeof value !== "number") return "Not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

function titleCase(value: string | null | undefined): string {
  if (!value) return "Not available";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: string): CustomerListItem["statusTone"] {
  if (status === "active") return "success";
  if (status === "suspended") return "warning";
  if (status === "uninstalled" || status === "archived") return "danger";
  return "default";
}

function sourceTitle(source: AdminCustomerSource): string {
  return source === "shopify" ? "Shopify Customers" : "SDK Customers";
}

function sourceDescription(source: AdminCustomerSource): string {
  return source === "shopify"
    ? "Installed Shopify stores, owner details, plan usage, billing signals, and linked sizing data."
    : "Direct SDK customers, their store profiles, projects, account information, and sizing setup.";
}

function empty(value: string | null | undefined): string {
  return value?.trim() || "Not available";
}

function mapStats(response: AdminCustomersResponse, source: AdminCustomerSource): CustomerStatCard[] {
  const active = response.stores.filter((store) => store.status === "active").length;
  const withProfiles = response.stores.filter((store) => Boolean(store.storeProfileId)).length;
  const tryOnsUsed = response.stores.reduce((sum, store) => sum + (store.tryOnsUsed ?? 0), 0);

  return [
    {
      label: "Total",
      value: formatNumber(response.pagination.total),
      helper: `${sourceLabels[source]} customer records`,
    },
    {
      label: "Active",
      value: formatNumber(active),
      helper: "Shown on this page",
    },
    {
      label: "Store Profiles",
      value: formatNumber(withProfiles),
      helper: "Linked sizing profiles",
    },
    {
      label: "Try-ons Used",
      value: source === "shopify" ? formatNumber(tryOnsUsed) : "SDK",
      helper: source === "shopify" ? "Shown on this page" : "Usage is not tracked here",
    },
  ];
}

export function mapCustomerStore(store: AdminCustomerStoreRaw): CustomerListItem {
  const billing = store as AdminCustomerStoreRaw & {
    billingTotalMonthlyPrice?: number | null;
    billingSelectedProductCount?: number | null;
    billingCurrentPeriodEnd?: string | null;
  };
  const currency = "USD";

  return {
    id: store.id,
    source: store.source,
    sourceLabel: sourceLabels[store.source],
    storeName: empty(store.storeName),
    identifierLabel: empty(store.identifier),
    ownerLabel: empty(store.ownerEmail),
    statusLabel: titleCase(store.status),
    statusTone: statusTone(store.status),
    planLabel: store.plan ? titleCase(store.plan) : "Not tracked",
    monthlySpendLabel:
      store.source === "shopify"
        ? formatCurrency(billing.billingTotalMonthlyPrice, currency)
        : "Not tracked",
    productCountLabel:
      store.source === "shopify"
        ? formatNumber(billing.billingSelectedProductCount)
        : "Not tracked",
    dueDateLabel:
      store.source === "shopify"
        ? formatDate(billing.billingCurrentPeriodEnd)
        : "Not tracked",
    tryOnsLabel:
      store.source === "shopify"
        ? `${formatNumber(store.tryOnsUsed)} used / ${formatNumber(store.tryOnsRemaining)} left`
        : "Not tracked",
    lastUsedLabel: formatDate(store.lastUsedAt),
    installedLabel: formatDate(store.installedAt),
    storeProfileLabel: store.storeProfileId ?? "Not linked",
  };
}

export function mapCustomersPage(
  response: AdminCustomersResponse,
  source: AdminCustomerSource,
): CustomersViewModel {
  return {
    source,
    title: sourceTitle(source),
    eyebrow: "Customers",
    description: sourceDescription(source),
    stats: mapStats(response, source),
    items: response.stores.map(mapCustomerStore),
    pagination: {
      page: response.pagination.page,
      limit: response.pagination.limit,
      totalItems: response.pagination.total,
      totalPages: response.pagination.totalPages,
    },
    hasCustomers: response.stores.length > 0,
  };
}

function field(label: string, value: string | number | boolean | null | undefined): CustomerDetailField {
  return {
    label,
    value: typeof value === "number" ? formatNumber(value) : String(value ?? "Not available"),
  };
}

function compactSection(title: string, fields: CustomerDetailField[]): CustomerDetailSection {
  return {
    title,
    fields: fields.filter((item) => item.value !== "undefined"),
  };
}

function sdkSections(detail: AdminCustomerDetailRaw): CustomerDetailSection[] {
  const user = detail.user;
  const project = detail.project;
  const profile = detail.storeProfile;

  return [
    compactSection("Owner Account", [
      field("Name", user?.name ?? "Not available"),
      field("Email", user?.email ?? detail.store.ownerEmail),
      field("Account status", titleCase(user?.accountStatus)),
      field("Email verified", formatBoolean(user?.isEmailVerified)),
      field("Onboarding completed", formatBoolean(user?.onboardingCompleted)),
      field("Token balance", user?.tokenBalance),
      field("Lifetime tokens purchased", user?.lifetimeTokensPurchased),
      field("Created", formatDate(user?.createdAt)),
      field("Updated", formatDate(user?.updatedAt)),
    ]),
    compactSection("SDK Project", [
      field("Project", project?.name ?? detail.store.identifier),
      field("Description", project?.description || "Not available"),
      field("Project status", titleCase(project?.status)),
      field("Project id", project?._id ?? profile?.projectId),
      field("Created", formatDate(project?.createdAt)),
      field("Updated", formatDate(project?.updatedAt)),
    ]),
    compactSection("Store Profile", [
      field("Store profile id", profile?._id ?? detail.store.storeProfileId),
      field("Store name", profile?.storeName ?? detail.store.storeName),
      field("Profile status", titleCase(profile?.status)),
      field("Source", sourceLabels[detail.source]),
      field("Size charts", detail.stats.chartCount),
      field("Created", formatDate(profile?.createdAt ?? detail.store.installedAt)),
      field("Updated", formatDate(profile?.updatedAt)),
    ]),
    compactSection("Customer Preferences", [
      field("Gender", titleCase(user?.gender)),
      field("Birth year", user?.birthYear),
      field("Birth month", titleCase(user?.birthMonth)),
      field("Height", user?.height ?? "Not available"),
      field("Weight", user?.weight ?? "Not available"),
      field("Body type", titleCase(user?.bodyType)),
      field("Shoe size", user?.shoeSize ?? "Not available"),
      field("Styles", user?.styles?.join(", ") || "Not available"),
      field("Colors", user?.colors?.join(", ") || "Not available"),
      field("Budget", user?.budget),
      field("Email notifications", formatBoolean(user?.emailNotifications)),
      field("AI recommendations", formatBoolean(user?.aiRecommendations)),
      field("Marketing communications", formatBoolean(user?.marketingCommunications)),
    ]),
  ];
}

function shopifySections(detail: AdminCustomerDetailRaw): CustomerDetailSection[] {
  const raw = detail.raw;
  const profile = detail.storeProfile;
  const billingCurrency = raw?.billingCurrency ?? raw?.currency ?? "USD";

  return [
    compactSection("Store", [
      field("Shop name", raw?.shopName ?? detail.store.storeName),
      field("Shop domain", raw?.shopDomain ?? detail.store.identifier),
      field("Owner email", raw?.ownerEmail ?? detail.store.ownerEmail),
      field("Currency", raw?.currency ?? "Not available"),
      field("Timezone", raw?.timezone ?? "Not available"),
      field("Status", titleCase(raw?.status ?? detail.store.status)),
      field("Installed", formatDate(raw?.installedAt ?? detail.store.installedAt)),
      field("Last used", formatDate(raw?.lastUsedAt ?? detail.store.lastUsedAt)),
      field("Uninstalled", formatDate(raw?.uninstalledAt)),
    ]),
    compactSection("Usage", [
      field("Plan", titleCase(raw?.plan ?? detail.store.plan)),
      field("Try-ons used", raw?.tryOnsUsed ?? detail.store.tryOnsUsed),
      field("Try-ons remaining", raw?.tryOnsRemaining ?? detail.store.tryOnsRemaining),
      field("Active size charts", detail.stats.chartCount),
      field("Linked products", detail.stats.linkedProductCount ?? 0),
    ]),
    compactSection("Billing", [
      field("Subscription id", raw?.billingSubscriptionId),
      field("Subscription status", titleCase(raw?.billingSubscriptionStatus)),
      field("Current period end", formatDate(raw?.billingCurrentPeriodEnd)),
      field("Billing currency", billingCurrency),
      field("Test billing", formatBoolean(raw?.billingTest)),
      field("Usage billing enabled", formatBoolean(raw?.billingUsageEnabled)),
      field("Usage price", formatCurrency(raw?.billingUsagePrice, billingCurrency)),
      field("Usage cap", formatCurrency(raw?.billingUsageCap, billingCurrency)),
      field("Selected products", raw?.billingSelectedProductCount),
      field("Platform fee", formatCurrency(raw?.billingPlatformFee, billingCurrency)),
      field("Try-on pack quantity", raw?.billingTryOnPackQuantity),
      field("Try-on pack price", formatCurrency(raw?.billingTryOnPackPrice, billingCurrency)),
      field("Monthly total", formatCurrency(raw?.billingTotalMonthlyPrice, billingCurrency)),
      field("Effective try-on rate", formatCurrency(raw?.billingEffectiveTryOnRate, billingCurrency)),
      field("Effective product rate", formatCurrency(raw?.billingEffectiveProductRate, billingCurrency)),
      field("Auto-refill enabled", formatBoolean(raw?.billingAutoRefillEnabled)),
      field("Auto-refill pack", raw?.billingAutoRefillPackQuantity),
      field("Scheduled products", raw?.billingScheduledProductCount),
      field("Scheduled try-on pack", raw?.billingScheduledTryOnPackQuantity),
      field("Scheduled monthly total", formatCurrency(raw?.billingScheduledTotalMonthlyPrice, billingCurrency)),
      field("Scheduled effective at", formatDate(raw?.billingScheduledEffectiveAt)),
    ]),
    compactSection("Store Profile", [
      field("Store profile id", profile?._id ?? detail.store.storeProfileId),
      field("Profile source", profile?.source ? sourceLabels[profile.source] : sourceLabels[detail.source]),
      field("Profile status", titleCase(profile?.status)),
      field("Profile created", formatDate(profile?.createdAt)),
      field("Profile updated", formatDate(profile?.updatedAt)),
    ]),
  ];
}

export function mapCustomerDetail(detail: AdminCustomerDetailRaw): CustomerDetailView {
  const profile = detail.storeProfile;
  const mappedStore = mapCustomerStore(detail.store);

  return {
    source: detail.source,
    sourceLabel: sourceLabels[detail.source],
    store: mappedStore,
    sections: detail.source === "shopify" ? shopifySections(detail) : sdkSections(detail),
    sizeGuide: profile?.sizeGuideConfig
      ? {
          unitLabel: profile.sizeGuideConfig.unit.toUpperCase(),
          learnedLabel: formatDate(profile.sizeGuideConfig.learnedAt),
          confirmedLabel: formatDate(profile.sizeGuideConfig.confirmedAt),
          originalHeaders: profile.sizeGuideConfig.originalHeaders,
          mappings: profile.sizeGuideConfig.headerMappings,
        }
      : null,
  };
}

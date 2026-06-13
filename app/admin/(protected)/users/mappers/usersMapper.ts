import type {
  AdminProfileUserRaw,
  AdminProfileUsersResponse,
  ProfileUserListItem,
  ProfileUsersViewModel,
} from "../types";

const MEASUREMENT_LABELS: Record<string, string> = {
  chest: "Chest",
  bust: "Bust",
  waist: "Waist",
  hips: "Hips",
  shoulderWidth: "Shoulder",
  sleeveLength: "Sleeve",
  inseam: "Inseam",
  neckCircumference: "Neck",
  thighCircumference: "Thigh",
  wristCircumference: "Wrist",
  footLengthCm: "Foot",
  height: "Height",
};

function formatDate(value: string | null): string {
  if (!value) return "Not captured";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not captured";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sourceLabel(item: AdminProfileUserRaw): string {
  if (item.source === "shopify") return "Shopify";
  return item.kind === "synced" ? "SDK account" : "Public SDK";
}

function sourceTone(item: AdminProfileUserRaw): string {
  if (item.source === "shopify") return "bg-customer-blue text-brand-blue";
  return item.kind === "synced"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-customer-soft text-text-body";
}

function hostFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function originLabel(item: AdminProfileUserRaw): string {
  return item.originHost || hostFromUrl(item.originUrl) || hostFromUrl(item.productUrl) || item.storeDomain || "Not captured";
}

function deviceLabel(item: AdminProfileUserRaw): string {
  return [item.device, item.os, item.browser].filter(Boolean).join(" · ") || "Not captured";
}

function countryLabel(item: AdminProfileUserRaw): string {
  if (!item.countryCode) {
    const origin = originLabel(item);
    return origin === "localhost" || origin === "127.0.0.1" ? "Local/dev" : item.country || "Not captured";
  }
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(item.countryCode.toUpperCase()) || item.countryCode.toUpperCase();
  } catch {
    return item.countryCode.toUpperCase();
  }
}

function profileLabel(item: AdminProfileUserRaw): string {
  return item.profileName || item.userName || item.email || item.profileId || "Unnamed profile";
}

function accountLabel(item: AdminProfileUserRaw): string {
  if (item.email && item.userName) return `${item.userName} · ${item.email}`;
  return item.email || item.userName || (item.profileLoggedIn ? "Logged-in profile" : "Guest/local profile");
}

function measurementRows(item: AdminProfileUserRaw): Array<{ label: string; value: string }> {
  const unit = item.measurementsUnit || item.sizingUnit || "cm";
  return Object.entries(item.measurements || {})
    .filter(([, value]) => Number.isFinite(value))
    .slice(0, 18)
    .map(([key, value]) => ({
      label: MEASUREMENT_LABELS[key] || key,
      value: `${Math.round(value * 10) / 10}${key === "footLengthCm" ? " cm" : ` ${unit}`}`,
    }));
}

function valueOrEmpty(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Not captured";
  return String(value);
}

function detailRows(item: AdminProfileUserRaw): Array<{ label: string; value: string }> {
  const bra = [item.bandSize, item.cupSize, item.braSizeRegion].filter(Boolean).join(" ");
  const shoes = [item.shoeEU ? `EU ${item.shoeEU}` : null, item.shoeUS ? `US ${item.shoeUS}` : null, item.shoeUK ? `UK ${item.shoeUK}` : null]
    .filter(Boolean)
    .join(" · ");

  return [
    { label: "Profile ID", value: valueOrEmpty(item.profileId) },
    { label: "User ID", value: valueOrEmpty(item.userId) },
    { label: "Session", value: valueOrEmpty(item.sessionId) },
    { label: "Account", value: accountLabel(item) },
    { label: "Source", value: sourceLabel(item) },
    { label: "Origin", value: originLabel(item) },
    { label: "Store", value: item.storeName || item.storeDomain || "Not captured" },
    { label: "Product", value: item.productTitle || item.productId || "Not captured" },
    { label: "Device", value: deviceLabel(item) },
    { label: "Country", value: countryLabel(item) },
    { label: "Gender", value: valueOrEmpty(item.gender) },
    { label: "Age", value: valueOrEmpty(item.age) },
    { label: "Height", value: item.height ? `${item.height} ${item.heightUnit || item.sizingUnit || ""}`.trim() : "Not captured" },
    { label: "Weight", value: item.weight ? `${item.weight} ${item.weightUnit || ""}`.trim() : "Not captured" },
    { label: "Bra", value: bra || "Not captured" },
    { label: "Shoes", value: shoes || "Not captured" },
    { label: "Fit", value: valueOrEmpty(item.fitPreference) },
    { label: "Photo", value: item.photoStored ? "Stored" : "Not stored" },
    { label: "Size history", value: `${item.sizeHistoryCount}` },
    { label: "Profile events", value: `${item.profileEventCount}` },
    { label: "Try-ons", value: `${item.tryOnCount}` },
    { label: "Created", value: formatDate(item.createdAt) },
    { label: "Last seen", value: formatDate(item.lastSeenAt || item.updatedAt) },
  ];
}

function mapItem(item: AdminProfileUserRaw): ProfileUserListItem {
  return {
    id: item.id,
    raw: item,
    profileLabel: profileLabel(item),
    accountLabel: accountLabel(item),
    sourceLabel: sourceLabel(item),
    sourceTone: sourceTone(item),
    originLabel: originLabel(item),
    deviceLabel: deviceLabel(item),
    countryLabel: countryLabel(item),
    activityLabel: `${item.tryOnCount} try-ons · ${item.profileEventCount} profile events`,
    lastSeenLabel: formatDate(item.lastSeenAt || item.updatedAt),
    detailRows: detailRows(item),
    measurementRows: measurementRows(item),
  };
}

export function mapProfileUsersPage(response: AdminProfileUsersResponse): ProfileUsersViewModel {
  return {
    summary: response.summary,
    items: response.items.map(mapItem),
    hasUsers: response.items.length > 0,
  };
}

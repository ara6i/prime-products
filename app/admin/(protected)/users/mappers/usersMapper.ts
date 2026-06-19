import type {
  AdminProfileUserRaw,
  AdminProfileUsersResponse,
  ProfileUserGroupItem,
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

function dateTime(value: string | null): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sourceLabel(item: AdminProfileUserRaw): string {
  if (item.source === "shopify") return "Shopify";
  return item.kind === "synced" ? "SDK account" : "Public SDK";
}

function sourceTone(item: AdminProfileUserRaw): string {
  if (item.source === "shopify") return "bg-customer-blue text-brand-blue";
  return item.kind === "synced"
    ? "bg-customer-success-bg text-customer-success-text"
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

function photoUrl(item: AdminProfileUserRaw): string | null {
  if (!item.photoUrl || !/^https?:\/\//i.test(item.photoUrl)) return null;
  return item.photoUrl;
}

function plural(count: number, singular: string, pluralValue = `${singular}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : pluralValue}`;
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
  const raw = { ...item, topSizes: item.topSizes ?? [] };
  return {
    id: raw.id,
    raw,
    profileLabel: profileLabel(raw),
    accountLabel: accountLabel(raw),
    sourceLabel: sourceLabel(raw),
    sourceTone: sourceTone(raw),
    originLabel: originLabel(raw),
    deviceLabel: deviceLabel(raw),
    countryLabel: countryLabel(raw),
    activityLabel: `${raw.tryOnCount} try-ons · ${raw.profileEventCount} profile events`,
    lastSeenLabel: formatDate(raw.lastSeenAt || raw.updatedAt),
    photoUrl: photoUrl(raw),
    detailRows: detailRows(raw),
    measurementRows: measurementRows(raw),
  };
}

function userGroupKey(item: ProfileUserListItem): string {
  const raw = item.raw;
  const email = raw.email?.trim().toLowerCase();
  if (raw.userId) return `user:${raw.userId}`;
  if (email) return `email:${email}`;
  if (raw.sessionId) return `session:${raw.source}:${raw.storeDomain || raw.originHost || "unknown"}:${raw.sessionId}`;
  if (raw.profileLoggedIn) {
    return [
      "logged-context",
      raw.source,
      raw.storeDomain || raw.originHost || "unknown",
      raw.device || "unknown-device",
      raw.os || "unknown-os",
      raw.browser || "unknown-browser",
      raw.countryCode || "unknown-country",
    ].join(":");
  }
  return `profile:${raw.id}`;
}

function userLabelForProfiles(profiles: ProfileUserListItem[]): string {
  const accountProfile = profiles.find((profile) => profile.raw.userName || profile.raw.email);
  if (accountProfile?.raw.userName) return accountProfile.raw.userName;
  if (accountProfile?.raw.email) return accountProfile.raw.email;
  const namedProfile = profiles.find((profile) => profile.profileLabel && profile.profileLabel !== "Unnamed profile");
  if (namedProfile) return namedProfile.profileLabel;
  return profiles[0]?.raw.source === "shopify" ? "Shopify visitor" : "SDK visitor";
}

function accountLabelForProfiles(profiles: ProfileUserListItem[]): string {
  const accountProfile = profiles.find((profile) => profile.raw.userName || profile.raw.email);
  if (accountProfile) return accountLabel(accountProfile.raw);
  return `Identity not captured · ${plural(profiles.length, "profile")}`;
}

function sourceLabelForProfiles(profiles: ProfileUserListItem[]): string {
  const sources = new Set(profiles.map((profile) => profile.raw.source));
  if (sources.size > 1) return "Shopify + SDK";
  const primary = profiles[0];
  return primary ? sourceLabel(primary.raw) : "Unknown";
}

function sourceToneForProfiles(profiles: ProfileUserListItem[]): string {
  const sources = new Set(profiles.map((profile) => profile.raw.source));
  if (sources.size > 1) return "bg-customer-soft text-text-body";
  const primary = profiles[0];
  return primary ? sourceTone(primary.raw) : "bg-customer-soft text-text-body";
}

function compactSharedLabel(values: string[], fallback: string, suffix: string): string {
  const unique = Array.from(new Set(values.filter((value) => value && value !== "Not captured")));
  if (!unique.length) return fallback;
  return unique.length === 1 ? unique[0] : `${unique.length} ${suffix}`;
}

function buildUserGroup(id: string, profiles: ProfileUserListItem[]): ProfileUserGroupItem {
  const sorted = [...profiles].sort(
    (a, b) => dateTime(b.raw.lastSeenAt || b.raw.updatedAt) - dateTime(a.raw.lastSeenAt || a.raw.updatedAt),
  );
  const primaryProfile = sorted[0];
  const tryOnCount = sorted.reduce((sum, profile) => sum + profile.raw.tryOnCount, 0);
  const profileEventCount = sorted.reduce((sum, profile) => sum + profile.raw.profileEventCount, 0);
  const originLabelValue = compactSharedLabel(sorted.map((profile) => profile.originLabel), "Not captured", "origins");
  const deviceLabelValue = compactSharedLabel(sorted.map((profile) => profile.deviceLabel), "Not captured", "devices");
  const countryLabelValue = compactSharedLabel(sorted.map((profile) => profile.countryLabel), "Not captured", "countries");
  const profileCount = sorted.length;
  const userLabel = userLabelForProfiles(sorted);
  const accountLabelValue = accountLabelForProfiles(sorted);

  return {
    id,
    primaryProfile,
    profiles: sorted,
    userLabel,
    accountLabel: accountLabelValue === userLabel ? plural(profileCount, "profile") : accountLabelValue,
    sourceLabel: sourceLabelForProfiles(sorted),
    sourceTone: sourceToneForProfiles(sorted),
    originLabel: originLabelValue,
    deviceLabel: deviceLabelValue,
    countryLabel: countryLabelValue,
    activityLabel: `${plural(profileCount, "profile")} · ${tryOnCount.toLocaleString("en-US")} try-ons · ${profileEventCount.toLocaleString("en-US")} profile events`,
    lastSeenLabel: primaryProfile.lastSeenLabel,
    profileCount,
    tryOnCount,
    profileEventCount,
    searchText: [
      userLabel,
      accountLabelValue,
      originLabelValue,
      deviceLabelValue,
      countryLabelValue,
      ...sorted.flatMap((profile) => [
        profile.profileLabel,
        profile.accountLabel,
        profile.raw.profileId,
        profile.raw.userId,
        profile.raw.sessionId,
        profile.raw.storeName,
        profile.raw.storeDomain,
        profile.raw.productTitle,
        profile.raw.productId,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}

function groupProfileUsers(items: ProfileUserListItem[]): ProfileUserGroupItem[] {
  const groups = new Map<string, ProfileUserListItem[]>();
  for (const item of items) {
    const key = userGroupKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return Array.from(groups.entries())
    .map(([id, profiles]) => buildUserGroup(id, profiles))
    .sort(
      (a, b) =>
        dateTime(b.primaryProfile.raw.lastSeenAt || b.primaryProfile.raw.updatedAt) -
          dateTime(a.primaryProfile.raw.lastSeenAt || a.primaryProfile.raw.updatedAt) ||
        a.userLabel.localeCompare(b.userLabel),
    );
}

export function mapProfileUsersPage(response: AdminProfileUsersResponse): ProfileUsersViewModel {
  const profileItems = response.items.map(mapItem);
  const items = groupProfileUsers(profileItems);

  return {
    summary: response.summary,
    items,
    profileItems,
    profileTotal: profileItems.length,
    userTotal: items.length,
    hasUsers: items.length > 0,
  };
}

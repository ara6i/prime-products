import type {
  AdminFeedbackRawItem,
  AdminFeedbacksResponse,
  FeedbackListItem,
  FeedbackRatingBar,
  FeedbacksViewModel,
  FeedbackStatCard,
} from "../types";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function sourceLabel(source: AdminFeedbackRawItem["source"]): string {
  return source === "shopify" ? "Shopify" : "SDK";
}

function customerLabel(item: AdminFeedbackRawItem): string {
  if (!item.profileLoggedIn) return "Anonymous visitor";
  return item.profileName || item.profileEmail || "Signed-in profile";
}

function customerMeta(item: AdminFeedbackRawItem): string {
  if (item.profileLoggedIn) {
    if (item.profileEmail && item.profileUserId) return `${item.profileEmail} · User ${item.profileUserId}`;
    if (item.profileEmail) return item.profileEmail;
    if (item.profileUserId) return `User ${item.profileUserId}`;
    return item.profileId ? `Profile ${item.profileId}` : "Profile login";
  }
  return item.sessionLabel ? `Session ${item.sessionLabel}` : "No session id";
}

function visitorLabel(item: AdminFeedbackRawItem): string {
  if (item.profileLoggedIn) return item.countryName || item.countryCode || "Unknown country";
  if (item.ipAddressType === "local") return "Local test visitor";
  if (item.ipAddressType === "unavailable") return "Unknown visitor";
  const country = item.countryName || item.countryCode || "Unknown country";
  return item.ipAddress ? `${country} · ${item.ipAddress}` : country;
}

function visitorMeta(item: AdminFeedbackRawItem): string {
  if (item.profileLoggedIn) return "IP hidden for profile users";
  if (item.ipAddressType === "local") return "Localhost/private network cannot be geolocated";
  if (item.ipAddressType === "public" && item.countryName) return "Anonymous public IP captured";
  if (item.ipAddressType === "public") return "Country unavailable for this public IP";
  return "No public IP was provided";
}

function deviceLabel(item: AdminFeedbackRawItem): string {
  return [item.device, item.os, item.browser].filter(Boolean).join(" · ") || "Unknown device";
}

function productMeta(item: AdminFeedbackRawItem): string {
  const pieces = [item.productId ? `Product ${item.productId}` : null, item.jobId ? `Job ${item.jobId}` : null].filter(Boolean);
  return pieces.join(" · ") || "No product id";
}

function mapItem(item: AdminFeedbackRawItem): FeedbackListItem {
  return {
    id: item.id,
    dateLabel: formatDate(item.createdAt),
    sourceLabel: sourceLabel(item.source),
    customerLabel: customerLabel(item),
    customerMeta: customerMeta(item),
    rating: item.rating,
    note: item.note || "No note was added.",
    productTitle: item.productTitle || "Untitled product",
    productMeta: productMeta(item),
    productUrl: item.productUrl,
    sizeLabel: item.recommendedSize ? `Suggested size ${item.recommendedSize}` : "No size recorded",
    visitorLabel: visitorLabel(item),
    visitorMeta: visitorMeta(item),
    deviceLabel: deviceLabel(item),
  };
}

function mapStats(response: AdminFeedbacksResponse): FeedbackStatCard[] {
  const { summary } = response;
  return [
    {
      label: "Average rating",
      value: summary.averageRating === null ? "N/A" : `${summary.averageRating}/5`,
      helper: `${formatNumber(summary.ratedCount)} rated submissions`,
    },
    {
      label: "Feedbacks",
      value: formatNumber(summary.total),
      helper: `Showing latest ${formatNumber(summary.showing)}`,
    },
    {
      label: "Anonymous",
      value: formatNumber(summary.anonymousCount),
      helper: "IP shown only for these users",
    },
    {
      label: "Profile users",
      value: formatNumber(summary.loggedInCount),
      helper: "IP hidden for signed-in profiles",
    },
  ];
}

function mapRatingBars(response: AdminFeedbacksResponse): FeedbackRatingBar[] {
  const ratedCount = Math.max(1, response.summary.ratedCount);
  return [5, 4, 3, 2, 1].map((rating) => {
    const count = response.summary.ratingCounts[String(rating) as "1" | "2" | "3" | "4" | "5"] ?? 0;
    return {
      rating,
      count,
      percent: Math.round((count / ratedCount) * 100),
    };
  });
}

export function mapFeedbacksPage(response: AdminFeedbacksResponse): FeedbacksViewModel {
  return {
    stats: mapStats(response),
    ratingBars: mapRatingBars(response),
    items: response.items.map(mapItem),
    hasItems: response.items.length > 0,
  };
}

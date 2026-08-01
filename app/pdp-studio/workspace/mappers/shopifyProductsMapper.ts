import type {
  ShopifyConnection,
  ShopifyProduct,
  ShopifyProductMedia,
  ShopifyProductVariant,
  ShopifyProductsPage,
} from "../types/shopifyProducts";

type UnknownRecord = Record<string, unknown>;

export function mapShopifyConnection(value: unknown): ShopifyConnection {
  const record = asRecord(value);
  return {
    connected: record.connected === true,
    shopDomain: asNullableString(record.shopDomain),
    storeName: asNullableString(record.storeName),
    currency: asNullableString(record.currency),
    canPublish: record.canPublish === true,
    publishAccessUrl: asNullableString(record.publishAccessUrl),
  };
}

export function mapShopifyProductsPage(
  value: {
    products?: unknown[];
    pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
  },
  currency?: string | null,
): ShopifyProductsPage {
  return {
    products: (value.products ?? []).map((product) =>
      mapShopifyProduct(product, currency),
    ),
    hasNextPage: value.pageInfo?.hasNextPage === true,
    endCursor: value.pageInfo?.endCursor ?? null,
  };
}

function mapShopifyProduct(
  value: unknown,
  currency?: string | null,
): ShopifyProduct {
  const record = asRecord(value);
  const variants = Array.isArray(record.variants)
    ? record.variants.map(mapVariant)
    : [];
  return {
    id: String(record.id ?? ""),
    title: String(record.title ?? "Untitled product"),
    handle: String(record.handle ?? ""),
    status: String(record.status ?? "UNKNOWN"),
    featuredImage: asNullableString(record.featuredImage),
    media: Array.isArray(record.media) ? record.media.map(mapMedia) : [],
    variants,
    priceLabel: formatPriceRange(variants, currency),
  };
}

function mapMedia(value: unknown): ShopifyProductMedia {
  const record = asRecord(value);
  return {
    id: String(record.id ?? ""),
    type: String(record.type ?? "IMAGE"),
    url: String(record.url ?? ""),
    altText: asNullableString(record.altText),
    width: asNullableNumber(record.width),
    height: asNullableNumber(record.height),
  };
}

function mapVariant(value: unknown): ShopifyProductVariant {
  const record = asRecord(value);
  return {
    id: String(record.id ?? ""),
    title: String(record.title ?? ""),
    price: String(record.price ?? ""),
  };
}

function formatPriceRange(
  variants: ShopifyProductVariant[],
  currency?: string | null,
): string | null {
  const prices = variants
    .map((variant) => Number(variant.price))
    .filter(Number.isFinite);
  if (prices.length === 0) return null;
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits:
      Number.isInteger(minimum) && Number.isInteger(maximum) ? 0 : 2,
  });
  return minimum === maximum
    ? formatter.format(minimum)
    : `${formatter.format(minimum)} – ${formatter.format(maximum)}`;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object"
    ? (value as UnknownRecord)
    : {};
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

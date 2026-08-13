import type {
  StylistCatalogProduct,
  StylistSizeRecommendation,
} from "@/app/ai-stylist/types";
import type {
  ProductDetailViewModel,
  ProductInformationSection,
} from "@/app/shop/product/types/productDetail.types";

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function discountLabel(price: number, originalPrice?: number): string | undefined {
  if (!originalPrice || originalPrice <= price) return undefined;
  return `${Math.round(((originalPrice - price) / originalPrice) * 100)}% off`;
}

function validColorHex(value: string | undefined): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#2154ef";
}

function recommendationView(
  recommendation: StylistSizeRecommendation | null,
): ProductDetailViewModel["sizeRecommendation"] {
  if (!recommendation) {
    return {
      status: "unavailable",
      label: "Size recommendation unavailable",
      detail: "We could not connect this item to a verified personal size result.",
    };
  }
  if (recommendation.status === "ready" && recommendation.recommendedSize) {
    return {
      status: "ready",
      label: `Recommended size ${recommendation.recommendedSize}`,
      detail: `${humanize(recommendation.confidence ?? "estimated")} confidence from your saved fit profile.`,
      recommendedSize: recommendation.recommendedSize,
    };
  }
  if (recommendation.status === "not-needed") {
    return {
      status: "not-needed",
      label: "No size needed",
      detail: "This product does not require a clothing size selection.",
    };
  }
  return {
    status: "unavailable",
    label: "Size recommendation unavailable",
    detail: "The product can still be viewed, but its verified sizing data is incomplete.",
  };
}

function productInformation(product: StylistCatalogProduct): ProductInformationSection[] {
  const styleFacts = unique([
    ...product.style_tags,
    ...product.fit_tags,
    ...product.silhouette_tags,
    ...product.coverage_tags,
  ]).slice(0, 8);
  const occasions = unique(product.occasion).map(humanize);
  const seasons = unique(product.season_tags).map(humanize);

  return [
    {
      id: "details",
      title: "Details",
      summary: product.description?.trim() || `${product.name} is supplied by ${product.brand} and selected from the live AI Stylist catalog.`,
      items: [
        `Brand: ${product.brand}`,
        `Category: ${humanize(product.subcategory || product.category)}`,
        `Availability: ${humanize(product.stock_status)}`,
        ...(occasions.length ? [`Occasions: ${occasions.join(", ")}`] : []),
      ],
    },
    {
      id: "materials",
      title: "Materials & style",
      summary: product.material
        ? `Merchant-listed material: ${product.material}.`
        : "The merchant has not supplied verified fabric composition for this product.",
      items: [
        ...(product.pattern ? [`Pattern: ${humanize(product.pattern)}`] : []),
        ...(product.color ? [`Color: ${product.color}`] : []),
        ...(styleFacts.length ? [`Style: ${styleFacts.map(humanize).join(", ")}`] : []),
      ],
    },
    {
      id: "fit",
      title: "Size & fit",
      summary: product.sizes.length
        ? `Available merchant sizes: ${product.sizes.join(", ")}.`
        : "A verified merchant size list is not available for this item.",
      items: [
        ...(product.formality ? [`Formality: ${humanize(product.formality)}`] : []),
        ...(product.gender ? [`Catalog fit: ${humanize(product.gender)}`] : []),
        ...(seasons.length ? [`Season: ${seasons.join(", ")}`] : []),
        product.is_virtual_tryon_supported ? "Virtual try-on supported" : "Virtual try-on unavailable",
      ],
    },
    {
      id: "shipping",
      title: "Shipping & returns",
      summary: "Delivery timing and return eligibility are confirmed by the connected merchant before checkout.",
      items: ["Secure network checkout", "Merchant stock and delivery are rechecked before purchase"],
    },
  ];
}

export function mapStylistProductDetail(
  product: StylistCatalogProduct,
  recommendation: StylistSizeRecommendation | null,
): ProductDetailViewModel {
  const imageUrls = unique([
    product.cutout_image_url,
    ...product.image_urls,
    product.enriched_image_url,
  ]);
  const gallery = imageUrls.map((src, index) => ({
    id: `${product.style_rag_id}-view-${index + 1}`,
    src,
    alt: `${product.name} ${index === 0 ? "product image" : `view ${index + 1}`}`,
  }));
  const featureImage = product.enriched_image_url || imageUrls[1] || imageUrls[0] || "";
  const sourceId = product.source_product_id || product.style_rag_id;
  const note = unique([product.color, product.material, product.subcategory || product.category]).join(" · ");

  return {
    id: product.style_rag_id || product.product_id,
    name: product.name,
    brandName: product.brand,
    badge: "AI Stylist pick",
    category: product.subcategory || product.category,
    color: product.color || "Merchant color",
    colorHex: validColorHex(product.color_hex),
    styleCode: sourceId.length > 22 ? `…${sourceId.slice(-21)}` : sourceId,
    description: product.description?.trim() || `${product.name} from ${product.brand}, selected from the live PrimeStyleAI catalog.`,
    priceLabel: formatMoney(product.price, product.currency),
    currency: product.currency,
    ...(typeof product.original_price === "number" ? {
      compareAtPriceLabel: formatMoney(product.original_price, product.currency),
      discountLabel: discountLabel(product.price, product.original_price),
    } : {}),
    ...(product.rating > 0 ? { ratingLabel: product.rating.toFixed(1) } : {}),
    ...(product.reviews_count > 0 ? { reviewLabel: `${product.reviews_count} reviews` } : {}),
    sizeRecommendation: recommendationView(recommendation),
    sizes: unique(product.sizes),
    gallery,
    featureImage,
    sourceHref: "/shop/ai-stylist",
    sourceLabel: "AI Stylist",
    canonicalHref: `/shop/ai-stylist/product/${encodeURIComponent(product.style_rag_id || product.product_id)}`,
    tryOnSupported: product.is_virtual_tryon_supported,
    note: note || "Live AI Stylist catalog product",
    information: productInformation(product),
    related: [],
  };
}

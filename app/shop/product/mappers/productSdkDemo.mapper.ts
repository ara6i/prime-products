import type {
  PrimeStyleInstantOutfitResult,
  PrimeStyleOutfitItem,
  PrimeStyleOutfitLook,
  PrimeStylePresetProfile,
} from "@primestyleai/tryon-shop/react";
import {
  SHOWCASE_PRODUCTS,
  SHOWCASE_SLOTS,
  getShowcaseProduct,
  showcaseAsset,
  type ShowcaseProduct,
} from "../../data/showcaseCatalog.data";
import { showcasePreparedResultAsset } from "../data/productSdkDemo.data";
import type { ProductDetailViewModel } from "../types/productDetail.types";
import { getProductInstantOutfitLooks } from "./productOutfitLooks.mapper";

export type ProductSdkDemo = {
  presetProfile: PreparedDemoProfile;
  instantOutfitLooks: PrimeStyleOutfitLook[];
  instantOutfitResults: PrimeStyleInstantOutfitResult[];
};

type PreparedDemoProfile = PrimeStylePresetProfile & {
  bandSize?: string;
  cupSize?: string;
  braSizeRegion?: string;
};

const PRESET_MEASUREMENTS = {
  women: { height: 168, weight: 59, age: 29 },
  men: { height: 183, weight: 78, age: 31 },
} as const;

const PRESET_BASE_MODEL_IMAGES = {
  women: "/media/global-shop/sdk-base-models/women-pdp-model-raw-v2.png",
  men: "/media/global-shop/sdk-base-models/men-pdp-model-raw-v2.png",
} as const;

const GENERIC_LOOK_LABELS = [
  "Quiet tailoring",
  "Soft contrast",
  "Modern ease",
  "City proportions",
  "Weekend polish",
] as const;

const GENERIC_MASKS = ["0000", "0101", "1010", "0011", "1100"] as const;

function recommendedSize(product: ProductDetailViewModel) {
  if (product.sizes.includes("One size")) return "One size";
  if (product.sizes.includes("M")) return "M";
  return product.sizes[Math.floor(product.sizes.length / 2)] ?? "M";
}

function presetProfile(
  product: ProductDetailViewModel,
  gender: "women" | "men",
  useShowcaseBaseModel: boolean,
): PreparedDemoProfile {
  const measurements = PRESET_MEASUREMENTS[gender];
  const wornProductPhoto =
    product.gallery.find((item) =>
      /original supplier photo/i.test(item.caption ?? ""),
    ) ?? product.gallery[0];
  return {
    id: `shop-demo-${product.id}`,
    gender: gender === "women" ? "female" : "male",
    photoUrl: useShowcaseBaseModel
      ? PRESET_BASE_MODEL_IMAGES[gender]
      : wornProductPhoto?.src ?? product.featureImage,
    height: measurements.height,
    weight: measurements.weight,
    heightUnit: "cm",
    weightUnit: "kg",
    age: measurements.age,
    ...(gender === "women"
      ? { bandSize: "34", cupSize: "B", braSizeRegion: "US" }
      : {}),
  };
}

function instantResults(
  product: ProductDetailViewModel,
  looks: PrimeStyleOutfitLook[],
  preparedAsset?: (index: number) => string,
  fallbackImage?: string,
): PrimeStyleInstantOutfitResult[] {
  const size = recommendedSize(product);
  return looks.map((look, index) => ({
    lookId: look.id,
    image:
      preparedAsset?.(index) ??
      fallbackImage ??
      product.gallery[0]?.src ??
      product.featureImage,
    recommendedSize: size,
    confidence: "high",
    reasoning: `${size} keeps the intended fit of ${product.name} while the rest of the ${look.label?.toLowerCase() ?? "curated"} look stays balanced.`,
  }));
}

function inferSlot(
  product: ProductDetailViewModel,
): "top" | "bottom" | "shoe" | "bag" | "accessory" {
  if (product.slot) return product.slot;
  const text = `${product.category} ${product.name}`;
  if (/bottom|jean|trouser|pant|skirt|short/i.test(text)) return "bottom";
  if (/shoe|footwear|sneaker|loafer|pump|boot|sandal/i.test(text))
    return "shoe";
  if (/bag|tote|crossbody|clutch|weekender/i.test(text)) return "bag";
  if (/accessor|sunglass|scarf|earring|watch|jewelry/i.test(text)) {
    return "accessory";
  }
  return "top";
}

function alternativesFor(product: ShowcaseProduct) {
  return SHOWCASE_PRODUCTS.filter(
    (candidate) =>
      candidate.gender === product.gender &&
      candidate.slot === product.slot &&
      candidate.id !== product.id,
  ).map((candidate) => ({
    slot: candidate.slot,
    productId: candidate.id,
    title: candidate.name,
    image: showcaseAsset(candidate, "01-product-front"),
    displayImage: showcaseAsset(candidate, "01-product-front"),
    url: `/shop/product/${candidate.id}`,
    color: candidate.color,
    garmentType: candidate.slot,
    recommendedSize: recommendedShowcaseSize(candidate),
  }));
}

function recommendedShowcaseSize(product: ShowcaseProduct) {
  if (product.sizes.includes("One size")) return "One size";
  if (product.sizes.includes("M")) return "M";
  return product.sizes[Math.floor(product.sizes.length / 2)] ?? "M";
}

function showcaseItem(product: ShowcaseProduct): PrimeStyleOutfitItem {
  return {
    slot: product.slot,
    productId: product.id,
    title: product.name,
    image: showcaseAsset(product, "01-product-front"),
    displayImage: showcaseAsset(product, "01-product-front"),
    url: `/shop/product/${product.id}`,
    color: product.color,
    garmentType: product.slot,
    recommendedSize: recommendedShowcaseSize(product),
    selected: true,
    alternatives: alternativesFor(product),
  };
}

function genericLooks(
  product: ProductDetailViewModel,
  gender: "women" | "men",
): PrimeStyleOutfitLook[] {
  const inferredSlot = inferSlot(product);
  const isDress = /\bdress\b/i.test(`${product.category} ${product.name}`);
  const companionSlots = SHOWCASE_SLOTS.filter(
    (slot) => slot !== inferredSlot && !(isDress && slot === "bottom"),
  );

  return GENERIC_MASKS.map((mask, lookIndex) => ({
    id: `${product.id}-prepared-look-${lookIndex + 1}`,
    label: GENERIC_LOOK_LABELS[lookIndex],
    items: companionSlots.map((slot, slotIndex) => {
      const candidates = SHOWCASE_PRODUCTS.filter(
        (candidate) => candidate.gender === gender && candidate.slot === slot,
      );
      const choice = Number(mask[slotIndex] ?? "0");
      const selected = candidates[choice] ?? candidates[0];
      if (!selected) {
        throw new Error(`Missing ${gender} ${slot} companion product`);
      }
      return showcaseItem(selected);
    }),
  }));
}

/**
 * Every product explicitly assigned to Women or Men gets the same prepared
 * Shop SDK journey. Structured showcase products use their stable result
 * route; imported products use their PDP model photo until a generated full
 * look is placed at a product-specific result URL.
 */
export function getProductSdkDemo(
  product: ProductDetailViewModel,
): ProductSdkDemo | undefined {
  if (!product.gender) return undefined;
  const showcaseProduct = getShowcaseProduct(product.id);
  const looks = showcaseProduct
    ? getProductInstantOutfitLooks(product.id)
    : genericLooks(product, product.gender);
  if (looks.length === 0) return undefined;
  const profile = presetProfile(
    product,
    product.gender,
    Boolean(showcaseProduct),
  );

  return {
    presetProfile: profile,
    instantOutfitLooks: looks,
    instantOutfitResults: instantResults(
      product,
      looks,
      showcaseProduct
        ? (index) => showcasePreparedResultAsset(showcaseProduct, index)
        : undefined,
      profile.photoUrl,
    ),
  };
}

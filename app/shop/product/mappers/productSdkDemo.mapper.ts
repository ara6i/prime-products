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
import {
  COBALT_SET_COMPANIONS,
  MEN_SDK_COMPANIONS,
  WOMEN_SDK_EXTRA_COMPANIONS,
  type ProductOutfitCompanion,
} from "../data/productOutfitCompanions.data";
import {
  dailyEditPreparedResultAsset,
  showcasePreparedResultAsset,
} from "../data/productSdkDemo.data";
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
): PreparedDemoProfile {
  const measurements = PRESET_MEASUREMENTS[gender];
  return {
    id: `shop-demo-${product.id}`,
    gender: gender === "women" ? "female" : "male",
    photoUrl: PRESET_BASE_MODEL_IMAGES[gender],
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

function recommendedShowcaseSize(product: ShowcaseProduct) {
  if (product.sizes.includes("One size")) return "One size";
  if (product.sizes.includes("M")) return "M";
  return product.sizes[Math.floor(product.sizes.length / 2)] ?? "M";
}

function companionItem(
  product: ProductOutfitCompanion,
  candidates: ProductOutfitCompanion[],
): PrimeStyleOutfitItem {
  return {
    ...product,
    displayImage: product.image,
    garmentType: product.slot,
    selected: true,
    alternatives: candidates
      .filter((candidate) => candidate.productId !== product.productId)
      .map((candidate) => ({
        ...candidate,
        displayImage: candidate.image,
        garmentType: candidate.slot,
      })),
  };
}

function showcaseCompanion(product: ShowcaseProduct): ProductOutfitCompanion {
  return {
    slot: product.slot,
    productId: product.id,
    title: product.name,
    image: showcaseAsset(product, "01-product-front"),
    url: `/shop/product/${product.id}`,
    color: product.color,
    recommendedSize: recommendedShowcaseSize(product),
  };
}

function genericCandidates(
  gender: "women" | "men",
  slot: ShowcaseProduct["slot"],
) {
  const showcase = SHOWCASE_PRODUCTS.filter(
    (candidate) => candidate.gender === gender && candidate.slot === slot,
  ).map(showcaseCompanion);
  if (gender === "men") return MEN_SDK_COMPANIONS[slot] ?? showcase;
  return [...showcase, ...(WOMEN_SDK_EXTRA_COMPANIONS[slot] ?? [])];
}

function inferGender(product: ProductDetailViewModel): "women" | "men" {
  if (product.gender) return product.gender;
  const text = `${product.category} ${product.name} ${product.note}`;
  if (/\b(men|man|male|mens|men’s)\b/i.test(text)) return "men";
  return "women";
}

function genericLooks(
  product: ProductDetailViewModel,
  gender: "women" | "men",
): PrimeStyleOutfitLook[] {
  const inferredSlot = inferSlot(product);
  const isDress = /\bdress(?:es)?\b/i.test(
    `${product.category} ${product.name}`,
  );
  const isCobaltSet = product.id === "daily-edit-cobalt-track";
  const companionSlots = isCobaltSet
    ? (["top", "shoe", "accessory"] as const)
    : SHOWCASE_SLOTS.filter(
        (slot) =>
          slot !== inferredSlot &&
          !(isDress && slot === "bottom") &&
          !(gender === "men" && slot === "bag"),
      );

  return GENERIC_MASKS.map((mask, lookIndex) => ({
    id: `${product.id}-prepared-look-${lookIndex + 1}`,
    label: GENERIC_LOOK_LABELS[lookIndex],
    items: companionSlots.map((slot, slotIndex) => {
      const candidates = isCobaltSet
        ? (COBALT_SET_COMPANIONS[slot] ?? [])
        : genericCandidates(gender, slot);
      const choice =
        candidates.length >= GENERIC_MASKS.length
          ? lookIndex
          : Number(mask[slotIndex] ?? "0");
      const selected = candidates[choice] ?? candidates[0];
      if (!selected) {
        throw new Error(`Missing ${gender} ${slot} companion product`);
      }
      return companionItem(selected, candidates);
    }),
  }));
}

/**
 * Every Shop PDP gets a deterministic demo journey. Structured showcase and
 * Daily Edit products use prepared result assets; the remaining catalog uses
 * the neutral preset model so it never falls through to the live SDK flow.
 */
export function getProductSdkDemo(
  product: ProductDetailViewModel,
): ProductSdkDemo {
  const gender = inferGender(product);
  const showcaseProduct = getShowcaseProduct(product.id);
  const looks = showcaseProduct
    ? getProductInstantOutfitLooks(product.id)
    : genericLooks(product, gender);
  const profile = presetProfile(product, gender);
  const isDailyEdit = product.id.startsWith("daily-edit-");
  const wornProductPhoto =
    product.gallery.find((item) =>
      /original supplier photo/i.test(item.caption ?? ""),
    )?.src ?? product.gallery[0]?.src;

  return {
    presetProfile: profile,
    instantOutfitLooks: looks,
    instantOutfitResults: instantResults(
      product,
      looks,
      showcaseProduct
        ? (index) => showcasePreparedResultAsset(showcaseProduct, index)
        : isDailyEdit
          ? (index) => dailyEditPreparedResultAsset(product.id, index)
        : undefined,
      wornProductPhoto ?? product.featureImage,
    ),
  };
}

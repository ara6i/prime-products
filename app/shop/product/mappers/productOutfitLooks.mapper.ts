import type {
  PrimeStyleOutfitItem,
  PrimeStyleOutfitLook,
} from "@primestyleai/tryon-shop/react";
import {
  SHOWCASE_PRODUCTS,
  SHOWCASE_SLOTS,
  getShowcaseProduct,
  showcaseAsset,
  type ShowcaseProduct,
} from "../../data/showcaseCatalog.data";
import {
  CAMEL_BLAZER_EXTRA_COMPANIONS,
  type ProductOutfitCompanion,
} from "../data/productOutfitCompanions.data";

const COMPANION_MASKS = ["0000", "0101", "1010", "0011", "1100"] as const;
const LOOK_LABELS = [
  "Quiet tailoring",
  "Soft contrast",
  "Modern ease",
  "City proportions",
  "Weekend polish",
] as const;

function showcaseRecommendedSize(product: ShowcaseProduct) {
  if (product.sizes.includes("One size")) return "One size";
  if (product.sizes.includes("M")) return "M";
  return product.sizes[Math.floor(product.sizes.length / 2)] ?? "M";
}

function showcaseCompanion(product: ShowcaseProduct): ProductOutfitCompanion {
  return {
    slot: product.slot,
    productId: product.id,
    title: product.name,
    image: showcaseAsset(product, "01-product-front"),
    url: `/shop/product/${product.id}`,
    color: product.color,
    recommendedSize: showcaseRecommendedSize(product),
  };
}

function companionsFor(
  pinnedProduct: ShowcaseProduct,
  slot: ShowcaseProduct["slot"],
) {
  const showcaseCompanions = SHOWCASE_PRODUCTS.filter(
    (candidate) =>
      candidate.gender === pinnedProduct.gender && candidate.slot === slot,
  ).map(showcaseCompanion);

  if (pinnedProduct.id !== "women-camel-pinstripe-tailored-blazer") {
    return showcaseCompanions;
  }

  return [
    ...showcaseCompanions,
    ...(CAMEL_BLAZER_EXTRA_COMPANIONS[slot] ?? []),
  ];
}

function mapOutfitItem(
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

export function getProductInstantOutfitLooks(
  productId: string,
): PrimeStyleOutfitLook[] {
  const pinnedProduct = getShowcaseProduct(productId);
  if (!pinnedProduct) return [];

  const missingSlots = SHOWCASE_SLOTS.filter(
    (slot) => slot !== pinnedProduct.slot,
  );
  return COMPANION_MASKS.map((mask, lookIndex) => {
    const selectedBySlot = new Map<
      ShowcaseProduct["slot"],
      { selected: ProductOutfitCompanion; candidates: ProductOutfitCompanion[] }
    >();
    missingSlots.forEach((slot, slotIndex) => {
      const candidates = companionsFor(pinnedProduct, slot);
      const choice =
        candidates.length >= COMPANION_MASKS.length
          ? lookIndex
          : Number(mask[slotIndex] ?? "0");
      selectedBySlot.set(slot, {
        selected: candidates[choice] ?? candidates[0],
        candidates,
      });
    });

    return {
      id: `${pinnedProduct.id}-look-${lookIndex + 1}-${mask}`,
      label: LOOK_LABELS[lookIndex],
      items: missingSlots.map((slot) => {
        const selection = selectedBySlot.get(slot);
        if (!selection)
          throw new Error(`Missing ${slot} for ${pinnedProduct.id}`);
        return mapOutfitItem(selection.selected, selection.candidates);
      }),
    };
  });
}

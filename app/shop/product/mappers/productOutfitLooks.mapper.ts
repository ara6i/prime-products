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

const COMPANION_MASKS = ["0000", "0101", "1010", "0011", "1100"] as const;
const LOOK_LABELS = [
  "Quiet tailoring",
  "Soft contrast",
  "Modern ease",
  "City proportions",
  "Weekend polish",
] as const;

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
    recommendedSize: candidate.sizes[0] === "One size" ? "One size" : undefined,
  }));
}

function mapOutfitItem(product: ShowcaseProduct): PrimeStyleOutfitItem {
  return {
    slot: product.slot,
    productId: product.id,
    title: product.name,
    image: showcaseAsset(product, "01-product-front"),
    displayImage: showcaseAsset(product, "01-product-front"),
    url: `/shop/product/${product.id}`,
    color: product.color,
    garmentType: product.slot,
    recommendedSize: product.sizes[0] === "One size" ? "One size" : undefined,
    selected: true,
    alternatives: alternativesFor(product),
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
    const selectedBySlot = new Map<ShowcaseProduct["slot"], ShowcaseProduct>();
    missingSlots.forEach((slot, slotIndex) => {
      const candidates = SHOWCASE_PRODUCTS.filter(
        (candidate) =>
          candidate.gender === pinnedProduct.gender && candidate.slot === slot,
      );
      const choice = Number(mask[slotIndex] ?? "0");
      selectedBySlot.set(slot, candidates[choice] ?? candidates[0]);
    });

    return {
      id: `${pinnedProduct.id}-look-${lookIndex + 1}-${mask}`,
      label: LOOK_LABELS[lookIndex],
      items: missingSlots.map((slot) => {
        const product = selectedBySlot.get(slot);
        if (!product)
          throw new Error(`Missing ${slot} for ${pinnedProduct.id}`);
        return mapOutfitItem(product);
      }),
    };
  });
}

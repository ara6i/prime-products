"use client";

import { useState } from "react";
import type { PrimeStyleAddToBagPayload } from "@primestyleai/tryon-shop/react";
import { useShopBag } from "../../bag/useShopBag";
import {
  SHOWCASE_SLOTS,
  getShowcaseProduct,
  isOneSizeProduct,
  showcaseAsset,
} from "../../data/showcaseCatalog.data";
import type {
  ProductDetailInteractionState,
  ProductDetailViewModel,
} from "../types/productDetail.types";

export function useProductDetail(
  product: ProductDetailViewModel,
): ProductDetailInteractionState {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(
    product.sizeRecommendation?.recommendedSize && product.sizes.includes(product.sizeRecommendation.recommendedSize)
      ? product.sizeRecommendation.recommendedSize
      : product.sizes.length === 1 && product.sizes[0] === "One size"
        ? "One size"
        : "",
  );
  const bag = useShopBag();
  const [isFavorite, setIsFavorite] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pendingOutfit, setPendingOutfit] = useState<ProductDetailInteractionState["pendingOutfit"]>([]);

  function addToBag() {
    if (product.sizes.length > 0 && !product.sizes.includes(selectedSize)) {
      setConfirmation("Choose a valid size before saving this item to your look.");
      return;
    }
    bag.add({
      productId: product.id,
      name: product.name,
      brandName: product.brandName,
      image: product.gallery[0]?.src ?? product.featureImage,
      href: product.canonicalHref ?? `/shop/product/${product.id}`,
      size: selectedSize,
      color: product.color,
      priceCents: product.priceCents,
      currency: product.currency ?? "USD",
    });
    setConfirmation(`${product.name}${selectedSize ? ` · ${selectedSize}` : ""} saved to your look`);
  }

  function saveOutfit(items: ProductDetailInteractionState["pendingOutfit"]) {
    for (const item of items) {
      bag.add({
        productId: item.productId,
        name: item.name,
        brandName: item.brandName,
        image: item.image,
        href: item.href,
        size: item.selectedSize,
        color: item.color,
        priceCents: item.priceCents,
        currency: item.currency,
      });
    }
    setConfirmation(`${items.length === 1 ? items[0].name : "Complete outfit"} saved to your look.`);
    setPendingOutfit([]);
  }

  function addSdkSelection(payload: PrimeStyleAddToBagPayload) {
    const currentShowcaseProduct = getShowcaseProduct(product.id);
    if (!currentShowcaseProduct) {
      addToBag();
      return;
    }

    const requested = payload.scope === "outfit" && payload.items?.length
      ? payload.items
      : [payload];
    const withPinned = requested.some((item) => item.productId === product.id)
      ? requested
      : [{ productId: product.id, recommendedSize: selectedSize }, ...requested];
    const unique = withPinned.filter(
      (item, index, items) =>
        Boolean(item.productId) &&
        items.findIndex((candidate) => candidate.productId === item.productId) === index,
    );
    const products = unique
      .map((item) => ({ item, catalogProduct: getShowcaseProduct(item.productId ?? "") }))
      .filter((entry): entry is typeof entry & { catalogProduct: NonNullable<typeof entry.catalogProduct> } => Boolean(entry.catalogProduct));

    if (
      products.length !== unique.length ||
      products.some(({ catalogProduct }) => catalogProduct.gender !== currentShowcaseProduct.gender)
    ) {
      setConfirmation("This outfit contains an invalid or cross-category item and was not added.");
      return;
    }

    if (payload.scope === "outfit") {
      const slots = new Set(products.map(({ catalogProduct }) => catalogProduct.slot));
      if (
        products.length !== SHOWCASE_SLOTS.length ||
        SHOWCASE_SLOTS.some((slot) => !slots.has(slot)) ||
        !products.some(({ catalogProduct }) => catalogProduct.id === product.id)
      ) {
        setConfirmation("The outfit is incomplete and was not added. Choose a full five-piece look.");
        return;
      }
    }

    const bagItems = products.map(({ item, catalogProduct }) => {
      const requestedSize = catalogProduct.id === product.id && selectedSize
        ? selectedSize
        : item.recommendedSize ?? "";
      const validatedSize = isOneSizeProduct(catalogProduct)
        ? "One size"
        : catalogProduct.sizes.includes(requestedSize)
          ? requestedSize
          : "";
      return {
        productId: catalogProduct.id,
        name: catalogProduct.name,
        brandName: "PrimeStyleAI Atelier",
        image: showcaseAsset(catalogProduct, "01-product-front"),
        href: `/shop/product/${catalogProduct.id}`,
        color: catalogProduct.color,
        priceCents: catalogProduct.priceCents,
        currency: "USD",
        sizes: catalogProduct.sizes,
        selectedSize: validatedSize,
      };
    });

    if (bagItems.some((item) => !item.selectedSize)) {
      setPendingOutfit(bagItems);
      setConfirmation("Choose sizes for the unresolved outfit pieces.");
      return;
    }
    saveOutfit(bagItems);
  }

  function confirmPendingOutfit() {
    if (
      pendingOutfit.length === 0 ||
      pendingOutfit.some((item) => !item.sizes.includes(item.selectedSize))
    ) {
      setConfirmation("Choose a valid size for every outfit piece.");
      return;
    }
    saveOutfit(pendingOutfit);
  }

  function toggleFavorite() {
    setIsFavorite((favorite) => !favorite);
  }

  return {
    activeImageIndex,
    selectedSize,
    bagCount: bag.bagCount,
    isFavorite,
    sizeGuideOpen,
    confirmation,
    pendingOutfit,
    setActiveImageIndex,
    setSelectedSize,
    setBagOpen: bag.setOpen,
    setSizeGuideOpen,
    addToBag,
    addSdkSelection,
    setPendingOutfitSize: (productId: string, size: string) => {
      setPendingOutfit((items) => items.map((item) =>
        item.productId === productId && item.sizes.includes(size)
          ? { ...item, selectedSize: size }
          : item,
      ));
    },
    confirmPendingOutfit,
    closePendingOutfit: () => setPendingOutfit([]),
    toggleFavorite,
  };
}

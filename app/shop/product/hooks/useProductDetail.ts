"use client";

import { useState } from "react";
import { useShopBag } from "../../bag/useShopBag";
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
      : product.sizes[0] ?? "",
  );
  const bag = useShopBag();
  const [isFavorite, setIsFavorite] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  function addToBag() {
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
    setConfirmation(`${product.name}${selectedSize ? ` · ${selectedSize}` : ""} added to your bag`);
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
    setActiveImageIndex,
    setSelectedSize,
    setBagOpen: bag.setOpen,
    setSizeGuideOpen,
    addToBag,
    toggleFavorite,
  };
}

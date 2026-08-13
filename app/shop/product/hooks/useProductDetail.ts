"use client";

import { useState } from "react";
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
  const [bagCount, setBagCount] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  function addToBag() {
    setBagCount((count) => count + 1);
    setConfirmation(`${product.name}${selectedSize ? ` · ${selectedSize}` : ""} added to your bag`);
  }

  function toggleFavorite() {
    setIsFavorite((favorite) => !favorite);
  }

  return {
    activeImageIndex,
    selectedSize,
    bagCount,
    isFavorite,
    sizeGuideOpen,
    confirmation,
    setActiveImageIndex,
    setSelectedSize,
    setSizeGuideOpen,
    addToBag,
    toggleFavorite,
  };
}

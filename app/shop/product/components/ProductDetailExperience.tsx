"use client";

import { useProductDetail } from "../hooks/useProductDetail";
import type { ProductDetailViewModel } from "../types/productDetail.types";
import { ProductDetailDesktop } from "./desktop/ProductDetailDesktop";
import { ProductDetailMobile } from "./mobile/ProductDetailMobile";
import { ProductShopHeader } from "./ProductShopHeader";
import { SizeGuideDialog } from "./SizeGuideDialog";
import styles from "./productDetail.module.css";

interface ProductDetailExperienceProps {
  product: ProductDetailViewModel;
  theme?: "default" | "ai-stylist";
}

export function ProductDetailExperience({
  product,
  theme = "default",
}: ProductDetailExperienceProps) {
  const state = useProductDetail(product);

  return (
    <div className={`${styles.page} ${theme === "ai-stylist" ? styles.aiStylistTheme : ""}`}>
      <ProductShopHeader
        brandName={product.brandName}
        brandLogo={product.brandLogo}
        bagCount={state.bagCount}
        onOpenBag={() => state.setBagOpen(true)}
      />
      <ProductDetailDesktop product={product} state={state} />
      <ProductDetailMobile product={product} state={state} />
      <SizeGuideDialog
        product={product}
        open={state.sizeGuideOpen}
        onOpenChange={state.setSizeGuideOpen}
      />
    </div>
  );
}

"use client";

import { useMemo, useSyncExternalStore, type ComponentType } from "react";
import dynamic from "next/dynamic";
import type { PrimeStyleTryonProps } from "@primestyleai/tryon/react";
import { TryOnIcon } from "@/app/shared/components/icons";
import type {
  ProductDetailInteractionState,
  ProductDetailViewModel,
} from "../types/productDetail.types";
import { mapProductSizeGuide } from "../mappers/productSizeGuide.mapper";
import styles from "./productDetail.module.css";

const DESKTOP_QUERY = "(min-width: 47.5001rem)";

const PrimeStyleTryon = dynamic<PrimeStyleTryonProps>(
  () =>
    import("@primestyleai/tryon/react").then(
      (module) => module.PrimeStyleTryon,
    ),
  { ssr: false },
);

type ShopPrimeStyleTryonProps = PrimeStyleTryonProps & {
  productPrice?: number | string;
  productCompareAtPrice?: number | string;
  productCurrency?: string;
};

const ShopPrimeStyleTryon =
  PrimeStyleTryon as ComponentType<ShopPrimeStyleTryonProps>;

interface ProductTryOnButtonProps {
  product: ProductDetailViewModel;
  state: ProductDetailInteractionState;
  viewport: "desktop" | "mobile";
}

function subscribeToViewport(onChange: () => void) {
  const mediaQuery = window.matchMedia(DESKTOP_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getDesktopViewportSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getDesktopServerSnapshot() {
  return true;
}

function inferProductGender(product: ProductDetailViewModel) {
  const context = `${product.category} ${product.name} ${product.note}`;
  if (/\b(women|woman|female|ladies)\b/i.test(context)) return "female";
  if (/\b(men|man|male)\b/i.test(context)) return "male";
  return undefined;
}

export function ProductTryOnButton({
  product,
  state,
  viewport,
}: ProductTryOnButtonProps) {
  const isDesktop = useSyncExternalStore(
    subscribeToViewport,
    getDesktopViewportSnapshot,
    getDesktopServerSnapshot,
  );
  const shouldRender = viewport === "desktop" ? isDesktop : !isDesktop;
  const sizeGuideData = useMemo(() => mapProductSizeGuide(product), [product]);

  if (!shouldRender) return null;

  const material = product.information.find(
    (section) => section.id === "materials",
  )?.summary;

  return (
    <ShopPrimeStyleTryon
      apiUrl={
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:4000"
      }
      productId={product.id}
      productImage={product.gallery[0]?.src ?? product.featureImage}
      productImages={product.gallery.map((item) => item.src)}
      productCarouselItems={product.related.map((item) => ({
        image: item.image,
        title: item.name,
        href: item.href,
      }))}
      productTitle={product.name}
      productCategory={product.category}
      productGender={inferProductGender(product)}
      productType={product.category}
      productVendor={product.brandName}
      productDescription={product.description}
      productMaterial={material}
      sizeGuideData={sizeGuideData}
      productPrice={product.priceLabel}
      productCompareAtPrice={product.compareAtPriceLabel}
      productCurrency={product.currency ?? "USD"}
      productUrl={product.canonicalHref ?? `/shop/product/${product.id}`}
      buttonText="Build with AI"
      buttonIcon={<TryOnIcon />}
      showPoweredBy
      className={styles.tryOnSdkRoot}
      classNames={{ button: styles.tryOnButton }}
      onAddToBag={() => state.addToBag()}
    />
  );
}

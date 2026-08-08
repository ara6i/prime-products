import Link from "next/link";
import { ArrowLeftIcon } from "@/app/shared/components/icons";
import type {
  ProductDetailInteractionState,
  ProductDetailViewModel,
} from "../../types/productDetail.types";
import { ProductBenefits } from "../ProductBenefits";
import { ProductGallery } from "../ProductGallery";
import { ProductInformation } from "../ProductInformation";
import { ProductPurchasePanel } from "../ProductPurchasePanel";
import { RelatedProducts } from "../RelatedProducts";
import styles from "../productDetail.module.css";

interface ProductDetailDesktopProps {
  product: ProductDetailViewModel;
  state: ProductDetailInteractionState;
}

export function ProductDetailDesktop({
  product,
  state,
}: ProductDetailDesktopProps) {
  return (
    <main className={styles.desktopOnly}>
      <div className={styles.desktopBreadcrumb}>
        <Link href={product.sourceHref}>
          <ArrowLeftIcon /> Back to {product.sourceLabel}
        </Link>
        <span>
          {product.brandName} / {product.category} / {product.name}
        </span>
      </div>

      <section className={styles.desktopProduct}>
        <ProductGallery
          items={product.gallery}
          activeIndex={state.activeImageIndex}
          onSelect={state.setActiveImageIndex}
        />
        <ProductPurchasePanel
          product={product}
          state={state}
          headingId="desktop-product-title"
        />
      </section>

      <ProductBenefits />
      <ProductInformation
        sections={product.information}
        featureImage={product.featureImage}
      />
      <RelatedProducts products={product.related} />
    </main>
  );
}

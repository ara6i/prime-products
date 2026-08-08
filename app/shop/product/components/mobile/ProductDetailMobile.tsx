import Link from "next/link";
import { ArrowLeftIcon } from "@/app/shared/components/icons";
import type {
  ProductDetailInteractionState,
  ProductDetailViewModel,
} from "../../types/productDetail.types";
import { ProductGallery } from "../ProductGallery";
import { ProductInformation } from "../ProductInformation";
import { ProductPurchasePanel } from "../ProductPurchasePanel";
import { RelatedProducts } from "../RelatedProducts";
import styles from "../productDetail.module.css";

interface ProductDetailMobileProps {
  product: ProductDetailViewModel;
  state: ProductDetailInteractionState;
}

export function ProductDetailMobile({
  product,
  state,
}: ProductDetailMobileProps) {
  return (
    <main className={styles.mobileOnly}>
      <Link className={styles.mobileBackLink} href={product.sourceHref}>
        <ArrowLeftIcon /> {product.sourceLabel}
      </Link>
      <ProductGallery
        items={product.gallery}
        activeIndex={state.activeImageIndex}
        onSelect={state.setActiveImageIndex}
        mobile
      />
      <ProductPurchasePanel
        product={product}
        state={state}
        headingId="mobile-product-title"
      />
      <ProductInformation sections={product.information} mobile />
      <RelatedProducts products={product.related} />
    </main>
  );
}

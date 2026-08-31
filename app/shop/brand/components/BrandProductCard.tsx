import Image from "next/image";
import Link from "next/link";
import type { BrandProduct } from "../types/brandCatalog.types";
import { formatBrandPrice } from "../utils/brandCatalog.utils";
import styles from "./brandCatalog.module.css";

interface BrandProductCardProps {
  product: BrandProduct;
  priority?: boolean;
}

export function BrandProductCard({
  product,
  priority = false,
}: BrandProductCardProps) {
  return (
    <article
      className={styles.productCard}
      data-brand-product-card
      data-product-id={product.id}
    >
      <Link
        href={`/shop/product/${product.id}`}
        aria-label={`View ${product.name}`}
      >
        <span className={styles.productImage}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 47.5rem) 44vw, (max-width: 65.625rem) 38vw, 24vw"
            priority={priority}
            unoptimized={product.image.startsWith("http")}
          />
          {product.badge ? <b>{product.badge}</b> : null}
        </span>
        <span className={styles.productCopy}>
          <strong>{product.name}</strong>
          {product.imageNotice ? (
            <small className={styles.imageProvenance}>AI-generated preview</small>
          ) : null}
          <span>
            {product.originalPrice ? (
              <s>{formatBrandPrice(product.originalPrice)}</s>
            ) : null}
            {formatBrandPrice(product.price)}
          </span>
        </span>
      </Link>
    </article>
  );
}

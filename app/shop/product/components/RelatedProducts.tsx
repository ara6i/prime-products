import Image from "next/image";
import Link from "next/link";
import type { ProductRelatedItem } from "../types/productDetail.types";
import styles from "./productDetail.module.css";

interface RelatedProductsProps {
  products: ProductRelatedItem[];
  headingId: string;
}

export function RelatedProducts({ products, headingId }: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className={styles.related} aria-labelledby={headingId}>
      <header>
        <div>
          <span>Complete the edit</span>
          <h2 id={headingId}>You may also like</h2>
        </div>
        <Link href="/shop">View all products</Link>
      </header>
      <div className={styles.relatedGrid}>
        {products.map((product) => (
          <Link
            className={styles.relatedCard}
            href={product.href}
            key={product.id}
          >
            <span className={styles.relatedImage}>
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 760px) 74vw, 22vw"
                unoptimized={product.image.startsWith("http")}
              />
              {product.badge ? <b>{product.badge}</b> : null}
            </span>
            <span className={styles.relatedCopy}>
              <small>{product.brandName}</small>
              <strong>{product.name}</strong>
              <span>{product.priceLabel}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

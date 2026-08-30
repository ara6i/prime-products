import { Heart, Plus } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/app/shared/components/ui/button";
import type { CategoryProduct } from "../types/categoryCatalog.types";
import styles from "./categoryCatalog.module.css";

type CategoryProductGridProps = {
  products: CategoryProduct[];
  favoriteIds: string[];
  onFavorite: (productId: string) => void;
  onAddToBag: (product: CategoryProduct) => void;
};

export function CategoryProductGrid({
  products,
  favoriteIds,
  onFavorite,
  onAddToBag,
}: CategoryProductGridProps) {
  if (products.length === 0) {
    return (
      <div className={styles.emptyProducts}>
        <strong>No pieces match those filters.</strong>
        <span>Clear a filter to bring the edit back.</span>
      </div>
    );
  }

  return (
    <div className={styles.productGrid} aria-live="polite">
      {products.map((product) => {
        const favorite = favoriteIds.includes(product.id);
        return (
          <article className={styles.productCard} key={product.id}>
            <div className={styles.productImage}>
              <Link
                href={`/shop/product/${product.id}`}
                aria-label={`View ${product.name}`}
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 760px) 88vw, (max-width: 1100px) 40vw, 25vw"
                />
              </Link>
              <Button
                type="button"
                variant="icon"
                size="icon"
                aria-label={`${favorite ? "Remove" : "Add"} ${product.name} ${favorite ? "from" : "to"} favorites`}
                onClick={() => onFavorite(product.id)}
              >
                <Heart size={18} weight={favorite ? "fill" : "regular"} />
              </Button>
              <span>{product.note}</span>
            </div>
            <Link href={`/shop/product/${product.id}`}>
              <p>{product.brand}</p>
              <h3>{product.name}</h3>
            </Link>
            <div className={styles.productMeta}>
              <span>AI sizing available</span>
              <strong>{product.priceLabel}</strong>
            </div>
            <Button
              className={styles.addToBag}
              type="button"
              variant="commerce"
              size="commerce"
              onClick={() => onAddToBag(product)}
              aria-label={`Add ${product.name} to bag`}
            >
              Add to bag <Plus size={15} />
            </Button>
          </article>
        );
      })}
    </div>
  );
}

import {
  BookmarkIcon,
  BookmarkOutlineIcon,
  StarIcon,
} from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui/button";
import type {
  ProductDetailInteractionState,
  ProductDetailViewModel,
} from "../types/productDetail.types";
import { ProductTryOnButton } from "./ProductTryOnButton";
import styles from "./productDetail.module.css";

interface ProductPurchasePanelProps {
  product: ProductDetailViewModel;
  state: ProductDetailInteractionState;
  headingId: string;
  viewport: "desktop" | "mobile";
}

export function ProductPurchasePanel({
  product,
  state,
  headingId,
  viewport,
}: ProductPurchasePanelProps) {
  return (
    <section className={styles.purchasePanel} aria-labelledby={headingId}>
      <div className={styles.productEyebrowRow}>
        <span>{product.badge ?? "Curated arrival"}</span>
        <span>{product.styleCode}</span>
      </div>

      <h1 id={headingId}>{product.name}</h1>

      {product.ratingLabel || product.reviewLabel ? (
        <div className={styles.ratingRow}>
          {product.ratingLabel ? (
            <span className={styles.stars} aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <StarIcon key={index} />
              ))}
            </span>
          ) : null}
          {product.ratingLabel ? <span>{product.ratingLabel}</span> : null}
          {product.reviewLabel ? <span>{product.reviewLabel}</span> : null}
        </div>
      ) : null}

      <div className={styles.priceRow}>
        <strong>{product.priceLabel}</strong>
        {product.compareAtPriceLabel ? (
          <s>{product.compareAtPriceLabel}</s>
        ) : null}
        {product.discountLabel ? <span>{product.discountLabel}</span> : null}
      </div>

      <p className={styles.productDescription}>{product.description}</p>

      {product.sizeRecommendation ? (
        <div className={styles.aiSizeRecommendation} data-status={product.sizeRecommendation.status}>
          <span>PrimeStyleAI size</span>
          <strong>{product.sizeRecommendation.label}</strong>
          <p>{product.sizeRecommendation.detail}</p>
        </div>
      ) : null}

      <div className={styles.colorField}>
        <div>
          <span>Color</span>
          <strong>{product.color}</strong>
        </div>
        <span
          className={styles.colorSwatch}
          style={{ backgroundColor: product.colorHex }}
          aria-label={product.color}
        />
      </div>

      <div className={styles.sizeField}>
        <div className={styles.sizeFieldHeader}>
          <span>{product.sizes.length > 0 ? "Select size" : "Sizes"}</span>
          {product.sizes.length > 0 ? (
            <Button
              className={styles.sizeGuideButton}
              type="button"
              variant="link"
              onClick={() => state.setSizeGuideOpen(true)}
            >
              Size guide
            </Button>
          ) : null}
        </div>
        {product.sizes.length > 0 ? (
          <div className={styles.sizeOptions}>
            {product.sizes.map((size) => (
              <Button
                className={styles.sizeOption}
                data-active={state.selectedSize === size}
                key={size}
                type="button"
                variant="ghost"
                aria-pressed={state.selectedSize === size}
                onClick={() => state.setSelectedSize(size)}
              >
                {size}
              </Button>
            ))}
          </div>
        ) : (
          <p className={styles.sizeUnavailable}>No verified size list is available for this item.</p>
        )}
      </div>

      <div className={styles.purchaseActions}>
        <Button
          className={styles.addToBagButton}
          type="button"
          variant="commerce"
          size="commerce"
          onClick={state.addToBag}
        >
          Add to bag · {product.priceLabel}
        </Button>
        <Button
          className={styles.favoriteButton}
          type="button"
          variant="commerce-outline"
          size="commerce"
          aria-label={
            state.isFavorite ? "Remove from saved items" : "Save this item"
          }
          aria-pressed={state.isFavorite}
          onClick={state.toggleFavorite}
        >
          {state.isFavorite ? <BookmarkIcon /> : <BookmarkOutlineIcon />}
        </Button>
      </div>

      {product.tryOnSupported !== false ? (
        <ProductTryOnButton product={product} state={state} viewport={viewport} />
      ) : null}

      {state.confirmation ? (
        <p className={styles.confirmation} role="status">
          {state.confirmation}
        </p>
      ) : null}

      <p className={styles.productNote}>{product.note}</p>
    </section>
  );
}

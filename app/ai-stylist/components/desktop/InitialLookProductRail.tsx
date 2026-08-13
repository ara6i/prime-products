"use client";

import { Check, Heart, Plus } from "@phosphor-icons/react";
import Image from "next/image";
import {
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { ShopRunwayLookView } from "@/app/shop/runway/types/shopRunway.types";
import styles from "./InitialLookProductRail.module.css";

interface InitialLookProductRailProps {
  look: ShopRunwayLookView;
}

export function InitialLookProductRail({
  look,
}: InitialLookProductRailProps) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  function toggleId(
    setter: Dispatch<SetStateAction<string[]>>,
    productId: string,
  ) {
    setter((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  return (
    <aside
      className={styles.rail}
      aria-label={`Products in look ${look.displayNumber}`}
      aria-live="polite"
    >
      <div className={styles.stack} key={look.id}>
        {look.products.map((product) => {
          const favorite = favoriteIds.includes(product.id);
          const added = addedIds.includes(product.id);

          return (
            <article className={styles.product} key={product.id}>
              <button
                className={styles.favorite}
                type="button"
                aria-label={`${favorite ? "Remove" : "Add"} ${product.name} ${favorite ? "from" : "to"} favorites`}
                aria-pressed={favorite}
                onClick={() => toggleId(setFavoriteIds, product.id)}
              >
                <Heart size={13} weight={favorite ? "fill" : "regular"} />
              </button>

              <div className={styles.visual}>
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="13.437vw"
                />
              </div>

              <div className={styles.copy}>
                <span>{product.brand}</span>
                <strong>{product.name}</strong>
                <small>{product.formattedPrice}</small>
              </div>

              <button
                className={styles.add}
                type="button"
                aria-label={`${added ? "Remove" : "Add"} ${product.name} ${added ? "from" : "to"} bag`}
                aria-pressed={added}
                onClick={() => toggleId(setAddedIds, product.id)}
              >
                {added ? <Check size={13} weight="bold" /> : <Plus size={13} />}
              </button>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

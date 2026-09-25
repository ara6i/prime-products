"use client";

import { X } from "@phosphor-icons/react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { Button } from "@/app/shared/components/ui/button";
import type { ProductDetailInteractionState } from "../types/productDetail.types";
import styles from "./productDetail.module.css";

export function OutfitSizeDialog({ state }: { state: ProductDetailInteractionState }) {
  const unresolved = state.pendingOutfit.filter((item) => item.sizes.length > 1);
  return (
    <Dialog.Root
      open={state.pendingOutfit.length > 0}
      onOpenChange={(open) => {
        if (!open) state.closePendingOutfit();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.outfitSizeOverlay} />
        <Dialog.Content className={styles.outfitSizeDialog}>
          <div className={styles.outfitSizeHeader}>
            <div>
              <Dialog.Title>Choose outfit sizes</Dialog.Title>
              <Dialog.Description>
                Your one-size pieces are ready. Select a valid size for each garment and shoe.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="icon" size="icon" aria-label="Close outfit sizes">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>

          <div className={styles.outfitSizeItems}>
            {unresolved.map((item) => (
              <section key={item.productId} className={styles.outfitSizeItem}>
                <div className={styles.outfitSizeImage}>
                  <Image src={item.image} alt="" fill sizes="84px" />
                </div>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.color}</span>
                  <div className={styles.outfitSizeOptions}>
                    {item.sizes.map((size) => (
                      <Button
                        key={size}
                        type="button"
                        variant="ghost"
                        data-active={item.selectedSize === size}
                        aria-pressed={item.selectedSize === size}
                        onClick={() => state.setPendingOutfitSize(item.productId, size)}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>

          <Button
            className={styles.outfitSizeConfirm}
            type="button"
            variant="commerce"
            size="commerce"
            disabled={unresolved.some((item) => !item.selectedSize)}
            onClick={state.confirmPendingOutfit}
          >
            Add complete outfit
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

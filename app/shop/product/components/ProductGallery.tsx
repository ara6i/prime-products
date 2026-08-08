import Image from "next/image";
import { Button } from "@/app/shared/components/ui/button";
import type { ProductGalleryItem } from "../types/productDetail.types";
import styles from "./productDetail.module.css";

interface ProductGalleryProps {
  items: ProductGalleryItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  mobile?: boolean;
}

export function ProductGallery({
  items,
  activeIndex,
  onSelect,
  mobile = false,
}: ProductGalleryProps) {
  const activeItem = items[activeIndex] ?? items[0];

  return (
    <div className={mobile ? styles.mobileGallery : styles.gallery}>
      <div className={styles.galleryHero}>
        <Image
          src={activeItem.src}
          alt={activeItem.alt}
          fill
          sizes={mobile ? "(max-width: 47.5rem) 95vw, 49vw" : "49vw"}
          loading="eager"
        />
        <span className={styles.galleryCounter}>
          {activeIndex + 1} / {items.length}
        </span>
      </div>

      {items.length > 1 ? (
        <div className={styles.galleryThumbnails} aria-label="Product views">
          {items.map((item, index) => (
            <Button
              className={styles.galleryThumbnail}
              data-active={index === activeIndex}
              key={item.id}
              type="button"
              variant="ghost"
              aria-label={`Show product view ${index + 1}`}
              aria-pressed={index === activeIndex}
              onClick={() => onSelect(index)}
            >
              <Image src={item.src} alt="" fill sizes="10vw" />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
